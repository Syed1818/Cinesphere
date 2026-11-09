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
   * **100% Authentic High-Resolution TMDB Artwork:** Fully verified against the official TMDB CDN (`131/131 HTTP 200 OK`). Permanent dataset seeds in `movies_dataset_expanded.py` and `seed.py`.
   * **Bidirectional 8-Way Sorting:** Most Popular, Least Popular, Highest Rated, Lowest Rated, Newest Releases, Oldest Releases, Title (A-Z), Title (Z-A).
   * **Multi-Faceted Filtering:** Instant genre filtering across 19 genres with URL synchronization, keyword search, active filter pills, and 1-click filter reset.
   * **Detailed Movie Pages:** Cast, director, runtime, vote aggregates, and high-res TMDB imagery.
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
5. **Next-Gen Motion System & Adaptive Custom Cursor:**
   * **RAF Linear Interpolation (`lerp`) Physics:** Custom cursor runs on a dedicated continuous `requestAnimationFrame` lerp loop decoupling the precision central dot (`factor = 0.45`) from the trailing follower ring (`factor = 0.15`) for silky 120 FPS tracking.
   * **Dynamic Velocity Stretch & Squash:** Continuous velocity calculation ($\Delta x, \Delta y$) organically stretches the follower along its movement vector ($\theta = \text{atan2}(\Delta y, \Delta x)$) when accelerating and relaxes into a circle when resting.
   * **Context-Aware Morphing States:** Automatically transitions between `DEFAULT` pointer, `MAGNETIC_BUTTON` (magnetic snap with cyan/violet glow), `CARD_HOVER` (ambient glowing aura over cards with centered dot scaled to 0.5), and `TEXT_INPUT` (instant collapse with 100% native OS text carets).
   * **Inertia-Dampened 3D Card Physics (`ThreeCard3D`):** Continuous RAF lerp tilt (`lerp factor = 0.1`), exponential decay spring return, and holographic specular reflection sheen with `overlay` blend mode.
   * **Fluid Marquee Dynamics & Ken Burns Hero Slideshow:** Graceful hover deceleration on 3 infinite background drifting rows, animated 5.5s linear progress timer pill with pause-on-hover/tab-away, keyboard arrow navigation (`ArrowLeft` / `ArrowRight`), and slow-zoom Ken Burns effects.
6. **ThreeUI (threeui.com) 3D & WebGL Integration:**
   * **Interactive WebGL Shaders:** Integrated official `@designcodeio/threeui` WebGL shaders (`FluidFieldBackground`, `NebulaBackground`, `WarpFieldBackground`, `EmberStorm`, `LiquidFormBackground`) with user-facing interactive atmosphere switcher.
   * **Custom Right-Click Radial Emoji Wheel (`CustomContextMenu`):** Global custom context menu replacing native right-click with an 8-petal radial reaction wheel (🍿, 🔥, ❤️, 🤯, ⭐, 🚀, 😭, 👏) featuring a live dynamic center feedback hub, radial dotted orbit guide, screen overflow clamping, and quick cinema shortcuts (Home, Movies, Watchlists, Reload).
   * **GSAP Emoji Particle Explosion:** Instant burst of 36 floating animated emoji particles rendered with randomized trajectory, spin, scaling, and upward drift physics in GSAP, paired with an expanding shockwave ring and celebration toast pill.
   * **GSAP Stagger Entrance Animations (`GsapStagger`):** Silky-smooth GPU-accelerated entrance animations across all movie shelves, catalog grids, and recommendations utilizing `gsap.context()` with automatic inline transform clearance (`clearProps`) preserving 3D card tilt.
   * **Geometric Cinema Favicon:** Vector SVG favicon (`/favicon.svg` and `/icon.svg`) featuring a geometric aperture reel with glowing diamond sparkle and gradient squircle.

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
| **Motion & Physics** | RAF Lerp Physics + GSAP 3 | Dynamic velocity stretch, magnetic snap, 3D card tilt |
| **Backend Framework** | FastAPI | Python 3.12+, Uvicorn ASGI server |
| **ORM & Database Driver** | SQLAlchemy 2.0 | `asyncpg` for async endpoints, `psycopg2` for sync seed/eval |
| **Cache Layer** | Pure Python In-Memory TTL | [`backend/app/core/cache.py`](file:///c:/Users/DELL/OneDrive/Desktop/movie-rec/backend/app/core/cache.py) (Key-value with expiration & pattern eviction) |
| **Machine Learning** | NumPy, SciPy & Scikit-Learn | Custom factorized feature model, SGD optimization, cosine similarity |
| **Database** | PostgreSQL | Native v18 on `localhost:5432` (`movie_rec_db`) |
| **Database Admin GUI** | pgAdmin 4 | Native Windows Desktop client |
| **Security & Auth** | Passlib (bcrypt) + python-jose | JWT HS256, salted password hashing |
| **Testing** | Pytest + AnyIO + Httpx | Passing test suites covering API, security, live DB, and ML math |

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
│   ├── app/
│   │   ├── api/v1/                   # REST endpoints (auth, movies, ratings, watchlists, recs, admin)
│   │   ├── core/                     # Config, database, security, cache
│   │   ├── models/                   # SQLAlchemy models
│   │   ├── schemas/                  # Pydantic v2 schemas
│   │   ├── services/                 # ML recommender, movie catalog, TMDB client
│   │   ├── seed.py                   # Database seeder (131 movies, genres, credits)
│   │   ├── movies_dataset_expanded.py# Curated dataset with verified TMDB artwork
│   │   └── main.py                   # FastAPI entrypoint
│   └── tests/                        # Pytest suites
│
├── frontend/                         # Next.js 15 App Router Frontend
│   └── src/
│       ├── app/                      # Routes: /, /movies, /movies/[id], /recommendations, /watchlists, /profile, /admin
│       ├── components/               # CustomCursor, ThreeCard3D, MovieCard, CustomContextMenu, GsapStagger
│       ├── context/                  # AuthContext
│       └── lib/                      # api.ts, movieArtwork.ts, types.ts
│
└── scripts/                          # Operational & Synchronization Utilities
    ├── sync_real_movie_images.py      # Automated TMDB CDN artwork fetcher & database updater
    └── update_seed_dataset_artwork.py # Permanent dataset synchronizer
```

---

## 5. Running & Testing the Application

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

### Sync TMDB Real Artwork

```bash
python scripts/sync_real_movie_images.py
```

### Run Automated Tests

```bash
cd backend
.\venv\Scripts\activate
pytest -v
```

---

## 6. Pre-Configured Test Accounts

| Role | Email | Password | Taste Profile |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@movierec.com` | `admin123` | Full admin console access (`/admin`), catalog management, user roles, review moderation, ML retraining. |
| **Active Cinephile** | `demo@movierec.com` | `password123` | High affinity for Sci-Fi, Action, Thriller. Has multiple rated movies and active watchlists. |
| **Film Critic** | `critic@movierec.com` | `critic123` | Verified critic role with elevated display badge. |

*(The Sign-In page at `http://localhost:3000/login` includes a 1-click **"Auto-fill Demo Account"** button for instant testing).*
