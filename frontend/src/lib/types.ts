export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  role: "USER" | "CRITIC" | "MODERATOR" | "ADMIN";
  bio?: string | null;
  preferred_genres?: number[];
  created_at: string;
}

export interface Genre {
  id: number;
  tmdb_id: number;
  name: string;
  slug: string;
}

export interface CastMember {
  id: string;
  name: string;
  character_name?: string | null;
  profile_path?: string | null;
  order_index: number;
}

export interface MovieSummary {
  id: string;
  tmdb_id: number;
  imdb_id?: string | null;
  title: string;
  original_title: string;
  release_date: string;
  runtime_minutes: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  vote_count: number;
  popularity_score: number;
  genres: Genre[];
}

export interface MovieDetail extends MovieSummary {
  tagline?: string | null;
  overview: string;
  status: string;
  original_language: string;
  director?: string | null;
  top_cast: CastMember[];
  user_rating?: number | null;
  is_in_watchlist: boolean;
}

export interface PaginatedMovies {
  items: MovieSummary[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface Rating {
  id: string;
  movie_id: string;
  user_id: string;
  rating_value: number;
  review_title?: string | null;
  review_body?: string | null;
  is_spoiler: boolean;
  helpful_votes: number;
  created_at: string;
  user_display_name?: string | null;
  user_avatar_url?: string | null;
}

export interface WatchlistItem {
  id: string;
  movie_id: string;
  priority: number;
  added_at: string;
  movie?: MovieSummary | null;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  is_private: boolean;
  is_default: boolean;
  created_at: string;
  items_count: number;
  items: WatchlistItem[];
}

export interface RecommendationItem extends MovieSummary {
  similarity_score: number;
  algorithm:
    | "CONTENT_BASED"
    | "COLLABORATIVE"
    | "HYBRID"
    | "TRENDING"
    | "CUSTOM_ML"
    | "ML_CONTENT"
    | "ML_COLLABORATIVE"
    | "ML_CRITIC_CHOICE"
    | (string & {});
  explanation: string;
}

export interface RecommendationFeed {
  user_id?: string;
  feed_title: string;
  algorithm: string;
  items: RecommendationItem[];
}

export interface AdminStats {
  total_movies: number;
  total_users: number;
  total_ratings: number;
  total_watchlists: number;
  total_genres: number;
  average_community_rating: number;
  cache_entries_count: number;
  ml_model_status: string;
}

export interface AdminUserItem {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: "USER" | "CRITIC" | "MODERATOR" | "ADMIN";
  is_active: boolean;
  created_at: string;
  ratings_count: number;
}

export interface AdminMovieItem {
  id: string;
  tmdb_id: number;
  title: string;
  release_date: string | null;
  runtime_minutes: number;
  vote_average: number;
  vote_count: number;
  popularity_score: number;
  poster_path: string | null;
  genres: string[];
}

export interface AdminReviewItem {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  movie_id: string;
  movie_title: string;
  rating_value: number;
  review_title?: string | null;
  review_body?: string | null;
  is_spoiler: boolean;
  created_at: string;
}
