"""
core/security.py
────────────────
Handles:
  1. Password hashing  (bcrypt via passlib)
  2. JWT creation      (python-jose)
  3. JWT decoding      (used by dependency get_current_user)

bcrypt compatibility note:
  bcrypt 4.x removed __about__, which triggers a passlib WARNING.
  This is cosmetic only — hashing still works. The warning is suppressed below.
  Additionally, bcrypt hard-limits passwords to 72 bytes. We pre-truncate to
  avoid the ValueError: "password cannot be longer than 72 bytes".
"""

import warnings
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

# ── Suppress passlib's bcrypt __about__ warning (bcrypt 4.x compatibility) ───
# passlib tries to read bcrypt.__about__.__version__ which no longer exists.
# The warning is harmless — hashing works correctly.
logging.getLogger("passlib").setLevel(logging.ERROR)

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from core.config import settings
from core.database import get_collection

# ── Password hashing ─────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# bcrypt hard limit: passwords longer than 72 bytes are silently truncated
# by some bcrypt implementations and raise ValueError in others.
# We truncate safely at the UTF-8 byte level.
_BCRYPT_MAX_BYTES = 72


def _safe_password(plain: str) -> bytes:
    """
    Encode password to UTF-8 bytes and truncate to 72 bytes.
    bcrypt only uses the first 72 bytes anyway — truncating explicitly
    prevents the ValueError from newer bcrypt versions.
    """
    encoded = plain.encode("utf-8")
    return encoded[:_BCRYPT_MAX_BYTES]


def hash_password(plain: str) -> str:
    """Return bcrypt hash of plain-text password (72-byte safe)."""
    safe_password = _safe_password(plain)
    return pwd_context.hash(safe_password)


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time comparison — safe against timing attacks."""
    safe_password = _safe_password(plain)
    return pwd_context.verify(safe_password, hashed)


# ── JWT ──────────────────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(user_id: str, role: str) -> str:
    """
    Payload includes:
      sub  – user_id (standard JWT subject)
      role – student | teacher
      exp  – expiry timestamp
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_expire_minutes
    )
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """
    Decode and validate JWT.
    Raises HTTPException 401 on any failure (expired, tampered, missing).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        user_id: Optional[str] = payload.get("sub")
        role: Optional[str] = payload.get("role")
        if user_id is None or role is None:
            raise credentials_exception
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise credentials_exception


# ── FastAPI dependencies ──────────────────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency injected into any protected route.
    Returns decoded payload: {user_id, role}
    Also verifies user still exists in DB (handles deleted accounts).
    """
    payload = decode_token(token)
    users = get_collection("users")
    from bson import ObjectId
    user = await users.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return payload


async def require_teacher(current_user: dict = Depends(get_current_user)) -> dict:
    """Route guard — only teachers may access."""
    if current_user["role"] != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: teachers only",
        )
    return current_user


async def require_student(current_user: dict = Depends(get_current_user)) -> dict:
    """Route guard — only students may access."""
    if current_user["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: students only",
        )
    return current_user



# ── JWT ──────────────────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(user_id: str, role: str) -> str:
    """
    Payload includes:
      sub  – user_id (standard JWT subject)
      role – student | teacher
      exp  – expiry timestamp
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_expire_minutes
    )
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    """
    Decode and validate JWT.
    Raises HTTPException 401 on any failure (expired, tampered, missing).
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        user_id: Optional[str] = payload.get("sub")
        role: Optional[str] = payload.get("role")
        if user_id is None or role is None:
            raise credentials_exception
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise credentials_exception


# ── FastAPI dependencies ──────────────────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Dependency injected into any protected route.
    Returns decoded payload: {user_id, role}
    Also verifies user still exists in DB (handles deleted accounts).
    """
    payload = decode_token(token)
    users = get_collection("users")
    from bson import ObjectId
    user = await users.find_one({"_id": ObjectId(payload["user_id"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return payload


async def require_teacher(current_user: dict = Depends(get_current_user)) -> dict:
    """Route guard — only teachers may access."""
    if current_user["role"] != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: teachers only",
        )
    return current_user


async def require_student(current_user: dict = Depends(get_current_user)) -> dict:
    """Route guard — only students may access."""
    if current_user["role"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: students only",
        )
    return current_user