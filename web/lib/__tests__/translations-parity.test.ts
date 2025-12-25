import { describe, it, expect } from '@jest/globals';
import enTranslations from '@/messages/en.json';
import loTranslations from '@/messages/lo.json';

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationObject = { [key: string]: TranslationValue };

interface KeyDifference {
  path: string;
  missingIn: 'en' | 'lo';
  value?: TranslationValue;
}

function getAllKeys(
  obj: TranslationObject,
  prefix = ''
): Map<string, TranslationValue> {
  const keys = new Map<string, TranslationValue>();

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedKeys = getAllKeys(
        value as TranslationObject,
        fullPath
      );
      nestedKeys.forEach((val, path) => keys.set(path, val));
    } else {
      keys.set(fullPath, value);
    }
  }

  return keys;
}

function findMissingKeys(
  source: Map<string, TranslationValue>,
  target: Map<string, TranslationValue>,
  targetLang: 'en' | 'lo'
): KeyDifference[] {
  const missing: KeyDifference[] = [];

  for (const [path, value] of source.entries()) {
    if (!target.has(path)) {
      missing.push({
        path,
        missingIn: targetLang,
        value,
      });
    }
  }

  return missing;
}

function formatKeyReport(differences: KeyDifference[]): string {
  if (differences.length === 0) return 'None';

  return differences
    .map((diff, index) => {
      const sample =
        typeof diff.value === 'string' && diff.value.length > 50
          ? diff.value.substring(0, 47) + '...'
          : diff.value;
      return `  ${index + 1}. ${diff.path}\n     Sample: ${JSON.stringify(sample)}`;
    })
    .join('\n');
}

describe('Translation Parity', () => {
  const enKeys = getAllKeys(enTranslations);
  const loKeys = getAllKeys(loTranslations);

  it('should have all English keys translated to Lao', () => {
    const missingInLao = findMissingKeys(enKeys, loKeys, 'lo');

    if (missingInLao.length > 0) {
      const report = [
        `\n❌ Found ${missingInLao.length} key(s) in English but missing in Lao:\n`,
        formatKeyReport(missingInLao),
        '\n\nPlease add these keys to /web/messages/lo.json',
      ].join('\n');

      throw new Error(report);
    }

    expect(missingInLao).toHaveLength(0);
  });

  it('should have all Lao keys present in English', () => {
    const missingInEnglish = findMissingKeys(loKeys, enKeys, 'en');

    if (missingInEnglish.length > 0) {
      const report = [
        `\n❌ Found ${missingInEnglish.length} key(s) in Lao but missing in English:\n`,
        formatKeyReport(missingInEnglish),
        '\n\nPlease add these keys to /web/messages/en.json',
      ].join('\n');

      throw new Error(report);
    }

    expect(missingInEnglish).toHaveLength(0);
  });

  it('should have identical key structures', () => {
    const enKeySet = new Set(enKeys.keys());
    const loKeySet = new Set(loKeys.keys());

    expect(enKeySet.size).toBe(loKeySet.size);

    const allKeysMatch = Array.from(enKeySet).every((key) =>
      loKeySet.has(key)
    );
    expect(allKeysMatch).toBe(true);
  });

  it('should not have empty string values in English', () => {
    const emptyKeys: string[] = [];

    for (const [path, value] of enKeys.entries()) {
      if (typeof value === 'string' && value.trim() === '') {
        emptyKeys.push(path);
      }
    }

    if (emptyKeys.length > 0) {
      throw new Error(
        `\n❌ Found ${emptyKeys.length} empty translation(s) in English:\n${emptyKeys.map((k, i) => `  ${i + 1}. ${k}`).join('\n')}`
      );
    }

    expect(emptyKeys).toHaveLength(0);
  });

  it('should not have empty string values in Lao', () => {
    const emptyKeys: string[] = [];

    for (const [path, value] of loKeys.entries()) {
      if (typeof value === 'string' && value.trim() === '') {
        emptyKeys.push(path);
      }
    }

    if (emptyKeys.length > 0) {
      throw new Error(
        `\n❌ Found ${emptyKeys.length} empty translation(s) in Lao:\n${emptyKeys.map((k, i) => `  ${i + 1}. ${k}`).join('\n')}`
      );
    }

    expect(emptyKeys).toHaveLength(0);
  });

  it('should report translation statistics', () => {
    const stats = {
      totalKeys: enKeys.size,
      englishKeys: enKeys.size,
      laoKeys: loKeys.size,
      keyDifference: Math.abs(enKeys.size - loKeys.size),
    };

    console.log('\n📊 Translation Statistics:');
    console.log(`   Total translation keys: ${stats.totalKeys}`);
    console.log(`   English keys: ${stats.englishKeys}`);
    console.log(`   Lao keys: ${stats.laoKeys}`);
    console.log(`   Key difference: ${stats.keyDifference}`);

    expect(stats.totalKeys).toBeGreaterThan(0);
    expect(stats.englishKeys).toBe(stats.laoKeys);
  });
});
