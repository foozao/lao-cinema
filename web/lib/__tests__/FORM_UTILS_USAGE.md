# Form Utilities Usage Guide

## Overview

The `form-utils.ts` module provides tested utility functions for detecting changes in form state. These utilities power the smart "Save" button behavior in admin edit pages.

**Test Results**: ✅ 42/42 tests passing

## Available Functions

### 1. `hasFormDataChanged<T>(original: T, current: T): boolean`

**Use case**: Detecting changes in flat form objects (most common).

**Example**:
```typescript
const originalForm = { title: 'Movie', year: '2024' };
const currentForm = { title: 'Updated Movie', year: '2024' };

if (hasFormDataChanged(originalForm, currentForm)) {
  // Enable save button
}
```

### 2. `hasObjectChanged(original: any, current: any): boolean`

**Use case**: Detecting changes in nested objects or complex state.

**Example**:
```typescript
const originalTranslations = {
  '1': { character_en: 'Hero', character_lo: '' },
  '2': { character_en: 'Villain', character_lo: '' },
};

const currentTranslations = {
  '1': { character_en: 'Hero', character_lo: 'ພະເອກ' },
  '2': { character_en: 'Villain', character_lo: '' },
};

if (hasObjectChanged(originalTranslations, currentTranslations)) {
  // Enable save button
}
```

### 3. `hasArrayChanged<T>(original: T[], current: T[]): boolean`

**Use case**: Detecting changes in arrays (lists of platforms, cast, etc.).

**Example**:
```typescript
const originalPlatforms = ['netflix', 'prime'];
const currentPlatforms = ['netflix', 'prime', 'disney'];

if (hasArrayChanged(originalPlatforms, currentPlatforms)) {
  // Enable save button
}
```

### 4. `hasAnyChanged(comparisons: boolean[]): boolean`

**Use case**: Combining multiple change checks.

**Example**:
```typescript
const hasChanges = hasAnyChanged([
  hasFormDataChanged(originalForm, currentForm),
  hasObjectChanged(originalCast, currentCast),
  hasArrayChanged(originalPlatforms, currentPlatforms),
]);

setHasChanges(hasChanges);
```

### 5. `hasStringChanged(original: string | null | undefined, current: string | null | undefined): boolean`

**Use case**: Comparing string fields that might be null/undefined.

**Example**:
```typescript
// Treats null, undefined, and '' as equivalent
if (hasStringChanged(person.homepage, formData.homepage)) {
  // Field actually changed
}
```

### 6. `normalizeValue(value: string | null | undefined): string`

**Use case**: Converting nullable values to consistent empty strings.

**Example**:
```typescript
const homepage = normalizeValue(person.homepage); // '' instead of null
```

## Real-World Integration Examples

### Edit Person Page

```typescript
// In useEffect for change detection
useEffect(() => {
  const currentValues = {
    nameEn,
    nameLo,
    biographyEn,
    biographyLo,
    birthday,
    deathday,
    placeOfBirth,
    knownForDepartment,
    homepage,
  };

  const changed = hasFormDataChanged(originalValues, currentValues);
  setHasChanges(changed);
}, [nameEn, nameLo, biographyEn, /* ... */, originalValues]);
```

### Edit Movie Page

```typescript
// In useEffect for complex change detection
useEffect(() => {
  const hasChanges = hasAnyChanged([
    hasFormDataChanged(originalFormData, formData),
    hasObjectChanged(originalCastTranslations, castTranslations),
    hasObjectChanged(originalCrewTranslations, crewTranslations),
    hasArrayChanged(originalExternalPlatforms, externalPlatforms),
    availabilityStatus !== originalAvailabilityStatus,
  ]);

  setHasChanges(hasChanges);
}, [
  formData,
  castTranslations,
  crewTranslations,
  externalPlatforms,
  availabilityStatus,
  originalFormData,
  originalCastTranslations,
  originalCrewTranslations,
  originalExternalPlatforms,
  originalAvailabilityStatus,
]);
```

## Benefits

1. **Tested**: 42 comprehensive unit tests ensure reliability
2. **Reusable**: Works across all admin forms
3. **Type-safe**: TypeScript support with generics
4. **Simple**: No complex mocking required for tests
5. **Fast**: Efficient comparison algorithms
6. **Maintainable**: Logic is centralized, not scattered

## Test Coverage

- ✅ Identical values detection
- ✅ Changed values detection
- ✅ Null/undefined handling
- ✅ Empty string normalization
- ✅ Nested object comparison
- ✅ Array order sensitivity
- ✅ Multiple state tracking
- ✅ Real-world scenarios (person edit, movie edit, revert detection)

## Running Tests

```bash
# Run all tests
npm test

# Run only form-utils tests
npm test lib/__tests__/form-utils.test.ts

# Watch mode
npm test -- --watch lib/__tests__/form-utils.test.ts
```

## Future Enhancements

Potential additions:
- `hasDeepChanged()` with custom comparator functions
- `trackChangedFields()` to show which fields changed
- `validateBeforeSave()` to combine with validation
- Performance optimization for very large objects
