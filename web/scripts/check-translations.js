#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function getAllKeys(obj, prefix = '') {
  const keys = new Map();

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedKeys = getAllKeys(value, fullPath);
      nestedKeys.forEach((val, path) => keys.set(path, val));
    } else {
      keys.set(fullPath, value);
    }
  }

  return keys;
}

function findMissingKeys(source, target, targetLang) {
  const missing = [];

  for (const [keyPath, value] of source.entries()) {
    if (!target.has(keyPath)) {
      missing.push({
        path: keyPath,
        missingIn: targetLang,
        value,
      });
    }
  }

  return missing;
}

function findEmptyValues(translations) {
  const empty = [];

  for (const [keyPath, value] of translations.entries()) {
    if (typeof value === 'string' && value.trim() === '') {
      empty.push(keyPath);
    }
  }

  return empty;
}

function formatReport(differences, title) {
  if (differences.length === 0) {
    return '';
  }

  let report = `\n${title}\n${'='.repeat(title.length)}\n`;
  
  differences.forEach((diff, index) => {
    const sample =
      typeof diff.value === 'string' && diff.value.length > 60
        ? diff.value.substring(0, 57) + '...'
        : JSON.stringify(diff.value);
    
    report += `\n${index + 1}. ${diff.path}\n`;
    report += `   Sample value: ${sample}\n`;
  });

  return report;
}

function main() {
  const messagesDir = path.join(__dirname, '..', 'messages');
  const enPath = path.join(messagesDir, 'en.json');
  const loPath = path.join(messagesDir, 'lo.json');

  console.log('🔍 Checking translation parity...\n');

  if (!fs.existsSync(enPath)) {
    console.error(`❌ English translations file not found: ${enPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(loPath)) {
    console.error(`❌ Lao translations file not found: ${loPath}`);
    process.exit(1);
  }

  const enTranslations = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const loTranslations = JSON.parse(fs.readFileSync(loPath, 'utf-8'));

  const enKeys = getAllKeys(enTranslations);
  const loKeys = getAllKeys(loTranslations);

  const missingInLao = findMissingKeys(enKeys, loKeys, 'lo');
  const missingInEnglish = findMissingKeys(loKeys, enKeys, 'en');
  const emptyInEnglish = findEmptyValues(enKeys);
  const emptyInLao = findEmptyValues(loKeys);

  let hasErrors = false;

  console.log('📊 Statistics:');
  console.log(`   English keys: ${enKeys.size}`);
  console.log(`   Lao keys: ${loKeys.size}`);
  console.log(`   Key difference: ${Math.abs(enKeys.size - loKeys.size)}`);
  console.log();

  if (missingInLao.length > 0) {
    hasErrors = true;
    console.log(
      formatReport(
        missingInLao,
        `❌ Found ${missingInLao.length} key(s) in English but missing in Lao:`
      )
    );
    console.log('\n💡 Add these keys to: messages/lo.json\n');
  }

  if (missingInEnglish.length > 0) {
    hasErrors = true;
    console.log(
      formatReport(
        missingInEnglish,
        `❌ Found ${missingInEnglish.length} key(s) in Lao but missing in English:`
      )
    );
    console.log('\n💡 Add these keys to: messages/en.json\n');
  }

  if (emptyInEnglish.length > 0) {
    hasErrors = true;
    console.log(`\n⚠️  Found ${emptyInEnglish.length} empty value(s) in English:`);
    emptyInEnglish.forEach((key, i) => {
      console.log(`   ${i + 1}. ${key}`);
    });
    console.log();
  }

  if (emptyInLao.length > 0) {
    hasErrors = true;
    console.log(`\n⚠️  Found ${emptyInLao.length} empty value(s) in Lao:`);
    emptyInLao.forEach((key, i) => {
      console.log(`   ${i + 1}. ${key}`);
    });
    console.log();
  }

  if (!hasErrors) {
    console.log('✅ All translation keys are in sync!');
    console.log('✅ No empty values found.');
    console.log();
    process.exit(0);
  } else {
    console.log('❌ Translation parity check failed.');
    console.log('   Please fix the issues above before committing.\n');
    process.exit(1);
  }
}

main();
