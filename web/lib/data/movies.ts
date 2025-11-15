import { Movie, Genre } from '../types';
import { createLocalizedText } from '../i18n';

// Sample genres
export const genres: Genre[] = [
  { id: 1, name: createLocalizedText('Drama', 'ລະຄອນ') },
  { id: 2, name: createLocalizedText('Romance', 'ຄວາມຮັກ') },
  { id: 3, name: createLocalizedText('Comedy', 'ຕະຫຼົກ') },
  { id: 4, name: createLocalizedText('Action', 'ບູຮານ') },
  { id: 5, name: createLocalizedText('Documentary', 'ສາລະຄະດີ') },
];

// Sample movie data
export const sampleMovie: Movie = {
  id: '1',
  tmdb_id: undefined, // Add a TMDB ID here to enable sync (e.g., 550 for Fight Club)
  imdb_id: undefined,
  tmdb_last_synced: undefined,
  tmdb_sync_enabled: false,
  
  // Localized fields
  title: createLocalizedText('Sample Lao Film', 'ຮູບເງົາລາວ'),
  overview: createLocalizedText(
    'A beautiful story set in Laos, showcasing the rich culture and traditions of the Lao people.',
    'ເລື່ອງລາວທີ່ງົດງາມ, ສະແດງໃຫ້ເຫັນວັດທະນະທໍາ ແລະ ປະເພນີອັນອຸດົມສົມບູນຂອງຊາວລາວ.'
  ),
  tagline: createLocalizedText(
    'A journey through the heart of Laos',
    'ການເດີນທາງຜ່ານຫົວໃຈຂອງລາວ'
  ),
  
  original_title: 'Sample Lao Film',
  original_language: 'lo',
  
  // Media
  poster_path: undefined, // Add your poster image to /public and update this path
  backdrop_path: undefined, // Add your backdrop image to /public and update this path
  
  // Details
  release_date: '2024-01-01',
  runtime: 120,
  vote_average: 8.5,
  vote_count: 100,
  popularity: 75.5,
  adult: false,
  video: true,
  
  // Production details
  budget: 500000, // $500k USD
  revenue: 1200000, // $1.2M USD
  status: 'Released',
  homepage: undefined,
  belongs_to_collection: null,
  
  // Video sources - placeholder for now
  video_sources: [
    {
      id: 'vs1',
      quality: 'original',
      format: 'mp4',
      url: '/sample-video.mp4', // Will be replaced with actual video
      size_bytes: 1024 * 1024 * 500, // 500MB placeholder
    },
  ],
  
  // Relationships
  genres: [genres[0], genres[1]], // Drama, Romance
  production_companies: [
    {
      id: 1,
      name: 'Lao Cinema Productions',
      logo_path: undefined,
      origin_country: 'LA',
    },
  ],
  production_countries: [
    {
      iso_3166_1: 'LA',
      name: 'Laos',
    },
  ],
  spoken_languages: [
    {
      iso_639_1: 'lo',
      english_name: 'Lao',
      name: 'ພາສາລາວ',
    },
    {
      iso_639_1: 'en',
      english_name: 'English',
      name: 'English',
    },
  ],
  cast: [
    {
      id: 1,
      name: createLocalizedText('Actor Name', 'ຊື່ນັກສະແດງ'),
      character: createLocalizedText('Main Character', 'ຕົວລະຄອນຫຼັກ'),
      profile_path: undefined,
      order: 1,
    },
  ],
  crew: [
    {
      id: 1,
      name: createLocalizedText('Director Name', 'ຊື່ຜູ້ກໍາກັບ'),
      job: createLocalizedText('Director', 'ຜູ້ກໍາກັບ'),
      department: 'Directing',
      profile_path: undefined,
    },
  ],
  
  // Metadata
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Export all movies (for now just one)
export const movies: Movie[] = [sampleMovie];
