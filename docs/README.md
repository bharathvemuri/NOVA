# Planetarium Architecture Document Set

## Documents

1. `001` — Astronomical 3D Solar-System Explorer Architecture
2. `002` — Astronomy Domain Specification
3. `003` — Express API Specification
4. `004` — Three.js Rendering Architecture
5. `005` — AI Harness Implementation Protocol
6. `006` — Testing and Scientific Validation Specification
7. `007` — Product Roadmap and Milestones
8. `008` — Architecture Decision Record Index

## Recommended implementation order

    001 System Architecture
       ↓
    002 Astronomy Domain
       ↓
    006 Testing / Validation
       ↓
    008 ADRs
       ↓
    005 AI Harness Protocol
       ↓
    003 API
       ↓
    004 Renderer
       ↓
    007 Roadmap

The implementation should begin with the repository foundation and mathematical astronomy core, not the UI.

## Scientific references

Primary algorithm reference:
Paul Schlyter, "Computing planetary positions — a tutorial with worked examples."

Validation/reference infrastructure:
JPL Horizons and NASA/JPL NAIF SPICE.

## Important distinction

The Stjarnhimlen model's stated goal is approximately 1–2 arcminutes for the 20th and 21st centuries. The project must report measured validation results rather than making a broader "astronomical-grade" claim.
