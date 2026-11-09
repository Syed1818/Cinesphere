from datetime import date
import numpy as np
from sqlalchemy import select, text
from loguru import logger

from app.core.database import SyncSessionLocal, sync_engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserProfile
from app.models.movie import Genre, Movie, MovieGenre, Person, MovieCredit, MovieEmbedding
from app.models.rating import Rating
from app.models.watchlist import Watchlist, WatchlistItem
from app.movies_dataset_expanded import EXPANDED_MOVIES


def generate_semantic_embedding(genre_ids: list, seed_num: int, dim: int = 768) -> list:
    """
    Generates deterministic, normalized 768-dim embeddings clustered by genre semantics.
    Ensures that Sci-Fi movies cluster near each other, Dramas near Dramas, etc.
    """
    rng = np.random.default_rng(seed=seed_num)
    vec = rng.normal(0, 0.1, dim)

    # Inject cluster signature based on genres
    for gid in genre_ids:
        genre_rng = np.random.default_rng(seed=gid * 1000)
        genre_signature = genre_rng.normal(0, 0.5, dim)
        vec += genre_signature

    norm = np.linalg.norm(vec)
    return (vec / norm).tolist()


def run_seed():
    logger.info("Initializing database schema and seed data...")
    session = SyncSessionLocal()

    try:
        # Verify extensions
        session.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
        session.execute(text("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"))
        session.execute(text("CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"))
        session.commit()

        # Attempt pgvector extension if installed
        try:
            session.execute(text("CREATE EXTENSION IF NOT EXISTS \"vector\";"))
            session.commit()
        except Exception:
            session.rollback()
            logger.info("pgvector extension not installed in Postgres lib; using native array storage for embeddings.")

        # Create all tables if not exist
        Base.metadata.create_all(bind=sync_engine)
        session.commit()

        # ----------------------------------------------------------------------
        # 1. SEED GENRES
        # ----------------------------------------------------------------------
        genres_data = [
            (28, "Action", "action"),
            (12, "Adventure", "adventure"),
            (16, "Animation", "animation"),
            (35, "Comedy", "comedy"),
            (80, "Crime", "crime"),
            (99, "Documentary", "documentary"),
            (18, "Drama", "drama"),
            (10751, "Family", "family"),
            (14, "Fantasy", "fantasy"),
            (36, "History", "history"),
            (27, "Horror", "horror"),
            (10402, "Music", "music"),
            (9648, "Mystery", "mystery"),
            (10749, "Romance", "romance"),
            (878, "Science Fiction", "science-fiction"),
            (10770, "TV Movie", "tv-movie"),
            (53, "Thriller", "thriller"),
            (10752, "War", "war"),
            (37, "Western", "western"),
        ]

        genre_map = {}
        for tmdb_id, name, slug in genres_data:
            existing = session.execute(select(Genre).where(Genre.tmdb_id == tmdb_id)).scalars().first()
            if not existing:
                g = Genre(tmdb_id=tmdb_id, name=name, slug=slug)
                session.add(g)
                session.flush()
                genre_map[tmdb_id] = g
            else:
                genre_map[tmdb_id] = existing
        session.commit()
        logger.info(f"Seeded {len(genres_data)} movie genres.")

        # ----------------------------------------------------------------------
        # 2. SEED MOVIES & EMBEDDINGS
        # ----------------------------------------------------------------------
        movies_dataset = [
            {
                "tmdb_id": 27205,
                "imdb_id": "tt1375666",
                "title": "Inception",
                "original_title": "Inception",
                "tagline": "Your mind is the scene of the crime.",
                "overview": "Cobb, a skilled thief who steals corporate secrets through dream-sharing technology, is given the inverse task of planting an idea into the mind of a CEO.",
                "release_date": date(2010, 7, 16),
                "runtime": 148,
                "poster": "/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
                "backdrop": "/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg",
                "vote_avg": 8.36,
                "vote_count": 35200,
                "popularity": 128.45,
                "genres": [28, 878, 12],
                "director": "Christopher Nolan",
                "cast": [("Leonardo DiCaprio", "Dom Cobb"), ("Joseph Gordon-Levitt", "Arthur"), ("Elliot Page", "Ariadne"), ("Tom Hardy", "Eames")],
            },
            {
                "tmdb_id": 157336,
                "imdb_id": "tt0816692",
                "title": "Interstellar",
                "original_title": "Interstellar",
                "tagline": "Mankind was born on Earth. It was never meant to die here.",
                "overview": "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.",
                "release_date": date(2014, 11, 5),
                "runtime": 169,
                "poster": "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
                "backdrop": "/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
                "vote_avg": 8.44,
                "vote_count": 34100,
                "popularity": 145.20,
                "genres": [12, 18, 878],
                "director": "Christopher Nolan",
                "cast": [("Matthew McConaughey", "Cooper"), ("Anne Hathaway", "Brand"), ("Jessica Chastain", "Murph"), ("Michael Caine", "Professor Brand")],
            },
            {
                "tmdb_id": 155,
                "imdb_id": "tt0468569",
                "title": "The Dark Knight",
                "original_title": "The Dark Knight",
                "tagline": "Welcome to a world without rules.",
                "overview": "Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations that plague the streets.",
                "release_date": date(2008, 7, 16),
                "runtime": 152,
                "poster": "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
                "backdrop": "/dqK9Hag1054tghRQSqLSfrkvQnA.jpg",
                "vote_avg": 8.51,
                "vote_count": 32000,
                "popularity": 115.80,
                "genres": [18, 28, 80, 53],
                "director": "Christopher Nolan",
                "cast": [("Christian Bale", "Bruce Wayne / Batman"), ("Heath Ledger", "Joker"), ("Aaron Eckhart", "Harvey Dent"), ("Michael Caine", "Alfred")],
            },
            {
                "tmdb_id": 603,
                "imdb_id": "tt0133093",
                "title": "The Matrix",
                "original_title": "The Matrix",
                "tagline": "Welcome to the Real World.",
                "overview": "Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
                "release_date": date(1999, 3, 30),
                "runtime": 136,
                "poster": "/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
                "backdrop": "/7u3DmFJ21Lo0F15gq7sPwm7u84v.jpg",
                "vote_avg": 8.21,
                "vote_count": 25200,
                "popularity": 98.40,
                "genres": [28, 878],
                "director": "Lilly Wachowski",
                "cast": [("Keanu Reeves", "Neo"), ("Laurence Fishburne", "Morpheus"), ("Carrie-Anne Moss", "Trinity"), ("Hugo Weaving", "Agent Smith")],
            },
            {
                "tmdb_id": 693134,
                "imdb_id": "tt15239678",
                "title": "Dune: Part Two",
                "original_title": "Dune: Part Two",
                "tagline": "Long live the fighters.",
                "overview": "Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.",
                "release_date": date(2024, 2, 27),
                "runtime": 166,
                "poster": "/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
                "backdrop": "/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
                "vote_avg": 8.18,
                "vote_count": 5800,
                "popularity": 210.60,
                "genres": [878, 12],
                "director": "Denis Villeneuve",
                "cast": [("Timothée Chalamet", "Paul Atreides"), ("Zendaya", "Chani"), ("Rebecca Ferguson", "Lady Jessica"), ("Javier Bardem", "Stilgar")],
            },
            {
                "tmdb_id": 238,
                "imdb_id": "tt0068646",
                "title": "The Godfather",
                "original_title": "The Godfather",
                "tagline": "An offer you can't refuse.",
                "overview": "Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family. When organized crime family patriarch, Vito Corleone barely survives an attempt on his life, his youngest son, Michael steps in to take care of the would-be killers.",
                "release_date": date(1972, 3, 14),
                "runtime": 175,
                "poster": "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
                "backdrop": "/tmU7GeKVybMWFButWEGl2M4GeiP.jpg",
                "vote_avg": 8.71,
                "vote_count": 19800,
                "popularity": 134.10,
                "genres": [18, 80],
                "director": "Francis Ford Coppola",
                "cast": [("Marlon Brando", "Don Vito Corleone"), ("Al Pacino", "Michael Corleone"), ("James Caan", "Sonny Corleone"), ("Robert Duvall", "Tom Hagen")],
            },
            {
                "tmdb_id": 680,
                "imdb_id": "tt0110912",
                "title": "Pulp Fiction",
                "original_title": "Pulp Fiction",
                "tagline": "Just because you are a character doesn't mean that you have character.",
                "overview": "A burger-loving hit man, his philosophical partner, a drug-addled gangster's moll and a washed-up boxer converge in this sprawling, comedic crime caper. Their adventures unfurl in three stories that ingeniously trip back and forth in time.",
                "release_date": date(1994, 9, 10),
                "runtime": 154,
                "poster": "/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
                "backdrop": "/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
                "vote_avg": 8.49,
                "vote_count": 27100,
                "popularity": 89.70,
                "genres": [53, 80],
                "director": "Quentin Tarantino",
                "cast": [("John Travolta", "Vincent Vega"), ("Samuel L. Jackson", "Jules Winnfield"), ("Uma Thurman", "Mia Wallace"), ("Bruce Willis", "Butch Coolidge")],
            },
            {
                "tmdb_id": 129,
                "imdb_id": "tt0245429",
                "title": "Spirited Away",
                "original_title": "千と千尋の神隠し",
                "tagline": "The tunnel led Chihiro to a mysterious town.",
                "overview": "A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had to free her family.",
                "release_date": date(2001, 7, 20),
                "runtime": 125,
                "poster": "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
                "backdrop": "/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg",
                "vote_avg": 8.54,
                "vote_count": 15900,
                "popularity": 92.30,
                "genres": [16, 14, 10751],
                "director": "Hayao Miyazaki",
                "cast": [("Rumi Hiiragi", "Chihiro Ogino (voice)"), ("Miyu Irino", "Haku (voice)"), ("Mari Natsuki", "Yubaba (voice)")],
            },
            {
                "tmdb_id": 872585,
                "imdb_id": "tt15398776",
                "title": "Oppenheimer",
                "original_title": "Oppenheimer",
                "tagline": "The world forever changes.",
                "overview": "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II and the subsequent political fallout.",
                "release_date": date(2023, 7, 19),
                "runtime": 181,
                "poster": "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
                "backdrop": "/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg",
                "vote_avg": 8.09,
                "vote_count": 8900,
                "popularity": 142.80,
                "genres": [18, 36],
                "director": "Christopher Nolan",
                "cast": [("Cillian Murphy", "J. Robert Oppenheimer"), ("Emily Blunt", "Katherine Oppenheimer"), ("Matt Damon", "Leslie Groves"), ("Robert Downey Jr.", "Lewis Strauss")],
            },
            {
                "tmdb_id": 19995,
                "imdb_id": "tt0499549",
                "title": "Avatar",
                "original_title": "Avatar",
                "tagline": "Enter the World of Pandora.",
                "overview": "In the 22nd century, a paraplegic Marine is dispatched to the moon Pandora on a unique mission, but becomes torn between following orders and protecting an alien civilization.",
                "release_date": date(2009, 12, 15),
                "runtime": 162,
                "poster": "/kyeqWdyUXW608qlYkRqosgbbJyK.jpg",
                "backdrop": "/vL5LR6WdxWPjC33f1oJg9eK7vM8.jpg",
                "vote_avg": 7.58,
                "vote_count": 31200,
                "popularity": 105.30,
                "genres": [28, 12, 14, 878],
                "director": "James Cameron",
                "cast": [("Sam Worthington", "Jake Sully"), ("Zoe Saldana", "Neytiri"), ("Sigourney Weaver", "Dr. Grace Augustine"), ("Stephen Lang", "Colonel Miles Quaritch")],
            },
            {
                "tmdb_id": 550,
                "imdb_id": "tt0137523",
                "title": "Fight Club",
                "original_title": "Fight Club",
                "tagline": "Mischief. Mayhem. Soap.",
                "overview": "A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy. Their concept catches on, with underground 'fight clubs' forming in every town, until an eccentric gets in the way.",
                "release_date": date(1999, 10, 15),
                "runtime": 139,
                "poster": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
                "backdrop": "/hZkgoQYus5vegHoetLkCJzb17zJ.jpg",
                "vote_avg": 8.44,
                "vote_count": 28400,
                "popularity": 94.20,
                "genres": [18],
                "director": "David Fincher",
                "cast": [("Edward Norton", "The Narrator"), ("Brad Pitt", "Tyler Durden"), ("Helena Bonham Carter", "Marla Singer")],
            },
            {
                "tmdb_id": 496243,
                "imdb_id": "tt6751668",
                "title": "Parasite",
                "original_title": "기생충",
                "tagline": "Act like you own the place.",
                "overview": "All unemployed, Ki-taek's family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.",
                "release_date": date(2019, 5, 30),
                "runtime": 133,
                "poster": "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
                "backdrop": "/hiKmpZMGZsrkA3cdce8a7Dpos1j.jpg",
                "vote_avg": 8.51,
                "vote_count": 17800,
                "popularity": 88.50,
                "genres": [35, 53, 18],
                "director": "Bong Joon-ho",
                "cast": [("Song Kang-ho", "Kim Ki-taek"), ("Lee Sun-kyun", "Park Dong-ik"), ("Cho Yeo-jeong", "Choi Yeon-gyo")],
            },
        ]
        movies_dataset.extend(EXPANDED_MOVIES)

        movie_objs = {}
        for idx, m_data in enumerate(movies_dataset):
            existing = session.execute(select(Movie).where(Movie.tmdb_id == m_data["tmdb_id"])).scalars().first()
            if not existing:
                movie = Movie(
                    tmdb_id=m_data["tmdb_id"],
                    imdb_id=m_data["imdb_id"],
                    title=m_data["title"],
                    original_title=m_data["original_title"],
                    tagline=m_data["tagline"],
                    overview=m_data["overview"],
                    release_date=m_data["release_date"],
                    runtime_minutes=m_data["runtime"],
                    status="Released",
                    original_language="en",
                    poster_path=m_data["poster"],
                    backdrop_path=m_data["backdrop"],
                    vote_average=m_data["vote_avg"],
                    vote_count=m_data["vote_count"],
                    popularity_score=m_data["popularity"],
                )
                session.add(movie)
                session.flush()

                # Associate Genres
                for gid in m_data["genres"]:
                    if gid in genre_map:
                        session.add(MovieGenre(movie_id=movie.id, genre_id=genre_map[gid].id))

                # Associate Director & Cast
                director_p = session.execute(select(Person).where(Person.name == m_data["director"])).scalars().first()
                if not director_p:
                    director_p = Person(tmdb_id=1000 + idx, name=m_data["director"], known_for_department="Directing")
                    session.add(director_p)
                    session.flush()
                session.add(MovieCredit(movie_id=movie.id, person_id=director_p.id, role_type="DIRECTOR", order_index=0))

                for c_idx, (cast_name, char_name) in enumerate(m_data["cast"]):
                    cast_p = session.execute(select(Person).where(Person.name == cast_name)).scalars().first()
                    if not cast_p:
                        cast_p = Person(tmdb_id=2000 + idx * 10 + c_idx, name=cast_name, known_for_department="Acting")
                        session.add(cast_p)
                        session.flush()
                    session.add(MovieCredit(movie_id=movie.id, person_id=cast_p.id, role_type="CAST", character_name=char_name, order_index=c_idx + 1))

                # Add 768-dim semantic vector embedding
                emb_vec = generate_semantic_embedding(m_data["genres"], seed_num=m_data["tmdb_id"])
                session.add(MovieEmbedding(movie_id=movie.id, embedding=emb_vec, model_version="text-embedding-004"))

                movie_objs[m_data["title"]] = movie
            else:
                movie_objs[m_data["title"]] = existing

        session.commit()
        logger.info(f"Seeded {len(movies_dataset)} iconic catalog movies with 768-dim pgvector embeddings.")

        # ----------------------------------------------------------------------
        # 3. SEED TEST USERS & SAMPLE RATINGS
        # ----------------------------------------------------------------------
        demo_user = session.execute(select(User).where(User.email == "demo@movierec.com")).scalars().first()
        if not demo_user:
            demo_user = User(
                email="demo@movierec.com",
                username="demouser",
                display_name="Demo Cinephile",
                password_hash=get_password_hash("password123"),
                role="USER",
                is_active=True,
            )
            session.add(demo_user)
            session.flush()

            session.add(UserProfile(
                user_id=demo_user.id,
                bio="Sci-Fi & Thriller enthusiast. Inception and Interstellar are masterpieces.",
                preferred_genres=[878, 28, 12],
                onboarding_completed=True,
            ))

            # Default Watchlist
            demo_wl = Watchlist(user_id=demo_user.id, name="Watch Later", is_default=True, is_private=True)
            session.add(demo_wl)
            session.flush()

            # Add ratings for Sci-Fi movies
            if "Inception" in movie_objs:
                session.add(Rating(user_id=demo_user.id, movie_id=movie_objs["Inception"].id, rating_value=10, review_title="Mind-bending cinematic peak", review_body="Hans Zimmer score + Christopher Nolan direction is unmatched."))
            if "Interstellar" in movie_objs:
                session.add(Rating(user_id=demo_user.id, movie_id=movie_objs["Interstellar"].id, rating_value=9, review_title="Emotional and scientifically profound"))
            if "The Matrix" in movie_objs:
                session.add(Rating(user_id=demo_user.id, movie_id=movie_objs["The Matrix"].id, rating_value=9, review_title="Groundbreaking revolution in cinema"))
            if "Dune: Part Two" in movie_objs:
                session.add(WatchlistItem(watchlist_id=demo_wl.id, movie_id=movie_objs["Dune: Part Two"].id, priority=1))

            session.commit()
            logger.info("Seeded demo user (demo@movierec.com / password123) with ratings and watchlist.")

        session.commit()
        logger.info("Database seeding successfully completed!")

    except Exception as e:
        logger.error(f"Seeding error: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()

