# Architecture Document 001 — Astronomical 3D Solar-System Explorer

**Status:** Proposed  
**Version:** 1.0  
**Project Type:** Personal / Open-source GitHub portfolio project  
**Primary Goal:** Build a scientifically rigorous, interactive 3D solar-system explorer driven by date/time, with an architecture that can later support observer-sky visualization and a separate astrology layer.

---

# 1. Executive Summary

This project is an interactive web application that computes celestial positions for a supplied date/time and renders the resulting solar-system state in Three.js.

The initial product is a **Solar-System Explorer** rather than a horoscope application. The system must be designed so that astronomy is the authoritative source of truth and rendering is a consumer of astronomical state.

The application will support:

- Sun
- Planets
- Earth's Moon
- Future expansion to additional natural satellites
- Heliocentric visualization
- Geocentric visualization
- Date/time selection
- Continuous time animation
- Forward/reverse time
- Variable time acceleration
- Free camera orbit, pan, and zoom
- Planet/celestial-body selection
- Camera tracking/follow mode
- Orbital paths
- Scientific scale
- Visualization scale
- Detailed body information
- Reusable TypeScript astronomy package
- Automated numerical validation
- No application database or persistence layer

The architecture must also leave explicit extension points for:

1. A time-machine experience.
2. An observer/planetarium experience using latitude, longitude, altitude, and topocentric coordinates.
3. A future astrology package that consumes astronomical positions but remains completely separate from the astronomy engine.

---

# 2. Guiding Principles

## 2.1 Astronomy is the source of truth

The astronomy engine determines where celestial bodies are.

Three.js never determines astronomical positions.

Correct:

    Input Date/Time
          ↓
    Astronomy Engine
          ↓
    Celestial State
          ↓
    Renderer
          ↓
    Three.js Scene

Incorrect:

    Input Date/Time
          ↓
    Three.js
          ↓
    "Move Mars by N pixels"

---

## 2.2 Separate scientific computation from presentation

The astronomy package must have no dependency on:

- React
- Three.js
- Express
- browser APIs
- DOM APIs
- rendering concepts

It should be usable independently from the web application.

---

## 2.3 Separate astronomy from astrology

The astronomy engine should expose physical/observational quantities.

Examples:

- position
- velocity
- distance
- right ascension
- declination
- ecliptic longitude
- ecliptic latitude
- altitude
- azimuth
- body orientation where supported

A future astrology package can interpret those results.

The astronomy package must never contain:

- zodiac-sign interpretation
- personality claims
- natal-chart interpretation
- astrological houses
- aspects
- horoscope text

Future architecture:

    Astronomy Package
           ↓
    Astronomical State
           ↓
    Astrology Package
           ↓
    Astrological Interpretation

---

## 2.4 Precision must be measurable

"Accurate" is not a sufficient engineering requirement.

Every numerical subsystem should have:

- a defined accuracy target
- a defined reference frame
- a defined time scale
- defined units
- validation fixtures
- documented known limitations

The project should maintain numerical regression tests.

---

## 2.5 Use explicit units

Internal scientific values must never rely on undocumented units.

Preferred conventions:

- angles: radians internally
- distances: astronomical units for solar-system scale calculations where appropriate
- time: explicit Julian Date / appropriate time-scale representation
- velocity: AU/day or km/s, depending on API boundary
- rendering coordinates: Three.js scene units, explicitly documented

Conversion functions must be named and centralized.

---

## 2.6 Avoid premature optimization

Correctness comes before rendering performance.

First establish:

1. mathematically correct calculations
2. validation
3. clean APIs
4. rendering correctness
5. animation
6. performance optimization

---

# 3. Product Scope

## 3.1 Version 1 scope

### Celestial bodies

Required:

- Sun
- Mercury
- Venus
- Earth
- Mars
- Jupiter
- Saturn
- Uranus
- Neptune
- Earth's Moon

Pluto should be supported as a separate dwarf-planet body if its ephemeris model is sufficiently defined.

Moon support must be treated as its own subsystem because lunar motion requires perturbation handling and observer parallax becomes significant.

---

## 3.2 Coordinate views

V1 must support:

### Heliocentric

Origin:

    Sun

Positions describe bodies relative to the Sun.

### Geocentric

Origin:

    Earth center

Positions describe bodies relative to Earth's center.

The UI should make the selected reference frame explicit.

---

## 3.3 Time

V1 must support:

- arbitrary supported date/time input
- current time
- paused state
- forward playback
- reverse playback
- adjustable simulation speed
- time jumping
- date/time display
- deterministic rendering for a given astronomical instant

The simulation clock must be independent from wall-clock time.

---

## 3.4 Rendering modes

### Scientific mode

Preserve physically meaningful relative distances and sizes as closely as practical.

### Visualization mode

Use controlled visual exaggeration for:

- planet radius
- labels
- orbital paths
- moons
- selection indicators

The astronomical state itself must remain unchanged between modes.

---

## 3.5 Camera

Required:

- orbit
- pan
- zoom
- smooth target transitions
- body focus
- body tracking
- free camera mode
- reset/home view

Tracking must not modify the astronomical state.

---

## 3.6 Interaction

Clicking a celestial body must:

1. identify the body
2. select it
3. display body information
4. optionally animate the camera toward it
5. allow tracking/follow mode

Selection state and camera state must be separate.

---

# 4. Non-Goals for V1

The following are intentionally deferred:

- user accounts
- database
- saved simulations
- cloud synchronization
- social features
- multiplayer
- real-time collaboration
- astrological interpretation
- natal charts
- houses
- zodiac interpretation
- constellation rendering
- complete star catalog
- spacecraft simulation
- collision simulation
- N-body numerical integration
- gravitational simulation from first principles

The application is an **ephemeris-driven visualization**, not a general-purpose physics simulator.

---

# 5. High-Level Architecture

    ┌───────────────────────────────────────────────────────┐
    │                    React Application                  │
    │                                                       │
    │  Timeline   Controls   Body Info   Settings   UI     │
    └──────────────────────────┬────────────────────────────┘
                               │
                               ▼
    ┌───────────────────────────────────────────────────────┐
    │                Visualization Layer                    │
    │                                                       │
    │ Three.js Scene                                        │
    │ Camera / Controls                                     │
    │ Planet Meshes                                         │
    │ Orbits                                                │
    │ Labels                                                │
    │ Tracking                                              │
    │ Scale Transform                                       │
    └──────────────────────────┬────────────────────────────┘
                               │
                         Astronomical State
                               │
                               ▼
    ┌───────────────────────────────────────────────────────┐
    │                  Astronomy Client                     │
    └──────────────────────────┬────────────────────────────┘
                               │
                         HTTP / JSON
                               │
                               ▼
    ┌───────────────────────────────────────────────────────┐
    │                 Node.js + Express API                 │
    └──────────────────────────┬────────────────────────────┘
                               │
                               ▼
    ┌───────────────────────────────────────────────────────┐
    │                  Astronomy Package                    │
    │                                                       │
    │ Time                                                  │
    │ Orbital Elements                                      │
    │ Kepler Solver                                         │
    │ Planetary Models                                      │
    │ Lunar Model                                           │
    │ Coordinate Transformations                            │
    │ Reference Frames                                      │
    │ Observer Calculations                                 │
    │ Validation                                            │
    └───────────────────────────────────────────────────────┘

---

# 6. Recommended Repository Structure

Use a monorepo.

    planetarium/
    │
    ├── apps/
    │   ├── web/
    │   │   ├── src/
    │   │   │   ├── app/
    │   │   │   ├── components/
    │   │   │   ├── features/
    │   │   │   ├── scene/
    │   │   │   ├── state/
    │   │   │   └── services/
    │   │   └── package.json
    │   │
    │   └── api/
    │       ├── src/
    │       │   ├── routes/
    │       │   ├── controllers/
    │       │   ├── middleware/
    │       │   └── app.ts
    │       └── package.json
    │
    ├── packages/
    │   ├── astronomy/
    │   │   ├── src/
    │   │   │   ├── bodies/
    │   │   │   ├── coordinates/
    │   │   │   ├── ephemeris/
    │   │   │   ├── math/
    │   │   │   ├── observers/
    │   │   │   ├── time/
    │   │   │   ├── models/
    │   │   │   └── index.ts
    │   │   ├── tests/
    │   │   └── package.json
    │   │
    │   ├── renderer/
    │   │   ├── src/
    │   │   │   ├── bodies/
    │   │   │   ├── camera/
    │   │   │   ├── coordinates/
    │   │   │   ├── orbits/
    │   │   │   ├── scaling/
    │   │   │   └── scene/
    │   │   └── package.json
    │   │
    │   └── shared/
    │       ├── src/
    │       │   ├── types/
    │       │   ├── constants/
    │       │   └── schemas/
    │       └── package.json
    │
    ├── docs/
    │   ├── architecture/
    │   ├── astronomy/
    │   ├── decisions/
    │   └── validation/
    │
    ├── scripts/
    ├── tests/
    ├── package.json
    ├── tsconfig.json
    ├── README.md
    └── LICENSE

---

# 7. Package Responsibilities

## 7.1 astronomy

The core scientific library.

Responsibilities:

- calendar conversion
- Julian Date
- time-scale representation
- orbital elements
- Kepler equation solving
- heliocentric positions
- geocentric positions
- lunar positions
- coordinate transformations
- observer calculations
- ephemeris interfaces
- validation helpers

Must not import:

- Three.js
- React
- Express
- browser APIs

---

## 7.2 renderer

The visualization engine.

Responsibilities:

- Three.js scene construction
- celestial-body meshes
- orbital-path rendering
- camera control
- tracking
- labels
- selection visualization
- scale transformations
- lighting
- visual interpolation

Must not calculate astronomical positions.

---

## 7.3 shared

Contains shared contracts that are safe for application-level use.

Examples:

- BodyId
- ReferenceFrame
- CoordinateSystem
- SimulationTime
- API response types
- validation schemas

Do not put astronomy algorithms here.

---

## 7.4 API

Express adapter around the astronomy package.

Responsibilities:

- request validation
- API routing
- serialization
- error handling
- rate limiting if eventually needed
- HTTP-specific concerns

The API should remain thin.

---

# 8. Astronomy Engine Design

The astronomy package should be organized around explicit domain concepts.

Example:

    AstronomyEngine
        ├── Time
        ├── Bodies
        ├── Ephemerides
        ├── Coordinates
        ├── ReferenceFrames
        ├── Observers
        └── Validation

Avoid creating a giant `calculatePlanetPosition()` function.

---

# 9. Time Architecture

Time is foundational.

The system must distinguish:

- user-entered civil time
- UTC
- Julian Date
- simulation time
- dynamical/ephemeris time where required
- sidereal time where required for observer calculations

The public API should not silently assume a time scale.

Conceptually:

    Civil Date/Time
          ↓
    Time Interpretation
          ↓
    UTC / Instant
          ↓
    Astronomical Time Representation
          ↓
    Ephemeris Calculation

The project should document exactly which calculations use which time scale.

Do not duplicate time conversion logic across body models.

---

# 10. Julian Date

Implement Julian Date conversion as a foundational module.

Required capabilities:

- Gregorian calendar → JD
- JD → Gregorian calendar
- fractional day
- date/time validation
- supported date range
- deterministic round-trip tests

The Stjarnhimlen tutorial uses a day count derived from Julian Date with:

    d = JD - 2451543.5

This is useful for reproducing the tutorial's algorithms, but the implementation should preserve the full Julian Date internally rather than making `d` the only time representation.

---

# 11. Mathematical Foundations

Implement reusable numerical primitives.

Required:

- degrees ↔ radians
- angle normalization
- `atan2`
- spherical ↔ rectangular
- vector magnitude
- vector normalization
- dot product
- cross product
- rotation matrices
- matrix/vector transformations
- Kepler equation solver
- interpolation
- numerical tolerance helpers

All functions should be deterministic and independently tested.

---

# 12. Orbital Elements

Represent orbital elements explicitly.

Core values:

- semi-major axis
- eccentricity
- inclination
- longitude of ascending node
- argument of perihelion
- mean anomaly
- epoch
- mean motion

The Stjarnhimlen model provides time-dependent orbital elements for the major planets and demonstrates deriving heliocentric rectangular coordinates from them.

Represent these as typed data rather than anonymous arrays.

Example conceptual type:

    OrbitalElements {
        semiMajorAxis
        eccentricity
        inclination
        ascendingNode
        argumentOfPerihelion
        meanAnomaly
        epoch
    }

---

# 13. Kepler Solver

For elliptic orbits:

    M = E - e sin(E)

The solver should:

- normalize mean anomaly
- use a deterministic initial estimate
- iterate until tolerance is met
- enforce maximum iterations
- return convergence metadata if useful
- fail explicitly if convergence cannot be achieved

Do not use a fixed iteration count without validating convergence.

Tests should cover:

- near-circular orbits
- high-eccentricity orbits
- perihelion
- aphelion
- negative/large anomalies
- boundary normalization

---

# 14. Planetary Position Pipeline

Conceptual pipeline:

    Input Instant
        ↓
    Ephemeris Parameters
        ↓
    Orbital Elements
        ↓
    Mean Anomaly
        ↓
    Kepler Equation
        ↓
    Eccentric Anomaly
        ↓
    True Anomaly
        ↓
    Radius
        ↓
    Orbital Plane Coordinates
        ↓
    Heliocentric Ecliptic Coordinates
        ↓
    Reference Frame Transformation
        ↓
    Desired Output

This pipeline should be represented explicitly in code.

---

# 15. Heliocentric Coordinates

The primary internal solar-system representation should be a Cartesian state.

Recommended conceptual state:

    CelestialState {
        bodyId
        epoch
        referenceFrame
        position
        velocity?
        distance
        coordinates
        accuracyMetadata
    }

Position:

    Vector3 {
        x
        y
        z
        unit
    }

Do not use Three.js `Vector3` inside the astronomy package.

Create a scientific vector type.

---

# 16. Geocentric Coordinates

Geocentric position is derived from heliocentric positions:

    Planet_earth_relative =
        Planet_heliocentric - Earth_heliocentric

The Earth position must therefore be treated as part of the same state computation.

The API should make the reference frame explicit.

Example:

    referenceFrame: "HELIOCENTRIC_ECLIPTIC"

or:

    referenceFrame: "GEOCENTRIC_EQUATORIAL"

Never infer the frame from field names.

---

# 17. Ecliptic and Equatorial Coordinates

The system must support transformations between:

- ecliptic Cartesian
- ecliptic spherical
- equatorial Cartesian
- equatorial spherical

The obliquity of the ecliptic must be associated with an explicit epoch/time.

Transformation logic must live in the coordinate subsystem rather than inside individual planet implementations.

---

# 18. Observer Coordinates

This is primarily future V2/V3 functionality, but the package architecture should reserve the subsystem now.

Observer model:

    Observer {
        latitude
        longitude
        altitude
    }

Potential outputs:

- hour angle
- right ascension
- declination
- altitude
- azimuth
- local sidereal time
- topocentric position

The Stjarnhimlen tutorial explicitly distinguishes heliocentric, geocentric, and topocentric positions and notes that topocentric corrections are especially important for the Moon.

---

# 19. Lunar Architecture

The Moon should not simply be treated as another planet.

Required lunar subsystem:

- lunar orbital elements
- mean longitude
- mean anomaly
- elongation
- argument of latitude
- perturbation corrections
- geocentric position
- topocentric correction
- lunar distance
- future phase calculations

The Stjarnhimlen tutorial demonstrates that an unperturbed lunar model can have errors around degrees and adds perturbation terms to reduce the error to the intended arcminute range.

Therefore lunar accuracy must have dedicated validation tests.

---

# 20. Accuracy Strategy

The user requirement is "astronomical-grade."

This must be interpreted carefully.

The Stjarnhimlen tutorial is designed to achieve roughly 1–2 arcminute accuracy for the 20th and 21st centuries after the appropriate corrections.

That is excellent for the intended visualization but is not equivalent to professional high-precision ephemeris computation.

Therefore the project should adopt two concepts:

### Production calculation model

A self-contained TypeScript astronomy implementation suitable for the application's supported range.

### Validation reference

Use authoritative ephemeris output to measure error.

JPL Horizons provides programmatic ephemeris access including vector, observer, and orbital-element outputs and is suitable as a validation/reference system.

The project must never silently claim "NASA-level accuracy" merely because it has been compared against JPL.

Instead document:

- supported date range
- model
- reference frame
- time scale
- maximum observed error
- validation dataset
- known limitations

---

# 21. Validation Architecture

Validation should be treated as a first-class subsystem.

    Astronomy Model
          │
          ▼
    Computed Position
          │
          ▼
    Reference Ephemeris
          │
          ▼
    Difference
          │
          ▼
    Error Metrics
          │
          ▼
    Regression Test

Metrics:

- angular error
- distance error
- Cartesian error
- maximum error
- mean error
- percentile error where useful

Validation fixtures should include:

- historical dates
- current dates
- future dates
- planetary conjunctions
- opposition
- perihelion
- aphelion
- lunar phases
- edge cases

---

# 22. Reference Ephemeris Strategy

Do not make JPL Horizons a runtime dependency for normal rendering.

The application should calculate positions locally through the astronomy package.

JPL Horizons should primarily be used to:

- generate validation fixtures
- compare models
- investigate discrepancies
- validate future algorithm changes

This preserves:

- offline calculation
- deterministic behavior
- low latency
- no external dependency for rendering
- reproducibility

Reference data can be stored in a test-only dataset.

---

# 23. API Design

The Express API should be simple.

Potential endpoint:

    GET /api/v1/ephemeris

Inputs:

    instant
    referenceFrame
    bodies

Example conceptual request:

    /api/v1/ephemeris
        ?instant=2026-08-14T22:30:00Z
        &frame=HELIOCENTRIC_ECLIPTIC
        &bodies=sun,earth,mars

Response:

    {
      "instant": "...",
      "referenceFrame": "...",
      "bodies": [...]
    }

The exact API contract should be finalized after the astronomy domain model is defined.

---

# 24. API Principles

The API should:

- validate all inputs
- reject ambiguous dates
- require explicit time-zone interpretation for local times
- return explicit units
- return explicit coordinate frames
- use versioned endpoints
- return structured errors
- never return Three.js objects
- never expose internal implementation details unnecessarily

---

# 25. Client/Server Boundary

The backend should calculate authoritative astronomical state.

The frontend should handle:

- scene rendering
- animation
- camera movement
- interpolation
- visual scaling
- interaction

For continuous animation, do not request a new HTTP calculation for every animation frame.

Instead:

    Server
       ↓
    Astronomical state
       ↓
    Client simulation clock
       ↓
    Render loop
       ↓
    Three.js

The client can request state updates at appropriate simulation intervals.

For V1, the initial implementation can recompute state whenever the simulation clock advances sufficiently, then optimize later.

---

# 26. Simulation Clock

Create a dedicated simulation clock abstraction.

Conceptually:

    SimulationClock {
        currentInstant
        playbackRate
        direction
        paused
    }

Rules:

- simulation time is independent of wall time
- playback rate can be positive or negative
- paused state freezes simulation time
- UI actions modify clock state
- renderer consumes clock state
- astronomy engine remains deterministic

Example:

    playbackRate = 86400

means one real second advances the simulation by one day, assuming the chosen rate convention.

The unit convention must be explicit.

---

# 27. Three.js Scene Architecture

Recommended conceptual structure:

    Scene
    ├── Sun
    ├── PlanetarySystem
    │   ├── Mercury
    │   ├── Venus
    │   ├── Earth
    │   │   └── Moon
    │   ├── Mars
    │   ├── Jupiter
    │   ├── Saturn
    │   ├── Uranus
    │   └── Neptune
    │
    ├── Orbits
    ├── Labels
    ├── SelectionIndicators
    └── Lighting

Each body should have a renderer/controller abstraction.

---

# 28. Planet Renderer

A planet renderer should consume:

    CelestialRenderState

not raw astronomy calculations.

Conceptual flow:

    Astronomy State
          ↓
    Render Adapter
          ↓
    Planet Render State
          ↓
    Three.js

This adapter is where scientific coordinates become scene coordinates.

---

# 29. Coordinate Adapter

This is a critical boundary.

Astronomy coordinates should never be directly assumed to match Three.js coordinates.

Create a dedicated transformation:

    Astronomy Frame
          ↓
    Coordinate Adapter
          ↓
    Scene Frame

The adapter should define:

- axis mapping
- handedness
- unit scaling
- origin
- orientation
- frame conventions

Document this mathematically.

---

# 30. Rendering Scale

The application needs two independent concepts:

### Scientific scale

Physical values map consistently to scene units.

### Visualization scale

A controlled nonlinear or exaggerated mapping may be used.

The scale system should be centralized.

Never alter astronomical state to make planets visually larger.

Conceptual:

    astronomicalPosition
          ↓
    distanceScale
          ↓
    scenePosition

and separately:

    physicalRadius
          ↓
    visualRadiusScale
          ↓
    mesh radius

---

# 31. Orbital Paths

Orbital paths are visualization artifacts derived from astronomical calculations.

They should not be stored as the authoritative orbital data.

Possible strategy:

    current time
        ↓
    sample future/past times
        ↓
    calculate positions
        ↓
    build line geometry

The sampling resolution should adapt based on:

- orbit size
- eccentricity
- camera distance
- selected time span

Do not generate thousands of unnecessary points for every body by default.

---

# 32. Camera Architecture

Camera state should be independent of body state.

Conceptual:

    CameraController
        ├── free mode
        ├── focus mode
        └── tracking mode

### Free mode

User controls:

- orbit
- pan
- zoom

### Focus mode

Camera transitions to a selected body.

### Tracking mode

Camera follows the selected body's changing position.

Tracking must use the body's astronomical state every frame/update.

---

# 33. Planet Selection

Selection pipeline:

    Pointer Event
         ↓
    Raycast
         ↓
    Body ID
         ↓
    Selection Store
         ↓
    Info Panel
         ↓
    Camera Controller

The body ID should be a domain identifier shared across application layers.

---

# 34. State Management

Separate state into categories.

### Astronomy state

- current instant
- reference frame
- computed celestial states

### Simulation state

- playback
- rate
- direction

### Camera state

- position
- target
- mode
- tracking body

### UI state

- selected body
- panels
- settings
- visualization mode

Do not create one giant global state object.

---

# 35. React Architecture

Suggested conceptual structure:

    App
    ├── SolarSystemScene
    ├── TimeControls
    ├── BodyInspector
    ├── ViewControls
    ├── CameraControls
    ├── SettingsPanel
    └── StatusBar

Three.js rendering should be encapsulated so React does not attempt to manage every mesh directly.

React manages application state.

Three.js manages the scene.

---

# 36. Performance Requirements

Initial goals:

- stable 60 FPS on a normal modern desktop
- smooth camera movement
- no visible stutter during ordinary time animation
- no unnecessary API calls
- no memory growth during long simulation sessions

Optimize only after profiling.

Potential future optimizations:

- cached ephemeris states
- adaptive recalculation intervals
- worker-thread calculations
- Web Workers for client-side calculations
- instancing
- level-of-detail
- frustum culling
- adaptive orbit sampling

---

# 37. Testing Strategy

Testing must exist at four levels.

## Unit tests

For:

- angle math
- vectors
- Julian Date
- coordinate transformations
- Kepler solver
- orbital elements

## Domain tests

For:

- Sun
- each planet
- Moon
- reference-frame conversions

## API tests

For:

- validation
- serialization
- errors
- endpoint behavior

## End-to-end tests

For:

- loading application
- changing time
- selecting planet
- camera focus
- playback
- visualization mode

---

# 38. Numerical Regression Tests

Numerical tests should use tolerances, not exact floating-point equality.

Bad:

    expect(actual).toBe(expected)

Better:

    expect(error).toBeLessThan(tolerance)

Every tolerance must be documented.

Tests should distinguish:

- implementation tolerance
- model accuracy
- reference-data uncertainty

---

# 39. Error Handling

Astronomy failures should be explicit.

Potential errors:

- invalid date
- unsupported date range
- invalid observer coordinates
- unsupported body
- unsupported reference frame
- numerical convergence failure
- invalid time scale
- malformed API request

Do not silently substitute a different calculation.

---

# 40. Logging

Backend logs should distinguish:

- request errors
- validation errors
- astronomy calculation errors
- unexpected internal errors

Do not log excessive numerical state in production.

Development/debug mode may expose:

- calculation time
- body count
- reference frame
- model used
- numerical convergence information

---

# 41. Documentation Requirements

The repository should document:

- architecture
- coordinate systems
- time scales
- equations
- numerical methods
- model limitations
- supported date ranges
- validation methodology
- API contracts
- rendering coordinate system
- scaling behavior

Create Architecture Decision Records for major decisions.

---

# 42. Architecture Decision Records

Initial ADRs should include:

### ADR-001
Why astronomy computation is separated from rendering.

### ADR-002
Why TypeScript is used throughout.

### ADR-003
Why the project uses a monorepo.

### ADR-004
Why the astronomy engine is self-contained rather than calling an external ephemeris API at runtime.

### ADR-005
Why JPL Horizons is used for validation rather than primary runtime computation.

### ADR-006
Why astronomical state uses explicit reference frames.

### ADR-007
Why Three.js coordinates are separated from scientific coordinates.

### ADR-008
Why astrology is a separate package.

---

# 43. Security

Even though there is no database, follow normal web security practices.

Backend:

- strict input validation
- request size limits
- rate limiting if publicly deployed
- safe CORS configuration
- security headers
- structured errors
- dependency auditing

Frontend:

- avoid unsafe HTML rendering
- validate API responses
- avoid arbitrary code execution
- lock dependency versions appropriately

---

# 44. Deployment Architecture

Initial deployment can be simple.

    Browser
       │
       ▼
    React App
       │
       │ HTTPS
       ▼
    Express API
       │
       ▼
    Astronomy Package

No database.

No queue.

No cache required initially.

Potential future optimization:

    React
       │
       ▼
    API
       │
       ▼
    Astronomy Engine
       │
       ├── in-memory cache
       └── reference data

---

# 45. Future Architecture: Time Machine

Add:

    SimulationClock
    Timeline
    PlaybackController
    TimeScale

Potential controls:

- 1 second/sec
- 1 minute/sec
- 1 hour/sec
- 1 day/sec
- 1 month/sec
- 1 year/sec

The underlying astronomy engine remains unchanged.

---

# 46. Future Architecture: Observer

Add:

    Observer
       ├── latitude
       ├── longitude
       └── altitude

Then:

    Astronomical State
          ↓
    Observer Transform
          ↓
    Topocentric Coordinates
          ↓
    Horizontal Coordinates
          ↓
    Planetarium

This enables:

- sky view
- horizon
- rise/set
- altitude/azimuth
- local sky position

---

# 47. Future Architecture: Planetarium

Potential components:

- star catalog
- celestial sphere
- horizon
- cardinal directions
- constellation lines
- constellation labels
- Milky Way background
- atmospheric rendering
- twilight
- Sun altitude
- Moon phase

These belong to the visualization/observer layer, not the base astronomy engine unless the underlying astronomical calculations are required.

---

# 48. Future Architecture: Astrology

Create:

    packages/astrology/

Possible inputs:

    AstronomicalState
    Observer
    BirthInstant
    Location

Possible outputs:

    ZodiacPosition
    HousePosition
    Aspect
    NatalChart

The astrology package should depend on astronomy abstractions, never the other way around.

Architecture:

    astronomy
         ↑
         │
    astrology

Never:

    astronomy
         ↓
    astrology
         ↓
    astronomy

This prevents circular domain dependencies.

---

# 49. AI Harness Development Strategy

Because this project will be built using an AI coding harness, the repository must be designed for deterministic agent work.

Agents should not be given a vague objective such as:

> "Build the astronomy engine."

Instead every task should define:

- objective
- allowed files
- forbidden changes
- inputs
- outputs
- invariants
- acceptance criteria
- tests
- validation requirements

---

# 50. Recommended AI Agent Roles

## Architecture Agent

Responsible for:

- architectural consistency
- ADR review
- dependency boundaries
- package boundaries

Must not make arbitrary implementation changes.

---

## Astronomy Agent

Responsible for:

- astronomy package
- equations
- numerical methods
- coordinate transformations

Must provide tests for every new algorithm.

---

## Validation Agent

Responsible for:

- reference fixtures
- numerical comparisons
- tolerance analysis
- regression tests

This agent should be independent from the implementation agent whenever practical.

---

## API Agent

Responsible for:

- Express routes
- schemas
- serialization
- validation
- error handling

---

## Rendering Agent

Responsible for:

- Three.js
- meshes
- orbit lines
- camera
- tracking
- visualization modes

Must not modify astronomy calculations.

---

## Test Agent

Responsible for:

- unit tests
- integration tests
- E2E tests
- regression detection

---

## Security Agent

Responsible for:

- dependency vulnerabilities
- API attack surfaces
- unsafe input
- browser security
- configuration issues

---

## Review Agent

Responsible for final review.

It should ask:

- Does this satisfy the architecture?
- Are scientific assumptions documented?
- Are units explicit?
- Are reference frames explicit?
- Are tests sufficient?
- Did the implementation introduce coupling?
- Did the implementation alter unrelated modules?

---

# 51. AI Harness Rules

The harness should enforce:

1. Never modify the astronomy package while working on UI unless explicitly authorized.
2. Never introduce Three.js into the astronomy package.
3. Never introduce React into the astronomy package.
4. Never introduce astrology logic into astronomy.
5. Every numerical algorithm requires tests.
6. Every coordinate transformation requires documented conventions.
7. Every new external dependency requires justification.
8. Do not replace scientific algorithms with approximate shortcuts without an ADR.
9. Do not remove failing numerical tests to make CI pass.
10. Do not change tolerance thresholds without documenting why.
11. Run focused tests before broad tests.
12. Run lint/typecheck before completion.
13. Do not claim astronomical accuracy without validation evidence.

---

# 52. Definition of Done

A feature is not complete merely because it compiles.

A task is complete only when:

- implementation exists
- types are correct
- unit tests exist
- relevant integration tests exist
- lint passes
- typecheck passes
- existing tests still pass
- documentation is updated where needed
- architectural boundaries are preserved
- numerical behavior is validated where applicable

---

# 53. Phase Plan

## Phase 0 — Architecture

Deliver:

- repository structure
- package boundaries
- ADRs
- coding standards
- test strategy
- CI foundation

No Three.js feature work yet.

---

## Phase 1 — Mathematical Foundation

Implement:

- angle utilities
- vector math
- coordinate conversions
- Julian Date
- time representation
- Kepler solver

Deliver comprehensive tests.

---

## Phase 2 — Solar/Planetary Engine

Implement:

- orbital elements
- Sun
- Mercury
- Venus
- Earth
- Mars
- Jupiter
- Saturn
- Uranus
- Neptune

Add validation fixtures.

---

## Phase 3 — Geocentric Engine

Implement:

- Earth-relative coordinates
- ecliptic coordinates
- equatorial coordinates
- RA/Declination
- reference-frame conversions

---

## Phase 4 — Lunar Engine

Implement:

- lunar orbital model
- perturbations
- lunar geocentric position
- lunar distance
- dedicated validation

---

## Phase 5 — Express API

Implement:

- API schemas
- ephemeris endpoint
- reference-frame selection
- body selection
- errors
- tests

---

## Phase 6 — Three.js Foundation

Implement:

- scene
- camera
- lighting
- coordinate adapter
- Sun
- planets
- Earth/Moon

---

## Phase 7 — Interaction

Implement:

- orbit
- pan
- zoom
- raycasting
- selection
- body information
- camera focus
- tracking

---

## Phase 8 — Orbits and Scaling

Implement:

- orbital paths
- scientific scale
- visualization scale
- labels

---

## Phase 9 — Simulation

Implement:

- simulation clock
- timeline
- playback
- reverse playback
- acceleration

---

## Phase 10 — Validation and Hardening

Perform:

- numerical regression
- performance profiling
- browser compatibility
- API security review
- dependency audit
- E2E testing

---

# 54. Phase Exit Criteria

A phase should not begin until the previous phase has:

- passing tests
- documented API
- documented limitations
- clean typecheck
- clean lint
- review approval

For numerical phases, validation must also pass.

---

# 55. Performance Architecture

Performance should be measured, not guessed.

Track:

- FPS
- frame time
- astronomy calculation latency
- API latency
- memory usage
- orbit-generation time
- body update frequency

Do not optimize the astronomy engine for rendering until profiling demonstrates a need.

---

# 56. Observability

Development diagnostics should expose:

    Simulation Time
    Reference Frame
    Body Count
    Calculation Duration
    Render FPS
    Selected Body
    Camera Mode
    Playback Rate

A developer diagnostics panel can be hidden behind a development flag.

---

# 57. Data Contracts

All domain objects should be immutable where practical.

Prefer:

    Position
    {
        x
        y
        z
        unit
    }

rather than:

    [x, y, z]

because named fields reduce scientific ambiguity.

Similarly:

    Angle
    {
        radians
        degrees?
    }

should not be casually mixed with raw numbers.

---

# 58. Units Policy

Every public scientific value must have an obvious unit.

Examples:

- distanceAU
- distanceKm
- velocityKmPerSecond
- longitudeRadians
- latitudeRadians

Avoid:

    distance: 1.5

because nobody can determine the unit.

Internally, choose canonical units and document them.

---

# 59. Reference Frame Policy

Every position must carry or be associated with a defined reference frame.

Examples:

- HELIOCENTRIC_ECLIPTIC
- GEOCENTRIC_ECLIPTIC
- GEOCENTRIC_EQUATORIAL
- TOPOCENTRIC_EQUATORIAL
- TOPOCENTRIC_HORIZONTAL

Do not use generic `x/y/z` without frame metadata at domain boundaries.

---

# 60. Determinism

For the same:

    instant
    model
    reference frame
    body

the astronomy engine must return the same result.

Avoid:

- random values
- current time hidden inside calculations
- mutable global state
- network calls
- environment-dependent calculations

This is particularly important for AI-generated code and regression testing.

---

# 61. External Dependencies

The astronomy engine should remain dependency-light.

Before adding a dependency, ask:

1. Is it mathematically necessary?
2. Is it well maintained?
3. Does it introduce licensing concerns?
4. Can the required functionality be implemented more transparently?
5. Does it reduce our ability to audit scientific calculations?

For core astronomy, transparency is more valuable than convenience.

---

# 62. Licensing and Attribution

Document all external scientific references.

At minimum, maintain a references document containing:

- Paul Schlyter / Stjarnhimlen tutorial
- JPL Horizons documentation
- NASA/JPL NAIF SPICE documentation if used for validation/research
- any future ephemeris/model sources
- planetary physical-property sources
- textures/assets and their licenses

Do not copy external source code without verifying its license.

---

# 63. Scientific Integrity

The README should avoid exaggerated claims.

Do not write:

> "The most accurate solar-system simulator."

Instead state:

> "A TypeScript astronomy engine and interactive 3D visualization with documented numerical models and validation against reference ephemerides."

Then publish actual validation results.

---

# 64. Suggested README Structure

    # Project Name

    ## Overview

    ## Features

    ## Architecture

    ## Astronomy Engine

    ## Coordinate Systems

    ## Accuracy

    ## Validation

    ## Rendering

    ## Development

    ## Testing

    ## AI Development Workflow

    ## Roadmap

    ## Scientific References

---

# 65. Suggested Development Workflow

For every feature:

    1. Create/confirm requirement
    2. Identify architecture boundary
    3. Write acceptance criteria
    4. Implement smallest unit
    5. Add tests
    6. Validate numerical behavior
    7. Run typecheck
    8. Run lint
    9. Run integration tests
    10. Review architecture
    11. Document decision
    12. Commit

AI agents should not skip steps 5–10 simply because the feature appears visually correct.

---

# 66. Initial Milestone

The first technical milestone should NOT be the 3D solar system.

It should be:

## "Verified Astronomy Core v0.1"

Deliver:

- TypeScript package
- Julian Date
- angle utilities
- Kepler solver
- orbital elements
- heliocentric planetary positions
- coordinate transformations
- reference-frame model
- validation fixtures
- numerical regression tests
- documentation

The output should be usable from a Node CLI without React or Three.js.

Example conceptual command:

    astronomy calculate \
      --body mars \
      --date "2026-08-14T22:00:00Z" \
      --frame HELIOCENTRIC_ECLIPTIC

This proves the scientific foundation before visualization complicates debugging.

---

# 67. First AI Harness Task

The first agent task should be intentionally narrow:

> Establish the monorepo, TypeScript configuration, package boundaries, test infrastructure, linting, formatting, CI, and Architecture Decision Record structure. Do not implement astronomical calculations or Three.js rendering.

Acceptance criteria:

- monorepo builds
- packages resolve correctly
- astronomy package has zero React/Three.js dependencies
- renderer package can be created independently
- API package can import astronomy
- shared types are available
- tests execute
- lint executes
- typecheck executes
- CI executes
- no application feature has been implemented

This creates a safe foundation for subsequent agents.

---

# 68. Second AI Harness Task

After the foundation:

> Implement the mathematical foundation of the astronomy package.

Scope:

- angle functions
- normalization
- vectors
- spherical/cartesian conversion
- rotation functions
- Julian Date conversion
- Kepler equation solver

Required:

- unit tests
- numerical edge cases
- documentation
- no planetary models yet

---

# 69. Third AI Harness Task

Then:

> Implement the first validated planetary model: Earth/Sun system.

The agent should:

- implement the model
- expose heliocentric state
- calculate distance
- calculate ecliptic coordinates
- add reference fixtures
- compare results
- document accuracy

Only after this passes should the project expand to additional planets.

---

# 70. Long-Term Architectural Vision

The mature project should eventually look like:

    ┌──────────────────────────────────────────────────────────┐
    │                     Applications                         │
    │                                                          │
    │  Solar System Explorer     Planetarium     Astrology UI  │
    └──────────────┬──────────────────┬──────────────┬────────┘
                   │                  │              │
                   ▼                  ▼              ▼
            Visualization       Observer Layer   Astrology
                Layer                              Layer
                   │                  │              │
                   └──────────────┬───┴──────────────┘
                                  ▼
                         Astronomy Domain
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
          ▼                       ▼                        ▼
        Time                  Ephemerides             Coordinates
          │                       │                        │
          └───────────────────────┼────────────────────────┘
                                  ▼
                         Scientific Models
                                  │
                                  ▼
                         Validation System
                                  │
                                  ▼
                         Reference Ephemerides

The astronomy domain remains the stable foundation.

---

# 71. Final Architectural Principle

The most important rule for the entire project is:

> **Compute reality once. Interpret and visualize it many ways.**

The astronomy engine computes the astronomical state.

The solar-system explorer visualizes it.

The observer layer translates it for an observer on Earth.

The future astrology layer interprets the resulting astronomical positions according to its own rules.

The same scientific foundation can therefore power multiple future experiences without becoming a tangled application.

---

# 72. Architecture Completion Criteria

Architecture 001 is considered complete when:

- domain boundaries are agreed upon
- repository structure is agreed upon
- astronomy package responsibilities are defined
- time architecture is defined
- coordinate architecture is defined
- reference-frame policy is defined
- numerical validation strategy is defined
- API boundary is defined
- rendering boundary is defined
- AI agent responsibilities are defined
- future observer architecture is reserved
- future astrology architecture is separated
- initial implementation milestones are defined

The next document should define the **Astronomy Domain Specification**, including the exact mathematical models, time scales, reference frames, coordinate conventions, equations, supported date ranges, precision targets, and validation methodology before implementation begins.
