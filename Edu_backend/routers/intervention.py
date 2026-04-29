"""
routers/intervention.py
───────────────────────
Academic Intervention System — Workflow Tiers WF1–WF4

Risk Score Calculation (0–100):
  The risk score is an INVERSE wellness metric:
  HIGH risk score = student is STRUGGLING.

  Formula:
    base_risk = 100 - avg_percentage          (low quiz avg → high risk)
    inactivity_penalty = max(0, 20 - quizzes_completed) * 1.5
    no_tutor_penalty   = max(0, 5  - chat_sessions)     * 2.0
    risk_score = min(100, base_risk + inactivity_penalty + no_tutor_penalty)

Workflow Tiers:
  WF1  <  30  : Normal progress — log only, no action
  WF2  30–60  : Automated reminders + recommended quizzes
  WF3  60–80  : Faculty alert + subject weakness report + mentoring review
  WF4  ≥  80  : Personal counselor/instructor intervention + urgent support

Endpoints:
  GET  /intervention/risk/{student_id}        – compute & return risk score
  GET  /intervention/dashboard                – teacher: all students at risk
  POST /intervention/acknowledge/{student_id} – teacher marks WF3/WF4 reviewed
  GET  /intervention/history/{student_id}     – audit log of all interventions
  POST /intervention/resolve/{record_id}      – mark intervention resolved
"""

from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.security import get_current_user, require_teacher
from core.database import get_collection

router = APIRouter(prefix="/intervention", tags=["Intervention"])


# ── Risk Score Engine ─────────────────────────────────────────────────────────

def _compute_risk(
    avg_percentage:    float,
    quizzes_completed: int,
    chat_sessions:     int,
    best_percentage:   float = 0,
) -> dict:
    """
    Returns risk_score (0-100) and WF tier.

    High risk score = student is struggling.
    Components:
      - Base risk:           100 - avg_percentage
      - Inactivity penalty:  fewer than 20 quizzes → up to +30 pts
      - No-tutor penalty:    fewer than 5 sessions  → up to +10 pts
      - Improvement bonus:   best > avg by >20 pts  → -5 pts (shows effort)
    """
    base_risk          = max(0.0, 100.0 - float(avg_percentage))
    inactivity_penalty = max(0.0, (20 - quizzes_completed) * 1.5)
    no_tutor_penalty   = max(0.0, (5  - chat_sessions)     * 2.0)
    improvement_bonus  = 5.0 if (best_percentage - avg_percentage) > 20 else 0.0

    raw = base_risk + inactivity_penalty + no_tutor_penalty - improvement_bonus
    risk_score = round(min(100.0, max(0.0, raw)), 1)

    if risk_score >= 80:
        tier, label, action, human = "WF4", "CRITICAL", \
            "Personal counselor/instructor intervention · urgent academic support", True
    elif risk_score >= 60:
        tier, label, action, human = "WF3", "HIGH", \
            "Faculty alert · subject weakness report · mentoring review", True
    elif risk_score >= 30:
        tier, label, action, human = "WF2", "MEDIUM", \
            "Auto-generated study reminders and recommended quizzes", False
    else:
        tier, label, action, human = "WF1", "LOW", \
            "Normal progress logging · no action required", False

    return {
        "risk_score":       risk_score,
        "tier":             tier,
        "label":            label,
        "action":           action,
        "human_required":   human,
        "components": {
            "base_risk":          round(base_risk, 1),
            "inactivity_penalty": round(inactivity_penalty, 1),
            "no_tutor_penalty":   round(no_tutor_penalty, 1),
            "improvement_bonus":  round(improvement_bonus, 1),
        },
    }


async def _save_intervention(
    student_id: str,
    risk_data:  dict,
    triggered_by: str = "system",
) -> str:
    """Persist intervention record and return inserted _id."""
    col = get_collection("interventions")
    doc = {
        "student_id":     student_id,
        "risk_score":     risk_data["risk_score"],
        "tier":           risk_data["tier"],
        "label":          risk_data["label"],
        "action":         risk_data["action"],
        "human_required": risk_data["human_required"],
        "components":     risk_data["components"],
        "triggered_by":   triggered_by,
        "acknowledged":   False,
        "resolved":       False,
        "created_at":     datetime.now(timezone.utc),
        "resolved_at":    None,
        "notes":          "",
    }
    result = await col.insert_one(doc)
    return str(result.inserted_id)


# ── GET risk for a single student ─────────────────────────────────────────────

@router.get(
    "/risk/{student_id}",
    summary="Compute risk score and WF tier for a student",
)
async def get_student_risk(
    student_id:   str,
    save:         bool = Query(True, description="Persist this assessment to audit log"),
    current_user: dict = Depends(get_current_user),
):
    """
    Students can check their own risk.
    Teachers can check any student's risk.
    """
    if current_user["role"] == "student" and current_user["user_id"] != student_id:
        raise HTTPException(status_code=403, detail="Students can only view their own risk score")

    attempts_col = get_collection("quiz_attempts")
    chat_col     = get_collection("chat_history")
    users_col    = get_collection("users")

    # Fetch analytics
    pipeline = [
        {"$match": {"student_id": student_id}},
        {"$group": {
            "_id":            None,
            "avg_percentage": {"$avg": "$percentage"},
            "best":           {"$max": "$percentage"},
            "total":          {"$sum": 1},
        }},
    ]
    agg    = await attempts_col.aggregate(pipeline).to_list(1)
    chats  = await chat_col.count_documents({"student_id": student_id})

    avg_pct  = agg[0]["avg_percentage"] if agg else 0.0
    best_pct = agg[0]["best"]           if agg else 0.0
    total_q  = agg[0]["total"]          if agg else 0

    risk_data = _compute_risk(avg_pct, total_q, chats, best_pct)

    # Fetch subject-wise breakdown for weakness report
    sub_pipeline = [
        {"$match": {"student_id": student_id}},
        {"$group": {
            "_id":   "$subject",
            "avg":   {"$avg": "$percentage"},
            "count": {"$sum": 1},
        }},
        {"$sort": {"avg": 1}},
    ]
    subjects = await attempts_col.aggregate(sub_pipeline).to_list(20)
    weak_subjects = [
        {"subject": s["_id"], "avg": round(s["avg"], 1), "attempts": s["count"]}
        for s in subjects if s["avg"] < 60
    ]

    # Fetch student name
    try:
        user = await users_col.find_one({"_id": ObjectId(student_id)}, {"name": 1, "email": 1})
        student_name = user.get("name", "Unknown") if user else "Unknown"
    except Exception:
        student_name = "Unknown"

    record_id = None
    if save and risk_data["tier"] in ("WF2", "WF3", "WF4"):
        record_id = await _save_intervention(student_id, risk_data, "auto")

    return {
        "student_id":       student_id,
        "student_name":     student_name,
        "risk_score":       risk_data["risk_score"],
        "tier":             risk_data["tier"],
        "label":            risk_data["label"],
        "action":           risk_data["action"],
        "human_required":   risk_data["human_required"],
        "components":       risk_data["components"],
        "stats": {
            "avg_percentage":    round(avg_pct, 1),
            "best_percentage":   round(best_pct, 1),
            "quizzes_completed": total_q,
            "chat_sessions":     chats,
        },
        "weak_subjects":    weak_subjects,
        "record_id":        record_id,
        "recommendations":  _recommendations(risk_data["tier"], weak_subjects),
    }


def _recommendations(tier: str, weak_subjects: list) -> list:
    base = []
    if tier == "WF1":
        base = [
            "Keep up the great work! You are on track.",
            "Try attempting advanced quizzes to challenge yourself.",
        ]
    elif tier == "WF2":
        subjects = [s["subject"].replace("_", " ").title() for s in weak_subjects[:2]]
        base = [
            f"Focus on: {', '.join(subjects) if subjects else 'all subjects'}",
            "Complete at least 2 quizzes per subject this week.",
            "Use the AI Tutor to clarify concepts you found difficult.",
            "Review your incorrect quiz answers from the performance report.",
        ]
    elif tier == "WF3":
        base = [
            "Your performance requires attention — please speak with your instructor.",
            "Schedule a mentoring review session immediately.",
            "Complete all pending quizzes before next class.",
            "Use the AI Tutor daily — aim for at least 10 sessions this week.",
            f"Priority subjects: {', '.join([s['subject'].replace('_',' ').title() for s in weak_subjects[:3]])}",
        ]
    elif tier == "WF4":
        base = [
            "URGENT: Your academic counselor has been notified.",
            "Please attend the scheduled intervention meeting.",
            "A personalized study plan is being prepared for you.",
            "Contact your instructor immediately for urgent support.",
            "Daily check-ins are required until risk score improves.",
        ]
    return base


# ── Teacher dashboard — all at-risk students ─────────────────────────────────

@router.get(
    "/dashboard",
    summary="Teacher: get all students with risk scores (WF2 and above)",
)
async def intervention_dashboard(
    min_tier:  str  = Query("WF2", description="Minimum tier: WF1 WF2 WF3 WF4"),
    teacher:   dict = Depends(require_teacher),
):
    attempts_col = get_collection("quiz_attempts")
    chat_col     = get_collection("chat_history")
    users_col    = get_collection("users")

    # Get all students who have attempted quizzes
    student_ids = await attempts_col.distinct("student_id")

    results = []
    for sid in student_ids:
        pipeline = [
            {"$match": {"student_id": sid}},
            {"$group": {
                "_id":  None,
                "avg":  {"$avg": "$percentage"},
                "best": {"$max": "$percentage"},
                "cnt":  {"$sum": 1},
            }},
        ]
        agg   = await attempts_col.aggregate(pipeline).to_list(1)
        chats = await chat_col.count_documents({"student_id": sid})

        avg_pct  = agg[0]["avg"]  if agg else 0.0
        best_pct = agg[0]["best"] if agg else 0.0
        total_q  = agg[0]["cnt"]  if agg else 0

        risk = _compute_risk(avg_pct, total_q, chats, best_pct)

        tier_order = {"WF1":1, "WF2":2, "WF3":3, "WF4":4}
        min_order  = tier_order.get(min_tier, 2)
        if tier_order.get(risk["tier"], 1) < min_order:
            continue

        try:
            user = await users_col.find_one({"_id": ObjectId(sid)}, {"name":1, "email":1})
            name = user.get("name","Unknown") if user else "Unknown"
        except Exception:
            name = "Unknown"

        results.append({
            "student_id":    sid,
            "student_name":  name,
            "risk_score":    risk["risk_score"],
            "tier":          risk["tier"],
            "label":         risk["label"],
            "human_required":risk["human_required"],
            "avg_percentage":round(avg_pct, 1),
            "quizzes_done":  total_q,
            "chat_sessions": chats,
        })

    results.sort(key=lambda x: x["risk_score"], reverse=True)

    summary = {
        "WF4": sum(1 for r in results if r["tier"] == "WF4"),
        "WF3": sum(1 for r in results if r["tier"] == "WF3"),
        "WF2": sum(1 for r in results if r["tier"] == "WF2"),
    }

    return {
        "total_at_risk": len(results),
        "summary":       summary,
        "students":      results,
    }


# ── Acknowledge intervention ──────────────────────────────────────────────────

@router.post(
    "/acknowledge/{student_id}",
    summary="Teacher marks a student's WF3/WF4 as reviewed",
)
async def acknowledge(
    student_id: str,
    notes:      str  = Query("", description="Optional teacher notes"),
    teacher:    dict = Depends(require_teacher),
):
    col = get_collection("interventions")
    await col.update_many(
        {"student_id": student_id, "acknowledged": False,
         "tier": {"$in": ["WF3", "WF4"]}},
        {"$set": {
            "acknowledged":    True,
            "acknowledged_by": teacher["user_id"],
            "acknowledged_at": datetime.now(timezone.utc),
            "notes":           notes,
        }},
    )
    return {"message": f"Intervention acknowledged for student {student_id}"}


# ── Resolve intervention ──────────────────────────────────────────────────────

@router.post(
    "/resolve/{record_id}",
    summary="Mark an intervention record as resolved",
)
async def resolve(
    record_id: str,
    notes:     str  = Query("", description="Resolution notes"),
    teacher:   dict = Depends(require_teacher),
):
    col = get_collection("interventions")
    try:
        obj_id = ObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid record ID")

    await col.update_one(
        {"_id": obj_id},
        {"$set": {
            "resolved":     True,
            "resolved_at":  datetime.now(timezone.utc),
            "resolved_by":  teacher["user_id"],
            "notes":        notes,
        }},
    )
    return {"message": "Intervention resolved"}


# ── Intervention history ──────────────────────────────────────────────────────

@router.get(
    "/history/{student_id}",
    summary="Audit log of all interventions for a student",
)
async def history(
    student_id:   str,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] == "student" and current_user["user_id"] != student_id:
        raise HTTPException(status_code=403, detail="Access denied")

    col    = get_collection("interventions")
    cursor = col.find({"student_id": student_id}).sort("created_at", -1)
    docs   = await cursor.to_list(50)

    return {
        "student_id": student_id,
        "total":      len(docs),
        "records": [
            {
                "id":           str(d["_id"]),
                "tier":         d["tier"],
                "label":        d["label"],
                "risk_score":   d["risk_score"],
                "action":       d["action"],
                "acknowledged": d.get("acknowledged", False),
                "resolved":     d.get("resolved",     False),
                "created_at":   d.get("created_at"),
                "notes":        d.get("notes", ""),
            }
            for d in docs
        ],
    }