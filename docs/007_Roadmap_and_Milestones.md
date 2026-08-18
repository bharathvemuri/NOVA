# Architecture Document 007 — Product Roadmap and Milestones

**Status:** Proposed  
**Version:** 1.0

# 1. Product Vision

Build a scientifically rigorous, interactive 3D astronomical environment that allows users to explore celestial configurations through time.

Long-term:

    Astronomy Engine
          ↓
    Solar-System Explorer
          ↓
    Time Machine
          ↓
    Planetarium / Observer
          ↓
    Separate Astrology Layer

# 2. Milestone 0 — Repository Foundation

Deliver:

- monorepo
- TypeScript
- package manager/workspaces
- lint
- formatting
- unit test runner
- CI
- architecture docs
- ADR directory

Exit:

- clean build
- clean typecheck
- tests execute
- CI green

# 3. Milestone 1 — Astronomy Mathematics

Deliver:

- vectors
- angles
- rotations
- spherical/cartesian
- Julian Date
- Kepler solver

Exit:

- comprehensive tests
- numerical invariants
- documented units

# 4. Milestone 2 — Planetary Core

Deliver:

- Sun/Earth
- Mercury
- Venus
- Mars
- Jupiter
- Saturn
- Uranus
- Neptune

Exit:

- reference fixtures
- validation report
- model version

# 5. Milestone 3 — Coordinate Systems

Deliver:

- heliocentric ecliptic
- geocentric ecliptic
- equatorial
- precession support as required by model

Exit:

- frame conversion tests
- reference validation

# 6. Milestone 4 — Moon

Deliver:

- lunar model
- perturbations
- geocentric Moon
- validation

Exit:

- dedicated lunar report

# 7. Milestone 5 — API

Deliver:

- Express server
- body endpoint
- ephemeris endpoint
- validation
- error schema
- API tests

# 8. Milestone 6 — 3D Foundation

Deliver:

- React
- Three.js
- scene
- camera
- Sun
- planets
- Earth/Moon

# 9. Milestone 7 — Interaction

Deliver:

- orbit
- pan
- zoom
- selection
- body info
- camera focus
- tracking

# 10. Milestone 8 — Visualization

Deliver:

- orbital paths
- labels
- scientific scale
- visualization scale
- lighting
- visual polish

# 11. Milestone 9 — Time Machine

Deliver:

- simulation clock
- play
- pause
- reverse
- speed
- timeline
- date jump

# 12. Milestone 10 — Hardening

Deliver:

- performance profiling
- security review
- numerical regression
- E2E
- documentation
- deployment
- GitHub README

# 13. Future Milestone A — Observer

Add:

- observer coordinates
- topocentric transformations
- altitude/azimuth
- rise/set

# 14. Future Milestone B — Planetarium

Add:

- stars
- horizon
- constellations
- celestial sphere
- Sun/Moon visibility
- twilight

# 15. Future Milestone C — Astrology

Separate package:

- zodiac
- houses
- aspects
- natal chart
- interpretation UI

# 16. Project Quality Bar

Before public release:

- no known failing tests
- no undocumented scientific approximation
- no unexplained validation failure
- no architecture boundary violations
- reproducible build
- documented accuracy
- documented limitations
- clean onboarding instructions

# 17. GitHub Presentation

Repository should communicate:

1. What the project does.
2. Why the architecture is interesting.
3. How astronomical positions are calculated.
4. How accuracy is validated.
5. How the 3D renderer works.
6. How AI agents were constrained and verified.
7. What remains on the roadmap.

# 18. Release Strategy

Prefer:

    v0.1.0
      Astronomy core

    v0.2.0
      Validated planetary engine

    v0.3.0
      API

    v0.4.0
      3D explorer

    v0.5.0
      Time machine

    v1.0.0
      Fully validated public explorer

Do not call the application 1.0 merely because the UI looks complete.
