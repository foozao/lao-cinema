/**
 * Form Utilities
 * 
 * Helper functions for form state management and change detection
 */

/**
 * Deep comparison for objects using JSON serialization
 * Works well for plain objects with primitive values
 */
export function hasObjectChanged(original: unknown, current: unknown): boolean {
  return JSON.stringify(original) !== JSON.stringify(current);
}

/**
 * Shallow comparison for simple key-value objects
 * More performant than deep comparison for flat objects
 */
export function hasFormDataChanged<T extends Record<string, unknown>>(
  original: T,
  current: T
): boolean {
  const keys = Object.keys(current);
  
  return keys.some(key => {
    const originalValue = original[key as keyof T];
    const currentValue = current[key as keyof T];
    return originalValue !== currentValue;
  });
}

/**
 * Check if any field in a set of form states has changed
 * Useful when tracking multiple state objects
 */
export function hasAnyChanged(comparisons: boolean[]): boolean {
  return comparisons.some(changed => changed === true);
}

/**
 * Compare arrays for changes (order matters)
 * Uses JSON serialization for deep comparison
 */
export function hasArrayChanged<T>(original: T[], current: T[]): boolean {
  if (original.length !== current.length) {
    return true;
  }
  return JSON.stringify(original) !== JSON.stringify(current);
}

/**
 * Normalize empty values to consistent representation
 * Useful for comparing form fields that can be null, undefined, or empty string
 */
export function normalizeValue(value: string | null | undefined): string {
  return value || '';
}

/**
 * Check if two string values are effectively different
 * Treats null, undefined, and empty string as equivalent
 */
export function hasStringChanged(
  original: string | null | undefined,
  current: string | null | undefined
): boolean {
  return normalizeValue(original) !== normalizeValue(current);
}
