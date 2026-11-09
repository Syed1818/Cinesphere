---
phase: 6
plan: 1
wave: 1
gap_closure: false
---

# Plan 6.1: Next-Gen Custom Cursor Redesign (Adaptive Morphing & Magnetic Snapping)

## Objective
Completely redesign the CineSphere custom cursor from a basic dual-ring follower into a world-class, fluid, adaptive mouse interaction system. Implement spring-damped trailing physics via RAF linear interpolation (`lerp`), velocity-based dynamic stretch, magnetic attraction snapping on clickable buttons/badges, and smooth context-aware morphing states (default pointer, magnetic target, card hover pill, and text caret).

## Context
Load these files for context:
- `.gsd/SPEC.md`
- `.gsd/ARCHITECTURE.md`
- `frontend/src/components/CustomCursor.tsx`
- `frontend/src/styles/globals.css`

---

## Tasks

<task type="auto" effort="high">
  <name>Redesign CustomCursor with Physics-Based Lerp Trailing & Velocity Scaling</name>
  <files>
    frontend/src/components/CustomCursor.tsx
  </files>
  <action>
    Re-architect CustomCursor.tsx using high-precision requestAnimationFrame loop with linear interpolation (`lerp(current, target, factor)`):
    1. Central Dot: Tracks cursor position with immediate response (`lerp factor = 0.45` or direct transform).
    2. Outer Follower: Trails smoothly behind using spring-damped physics (`lerp factor = 0.15`).
    3. Velocity Calculation: Measure $\Delta x = x_t - x_{t-1}$ and $\Delta y = y_t - y_{t-1}$ to calculate instantaneous mouse speed. Apply subtle organic stretch/squash along the movement angle ($\theta = \text{atan2}(\Delta y, \Delta x)$) when moving quickly, settling back into a perfect circle when resting.
    4. Minimalist Luxury Aesthetics:
       - Follower: Sleek semi-translucent indigo/cyan ring (`w-10 h-10 border border-indigo-400/80 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.35)]`).
       - Core Dot: High-precision crisp white luminous focal point (`w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_#818cf8]`).
    5. Cleanup & Safety:
       - Stop RAF loop when mouse leaves window (`document.mouseleave`) and hide cleanly (`opacity: 0`).
       - Wake up and fade in immediately on mousemove without latency.
    
    AVOID: Using fixed setTimeout or unthrottled state updates (causes stutter).
    USE: Pure GPU transform updates via direct DOM style manipulation inside RAF loop.
  </action>
  <verify>
    Move mouse at varying speeds across http://localhost:3000: follower ring stretches gently along velocity vector and settles smoothly at rest.
  </verify>
  <done>
    Cursor tracks at 120 FPS vsync with fluid spring lag, velocity-based squash/stretch, and 0 dropped frames.
  </done>
</task>

<task type="auto" effort="medium">
  <name>Implement Magnetic Snapping & Context-Aware Morphing States</name>
  <files>
    frontend/src/components/CustomCursor.tsx
    frontend/src/styles/globals.css
  </files>
  <action>
    Extend CustomCursor to detect element semantics and transition between 4 distinct visual states:
    1. "DEFAULT": Normal precision dot + smooth trailing ring.
    2. "MAGNETIC_BUTTON": When hovering over buttons, tabs, or badges (`button, a.btn, [role='button'], .magnetic-target`):
       - Snap outer ring gently toward the center of the hovered element (`center = rect.left + rect.width/2`, `rect.top + rect.height/2`).
       - Expand follower to frame the button with a glowing border (`scale: 1.8`, border cyan/violet).
    3. "CARD_HOVER": When hovering over `MovieCard` or `RecommendationCard` (`.glass-card-hover, [data-card='true']`):
       - Expand follower into an ambient glowing focal aura (`scale: 2.4`, opacity 0.8) with centered dot scaled to 0.5.
    4. "TEXT_INPUT": When hovering over `input, textarea, select, [contenteditable]`:
       - Instantly collapse custom cursor (`opacity: 0`) and allow native `cursor: text` to take over.
    
    In globals.css:
    Ensure `html.has-custom-cursor` applies `cursor: none !important` universally to interactive elements while strictly preserving `cursor: text !important` on text fields.
    
    AVOID: Querying `getBoundingClientRect()` on every mousemove tick (causes layout thrashing).
    USE: Cache target bounds on `mouseenter` / `mouseover` and release on `mouseleave` / `mouseout`.
  </action>
  <verify>
    Hover over navigation links and movie cards: cursor smoothly expands and snaps. Hover over search input: standard text caret displays instantly.
  </verify>
  <done>
    Cursor seamlessly transitions between default, magnetic, card-preview, and text states with zero layout thrashing.
  </done>
</task>

---

## Must-Haves
- [ ] Custom cursor tracks with fluid, spring-damped lerp physics.
- [ ] Velocity-based organic elongation along the motion vector.
- [ ] Magnetic hover scaling on clickable interactive elements.
- [ ] 100% preservation of native text caret over inputs and textareas.
- [ ] Zero runtime exceptions in browser console.

## Success Criteria
- [ ] Cursor movement feels fluid, organic, and premium (60–120 FPS).
- [ ] Next.js type check passes with 0 errors (`npx tsc --noEmit`).

