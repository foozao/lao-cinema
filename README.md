# Lao Cinema

A modern streaming platform for Lao films with bilingual support (English/Lao).

## 🚀 Quick Start

### Prerequisites
- Node.js 20.9.0+
- PostgreSQL 16
- Docker & Docker Compose (for database)

### Development

**Start the web app:**
```bash
cd web
npm install
npm run dev
```
Visit `http://localhost:3000`

**Start the API server:**
```bash
cd api
npm install
npm run dev
```
API runs on `http://localhost:3001`

**Start the database:**
```bash
docker-compose up -d
```

## 📁 Project Structure

```
/lao-cinema
├── /web              # Next.js 16 frontend (React 19, TypeScript, Tailwind v4)
├── /api              # Fastify backend API with PostgreSQL
├── /db               # Database utilities and migrations
├── /docs             # All project documentation
└── /scripts          # Deployment and utility scripts
```

## 📚 Documentation

### Getting Started
- **[AGENTS.md](AGENTS.md)** - AI assistant guidelines and project overview
- **[docs/STATUS.md](docs/STATUS.md)** - Current project status and roadmap

### Architecture
- **[docs/architecture/STACK.md](docs/architecture/STACK.md)** - Complete technology stack
- **[docs/architecture/LANGUAGE_SYSTEM.md](docs/architecture/LANGUAGE_SYSTEM.md)** - Bilingual system architecture
- **[docs/architecture/VIDEO_ARCHITECTURE.md](docs/architecture/VIDEO_ARCHITECTURE.md)** - Video streaming implementation
- **[docs/architecture/IMAGE_STRATEGY.md](docs/architecture/IMAGE_STRATEGY.md)** - Image handling and optimization
- **[docs/architecture/PEOPLE_ARCHITECTURE.md](docs/architecture/PEOPLE_ARCHITECTURE.md)** - Cast & crew data structure
- **[docs/architecture/CAST_CREW.md](docs/architecture/CAST_CREW.md)** - Cast & crew feature guide

### Setup & Configuration
- **[docs/setup/BACKEND_SETUP.md](docs/setup/BACKEND_SETUP.md)** - Backend and database setup
- **[docs/setup/TMDB_SETUP.md](docs/setup/TMDB_SETUP.md)** - TMDB integration
- **[docs/setup/DEPLOYMENT_GUIDE.md](docs/setup/DEPLOYMENT_GUIDE.md)** - Deployment guide
- **[docs/setup/ENV_REFERENCE.md](docs/setup/ENV_REFERENCE.md)** - Environment variables reference
- **[docs/setup/DATABASE_SYNC.md](docs/setup/DATABASE_SYNC.md)** - Database synchronization
- **[docs/setup/PASSWORD_PROTECTION.md](docs/setup/PASSWORD_PROTECTION.md)** - Authentication setup
- **[docs/setup/VIDEO_ENV_COMPLETE.md](docs/setup/VIDEO_ENV_COMPLETE.md)** - Video URL environment setup
- **[docs/setup/STORAGE_STRATEGY.md](docs/setup/STORAGE_STRATEGY.md)** - Data storage strategy (database vs localStorage)

### Features & Implementation
- **[docs/features/USER_ACCOUNTS.md](docs/features/USER_ACCOUNTS.md)** - User authentication and accounts
- **[docs/features/ADMIN_I18N.md](docs/features/ADMIN_I18N.md)** - Admin panel internationalization
- **[docs/features/MULTI_POSTER_IMPLEMENTATION.md](docs/features/MULTI_POSTER_IMPLEMENTATION.md)** - Multiple poster support
- **[docs/features/POSTER_UI_GUIDE.md](docs/features/POSTER_UI_GUIDE.md)** - Poster UI implementation
- **[docs/features/BACKEND_IMAGE_API.md](docs/features/BACKEND_IMAGE_API.md)** - Image API endpoints
- **[docs/features/SAFE_SYNC_STRATEGY.md](docs/features/SAFE_SYNC_STRATEGY.md)** - Data synchronization strategy

### Planning
- **[docs/planning/](docs/planning/)** - Planned but not yet implemented features

### Future Planning
- **[docs/FUTURE.md](docs/FUTURE.md)** - Future feature ideas and optimizations
- **[docs/MOBILE_APP_PLAN.md](docs/MOBILE_APP_PLAN.md)** - Complete React Native mobile app migration plan

### History
- **[docs/changelog/CHANGELOG.md](docs/changelog/CHANGELOG.md)** - Project changelog

## 🛠️ Scripts

All utility scripts are located in `/scripts`:
- **deploy.sh** - Deployment script
- **setup-gcp.sh** - Google Cloud Platform setup
- **sync-db-from-cloud.sh** - Download database from cloud
- **sync-db-to-cloud.sh** - Upload database to cloud

## 🌐 Key Features

- **Bilingual Support**: Full English/Lao localization with URL-based routing
- **HLS Video Streaming**: Adaptive bitrate streaming with quality selection
- **TMDB Integration**: Import movie data from The Movie Database
- **Admin Panel**: Content management with TMDB import
- **Responsive Design**: Mobile-first UI with modern design system
- **Type-Safe**: Full TypeScript implementation with strict mode

## 🧪 Testing

```bash
cd api
npm test
```

1095+ unit tests covering core functionality.

## 📄 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]
