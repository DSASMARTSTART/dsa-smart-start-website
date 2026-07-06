import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Verifies every non-English locale has the SAME set of translation keys as English
// for every namespace. Catches missing/added keys before they ship as silent
// English fallbacks (or missing UI text).

const LOCALES_DIR = dirname(fileURLToPath(import.meta.url));
const REFERENCE = 'en';
const TARGETS = ['es', 'it', 'sr'];

/** Flatten a nested translation object into dotted key paths. */
function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flatten(v as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

function loadKeys(locale: string, ns: string): string[] {
  const raw = readFileSync(join(LOCALES_DIR, locale, ns), 'utf-8');
  return flatten(JSON.parse(raw));
}

const namespaces = readdirSync(join(LOCALES_DIR, REFERENCE)).filter((f) => f.endsWith('.json'));

describe('i18n locale completeness', () => {
  it('has the expected namespaces', () => {
    expect(namespaces.length).toBeGreaterThan(0);
  });

  for (const ns of namespaces) {
    const enKeys = loadKeys(REFERENCE, ns);
    for (const locale of TARGETS) {
      it(`${locale}/${ns} has the same keys as ${REFERENCE}/${ns}`, () => {
        const localeKeys = loadKeys(locale, ns);
        const missing = enKeys.filter((k) => !localeKeys.includes(k));
        const extra = localeKeys.filter((k) => !enKeys.includes(k));
        expect({ missing, extra }).toEqual({ missing: [], extra: [] });
      });
    }
  }
});
