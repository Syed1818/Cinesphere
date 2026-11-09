"use client";

import React, { useEffect, useRef, useState } from "react";

type CursorState = "DEFAULT" | "MAGNETIC_BUTTON" | "CARD_HOVER" | "TEXT_INPUT";

interface MagneticBounds {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Only enable custom cursor on devices with a fine pointer (desktop mouse/trackpad)
    if (typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!prefersReduced) {
        setEnabled(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current;
    const follower = followerRef.current;
    if (!dot || !follower) return;

    // Check accessibility preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Position coordinates
    let mouseX = -100;
    let mouseY = -100;
    let dotX = -100;
    let dotY = -100;
    let followerX = -100;
    let followerY = -100;

    let hasPositionedFirstTime = false;
    let isVisible = false;
    let isMouseDown = false;
    let cursorState: CursorState = "DEFAULT";

    // Target elements and cached bounds to prevent layout thrashing
    let activeMagneticEl: HTMLElement | null = null;
    let magneticBounds: MagneticBounds | null = null;
    let activeCardEl: HTMLElement | null = null;

    // Dynamics, scaling & stretch
    let currentAngle = 0;
    let currentScaleX = 1;
    let currentScaleY = 1;
    let baseFollowerScale = 1;
    let baseDotScale = 1;
    let clickScale = 1;
    let targetClickScale = 1;
    let opacity = 0;
    let targetOpacity = 0;

    // Style appearance cache
    let currentThemeState = "";

    // RAF tracking
    let rafId: number | null = null;
    let isRafRunning = false;

    // Linear interpolation helper
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

    const updateThemeStyles = () => {
      if (currentThemeState === cursorState) return;
      currentThemeState = cursorState;

      if (cursorState === "MAGNETIC_BUTTON") {
        follower.style.borderColor = "rgba(56, 189, 248, 0.95)";
        follower.style.backgroundColor = "rgba(168, 85, 247, 0.22)";
        follower.style.boxShadow = "0 0 25px rgba(56, 189, 248, 0.45), 0 0 10px rgba(168, 85, 247, 0.35)";
      } else if (cursorState === "CARD_HOVER") {
        follower.style.borderColor = "rgba(168, 85, 247, 0.75)";
        follower.style.backgroundColor = "rgba(99, 102, 241, 0.2)";
        follower.style.boxShadow = "0 0 30px rgba(99, 102, 241, 0.45)";
      } else {
        // DEFAULT
        follower.style.borderColor = "rgba(129, 140, 248, 0.8)";
        follower.style.backgroundColor = "rgba(99, 102, 241, 0.1)";
        follower.style.boxShadow = "0 0 20px rgba(99, 102, 241, 0.35)";
      }
    };

    const updateDOM = () => {
      // GPU-accelerated transforms (120 FPS vsync)
      const finalDotScale = baseDotScale * (isMouseDown ? 1.3 : 1);
      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%) scale(${finalDotScale.toFixed(3)})`;
      dot.style.opacity = `${opacity.toFixed(3)}`;

      const finalScaleX = baseFollowerScale * currentScaleX * clickScale;
      const finalScaleY = baseFollowerScale * currentScaleY * clickScale;
      follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%) rotate(${currentAngle.toFixed(2)}deg) scale(${finalScaleX.toFixed(3)}, ${finalScaleY.toFixed(3)})`;
      follower.style.opacity = `${opacity.toFixed(3)}`;

      updateThemeStyles();
    };

    const render = () => {
      // 1. Determine targets based on current interaction state
      let targetFollowerX = mouseX;
      let targetFollowerY = mouseY;
      let targetFollowerScale = 1;
      let targetDotScale = 1;

      if (cursorState === "MAGNETIC_BUTTON" && magneticBounds) {
        // Magnetic gravity: snap strongly toward center, retaining subtle mouse offset
        targetFollowerX = magneticBounds.centerX + (mouseX - magneticBounds.centerX) * 0.2;
        targetFollowerY = magneticBounds.centerY + (mouseY - magneticBounds.centerY) * 0.2;
        targetFollowerScale = 1.8;
        targetDotScale = 0.75;
      } else if (cursorState === "CARD_HOVER") {
        targetFollowerScale = 2.4;
        targetDotScale = 0.5;
      } else {
        // DEFAULT
        targetFollowerScale = 1;
        targetDotScale = 1;
      }

      // 2. Direct dot tracking (0ms input lag - matches physical mouse 1:1)
      dotX = mouseX;
      dotY = mouseY;

      // 3. Lerp follower position (snappy, spring-damped trailing, factor = 0.35)
      const prevFollowerX = followerX;
      const prevFollowerY = followerY;
      const followerFactor = prefersReducedMotion ? 1 : 0.35;
      followerX = lerp(followerX, targetFollowerX, followerFactor);
      followerY = lerp(followerY, targetFollowerY, followerFactor);

      // 4. Follower and dot scale interpolation
      baseFollowerScale = lerp(baseFollowerScale, targetFollowerScale, 0.28);
      baseDotScale = lerp(baseDotScale, targetDotScale, 0.3);
      clickScale = lerp(clickScale, targetClickScale, 0.3);

      // 5. Velocity and organic squash/stretch (applied when not magnetically locked)
      const deltaX = followerX - prevFollowerX;
      const deltaY = followerY - prevFollowerY;
      const speed = Math.hypot(deltaX, deltaY);

      if (!prefersReducedMotion && cursorState === "DEFAULT" && speed > 0.3) {
        currentAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const targetScaleX = 1 + Math.min(speed * 0.035, 0.45);
        const targetScaleY = 1 / (1 + (targetScaleX - 1) * 0.6);
        currentScaleX = lerp(currentScaleX, targetScaleX, 0.28);
        currentScaleY = lerp(currentScaleY, targetScaleY, 0.28);
      } else {
        currentScaleX = lerp(currentScaleX, 1, 0.25);
        currentScaleY = lerp(currentScaleY, 1, 0.25);
      }

      // 6. Opacity lerp (smooth fade in/out)
      opacity = lerp(opacity, targetOpacity, 0.25);
      if (Math.abs(targetOpacity - opacity) < 0.005) {
        opacity = targetOpacity;
      }

      updateDOM();

      // 7. Loop management: suspend RAF when stationary to conserve 100% CPU
      const isResting =
        Math.abs(followerX - targetFollowerX) < 0.2 &&
        Math.abs(followerY - targetFollowerY) < 0.2 &&
        Math.abs(currentScaleX - 1) < 0.01 &&
        Math.abs(currentScaleY - 1) < 0.01 &&
        Math.abs(baseFollowerScale - targetFollowerScale) < 0.01 &&
        opacity === targetOpacity;

      if (isResting) {
        followerX = targetFollowerX;
        followerY = targetFollowerY;
        updateDOM();
        isRafRunning = false;
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(render);
    };

    const startRaf = () => {
      if (!isRafRunning) {
        isRafRunning = true;
        rafId = requestAnimationFrame(render);
      }
    };

    const showCursor = () => {
      if (!isVisible && cursorState !== "TEXT_INPUT") {
        isVisible = true;
        document.documentElement.classList.add("has-custom-cursor");
        targetOpacity = 1;
        startRaf();
      }
    };

    const hideCursor = () => {
      if (isVisible) {
        isVisible = false;
        document.documentElement.classList.remove("has-custom-cursor");
        targetOpacity = 0;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dotX = mouseX;
      dotY = mouseY;

      if (!hasPositionedFirstTime) {
        hasPositionedFirstTime = true;
        followerX = mouseX;
        followerY = mouseY;
      }

      if (cursorState !== "TEXT_INPUT") {
        targetOpacity = 1;
        if (!isVisible) {
          isVisible = true;
          document.documentElement.classList.add("has-custom-cursor");
        }
      }

      startRaf();
    };

    const onMouseDown = () => {
      if (cursorState === "TEXT_INPUT") return;
      isMouseDown = true;
      targetClickScale = 0.8;
      startRaf();
    };

    const onMouseUp = () => {
      if (cursorState === "TEXT_INPUT") return;
      isMouseDown = false;
      targetClickScale = 1;
      startRaf();
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // 1. Text input detection: instant collapse and native cursor restore
      const isInput = target.closest("input, textarea, select, [contenteditable='true']");
      if (isInput) {
        cursorState = "TEXT_INPUT";
        activeMagneticEl = null;
        magneticBounds = null;
        activeCardEl = null;
        targetOpacity = 0;
        document.documentElement.classList.remove("has-custom-cursor");
        return;
      }

      // Re-enable custom cursor if departing a text field
      if (cursorState === "TEXT_INPUT") {
        document.documentElement.classList.add("has-custom-cursor");
        targetOpacity = 1;
      }

      // 2. Magnetic button detection (buttons take precedence over cards)
      const buttonEl = target.closest<HTMLElement>(
        "button, a, [role='button'], .magnetic-target, .three-liquid-metal-btn, .glass-pill"
      );
      if (buttonEl) {
        cursorState = "MAGNETIC_BUTTON";
        activeMagneticEl = buttonEl;
        const rect = buttonEl.getBoundingClientRect();
        magneticBounds = {
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };
        startRaf();
        return;
      }

      // 3. Card hover detection
      const cardEl = target.closest<HTMLElement>(
        ".glass-card-hover, [data-card='true'], .three-glow-box"
      );
      if (cardEl) {
        cursorState = "CARD_HOVER";
        activeCardEl = cardEl;
        activeMagneticEl = null;
        magneticBounds = null;
        startRaf();
        return;
      }

      // 4. Default pointer state
      cursorState = "DEFAULT";
      activeMagneticEl = null;
      magneticBounds = null;
      activeCardEl = null;
      startRaf();
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const related = e.relatedTarget as HTMLElement | null;

      // Handle departing magnetic buttons
      if (activeMagneticEl && (!related || !activeMagneticEl.contains(related))) {
        activeMagneticEl = null;
        magneticBounds = null;
        if (cursorState === "MAGNETIC_BUTTON") {
          cursorState = "DEFAULT";
        }
      }

      // Handle departing card hovers
      if (activeCardEl && (!related || !activeCardEl.contains(related))) {
        activeCardEl = null;
        if (cursorState === "CARD_HOVER") {
          cursorState = "DEFAULT";
        }
      }

      // Handle departing text inputs
      if (cursorState === "TEXT_INPUT") {
        const inputEl = target.closest("input, textarea, select, [contenteditable='true']");
        if (inputEl && (!related || !inputEl.contains(related))) {
          cursorState = "DEFAULT";
          targetOpacity = 1;
          document.documentElement.classList.add("has-custom-cursor");
          startRaf();
        }
      }
    };

    const onScroll = () => {
      // Keep cached magnetic bounds synced on scroll without re-querying every mousemove
      if (activeMagneticEl) {
        const rect = activeMagneticEl.getBoundingClientRect();
        magneticBounds = {
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
          width: rect.width,
          height: rect.height,
        };
      }
    };

    const onMouseLeaveDoc = (e: MouseEvent) => {
      const toElement = (e as any).toElement || e.relatedTarget;
      if (!toElement) {
        hideCursor();
      }
    };

    const onMouseEnterDoc = () => {
      if (cursorState !== "TEXT_INPUT") {
        showCursor();
      }
    };

    const onWindowBlur = () => {
      hideCursor();
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mouseout", onMouseOut, { passive: true });
    document.addEventListener("mouseleave", onMouseLeaveDoc);
    document.addEventListener("mouseenter", onMouseEnterDoc);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("mouseleave", onMouseLeaveDoc);
      document.removeEventListener("mouseenter", onMouseEnterDoc);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Outer Follower Ring - Adaptive morphing frame with hardware-accelerated transitions */}
      <div
        ref={followerRef}
        className="fixed top-0 left-0 w-10 h-10 rounded-full pointer-events-none z-[999999] border border-indigo-400/80 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.35)] will-change-transform transition-[border-color,background-color,box-shadow] duration-200 ease-out"
        aria-hidden="true"
      />

      {/* Inner Precision Dot - High-precision crisp white luminous focal point */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-2.5 h-2.5 rounded-full pointer-events-none z-[1000000] bg-white shadow-[0_0_10px_#818cf8] will-change-transform"
        aria-hidden="true"
      />
    </>
  );
}
