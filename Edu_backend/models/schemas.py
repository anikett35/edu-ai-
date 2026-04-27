"""
models/schemas.py
─────────────────
All Pydantic v2 request/response models.

Design principles:
  • Request models validate incoming data strictly
  • Response models never expose password_hash
  • Custom validators provide domain-specific rules beyond type checks
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Literal
from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)
import re


# ════════════════════════════════════════════════════════════════════════
# AUTH
# ════════════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: Literal["student", "teacher"] = "student"

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """
        Strong password rules:
          - At least 8 characters (enforced by Field min_length)
          - At least one uppercase letter
          - At least one digit
        """
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("name")
    @classmethod
    def name_no_special_chars(cls, v: str) -> str:
        if not re.match(r"^[A-Za-z\s\-']+$", v):
            raise ValueError("Name may only contain letters, spaces, hyphens, apostrophes")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime


# ════════════════════════════════════════════════════════════════════════
# MATERIALS
# ════════════════════════════════════════════════════════════════════════

class MaterialOut(BaseModel):
    id: str
    subject: str
    file_name: str
    chunk_count: int
    upload_date: datetime


# ════════════════════════════════════════════════════════════════════════
# QUIZ
# ════════════════════════════════════════════════════════════════════════

class QuizQuestionCreate(BaseModel):
    subject: str = Field(..., min_length=2, max_length=100)
    question: str = Field(..., min_length=10)
    options: List[str] = Field(..., min_length=4, max_length=4)
    correct_answer: str

    @field_validator("options")
    @classmethod
    def exactly_four_options(cls, v: List[str]) -> List[str]:
        if len(v) != 4:
            raise ValueError("Exactly 4 options are required")
        if len(set(v)) != 4:
            raise ValueError("All 4 options must be unique")
        cleaned = [o.strip() for o in v]
        if any(len(o) == 0 for o in cleaned):
            raise ValueError("Options cannot be empty strings")
        return cleaned

    @model_validator(mode="after")
    def correct_answer_in_options(self) -> "QuizQuestionCreate":
        if self.correct_answer not in self.options:
            raise ValueError("correct_answer must be one of the provided options")
        return self


class QuizGenerateRequest(BaseModel):
    subject: str = Field(..., min_length=2)
    num_questions: int = Field(10, ge=1, le=50)


class QuizSubmitRequest(BaseModel):
    subject: str
    question_ids: List[str]           # ordered list of question _ids
    answers: List[str]                # student's chosen answers (same order)

    @model_validator(mode="after")
    def lists_same_length(self) -> "QuizSubmitRequest":
        if len(self.question_ids) != len(self.answers):
            raise ValueError("question_ids and answers must have equal length")
        return self


class QuizAttemptOut(BaseModel):
    id: str
    subject: str
    score: int
    total_questions: int
    percentage: float
    date: datetime


class QuizHistoryOut(BaseModel):
    attempts: List[QuizAttemptOut]
    total_attempts: int


# ════════════════════════════════════════════════════════════════════════
# TUTOR / RAG
# ════════════════════════════════════════════════════════════════════════

class TutorAskRequest(BaseModel):
    subject: str = Field(..., min_length=2)
    question: str = Field(..., min_length=5, max_length=2000)


class TutorAnswerResponse(BaseModel):
    question: str
    answer: str
    confidence: float              # 0.0 – 1.0
    source: Literal["notes", "ai"]
    retrieved_chunks: int


# ════════════════════════════════════════════════════════════════════════
# ANALYTICS
# ════════════════════════════════════════════════════════════════════════

class PerformancePoint(BaseModel):
    date: str                      # ISO date string
    avg_score: float
    attempts: int


class SubjectPerformance(BaseModel):
    subject: str
    avg_percentage: float
    total_attempts: int


class PerformanceResponse(BaseModel):
    student_id: str
    timeline: List[PerformancePoint]


class SubjectResponse(BaseModel):
    student_id: str
    subjects: List[SubjectPerformance]


# ════════════════════════════════════════════════════════════════════════
# ML
# ════════════════════════════════════════════════════════════════════════

class ScorePredictRequest(BaseModel):
    study_hours_per_week: float = Field(..., ge=0, le=168)
    avg_quiz_score: float = Field(..., ge=0, le=100)
    quizzes_completed: int = Field(..., ge=0)
    chat_sessions: int = Field(..., ge=0)


class ScorePredictResponse(BaseModel):
    predicted_score: float
    confidence_band: str           # e.g. "72 – 84"
    recommendation: str