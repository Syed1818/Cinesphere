import Link from "next/link";
import { Film, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-4">
      <div className="relative glass-card border border-white/10 p-8 sm:p-12 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-5 shadow-inner">
          <Film className="w-7 h-7" />
        </div>

        <h1 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight mb-2 text-gradient-cinema">
          404 - Not Found
        </h1>

        <p className="text-sm text-slate-300/90 leading-relaxed max-w-sm mb-7 font-normal">
          The cinematic title or page you are looking for does not exist in our catalog or has been moved.
        </p>

        <Link
          href="/"
          className="three-liquid-metal-btn h-11 px-6 rounded-full text-white font-bold text-sm shadow-xl flex items-center space-x-2 transition-all hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Cinema Hub</span>
        </Link>
      </div>
    </div>
  );
}

