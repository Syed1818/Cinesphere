import React from "react";

export function LoadingSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col glass-card rounded-2xl overflow-hidden animate-pulse"
        >
          <div className="aspect-[2/3] w-full bg-slate-900/60 relative overflow-hidden">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className="p-4 space-y-2.5">
            <div className="h-4 bg-white/5 rounded-md w-3/4" />
            <div className="flex items-center justify-between pt-1">
              <div className="h-3 bg-white/5 rounded-md w-1/3" />
              <div className="h-3 bg-white/5 rounded-md w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
