# SPEC.md — Project Specification

> **Project:** CineSphere (AI-Powered Movie Recommendation & Social Discovery Platform)  
> **Status:** `FINALIZED`  
> **Version:** 1.0.0  
> **Target Scale:** 100,000+ Active Users | p95 Latency < 150ms | 60–120 FPS UI Fluidity  

---

## 1. Vision

**CineSphere** is an enterprise-grade, high-performance movie discovery and recommendation platform designed to bridge catalog exploration, rich social mechanics, and custom machine learning. The platform pairs content-based semantic vector discovery with custom factorized latent feature models, wrapped in an immersive, GPU-accelerated glassmorphic user interface powered by Next.js 15, ThreeUI WebGL atmospheric shaders, and GSAP animations.

---

## 2. Goals

1. **Dual-Paradigm Recommendation Engine** — Deliver personalized recommendations via custom Factorized Feature Vector Machine Learning (SGD optimization, user/movie bias, genre affinity matrices) paired with Alternating Least Squares (ALS) collaborative filtering and semantic taste centroid embeddings.
2. **High-Throughput Social & Engagement Mechanics** — Support 1–10 discrete star ratings, spoiler-protected community reviews, curated/private multi-watchlist management, and instant user interaction tracking.
3. **Immersive WebGL & GSAP User Experience** — Provide a 60–120 FPS glassmorphic interface with 5 interactive ThreeUI 3D shader atmospheres, a dual-ring GPU-accelerated custom cursor, 3D perspective card hover tilt, infinite background movie poster marquees, and a radial context menu with emoji particle bursts.
4. **Host-Native, Lean Architecture** — Eliminate heavy Docker containers and external Redis daemons. Operate 100% natively on host infrastructure (PostgreSQL 18 with pgvector, FastAPI ASGI async backend, Next.js 15 App Router, and bounded in-memory TTL caching).
5. **Comprehensive Offline Evaluation** — Measure offline recommendation quality using standard Information Retrieval metrics (NDCG@K, Precision@K, Recall@K, MRR, Catalog Coverage, Intra-List Diversity).

---

## 3. Non-Goals (Out of Scope)

- **Video Content Streaming / DRM Playback**: CineSphere is a recommendation, metadata, and discovery platform; it does not host or stream copyrighted full-length movie video files.
- **Third-Party Vector Database SaaS**: External managed vector databases (Pinecone, Qdrant, Milvus) are prohibited; all semantic indexing is handled natively via PostgreSQL `pgvector` HNSW indexes.
- **External Redis Clusters**: External Redis server instances are disallowed; all caching is managed via Python in-memory bounded TTL structures with automatic pruning.
- **Docker Containerization**: The runtime environment is strictly host-native Windows PowerShell, leveraging native Python virtual environments and Node.js.

---

## 4. Constraints

- **Host Environment**: Native Windows 11/10 execution using PowerShell.
- **Database**: PostgreSQL 18 running on `localhost:5432` (`movie_rec_db`) with `pgvector` and `uuid-ossp` extensions enabled.
- **Backend**: Python 3.12+ ASGI with FastAPI, SQLAlchemy 2.0 (async via asyncpg + sync via psycopg2), Pydantic v2, Passlib (Argon2id/bcrypt), and PyJWT.
- **Frontend**: Next.js 15.5+ (App Router), React 19, TypeScript 5.6+, TailwindCSS, ThreeUI WebGL shaders, and GSAP 3.
- **Performance Targets**:
  - General API endpoints: p95 latency < 100ms.
  - Recommendation engine inference: p95 latency < 180ms.
  - Frontend render rate: Locked at 60–120 FPS with zero layout thrashing on hover or scroll.
  - Test coverage: 100% pass rate on backend unit/math/integration suites (16/16 tests).

---

## 5. Success Criteria

- [x] **Database Schema**: 14 normalized relational and vector tables implemented in PostgreSQL 18 matching `setup_database.sql`.
- [x] **Backend API**: Complete REST API v1 for Authentication, Movies, Ratings, Watchlists, Recommendations, and Admin Back-Office.
- [x] **Machine Learning Pipeline**: Custom SGD-trained Factorized Feature model and ALS model fully implemented, passing mathematical convergence tests.
- [x] **Evaluation Suite**: Offline RecSys evaluator computing NDCG, Precision, Recall, MRR, and ILD metrics.
- [x] **Frontend Experience**: 13 static/dynamic routes in Next.js 15 App Router with full responsive design.
- [x] **ThreeUI WebGL Shaders**: Interactive atmospheric shader background with 5 modes (`fluid`, `nebula`, `warp`, `embers`, `liquid`) and floating control dock.
- [x] **GSAP & Cursor Optimization**: 120 FPS dual-ring cursor, 3D perspective card tilt, infinite poster marquees, and 28-particle radial emoji bursts.
- [x] **Zero External Service Overhead**: Validated 0 Docker containers, 0 Redis dependencies, and in-memory bounded cache.

---

## 6. User Stories

### 6.1 Cinephile & Casual Viewer
- **As a movie enthusiast**, I want to browse trending, top-rated, and catalog movies sorted by popularity, rating, and release date, so that I can discover new cinema.
- **As a registered user**, I want to rate movies from 1 to 10 and write spoiler-tagged reviews, so that my personal taste profile is accurately captured.
- **As a registered user**, I want personalized recommendations generated from my ratings, favorite genres, and community collaborative patterns, so that I spend less time searching.
- **As a user**, I want to add movies to my "Watch Later" watchlist with priority ordering, so that I can plan upcoming movie nights.
- **As a user**, I want an interactive, fluid visual experience with 3D cards, custom mouse cursors, and ambient WebGL shaders that immerse me in the cinema world.

### 6.2 Administrator
- **As an admin**, I want a dedicated administrative dashboard with secure login, so that I can inspect platform metrics, user counts, and database health.
- **As an admin**, I want to trigger on-demand recalibration of the Custom ML Recommendation Model, so that new user ratings are immediately incorporated into latent vectors.
- **As an admin**, I want to moderate community reviews and manage movie catalog entries.

---

## 7. Technical Requirements Matrix

| Requirement | Category | Priority | Acceptance Criteria |
|---|---|---|---|
| **REQ-AUTH-01** | Security | Must-have | JWT access (60m) and refresh (30d) tokens with Argon2/bcrypt password hashing. |
| **REQ-CAT-01** | Catalog | Must-have | Paginated catalog with 8-way sorting (`release_date`, `popularity`, `vote_avg`, `vote_count` x asc/desc) and genre filters. |
| **REQ-REC-01** | ML / Recs | Must-have | Dual-paradigm scoring: Custom SGD Factorized Feature model + ALS collaborative filtering + cold-start fallbacks. |
| **REQ-REC-02** | ML / Recs | Must-have | Offline evaluation metrics: NDCG@10, Precision@10, Recall@10, MRR, Intra-List Diversity (ILD). |
| **REQ-UI-01** | Frontend | Must-have | Next.js 15 App Router with React Server Components and optimistic UI actions. |
| **REQ-UI-02** | Animation | Must-have | GSAP dual-ring precision cursor with GPU transform tracking and native text caret preservation. |
| **REQ-UI-03** | WebGL | Must-have | ThreeUI WebGL shader background (`FluidField`, `Nebula`, `WarpField`, `EmberStorm`, `LiquidForm`). |
| **REQ-UI-04** | Interaction | Should-have | Radial right-click emoji context menu with 28-particle burst animations and toast feedback. |
| **REQ-ADM-01** | Admin | Must-have | Admin portal with system metrics, review moderation, and `/api/v1/admin/retrain-ml` endpoint. |
| **REQ-PERF-01**| Performance | Must-have | In-memory bounded TTL cache (`MAX_CACHE_ENTRIES = 1000`) with automatic expiration pruning. |

---

*Last updated: November 2026*

