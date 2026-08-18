# Architecture Document 003 — Express API Specification

**Status:** Proposed  
**Version:** 1.0  
**Depends on:** Documents 001–002

# 1. Purpose

Define the HTTP boundary between the React application and the astronomy engine.

The API is an adapter. It must not become the astronomy domain itself.

# 2. Design Principles

- versioned API
- explicit units
- explicit reference frames
- explicit time interpretation
- strict input validation
- deterministic results
- stable schemas
- structured errors
- no Three.js types
- no React types
- no database

# 3. Base URL

Development:

    /api/v1

Production deployment may place the API behind a domain-specific reverse proxy.

# 4. Health

    GET /api/v1/health

Response:

    {
      "status": "ok",
      "version": "...",
      "apiVersion": "v1"
    }

# 5. Supported Bodies

    GET /api/v1/bodies

Returns body metadata and supported calculation models.

# 6. Ephemeris Endpoint

    GET /api/v1/ephemeris

Required query parameters:

    instant
    frame

Optional:

    bodies

Example:

    GET /api/v1/ephemeris
      ?instant=2026-08-14T22:00:00Z
      &frame=HELIOCENTRIC_ECLIPTIC
      &bodies=SUN,EARTH,MARS

# 7. Instant Input

ISO-8601 timestamps are preferred.

Example:

    2026-08-14T22:00:00Z

Local civil time must not be accepted without an explicit timezone/offset.

Bad:

    2026-08-14 22:00

Good:

    2026-08-14T22:00:00-04:00

The server must normalize the request into the astronomy package's time representation.

# 8. Response Contract

Conceptual:

    {
      "instant": {
        "iso": "...",
        "julianDate": 246....,
        "scale": "UTC"
      },
      "referenceFrame": "HELIOCENTRIC_ECLIPTIC",
      "model": "SCHLYTER_PLANETS_V1",
      "bodies": [
        {
          "id": "EARTH",
          "position": {
            "x": 0,
            "y": 0,
            "z": 0,
            "unit": "AU"
          },
          "distance": {
            "value": 1,
            "unit": "AU"
          }
        }
      ]
    }

The exact JSON schema should be generated from shared TypeScript contracts and runtime validation schemas.

# 9. Frame Parameter

Allowed values must be enumerated.

Initial:

    HELIOCENTRIC_ECLIPTIC
    GEOCENTRIC_ECLIPTIC
    GEOCENTRIC_EQUATORIAL

Unknown frames return 400.

# 10. Body Parameter

Comma-separated body IDs are acceptable for GET.

The server should reject:

- unknown body
- duplicate body
- excessively large body lists

# 11. Future Observer Endpoint

Reserved:

    GET /api/v1/observer/ephemeris

Potential inputs:

    instant
    latitude
    longitude
    altitude
    bodies

This endpoint should not be implemented in V1 unless the observer subsystem is ready.

# 12. Future Batch Endpoint

Potential:

    POST /api/v1/ephemeris/batch

Useful for orbit generation and validation.

It should accept an explicit list of instants rather than an ambiguous "generate everything" request.

# 13. Error Schema

Standard:

    {
      "error": {
        "code": "INVALID_REFERENCE_FRAME",
        "message": "Unsupported reference frame.",
        "details": {
          "provided": "...",
          "supported": [...]
        }
      }
    }

Do not expose stack traces in production.

# 14. HTTP Status Codes

200 — success

400 — malformed or invalid input

404 — unknown route/body where appropriate

422 — semantically invalid astronomy request if adopted by the API conventions

429 — rate limited

500 — unexpected internal error

503 — dependency unavailable, if a future external dependency exists

# 15. Validation

Use runtime schemas at the HTTP boundary.

Validate:

- timestamps
- timezone offsets
- body IDs
- reference frames
- date ranges
- numeric observer values in future versions

TypeScript compile-time types are not sufficient for HTTP input.

# 16. Caching

No cache required initially.

Potential future cache key:

    model + instant + frame + bodies

Do not cache before profiling.

# 17. Determinism

For a fixed model version, request, and configuration:

    same request → same response

The API must not include:

- random IDs
- current server time
- nondeterministic ordering

unless explicitly part of metadata.

# 18. API Security

Implement:

- CORS allowlist
- request size limits
- rate limiting if publicly exposed
- security headers
- strict query validation
- dependency auditing

No authentication is required for V1.

# 19. Express Structure

Recommended:

    api/src/
      app.ts
      server.ts
      routes/
      controllers/
      schemas/
      middleware/
      errors/
      serializers/

Controllers should call astronomy services rather than implementing equations.

# 20. Dependency Direction

    Express
       ↓
    API Services
       ↓
    Astronomy Package

Never:

    Astronomy Package
       ↓
    Express

# 21. API Tests

Required:

- happy path
- invalid timestamp
- missing timestamp
- invalid frame
- invalid body
- multiple bodies
- empty body list
- unsupported date range
- numerical error translation
- response schema validation

# 22. API Acceptance Criteria

- no astronomy equations in route handlers
- every response has explicit frame and model
- every scientific quantity has a unit
- invalid requests fail predictably
- OpenAPI documentation can be generated later without redesigning the contract
