"""
Script to fetch real, high-resolution posters and backdrops from TMDB
for all movies in CineSphere database and update PostgreSQL and seed files.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.parse
import concurrent.futures
import psycopg2

TMDB_API_KEY = "4e44d9029b1270a757cddc766a1bcb63"
DB_HOST = "localhost"
DB_PORT = 5432
DB_USER = "postgres"
DB_PASS = "root"
DB_NAME = "movie_rec_db"


def check_cdn_image(path: str, size: str = "w500") -> bool:
    if not path:
        return False
    if path.startswith("http"):
        url = path
    else:
        url = f"https://image.tmdb.org/t/p/{size}{path}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            return resp.status == 200
    except Exception:
        return False


def fetch_tmdb_data(tmdb_id: int, title: str):
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}?api_key={TMDB_API_KEY}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                poster = data.get("poster_path")
                backdrop = data.get("backdrop_path")
                return {
                    "tmdb_id": tmdb_id,
                    "title": title,
                    "poster_path": poster,
                    "backdrop_path": backdrop,
                    "success": True,
                }
    except Exception as e:
        pass

    # If direct movie/{id} failed, try search/movie
    search_url = f"https://api.themoviedb.org/3/search/movie?api_key={TMDB_API_KEY}&query={urllib.parse.quote(title)}"
    try:
        req = urllib.request.Request(search_url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                results = data.get("results", [])
                if results:
                    first = results[0]
                    return {
                        "tmdb_id": tmdb_id,
                        "title": title,
                        "poster_path": first.get("poster_path"),
                        "backdrop_path": first.get("backdrop_path"),
                        "success": True,
                    }
    except Exception as e:
        pass

    return {
        "tmdb_id": tmdb_id,
        "title": title,
        "poster_path": None,
        "backdrop_path": None,
        "success": False,
    }


def main():
    print("=" * 60)
    print("CineSphere: Real Movie Poster & Backdrop Sync")
    print("=" * 60)

    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        dbname=DB_NAME
    )
    cur = conn.cursor()
    cur.execute("SELECT id, tmdb_id, title, poster_path, backdrop_path FROM movies ORDER BY title ASC;")
    movies = cur.fetchall()
    print(f"Loaded {len(movies)} movies from database.")

    print(f"Fetching real artwork from TMDB API for {len(movies)} movies...")
    start_time = time.time()
    results = {}

    with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
        futures = {
            executor.submit(fetch_tmdb_data, m[1], m[2]): m for m in movies
        }
        for future in concurrent.futures.as_completed(futures):
            res = future.result()
            results[res["tmdb_id"]] = res

    elapsed = time.time() - start_time
    print(f"Fetched TMDB artwork in {elapsed:.2f}s.")

    # Apply updates to database
    updated_count = 0
    posters_ok = 0
    backdrops_ok = 0

    for m in movies:
        movie_uuid = m[0]
        tmdb_id = m[1]
        title = m[2]
        old_poster = m[3]
        old_backdrop = m[4]

        artwork = results.get(tmdb_id)
        if artwork and artwork["success"]:
            new_poster = artwork["poster_path"] or old_poster
            new_backdrop = artwork["backdrop_path"] or old_backdrop

            # If artwork was found, update database
            if new_poster != old_poster or new_backdrop != old_backdrop:
                cur.execute(
                    "UPDATE movies SET poster_path = %s, backdrop_path = %s WHERE id = %s;",
                    (new_poster, new_backdrop, movie_uuid)
                )
                updated_count += 1

            if new_poster:
                posters_ok += 1
            if new_backdrop:
                backdrops_ok += 1

    conn.commit()
    conn.close()

    print(f"Database update complete: {updated_count} movies updated.")
    print(f"Total with valid poster: {posters_ok}/{len(movies)}")
    print(f"Total with valid backdrop: {backdrops_ok}/{len(movies)}")
    print("=" * 60)


if __name__ == "__main__":
    main()

