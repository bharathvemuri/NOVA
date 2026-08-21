# Architecture Documents

This directory is a pointer into the canonical architecture document set,
which lives at `docs/*.md` (flat, not nested) — see
`.harness/reports/T-001/implementation-plan.md` §10 R4 for why the source
documents were not moved: the harness's ticket inputs cite the bare
filenames, and relocating them would risk breaking input resolution for
every remaining ticket. This directory exists to satisfy the repository
structure in Architecture §6 without that risk.

- `../Architecture_001_Astronomical_3D_Solar_System_Explorer.md` — system architecture
- `../002_Astronomy_Domain_Specification.md` — astronomy domain specification
- `../003_API_Specification.md` — API specification
- `../004_ThreeJS_Rendering_Architecture.md` — Three.js rendering architecture
- `../005_AI_Harness_Implementation_Protocol.md` — AI harness implementation protocol
- `../006_Testing_and_Validation_Specification.md` — testing and validation specification
- `../007_Roadmap_and_Milestones.md` — roadmap and milestones
- `../008_ADR_Index.md` — canonical ADR index (transcribed per-ADR into `../decisions/`)
