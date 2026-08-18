# Architecture Document 002 — Astronomy Domain Specification

**Status:** Proposed  
**Version:** 1.0  
**Depends on:** Architecture 001  
**Purpose:** Define the scientific domain contract before implementation.

## 1. Scope

The astronomy package is the authoritative computational layer. It converts an astronomical instant into deterministic celestial states in explicitly named reference frames.

Primary model source for the first implementation: Paul Schlyter's *Computing planetary positions* tutorial. The tutorial explicitly covers time, coordinate conversion, lunar position and perturbations, planetary orbital elements, heliocentric positions, precession, and geocentric positions, with a stated target of about 1–2 arcminutes for the 20th and 21st centuries.

The implementation must reproduce the equations transparently, then validate them independently.

## 2. Scientific Vocabulary

### Instant

A unique point on the time axis. A civil date/time is not an instant until its time-zone interpretation is known.

### Epoch

A reference instant associated with a model, orbital element set, frame, or physical constant.

### State

A position, and optionally velocity, associated with an instant and reference frame.

### Reference frame

The origin, orientation, axes, and conventions used to describe a state.

### Ephemeris

A model or data source that provides celestial states as a function of time.

## 3. Time Model

The domain must distinguish:

- civil calendar date/time
- UTC representation
- Julian Date
- TT / TDB where required by a higher-precision model
- simulation time

The first Schlyter-compatible implementation may use its documented day-number approach for the supported accuracy target, but the domain API must not bake that assumption into the public type system.

Canonical internal representation:

    AstronomicalInstant {
      julianDate: number
      scale: TimeScale
    }

Supported scales should be explicit enums.

Do not use JavaScript Date as the sole astronomy representation.

## 4. Julian Date

Required operations:

    calendarToJulianDate()
    julianDateToCalendar()
    instantToJulianDate()
    julianDateDifference()

Requirements:

- Gregorian calendar handling must be explicit.
- Fractional days must be preserved.
- Round-trip tests are required.
- Boundary and leap-year tests are required.
- Numeric precision must be documented.

The Schlyter tutorial defines its day number as:

    d = JD - 2451543.5

This is a model-specific derived quantity, not a replacement for the domain's full Julian Date.

## 5. Units

Canonical domain units:

- angles: radians internally
- distances: AU for solar-system model coordinates
- time: days where an algorithm explicitly requires day-based propagation
- velocity: AU/day internally where supported

Public convenience representations may include degrees, km, km/s, and days, but unit conversion must be explicit.

Never expose an unnamed numeric scientific quantity.

## 6. Angle API

Required:

- normalizeRadians0To2Pi
- normalizeRadiansMinusPiToPi
- degreesToRadians
- radiansToDegrees
- hoursToRadians
- radiansToHours

Normalization must be tested for:

- zero
- positive overflow
- negative overflow
- exact 2π
- very large values

## 7. Vector Model

The astronomy package must have its own immutable vector type.

    Vector3 {
      x: number
      y: number
      z: number
    }

Required operations:

- add
- subtract
- scale
- magnitude
- normalize
- dot
- cross
- distance

Do not import Three.js.

## 8. Coordinate Systems

Initial supported coordinate systems:

### Ecliptic Cartesian

    x = toward reference longitude zero
    y = toward +90° ecliptic longitude
    z = north of ecliptic

### Ecliptic spherical

    longitude
    latitude
    radius

### Equatorial Cartesian

Axes aligned with Earth's equatorial plane and reference equinox.

### Equatorial spherical

    right ascension
    declination
    distance

### Horizontal

Future observer subsystem:

    azimuth
    altitude
    distance

Every conversion must declare its source and destination frame.

## 9. Reference Frames

V1 minimum:

- HELIOCENTRIC_ECLIPTIC
- GEOCENTRIC_ECLIPTIC
- GEOCENTRIC_EQUATORIAL

Future:

- TOPOCENTRIC_EQUATORIAL
- TOPOCENTRIC_HORIZONTAL
- ICRF/J2000-aligned states where the selected model supports them

Reference-frame names must be stable identifiers.

## 10. Orbital Elements

Represent the classical orbital elements as a typed structure:

    OrbitalElements {
      semiMajorAxis
      eccentricity
      inclination
      longitudeOfAscendingNode
      argumentOfPerihelion
      meanAnomalyAtEpoch
      epoch
    }

If the source model expresses elements as time-varying coefficients, preserve those coefficients rather than precomputing a single value.

## 11. Planetary Calculation Pipeline

For an elliptic body:

    instant
      ↓
    model day number
      ↓
    time-dependent orbital elements
      ↓
    mean anomaly
      ↓
    normalize anomaly
      ↓
    solve Kepler equation
      ↓
    eccentric anomaly
      ↓
    true anomaly + radius
      ↓
    orbital-plane coordinates
      ↓
    ecliptic orientation transform
      ↓
    heliocentric state

Geocentric states are derived from the appropriate heliocentric states.

## 12. Kepler Equation

For elliptic motion:

    M = E - e sin(E)

The solver must:

- accept radians internally
- normalize M
- define convergence tolerance
- define maximum iterations
- return or internally record convergence status
- fail deterministically when convergence cannot be achieved

Newton-Raphson is acceptable for the initial implementation, provided the implementation has safe handling for difficult cases.

## 13. Sun and Earth

The Schlyter tutorial uses an apparent solar orbit as a convenient representation of Earth's heliocentric orbit.

The implementation must distinguish:

- Sun apparent geocentric position
- Earth heliocentric position
- Earth-centered positions

Do not label an apparent solar position as a physical barycentric Sun state.

## 14. Planetary Perturbations

The first planetary model should implement the tutorial's stated perturbation corrections where required for the target accuracy.

Perturbation code must be isolated by model/body.

Avoid hidden correction terms.

Every correction should have:

- source reference
- mathematical description
- tests
- known validity range

## 15. Lunar Model

Moon calculations are a separate subsystem.

Required stages:

1. base lunar orbital state
2. perturbation corrections
3. geocentric state
4. optional topocentric correction

The tutorial specifically notes that Moon calculations require perturbation corrections for the intended accuracy and that topocentric effects are especially important for the Moon.

## 16. Precession

Precession must be an explicit coordinate transformation.

Do not mix precession into every body model.

The API should permit:

    precess(state, fromEpoch, toEpoch)

The supported model and validity range must be documented.

## 17. State Model

Conceptual:

    CelestialState {
      bodyId
      instant
      referenceFrame
      position
      velocity?
      distance
      sphericalCoordinates?
      modelId
      accuracy
    }

Accuracy metadata may include:

    AccuracyMetadata {
      model
      expectedAngularAccuracy
      supportedDateRange
      validated
    }

## 18. Body Registry

Use a typed registry.

Required identifiers:

    SUN
    MERCURY
    VENUS
    EARTH
    MOON
    MARS
    JUPITER
    SATURN
    URANUS
    NEPTUNE
    PLUTO

The registry should contain metadata separately from algorithms.

## 19. Body Metadata

Metadata may contain:

- display name
- type
- physical radius
- mass if needed
- color/texture identifier
- parent body
- orbital model
- supported frames

Physical metadata must not be confused with calculated state.

## 20. Astronomy Engine Interface

Conceptual:

    getState({
      body,
      instant,
      referenceFrame
    })

    getStates({
      bodies,
      instant,
      referenceFrame
    })

    transformState({
      state,
      targetFrame
    })

The engine must be deterministic and side-effect free.

## 21. Error Contracts

Domain errors:

- InvalidInstantError
- UnsupportedDateRangeError
- UnsupportedBodyError
- UnsupportedReferenceFrameError
- NumericalConvergenceError
- InvalidObserverError

Errors should identify the failing operation without exposing implementation internals.

## 22. Accuracy Contract

The project must publish model-specific accuracy.

Initial target:

- approximately 1–2 arcminutes for the major planetary model within its documented range, subject to validation

This is an engineering target, not a claim that every body and every date meets it.

Future high-precision models may be added behind the same interface.

## 23. Model Versioning

Every state should be attributable to a model version.

Example:

    modelId: "SCHLYTER_PLANETS_V1"

Changing equations or constants requires a model-version change when results may differ.

This is essential for reproducible regression tests.

## 24. Scientific References

Primary:

- Paul Schlyter, *Computing planetary positions — a tutorial with worked examples*

Validation/reference:

- JPL Horizons
- NASA/JPL NAIF SPICE documentation

Horizons supports observer, vector, and orbital-element ephemerides. SPICE provides ephemeris kernels and time/frame tooling. These should be treated as reference/validation infrastructure rather than implicit runtime dependencies for V1.

## 25. Acceptance Criteria

The domain specification is satisfied when:

- all public scientific values have defined units
- every state has a reference frame
- time scale is explicit
- body IDs are stable
- model version is explicit
- coordinate transformations are isolated
- numerical algorithms are deterministic
- accuracy claims are measurable
- lunar calculations are independently testable
- Three.js is absent from the package
