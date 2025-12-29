This document defines the technology stack for the Lao Cinema streaming platform, including a web app, mobile companion app, backend API, and video delivery pipeline.

## Current Implementation Status

**✅ Fully Implemented:**
- Next.js 16.0.3 web application with React 19.2.0
- Fastify backend API with PostgreSQL database
- Drizzle ORM with migration system (43 migrations)
- TMDB integration (import movies, cast, crew, production companies)
- Bilingual support (English/Lao) with next-intl
- People-centric architecture (separate people table with merge/alias support)
- Admin panel (import, edit, analytics, people management, homepage, audit logs)
- Video streaming (HLS via GCS in production, local in dev)
- User authentication (email/password with scrypt, session-based, role-based access)
- Frontend auth UI (login, register, user menu, profile pages)
- Rental system with database persistence (dual-mode: userId OR anonymousId)
- Watch progress with cross-device sync
- Video analytics framework
- Testing framework (436+ tests)
- Docker Compose development environment
- GCP Cloud Run deployment
- Production companies with TMDB sync
- Trailers (YouTube + self-hosted)
- Audit logging for content changes

**🚧 Partially Implemented:**
- Admin features (import/edit complete, missing bulk operations)
- OAuth integration (architecture ready, providers not implemented)

**📋 Planned:**
- OAuth providers (Google, Apple sign-in)
- Watchlist functionality
- Mobile app (React Native/Expo)
- Automated video transcoding pipeline

⸻

🖥️ 1. Frontend

1.1 Web App
	•	Framework: Next.js 16.0.3 (App Router)
	•	Language: TypeScript
	•	UI Library: React 19.2.0
	•	Styling: Tailwind CSS v4
	•	i18n: next-intl (URL-based routing)
	•	Deployment: GCP Cloud Run (production)
	•	Key Responsibilities:
	•	Browsing/Searching film catalog
	•	Playback UI (HLS video player)
	•	User login/auth ✅
	•	Watchlist (planned), Continue Watching ✅
	•	Admin interface (TMDB import, movie editing)

⸻

📱 2. Mobile App

2.1 Mobile Companion App
	•	Framework: React Native (Expo)
	•	Language: TypeScript
	•	Navigation: Expo Router
	•	Video Playback: Expo AV (HLS), or react-native-video
	•	Deployment: iOS App Store + Google Play Store

Features:
	•	Stream films
	•	User login/auth
	•	Watchlist
	•	Continue Watching
	•	Offline browsing (optional)

⸻

🗄️ 3. Backend

3.1 Backend Framework
	•	Framework: Fastify ✅ (implemented)
	•	Language: Node.js + TypeScript ✅
	•	API Style: REST API ✅
	•	Authentication:
	•	Session-based auth ✅ (scrypt password hashing, 30-day sessions)
	•	Role-based access ✅ (user/editor/admin)
	•	OAuth architecture ready (Google/Apple interfaces defined)

3.2 Responsibilities
	•	User auth + sessions ✅ (register, login, logout, profile management)
	•	CRUD for films ✅ (movies endpoints implemented)
	•	CRUD for genres, cast, crew ✅ (via movie relationships)
	•	CRUD for production companies ✅
	•	Playback authorization ✅ (rental system with dual-mode support)
	•	Watch progress + continue-watching ✅ (cross-device sync)
	•	Search + filtering endpoints ✅ (people, production companies)
	•	Admin CMS endpoints ✅ (movies, people, homepage, analytics)
	•	TMDB integration ✅ (fetch movie data, credits, production companies)
	•	Audit logging ✅ (tracks all content changes)

3.3 Deployment
	•	Containerized with Docker ✅
	•	GCP Cloud Run ✅ (production deployment active)
	•	Local development: Docker Compose ✅
	•	Future option: Physical server deployment

⸻

🛢️ 4. Database

4.1 Database Engine
	•	PostgreSQL 16 ✅
	•	Hosting Options:
	•	Local Docker for development ✅ (docker-compose.yml)
	•	GCP VM with self-hosted Postgres (planned)
	•	Cloud providers (Neon, Supabase) (option)
	•	Migratable to physical server later

4.2 ORM
	•	Drizzle ORM ✅ (Type-safe schema + migrations implemented)

4.3 Extensions
	•	pg_trgm → fuzzy title/actor search (planned)
	•	pgcrypto → UUID generation ✅ (used in schema)
	•	pgvector (optional) → semantic search + recommendations (future)

4.4 Core Tables (Implemented ✅)
	•	movies ✅ (with UUID primary key, slug for vanity URLs)
	•	movie_translations ✅ (bilingual support)
	•	genres ✅
	•	genre_translations ✅
	•	movie_genres ✅ (junction table)
	•	people ✅ (actors, directors, crew)
	•	people_translations ✅ (bilingual names/bios with nicknames)
	•	person_aliases ✅ (tracks merged TMDB IDs)
	•	movie_cast ✅ (movie-actor relationships)
	•	movie_cast_translations ✅ (character names)
	•	movie_crew ✅ (movie-crew relationships)
	•	movie_crew_translations ✅ (job titles)
	•	video_sources ✅ (HLS/MP4 with quality variants)
	•	movie_images ✅ (multiple posters/backdrops)
	•	movie_external_platforms ✅ (Netflix, Prime, etc.)
	•	homepage_featured ✅ (featured movie ordering)
	•	trailers ✅ (YouTube + self-hosted video)
	•	production_companies ✅ (with translations)
	•	movie_production_companies ✅ (junction table)
	•	users ✅ (email/password auth, roles)
	•	user_sessions ✅ (session tokens)
	•	oauth_accounts ✅ (prepared for Google/Apple)
	•	rentals ✅ (dual-mode: userId OR anonymousId)
	•	watch_progress ✅ (resume playback, cross-device)
	•	video_analytics_events ✅ (watch tracking)
	•	audit_logs ✅ (content change history)

4.5 Planned Tables
	•	watchlist (user saved movies)
	•	user_ratings (movie ratings/reviews)

⸻

🎬 5. Video Delivery Pipeline

5.1 Video Storage Options

Choose based on cost + Laos accessibility:

Option A — Cloudflare Stream (recommended)
	•	Globally optimized delivery (low latency in Laos)
	•	Automatic encoding into HLS
	•	Usage-based pricing
	•	Easy API integration

Option B — Bunny Stream
	•	Very cheap + global CDN
	•	Great Laos performance

Option C — Self-hosted NGINX HLS (later stage)
	•	When hosting on your own server
	•	Requires your own CDN or geo-friendly delivery

5.2 Streaming Format
	•	HLS (HTTP Live Streaming)
	•	Adaptive bitrate support

5.3 Playback Security ✅ Implemented
	•	Backend-generated signed playback URLs ✅
	•	Time-limited tokens (15-min expiry) ✅
	•	Session cookies for HLS segments (20-min expiry) ✅
	•	Rental validation before token issuance ✅
	•	Optional: per-user watermarking (not implemented)

⸻

🧱 6. Infrastructure

6.1 Dev Environment ✅
	•	Docker + Docker Compose (Postgres) ✅
	•	npm workspaces (separate web/api/db directories) ✅
	•	Node.js 20.9.0+ (see .nvmrc) ✅
	•	Shared TypeScript types in /web/lib/types.ts ✅
	•	Local development ports:
	  - Frontend: 3000
	  - Backend: 3001
	  - Database: 5432

6.2 Production (Planned)
	•	Backend: Dockerized → GCP VM or Cloud Run
	•	Database: Self-hosted Postgres on GCP VM or managed service
	•	Video: Cloudflare Stream or Bunny Stream (to be configured)
	•	CDN: Built into Stream provider
	•	Reverse Proxy: NGINX or Caddy
	•	Logs: GCP Logging or Elastic Stack
	•	Monitoring: Prometheus + Grafana (optional)

⸻

🛠️ 7. Supporting Libraries

7.1 Backend ✅
	•	Fastify ✅ (with CORS plugin)
	•	Drizzle ORM ✅
	•	Zod ✅ (request/response validation)
	•	Session-based auth ✅ (scrypt password hashing)
	•	Rate limiting (planned)
	•	Pino (logging) ✅ (Fastify default)

7.2 Web ✅
	•	React 19.2.0 ✅
	•	Next.js 16.0.3 App Router ✅
	•	Tailwind CSS v4 ✅
	•	shadcn/ui (component library) ✅
	•	hls.js (video player) ✅
	•	next-intl (internationalization) ✅
	•	Lucide React (icons) ✅
	•	Vitest + React Testing Library ✅

7.3 Mobile (Future)
	•	React Native (Expo)
	•	Expo Router
	•	Expo AV (HLS playback)
	•	react-native-reanimated (UI interactions)
	•	Shared types from web app

⸻

🔐 8. Authentication (Implemented ✅)

Backend ✅
	•	Session-based auth (30-day expiration)
	•	Email/password registration and login
	•	Scrypt password hashing with random salt
	•	Role-based permissions (user/editor/admin)
	•	OAuth-ready architecture (Google/Apple interfaces defined)
	•	Dual-mode support (authenticated OR anonymous users)

Frontend (Web) ✅
	•	Login/register forms with validation
	•	User menu with profile dropdown
	•	Auth context with automatic token refresh
	•	Anonymous ID system for unauthenticated users
	•	Data migration on first login (anonymous → authenticated)

⸻

📡 9. APIs

REST Endpoints (Implemented ✅ / Planned)
	•	/health ✅ (health check)
	•	/api/movies ✅ (GET all, POST create)
	•	/api/movies/:id ✅ (GET, PUT, DELETE)
	•	/api/movies/:id/cast ✅ (POST, DELETE)
	•	/api/movies/:id/crew ✅ (POST, DELETE)
	•	/api/movies/:id/production-companies ✅ (GET, POST, DELETE)
	•	/api/auth/* ✅ (register, login, logout, profile)
	•	/api/people ✅ (GET all, POST create)
	•	/api/people/:id ✅ (GET, PUT, merge)
	•	/api/production-companies ✅ (GET all, POST, PUT)
	•	/api/rentals ✅ (GET, POST, migrate)
	•	/api/watch-progress ✅ (GET, PUT, DELETE, migrate)
	•	/api/homepage/featured ✅ (GET, POST, reorder, DELETE)
	•	/api/trailers ✅ (CRUD for movie trailers)
	•	/api/audit-logs ✅ (GET with filters)
	•	/api/users/migrate ✅ (anonymous to authenticated)
	•	/api/upload ✅ (file uploads)
	•	/watchlist/* - planned
	•	/api/video-tokens ✅ (signed playback URL with rental validation)

⸻

🚀 10. Future Expansion (Optional)

Features
	•	Recommendation engine (pgvector + embeddings)
	•	Offline/Download support (mobile)
	•	Multi-language subtitles
	•	Payment integration (Stripe)
	•	Analytics dashboard for viewership
	•	Festival screening mode (offline kiosk app)
	•	Casting to smart TVs
	•	Custom player overlays (Lao/English)
