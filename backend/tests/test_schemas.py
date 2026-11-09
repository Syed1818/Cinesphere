import uuid
import pytest
from pydantic import ValidationError
from app.schemas.auth import UserRegister, UserLogin
from app.schemas.rating import RatingCreate


def test_user_register_schema_valid():
    data = UserRegister(
        email="cinephile@example.com",
        password="securePassword123",
        username="cinephile99",
        display_name="Film Enthusiast",
        preferred_genres=[28, 878],
    )
    assert data.email == "cinephile@example.com"
    assert data.preferred_genres == [28, 878]


def test_user_register_schema_invalid_email():
    with pytest.raises(ValidationError):
        UserRegister(
            email="not-an-email",
            password="securePassword123",
            username="cinephile99",
            display_name="Film Enthusiast",
        )


def test_rating_create_schema_valid():
    movie_id = uuid.uuid4()
    rating = RatingCreate(
        movie_id=movie_id,
        rating_value=9,
        review_title="Cinematic Masterpiece",
        review_body="Outstanding cinematography and score.",
        is_spoiler=False,
    )
    assert rating.rating_value == 9
    assert rating.is_spoiler is False


def test_rating_create_schema_out_of_range():
    movie_id = uuid.uuid4()
    # Rating cannot be 11 (max is 10)
    with pytest.raises(ValidationError):
        RatingCreate(
            movie_id=movie_id,
            rating_value=11,
        )

    # Rating cannot be 0 (min is 1)
    with pytest.raises(ValidationError):
        RatingCreate(
            movie_id=movie_id,
            rating_value=0,
        )

