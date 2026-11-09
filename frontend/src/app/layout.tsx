import type { Metadata } from "next";
import "@/styles/globals.css";
import "@designcodeio/threeui/style.css";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ThreeBackground } from "@/components/ThreeBackground";
import { CustomCursor } from "@/components/CustomCursor";
import { CustomContextMenu } from "@/components/CustomContextMenu";

export const metadata: Metadata = {
  title: "CineSphere | AI-Powered Movie Recommendation Platform",
  description: "Discover personalized movie recommendations powered by custom machine learning, factorized feature vectors, and collaborative filtering.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-[#070a12]">
      <body className="bg-transparent text-white min-h-screen flex flex-col antialiased selection:bg-indigo-600 selection:text-white relative overflow-x-hidden">
        {/* Custom Interactive GSAP Cursor & Radial Context Menu */}
        <CustomCursor />
        <CustomContextMenu />

        {/* Ambient Glowing Orbs / Glassmorphic Mesh */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Top-Left Indigo Glow */}
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-purple-600/10 to-transparent blur-[140px] animate-float-slow will-change-transform" />
          {/* Top-Right Cyan Glow */}
          <div className="absolute top-20 -right-32 w-[550px] h-[550px] rounded-full bg-gradient-to-bl from-cyan-500/15 via-indigo-700/10 to-transparent blur-[130px] animate-float-reverse will-change-transform" />
          {/* Bottom-Center Purple/Amber Glow */}
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[700px] h-[600px] rounded-full bg-gradient-to-r from-purple-900/15 via-indigo-950/25 to-amber-600/10 blur-[160px] animate-pulse-glow will-change-transform" />
          {/* Subtle Cinema Mesh Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0a_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
        </div>

        {/* ThreeUI WebGL Atmospheric Shaders & Interactive 3D Controls */}
        <ThreeBackground showControls={true} />

        <AuthProvider>
          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
