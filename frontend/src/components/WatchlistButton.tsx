"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Bookmark } from "lucide-react";

interface WatchlistButtonProps {
  movieId: string;
  initialState?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function WatchlistButton({
  movieId,
  initialState = false,
  className = "",
  size = "md",
}: WatchlistButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [inWatchlist, setInWatchlist] = useState<boolean>(initialState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push("/login?redirect=back");
      return;
    }

    if (isSubmitting) return;

    const previousState = inWatchlist;
    setInWatchlist(!previousState);
    setIsSubmitting(true);

    try {
      if (!previousState) {
        await api.addToWatchlist(movieId);
      } else {
        await api.removeFromWatchlist(movieId);
      }
    } catch (error) {
      // Revert optimistic update on failure
      setInWatchlist(previousState);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sizeClasses = {
    sm: "w-8 h-8 p-1.5 text-xs",
    md: "w-10 h-10 p-2 text-sm",
    lg: "h-11 sm:h-12 px-5 py-2.5 text-sm font-semibold",
  };

  return (
    <button
      onClick={toggleWatchlist}
      disabled={isSubmitting}
      title={inWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}
      className={`rounded-full flex items-center justify-center transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.96] hover:scale-105 ${
        inWatchlist
          ? "bg-amber-500/25 text-amber-300 border border-amber-400/50 shadow-lg shadow-amber-500/20 hover:bg-amber-500/35"
          : "glass-pill text-gray-300 hover:text-white hover:border-white/30 hover:bg-white/10"
      } ${sizeClasses[size]} ${className}`}
    >
      <Bookmark
        className={`w-4 h-4 transition-transform duration-200 ease-out ${
          inWatchlist ? "fill-amber-400 text-amber-400 scale-110" : ""
        }`}
      />
      {size === "lg" && (
        <span className="ml-2 font-medium tracking-wide">
          {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
        </span>
      )}
    </button>
  );
}
