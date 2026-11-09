import React from "react";
import Link from "next/link";
import { Film } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function EmptyState({
  title,
  description,
  actionText,
  actionHref,
  icon: Icon = Film,
}: EmptyStateProps) {
  return (
    <div className="relative overflow-hidden flex flex-col items-center justify-center p-12 sm:p-16 text-center glass-card rounded-3xl">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative icon badge */}
      <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent border border-white/10 flex items-center justify-center text-indigo-400 mb-6 shadow-2xl backdrop-blur-xl group hover:scale-105 transition-transform duration-500">
        <Icon className="w-10 h-10 group-hover:rotate-6 transition-transform" />
      </div>

      <h3 className="relative z-10 text-2xl sm:text-3xl font-black text-white font-display tracking-tight mb-2.5">
        {title}
      </h3>

      <p className="relative z-10 text-sm text-slate-300/90 max-w-md leading-relaxed mb-7 font-normal">
        {description}
      </p>

      {actionText && actionHref && (
        <Link
          href={actionHref}
          className="relative z-10 h-11 px-7 rounded-full three-liquid-metal-btn text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {actionText}
        </Link>
      )}
    </div>
  );
}
