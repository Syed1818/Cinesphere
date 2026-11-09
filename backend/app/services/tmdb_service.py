from typing import Any, Dict, List, Optional
import httpx
from loguru import logger
from app.core.config import settings
from app.core.cache import cache_get, cache_set


class TMDBService:
    def __init__(self):
        self.api_key = settings.TMDB_API_KEY
        self.base_url = settings.TMDB_BASE_URL
        self.headers = {"accept": "application/json"}

    async def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        if not self.api_key:
            return None

        p = params or {}
        p["api_key"] = self.api_key

        cache_key = f"tmdb:{endpoint}:{sorted(p.items())}"
        cached = await cache_get(cache_key)
        if cached:
            return cached

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}{endpoint}", params=p, headers=self.headers)
                if response.status_code == 200:
                    data = response.json()
                    # Cache response in in-memory cache for 12 hours
                    await cache_set(cache_key, data, ttl_seconds=43200)
                    return data
                elif response.status_code == 429:
                    logger.warning("TMDB rate limit hit. Falling back to cached catalog.")
                    return None
                else:
                    logger.error(f"TMDB API error {response.status_code}: {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Exception connecting to TMDB: {e}")
            return None

    async def get_movie_details(self, tmdb_id: int) -> Optional[Dict[str, Any]]:
        return await self._get(f"/movie/{tmdb_id}", {"append_to_response": "credits,keywords,videos"})

    async def get_popular_movies(self, page: int = 1) -> Optional[List[Dict[str, Any]]]:
        res = await self._get("/movie/popular", {"page": page})
        return res.get("results") if res else None

    async def get_trending_movies(self, time_window: str = "day") -> Optional[List[Dict[str, Any]]]:
        res = await self._get(f"/trending/movie/{time_window}")
        return res.get("results") if res else None

    async def get_genres(self) -> Optional[List[Dict[str, Any]]]:
        res = await self._get("/genre/movie/list")
        return res.get("genres") if res else None

    async def search_movies(self, query: str, page: int = 1) -> Optional[List[Dict[str, Any]]]:
        res = await self._get("/search/movie", {"query": query, "page": page})
        return res.get("results") if res else None


tmdb_client = TMDBService()

