"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface GsapStaggerProps {
  children: React.ReactNode;
  className?: string;
  selector?: string;
  stagger?: number;
  duration?: number;
  yOffset?: number;
  delay?: number;
}

/**
 * GsapStagger: Clean, GPU-accelerated stagger entrance animation using GSAP.
 * Automatically clears inline properties on completion to avoid clashing with CSS hover/3D tilt transforms.
 */
export function GsapStagger({
  children,
  className = "",
  selector = "> *",
  stagger = 0.035,
  duration = 0.32,
  yOffset = 12,
  delay = 0.04,
}: GsapStaggerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const childCount = React.Children.count(children);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || childCount === 0) return;

    // Only run entrance animation once per item collection
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    // Emil Kowalski: Check prefers-reduced-motion to drop movement if sensitive
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const targets =
        !selector || selector === "> *"
          ? Array.from(el.children)
          : Array.from(el.querySelectorAll(selector));

      if (targets.length === 0) return;

      gsap.fromTo(
        targets,
        {
          opacity: 0,
          y: prefersReducedMotion ? 0 : yOffset,
          scale: prefersReducedMotion ? 1 : 0.97,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: prefersReducedMotion ? 0.2 : duration,
          stagger: prefersReducedMotion ? 0 : stagger,
          delay,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [childCount, selector, stagger, duration, yOffset, delay]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
