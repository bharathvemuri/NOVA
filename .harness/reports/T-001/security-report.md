# Security Report — T-001 Monorepo foundation, toolchain and CI

**Verdict: PASS (not blocking).** CRITICAL = 0, HIGH = 0.
Findings: 1 MEDIUM, 2 LOW, 2 INFO.

## Scope and threat model

T-001 adds no astronomical calculation, no HTTP route, no Three.js scene, no
database, no user input and no authenticated surface. Verified, not assumed:

- `apps/api/src/index.ts` exports two constants; no Express, no router, no listener.
- `grep -rn '"three"\|"express"' --include=package.json` over `apps/`, `packages/`, root → **no matches**.
- `grep -rnE 'eval\(|new Function|dangerouslySetInnerHTML|innerHTML|child_process|execSync|process\.env|fetch\(|XMLHttpRequest'` over `apps/*/src packages/*/src scripts tests` → **no matches in source**. (Only `playwright.config.ts:13 process.env.CI`.)

The attack surface of this change is therefore **the build and CI supply chain**,
not the application. The audit is weighted accordingly.

## Scanner evidence

### Semgrep 1.173.0 — `--config auto`

The harness gate reported 22 findings and failed. **12 of those are false
positives against `.pnpm-store/`**, the local pnpm content-addressable cache,
which is untracked (`.gitignore:9 .pnpm-store/`). Semgrep normally honours
`.gitignore`, but git is non-functional in this container (`.git` → `gitdir:
C:/Users/Bharath/...`, a Windows host path), so semgrep could not resolve the
ignore set and walked the cache. Those findings (`ifs-tampering`,
`detect-insecure-websocket`, `detected-jwt-token`) are in third-party vendored
package payloads, not in this change, and do not exist in a CI checkout.

Re-run scoped to repository source:

```
semgrep scan --config auto --quiet --exclude='.pnpm-store' --exclude='node_modules' --exclude='test-results' --json
→ 10 findings, 0 errors
WARNING .github/workflows/ci.yml:21,23,25,63,65,67  github-actions-mutable-action-tag
MEDIUM  .npmrc:1                                    npm-missing-minimum-release-age
MEDIUM  pnpm-workspace.yaml:1                       pnpm-block-exotic-sub-dependencies
MEDIUM  pnpm-workspace.yaml:1                       pnpm-minimum-release-age
MEDIUM  pnpm-workspace.yaml:1                       pnpm-trust-policy
```

**Zero findings in application/package/script source.**

### Dependency scan

The harness gate ran `npm audit`, which **failed to execute**:

```
npm ERR! code ENOLOCK
npm ERR! audit This command requires an existing lockfile.
```

This is a gate/stack mismatch, not a project defect: the repo is pnpm-only and
has no `package-lock.json`. A scanner that cannot run is an evidence gap, so I
performed the check with the correct ecosystem scanner:

```
pnpm audit --audit-level=low   → exit 0, "No known vulnerabilities found"
pnpm audit --prod              → exit 0, "No known vulnerabilities found"
```

Lockfile integrity: 169 `resolution:` entries, 169 `integrity:` hashes (full
coverage), no `http://` registry references. Both CI jobs use
`pnpm install --frozen-lockfile`. All direct versions are exact-pinned
(`.npmrc: save-exact=true`).

The dependency-vulnerability check is therefore **performed and clean**, on real
evidence — not waived.

## Checks performed

| Check | Result | Evidence |
|---|---|---|
| Authentication | N/A | No auth surface; no server, no session, no identity code exists. |
| Authorization / resource ownership | N/A | No protected resource or endpoint exists. |
| Injection (general) | N/A | No interpreter, template or dynamic evaluation in source (grep above). |
| SQL injection | N/A | No database, no driver, no query. ADR-005 (no database). |
| Command injection | PASS | No `child_process`/`execSync` in source. `scripts/check-boundaries.mjs` spawns no process. |
| XSS | PASS | `App.tsx` renders two constants through React's auto-escaping JSX; no `dangerouslySetInnerHTML`/`innerHTML`. `index.html` has no inline script beyond the module entry. |
| CSRF | N/A | No state-changing endpoint, no cookie, no form. |
| SSRF | N/A | No outbound request construction in source. |
| Path traversal | PASS | `check-boundaries.mjs` reads only `pnpm-workspace.yaml` and `<dir>/package.json` under a fixed `REPO_ROOT`; inputs are repo-controlled config, not attacker-controlled. |
| Secret exposure | PASS | Secret-pattern grep over source/config → no matches. `grep -rn 'secrets\.' .github/` → none: CI consumes no secrets. No `.env`. |
| Cryptography | N/A | No crypto primitive, hashing or token logic in this change. |
| Session management | N/A | No session. |
| File uploads | N/A | No upload path. |
| Deserialization | PASS | Only `JSON.parse` of local workspace `package.json` files (`check-boundaries.mjs:97`). No YAML/pickle/native deserializer on untrusted input. |
| API exposure | N/A | No route registered (AC 12 verified). |
| Rate limiting | N/A | No endpoint to rate-limit. |
| Dependency vulnerabilities | PASS | `pnpm audit` clean, prod and dev; full integrity-hash coverage. See above. |
| CI/CD supply chain | **FINDING** | Mutable action tags — SEC-001 below. |
| Workflow trigger safety | PASS | Uses `pull_request`, **not** `pull_request_target`; `permissions: contents: read`; no secrets. Fork PRs cannot obtain write tokens. Good posture. |

## Findings

### SEC-001 — GitHub Actions steps pinned to mutable tags (supply chain)

- **Severity:** MEDIUM
- **Affected code:** `.github/workflows/ci.yml:21, 23, 25, 63, 65, 67`
- **Evidence:** Semgrep `github-actions-mutable-action-tag` (6 occurrences).
  `uses: actions/checkout@v4`, `uses: pnpm/action-setup@v4`,
  `uses: actions/setup-node@v4` in both the `verify` and `e2e` jobs.
- **Attack scenario:** A git tag is a mutable pointer. An attacker who compromises
  a maintainer account of `actions/checkout`, `pnpm/action-setup` or
  `actions/setup-node` (or the actions' own supply chain) repoints `v4` to
  malicious code. Every subsequent NOVA CI run — including runs on `push` to any
  branch — executes that code on the runner with the workspace checked out. The
  attacker gains arbitrary code execution in CI: they can tamper with the built
  `apps/web` bundle, poison the `actions/setup-node` pnpm cache (which is
  restored into later runs), or subvert the boundary/typecheck/lint gates so a
  later malicious change passes review. This is not hypothetical — it is the
  `tj-actions/changed-files`, `trivy-action` and `kics-github-action` compromise
  pattern.
- **Severity justification:** Held at MEDIUM, not HIGH, on the specific facts of
  this repository: `permissions: contents: read` (least privilege), no `secrets.*`
  referenced anywhere in `.github/`, no publish/deploy/release step, and
  `pull_request` rather than `pull_request_target`. There is no credential or
  production asset for an attacker to reach today, so impact is bounded to runner
  compromise and build/cache tampering. This severity should be **raised to HIGH
  the moment CI gains a secret, a deployment step, or a package-publish step** —
  which is likely within the roadmap. Semgrep labels the rule "Blocking"; that is
  the rule's own default, not a judgement about this repo's reachable impact.
- **Recommended fix:** Pin each third-party action to a full 40-character commit
  SHA with the human-readable version retained as a trailing comment, e.g.
  `uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608 # v4.1.1`.
  Apply to all six occurrences. Optionally adopt Dependabot
  (`.github/dependabot.yml`, `package-ecosystem: github-actions`) so the pins are
  updated deliberately rather than silently.
- **Verification:** Re-run
  `semgrep --config auto .github/workflows/ci.yml` → zero
  `github-actions-mutable-action-tag` findings; CI still green on both jobs.

### SEC-002 — pnpm supply-chain hardening settings absent, and unavailable at the pinned pnpm version

- **Severity:** LOW
- **Affected code:** `pnpm-workspace.yaml:1`, `.npmrc:1-3`, `package.json:6` (`"packageManager": "pnpm@9.15.9"`)
- **Evidence:** Semgrep flags three missing pnpm settings — `minimumReleaseAge`
  (rule cites "Added in: v10.16.0"), `trustPolicy` ("v10.21.0"),
  `blockExoticSubdeps` ("v10.26.0") — plus `min-release-age` in `.npmrc`
  ("Added in: npm v11.10"). The repository pins **pnpm 9.15.9**, so **none of
  these settings are honoured by the pinned package manager**; adding them to
  `pnpm-workspace.yaml` today would be silently inert and would create false
  assurance. The `.npmrc` rule is an npm-client rule and does not apply to a
  pnpm-only repo at all. Separately, pnpm 9 executes dependency lifecycle
  (`postinstall`) scripts by default without the allowlist gating that pnpm 10
  introduced.
- **Attack scenario:** A newly published malicious version of a transitive
  dependency (typosquat, or a compromised maintainer publishing a bad patch
  release) is resolved during a future `pnpm install`, and its `postinstall`
  script executes unsandboxed on a developer machine or CI runner. Present-day
  exploitability is **low**, because every direct version is exact-pinned, a
  lockfile with full integrity hashes is committed, and both CI jobs use
  `--frozen-lockfile` — so no unreviewed version can enter CI without a lockfile
  change in the diff. The exposure is to future dependency-adding tickets.
- **Recommended fix:** Do **not** paste the flagged keys into `pnpm-workspace.yaml`
  while pnpm 9 is pinned. Either (a) upgrade `packageManager` to pnpm ≥10.26 and
  then set `minimumReleaseAge: 10080`, `trustPolicy: no-downgrade` and
  `blockExoticSubdeps: true`, or (b) record the deferral explicitly (a note in
  `README.md` or a new ADR) so a later agent does not add inert settings believing
  they are enforced. Retain `--frozen-lockfile` in CI unconditionally — it is
  currently the control actually carrying this risk.
- **Verification:** After a pnpm 10 upgrade, `pnpm install --frozen-lockfile`
  still exits 0 and `semgrep --config auto pnpm-workspace.yaml` reports zero
  findings; confirm `pnpm config get minimumReleaseAge` echoes the configured
  value rather than being ignored.

### SEC-003 — Security gate's ecosystem scanner cannot run against a pnpm-only repo

- **Severity:** LOW (tooling/process defect, not a product vulnerability)
- **Affected code:** `/harness/gates/security-scan.sh` (`case node)` branch → `npm audit --audit-level=high`)
- **Evidence:** `/harness/reports/evidence/security-scan.log`:
  `npm ERR! code ENOLOCK / audit This command requires an existing lockfile.` The
  gate detects stack `node` and unconditionally invokes `npm`, but the project
  uses pnpm with `pnpm-lock.yaml` and no `package-lock.json`.
- **Attack scenario:** The failure mode is a **degraded audit**, not an exploit:
  every future ticket in this repo receives a dependency-scan result that is
  driven by npm's inability to start rather than by the actual vulnerability
  state of the dependency tree. Today it fails loudly (safe). The risk is that a
  reviewer, seeing this same ENOLOCK noise on every ticket, learns to dismiss the
  security gate's failure — the classic alert-fatigue path to a real advisory
  being waved through.
- **Recommended fix:** In the gate's `node` branch, select the scanner from the
  lockfile present: `pnpm audit --audit-level=high` when `pnpm-lock.yaml` exists,
  `yarn npm audit` for `yarn.lock`, `npm audit` for `package-lock.json`. Treat
  "no lockfile matched any known scanner" as the blocking evidence gap.
- **Verification:** Re-run `/harness/gates/security-scan.sh` on this worktree; the
  ecosystem stage should report `clean` from `pnpm audit` (independently
  confirmed above) instead of erroring.

### SEC-004 — Semgrep scans the untracked pnpm store, producing false positives (INFO)

- **Severity:** INFO
- **Affected code:** container git configuration; `.gitignore:9`
- **Evidence:** 12 of the gate's 22 findings resolve to
  `.pnpm-store/v3/files/...`. `.pnpm-store/` is correctly gitignored. `git status`
  → `fatal: not a git repository: /workspace/C:/Users/Bharath/...` — the worktree's
  `.git` file points at a Windows host path, so semgrep cannot apply the ignore set.
- **Impact:** Gate noise and a misleading FAIL; it also inflates scan time. No
  security impact on the product.
- **Recommended fix:** Add `--exclude='.pnpm-store'` to the gate's semgrep
  invocation (defence in depth even where git works), and fix the container's git
  worktree linkage so ignore semantics and diff-scoped review work at all.
- **Verification:** `semgrep scan --config auto --exclude='.pnpm-store' .` returns
  only the 10 repository-source findings listed above.

### SEC-005 — `build` and `test` gates reported "no parseable result" (INFO)

- **Severity:** INFO
- **Evidence:** Independently re-run in this audit: `pnpm test` → `1 passed (1) /
  6 passed (6)`, exit 0. `pnpm check:boundaries` → "Dependency boundary check
  passed for 5 workspace package(s)", exit 0.
- **Impact:** The gate FAILs are harness result-parsing artifacts, not real build
  or test failures. Recorded so the Reviewer does not attribute them to the change.

## Positive controls observed

Worth recording, because they are the controls that hold SEC-001 and SEC-002 at
their assigned severities:

- `permissions: contents: read` — least-privilege `GITHUB_TOKEN`.
- `pull_request` (not `pull_request_target`) — fork PRs get no privileged context.
- No secrets referenced in any workflow; no `.env` in the repo.
- `--frozen-lockfile` in both CI jobs; lockfile committed with 169/169 integrity hashes.
- `save-exact=true` — no floating version ranges for agent-added dependencies.
- `concurrency.cancel-in-progress` and 15-minute `timeout-minutes` on both jobs.
- Boundary enforcement is genuinely mechanised and unit-tested: rules 1–2 walk
  `devDependencies`/`peerDependencies` as well as `dependencies`
  (`scripts/check-boundaries.mjs:135-141`), so a forbidden package cannot hide in
  devDeps — verified by the passing 6-test boundary spec.
- MIT `LICENSE` present; `THIRD_PARTY_ASSETS.md` ledger seeded before any asset
  lands; 20/20 ADRs recorded `Status: Accepted`.

## Blocking assessment

```
CRITICAL = 0   → no block
HIGH     = 0   → no block
```

All required checks were performed or ruled not applicable with a stated reason.
The one scanner that failed to execute (`npm audit`) was substituted with the
correct ecosystem scanner (`pnpm audit`) and produced real, clean evidence, so
there is no unperformed audit being reported as a pass.

**T-001 is not blocked on security grounds.** SEC-001 should be fixed in this
ticket if the Reviewer is willing (it is a six-line change), and **must** be
fixed before CI gains any secret, publish or deploy step.
