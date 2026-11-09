# ARCHITECTURE.md — System Architecture & Topology

> **Project:** CineSphere (AI-Powered Movie Recommendation & Social Discovery Platform)  
> **Status:** `ACTIVE`  
> **Topology:** Monorepo with Next.js 15 App Router Frontend, FastAPI Python ASGI Backend, and PostgreSQL 18 with pgvector  

---

## 1. System Topology Overview

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT / BROWSER RUNTIME                                │
│                                                                                        │
│   Next.js 15 (React 19) + TypeScript + TailwindCSS + ThreeUI (WebGL) + GSAP 3          │
│   ┌───────────────────────┐  ┌───────────────────────┐  ┌──────────────────────────┐   │
│   │   CustomCursor.tsx    │  │  ThreeBackground.tsx  │  │   CustomContextMenu.tsx  │   │
│   │ (120fps Dual Ring GPU)│  │ (5 WebGL 3D Shaders)  │  │ (Radial Emoji Wheel/Burst)│  │
│   └───────────────────────┘  └───────────────────────┘  └──────────────────────────┘   │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ App Router Routes: / (Spotlight & Marquee), /movies, /recommendations,         │   │
│   │                    /watchlists, /profile, /admin, /login, /signup             │   │
│   └────────────────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / JSON REST API (CORS enabled)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             FASTAPI BACKEND SERVICE (:8000)                            │
│                                                                                        │
│   FastAPI ASGI (Python 3.12) + Pydantic v2 + Passlib/Argon2 + PyJWT                    │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │ API Routing Layer (/api/v1/):                                                  │   │
│   │   • auth.py         • movies.py       • ratings.py                             │   │
│   │   • watchlists.py   • recommendations.py  • admin.py                           │   │
│   └───────────────────────────────┬────────────────────────────────────────────────┘   │
│                                   │                                                    │
│   ┌───────────────────────────────▼────────────────────────────────────────────────┐   │
│   │ Business Logic & ML Service Layer:                                             │   │
│   │   • ml_recommender.py (CustomMovieRecommenderML: SGD Factorized Features)     │   │
│   │   • recommendation_service.py (MatrixFactorizationALS + Taste Centroids)       │   │
│   │   • movie_service.py   • rating_service.py   • watchlist_service.py            │   │
│   │   • evaluation.py (NDCG@K, Precision@K, Recall@K, MRR, ILD)                    │   │
│   └───────────────────────────────┬────────────────────────────────────────────────┘   │
│                                   │                                                    │
│   ┌───────────────────────────────▼────────────────────────────────────────────────┐   │
│   │ In-Memory Caching Subsystem (app/core/cache.py):                               │   │
│   │   • Thread-safe TTL cache with bounded capacity (MAX_CACHE_ENTRIES = 1000)     │   │
│   │   • Sub-millisecond get/set/prune | Zero external Redis dependencies           │   │
│   └───────────────────────────────┬────────────────────────────────────────────────┘   │
└───────────────────────────────────┼────────────────────────────────────────────────────┘
                                    │ SQLAlchemy 2.0 (asyncpg / psycopg2 pool)
                                    ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        PRIMARY PERSISTENCE: POSTGRESQL 18 (:5432)                      │
│                                                                                        │
│   PostgreSQL 18 ("movie_rec_db") with pgvector & uuid-ossp                             │
│   • Relational Tables: users, user_profiles, oauth_accounts, genres, movies,           │
│                        movie_genres, people, movie_credits, ratings, watchlists,       │
│                        watchlist_items, user_interactions                              │
│   • Vector Tables:     movie_embeddings (768-dim HNSW), user_preference_embeddings     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Subsystem Architecture (`frontend/src/`)

### 2.1 Technology Foundations
- **Framework:** Next.js 15.5+ using App Router architecture with React Server Components (RSC) and React 19 Client Components (`"use client"`).
- **Styling:** TailwindCSS 3.4 with custom glassmorphism design tokens (`.glass-card`, `.glass-pill`, `.glass-card-hover`).
- **3D Atmospheric Shaders:** `@designcodeio/threeui` providing WebGL shader backgrounds dynamically imported (`ssr: false`):
  - `FluidFieldBackground`: Liquid neon atmospheric light fields.
  - `NebulaBackground`: Deep cosmic particle turbulence.
  - `WarpFieldBackground`: Hyperspace perspective streak acceleration.
  - `EmberStorm`: Warm cinematic ember drift.
  - `LiquidFormBackground`: Topological gradient mesh deformations.
- **GSAP 3 Animation Suite:** Hardware-accelerated GPU transforms (`gsap.quickTo`, `gsap.context`, `clearProps: "transform,opacity"`).

### 2.2 Key Frontend Components

| Component | File Path | Architectural Role | Performance Guarantee |
|---|---|---|---|
| `CustomCursor` | `src/components/CustomCursor.tsx` | Dual-ring precision cursor tracking `x, y, scale` exclusively via GPU transform. | 120 FPS vsync-locked; auto-yields to native `cursor: text` over inputs. |
| `ThreeBackground` | `src/components/ThreeBackground.tsx` | Manages single active WebGL shader canvas with floating control dock. | Suspends rendering on `visibilitychange` (tab hidden) to drop GPU load to 0%. |
| `ThreeCard3D` | `src/components/ThreeCard3D.tsx` | Cursor-relative perspective tilt (`rotateX`, `rotateY`, `scale3d`) and dynamic specular glare. | Zero React state updates on mousemove; cached `DOMRect` + direct RAF styling. |
| `GsapStagger` | `src/components/GsapStagger.tsx` | Scoped stagger entrance for movie grids and shelves using `gsap.context()`. | Single-fire execution per dataset load; clears inline transforms post-animation. |
| `CustomContextMenu` | `src/components/CustomContextMenu.tsx` | Radial right-click emoji wheel with spring physics and 28-particle burst physics. | Capped particles; kills previous tweens on repeat triggers; clean unmount. |
| `MovieCard` | `src/components/MovieCard.tsx` | Catalog movie presentation card with fallback artwork generation and 3D hover. | Shared `movieArtwork.ts` utility; zero layout thrashing; lazy loading. |
| `RecommendationCard` | `src/components/RecommendationCard.tsx` | RecSys item card showing algorithm badges (`Taste Affinity`, `Collaborative ML`, `Critic Choice`). | Shares artwork utility; displays similarity confidence % and explanation tags. |

### 2.3 Route Structure

```
frontend/src/app/
├── layout.tsx                # Root shell: CustomCursor, CustomContextMenu, ThreeBackground, Navbar, Footer
├── page.tsx                  # Home: Infinite background marquee, Spotlight hero slideshow, Recs, Trending
├── movies/
│   ├── page.tsx              # Catalog: 8-way sorting, genre faceted filtering, pagination
│   └── [id]/page.tsx         # Movie Details: Cast list, trailer player, user star rating, review drawer
├── recommendations/page.tsx  # Dedicated RecSys feed: Algorithm breakdowns and similarity scores
├── watchlists/page.tsx       # Watchlist manager: Priority ranking, add/remove, watched toggle
├── profile/page.tsx          # User taste profile: Rating history, preferred genres, account stats
├── admin/
│   ├── page.tsx              # Admin Back-Office: System metrics, review moderation, ML retrain trigger
│   └── login/page.tsx        # Isolated Administrator authentication portal
├── login/page.tsx            # User sign-in
└── signup/page.tsx           # User registration
```

---

## 3. Backend Subsystem Architecture (`backend/app/`)

### 3.1 Technology Foundations
- **Framework:** FastAPI with Python 3.12+ ASGI asynchronous event loop.
- **ORM / Data Layer:** SQLAlchemy 2.0 with decoupled async session (`asyncpg`) for API request pipelines and sync session (`psycopg2`) for offline training jobs.
- **Validation & Schemas:** Pydantic v2 with strict type coercion and OpenAPI schema generation.
- **Security:** Passlib with Argon2id and bcrypt algorithm hashing; PyJWT for access and refresh tokens.

### 3.2 Machine Learning Architecture

```
                                  ┌──────────────────────────────┐
                                  │   User Ratings & Profiles    │
                                  └──────────────┬───────────────┘
                                                 │
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │       CustomMovieRecommenderML        │
                             │  • Factorized Latent Vectors (k=16)   │
                             │  • Global Bias (μ)                    │
                             │  • User Biases (b_u) & Item Biases(b_i)│
                             │  • Genre Affinity Projection Matrix   │
                             │  • Stochastic Gradient Descent (SGD)  │
                             └───────────────────┬───────────────────┘
                                                 │
                                                 ▼
┌──────────────────────────────┐     ┌───────────────────────┐     ┌───────────────────────────────┐
│     Content-Based (CBF)      │     │ Collaborative (CF)    │     │      Trending / Fallback      │
│  768-dim Taste Centroid      │     │ MatrixFactorizationALS │     │ Bayesian Wilson Rating Score  │
│  Vector Cosine Similarity    │     │ User-Item P & Q latent│     │ Time-Decayed Popularity       │
└──────────────┬───────────────┘     └───────────┬───────────┘     └───────────────┬───────────────┘
               │                                 │                                 │
               └─────────────────────────────────┼─────────────────────────────────┘
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │    Hybrid Scoring & Re-Ranker Engine  │
                             │   Weighted Ensemble + Explanations    │
                             └───────────────────┬───────────────────┘
                                                 │
                                                 ▼
                             ┌───────────────────────────────────────┐
                             │   RecommendationEvaluator Framework   │
                             │   NDCG@10, Precision@10, Recall@10,   │
                             │   MRR, Catalog Coverage, ILD          │
                             └───────────────────────────────────────┘
```

#### Mathematical Formulation (`ml_recommender.py`):
For user $u$, movie $i$, and movie genre vector $g_i$, the predicted affinity score $\hat{r}_{u,i}$ is computed as:

$$\hat{r}_{u,i} = \mu + b_u + b_i + \mathbf{P}_u^T \mathbf{Q}_i + \mathbf{u}_{\text{genre}, u}^T \mathbf{g}_i$$

Where:
- $\mu$: Global rating average.
- $b_u, b_i$: Learned user and movie bias scalars.
- $\mathbf{P}_u, \mathbf{Q}_i \in \mathbb{R}^{k}$: Latent factor embeddings learned via L2-regularized SGD.
- $\mathbf{u}_{\text{genre}, u}^T \mathbf{g}_i$: Projection of user taste affinity against one-hot/normalized genre features.

---

## 4. In-Memory Baching & Caching Strategy (`app/core/cache.py`)

To eliminate the operational complexity of external Redis daemons while fulfilling sub-millisecond latency requirements:
- **Thread-Safe In-Memory Storage**: Synchronous memory dictionary guarded with automatic expiration timestamps.
- **Bounded Capacity Enforcement**: Hard cap at `MAX_CACHE_ENTRIES = 1000`. When limit is exceeded, an automated prune pass purges expired keys and evicts oldest items.
- **Cached Domains**:
  - Hot movie catalogs & genre lookups (`ttl=300s`).
  - Computed recommendation feeds (`ttl=180s`).
  - Admin dashboard platform aggregate statistics (`ttl=60s`).
- **Pattern-Based Invalidation**: `cache_delete_pattern("movies:*")` triggered whenever movies are updated or ratings are submitted.

---

## 5. Database Schema & Tables (`setup_database.sql`)

All 14 tables in PostgreSQL 18 maintain 100% parity with SQLAlchemy ORM models:

| Table Name | Primary Key | Key Columns / Indexes | Purpose |
|---|---|---|---|
| `users` | `id UUID` | `email UNIQUE`, `username UNIQUE`, `role user_role` | Identity, authentication credentials, GDPR consent. |
| `user_profiles` | `user_id UUID` | `preferred_genres INT[]`, `preferred_languages` | Onboarding preferences and user metadata. |
| `oauth_accounts` | `id UUID` | `(provider, provider_account_id) UNIQUE` | Social authentication linkage (Google, GitHub). |
| `genres` | `id INT` | `tmdb_id`, `name`, `slug` | Movie genre classification catalog. |
| `movies` | `id UUID` | `tmdb_id`, `popularity_score`, `vote_avg`, `vote_count` | Master movie catalog with box-office and release data. |
| `movie_genres` | `(movie_id, genre_id)` | Foreign keys to `movies` and `genres` | Many-to-many movie genre association. |
| `people` | `id UUID` | `tmdb_id`, `name`, `known_for_department` | Actors, directors, and film crew records. |
| `movie_credits` | `id UUID` | `movie_id`, `person_id`, `role_type` | Cast and crew assignments per movie. |
| `movie_embeddings` | `movie_id UUID` | `embedding vector(768)` (HNSW cosine index) | High-dimensional semantic vectors for content search. |
| `user_preference_embeddings` | `user_id UUID` | `embedding vector(768)`, `last_computed_at` | Rolling user taste centroid embedding. |
| `ratings` | `id UUID` | `(user_id, movie_id) UNIQUE`, `rating_value INT` | User ratings (1–10) and spoiler-tagged reviews. |
| `watchlists` | `id UUID` | `user_id`, `is_default`, `is_private` | User curated movie lists ("Watch Later"). |
| `watchlist_items` | `id UUID` | `(watchlist_id, movie_id) UNIQUE`, `priority` | Ordered movie items within watchlists. |
| `user_interactions` | `id BIGINT` | `(user_id, movie_id)`, `event_type`, `occurred_at` | High-frequency telemetry (partitioned by month). |

---

## 6. Data Flow Lifecycle

### 6.1 User Browses Movie Catalog
1. Next.js Client calls `GET /api/v1/movies?sort_by=popularity_score&sort_order=desc&limit=20`.
2. FastAPI checks in-memory cache for key `movies:catalog:...`.
3. If cache hit: returns cached payload in `< 1ms`.
4. If cache miss: executes async SQLAlchemy query with `selectinload(Movie.genres)`, caches result, and returns JSON payload in `< 35ms`.
5. Frontend renders movie grid wrapped in `GsapStagger` with `ThreeCard3D` interactive tilt.

### 6.2 User Rates a Movie
1. User clicks star rating (e.g. 9/10) on `/movies/[id]`.
2. Client sends authenticated `POST /api/v1/ratings` with Bearer JWT.
3. FastAPI upserts rating record in PostgreSQL.
4. Triggers cache invalidation pattern for user recommendations and movie stats.
5. In background, marks user taste profile for nearline vector centroid recomputation.

### 6.3 Admin Triggers ML Model Retrain
1. Admin clicks "Retrain Custom ML Model" in `/admin`.
2. Client sends `POST /api/v1/admin/retrain-ml` with Admin authorization token.
3. Backend fetches all movies, genres, user profiles, and ratings into memory.
4. Instantiates `CustomMovieRecommenderML(n_factors=16, n_epochs=20)` and executes SGD optimization.
5. Updates active in-memory recommendation model reference; returns recalibrated confirmation.

---

## 7. Technical Conventions

- **Paths & Imports:** Absolute imports with `@/` alias in Next.js (`@/components/*`, `@/lib/*`); package-relative imports in Python (`app.models.*`, `app.core.*`).
- **Naming Conventions:**
  - TypeScript: `PascalCase` for React components/types, `camelCase` for hooks/utilities.
  - Python: `snake_case` for functions/variables, `PascalCase` for classes/Pydantic models, `UPPER_CASE` for constants.
  - Database: `snake_case` plural for tables (`movies`, `users`, `ratings`), `snake_case` singular for columns.
- **Formatting & Linting:** Strict TypeScript checking (`tsc --noEmit`), ESLint clean, AST Python verification (0 unused imports).

---

*Last updated: November 2026*

