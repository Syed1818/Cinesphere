from fastapi import APIRouter
from app.api.v1.endpoints import auth, movies, ratings, watchlists, recommendations, admin

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(movies.router)
api_router.include_router(ratings.router)
api_router.include_router(watchlists.router)
api_router.include_router(recommendations.router)
api_router.include_router(admin.router)

