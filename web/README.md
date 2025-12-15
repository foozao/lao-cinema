# Lao Cinema - Web App

A modern streaming platform for Lao films built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎬 Movie catalog with responsive grid display
- 🎥 HLS video player with custom controls
- 🌐 Bilingual support (English/Lao) with URL-based routing
- 📱 Fully responsive design (mobile, tablet, desktop)
- 🎨 Modern UI with shadcn/ui components
- 🎭 TMDB integration with import interface
- 👥 People-centric architecture (actors, directors, crew)
- 🔧 Admin panel for content management
- 🧪 Comprehensive test coverage (70+ tests)

## Tech Stack

- **Framework**: Next.js 16.0.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Video Player**: HLS.js
- **Icons**: Lucide React
- **Internationalization**: next-intl
- **Testing**: Jest + React Testing Library
- **Backend**: Fastify API (see `/api`)
- **Database**: PostgreSQL with Drizzle ORM (see `/db`)

## Getting Started

### Prerequisites

- Node.js 20.9.0+ (see `.nvmrc`)
- npm (or pnpm)
- PostgreSQL database
- TMDB API key

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
web/
├── app/                        # Next.js app directory
│   ├── [locale]/              # Internationalized routes
│   │   ├── page.tsx           # Homepage
│   │   ├── movies/[id]/       # Movie detail pages
│   │   └── admin/             # Admin panel
│   │       ├── import/        # TMDB import
│   │       └── edit/[id]/     # Movie editor
│   ├── layout.tsx             # Root layout
│   └── globals.css            # Global styles
├── components/                # React components
│   ├── ui/                   # shadcn/ui components
│   ├── movie-card.tsx        # Movie card component
│   ├── video-player.tsx      # HLS video player
│   └── language-switcher.tsx # Language toggle
├── lib/                       # Utilities and data
│   ├── api/                  # API client
│   ├── tmdb/                 # TMDB integration
│   │   ├── client.ts         # TMDB API client
│   │   └── mapper.ts         # Data mapping
│   ├── types.ts              # TypeScript types
│   ├── i18n.ts               # Localization helpers
│   ├── images.ts             # Image utilities
│   └── utils.ts              # Helper functions
├── i18n/                      # next-intl configuration
│   ├── request.ts            # i18n request handling
│   └── routing.ts            # Routing configuration
├── messages/                  # Translation files
│   ├── en.json               # English UI text
│   └── lo.json               # Lao UI text
└── public/                    # Static assets
```

## Data Structure

The app uses a **hybrid localization system**:

### 1. UI Text (next-intl)
Buttons, labels, headings stored in `messages/en.json` and `messages/lo.json`:
```typescript
const t = useTranslations();
<h1>{t('home.featured')}</h1>
```

### 2. Content Data (LocalizedText)
Movie titles, descriptions from database using `LocalizedText` interface:
```typescript
interface LocalizedText {
  en: string;   // English (required, fallback)
  lo?: string;  // Lao (optional)
}

interface Movie {
  title: LocalizedText;
  overview: LocalizedText;
  // ...
}
```

## Video Support

The video player supports:
- HLS streaming (`.m3u8`)
- MP4 files
- Adaptive bitrate streaming
- Custom controls with play/pause, volume, seek, and fullscreen

## Admin Features

### TMDB Import (`/admin/import`)
1. Enter TMDB movie ID
2. Fetch and preview movie data
3. Import to database with one click
4. Automatically fetches cast, crew, and metadata

### Movie Editor (`/admin/edit/[id]`)
1. Edit movie metadata
2. Add Lao translations
3. Manage video sources
4. Update cast and crew

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server (port 3000)

# Production
npm run build        # Build for production
npm start            # Run production build

# Code Quality
npm run lint         # Lint code with ESLint

# Testing
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## Testing

The app has comprehensive test coverage:

- **70+ unit tests** across 3 test suites
- **100% coverage** for utilities (i18n, images, utils)
- **Jest + React Testing Library** setup
- **Watch mode** for continuous testing

Test suites:
- `lib/__tests__/i18n.test.ts` - Localization helpers
- `lib/__tests__/images.test.ts` - Image URL generation
- `lib/__tests__/utils.test.ts` - Tailwind class utilities

Run `npm test` to execute all tests.

## Configuration

### Environment Variables

Create `.env.local`:
```env
# TMDB Integration
TMDB_API_KEY=your_tmdb_api_key_here

# Backend API (if running separately)
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Get your TMDB API key from: https://www.themoviedb.org/settings/api

## Documentation

- [I18N_SETUP.md](./I18N_SETUP.md) - Internationalization guide
- [TESTING.md](./TESTING.md) - Testing documentation
- [../docs/architecture/LANGUAGE_SYSTEM.md](../docs/architecture/LANGUAGE_SYSTEM.md) - Multi-language architecture
- [../docs/STATUS.md](../docs/STATUS.md) - Project roadmap and status
- [../AGENTS.md](../AGENTS.md) - AI coding guidelines

## Related Repositories

- `/api` - Fastify backend API
- `/db` - Database schema and migrations

## License

All rights reserved.
