"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const followerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const dot = dotRef.current;
    const follower = followerRef.current;
    if (!dot || !follower) return;

    // Center the origin and initially hide until first mouse movement
    gsap.set([dot, follower], { xPercent: -50, yPercent: -50, opacity: 0 });

    // GSAP quickTo setters for 120fps GPU-accelerated motion (transforms only)
    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power3.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power3.out" });
    const followerX = gsap.quickTo(follower, "x", { duration: 0.25, ease: "power3.out" });
    const followerY = gsap.quickTo(follower, "y", { duration: 0.25, ease: "power3.out" });

    let isVisible = false;
    let isHovered = false;
    let isTextHovered = false;
    let rafId: number | null = null;
    let latestX = 0;
    let latestY = 0;
    let hasPositionedFirstTime = false;

    const showCursor = () => {
      if (!isVisible) {
        isVisible = true;
        document.documentElement.classList.add("has-custom-cursor");
        gsap.to([dot, follower], { opacity: 1, duration: 0.15, overwrite: "auto" });
      }
    };

    const hideCursor = () => {
      if (isVisible) {
        isVisible = false;
        document.documentElement.classList.remove("has-custom-cursor");
        gsap.to([dot, follower], { opacity: 0, duration: 0.15, overwrite: "auto" });
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      latestX = e.clientX;
      latestY = e.clientY;

      // Snap to initial position immediately on first move to prevent flying from (0,0)
      if (!hasPositionedFirstTime) {
        hasPositionedFirstTime = true;
        gsap.set([dot, follower], { x: latestX, y: latestY });
      }

      if (!isTextHovered) {
        showCursor();
      }

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          dotX(latestX);
          dotY(latestY);
          followerX(latestX);
          followerY(latestY);
          rafId = null;
        });
      }
    };

    const onMouseDown = () => {
      if (isTextHovered) return;
      gsap.to(follower, {
        scale: 0.75,
        duration: 0.15,
        ease: "power2.out",
        overwrite: "auto",
      });
      gsap.to(dot, {
        scale: 1.4,
        duration: 0.15,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const onMouseUp = () => {
      if (isTextHovered) return;
      gsap.to(follower, {
        scale: isHovered ? 2.2 : 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: "auto",
      });
      gsap.to(dot, {
        scale: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if hovering over native text inputs / textareas
      const isInput = target.closest("input, textarea, select, [contenteditable='true']");
      if (isInput) {
        isTextHovered = true;
        hideCursor();
        return;
      } else if (isTextHovered) {
        isTextHovered = false;
        showCursor();
      }

      const interactive = target.closest(
        "a, button, [role='button'], .clickable, .glass-card-hover, [data-interactive='true']"
      );

      if (interactive && !isHovered) {
        isHovered = true;
        gsap.to(follower, {
          scale: 2.2,
          opacity: 0.9,
          duration: 0.25,
          ease: "power2.out",
          overwrite: "auto",
        });
        gsap.to(dot, {
          scale: 0.6,
          duration: 0.2,
          overwrite: "auto",
        });
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        "a, button, [role='button'], .clickable, .glass-card-hover, [data-interactive='true']"
      );

      if (interactive && isHovered) {
        isHovered = false;
        gsap.to(follower, {
          scale: 1,
          opacity: 0.85,
          duration: 0.3,
          ease: "power2.out",
          overwrite: "auto",
        });
        gsap.to(dot, {
          scale: 1,
          duration: 0.2,
          overwrite: "auto",
        });
      }
    };

    const onMouseLeaveDoc = (e: MouseEvent) => {
      // Only hide if the cursor truly departed the browser window
      const toElement = (e as any).toElement || e.relatedTarget;
      if (!toElement) {
        hideCursor();
      }
    };

    const onMouseEnterDoc = () => {
      showCursor();
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mousedown", onMouseDown, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
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
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("mouseleave", onMouseLeaveDoc);
      document.removeEventListener("mouseenter", onMouseEnterDoc);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      {/* Outer Follower Ring - Pure GPU transform/opacity only */}
      <div
        ref={followerRef}
        className="fixed top-0 left-0 w-10 h-10 rounded-full pointer-events-none z-[999999] border-2 border-indigo-400 bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
        aria-hidden="true"
      />

      {/* Inner Precision Dot - High contrast crisp white + glowing core */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-3 h-3 rounded-full pointer-events-none z-[1000000] bg-white border border-indigo-400 shadow-[0_0_10px_#818cf8,0_0_18px_rgba(99,102,241,0.8)]"
        aria-hidden="true"
      />
    </>
  );
}
