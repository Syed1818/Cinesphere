import pytest
import httpx
from httpx import ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_live_auth_and_movie_catalog():
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Health check
        res = await ac.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["service"] == "Movie Recommendation Platform"

        # 2. Login with seeded demo user
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "demo@movierec.com",
            "password": "password123"
        })
        assert login_res.status_code == 200
        auth_data = login_res.json()
        token = auth_data["access_token"]
        assert token
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Get current user profile
        me_res = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["email"] == "demo@movierec.com"
        user_id = me_data["id"]

        # 4. Fetch movies list
        movies_res = await ac.get("/api/v1/movies?page=1&page_size=10")
        assert movies_res.status_code == 200
        movies_data = movies_res.json()
        assert len(movies_data["items"]) > 0
        first_movie = movies_data["items"][0]
        movie_id = first_movie["id"]

        # 5. Get movie details by ID
        detail_res = await ac.get(f"/api/v1/movies/{movie_id}")
        assert detail_res.status_code == 200
        assert detail_res.json()["title"] == first_movie["title"]

        # 6. Submit a rating
        rate_res = await ac.post("/api/v1/ratings", headers=headers, json={
            "movie_id": movie_id,
            "rating_value": 9,
            "review_title": "Masterpiece",
            "review_body": "Incredible visuals and sound design."
        })
        assert rate_res.status_code in [200, 201]

        # 7. Get user's ratings
        my_ratings = await ac.get("/api/v1/ratings/me", headers=headers)
        assert my_ratings.status_code == 200
        assert len(my_ratings.json()["items"]) > 0

        # 8. Get personalized recommendations
        recs_res = await ac.get(f"/api/v1/recommendations/{user_id}", headers=headers)
        assert recs_res.status_code == 200
        recs_data = recs_res.json()
        assert "items" in recs_data
        assert len(recs_data["items"]) > 0
        assert "CUSTOM_ML" in recs_data["algorithm"]

        # 9. Get user watchlist
        wl_res = await ac.get("/api/v1/watchlists", headers=headers)
        assert wl_res.status_code == 200
