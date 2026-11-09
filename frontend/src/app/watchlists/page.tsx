"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Watchlist } from "@/lib/types";
import { MovieCard } from "@/components/MovieCard";
import { GsapStagger } from "@/components/GsapStagger";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Bookmark, Plus, Trash2, Film, X, Sparkles } from "lucide-react";

export default function WatchlistsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [newWatchlistName, setNewWatchlistName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadWatchlists = async () => {
    setIsLoading(true);
    try {
      const data = await api.getWatchlists();
      setWatchlists(data);
      if (data.length > 0 && !activeWatchlistId) {
        setActiveWatchlistId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load watchlists", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadWatchlists();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;

    try {
      const created = await api.createWatchlist({ name: newWatchlistName.trim() });
      setWatchlists([...watchlists, created]);
      setActiveWatchlistId(created.id);
      setNewWatchlistName("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create watchlist", err);
    }
  };

  const handleRemoveItem = async (movieId: string) => {
    try {
      await api.removeFromWatchlist(movieId);
      loadWatchlists();
    } catch (err) {
      console.error("Failed to remove item", err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in to manage your watchlists"
        description="Save movies you want to see later, organize custom lists, and sync across all your devices."
        actionText="Sign In"
        actionHref="/login"
        icon={Bookmark}
      />
    );
  }

  const activeWatchlist =
    watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center space-x-2.5 mb-1.5">
            <div className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Bookmark className="w-4 h-4 fill-amber-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white font-display tracking-tight">Your Watchlists</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Curate and organize personal cinema collections and queued titles
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="h-11 px-5 rounded-full three-liquid-metal-btn text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Watchlist</span>
        </button>
      </div>

      {/* Watchlist Tabs */}
      {watchlists.length > 0 && (
        <div className="flex items-center space-x-2.5 overflow-x-auto pb-2 scrollbar-none">
          {watchlists.map((wl) => {
            const isActive = activeWatchlist?.id === wl.id;
            return (
              <button
                key={wl.id}
                onClick={() => setActiveWatchlistId(wl.id)}
                className={`h-10 px-4 rounded-full text-xs font-semibold whitespace-nowrap flex items-center space-x-2 transition-all active:scale-95 ${
                  isActive
                    ? "glass-pill-active shadow-md"
                    : "glass-pill text-slate-400 hover:text-white"
                }`}
              >
                <span>{wl.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black/40 text-slate-300 border border-white/10 tabular-numbers">
                  {wl.items_count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Watchlist Items */}
      {isLoading ? (
        <LoadingSkeleton count={5} />
      ) : activeWatchlist && activeWatchlist.items.length > 0 ? (
        <GsapStagger className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
          {activeWatchlist.items.map((item) => {
            if (!item.movie) return null;
            return (
              <div key={item.id} className="relative group">
                <MovieCard movie={item.movie} />
                <button
                  onClick={() => handleRemoveItem(item.movie_id)}
                  title="Remove from watchlist"
                  className="absolute bottom-2.5 right-2.5 z-20 p-2.5 rounded-full glass-pill bg-black/80 hover:bg-rose-600/80 hover:border-rose-500 text-slate-300 hover:text-white transition-all duration-200 shadow-xl hover:scale-110 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </GsapStagger>
      ) : (
        <EmptyState
          title="Watchlist is currently empty"
          description="Bookmark your favorite films from the catalog to build your queued collection."
          actionText="Explore Movie Catalog"
          actionHref="/movies"
          icon={Film}
        />
      )}

      {/* Create Watchlist Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative glass-card border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl overflow-hidden">
            {/* Ambient specular highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-2">
              <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">New Watchlist</h3>
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Create a curated shelf (e.g. &ldquo;Sci-Fi Marathon&rdquo;, &ldquo;Weekend Classics&rdquo;).
            </p>

            <form onSubmit={handleCreateWatchlist} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Watchlist Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="e.g. Mind-Bending Sci-Fi"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="glass-input w-full px-3.5 py-2.5 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs shadow-lg active:scale-95 transition-all"
                >
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
