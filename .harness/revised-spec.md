# Revised specification

Append-only Q&A log produced by `harness review-specs`. Every entry is a
question the review refused to answer with an assumption, plus the answer
given. Nothing here is ever rewritten — this is the audit trail.

## Round 1 — 2026-08-14T21:14:18.105499Z

### Where does the browser get celestial states at runtime — from the Express API over HTTP, or from the astronomy package bundled and executed in the browser? ADR-006 says "Normal rendering does not depend on a remote ephemeris API" and cites offline capability, while 001 §5 and §25 and all of Document 003 show React → Astronomy Client → HTTP/JSON → Express → astronomy package. These cannot both be true as written.

<!-- ai-harness:qid=runtime_data_path -->

Express API are called from the frontend/client. The API's use the Astronomy Package to calculate and evaluate the data.

### What exactly is the supported date range for V1, and what happens outside it? Six documents refer to a 'supported date range' and 002 §21 defines UnsupportedDateRangeError, but no bounds are ever stated. Schlyter's stated target is the 20th–21st centuries, and his Pluto formula is explicitly valid only 1800–2100.

<!-- ai-harness:qid=supported_date_range -->

- 1900-01-01 to 2100-01-01 UTC, hard-rejected outside with UnsupportedDateRangeError (matches the tutorial's stated target and Pluto's validity window)

### Do the frame identifiers HELIOCENTRIC_ECLIPTIC / GEOCENTRIC_ECLIPTIC / GEOCENTRIC_EQUATORIAL denote the ecliptic and equinox *of date*, or J2000? 002 §9 lists them as stable identifiers and §16 requires precess(state, fromEpoch, toEpoch) with 'the supported model and validity range must be documented', but no precession model is named and no default equinox is stated. Schlyter's time-varying elements are referred to the ecliptic and mean equinox of date.

<!-- ai-harness:qid=frame_equinox_epoch -->

Frames are mean equinox and ecliptic of date; add explicit J2000-suffixed frame identifiers later when a precession model is implemented

### Are V1 geocentric states geometric (instantaneous true positions) or apparent (light-time corrected, and optionally with annual aberration and nutation)? 001 §16 defines geocentric position purely as Planet_heliocentric − Earth_heliocentric, which is geometric; none of the documents mention light-time, aberration, or nutation anywhere.

<!-- ai-harness:qid=geometric_vs_apparent -->

V1 is geometric only; document the omission explicitly as a known limitation and validate against Horizons geometric vectors

### Which time scale is actually fed to the Schlyter equations, and does V1 implement UTC→TT conversion? 002 §3 requires distinguishing UTC, TT/TDB and simulation time and says the API must not bake in the day-number assumption, but never says whether the day number d is derived from UTC, UT1, or TT — nor whether a leap-second table or delta-T model is in scope.

<!-- ai-harness:qid=time_scale_for_models -->

V1 feeds JD(UTC) directly to the model, documents the UT1/TT approximation as a known limitation, and the TimeScale enum exists but only UTC is implemented

### What are the actual per-body warning and failure tolerances? 006 §11 gives the shape (SCHLYTER_PLANETS_V1: angular: warning: ..., failure: ...) with literal ellipses and forbids a single universal tolerance, and 002 §22 only gives an aggregate '1–2 arcminutes' engineering target.

<!-- ai-harness:qid=validation_tolerances -->

Derive tolerances empirically in the first validation run and freeze them as regression baselines, accepting whatever the model achieves

### How do the validation fixtures in tests/fixtures/ephemeris/ actually get produced — is there network access to JPL Horizons during development, is there a committed generation script an agent may run, or will you supply the reference data by hand? 006 §7 mandates the Horizons → fixture → commit → CI flow and forbids querying Horizons in CI, but never says who runs the query or when.

<!-- ai-harness:qid=fixture_generation_access -->

Agents may call the Horizons API from a committed script (scripts/generate-fixtures) during fixture tasks; the script records source, retrieval date, and full query configuration

### Is Pluto in V1? 001 §3.1 makes it conditional ('if its ephemeris model is sufficiently defined'), 002 §18 lists PLUTO as a required registry identifier, but the 004 scene graph, the 007 Milestone 2 body list, and harness tasks H007–H012 all omit it.

<!-- ai-harness:qid=pluto_scope -->

Implement Pluto in V1 as its own model ID (e.g. SCHLYTER_PLUTO_V1) with its own 1800–2100 range and tolerance, rendered like the planets

### Which (body, frame) combinations must V1 support, and what happens for the degenerate or unnatural ones — the Sun in HELIOCENTRIC_ECLIPTIC (the origin), the Earth in GEOCENTRIC_* (the origin), and the Moon in HELIOCENTRIC_ECLIPTIC (which requires adding Earth's heliocentric position to a geocentric lunar state)? 002 §19 mentions 'supported frames' in body metadata but no matrix is given.

<!-- ai-harness:qid=body_frame_matrix -->

All 11 bodies are valid in all three V1 frames; degenerate cases return an exact zero vector rather than an error, and the Moon is composed via Earth heliocentric + geocentric Moon

### What does the ephemeris response actually contain per body beyond position and distance — spherical coordinates (ecliptic lon/lat, RA/Dec), velocity, per-body accuracy metadata, name/type? The conceptual response in 003 §8 shows only position and distance, while 002 §17 makes sphericalCoordinates and velocity optional and 001 §2.3 lists RA/Dec/ecliptic lon/lat as things the engine should expose.

<!-- ai-harness:qid=response_payload_fields -->

Position + distance + spherical coordinates appropriate to the requested frame; velocity omitted in V1 (the CelestialState.velocity field stays undefined)

### For GET /api/v1/ephemeris: what is the default when `bodies` is omitted, what is the maximum list length ('excessively large' with only ~11 valid IDs), is `bodies=` (empty) a 400 or a 200 with an empty array, are duplicates a 400 or silently de-duplicated, and are IDs case-sensitive (003 §6 shows `SUN,EARTH,MARS` while 001 §23 shows `sun,earth,mars`)? What ordering does the response use — request order or a canonical order?

<!-- ai-harness:qid=bodies_param_semantics -->

Omitted = all supported bodies; empty string = 400; duplicates = 400; IDs are case-insensitive on input and always uppercase in responses; results returned in canonical registry order regardless of request order

### What is the complete error `code` enum and its mapping to HTTP status? 003 §13 shows one example (INVALID_REFERENCE_FRAME) and §14 leaves 422 conditional ('if adopted by the API conventions'), while 002 §21 names six domain errors. Specifically: does an out-of-range date return 400 or 422, and does a Kepler convergence failure return 500 or 422?

<!-- ai-harness:qid=error_code_taxonomy -->

400 for anything malformed or unparseable; 422 for well-formed but semantically unsupported (out-of-range date, unsupported body/frame combination); 500 for convergence failures, logged with the code NUMERICAL_CONVERGENCE_FAILURE

### For V1 orbital paths (H020), what is the sampled time window and sample count, and where are the samples computed? 004 §12–13 permits 'fixed sampling' without a number; 003 §12 explicitly defers the batch endpoint that fixed sampling over HTTP would require. Neptune's 165-year period and Pluto's 248-year period also raise whether a path covers one full orbital period or a window around the current instant.

<!-- ai-harness:qid=orbit_path_generation -->

One full orbital period per body, fixed 360 samples, computed client-side and regenerated only when the date changes by a meaningful fraction of a period

### What exactly does 'visualization mode' do numerically, and what would make it acceptable? 004 §6/§23 and 001 §30 say radii may be 'exaggerated' and the distance scale 'may use a separate display mapping' but define no function, no exaggeration factor, and no constraints — e.g. must a body's mesh never overlap its neighbours' orbits, and must the Moon remain visibly outside Earth's mesh at its true 0.0026 AU separation?

<!-- ai-harness:qid=visualization_scale_rules -->

Visualization mode multiplies body radii by a single configurable constant (with the Sun capped separately) and leaves distances at true linear scale, with an invariant test that no mesh radius exceeds a fixed fraction of the body's distance to its parent

### What is the concrete rule for 'the client can request state updates at appropriate simulation intervals' / 'recompute state whenever the simulation clock advances sufficiently' (001 §25), and is the visual interpolation between recomputes linear on position? 004 §22 separates simulation tick, astronomical update, and render frame but gives no rate for the middle one.

<!-- ai-harness:qid=recompute_cadence -->

Recompute on a fixed cadence (e.g. 10 Hz) regardless of playback rate; linear interpolation of scene positions in between, documented in the renderer docs

### What is the unit convention for SimulationClock.playbackRate, and what happens when playback reaches the edge of the supported date range? 001 §26 gives the example playbackRate = 86400 meaning one real second advances one simulation day, but explicitly hedges ('assuming the chosen rate convention. The unit convention must be explicit'). 007 Milestone 9 and 001 §45 list preset speeds up to 1 year/sec with no stated bounds.

<!-- ai-harness:qid=playback_rate_convention -->

playbackRate is simulation-seconds per real-second (86400 = 1 day/sec), sign carries direction; on reaching a range boundary the clock clamps and auto-pauses

### Where do the non-computed body data come from — physical radii and masses (which source and epoch?), and textures/colors (which asset set and license)? 002 §19 lists 'physical radius', 'mass if needed', and 'color/texture identifier' as metadata, and 004 §11 requires 'visual assets must have documented licenses', but no source is ever named for either.

<!-- ai-harness:qid=body_metadata_sources -->

Use a specific public-domain texture set: Solar System Scope's CC-BY maps with licenses recorded in a THIRD_PARTY_ASSETS file

### Which ADR numbering is canonical — 001 §42 or Document 008? They disagree: 001 §42 assigns ADR-004 to 'self-contained astronomy engine' and ADR-005 to 'Horizons for validation', while 008 assigns ADR-004 to Express, ADR-005 to No Database, ADR-006 to self-contained astronomy, and ADR-007 to Horizons. 001 §42's list also stops at ADR-008 (astrology separation), which 008 numbers ADR-014.

<!-- ai-harness:qid=adr_numbering_conflict -->

Document 008 is canonical; 001 §42 is superseded and should be edited to reference 008 rather than list numbers

### Will V1 be publicly deployed, and if so at what origin(s)? 003 §18 makes rate limiting conditional ('if publicly exposed') and requires a CORS allowlist without naming any origins; 007 Milestone 10 lists 'deployment' as a deliverable with no target.

<!-- ai-harness:qid=deployment_exposure -->

Local/self-hosted only for V1; CORS allowlist is localhost plus a configurable env var, rate limiting implemented but disabled by default


## Round 2 — 2026-08-14T21:27:39.478030Z

### How do the 360 orbit samples per body physically get computed, given that all celestial state must come from the Express API? The answered question `runtime_data_path` says the frontend calls the Express API and the API uses the astronomy package, but the answer to `orbit_path_generation` says orbit paths are 'computed client-side' — which would require the astronomy package to run in the browser. With 11 bodies x 360 samples that is ~3,960 states per regeneration, and 003 §12 explicitly defers `POST /api/v1/ephemeris/batch`. Which is it?

<!-- ai-harness:qid=orbit_sample_transport -->

Implement POST /api/v1/ephemeris/batch in V1 (accepting an explicit instant list) and generate orbits server-side through it

### Does the 10 Hz recompute cadence mean up to 10 HTTP requests per second to /api/v1/ephemeris during playback, or does the client prefetch a window of instants and interpolate locally? 003 §16 says 'No cache required initially. Do not cache before profiling', and 001 §25 says 'do not request a new HTTP calculation for every animation frame' without naming an acceptable rate.

<!-- ai-harness:qid=recompute_transport_cadence -->

Astronomy runs in the browser for animation; the HTTP API is used only for initial load and explicit date jumps

### Which package owns the Three.js scene, and is React Three Fiber allowed? 001 §6 shows both `apps/web/src/scene/` and `packages/renderer/src/scene/`, and 004 §8 specifies an imperative `PlanetRenderer { create() update(state) setSelected() dispose() }` while 004 §21 warns 'Avoid React state updates every animation frame'. Nothing states whether R3F/drei may be used or whether the renderer must be framework-agnostic vanilla Three.js mounted from a single React host component.

<!-- ai-harness:qid=renderer_package_ownership -->

Use React Three Fiber inside apps/web and keep packages/renderer for pure adapter/scaling/coordinate logic only (no meshes)

### Where does model attribution live in the ephemeris response now that multiple models are in play? 003 §8 shows a single top-level `"model": "SCHLYTER_PLANETS_V1"`, but the answered questions establish a separate `SCHLYTER_PLUTO_V1`, and ADR-013 / 002 §15 establish a separate lunar model. A response containing MOON, PLUTO and MARS cannot honestly carry one top-level model ID.

<!-- ai-harness:qid=per_body_model_attribution -->

Move `modelId` onto each body entry and drop the top-level field

### What exactly does `GET /api/v1/bodies` return, and is it the source for the UI's body-info panel? 003 §5 says only 'Returns body metadata and supported calculation models.' Does each entry include display name, type (star/planet/dwarf planet/moon), parent body, physical radius with unit, mass, supported frames, model ID, accuracy metadata, and the supported date range? And does the body-info panel (001 §3.6, Milestone 7) render from this endpoint plus live ephemeris values, or from a hardcoded frontend table?

<!-- ai-harness:qid=bodies_endpoint_contract -->

Full metadata per body (id, displayName, type, parentBody, radius {value,unit}, mass {value,unit}, supportedFrames, modelId, accuracy, supportedDateRange) and the info panel renders from it

### Which `instant` string forms does the API accept, exactly? 003 §7 says 'ISO-8601 timestamps are preferred' — implying something else is also accepted — and shows only a Z form and a -04:00 offset as good. Is a bare date ('2026-08-14') accepted, and at what time of day? Is a raw Julian Date accepted? Are fractional seconds accepted? Is the literal 'now' accepted, given 003 §17 forbids responses depending on current server time?

<!-- ai-harness:qid=instant_input_formats -->

ISO-8601 with a mandatory Z or +/-HH:MM offset only; everything else is 400 (no bare dates, no 'now', no raw JD)

### In what time zone does the web UI accept and display dates? 003 §7 requires an explicit offset at the HTTP boundary and 001 §24 says the API must 'reject ambiguous dates', but nothing says whether the date picker and on-screen clock work in UTC, in the browser's local zone (converted before the request), or in a user-selectable zone. 002 §2: 'A civil date/time is not an instant until its time-zone interpretation is known.'

<!-- ai-harness:qid=ui_timezone_handling -->

User-selectable display zone defaulting to browser local, stored in UI state only

### What is the application's state on first load? 006 §19 requires an E2E test that 'default solar system appears', but nothing defines the defaults: which reference frame, which instant (browser 'now' or a fixed demo date), which rendering mode (scientific or visualization), whether playback starts paused, which bodies are visible, and whether orbit paths and labels start enabled.

<!-- ai-harness:qid=default_app_state -->

Heliocentric, visualization mode, current browser time, paused, all bodies visible, orbits on, labels on

### What do orbit paths show in geocentric view? 004 §24 defines geocentric rendering as `scenePosition = bodyPosition - earthPosition`, and the answer to `orbit_path_generation` fixes 'one full orbital period per body, fixed 360 samples'. Sampled geocentrically that produces apparent retrograde loops, and a full 165-year Neptune path in geocentric coordinates is a very different object from its heliocentric ellipse. Are orbit paths drawn at all in geocentric mode, and if so are they sampled in the geocentric frame?

<!-- ai-harness:qid=geocentric_orbit_paths -->

Yes — sample in the requested frame, so geocentric paths show true apparent/retrograde loops, regenerated on frame switch

### Which concrete tools does Milestone 0 / task H001 install? 007 §2 lists 'package manager/workspaces, lint, formatting, unit test runner, CI' and 001 §67 requires 'tests execute, lint executes, typecheck executes, CI executes', but no tool is ever named. Specifically: npm vs pnpm vs yarn workspaces (with or without Turborepo/Nx), Vitest vs Jest, Vite vs Next.js for apps/web, Playwright vs Cypress for E2E, and Zod vs an alternative for the runtime schemas required by 003 §15.

<!-- ai-harness:qid=monorepo_toolchain -->

pnpm workspaces + TS project references + Vitest + Vite + Playwright + Zod + GitHub Actions

### Do rendered bodies rotate on their axes in V1, and with what tilt? 001 §2.3 lists 'body orientation where supported' among engine outputs, but 002 has no rotation model and no rotation period or pole orientation in the §19 metadata list, and 004 never mentions spin or axial tilt (rings are already deferred by 004 §11).

<!-- ai-harness:qid=body_rotation_scope -->

Full scope — add body orientation (pole RA/Dec + rotation) to the astronomy domain with validation

### What clients must V1 support? 004 §29 and 001 §36 target '60 FPS on modern desktop' only, while 004 §17 asks for a 'pan gesture', implying touch. Is mobile/tablet in V1 scope, and which browsers and Node version are supported (i.e. what does CI test against and what does the README onboarding claim)?

<!-- ai-harness:qid=client_support_matrix -->

Desktop Chrome/Firefox/Safari (current) only, mouse+keyboard, no responsive work in V1; Node 20 LTS


## Round 3 — 2026-08-14T23:56:19.568716Z

### How are orbit paths generated for bodies whose orbital period exceeds the supported date range? The accepted answers fix the range at 1900-01-01 to 2100-01-01 UTC with a hard UnsupportedDateRangeError outside it, and fix orbit paths at 'one full orbital period per body, fixed 360 samples'. Those cannot both hold: Pluto's period is ~248 years and Neptune's ~165 years, so a full-period sample set centred on any date in the 2020s requires instants outside the supported range (and Uranus at ~84 years fails for dates near either end of the range). Should the sampler clamp to the supported range and draw a partial arc, should the range be widened for orbit sampling only, or should long-period bodies use a different path source (e.g. a static ellipse drawn from their osculating orbital elements rather than sampled states)?

<!-- ai-harness:qid=orbit_period_vs_date_range -->

Cap every path at a fixed window (e.g. min(period, 30 years)) regardless of body

### Where does astronomical computation actually execute at runtime, and does packages/astronomy ship a browser build? Three accepted answers point in different directions: runtime_data_path says 'Express API are called from the frontend/client. The API's use the Astronomy Package'; recompute_transport_cadence says 'Astronomy runs in the browser for animation; the HTTP API is used only for initial load and explicit date jumps'; orbit_sample_transport says orbits are 'generated server-side' through POST /api/v1/ephemeris/batch. Please state the final split — which of {initial load, date jump, 10 Hz playback recompute, orbit path generation, body metadata} is served over HTTP and which is computed in-browser — and confirm whether the astronomy package is therefore a bundled browser dependency of apps/web.

<!-- ai-harness:qid=compute_location_contradiction -->

Server computes everything (single ephemeris/batch path); the browser only interpolates between server responses

### What is the request and response contract for POST /api/v1/ephemeris/batch, now that it is in V1? 003 §12 only says it 'should accept an explicit list of instants rather than an ambiguous "generate everything" request'. Specifically: is it one flat instants list applied to all requested bodies (which forces one request per body for orbits, since each body needs its own period-length list), or per-body instant lists in a single request? What is the maximum number of instants and of (body x instant) pairs, and what status is returned when exceeded (400 vs 413 vs 429)? Is the response an array of the same per-instant objects defined in 003 §8, and is ordering guaranteed to match the request order of instants?

<!-- ai-harness:qid=batch_endpoint_contract -->

Flat list: { frame, bodies: [...], instants: [...] } evaluated as a cross-product; orbits issue one request per body

### How are of-date positions validated against JPL Horizons, which does not emit mean-ecliptic-of-date vectors? The accepted answers set V1 frames to 'mean equinox and ecliptic of date' and defer precession ('add explicit J2000-suffixed frame identifiers later when a precession model is implemented'), while 006 §7 mandates Horizons-derived fixtures. Horizons vector output is referenced to J2000 (or B1950), so comparing our of-date output directly against it introduces a precession offset of roughly 0.3-0.4 degrees per century — one to two orders of magnitude larger than the 1-2 arcminute target, which would make every fixture fail for reasons unrelated to the model. Do we implement Schlyter's precession purely as validation-side infrastructure, generate fixtures from a Horizons product that is already of-date (e.g. observer-table RA/Dec of date), or store J2000 fixtures and rotate them at test time?

<!-- ai-harness:qid=validation_frame_mismatch -->

Implement precession now and rotate our of-date result to J2000 inside the validation harness only

### For the newly in-scope body orientation work ('add body orientation (pole RA/Dec + rotation) to the astronomy domain with validation'), what is the source model, which bodies, and how does orientation reach the renderer? None of the documents specify a rotation model: 002 §19's metadata list has no rotation period or pole, 002 §17's CelestialState has no orientation field, and the accepted response-payload answer fixes the ephemeris body entry at position + distance + spherical coordinates only. Concretely: is the source the IAU WGCCRE report on cartographic coordinates and rotational elements (which edition?) or Horizons-derived constants? Does it cover all 11 bodies including the Moon's synchronous rotation and libration? Is orientation a new field on CelestialState and on the API response, with its own model ID and tolerance? And is it validated numerically or only asserted against published constants?

<!-- ai-harness:qid=rotation_model_spec -->

Narrow it: constant axial tilt + constant rotation period per body from a cited table, no time-varying pole, validated only as a round-trip/continuity test

### What is the exact astronomy-to-scene axis mapping? 004 §5 and 001 §29 both require the adapter to define 'axis mapping, handedness, unit scaling, origin, orientation' and say 'Document the exact transformation mathematically' - but no document ever states it. Our ecliptic Cartesian frame is right-handed with +z north of the ecliptic (002 §8); Three.js convention is right-handed with +y up. Is the mapping scene(x,y,z) = astro(x, z, -y) (ecliptic plane becomes the scene's horizontal XZ plane, ecliptic north becomes scene +y), or a direct identity mapping with the camera's up vector set to +z, or something else?

<!-- ai-harness:qid=coordinate_adapter_axis_mapping -->

scene.x = astro.x, scene.y = astro.z, scene.z = -astro.y (ecliptic plane maps to Three.js XZ ground plane, ecliptic north to +Y; preserves handedness and prograde sense viewed from +Y)

### Is precess(state, fromEpoch, toEpoch) implemented as a shipped public API in V1, and if so which precession model? 002 §16 requires the transformation and says 'The supported model and validity range must be documented'; Milestone 3 lists 'precession support as required by model' and H015 covers coordinate transformations. But the accepted frame answer says all V1 frames are of-date and J2000-suffixed frames come 'later', which leaves precession with no runtime consumer. Is it (a) not built in V1, (b) built as a public but unused API, or (c) built only inside the validation harness?

<!-- ai-harness:qid=precession_v1_scope -->

Yes - implement Schlyter's simple precession as a public API now, documented with its validity range, even though no V1 frame consumes it

### With React Three Fiber chosen and packages/renderer restricted to 'pure adapter/scaling/coordinate logic only (no meshes)', do 004 §8's imperative PlanetRenderer interface (create/update/setSelected/dispose) and 004 §9's celestial body registry (mesh factory, texture, material, radius strategy, label, orbit renderer) still stand, and where do they now live? Under R3F, mesh lifecycle and disposal are handled by the component tree rather than by an explicit dispose() contract, which appears to supersede 004 §8 and to move §9's presentation registry into apps/web.

<!-- ai-harness:qid=renderer_package_boundary -->

004 §8 is superseded by R3F components; the §9 presentation registry lives in apps/web; disposal criteria are restated as 'no leaked geometries/textures/listeners after unmount', tested via renderer.info counts

### What does the orbit layer draw for the Sun and the Moon in each frame? The accepted rule is 'one full orbital period per body, fixed 360 samples, sampled in the requested frame'. In HELIOCENTRIC_ECLIPTIC the Sun is a fixed point at the origin (no period, no path), and the Moon's 27.3-day geocentric loop becomes a barely-visible wiggle superimposed on Earth's 1-year path. In GEOCENTRIC_* the Earth is the origin point and the Sun has a 1-year path. Are Sun and Moon simply excluded from the orbit layer in the frames where they are degenerate, does the Moon draw its geocentric loop rendered relative to Earth's current scene position in all frames, and is the orbit path toggle per-body or global?

<!-- ai-harness:qid=sun_moon_orbit_paths -->

Exclude the origin body from the orbit layer per frame (Sun in heliocentric, Earth in geocentric); draw the Moon's path as a geocentric loop parented to Earth's scene position in every frame

### In which frame, and as seen from which centre, is the '1-2 arcminute' accuracy figure measured and reported? 006 §9 defines angular error as the angle between two vectors, which is frame- and origin-dependent: the same position error yields a very different angular error measured from the Sun than from Earth (dramatically so for Venus or Mars near opposition, and for the Moon). 002 §22 states the target without naming a centre, and the accepted tolerance answer defers the numbers to the first validation run without fixing the metric. Are the per-body frozen tolerances defined on geocentric angular error (what a user would see), on heliocentric angular error, or on both plus a separate distance tolerance?

<!-- ai-harness:qid=accuracy_metric_frame -->

Geocentric apparent-direction angular error is the headline metric (matches the tutorial's stated target); heliocentric position and distance errors reported as secondary statistics

### What are the concrete default values for the scene scale and camera? 004 §6 says '1 AU = SCALE_FACTOR scene units. The factor must be configurable' but gives no default; 001 §3.5 requires a 'reset/home view' that is never defined; and no document states camera near/far planes or min/max zoom distance. Given Pluto reaches ~49 AU and Mercury ~0.31 AU, near/far and zoom bounds are load-bearing for z-fighting and for whether the default view frames the inner planets or the whole system.

<!-- ai-harness:qid=scene_scale_and_camera_defaults -->

1 AU = 100 scene units, home view frames the orbit of Neptune, zoom clamped to [0.05, 20000] scene units, near/far tuned per zoom level (logarithmic depth buffer)


## Round 4 — 2026-08-15T00:19:25.553124Z

### Now that the server computes every celestial state and "the browser only interpolates between server responses", what is the concrete fetch contract during continuous playback? Specifically: does the client prefetch a window of instants via POST /api/v1/ephemeris/batch (how many instants, how far ahead, re-fetched when?), or does it poll GET /api/v1/ephemeris at some interval? And is the earlier accepted 10 Hz recompute cadence now the interpolation-sample spacing in simulation time, or the HTTP request rate?

<!-- ai-harness:qid=playback_fetch_contract -->

Client prefetches a rolling window via the batch endpoint (state window length in simulation time and number of instants), interpolates linearly within it, re-fetches when the window is N% consumed

### What exact JPL Horizons configuration produces the fixtures? Concretely: (a) for HELIOCENTRIC_ECLIPTIC, is the center the Sun's body center (500@10) or the solar-system barycenter (500@0)? (b) for GEOCENTRIC_*, Earth's center (500@399) or the Earth-Moon barycenter (500@3)? (c) are targets body centers or system barycenters for the giant planets (e.g. 599 vs 5)? (d) which product - VECTORS with corrections=NONE, or an observer table?

<!-- ai-harness:qid=horizons_center_and_product -->

Sun body center (500@10) and Earth body center (500@399), planet body centers as targets, VECTORS with corrections=NONE

### Which precession formulation does the validation harness use to rotate our mean-of-date results into J2000, and how is that rotation's own error bounded? Schlyter's precession is a longitude-only correction; it does not model the ~47 arcsec/century rotation of the ecliptic plane itself, leaving a latitude/plane residual of order an arcminute per century - the same magnitude as the model error being measured. Simple longitude term, or a full ecliptic precession rotation matrix (e.g. IAU 1976/2006) inside the harness only? And which obliquity value/model converts between ecliptic and equatorial J2000 for comparison against Horizons vectors?

<!-- ai-harness:qid=precession_fidelity_for_validation -->

Public precess() uses Schlyter's simple longitude term; the harness uses a separate full ecliptic precession matrix (IAU 1976) plus fixed J2000 obliquity 84381.448 arcsec, with the harness residual documented

### For the accepted orbit rule "cap every path at a fixed window (e.g. min(period, 30 years))", is that window centred on the current instant (t-15y to t+15y), forward-only, or anchored otherwise - and what happens when it crosses 1900-01-01 or 2100-01-01? With a hard UnsupportedDateRangeError outside the range, a centred 30-year window fails for any date before 1915 or after 2085. Separately, what is the concrete regeneration trigger ("a meaningful fraction of a period") during continuous playback - is orbit regeneration suppressed while playing?

<!-- ai-harness:qid=orbit_window_anchoring -->

Centred on the current instant and clamped to the supported range (truncated arc near range edges)

### For POST /api/v1/ephemeris/batch with the accepted shape { frame, bodies, instants } as a cross-product: what is the maximum number of instants, the maximum number of (body x instant) pairs, and which status is returned when exceeded (400, 413, or 429)? Is the response an array of the per-instant objects from 003 section 8, or a flatter/columnar form? Is result ordering guaranteed to match the request order of instants (given bodies are always in canonical registry order)?

<!-- ai-harness:qid=batch_endpoint_limits -->

Max 500 instants; exceeding returns 413; response is columnar (shared frame/model header plus parallel arrays per body) to keep payloads small

### For the narrowed body-orientation scope (constant axial tilt plus constant rotation period from a cited table): (a) which table/edition is the citation - IAU WGCCRE report (which year?) or Horizons-derived constants? (b) is an absolute rotation phase required, i.e. a defined prime-meridian angle W0 at a reference epoch so Earth's sub-solar point is physically correct, or is phase arbitrary provided it is continuous and reproducible? (c) does orientation cross the HTTP boundary per instant, or does the renderer derive spin locally from /api/v1/bodies metadata plus the instant?

<!-- ai-harness:qid=rotation_phase_epoch_and_source -->

Cite IAU WGCCRE 2015 constants, include W0 so absolute phase is physically correct, derive spin client-side from /bodies metadata (response payload unchanged)

### Does the fixed 360-sample count still apply when orbits are sampled in a geocentric frame? Over the accepted min(period, 30 years) window, Neptune geocentric gets roughly one sample per 30 days, which aliases the ~1-year retrograde loop structure into a jagged polyline that misrepresents the apparent path. Should geocentric paths use a shorter window, a higher sample count, or is aliasing acceptable for V1?

<!-- ai-harness:qid=geocentric_orbit_sampling_density -->

Keep 360 samples but shorten the geocentric window (e.g. min(period, 5 years)) so retrograde structure is resolved

### Is the headline accuracy figure a geometric or an apparent geocentric direction error? Round 1 fixed V1 as geometric only (no light-time, aberration, or nutation) validated against Horizons geometric vectors, but Round 3 names the headline metric "geocentric apparent-direction angular error". Annual aberration alone reaches ~20 arcseconds, a meaningful fraction of a 1-2 arcminute budget, so the two are not interchangeable. Which is measured, and how is the README wording constrained so it does not imply sky-position accuracy the engine does not deliver?

<!-- ai-harness:qid=accuracy_claim_apparent_vs_geometric -->

Geometric geocentric direction error is the measured metric; the README says geometric explicitly and states light-time and aberration are not applied

### What are the exact field names and units of the per-body spherical coordinates in the ephemeris response for each frame? For the ecliptic frames, longitude/latitude in degrees or radians? For GEOCENTRIC_EQUATORIAL, is right ascension in hours (002 section 6 provides hoursToRadians/radiansToHours) or degrees, and are the fields named rightAscension/declination with an explicit unit tag like every other quantity?

<!-- ai-harness:qid=spherical_coordinate_units_and_fields -->

Degrees for all spherical angles including RA, each with an explicit unit field, plus radius/distance in AU

### What are the concrete numbers for visualization mode: the radius exaggeration multiplier, the separate Sun cap, and the "fixed fraction of the body's distance to its parent" used by the invariant test? At 1 AU = 100 scene units, Earth's true radius is ~0.0043 units and the Moon sits ~0.26 units away, so a multiplier above roughly 30-60 swallows the Moon inside Earth's mesh - while a multiplier that low leaves Mercury nearly invisible at system-wide zoom.

<!-- ai-harness:qid=visualization_scale_constants -->

Single multiplier of 50x with the Sun capped at 5x, invariant test asserting mesh radius <= 20% of distance to parent body

### Is the Node CLI described in 001 section 66 (astronomy calculate --body mars --date ... --frame ...) a V1 deliverable, and if so which package owns it and is it covered by the CI gates? It appears in the "Verified Astronomy Core v0.1" milestone as proof the engine works without React or Three.js, but no harness task H001-H024, no milestone in 007, and no directory in 001 section 6 accounts for it.

<!-- ai-harness:qid=cli_scope -->

Yes - a thin bin entry inside packages/astronomy with no new dependencies, smoke-tested in CI

### Now that modelId is per-body, what is the complete list of model identifiers for V1 and which bodies map to each? SCHLYTER_PLANETS_V1 and SCHLYTER_PLUTO_V1 are established; what are the IDs for the Moon (ADR-013 mandates a separate lunar model) and for the Sun/Earth pair, given 002 section 13 requires distinguishing the apparent solar position from Earth's heliocentric position? Do SUN and EARTH share one ID or carry different ones?

<!-- ai-harness:qid=model_id_registry -->

Four IDs: SCHLYTER_SUN_EARTH_V1 (SUN, EARTH), SCHLYTER_PLANETS_V1 (Mercury-Neptune), SCHLYTER_MOON_V1 (MOON), SCHLYTER_PLUTO_V1 (PLUTO)


## Round 5 — 2026-08-15T00:31:39.239159Z

### The accepted visualization constants are mutually inconsistent for the Earth-Moon system. At 1 AU = 100 scene units with a 50x radius multiplier and true linear distances: Earth's mesh radius is 6371 km / 149.6e6 km * 100 * 50 = 0.213 scene units, while the Moon orbits at 384,400 km = 0.257 scene units with a mesh radius of 0.058 units. The Moon's near edge therefore sits at 0.199 units - inside Earth's mesh - and the Moon also fails the accepted invariant (0.058 / 0.257 = 22.6% > 20% of distance to parent). How should this be resolved?

<!-- ai-harness:qid=earth_moon_visual_scale_conflict -->

Give the Earth-Moon system its own visualization override: exaggerate the Moon's orbital distance (e.g. 8x) in visualization mode only, keeping the 50x radius multiplier and the 20% invariant intact

### With the server computing all states and the browser only interpolating, what caps the spacing between computed instants in *simulation* time, and what are the concrete prefetch numbers? The accepted cadence answer fixed 10 Hz 'regardless of playback rate'; at the 1 year/sec preset that is ~36.5 simulation days between samples, so Mercury (88-day period) gets ~2.4 samples per orbit and linear interpolation collapses its orbit into a wobbling triangle. Separately, the accepted fetch answer left its own parameters as placeholders: what is the window length in simulation time, how many instants per window, and at what consumption percentage does the client re-fetch?

<!-- ai-harness:qid=interpolation_sample_spacing -->

Cap spacing in simulation time so the fastest visible body gets >= 60 samples per orbit (~1.5 days), letting the HTTP request rate fall out of playbackRate, with a hard playbackRate cap where that would exceed the 500-instant batch limit

### When is the orbit layer regenerated during continuous playback? The accepted rules make each path a min(period, 30y) window (5y geocentric) *centred on the current instant* with 360 samples, generated server-side via one batch request per body - so during playback the window goes stale continuously and a full refresh is 11 requests x 360 instants. Round 3 said 'regenerated only when the date changes by a meaningful fraction of a period' without fixing the fraction, and Round 4's anchoring answer did not say whether regeneration is suppressed while playing.

<!-- ai-harness:qid=orbit_regeneration_during_playback -->

Suppress regeneration while playing: regenerate on pause, on explicit date jump, and on frame switch only, letting the drawn window drift off-centre during playback

### In scientific mode, are bodies given a minimum on-screen size and a pickable proxy? At 1 AU = 100 scene units with the home view framing Neptune's orbit (~6000 units across), Earth's true-scale mesh radius is 0.0043 units - far below one pixel - so nothing is visible and a pointer raycast against the mesh can essentially never hit it, yet 004 section 18 requires deterministic selection, 004 section 30 requires scientific mode to remain usable, and 006 section 19 requires an E2E test where 'a planet is selected'.

<!-- ai-harness:qid=picking_and_min_apparent_size -->

Every body gets an invisible pick-proxy sphere sized to a minimum screen-space radius (e.g. 12 px) in both modes, plus a screen-space point/billboard marker so sub-pixel bodies stay visible in scientific mode

### What does POST /api/v1/ephemeris/batch return when part of the request is invalid or fails? Concretely: if one instant in the list falls outside 1900-2100, is the whole request rejected 422, or is that column returned as an error entry? And if the Kepler solver fails to converge for one (body, instant) pair - mapped to 500 / NUMERICAL_CONVERGENCE_FAILURE for the single-instant endpoint - does that 500 the entire batch, discarding up to 500 valid instants?

<!-- ai-harness:qid=batch_partial_failure_semantics -->

Fail fast: any out-of-range instant or unknown body rejects the whole request (422/400) before computation, and a convergence failure mid-batch returns 500 for the whole request

### What exactly happens to the camera on selection and on reference-frame switch? 001 section 3.6 says clicking a body must select it and 'optionally animate the camera toward it' without saying who decides; 004 section 16 requires transitions to be 'smooth, interruptible... safe when changing reference frames' with no duration, no settle distance, and no defined frame-switch behaviour. Specifically: does a single click focus, or only select (with focus on double-click / a panel button)? At what distance does focus settle - a multiple of the body's *display* radius (which changes with mode) or a fixed distance? What duration/easing? And on a heliocentric/geocentric switch while focused or tracking, does the camera keep the body focused, reset to home, or hold its world position?

<!-- ai-harness:qid=focus_and_frame_switch_camera -->

Click selects only; focus is a separate explicit action (double-click or panel button); focus settles at 6x the body's current display radius clamped to the zoom bounds; 800 ms ease-in-out; frame switch keeps the body focused and re-derives its scene position

### What does the web app do when the API is unavailable, slow, or returns an error? With every celestial state now coming over HTTP, this is on the critical path for initial load, date jumps, playback prefetch and orbit generation, yet no document specifies loading states, retry policy, timeouts, or degraded behaviour. Does playback pause and surface a banner when a prefetch fails? Are failed requests retried - how many times, with what backoff and timeout? If the initial load fails, does the app show an empty scene, the last known state, or an error screen?

<!-- ai-harness:qid=client_failure_behaviour -->

Fail loud and pause: any prefetch failure pauses the simulation clock and shows a dismissible banner naming the error code; 3 retries with exponential backoff, 10 s timeout; initial-load failure shows a full-screen error with retry

### How is simulation time advanced and represented, so that ADR-017's 'deterministic simulation clock' is actually testable? If each frame does instant += playbackRate * frameDelta, the resulting instant depends on frame rate and dropped frames, so the E2E 'time advances / time reverses' scenarios can only assert loose ranges. Is the clock instead anchorInstant + playbackRate * (elapsed since anchor) with an injectable time source for tests? And is simulation time stored as a Julian Date double, epoch milliseconds, or anchor-plus-offset?

<!-- ai-harness:qid=simulation_clock_determinism -->

Anchor-based: clock = anchorInstant + playbackRate * (now - anchorRealTime), re-anchored on every rate/direction/jump change, with an injectable time source so tests advance it deterministically


## Round 6 — 2026-08-18T10:29:49.132055Z

### The accepted interpolation rule caps sample spacing so 'the fastest visible body gets >= 60 samples per orbit (~1.5 days)', but 1.5 days is Mercury's figure (88 d / 60). The Moon is a V1 body with a 27.3-day period, which would demand ~0.45-day spacing — a 3.3x higher state rate — and its apparent geocentric motion (~13 deg/day) is the fastest thing on screen. Does the cap apply to the Moon (0.45 d) or only to heliocentric planets (1.5 d), and if the latter, how is the Moon animated between samples?

<!-- ai-harness:qid=moon_sample_spacing_conflict -->

Cap applies to all bodies including the Moon: 0.45-day spacing globally

### The accepted prefetch answer still contains placeholders: 'a rolling window via the batch endpoint (state window length in simulation time and number of instants) ... re-fetches when the window is N% consumed', and Round 5 added 'a hard playbackRate cap where that would exceed the 500-instant batch limit' without a number. What are the concrete values for window length (or instants per window), the re-fetch threshold N, the request timeout budget relative to window duration, and the maximum playbackRate? Related: does the earlier 10 Hz recompute cadence still govern at slow playback rates, or is spacing now purely min(playbackRate/10, cap)? And which of the 001 section 45 presets (1 s/s, 1 min/s, 1 hr/s, 1 day/s, 1 month/s, 1 year/s) survive the cap?

<!-- ai-harness:qid=prefetch_window_numbers -->

Fixed 500-instant window, re-fetch at 50% consumed, playbackRate capped at 1 month/sec (drop the 1 year/sec preset)

### Tolerances are to be 'derived empirically in the first validation run and frozen as regression baselines', but no document defines the dataset that run uses. 006 section 12 lists date categories qualitatively and section 22 forbids inferring accuracy 'from a handful of dates'. What is the concrete fixture grid: how many instants per body, sampled how (e.g. uniform every N days across 1900-2100, or a fixed hand-picked list), and is the same grid used for tolerance derivation and for the committed CI regression set — or is CI a smaller subset of a larger offline sweep?

<!-- ai-harness:qid=validation_fixture_grid -->

Uniform sweep: one instant every 30 days across 1900-2100 per body (~2400 points) for tolerance derivation; a fixed 100-date subset committed for CI

### Does the V1 Sun/Earth model (SCHLYTER_SUN_EARTH_V1) produce the position of Earth's centre or of the Earth-Moon barycentre, and is an EMB-to-geocentre correction applied using the lunar model before geocentric subtraction? Schlyter's apparent solar orbit is a low-precision solar theory whose origin convention is not stated in our documents, while the accepted Horizons configuration validates against Earth's body centre (500@399). The offset is ~4670 km (3.1e-5 AU), which is ~24 arcsec of direction error for a body at 0.27 AU (Venus near inferior conjunction) and ~4 arcsec for Mars at opposition.

<!-- ai-harness:qid=earth_center_vs_emb -->

Treat the model output as Earth's centre, apply no correction, and document the EMB ambiguity as a known limitation quantified in the validation report

### For the body that sits at the frame origin (SUN in HELIOCENTRIC_ECLIPTIC, EARTH in GEOCENTRIC_*), the accepted rule returns an exact zero vector. What do the per-body spherical coordinates and distance contain in that case? Longitude/latitude and RA/Dec are mathematically undefined for a zero vector, JSON cannot carry NaN, and the accepted payload contract says every body entry carries 'spherical coordinates appropriate to the requested frame'. Is the sphericalCoordinates object omitted, present with nulls, or present with zeros?

<!-- ai-harness:qid=origin_body_spherical_serialization -->

Omit sphericalCoordinates entirely for the origin body; distance is {value: 0, unit: 'AU'}

### Is application state (instant, frame, selected body, rendering mode, playback state) reflected in the URL as a deep link, and how do the Playwright E2E scenarios pin a deterministic instant given the accepted default of 'current browser time'? 006 section 19 requires tests for 'default solar system appears', 'date changes' and 'planet is selected', but a wall-clock default makes the initial scene different on every run, and nothing states whether E2E runs against the real Express API or a fixture-backed stub.

<!-- ai-harness:qid=url_state_and_e2e_determinism -->

Full URL state (query params for instant/frame/body/mode) — E2E navigates to a pinned URL and hits the real API

### How are body labels implemented and what is the occlusion strategy? 004 section 19 requires labels to support 'visibility toggle, distance-based scaling, occlusion strategy, selection emphasis' but never says whether they are DOM elements overlaid on the canvas (e.g. drei Html / CSS2DRenderer) or in-scene sprites, and never defines what 'occlusion' means here — hiding a label whose body is behind another body, hiding labels for off-screen bodies, or de-cluttering overlapping labels.

<!-- ai-harness:qid=label_implementation_and_occlusion -->

DOM overlay via drei Html, occlusion = hide when the body is behind another body (drei occlude), plus simple overlap de-cluttering

### Are bodies lit by the Sun light object — showing a terminator and phases (a crescent Venus or Moon in geocentric view) — or rendered fully bright/unlit in V1? And are shadow maps enabled, i.e. can Earth cast a shadow on the Moon or Jupiter's moons? 004 section 10 requires a separate light object and section 11 says 'V1 can use simple materials', which does not resolve lit vs unlit.

<!-- ai-harness:qid=lighting_and_shading_model -->

Lit with MeshStandardMaterial from the Sun point light (phases visible), no shadow maps in V1

### What is the 'timeline' deliverable in Milestone 9? Nothing defines its span (the whole 1900-2100 range, or a zoomable window around the current instant), its granularity, whether dragging the scrub handle issues a request per drag position or only on release, or whether it displays anything besides the current instant (e.g. event markers for conjunctions/oppositions, which 006 section 12 mentions only as test dates).

<!-- ai-harness:qid=timeline_control_scope -->

Simple full-range scrubber (1900-2100) plus a date-picker input for precision; requests fire on release only

### What licence does the repository itself carry? 001 section 6 places a LICENSE file at the root and 007 calls this an open-source portfolio project, but no licence is ever named — and the accepted asset choice (Solar System Scope maps, CC-BY) imposes attribution obligations that need somewhere to live.

<!-- ai-harness:qid=repository_license -->

MIT for code, with CC-BY asset attributions recorded in THIRD_PARTY_ASSETS


## Round 7 — 2026-08-18T10:36:03.008554Z

### What is the formula for the spacing between prefetched instants, at every playback rate? Round 6 fixed a 500-instant window, re-fetch at 50% consumed, and a 0.45-simulation-day spacing cap, but the earlier 10 Hz recompute cadence (spacing = playbackRate / 10) was never retired, and Round 6's question about which governs at slow rates went unanswered. Also: when the user reverses direction or changes rate mid-window, is the outstanding window discarded and re-fetched from the new anchor, or is it kept and consumed backwards?

<!-- ai-harness:qid=interpolation_spacing_formula -->

Spacing is always 0.45 simulation days regardless of rate; rate changes/reversal discard the window and re-fetch from the new anchor

### For the narrowed body-orientation scope, what exactly does GET /api/v1/bodies carry per body, in which reference frame, and where is it rotated into scene axes? IAU WGCCRE 2015 expresses orientation as pole right ascension/declination in the ICRF equatorial frame plus a prime-meridian angle W0 and rotation rate — but the accepted scope wording is 'constant axial tilt + constant rotation period', which is a different (and incomplete) parameterisation because a scalar tilt does not fix the azimuth of the spin axis. Concretely: are the fields {poleRightAscensionDeg, poleDeclinationDeg, primeMeridianW0Deg, rotationRateDegPerDay, referenceEpochJD} in J2000 equatorial, or {obliquityToEclipticDeg, nodeLongitudeDeg, rotationPeriodDays}? And is the J2000-equatorial → mean-ecliptic-of-date → scene-axis rotation of the pole performed in packages/astronomy, in packages/renderer's adapter, or ad hoc in apps/web?

<!-- ai-harness:qid=rotation_metadata_shape -->

Ship IAU-style {poleRA, poleDec (J2000 equatorial, degrees), W0, rotationRateDegPerDay, epochJD}; packages/astronomy exposes a poleToEclipticOfDate() helper and the renderer only maps axes

### How does a user enter and leave tracking mode, and what does the camera actually do while tracking? 004 §14–15 and 001 §32 require a tracking mode distinct from focus, but the accepted camera answer only covers selection and focus. Specifically: (a) does arriving at a focus target auto-promote to tracking, or is tracking a separate toggle? (b) while tracking, does the camera hold a constant offset vector in scene coordinates so the body stays centred and the background sweeps past, or does only the orbit target follow the body (camera position fixed, view swinging)? (c) selecting a different body while tracking — retarget, or drop to free? (d) do user orbit/pan/zoom gestures remain live during tracking, and does panning break tracking?

<!-- ai-harness:qid=tracking_mode_semantics -->

Tracking is a separate toggle; camera holds a constant scene-space offset from the body (body stays centred), orbit/zoom gestures adjust that offset and do not break tracking, panning exits to free; selecting another body retargets tracking

### For the accepted Earth–Moon visualization override ('exaggerate the Moon's orbital distance (e.g. 8x) in visualization mode only'), what is the exact multiplier, and which other artifacts follow the exaggerated position? Specifically: does the Moon's orbit-path loop, its label anchor, and its pick proxy all use the exaggerated position (they must agree with the mesh), and is it acceptable that in geocentric visualization mode the Moon's rendered direction/separation no longer matches the ecliptic longitude/latitude the info panel shows from the same ephemeris? Also, is the override a general parent-relative rule (applied to any future satellite) or hard-coded for Earth–Moon, and is it exactly 1x in scientific mode?

<!-- ai-harness:qid=moon_visual_override_consistency -->

Exactly 8x, applied uniformly to the Moon's mesh position, orbit loop, label anchor and pick proxy in visualization mode only; documented as a known visual-vs-reported direction divergence, with a UI note in the info panel

### When several pick proxies are hit by the same pointer ray, which body wins? With every body given an invisible proxy sized to a ~12 px minimum screen radius, overlaps are the normal case, not an edge case: at the home view framing Neptune's orbit, the Sun and all four inner planets plus the Moon fall within a few pixels of each other. What is the deterministic rule — nearest intersection to the camera, smallest angular offset between the pointer ray and the body centre, smallest proxy (favouring the physically smaller body), or canonical registry order? And does a click on empty space clear the selection or leave it unchanged?

<!-- ai-harness:qid=pick_proxy_tiebreak -->

Smallest angular offset between the pointer ray and the body centre wins; ties broken by nearest to camera, then canonical registry order; clicking empty space clears selection

### The headline frozen tolerance is geometric geocentric angular error — but which metric defines pass/fail for EARTH, which has no geocentric direction (it is the origin of GEOCENTRIC_* and returns an exact zero vector)? Is Earth's tolerance defined on heliocentric direction plus heliocentric distance instead? Relatedly, is the SUN validated on its geocentric direction (which is the SCHLYTER_SUN_EARTH_V1 apparent solar orbit itself, i.e. the same numbers as Earth's heliocentric position mirrored), and is the MOON on the same geocentric angular metric as the planets?

<!-- ai-harness:qid=validation_metric_for_origin_bodies -->

EARTH is validated on heliocentric angular error (Sun-centred) plus heliocentric distance error; SUN and MOON use the geocentric angular metric like the planets

### Given full URL state (instant/frame/body/mode as query params), at what cadence is the URL updated during playback, and is the resolved default instant written into the URL on first load? Continuous updates at the interpolation rate would flood browser history, and a URL that stays bare on load means the 'share what I'm looking at' behaviour silently depends on the recipient's wall clock.

<!-- ai-harness:qid=url_state_update_cadence -->

replaceState only, throttled to ~1 Hz while playing and immediate on pause/jump/frame/mode/selection change; the resolved default instant is written on first load

### When the user toggles between scientific and visualization mode while focused on or tracking a body, what happens to the camera? Display radii change by up to 50x, and the accepted focus distance is '6x the body's current display radius', so the camera is either instantly at the wrong distance or must move. Does it re-settle to the new 6x distance (animated over the same 800 ms?), hold its current distance, or is the mode toggle disabled while focused? And does the radius change itself animate or snap?

<!-- ai-harness:qid=mode_switch_camera_behaviour -->

Camera re-settles to the new 6x display radius using the same 800 ms ease, and mesh radii tween over the same interval

### What is rendered behind the solar system in V1 — plain black, a static starfield/skybox texture, or a procedural point-star background? Star catalogues, constellations and the Milky Way are explicit non-goals for V1 (001 §4, 004 §11 defers visual polish), but nothing says whether the scene has any background at all.

<!-- ai-harness:qid=scene_background -->

A single static equirectangular starfield/Milky Way skybox from the same CC-BY Solar System Scope set, recorded in THIRD_PARTY_ASSETS

