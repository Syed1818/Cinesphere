"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Sparkles, Eye, EyeOff, Layers } from "lucide-react";

const FluidFieldBackground = dynamic(
  () =>
    import("@designcodeio/threeui/components/FluidFieldBackground").then(
      (m) => m.FluidFieldBackground
    ),
  { ssr: false }
);

const NebulaBackground = dynamic(
  () =>
    import("@designcodeio/threeui/components/NebulaBackground").then(
      (m) => m.NebulaBackground
    ),
  { ssr: false }
);

const WarpFieldBackground = dynamic(
  () =>
    import("@designcodeio/threeui/components/WarpFieldBackground").then(
      (m) => m.WarpFieldBackground
    ),
  { ssr: false }
);

const EmberStorm = dynamic(
  () =>
    import("@designcodeio/threeui/components/EmberStorm").then(
      (m) => m.EmberStorm
    ),
  { ssr: false }
);

const LiquidFormBackground = dynamic(
  () =>
    import("@designcodeio/threeui/components/LiquidFormBackground").then(
      (m) => m.LiquidFormBackground
    ),
  { ssr: false }
);

export type ThreeShaderMode = "fluid" | "nebula" | "warp" | "embers" | "liquid" | "off";

interface ThreeBackgroundProps {
  initialMode?: ThreeShaderMode;
  className?: string;
  showControls?: boolean;
}

export function ThreeBackground({
  initialMode = "nebula",
  className = "",
  showControls = false,
}: ThreeBackgroundProps) {
  const [mode, setMode] = useState<ThreeShaderMode>(initialMode);
  const [mounted, setMounted] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    // Load active shader mode, respecting user settings and device capability
    const saved = localStorage.getItem("threeui_shader_mode") as ThreeShaderMode | null;
    if (saved) {
      setMode(saved);
    } else {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const isLowPowered =
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        window.matchMedia("(pointer: coarse)").matches;

      // On lower-end devices or reduced motion, disable 3D canvas by default for max performance
      if (prefersReduced || isLowPowered) {
        setMode("off");
      } else {
        setMode("nebula");
      }
    }

    // Pause WebGL rendering loop when document is hidden (background tab/minimized)
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleModeChange = (newMode: ThreeShaderMode) => {
    setMode(newMode);
    localStorage.setItem("threeui_shader_mode", newMode);
  };

  if (!mounted) return null;

  return (
    <>
      {/* 3D WebGL Shader Atmosphere Layer - Active only when tab is visible */}
      {mode !== "off" && isVisible && (
        <div
          className={`fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-1000 ${className}`}
          style={{ opacity: 0.75 }}
          aria-hidden="true"
        >
          {mode === "fluid" && (
            <FluidFieldBackground
              mode="dark"
              hue={210}
              saturation={1.2}
              brightness={1.0}
              className="w-full h-full object-cover scale-105 pointer-events-none"
            />
          )}

          {mode === "nebula" && (
            <NebulaBackground
              mode="dark"
              hue={250}
              saturation={1.25}
              brightness={0.95}
              className="w-full h-full object-cover scale-105 pointer-events-none"
            />
          )}

          {mode === "warp" && (
            <WarpFieldBackground
              variant="hyperspace"
              speed={0.8}
              streakOpacity={0.7}
              hue={210}
              saturation={1.1}
              brightness={0.95}
              className="w-full h-full object-cover scale-105 pointer-events-none"
            />
          )}

          {mode === "embers" && (
            <EmberStorm
              mode="dark"
              hue={30}
              saturation={1.25}
              brightness={1.0}
              className="w-full h-full object-cover scale-105 pointer-events-none"
            />
          )}

          {mode === "liquid" && (
            <LiquidFormBackground
              speed={0.8}
              morph={1}
              tintHue={220}
              tintAmount={0.5}
              className="w-full h-full object-cover scale-105 pointer-events-none"
            />
          )}

          {/* Completely transparent subtle edge vignette */}
          <div className="absolute inset-0 bg-radial-at-c from-transparent via-transparent to-[#070a12]/30 pointer-events-none" />
        </div>
      )}

      {/* Floating ThreeUI Shader Switcher Pill */}
      {showControls && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center">
          <div className="relative">
            {isControlsOpen ? (
              <div className="glass-card p-3 rounded-2xl border border-indigo-500/30 shadow-2xl flex flex-col gap-2 min-w-[200px] mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between pb-1 border-b border-white/10">
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ThreeUI WebGL Shaders</span>
                  </span>
                  <button
                    onClick={() => setIsControlsOpen(false)}
                    className="text-slate-400 hover:text-white text-xs px-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {(
                    [
                      { id: "fluid", label: "Fluid Aura" },
                      { id: "nebula", label: "Cosmic Nebula" },
                      { id: "warp", label: "Warp Tunnel" },
                      { id: "embers", label: "Ember Storm" },
                      { id: "liquid", label: "Liquid Form" },
                      { id: "off", label: "Disable 3D" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleModeChange(opt.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                        mode === opt.id
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "glass-pill text-slate-300 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              onClick={() => setIsControlsOpen(!isControlsOpen)}
              className="px-3.5 py-2 rounded-full glass-card hover:glass-card-hover border border-indigo-500/30 text-indigo-300 hover:text-white text-xs font-bold shadow-xl flex items-center space-x-2 transition-all hover:scale-105 active:scale-95 group"
              title="Configure ThreeUI 3D Shaders"
            >
              <Sparkles className="w-4 h-4 text-indigo-400 group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline">ThreeUI 3D:</span>
              <span className="uppercase text-[10px] tracking-wider font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                {mode}
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
