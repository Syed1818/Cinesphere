import uuid
from datetime import date
from types import SimpleNamespace
import numpy as np
from app.services.recommendation_service import MatrixFactorizationALS
from app.services.ml_recommender import CustomMovieRecommenderML
from app.evaluation import RecommendationEvaluator


def test_matrix_factorization_als_convergence():
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    movie_1 = uuid.uuid4()
    movie_2 = uuid.uuid4()
    movie_3 = uuid.uuid4()

    # User A loves Sci-Fi (movies 1 & 2), User B loves movie 3
    ratings = [
        (user_a, movie_1, 10.0),
        (user_a, movie_2, 9.0),
        (user_b, movie_2, 8.0),
        (user_b, movie_3, 10.0),
    ]

    model = MatrixFactorizationALS(n_factors=8, regularization=0.01, iterations=15)
    model.fit(ratings)

    assert user_a in model.user_factors
    assert movie_1 in model.item_factors

    # Check prediction returns bounded float
    pred_a_1 = model.predict(user_a, movie_1)
    assert 0.0 <= pred_a_1 <= 1.0

    # Unseen user returns fallback default
    unknown_user = uuid.uuid4()
    assert model.predict(unknown_user, movie_1) == 0.5


def test_custom_movie_recommender_ml_convergence_and_ranking():
    user_scifi = uuid.uuid4()
    user_drama = uuid.uuid4()
    new_user = uuid.uuid4()

    genre_scifi = SimpleNamespace(id=878, name="Science Fiction")
    genre_action = SimpleNamespace(id=28, name="Action")
    genre_drama = SimpleNamespace(id=18, name="Drama")

    m_scifi_1 = SimpleNamespace(
        id=uuid.uuid4(),
        title="Interstellar Matrix",
        genres=[genre_scifi, genre_action],
        release_date=date(2014, 11, 7),
        runtime_minutes=169,
        vote_average=8.7,
        popularity_score=85.0,
        vote_count=32000,
    )
    m_scifi_2 = SimpleNamespace(
        id=uuid.uuid4(),
        title="Inception Protocol",
        genres=[genre_scifi],
        release_date=date(2010, 7, 16),
        runtime_minutes=148,
        vote_average=8.8,
        popularity_score=92.0,
        vote_count=35000,
    )
    m_drama_1 = SimpleNamespace(
        id=uuid.uuid4(),
        title="The Godfather Chronicle",
        genres=[genre_drama],
        release_date=date(1972, 3, 24),
        runtime_minutes=175,
        vote_average=9.2,
        popularity_score=70.0,
        vote_count=20000,
    )

    movies_map = {
        m_scifi_1.id: m_scifi_1,
        m_scifi_2.id: m_scifi_2,
        m_drama_1.id: m_drama_1,
    }

    # User ratings: user_scifi rates Sci-Fi high (10, 9) and Drama low (3)
    # user_drama rates Drama high (10) and Sci-Fi lower (5)
    ratings = [
        (user_scifi, m_scifi_1.id, 10.0),
        (user_scifi, m_scifi_2.id, 9.0),
        (user_scifi, m_drama_1.id, 3.0),
        (user_drama, m_drama_1.id, 10.0),
        (user_drama, m_scifi_1.id, 5.0),
    ]

    # Cold start profile for new user with preferred genre Science Fiction (878)
    user_profiles = {
        new_user: [878],
    }
    genres_by_id = {878: "Science Fiction", 28: "Action", 18: "Drama"}

    model = CustomMovieRecommenderML(n_factors=8, learning_rate=0.04, regularization=0.01, n_epochs=30)
    model.fit(
        ratings_data=ratings,
        movies_map=movies_map,
        user_profiles_map=user_profiles,
        genres_by_id=genres_by_id,
    )

    assert model.is_fitted
    # Verify training loss decreased
    assert len(model.training_losses) == 30
    assert model.training_losses[-1] < model.training_losses[0]

    # Sci-Fi lover should have higher prediction for Inception Protocol than The Godfather
    pred_scifi_pref = model.predict(user_scifi, m_scifi_2.id)
    pred_drama_pref = model.predict(user_scifi, m_drama_1.id)
    assert pred_scifi_pref > pred_drama_pref

    # Cold-start new user with Science Fiction preference should rank Sci-Fi movies top
    ranked = model.rank_candidates(new_user, list(movies_map.values()), exclude_ids=set(), limit=3)
    assert len(ranked) == 3
    # Top recommendation for the new user should be a Sci-Fi movie
    top_movie = ranked[0][0]
    assert "Science Fiction" in [g.name for g in top_movie.genres]

    # Item similarity test: m_scifi_1 should be more similar to m_scifi_2 than to m_drama_1
    similar_to_1 = model.get_similar_movies(m_scifi_1.id, list(movies_map.values()), limit=2)
    assert len(similar_to_1) == 2
    most_similar_movie, most_similar_score = similar_to_1[0]
    assert most_similar_movie.id == m_scifi_2.id


def test_recommendation_evaluation_metrics():
    evaluator = RecommendationEvaluator(k=5)

    movie_ids = [uuid.uuid4() for _ in range(10)]
    ground_truth_positives = set(movie_ids[:3])

    # Recommended top 5 has 2 hits (items 0 and 1)
    recommended = [movie_ids[0], movie_ids[1], movie_ids[5], movie_ids[6], movie_ids[7]]

    precision = evaluator.precision_at_k(recommended, ground_truth_positives)
    recall = evaluator.recall_at_k(recommended, ground_truth_positives)

    assert precision == 2.0 / 5.0  # 0.40
    assert recall == 2.0 / 3.0     # ~0.6667

    # Test intra-list diversity with orthogonal embeddings
    emb_map = {
        movie_ids[0]: np.array([1.0, 0.0, 0.0]),
        movie_ids[1]: np.array([0.0, 1.0, 0.0]),
    }
    ild = evaluator.intra_list_diversity([movie_ids[0], movie_ids[1]], emb_map)
    # Cosine similarity between [1,0,0] and [0,1,0] is 0 -> Distance is 1 - 0 = 1.0
    assert abs(ild - 1.0) < 1e-4
