import psycopg2
import re

def update_seed_file():
    conn = psycopg2.connect(
        host="localhost",
        port=5432,
        user="postgres",
        password="root",
        dbname="movie_rec_db"
    )
    cur = conn.cursor()
    cur.execute("SELECT tmdb_id, poster_path, backdrop_path FROM movies;")
    rows = cur.fetchall()
    conn.close()

    tmdb_map = {r[0]: (r[1], r[2]) for r in rows}

    for filepath in ["backend/app/movies_dataset_expanded.py", "backend/app/seed.py"]:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()

        updated_count = 0
        for tmdb_id, (poster, backdrop) in tmdb_map.items():
            if not poster:
                continue

            # Replace poster
            poster_pattern = re.compile(
                r'("tmdb_id":\s*' + str(tmdb_id) + r',[\s\S]*?"poster":\s*")[^"]*(")'
            )
            if poster_pattern.search(content):
                content = poster_pattern.sub(r'\g<1>' + poster + r'\g<2>', content)
                updated_count += 1

            # Replace backdrop if present
            if backdrop:
                backdrop_pattern = re.compile(
                    r'("tmdb_id":\s*' + str(tmdb_id) + r',[\s\S]*?"backdrop":\s*")[^"]*(")'
                )
                if backdrop_pattern.search(content):
                    content = backdrop_pattern.sub(r'\g<1>' + backdrop + r'\g<2>', content)

        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"Updated {updated_count} movies in {filepath}")

if __name__ == "__main__":
    update_seed_file()
