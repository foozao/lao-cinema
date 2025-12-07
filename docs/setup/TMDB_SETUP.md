# TMDB Integration Setup Guide

## Quick Start

### 1. Get Your TMDB API Key

1. Go to https://www.themoviedb.org and create an account
2. Navigate to **Settings → API**
3. Request an API key (select "Developer" option)
4. Copy your API key (v3 auth)

### 2. Configure Environment

```bash
# Navigate to the web directory
cd web

# Create .env.local file
cp env.example .env.local

# Edit .env.local and add your API key (RECOMMENDED - server-side only)
TMDB_API_KEY=your_actual_api_key_here

# OR if you prefer client-side (less secure, API key visible in browser)
# NEXT_PUBLIC_TMDB_API_KEY=your_actual_api_key_here
```

**Security Note:** Use `TMDB_API_KEY` (server-side) for production. The API key stays secure on the server and is never exposed to the browser.

### 3. Restart Development Server

```bash
npm run dev
```

## Using TMDB Import

### Import a New Movie

1. **Find the TMDB ID:**
   - Go to https://www.themoviedb.org
   - Search for a movie
   - The ID is in the URL: `themoviedb.org/movie/550` → ID is `550`

2. **Import in Admin Panel:**
   - Go to `/admin`
   - Click "Import from TMDB"
   - Enter the TMDB ID
   - Click "Fetch"
   - Review the preview
   - Click "Import Movie"

3. **Add Lao Translations:**
   - After import, you'll be redirected to the edit page
   - Add Lao translations for:
     - Title
     - Overview
     - Tagline (if applicable)
   - Save the movie

### Sync Existing Movie

If a movie has a TMDB ID, you can sync updates:

1. Go to `/admin/edit/[movie-id]`
2. Click "TMDB Sync" button (top right)
3. English content and metadata will update
4. **Lao translations are preserved** (never overwritten)

## What Gets Synced?

### Auto-Synced from TMDB:
- ✅ English title, overview, tagline
- ✅ Metadata: budget, revenue, runtime, ratings, popularity
- ✅ Media: poster and backdrop paths
- ✅ Relationships: genres, production companies, countries, languages

### Never Overwritten (Manual Only):
- 🔒 Lao translations (title, overview, tagline)
- 🔒 Video sources (streaming URLs)
- 🔒 Cast & crew (added manually)

## Workflow Example

### Importing "Fight Club" (TMDB ID: 550)

1. **Import:**
   ```
   Admin → Import from TMDB → Enter "550" → Fetch → Import
   ```

2. **Result:**
   - English title: "Fight Club"
   - English overview: "A ticking-time-bomb insomniac..."
   - Budget: $63,000,000
   - Revenue: $100,853,753
   - Genres: Drama
   - **Lao fields: Empty (need translation)**

3. **Add Translations:**
   ```
   Edit Movie → Add Lao translations → Save
   ```

4. **Future Syncs:**
   - Click "TMDB Sync" to update ratings/revenue
   - Lao translations remain intact

## Troubleshooting

### "TMDB API key is required"
- Ensure `.env.local` exists in `/web` directory
- Check that `TMDB_API_KEY` (or `NEXT_PUBLIC_TMDB_API_KEY`) is set
- Restart dev server: `npm run dev`

### "Invalid API key"
- Verify your API key is correct
- Make sure you're using the v3 API key (not v4)
- Wait a few minutes after creating the key

### "Failed to fetch movie"
- Check that the TMDB ID is correct
- Verify your internet connection
- Try a different movie ID to test

### Sync button not showing
- Movie must have a `tmdb_id` set
- Check the movie data in `/web/lib/data/movies.ts`

## API Rate Limits

TMDB free tier limits:
- ~40 requests per 10 seconds
- ~1,000 requests per day

**Best practices:**
- Import movies one at a time
- Avoid rapid syncing
- Cache is planned for future updates

## Next Steps

Once the backend is implemented:
- Movies will be saved to database
- Automatic periodic syncs for ratings/popularity
- Bulk import functionality
- Search movies by title (not just ID)
- Import cast & crew data

## Resources

- [TMDB API Docs](https://developer.themoviedb.org/docs)
- [Get API Key](https://www.themoviedb.org/settings/api)
- [TMDB Integration Code](/web/lib/tmdb/README.md)
