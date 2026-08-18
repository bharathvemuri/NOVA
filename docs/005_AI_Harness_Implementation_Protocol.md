# Architecture Document 005 — AI Harness Implementation Protocol

**Status:** Required  
**Version:** 1.0  
**Purpose:** Make AI-assisted development deterministic, reviewable, and safe.

# 1. Objective

The AI Harness is an implementation system, not the architecture authority.

The documents in `/docs/architecture` are the source of truth.

An agent must not invent architecture when an architectural decision already exists.

# 2. Agent Hierarchy

Recommended roles:

1. Orchestrator
2. Architecture Reviewer
3. Astronomy Engineer
4. Validation Engineer
5. API Engineer
6. Rendering Engineer
7. Test Engineer
8. Security Engineer
9. Final Reviewer

# 3. Orchestrator

Responsibilities:

- select tasks
- provide context
- enforce dependencies
- collect outputs
- run verification
- stop on conflicts

It should not directly implement complex features.

# 4. Task Contract

Every task must contain:

    ID
    Objective
    Context
    Allowed files
    Forbidden files
    Dependencies
    Requirements
    Invariants
    Acceptance criteria
    Required tests
    Validation commands

# 5. Agent Context

Before coding, an agent receives:

- relevant architecture documents
- task specification
- current repository state
- relevant tests
- previous implementation notes

Do not dump the entire repository into every agent context.

# 6. Allowed Change Principle

Agents should modify the smallest possible surface area.

Example:

Astronomy agent working on Kepler solver:

Allowed:

    packages/astronomy/src/math/
    packages/astronomy/tests/math/

Forbidden:

    apps/web/
    apps/api/
    packages/renderer/

unless explicitly required.

# 7. Scientific Agent Rules

Astronomy agents must:

- cite source equations in code comments/documentation
- define units
- define frames
- add numerical tests
- preserve deterministic behavior
- avoid hidden constants
- avoid undocumented approximations

# 8. Validation Agent Independence

Where practical, validation should be implemented by a different agent than the algorithm.

Goal:

    Implementation Agent
            ↓
       produces result
            ↓
    Independent Validator
            ↓
        verifies result

This reduces confirmation bias in AI-generated numerical code.

# 9. No Test Removal Rule

An agent may not delete, weaken, skip, or increase tolerances on a failing test merely to achieve a passing build.

Any tolerance change requires:

- explanation
- evidence
- architecture decision or validation note

# 10. No Silent Approximation Rule

An agent may not replace:

- a precise calculation with a rough approximation
- a failed model with a fallback model
- a missing value with zero

without explicit approval and documentation.

# 11. Dependency Rule

New dependency requires:

- reason
- alternatives considered
- license compatibility
- maintenance assessment
- security assessment

# 12. Completion Checklist

Before declaring a task complete:

    [ ] Implementation complete
    [ ] Unit tests added
    [ ] Integration tests added if required
    [ ] Typecheck passes
    [ ] Lint passes
    [ ] Existing tests pass
    [ ] Documentation updated
    [ ] Architecture boundaries checked
    [ ] Numerical validation completed if applicable
    [ ] No unrelated files changed

# 13. Agent Output

Every agent should report:

    Summary
    Files changed
    Tests added
    Commands executed
    Results
    Known limitations
    Architectural concerns
    Follow-up tasks

# 14. Review Gates

A task cannot be merged if:

- tests fail
- typecheck fails
- architecture boundary is violated
- scientific assumptions are undocumented
- numerical validation is missing
- unrelated changes are present

# 15. Git Strategy

Prefer small commits.

Suggested format:

    feat(astronomy): add Julian Date conversion
    test(astronomy): add Julian Date regression fixtures
    feat(api): add ephemeris endpoint
    feat(renderer): add planet selection
    docs(architecture): document frame convention

Avoid giant AI-generated commits.

# 16. Parallel Agent Strategy

Safe parallelization:

    Astronomy Math
          │
    Astronomy Models
          │
    API
          │
    Renderer

But model work must depend on foundational math.

Renderer can begin with mocked astronomical states after the shared contracts are established.

# 17. Mocking

The renderer should use deterministic mock states during early UI development.

Example:

    MockCelestialStateProvider

This allows Three.js work before the astronomy engine is complete.

# 18. Architecture Review Agent

Before merge, review:

- dependency direction
- package boundaries
- unit conventions
- reference frames
- model versioning
- API contracts
- rendering separation

# 19. Security Agent

Review:

- Express input validation
- CORS
- headers
- dependency vulnerabilities
- unsafe browser APIs
- asset loading
- injection risks

# 20. Final Reviewer

The final reviewer must be conservative.

If evidence is missing, report:

    NOT VERIFIED

rather than:

    VERIFIED

# 21. Initial Harness Tasks

### H001

Create monorepo foundation.

### H002

Implement mathematical primitives.

### H003

Implement Julian Date/time subsystem.

### H004

Implement Kepler solver.

### H005

Implement Sun/Earth model.

### H006

Validate Sun/Earth model.

### H007

Implement Mercury/Venus.

### H008

Validate Mercury/Venus.

### H009

Implement Mars/Jupiter.

### H010

Validate Mars/Jupiter.

### H011

Implement Saturn/Uranus/Neptune.

### H012

Validate outer planets.

### H013

Implement lunar model.

### H014

Validate Moon.

### H015

Implement coordinate transformations.

### H016

Implement Express API.

### H017

Create Three.js scene.

### H018

Create body rendering.

### H019

Implement selection/focus/tracking.

### H020

Implement orbital paths.

### H021

Implement simulation clock.

### H022

Implement time controls.

### H023

Implement scientific/visualization scaling.

### H024

Full integration validation.

# 22. Harness Stop Conditions

An agent must stop and ask for review if:

- architecture documents conflict
- scientific source is ambiguous
- required accuracy cannot be achieved
- reference data disagrees significantly
- a dependency boundary must be violated
- an API contract must change
- a new architectural concept is required

Do not allow an agent to resolve architectural conflicts silently.
