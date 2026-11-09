/**
 * Consolidated artwork and fallback gradient utilities for movie cards and recommendations.
 */

export function getGenreGradient(primaryGenre?: string): string {
  switch (primaryGenre) {
    case "Science Fiction":
    case "Fantasy":
      return "from-indigo-600/30 via-purple-900/20 to-slate-950";
    case "Action":
    case "Adventure":
      return "from-amber-600/30 via-orange-950/20 to-slate-950";
    case "Horror":
    case "Thriller":
      return "from-rose-600/30 via-red-950/20 to-slate-950";
    case "Animation":
    case "Comedy":
      return "from-purple-600/30 via-pink-950/20 to-slate-950";
    case "Crime":
    case "Drama":
    default:
      return "from-blue-600/30 via-indigo-950/20 to-slate-950";
  }
}

export function getPosterUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `https://image.tmdb.org/t/p/w500${path}`;
}

