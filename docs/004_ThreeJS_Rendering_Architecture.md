# Architecture Document 004 — Three.js Rendering Architecture

**Status:** Proposed  
**Version:** 1.0  
**Depends on:** Documents 001–003

# 1. Purpose

Define the rendering and interaction architecture for the React + Three.js solar-system explorer.

# 2. Fundamental Rule

Three.js is a visualization system.

It is not an astronomy engine.

The renderer receives astronomical state and converts it into scene state.

# 3. Rendering Pipeline

    Astronomy State
          ↓
    Render Adapter
          ↓
    Scene Coordinates
          ↓
    Celestial Body Renderer
          ↓
    Three.js Scene
          ↓
    WebGL

# 4. Scene Graph

    Scene
    ├── SolarSystemRoot
    │   ├── Sun
    │   ├── Mercury
    │   ├── Venus
    │   ├── Earth
    │   │   └── Moon
    │   ├── Mars
    │   ├── Jupiter
    │   ├── Saturn
    │   ├── Uranus
    │   └── Neptune
    ├── OrbitLayer
    ├── LabelLayer
    ├── SelectionLayer
    └── DebugLayer

# 5. Coordinate Adapter

Astronomy coordinates and Three.js coordinates must be separate.

Adapter responsibilities:

- axis mapping
- handedness
- unit conversion
- origin
- orientation

Document the exact transformation mathematically.

# 6. Scene Units

Define one canonical scene-distance convention.

Example:

    1 AU = SCALE_FACTOR scene units

The factor must be configurable.

Scientific scale should preserve linear distance relationships.

Visualization scale may use a separate display mapping.

# 7. Planet Radius

Physical radius and display radius are separate.

    physicalRadius
          ↓
    DisplayScale
          ↓
    meshRadius

Never modify physical metadata.

# 8. Planet Renderer Interface

Conceptual:

    PlanetRenderer {
      create()
      update(state)
      setSelected(selected)
      dispose()
    }

The renderer should receive a typed render state.

# 9. Celestial Body Registry

The renderer should map domain BodyId to:

- mesh factory
- texture
- material
- radius strategy
- label
- orbit renderer

This mapping is presentation metadata.

# 10. Sun

The Sun is both:

- a celestial body
- a primary visual light source

Use a mesh/material for appearance and a separate light object for illumination.

The light object must not affect astronomical calculations.

# 11. Planet Materials

V1 can use simple materials.

Future improvements:

- physically based materials
- normal maps
- night-side Earth textures
- atmospheric scattering
- ring systems
- clouds

Visual assets must have documented licenses.

# 12. Orbit Rendering

Orbit paths are sampled positions.

Pipeline:

    time window
       ↓
    sample instants
       ↓
    astronomy state
       ↓
    coordinate adapter
       ↓
    line geometry

Orbit generation must be decoupled from planet meshes.

# 13. Adaptive Orbit Sampling

Future implementation should adapt sample density based on:

- orbital period
- eccentricity
- visible arc
- camera distance

Initial implementation may use fixed sampling.

# 14. Camera

Required modes:

### Free

User controls orbit, pan, zoom.

### Focus

Camera smoothly transitions to a selected body.

### Tracking

Camera target follows a selected body's position.

# 15. Camera Tracking

Tracking pipeline:

    Astronomy State
          ↓
    Body Position
          ↓
    Scene Position
          ↓
    Camera Target
          ↓
    Camera Controller

The camera must never alter the body's position.

# 16. Camera Transitions

Use interpolation for focus transitions.

Requirements:

- smooth
- interruptible
- no teleportation unless requested
- safe when target disappears
- safe when changing reference frames

# 17. Input

Support:

- pointer drag
- wheel zoom
- pan gesture/button
- click selection
- keyboard shortcuts where useful

Avoid coupling input handlers directly to domain state.

# 18. Raycasting

Selection:

    pointer
      ↓
    normalized device coordinates
      ↓
    raycaster
      ↓
    intersect scene
      ↓
    BodyId
      ↓
    application selection

Only selectable objects should be included in the relevant raycast layer.

# 19. Labels

Labels should be a presentation layer.

They should support:

- visibility toggle
- distance-based scaling
- occlusion strategy
- selection emphasis

Do not embed astronomical metadata directly in DOM strings without a defined source.

# 20. UI/Three.js Boundary

React owns:

- controls
- panels
- settings
- selected body
- simulation controls

Three.js owns:

- scene
- meshes
- camera
- render loop
- GPU resources

A shared state layer connects them.

# 21. Render Loop

Conceptual:

    requestAnimationFrame
          ↓
    read simulation state
          ↓
    update render state
          ↓
    update camera
          ↓
    render scene

Avoid React state updates every animation frame.

# 22. Simulation Updates

Astronomical calculations should not necessarily run at 60 Hz.

Separate:

- simulation clock tick
- astronomical state update
- visual interpolation
- render frame

This prevents unnecessary calculation.

# 23. Visualization Modes

Scientific:

- linear physical scale
- physically meaningful radius mapping

Visualization:

- exaggerated body radii
- enhanced labels
- improved orbit visibility

Mode switching must not mutate astronomy state.

# 24. Geocentric View

When Earth is the origin:

    scenePosition =
      bodyPosition - earthPosition

The camera and root transform may change, but the astronomy state must remain immutable.

# 25. Origin Rebasing

Future large-scale rendering may need origin rebasing.

Potential strategy:

    camera position becomes local origin
    nearby bodies rendered relative to camera

This is a rendering optimization only.

Do not alter domain coordinates.

# 26. Floating-Point Precision

Three.js uses JavaScript numbers and GPU floating-point representations.

Large AU-scale coordinates may eventually produce precision artifacts.

Mitigation options:

- local origin
- hierarchical transforms
- camera-relative rendering
- scaled coordinates
- origin rebasing

Implement only after measuring actual precision problems.

# 27. Disposal

Every renderer must clean up:

- geometry
- materials
- textures
- render targets
- event listeners

Long-running time animation must not leak resources.

# 28. Rendering Tests

Possible automated tests:

- coordinate adapter tests
- scale mapping tests
- selection mapping tests
- camera target tests
- scene lifecycle tests

Visual regression tests can be added later.

# 29. Performance Targets

Initial target:

- 60 FPS on modern desktop
- smooth camera movement
- no major frame drops during normal playback

Measure before optimizing.

# 30. Rendering Acceptance Criteria

- Three.js has no astronomy equations
- astronomy coordinates are converted through one documented adapter
- camera modes work independently
- selection is deterministic
- tracking follows astronomical state
- scientific and visualization modes preserve domain state
- resources are disposed correctly
