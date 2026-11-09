"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Star, X, Sparkles, MessageSquare, AlertCircle } from "lucide-react";

interface StarRatingProps {
  movieId: string;
  initialRating?: number | null;
  onRatingSubmitted?: (rating: number) => void;
}

export function StarRating({
  movieId,
  initialRating = null,
  onRatingSubmitted,
}: StarRatingProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentRating, setCurrentRating] = useState<number | null>(initialRating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedScore, setSelectedScore] = useState<number>(initialRating || 8);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewBody, setReviewBody] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStarClick = (score: number) => {
    if (!user) {
      router.push("/login");
      return;
    }
    setErrorMessage(null);
    setSelectedScore(score);
    setModalOpen(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.rateMovie({
        movie_id: movieId,
        rating_value: selectedScore,
        review_title: reviewTitle.trim() || undefined,
        review_body: reviewBody.trim() || undefined,
        is_spoiler: isSpoiler,
      });
      setCurrentRating(selectedScore);
      setModalOpen(false);
      if (onRatingSubmitted) onRatingSubmitted(selectedScore);
    } catch (err: any) {
      console.error("Failed to submit rating", err);
      setErrorMessage(err.message || "Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingLabel = (score: number) => {
    if (score >= 9) return "Masterpiece";
    if (score >= 8) return "Great";
    if (score >= 7) return "Good";
    if (score >= 5) return "Average";
    return "Poor";
  };

  return (
    <div className="flex flex-col items-start space-y-2">
      <div className="flex items-center space-x-1.5 flex-wrap">
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
            const active =
              hoverRating !== null
                ? hoverRating >= star
                : currentRating !== null && currentRating >= star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-1 focus:outline-none transition-transform duration-200 hover:scale-125"
                title={`Rate ${star}/10`}
              >
                <Star
                  className={`w-5 h-5 transition-colors duration-200 ${
                    active
                      ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <span className="text-xs font-semibold ml-2">
          {hoverRating !== null ? (
            <span className="text-amber-400 font-bold">
              {hoverRating}/10 &bull; {getRatingLabel(hoverRating)}
            </span>
          ) : currentRating ? (
            <span className="text-indigo-400 font-bold">
              Your Rating: {currentRating}/10
            </span>
          ) : (
            <span className="text-slate-500">Rate 1–10</span>
          )}
        </span>
      </div>

      {/* Review Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity">
          <div className="relative glass-card border border-white/10 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top ambient highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Rate & Review Film</h3>
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Your feedback immediately trains your personalized vector profile in our Custom ML engine.
            </p>

            {errorMessage && (
              <div className="p-3 mb-4 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={submitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Select Score:{" "}
                  <span className="text-amber-400 font-black text-sm">
                    {selectedScore}/10 ({getRatingLabel(selectedScore)})
                  </span>
                </label>
                <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedScore(s)}
                      className={`py-2 text-xs font-black rounded-lg transition-all duration-200 ${
                        selectedScore === s
                          ? "bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30 scale-105"
                          : "glass-pill text-slate-300 hover:text-white hover:border-white/30"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Review Headline <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={150}
                  placeholder="e.g. A visual masterpiece of sci-fi cinema"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="glass-input w-full h-11 px-3.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Your Review <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Share your thoughts about direction, screenplay, cinematography..."
                  value={reviewBody}
                  onChange={(e) => setReviewBody(e.target.value)}
                  className="glass-input w-full p-3.5 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center space-x-2.5 pt-1">
                <input
                  type="checkbox"
                  id="spoiler-check"
                  checked={isSpoiler}
                  onChange={(e) => setIsSpoiler(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                />
                <label htmlFor="spoiler-check" className="text-xs text-slate-400 cursor-pointer select-none">
                  This review contains spoilers
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-10 px-4 rounded-full glass-pill text-xs font-semibold text-slate-300 hover:text-white transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-6 rounded-full three-liquid-metal-btn text-white font-bold text-xs shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  {isSubmitting ? "Submitting..." : "Submit Rating"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
