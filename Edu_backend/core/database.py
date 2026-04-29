"""
core/database.py
────────────────
Motor (async) MongoDB client.

Why Motor over PyMongo?
  FastAPI is async-first.  Motor wraps PyMongo's operations inside asyncio
  so we never block the event loop — essential under concurrent load.

Collections are exposed as module-level helpers so routers import them
directly:
    from core.database import get_collection
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from core.config import settings
import logging

logger = logging.getLogger(__name__)

# Module-level client (one connection pool, reused across requests)
_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """Called once at app startup (lifespan event)."""
    global _client, _db
    _client = AsyncIOMotorClient(settings.mongo_uri)
    _db = _client[settings.mongo_db_name]
    logger.info("✅ MongoDB Atlas connected → database: %s", settings.mongo_db_name)

    # Create indexes on first connect
    await _ensure_indexes()


async def close_db() -> None:
    """Called at app shutdown."""
    global _client
    if _client:
        _client.close()
        logger.info("🔌  MongoDB connection closed")


def get_db() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialised. Call connect_db() first.")
    return _db


def get_collection(name: str):
    """Shortcut: get_collection('users') returns db.users"""
    return get_db()[name]


# ── Index definitions ────────────────────────────────────────────────────────

async def _ensure_indexes() -> None:
    """
    Idempotent index creation.
    MongoDB silently skips if index already exists.
    """
    db = get_db()

    # users – unique email for fast lookup & duplicate prevention
    await db.users.create_index("email", unique=True)

    # materials – teacher_id + subject for filtered queries
    await db.materials.create_index([("teacher_id", 1), ("subject", 1)])

    # quizzes – subject index for fast retrieval
    await db.quizzes.create_index("subject")

    # quiz_attempts – student_id for history queries, date for time-series
    await db.quiz_attempts.create_index([("student_id", 1), ("date", -1)])

    # chat_history – student_id + timestamp
    await db.chat_history.create_index([("student_id", 1), ("timestamp", -1)])

    logger.info("✅  MongoDB indexes ensured")