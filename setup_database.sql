-- ==============================================================================
-- MOVIE RECOMMENDATION SYSTEM: COMPLETE DATABASE INITIALIZATION SCRIPT
-- Tested for: PostgreSQL 16+ on Windows / Linux / Cloud
-- Optimized for: pgAdmin 4 Query Tool execution (Select 'movie_rec_db' -> Press F5)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS SETUP
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram indexing for fuzzy search

-- Attempt pgvector if installed on the host (graceful fallback if not present)
DO $$
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "vector";
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension not installed in PostgreSQL lib. Using native real[] array storage for embeddings.';
    END;
END$$;

-- ------------------------------------------------------------------------------
-- 2. CUSTOM ENUM TYPES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('USER', 'CRITIC', 'MODERATOR', 'ADMIN');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_type') THEN
        CREATE TYPE interaction_type AS ENUM ('VIEW', 'WATCHLIST_ADD', 'RATING_SUBMIT', 'TRAILER_PLAY', 'SHARE', 'DISMISS');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_role') THEN
        CREATE TYPE credit_role AS ENUM ('CAST', 'DIRECTOR', 'WRITER', 'PRODUCER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recommendation_algo') THEN
        CREATE TYPE recommendation_algo AS ENUM ('CONTENT_BASED', 'COLLABORATIVE', 'HYBRID', 'TRENDING');
    END IF;
END$$;

-- ------------------------------------------------------------------------------
-- 3. USERS, PROFILES & OAUTH ACCOUNTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(512) NULL,
    role user_role NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    gdpr_consent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_retention_until TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT NULL,
    country VARCHAR(2) NULL,
    preferred_languages VARCHAR(10)[] NOT NULL DEFAULT ARRAY['en'],
    preferred_genres INT[] NOT NULL DEFAULT ARRAY[]::INT[],
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    access_token TEXT NULL,
    refresh_token TEXT NULL,
    expires_at BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_oauth_provider UNIQUE (provider, provider_account_id)
);

-- ------------------------------------------------------------------------------
-- 4. MOVIE CATALOG TAXONOMY & CREDITS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS genres (
    id SERIAL PRIMARY KEY,
    tmdb_id INT NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id INT NOT NULL UNIQUE,
    imdb_id VARCHAR(20) NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255) NOT NULL,
    tagline TEXT NULL,
    overview TEXT NOT NULL,
    release_date DATE NOT NULL,
    runtime_minutes INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Released',
    original_language VARCHAR(10) NOT NULL DEFAULT 'en',
    poster_path VARCHAR(255) NULL,
    backdrop_path VARCHAR(255) NULL,
    budget BIGINT NOT NULL DEFAULT 0,
    revenue BIGINT NOT NULL DEFAULT 0,
    popularity_score NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    vote_average NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
    vote_count INT NOT NULL DEFAULT 0,
    is_adult BOOLEAN NOT NULL DEFAULT FALSE,
    search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(overview, '')), 'C')
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    profile_path VARCHAR(255) NULL,
    known_for_department VARCHAR(50) NULL
);

CREATE TABLE IF NOT EXISTS movie_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role_type credit_role NOT NULL,
    character_name VARCHAR(255) NULL,
    order_index INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_movie_person_role UNIQUE (movie_id, person_id, role_type, character_name)
);

-- ------------------------------------------------------------------------------
-- 5. VECTOR EMBEDDINGS (768-dim dense semantic embeddings)
-- Supports native pgvector when installed, or native real[] array fallback
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        CREATE TABLE IF NOT EXISTS movie_embeddings (
            movie_id UUID PRIMARY KEY REFERENCES movies(id) ON DELETE CASCADE,
            embedding vector(768) NOT NULL,
            model_version VARCHAR(50) NOT NULL DEFAULT 'text-embedding-004',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS user_preference_embeddings (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            embedding vector(768) NOT NULL,
            weight_total NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
            last_computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    ELSE
        CREATE TABLE IF NOT EXISTS movie_embeddings (
            movie_id UUID PRIMARY KEY REFERENCES movies(id) ON DELETE CASCADE,
            embedding real[] NOT NULL,
            model_version VARCHAR(50) NOT NULL DEFAULT 'text-embedding-004',
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS user_preference_embeddings (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            embedding real[] NOT NULL,
            weight_total NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
            last_computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END$$;

-- ------------------------------------------------------------------------------
-- 6. RATINGS & REVIEWS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    rating_value SMALLINT NOT NULL CHECK (rating_value BETWEEN 1 AND 10),
    review_title VARCHAR(150) NULL,
    review_body TEXT NULL,
    is_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
    helpful_votes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_movie_rating UNIQUE (user_id, movie_id)
);

-- ------------------------------------------------------------------------------
-- 7. WATCHLISTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_watchlist_name UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    priority SMALLINT NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_watchlist_movie UNIQUE (watchlist_id, movie_id)
);

-- ------------------------------------------------------------------------------
-- 8. USER INTERACTIONS (Partitioned by Month)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_interactions (
    id BIGSERIAL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    event_type interaction_type NOT NULL,
    dwell_time_seconds INT NOT NULL DEFAULT 0,
    interaction_weight NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    context_metadata JSONB NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Partition creation (2026 partitions)
CREATE TABLE IF NOT EXISTS user_interactions_y2026m11 PARTITION OF user_interactions
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS user_interactions_y2026m12 PARTITION OF user_interactions
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- ------------------------------------------------------------------------------
-- 9. RECOMMENDATION CACHE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    algorithm recommendation_algo NOT NULL,
    score NUMERIC(8, 5) NOT NULL,
    rank_order INT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_user_algo_movie UNIQUE (user_id, algorithm, movie_id)
);

-- ------------------------------------------------------------------------------
-- 10. INDEXES (B-Tree, GIN Trigram/Full-Text, HNSW Vectors)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_movies_release_date ON movies(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_movies_vote_average ON movies(vote_average DESC, vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_list_id ON watchlist_items(watchlist_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_movie_credits_movie ON movie_credits(movie_id, order_index);
CREATE INDEX IF NOT EXISTS idx_movie_credits_person ON movie_credits(person_id);
CREATE INDEX IF NOT EXISTS idx_rec_cache_lookup ON recommendation_cache(user_id, algorithm, rank_order);

-- GIN Full-Text & Trigram Indexes
CREATE INDEX IF NOT EXISTS idx_movies_search_vector ON movies USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON movies USING GIN (title gin_trgm_ops);

-- HNSW Vector Indexes (created if pgvector is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_movie_embeddings_hnsw ON movie_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_embeddings_hnsw ON user_preference_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);';
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_user_interactions_proc 
ON user_interactions(user_id, occurred_at DESC);

-- ------------------------------------------------------------------------------
-- 11. INITIAL SEED: DEFAULT SYSTEM GENRES
-- ------------------------------------------------------------------------------
INSERT INTO genres (tmdb_id, name, slug) VALUES
    (28, 'Action', 'action'),
    (12, 'Adventure', 'adventure'),
    (16, 'Animation', 'animation'),
    (35, 'Comedy', 'comedy'),
    (80, 'Crime', 'crime'),
    (99, 'Documentary', 'documentary'),
    (18, 'Drama', 'drama'),
    (10751, 'Family', 'family'),
    (14, 'Fantasy', 'fantasy'),
    (36, 'History', 'history'),
    (27, 'Horror', 'horror'),
    (10402, 'Music', 'music'),
    (9648, 'Mystery', 'mystery'),
    (10749, 'Romance', 'romance'),
    (878, 'Science Fiction', 'science-fiction'),
    (10770, 'TV Movie', 'tv-movie'),
    (53, 'Thriller', 'thriller'),
    (10752, 'War', 'war'),
    (37, 'Western', 'western')
ON CONFLICT (tmdb_id) DO NOTHING;

-- Verification query
SELECT 'Database schema successfully initialized!' AS status;

