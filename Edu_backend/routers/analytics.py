"""
routers/analytics.py
─────────────────────
Analytics endpoints using MongoDB aggregation pipelines.
No ML required here — pure data aggregation.

  GET /analytics/performance/{student_id}  – score over time (timeline)
  GET /analytics/subjects/{student_id}     – avg score per subject
  GET /analytics/leaderboard               – top students by avg percentage
  POST /ml/predict-score                   – ML score prediction
"""

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from core.security import get_current_user, require_teacher
from core.database import get_collection
from models.schemas import ScorePredictRequest, ScorePredictResponse
from services.ml_service import predict_score

router = APIRouter(tags=["Analytics & ML"])


# ── Performance over time ────────────────────────────────────────────────────

@router.get(
    "/analytics/performance/{student_id}",
    summary="Student score timeline grouped by date",
)
async def performance_over_time(
    student_id: str,
    current_user: dict = Depends(get_current_user),
):
    _check_access(current_user, student_id)

    attempts = get_collection("quiz_attempts")

    pipeline = [
        {"$match": {"student_id": student_id}},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$date"}
                },
                "avg_score": {"$avg": "$percentage"},
                "attempts": {"$sum": 1},
                "total_score": {"$sum": "$score"},
            }
        },
        {"$sort": {"_id": 1}},   # chronological
        {
            "$project": {
                "_id": 0,
                "date": "$_id",
                "avg_score": {"$round": ["$avg_score", 2]},
                "attempts": 1,
            }
        },
    ]

    result = await attempts.aggregate(pipeline).to_list(length=365)

    return {
        "student_id": student_id,
        "timeline": result,
        "total_days_active": len(result),
    }


# ── Subject-wise performance ─────────────────────────────────────────────────

@router.get(
    "/analytics/subjects/{student_id}",
    summary="Average performance broken down by subject",
)
async def subject_performance(
    student_id: str,
    current_user: dict = Depends(get_current_user),
):
    _check_access(current_user, student_id)

    attempts = get_collection("quiz_attempts")

    pipeline = [
        {"$match": {"student_id": student_id}},
        {
            "$group": {
                "_id": "$subject",
                "avg_percentage": {"$avg": "$percentage"},
                "total_attempts": {"$sum": 1},
                "best_score": {"$max": "$percentage"},
                "latest_score": {"$last": "$percentage"},
            }
        },
        {"$sort": {"avg_percentage": -1}},
        {
            "$project": {
                "_id": 0,
                "subject": "$_id",
                "avg_percentage": {"$round": ["$avg_percentage", 2]},
                "total_attempts": 1,
                "best_score": {"$round": ["$best_score", 2]},
                "latest_score": {"$round": ["$latest_score", 2]},
            }
        },
    ]

    result = await attempts.aggregate(pipeline).to_list(length=50)

    return {
        "student_id": student_id,
        "subjects": result,
    }


# ── Overall summary ──────────────────────────────────────────────────────────

@router.get(
    "/analytics/summary/{student_id}",
    summary="Overall performance summary for a student",
)
async def performance_summary(
    student_id: str,
    current_user: dict = Depends(get_current_user),
):
    _check_access(current_user, student_id)

    attempts = get_collection("quiz_attempts")
    chat_col = get_collection("chat_history")

    pipeline = [
        {"$match": {"student_id": student_id}},
        {
            "$group": {
                "_id": None,
                "total_attempts": {"$sum": 1},
                "avg_percentage": {"$avg": "$percentage"},
                "best_percentage": {"$max": "$percentage"},
                "total_score": {"$sum": "$score"},
                "total_questions": {"$sum": "$total_questions"},
            }
        },
    ]

    agg = await attempts.aggregate(pipeline).to_list(length=1)
    chat_count = await chat_col.count_documents({"student_id": student_id})

    if not agg:
        return {
            "student_id": student_id,
            "total_attempts": 0,
            "avg_percentage": 0,
            "best_percentage": 0,
            "overall_accuracy": 0,
            "chat_sessions": chat_count,
        }

    row = agg[0]
    accuracy = 0.0
    if row["total_questions"] > 0:
        accuracy = round((row["total_score"] / row["total_questions"]) * 100, 2)

    return {
        "student_id": student_id,
        "total_attempts": row["total_attempts"],
        "avg_percentage": round(row["avg_percentage"], 2),
        "best_percentage": round(row["best_percentage"], 2),
        "overall_accuracy": accuracy,
        "chat_sessions": chat_count,
    }


# ── Leaderboard (teacher view) ───────────────────────────────────────────────

@router.get(
    "/analytics/leaderboard",
    summary="Top students by average score (teacher only)",
)
async def leaderboard(
    subject: str | None = None,
    limit: int = 10,
    teacher: dict = Depends(require_teacher),
):
    attempts = get_collection("quiz_attempts")
    users = get_collection("users")

    match_stage = {}
    if subject:
        match_stage["subject"] = subject

    pipeline = [
        *([ {"$match": match_stage} ] if match_stage else []),
        {
            "$group": {
                "_id": "$student_id",
                "avg_percentage": {"$avg": "$percentage"},
                "total_attempts": {"$sum": 1},
            }
        },
        {"$sort": {"avg_percentage": -1}},
        {"$limit": limit},
        {
            "$project": {
                "_id": 0,
                "student_id": "$_id",
                "avg_percentage": {"$round": ["$avg_percentage", 2]},
                "total_attempts": 1,
            }
        },
    ]

    board = await attempts.aggregate(pipeline).to_list(length=limit)

    # Attach student names
    for entry in board:
        try:
            user = await users.find_one(
                {"_id": ObjectId(entry["student_id"])},
                {"name": 1},
            )
            entry["name"] = user["name"] if user else "Unknown"
        except Exception:
            entry["name"] = "Unknown"

    return {"leaderboard": board, "subject": subject or "all"}


# ── ML Score Prediction ──────────────────────────────────────────────────────

@router.post(
    "/ml/predict-score",
    response_model=ScorePredictResponse,
    summary="Predict a student's future exam score using Random Forest",
)
async def ml_predict_score(
    body: ScorePredictRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Input: study hours, avg quiz score, quizzes completed, chat sessions.
    Output: predicted score + confidence band + personalised recommendation.
    See services/ml_service.py for model details.
    """
    result = predict_score(
        study_hours=body.study_hours_per_week,
        avg_quiz_score=body.avg_quiz_score,
        quizzes_completed=body.quizzes_completed,
        chat_sessions=body.chat_sessions,
    )
    return ScorePredictResponse(**result)


# ── Access control helper ────────────────────────────────────────────────────

def _check_access(current_user: dict, target_student_id: str) -> None:
    """Students can only view their own data; teachers see all."""
    if (
        current_user["role"] == "student"
        and current_user["user_id"] != target_student_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students can only access their own analytics",
        )