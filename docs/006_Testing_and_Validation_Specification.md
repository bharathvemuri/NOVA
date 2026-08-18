# Architecture Document 006 — Testing and Scientific Validation Specification

**Status:** Proposed  
**Version:** 1.0  
**Depends on:** Documents 001–005

# 1. Purpose

Define how correctness is demonstrated.

The project has two different notions of correctness:

1. Software correctness.
2. Scientific/model correctness.

Both are required.

# 2. Testing Pyramid

    E2E
      ↑
    Integration
      ↑
    Domain
      ↑
    Unit
      ↑
    Numerical fixtures

# 3. Unit Tests

Required for:

- angle conversion
- angle normalization
- vector math
- Julian Date
- calendar conversion
- Kepler solver
- spherical/cartesian conversion
- rotations
- interpolation

# 4. Property Tests

Where practical, test mathematical invariants.

Examples:

    normalize(normalize(x)) = normalize(x)

    magnitude(scale(v,k)) = abs(k)*magnitude(v)

    cartesianToSpherical(sphericalToCartesian(p))
        ≈ p

Coordinate round trips must use documented tolerances.

# 5. Domain Tests

Test:

- each supported body
- each supported reference frame
- each supported model
- model-specific perturbations
- derived distances
- geocentric subtraction

# 6. Reference Fixtures

Maintain a versioned dataset:

    tests/fixtures/ephemeris/

Each fixture should record:

- source
- retrieval date
- target body
- observer/center
- frame
- epoch
- time scale
- expected values
- tolerance
- source configuration

# 7. JPL Horizons Validation

Horizons supports vector, observer, and orbital-element ephemerides.

Use it to generate reference data.

Do not query Horizons on every CI run.

Instead:

    Horizons
       ↓
    fixture generation
       ↓
    committed validation data
       ↓
    CI regression

Regenerate fixtures intentionally.

# 8. Validation Categories

### Position

Compare Cartesian coordinates.

### Distance

Compare radial distance.

### Angular

Compare angular separation.

### Observer

Future: compare RA/DEC/Az/El.

# 9. Angular Error

For two vectors A and B:

    theta = acos(
      dot(A,B) / (|A||B|)
    )

Clamp the dot product into [-1,1] before acos.

Report angular error in arcseconds or arcminutes.

# 10. Distance Error

Report:

- absolute error
- relative error

Do not use relative error when the true quantity is near zero without a defined alternative.

# 11. Tolerances

Tolerances must be attached to the model.

Example:

    SCHLYTER_PLANETS_V1:
      angular:
        warning: ...
        failure: ...

Do not create one universal tolerance for every body.

# 12. Test Dates

Include:

- Schlyter's worked example date
- several dates across the supported range
- current dates
- future dates
- leap years
- year boundaries
- high-interest planetary configurations

# 13. Regression Tests

Every scientific bug becomes a regression fixture.

Workflow:

    bug
      ↓
    reproduce
      ↓
    fixture
      ↓
    fix
      ↓
    permanent regression test

# 14. Cross-Frame Tests

Test:

    heliocentric
        ↓
    geocentric
        ↓
    equatorial

against direct/reference results where available.

# 15. Lunar Tests

Moon tests must include:

- ordinary dates
- near perigee
- near apogee
- new moon
- full moon
- high-latitude lunar positions
- topocentric comparisons in future observer implementation

# 16. Numerical Stability

Test:

- angle wraparound
- near-zero coordinates
- poles
- eccentricity near zero
- high eccentricity
- large positive time
- large negative time
- floating-point boundary behavior

# 17. API Tests

Validate:

- schema
- errors
- deterministic ordering
- frame metadata
- units
- model metadata

# 18. Renderer Tests

At minimum:

- coordinate adapter
- scale transformations
- selection
- tracking target
- lifecycle/disposal

Full pixel-perfect rendering tests are optional until the visual system stabilizes.

# 19. E2E Tests

Core scenarios:

1. application loads
2. default solar system appears
3. date changes
4. time advances
5. time reverses
6. planet is selected
7. camera focuses
8. tracking works
9. orbital paths toggle
10. visualization mode toggles

# 20. Performance Tests

Measure:

- initial load
- first render
- frame time
- calculation latency
- orbit generation
- memory over extended playback

# 21. Scientific Validation Report

Create:

    docs/validation/

Reports should include:

- model
- test date range
- bodies
- frames
- reference source
- error statistics
- maximum errors
- known failures
- interpretation

# 22. Accuracy Claims

Never infer accuracy from a handful of dates.

Report:

- sample size
- distribution
- maximum error
- worst-case date
- body
- reference frame

# 23. CI Gates

Required:

    typecheck
    lint
    unit tests
    domain tests
    API tests

Numerical regression tests should be mandatory.

Full E2E can run in a separate CI stage if browser execution is expensive.

# 24. Validation Acceptance Criteria

The scientific engine is accepted only when:

- required fixtures pass
- no unexplained large errors exist
- tolerances are documented
- model limitations are documented
- reference source is reproducible
- numerical regressions are protected
