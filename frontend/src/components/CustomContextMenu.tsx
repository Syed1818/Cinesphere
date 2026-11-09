"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import {
  Film,
  Home,
  Bookmark,
  RotateCcw,
  Sparkles,
  X,
  Compass,
} from "lucide-react";

interface EmojiOption {
  emoji: string;
  label: string;
  tagline: string;
  color: string;
  glow: string;
}

const EMOJI_OPTIONS: EmojiOption[] = [
  { emoji: "🍿", label: "Movie Magic", tagline: "Popcorn & Chill", color: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" },
  { emoji: "🔥", label: "Absolute Cinema", tagline: "Certified Masterpiece", color: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" },
  { emoji: "❤️", label: "Loved It", tagline: "Straight to Favorites", color: "#ec4899", glow: "rgba(236, 72, 153, 0.4)" },
  { emoji: "🤯", label: "Mind Blown", tagline: "Incredible Plot Twist", color: "#a855f7", glow: "rgba(168, 85, 247, 0.4)" },
  { emoji: "⭐", label: "10/10 Score", tagline: "Flawless Filmmaking", color: "#eab308", glow: "rgba(234, 179, 8, 0.4)" },
  { emoji: "🚀", label: "Hyped Up", tagline: "Blockbuster Adrenaline", color: "#3b82f6", glow: "rgba(59, 130, 246, 0.4)" },
  { emoji: "😭", label: "Emotional", tagline: "Deep Tearjerker", color: "#06b6d4", glow: "rgba(6, 182, 212, 0.4)" },
  { emoji: "👏", label: "Standing Ovation", tagline: "Bravo to the Cast", color: "#10b981", glow: "rgba(16, 185, 129, 0.4)" },
];

interface ParticleData {
  id: number;
  emoji: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  rotation: number;
  duration: number;
}

export function CustomContextMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [hoveredOption, setHoveredOption] = useState<EmojiOption | null>(null);
  const [reactionToast, setReactionToast] = useState<{ emoji: string; label: string } | null>(null);
  const [particles, setParticles] = useState<ParticleData[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const burstContainerRef = useRef<HTMLDivElement>(null);
  const shockwaveRef = useRef<HTMLDivElement>(null);

  // Close context menu handler (Emil Kowalski: exit gently to scale 0.96 with fast 140ms duration)
  const handleClose = useCallback(() => {
    if (!isOpen) return;
    if (wheelRef.current) {
      gsap.to(wheelRef.current, {
        scale: 0.96,
        opacity: 0,
        duration: 0.14,
        ease: "power2.out",
        onComplete: () => {
          setIsOpen(false);
          setHoveredOption(null);
        },
      });
    } else {
      setIsOpen(false);
      setHoveredOption(null);
    }
  }, [isOpen]);

  // Context Menu event listener on window
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      // Allow native context menu in form inputs/editable fields
      const target = e.target as HTMLElement | null;
      if (target && target.closest("input, textarea, [contenteditable='true']")) {
        return;
      }

      e.preventDefault();

      // Clamp coordinates so the 280px wheel never overflows screen boundaries
      const WHEEL_PADDING = 150;
      const x = Math.min(Math.max(e.clientX, WHEEL_PADDING), window.innerWidth - WHEEL_PADDING);
      const y = Math.min(Math.max(e.clientY, WHEEL_PADDING), window.innerHeight - WHEEL_PADDING);

      setCoords({ x, y });
      setHoveredOption(null);
      setIsOpen(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleClose]);

  // Animate wheel entrance when opened (Emil Kowalski: never scale(0), sub-220ms, punchy ease-out)
  useEffect(() => {
    if (isOpen && wheelRef.current) {
      const wheel = wheelRef.current;
      const items = wheel.querySelectorAll(".emoji-petal");
      const quickBar = wheel.querySelector(".quick-actions-bar");

      gsap.killTweensOf([wheel, items, quickBar]);

      // Pop in the whole container from scale 0.94 (organic shape presence, no popping from absolute zero)
      gsap.fromTo(
        wheel,
        { scale: 0.94, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.22, ease: "back.out(1.2)" }
      );

      // Radial stagger expansion for emoji petals from scale 0.92
      gsap.fromTo(
        items,
        { scale: 0.92, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.20,
          stagger: 0.015,
          ease: "power3.out",
        }
      );

      // Slide down quick actions bar
      if (quickBar) {
        gsap.fromTo(
          quickBar,
          { y: -6, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.18, delay: 0.08, ease: "power3.out" }
        );
      }
    }
  }, [isOpen]);

  // Emoji selection & particle explosion trigger
  const handleSelectEmoji = (option: EmojiOption, e: React.MouseEvent) => {
    e.stopPropagation();

    const originX = coords.x;
    const originY = coords.y;

    // Show reaction celebration toast
    setReactionToast({ emoji: option.emoji, label: option.label });

    // Generate vibrant explosion particles
    const count = 28;
    const newParticles: ParticleData[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const distance = 100 + Math.random() * 220;
      newParticles.push({
        id: Date.now() + i,
        emoji: option.emoji,
        x: originX,
        y: originY,
        targetX: Math.cos(angle) * distance,
        targetY: Math.sin(angle) * distance - (30 + Math.random() * 50), // upward gravity lift
        scale: 0.9 + Math.random() * 1.3,
        rotation: (Math.random() - 0.5) * 540,
        duration: 0.8 + Math.random() * 0.5,
      });
    }

    setParticles(newParticles);

    // Expand shockwave ring
    if (shockwaveRef.current) {
      gsap.killTweensOf(shockwaveRef.current);
      gsap.fromTo(
        shockwaveRef.current,
        {
          left: originX,
          top: originY,
          width: 0,
          height: 0,
          xPercent: -50,
          yPercent: -50,
          opacity: 0.9,
          borderColor: option.color,
        },
        {
          width: 300,
          height: 300,
          opacity: 0,
          duration: 0.55,
          ease: "power2.out",
        }
      );
    }

    // Close the wheel
    handleClose();
  };

  // Run GSAP on spawned explosion particles
  useEffect(() => {
    if (particles.length > 0 && burstContainerRef.current) {
      const elements = burstContainerRef.current.querySelectorAll(".burst-emoji-item");
      gsap.killTweensOf(elements);

      elements.forEach((el, index) => {
        const p = particles[index];
        if (!p) return;

        gsap.fromTo(
          el,
          {
            x: 0,
            y: 0,
            scale: 0.3,
            opacity: 1,
            rotation: 0,
          },
          {
            x: p.targetX,
            y: p.targetY,
            scale: p.scale,
            opacity: 0,
            rotation: p.rotation,
            duration: p.duration,
            ease: "power2.out",
          }
        );
      });

      // Clear particles after animations finish
      const timer = setTimeout(() => {
        setParticles([]);
      }, 1400);

      return () => {
        clearTimeout(timer);
        gsap.killTweensOf(elements);
      };
    }
  }, [particles]);

  // Reaction toast auto-dismiss
  useEffect(() => {
    if (reactionToast && toastRef.current) {
      gsap.fromTo(
        toastRef.current,
        { y: 30, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.3, ease: "back.out(1.8)" }
      );

      const timer = setTimeout(() => {
        if (toastRef.current) {
          gsap.to(toastRef.current, {
            y: 20,
            opacity: 0,
            scale: 0.9,
            duration: 0.25,
            ease: "power2.in",
            onComplete: () => setReactionToast(null),
          });
        } else {
          setReactionToast(null);
        }
      }, 2400);

      return () => clearTimeout(timer);
    }
  }, [reactionToast]);

  const RADIUS = 96; // Wheel radius in pixels

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. EXPANDING SHOCKWAVE RING                                               */}
      {/* ========================================================================= */}
      <div
        ref={shockwaveRef}
        className="fixed pointer-events-none z-[9990] rounded-full border-2 border-indigo-400 opacity-0"
        aria-hidden="true"
      />

      {/* ========================================================================= */}
      {/* 2. EMOJI EXPLOSION BURST PARTICLES                                        */}
      {/* ========================================================================= */}
      {particles.length > 0 && (
        <div
          ref={burstContainerRef}
          className="fixed inset-0 pointer-events-none z-[9995] overflow-hidden"
          aria-hidden="true"
        >
          {particles.map((p) => (
            <div
              key={p.id}
              className="burst-emoji-item absolute select-none text-2xl filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
              style={{
                left: `${p.x}px`,
                top: `${p.y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {p.emoji}
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. REACTION CELEBRATION TOAST PILL                                        */}
      {/* ========================================================================= */}
      {reactionToast && (
        <div
          ref={toastRef}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
        >
          <div className="glass-card flex items-center space-x-3 px-5 py-2.5 rounded-full border border-white/20 shadow-2xl backdrop-blur-2xl bg-slate-950/70">
            <span className="text-2xl select-none inline-block">{reactionToast.emoji}</span>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                CineSphere Reaction
              </span>
              <span className="text-sm font-bold text-white">
                {reactionToast.label}
              </span>
            </div>
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow ml-1" />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. RADIAL EMOJI WHEEL & CONTEXT MENU                                      */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed inset-0 z-[9980] select-none"
          onClick={handleClose}
          onContextMenu={(e) => {
            e.preventDefault();
            handleClose();
          }}
        >
          {/* Subtle Dim Backdrop */}
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200" />

          {/* Central Radial Wheel Container */}
          <div
            ref={wheelRef}
            className="absolute z-10"
            style={{
              left: `${coords.x}px`,
              top: `${coords.y}px`,
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Radial Glow */}
            <div
              className="absolute -inset-24 rounded-full blur-2xl pointer-events-none transition-colors duration-300"
              style={{
                background: hoveredOption
                  ? `radial-gradient(circle, ${hoveredOption.glow} 0%, transparent 70%)`
                  : "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)",
              }}
            />

            {/* Orbit Guide Dotted Ring */}
            <div
              className="absolute rounded-full border border-dashed border-white/15 pointer-events-none animate-spin-slow"
              style={{
                width: `${RADIUS * 2 + 10}px`,
                height: `${RADIUS * 2 + 10}px`,
                left: `${-RADIUS - 5}px`,
                top: `${-RADIUS - 5}px`,
              }}
            />

            {/* Center Dynamic Hub */}
            <div
              className="absolute rounded-full glass-card border border-white/20 shadow-2xl flex flex-col items-center justify-center p-2 text-center transition-all duration-300 backdrop-blur-2xl bg-slate-950/60"
              style={{
                width: "88px",
                height: "88px",
                left: "-44px",
                top: "-44px",
                boxShadow: hoveredOption
                  ? `0 0 25px ${hoveredOption.glow}`
                  : "0 0 20px rgba(99, 102, 241, 0.25)",
              }}
            >
              {hoveredOption ? (
                <div className="flex flex-col items-center animate-in zoom-in-75 duration-150">
                  <span className="text-2xl leading-none mb-1">{hoveredOption.emoji}</span>
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-tight line-clamp-1 leading-tight"
                    style={{ color: hoveredOption.color }}
                  >
                    {hoveredOption.label}
                  </span>
                  <span className="text-[8px] text-slate-400 line-clamp-1 leading-none mt-0.5">
                    {hoveredOption.tagline}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-300">
                  <Film className="w-5 h-5 text-indigo-400 mb-1 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-wider text-white">
                    REACT
                  </span>
                  <span className="text-[8px] text-slate-400">Click Emoji</span>
                </div>
              )}
            </div>

            {/* 8 Outer Emoji Petals in a Circle */}
            {EMOJI_OPTIONS.map((option, idx) => {
              const angleDeg = (idx * 360) / EMOJI_OPTIONS.length - 90; // Start at 12 o'clock (-90 deg)
              const angleRad = (angleDeg * Math.PI) / 180;
              const posX = Math.cos(angleRad) * RADIUS;
              const posY = Math.sin(angleRad) * RADIUS;

              const isHovered = hoveredOption?.emoji === option.emoji;

              return (
                <button
                  key={option.emoji}
                  type="button"
                  data-interactive="true"
                  className={`emoji-petal absolute w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200 border shadow-xl ${
                    isHovered
                      ? "scale-125 z-20 border-white/60 bg-white/20 shadow-2xl"
                      : "scale-100 z-10 glass-card hover:glass-card-hover border-white/15"
                  }`}
                  style={{
                    left: `${posX}px`,
                    top: `${posY}px`,
                    transform: "translate(-50%, -50%)",
                    backgroundColor: isHovered ? "rgba(30, 41, 59, 0.7)" : "rgba(15, 23, 42, 0.4)",
                    boxShadow: isHovered ? `0 0 20px ${option.glow}` : "0 4px 12px rgba(0,0,0,0.4)",
                  }}
                  onMouseEnter={() => setHoveredOption(option)}
                  onMouseLeave={() => setHoveredOption(null)}
                  onClick={(e) => handleSelectEmoji(option, e)}
                  title={`${option.label} — ${option.tagline}`}
                >
                  <span className="select-none transform active:scale-90 transition-transform">
                    {option.emoji}
                  </span>
                </button>
              );
            })}

            {/* Quick Actions Floating Pill Bar Below Wheel */}
            <div
              className="quick-actions-bar absolute left-1/2 -translate-x-1/2 flex items-center space-x-1.5 p-1 rounded-full glass-card border border-white/10 backdrop-blur-xl bg-slate-950/70 shadow-2xl"
              style={{
                top: `${RADIUS + 34}px`,
              }}
            >
              <button
                type="button"
                data-interactive="true"
                onClick={() => {
                  router.push("/");
                  handleClose();
                }}
                className="p-2 rounded-full glass-pill hover:glass-card text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95"
                title="Go to Homepage"
              >
                <Home className="w-3.5 h-3.5 text-indigo-400" />
              </button>

              <button
                type="button"
                data-interactive="true"
                onClick={() => {
                  router.push("/movies");
                  handleClose();
                }}
                className="p-2 rounded-full glass-pill hover:glass-card text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95"
                title="Browse Movie Catalog"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
              </button>

              <button
                type="button"
                data-interactive="true"
                onClick={() => {
                  router.push("/watchlists");
                  handleClose();
                }}
                className="p-2 rounded-full glass-pill hover:glass-card text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95"
                title="Saved Watchlists"
              >
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              </button>

              <button
                type="button"
                data-interactive="true"
                onClick={() => {
                  window.location.reload();
                  handleClose();
                }}
                className="p-2 rounded-full glass-pill hover:glass-card text-slate-300 hover:text-white transition-all hover:scale-105 active:scale-95"
                title="Reload Page"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
              </button>

              <div className="w-[1px] h-4 bg-white/10 my-auto" />

              <button
                type="button"
                data-interactive="true"
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all hover:scale-105 active:scale-95"
                title="Close Wheel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

