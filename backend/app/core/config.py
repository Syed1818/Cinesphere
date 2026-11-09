from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Movie Recommendation Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5050",
    ]

    # Database Configuration (PostgreSQL 16 with pgvector)
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres_secure_pass"
    POSTGRES_DB: str = "movie_rec_db"
    
    # Direct and Async SQLAlchemy URLs
    DATABASE_URL: str = ""
    ASYNC_DATABASE_URL: str = ""

    # Security & JWT Tokens
    SECRET_KEY: str = "insecure-default-change-in-production-movie-rec-secret-key-32chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # External APIs (TMDB / OMDB)
    TMDB_API_KEY: str = ""
    TMDB_BASE_URL: str = "https://api.themoviedb.org/3"
    OMDB_API_KEY: str = ""
    OMDB_BASE_URL: str = "https://www.omdbapi.com"

    # Recommendation System Hyperparameters
    EMBEDDING_DIMENSION: int = 768
    CF_LATENT_FACTORS: int = 32
    CF_REGULARIZATION: float = 0.05
    CF_ITERATIONS: int = 15

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def model_post_init(self, __context):
        if self.DATABASE_URL:
            # Normalize to psycopg2/psycopg for sync engine
            if self.DATABASE_URL.startswith("postgresql://"):
                clean_url = self.DATABASE_URL.replace("postgresql://", "")
                self.DATABASE_URL = f"postgresql+psycopg2://{clean_url}"
                if not self.ASYNC_DATABASE_URL:
                    self.ASYNC_DATABASE_URL = f"postgresql+asyncpg://{clean_url}"
        else:
            self.DATABASE_URL = (
                f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
                f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
            )
            if not self.ASYNC_DATABASE_URL:
                self.ASYNC_DATABASE_URL = (
                    f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
                    f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
                )


settings = Settings()

