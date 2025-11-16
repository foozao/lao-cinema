# Next Steps for Lao Cinema

## Current Status ✅

### ✅ Completed Features

**Infrastructure**:
- Next.js 16.0.3 with React 19.2.0, TypeScript, and Tailwind CSS v4
- Backend API with Fastify and PostgreSQL
- Database with Drizzle ORM and Docker Compose setup
- Multi-language system (next-intl + LocalizedText)

**Frontend**:
- Movie catalog homepage with grid display
- Movie detail pages with HLS video player
- TMDB import admin panel (`/admin/import`)
- Movie edit interface (`/admin/edit/[id]`)
- Responsive design with shadcn/ui components
- Language switcher (English/Lao)
- URL-based i18n routing (`/en/*`, `/lo/*`)

**Backend**:
- RESTful API endpoints for movies
- PostgreSQL database with bilingual support
- Drizzle ORM with migration system
- TMDB integration (fetch movie data + credits)
- People-centric architecture (separate people table)

**Testing**:
- Jest test framework
- 70 tests covering i18n, images, and utilities
- React Testing Library setup

## Development Setup

### Prerequisites
- Node.js 20.9.0+ (see `.nvmrc`)
- PostgreSQL (via Docker recommended)
- TMDB API key

### Quick Start

**1. Install Dependencies**
```bash
# Web app
cd web
npm install

# Backend API
cd ../api
npm install

# Database utilities
cd ../db
npm install
```

**2. Start Database**
```bash
# From project root
docker-compose up -d
cd db
npm run db:migrate
npm run db:seed
```

**3. Configure Environment**
```bash
# Web app
cd web
cp env.example .env.local
# Add TMDB_API_KEY to .env.local

# Backend API
cd ../api
cp .env.example .env
# Add DATABASE_URL to .env
```

**4. Start Development Servers**
```bash
# Terminal 1: Backend (port 3001)
cd api
npm run dev

# Terminal 2: Frontend (port 3000)
cd web
npm run dev
```

## Importing Movies from TMDB

### Using the Admin Panel

1. **Get TMDB API Key**:
   - Sign up at https://www.themoviedb.org
   - Get API key from Settings → API
   - Add to `web/.env.local`: `TMDB_API_KEY=your_key`

2. **Import a Movie**:
   - Navigate to `/admin/import`
   - Find TMDB ID from themoviedb.org URL (e.g., `550` for Fight Club)
   - Enter ID and click "Fetch"
   - Review imported data (English only)
   - Click "Import Movie" to save to database
   - Redirects to edit page

3. **Add Lao Translations**:
   - On edit page, add Lao translations for:
     - Title
     - Overview
     - Tagline
     - Cast/crew names
   - Save changes

## Next Phase: Video Delivery

### Current State
- Movies imported from TMDB (metadata only)
- No video files hosted yet
- Video player component ready (HLS + MP4 support)

### Options for Video Hosting

**Option A: Cloudflare Stream** (Recommended)
- Automatic HLS transcoding
- Global CDN delivery
- Usage-based pricing (~$1/1000 minutes)
- Easy API integration

**Option B: Bunny Stream**
- Cheaper than Cloudflare
- Good Laos performance
- Manual setup required

**Option C: Self-Hosted HLS**
- Use FFmpeg for transcoding
- Host on own server/CDN
- Most cost-effective long-term
- Requires more setup

See `IMAGE_STRATEGY.md` for video strategy details.

## Future Features

### Phase 1: Content Management (Next Priority)
- [ ] Bulk TMDB import
- [ ] Movie search/filtering in admin
- [ ] Video source management UI
- [ ] Batch Lao translation workflow

### Phase 2: User Features
- [ ] User authentication (JWT)
- [ ] User profiles
- [ ] Watchlist functionality
- [ ] Watch history tracking
- [ ] Resume playback points

### Phase 3: Advanced Features
- [ ] Search and filtering (frontend)
- [ ] Recommendations engine
- [ ] Person detail pages
- [ ] Mobile app (React Native/Expo)
- [ ] Offline viewing support

### Phase 4: Production Deployment
- [ ] Deploy frontend to Vercel or GCP Cloud Run
- [ ] Deploy backend to GCP VM
- [ ] Set up production database
- [ ] Configure CDN for videos
- [ ] Set up monitoring and logging
- [ ] Configure backups

## Testing Checklist

### Completed ✅
- [x] Homepage loads and displays movies
- [x] Movie detail page displays correctly
- [x] Language switcher works (en/lo)
- [x] TMDB import functionality
- [x] Admin edit interface
- [x] Database operations (CRUD)
- [x] Bilingual content support
- [x] Unit tests (70 tests passing)

### To Test
- [ ] Video player with actual video files
- [ ] Video controls (play/pause, seek, volume, fullscreen)
- [ ] Responsive design on mobile devices
- [ ] Search and filtering (when implemented)
- [ ] User authentication (when implemented)

## Development Commands

### Frontend
```bash
cd web
npm run dev          # Start dev server (port 3000)
npm run build        # Build for production
npm start            # Run production build
npm run lint         # Lint code
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
```

### Backend
```bash
cd api
npm run dev          # Start API server (port 3001)
npm run build        # Build for production
npm start            # Run production build
npm run db:generate  # Generate migrations
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
```

### Database
```bash
cd db
npm run db:migrate   # Run migrations
npm run db:seed      # Seed with sample data
npm run db:studio    # Open Drizzle Studio
```

## Documentation Reference

### Setup Guides
- `BACKEND_SETUP.md` - Backend API setup
- `DATABASE_SETUP.md` - Database setup with Docker
- `TMDB_SETUP.md` - TMDB integration guide
- `I18N_SETUP.md` - Internationalization setup

### Architecture
- `STACK.md` - Full technology stack
- `PEOPLE_ARCHITECTURE.md` - People-centric design
- `LANGUAGE_SYSTEM.md` - Multi-language system
- `IMAGE_STRATEGY.md` - Image handling strategy

### Development
- `AGENTS.md` - AI agent guidelines
- `TESTING.md` - Testing guide
- `CAST_CREW.md` - Cast/crew implementation
- `CHANGELOG.md` - Change history

### Migration Guides
- `PEOPLE_MIGRATION.md` - People architecture migration
- `CHANGELOG_PEOPLE.md` - People feature changelog

## External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Fastify Documentation](https://fastify.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [TMDB API Documentation](https://developer.themoviedb.org/docs)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
