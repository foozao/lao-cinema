# API Reference

Complete reference for the Lao Cinema REST API (Fastify + PostgreSQL).

**Base URL**: `http://localhost:3001/api`

---

## Authentication

### Headers

| Header | Description |
|--------|-------------|
| `Authorization` | `Bearer <session_token>` for authenticated requests |
| `X-Anonymous-Id` | UUID for anonymous user tracking (rentals, watch progress) |

### Middleware

| Middleware | Description |
|------------|-------------|
| `requireAuth` | Requires valid session token |
| `requireAuthOrAnonymous` | Requires either session token OR anonymous ID |
| `optionalAuth` | Attaches user if authenticated, continues otherwise |

---

## Endpoints

### Health

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-07T00:00:00.000Z"
}
```

---

### Authentication (`/api/auth/*`)

#### `POST /api/auth/register`
Create a new user account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "displayName": "John Doe"  // optional
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "profileImageUrl": null,
    "timezone": "Asia/Vientiane",
    "role": "user",
    "emailVerified": false,
    "createdAt": "2025-12-07T00:00:00.000Z"
  },
  "session": {
    "token": "session_token_here",
    "expiresAt": "2026-01-06T00:00:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid email/password format
- `409` - Email already exists

---

#### `POST /api/auth/login`
Login with email/password.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):** Same as register response.

**Errors:**
- `400` - Missing email/password
- `401` - Invalid credentials

---

#### `POST /api/auth/logout`
Logout current session. **Requires auth.**

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `POST /api/auth/logout-all`
Logout from all devices. **Requires auth.**

**Response:**
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

---

#### `GET /api/auth/me`
Get current user profile. **Requires auth.**

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "profileImageUrl": null,
    "timezone": "Asia/Vientiane",
    "role": "user",
    "emailVerified": false,
    "createdAt": "2025-12-07T00:00:00.000Z",
    "lastLoginAt": "2025-12-07T00:00:00.000Z"
  }
}
```

---

#### `PATCH /api/auth/me`
Update profile. **Requires auth.**

**Body:**
```json
{
  "displayName": "New Name",
  "profileImageUrl": "https://...",
  "timezone": "America/New_York"
}
```

---

#### `PATCH /api/auth/me/password`
Change password. **Requires auth.**

**Body:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newSecurePassword123"
}
```

---

#### `DELETE /api/auth/me`
Delete account. **Requires auth.**

**Body:**
```json
{
  "password": "currentPassword"
}
```

---

### Movies (`/api/movies/*`)

#### `GET /api/movies`
Get all movies with basic info.

**Response:**
```json
{
  "movies": [
    {
      "id": "uuid",
      "tmdb_id": 123,
      "slug": "the-signal",
      "original_title": "The Signal",
      "title": { "en": "The Signal", "lo": "ສັນຍານ" },
      "overview": { "en": "...", "lo": "..." },
      "poster_path": "/abc.jpg",
      "backdrop_path": "/xyz.jpg",
      "release_date": "2024-01-15",
      "runtime": 120,
      "vote_average": 7.5,
      "availability_status": "available",
      "cast": [...],  // top 3
      "crew": [...]
    }
  ]
}
```

---

#### `GET /api/movies/:id`
Get movie by UUID or slug.

**Response:** Full movie object with:
- All translations
- Full cast & crew
- Genres with translations
- Video sources
- Images (posters, backdrops)
- External platforms

---

#### `POST /api/movies`
Create a movie (typically from TMDB import).

**Body:**
```json
{
  "tmdb_id": 550,
  "original_title": "Fight Club",
  "title": { "en": "Fight Club", "lo": "..." },
  "overview": { "en": "...", "lo": "..." },
  "tagline": { "en": "...", "lo": "..." },
  "poster_path": "/abc.jpg",
  "backdrop_path": "/xyz.jpg",
  "release_date": "1999-10-15",
  "runtime": 139,
  "genres": [{ "id": 18, "name": { "en": "Drama" } }],
  "cast": [...],
  "crew": [...],
  "images": [...]
}
```

---

#### `PUT /api/movies/:id`
Update movie details.

**Body:** Partial movie object with fields to update.

---

#### `DELETE /api/movies/:id`
Delete a movie and all related data (cascades).

---

#### `POST /api/movies/:id/cast`
Add cast member to movie.

**Body:**
```json
{
  "person_id": 123,
  "character": { "en": "Tyler Durden", "lo": "..." },
  "order": 0
}
```

---

#### `DELETE /api/movies/:id/cast/:personId`
Remove cast member from movie.

---

#### `POST /api/movies/:id/crew`
Add crew member to movie.

**Body:**
```json
{
  "person_id": 456,
  "department": "Directing",
  "job": { "en": "Director", "lo": "ຜູ້ກຳກັບ" }
}
```

---

#### `DELETE /api/movies/:id/crew/:personId`
Remove crew member. Optional `?department=Directing` to remove specific role.

---

#### `PUT /api/movies/:id/images/:imageId/primary`
Set primary poster or backdrop.

**Body:**
```json
{
  "type": "poster"  // or "backdrop"
}
```

---

### People (`/api/people/*`)

#### `GET /api/people`
Get all people. Optional `?search=name&limit=20`.

**Response:**
```json
{
  "people": [
    {
      "id": 123,
      "name": { "en": "Brad Pitt", "lo": "..." },
      "profile_path": "/abc.jpg",
      "known_for_department": "Acting",
      "departments": ["Acting", "Directing"],
      "birthday": "1963-12-18",
      "popularity": 50.5
    }
  ]
}
```

---

#### `GET /api/people/:id`
Get person with filmography.

**Response:** Person object plus `cast` and `crew` arrays with movie details.

---

#### `POST /api/people`
Create a new person (for manually added people, uses negative IDs).

**Body:**
```json
{
  "name": { "en": "New Actor", "lo": "..." },
  "biography": { "en": "...", "lo": "..." },
  "known_for_department": "Acting",
  "birthday": "1990-01-01",
  "profile_path": "/abc.jpg"
}
```

---

#### `PUT /api/people/:id`
Update person details.

---

### Rentals (`/api/rentals/*`)

All rental endpoints require `requireAuthOrAnonymous`.

#### `GET /api/rentals`
Get all active rentals for current user/anonymous.

**Response:**
```json
{
  "rentals": [
    {
      "id": "uuid",
      "movieId": "uuid",
      "purchasedAt": "2025-12-07T00:00:00.000Z",
      "expiresAt": "2025-12-08T00:00:00.000Z",
      "transactionId": "txn_123",
      "amount": 500,
      "currency": "USD",
      "movieTitle": "The Signal",
      "moviePosterPath": "/abc.jpg"
    }
  ],
  "total": 1
}
```

---

#### `GET /api/rentals/:movieId`
Check if user has active rental for specific movie.

**Response:**
```json
{
  "rental": { ... }  // or null if no rental
}
```

---

#### `POST /api/rentals/:movieId`
Create a new rental (24-hour duration).

**Body:**
```json
{
  "transactionId": "txn_123",
  "amount": 500,
  "paymentMethod": "demo"
}
```

**Errors:**
- `404` - Movie not found
- `409` - Already has active rental

---

#### `POST /api/rentals/migrate`
Migrate anonymous rentals to authenticated user. **Requires auth.**

**Body:**
```json
{
  "anonymousId": "uuid"
}
```

---

### Watch Progress (`/api/watch-progress/*`)

All endpoints require `requireAuthOrAnonymous`.

#### `GET /api/watch-progress`
Get all watch progress records.

**Response:**
```json
{
  "progress": [
    {
      "id": "uuid",
      "movieId": "uuid",
      "progressSeconds": 1800,
      "durationSeconds": 7200,
      "completed": false,
      "lastWatchedAt": "2025-12-07T00:00:00.000Z",
      "movieTitle": "The Signal",
      "moviePosterPath": "/abc.jpg"
    }
  ],
  "total": 1
}
```

---

#### `GET /api/watch-progress/:movieId`
Get progress for specific movie.

---

#### `PUT /api/watch-progress/:movieId`
Update or create watch progress.

**Body:**
```json
{
  "progressSeconds": 1800,
  "durationSeconds": 7200,
  "completed": false  // optional, auto-calculated if >90%
}
```

---

#### `DELETE /api/watch-progress/:movieId`
Delete watch progress for a movie.

---

#### `POST /api/watch-progress/migrate`
Migrate anonymous progress to authenticated user. **Requires auth.**

---

### Homepage (`/api/homepage/*`)

#### `GET /api/homepage/featured`
Get featured movies for homepage carousel.

**Response:**
```json
{
  "movies": [...]  // Full movie objects in display order
}
```

---

#### `GET /api/homepage/featured/admin`
Get featured entries with admin metadata.

---

#### `POST /api/homepage/featured`
Add movie to featured. **Admin only.**

**Body:**
```json
{
  "movieId": "uuid",
  "order": 0
}
```

---

#### `PUT /api/homepage/featured/reorder`
Update featured order. **Admin only.**

**Body:**
```json
{
  "items": [
    { "id": "uuid", "order": 0 },
    { "id": "uuid", "order": 1 }
  ]
}
```

---

#### `DELETE /api/homepage/featured/:id`
Remove from featured. **Admin only.**

---

### User Data (`/api/users/*`)

#### `POST /api/users/migrate`
Unified migration of all anonymous data. **Requires auth.**

**Body:**
```json
{
  "anonymousId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "migratedRentals": 2,
  "migratedProgress": 5,
  "totalMigrated": 7
}
```

---

#### `GET /api/users/me/stats`
Get user statistics. **Requires auth.**

**Response:**
```json
{
  "stats": {
    "totalRentals": 10,
    "activeRentals": 2,
    "totalWatchProgress": 15,
    "completedMovies": 8
  }
}
```

---

### Production Companies (`/api/production-companies/*`)

#### `GET /api/production-companies`
Get all production companies. Optional `?search=name&limit=20`.

**Response:**
```json
{
  "companies": [
    {
      "id": 123,
      "slug": "hoppin-film",
      "name": { "en": "Hoppin Film", "lo": "..." },
      "logoPath": "/abc.jpg",
      "customLogoUrl": null,
      "websiteUrl": "https://...",
      "originCountry": "LA",
      "movieCount": 5
    }
  ]
}
```

---

#### `GET /api/production-companies/:id`
Get production company with filmography.

**Response:** Company object plus `movies` array.

---

#### `POST /api/production-companies`
Create a new production company. **Editor/Admin only.**

**Body:**
```json
{
  "name": { "en": "New Studio", "lo": "..." },
  "slug": "new-studio",
  "websiteUrl": "https://...",
  "originCountry": "LA"
}
```

---

#### `PUT /api/production-companies/:id`
Update production company. **Editor/Admin only.**

---

#### `GET /api/movies/:id/production-companies`
Get production companies for a movie.

---

#### `POST /api/movies/:id/production-companies`
Add production company to movie. **Editor/Admin only.**

**Body:**
```json
{
  "companyId": 123,
  "order": 0
}
```

---

#### `DELETE /api/movies/:id/production-companies/:companyId`
Remove production company from movie. **Editor/Admin only.**

---

### Trailers (`/api/trailers/*`)

#### `GET /api/movies/:id/trailers`
Get all trailers for a movie.

**Response:**
```json
{
  "trailers": [
    {
      "id": "uuid",
      "type": "youtube",
      "youtubeKey": "dQw4w9WgXcQ",
      "name": "Official Trailer",
      "official": true,
      "language": "en",
      "order": 0
    }
  ]
}
```

---

#### `POST /api/movies/:id/trailers`
Add trailer to movie. **Editor/Admin only.**

**Body (YouTube):**
```json
{
  "type": "youtube",
  "youtubeKey": "dQw4w9WgXcQ",
  "name": "Official Trailer",
  "official": true,
  "language": "en"
}
```

**Body (Self-hosted):**
```json
{
  "type": "video",
  "videoUrl": "https://storage.../trailer.mp4",
  "videoFormat": "mp4",
  "videoQuality": "1080p",
  "name": "Teaser",
  "durationSeconds": 120
}
```

---

#### `PUT /api/trailers/:id`
Update trailer. **Editor/Admin only.**

---

#### `DELETE /api/trailers/:id`
Delete trailer. **Editor/Admin only.**

---

### Audit Logs (`/api/audit-logs/*`)

#### `GET /api/audit-logs`
Get audit log entries. **Admin only.**

**Query params:**
- `entityType` - Filter by type (movie, person, etc.)
- `entityId` - Filter by specific entity
- `userId` - Filter by user who made changes
- `action` - Filter by action type
- `limit` - Results per page (default 50)
- `offset` - Pagination offset

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "Editor Name",
      "action": "update",
      "entityType": "movie",
      "entityId": "uuid",
      "entityName": "The Signal",
      "changes": "{\"title\":{\"before\":\"Old\",\"after\":\"New\"}}",
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-12-13T00:00:00.000Z"
    }
  ],
  "total": 150
}
```

---

### Password Reset (`/api/auth/*`)

#### `POST /api/auth/forgot-password`
Request a password reset email.

**Body:**
```json
{
  "email": "user@example.com",
  "locale": "en"  // optional, for email language
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link will be sent."
}
```

**Errors:**
- `400` - Invalid email format
- `429` - Rate limited (too many requests)

---

#### `POST /api/auth/reset-password`
Reset password using token from email.

**Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

**Errors:**
- `400` - Invalid/expired token, weak password

---

#### `GET /api/auth/verify-reset-token`
Verify a password reset token is valid.

**Query:** `?token=reset-token-here`

**Response:**
```json
{
  "valid": true,
  "email": "user@example.com"
}
```

---

### Email Verification (`/api/auth/*`)

#### `POST /api/auth/send-verification-email`
Send verification email. **Requires auth.**

**Body:**
```json
{
  "locale": "en"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification email sent"
}
```

---

#### `POST /api/auth/verify-email`
Verify email with token from email link.

**Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": { ... }
}
```

---

### Awards (`/api/awards/*`)

#### `GET /api/awards/shows`
Get all award shows.

**Response:**
```json
{
  "shows": [
    {
      "id": "uuid",
      "slug": "lao-film-awards",
      "name": { "en": "Lao Film Awards", "lo": "..." },
      "description": { "en": "...", "lo": "..." },
      "country": "LA",
      "city": "Vientiane",
      "website_url": "https://...",
      "logo_path": "/abc.jpg",
      "edition_count": 5
    }
  ]
}
```

---

#### `GET /api/awards/shows/:id`
Get award show with editions and categories.

---

#### `POST /api/awards/shows`
Create award show. **Editor/Admin only.**

**Body:**
```json
{
  "slug": "lao-film-awards",
  "name": { "en": "Lao Film Awards", "lo": "..." },
  "description": { "en": "...", "lo": "..." },
  "country": "LA",
  "city": "Vientiane"
}
```

---

#### `PUT /api/awards/shows/:id`
Update award show. **Editor/Admin only.**

---

#### `DELETE /api/awards/shows/:id`
Delete award show. **Admin only.**

---

#### `GET /api/awards/editions/:id`
Get edition with categories and nominations.

---

#### `POST /api/awards/shows/:showId/editions`
Create edition for a show. **Editor/Admin only.**

**Body:**
```json
{
  "year": 2024,
  "edition_number": 5,
  "name": { "en": "5th Annual Awards", "lo": "..." },
  "ceremony_date": "2024-03-15"
}
```

---

#### `POST /api/awards/editions/:editionId/categories`
Add category to edition. **Editor/Admin only.**

**Body:**
```json
{
  "name": { "en": "Best Picture", "lo": "..." },
  "description": { "en": "...", "lo": "..." },
  "sort_order": 1
}
```

---

#### `POST /api/awards/categories/:categoryId/nominations`
Add nomination to category. **Editor/Admin only.**

**Body:**
```json
{
  "movie_id": "uuid",
  "person_id": 123,  // optional
  "is_winner": false,
  "notes": { "en": "...", "lo": "..." }
}
```

---

#### `PUT /api/awards/nominations/:nominationId/winner`
Set nomination as winner. **Editor/Admin only.**

**Body:**
```json
{
  "is_winner": true
}
```

---

### Short Packs (`/api/short-packs/*`)

Short packs are curated collections of short films.

#### `GET /api/short-packs`
Get all short packs. Optional `?published=true` for public packs only.

**Response:**
```json
{
  "short_packs": [
    {
      "id": "uuid",
      "slug": "lao-shorts-2024",
      "title": { "en": "Lao Shorts 2024", "lo": "..." },
      "description": { "en": "...", "lo": "..." },
      "poster_path": "/abc.jpg",
      "backdrop_path": "/xyz.jpg",
      "is_published": true,
      "short_count": 5,
      "total_runtime": 75
    }
  ]
}
```

---

#### `GET /api/short-packs/:id`
Get short pack by ID or slug with full movie data.

---

#### `POST /api/short-packs`
Create short pack. **Editor/Admin only.**

**Body:**
```json
{
  "slug": "lao-shorts-2024",
  "title": { "en": "Lao Shorts 2024", "lo": "..." },
  "description": { "en": "...", "lo": "..." },
  "is_published": false
}
```

---

#### `PUT /api/short-packs/:id`
Update short pack. **Editor/Admin only.**

---

#### `DELETE /api/short-packs/:id`
Delete short pack. **Admin only.**

---

#### `POST /api/short-packs/:id/items`
Add short film to pack. **Editor/Admin only.**

**Body:**
```json
{
  "movie_id": "uuid",
  "order": 0
}
```

---

#### `DELETE /api/short-packs/:id/items/:movieId`
Remove short from pack. **Editor/Admin only.**

---

#### `PUT /api/short-packs/:id/items/reorder`
Reorder shorts in pack. **Editor/Admin only.**

**Body:**
```json
{
  "items": [
    { "movie_id": "uuid", "order": 0 },
    { "movie_id": "uuid", "order": 1 }
  ]
}
```

---

#### `GET /api/short-packs/for-movie/:movieId`
Get packs containing a specific short film.

---

### Genres (`/api/genres/*`)

#### `GET /api/genres`
Get all genres with visibility. **Admin only.**

**Response:**
```json
{
  "genres": [
    {
      "id": 28,
      "name": { "en": "Action", "lo": "..." },
      "isVisible": true,
      "movieCount": 15
    }
  ]
}
```

---

#### `POST /api/genres`
Create custom genre. **Admin only.**

**Body:**
```json
{
  "nameEn": "Lao Traditional",
  "nameLo": "ລາວພື້ນບ້ານ",
  "isVisible": true
}
```

---

#### `PUT /api/genres/:id`
Update genre. **Admin only.**

---

#### `DELETE /api/genres/:id`
Delete genre. **Admin only.**

---

### Movie Genres (`/api/movies/:id/genres`)

#### `POST /api/movies/:id/genres`
Add genre to movie. **Editor/Admin only.**

**Body:**
```json
{
  "genreId": 28
}
```

---

#### `DELETE /api/movies/:id/genres/:genreId`
Remove genre from movie. **Editor/Admin only.**

---

### Subtitles (`/api/movies/:id/subtitles`)

#### `GET /api/movies/:id/subtitles`
Get all subtitle tracks for a movie.

**Response:**
```json
[
  {
    "id": "uuid",
    "language": "en",
    "label": "English",
    "url": "https://.../subtitles.vtt",
    "isDefault": true,
    "kind": "subtitles"
  }
]
```

---

#### `POST /api/movies/:id/subtitles`
Add subtitle track. **Editor/Admin only.**

**Body:**
```json
{
  "language": "lo",
  "label": "ພາສາລາວ",
  "url": "https://.../subtitles-lo.vtt",
  "isDefault": false,
  "kind": "subtitles"
}
```

---

#### `PUT /api/movies/:id/subtitles/:trackId`
Update subtitle track. **Editor/Admin only.**

---

#### `DELETE /api/movies/:id/subtitles/:trackId`
Delete subtitle track. **Editor/Admin only.**

---

### Notifications (`/api/notifications/*`)

Request notifications when movies become available.

#### `POST /api/notifications/movies/:movieId`
Subscribe to movie availability notification. **Requires auth.**

**Response:**
```json
{
  "success": true,
  "message": "Notification request created",
  "notification": { ... }
}
```

---

#### `DELETE /api/notifications/movies/:movieId`
Unsubscribe from movie notification. **Requires auth.**

---

#### `GET /api/notifications/movies`
Get all notification subscriptions. **Requires auth.**

---

### Watchlist (`/api/watchlist/*`)

User's personal watchlist (movies to watch later).

#### `POST /api/watchlist/:movieId`
Add movie to watchlist. **Requires auth.**

**Response:**
```json
{
  "success": true,
  "message": "Added to watchlist",
  "item": { ... }
}
```

---

#### `DELETE /api/watchlist/:movieId`
Remove movie from watchlist. **Requires auth.**

---

#### `GET /api/watchlist`
Get user's watchlist with movie details. **Requires auth.**

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "movieId": "uuid",
      "addedAt": "2025-12-30T00:00:00.000Z",
      "movie": {
        "id": "uuid",
        "title": { "en": "...", "lo": "..." },
        "poster_path": "/abc.jpg"
      }
    }
  ],
  "total": 5
}
```

---

### Video Tokens (`/api/video-tokens/*`)

Secure signed URLs for video playback.

#### `POST /api/video-tokens/:movieId`
Get signed playback URL. **Requires auth or anonymous + valid rental.**

**Response:**
```json
{
  "success": true,
  "signedUrl": "https://.../video.m3u8?token=...",
  "expiresAt": "2025-12-30T00:15:00.000Z",
  "sessionCookie": "video_session=...",
  "aspectRatio": "2.39:1"
}
```

**Errors:**
- `403` - No valid rental for this movie
- `404` - Movie not found or no video source

---

## Error Response Format

All errors follow [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) format:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Human-readable message about what went wrong",
  "errors": [...]  // optional, for validation errors
}
```

**Content-Type**: `application/problem+json`

### Common Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Missing/invalid auth |
| `404` | Not Found - Resource doesn't exist |
| `409` | Conflict - Duplicate resource |
| `500` | Internal Server Error |

---

## LocalizedText Format

All translatable fields use the `LocalizedText` format:

```typescript
type LocalizedText = {
  en: string;  // English (required)
  lo?: string; // Lao (optional)
}
```

Examples: `title`, `overview`, `tagline`, `character`, `job`, `name`, `biography`
