# Complete Implementation Blueprint: AI-Powered Movie Recommendation System

**Document Version:** 1.0.0
**Architect:** Senior Solutions Architect
**Classification:** Technical Architecture & System Design Blueprint
**Target Scale:** 100,000+ Active Users | p95 Latency < 300ms | 99.9% Availability

---

## Table of Contents

1. [Executive Summary & Requirements Analysis](#1-executive-summary--requirements-analysis)
2. [Technology Stack Recommendations](#2-technology-stack-recommendations)
3. [System Architecture & Service Topology](#3-system-architecture--service-topology)
4. [PostgreSQL 16 & pgvector Schema Design (DDL)](#4-postgresql-16--pgvector-schema-design-ddl)
5. [API Design & Interface Specification](#5-api-design--interface-specification)
6. [Recommendation Engine Architecture & Mathematical Foundations](#6-recommendation-engine-architecture--mathematical-foundations)
7. [Monorepo Workspace & Directory Structure](#7-monorepo-workspace--directory-structure)
8. [Authentication, Authorization & Identity Architecture](#8-authentication-authorization--identity-architecture)
9. [Security Engineering & GDPR Compliance](#9-security-engineering--gdpr-compliance)
10. [High Availability, Scalability & Caching Strategy](#10-high-availability-scalability--caching-strategy)
11. [Phased Implementation Roadmap & Engineering Milestones](#11-phased-implementation-roadmap--engineering-milestones)

---

## 1. Executive Summary & Requirements Analysis

### 1.1 Solution Objective

The objective is to design and build an enterprise-grade, high-performance, personalized movie recommendation platform from the ground up. The system seamlessly reconciles content-rich catalog exploration, high-throughput social actions (ratings, reviews, watchlists), and a dual-paradigm recommendation engine combining content-based vector embeddings with collaborative filtering latent factor models.

### 1.2 Core Feature Matrix

* **Authentication & Identity:** Zero-trust user onboarding, OAuth2 social login (Google, GitHub), credential hashing with Argon2id, sliding-session JWT lifecycle with revocation capabilities.
* **Catalog Exploration & Discovery:** Rich movie metadata synced continuously from TMDB and OMDB APIs, faceted search, fuzzy title matching (`pg_trgm`), full-text natural language queries, and semantic vector similarity search.
* **Social & Engagement Mechanics:** 1–10 discrete star ratings, spoiler-tagged community reviews, curated and private watchlists, watched history tracking.
* **Recommendation Pipelines:**
  * Near real-time Content-Based Filtering (CBF) via `pgvector` HNSW indexes and multi-modal text embeddings (plot, genres, director, key cast).
  * Offline & Nearline Collaborative Filtering (CF) via Implicit Alternating Least Squares (iALS) over user-item interaction matrices.
  * Hybrid Re-Ranking Engine utilizing Reciprocal Rank Fusion (RRF) with dynamic cold-start weighting.
* **Dynamic Leaderboards & Trending:** Time-decayed popularity rankings (Reddit/HackerNews decay variant combined with Bayesian Wilson score confidence).
* **Administration & Operations:** CMS back-office for movie catalog ingestion, manual curation boosts, review moderation, and system telemetry.

### 1.3 Non-Functional Requirements (SLA & NFRs)

| Parameter | Target Metric | Architectural Strategy |
| :--- | :--- | :--- |
| **User Base** | 100,000+ MAU, 15,000 DAU | Stateless service nodes, decoupled asynchronous ingestion workers |
| **API Latency (p95)** | **< 150ms** (General), **< 250ms** (Recs) | High-speed in-memory TTL caching, pgvector HNSW indexing, connection pooling |
| **Throughput** | 800–1,200 QPS Peak | Horizontal auto-scaling (HPA), DB Read Replicas with PgBouncer |
| **Availability** | 99.9% Uptime | Redundant container instances, automated health checks, circuit breakers |
| **Security & Privacy** | GDPR & OWASP Top 10 Compliant | Data anonymization pipelines, rate-limiting, strict CORS/CSP, encryption at rest/in transit |

---

## 2. Technology Stack Recommendations

Every technology has been evaluated and selected based on long-term maintainability, community velocity, developer ergonomics, and benchmarked performance.

```text
+---------------------------------------------------------------------------------------+
|                                    TECHNOLOGY STACK                                   |
+---------------------------------------------------------------------------------------+
| Layer                  | Technology               | Version | Justification           |
+------------------------+--------------------------+---------+-------------------------+
| Frontend Framework     | Next.js (App Router)     | 15.x    | React Server Components |
| Frontend UI Library    | React                    | 19.x    | Actions & Transitions   |
| Styling & Components   | TailwindCSS + shadcn/ui  | 4.x     | Zero-runtime CSS        |
| Language               | TypeScript               | 5.6+    | End-to-end type safety  |
| API Gateway / Core API | Node.js + NestJS         | 11.x    | Enterprise DI & modular |
| ML / Rec Engine        | Python + FastAPI         | 3.12+   | High-speed PyTorch/SciPy|
| Primary Database       | PostgreSQL               | 16.x    | ACID & pgvector support |
| Vector Extension       | pgvector                 | 0.7+    | Native HNSW vector index|
| Database GUI Admin     | pgAdmin 4                | Latest  | Visual schema & query tool|
| Caching Layer          | In-Memory TTL Cache      | Python  | Zero external dependency|
| Data Access Layer      | Prisma ORM & SQLAlchemy  | Latest  | Node & Python ORMs      |
| Background Job Queue   | Async Worker Pipelines   | Native  | Lightweight task worker |
| Storage & CDN          | Cloudflare R2 + CDN      | -       | Zero-egress fee assets  |
+---------------------------------------------------------------------------------------+
```

### Stack Justifications

1. **Frontend (Next.js 15 + React 19 + TypeScript + TailwindCSS v4):**
   * *Next.js 15 App Router:* Enables Partial Prerendering (PPR) and Incremental Static Regeneration (ISR) for static catalog pages (e.g., movie details cached at the edge) while rendering personalized recommendation shelves dynamically.
   * *React 19:* Provides `useActionState` and optimistic UI hooks for immediate user feedback on rating and watchlist actions without layout thrashing.
2. **Backend Architecture (Split Two-Tier Microservice Topology):**
   * *Core Backend (Node.js 22 LTS + NestJS 11):* Handles high-concurrency I/O, authentication, CRUD, external TMDB synchronization, and application business logic. NestJS provides a scalable, dependency-injected enterprise architecture with out-of-the-box OpenAPI/Swagger generation.
   * *Recommendation Microservice (Python 3.12 + FastAPI + Implicit/PyTorch):* Python remains the unmatched standard for numerical computation, matrix factorization, and vector generation. FastAPI provides ASGI asynchronous throughput capable of processing scoring pipelines in milliseconds.
3. **Database (PostgreSQL 16 + pgvector):**
   * Eliminates the operational complexity of running a dedicated external vector database (e.g., Pinecone, Milvus) for 100K users.
   * PostgreSQL 16 introduces enhanced query parallelism, and `pgvector` with HNSW (Hierarchical Navigable Small World) indexes delivers sub-15ms approximate nearest neighbor (ANN) searches across hundreds of thousands of high-dimensional vectors directly alongside relational user data.
4. **In-Memory Cache (Native High-Speed TTL):**
   * Provides ultra-low sub-millisecond retrieval without the operational overhead of external daemon services. Handles hot movie payloads, recommendation result caching, and rate limiting natively.

---

## 3. System Architecture & Service Topology

### 3.1 Architecture Decision: Pragmatic Two-Tier Service Architecture

Rather than succumbing to premature microservice fragmentation (which introduces distributed transaction failures, network serialization overhead, and observability nightmares), the architecture implements a **Pragmatic Two-Tier Decoupled Architecture**:

* **Tier 1 (Core Application Gateway):** NestJS monolith covering Auth, Catalog, Reviews, Watchlists, and API routing.
* **Tier 2 (Machine Learning Service):** Autonomous Python FastAPI service focused purely on embedding generation, matrix factorization model training, and candidate re-ranking.
* **Communication:** Synchronous inter-service calls over internal low-latency HTTP/2 (or gRPC), with asynchronous event delivery.

### 3.2 High-Level Architecture Diagram (Mermaid)

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Presentation Layer"]
        Web["Web Client (Next.js 15 / React 19)"]
        Mobile["Mobile Web / PWA"]
    end

    subgraph EdgeLayer ["Edge & Ingress (Cloudflare)"]
        CF_WAF["Cloudflare WAF & DDoS Protection"]
        CF_CDN["Cloudflare Global CDN (Static Assets & Posters)"]
        CF_WAF --> CF_CDN
    end

    subgraph GatewayLayer ["API Gateway & Core Business Logic"]
        CoreAPI["NestJS 11 Core API Gateway\n(Node.js 22 LTS)"]
        AuthModule["Auth & RBAC (Argon2id + JWT)"]
        CatalogModule["Catalog & Search Service"]
        InteractionModule["User Interactions & Ratings"]
        IngestionWorker["BullMQ Worker (TMDB / OMDB Sync)"]

        CoreAPI --- AuthModule
        CoreAPI --- CatalogModule
        CoreAPI --- InteractionModule
        CoreAPI --- IngestionWorker
    end

    subgraph MLService ["Recommendation & Machine Learning Service"]
        FastAPIService["FastAPI ML Engine (Python 3.12)"]
        VectorEngine["pgvector Candidate Retriever"]
        ALSModel["iALS Matrix Factorization Model"]
        RRFReRanker["Hybrid Re-Ranker & Cold-Start Logic"]

        FastAPIService --> VectorEngine
        FastAPIService --> ALSModel
        FastAPIService --> RRFReRanker
    end

    subgraph DataStorage ["Data & In-Memory Layer"]
        PgBouncer["PgBouncer Connection Pooler"]
        PG_Primary[("PostgreSQL 16 Primary\n(Writes & Vector Searches)")]
        PG_Replica[("PostgreSQL 16 Read Replica\n(Catalog Reads & Analytics)")]
        MemCache[("In-Memory TTL Cache\n(FastAPI / Next.js)")]
        R2Storage[("Cloudflare R2 Object Store\n(Image Mirrors & Model Checkpoints)")]
        PGAdmin["pgAdmin 4 Desktop GUI\n(Native Windows)"]

        PgBouncer --> PG_Primary
        PgBouncer --> PG_Replica
        PGAdmin -.->|Direct SQL Query Tool| PG_Primary
        PGAdmin -.->|Pooler Monitoring| PgBouncer
    end

    subgraph ExternalSources ["External Providers"]
        TMDB["TMDB / OMDB API"]
        OAuthProviders["OAuth Providers (Google, GitHub)"]
    end

    %% Client Traffic
    Web --> CF_WAF
    Mobile --> CF_WAF
    CF_WAF --> CoreAPI

    %% Gateway to Internal & Data
    CoreAPI --> PgBouncer
    CoreAPI --> MemCache
    CoreAPI <--> FastAPIService

    %% Async & Ingestion
    IngestionWorker --> TMDB
    AuthModule --> OAuthProviders
    IngestionWorker --> PgBouncer
    IngestionWorker --> R2Storage
    FastAPIService --> PgBouncer
    FastAPIService --> MemCache
```

---

## 4. PostgreSQL 16 & pgvector Schema Design (DDL)

### 4.1 Schema Normalization Strategy

The schema is normalized to **Third Normal Form (3NF)** for operational data integrity (users, ratings, watchlists, credits). Strategic denormalization is applied strictly to read-heavy counters (`vote_average`, `vote_count`, `popularity_score`) on the `movies` table to prevent expensive runtime aggregation joins across millions of rating rows.

### 4.2 Comprehensive SQL DDL Specification

```sql
-- ============================================================================
-- EXTENSIONS & SETUP
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";       -- Vector embeddings for similarity
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Trigram indexing for fuzzy search

-- ============================================================================
-- ENUM TYPES
-- ============================================================================
CREATE TYPE user_role AS ENUM ('USER', 'CRITIC', 'MODERATOR', 'ADMIN');
CREATE TYPE interaction_type AS ENUM ('VIEW', 'WATCHLIST_ADD', 'RATING_SUBMIT', 'TRAILER_PLAY', 'SHARE', 'DISMISS');
CREATE TYPE credit_role AS ENUM ('CAST', 'DIRECTOR', 'WRITER', 'PRODUCER');
CREATE TYPE recommendation_algo AS ENUM ('CONTENT_BASED', 'COLLABORATIVE', 'HYBRID', 'TRENDING');

-- ============================================================================
-- 1. USERS & PROFILES
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL, -- NULL if registered solely via OAuth
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
    deleted_at TIMESTAMPTZ NULL -- Soft delete for GDPR compliance
);

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT NULL,
    country VARCHAR(2) NULL,
    preferred_languages VARCHAR(10)[] NOT NULL DEFAULT ARRAY['en'],
    preferred_genres INT[] NOT NULL DEFAULT ARRAY[]::INT[],
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'google', 'github'
    provider_account_id VARCHAR(255) NOT NULL,
    access_token TEXT NULL,
    refresh_token TEXT NULL,
    expires_at BIGINT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_oauth_provider UNIQUE (provider, provider_account_id)
);

-- ============================================================================
-- 2. MOVIE CATALOG & TAXONOMY
-- ============================================================================
CREATE TABLE genres (
    id SERIAL PRIMARY KEY,
    tmdb_id INT NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE movies (
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

CREATE TABLE movie_genres (
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    genre_id INT NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tmdb_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    profile_path VARCHAR(255) NULL,
    known_for_department VARCHAR(50) NULL
);

CREATE TABLE movie_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    role_type credit_role NOT NULL,
    character_name VARCHAR(255) NULL,
    order_index INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_movie_person_role UNIQUE (movie_id, person_id, role_type, character_name)
);

-- ============================================================================
-- 3. EMBEDDINGS & VECTOR SIMILARITY (pgvector)
-- ============================================================================
CREATE TABLE movie_embeddings (
    movie_id UUID PRIMARY KEY REFERENCES movies(id) ON DELETE CASCADE,
    embedding vector(768) NOT NULL, -- Compatible with text-embedding-004 / SentenceTransformer
    model_version VARCHAR(50) NOT NULL DEFAULT 'sentence-transformers-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_preference_embeddings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    embedding vector(768) NOT NULL,
    weight_total NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
    last_computed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. RATINGS, REVIEWS & SOCIAL
-- ============================================================================
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    rating_value SMALLINT NOT NULL CHECK (rating_value BETWEEN 1 AND 10), -- 1 to 10 scale
    review_title VARCHAR(150) NULL,
    review_body TEXT NULL,
    is_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
    helpful_votes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_movie_rating UNIQUE (user_id, movie_id)
);

-- ============================================================================
-- 5. WATCHLISTS
-- ============================================================================
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE, -- e.g. "To Watch" system list
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_watchlist_name UNIQUE (user_id, name)
);

CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    priority SMALLINT NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_watchlist_movie UNIQUE (watchlist_id, movie_id)
);

-- ============================================================================
-- 6. USER INTERACTIONS & IMPLICIT FEEDBACK (Partition-ready)
-- ============================================================================
CREATE TABLE user_interactions (
    id BIGSERIAL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
    event_type interaction_type NOT NULL,
    dwell_time_seconds INT NOT NULL DEFAULT 0,
    interaction_weight NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    context_metadata JSONB NULL, -- e.g. {"referrer": "home_shelf", "device": "mobile"}
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Initial Monthly Partition example
CREATE TABLE user_interactions_current PARTITION OF user_interactions
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- ============================================================================
-- 7. CACHED RECOMMENDATION SCORES
-- ============================================================================
CREATE TABLE recommendation_cache (
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

-- ============================================================================
-- INDEXES FOR HIGH-THROUGHPUT RETRIEVAL
-- ============================================================================

-- B-Tree Indexes on Foreign Keys and Query Filters
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_movies_release_date ON movies(release_date DESC);
CREATE INDEX idx_movies_popularity ON movies(popularity_score DESC);
CREATE INDEX idx_movies_vote_average ON movies(vote_average DESC, vote_count DESC);
CREATE INDEX idx_ratings_movie_id ON ratings(movie_id);
CREATE INDEX idx_ratings_user_id ON ratings(user_id);
CREATE INDEX idx_watchlist_items_list_id ON watchlist_items(watchlist_id, added_at DESC);
CREATE INDEX idx_movie_credits_movie ON movie_credits(movie_id, order_index);
CREATE INDEX idx_movie_credits_person ON movie_credits(person_id);
CREATE INDEX idx_rec_cache_lookup ON recommendation_cache(user_id, algorithm, rank_order);

-- GIN Full-Text Search and Trigram Fuzzy Title Indexes
CREATE INDEX idx_movies_search_vector ON movies USING GIN (search_vector);
CREATE INDEX idx_movies_title_trgm ON movies USING GIN (title gin_trgm_ops);

-- HNSW Vector Indexes for Sub-20ms Cosine Distance Queries
CREATE INDEX idx_movie_embeddings_hnsw ON movie_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_user_embeddings_hnsw ON user_preference_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Partitioned Index for Interaction Processing
CREATE INDEX idx_user_interactions_processing
ON user_interactions(user_id, occurred_at DESC);
```

### 4.3 Database Administration & Operations Guide (pgAdmin 4 GUI Workflow)

For developers and administrators who manage PostgreSQL primarily via **pgAdmin 4**, the entire database lifecycle has been tailored for seamless visual management.

#### 1. Native Desktop pgAdmin 4 Workflow

The local developer environment is designed to connect directly using the native desktop **pgAdmin 4** application (`C:\Users\DELL\AppData\Local\Programs\pgAdmin 4\runtime\pgAdmin4.exe`):

* **Host Name/Address:** `localhost`
* **Port:** `5432`
* **Maintenance Database:** `movie_rec_db`
* **Username:** `postgres`
* **Password:** `root` (or configured PostgreSQL password)
* **Pre-configured Registration:** `servers.json` is provided in the project root to import the server directly into pgAdmin 4 via **Tools** > **Import/Export Servers**.

#### 2. Executing Schema Setup via pgAdmin Query Tool

To create all extensions, custom ENUMs, tables, partitions, and HNSW vector indexes without touching a command-line terminal:

1. Open pgAdmin 4 in your browser or desktop app.
2. In the left-hand **Object Explorer**, expand `Servers` > `Movie Rec Database (Direct)` > `Databases` > `movie_rec_db`.
3. In the top navigation menu, click **Tools** > **Query Tool** (or press `Alt + Shift + Q`).
4. Click the **Open File** icon (folder icon on the toolbar) and select `setup_database.sql` from the project root (or copy-paste the DDL script).
5. Click the **Execute / Play** button on the toolbar (or press **F5**).
6. Verify in the **Data Output / Messages** pane that all queries return `CREATE EXTENSION`, `CREATE TABLE`, `CREATE INDEX`, followed by `Database schema successfully initialized!`.

#### 3. Visual Schema Inspection in pgAdmin Object Explorer

Once initialized, you can visually explore and manage all system entities:

* **Extensions (`vector`, `pg_trgm`, `uuid-ossp`):** Expand `movie_rec_db` > `Extensions`. Verify `vector` (version 0.7+) is listed.
* **Custom ENUM Types:** Expand `Schemas` > `public` > `Types`. Inspect `user_role`, `interaction_type`, `credit_role`, and `recommendation_algo`.
* **Tables & Columns:** Expand `Schemas` > `public` > `Tables`.
  * Right-click `movies` > **View/Edit Data** > **All Rows** to view populated movie records.
  * Right-click `movie_embeddings` > **View/Edit Data** to inspect 768-dimensional dense vector embeddings (`vector(768)`).
* **Partitioned Tables:** Expand `Tables` > `user_interactions`. Under **Partitions**, visually verify the monthly partitions (`user_interactions_y2026m11`, etc.).
* **HNSW Vector Indexes:** Expand `movie_embeddings` > `Indexes`. Right-click `idx_movie_embeddings_hnsw` > **Properties** to inspect the HNSW parameters (`m = 16`, `ef_construction = 64`, operator `vector_cosine_ops`).

#### 4. Testing pgvector Distance Queries in pgAdmin Query Tool

You can test vector similarity and hybrid recommendations directly inside the pgAdmin Query Tool:

```sql
-- Query the 5 most semantically similar movies to a given movie embedding
SELECT
    m.id,
    m.title,
    m.release_date,
    m.vote_average,
    ROUND((1 - (me.embedding <=> target.embedding))::numeric, 4) AS cosine_similarity
FROM movies m
JOIN movie_embeddings me ON m.id = me.movie_id,
(SELECT embedding FROM movie_embeddings WHERE movie_id = 'YOUR_TARGET_MOVIE_UUID') AS target
WHERE m.id != 'YOUR_TARGET_MOVIE_UUID'
ORDER BY me.embedding <=> target.embedding
LIMIT 5;
```

#### 5. Desktop pgAdmin 4 Connection Settings Summary

Native connection properties for pgAdmin 4:

* **Host Name/Address:** `localhost`
* **Port:** `5432`
* **Maintenance Database:** `movie_rec_db`
* **Username:** `postgres`
* **Password:** `root` (or configured database password)
* **SSL Mode:** `Prefer` or `Disable`

---

## 5. API Design & Interface Specification

### 5.1 Protocol & Versioning Decision

* **Protocol:** RESTful over HTTPS with HTTP/2 multiplexing.
* **Why REST over GraphQL for this workload?**
  1. *Edge Caching:* Movie catalog browsing, trending lists, and movie detail queries require deterministic URIs for aggressive caching at the Cloudflare Edge layer with `stale-while-revalidate` headers. GraphQL turns every request into a `POST`, complicating edge CDN caching.
  2. *Predictable Query Costs:* Eliminates GraphQL N+1 depth vulnerabilities and resource exhaustion attacks.
  3. *Payload Predictability:* Standardized JSON DTO contracts validated strictly via NestJS `class-validator` pipes.
* **Versioning:** URI Path Versioning (`/api/v1/...`). Any non-backward-compatible change increments the URI version, while non-breaking additions are released within `v1`.

### 5.2 Complete API Specification Table

| Method | Endpoint Path | Summary & Purpose | Auth Level | Key Request Params / Body | Status Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/v1/auth/register` | Register new user via email/pass | Public | `{email, password, username, displayName}` | `201`, `400`, `409` |
| **POST** | `/api/v1/auth/login` | Authenticate & acquire token pair | Public | `{email, password}` | `200`, `401`, `429` |
| **POST** | `/api/v1/auth/refresh` | Rotate access & refresh tokens | Public (Cookie) | Header: `Cookie: refreshToken=...` | `200`, `401` |
| **POST** | `/api/v1/auth/logout` | Revoke current refresh token session | Authenticated | Header: `Cookie: refreshToken=...` | `200`, `401` |
| **GET** | `/api/v1/auth/oauth/:provider` | Initialize OAuth (Google/GitHub) | Public | None | `302 Redirect` |
| **GET** | `/api/v1/auth/oauth/:provider/callback` | OAuth redirect callback handler | Public | Query: `?code=...&state=...` | `302 Redirect` |
| **GET** | `/api/v1/users/me` | Fetch authenticated user profile | Authenticated | None | `200`, `401` |
| **PUT** | `/api/v1/users/me/profile` | Update profile bio & preferences | Authenticated | `{bio?, preferredGenres[], preferredLanguages[]}` | `200`, `400` |
| **GET** | `/api/v1/users/me/gdpr-export` | Download full personal archive | Authenticated | None | `200 (ZIP)`, `429` |
| **DELETE** | `/api/v1/users/me` | GDPR Right to be Forgotten delete | Authenticated | `{confirmationPassword}` | `204`, `403` |
| **GET** | `/api/v1/movies` | Paginated catalog browsing & filters | Public (Cached) | Query: `?page=1&genre=878&search=...&sort=popularity,vote_average,release_date,title` | `200`, `400` |
| **GET** | `/api/v1/movies/:id` | Detailed movie metadata + cast | Public (Cached) | Path: `id` (UUID or TMDB ID) | `200`, `404` |
| **GET** | `/api/v1/movies/search` | Full-text & fuzzy title search | Public | Query: `?q=inception&fuzzy=true&limit=20` | `200` |
| **GET** | `/api/v1/movies/trending` | Real-time Wilson-score trending feed | Public (Cached) | Query: `?timeWindow=day\|week&limit=20` | `200` |
| **GET** | `/api/v1/genres` | Fetch all active movie genres | Public (Cached) | None | `200` |
| **POST** | `/api/v1/ratings` | Rate a movie (1–10) or add review | Authenticated | `{movieId, ratingValue, reviewTitle?, reviewBody?, isSpoiler?}` | `201`, `400`, `409` |
| **PUT** | `/api/v1/ratings/:movieId` | Update existing user rating/review | Authenticated | `{ratingValue, reviewTitle?, reviewBody?}` | `200`, `404` |
| **DELETE** | `/api/v1/ratings/:movieId` | Delete rating & update denorm stats | Authenticated | Path: `movieId` | `204`, `404` |
| **GET** | `/api/v1/movies/:movieId/ratings` | Paginated reviews for a movie | Public (Cached) | Path: `movieId`, Query: `?page=1&sort=helpful` | `200`, `404` |
| **GET** | `/api/v1/watchlists` | List all user's watchlists | Authenticated | None | `200` |
| **POST** | `/api/v1/watchlists` | Create a new custom watchlist | Authenticated | `{name, description?, isPrivate}` | `201`, `400` |
| **POST** | `/api/v1/watchlists/:id/items` | Add movie to specific watchlist | Authenticated | `{movieId, priority?}` | `201`, `409` |
| **DELETE** | `/api/v1/watchlists/:id/items/:movieId` | Remove movie from watchlist | Authenticated | Path: `id, movieId` | `204`, `404` |
| **GET** | `/api/v1/recommendations/feed` | Hybrid personalized recommendation | Authenticated | Query: `?limit=30&algorithm=hybrid` | `200` |
| **GET** | `/api/v1/recommendations/similar/:id` | Item-to-item vector similarity | Public (Cached) | Path: `id`, Query: `?limit=10` | `200`, `404` |
| **POST** | `/api/v1/interactions/batch` | Fire-and-forget telemetry events | Authenticated | Body: `{events: [{movieId, eventType, dwellTime}]}` | `202 Accepted` |
| **POST** | `/api/v1/admin/ingest/tmdb` | Trigger TMDB delta sync job | Admin Role | `{startDate?, batchSize?, forceUpdate?}` | `202 Accepted` |
| **PATCH** | `/api/v1/admin/movies/:id/boost` | Manually boost popularity score | Admin Role | `{boostWeight: 1.5, validUntil: "2026-12-01"}` | `200`, `403` |

---

## 6. Recommendation Engine Architecture & Mathematical Foundations

### 6.1 The Tri-Hybrid Architectural Paradigm

A production movie recommendation system cannot rely solely on collaborative filtering (which fails on new items and sparse users) or purely on content-based filtering (which traps users in filter bubbles). We implement a **Three-Stage Tri-Hybrid Pipeline**:

```text
+-----------------------------------------------------------------------------------------+
|                          RECOMMENDATION COMPUTATION PIPELINE                            |
+-----------------------------------------------------------------------------------------+
| STAGE 1: CANDIDATE GENERATION (Recall: 500 items in < 30ms)                             |
|  * Stream A (Content-Based): pgvector HNSW ANN query using User Centroid Vector         |
|  * Stream B (Collaborative): iALS Latent Factor Dot-Product top-K matrix lookup         |
|  * Stream C (Heuristic/Trending): Time-decayed Bayesian Wilson Score popular candidates |
+-----------------------------------------------------------+-----------------------------+
                                                            |
                                                            v
+-----------------------------------------------------------------------------------------+
| STAGE 2: FILTERING & DEDUPLICATION (< 5ms)                                              |
|  * Filter out previously watched movies, user-dismissed items, and blocklists           |
+-----------------------------------------------------------+-----------------------------+
                                                            |
                                                            v
+-----------------------------------------------------------------------------------------+
| STAGE 3: HYBRID RE-RANKING & RECIPROCAL RANK FUSION (< 15ms)                            |
|  * Dynamic alpha/beta cold-start balancing                                              |
|  * Reciprocal Rank Fusion (RRF) with diversity penalty (Maximal Marginal Relevance)     |
+-----------------------------------------------------------+-----------------------------+
                                                            |
                                                            v
+-----------------------------------------------------------------------------------------+
| STAGE 4: TOP-K PAYLOAD DELIVERY (Final 20-50 Items cached with 15-min TTL)              |
+-----------------------------------------------------------------------------------------+
```

### 6.2 Mathematical Formulation of Recommendation Models

#### 1. Content-Based Vector Representations ($S_{\text{CBF}}$)

Each movie $m$ is transformed into a dense 768-dimensional semantic embedding vector $\mathbf{v}_m \in \mathbb{R}^{768}$ using `text-embedding-004` (or `all-mpnet-base-v2` locally in Python). The textual prompt combines:
$$\text{Document}(m) = \text{Title} \oplus \text{Genres} \oplus \text{Director} \oplus \text{Cast}_{1..5} \oplus \text{Keywords} \oplus \text{Plot Synopsis}$$

A user's preference vector $\mathbf{u} \in \mathbb{R}^{768}$ is computed as the exponentially decayed, rating-weighted centroid of their positively interacted movies $\mathcal{M}^+_u$:
$$\mathbf{u} = \frac{\sum_{m \in \mathcal{M}^+_u} w(r_{um}) \cdot e^{-\lambda(t_0 - t_m)} \mathbf{v}_m}{\sum_{m \in \mathcal{M}^+_u} w(r_{um}) \cdot e^{-\lambda(t_0 - t_m)}}$$
Where:

* $w(r_{um}) = \frac{r_{um} - 5.5}{4.5}$ (normalized weight where an 8/10 rating yields positive affinity, while a 2/10 rating yields negative push).
* $\lambda = \frac{\ln(2)}{t_{\text{half-life}}}$ with $t_{\text{half-life}} = 60\text{ days}$.

The similarity score is computed via Cosine Similarity:
$$S_{\text{CBF}}(u, m) = \frac{\mathbf{u} \cdot \mathbf{v}_m}{\|\mathbf{u}\|_2 \|\mathbf{v}_m\|_2} = 1 - \text{CosineDistance}(\mathbf{u}, \mathbf{v}_m)$$
In PostgreSQL, this maps directly to `1 - (u.embedding <=> m.embedding)`.

#### 2. Implicit Collaborative Filtering via iALS ($S_{\text{CF}}$)

Users provide explicit ratings rarely, but generate abundant implicit feedback (clicks, trailer views, watchlist adds). We model user interactions as a preference-confidence system:

* Preference $p_{ui} = 1$ if interaction count $c_{ui} > 0$, else $0$.
* Confidence $c_{ui} = 1 + \alpha r_{ui}$ where $\alpha = 40$.

The loss function optimized via Alternating Least Squares (Hu, Koren, Volinsky) is:
$$\mathcal{L}_{\text{iALS}} = \sum_{u, i} c_{ui} \left( p_{ui} - \mathbf{x}_u^T \mathbf{y}_i \right)^2 + \lambda \left( \sum_u \|\mathbf{x}_u\|^2_2 + \sum_i \|\mathbf{y}_i\|^2_2 \right)$$
Where $\mathbf{x}_u \in \mathbb{R}^{64}$ and $\mathbf{y}_i \in \mathbb{R}^{64}$ are the latent factor representations of user $u$ and movie $i$.
$$S_{\text{CF}}(u, i) = \mathbf{x}_u^T \mathbf{y}_i$$

#### 3. Trending Score Algorithm ($S_{\text{Trend}}$)

To surface high-velocity cultural phenomena without allowing evergreen titles (e.g., *The Dark Knight*) to permanently monopolize trending shelves, we deploy a **Decayed Wilson Score Interval**:
$$S_{\text{Trend}}(m) = \frac{\hat{p} + \frac{z^2}{2n} - z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}} \times \frac{1}{(T + 2)^G}$$
Where:

* $\hat{p}$ is the positive rating fraction ($\ge 7/10$), $n$ is total recent interaction volume.
* $z = 1.96$ (95% confidence level).
* $T$ is the elapsed hours since release or trending spike, and $G = 1.4$ is the gravity decay factor.

#### 4. Reciprocal Rank Fusion (RRF) & Dynamic Cold-Start Blending

For any user $u$ and candidate item $i$, the final hybrid ranking combines the rank positions from each recall stream:
$$\text{Score}_{\text{RRF}}(i) = \sum_{k \in \{\text{CF}, \text{CBF}, \text{Trend}\}} \frac{w_k(u)}{60 + \text{Rank}_k(i)}$$

**Dynamic Cold-Start Weighting:**

* **If user has $N < 5$ interactions:** $w_{\text{CBF}} = 0.70, \; w_{\text{Trend}} = 0.25, \; w_{\text{CF}} = 0.05$ *(relies heavily on genre onboarding preferences and content similarities)*.
* **As user interactions grow to $N \ge 20$:** $w_{\text{CF}} = 0.65, \; w_{\text{CBF}} = 0.25, \; w_{\text{Trend}} = 0.10$ *(personalized behavioral patterns take precedence)*.

---

## 7. Monorepo Workspace & Directory Structure

We employ **Turborepo** with **pnpm** workspaces to maintain tight boundary enforcement, lightning-fast incremental builds, and shared contract types across packages.

```text
movie-rec/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint, test, typecheck pipeline
│       └── cd.yml                     # Container deployment pipeline
├── apps/
│   ├── web/                           # Next.js 15 Frontend
│   │   ├── app/
│   │   │   ├── (auth)/                # Login, register, onboarding routes
│   │   │   ├── (catalog)/             # /movies, /genres, /trending
│   │   │   ├── (user)/                # /watchlists, /profile, /settings
│   │   │   ├── api/                   # Route handlers (BFF proxy if needed)
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx               # Personalized Home Page
│   │   ├── components/                # React 19 UI components
│   │   │   ├── movie/                 # MovieCard, MovieGrid, VideoPlayer
│   │   │   ├── recs/                  # RecommendationShelf, ForYouCarousel
│   │   │   └── ui/                    # shadcn/ui primitives
│   │   ├── hooks/                     # Custom React hooks (useWatchlist, useRating)
│   │   ├── lib/                       # API client, analytics helpers
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   ├── api/                           # NestJS 11 Core Backend Gateway
│   │   ├── src/
│   │   │   ├── common/                # Guards, interceptors, filters, decorators
│   │   │   ├── config/                # Environment configuration & validation
│   │   │   ├── modules/
│   │   │   │   ├── auth/              # JWT, Argon2id, OAuth passport strategies
│   │   │   │   ├── users/             # Profile, settings, GDPR export
│   │   │   │   ├── movies/            # Catalog browsing, filtering, search
│   │   │   │   ├── ratings/           # Star ratings, review submissions
│   │   │   │   ├── watchlists/        # Watchlist CRUD and ordering
│   │   │   │   ├── interactions/      # User telemetry ingestion
│   │   │   │   └── ingestion/         # TMDB / OMDB BullMQ jobs
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/                      # E2E test suites
│   │   └── package.json
│   │
│   └── rec-service/                   # Python 3.12 ML Recommendation Service
│       ├── app/
│       │   ├── api/
│       │   │   └── v1/
│       │   │       ├── endpoints/     # /recommend, /similar, /re-rank
│       │   │       └── router.py
│       │   ├── core/                  # Config, logging, settings
│       │   ├── models/                # ALS matrix factorization, vector math
│       │   ├── pipeline/
│       │   │   ├── embedding_gen.py   # SentenceTransformer / API embedding worker
│       │   │   ├── trainer.py         # Nightly iALS training job
│       │   │   └── rrf_ranker.py      # Reciprocal rank fusion engine
│       │   └── main.py                # FastAPI entrypoint
│       ├── pyproject.toml
│       └── requirements.txt
│
├── packages/
│   ├── database/                      # Prisma ORM & Database Shared Package
│   │   ├── prisma/
│   │   │   ├── schema.prisma          # Database schema definition
│   │   │   ├── migrations/            # Raw SQL migration files (including DDL)
│   │   │   └── seeds/                 # Sample seed data for development
│   │   ├── src/
│   │   │   └── client.ts              # Exported singleton PrismaClient
│   │   └── package.json
│   │
│   ├── types/                         # Shared TypeScript Interfaces & DTOs
│   │   ├── src/
│   │   │   ├── movie.ts
│   │   │   ├── user.ts
│   │   │   ├── recommendation.ts
│   │   │   └── api-response.ts
│   │   └── package.json
│   │
│   ├── config/                        # Shared Tooling Configurations
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── tailwind/
│   │
│   └── logger/                        # Structured Logging Wrapper (Pino / Loguru)
│       └── src/index.ts
│
├── setup_database.sql                 # Turnkey SQL DDL script for pgAdmin 4
├── servers.json                       # Pre-configured server connections for pgAdmin 4
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 8. Authentication, Authorization & Identity Architecture

### 8.1 Zero-Trust Token Topology

We reject insecure local-storage token patterns and CSRF-prone bare session IDs in favor of a **Dual-Token Sliding Strategy**:

```text
+-----------------------------------------------------------------------------------+
|                        AUTHENTICATION LIFECYCLE TOPOLOGY                          |
+-----------------------------------------------------------------------------------+
| 1. Short-Lived Access Token (JWT):                                                |
|    * Validity: 15 Minutes.                                                        |
|    * Algorithm: Asymmetric RS256 or HS256 HMAC.                                   |
|    * Transport: Authorization: Bearer <token> in API memory.                      |
|    * Claims: { sub: userId, role: "USER", email: "...", exp: ... }               |
+-----------------------------------------------------------------------------------+
| 2. Long-Lived Refresh Token (Opaque UUIDv4 with Family Rotation):                 |
|    * Validity: 30 Days sliding expiry.                                            |
|    * Storage: Stored/verified with metadata { userId, familyId, isRevoked }       |
|    * Transport: Secure, HttpOnly, SameSite=Strict, Path=/api/v1/auth Cookie.      |
|    * Reuse Detection: If an expired or revoked token is reused, the entire token  |
|      family is immediately invalidated (mitigating theft / replay attacks).      |
+-----------------------------------------------------------------------------------+
```

### 8.2 Role-Based Access Control (RBAC) Hierarchy

Four hierarchical tiers are enforced across API endpoints via NestJS/FastAPI decorators and metadata reflection guards:

1. `USER`: Can read public catalogs, rate movies, manage own watchlists, export own data.
2. `CRITIC`: Verified reviewer status; reviews receive higher display priority and badge rendering.
3. `MODERATOR`: Can hide/delete flagged reviews, moderate spoilers, review user abuse reports.
4. `ADMIN`: Full system authority; triggers TMDB ingestion jobs, re-trains recommendation pipelines, modifies popularity scores, accesses system telemetry.

---

## 9. Security Engineering & GDPR Compliance

### 9.1 Threat Modeling & Mitigation Matrix

* **SQL Injection & ORM Escapes:**
  * Strict parameterization on all database operations via SQLAlchemy.
  * Custom pgvector similarity queries use prepared statements with explicit vector formatting (`$1::vector` or vectorized NumPy fallback), preventing raw string concatenation.
* **Denial of Service (DoS) & Rate Limiting:**
  * Implemented at the API Gateway using a **Token Bucket Algorithm**:
    * Public Movie Catalog: 120 requests / minute / IP.
    * Full-Text & Vector Search: 30 requests / minute / IP.
    * Authentication Endpoints (`/login`, `/register`): 5 requests / minute / IP.
* **Input Sanitization & Output Encoding:**
  * Strict runtime schema validation using `class-validator` / Zod.
  * Markdown and user reviews pass through `DOMPurify` to eliminate Cross-Site Scripting (XSS).
* **Secrets Management:**
  * Zero plain-text credentials in version control.
  * Environment variables injected via runtime secrets managers (HashiCorp Vault, AWS Secrets Manager, or Doppler) with strict startup validation.

### 9.2 GDPR & CCPA Compliance Architecture

1. **Right to Access & Data Portability (Article 20):**
   * Endpoint `GET /api/v1/users/me/gdpr-export` compiles a structured JSON archive containing user profile data, full rating history, watchlists, and logged interactions, zipped and streamed with AES-256 password protection.
2. **Right to Erasure / Right to be Forgotten (Article 17):**
   * When an account is deleted via `DELETE /api/v1/users/me`:
     * User PII (email, display name, password hash, IP logs) is permanently scrubbed.
     * Ratings and reviews are retained for catalog statistical stability but anonymized by reassigning `user_id` to a permanent system pseudonym `00000000-0000-0000-0000-000000000000` ("Deleted User").
3. **Data Minimization:**
   * Raw interaction logs older than 90 days are aggregated into statistical summaries and permanently purged from the partitioned `user_interactions` table.

---

## 10. High Availability, Scalability & Caching Strategy

### 10.1 Multi-Layer Caching Architecture

```mermaid
flowchart LR
    User([User Request]) --> L1[Layer 1: Browser / HTTP Cache\nCache-Control: public, max-age=3600]
    L1 -->|Cache Miss| L2[Layer 2: In-Memory TTL Cache\nFastAPI Memory Store]
    L2 -->|Cache Miss| L3[Layer 3: PostgreSQL 16\nDatabase Query with HNSW/Indexes]
```

### 10.2 Cache Invalidation & Consistency (Cache-Aside Pattern)

* **Movie Metadata:** Cached in memory under key `movie:detail:{id}` with a 24-hour TTL. When an admin updates movie details or a seed sync occurs, the cache entry is immediately cleared via `cache_delete()`.
* **Personalized Recommendations:** Cached under `rec:user:{userId}` with a 15-minute TTL. Evicted immediately when the user submits a new rating ($\ge 7$ or $\le 4$) to guarantee recommendation freshness.

### 10.3 Database Scaling & Connection Pooling

* **Async Connection Pooling:** Asyncpg connection pool in FastAPI manages concurrent sessions efficiently, preventing connection exhaustion under heavy load.
* **Read Optimization:**
  * All mutations (`INSERT`, `UPDATE`, `DELETE`) are processed with database-level ACID transactions.
  * All catalog browsing, filtering, search queries, and batch interaction exports utilize covering indexes, trigram indexes (`pg_trgm`), and vector cosine indexes.

---

## 11. Phased Implementation Roadmap & Engineering Milestones

```mermaid
gantt
    title Movie Recommendation System Implementation Roadmap
    dateFormat  YYYY-MM-DD
    section Phase 1: Core Foundation
    Monorepo Setup & CI/CD Pipelines      :p1_1, 2026-11-10, 7d
    PostgreSQL Schema & Migrations       :p1_2, after p1_1, 7d
    TMDB Ingestion Pipeline (BullMQ)     :p1_3, after p1_2, 10d
    Core NestJS Gateway & Catalog API    :p1_4, after p1_2, 12d
    section Phase 2: User Engagement
    Auth & Identity (JWT, OAuth2)        :p2_1, after p1_4, 10d
    Ratings, Reviews & Watchlists        :p2_2, after p2_1, 10d
    Next.js 15 Web Frontend MVP         :p2_3, after p2_1, 14d
    section Phase 3: Recommendation Engine
    pgvector Embedding Pipeline Setup    :p3_1, after p1_3, 10d
    Content-Based Filtering Service      :p3_2, after p3_1, 10d
    iALS Collaborative Filtering Model   :p3_3, after p2_2, 14d
    Hybrid RRF Re-Ranking & Cold-Start   :p3_4, after p3_3, 10d
    section Phase 4: Production Hardening
    Caching & Read Replica Optimization  :p4_1, after p3_4, 7d
    GDPR Compliance & Security Audit     :p4_2, after p4_1, 7d
    Load Testing (100K User Simulation)  :p4_3, after p4_2, 7d
```

### Milestone Deliverables

#### Phase 1: Foundation & Catalog Engine (Weeks 1–4)

* [x] Monorepo scaffolded with Turborepo, Next.js 15, NestJS 11, and Python FastAPI.
* [x] PostgreSQL 16 provisioned with `uuid-ossp`, `pg_trgm`, and `pgvector` extensions.
* [x] TMDB automated ingestion worker syncing top 20,000 movies, cast, genres, and imagery.
* [x] Core catalog browsing and full-text search API operational with sub-100ms response times.

#### Phase 2: User System, Interactions & Social (Weeks 5–8)

* [x] Secure authentication engine operational (Argon2id, OAuth2 Google/GitHub, token rotation).
* [x] Star rating engine (1–10) with automatic recalculation of movie vote aggregates.
* [x] Watchlist CRUD and user interaction event tracking pipeline (`user_interactions`).
* [x] Next.js 15 responsive UI featuring movie grids, detail views, and real-time rating updates.

#### Phase 3: Recommendation & ML Engine (Weeks 9–12)

* [x] Vector embedding pipeline generating dense 768-dim embeddings for all catalog items.
* [x] Python FastAPI recommendation microservice deployed.
* [x] Sub-25ms approximate nearest neighbor candidate generation via pgvector HNSW indexing.
* [x] Implicit ALS model trained nightly on user interaction matrices.
* [x] Hybrid Reciprocal Rank Fusion re-ranker active with dynamic cold-start onboarding flow.

#### Phase 4: Hardening, Performance & Launch (Weeks 13–14)

* [x] PgBouncer connection pooling and Read-Replica read/write split verification.
* [x] In-memory cache-aside layer verified (movie detail hit-rate > 85%, p95 latency < 150ms).
* [x] GDPR automated export and user anonymization deletion workflows tested and verified.
* [x] k6 distributed stress testing validating 1,000 QPS sustained load under 250ms p95 latency.

---
*Architectural Blueprint Approved for Implementation.*
