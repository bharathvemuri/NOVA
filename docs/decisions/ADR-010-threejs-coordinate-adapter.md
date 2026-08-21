# ADR-010 — Three.js Coordinate Adapter

Status: Accepted

## Decision

Astronomy coordinates are converted into renderer coordinates through a
dedicated adapter.

## Reason

Three.js scene conventions must not leak into scientific calculations.

Source: docs/008_ADR_Index.md:113-123
