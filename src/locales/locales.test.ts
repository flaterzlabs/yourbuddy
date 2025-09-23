import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

type LocaleTree = Record<string, unknown>;

const currentDir = dirname(fileURLToPath(import.meta.url));

const loadLocale = (lang: 'en' | 'pt'): LocaleTree => {
  const filePath = join(currentDir, lang, 'common.json');
  return JSON.parse(readFileSync(filePath, 'utf8')) as LocaleTree;
};

const collectKeys = (obj: LocaleTree, prefix = ''): string[] => {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return collectKeys(value as LocaleTree, path);
    }
    return path;
  });
};

describe('locales', () => {
  it('keeps english and portuguese keys in sync', () => {
    const en = loadLocale('en');
    const pt = loadLocale('pt');

    const enKeys = new Set(collectKeys(en));
    const ptKeys = new Set(collectKeys(pt));

    const missingInEn = [...ptKeys].filter((key) => !enKeys.has(key));
    const missingInPt = [...enKeys].filter((key) => !ptKeys.has(key));

    expect(missingInEn, `Keys missing in english: ${missingInEn.join(', ')}`).toHaveLength(0);
    expect(missingInPt, `Keys missing in portuguese: ${missingInPt.join(', ')}`).toHaveLength(0);
  });
});
