# Bolt's Performance Journal

## 2026-03-24 - Particle Canvas and Search Lookups Optimization
**Learning:** In static websites with physics canvas animations or searchable indexes, performance hotspots often hide in high-frequency loops. For the particle network canvas, using `Math.hypot` inside nested loops ($O(N^2)$ calculations on up to 74 nodes) introduces significant overhead because `Math.hypot` prevents overflow/underflow, adding branching, and computes square roots on every pair. A squared-distance check (`dx * dx + dy * dy < thresholdSq`) avoids calculating square roots entirely for >90% of the nodes. In search index building, nested list lookups like `.find()` inside a map loop lead to quadratic $O(M \times N)$ complexity, which can be easily avoided by pre-creating an $O(1)$ lookup Map.
**Action:** Always verify if high-frequency animations or map loops do nested lookups/checks, and utilize squared distance thresholds and lookup Maps to reduce computational complexity.
