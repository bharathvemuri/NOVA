# Open questions — round 8

<!-- ai-harness:round=8 -->

The spec review found 9 thing(s) it will not guess at.

Write your answers under each **Answer:** marker, save the file, then re-run
`harness review-specs`. Anything you leave blank stays open and will be
asked again next round — nothing is ever filled in with an assumption.

To close the review while questions are still open, run
`harness review-specs --finalize`. That is logged as a forced closure.

> **Reviewer's read of the spec so far:**

> After seven rounds the specification is unusually complete: the runtime compute split, date range, frames, tolerance policy, API semantics, camera behaviour, clock model and asset licensing are all settled. The remaining gaps cluster in three places: the batch endpoint's response schema, where two accepted answers now contradict each other and neither orbit generation nor playback prefetch can be coded without it; the boundary between server-computed exact states and client-interpolated states, covering both what the UI reports and what latency budget the prefetch loop implies; and two newly in-scope pieces of work whose supporting details were never filled in (the pole-orientation frame conversion, and the validation harness's own precession code, which every fixture comparison now depends on). A few smaller rendering and asset details remain.

---

## Q1 · blocking

<!-- ai-harness:qid=batch_response_schema -->

**Question:** What is the exact columnar shape of the POST /api/v1/ephemeris/batch response? Round 4 fixed it as 'a shared frame/model header plus parallel arrays per body', but Round 2 moved modelId onto each body entry and dropped the top-level field, so is the model ID now per body inside each column header? Does each body column carry only positions, or also per-instant distance and spherical coordinates (360 instants x 11 bodies of spherical data is pure payload for the orbit use case, which needs positions only)? Is the instants array echoed back with iso + julianDate per entry as in 003 section 8? And for the frame's origin body, whose sphericalCoordinates are omitted entirely per Round 6, is the whole spherical column absent for that body?

**Why it matters:** This is the single transport for orbit generation, playback prefetch and the entire client render loop; H016 and H020 cannot be implemented, and no response-schema test can be written, until the shape is pinned. It also drives payload size on a request that fires every few seconds during playback.

**Where:** 003 sections 8 and 12; accepted answers batch_endpoint_contract, batch_endpoint_limits, per_body_model_attribution, origin_body_spherical_serialization

**Some possible answers** (suggestions only — write anything):

- Per-body column header {id, modelId} plus parallel arrays for position only; distance and spherical omitted from batch responses (batch serves orbits/playback, GET serves display values)
- Per-body column header plus parallel arrays for position, distance and spherical, mirroring the GET body entry field-for-field
- Top-level header mapping each body to its model ID (models: {EARTH: SCHLYTER_SUN_EARTH_V1, ...}) with parallel arrays underneath

**Answer:**

<!-- write your answer below this line -->


---

## Q2 · important

<!-- ai-harness:qid=reported_vs_interpolated_state -->

**Question:** Are the numeric values shown in the UI (info panel, status bar, anything a user could quote) ever interpolated, or always taken from an exact server-computed state? With the browser interpolating linearly between instants 0.45 simulation days apart, the Moon moves about 6 degrees between samples and its interpolated geocentric distance sags by roughly 0.1% (about 500 km) mid-interval, comparable to the model error the project takes such care to document. Specifically: on pause and on date jump, does the client fetch an exact single-instant state for that instant, and is the interpolation error bound documented as a known limitation alongside model accuracy?

**Why it matters:** The project's central integrity rule is that accuracy claims are measured and documented; if displayed numbers silently carry interpolation error on top of model error, the published accuracy figure does not describe what the user sees. It also decides whether the client must issue an extra exact fetch on every pause and scrub.

**Where:** 001 section 25; 004 section 22; ADR-020; accepted answers compute_location_contradiction, interpolation_spacing_formula, simulation_clock_determinism

**Some possible answers** (suggestions only — write anything):

- Displayed values always come from an exact state: meshes interpolate, but panel and status bar update only when an exact state arrives, and an exact single-instant fetch fires on pause and on jump
- Panel shows interpolated values continuously, with worst-case per-body interpolation error measured once and published in the known-limitations document
- Panel numbers freeze while playing and refresh only on pause

**Answer:**

<!-- write your answer below this line -->


---

## Q3 · important

<!-- ai-harness:qid=pole_conversion_precession -->

**Question:** Which precession does the newly scoped poleToEclipticOfDate() helper use? Round 7 puts IAU WGCCRE pole RA/Dec in the J2000 equatorial frame and asks packages/astronomy to expose the conversion to mean ecliptic of date, but Round 4 restricted the public precess() to Schlyter's longitude-only term and confined the full IAU 1976 ecliptic precession matrix to the validation harness. Rotating a J2000 equatorial pole vector into the mean ecliptic and equinox of date needs the J2000 obliquity rotation plus a real frame precession, which the public API does not currently have.

**Why it matters:** Either the harness-only IAU 1976 matrix is promoted into the shipped package (reversing an accepted decision), or the helper uses an approximation whose error must be stated, or precession is skipped for poles entirely. The rotation task cannot be specified without choosing, and the choice changes what packages/astronomy exports.

**Where:** 002 section 16; accepted answers rotation_metadata_shape, precession_fidelity_for_validation, precession_v1_scope

**Some possible answers** (suggestions only — write anything):

- Promote the full IAU 1976 ecliptic precession matrix into packages/astronomy and use it for both poleToEclipticOfDate() and (still harness-side) validation, keeping Schlyter's longitude-only term as a separately named documented function
- Use the Schlyter longitude term inside poleToEclipticOfDate() and document the resulting pole-direction error (order of arcminutes per century, visually negligible)
- Skip precession for poles: treat the J2000 pole as of-date, apply only the obliquity rotation, and document the approximation

**Answer:**

<!-- write your answer below this line -->


---

## Q4 · important

<!-- ai-harness:qid=validation_harness_trust -->

**Question:** Where does the validation harness's own math live, and how is it verified? Every fixture comparison now passes through harness-only code (the IAU 1976 ecliptic precession matrix, the fixed J2000 obliquity, the ecliptic/equatorial rotation, the clamped-acos angular metric), so a bug there produces either false passes or false failures across the entire scientific validation report. 005 section 8 requires validation to be independent of the implementation but says nothing about validating the validator. Does this code live in tests/, scripts/, or packages/astronomy, and what independent check establishes that its rotation is correct?

**Why it matters:** The whole accuracy claim rests on this code, and it is currently the only numerical code in the project with no stated test requirement, which contradicts the rule that every numerical algorithm requires tests.

**Where:** 005 sections 7-8; 006 sections 7 and 21; accepted answers validation_frame_mismatch, precession_fidelity_for_validation

**Some possible answers** (suggestions only — write anything):

- Lives in tests/validation with its own unit tests against published IAU precession angles for several epochs, plus a documented harness residual bound quoted in every validation report
- Cross-check end to end: rotate a Horizons J2000 vector to of-date with the harness and compare against a Horizons of-date observer table for the same instant, committed as a harness self-test fixture
- Promote it into packages/astronomy so it is covered by the normal unit-test and review gates

**Answer:**

<!-- write your answer below this line -->


---

## Q5 · important

<!-- ai-harness:qid=api_latency_budget -->

**Question:** What is the latency and throughput target for the batch endpoint, and is it a CI gate? At the 1 month/sec playback cap, a 500-instant window spans about 225 simulation days and is consumed in roughly 7.5 real seconds, so the client re-fetches at 50% consumption every ~3.7 s, each request computing 11 bodies x 500 instants = 5,500 states and returning a few hundred KB of JSON. 006 section 20 says to measure calculation and API latency but sets no threshold, 006 section 23 omits performance from the CI gates, and the client gives up after 10 s and pauses the simulation.

**Why it matters:** Without a number, 'fast enough' is unfalsifiable, yet the accepted client behaviour is to pause playback and show an error banner on timeout, so a slow server is a visible product failure. It also determines whether server-side memoization is needed despite 003 section 16's 'do not cache before profiling'.

**Where:** 003 section 16; 006 sections 20 and 23; 004 section 29; accepted answers prefetch_window_numbers, batch_endpoint_limits, client_failure_behaviour

**Some possible answers** (suggestions only — write anything):

- Target p95 under 500 ms for a full 5,500-state batch on the reference dev machine, asserted in a benchmark test that runs in CI but only warns
- Same target, enforced as a hard CI gate alongside typecheck, lint and tests
- No V1 target: measure and record in the performance report only, revisit if playback stalls in practice

**Answer:**

<!-- write your answer below this line -->


---

## Q6 · important

<!-- ai-harness:qid=info_panel_quantities -->

**Question:** Does the body info panel show quantities belonging to a frame other than the one currently selected, in particular distance from Earth while in heliocentric view (and distance from Sun while in geocentric view)? The accepted contract is one frame per request, so showing both requires either a second request in the complementary frame on every update, or new frame-independent convenience fields on each body entry.

**Why it matters:** This doubles request volume on the playback hot path if handled client-side, or changes the response schema if handled server-side; either way it must be settled before the response contract is frozen. It is also the most commonly expected number in a solar-system explorer's info panel.

**Where:** 003 section 8; 001 section 3.6; accepted answers response_payload_fields, bodies_endpoint_contract

**Some possible answers** (suggestions only — write anything):

- Add frame-independent convenience fields distanceFromSun {value,unit} and distanceFromEarth {value,unit} to every body entry in every frame (the server already has both vectors)
- Panel shows only quantities from the currently requested frame; the user switches frames to see the other distance
- Client issues a second request in the complementary frame, but only while the panel is open and only on pause or jump, never during playback

**Answer:**

<!-- write your answer below this line -->


---

## Q7 · important

<!-- ai-harness:qid=sun_material_and_light_decay -->

**Question:** How is the Sun rendered, and does its point light use physical inverse-square decay? Round 6 fixed 'lit with MeshStandardMaterial from the Sun point light', but a standard-material Sun mesh containing the light at its own centre renders black, and inverse-square falloff over the accepted true linear distance scale leaves Neptune at 30 AU roughly 900x dimmer than Earth, effectively invisible. Please confirm the Sun's own material (emissive or basic, with or without a glow sprite), the light's decay setting and intensity, and whether any tone mapping or bloom pass is applied.

**Why it matters:** Read literally, the accepted lighting decision produces a black Sun and black outer planets, which is the default scene of the entire application. It also determines whether a post-processing pass is in V1 scope, which 004 section 11 otherwise defers.

**Where:** 004 sections 10-11; accepted answers lighting_and_shading_model, scene_scale_and_camera_defaults

**Some possible answers** (suggestions only — write anything):

- Sun uses MeshBasicMaterial (or an emissive standard material) plus a billboard glow sprite; the point light uses decay = 0 with constant intensity so all bodies are lit equally; no bloom pass in V1
- Physical inverse-square decay with per-body exposure compensation in the material, so outer planets stay visible while falloff stays physical
- Decay = 0 plus an UnrealBloom post-processing pass applied to the Sun only

**Answer:**

<!-- write your answer below this line -->


---

## Q8 · minor

<!-- ai-harness:qid=missing_visual_assets -->

**Question:** Which texture does Pluto use, and does Saturn render with rings in V1? The accepted asset set is Solar System Scope's CC-BY maps, which cover the Sun, Mercury, Venus, Earth, Moon, Mars, Jupiter, Saturn, Uranus and Neptune plus a Saturn ring map, but that set contains no Pluto map, and Pluto is explicitly in V1 scope with its own model. Separately, 004 section 11 lists ring systems under future improvements while the ring texture is already available.

**Why it matters:** Pluto is a required V1 body with no defined appearance, and a ringless Saturn is the most recognisable visual gap in a solar-system explorer; both are cheap to decide now and awkward to retrofit into the body presentation registry later.

**Where:** 004 sections 9 and 11; 002 section 19; accepted answers pluto_scope, body_metadata_sources

**Some possible answers** (suggestions only — write anything):

- Pluto renders as a flat colour from its metadata colour identifier; Saturn renders with a ring plane using the CC-BY ring map (rings promoted into V1)
- Pluto flat colour, Saturn ringless in V1 exactly as 004 section 11 states
- Source a separately licensed public-domain Pluto map (e.g. the NASA New Horizons basemap), record it in THIRD_PARTY_ASSETS, and give Saturn rings

**Answer:**

<!-- write your answer below this line -->


---

## Q9 · minor

<!-- ai-harness:qid=convergence_failure_testability -->

**Question:** How is the NUMERICAL_CONVERGENCE_FAILURE path tested, and what are the Kepler solver's concrete tolerance and iteration cap? 002 section 12 requires both numbers to be defined but never states them, and among V1 bodies the highest eccentricity actually solved is Mercury's ~0.206 (Schlyter's Pluto is a trigonometric series, not a Kepler solve), so Newton-Raphson converges in a handful of iterations for every supported body and date, making the accepted 500 / NUMERICAL_CONVERGENCE_FAILURE response unreachable through the public API while 003 section 21 requires a 'numerical error translation' test.

**Why it matters:** Either the error path needs a fault-injection seam to be testable, or the solver must be exported and unit-tested directly at synthetic eccentricities, or the required test should be struck; otherwise an untested error path ships and an explicitly mandated test cannot be written.

**Where:** 002 section 12; 001 section 13; 003 sections 14 and 21; accepted answer error_code_taxonomy

**Some possible answers** (suggestions only — write anything):

- Tolerance 1e-12 rad, max 50 iterations; the solver is exported and unit-tested directly at synthetic high eccentricity (e = 0.99), and the API error path is covered by injecting a stub solver in the controller test
- Same solver constants, but drop the API-level convergence test and document that the path is unreachable for supported bodies
- Keep the contract and make the solver reachable through a future user-supplied-elements endpoint, out of V1 scope

**Answer:**

<!-- write your answer below this line -->


---
