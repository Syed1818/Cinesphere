---
phase: 6
plan: 3
wave: 2
depends_on: ["1"]
files_modified:
  - frontend/src/app/page.tsx
  - frontend/src/styles/globals.css
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Marquee rows drift smoothly without stutter and decelerate gracefully on hover"
    - "Hero spotlight slideshow crossfades with buttery transitions and animated timer indicator"
    - "Slideshow pauses smoothly when user tabs away or hovers over hero card"
    - "Reduced motion preference disables marquee translation and auto-advancing slideshow"
  artifacts:
    - "frontend/src/app/page.tsx updated with smooth slideshow controls and animated timer bar"
    - "frontend/src/styles/globals.css updated with accelerated marquee deceleration transitions"
---

# Plan 6.3: Fluid Marquee Dynamics & Cinematic Slideshow Polish

<objective>
Elevate CineSphere's primary visual landing experience by optimizing the background marquee carousel and polishing the hero spotlight slideshow. Introduce smooth hover deceleration for infinite drifting rows, an animated timer progress bar for active slides, cinematic slow-zoom crossfades, and full reduced-motion accessibility.

Purpose: The marquee wall and hero spotlight establish the user's first impression of CineSphere. Making motion fluid, continuous, and responsive to user focus transforms the platform into an award-winning streaming experience.
Output: Enhanced `frontend/src/app/page.tsx` and optimized marquee animations in `frontend/src/styles/globals.css`.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- frontend/src/app/page.tsx
- frontend/src/styles/globals.css
</context>

<tasks>

<task type="auto" effort="medium">
  <name>Optimize Background Marquee Dynamics with Graceful Hover Deceleration & Reduced Motion</name>
  <files>
    frontend/src/styles/globals.css
    frontend/src/app/page.tsx
  </files>
  <action>
    1. In globals.css:
       - Refine `.animate-marquee-slow` and `.animate-marquee-reverse` with optimized linear timing curves and `translate3d(0, 0, 0)` GPU compositing.
       - Implement smooth deceleration on `.marquee-container:hover .animate-marquee-slow` using CSS animation play state and subtle filter transitions to prevent jarring instant stops.
       - Add comprehensive `@media (prefers-reduced-motion: reduce)` block disabling infinite marquee animations and displaying clean static poster grids.
    2. In page.tsx:
       - Group marquee rows inside a structured container with pointer-events handling so background drift doesn't capture unwanted scroll gestures while allowing subtle hover responsiveness.
       - Ensure poster images use optimized sizing (`sizes="160px"`) and lazy loading to prevent network waterfalls during initial render.
       - Avoid any heavy blur filters or blend modes inside individual poster cards.

    AVOID: Using JavaScript setInterval/RAF loops to drive marquee translation (causes JS thread contention).
    USE: Pure hardware-accelerated CSS keyframe transforms (`transform: translateX(...) translateZ(0)`).
  </action>
  <verify>
    Inspect home page marquee rows at 60 FPS in browser: continuous smooth horizontal drift without horizontal scrollbar blowout or framerate drops.
  </verify>
  <done>
    Marquee runs at 60–120 FPS with 0 CPU overhead, graceful hover deceleration, and full reduced-motion compliance.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Polish Hero Spotlight Slideshow with Cinematic Crossfades & Animated Timer Bar</name>
  <files>
    frontend/src/app/page.tsx
    frontend/src/styles/globals.css
  </files>
  <action>
    1. In page.tsx:
       - Enhance the slide indicator pills: replace static width changes with an active animated progress bar that fills from 0% to 100% over the 5500ms slide interval.
       - Bind the progress bar animation state to `isPaused`: when hovered or paused via controls, the timer halts at its current position.
       - Add subtle cinematic Ken Burns slow-zoom to the active backdrop slide (`transition: transform 6s cubic-bezier(0.25, 1, 0.5, 1)`, starting at `scale-105` and easing to `scale-100`).
       - Ensure smooth crossfading between backdrops with `duration-700 ease-in-out` and clean opacity transitions that prevent black background flash.
       - Support keyboard navigation (`ArrowLeft` / `ArrowRight`) when spotlight container is focused.
    2. In globals.css:
       - Add keyframes and utility classes for the slide timer progress bar (`@keyframes slide-progress`).

    AVOID: Uncontrolled re-renders during slide transitions.
    USE: Memoized slide callbacks and CSS-driven progress animations.
  </action>
  <verify>
    Observe hero spotlight on http://localhost:3000: active pill fills smoothly over 5.5s, backdrop crossfades cinematically on transition, and hovering immediately pauses both timer and slide advancement.
  </verify>
  <done>
    Spotlight hero features animated progress timer, buttery crossfades, and intuitive pause/play controls.
  </done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Marquee rows drift smoothly without stutter and decelerate gracefully on hover
- [ ] Hero spotlight slideshow crossfades with buttery transitions and animated timer indicator
- [ ] Slideshow pauses smoothly when user tabs away or hovers over hero card
- [ ] Reduced motion preference disables marquee translation and auto-advancing slideshow
- [ ] Next.js build passes cleanly (`npm run build`)
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
- [ ] Zero visual glitches or animation stutter across hero section
</success_criteria>

