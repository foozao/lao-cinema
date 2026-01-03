# Person Merge & Alias System

## Overview

The person merge system allows admins to combine duplicate TMDB people records while preventing them from being recreated during future TMDB syncs.

## Problem Solved

TMDB sometimes has duplicate entries for the same person (e.g., different spellings, typos, or regional variations). When you merge person A into person B:

**Without aliases:**
- Person A is deleted
- Next TMDB sync sees person A in credits
- Person A is recreated as a new record
- Duplicates are back!

**With aliases:**
- Person A is deleted, but alias `A → B` is created
- Next TMDB sync sees person A in credits
- System resolves alias: "A maps to B"
- Credits are assigned to person B
- No duplicate created!

## Database Schema

### `person_aliases` Table

```sql
CREATE TABLE person_aliases (
  tmdb_id integer PRIMARY KEY,              -- The TMDB ID that was merged away
  canonical_person_id integer NOT NULL,     -- The person it was merged into
  created_at timestamp DEFAULT now() NOT NULL,
  FOREIGN KEY (canonical_person_id) REFERENCES people(id) ON DELETE CASCADE
);
```

**Example:**
- Person 123 merged into person 456
- Alias record: `{ tmdbId: 123, canonicalPersonId: 456 }`
- Any future reference to person 123 resolves to person 456

## How It Works

### 1. Merging People (Admin UI)

**Endpoint:** `POST /api/people/merge`

```typescript
{
  sourceId: 123,  // Person to merge from (will be deleted)
  targetId: 456   // Person to merge into (will be kept)
}
```

**Process:**
1. Merge translations (add missing languages from source to target)
2. Transfer all cast credits from source to target
3. Transfer all crew credits from source to target
4. **Create alias:** `person_aliases(123 → 456)`
5. Delete source person (CASCADE handles remaining data)

### 2. TMDB Import/Sync

**Helper Function:** `resolvePersonId(tmdbId)`

```typescript
// When importing cast/crew from TMDB
const tmdbPersonId = 123;  // From TMDB API

// Resolve to canonical ID
const canonicalId = await resolvePersonId(db, schema, tmdbPersonId);
// Returns: 456 (because alias 123 → 456 exists)

// Use canonical ID for all operations
await ensurePersonExists(db, schema, {
  id: tmdbPersonId,  // Original TMDB ID
  name: { en: "John Doe" },
  // ...
});
// Returns: { personId: 456, wasInserted: false }
```

**Updated Files:**
- `api/src/lib/movie-helpers.ts` - Added `resolvePersonId()` and updated `ensurePersonExists()`
- `api/src/routes/movie-crud.ts` - Uses canonical IDs when creating movies
- `api/src/routes/movie-update.ts` - Uses canonical IDs when updating cast/crew

### 3. Alias Resolution Flow

```
TMDB Sync receives person ID 123
         ↓
resolvePersonId(123)
         ↓
Check person_aliases table
         ↓
Alias found: 123 → 456
         ↓
Return canonical ID: 456
         ↓
ensurePersonExists({ id: 123, ... })
         ↓
Person 456 already exists
         ↓
Use person 456 for cast/crew credits
```

## Admin UI

**Location:** `/admin/people`

**Features:**
- Each person has a merge button (⧉ icon)
- Click to open merge dialog
- Search for target person
- Preview both source and target
- Warning about permanent action
- Creates alias automatically

**Dialog Flow:**
1. Select person to merge (source)
2. Search for target person
3. Select target from results
4. Review warning
5. Click "Merge People"
6. Alias created, source deleted
7. People list refreshes

## Migration

**File:** `db/migrations/0016_dizzy_mongoose.sql`

```sql
CREATE TABLE "person_aliases" (
  "tmdb_id" integer PRIMARY KEY NOT NULL,
  "canonical_person_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "person_aliases" 
  ADD CONSTRAINT "person_aliases_canonical_person_id_people_id_fk" 
  FOREIGN KEY ("canonical_person_id") 
  REFERENCES "public"."people"("id") 
  ON DELETE cascade;
```

**To apply:**
```bash
npm run db:update  # From project root
```

## Benefits

✅ **Prevents duplicate recreation** - Merged people stay merged  
✅ **Transparent to users** - Credits automatically use correct person  
✅ **Safe** - CASCADE deletes aliases if canonical person is deleted  
✅ **Efficient** - Single lookup per person during sync  
✅ **Flexible** - Can merge multiple duplicates into one canonical person  

## Example Scenario

**Initial State:**
- Person 123: "John Doe" (TMDB duplicate)
- Person 456: "John Doe" (correct record)
- Movie A has cast: [123]
- Movie B has cast: [456]

**After Merge (123 → 456):**
- Person 123: DELETED
- Person 456: "John Doe" (kept)
- Alias: 123 → 456
- Movie A has cast: [456] (transferred)
- Movie B has cast: [456] (unchanged)

**Future TMDB Sync:**
- TMDB returns Movie C with cast: [123]
- System resolves: 123 → 456
- Movie C gets cast: [456]
- No duplicate person created!

## API Reference

### Merge People

```http
POST /api/people/merge
Content-Type: application/json

{
  "sourceId": 123,
  "targetId": 456
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully merged person 123 into 456",
  "targetId": 456
}
```

### Resolve Person ID (Internal)

```typescript
import { resolvePersonId } from '../lib/movie-helpers.js';

const canonicalId = await resolvePersonId(db, schema, tmdbId);
```

## Testing

When testing merges:

1. Create two people with same name
2. Add them to different movies
3. Merge person A into person B
4. Verify alias exists: `SELECT * FROM person_aliases WHERE tmdb_id = A`
5. Import new movie from TMDB with person A
6. Verify credits assigned to person B, not A
7. Verify person A not recreated

## Limitations

- Only tracks TMDB person IDs (not manually created people with negative IDs)
- Aliases are permanent (no "unmerge" functionality)
- If canonical person is deleted, aliases are CASCADE deleted
- No merge history/audit trail (could add if needed)

## Future Enhancements

- [ ] Merge history tracking
- [ ] Unmerge functionality
- [ ] Bulk merge operations
- [ ] Automatic duplicate detection
- [ ] Merge suggestions based on name similarity
