This document defines the technology stack for the Lao Cinema streaming platform, including a web app, mobile companion app, backend API, and video delivery pipeline.

## Current Implementation Status

**✅ Fully Implemented:**
- Next.js 16.0.3 web application with React 19.2.0
- Fastify backend API with PostgreSQL database
- Drizzle ORM with migration system
- TMDB integration (import movies, cast, crew)
- Bilingual support (English/Lao) with next-intl
- People-centric architecture (separate people table)
- Admin panel (import and edit movies)
- Testing framework (70+ tests)
- Docker Compose development environment

**🚧 Partially Implemented:**
- Video player (UI ready, needs video hosting)
- Admin features (import/edit complete, missing search/bulk operations)

**📋 Planned:**
- User authentication and profiles
- Video hosting and delivery (Cloudflare/Bunny Stream)
- Watchlist and watch history
- Mobile app (React Native/Expo)
- Production deployment

⸻

🖥️ 1. Frontend

1.1 Web App
	•	Framework: Next.js 16.0.3 (App Router)
	•	Language: TypeScript
	•	UI Library: React 19.2.0
	•	Styling: Tailwind CSS v4
	•	i18n: next-intl (URL-based routing)
	•	Deployment: Vercel or GCP Cloud Run (planned)
	•	Key Responsibilities:
	•	Browsing/Searching film catalog
	•	Playback UI (HLS video player)
	•	User login/auth (planned)
	•	Watchlist & Continue Watching (planned)
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
	•	JWT-based auth (planned)
	•	OAuth for admin panel (planned)

3.2 Responsibilities
	•	User auth + sessions (planned)
	•	CRUD for films ✅ (movies endpoints implemented)
	•	CRUD for genres, cast, crew ✅ (via movie relationships)
	•	Playback authorization (planned)
	•	Watch history + continue-watching (planned)
	•	Search + filtering endpoints (planned)
	•	Admin CMS endpoints ✅ (partial - movie import/edit)
	•	TMDB integration ✅ (fetch movie data and credits)

3.3 Deployment
	•	Containerized with Docker (ready)
	•	GCP VM or Cloud Run (planned)
	•	Currently: local development with Docker Compose
	•	Eventually deployable to physical server

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
	•	movies ✅ (with UUID primary key)
	•	movie_translations ✅ (bilingual support)
	•	genres ✅
	•	genre_translations ✅
	•	movie_genres ✅ (junction table)
	•	people ✅ (actors, directors, crew)
	•	people_translations ✅ (bilingual names/bios)
	•	movie_cast ✅ (movie-actor relationships)
	•	movie_cast_translations ✅ (character names)
	•	movie_crew ✅ (movie-crew relationships)
	•	movie_crew_translations ✅ (job titles)
	•	video_sources (planned - currently in movie JSON)

4.5 Planned Tables
	•	users (authentication)
	•	watch_history (user viewing history)
	•	watchlist (user saved movies)
	•	resume_points (playback progress)
	•	playback_sessions (streaming analytics)
	•	admins (admin users)

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

5.3 Playback Security
	•	Backend-generated signed playback URLs
	•	Time-limited tokens
	•	Optional: per-user watermarking

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
	•	Zod (request/response validation) (planned)
	•	JWT plugins (authentication) (planned)
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
	•	Jest + React Testing Library ✅

7.3 Mobile (Future)
	•	React Native (Expo)
	•	Expo Router
	•	Expo AV (HLS playback)
	•	react-native-reanimated (UI interactions)
	•	Shared types from web app

⸻

🔐 8. Authentication (Planned)

Backend
	•	JWT auth (access + refresh tokens)
	•	Password login or OAuth for admins
	•	Argon2 password hashing
	•	Role-based permissions (user/admin)

Frontend (Web + Mobile)
	•	Store access token securely
	•	Refresh token rotation
	•	Auto-logout on token expiration

⸻

📡 9. APIs

REST Endpoints (Implemented ✅ / Planned)
	•	/health ✅ (health check)
	•	/api/movies ✅ (GET all, POST create)
	•	/api/movies/:id ✅ (GET, PUT, DELETE)
	•	/auth/* (login, register, refresh, logout) - planned
	•	/genres/* - planned
	•	/people/* - planned (person pages)
	•	/watchlist/* - planned
	•	/history/* - planned
	•	/resume/* - planned
	•	/stream/* (signed playback URL) - planned
	•	/admin/* - partial (via frontend admin panel)

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
