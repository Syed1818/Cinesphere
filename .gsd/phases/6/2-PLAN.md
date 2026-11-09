---
phase: 6
plan: 2
wave: 2
depends_on: ["1"]
files_modified:
  - frontend/src/components/ThreeCard3D.tsx
  - frontend/src/styles/globals.css
autonomous: true
user_setup: []

must_haves:
  truths:
    - "3D card tilt reacts with smooth inertia dampening instead of rigid immediate displacement"
    - "Card smoothly springs back to neutral orientation when mouse leaves"
    - "Specular light sheen tracks mouse position with buttery radial gradient"
    - "Tilt is completely disabled when prefers-reduced-motion is active"
  artifacts:
    - "frontend/src/components/ThreeCard3D.tsx updated with continuous damped RAF loop"
---

# Plan 6.2: Inertia-Dampened 3D Card Physics & Smooth Tilt Mechanics

<objective>
Eliminate layout thrashing, jitter, and CSS transition conflicts in `ThreeCard3D.tsx` by implementing a dedicated continuous linear interpolation (`lerp`) animation loop. Introduce realistic inertia dampening, organic spring return physics, holographic specular reflection sheen, and complete `prefers-reduced-motion` compliance.

Purpose: 3D card hover is a core interactive signature of CineSphere; replacing conflicting CSS transition properties with a pure RAF physics loop delivers buttery 120 FPS motion without stutter.
Output: Upgraded `frontend/src/components/ThreeCard3D.tsx` and supporting CSS.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- .gsd/ARCHITECTURE.md
- frontend/src/components/ThreeCard3D.tsx
- frontend/src/styles/globals.css
</context>

<tasks>

<task type="auto" effort="medium">
  <name>Re-architect ThreeCard3D Tilt Engine with Continuous Lerp Loop & Spring Return</name>
  <files>
    frontend/src/components/ThreeCard3D.tsx
  </files>
  <action>
    Refactor ThreeCard3D.tsx to use a continuous requestAnimationFrame loop with linear interpolation:
    1. Maintain interpolation state via refs:
       - `currentRotateX`, `currentRotateY`, `targetRotateX`, `targetRotateY`
       - `currentScale`, `targetScale`
       - `isHoveredRef`, `rafIdRef`
    2. Physics Calculation:
       - `currentRotateX += (targetRotateX - currentRotateX) * 0.1`
       - `currentRotateY += (targetRotateY - currentRotateY) * 0.1`
       - `currentScale += (targetScale - currentScale) * 0.1`
    3. State Lifecycle:
       - On `handleMouseEnter`: Cache `getBoundingClientRect()`, set `isHoveredRef.current = true`, set `targetScale = scale`, set `will-change: transform`, start RAF loop if not already running. Ensure NO conflicting CSS `transition: transform` is active during mouse tracking.
       - On `handleMouseMove`: Update `targetRotateX = (y - 0.5) * -2 * maxTilt` and `targetRotateY = (x - 0.5) * 2 * maxTilt`.
       - On `handleMouseLeave`: Set `isHoveredRef.current = false`, `targetRotateX = 0`, `targetRotateY = 0`, `targetScale = 1`. Continue RAF loop until delta is under epsilon (0.005), then cancel RAF and reset `will-change: auto`.
    4. Accessibility & Cleanup:
       - Detect `window.matchMedia('(prefers-reduced-motion: reduce)')`. If reduced motion is preferred, immediately cancel tilt and render card flat.
       - Clean up active RAF loop and timeouts in `useEffect` unmount.

    AVOID: Setting inline `transition: transform` while updating transform in RAF (causes browser transition interpolation to fight RAF updates).
    USE: Pure RAF lerping for both active tilt and return-to-rest spring physics.
  </action>
  <verify>
    Run `npm run build` in frontend/; hover over movie cards on home page and catalog grid. Tilt responds fluidly with subtle lag and returns gently to 0 when mouse leaves.
  </verify>
  <done>
    Cards rotate smoothly with inertia dampening at 60–120 FPS with 0 console warnings and no layout thrashing.
  </done>
</task>

<task type="auto" effort="low">
  <name>Implement Holographic Specular Light Sheen & Cursor Semantic Integration</name>
  <files>
    frontend/src/components/ThreeCard3D.tsx
    frontend/src/styles/globals.css
  </files>
  <action>
    1. In ThreeCard3D.tsx:
       - Update the specular glare element to interpolate position smoothly alongside the tilt angles.
       - Use a soft luminous gradient: `radial-gradient(circle 350px at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.22) 0%, rgba(129, 140, 248, 0.12) 30%, transparent 70%)`.
       - Tag the outer container with `data-card="true"` so Plan 6.1's CustomCursor detects it on mouseover and triggers the expanded card-aura state.
    2. In globals.css:
       - Ensure hardware-accelerated 3D perspective rules (`perspective: 1000px`, `transform-style: preserve-3d`, `backface-visibility: hidden`) are applied cleanly without triggering extra compositing layers when cards are static.
       - Verify no duplicate or conflicting tilt styles exist.

    AVOID: Re-calculating DOM element rects on every mousemove tick.
    USE: Cached bounding rect from mouseenter with resize listener fallback.
  </action>
  <verify>
    Hover over cards across catalog and home page: luminous light sheen sweeps across poster surface in sync with tilt angle without obscuring card text or ratings.
  </verify>
  <done>
    Holographic sheen tracks card tilt seamlessly; cards export `data-card="true"` for custom cursor morphing.
  </done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] 3D card tilt reacts with smooth inertia dampening instead of rigid immediate displacement
- [ ] Card smoothly springs back to neutral orientation when mouse leaves
- [ ] Specular light sheen tracks mouse position with buttery radial gradient
- [ ] Tilt is completely disabled when prefers-reduced-motion is active
- [ ] Next.js build passes cleanly (`npm run build`)
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
- [ ] 60–120 FPS card hover performance with zero dropped frames
</success_criteria>

