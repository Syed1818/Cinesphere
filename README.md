# CineSphere: AI-Powered Movie Recommendation Platform

An enterprise-grade, full-stack movie recommendation platform built with **Next.js 15 (React 19 + TypeScript + TailwindCSS)**, a high-performance **FastAPI (Python 3.12)** backend, **PostgreSQL 18**, and **pgAdmin 4**.

---

## Architecture Highlights

* **ThreeUI (threeui.com) 3D & WebGL Cinematic Revamp:**
  * **Interactive WebGL Atmospheric Shaders:** Integrates official `@designcodeio/threeui` shaders (`FluidFieldBackground`, `NebulaBackground`, `WarpFieldBackground`, `EmberStorm`, `LiquidFormBackground`) with an interactive on-screen floating atmosphere switcher.
  * **Completely Transparent Glassmorphic System:** Fully transparent UI canvas architecture (`rgba(15, 23, 42, 0.2)` cards, `rgba(9, 13, 24, 0.35)` dock and navigation with 24px blur) letting the 3D WebGL atmospheric shaders and background marquee shine through with crystal clarity.
  * **GSAP Precision Custom Cursor:** High-performance dual-ring cursor operating at 120fps with `gsap.quickTo` (inner precision dot + outer spring follower ring), magnetic interactive expansion (`scale: 2.2` with purple glowing aura) over interactive elements, click contraction (`scale: 0.75`), and touch-device guard.
  * **Custom Right-Click Radial Emoji Wheel (`CustomContextMenu`):** Intercepts right-click to reveal an interactive 8-petal radial reaction wheel (🍿, 🔥, ❤️, 🤯, ⭐, 🚀, 😭, 👏) with dynamic center hub feedback and quick cinema navigation shortcuts (Home, Movies, Watchlists, Reload).
  * **GSAP Emoji Particle Explosion:** Selecting any reaction emoji triggers a GPU-accelerated confetti burst of 36 floating animated emoji particles with physics velocity, upward drift, rotation, and an expanding shockwave ring, accompanied by a celebration toast pill.
  * **GSAP Stagger Entrance Animations (`GsapStagger`):** Silky-smooth GPU-accelerated entrance animations across all movie shelves, catalog grids, and recommendations utilizing `gsap.context()` with automatic inline transform clearance (`clearProps`) preserving 3D card tilt.
  * **3D Perspective Card Tilt (`ThreeCard3D`):** Smooth cursor-tracking 3D tilt with dynamic radial specular reflections on all movie cards, recommendation cards, and KPI panels.
  * **Liquid Metal & Mercury Buttons:** Custom `.three-liquid-metal-btn` interactive chrome actions with metallic sheen and specular highlights for high-priority CTAs.
  * **Holographic Badges & ThreeUI Dock:** Animated shimmer badges (`.three-badge-shimmer`), iridescent highlights, and `.three-dock` floating top navigation.
  * **Geometric Cinema Favicon:** Vector SVG favicon (`/favicon.svg` and `/icon.svg`) featuring a geometric aperture reel with glowing diamond sparkle and gradient squircle.
* **Glassmorphic UI & Cinematic Design System:**
  * **Dynamic Background Slideshow & Carousel:** Features an ambient multi-row infinite drifting marquee poster carousel across the background and an interactive auto-advancing Hero Spotlight Slideshow cycling through top movies every 5.5 seconds with backdrop crossfade, progress pills, play/pause controls, and thumbnail selectors.
  * **Ultra-Refined Glassmorphism:** Implements translucent glass cards (`.glass-card`, `.glass-card-hover`), specular top borders, ambient floating glow orbs (`float-slow`, `float-reverse`), and radial mesh background.
  * **Zero Broken Images Guaranteed:** Graceful fallback artwork system in `MovieCard` and `RecommendationCard` renders genre-colored radial gradients and stylized typography whenever TMDB images fail to load.
  * **Interactive Micro-Animations:** Glowing 1–10 star hover scaling, card lift on hover (`-translate-y-1`), and smooth pill transitions.
* **Dedicated User Profile & Admin Management:**
  * **User Profile Page (`/profile`):** KPI statistics (rated count, average rating, watchlists), profile bio editor, ratings & reviews management with 1-click deletion, active watchlists, and interactive AI taste breakdown.
  * **Admin Console (`/admin` & `/admin/login`):** Role-gated administration hub with 6 platform KPIs, interactive movie catalog manager (add/delete titles), user role switcher (`USER`, `CRITIC`, `MODERATOR`, `ADMIN`), review moderation table, and 1-click **Retrain ML Engine** button.
* **Custom Machine Learning Recommendation Engine (`CustomMovieRecommenderML`):**
  * **Factorized Feature Model:** Directly trained on structured movie features (19 multi-hot genres, release era, runtime, popularity, vote averages) and user rating matrices.
  * **User Taste Profiling:** Learns personalized genre affinity distributions from user rating history, anchored by onboarding genre preferences for instant cold-start resolution.
  * **Latent Collaborative Learning:** Regularized Stochastic Gradient Descent (SGD) learning joint user-item latent factors and entity biases with zero external embedding dependencies.
  * **Learned Item-to-Item Similarity:** Evaluates similar movies directly in the model's learned representation space for "More Like This" discovery.
* **130+ Iconic Curated Movie Catalog:**
  * Expanded dataset featuring **131 iconic movies** spanning cinema history from 1942 to 2024 across 19 genres (Action, Sci-Fi, Drama, Animation, Crime, Thriller, Western, Horror, Comedy, Romance, etc.).
  * Complete metadata with TMDB IDs, IMDb IDs, directors, full cast ensembles, runtimes, popularity scores, and posters.
* **Full-Featured Catalog & Bidirectional Sorting:**
  * **Bidirectional Sorting:** Most Popular, Least Popular, Highest Rated, Lowest Rated, Newest Releases, Oldest Releases, Title (A-Z), and Title (Z-A).
  * **Multi-Faceted Filtering:** Instant genre filtering across 19 genres with URL synchronization, keyword search, active filter pills, and 1-click filter reset.
  * **Seamless Pagination:** Load More button with smooth chunked loading and accurate counter (`X of 131`).
* **Database & Management:**
  * Fully normalized 3NF schema with partitioned interaction tables.
  * Native host execution: Strictly **NO Docker** and **NO Redis** (pure in-memory TTL caching with zero external daemon overhead).
  * Integrated **pgAdmin 4** GUI pre-configured for instant visual database management.

---

## Project Structure

```text
movie-rec/
├── backend/                  # FastAPI (Python 3.12) High-Speed Backend
│   ├── app/
│   │   ├── api/v1/           # Modular REST API endpoints (auth, movies, ratings, watchlists, recs)
│   │   ├── core/             # Config, security (bcrypt/JWT), database, logging, in-memory cache
│   │   ├── models/           # SQLAlchemy ORM models (Movie, Genre, Credit, User, Rating, Watchlist)
│   │   ├── schemas/          # Pydantic v2 DTO validation schemas
│   │   ├── services/         # Custom ML Recommender, movie catalog service, TMDB client
│   │   ├── seed.py           # Seed script populating 131 iconic movies, cast, genres & users
│   │   ├── movies_dataset_expanded.py # Curated dataset of 119 diverse movies
│   │   └── main.py           # FastAPI entrypoint with CORS, middlewares & exception handlers
│   └── requirements.txt
│
├── frontend/                 # Next.js 15 + React 19 + TypeScript + TailwindCSS
│   ├── src/
│   │   ├── app/              # App Router: Home, Login, Signup, Movies, Detail, Recommendations, Watchlists
│   │   ├── components/       # Reusable UI: Navbar, MovieCard, StarRating, RecommendationCard, etc.
│   │   ├── context/          # React AuthContext (JWT session management)
│   │   ├── lib/              # Strongly-typed API client & TypeScript interfaces
│   │   └── styles/           # TailwindCSS cinema theme
│   └── package.json
│
├── setup_database.sql        # Turnkey SQL DDL script ready for pgAdmin 4 Query Tool
├── servers.json              # Pre-configured server connections for pgAdmin 4
├── SYSTEM_BLUEPRINT.md       # Comprehensive Senior Solutions Architect blueprint
├── AI_CONTEXT.md             # Developer & AI Assistant System Reference
└── .env.example              # Environment variables template
```

---

## Quick Start (Native Windows & pgAdmin 4)

### 1. Database Setup in pgAdmin 4

1. Open native **pgAdmin 4** (`C:\Users\DELL\AppData\Local\Programs\pgAdmin 4\runtime\pgAdmin4.exe`).
2. Connect to your PostgreSQL server (`localhost:5432`, user: `postgres`, password: `root`).
3. You will see `movie_rec_db` in the database tree (or right-click **Databases** $\rightarrow$ **Create** $\rightarrow$ **Database** $\rightarrow$ name it `movie_rec_db`).
4. Select `movie_rec_db`, open **Tools** $\rightarrow$ **Query Tool** (or Alt+Shift+Q), open [`setup_database.sql`](file:///c:/Users/DELL/OneDrive/Desktop/movie-rec/setup_database.sql), and press **F5** to inspect or execute the schema.
5. All 17 tables, genres, triggers, and partitioned interaction tables will be initialized.

---

### 2. Seed Database with 130+ Movies & Recommendations

Populate 131 iconic movies, 19 genres, 560+ credits, 370+ people, and the demo user profile (`demo@movierec.com` / `password123`):

```bash
cd backend
.\venv\Scripts\activate
python -m app.seed
```

---

### 3. Run FastAPI Backend

```bash
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

* **Swagger API Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **API Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### 4. Run Next.js 15 Frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

* **Web Application:** [http://localhost:3000](http://localhost:3000)

---

### 5. Run Automated Tests

```bash
cd backend
.\venv\Scripts\activate
pytest -v
```

*(Runs all 16 automated tests covering API endpoints, database transactions, ML convergence, and security).*

---

## Pre-Configured Test User Accounts

| Role | Email | Password | Taste Profile / Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@movierec.com` | `admin123` | Full admin console access (`/admin`), catalog management, user roles, review moderation, ML retraining. |
| **Active Cinephile** | `demo@movierec.com` | `password123` | Rated Inception (10/10), Interstellar (9/10), The Matrix (9/10). Has active watchlist and profile. |
| **Film Critic** | `critic@movierec.com` | `critic123` | Verified reviewer role with elevated review priority. |

*(You can also click **"Auto-fill Demo Account"** on the [Sign In page](http://localhost:3000/login) or **"Auto-fill Admin Account"** on the [Admin Login terminal](http://localhost:3000/admin/login) for instant 1-click access!)*

---

## Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | User signup with genre taste onboarding |
| `POST` | `/api/v1/auth/login` | Authenticate and obtain JWT access token |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile |
| `PUT` | `/api/v1/auth/profile` | Update user display name, bio, and preferred genres |
| `POST` | `/api/v1/admin/login` | Admin authentication granting admin JWT session |
| `GET` | `/api/v1/admin/stats` | Platform KPIs (users, movies, reviews, cache keys) |
| `GET` | `/api/v1/admin/users` | List all users and manage role assignments |
| `PUT` | `/api/v1/admin/users/{id}/role` | Promote/demote user roles (`USER`, `CRITIC`, `MODERATOR`, `ADMIN`) |
| `POST` | `/api/v1/admin/movies` | Create new movie in catalog |
| `DELETE` | `/api/v1/admin/movies/{id}` | Delete movie and purge caches |
| `POST` | `/api/v1/admin/retrain-ml` | Trigger live asynchronous ML model retraining |
| `GET` | `/api/v1/movies` | Filtered, paginated catalog with 8-way sorting & multi-genre filtering |
| `GET` | `/api/v1/movies/trending` | Time-decayed trending leaderboard |
| `GET` | `/api/v1/movies/{id}` | Detailed movie metadata with cast & ratings |
| `POST` | `/api/v1/ratings` | Submit star rating (1–10) & community review |
| `GET` | `/api/v1/ratings/me` | Fetch authenticated user's submitted reviews |
| `GET` | `/api/v1/recommendations/feed` | Custom ML personalized feed (`CUSTOM_ML`, `ML_TASTE_SIMILAR`, `ML_CRITIC_CHOICE`) |
| `GET` | `/api/v1/recommendations/{user_id}` | Recommendations by user ID |
| `GET` | `/api/v1/recommendations/similar/{id}` | Item-to-item ML feature cosine similarity |
| `GET` | `/api/v1/watchlists` | List all user watchlists and items |
| `POST` | `/api/v1/watchlists/items` | Add movie to watchlist |
