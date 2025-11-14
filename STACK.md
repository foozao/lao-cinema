This document defines the recommended technology stack for building a streaming platform for Lao films, including a web app, mobile companion app, backend API, and video delivery pipeline.

⸻

🖥️ 1. Frontend

1.1 Web App
	•	Framework: Next.js (App Router)
	•	Language: TypeScript
	•	UI Library: React
	•	Styling: Tailwind CSS
	•	Deployment: GCP Cloud Run or Vercel
	•	Key Responsibilities:
	•	Browsing/Searching film catalog
	•	Playback UI (HLS video player)
	•	User login/auth
	•	Watchlist & Continue Watching
	•	Admin interface (optional)

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
	•	Framework: Fastify
	•	Language: Node.js + TypeScript
	•	API Style: REST API
	•	Authentication:
	•	JWT-based auth
	•	Optional: OAuth for admin panel

3.2 Responsibilities
	•	User auth + sessions
	•	CRUD for films, genres, cast, categories
	•	Playback authorization (secure streaming URLs)
	•	Watch history + continue-watching
	•	Search + filtering endpoints
	•	Admin CMS endpoints
	•	Optional: recommendation endpoints

3.3 Deployment
	•	Containerized with Docker
	•	GCP VM or Cloud Run
	•	Eventually deployable to your own physical server

⸻

🛢️ 4. Database

4.1 Database Engine
	•	PostgreSQL
	•	Hosting Options:
	•	GCP VM with self-hosted Postgres (recommended)
	•	Local Docker for development
	•	Migratable to your own server later

4.2 ORM
	•	Drizzle ORM (Type-safe schema + migrations)

4.3 Extensions
	•	pg_trgm → fuzzy title/actor search
	•	pgcrypto → UUID generation
	•	pgvector (optional) → semantic search + recommendations

4.4 Core Tables
	•	films
	•	genres
	•	film_genres
	•	cast
	•	film_cast
	•	categories
	•	film_categories
	•	film_files (video sources)
	•	playback_sessions
	•	users
	•	watch_history
	•	watchlist
	•	resume_points
	•	admins (optional)

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

6.1 Dev Environment
	•	Docker (backend + Postgres)
	•	pnpm monorepo (Turborepo recommended)
	•	Shared TypeScript types between frontends and backend

6.2 Production
	•	Backend: Dockerized → GCP VM or Cloud Run
	•	Database: Self-hosted Postgres on GCP VM
	•	Video: Cloudflare Stream or Bunny Stream
	•	CDN: Built into Stream provider
	•	Reverse Proxy: NGINX or Caddy
	•	Logs: GCP Logging or Elastic Stack

⸻

🛠️ 7. Supporting Libraries

7.1 Backend
	•	Fastify plugins (JWT, CORS, rate-limit)
	•	Drizzle ORM
	•	Zod (request/response validation)
	•	ExoPlayer or HLS JS token generation
	•	Pino (logging)

7.2 Web
	•	React
	•	Next.js App Router
	•	Tailwind CSS
	•	shadcn/ui (component library)
	•	hls.js (video player)

7.3 Mobile
	•	React Native (Expo)
	•	Expo Router
	•	Expo AV (HLS playback)
	•	react-native-reanimated (UI interactions)

⸻

🔐 8. Authentication

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

REST Endpoints
	•	/auth/* (login, register, refresh, logout)
	•	/films/*
	•	/genres/*
	•	/cast/*
	•	/categories/*
	•	/watchlist/*
	•	/history/*
	•	/resume/*
	•	/stream/* (signed playback URL)
	•	/admin/* (CRUD for content)

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
