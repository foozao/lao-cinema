---
description: Rename "Film Awards" to "Film Accolades" - terminology and URL changes
---

# Film Accolades Terminology Update

Rename "Film Awards" to "Film Accolades" to better encompass both competitive awards and festival appearances/recognition.

## Terminology Mapping

| Current | New |
|---------|-----|
| Film Awards | **Film Accolades** |
| Award Shows | **Accolade Events** |
| Award Show | **Accolade Event** |
| /awards | **/accolades** |
| Celebrating excellence in Lao cinema | **Celebrating excellence and recognition in Lao cinema** |

## Lao Translation

- **Accolades**: ການຍ້ອງຍໍ (kan nyong nyo) - means "recognition/praise/commendation"
- **Accolade Events**: ງານຍ້ອງຍໍ (ngan nyong nyo) - means "recognition events"

## Files to Update

### 1. Translation Files
- `web/messages/en.json` - Update admin.awards keys
- `web/messages/lo.json` - Update admin.awards keys with Lao translations

### 2. Page Renames (URL changes)
- `web/app/[locale]/admin/awards/` → `web/app/[locale]/admin/accolades/`
- `web/app/[locale]/dev/awards/` → `web/app/[locale]/dev/accolades/`

### 3. Component Updates
- `web/components/admin/admin-breadcrumbs.tsx` - Update breadcrumb labels and paths
- `web/app/[locale]/admin/page.tsx` - Update dashboard card link

### 4. Internal Code (NO changes needed)
- Database schema tables (`award_shows`, etc.) - Keep as-is
- API routes (`/api/award-shows`, etc.) - Keep as-is  
- API client functions (`awardsAPI`) - Keep as-is
- TypeScript types (`AwardShow`, etc.) - Keep as-is

## Implementation Steps

1. Update translation keys in en.json and lo.json
2. Rename admin/awards folder to admin/accolades
3. Rename dev/awards folder to dev/accolades
4. Update page content to use new terminology
5. Update admin dashboard card
6. Update breadcrumbs component
7. Test all pages in both languages
