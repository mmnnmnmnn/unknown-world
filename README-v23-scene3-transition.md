# v23 — Scene 3 transition timing

Base: v22 low-resolution Scene 3 rollback.

## Change
- Middle galaxy continues its existing slow clockwise rotation only until 9.70s.
- The extra 9.70–10.45s rotation-only segment is removed.
- At 9.70s, the middle galaxy immediately begins a 0.4s crossfade to the galaxy-cluster image.
- During this 0.4s fade, the middle galaxy holds its 9.70s rotation angle; it does not continue rotating.
- Galaxy-cluster zoom-out therefore starts at 10.10s.
- Later Scene 3 timings are shifted 0.75s earlier while preserving their existing durations.

## Preserved
- Low-resolution `galaxy-cluster-bg.png`
- Existing Scene 3 target and stable zoom-out behavior
- UnTaza WOFF2 embedded font
- Scene 1, Scene 4, Firebase and other features
