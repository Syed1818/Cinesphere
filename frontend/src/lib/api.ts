import {
  User,
  Genre,
  MovieSummary,
  MovieDetail,
  PaginatedMovies,
  Rating,
  Watchlist,
  RecommendationItem,
  RecommendationFeed,
  AdminStats,
  AdminUserItem,
  AdminMovieItem,
  AdminReviewItem,
} from "./types";

function getBaseUrl(): string {
  // In the browser, use the same-origin relative path /api/v1 so Next.js rewrites transparently proxy to FastAPI
  // This completely eliminates CORS preflight blocks and Windows IPv4/IPv6 localhost binding collisions
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";
}

class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const primaryBase = getBaseUrl();
  const primaryUrl = `${primaryBase}${endpoint}`;

  // Candidate URLs in priority order for resilience:
  // 1. Same-origin Next.js proxy (/api/v1/...) in browser
  // 2. Direct localhost:8000
  // 3. Direct 127.0.0.1:8000
  const candidateUrls: string[] = [primaryUrl];
  if (primaryUrl.startsWith("/api/v1")) {
    candidateUrls.push(`http://localhost:8000${primaryUrl}`);
    candidateUrls.push(`http://127.0.0.1:8000${primaryUrl}`);
  } else if (primaryUrl.includes("localhost:8000")) {
    candidateUrls.push(primaryUrl.replace("localhost:8000", "127.0.0.1:8000"));
  } else if (primaryUrl.includes("127.0.0.1:8000")) {
    candidateUrls.push(primaryUrl.replace("127.0.0.1:8000", "localhost:8000"));
  }

  let res: Response | null = null;
  let lastNetError: any = null;

  for (const url of candidateUrls) {
    try {
      res = await fetch(url, {
        ...options,
        headers,
      });
      break; // Successfully got an HTTP response (whether 2xx or 4xx/5xx)
    } catch (err: any) {
      lastNetError = err;
    }
  }

  if (!res) {
    throw new ApiError(
      "Unable to connect to CineSphere API server. Please ensure the backend is running at http://localhost:8000.",
      503,
      lastNetError
    );
  }

  if (res.status === 204) {
    return {} as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    let errorMessage = data.detail || data.message;
    if (data.details) {
      if (Array.isArray(data.details)) {
        errorMessage = data.details.map((d: any) => (typeof d === "string" ? d : d.msg || JSON.stringify(d))).join("; ");
      } else if (typeof data.details === "string") {
        errorMessage = data.details;
      }
    }
    if (!errorMessage) {
      errorMessage = `Request failed with status ${res.status}`;
    }
    throw new ApiError(errorMessage, res.status, data);
  }

  return data as T;
}

export const api = {
  // --------------------------------------------------------------------------
  // AUTH
  // --------------------------------------------------------------------------
  async register(payload: { email: string; password: string; username: string; display_name: string; preferred_genres?: number[] }) {
    return request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async login(payload: { email: string; password: string }) {
    return request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getMe(): Promise<User> {
    return request<User>("/auth/me");
  },

  async updateProfile(payload: { display_name?: string; bio?: string; preferred_genres?: number[] }): Promise<User> {
    return request<User>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // --------------------------------------------------------------------------
  // MOVIES & CATALOG
  // --------------------------------------------------------------------------
  async getMovies(params: { page?: number; limit?: number; genre?: number; search?: string; sort?: string } = {}): Promise<PaginatedMovies> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page.toString());
    if (params.limit) query.set("limit", params.limit.toString());
    if (params.genre) query.set("genre", params.genre.toString());
    if (params.search) query.set("search", params.search);
    if (params.sort) query.set("sort", params.sort);

    return request<PaginatedMovies>(`/movies?${query.toString()}`);
  },

  async getMovieById(id: string): Promise<MovieDetail> {
    return request<MovieDetail>(`/movies/${id}`);
  },

  async getTrending(limit: number = 20): Promise<MovieSummary[]> {
    return request<MovieSummary[]>(`/movies/trending?limit=${limit}`);
  },

  async getGenres(): Promise<Genre[]> {
    return request<Genre[]>("/movies/genres");
  },

  // --------------------------------------------------------------------------
  // RATINGS
  // --------------------------------------------------------------------------
  async rateMovie(payload: { movie_id: string; rating_value: number; review_title?: string; review_body?: string; is_spoiler?: boolean }): Promise<Rating> {
    return request<Rating>("/ratings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteRating(movieId: string): Promise<void> {
    return request<void>(`/ratings/${movieId}`, {
      method: "DELETE",
    });
  },

  async getMyRatings(page: number = 1, limit: number = 20): Promise<{ items: Rating[]; total: number; page: number; limit: number }> {
    return request<{ items: Rating[]; total: number; page: number; limit: number }>(`/ratings/me?page=${page}&limit=${limit}`);
  },

  async getMovieReviews(movieId: string, page: number = 1, limit: number = 10): Promise<{ items: Rating[]; total: number }> {
    return request<{ items: Rating[]; total: number }>(`/ratings/movie/${movieId}?page=${page}&limit=${limit}`);
  },

  // --------------------------------------------------------------------------
  // WATCHLISTS
  // --------------------------------------------------------------------------
  async getWatchlists(): Promise<Watchlist[]> {
    return request<Watchlist[]>("/watchlists");
  },

  async createWatchlist(payload: { name: string; description?: string; is_private?: boolean }): Promise<Watchlist> {
    return request<Watchlist>("/watchlists", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async addToWatchlist(movieId: string, priority: number = 0): Promise<void> {
    return request<void>("/watchlists/items", {
      method: "POST",
      body: JSON.stringify({ movie_id: movieId, priority }),
    });
  },

  async removeFromWatchlist(movieId: string): Promise<void> {
    return request<void>(`/watchlists/items/${movieId}`, {
      method: "DELETE",
    });
  },

  // --------------------------------------------------------------------------
  // RECOMMENDATIONS
  // --------------------------------------------------------------------------
  async getRecommendationFeed(limit: number = 24): Promise<RecommendationFeed> {
    return request<RecommendationFeed>(`/recommendations/feed?limit=${limit}`);
  },

  async getSimilarMovies(movieId: string, limit: number = 12): Promise<RecommendationItem[]> {
    return request<RecommendationItem[]>(`/recommendations/similar/${movieId}?limit=${limit}`);
  },

  async getUserRecommendations(userId: string, limit: number = 24): Promise<RecommendationFeed> {
    return request<RecommendationFeed>(`/recommendations/${userId}?limit=${limit}`);
  },

  // --------------------------------------------------------------------------
  // ADMIN
  // --------------------------------------------------------------------------
  async adminLogin(payload: { email: string; password: string }) {
    return request<{ access_token: string; token_type: string; user: any }>("/admin/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getAdminStats(): Promise<AdminStats> {
    return request<AdminStats>("/admin/stats");
  },

  async getAdminUsers(page: number = 1, limit: number = 20, search?: string): Promise<{ items: AdminUserItem[]; total: number; page: number; limit: number }> {
    const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) query.set("search", search);
    return request<{ items: AdminUserItem[]; total: number; page: number; limit: number }>(`/admin/users?${query.toString()}`);
  },

  async updateAdminUserRole(userId: string, role: string): Promise<any> {
    return request<any>(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    });
  },

  async getAdminMovies(page: number = 1, limit: number = 20, search?: string): Promise<{ items: AdminMovieItem[]; total: number; page: number; limit: number }> {
    const query = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (search) query.set("search", search);
    return request<{ items: AdminMovieItem[]; total: number; page: number; limit: number }>(`/admin/movies?${query.toString()}`);
  },

  async createAdminMovie(payload: {
    title: string;
    overview: string;
    release_date?: string;
    runtime_minutes?: number;
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    genre_ids?: number[];
  }): Promise<any> {
    return request<any>("/admin/movies", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteAdminMovie(movieId: string): Promise<void> {
    return request<void>(`/admin/movies/${movieId}`, {
      method: "DELETE",
    });
  },

  async getAdminReviews(page: number = 1, limit: number = 20): Promise<{ items: AdminReviewItem[]; total: number; page: number; limit: number }> {
    return request<{ items: AdminReviewItem[]; total: number; page: number; limit: number }>(`/admin/reviews?page=${page}&limit=${limit}`);
  },

  async deleteAdminReview(reviewId: string): Promise<void> {
    return request<void>(`/admin/reviews/${reviewId}`, {
      method: "DELETE",
    });
  },

  async retrainMLModel(): Promise<{ status: string; message: string; indexed_movies_count: number }> {
    return request<{ status: string; message: string; indexed_movies_count: number }>("/admin/retrain-ml", {
      method: "POST",
    });
  },
};

