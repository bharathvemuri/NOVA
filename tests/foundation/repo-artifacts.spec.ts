import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// Regression coverage for AC 10 and AC 11. Neither has any other executed
// test in the repository: they are static-artifact criteria (license text,
// a documented ledger format, a docs tree, an ADR index) rather than runtime
// behaviour, so nothing else in the suite would notice a future agent
// deleting the LICENSE, un-Accepting an ADR, or dropping a docs directory.

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

describe('AC 10 — LICENSE, THIRD_PARTY_ASSETS ledger, README stub, docs tree', () => {
  it('LICENSE is MIT', async () => {
    const license = await readFile(path.join(repoRoot, 'LICENSE'), 'utf8');
    expect(license).toContain('MIT License');
    expect(license).toContain('Permission is hereby granted, free of charge');
  });

  it('THIRD_PARTY_ASSETS.md documents its row format and starts with zero live entries', async () => {
    const ledger = await readFile(path.join(repoRoot, 'THIRD_PARTY_ASSETS.md'), 'utf8');
    // The documented format table header.
    expect(ledger).toMatch(/\|\s*Asset\s*\|\s*Source URL\s*\|\s*Author\s*\|\s*Licence\s*\|/);
    expect(ledger).toContain('_None yet._');
  });

  it('control: a ledger with a real entry would not match the "no live entries" assertion', () => {
    const withEntry = '## Live entries\n\n| earth.jpg | https://example.com | ... |\n';
    expect(withEntry).not.toContain('_None yet._');
  });

  it('README.md exists and describes the repository', async () => {
    const readme = await readFile(path.join(repoRoot, 'README.md'), 'utf8');
    expect(readme.length).toBeGreaterThan(200);
    expect(readme).toMatch(/^# NOVA/);
  });

  it.each(['docs/architecture', 'docs/astronomy', 'docs/decisions', 'docs/validation'])(
    '%s exists as a directory',
    async (dir) => {
      const stats = await stat(path.join(repoRoot, dir));
      expect(stats.isDirectory()).toBe(true);
    },
  );
});

describe('AC 11 — docs/decisions holds all 20 ADRs from document 008, all Accepted', () => {
  it('exactly ADR-001 through ADR-020 are present as files', async () => {
    const entries = await readdir(path.join(repoRoot, 'docs/decisions'));
    const adrFiles = entries.filter((f) => /^ADR-\d{3}-.*\.md$/.test(f));

    expect(adrFiles).toHaveLength(20);
    for (let i = 1; i <= 20; i++) {
      const num = String(i).padStart(3, '0');
      const match = adrFiles.find((f) => f.startsWith(`ADR-${num}-`));
      expect(match, `ADR-${num} file missing from docs/decisions`).toBeDefined();
    }
  });

  it('every ADR file records Status: Accepted', async () => {
    const entries = await readdir(path.join(repoRoot, 'docs/decisions'));
    const adrFiles = entries.filter((f) => /^ADR-\d{3}-.*\.md$/.test(f));
    expect(adrFiles.length).toBeGreaterThan(0);

    for (const file of adrFiles) {
      const content = await readFile(path.join(repoRoot, 'docs/decisions', file), 'utf8');
      expect(content, `${file} does not record "Status: Accepted"`).toMatch(
        /^Status:\s*Accepted\s*$/m,
      );
    }
  });

  it('control: a non-Accepted ADR body would fail the status assertion', () => {
    const proposed = '# ADR-999 — Hypothetical\n\nStatus: Proposed\n';
    expect(proposed).not.toMatch(/^Status:\s*Accepted\s*$/m);
  });

  it('the ADR index (docs/decisions/README.md) links every one of the 20 ADRs', async () => {
    const index = await readFile(path.join(repoRoot, 'docs/decisions/README.md'), 'utf8');
    for (let i = 1; i <= 20; i++) {
      const num = String(i).padStart(3, '0');
      expect(index, `index missing a reference to ADR-${num}`).toContain(`ADR-${num}`);
    }
  });

  it('the canonical source (docs/008_ADR_Index.md) also lists exactly 20 ADRs, all Accepted', async () => {
    const canonical = await readFile(path.join(repoRoot, 'docs/008_ADR_Index.md'), 'utf8');
    const headings = [...canonical.matchAll(/^## (ADR-\d{3})\b/gm)].map((m) => m[1]);
    expect(headings).toHaveLength(20);
    const statuses = [...canonical.matchAll(/^Status:\s*(\S+)/gm)];
    expect(statuses).toHaveLength(20);
    for (const [, status] of statuses) {
      expect(status).toBe('Accepted');
    }
  });
});
