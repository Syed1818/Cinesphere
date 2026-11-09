from app.core.database import Base
from app.models.user import User, UserProfile, OAuthAccount
from app.models.movie import Genre, Movie, MovieGenre, Person, MovieCredit, MovieEmbedding, UserPreferenceEmbedding
from app.models.rating import Rating
from app.models.watchlist import Watchlist, WatchlistItem
from app.models.interaction import UserInteraction

__all__ = [
    "Base",
    "User",
    "UserProfile",
    "OAuthAccount",
    "Genre",
    "Movie",
    "MovieGenre",
    "Person",
    "MovieCredit",
    "MovieEmbedding",
    "UserPreferenceEmbedding",
    "Rating",
    "Watchlist",
    "WatchlistItem",
    "UserInteraction",
]

