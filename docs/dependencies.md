# Dependency Record

Per `docs/005_AI_Harness_Implementation_Protocol.md` §11, every direct
dependency is recorded here at the time it is added: reason, alternatives
considered, licence, and maintenance signal. This is the initial record
seeded by ticket T-001 for the foundation toolchain.

| Dependency | Reason | Alternatives considered | Licence | Maintenance |
|---|---|---|---|---|
| `typescript` | Strong domain contracts, ADR-002 | — (mandated by ADR-002) | Apache-2.0 | Microsoft, active |
| `eslint` + `typescript-eslint` | Lint gate incl. dependency-boundary rules (AC 7/8) | `biome` (rejected: weaker TS-project-aware `no-restricted-imports` equivalent at evaluation time) | MIT | Active |
| `eslint-config-prettier` | Disables ESLint formatting rules so Prettier is the single source of truth for formatting | — | MIT | Active |
| `prettier` | Formatting gate (`pnpm lint:format`) | ESLint stylistic rules (rejected: Prettier is the more common, lower-maintenance choice) | MIT | Active |
| `vitest` | Unit test runner; native TS + ESM, `projects` field maps 1:1 onto the workspace | Jest (rejected: heavier ESM/TS config for this stack) | MIT | Active |
| `vite` + `@vitejs/plugin-react` | `apps/web` build tool, fixed by the answered toolchain questions | — (mandated) | MIT | Active |
| `react` / `react-dom` | `apps/web` UI library, fixed by the answered toolchain questions | — (mandated) | MIT | Active |
| `@playwright/test` | E2E runner, fixed by the answered toolchain questions | Cypress (rejected: not the mandated toolchain) | Apache-2.0 | Active (Microsoft) |
| `zod` | Runtime schema validation for `packages/shared` contracts and `apps/api` request/response validation | — (mandated by the answered toolchain questions) | MIT | Active |
| `@types/node` | Node type definitions for `apps/api` and root tooling only — deliberately **not** added to `packages/astronomy` (see ADR-001, AC 7) | — | MIT | Active |

Deliberately not yet added (would be unjustifiable while unused, per §11):
`express` (arrives with the API ticket that adds routes), `three` (arrives
with the rendering ticket that adds scene code).

## Accepted risk: install scripts

`pnpm install` runs with default install-script behaviour (`ignore-scripts`
is **not** set) because `esbuild` (a `vite`/`vitest` transitive dependency)
and `playwright` (browser binary download) both require their install
scripts to function. This is an accepted supply-chain risk for this ticket;
a pnpm build-script allowlist is a follow-up for the dependency-audit
ticket, not this one.
