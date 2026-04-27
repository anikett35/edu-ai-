"""
routers/subjects.py
───────────────────
Subject management endpoints.

Teacher can:
  POST   /subjects                    – create a new subject
  PUT    /subjects/{subject_id}       – update subject (name, description, semester, tags)
  DELETE /subjects/{subject_id}       – delete subject (teacher only, own subjects)
  GET    /subjects/my                 – list own created subjects

All authenticated users can:
  GET    /subjects                    – list all subjects (filterable by semester)
  GET    /subjects/{subject_id}       – get single subject detail
  GET    /subjects/semesters          – get list of distinct semesters with subject counts
"""

from datetime import datetime, timezone
from typing import Optional, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.security import require_teacher, get_current_user
from core.database import get_collection
from pydantic import BaseModel, Field

router = APIRouter(prefix="/subjects", tags=["Subjects"])


# ── Pydantic models ───────────────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    name:        str            = Field(..., min_length=2, max_length=100)
    code:        str            = Field(..., min_length=2, max_length=20,
                                        description="Short code e.g. CS101, DBMS301")
    description: str            = Field(..., min_length=10, max_length=500)
    semester:    int            = Field(..., ge=1, le=8,
                                        description="Semester number 1-8")
    tags:        List[str]      = Field(default_factory=list,
                                        description="Topic tags e.g. ['SQL','Normalization']")
    icon:        Optional[str]  = Field(default="📚", max_length=10)
    color:       Optional[str]  = Field(default="#6366f1",
                                        description="Hex color for UI card e.g. #6366f1")
    is_active:   bool           = Field(default=True)


class SubjectUpdate(BaseModel):
    name:        Optional[str]       = Field(None, min_length=2, max_length=100)
    code:        Optional[str]       = Field(None, min_length=2, max_length=20)
    description: Optional[str]       = Field(None, min_length=10, max_length=500)
    semester:    Optional[int]       = Field(None, ge=1, le=8)
    tags:        Optional[List[str]] = None
    icon:        Optional[str]       = Field(None, max_length=10)
    color:       Optional[str]       = None
    is_active:   Optional[bool]      = None


def _fmt(doc: dict) -> dict:
    """Format MongoDB document for API response."""
    return {
        "id":          str(doc["_id"]),
        "name":        doc["name"],
        "code":        doc.get("code", ""),
        "description": doc.get("description", ""),
        "semester":    doc.get("semester", 1),
        "tags":        doc.get("tags", []),
        "icon":        doc.get("icon", "📚"),
        "color":       doc.get("color", "#6366f1"),
        "is_active":   doc.get("is_active", True),
        "teacher_id":  doc.get("teacher_id", ""),
        "created_at":  doc.get("created_at"),
        "updated_at":  doc.get("updated_at"),
    }


# ── Create subject ────────────────────────────────────────────────────────────

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new subject (teacher only)",
)
async def create_subject(
    body:    SubjectCreate,
    teacher: dict = Depends(require_teacher),
):
    subjects_col = get_collection("subjects")

    # Check duplicate code within this teacher's subjects
    existing = await subjects_col.find_one({
        "code":       body.code.upper().strip(),
        "teacher_id": teacher["user_id"],
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have a subject with code '{body.code.upper()}'",
        )

    doc = {
        "teacher_id":  teacher["user_id"],
        "name":        body.name.strip(),
        "code":        body.code.upper().strip(),
        "description": body.description.strip(),
        "semester":    body.semester,
        "tags":        [t.strip() for t in body.tags if t.strip()],
        "icon":        body.icon or "📚",
        "color":       body.color or "#6366f1",
        "is_active":   body.is_active,
        "created_at":  datetime.now(timezone.utc),
        "updated_at":  datetime.now(timezone.utc),
    }
    result = await subjects_col.insert_one(doc)

    return {
        "message":    "Subject created successfully",
        "subject_id": str(result.inserted_id),
        "subject":    _fmt({**doc, "_id": result.inserted_id}),
    }


# ── List all subjects (with optional semester filter) ─────────────────────────

@router.get(
    "",
    summary="List all subjects — filterable by semester (all roles)",
)
async def list_subjects(
    semester:     Optional[int]  = Query(None, ge=1, le=8),
    teacher_id:   Optional[str]  = Query(None),
    active_only:  bool           = Query(True),
    current_user: dict           = Depends(get_current_user),
):
    subjects_col = get_collection("subjects")

    query: dict = {}
    if active_only:
        query["is_active"] = True
    if semester is not None:
        query["semester"]  = semester
    if teacher_id:
        query["teacher_id"] = teacher_id

    cursor = subjects_col.find(query).sort([("semester", 1), ("name", 1)])
    docs   = await cursor.to_list(length=200)

    # Group by semester for structured response
    semesters: dict = {}
    for doc in docs:
        sem = doc.get("semester", 1)
        if sem not in semesters:
            semesters[sem] = []
        semesters[sem].append(_fmt(doc))

    return {
        "total":     len(docs),
        "semesters": {
            str(sem): {
                "semester":  sem,
                "subjects":  subjs,
                "count":     len(subjs),
            }
            for sem, subjs in sorted(semesters.items())
        },
        "flat": [_fmt(d) for d in docs],
    }


# ── List distinct semesters ───────────────────────────────────────────────────

@router.get(
    "/semesters",
    summary="Get list of semesters with subject counts",
)
async def list_semesters(current_user: dict = Depends(get_current_user)):
    subjects_col = get_collection("subjects")

    pipeline = [
        {"$match": {"is_active": True}},
        {
            "$group": {
                "_id":   "$semester",
                "count": {"$sum": 1},
                "subjects": {"$push": "$name"},
            }
        },
        {"$sort": {"_id": 1}},
        {
            "$project": {
                "_id":      0,
                "semester": "$_id",
                "count":    1,
                "subjects": 1,
            }
        },
    ]
    results = await subjects_col.aggregate(pipeline).to_list(length=10)
    return {"semesters": results, "total_semesters": len(results)}


# ── Get single subject ────────────────────────────────────────────────────────

@router.get(
    "/{subject_id}",
    summary="Get subject details by ID",
)
async def get_subject(
    subject_id:   str,
    current_user: dict = Depends(get_current_user),
):
    subjects_col = get_collection("subjects")
    try:
        doc = await subjects_col.find_one({"_id": ObjectId(subject_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid subject ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Subject not found")

    return _fmt(doc)


# ── Update subject ────────────────────────────────────────────────────────────

@router.put(
    "/{subject_id}",
    summary="Update a subject (teacher — own subjects only)",
)
async def update_subject(
    subject_id: str,
    body:       SubjectUpdate,
    teacher:    dict = Depends(require_teacher),
):
    subjects_col = get_collection("subjects")
    try:
        obj_id = ObjectId(subject_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid subject ID")

    doc = await subjects_col.find_one({"_id": obj_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Subject not found")
    if doc["teacher_id"] != teacher["user_id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own subjects")

    # Build update dict from non-None fields
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if body.name        is not None: updates["name"]        = body.name.strip()
    if body.code        is not None: updates["code"]        = body.code.upper().strip()
    if body.description is not None: updates["description"] = body.description.strip()
    if body.semester    is not None: updates["semester"]    = body.semester
    if body.tags        is not None: updates["tags"]        = [t.strip() for t in body.tags if t.strip()]
    if body.icon        is not None: updates["icon"]        = body.icon
    if body.color       is not None: updates["color"]       = body.color
    if body.is_active   is not None: updates["is_active"]   = body.is_active

    await subjects_col.update_one({"_id": obj_id}, {"$set": updates})
    updated = await subjects_col.find_one({"_id": obj_id})

    return {
        "message": "Subject updated successfully",
        "subject": _fmt(updated),
    }


# ── Delete subject ────────────────────────────────────────────────────────────

@router.delete(
    "/{subject_id}",
    summary="Delete a subject (teacher — own subjects only)",
)
async def delete_subject(
    subject_id: str,
    teacher:    dict = Depends(require_teacher),
):
    subjects_col = get_collection("subjects")
    try:
        obj_id = ObjectId(subject_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid subject ID")

    doc = await subjects_col.find_one({"_id": obj_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Subject not found")
    if doc["teacher_id"] != teacher["user_id"]:
        raise HTTPException(status_code=403, detail="You can only delete your own subjects")

    await subjects_col.delete_one({"_id": obj_id})
    return {"message": f"Subject '{doc['name']}' deleted successfully"}


# ── Teacher: list own subjects ────────────────────────────────────────────────

@router.get(
    "/my/list",
    summary="List subjects created by the logged-in teacher",
)
async def my_subjects(teacher: dict = Depends(require_teacher)):
    subjects_col = get_collection("subjects")
    cursor = subjects_col.find(
        {"teacher_id": teacher["user_id"]}
    ).sort([("semester", 1), ("name", 1)])
    docs = await cursor.to_list(length=200)
    return {
        "total":    len(docs),
        "subjects": [_fmt(d) for d in docs],
    }