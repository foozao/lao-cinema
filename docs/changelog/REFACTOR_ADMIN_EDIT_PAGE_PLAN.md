# Refactoring Plan: Admin Edit Page (1,927 lines → Modular Architecture)

**Date**: December 11, 2025  
**Type**: Code Quality Improvement (Large Refactoring)  
**Status**: In Progress (Phase 1 Complete)  
**Target File**: `web/app/[locale]/admin/edit/[id]/page.tsx`

## Problem

The admin movie edit page has grown to **1,927 lines**, making it:
- **Hard to maintain** - Changes require navigating through massive file
- **Difficult to test** - Logic is tightly coupled to UI
- **Poor reusability** - Duplicate logic can't be easily extracted
- **Cognitive overload** - Too many concerns in one file

## Refactoring Strategy

Break down the monolithic page into:
1. **Custom Hooks** - Reusable logic (form state, sync, change detection)
2. **Feature Components** - Self-contained UI sections (cast/crew, trailers, platforms)
3. **Utility Components** - Shared UI elements (modals, form fields)
4. **Main Page** - Orchestrates components and hooks

## Phase 1: Custom Hooks (✅ COMPLETED)

### Created Hooks

#### 1. `useMovieForm.ts` (155 lines)
**Purpose**: Manages all form state and validation

**Exports**:
- `formData` - All form fields (title, overview, metadata, etc.)
- `slugError` - Slug validation error
- `handleChange` - Generic input change handler
- `handleSlugChange` - Slug-specific handler with auto-sanitization
- `loadFromMovie` - Initialize form from Movie object
- `updateFromSync` - Update form after TMDB sync (preserves Lao content)

**Benefits**:
- Centralizes form logic
- Type-safe with `MovieFormData` interface
- Reusable validation logic

#### 2. `useChangeDetection.ts` (115 lines)
**Purpose**: Tracks modifications to detect unsaved changes

**Exports**:
- `hasChanges` - Boolean flag for unsaved changes
- `updateOriginals` - Reset change tracking after save

**Tracks**:
- Form data changes
- Cast/crew translation edits
- External platform modifications
- Trailer updates
- Availability status changes

**Benefits**:
- Prevents accidental data loss
- Clear separation of change tracking logic
- Easy to extend for new fields

#### 3. `useTMDBSync.ts` (135 lines)
**Purpose**: Handles TMDB synchronization workflow

**Exports**:
- `syncing` - Loading state
- `syncError` - Error message
- `syncChanges` - List of detected changes
- `showSyncResultModal` - Modal visibility
- `handleSync` - Main sync function

**Features**:
- Fetches latest TMDB data
- Merges with existing movie (preserves Lao translations)
- Detects what changed (Title, Cast, Crew, Images, etc.)
- Updates cast/crew translations
- Shows user-friendly change summary

**Benefits**:
- Complex sync logic isolated
- Testable independently
- Clear error handling

## Phase 2: Feature Components (TODO)

### 2.1 CastCrewEditor Component (~400 lines)

**Location**: `components/admin/cast-crew-editor.tsx`

**Props**:
```typescript
interface CastCrewEditorProps {
  movie: Movie | null;
  castTranslations: CastTranslations;
  crewTranslations: CrewTranslations;
  onCastTranslationChange: (personId: number, field: 'character_en' | 'character_lo', value: string) => void;
  onCrewTranslationChange: (personId: number, department: string, field: 'job_en' | 'job_lo', value: string) => void;
  onAddCast: (personId: number, characterEn: string, characterLo: string) => Promise<void>;
  onAddCrew: (personId: number, department: string, jobEn: string, jobLo: string) => Promise<void>;
  onRemoveCast: (personId: number) => Promise<void>;
  onRemoveCrew: (personId: number, department: string) => Promise<void>;
}
```

**Features**:
- Cast list with inline editing
- Crew list grouped by department
- Add cast/crew dialogs with PersonSearch
- Remove buttons with confirmation
- Bilingual character/job editing
- Expandable crew sections

**Benefits**:
- Self-contained cast/crew management
- Reusable in other admin pages
- Easier to test UI interactions

### 2.2 ExternalPlatformsEditor Component (~100 lines)

**Location**: `components/admin/external-platforms-editor.tsx`

**Props**:
```typescript
interface ExternalPlatformsEditorProps {
  platforms: ExternalPlatform[];
  onChange: (platforms: ExternalPlatform[]) => void;
}
```

**Features**:
- Platform dropdown (Netflix, Prime, Disney+, etc.)
- URL input for each platform
- Add/remove platform buttons
- Validation for URLs

**Benefits**:
- Simple, focused component
- Easy to add new platforms
- Reusable for other content types

### 2.3 TrailersEditor Component (~150 lines)

**Location**: `components/admin/trailers-editor.tsx`

**Props**:
```typescript
interface TrailersEditorProps {
  trailers: Trailer[];
  onChange: (trailers: Trailer[]) => void;
}
```

**Features**:
- List of trailers with preview thumbnails
- Add trailer dialog (YouTube key input)
- Reorder trailers (drag-and-drop or up/down buttons)
- Remove trailer button
- Trailer metadata (name, language, official flag)

**Benefits**:
- Dedicated trailer management
- Can add video trailer support later
- Clear visual feedback

### 2.4 AvailabilityStatusSelector Component (~50 lines)

**Location**: `components/admin/availability-status-selector.tsx`

**Props**:
```typescript
interface AvailabilityStatusSelectorProps {
  value: 'auto' | 'available' | 'external' | 'unavailable' | 'coming_soon';
  onChange: (value: string) => void;
}
```

**Features**:
- Radio buttons or dropdown
- Descriptions for each status
- Auto-detection explanation

**Benefits**:
- Simple, reusable selector
- Clear UX for status meaning

## Phase 3: Utility Components (TODO)

### 3.1 MovieFormFields Component (~200 lines)

**Location**: `components/admin/movie-form-fields.tsx`

**Purpose**: Basic movie metadata fields (title, overview, dates, etc.)

**Props**:
```typescript
interface MovieFormFieldsProps {
  formData: MovieFormData;
  slugError: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSlugChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
```

**Sections**:
- Titles (EN/LO)
- Overviews (EN/LO)
- Taglines (EN/LO)
- Slug (with validation)
- Dates (release, etc.)
- Ratings and runtime
- Budget/revenue
- IMDB ID, homepage

**Benefits**:
- Organized form layout
- Consistent styling
- Easy to add new fields

### 3.2 SyncResultModal Component (~80 lines)

**Location**: `components/admin/sync-result-modal.tsx`

**Purpose**: Show TMDB sync results

**Props**:
```typescript
interface SyncResultModalProps {
  open: boolean;
  changes: string[];
  onClose: () => void;
}
```

**Features**:
- List of detected changes
- Success/warning styling
- Close button

### 3.3 SuccessModal Component (~50 lines)

**Location**: `components/admin/success-modal.tsx`

**Purpose**: Generic success confirmation

**Props**:
```typescript
interface SuccessModalProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}
```

## Phase 4: Refactored Main Page (TODO)

### New Structure (~300-400 lines)

```typescript
export default function EditMoviePage() {
  // Hooks
  const { formData, slugError, handleChange, handleSlugChange, loadFromMovie, updateFromSync } = useMovieForm();
  const { hasChanges, updateOriginals } = useChangeDetection(...);
  const { syncing, syncError, syncChanges, showSyncResultModal, handleSync } = useTMDBSync();
  
  // Local state (minimal)
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [castTranslations, setCastTranslations] = useState<CastTranslations>({});
  const [crewTranslations, setCrewTranslations] = useState<CrewTranslations>({});
  const [externalPlatforms, setExternalPlatforms] = useState<ExternalPlatform[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState('auto');
  
  // Load movie on mount
  useEffect(() => { /* ... */ }, [movieId]);
  
  // Handlers
  const handleSave = async () => { /* ... */ };
  const handleSyncClick = () => handleSync(currentMovie, (syncedData, castTrans, crewTrans) => {
    updateFromSync(syncedData);
    setCastTranslations(castTrans);
    setCrewTranslations(crewTrans);
    setTrailers(syncedData.trailers || []);
  });
  
  // Render
  return (
    <div>
      <Header />
      
      <Tabs>
        <TabsContent value="basic">
          <MovieFormFields 
            formData={formData}
            slugError={slugError}
            onChange={handleChange}
            onSlugChange={handleSlugChange}
          />
        </TabsContent>
        
        <TabsContent value="cast-crew">
          <CastCrewEditor
            movie={currentMovie}
            castTranslations={castTranslations}
            crewTranslations={crewTranslations}
            onCastTranslationChange={...}
            onCrewTranslationChange={...}
            onAddCast={...}
            onAddCrew={...}
            onRemoveCast={...}
            onRemoveCrew={...}
          />
        </TabsContent>
        
        <TabsContent value="media">
          <PosterManager movie={currentMovie} />
          <TrailersEditor trailers={trailers} onChange={setTrailers} />
        </TabsContent>
        
        <TabsContent value="distribution">
          <ExternalPlatformsEditor platforms={externalPlatforms} onChange={setExternalPlatforms} />
          <AvailabilityStatusSelector value={availabilityStatus} onChange={setAvailabilityStatus} />
        </TabsContent>
      </Tabs>
      
      <SaveButton onClick={handleSave} hasChanges={hasChanges} />
      
      <SyncResultModal open={showSyncResultModal} changes={syncChanges} onClose={...} />
    </div>
  );
}
```

## Implementation Checklist

### Phase 1: Hooks ✅
- [x] Create `useMovieForm` hook
- [x] Create `useChangeDetection` hook
- [x] Create `useTMDBSync` hook
- [x] Test hooks compile without errors

### Phase 2: Components
- [ ] Extract `CastCrewEditor` component
- [ ] Extract `ExternalPlatformsEditor` component
- [ ] Extract `TrailersEditor` component
- [ ] Extract `AvailabilityStatusSelector` component
- [ ] Extract `MovieFormFields` component
- [ ] Extract `SyncResultModal` component
- [ ] Extract `SuccessModal` component

### Phase 3: Integration
- [ ] Refactor main page to use hooks
- [ ] Integrate all extracted components
- [ ] Remove duplicate code
- [ ] Update imports

### Phase 4: Testing
- [ ] Test form submission
- [ ] Test TMDB sync workflow
- [ ] Test cast/crew add/remove
- [ ] Test trailer management
- [ ] Test external platforms
- [ ] Test change detection
- [ ] Test all modals

### Phase 5: Cleanup
- [ ] Remove commented code
- [ ] Update documentation
- [ ] Add JSDoc comments
- [ ] Run linter and fix issues

## Expected Results

### Before
- **1 file**: 1,927 lines
- **Maintainability**: Low
- **Testability**: Difficult
- **Reusability**: None

### After
- **Main page**: ~300-400 lines
- **3 hooks**: ~400 lines total
- **7 components**: ~1,000 lines total
- **Total**: ~1,700 lines (13% reduction + better organization)

### Benefits
- ✅ **Easier to maintain** - Each file has single responsibility
- ✅ **Easier to test** - Hooks and components testable independently
- ✅ **Reusable** - Components can be used in other admin pages
- ✅ **Better DX** - Developers can find and modify code faster
- ✅ **Type-safe** - Clear interfaces between components

## Migration Strategy

**Recommended Approach**: Incremental migration

1. **Keep old page working** - Don't break production
2. **Extract one component at a time** - Test after each extraction
3. **Use feature flags if needed** - Toggle between old/new implementation
4. **Gradual rollout** - Deploy hooks first, then components

**Timeline Estimate**:
- Phase 1 (Hooks): ✅ 1 hour (DONE)
- Phase 2 (Components): ~3-4 hours
- Phase 3 (Integration): ~2 hours
- Phase 4 (Testing): ~2 hours
- Phase 5 (Cleanup): ~1 hour

**Total**: ~8-10 hours of focused work

## Next Steps

1. Review this plan and adjust priorities
2. Start with Phase 2: Extract one component (recommend `ExternalPlatformsEditor` as it's simplest)
3. Test extracted component works correctly
4. Continue with remaining components
5. Integrate all pieces in Phase 3

## Related Files

- ✅ `hooks/useMovieForm.ts` - Form state management
- ✅ `hooks/useChangeDetection.ts` - Change tracking
- ✅ `hooks/useTMDBSync.ts` - TMDB synchronization
- 🔲 `components/admin/cast-crew-editor.tsx` - To be created
- 🔲 `components/admin/external-platforms-editor.tsx` - To be created
- 🔲 `components/admin/trailers-editor.tsx` - To be created
- 🔲 `components/admin/movie-form-fields.tsx` - To be created
- 🔲 `components/admin/sync-result-modal.tsx` - To be created
- 🔲 `components/admin/success-modal.tsx` - To be created
