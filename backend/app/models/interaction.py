from datetime import datetime, timezone
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import JSONB, UUID, ENUM as PG_ENUM
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserInteraction(Base):
    __tablename__ = "user_interactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    movie_id = Column(UUID(as_uuid=True), ForeignKey("movies.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(
        PG_ENUM("VIEW", "WATCHLIST_ADD", "RATING_SUBMIT", "TRAILER_PLAY", "SHARE", "DISMISS", name="interaction_type", create_type=False),
        nullable=False,
    )
    dwell_time_seconds = Column(Integer, default=0, nullable=False)
    interaction_weight = Column(Numeric(4, 2), default=1.0, nullable=False)
    context_metadata = Column(JSONB, nullable=True)
    occurred_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), primary_key=True)

    user = relationship("User", back_populates="interactions")
    movie = relationship("Movie")

