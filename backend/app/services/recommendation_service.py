import uuid
from typing import Dict, List, Set, Tuple
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.movie import Movie, Genre
from app.models.rating import Rating
from app.models.user import UserProfile
from app.schemas.recommendation import RecommendationItem, RecommendationFeedResponse
from app.schemas.movie import GenreResponse
from app.core.cache import cache_get, cache_set
from app.services.ml_recommender import CustomMovieRecommenderML


class MatrixFactorizationALS:
    """
    Alternating Least Squares (ALS) Matrix Factorization for Collaborative Filtering.
    Learns latent factor matrices P (User factors) and Q (Item factors).
    """
    def __init__(self, n_factors: int = 16, regularization: float = 0.05, iterations: int = 10):
        self.n_factors = n_factors
        self.reg = regularization
        self.iterations = iterations
        self.user_factors: Dict[uuid.UUID, np.ndarray] = {}
        self.item_factors: Dict[uuid.UUID, np.ndarray] = {}

    def fit(self, ratings_data: List[Tuple[uuid.UUID, uuid.UUID, float]]):
        if not ratings_data:
            return

        unique_users = list({r[0] for r in ratings_data})
        unique_items = list({r[1] for r in ratings_data})

        user_idx_map = {u: i for i, u in enumerate(unique_users)}
        item_idx_map = {m: i for i, m in enumerate(unique_items)}

        n_users = len(unique_users)
        n_items = len(unique_items)

        if n_users == 0 or n_items == 0:
            return

        rng = np.random.default_rng(seed=42)
        P = rng.normal(0, 0.1, (n_users, self.n_factors))
        Q = rng.normal(0, 0.1, (n_items, self.n_factors))

        user_ratings: Dict[int, List[Tuple[int, float]]] = {i: [] for i in range(n_users)}
        item_ratings: Dict[int, List[Tuple[int, float]]] = {j: [] for j in range(n_items)}

        for u, m, r in ratings_data:
            ui = user_idx_map[u]
            mi = item_idx_map[m]
            norm_r = (r - 1.0) / 9.0  # normalize rating 1-10 to 0-1
            user_ratings[ui].append((mi, norm_r))
            item_ratings[mi].append((ui, norm_r))

        for _ in range(self.iterations):
            for u in range(n_users):
                if not user_ratings[u]:
                    continue
                items_u = [item for item, _ in user_ratings[u]]
                ratings_u = np.array([rating for _, rating in user_ratings[u]])
                Q_u = Q[items_u, :]
                A = Q_u.T @ Q_u + self.reg * np.eye(self.n_factors)
                V = Q_u.T @ ratings_u
                P[u] = np.linalg.solve(A, V)

            for i in range(n_items):
                if not item_ratings[i]:
                    continue
                users_i = [u for u, _ in item_ratings[i]]
                ratings_i = np.array([rating for _, rating in item_ratings[i]])
                P_i = P[users_i, :]
                A = P_i.T @ P_i + self.reg * np.eye(self.n_factors)
                V = P_i.T @ ratings_i
                Q[i] = np.linalg.solve(A, V)

        for u, idx in user_idx_map.items():
            self.user_factors[u] = P[idx]
        for m, idx in item_idx_map.items():
            self.item_factors[m] = Q[idx]

    def predict(self, user_id: uuid.UUID, movie_id: uuid.UUID) -> float:
        if user_id in self.user_factors and movie_id in self.item_factors:
            score = float(np.dot(self.user_factors[user_id], self.item_factors[movie_id]))
            return max(0.0, min(1.0, score))
        return 0.5


async def train_ml_recommender(db: AsyncSession) -> Tuple[CustomMovieRecommenderML, Dict[uuid.UUID, Movie]]:
    """
    Trains the custom machine learning model on current database state:
    extracts structured movie features (genres, metadata), user profiles, and ratings.
    """
    # 1. Fetch all movies with eagerly-loaded genres
    movies_query = select(Movie).options(selectinload(Movie.genres))
    movies_res = await db.execute(movies_query)
    all_movies = list(movies_res.scalars().all())
    movies_map = {m.id: m for m in all_movies}

    # 2. Fetch all user ratings
    ratings_query = select(Rating.user_id, Rating.movie_id, Rating.rating_value)
    ratings_res = await db.execute(ratings_query)
    all_ratings = [(r.user_id, r.movie_id, float(r.rating_value)) for r in ratings_res.all()]

    # 3. Fetch user profiles for onboarding preferred genres
    profiles_query = select(UserProfile.user_id, UserProfile.preferred_genres)
    profiles_res = await db.execute(profiles_query)
    user_profiles = {r.user_id: (r.preferred_genres or []) for r in profiles_res.all()}

    # 4. Fetch all genres
    genres_query = select(Genre.id, Genre.name)
    genres_res = await db.execute(genres_query)
    genres_by_id = {g.id: g.name for g in genres_res.all()}

    # 5. Train Custom ML Recommender
    ml_model = CustomMovieRecommenderML(
        n_factors=16,
        learning_rate=0.03,
        regularization=0.01,
        n_epochs=20,
    )
    ml_model.fit(
        ratings_data=all_ratings,
        movies_map=movies_map,
        user_profiles_map=user_profiles,
        genres_by_id=genres_by_id,
    )

    return ml_model, movies_map


async def get_hybrid_recommendations(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 24,
) -> RecommendationFeedResponse:
    """
    Generates personalized recommendations using our Custom Machine Learning Model.
    Replaces static embeddings with structured feature learning and user taste profiles.
    """
    cache_key = f"recs:user:{user_id}:l{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return RecommendationFeedResponse(**cached)

    # 1. Fetch movies already rated by this user to exclude them
    user_rated_query = select(Rating.movie_id).where(Rating.user_id == user_id)
    user_rated_res = await db.execute(user_rated_query)
    exclude_ids: Set[uuid.UUID] = set(user_rated_res.scalars().all())

    # 2. Train custom ML model on current database state
    ml_model, movies_map = await train_ml_recommender(db)

    # 3. Score and rank non-rated candidate movies
    all_candidate_movies = list(movies_map.values())
    ranked_items = ml_model.rank_candidates(
        user_id=user_id,
        candidate_movies=all_candidate_movies,
        exclude_ids=exclude_ids,
        limit=limit,
    )

    # 4. Format into RecommendationFeedResponse
    result_items: List[RecommendationItem] = []
    for m, score, algo, exp in ranked_items:
        result_items.append(
            RecommendationItem(
                id=m.id,
                tmdb_id=m.tmdb_id,
                imdb_id=m.imdb_id,
                title=m.title,
                original_title=m.original_title,
                release_date=m.release_date,
                runtime_minutes=m.runtime_minutes,
                poster_path=m.poster_path,
                backdrop_path=m.backdrop_path,
                vote_average=float(m.vote_average),
                vote_count=m.vote_count,
                popularity_score=float(m.popularity_score),
                genres=[GenreResponse.model_validate(g) for g in m.genres],
                similarity_score=score,
                algorithm=algo,
                explanation=exp,
            )
        )

    response = RecommendationFeedResponse(
        user_id=str(user_id),
        feed_title="Recommended For You (Custom ML)",
        algorithm="CUSTOM_ML (Factorized Feature & Collaborative Model)",
        items=result_items,
    )

    # Cache user feed for 15 minutes
    await cache_set(cache_key, response.model_dump(mode="json"), ttl_seconds=900)
    return response


async def get_similar_movies(
    db: AsyncSession,
    movie_id: uuid.UUID,
    limit: int = 12,
) -> List[RecommendationItem]:
    """
    Computes similar movies using the custom ML model's learned representation space,
    without relying on static 768-dim embeddings.
    """
    cache_key = f"movies:similar:{movie_id}:l{limit}"
    cached = await cache_get(cache_key)
    if cached:
        return [RecommendationItem(**item) for item in cached]

    # Train/initialize custom ML model on all movies
    ml_model, movies_map = await train_ml_recommender(db)

    similar_pairs = ml_model.get_similar_movies(
        movie_id=movie_id,
        all_movies=list(movies_map.values()),
        limit=limit,
    )

    similar_movies: List[RecommendationItem] = []
    for m, score in similar_pairs:
        # Determine top shared genre for explanation
        target_m = movies_map.get(movie_id)
        target_genres = {g.name for g in target_m.genres} if target_m else set()
        cand_genres = {g.name for g in m.genres}
        shared = target_genres & cand_genres
        genre_hint = f" ({', '.join(list(shared)[:2])})" if shared else ""

        similar_movies.append(
            RecommendationItem(
                id=m.id,
                tmdb_id=m.tmdb_id,
                imdb_id=m.imdb_id,
                title=m.title,
                original_title=m.original_title,
                release_date=m.release_date,
                runtime_minutes=m.runtime_minutes,
                poster_path=m.poster_path,
                backdrop_path=m.backdrop_path,
                vote_average=float(m.vote_average),
                vote_count=m.vote_count,
                popularity_score=float(m.popularity_score),
                genres=[GenreResponse.model_validate(g) for g in m.genres],
                similarity_score=score,
                algorithm="CUSTOM_ML",
                explanation=f"Custom ML matched cinematic style, themes{genre_hint}, and audience reception",
            )
        )

    await cache_set(cache_key, [item.model_dump(mode="json") for item in similar_movies], ttl_seconds=3600)
    return similar_movies
