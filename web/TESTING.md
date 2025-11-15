# Testing Guide

This document describes the testing setup and practices for the Lao Cinema web application.

## Test Framework

- **Jest**: Test runner and assertion library
- **React Testing Library**: For testing React components
- **@testing-library/jest-dom**: Custom matchers for DOM assertions

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized using the `__tests__` directory pattern:

```
lib/
├── __tests__/
│   ├── i18n.test.ts
│   ├── images.test.ts
│   └── utils.test.ts
├── i18n.ts
├── images.ts
└── utils.ts
```

## Current Test Coverage

### ✅ Fully Tested (100% Coverage)

#### `lib/i18n.ts`
- **`createLocalizedText()`**: Creates bilingual text objects
  - English-only text
  - English + Lao text
  - Empty strings
  
- **`getLocalizedText()`**: Retrieves text in preferred language
  - English retrieval
  - Lao retrieval with fallback
  - Default language behavior
  - Edge cases (empty strings, special characters)

#### `lib/images.ts`
- **`getImageUrl()`**: Constructs image URLs
  - TMDB images (all types and sizes)
  - Custom hosted images
  - Null/undefined handling
  
- **`getPosterUrl()`**: Poster-specific helper
- **`getBackdropUrl()`**: Backdrop-specific helper
- **`getProfileUrl()`**: Profile photo helper
- **`isTMDBImage()`**: Image source detection
- **`getPlaceholderUrl()`**: Placeholder images

#### `lib/utils.ts`
- **`cn()`**: Tailwind class name merger
  - Single and multiple classes
  - Conditional classes
  - Conflicting class resolution
  - Arrays and objects
  - Responsive and state variants
  - Real-world component scenarios

## Writing Tests

### Test File Naming

- Place tests in `__tests__` directory next to the code
- Name test files: `[filename].test.ts` or `[filename].test.tsx`
- Use `.test.tsx` for component tests that need JSX

### Test Structure

```typescript
import { describe, it, expect } from '@jest/globals';
import { functionToTest } from '../module';

describe('module name', () => {
  describe('functionToTest', () => {
    it('should do something specific', () => {
      const result = functionToTest(input);
      expect(result).toBe(expected);
    });

    it('should handle edge case', () => {
      const result = functionToTest(edgeCase);
      expect(result).toBe(expectedEdgeResult);
    });
  });
});
```

### Best Practices

1. **Descriptive test names**: Use clear, behavior-focused descriptions
   - ✅ `should return Lao text when available`
   - ❌ `test 1`

2. **Arrange-Act-Assert pattern**:
   ```typescript
   it('should merge class names', () => {
     // Arrange
     const class1 = 'text-red-500';
     const class2 = 'bg-blue-500';
     
     // Act
     const result = cn(class1, class2);
     
     // Assert
     expect(result).toBe('text-red-500 bg-blue-500');
   });
   ```

3. **Test edge cases**: null, undefined, empty strings, special characters

4. **Group related tests**: Use nested `describe` blocks

5. **One assertion per test**: Keep tests focused (when possible)

## Testing Multi-Language Features

When testing localized content, always verify:

1. **English fallback**: Lao text should fallback to English when unavailable
2. **Both languages**: Test with both `en` and `lo` parameters
3. **Default behavior**: Test without specifying language (should use English)

Example:
```typescript
describe('getLocalizedText', () => {
  const text = createLocalizedText('Hello', 'ສະບາຍດີ');
  
  it('should return English', () => {
    expect(getLocalizedText(text, 'en')).toBe('Hello');
  });
  
  it('should return Lao', () => {
    expect(getLocalizedText(text, 'lo')).toBe('ສະບາຍດີ');
  });
  
  it('should fallback to English when Lao unavailable', () => {
    const englishOnly = createLocalizedText('Hello');
    expect(getLocalizedText(englishOnly, 'lo')).toBe('Hello');
  });
});
```

## Component Testing (Future)

When adding component tests:

1. **Use React Testing Library**:
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { MovieCard } from '../movie-card';
   
   it('should display movie title', () => {
     render(<MovieCard movie={mockMovie} />);
     expect(screen.getByText('Movie Title')).toBeInTheDocument();
   });
   ```

2. **Test user interactions**:
   ```typescript
   import { render, screen } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   
   it('should toggle language on click', async () => {
     const user = userEvent.setup();
     render(<LanguageSwitcher />);
     
     const button = screen.getByRole('button');
     await user.click(button);
     
     expect(screen.getByText('ລາວ')).toBeInTheDocument();
   });
   ```

3. **Test accessibility**: Use semantic queries (`getByRole`, `getByLabelText`)

## Coverage Goals

- **Utility functions**: 100% coverage (achieved ✅)
- **Components**: 80%+ coverage (pending)
- **Integration tests**: Key user flows (pending)

## Continuous Integration

Tests run automatically on:
- Pre-commit (future: add husky hook)
- Pull requests (future: GitHub Actions)
- Before deployment (future: CI/CD pipeline)

## Troubleshooting

### Common Issues

1. **Module not found errors**:
   - Check `moduleNameMapper` in `jest.config.ts`
   - Ensure `@/` alias is configured correctly

2. **TypeScript errors**:
   - Verify `tsconfig.json` includes test files
   - Check that `@types/jest` is installed

3. **React component errors**:
   - Ensure `testEnvironment: 'jsdom'` in Jest config
   - Check that `jest.setup.ts` imports `@testing-library/jest-dom`

## Next Steps

- [ ] Add component tests for `MovieCard`
- [ ] Add component tests for `LanguageSwitcher`
- [ ] Add component tests for `VideoPlayer`
- [ ] Add integration tests for movie browsing flow
- [ ] Set up GitHub Actions for CI
- [ ] Add pre-commit hooks with Husky

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
