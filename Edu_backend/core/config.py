"""
core/config.py
──────────────
Centralised settings loaded from .env via pydantic-settings.
Every module imports `settings` from here — never reads os.environ directly.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    # ── MongoDB ──────────────────────────────────────────────────
    mongo_uri: str = Field(..., env="MONGO_URI")
    mongo_db_name: str = Field("eduai", env="MONGO_DB_NAME")

    # ── JWT ──────────────────────────────────────────────────────
    jwt_secret_key: str = Field(..., env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(1440, env="JWT_EXPIRE_MINUTES")

    # ── File storage ─────────────────────────────────────────────
    upload_dir: str = Field("uploads", env="UPLOAD_DIR")
    max_file_size_mb: int = Field(50, env="MAX_FILE_SIZE_MB")

    # ── Ollama ───────────────────────────────────────────────────
    ollama_base_url: str = Field("http://localhost:11434", env="OLLAMA_BASE_URL")
    ollama_model: str = Field("mistral", env="OLLAMA_MODEL")

    # ── Embeddings ───────────────────────────────────────────────
    embedding_model: str = Field(
        "sentence-transformers/all-MiniLM-L6-v2", env="EMBEDDING_MODEL"
    )

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Cached singleton — parsed once, reused everywhere."""
    return Settings()


settings = get_settings()