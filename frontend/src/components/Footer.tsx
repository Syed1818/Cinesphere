"use client";

import React from "react";
import Link from "next/link";
import { Film, Sparkles, Database, Cpu, Activity } from "lucide-react";

export function Footer() {
  const apiDocsUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/docs`;

  return (
    <footer className="relative mt-20 border-t border-white/10 bg-[#060810]/90 backdrop-blur-2xl">
      {/* Top subtle highlight line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Link href="/" className="flex items-center space-x-2.5 group select-none">
              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/20 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform duration-200">
                <Film className="w-4 h-4" />
              </div>
              <span className="font-display font-black text-lg text-white tracking-tight">
                Cine<span className="text-gradient-cinema">Sphere</span>
              </span>
            </Link>
            <span className="hidden sm:inline-block text-xs text-slate-500 pl-4 border-l border-white/10 font-normal">
              Next-Gen AI Movie Recommendation Platform
            </span>
          </div>

          <div className="flex items-center space-x-6 text-xs font-semibold text-slate-400">
            <Link href="/movies" className="hover:text-white transition-colors duration-150">
              Catalog
            </Link>
            <Link href="/recommendations" className="hover:text-white transition-colors duration-150">
              Recommendations
            </Link>
            <Link href="/watchlists" className="hover:text-white transition-colors duration-150">
              Watchlists
            </Link>
            <a
              href={apiDocsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors duration-150 flex items-center space-x-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>FastAPI Docs</span>
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-500 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-indigo-400/80" />
            <span>Native PostgreSQL 18 &bull; Custom Factorized Feature ML Model</span>
          </div>
          <p className="tabular-numbers">&copy; {new Date().getFullYear()} CineSphere. High-Performance Cinematic Intelligence.</p>
        </div>
      </div>
    </footer>
  );
}
