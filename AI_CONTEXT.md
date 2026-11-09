# CineSphere — AI Context & Technical System Reference

> **Purpose of this Document:**  
> This file provides an exhaustive, authoritative technical blueprint and operational context for AI assistants, LLM coding agents, and engineers working on the **CineSphere** codebase. Read this document before proposing, implementing, or debugging changes.

---

## 1. System Overview & Core Capabilities

**CineSphere** is a high-performance, full-stack movie recommendation and discovery platform.

### Core Features

1. **Authentication & Onboarding:**
   * JWT-based authentication (short-lived access tokens, refresh tokens, bcrypt password hashing).
   * Interactive genre taste onboarding during registration to solve the user cold-start dilemma.
2. **Movie Catalog & Bidirectional Discovery:**
   * **131 Iconic Curated Movies:** Spanning 1942 to 2024 across 19 genres with 560+ credits and 370+ cast members and directors.
   * **Bidirectional 8-Way Sorting:** Most Popular, Least Popular, Highest Rated, Lowest Rated, Newest Releases, Oldest Releases, Title (A-Z), Title (Z-A).
   * **Multi-Faceted Filtering:** Instant genre filtering across 19 genres with URL synchronization, keyword search, active filter pills, and 1-click filter reset.
   * **Detailed Movie Pages:** Cast, director, runtime, vote aggregates, and TMDB imagery.
   * **1–10 Star Ratings:** Community reviews with spoiler-tagging.
   * **Watchlist Management:** Custom user watchlists with optimistic UI state updates.
3. **Custom Machine Learning Recommendation Engine:**
   * **Factorized Feature Model (`CustomMovieRecommenderML`):** Directly trained on structured movie features (19 multi-hot genres, release era, runtime, popularity, vote averages) and user rating matrices.
   * **User Taste Profiling:** Learns personalized genre affinity distributions from user rating history, anchored by onboarding genre preferences for instant cold-start resolution.
   * **Latent Collaborative Learning:** Regularized Stochastic Gradient Descent (SGD) learning joint user-item latent factors and entity biases with zero external embedding dependencies.
   * **Learned Item-to-Item Similarity:** Evaluates similar movies directly in the model's learned representation space for "More Like This" discovery.
4. **Dedicated User Profile & Admin Console:**
   * **User Profile Page (`/profile`):** KPI telemetry (movies rated, average score given, active watchlists), user bio editor modal, submitted reviews table with 1-click delete action, watchlists gallery, and interactive AI taste breakdown bar chart.
   * **Admin Console (`/admin` & `/admin/login`):** Role-gated administration console (`ADMIN` role), 6 system KPIs, interactive catalog manager (add/delete movies), user role manager (`USER`, `CRITIC`, `MODERATOR`, `ADMIN`), content moderation table, and live 1-click ML model retraining. Pre-seeded admin: `admin@movierec.com` / `admin123`.
5. **ThreeUI (threeui.com) 3D & WebGL Integration:**
   * **Interactive WebGL Shaders:** Integrated official `@designcodeio/threeui` WebGL shaders (`FluidFieldBackground`, `NebulaBackground`, `WarpFieldBackground`, `EmberStorm`, `LiquidFormBackground`) with user-facing interactive atmosphere switcher.
   * **ThreeUI 3D Perspective Tilt (`ThreeCard3D`):** Cursor-tracking 3D rotation (`perspective(1000px) rotateX(...) rotateY(...) scale3d(...)`) with specular spotlight glint on `MovieCard`, `RecommendationCard`, and KPI cards.
   * **Liquid Metal & Mercury Buttons:** Custom `.three-liquid-metal-btn` interactive chrome action buttons with metallic sheen and specular highlights for high-priority CTAs.
   * **Holographic Badges & ThreeUI Dock:** Animated shimmer badges (`.three-badge-shimmer`), iridescent highlights, and `.three-dock` floating top navigation.
   * **GSAP Precision Custom Cursor (`CustomCursor`):** Dual-ring cursor architecture operating at 120fps with `gsap.quickTo` (inner precision dot + outer spring follower ring), magnetic interactive expansion (`scale: 2.2` with purple glowing aura) over interactive elements, click contraction (`scale: 0.75`), and touch-device guard (`(pointer: coarse)`).
   * **Custom Right-Click Radial Emoji Wheel (`CustomContextMenu`):** Global custom context menu replacing native right-click with an 8-petal radial reaction wheel (🍿, 🔥, ❤️, 🤯, ⭐, 🚀, 😭, 👏) featuring a live dynamic center feedback hub, radial dotted orbit guide, screen overflow clamping, and quick cinema shortcuts (Home, Movies, Watchlists, Reload).
   * **GSAP Emoji Particle Explosion:** Instant burst of 36 floating animated emoji particles rendered with randomized trajectory, spin, scaling, and upward drift physics in GSAP, paired with an expanding shockwave ring and celebration toast pill.
   * **GSAP Stagger Entrance Animations (`GsapStagger`):** Silky-smooth GPU-accelerated entrance animations across all movie shelves, catalog grids, and recommendations utilizing `gsap.context()` with automatic inline transform clearance (`clearProps`) preserving 3D card tilt.
   * **Geometric Cinema Favicon:** Vector SVG favicon (`/favicon.svg` and `/icon.svg`) featuring a geometric aperture reel with glowing diamond sparkle and gradient squircle.
6. **Cinematic Transparent Glassmorphic UI & Dynamic Slideshow/Carousel:**
   * **Completely Transparent Glassmorphic Architecture:** Fully transparent UI canvas architecture (`rgba(15, 23, 42, 0.2)` cards, `rgba(9, 13, 24, 0.35)` dock and navigation with 24px blur) letting the 3D WebGL atmospheric shaders and background marquee shine through with crystal clarity.
   * **Dynamic Background Marquee Carousel:** 3 alternating infinite drifting rows of catalog movie poster cards in the background behind the hero section with smooth CSS marquee animation and deep cinema radial vignette.
   * **Spotlight Hero Slideshow:** Auto-advancing cinematic hero carousel cycling through top spotlight movies every 5.5s with backdrop crossfade, progress pills, play/pause controls, and thumbnail selectors.
   * **Translucent Glass Primitives:** `.glass-card`, `.glass-card-hover`, `.glass-header`, `.glass-pill`, `.glass-pill-active`, `.glass-input` with GPU-accelerated backdrop blur (`backdrop-blur-xl/2xl`) and specular highlight top lines.
   * **Zero-Broken-Image Resilience:** Automatic fallback artwork pipeline inside `MovieCard` and `RecommendationCard` using genre-tinted radial gradients and stylized typography if TMDB images are missing or throttled.
   * **Compositor Micro-Animations:** Floating ambient gradient glow orbs (`float-slow`, `float-reverse`), glowing star rating scale effects, card lifts (`hover:-translate-y-1`), and shimmer loading skeletons. Reduced-motion compliant.

---

## 2. Architectural Constraints & Non-Negotiable Rules

When modifying or extending this codebase, adhere strictly to the following constraints:

> [!IMPORTANT]
>
> 1. **STRICTLY NO DOCKER:**  
>    Do **NOT** create, suggest, or introduce any `Dockerfile`, `docker-compose.yml`, or container orchestration. All services run natively on the Windows host.
> 2. **STRICTLY NO REDIS:**  
>    Do **NOT** install `redis`, `redis-py`, or connect to external Redis instances. Caching is handled entirely in-memory via [`backend/app/core/cache.py`](file:///c:/Users/DELL/OneDrive/Desktop/movie-rec/backend/app/core/cache.py).
> 3. **PGADMIN 4 AS PRIMARY DATABASE GUI:**  
>    PostgreSQL is natively installed (v18, port 5432). The user manages the database exclusively via the native **pgAdmin 4** desktop client (`C:\Users\DELL\AppData\Local\Programs\pgAdmin 4\runtime\pgAdmin4.exe`). Schema migrations and table definitions are defined in [`setup_database.sql`](file:///c:/Users/DELL/OneDrive/Desktop/movie-rec/setup_database.sql).
> 4. **CUSTOM ML MODEL FIRST:**  
>    The system prioritizes [`CustomMovieRecommenderML`](file:///c:/Users/DELL/OneDrive/Desktop/movie-rec/backend/app/services/ml_recommender.py) for all personalization and item-similarity calculations, with fallback array vector storage.
> 5. **PRESERVE `.next` COMPILATION CACHE:**  
>    Do not randomly wipe `.next` during active sessions unless resolving orphaned chunk errors, as cold rebuilds take 40+ seconds.

---

## 3. Technology Stack

| Layer | Technology | Version / Details |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router) | 15.5+ (React 19, TypeScript 5.6+) |
| **Styling & UI** | TailwindCSS + Lucide React | Modern dark cinema theme (`#090d16`) |
| **Backend Framework** | FastAPI | Python 3.12+, Uvicorn ASGI server |
| **ORM & Database Driver** | SQLAlchemy 2.0 | `asyncpg` for async endpoints, `psycopg2` for sync seed/eval |
| **Cache Layer** | Pure Python In-Memory TTL | [`backend/app/core/cache.py`](file:///c:/Users/DELL/OneDrive/Desktop/movie-rec/backend/app/core/cache.py) (Key-value with expiration & pattern eviction) |
| **Machine Learning** | NumPy, SciPy & Scikit-Learn | Custom factorized feature model, SGD optimization, cosine similarity |
| **Database** | PostgreSQL | Native v18 on `localhost:5432` (`movie_rec_db`) |
| **Database Admin GUI** | pgAdmin 4 | Native Windows Desktop client |
| **Security & Auth** | Passlib (bcrypt) + python-jose | JWT HS256, salted password hashing |
| **Testing** | Pytest + AnyIO + Httpx | 16 passing tests across API, security, live DB, and ML math |

---

## 4. Repository Structure & Key Files

```text
movie-rec/
├── AI_CONTEXT.md                     # This file (AI and developer system reference)
├── README.md                         # Project overview and run instructions
├── SYSTEM_BLUEPRINT.md               # Senior Solutions Architect complete system specification
├── setup_database.sql                # Complete PostgreSQL DDL (tables, indexes, triggers, partitions)
├── servers.json                      # pgAdmin 4 server configuration import file
├── .env.example                      # Environment variables reference template
├── .gitignore                        # Git exclusion rules
│
├── backend/                          # FastAPI Python 3.12 Backend
│   ├── .env                          # Local environment settings (DB url, JWT secrets)
│   ├── requirements.txt              # Production Python dependencies (no Redis, scikit-learn included)
│   ├── pytest.ini                    # Pytest configuration
│   ├── tests/                        # Automated test suite (16 tests)
│   │   ├── test_api_endpoints.py     # Root, health, OpenAPI, unauthorized access
│   │   ├── test_live_db_flow.py      # End-to-end user registration and movie retrieval
│   │   ├── test_rec_math.py          # Custom ML convergence, ALS matrix factorization, evaluation metrics
│   │   ├── test_schemas.py           # Pydantic v2 validation logic
│   │   └── test_security.py          # Password hashing and JWT claims
│   └── app/
│       ├── main.py                   # FastAPI app entrypoint, CORS regex, lifespan caching
│       ├── seed.py                   # Seed script populating 131 iconic movies, cast & demo users
│       ├── movies_dataset_expanded.py # Curated dataset of 119 diverse movies across all eras and genres
│       ├── evaluation.py             # Offline RecSys evaluator (NDCG, Recall@K, Coverage, Diversity)
│       ├── api/v1/                   # REST API routing
│       │   ├── router.py             # Combined API router
│       │   └── endpoints/            # auth.py, movies.py, ratings.py, recommendations.py, watchlists.py
│       ├── core/                     # Infrastructure modules
│       │   ├── cache.py              # Zero-dependency in-memory TTL cache
│       │   ├── config.py             # Pydantic BaseSettings environment validation
│       │   ├── database.py           # Async and Sync SQLAlchemy session factories
│       │   ├── logging.py            # Loguru structured logging configuration
│       │   └── security.py           # Bcrypt hashing and JWT token generation
│       ├── models/                   # SQLAlchemy ORM database models
│       │   ├── movie.py              # Movie, Genre, MovieGenre, MovieCredit, Person, MovieEmbedding
│       │   ├── user.py               # User (PG_ENUM user_role), UserProfile
│       │   ├── rating.py             # Rating
│       │   ├── watchlist.py          # Watchlist, WatchlistItem
│       │   └── interaction.py        # UserInteraction (partitioned table, PG_ENUM event_type)
│       ├── schemas/                  # Pydantic DTOs for request/response serialization
│       └── services/                 # Business logic
│           ├── auth_service.py       # User registration, login, profile fetch
│           ├── movie_service.py      # Catalog querying, 8-way sorting, genre filtering, search
│           ├── rating_service.py     # Submit rating, update vote aggregates, evict rec cache
│           ├── ml_recommender.py     # Custom Factorized Feature & Collaborative ML Model
│           ├── recommendation_service.py # Personalized feed orchestrator, item similarity
│           ├── tmdb_service.py       # TMDB API sync with in-memory caching
│           └── watchlist_service.py  # Watchlist CRUD and item toggling
│
└── frontend/                         # Next.js 15 (React 19 + TypeScript)
    ├── package.json                  # Dependencies & scripts (dev, build, start, lint)
    ├── next.config.ts                # Next.js config (images, rewrites)
    ├── tailwind.config.ts            # Cinema color palette and animations
    ├── tsconfig.json                 # TypeScript strict configuration (forceConsistentCasingInFileNames)
    ├── .env.local                    # NEXT_PUBLIC_API_URL=/api/v1 (proxied to port 8000)
    └── src/
        ├── app/                      # Next.js App Router pages
        │   ├── layout.tsx            # Root layout with AuthProvider, Navbar, Footer
        │   ├── not-found.tsx         # 404 handler returning to catalog
        │   ├── page.tsx              # Home / landing hero page with trending carousel
        │   ├── login/page.tsx        # Sign-in page with 1-click demo auto-fill
        │   ├── signup/page.tsx       # Registration with interactive genre onboarding
        │   ├── movies/page.tsx       # Catalog with 8-way sort, multi-genre filtering, search, pagination
        │   ├── movies/[id]/page.tsx  # Movie detail, cast, rating UI, and similar movies
        │   ├── recommendations/page.tsx # Personalized recommendations dashboard
        │   └── watchlists/page.tsx   # Watchlist management
        ├── components/               # Reusable UI widgets
        │   ├── Navbar.tsx            # Sticky navigation with live search input
        │   ├── MovieCard.tsx         # Movie poster, rating badge, year, genres
        │   ├── StarRating.tsx        # Interactive 1–10 star rater with review submission
        │   ├── RecommendationCard.tsx# ML score breakdown and match percentage badge
        │   ├── WatchlistButton.tsx   # Optimistic add/remove watchlist bookmark
        │   ├── LoadingSkeleton.tsx   # Tailwind pulse placeholder grids
        │   ├── EmptyState.tsx        # Illustrated empty state alerts
        │   └── Footer.tsx            # Footer navigation and credits
        ├── context/
        │   └── AuthContext.tsx       # React Auth Context (session state & token storage)
        └── lib/
            ├── api.ts                # Strongly-typed API client with dual-loopback resilience
            └── types.ts              # TypeScript interfaces matching backend DTOs
```

---

## 5. Catalog Sorting & Filtering Specification

### 1. Backend Endpoint: `GET /api/v1/movies`

Supports the following query parameters:

* `page`: Integer $\ge 1$ (default: 1).
* `limit`: Integer between 1 and 100 (default: 20).
* `genre`: Optional TMDB genre ID (e.g. `878` for Sci-Fi, `16` for Animation) or database ID.
* `search`: Keyword string matched via case-insensitive `ILIKE` across `title`, `original_title`, `tagline`, and `overview`.
* `sort`: One of the 8 supported bidirectional sort keys:
  * `popularity`: Popularity score descending.
  * `popularity_asc`: Popularity score ascending.
  * `vote_average`: Vote average descending (secondary: vote count desc).
  * `vote_average_asc`: Vote average ascending (secondary: vote count desc).
  * `release_date`: Release date descending (newest first).
  * `release_date_asc`: Release date ascending (oldest first).
  * `title`: Movie title alphabetically (A-Z).
  * `title_desc`: Movie title reverse alphabetically (Z-A).

### 2. Frontend State & URL Synchronization

* Changing sort or genre updates URL search parameters via `router.replace(..., { scroll: false })` and resets `page` to 1.
* Clicking **"Load More Titles"** increments `page` and seamlessly appends incoming items without re-fetching existing ones.
* Active filters are displayed as removable pills with an instant **"Reset All Filters"** action.

---

## 6. Custom Machine Learning Model Architecture (`CustomMovieRecommenderML`)

The recommendation system uses a custom-trained **Factorized Feature Machine Learning Model** (`app/services/ml_recommender.py`).

### 1. Structured Feature Engineering

* **Genre Features ($\mathbf{g}_m \in \{0, 1\}^{19}$):** Multi-hot binary vector across all 19 canonical TMDB genres.
* **Content Metadata Features ($\mathbf{c}_m \in [0, 1]^5$):**
  * `norm_year = clip((year - 1970) / 56.0, 0, 1)`
  * `norm_runtime = clip(runtime / 240.0, 0, 1)`
  * `norm_vote = clip(vote_average / 10.0, 0, 1)`
  * `norm_pop = clip(log1p(popularity) / 6.0, 0, 1)`
  * `norm_count = clip(log1p(vote_count) / 10.0, 0, 1)`

### 2. User Taste Modeling & Cold-Start Anchor

* **User Genre Affinity ($\mathbf{u}_g \in [-1.0, 1.0]^{19}$):**
  * Calculated as a rating-weighted preference over genres of movies the user has rated: $u_{g, j} = \frac{\sum_{m \in \mathcal{R}_u, j \in \text{genres}(m)} (r_{um} - 5.0)}{\sum_{m \in \mathcal{R}_u} 1 + \epsilon}$.
  * For **cold-start users** with zero ratings, $\mathbf{u}_g$ is initialized directly from the user's onboarding `preferred_genres` selected during registration.

### 3. Model Prediction Equation

$$\hat{y}(u, m) = \mu + b_u + b_m + \underbrace{\mathbf{p}_u \cdot \mathbf{q}_m}_{\text{Latent Collaborative Interaction}} + \underbrace{\mathbf{w}_g \cdot (\mathbf{u}_g \odot \mathbf{g}_m)}_{\text{Element-wise Genre Affinity Match}} + \underbrace{\mathbf{w}_c \cdot \mathbf{c}_m}_{\text{Learned Content Signals}}$$

---

## 7. Running & Testing the Application

### Start Backend

```bash
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

* **Swagger UI:** `http://localhost:8000/docs`
* **Health Check:** `http://localhost:8000/health`

### Start Frontend

```bash
cd frontend
npm run dev
```

* **Web Application:** `http://localhost:3000`

### Seed Database

```bash
cd backend
.\venv\Scripts\activate
python -m app.seed
```

Seeds 131 iconic movies, 19 genres, 560+ credits, 370+ people, and pre-configured user profiles.

### Run Automated Tests

```bash
cd backend
.\venv\Scripts\activate
pytest -v
```

Runs 16 test suites verifying endpoints, authentication, rating validations, ALS convergence, custom ML model training, and RecSys evaluation metrics.

---

## 8. Pre-Configured Test Accounts

| Role | Email | Password | Taste Profile |
| :--- | :--- | :--- | :--- |
| **Active Cinephile** | `demo@movierec.com` | `password123` | High affinity for Sci-Fi, Action, Thriller. Has multiple rated movies and active watchlists. |
| **Film Critic** | `critic@movierec.com` | `critic123` | Verified critic role with elevated display badge. |

*(The Sign-In page at `http://localhost:3000/login` includes a 1-click **"Auto-fill Demo Account"** button for instant testing).*
