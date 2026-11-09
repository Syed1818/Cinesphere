from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["docs"] == "/docs"
    assert data["health"] == "/health"


def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "service" in data


def test_openapi_schema_generation():
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert "paths" in schema
    assert "/api/v1/movies" in schema["paths"]
    assert "/api/v1/auth/login" in schema["paths"]
    assert "/api/v1/ratings" in schema["paths"]
    assert "/api/v1/recommendations/feed" in schema["paths"]
    assert "/api/v1/watchlists" in schema["paths"]


def test_unauthorized_access_to_protected_routes():
    # Attempting to access protected routes without a token should return 401
    res_me = client.get("/api/v1/auth/me")
    assert res_me.status_code == 401

    res_feed = client.get("/api/v1/recommendations/feed")
    assert res_feed.status_code == 401

    res_watchlists = client.get("/api/v1/watchlists")
    assert res_watchlists.status_code == 401


def test_validation_error_handler():
    # Sending invalid payload to register endpoint should trigger our centralized 422 handler
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "invalid-email", "password": "123"},  # too short & bad email
    )
    assert response.status_code == 422
    data = response.json()
    assert data["statusCode"] == 422
    assert data["error"] == "Validation Error"
    assert len(data["details"]) > 0
