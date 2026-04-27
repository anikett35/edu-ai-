"""
routers/tutor.py
────────────────
AI Tutor endpoints (students only):

  POST /tutor/ask             – ask the RAG tutor a question
  GET  /tutor/history/{subject} – retrieve chat history for a subject
"""

from fastapi import APIRouter, Depends, Query, status
from bson import ObjectId

from core.security import require_student
from core.database import get_collection
from models.schemas import TutorAskRequest, TutorAnswerResponse
from services.rag_service import answer_question

router = APIRouter(prefix="/tutor", tags=["AI Tutor"])


@router.post(
    "/ask",
    response_model=TutorAnswerResponse,
    summary="Ask the AI tutor a question (RAG pipeline)",
)
async def ask_tutor(
    body: TutorAskRequest,
    student: dict = Depends(require_student),
):
    """
    Full RAG pipeline:
      embed question → retrieve chunks → similarity decision →
      build prompt → call Ollama → store chat → return answer

    See services/rag_service.py for detailed pipeline documentation.
    """
    result = await answer_question(
        student_id=student["user_id"],
        subject=body.subject,
        question=body.question,
    )
    return TutorAnswerResponse(**result)


@router.get(
    "/history/{subject}",
    summary="Get chat history for a subject (student's own history)",
)
async def chat_history(
    subject: str,
    student: dict = Depends(require_student),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    """
    Paginated chat history for the authenticated student and given subject.
    Sorted newest-first.
    """
    chat_col = get_collection("chat_history")
    cursor = (
        chat_col.find(
            {"student_id": student["user_id"], "subject": subject},
            {"_id": 1, "question": 1, "answer": 1, "confidence": 1, "source": 1, "timestamp": 1},
        )
        .sort("timestamp", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)

    return {
        "subject": subject,
        "total_returned": len(docs),
        "history": [
            {
                "id": str(d["_id"]),
                "question": d["question"],
                "answer": d["answer"],
                "confidence": d["confidence"],
                "source": d["source"],
                "timestamp": d["timestamp"],
            }
            for d in docs
        ],
    }