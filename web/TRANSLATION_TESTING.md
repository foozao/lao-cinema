# Translation Parity Testing

This document explains how to test and maintain translation key parity between English and Lao translation files.

## Problem

When working with bilingual content, translation keys can occasionally get lost or become out of sync between `messages/en.json` and `messages/lo.json`. This can result in:
- Missing translations causing fallback text or errors
- Dead keys in one language that aren't used
- Development confusion when keys don't match

## Solution

We have two automated testing approaches to prevent translation loss:

### 1. Automated Jest Test (CI/CD)

A Jest test runs automatically with every test suite execution:

**Location:** `lib/__tests__/translations-parity.test.ts`

**What it checks:**
- All English keys exist in Lao
- All Lao keys exist in English
- Key structures are identical
- No empty string values in either language
- Reports statistics on total key counts

**Run with:**
```bash
npm test translations-parity
```

The test will **fail** if any discrepancies are found, preventing bad code from being merged.

### 2. CLI Script (Developer Tool)

A detailed command-line tool for checking translations during development:

**Location:** `scripts/check-translations.js`

**Features:**
- ✅ Detailed reporting of missing keys
- ✅ Shows sample values for missing translations
- ✅ Lists empty string values
- ✅ Clear actionable error messages
- ✅ Exit code 1 on failure (CI-compatible)

**Run with:**
```bash
npm run check:translations
```

**Example output:**
```
🔍 Checking translation parity...

📊 Statistics:
   English keys: 782
   Lao keys: 782
   Key difference: 0

✅ All translation keys are in sync!
✅ No empty values found.
```

**Example error output:**
```
🔍 Checking translation parity...

📊 Statistics:
   English keys: 779
   Lao keys: 782
   Key difference: 3

❌ Found 3 key(s) in Lao but missing in English:
===============================================

1. profile.continueWatching.backToProfile
   Sample value: "ກັບໄປໂປຣໄຟລ໌"

2. profile.continueWatching.remove
   Sample value: "ລຶບອອກ"

3. profile.continueWatching.removing
   Sample value: "ກຳລັງລຶບ..."

💡 Add these keys to: messages/en.json

❌ Translation parity check failed.
   Please fix the issues above before committing.
```

## Usage Workflow

### During Development

1. **Before adding new translation keys:**
   ```bash
   npm run check:translations
   ```

2. **After adding keys to one language:**
   - Add corresponding keys to the other language
   - Run the check again to verify

3. **Before committing:**
   ```bash
   npm test  # Includes translation parity test
   ```

### In CI/CD

The Jest test runs automatically in your CI pipeline. If translations are out of sync, the build will fail with clear error messages indicating which keys need to be added.

## Best Practices

1. **Add keys in pairs:** When adding a new translation key, immediately add it to both `en.json` and `lo.json`

2. **Use nested structure:** Organize translations logically:
   ```json
   {
     "profile": {
       "settings": {
         "title": "Account Settings",
         "email": "Email Address"
       }
     }
   }
   ```

3. **No empty strings:** Always provide meaningful translations. Empty strings trigger test failures.

4. **Use the CLI tool:** Run `npm run check:translations` frequently during development for immediate feedback.

5. **Review before merging:** Always check translation parity before creating a pull request.

## Key Naming Convention

Follow these patterns for consistency:

- **Buttons/Actions:** `buttonName`, `actionName` (e.g., `save`, `cancel`, `delete`)
- **Titles:** `title`, `heading`, `subtitle`
- **Descriptions:** `description`, `message`, `notice`
- **States:** `loading`, `saving`, `error`, `success`
- **Plurals:** `item`, `items` or use ICU format: `{count, plural, one {item} other {items}}`

## Troubleshooting

### "Cannot find module '@/messages/en.json'"

Make sure you're running tests from the `/web` directory:
```bash
cd web
npm test translations-parity
```

### CLI script shows wrong path

The script uses `__dirname` to find the messages folder. Run it from the project root or use the npm script:
```bash
npm run check:translations
```

### False positive duplicate key warnings

If your IDE shows duplicate key warnings for keys in different nested objects (e.g., `admin.genres.nameLao` and `admin.productionCompanies.nameLao`), these are not actual errors - they're different paths in the JSON structure.

## Files

- **Test:** `lib/__tests__/translations-parity.test.ts`
- **CLI Script:** `scripts/check-translations.js`
- **Translations:** `messages/en.json`, `messages/lo.json`
- **Test Docs:** `TESTING.md` (general testing info)
- **i18n Setup:** `I18N_SETUP.md` (next-intl configuration)

## Contributing

When adding new features that require translations:

1. Add keys to both `en.json` and `lo.json` in the same commit
2. Run `npm run check:translations` to verify
3. Include translation changes in your PR description
4. Ensure the Jest test passes before requesting review

## Related Documentation

- **Language System:** `/docs/architecture/LANGUAGE_SYSTEM.md` - Overall bilingual architecture
- **i18n Setup:** `I18N_SETUP.md` - next-intl configuration and routing
- **Translation Keys:** `TRANSLATION_KEYS.md` - Complete reference of all translation keys
