---
description: Add a new movie to the platform (via TMDB import or manual entry)
---

# Add Movie Workflow

## Option 1: TMDB Import (Recommended)

### Via Admin Panel
1. Navigate to `/admin/import` in the web app
2. Enter the TMDB ID of the movie
3. Click "Fetch from TMDB" to preview
4. Click "Import Movie" to save
5. Navigate to `/admin/movies/{id}` to edit Lao translations

### Via API
```bash
# Fetch movie data from TMDB (doesn't save)
curl -X GET "http://localhost:3001/api/tmdb/movie/{tmdb_id}"

# Import movie from TMDB (saves to database)
curl -X POST "http://localhost:3001/api/tmdb/import/{tmdb_id}" \
  -H "Authorization: Bearer {admin_token}"
```

## Option 2: Manual Entry

### Via Admin Panel
1. Navigate to `/admin/movies/new`
2. Fill in required fields:
   - Original title
   - Release date
   - English title and overview
   - Lao title and overview
3. Save the movie
4. Add video sources, cast, crew separately

### Via API
```bash
curl -X POST "http://localhost:3001/api/movies" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "original_title": "Movie Title",
    "release_date": "2024-01-15",
    "runtime": 120,
    "title": { "en": "English Title", "lo": "ຊື່ພາສາລາວ" },
    "overview": { "en": "English overview", "lo": "ພາບລວມພາສາລາວ" }
  }'
```

## Adding Video Sources

### Via Admin Panel
1. Navigate to `/admin/movies/{id}`
2. Scroll to "Video Sources" section
3. Add HLS URL (`.m3u8` format)
4. Set quality label (e.g., "1080p")

### Prepare HLS Video
```bash
# Convert video to HLS format
./scripts/media/convert-to-hls.sh input.mp4 output_dir

# Upload to GCS
./scripts/upload-hls-to-gcs.sh --env preview output_dir movie-slug
```

## Adding Cast & Crew

### Via Admin Panel
1. Navigate to `/admin/movies/{id}`
2. Use "Cast" section to add actors with character names
3. Use "Crew" section to add director, writer, etc.
4. Search for existing people or create new entries

## Adding Translations

All localized fields use this structure:
```json
{
  "title": { "en": "English", "lo": "ລາວ" },
  "overview": { "en": "English overview", "lo": "ພາບລວມ" },
  "tagline": { "en": "Tagline", "lo": "ຄຳຂວັນ" }
}
```

## Checklist

- [ ] Movie basic info (title, release date, runtime)
- [ ] English translations
- [ ] Lao translations
- [ ] Poster image uploaded
- [ ] Backdrop image uploaded
- [ ] Video source(s) added
- [ ] Cast members added
- [ ] Director/crew added
- [ ] Genres assigned
- [ ] Availability status set (available/coming_soon/external/unavailable)

## Important Notes

- **TMDB IDs**: Imported movies keep their TMDB ID for future updates
- **Negative IDs**: Manually created people use negative IDs to distinguish from TMDB
- **LocalizedText**: Always provide both `en` and `lo` for user-facing text
- **Audit Logging**: All changes are automatically logged for admin review
