"use client";

import React, { useRef, useEffect } from "react";

interface ThreeCard3DProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
  glareOpacity?: number;
  scale?: number;
}

export function ThreeCard3D({
  children,
  className = "",
  maxTilt = 12,
  glareOpacity = 0.2,
  scale = 1.025,
}: ThreeCard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Inertia dampening physics state (refs to avoid React re-renders during RAF)
  const currentRotateX = useRef<number>(0);
  const currentRotateY = useRef<number>(0);
  const targetRotateX = useRef<number>(0);
  const targetRotateY = useRef<number>(0);

  const currentScale = useRef<number>(1);
  const targetScale = useRef<number>(1);

  const isHoveredRef = useRef<boolean>(false);
  const prefersReducedMotionRef = useRef<boolean>(false);

  // Up-to-date animation loop reference
  const animateLoopRef = useRef<() => void>(() => {});

  useEffect(() => {
    animateLoopRef.current = () => {
      if (prefersReducedMotionRef.current) {
        rafIdRef.current = null;
        return;
      }

      const LERP_FACTOR = 0.1;
      const EPSILON = 0.005;

      currentRotateX.current +=
        (targetRotateX.current - currentRotateX.current) * LERP_FACTOR;
      currentRotateY.current +=
        (targetRotateY.current - currentRotateY.current) * LERP_FACTOR;
      currentScale.current +=
        (targetScale.current - currentScale.current) * LERP_FACTOR;

      if (cardRef.current) {
        cardRef.current.style.transform = `perspective(1000px) rotateX(${currentRotateX.current.toFixed(
          3
        )}deg) rotateY(${currentRotateY.current.toFixed(
          3
        )}deg) scale3d(${currentScale.current.toFixed(
          4
        )}, ${currentScale.current.toFixed(4)}, ${currentScale.current.toFixed(4)})`;
      }

      const diffX = Math.abs(targetRotateX.current - currentRotateX.current);
      const diffY = Math.abs(targetRotateY.current - currentRotateY.current);
      const diffScale = Math.abs(targetScale.current - currentScale.current);

      const isResting =
        !isHoveredRef.current &&
        diffX < EPSILON &&
        diffY < EPSILON &&
        diffScale < EPSILON;

      if (isResting) {
        currentRotateX.current = 0;
        currentRotateY.current = 0;
        currentScale.current = 1;
        if (cardRef.current) {
          cardRef.current.style.transform =
            "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
          cardRef.current.style.willChange = "auto";
        }
        rafIdRef.current = null;
      } else {
        rafIdRef.current = requestAnimationFrame(() => animateLoopRef.current());
      }
    };
  });

  const startLoop = () => {
    if (rafIdRef.current === null && !prefersReducedMotionRef.current) {
      rafIdRef.current = requestAnimationFrame(() => animateLoopRef.current());
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = mediaQuery.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotionRef.current = e.matches;
      if (e.matches) {
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
        currentRotateX.current = 0;
        currentRotateY.current = 0;
        targetRotateX.current = 0;
        targetRotateY.current = 0;
        currentScale.current = 1;
        targetScale.current = 1;
        if (cardRef.current) {
          cardRef.current.style.transform =
            "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
          cardRef.current.style.willChange = "auto";
        }
        if (glareRef.current) {
          glareRef.current.style.opacity = "0";
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);

    const handleRecache = () => {
      if (isHoveredRef.current && cardRef.current) {
        rectRef.current = cardRef.current.getBoundingClientRect();
      }
    };
    window.addEventListener("resize", handleRecache, { passive: true });
    window.addEventListener("scroll", handleRecache, { passive: true });

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
      window.removeEventListener("resize", handleRecache);
      window.removeEventListener("scroll", handleRecache);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (prefersReducedMotionRef.current || !cardRef.current) return;
    rectRef.current = cardRef.current.getBoundingClientRect();
    isHoveredRef.current = true;
    targetScale.current = scale;
    cardRef.current.style.willChange = "transform";
    startLoop();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotionRef.current || !cardRef.current) return;
    if (!rectRef.current) {
      rectRef.current = cardRef.current.getBoundingClientRect();
    }

    const rect = rectRef.current;
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    targetRotateX.current = (y - 0.5) * -2 * maxTilt;
    targetRotateY.current = (x - 0.5) * 2 * maxTilt;

    if (glareRef.current) {
      glareRef.current.style.opacity = `${glareOpacity}`;
      glareRef.current.style.background = `radial-gradient(circle 320px at ${(
        x * 100
      ).toFixed(1)}% ${(y * 100).toFixed(
        1
      )}%, rgba(255, 255, 255, 0.28) 0%, rgba(99, 102, 241, 0.15) 35%, transparent 75%)`;
    }

    startLoop();
  };

  const handleMouseLeave = () => {
    isHoveredRef.current = false;
    rectRef.current = null;
    targetRotateX.current = 0;
    targetRotateY.current = 0;
    targetScale.current = 1;

    if (glareRef.current) {
      glareRef.current.style.opacity = "0";
    }

    startLoop();
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
        transformStyle: "preserve-3d",
      }}
      className={`relative ${className}`}
    >
      {children}

      {/* Specular Glare Overlay */}
      <div
        ref={glareRef}
        className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden transition-opacity duration-300 opacity-0"
        style={{
          mixBlendMode: "overlay",
        }}
        aria-hidden="true"
      />
    </div>
  );
}
