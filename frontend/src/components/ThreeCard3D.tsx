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
  const willChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (willChangeTimeoutRef.current) clearTimeout(willChangeTimeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!cardRef.current) return;
    rectRef.current = cardRef.current.getBoundingClientRect();

    if (willChangeTimeoutRef.current) clearTimeout(willChangeTimeoutRef.current);
    cardRef.current.style.willChange = "transform";
    cardRef.current.style.transition = "transform 0.1s ease-out";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    if (!rectRef.current) {
      rectRef.current = cardRef.current.getBoundingClientRect();
    }

    const rect = rectRef.current;
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (!cardRef.current) {
          rafIdRef.current = null;
          return;
        }

        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;

        const rotateX = (y - 0.5) * -2 * maxTilt;
        const rotateY = (x - 0.5) * 2 * maxTilt;

        cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(
          2
        )}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;

        if (glareRef.current) {
          glareRef.current.style.opacity = `${glareOpacity}`;
          glareRef.current.style.background = `radial-gradient(circle 320px at ${(
            x * 100
          ).toFixed(1)}% ${(y * 100).toFixed(
            1
          )}%, rgba(255, 255, 255, 0.28) 0%, rgba(99, 102, 241, 0.15) 35%, transparent 75%)`;
        }

        rafIdRef.current = null;
      });
    }
  };

  const handleMouseLeave = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    rectRef.current = null;

    if (cardRef.current) {
      cardRef.current.style.transition =
        "transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)";
      cardRef.current.style.transform =
        "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
    }

    if (glareRef.current) {
      glareRef.current.style.opacity = "0";
    }

    // Debounce removal of will-change to reclaim GPU VRAM after transition finishes
    if (willChangeTimeoutRef.current) clearTimeout(willChangeTimeoutRef.current);
    willChangeTimeoutRef.current = setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.style.willChange = "auto";
      }
    }, 550);
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

      {/* ThreeUI Specular Glare Overlay */}
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

