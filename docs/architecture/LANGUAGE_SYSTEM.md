# Multi-Language System

## Overview

The Lao Cinema platform uses a flexible multi-language system where each movie can have content in multiple languages. English is used as the default/fallback language.

## Architecture

### Language Type

```typescript
export type Language = 'en' | 'lo'; // English, Lao - can add more later
```

### LocalizedText Interface

```typescript
export interface LocalizedText {
  en: string;      // English (required - fallback)
  lo?: string;     // Lao (optional)
}
```

### Fields That Support Localization

- **Movie**:
  - `title` - Movie title
  - `overview` - Movie description/synopsis

- **Genre**:
  - `name` - Genre name

- **CastMember**:
  - `name` - Actor name
  - `character` - Character name

- **CrewMember**:
  - `name` - Crew member name
  - `job` - Job title (Director, Producer, etc.)

## Usage

### Creating Localized Content

Use the `createLocalizedText` helper:

```typescript
import { createLocalizedText } from '@/lib/i18n';

const movie = {
  title: createLocalizedText('The Last Elephant', 'ຊ້າງສຸດທ້າຍ'),
  overview: createLocalizedText(
    'A story about the last elephant in Laos.',
    'ເລື່ອງກ່ຽວກັບຊ້າງໂຕສຸດທ້າຍໃນລາວ.'
  ),
};
```

### Retrieving Localized Text

Use the `getLocalizedText` helper:

```typescript
import { getLocalizedText } from '@/lib/i18n';

// Get text in Lao (falls back to English if Lao not available)
const title = getLocalizedText(movie.title, 'lo');

// Get text in English
const titleEn = getLocalizedText(movie.title, 'en');
```

### Fallback Behavior

If a Lao translation is not provided, the system automatically falls back to English:

```typescript
const movie = {
  title: createLocalizedText('English Only Title'), // No Lao provided
};

getLocalizedText(movie.title, 'lo'); // Returns "English Only Title"
getLocalizedText(movie.title, 'en'); // Returns "English Only Title"
```

## Language Context (Optional)

For dynamic language switching in the UI, use the LanguageContext:

```typescript
'use client';

import { useLanguage } from '@/lib/language-context';

function MyComponent() {
  const { language, setLanguage } = useLanguage();
  
  return (
    <div>
      <p>Current language: {language}</p>
      <button onClick={() => setLanguage('lo')}>ລາວ</button>
      <button onClick={() => setLanguage('en')}>English</button>
    </div>
  );
}
```

## Adding New Languages

To add support for more languages:

1. Update the `Language` type in `/lib/types.ts`:
   ```typescript
   export type Language = 'en' | 'lo' | 'th' | 'vi'; // Add Thai, Vietnamese, etc.
   ```

2. Update the `LocalizedText` interface:
   ```typescript
   export interface LocalizedText {
     en: string;   // English (required)
     lo?: string;  // Lao
     th?: string;  // Thai
     vi?: string;  // Vietnamese
   }
   ```

3. Update the `getLocalizedText` function if needed for new fallback logic.

## Best Practices

1. **Always provide English**: English is the fallback language and should always be provided.

2. **Consistent translations**: Ensure all user-facing text has translations in all supported languages.

3. **Use helpers**: Always use `createLocalizedText` and `getLocalizedText` instead of directly accessing the object properties.

4. **TMDB Integration**: When fetching from TMDB, the English data will be automatically available. You can then add Lao translations manually or via a separate translation service.

## Example: Complete Movie Data

```typescript
import { createLocalizedText } from '@/lib/i18n';

const movie = {
  id: '1',
  title: createLocalizedText('The River', 'ແມ່ນ້ຳ'),
  overview: createLocalizedText(
    'A documentary about the Mekong River.',
    'ສາລະຄະດີກ່ຽວກັບແມ່ນ້ຳຂອງ.'
  ),
  genres: [
    {
      id: 5,
      name: createLocalizedText('Documentary', 'ສາລະຄະດີ'),
    },
  ],
  cast: [
    {
      id: 1,
      name: createLocalizedText('John Smith', 'ຈອນ ສະມິດ'),
      character: createLocalizedText('Narrator', 'ຜູ້ບັນຍາຍ'),
      order: 1,
    },
  ],
  crew: [
    {
      id: 1,
      name: createLocalizedText('Jane Doe', 'ເຈນ ໂດ'),
      job: createLocalizedText('Director', 'ຜູ້ກຳກັບ'),
      department: 'Directing',
    },
  ],
};
```

## Future Enhancements

- **Database storage**: Store translations in separate tables for easier management
- **Translation API**: Integrate with translation services for automatic translations
- **User preferences**: Remember user's language preference in localStorage/cookies
- **SEO**: Generate language-specific URLs and metadata
- **Admin panel**: UI for managing translations
