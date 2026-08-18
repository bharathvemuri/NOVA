# Architecture Document 008 — Architecture Decision Record Index

This document tracks decisions that must remain explicit throughout development.

## ADR-001 — Astronomy/Rendering Separation

Decision:

Astronomy calculations and Three.js rendering are separate packages.

Reason:

Scientific correctness must not depend on presentation technology.

Status: Accepted

## ADR-002 — TypeScript

Decision:

Use TypeScript throughout application and domain code.

Reason:

Strong domain contracts and safer AI-assisted refactoring.

Status: Accepted

## ADR-003 — Monorepo

Decision:

Use a workspace-based monorepo.

Reason:

Astronomy, API, renderer, and shared contracts evolve together while retaining package boundaries.

Status: Accepted

## ADR-004 — Express

Decision:

Use Node.js + Express for the API.

Reason:

Simple, familiar HTTP boundary with minimal framework coupling.

Status: Accepted

## ADR-005 — No Database

Decision:

No persistence layer for V1.

Reason:

The application state is deterministically derived from user input and scientific models.

Status: Accepted

## ADR-006 — Self-Contained Runtime Astronomy

Decision:

Normal rendering does not depend on a remote ephemeris API.

Reason:

Determinism, latency, offline capability, reproducibility, and independence from third-party availability.

Status: Accepted

## ADR-007 — Horizons for Validation

Decision:

JPL Horizons is a validation/reference system rather than a required runtime service.

Reason:

Horizons provides vector, observer, and orbital-element ephemerides suitable for comparison.

Status: Accepted

## ADR-008 — Explicit Reference Frames

Decision:

Every astronomical state must have an explicit reference frame.

Reason:

A coordinate triple without a frame is scientifically ambiguous.

Status: Accepted

## ADR-009 — Explicit Units

Decision:

Every scientific quantity must have documented units.

Reason:

Prevents silent AU/km/degree/radian errors.

Status: Accepted

## ADR-010 — Three.js Coordinate Adapter

Decision:

Astronomy coordinates are converted into renderer coordinates through a dedicated adapter.

Reason:

Three.js scene conventions must not leak into scientific calculations.

Status: Accepted

## ADR-011 — Scientific vs Visualization Scale

Decision:

Rendering scale is separate from physical astronomical state.

Reason:

Planets are difficult to see at physically proportional size/distance simultaneously.

Status: Accepted

## ADR-012 — Model Versioning

Decision:

Astronomy models have explicit IDs/versions.

Reason:

Scientific results must remain reproducible after algorithm changes.

Status: Accepted

## ADR-013 — Separate Lunar Model

Decision:

Moon calculations are implemented separately from major-planet models.

Reason:

Lunar motion requires different corrections and has materially different geocentric/topocentric behavior.

Status: Accepted

## ADR-014 — Astrology Isolation

Decision:

Future astrology functionality is a separate package that consumes astronomy outputs.

Reason:

Astronomical computation and astrological interpretation are different domains.

Status: Accepted

## ADR-015 — AI Agent Boundaries

Decision:

AI agents are constrained by package ownership, acceptance criteria, tests, and review gates.

Reason:

Prevent uncontrolled cross-layer changes and unverifiable scientific code.

Status: Accepted

## ADR-016 — Validation Before Visual Polish

Decision:

The astronomy engine must be validated before the application is treated as scientifically complete.

Reason:

Visual correctness does not demonstrate numerical correctness.

Status: Accepted

## ADR-017 — Deterministic Simulation Clock

Decision:

Simulation time is independent of wall-clock time.

Reason:

Allows reproducible animation, testing, reverse time, and variable playback speed.

Status: Accepted

## ADR-018 — No N-Body Simulation in V1

Decision:

V1 uses ephemeris/orbital models rather than numerical gravitational integration.

Reason:

The product is an astronomical visualization, not a general physics simulator.

Status: Accepted

## ADR-019 — Reference Data Is Test Infrastructure

Decision:

External ephemeris results may be stored as versioned validation fixtures.

Reason:

CI must not depend on network availability.

Status: Accepted

## ADR-020 — Scientific Claims Require Evidence

Decision:

Accuracy claims require validation data and documented scope.

Reason:

"Accurate" is not meaningful without a model, date range, frame, metric, and tolerance.

Status: Accepted
