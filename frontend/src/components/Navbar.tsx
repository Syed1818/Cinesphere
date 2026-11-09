"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Film,
  Search,
  Sparkles,
  Bookmark,
  Compass,
  LogOut,
  Menu,
  X,
  Clapperboard,
  ShieldCheck,
  User as UserIcon,
  Flame,
} from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shortcutKey, setShortcutKey] = useState("⌘K");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Apple Design Craft: Detect OS for shortcut indicator (⌘K vs Ctrl K)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);
      setShortcutKey(isMac ? "⌘K" : "Ctrl K");

      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          searchInputRef.current?.focus();
        } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
          searchInputRef.current?.blur();
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/movies?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setMobileMenuOpen(false);
      searchInputRef.current?.blur();
    }
  };

  const navLinks = [
    { href: "/movies", label: "Catalog", icon: Clapperboard },
    { href: "/recommendations", label: "For You", icon: Sparkles, highlight: true },
    { href: "/watchlists", label: "Watchlists", icon: Bookmark },
  ];

  return (
    <nav className="sticky top-0 z-50 three-dock transition-all border-b border-white/10">
      {/* ThreeUI Specular Top Highlight Line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/70 via-purple-500/50 to-transparent z-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo / Brand with ThreeUI 3D Sheen */}
          <Link href="/" className="flex items-center space-x-3 group shrink-0 select-none">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 group-hover:shadow-indigo-500/40 transition-all duration-300 border border-white/20 overflow-hidden">
              <Film className="w-5 h-5 text-white transition-transform duration-300 group-hover:rotate-6 relative z-10" />
              {/* Shimmer sweep */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-xl tracking-tight text-white flex items-center">
                Cine<span className="text-slate-100 font-extrabold">Sphere</span>
              </span>
              <span className="text-[10px] font-eyebrow text-indigo-400 font-semibold -mt-1 hidden sm:flex items-center space-x-1">
                <Sparkles className="w-2.5 h-2.5 inline mr-0.5 text-indigo-400" />
                <span>ThreeUI 3D ML</span>
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar with Ergonomic Shortcut & Contrast */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-400 transition-colors pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search catalog, directors, actors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-16 bg-slate-900/85 border border-white/15 focus:border-indigo-400 focus:bg-slate-900 rounded-full text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 shadow-inner transition-all"
              />
              <div
                onClick={() => searchInputRef.current?.focus()}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-300 bg-white/10 border border-white/10 select-none cursor-pointer hover:bg-white/15 transition-colors"
                title={`Press ${shortcutKey} to search`}
              >
                {shortcutKey}
              </div>
            </div>
          </form>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-2 text-sm font-medium">
            {navLinks.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "glass-pill-active shadow-lg shadow-indigo-500/25"
                      : item.highlight
                      ? "text-indigo-300 hover:text-white glass-pill hover:border-indigo-500/40 bg-indigo-950/20"
                      : "text-slate-200 hover:text-white glass-pill hover:bg-white/10"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.highlight && !isActive ? "text-indigo-400" : ""}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-md shadow-indigo-400" />
                  )}
                </Link>
              );
            })}

            {user ? (
              <div className="flex items-center space-x-2.5 pl-3 ml-2 border-l border-white/10">
                {user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 shadow-md shadow-rose-500/20 transition-all hover:scale-105"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                    <span>Admin</span>
                  </Link>
                )}

                <Link
                  href="/profile"
                  className={`flex items-center space-x-2 glass-pill px-3 py-1 rounded-full hover:border-white/30 transition-all ${
                    pathname === "/profile" ? "glass-pill-active" : ""
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                    {user.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-slate-200 text-xs font-semibold max-w-[100px] truncate hidden lg:inline-block">
                    {user.display_name}
                  </span>
                </Link>

                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 pl-3 ml-2 border-l border-white/10">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="three-liquid-metal-btn px-4 py-1.5 rounded-full text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button with 44px tap target */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="w-10 h-10 rounded-xl glass-pill flex items-center justify-center text-slate-300 hover:text-white active:scale-95"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu with Impeccable Craft */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 space-y-3 bg-[#070a12]/95 backdrop-blur-3xl rounded-2xl my-2 p-4 shadow-2xl border border-white/15 animate-in fade-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-slate-900/90 border border-white/15 focus:border-indigo-400 rounded-full text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
              />
            </form>

            <div className="flex flex-col space-y-1.5 pt-2">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive ? "glass-pill-active" : "glass-pill text-slate-300 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {user ? (
                <>
                  {user.role === "ADMIN" && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    >
                      <ShieldCheck className="w-4 h-4 text-rose-400" />
                      <span>Admin Console</span>
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm font-semibold glass-pill text-slate-300"
                  >
                    <UserIcon className="w-4 h-4 text-indigo-400" />
                    <span>Profile: {user.display_name}</span>
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 text-left w-full active:scale-95"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="flex gap-2.5 pt-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-3 rounded-xl glass-pill text-xs font-bold text-slate-300 hover:text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 text-center py-3 rounded-xl three-liquid-metal-btn text-xs font-bold text-white shadow-lg shadow-indigo-600/30"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
