# Lao Cinema - Web App

A modern streaming platform for Lao films built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🎬 Movie catalog with grid display
- 🎥 HLS video player with custom controls
- 🌐 Bilingual support (Lao/English)
- 📱 Responsive design
- 🎨 Modern UI with shadcn/ui components
- 🔍 TMDB-compatible data structure

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Video Player**: HLS.js
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ (currently using v18.20.8)
- npm or pnpm

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
├── app/                    # Next.js app directory
│   ├── movies/[id]/       # Movie detail pages
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── movie-card.tsx    # Movie card component
│   └── video-player.tsx  # HLS video player
├── lib/                   # Utilities and data
│   ├── data/             # Sample data
│   │   └── movies.ts     # Movie data
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Helper functions
└── public/               # Static assets
```

## Data Structure

The app uses a TMDB-compatible schema with additional Lao language fields:

- `title` / `title_lao` - Movie titles
- `overview` / `overview_lao` - Descriptions
- Genre names in both languages
- Cast and crew with Lao translations

## Video Support

The video player supports:
- HLS streaming (`.m3u8`)
- MP4 files
- Adaptive bitrate streaming
- Custom controls with play/pause, volume, seek, and fullscreen

## Next Steps

1. **Video Transcoding**: Convert MP4 to HLS format with multiple quality levels
2. **TMDB Integration**: API to fetch movie metadata
3. **Backend**: Fastify API with PostgreSQL database
4. **Authentication**: JWT-based user auth
5. **Admin Panel**: Content management system

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

All rights reserved.
