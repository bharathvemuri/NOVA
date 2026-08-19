# NOVA

An astronomical 3D solar system explorer: a TypeScript astronomy engine and
interactive 3D visualization, developed in a pnpm workspace monorepo with an
AI-assisted, gated development harness.

## Overview

This repository is at the foundation stage (ticket T-001): the monorepo
toolchain, package boundaries and CI are in place; no astronomical
calculation, HTTP route, or Three.js scene code has been written yet. See
`docs/007_Roadmap_and_Milestones.md` for the phased plan.

## Features

Not yet implemented. Tracked by the roadmap in `docs/007_Roadmap_and_Milestones.md`.

## Architecture

See `docs/Architecture_001_Astronomical_3D_Solar_System_Explorer.md` and the
pointer index in `docs/architecture/README.md`.

## Astronomy Engine

See `docs/astronomy/README.md` (populated once the astronomy package ships).

## Coordinate Systems

Documented alongside the astronomy engine once it exists; see ADR-008
(explicit reference frames) and ADR-009 (explicit units) in
`docs/decisions/`.

## Accuracy

No accuracy claims are made at this stage (ADR-020: scientific claims
require evidence). Validation results will be published in
`docs/validation/` once the astronomy engine is implemented and tested
against reference ephemerides.

## Validation

See `docs/validation/README.md`.

## Rendering

Not yet implemented; see ADR-010 and ADR-011 in `docs/decisions/` for the
governing decisions once the renderer package ships.

## Development

Requirements: Node 20 LTS (see `.nvmrc`), pnpm (see `packageManager` in
`package.json`).

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

### Workspace layout

- `apps/web` — Vite + React client
- `apps/api` — Node/Express API (server code lands in a later ticket)
- `packages/astronomy` — astronomy/ephemeris calculations (no rendering, UI or HTTP dependencies)
- `packages/renderer` — Three.js scene code (no React or Express dependencies)
- `packages/shared` — cross-cutting types, constants and zod schemas
- `scripts/` — repository tooling, including the dependency-boundary checker
- `tests/` — cross-package tests (boundary checks, E2E)

Package boundaries are load-bearing (ADR-001/002/003) and are enforced by
TypeScript compiler options, ESLint rules and `pnpm check:boundaries`; see
`docs/decisions/` for the ADRs and the implementation report for this ticket
for the enforcement design.

## Testing

- `pnpm test` — Vitest unit tests (per-package projects)
- `pnpm test:e2e` — Playwright end-to-end tests. Playwright's `webServer`
  runs `vite preview`, which serves `apps/web/dist`; run `pnpm build` first
  on a clean checkout (`pnpm build && pnpm test:e2e`), otherwise the preview
  server has nothing to serve. On a clean checkout you must also install
  Playwright's browsers once: `pnpm exec playwright install --with-deps
chromium` (CI does this automatically; a fresh local container will not
  have downloaded them and `pnpm test:e2e` fails with `browserType.launch:
Executable doesn't exist at …` until you do).
- `pnpm check:boundaries` — dependency-boundary graph check

## AI Development Workflow

This repository is developed via a gated multi-agent harness (Architect,
Developer, Security, QA, Performance, Reviewer, Documentation, DevOps); see
`docs/005_AI_Harness_Implementation_Protocol.md`.

## Roadmap

See `docs/007_Roadmap_and_Milestones.md`.

## Scientific References

See `docs/002_Astronomy_Domain_Specification.md` and the reference list it
cites; validation references (e.g. JPL Horizons) are recorded per ADR-007
and ADR-019.
