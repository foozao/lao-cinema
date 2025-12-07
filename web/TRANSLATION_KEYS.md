# Translation Keys Reference

Complete reference for all `next-intl` translation keys in `messages/en.json` and `messages/lo.json`.

**Usage**: `const t = useTranslations('namespace'); t('key')`

---

## Namespaces Overview

| Namespace | Purpose | Key Count |
|-----------|---------|-----------|
| `common` | Shared UI states | 3 |
| `apiError` | API error messages | 7 |
| `nav` | Navigation labels | 5 |
| `home` | Homepage content | 7 |
| `movies` | Movie listing page | 13 |
| `movie` | Movie detail page | 21 |
| `watch` | Watch page | 1 |
| `video` | Video player | 13 |
| `crew` | Crew job titles | 12 |
| `departments` | Department names | 9 |
| `footer` | Footer content | 2 |
| `language` | Language switcher | 3 |
| `languages` | Language names | 15 |
| `genres` | Genre names | 18 |
| `payment` | Rental payment | 13 |
| `admin` | Admin panel | 49 |
| `analytics` | Analytics dashboard | 52 |
| `auth` | Auth pages | 4 |
| `profile` | User profile | 70+ |

---

## Key Reference

### `common` - Shared UI States

```typescript
const t = useTranslations('common');
```

| Key | English | Usage |
|-----|---------|-------|
| `loading` | "Loading..." | Loading spinners |
| `error` | "Something went wrong" | Generic error state |
| `noResults` | "No results found" | Empty search results |

---

### `apiError` - API Error Messages

```typescript
const t = useTranslations('apiError');
```

| Key | English | Usage |
|-----|---------|-------|
| `networkErrorTitle` | "Service Temporarily Unavailable" | Network failure title |
| `networkErrorMessage` | "We're having trouble connecting..." | Network failure body |
| `serverErrorTitle` | "Server Error" | 5xx error title |
| `serverErrorMessage` | "Something went wrong on our end..." | 5xx error body |
| `genericErrorTitle` | "Something Went Wrong" | Unknown error title |
| `genericErrorMessage` | "An unexpected error occurred..." | Unknown error body |
| `tryAgain` | "Try Again" | Retry button |
| `retrying` | "Retrying..." | Retry in progress |

---

### `nav` - Navigation

```typescript
const t = useTranslations('nav');
```

| Key | English | Usage |
|-----|---------|-------|
| `home` | "Home" | Home link |
| `movies` | "Movies" | Movies link |
| `people` | "People" | People link |
| `admin` | "Admin" | Admin link |
| `back` | "Back" | Back button |

---

### `home` - Homepage

```typescript
const t = useTranslations('home');
```

| Key | English | Usage |
|-----|---------|-------|
| `title` | "Lao Cinema" | Site title |
| `subtitle` | "Lao Films" | Site subtitle |
| `tagline` | "Discover amazing Lao cinema" | Hero tagline |
| `featured` | "Featured Films" | Featured section header |
| `browseAll` | "Browse All Movies & People" | CTA button |
| `noFilms` | "No films available yet" | Empty state title |
| `noFilmsDescription` | "Check back soon for new content" | Empty state body |

---

### `movies` - Movie Listing

```typescript
const t = useTranslations('movies');
```

| Key | English | Usage |
|-----|---------|-------|
| `all` | "All" | Filter: all movies |
| `people` | "People" | People tab |
| `feature` | "Feature Films" | Filter: features |
| `short` | "Short Films" | Filter: shorts |
| `searchPlaceholder` | "Search by title, cast, or crew..." | Search input placeholder |
| `matchType.cast` | "Found in Cast" | Search result badge |
| `matchType.crew` | "Found in Crew" | Search result badge |
| `moviesSection` | "Movies" | Section header |
| `peopleSection` | "People" | Section header |
| `otherMovies` | "Other Movies" | Section header |
| `andMore` | "+ {count} more" | Overflow count (generic) |
| `andMoreMovies` | "+ {count} more movies" | Overflow count (movies) |
| `searchForPeople` | "Search for cast or crew" | People search prompt |
| `searchForPeopleDescription` | "Enter a name to find actors..." | People search help |

**Interpolation**: `t('andMore', { count: 5 })` → "+ 5 more"

---

### `movie` - Movie Detail

```typescript
const t = useTranslations('movie');
```

| Key | English | Usage |
|-----|---------|-------|
| `cast` | "Cast" | Cast section header |
| `crew` | "Crew" | Crew section header |
| `overview` | "Overview" | Synopsis header |
| `releaseDate` | "Release Date" | Metadata label |
| `runtime` | "Runtime" | Metadata label |
| `minutes` | "{count} minutes" | Runtime value |
| `rating` | "Rating" | Metadata label |
| `genres` | "Genres" | Metadata label |
| `watchNow` | "Watch Now" | Primary CTA |
| `playTrailer` | "Play Trailer" | Trailer CTA |
| `viewAll` | "View All" | Link to full cast/crew |
| `originalTitle` | "Original Title" | Metadata label |
| `as` | "as" | "Actor as Character" |
| `info` | "Info" | Info button |
| `viewFullDetails` | "View Full Details" | Link to movie page |
| `status` | "Status" | Metadata label |
| `originalLanguage` | "Original Language" | Metadata label |
| `productionCountries` | "Production Countries" | Metadata label |
| `spokenLanguages` | "Spoken Languages" | Metadata label |
| `availableOn` | "This film is available on:" | External platforms intro |
| `externalOnly` | "External" | Badge for external-only |
| `comingSoonMessage` | "This film will be available..." | Coming soon notice |
| `unavailableMessage` | "This film is not currently available..." | Unavailable notice |
| `availabilityStatus.available` | "Available" | Status badge |
| `availabilityStatus.external` | "External" | Status badge |
| `availabilityStatus.unavailable` | "Unavailable" | Status badge |
| `availabilityStatus.comingSoon` | "Coming Soon" | Status badge |

---

### `watch` - Watch Page

```typescript
const t = useTranslations('watch');
```

| Key | English | Usage |
|-----|---------|-------|
| `gracePeriodWarning` | "Your rental has expired, but you have {time}..." | Grace period notice |

---

### `video` - Video Player

```typescript
const t = useTranslations('video');
```

| Key | English | Usage |
|-----|---------|-------|
| `connectionError` | "Connection Error" | Error title |
| `playbackError` | "Playback Error" | Error title |
| `unableToConnectServer` | "Unable to connect to video server..." | Connection error |
| `streamInterrupted` | "Video stream interrupted..." | Stream error |
| `networkError` | "Network error occurred..." | Network error |
| `mediaError` | "Media playback error..." | Media error |
| `genericError` | "An error occurred while loading..." | Generic error |
| `unableToLoad` | "Unable to load video..." | Load error |
| `tryAgain` | "Try Again" | Retry button |
| `continueWatching` | "Continue Watching?" | Resume dialog title |
| `youWereAt` | "You were at {time}..." | Resume dialog body |
| `startFromBeginning` | "Start from Beginning" | Resume option |
| `continue` | "Continue Watching" | Resume option |

---

### `crew` - Crew Job Titles

```typescript
const t = useTranslations('crew');
```

Used by `translateCrewJob()` helper.

| Key | English |
|-----|---------|
| `director` | "Director" |
| `writer` | "Writer" |
| `screenplay` | "Screenplay" |
| `producer` | "Producer" |
| `executiveProducer` | "Executive Producer" |
| `cinematography` | "Cinematography" |
| `editor` | "Editor" |
| `music` | "Music" |
| `productionDesign` | "Production Design" |
| `artDirection` | "Art Direction" |
| `setDecoration` | "Set Decoration" |
| `costumeDesign` | "Costume Design" |

---

### `departments` - Department Names

```typescript
const t = useTranslations('departments');
```

| Key | English |
|-----|---------|
| `directing` | "Directing" |
| `writing` | "Writing" |
| `production` | "Production" |
| `camera` | "Camera" |
| `editing` | "Editing" |
| `sound` | "Sound" |
| `art` | "Art" |
| `costumeAndMakeup` | "Costume & Make-Up" |
| `visualEffects` | "Visual Effects" |

---

### `genres` - Genre Names

```typescript
const t = useTranslations('genres');
```

Used by `getGenreKey()` helper to map TMDB genre IDs.

| Key | English |
|-----|---------|
| `action` | "Action" |
| `adventure` | "Adventure" |
| `animation` | "Animation" |
| `comedy` | "Comedy" |
| `crime` | "Crime" |
| `documentary` | "Documentary" |
| `drama` | "Drama" |
| `family` | "Family" |
| `fantasy` | "Fantasy" |
| `history` | "History" |
| `horror` | "Horror" |
| `music` | "Music" |
| `mystery` | "Mystery" |
| `romance` | "Romance" |
| `scienceFiction` | "Science Fiction" |
| `thriller` | "Thriller" |
| `war` | "War" |
| `western` | "Western" |

---

### `languages` - Language Names

```typescript
const t = useTranslations('languages');
```

ISO 639-1 codes to display names.

| Key | English |
|-----|---------|
| `en` | "English" |
| `lo` | "Lao" |
| `th` | "Thai" |
| `zh` | "Chinese" |
| `ja` | "Japanese" |
| `ko` | "Korean" |
| `vi` | "Vietnamese" |
| `fr` | "French" |
| `es` | "Spanish" |
| `de` | "German" |
| `it` | "Italian" |
| `pt` | "Portuguese" |
| `ru` | "Russian" |
| `ar` | "Arabic" |
| `hi` | "Hindi" |

---

### `payment` - Rental Payment

```typescript
const t = useTranslations('payment');
```

| Key | English | Usage |
|-----|---------|-------|
| `title` | "Rent Movie" | Modal title |
| `description` | "Scan the QR code to rent \"{movie}\"..." | Normal context |
| `descriptionRequired` | "To watch \"{movie}\", you'll need to rent..." | Rental required context |
| `descriptionExpired` | "Your rental of \"{movie}\" has expired..." | Expired context |
| `scanInstructions` | "Scan with your banking app..." | QR instructions |
| `emulatePayment` | "Emulate QR Payment" | Demo button |
| `processing` | "Processing..." | Loading state |
| `complete` | "Payment Complete" | Success state |
| `paymentSuccess` | "Payment successful!" | Success message |
| `demoNotice` | "Demo mode: No actual payment required" | Demo notice |
| `rentalActive` | "Rental active" | Status |
| `expiresIn` | "Expires in {time}" | Expiry countdown |

---

### `admin` - Admin Panel

```typescript
const t = useTranslations('admin');
```

Large namespace - key categories:

**Dashboard**: `dashboard`, `adminDashboard`, `manageMoviesAndPeople`, `backToSite`, `quickActions`, `commonTasks`

**Movies**: `allMovies`, `searchMovies`, `loadingMovies`, `noMoviesYet`, `noMoviesFound`, `totalMoviesInDatabase`, `manageMovieCatalog`

**People**: `allPeople`, `searchPeople`, `loadingPeople`, `noPeopleYet`, `noPeopleFound`, `totalPeopleInDatabase`, `manageCastAndCrew`

**Actions**: `edit`, `delete`, `save`, `cancel`, `add`, `import`, `customize`

**Filters**: `filter`, `sort`, `all`, `acting`, `directing`, `writing`, `production`, `other`, `aToZ`, `zToA`

**Sorting**: `sortTitleAZ`, `sortTitleZA`, `sortDateNewest`, `sortDateOldest`

**Stats**: `showing`, `of`, `people`, `movies`, `in`, `matching`

**Analytics**: `analytics`, `viewAnalytics`

---

### `analytics` - Analytics Dashboard

```typescript
const t = useTranslations('analytics');
```

Large namespace for analytics views:

**Overview**: `title`, `description`, `refresh`, `export`, `clear`, `confirmClear`, `noData`, `noDataDescription`

**Metrics**: `uniqueViewers`, `totalSessions`, `totalViews`, `totalWatchTime`, `completions`, `avgSessionLength`

**Top Lists**: `topByWatchTime`, `topByCompletion`, `topByViews`, `mostWatchedMovies`, `mostEngagingMovies`, `mostViewedMovies`

**Details**: `allMoviesStats`, `detailedStats`, `movie`, `views`, `watchTime`, `avgSession`, `avgProgress`

**Activity**: `recentActivity`, `recentWatchSessions`, `lastWatched`, `sessionHistory`, `watched`, `completed`, `progress`

---

### `profile` - User Profile

```typescript
const t = useTranslations('profile');
```

Deeply nested namespace:

**Main**: `title`, `description`, `myProfile`, `manageAccount`, `memberSince`, `yourActivity`, `totalRentals`, `activeNow`, `inProgress`, `completed`

**Quick Links** (`profile.quickLinks.*`): `myRentals`, `myRentalsDesc`, `continueWatching`, `continueWatchingDesc`, `editProfile`, `editProfileDesc`, `settings`, `settingsDesc`

**Edit** (`profile.edit.*`): `title`, `subtitle`, `displayName`, `saving`, `save`, `cancel`, `successMessage`, `accountInfo`, `email`

**Settings** (`profile.settings.*`):
- `timezone.*`: Timezone settings
- `password.*`: Password change
- `sessions.*`: Active sessions
- `deleteAccount.*`: Account deletion

**Rentals** (`profile.rentals.*`): `title`, `subtitle`, `active`, `expired`, `noActive`, `noActiveDesc`, `watchNow`, `rentAgain`

**Continue Watching** (`profile.continueWatching.*`): `title`, `subtitle`, `noProgress`, `noProgressDesc`, `lastWatched`, `remove`, `justNow`, `hoursAgo`, `daysAgo`

---

## Adding New Keys

### Process

1. Add key to `messages/en.json`
2. Add Lao translation to `messages/lo.json`
3. Update this reference document

### Naming Conventions

- Use **camelCase** for keys: `watchNow`, not `watch_now`
- Use **dot notation** for nesting: `profile.edit.title`
- Group related keys in nested objects
- Use descriptive names: `networkErrorMessage`, not `msg1`

### Interpolation

```typescript
// Key with variable
"minutes": "{count} minutes"

// Usage
t('minutes', { count: 120 }) // "120 minutes"
```

### Pluralization

next-intl supports ICU message format:

```typescript
// Key
"items": "{count, plural, =0 {No items} one {# item} other {# items}}"

// Usage
t('items', { count: 0 })  // "No items"
t('items', { count: 1 })  // "1 item"
t('items', { count: 5 })  // "5 items"
```

---

## Checking for Missing Keys

```bash
# Compare en.json and lo.json structure
cd web
node -e "
const en = require('./messages/en.json');
const lo = require('./messages/lo.json');

function getKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => 
    typeof v === 'object' ? getKeys(v, prefix + k + '.') : prefix + k
  );
}

const enKeys = getKeys(en);
const loKeys = getKeys(lo);
const missing = enKeys.filter(k => !loKeys.includes(k));
console.log('Missing in lo.json:', missing);
"
```
