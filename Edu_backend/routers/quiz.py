"""
routers/quiz.py
───────────────
Quiz endpoints:

  POST /quiz/generate           – student requests a quiz for a subject (student only)
  POST /quiz/submit             – student submits answers (student only)
  GET  /quiz/history/{student_id} – quiz attempt history
  GET  /quiz/questions          – teacher views all questions for a subject
"""

import random
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, Query, HTTPException, status

from core.security import require_student, require_teacher, get_current_user
from core.database import get_collection
from models.schemas import QuizGenerateRequest, QuizSubmitRequest

router = APIRouter(prefix="/quiz", tags=["Quiz"])


# ── Generate (serve quiz to student) ────────────────────────────────────────

@router.post(
    "/generate",
    summary="Get a random quiz for a subject (student only)",
)
async def generate_quiz(
    body: QuizGenerateRequest,
    student: dict = Depends(require_student),
):
    """
    Selects `num_questions` random questions from the given subject.
    Returns questions WITHOUT correct_answer — answers revealed only after submit.
    Questions are shuffled so each attempt feels fresh.
    """
    quizzes = get_collection("quizzes")

    # Fetch all questions for the subject
    all_questions = await quizzes.find(
        {"subject": body.subject},
        {"correct_answer": 0},   # strip correct_answer from response
    ).to_list(length=500)

    if not all_questions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No quiz questions found for subject '{body.subject}'",
        )

    # Random sample
    sampled = random.sample(all_questions, min(body.num_questions, len(all_questions)))

    return {
        "subject": body.subject,
        "total_questions": len(sampled),
        "questions": [
            {
                "id": str(q["_id"]),
                "question": q["question"],
                "options": q["options"],
                "difficulty": q.get("difficulty", "medium"),
            }
            for q in sampled
        ],
    }


# ── Submit quiz ──────────────────────────────────────────────────────────────

@router.post(
    "/submit",
    status_code=status.HTTP_201_CREATED,
    summary="Submit quiz answers and receive score (student only)",
)
async def submit_quiz(
    body: QuizSubmitRequest,
    student: dict = Depends(require_student),
):
    """
    Grading flow:
      1. Fetch correct answers for submitted question_ids
      2. Compare each submitted answer
      3. Calculate raw score and percentage
      4. Store attempt in quiz_attempts collection
    """
    quizzes = get_collection("quizzes")
    attempts_col = get_collection("quiz_attempts")

    # Fetch correct answers in bulk
    object_ids = []
    for qid in body.question_ids:
        try:
            object_ids.append(ObjectId(qid))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid question id: '{qid}'",
            )

    questions_cursor = quizzes.find(
        {"_id": {"$in": object_ids}},
        {"_id": 1, "correct_answer": 1},
    )
    questions = await questions_cursor.to_list(length=len(object_ids))

    if len(questions) != len(body.question_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more question IDs were not found",
        )

    # Build lookup: {str_id: correct_answer}
    answer_key = {str(q["_id"]): q["correct_answer"] for q in questions}

    # Grade
    score = 0
    detailed_results = []
    for qid, submitted in zip(body.question_ids, body.answers):
        correct = answer_key.get(qid, "")
        is_correct = submitted.strip() == correct.strip()
        if is_correct:
            score += 1
        detailed_results.append({
            "question_id": qid,
            "submitted": submitted,
            "correct": correct,
            "is_correct": is_correct,
        })

    total = len(body.question_ids)
    percentage = round((score / total) * 100, 2) if total > 0 else 0.0

    # Persist attempt
    attempt_doc = {
        "student_id": student["user_id"],
        "subject": body.subject,
        "answers": body.answers,
        "score": score,
        "total_questions": total,
        "percentage": percentage,
        "date": datetime.now(timezone.utc),
    }
    result = await attempts_col.insert_one(attempt_doc)

    return {
        "attempt_id": str(result.inserted_id),
        "subject": body.subject,
        "score": score,
        "total_questions": total,
        "percentage": percentage,
        "grade": _grade_label(percentage),
        "detailed_results": detailed_results,
    }


# ── History ──────────────────────────────────────────────────────────────────

@router.get(
    "/history/{student_id}",
    summary="Get quiz attempt history for a student",
)
async def quiz_history(
    student_id: str,
    current_user: dict = Depends(get_current_user),
    subject: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    """
    A student can only view their own history.
    A teacher can view any student's history.
    """
    # Access control
    if current_user["role"] == "student" and current_user["user_id"] != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students can only view their own history",
        )

    attempts_col = get_collection("quiz_attempts")

    query: dict = {"student_id": student_id}
    if subject:
        query["subject"] = subject

    cursor = (
        attempts_col.find(query)
        .sort("date", -1)
        .skip(skip)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)

    total = await attempts_col.count_documents(query)

    return {
        "student_id": student_id,
        "total_attempts": total,
        "returned": len(docs),
        "attempts": [
            {
                "id": str(d["_id"]),
                "subject": d["subject"],
                "score": d["score"],
                "total_questions": d["total_questions"],
                "percentage": d["percentage"],
                "grade": _grade_label(d["percentage"]),
                "date": d["date"],
            }
            for d in docs
        ],
    }


# ── Teacher: view questions ───────────────────────────────────────────────────

@router.get(
    "/questions",
    summary="List quiz questions for a subject (teacher only)",
)
async def list_questions(
    subject: str = Query(...),
    teacher: dict = Depends(require_teacher),
    limit: int = Query(50, ge=1, le=200),
):
    quizzes = get_collection("quizzes")
    cursor = quizzes.find(
        {"subject": subject, "teacher_id": teacher["user_id"]}
    ).limit(limit)
    docs = await cursor.to_list(length=limit)

    return {
        "subject": subject,
        "total": len(docs),
        "questions": [
            {
                "id": str(q["_id"]),
                "question": q["question"],
                "options": q["options"],
                "correct_answer": q["correct_answer"],
                "difficulty": q.get("difficulty", "medium"),
                "created_at": q.get("created_at"),
            }
            for q in docs
        ],
    }


# ── Utility ───────────────────────────────────────────────────────────────────

def _grade_label(percentage: float) -> str:
    if percentage >= 90:
        return "A"
    elif percentage >= 80:
        return "B"
    elif percentage >= 70:
        return "C"
    elif percentage >= 60:
        return "D"
    else:
        return "F"