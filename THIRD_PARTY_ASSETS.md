# Third-Party Assets

NOVA is MIT-licensed (see `LICENSE`), but some non-code assets (textures,
maps, models) may be sourced under their own, separate licences — several
candidate sources (e.g. Solar System Scope) publish their texture maps under
CC-BY. Every such asset must be recorded here **before** it is added to the
repository, so attribution obligations are never separated from the file
that creates them.

This file currently has **zero entries**. It is seeded by this ticket
(T-001) so the ledger exists before the first asset lands; the first real
entries are added by the ticket that introduces planet/moon textures.

## Format

One row per asset, in this table:

| Asset | Source URL | Author | Licence | Licence URL | Retrieved | Used in | Modifications |
| ----- | ---------- | ------ | ------- | ----------- | --------- | ------- | ------------- |

- **Asset** — file name/path as it appears in the repository.
- **Source URL** — the page the asset was downloaded from.
- **Author** — the credited creator, as named by the source.
- **Licence** — the SPDX identifier or short name (e.g. `CC-BY-4.0`).
- **Licence URL** — a link to the full licence text.
- **Retrieved** — the ISO-8601 date the asset was downloaded.
- **Used in** — the package/app that ships it (e.g. `apps/web`).
- **Modifications** — `none`, or a short description of what changed (crop,
  recompress, recolor, etc.) — required by licences such as CC-BY that ask
  derivative works to be marked as such.

### Worked example (not a live entry)

| Asset                 | Source URL                                   | Author             | Licence   | Licence URL                                    | Retrieved  | Used in    | Modifications        |
| --------------------- | -------------------------------------------- | ------------------ | --------- | ---------------------------------------------- | ---------- | ---------- | -------------------- |
| `earth_daymap_2k.jpg` | `https://www.solarsystemscope.com/textures/` | Solar System Scope | CC-BY-4.0 | `https://creativecommons.org/licenses/by/4.0/` | 2026-08-18 | `apps/web` | Resized to 2048x1024 |

## Live entries

_None yet._
