import uuid
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
from loguru import logger

# 19 Canonical TMDB Genres
GENRE_NAMES: List[str] = [
    "Action",
    "Adventure",
    "Animation",
    "Comedy",
    "Crime",
    "Documentary",
    "Drama",
    "Family",
    "Fantasy",
    "History",
    "Horror",
    "Music",
    "Mystery",
    "Romance",
    "Science Fiction",
    "TV Movie",
    "Thriller",
    "War",
    "Western",
]
GENRE_TO_IDX: Dict[str, int] = {g: i for i, g in enumerate(GENRE_NAMES)}
N_GENRES = len(GENRE_NAMES)


class CustomMovieRecommenderML:
    """
    Custom Machine Learning Recommendation Model.
    Replaces static/synthetic embeddings with a trained Factorized Feature Model:
      - Explicit Content Feature Engineering (19 multi-hot genres + 5 normalized metadata signals)
      - User Taste Modeling (Learned from interaction ratings and onboarding genre preferences)
      - Latent Collaborative Factorization (Joint user/item representations)
      - Element-wise User-Item Feature Interactions with Learned Weights
      - Regularized Stochastic Optimization with Biases & Convergence Tracking
    """

    def __init__(
        self,
        n_factors: int = 16,
        learning_rate: float = 0.02,
        regularization: float = 0.01,
        n_epochs: int = 25,
        random_state: int = 42,
    ):
        self.n_factors = n_factors
        self.lr = learning_rate
        self.reg = regularization
        self.n_epochs = n_epochs
        self.rng = np.random.default_rng(seed=random_state)

        # Global Intercept & Biases
        self.mu: float = 0.5
        self.user_bias: Dict[uuid.UUID, float] = {}
        self.item_bias: Dict[uuid.UUID, float] = {}

        # Latent Factor Matrices
        self.user_factors: Dict[uuid.UUID, np.ndarray] = {}
        self.item_factors: Dict[uuid.UUID, np.ndarray] = {}

        # Learned Feature Weights: 19 for genres, 5 for numerical metadata
        self.w_genre: np.ndarray = np.ones(N_GENRES, dtype=np.float32) * 0.1
        self.w_content: np.ndarray = np.array([0.05, 0.05, 0.20, 0.10, 0.10], dtype=np.float32)

        # Feature representations of all known movies
        self.movie_features: Dict[uuid.UUID, np.ndarray] = {}
        self.movie_genre_vectors: Dict[uuid.UUID, np.ndarray] = {}

        # User profile genre preferences
        self.user_genre_profiles: Dict[uuid.UUID, np.ndarray] = {}

        # Training Telemetry
        self.training_losses: List[float] = []
        self.is_fitted: bool = False

    def extract_movie_features(self, movie: Any) -> Tuple[np.ndarray, np.ndarray]:
        """
        Extracts structured feature vector from a movie instance:
          - genre_vec: 19-dim binary vector (multi-hot)
          - content_vec: 5-dim normalized vector [year, runtime, vote_avg, log_pop, log_vote_count]
        """
        genre_vec = np.zeros(N_GENRES, dtype=np.float32)
        if hasattr(movie, "genres") and movie.genres:
            for g in movie.genres:
                name = getattr(g, "name", None)
                if name and name in GENRE_TO_IDX:
                    genre_vec[GENRE_TO_IDX[name]] = 1.0

        # Normalized Year (1970 - 2026 -> 0.0 to 1.0)
        rel_date = getattr(movie, "release_date", None)
        year = rel_date.year if rel_date else 2010
        norm_year = float(np.clip((year - 1970) / 56.0, 0.0, 1.0))

        # Normalized Runtime (40m - 240m -> 0.0 to 1.0)
        runtime = getattr(movie, "runtime_minutes", 120) or 120
        norm_runtime = float(np.clip(runtime / 240.0, 0.0, 1.0))

        # Normalized Vote Average (0.0 to 10.0 -> 0.0 to 1.0)
        vote_avg = float(getattr(movie, "vote_average", 7.0) or 7.0)
        norm_vote = float(np.clip(vote_avg / 10.0, 0.0, 1.0))

        # Log-scaled Popularity
        pop = float(getattr(movie, "popularity_score", 50.0) or 50.0)
        norm_pop = float(np.clip(np.log1p(pop) / 6.0, 0.0, 1.0))

        # Log-scaled Vote Count
        v_count = float(getattr(movie, "vote_count", 1000) or 1000)
        norm_count = float(np.clip(np.log1p(v_count) / 10.0, 0.0, 1.0))

        content_vec = np.array([norm_year, norm_runtime, norm_vote, norm_pop, norm_count], dtype=np.float32)
        return genre_vec, content_vec

    def build_user_genre_profile(
        self,
        user_ratings: List[Tuple[uuid.UUID, float]],
        movies_map: Dict[uuid.UUID, Any],
        preferred_genre_ids: Optional[List[int]] = None,
        genres_by_id: Optional[Dict[int, str]] = None,
    ) -> np.ndarray:
        """
        Builds a normalized 19-dimensional genre affinity vector for a user.
        Combines explicit historical ratings with onboarding genre selections.
        """
        genre_scores = np.zeros(N_GENRES, dtype=np.float32)
        genre_counts = np.zeros(N_GENRES, dtype=np.float32)

        # 1. Learn from rating history
        for movie_id, rating_val in user_ratings:
            if movie_id in movies_map:
                m = movies_map[movie_id]
                g_vec, _ = self.extract_movie_features(m)
                weight = float(rating_val - 5.0)  # scale around neutral 5.0 (-4 to +5)
                genre_scores += g_vec * weight
                genre_counts += g_vec

        # Normalize ratings-based genre affinities
        mask = genre_counts > 0
        if np.any(mask):
            genre_scores[mask] = genre_scores[mask] / genre_counts[mask]

        # 2. Prioritize onboarding preferred genres (Cold-Start & Taste Anchor)
        if preferred_genre_ids and genres_by_id:
            for gid in preferred_genre_ids:
                name = genres_by_id.get(gid)
                if name and name in GENRE_TO_IDX:
                    idx = GENRE_TO_IDX[name]
                    # Boost preferred genres positively
                    genre_scores[idx] = max(genre_scores[idx], 3.0)

        # Scale into [-1.0, 1.0] range
        max_abs = np.max(np.abs(genre_scores))
        if max_abs > 0:
            return genre_scores / max_abs
        return genre_scores

    def fit(
        self,
        ratings_data: List[Tuple[uuid.UUID, uuid.UUID, float]],
        movies_map: Dict[uuid.UUID, Any],
        user_profiles_map: Optional[Dict[uuid.UUID, List[int]]] = None,
        genres_by_id: Optional[Dict[int, str]] = None,
    ):
        """
        Trains the custom machine learning model on user ratings and structured movie features.
        """
        user_profiles_map = user_profiles_map or {}
        genres_by_id = genres_by_id or {}

        # 1. Extract and store features for all movies
        for m_id, movie in movies_map.items():
            g_vec, c_vec = self.extract_movie_features(movie)
            self.movie_genre_vectors[m_id] = g_vec
            self.movie_features[m_id] = c_vec

        # 2. Precompute user genre profiles
        ratings_by_user: Dict[uuid.UUID, List[Tuple[uuid.UUID, float]]] = {}
        for u_id, m_id, r in ratings_data:
            ratings_by_user.setdefault(u_id, []).append((m_id, r))

        all_user_ids = set(ratings_by_user.keys()) | set(user_profiles_map.keys())
        for u_id in all_user_ids:
            u_ratings = ratings_by_user.get(u_id, [])
            pref_ids = user_profiles_map.get(u_id, [])
            self.user_genre_profiles[u_id] = self.build_user_genre_profile(
                u_ratings, movies_map, pref_ids, genres_by_id
            )

        if not ratings_data:
            self.is_fitted = True
            return

        # 3. Initialize model parameters
        all_movie_ids = list(movies_map.keys())
        all_user_list = list(all_user_ids)

        # Global average rating (normalized to 0.0 - 1.0)
        norm_ratings = [(u, m, (r - 1.0) / 9.0) for u, m, r in ratings_data]
        self.mu = float(np.mean([r for _, _, r in norm_ratings]))

        for u in all_user_list:
            self.user_bias[u] = 0.0
            self.user_factors[u] = self.rng.normal(0, 0.05, self.n_factors).astype(np.float32)

        for m in all_movie_ids:
            self.item_bias[m] = 0.0
            self.item_factors[m] = self.rng.normal(0, 0.05, self.n_factors).astype(np.float32)

        # 4. Stochastic Gradient Descent Optimization
        self.training_losses = []
        n_samples = len(norm_ratings)
        lr = self.lr
        reg = self.reg

        for epoch in range(self.n_epochs):
            # Shuffle training data
            indices = self.rng.permutation(n_samples)
            total_loss = 0.0

            for idx in indices:
                u, m, target = norm_ratings[idx]
                if m not in self.movie_features:
                    continue

                # Forward pass
                u_factors = self.user_factors[u]
                i_factors = self.item_factors[m]
                b_u = self.user_bias[u]
                b_i = self.item_bias[m]

                g_i = self.movie_genre_vectors[m]
                c_i = self.movie_features[m]
                u_g = self.user_genre_profiles.get(u, np.zeros(N_GENRES, dtype=np.float32))

                # Prediction components
                latent_term = float(np.dot(u_factors, i_factors))
                genre_term = float(np.dot(self.w_genre, u_g * g_i))
                content_term = float(np.dot(self.w_content, c_i))

                pred = self.mu + b_u + b_i + latent_term + genre_term + content_term
                pred_clamped = max(0.0, min(1.0, pred))

                err = target - pred_clamped
                total_loss += err**2

                # Backward pass & parameter updates with L2 regularization
                self.user_bias[u] += lr * (err - reg * b_u)
                self.item_bias[m] += lr * (err - reg * b_i)

                new_u_factors = u_factors + lr * (err * i_factors - reg * u_factors)
                new_i_factors = i_factors + lr * (err * u_factors - reg * i_factors)
                self.user_factors[u] = new_u_factors
                self.item_factors[m] = new_i_factors

                self.w_genre += lr * (err * (u_g * g_i) - reg * self.w_genre)
                self.w_content += lr * (err * c_i - reg * self.w_content)

            mse = total_loss / max(1, n_samples)
            self.training_losses.append(float(mse))

        self.is_fitted = True
        logger.info(
            f"Custom ML Recommender trained across {self.n_epochs} epochs. Final MSE: {self.training_losses[-1]:.4f}"
        )

    def predict(
        self,
        user_id: uuid.UUID,
        movie_id: uuid.UUID,
        movie_obj: Optional[Any] = None,
    ) -> float:
        """
        Predicts an affinity score (0.0 to 1.0) for a given user and movie.
        """
        # Ensure movie feature cache
        if movie_id not in self.movie_features and movie_obj:
            g_vec, c_vec = self.extract_movie_features(movie_obj)
            self.movie_genre_vectors[movie_id] = g_vec
            self.movie_features[movie_id] = c_vec

        if movie_id not in self.movie_features:
            return 0.5

        g_i = self.movie_genre_vectors[movie_id]
        c_i = self.movie_features[movie_id]
        u_g = self.user_genre_profiles.get(user_id, np.zeros(N_GENRES, dtype=np.float32))

        b_u = self.user_bias.get(user_id, 0.0)
        b_i = self.item_bias.get(movie_id, 0.0)

        u_factors = self.user_factors.get(user_id, np.zeros(self.n_factors, dtype=np.float32))
        i_factors = self.item_factors.get(movie_id, np.zeros(self.n_factors, dtype=np.float32))

        latent_score = float(np.dot(u_factors, i_factors))
        genre_score = float(np.dot(self.w_genre, u_g * g_i))
        content_score = float(np.dot(self.w_content, c_i))

        score = self.mu + b_u + b_i + latent_score + genre_score + content_score
        return float(np.clip(score, 0.0, 1.0))

    def rank_candidates(
        self,
        user_id: uuid.UUID,
        candidate_movies: List[Any],
        exclude_ids: Set[uuid.UUID],
        limit: int = 24,
    ) -> List[Tuple[Any, float, str, str]]:
        """
        Ranks candidate movies for a user using the custom ML model.
        Returns a list of tuples: (movie, predicted_score, algorithm_tag, explanation).
        """
        scored_items: List[Tuple[Any, float, str, str]] = []
        u_g = self.user_genre_profiles.get(user_id, np.zeros(N_GENRES, dtype=np.float32))
        has_user_history = user_id in self.user_factors and np.linalg.norm(self.user_factors[user_id]) > 0.01

        for m in candidate_movies:
            if m.id in exclude_ids:
                continue

            score = self.predict(user_id, m.id, movie_obj=m)

            # Analyze prediction drivers for personalized explanation
            g_vec = self.movie_genre_vectors.get(m.id, np.zeros(N_GENRES, dtype=np.float32))
            genre_interaction = float(np.dot(self.w_genre, u_g * g_vec))
            i_factors = self.item_factors.get(m.id, np.zeros(self.n_factors, dtype=np.float32))
            u_factors = self.user_factors.get(user_id, np.zeros(self.n_factors, dtype=np.float32))
            collab_score = float(np.dot(u_factors, i_factors))

            # Dynamic Explanation Generation based on model components
            matched_genres = [GENRE_NAMES[i] for i in range(N_GENRES) if g_vec[i] > 0 and u_g[i] > 0.2]
            if genre_interaction > 0.15 and matched_genres:
                algo = "ML_CONTENT"
                genres_str = ", ".join(matched_genres[:2])
                exp = f"ML model detected strong affinity for your favorite {genres_str} themes"
            elif has_user_history and collab_score > 0.10:
                algo = "ML_COLLABORATIVE"
                exp = "High predicted preference based on peer taste co-occurrence"
            elif float(getattr(m, "vote_average", 0)) >= 8.3:
                algo = "ML_CRITIC_CHOICE"
                exp = "Critically acclaimed worldwide with strong global feature signals"
            else:
                algo = "CUSTOM_ML"
                exp = "Personalized machine learning recommendation for your taste profile"

            scored_items.append((m, round(score, 4), algo, exp))

        # Sort descending by custom ML predicted score
        scored_items.sort(key=lambda x: x[1], reverse=True)
        return scored_items[:limit]

    def get_similar_movies(
        self,
        movie_id: uuid.UUID,
        all_movies: List[Any],
        limit: int = 12,
    ) -> List[Tuple[Any, float]]:
        """
        Computes item-to-item similarity using the custom ML model's learned representation space:
          z_i = [item_factors_i, sqrt(|w_genre|) * genre_vec_i, sqrt(|w_content|) * content_vec_i]
        """
        # Find target movie
        target_movie = next((m for m in all_movies if m.id == movie_id), None)
        if not target_movie:
            return []

        # Ensure features for target movie
        if movie_id not in self.movie_features:
            g_vec, c_vec = self.extract_movie_features(target_movie)
            self.movie_genre_vectors[movie_id] = g_vec
            self.movie_features[movie_id] = c_vec

        target_rep = self._get_item_representation(movie_id)
        target_norm = np.linalg.norm(target_rep)
        if target_norm == 0:
            return []

        scored_items: List[Tuple[Any, float]] = []

        for m in all_movies:
            if m.id == movie_id:
                continue

            if m.id not in self.movie_features:
                g_vec, c_vec = self.extract_movie_features(m)
                self.movie_genre_vectors[m.id] = g_vec
                self.movie_features[m.id] = c_vec

            rep = self._get_item_representation(m.id)
            norm = np.linalg.norm(rep)
            if norm > 0:
                cosine_sim = float(np.dot(target_rep, rep) / (target_norm * norm))
                # Map to [0.0, 1.0] range
                sim_score = max(0.0, min(1.0, (cosine_sim + 1.0) / 2.0))
                scored_items.append((m, round(sim_score, 4)))

        scored_items.sort(key=lambda x: x[1], reverse=True)
        return scored_items[:limit]

    def _get_item_representation(self, movie_id: uuid.UUID) -> np.ndarray:
        """
        Generates a dense feature representation combining learned latent factors and content signals.
        """
        latent = self.item_factors.get(movie_id, np.zeros(self.n_factors, dtype=np.float32))
        genres = self.movie_genre_vectors.get(movie_id, np.zeros(N_GENRES, dtype=np.float32))
        content = self.movie_features.get(movie_id, np.zeros(5, dtype=np.float32))

        # Weight the features by the model's learned importance
        weighted_genres = genres * np.sqrt(np.abs(self.w_genre))
        weighted_content = content * np.sqrt(np.abs(self.w_content))

        return np.concatenate([latent, weighted_genres, weighted_content])

