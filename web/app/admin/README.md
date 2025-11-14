# Admin Panel

Simple admin interface for managing movies in the Lao Cinema platform.

## Features

- **Movie List**: View all movies with key details
- **Add New Movie**: Form to add new movies with bilingual support (English/Lao)
- **Edit/Delete**: Placeholder buttons for future functionality

## Usage

1. Navigate to `/admin` to see all movies
2. Click "Add New Movie" or go to `/admin/add` to add a new film
3. Fill out the form with both English and Lao content
4. Submit to save (currently logs to console - backend integration pending)

## Form Fields

### Required Fields
- **Title (English)**: Movie title in English
- **Overview (English)**: Movie description in English
- **Release Date**: Release date of the movie
- **Runtime**: Duration in minutes
- **Video URL**: Path to video file or HLS stream URL

### Optional Fields
- **Title (Lao)**: Movie title in Lao (ຊື່ຮູບເງົາເປັນພາສາລາວ)
- **Overview (Lao)**: Movie description in Lao
- **Original Title**: If different from English title
- **Rating**: 0-10 rating
- **Poster Path**: Path to poster image (upload to `/public/posters/`)
- **Backdrop Path**: Path to backdrop image (upload to `/public/backdrops/`)
- **Video Format**: MP4 or HLS
- **Video Quality**: Original, 1080p, 720p, or 480p

## Current Limitations

⚠️ **No Backend Yet**: This admin panel currently only logs data to the console. To persist data, you need to:

1. Set up the Fastify backend (see `STACK.md`)
2. Create API endpoints for CRUD operations
3. Update the form submission to call the API
4. Add authentication/authorization

## File Structure

```
/app/admin/
├── layout.tsx          # Admin layout with navigation
├── page.tsx            # Movie list page
├── add/
│   └── page.tsx        # Add new movie form
└── README.md           # This file
```

## Next Steps

- [ ] Implement backend API integration
- [ ] Add edit movie functionality
- [ ] Add delete movie functionality
- [ ] Add genre management
- [ ] Add cast/crew management
- [ ] Add image upload functionality
- [ ] Add video upload/transcoding
- [ ] Add authentication (admin login)
- [ ] Add form validation with Zod
- [ ] Add success/error notifications

## Development

The admin panel follows the same patterns as the rest of the app:
- Uses shadcn/ui components
- Supports bilingual content (English/Lao)
- TypeScript with proper types
- Responsive design
- Server Components where possible, Client Components for forms

## Security Note

⚠️ **Important**: Before deploying to production, you MUST add authentication to protect the admin routes. Anyone can currently access `/admin`.
