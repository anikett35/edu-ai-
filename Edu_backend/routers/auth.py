"""
routers/auth.py
───────────────
Endpoints:
  POST /auth/register  – create new account
  POST /auth/login     – authenticate and receive JWT
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status
from bson import ObjectId

from core.database import get_collection
from core.security import hash_password, verify_password, create_access_token
from models.schemas import RegisterRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user (student or teacher)",
)
async def register(body: RegisterRequest):
    """
    Full registration flow:
      1. Pydantic validates email format, password strength, name characters
      2. Check for duplicate email (unique index would also catch this,
         but we return a clear 409 before hitting Mongo)
      3. Hash password with bcrypt (cost factor 12 by default)
      4. Insert user document
    """
    users = get_collection("users")

    # Check duplicate email
    existing = await users.find_one({"email": body.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{body.email}' is already registered",
        )

    user_doc = {
        "name": body.name,
        "email": body.email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "created_at": datetime.now(timezone.utc),
    }

    result = await users.insert_one(user_doc)

    return {
        "message": "Registration successful",
        "user_id": str(result.inserted_id),
        "role": body.role,
    }


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login and receive a JWT access token",
)
async def login(body: LoginRequest):
    """
    Authentication flow:
      1. Find user by email
      2. Compare plain password against stored bcrypt hash
      3. Generate JWT containing user_id and role
    """
    users = get_collection("users")

    user = await users.find_one({"email": body.email})
    if not user:
        # Generic error — don't reveal whether email exists
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(
        user_id=str(user["_id"]),
        role=user["role"],
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user["role"],
        user_id=str(user["_id"]),
    )