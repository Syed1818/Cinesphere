"use client";

import React, { useEffect, useRef, useState } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Only enable custom cursor on devices with a fine pointer (desktop mouse/trackpad)
    if (typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
      setEnabled(true);
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
    let isTextHovered = false;
    let isMouseDown = false;

    // Dynamics & stretch
    let currentAngle = 0;
    let currentScaleX = 1;
    let currentScaleY = 1;
    let clickScale = 1;
    let targetClickScale = 1;
    let opacity = 0;
    let targetOpacity = 0;

    // RAF tracking
    let rafId: number | null = null;
    let isRafRunning = false;

    // Linear interpolation helper
    const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

    const updateDOM = () => {
      // Direct GPU transform manipulation for 120 FPS vsync
      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%) scale(${isMouseDown ? 1.3 : 1})`;
      dot.style.opacity = `${opacity.toFixed(3)}`;

      follower.style.transform = `translate3d(${followerX}px, ${followerY}px, 0) translate(-50%, -50%) rotate(${currentAngle.toFixed(2)}deg) scale(${(currentScaleX * clickScale).toFixed(3)}, ${(currentScaleY * clickScale).toFixed(3)})`;
      follower.style.opacity = `${opacity.toFixed(3)}`;
    };

    const render = () => {
      // 1. Lerp dot position (immediate response, factor = 0.45)
      const dotFactor = prefersReducedMotion ? 1 : 0.45;
      dotX = lerp(dotX, mouseX, dotFactor);
      dotY = lerp(dotY, mouseY, dotFactor);

      // 2. Lerp follower position (spring-damped trailing, factor = 0.15)
      const prevFollowerX = followerX;
      const prevFollowerY = followerY;
      const followerFactor = prefersReducedMotion ? 1 : 0.15;
      followerX = lerp(followerX, mouseX, followerFactor);
      followerY = lerp(followerY, mouseY, followerFactor);

      // 3. Velocity and organic squash/stretch
      const deltaX = followerX - prevFollowerX;
      const deltaY = followerY - prevFollowerY;
      const speed = Math.hypot(deltaX, deltaY);

      if (!prefersReducedMotion && speed > 0.15) {
        currentAngle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        const targetScaleX = 1 + Math.min(speed * 0.035, 0.45);
        const targetScaleY = 1 / (1 + (targetScaleX - 1) * 0.6);
        currentScaleX = lerp(currentScaleX, targetScaleX, 0.25);
        currentScaleY = lerp(currentScaleY, targetScaleY, 0.25);
      } else {
        currentScaleX = lerp(currentScaleX, 1, 0.18);
        currentScaleY = lerp(currentScaleY, 1, 0.18);
      }

      // 4. Click scale lerp
      clickScale = lerp(clickScale, targetClickScale, 0.25);

      // 5. Opacity lerp (smooth fade in/out)
      opacity = lerp(opacity, targetOpacity, 0.18);
      if (Math.abs(targetOpacity - opacity) < 0.005) {
        opacity = targetOpacity;
      }

      updateDOM();

      // 6. Loop management: if fully hidden and settled, suspend RAF to conserve CPU
      if (targetOpacity === 0 && opacity === 0) {
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
      if (!isVisible && !isTextHovered) {
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

      if (!hasPositionedFirstTime) {
        hasPositionedFirstTime = true;
        dotX = mouseX;
        dotY = mouseY;
        followerX = mouseX;
        followerY = mouseY;
      }

      if (!isTextHovered) {
        targetOpacity = 1;
        if (!isVisible) {
          isVisible = true;
          document.documentElement.classList.add("has-custom-cursor");
        }
      }

      startRaf();
    };

    const onMouseDown = () => {
      if (isTextHovered) return;
      isMouseDown = true;
      targetClickScale = 0.8;
      startRaf();
    };

    const onMouseUp = () => {
      if (isTextHovered) return;
      isMouseDown = false;
      targetClickScale = 1;
      startRaf();
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInput = target.closest("input, textarea, select, [contenteditable='true']");
      if (isInput) {
        isTextHovered = true;
        targetOpacity = 0;
        document.documentElement.classList.remove("has-custom-cursor");
        return;
      } else if (isTextHovered) {
        isTextHovered = false;
        targetOpacity = 1;
        document.documentElement.classList.add("has-custom-cursor");
        startRaf();
      }
    };

    const onMouseLeaveDoc = (e: MouseEvent) => {
      const toElement = (e as any).toElement || e.relatedTarget;
      if (!toElement) {
        hideCursor();
      }
    };

    const onMouseEnterDoc = () => {
      if (!isTextHovered) {
        showCursor();
      }
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mouseleave", onMouseLeaveDoc);
    document.addEventListener("mouseenter", onMouseEnterDoc);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseleave", onMouseLeaveDoc);
      document.removeEventListener("mouseenter", onMouseEnterDoc);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Outer Follower Ring - Sleek semi-translucent indigo/cyan ring */}
      <div
        ref={followerRef}
        className="fixed top-0 left-0 w-10 h-10 rounded-full pointer-events-none z-[999999] border border-indigo-400/80 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.35)] will-change-transform"
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
