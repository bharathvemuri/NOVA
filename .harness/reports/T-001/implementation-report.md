# T-001 Implementation Report — Monorepo foundation, toolchain and CI

**This is a remediation pass** against `.harness/reports/T-001/review-decision.md`
(Decision: REQUEST_CHANGES). It supersedes the implementation report from the
prior cycle for reporting purposes; that cycle's S1–S4 work
(`.gitignore` dist-types entry, boundary-checker devDependency union, ESLint
deep-subpath groups, README E2E note) is retained unchanged in the tree and is
not re-described here except where this pass touches the same files.

## Reviewer findings addressed

| # | Finding | File(s) | Status |
|---|---|---|---|
| R-001 | ESLint flat config `packages/**/*.{ts,tsx}` block (declared last) silently overrode the `packages/astronomy/**` and `packages/renderer/**` `no-restricted-imports` blocks, because flat config replaces rule options per matching file rather than merging them. Net effect: `three`, `react`, `react-dom`, `express` were restricted nowhere. | `eslint.config.js` | **Fixed** |
| R-001 (test gap) | No test proved the restricted-import rules actually report a violation; `pnpm lint` passing was not evidence the rules worked. | `tests/boundaries/lint-boundaries.spec.ts` (new) | **Fixed** |
| R-002 / SEC-001 | GitHub Actions steps pinned to mutable tags (`@v4`) rather than 40-char commit SHAs. | `.github/workflows/ci.yml` | **Fixed** |
| gate: build / test "no parseable result" | Reviewer's own prior investigation (review-decision.md) attributed this to a harness output-parsing artifact (ANSI/UTF-8 mis-decoding), not a real failure, and confirmed both gates pass by direct re-run. Re-confirmed again in this pass — see Commands run below. | — | **Confirmed non-issue, re-verified** |
| gate: security-scan findings | security-report.md already assessed these (0 CRITICAL, 0 HIGH; SEC-001 MEDIUM, SEC-002/003/004/005 LOW/INFO) and did not block. SEC-001, the one finding with a concrete recommended fix inside this ticket's scope, is fixed above. SEC-002 (pnpm supply-chain settings) is explicitly deferred by that report because the required settings are inert below pnpm 10 and the repo is pinned to pnpm 9.15.9 — upgrading the pnpm major version is out of scope for a review-driven fix in a foundation ticket and was correctly not requested by the Reviewer. | — | **SEC-001 fixed; others correctly out of scope per security-report.md** |

## Work done this pass

### 1. Fix the ESLint boundary-rule override (R-001)

`eslint.config.js`: reordered the three `no-restricted-imports` blocks so the
generic `packages/**/*.{ts,tsx}` block (blocks `@nova/web`/`@nova/api` for
every package) is declared **first**, and the more specific
`packages/astronomy/**` and `packages/renderer/**` blocks are declared
**last** — so they are the ones that win ESLint's per-file "last match wins"
override semantics, instead of being overridden themselves.

`packages/astronomy`'s group was already a superset of the generic block, so
reordering alone was sufficient there. `packages/renderer`'s group was **not**
a superset — it omitted `@nova/web`/`@nova/web/*` — so, per the review's exact
instruction, I added those two entries to renderer's `group` array. Renderer
now blocks `react`, `react-dom`, `express`, `@nova/api`, `@nova/api/*`,
`@nova/web`, `@nova/web/*`.

A comment block above the generic block now states the "last object wins,
does not merge" invariant explicitly and points at the new regression test,
so a future edit that reorders these blocks again fails a test instead of
silently going inert.

### 2. Add a regression test that proves the rules fire (R-001, test gap)

New file `tests/boundaries/lint-boundaries.spec.ts`, run under the existing
`tests` Vitest project (picked up automatically by the `boundaries/**` glob
already in `tests/tsconfig.json`'s `include`). It runs the **real**
`eslint.config.js` via the ESLint Node API (`new ESLint({ cwd: repoRoot })`,
`lintFiles`), against fixtures written to (and removed from, in `afterEach`,
unconditionally) `packages/astronomy/src/__eslint_boundary_fixture__.ts` and
`packages/renderer/src/__eslint_boundary_fixture__.ts` — physical, in-tree
locations, not an OS temp directory, because ESLint's flat-config `files`
globs and typescript-eslint's `projectService` both resolve against real
repo-relative paths and real tsconfig `include` globs (the same reason the
existing `tests/dom-exclusion/dom-exclusion.spec.ts` extends the real
astronomy tsconfig by absolute path rather than inventing a fresh one).

Three tests:

1. A fixture importing `three`, `react`, `react-dom`, `express`,
   `@nova/renderer`, `@nova/web`, `@nova/api` (one import per line) inside
   `packages/astronomy/src/` must produce exactly 7 `no-restricted-imports`
   messages, one per import line — proving each forbidden specifier is
   individually caught, not just that some violation fires.
2. The same for `packages/renderer/src/`, importing `react`, `react-dom`,
   `express`, `@nova/api`, `@nova/web` (5 imports) — this is the exact case
   the review found broken (renderer losing the `@nova/web` restriction).
3. Control: linting the real `packages/astronomy/src/index.ts` and
   `packages/renderer/src/index.ts` produces zero `no-restricted-imports`
   messages, so the rule doesn't false-positive on legitimate code.

Verified red-before/green-after by construction: run against the pre-fix
config (blocks reordered back), tests 1 and 2 fail (0 messages instead of 7/5,
confirmed manually during development of this fix before the reorder was
applied); against the fixed config, all pass — see Commands run.

Each `it()` carries an explicit 60s timeout: typescript-eslint's
`projectService` cold-starts a full TypeScript program for a package the
first time this suite lints a file in it (~22–29s observed for
`packages/astronomy`, the first package touched), well past Vitest's default
5s per-test timeout, which is tuned for the pure-logic tests in
`boundaries.spec.ts`, not a real typed-lint invocation.

### 3. Pin GitHub Actions to commit SHAs (R-002 / SEC-001)

`.github/workflows/ci.yml`: all six `uses:` steps (`actions/checkout`,
`pnpm/action-setup`, `actions/setup-node`, in both the `verify` and `e2e`
jobs) now pin a 40-character commit SHA with the human-readable version
retained as a trailing comment, resolved live against each action's GitHub
API `refs/tags/v4` (and, for the one repository using an annotated tag,
dereferenced to the underlying commit):

- `actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0`
- `pnpm/action-setup@b906affcce14559ad1aafd4ab0e942779e9f58b1 # v4.3.0`
- `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0`

Verified structurally (see Commands run): every `uses:` line in the workflow
now matches a 40-hex-char SHA with a non-empty trailing comment.

## Files changed

| File | Reason |
|---|---|
| `eslint.config.js` | R-001: reorder `no-restricted-imports` blocks so the specific ones win; add `@nova/web`/`@nova/web/*` to renderer's group |
| `tests/boundaries/lint-boundaries.spec.ts` (new) | R-001: regression test proving layer 2 (import-level lint) actually fires, matching the standard `tests/boundaries/boundaries.spec.ts` sets for layer 1 |
| `.github/workflows/ci.yml` | R-002 / SEC-001: pin all six third-party Action steps to 40-char commit SHAs with version comments |

No other files were touched. No product code (astronomical calculation, HTTP
route, Three.js scene) was added or modified.

## Commands run (evidence)

```
$ pnpm install --frozen-lockfile
Scope: all 6 workspace projects
Lockfile is up to date, resolution step is skipped
Already up to date
Done in 1s using pnpm v9.15.9

$ pnpm check:boundaries
Dependency boundary check passed for 5 workspace package(s).   exit 0

$ pnpm typecheck
tsc -b   exit 0, no output

$ pnpm lint   # before prettier --write on the 3 files this pass touched
...
[warn] .github/workflows/ci.yml
[warn] eslint.config.js
[warn] tests/boundaries/lint-boundaries.spec.ts
Code style issues found in 3 files.  exit 1

$ pnpm exec prettier --write .github/workflows/ci.yml eslint.config.js \
    tests/boundaries/lint-boundaries.spec.ts
.github/workflows/ci.yml 32ms
eslint.config.js 46ms
tests/boundaries/lint-boundaries.spec.ts 55ms

$ pnpm lint   # after
eslint . — exit 0
prettier --check . — "All matched files use Prettier code style!"  exit 0

$ pnpm test
 ✓ tests boundaries/boundaries.spec.ts (6 tests) 20ms
 ✓ tests dom-exclusion/dom-exclusion.spec.ts (2 tests) 1078ms
 ✓ tests boundaries/lint-boundaries.spec.ts (3 tests) 22558ms
     ✓ flags every forbidden import inside packages/astronomy, one per line  21851ms
     ✓ flags every forbidden import inside packages/renderer, including @nova/web (the omission this review caught)  668ms
     ✓ control: the real, in-tree entry points are clean
 Test Files  3 passed (3)
      Tests  11 passed (11)
 exit 0

$ pnpm build
tsc -b — exit 0
vite build — 17 modules transformed, dist/index.html + dist/assets emitted,
built in ~270ms — exit 0

$ pnpm exec playwright install --with-deps chromium
0 upgraded, 0 newly installed, 0 to remove and 2 not upgraded.  exit 0

$ pnpm test:e2e
Running 1 test using 1 worker
  ✓  1 [chromium] › tests/e2e/smoke.spec.ts:7:1 › the built app loads and
     mounts #root (143ms)
1 passed (6.2s)   exit 0

$ pnpm verify        # full chain, final run after all edits
check:boundaries → typecheck → lint → test → build, all exit 0
(see individual step output above)

$ find . -name '__eslint_boundary_fixture__.ts' \
    -not -path './node_modules/*' -not -path './.pnpm-store/*'
(no output — confirms the lint-boundaries.spec.ts fixtures leave no trace)

$ node -e '... structural check that every "uses:" line in ci.yml is pinned
    to a 40-hex-char SHA with a trailing version comment ...'
21: actions/checkout@11d5960a3267...  pinned=true  comment=v4.4.0
23: pnpm/action-setup@b906affcce14...  pinned=true  comment=v4.3.0
25: actions/setup-node@49933ea5288c...  pinned=true  comment=v4.4.0
63: actions/checkout@11d5960a3267...  pinned=true  comment=v4.4.0
65: pnpm/action-setup@b906affcce14...  pinned=true  comment=v4.3.0
67: actions/setup-node@49933ea5288c...  pinned=true  comment=v4.4.0
ALL ACTIONS PINNED WITH VERSION COMMENTS
```

### On "gate: build" / "gate: test" producing no parseable result

Re-confirmed independently in this pass, consistent with the Reviewer's own
prior finding: `pnpm build` and `pnpm test` both exit 0 with clean, parseable
output when run directly (above). The container's `.git` metadata points at a
non-existent Windows host path
(`gitdir: C:/Users/Bharath/Documents/code/NOVA/.git/worktrees/T-001`), so no
`git` command runs in this environment — `git status --porcelain` fails with
`fatal: not a git repository`. This is an environment/harness artifact
unrelated to the change and was already noted by the Architect (plan §10 R1),
the prior Developer pass, and the Reviewer; it is not a defect in this
ticket's deliverable.

## Deviations from the plan

None beyond what the Reviewer required. The implementation plan's §9 (S1–S4)
was already complete from the prior cycle; this pass is scoped entirely to
`review-decision.md`'s three required changes and does not touch the
architecture, package layout, or scope.

## Success criteria status

- [x] Requirements implemented — all 12 acceptance criteria still hold (no
      AC-relevant behaviour changed; the fix restores enforcement AC 7/8
      already claimed as satisfied by layer 1, and now also delivers on the
      "a lint rule" half of AC 7's "a lint rule or dependency-boundary check")
- [x] Existing behaviour preserved — no package's public exports, tsconfig
      graph, CI job structure (steps, order, triggers), or boundary-checker
      logic changed; only lint-rule ordering/content and Action pins were
      edited
- [x] No unrelated files modified — diff is exactly the 3 files in the table
      above
- [x] Code compiles and builds — `pnpm typecheck` and `pnpm build` both
      exit 0 (output above)
- [x] Linter passes — `pnpm lint` exits 0
- [x] Tests pass — `pnpm test` (11/11) and `pnpm test:e2e` (1/1) both exit 0
- [x] New functionality has tests — R-001's fix has a dedicated 3-test spec
      that fails if the override regresses
- [x] No secrets introduced — no `.env`, credential, or token files touched;
      the SHA pins are public, non-secret commit hashes
- [x] The implementation plan was followed — this pass is a remediation
      cycle against review feedback, not a plan deviation; plan §9 remains
      fully executed from the prior cycle
- [x] Reviewer findings from the prior cycle addressed — R-001 fixed and
      tested, R-002/SEC-001 fixed; the two gate/scan items were re-verified
      as non-issues per the Reviewer's own prior analysis
