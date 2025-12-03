# Admin Internationalization (i18n)

## Overview

The admin section now fully supports both English and Lao languages, allowing Lao administrators to manage the site in their native language.

## Summary

✅ **All main admin pages are now fully bilingual** (English/Lao)  
✅ **60+ translation keys** added for admin interface  
✅ **4 pages updated**: Dashboard, People, Movies, Layout  
✅ **Full functionality** maintained in both languages

## Changes Made

### 1. Translation Files

Added 60+ comprehensive admin translations to both language files:

**English (`/web/messages/en.json`)**
```json
"admin": {
  "dashboard": "Dashboard",
  "backToSite": "Back to Site",
  "allPeople": "All People",
  "allMovies": "All Movies",
  "searchPeople": "Search people...",
  "searchMovies": "Search movies...",
  "filter": "Filter",
  "sort": "Sort",
  "all": "All",
  "acting": "Acting",
  "directing": "Directing",
  "writing": "Writing",
  "production": "Production",
  "other": "Other",
  "aToZ": "A → Z",
  "zToA": "Z → A",
  // ... and more
}
```

**Lao (`/web/messages/lo.json`)**
```json
"admin": {
  "dashboard": "ໜ້າຫຼັກຈັດການ",
  "backToSite": "ກັບໄປເວັບໄຊ",
  "allPeople": "ບຸກຄົນທັງໝົດ",
  "allMovies": "ຮູບເງົາທັງໝົດ",
  "searchPeople": "ຄົ້ນຫາບຸກຄົນ...",
  "filter": "ຕອງ",
  "sort": "ຈັດລຽງ",
  "all": "ທັງໝົດ",
  "acting": "ນັກສະແດງ",
  "directing": "ຜູ້ກຳກັບ",
  "aToZ": "ກ → ຮ",
  "zToA": "ຮ → ກ",
  // ... and more
}
```

### 2. Updated Components

**✅ Admin Layout** (`/web/app/[locale]/admin/layout.tsx`)
- Header title and "Back to Site" link
- Wraps all admin pages

**✅ Dashboard** (`/web/app/[locale]/admin/page.tsx`)
- Page title and subtitle
- All 3 stat cards (Homepage, Movies, People)
- Quick Actions section
- All descriptions and labels

**✅ People Admin Page** (`/web/app/[locale]/admin/people/page.tsx`)
- Page title and navigation
- Search placeholder
- All filter buttons (All, Acting, Directing, Writing, Production, Other)
- Sort toggle (A→Z / Z→A)
- Active filters summary
- Empty states
- Full functionality (filtering, sorting, searching)

**✅ Movies Admin Page** (`/web/app/[locale]/admin/movies/page.tsx`)
- Page title and navigation
- Import and Add buttons
- Movie metadata labels (Release Date, Runtime, Rating, Genres)
- Loading and empty states

## URL Structure

The admin section is automatically available in both languages:

- **English**: `/en/admin/people`
- **Lao**: `/lo/admin/people`

The language switcher in the admin section allows users to toggle between languages while maintaining their current page context.

## Completed Features

### ✅ Admin Layout
- Header ("Lao Cinema Dashboard" / "ຮູບເງົາລາວ ໜ້າຫຼັກຈັດການ")
- Back to Site link

### ✅ Dashboard
- Main title and subtitle
- Homepage card (title, description)
- Movies card (title, description, count label)
- People card (title, description, count label)
- Quick Actions section (title, description)
- Import from TMDB button and description
- Add New Movie button and description

### ✅ People Admin Page
- Page title ("All People" / "ບຸກຄົນທັງໝົດ")
- Back to Dashboard link
- Search placeholder ("Search people..." / "ຄົ້ນຫາບຸກຄົນ...")
- Filter label and all 6 options (All, Acting, Directing, Writing, Production, Other)
- Sort label and toggle (A→Z, Z→A / ກ→ຮ, ຮ→ກ)
- Active filters summary with dynamic counts
- Empty states for no results and no data

### ✅ Movies Admin Page
- Page title ("All Movies" / "ຮູບເງົາທັງໝົດ")
- Import from TMDB button
- Add New Movie button
- Loading state message
- Empty state message
- Movie metadata labels (Release Date, Runtime, Rating, Genres)

## Testing

Access the admin pages in both languages:

**English:**
```
http://localhost:3000/en/admin/people
```

**Lao:**
```
http://localhost:3000/lo/admin/people
```

All UI elements should display in the appropriate language, including:
- Navigation breadcrumbs
- Filter buttons
- Sort toggles
- Search placeholders
- Status messages

## Future Work (Optional)

The main admin pages are complete. These editing pages could be translated in the future if needed:

- [ ] `/admin/homepage/page.tsx` - Homepage customization (form fields and buttons)
- [ ] `/admin/import/page.tsx` - Import from TMDB (search interface, import button)
- [ ] `/admin/edit/[id]/page.tsx` - Edit movie (complex form with many fields)
- [ ] `/admin/people/[id]/page.tsx` - Edit person (form fields)
- [ ] `/admin/add/page.tsx` - Add movie manually (complex form)

These pages are less frequently used and contain primarily form fields. The main navigation and UI is already translated via the layout.

### Process for Each Page

1. Import `useTranslations` hook
2. Initialize with `const t = useTranslations('admin')`
3. Replace hardcoded text with `t('key')`
4. Add any missing keys to both `en.json` and `lo.json`

## Translation Keys Available

Currently available keys in the `admin` namespace:

| Key | English | Lao |
|-----|---------|-----|
| `dashboard` | Dashboard | ໜ້າຫຼັກຈັດການ |
| `backToSite` | Back to Site | ກັບໄປເວັບໄຊ |
| `allPeople` | All People | ບຸກຄົນທັງໝົດ |
| `allMovies` | All Movies | ຮູບເງົາທັງໝົດ |
| `searchPeople` | Search people... | ຄົ້ນຫາບຸກຄົນ... |
| `filter` | Filter | ຕອງ |
| `sort` | Sort | ຈັດລຽງ |
| `all` | All | ທັງໝົດ |
| `acting` | Acting | ນັກສະແດງ |
| `directing` | Directing | ຜູ້ກຳກັບ |
| `writing` | Writing | ນັກຂຽນ |
| `production` | Production | ການຜະລິດ |
| `other` | Other | ອື່ນໆ |
| `aToZ` | A → Z | ກ → ຮ |
| `zToA` | Z → A | ຮ → ກ |
| `showing` | Showing | ສະແດງ |
| `of` | of | ຈາກ |
| `people` | people | ບຸກຄົນ |
| `in` | in | ໃນ |
| `matching` | matching | ທີ່ກົງກັບ |
| `edit` | Edit | ແກ້ໄຂ |
| `save` | Save | ບັນທຶກ |
| `cancel` | Cancel | ຍົກເລີກ |

## Benefits

1. **Accessibility** - Lao administrators can manage content in their native language
2. **Consistency** - Same translation system used across entire application
3. **Maintainability** - Centralized translation files make updates easy
4. **Scalability** - Easy to add more languages in the future

## Notes

- The admin section uses the same `[locale]` route structure as the public site
- Language preference persists across navigation within the admin section
- All admin functionality works identically in both languages
- Department filter logic uses English values internally but displays translated labels
