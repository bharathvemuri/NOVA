# T-001 Review Decision — Monorepo foundation, toolchain and CI

## Decision: REQUEST_CHANGES

One real defect: the ESLint half of the boundary enforcement (plan §6 layer 2) is
inert. Every `no-restricted-imports` rule protecting `packages/astronomy` and
`packages/renderer` from `three`, `react`, `react-dom` and `express` is silently
overridden and enforces nothing. Verified by execution, not by reading.

This is not a BLOCK: no blocking condition holds. AC 7 is written as "a lint rule
**or** dependency-boundary check", and the dependency-boundary check (layer 1) is
real and has teeth — I proved it fails CI when violated. So the boundary is still
enforced; the ticket ships a defence-in-depth layer that does not defend, which is
fixable inside this ticket.

---

## Blocking conditions — none hold

| Condition | Status | Evidence |
|---|---|---|
| Tests fail | NO | `pnpm test` → `TEST_EXIT=0`, 2 files / 8 tests passed |
| Build fails | NO | `pnpm build` → `BUILD_EXIT=0`, `dist/assets/index-BHKM5fLv.js 190.54 kB` emitted |
| CRITICAL security finding | NO | security-report.md: CRITICAL = 0 |
| HIGH security finding | NO | security-report.md: HIGH = 0 (SEC-001 held at MEDIUM with stated justification) |
| Required functionality missing | NO | AC 7's enforcement requirement satisfied by layer 1 — mutation test below |
| Architecture requirements violated | NO | ADR-001/002/003 boundaries enforced by layers 1 and 3 |

### On the `gate_verdict` FAILED

`build` and `test` were reported as "the gate produced no parseable result" — a
parser artifact, not a failure. I re-ran both directly:

```
pnpm test  -> TEST_EXIT=0   Test Files 2 passed (2) / Tests 8 passed (8)
pnpm build -> BUILD_EXIT=0  vite: 17 modules transformed, built in 262ms
```

The gate output contains raw ANSI escapes and mis-decoded UTF-8 (`âœ“` = `✓` read
as latin-1), a plausible cause for a parser producing nothing. I am confirming this
from my own runs, consistent with SEC-005, QA and Performance reaching it
independently. `git` is genuinely non-functional here (`.git` →
`gitdir: C:/Users/Bharath/...`), which is also why the supplied diff is empty.

---

## Finding R-001 (must fix) — ESLint boundary rules are silently overridden

**File:** `eslint.config.js:66-131`

**Claim.** ESLint flat config *replaces* rule options when several config objects
match the same file; it does not merge them. Three objects set
`no-restricted-imports` with overlapping `files`:

- `:69` `packages/astronomy/**/*.ts` — blocks `three`, `react`, `react-dom`, `express`, `@nova/renderer`, `@nova/web`, `@nova/api`
- `:100` `packages/renderer/**/*.{ts,tsx}` — blocks `react`, `react-dom`, `express`, `@nova/api`
- `:117` `packages/**/*.{ts,tsx}` — blocks only `@nova/web`, `@nova/api`

`:117` matches every file the other two match and is declared last, so it wins.
Inside `packages/**`, only app imports are restricted. `three`, `react`,
`react-dom` and `express` are restricted **nowhere**.

**Evidence — executed, files removed afterwards.**

Scratch file in `packages/astronomy/src/` importing all three forbidden externals:

```
$ pnpm exec eslint packages/astronomy/src/__scratch_boundary.ts
(no output, exit 0)
```

Control A — the file *is* being linted, and the *last* block's group *does* fire:

```
$ # same path, importing @nova/api
  1:1  error  '@nova/api' import is restricted ... AC 8: packages/* must not depend on apps/*
```

Control B — `three` import still present, other rules fire, `no-restricted-imports` does not:

```
2:7   error  Unsafe assignment of an error typed value   @typescript-eslint/no-unsafe-assignment
2:18  error  Unexpected any. Specify a different type    @typescript-eslint/no-explicit-any
3:14  error  Unsafe assignment of an `any` value         @typescript-eslint/no-unsafe-assignment
✖ 3 problems  — no no-restricted-imports error for `three`
```

`packages/renderer` — importing `react` and `express`: no output, not caught.

**Consequence.** Plan §6 claims three independent layers and justifies the
redundancy as load-bearing ("Removing any one leaves a path for a future agent to
violate ADR-001 with a green CI"). Layer 2 is that removed layer, in the exact
scenario it was written for: a forbidden **import** with no manifest entry. Worse,
S3 in the developer report ("extended `no-restricted-imports` groups to deep
subpaths") was applied entirely to inert blocks — it delivered zero enforcement,
and `pnpm lint` passing gave no signal, because a rule that matches nothing
cannot fail.

**Required change.** Make the specific groups actually apply — e.g. order the
generic `packages/**` object *first* and the astronomy/renderer objects last, or
collapse them into one object per file-set. Note `packages/astronomy`'s group is
already a superset of the generic one, but `packages/renderer`'s is **not**: it
omits `@nova/web`, which must be added or renderer loses that restriction on
reorder.

**Verification to run after fixing.** Re-run both scratch files above: astronomy
must error on `three`, `react`, `react-dom`, `express`, `@nova/renderer`,
`@nova/web`, `@nova/api`; renderer must error on `react`, `react-dom`, `express`,
`@nova/api`, `@nova/web`; then `pnpm lint` must still exit 0 on the real tree.
Add a test that asserts the rules fire, so this cannot regress silently again —
`tests/boundaries/` proves layer 1 has teeth and layer 2 deserves the same, per
plan §5's own standard.

## Finding R-002 (should fix, non-blocking) — SEC-001, mutable CI action tags

**File:** `.github/workflows/ci.yml:21,23,25,63,65,67`

Relying on Security's evidence, not re-deriving it. `actions/checkout@v4`,
`pnpm/action-setup@v4`, `actions/setup-node@v4` are mutable tags. Correctly held
at MEDIUM: `permissions: contents: read`, no `secrets.*`, no deploy/publish,
`pull_request` not `pull_request_target`. Six-line fix (pin 40-char SHAs); must
land before CI gains any secret, deploy or publish step. Not blocking today.

---

## Per-area verdicts

| Area | Verdict | Basis |
|---|---|---|
| Requirements | PASS (12/12 AC) | My own command runs + QA's AC mapping table |
| Architecture | PASS with defect | Layers 1 + 3 enforce ADR-001/002/003; layer 2 inert (R-001) |
| Correctness | REQUEST_CHANGES | R-001, verified by execution |
| Security | PASS | security-report.md: 0 CRITICAL, 0 HIGH; `pnpm audit` clean |
| Testing | PASS | QA re-ran all gates and closed a real AC 7 gap; 8/8 + 1/1 e2e |
| Performance | PASS | performance-report.md: scaffolding only, no baseline to regress |
| Maintainability | PASS with defect | R-001 is a config trap that reads as working |
| Documentation | PASS | 20/20 ADRs Accepted, MIT LICENSE, ledger, 4 docs dirs |

## Acceptance criteria — verified independently

| AC | Verdict | Evidence (my runs unless noted) |
|---|---|---|
| 1 install / lockfile | PASS | `pnpm install --frozen-lockfile` exit 0. Node here is v22.22.1, not 20 (plan R1) — "on Node 20 LTS" is evidenced by CI's `.nvmrc`, not locally |
| 2 packages resolve | PASS | `tsc -b` exit 0 across 6 projects; placeholders import across package edges |
| 3 project refs + strict | PASS | `pnpm typecheck` exit 0; root `tsconfig.json` `files: []` + 6 refs |
| 4 lint + test | PASS | `pnpm lint` exit 0; `pnpm test` 8/8 |
| 5 Vite build + Playwright | PASS | `pnpm build` exit 0; `pnpm test:e2e` `E2E_EXIT=0`, 1 passed |
| 6 zod scope | PASS | grep: zod only in `apps/api:14`, `packages/shared:18` |
| 7 astronomy isolation | PASS (weakened) | Layer 1 mutation test below; layer 3 `lib:["ES2022"], types:[]` + QA's `dom-exclusion.spec.ts`. Layer 2 dead — R-001 |
| 8 renderer / api direction | PASS (weakened) | Rule 3 in checker; `apps/api` → `@nova/astronomy` present, reverse absent. Layer 2 dead — R-001 |
| 9 CI workflow | PASS by equivalence | `ci.yml` runs install→boundaries→typecheck→lint→test→build on push+PR; each re-run by me. Hosted run status unobservable (git broken) |
| 10 LICENSE / docs tree | PASS | MIT LICENSE, `THIRD_PARTY_ASSETS.md`, README, 4 docs dirs present |
| 11 20 ADRs Accepted | PASS | `ls docs/decisions/ADR-*.md \| wc -l` → 20; `grep -L "Status: Accepted"` → empty |
| 12 no product code | PASS | 4 placeholder files export string consts only; subdirs `.gitkeep`-only; no `three`/`express` in any manifest |

### Layer 1 mutation test (the control that keeps AC 7/8 passing)

I did not take the boundary checker on trust. Added `three` to
`packages/astronomy/package.json` `dependencies`, then restored:

```
$ pnpm check:boundaries
Dependency boundary check failed:
  - @nova/astronomy -> (transitive) -> "three": forbidden external dependency
1 violation(s).
EXIT=1

$ # after restore (diff-verified identical)
Dependency boundary check passed for 5 workspace package(s).   EXIT=0
```

CI runs this as its first gate, so a forbidden manifest edge does fail the build.
This is what makes AC 7's "fails CI when violated" true today and is why R-001 is
REQUEST_CHANGES rather than BLOCK.

---

## Upstream evidence relied on

- **Security** — verdict, SEC-001 severity, and the `pnpm audit` substitution for the
  gate's broken `npm audit` (ENOLOCK against a pnpm-only repo). Not re-derived.
- **QA** — the AC-to-test mapping and the DOM-exclusion gap it found and closed
  (`tests/dom-exclusion/dom-exclusion.spec.ts`, red-before/green-after). I confirmed
  the resulting suite is 8/8; I did not re-audit the test design.
- **Performance** — scaffolding-only scope and the boundary checker's O(P×(P+E))
  watch item. Accepted as written.
- **Developer** — S1–S4. S1 (`dist-types/` in `.gitignore:14`), S2 (dev/peer deps in
  rules 1–2, `check-boundaries.mjs:135-141`) and S4 (README) verified present. **S3
  is where R-001 lives** — the change was made, but to blocks that never apply.

All three upstream agents credited the ESLint layer as working enforcement; none
tested it. That is the gap this review closes.

## Required changes

1. `eslint.config.js:66-131` — fix the override so astronomy/renderer restrictions
   apply; add `@nova/web` to renderer's group; verify with the scratch files above.
2. `eslint.config.js` — add a test asserting the restricted-import rules actually
   report, matching the standard `tests/boundaries/` already sets for layer 1.
3. `.github/workflows/ci.yml:21,23,25,63,65,67` — pin actions to 40-char SHAs
   (SEC-001; non-blocking, recommended in-ticket).

No application code was modified by this review. The two scratch files were removed
and `packages/astronomy/package.json` was restored and diff-verified identical.
