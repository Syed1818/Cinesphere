# Specification: TMDB & OMDB Data Ingestion Pipeline & ETL Architecture

**Document Version:** 1.0.0  
**Architect:** Senior Solutions Architect  
**Classification:** Technical ETL Specification  

---

## 1. Overview & Ingestion Objectives

The platform requires a continuous, fault-tolerant ingestion pipeline that transforms raw movie metadata from **The Movie Database (TMDB)** and **Open Movie Database (OMDB)** into normalized PostgreSQL records and vector embeddings.

### Core Targets

* **Initial Bootstrap:** Sync the top 20,000 global movies (by popularity and vote count) with complete credits, genres, and high-resolution posters.
* **Daily Delta Sync:** Automated cron worker fetching updated movies from `/movie/changes` over the previous 24 hours.
* **Rate Limits:** Respect TMDB (40-50 req/sec) and OMDB (100,000 req/day) via token-bucket throttlers.
* **Asset Pipeline:** Download posters and backdrops, optimize (WebP conversion), and mirror to Cloudflare R2 bucket.
* **Feature & Vector Generation:** Construct structured feature matrices (19-dim multi-hot genres, normalized metadata) for the Custom ML Recommender, as well as dense 768-dimensional fallback embeddings.

---

## 2. Source API Endpoint Mapping

```text
+------------------------------------------------------------------------------------------------+
| TMDB / OMDB Source Endpoints                                                                   |
+------------------------------------+-----------------------------+-----------------------------+
| TMDB Endpoint                      | Purpose                     | Destination Tables          |
+------------------------------------+-----------------------------+-----------------------------+
| GET /genre/movie/list              | Sync standard genres        | `genres`                    |
| GET /movie/top_rated               | Bootstrap high-quality base | `movies`, `movie_genres`    |
| GET /movie/popular                 | Bootstrap trending base     | `movies`, `movie_genres`    |
| GET /movie/{id}?append_to_response | Full movie details, credits | `movies`, `people`,         |
|     =credits,keywords,videos       | and keywords in single call | `movie_credits`, `genres`   |
| GET /movie/changes                 | Daily delta updates         | `movies` (updates)          |
| OMDB GET /?i={imdb_id}&apikey=...  | Box office & IMDb ratings   | `movies` (budget, revenue)  |
+------------------------------------+-----------------------------+-----------------------------+
```

---

## 3. Data Transformation & Schema Normalization

### 3.1 Field Mapping Specification

| TMDB JSON Field | Target Table | Target Column | Transformation Rule |
| :--- | :--- | :--- | :--- |
| `id` | `movies` | `tmdb_id` | Direct integer mapping (UNIQUE) |
| `imdb_id` | `movies` | `imdb_id` | String validation (`tt\d{7,8}`) |
| `title` | `movies` | `title` | Trim whitespace, unescape HTML entities |
| `original_title` | `movies` | `original_title` | Preserve original Unicode characters |
| `tagline` | `movies` | `tagline` | NULL if empty string |
| `overview` | `movies` | `overview` | Truncate if > 5000 chars; default to empty |
| `release_date` | `movies` | `release_date` | Parse `YYYY-MM-DD`. If invalid, flag for review |
| `runtime` | `movies` | `runtime_minutes` | Default to 0 if null |
| `poster_path` | `movies` | `poster_path` | Relative path stored; full URL resolved at CDN |
| `backdrop_path` | `movies` | `backdrop_path` | Relative path stored |
| `vote_average` | `movies` | `vote_average` | Round to 2 decimal places (`NUMERIC(3,2)`) |
| `vote_count` | `movies` | `vote_count` | Integer representation |
| `popularity` | `movies` | `popularity_score` | Store as `NUMERIC(10,4)` |
| `credits.cast[0..9]` | `movie_credits` | `character_name`, `order_index` | Extract top 10 cast members |
| `credits.crew` (Director) | `movie_credits` | `role_type = 'DIRECTOR'` | Filter where `job == 'Director'` |

---

## 4. Vector Embedding Text Representation

To maximize semantic retrieval accuracy in `pgvector`, metadata is synthesized into a standardized, dense document prompt:

```text
Title: {title} ({release_year})
Genres: {genre_1}, {genre_2}, {genre_3}
Director: {director_name}
Top Cast: {actor_1}, {actor_2}, {actor_3}, {actor_4}, {actor_5}
Keywords: {keyword_1}, {keyword_2}, {keyword_3}, {keyword_4}
Overview: {overview}
Tagline: {tagline}
```

### Ingestion Example

```text
Title: Inception (2010)
Genres: Action, Science Fiction, Adventure
Director: Christopher Nolan
Top Cast: Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page, Tom Hardy, Ken Watanabe
Keywords: dream, subconscious, heist, mind-bending, architect
Overview: Cobb, a skilled thief who steals corporate secrets through dream-sharing technology, is given the inverse task of planting an idea into the mind of a C.E.O.
Tagline: Your mind is the scene of the crime.
```

The synthesized string is processed by the Custom ML Recommender and text embedding routines, generating normalized representations inserted into PostgreSQL.

---

## 5. Fault Tolerance, Retries & Concurrency Architecture

1. **Async Worker Queue Topology:**
   * `queue:tmdb-movie-fetch`: Concurrency of 10 workers; handles detail requests.
   * `queue:image-mirror`: Concurrency of 5 workers; streams image buffers to Cloudflare R2.
   * `queue:vector-embed`: Concurrency of 4 workers; batches 32 documents per API embedding call.
2. **Exponential Backoff with Full Jitter:**
   * Retry schedule: 3 attempts with intervals calculated as $t_{\text{wait}} = \min(60, \; 2^{\text{attempt}} + \text{random}(0, 2))$.
   * On HTTP 429 (Rate Limit Exceeded), inspect `Retry-After` header and pause queue processing globally.
3. **Idempotency Strategy:**
   * All database writes use `ON CONFLICT (tmdb_id) DO UPDATE SET ...` to guarantee that rerunning jobs never causes primary key collisions or duplicate entity rows.
