"""
services/rag_service.py
───────────────────────
Full Retrieval-Augmented Generation (RAG) pipeline.

Pipeline steps:
  1. Embed the student's question
  2. Load all stored chunk embeddings for the requested subject
  3. Compute cosine similarity (dot product, since embeddings are normalised)
  4. Pick top-k most relevant chunks
  5. Apply confidence-based decision logic:
       > 0.70 → answer purely from notes
       0.40–0.70 → combine notes + LLM elaboration
       < 0.40 → general LLM answer (no relevant notes found)
  6. Build a structured prompt and call Ollama (Mistral/LLaMA)
  7. Return answer, confidence, source label

Why cosine similarity?
  We compare direction of vectors, not magnitude, so long and short texts
  are judged equally. For normalised vectors, cosine sim = dot product,
  making batch computation very fast via numpy.

Why top-k=3?
  Feeding too many chunks dilutes the LLM's attention.
  3 focused passages (~300 words each) = ~900 words of context,
  which fits comfortably in Mistral's 4096-token window while
  leaving room for the question and answer.
"""

import logging
from typing import List, Tuple
from datetime import datetime, timezone

import numpy as np
import httpx

from core.config import settings
from core.database import get_collection
from services.file_service import embed_query

logger = logging.getLogger(__name__)

TOP_K = 3
HIGH_CONFIDENCE_THRESHOLD = 0.70
LOW_CONFIDENCE_THRESHOLD = 0.40

OLLAMA_TIMEOUT = httpx.Timeout(
    connect=10.0,   # fail fast if Ollama is not running
    read=180.0,     # Mistral on CPU can take 2-3 min for first response
    write=30.0,
    pool=5.0,
)


# ════════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ════════════════════════════════════════════════════════════════════════════

async def answer_question(
    student_id: str,
    subject: str,
    question: str,
) -> dict:
    """
    Main entry point called by the /tutor/ask route.
    Returns dict matching TutorAnswerResponse schema.
    """
    # Step 1 – embed question
    q_vector = embed_query(question)  # shape: (384,)

    # Step 2 – retrieve all embeddings for this subject
    chunks, vectors, max_sim = await _retrieve_top_chunks(subject, q_vector)

    # Step 3 – decide source & build prompt
    if max_sim >= HIGH_CONFIDENCE_THRESHOLD:
        source = "notes"
        prompt = _build_notes_prompt(question, chunks, mode="direct")
        confidence = float(max_sim)
    elif max_sim >= LOW_CONFIDENCE_THRESHOLD:
        source = "notes"
        prompt = _build_notes_prompt(question, chunks, mode="explain")
        confidence = float(max_sim)
    else:
        source = "ai"
        prompt = _build_general_prompt(question)
        confidence = 0.0  # no relevant notes found

    # Step 4 – call Ollama
    answer = await _call_ollama(prompt)

    # Step 5 – persist to chat_history
    await _store_chat(
        student_id=student_id,
        subject=subject,
        question=question,
        answer=answer,
        confidence=confidence,
        source=source,
    )

    return {
        "question": question,
        "answer": answer,
        "confidence": round(confidence, 3),
        "source": source,
        "retrieved_chunks": len(chunks),
    }


# ════════════════════════════════════════════════════════════════════════════
# RETRIEVAL
# ════════════════════════════════════════════════════════════════════════════

async def _retrieve_top_chunks(
    subject: str,
    q_vector: np.ndarray,
) -> Tuple[List[str], np.ndarray, float]:
    """
    Load all stored embeddings for `subject` and find top-k most similar.
    Returns (top_k_chunks, top_k_vectors, best_similarity_score).
    """
    materials_col = get_collection("materials")

    # Fetch all materials for the subject
    cursor = materials_col.find(
        {"subject": subject},
        {"extracted_chunks": 1, "embeddings": 1},
    )
    materials = await cursor.to_list(length=None)

    if not materials:
        logger.warning("No materials found for subject '%s'", subject)
        return [], np.array([]), 0.0

    # Flatten chunks and embeddings across all materials
    all_chunks: List[str] = []
    all_embeddings: List[List[float]] = []
    for mat in materials:
        all_chunks.extend(mat.get("extracted_chunks", []))
        all_embeddings.extend(mat.get("embeddings", []))

    if not all_chunks:
        return [], np.array([]), 0.0

    # Matrix of stored embeddings: shape (N, 384)
    emb_matrix = np.array(all_embeddings, dtype=np.float32)

    # Cosine similarity = dot product (vectors already normalised)
    similarities = emb_matrix @ q_vector.astype(np.float32)  # shape (N,)

    # Top-k indices (descending)
    top_k = min(TOP_K, len(all_chunks))
    top_indices = np.argsort(similarities)[::-1][:top_k]

    top_chunks = [all_chunks[i] for i in top_indices]
    max_sim = float(similarities[top_indices[0]]) if len(top_indices) > 0 else 0.0

    logger.debug(
        "RAG: subject=%s, total_chunks=%d, top_sim=%.3f",
        subject, len(all_chunks), max_sim,
    )
    return top_chunks, emb_matrix[top_indices], max_sim


# ════════════════════════════════════════════════════════════════════════════
# PROMPT BUILDERS
# ════════════════════════════════════════════════════════════════════════════

def _build_notes_prompt(question: str, chunks: List[str], mode: str) -> str:
    context = "\n\n---\n\n".join(
        f"[Passage {i+1}]\n{chunk}" for i, chunk in enumerate(chunks)
    )

    if mode == "direct":
        instruction = (
            "Answer the student's question using ONLY the provided course notes below. "
            "Be concise and precise. If the notes do not directly answer the question, say so."
        )
    else:  # explain
        instruction = (
            "The course notes partially address the student's question. "
            "Use the notes as a foundation and provide a clear, educational explanation. "
            "Clearly indicate what comes from the notes and what is additional explanation."
        )

    return f"""You are EduAI, a helpful teaching assistant for students.

{instruction}

=== COURSE NOTES ===
{context}

=== STUDENT QUESTION ===
{question}

=== YOUR ANSWER ==="""


def _build_general_prompt(question: str) -> str:
    return f"""You are EduAI, a helpful teaching assistant for students.

The student's question is not covered by the available course notes.
Provide a clear, accurate, educational answer based on your general knowledge.
Keep the answer focused and easy to understand for a student.

=== STUDENT QUESTION ===
{question}

=== YOUR ANSWER ==="""


# ════════════════════════════════════════════════════════════════════════════
# OLLAMA CALL
# ════════════════════════════════════════════════════════════════════════════

async def _call_ollama(prompt: str) -> str:
    """
    POST to Ollama /api/generate (non-streaming).
    Raises HTTPException 503 if Ollama is unreachable so the frontend
    can show the correct "Ollama not running" help message.

    Ollama on Windows listens on 127.0.0.1:11434 by default.
    Set OLLAMA_BASE_URL=http://127.0.0.1:11434 in your .env file.
    """
    from fastapi import HTTPException, status as http_status

    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.3,
            "top_p": 0.9,
            "num_predict": 512,
        },
    }

    url = f"{settings.ollama_base_url}/api/generate"
    logger.info("Calling Ollama at %s with model %s", url, settings.ollama_model)

    try:
        async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            answer = data.get("response", "").strip()
            if not answer:
                raise HTTPException(
                    status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Ollama returned an empty response. Is the model loaded?",
                )
            return answer

    except httpx.ConnectError as e:
        logger.error("Ollama ConnectError at %s: %s", url, e)
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"Ollama is not reachable at {settings.ollama_base_url}. "
                "Make sure 'ollama serve' is running and OLLAMA_BASE_URL is correct in .env. "
                "On Windows use: OLLAMA_BASE_URL=http://127.0.0.1:11434"
            ),
        )
    except httpx.ReadTimeout as e:
        logger.error("Ollama ReadTimeout: %s", e)
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Ollama timed out generating a response. The model may still be loading — try again in 30 seconds.",
        )
    except httpx.HTTPStatusError as e:
        logger.error("Ollama HTTP error: %s", e)
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ollama returned HTTP {e.response.status_code}. Check that the model '{settings.ollama_model}' is pulled.",
        )
    except Exception as e:
        logger.error("Unexpected Ollama error: %s", e)
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ollama error: {str(e)}",
        )


# ════════════════════════════════════════════════════════════════════════════
# STORAGE
# ════════════════════════════════════════════════════════════════════════════

async def _store_chat(
    student_id: str,
    subject: str,
    question: str,
    answer: str,
    confidence: float,
    source: str,
) -> None:
    chat_col = get_collection("chat_history")
    await chat_col.insert_one({
        "student_id": student_id,
        "subject": subject,
        "question": question,
        "answer": answer,
        "confidence": confidence,
        "source": source,
        "timestamp": datetime.now(timezone.utc),
    })