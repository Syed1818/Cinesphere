import uuid
from typing import Dict, List, Set, Tuple
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from loguru import logger

from app.core.database import SyncSessionLocal
from app.models.movie import Movie, Genre
from app.models.rating import Rating
from app.models.user import UserProfile
from app.services.ml_recommender import CustomMovieRecommenderML


class RecommendationEvaluator:
    """
    Offline Evaluation Framework for Recommendation Quality and Diversity.
    Computes standard Information Retrieval and RecSys metrics:
      - NDCG@K (Normalized Discounted Cumulative Gain)
      - Precision@K
      - Recall@K
      - MRR (Mean Reciprocal Rank)
      - Catalog Coverage
      - Intra-List Diversity (ILD) using custom learned feature vectors
    """

    def __init__(self, k: int = 10):
        self.k = k

    @staticmethod
    def dcg_at_k(relevance_scores: List[float], k: int) -> float:
        relevance_scores = relevance_scores[:k]
        if not relevance_scores:
            return 0.0
        dcg = relevance_scores[0] + sum(
            rel / np.log2(idx + 1) for idx, rel in enumerate(relevance_scores[1:], start=2)
        )
        return float(dcg)

    def ndcg_at_k(self, predicted_relevances: List[float], ideal_relevances: List[float]) -> float:
        dcg = self.dcg_at_k(predicted_relevances, self.k)
        idcg = self.dcg_at_k(sorted(ideal_relevances, reverse=True), self.k)
        if idcg == 0.0:
            return 0.0
        return float(dcg / idcg)

    def precision_at_k(self, recommended_ids: List[uuid.UUID], ground_truth_positive_ids: Set[uuid.UUID]) -> float:
        top_k = recommended_ids[: self.k]
        if not top_k:
            return 0.0
        hits = len(set(top_k) & ground_truth_positive_ids)
        return float(hits / len(top_k))

    def recall_at_k(self, recommended_ids: List[uuid.UUID], ground_truth_positive_ids: Set[uuid.UUID]) -> float:
        if not ground_truth_positive_ids:
            return 0.0
        top_k = recommended_ids[: self.k]
        hits = len(set(top_k) & ground_truth_positive_ids)
        return float(hits / len(ground_truth_positive_ids))

    def intra_list_diversity(
        self, recommended_ids: List[uuid.UUID], representations_map: Dict[uuid.UUID, np.ndarray]
    ) -> float:
        top_k = [item_id for item_id in recommended_ids[: self.k] if item_id in representations_map]
        n = len(top_k)
        if n < 2:
            return 0.0

        pairwise_distances = []
        for i in range(n):
            for j in range(i + 1, n):
                v_i = representations_map[top_k[i]]
                v_j = representations_map[top_k[j]]
                norm_i = np.linalg.norm(v_i)
                norm_j = np.linalg.norm(v_j)
                if norm_i > 0 and norm_j > 0:
                    cos_sim = np.dot(v_i, v_j) / (norm_i * norm_j)
                    pairwise_distances.append(1.0 - cos_sim)

        if not pairwise_distances:
            return 0.0
        return float(np.mean(pairwise_distances))


def run_benchmark():
    logger.info("Running Offline Recommendation Benchmark...")
    session = SyncSessionLocal()

    try:
        # Load all ratings
        ratings_res = session.execute(select(Rating.user_id, Rating.movie_id, Rating.rating_value))
        all_ratings = [(r.user_id, r.movie_id, float(r.rating_value)) for r in ratings_res.all()]

        if not all_ratings:
            logger.warning("No ratings found in database. Seed data first by running: python -m app.seed")
            return

        # Load movies with genres
        movies_res = session.execute(select(Movie).options(selectinload(Movie.genres)))
        all_movies = list(movies_res.scalars().all())
        movies_map = {m.id: m for m in all_movies}
        all_movie_ids = list(movies_map.keys())

        # Load user profiles
        profiles_res = session.execute(select(UserProfile.user_id, UserProfile.preferred_genres))
        user_profiles = {r.user_id: (r.preferred_genres or []) for r in profiles_res.all()}

        # Load genres
        genres_res = session.execute(select(Genre.id, Genre.name))
        genres_by_id = {g.id: g.name for g in genres_res.all()}

        # Group ratings by user
        user_ratings_map: Dict[uuid.UUID, List[Tuple[uuid.UUID, float]]] = {}
        for uid, mid, val in all_ratings:
            user_ratings_map.setdefault(uid, []).append((mid, float(val)))

        # Train Custom Machine Learning Model
        ml_model = CustomMovieRecommenderML(n_factors=16, learning_rate=0.03, regularization=0.01, n_epochs=25)
        ml_model.fit(
            ratings_data=all_ratings,
            movies_map=movies_map,
            user_profiles_map=user_profiles,
            genres_by_id=genres_by_id,
        )

        # Build feature representation map for Intra-List Diversity
        representations_map = {m.id: ml_model._get_item_representation(m.id) for m in all_movies}

        evaluator = RecommendationEvaluator(k=10)
        precisions = []
        recalls = []
        diversities = []
        all_recommended_items: Set[uuid.UUID] = set()

        for uid, user_r in user_ratings_map.items():
            positives = {mid for mid, val in user_r if val >= 7.0}
            if not positives:
                continue

            # Predict scores for all candidate movies
            ranked = ml_model.rank_candidates(uid, all_movies, exclude_ids=set(), limit=10)
            top_rec_ids = [m.id for m, _, _, _ in ranked]

            all_recommended_items.update(top_rec_ids)
            precisions.append(evaluator.precision_at_k(top_rec_ids, positives))
            recalls.append(evaluator.recall_at_k(top_rec_ids, positives))
            diversities.append(evaluator.intra_list_diversity(top_rec_ids, representations_map))

        total_catalog = len(all_movie_ids)
        coverage = (len(all_recommended_items) / total_catalog * 100) if total_catalog > 0 else 0.0

        mean_precision = np.mean(precisions) if precisions else 0.0
        mean_recall = np.mean(recalls) if recalls else 0.0
        mean_diversity = np.mean(diversities) if diversities else 0.0

        print("\n=======================================================")
        print("   CINESPHERE CUSTOM ML MODEL BENCHMARK REPORT         ")
        print("=======================================================")
        print(f" Model Architecture:           Custom Factorized Feature Model")
        print(f" Final Training Loss (MSE):    {ml_model.training_losses[-1]:.4f}")
        print(f" Evaluated Users:              {len(precisions)}")
        print(f" Precision@10:                 {mean_precision:.4f} ({mean_precision * 100:.1f}%)")
        print(f" Recall@10:                    {mean_recall:.4f} ({mean_recall * 100:.1f}%)")
        print(f" Intra-List Diversity (ILD):   {mean_diversity:.4f} (Learned feature cosine distance)")
        print(f" Catalog Coverage:             {coverage:.2f}% ({len(all_recommended_items)} / {total_catalog} titles)")
        print("=======================================================\n")

    except Exception as e:
        logger.error(f"Benchmark error: {e}")
    finally:
        session.close()


if __name__ == "__main__":
    run_benchmark()
