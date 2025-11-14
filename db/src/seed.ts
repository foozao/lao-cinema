import { db } from './db.js';
import { 
  movies, 
  movieTranslations,
  genres, 
  genreTranslations,
  movieGenres, 
  cast, 
  castTranslations,
  crew, 
  crewTranslations,
  videoSources 
} from './schema.js';

async function seed() {
  console.log('Seeding database...');

  // Insert genres
  console.log('Inserting genres...');
  await db.insert(genres).values([
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
    { id: 5 },
  ]).onConflictDoNothing();

  // Insert genre translations
  console.log('Inserting genre translations...');
  await db.insert(genreTranslations).values([
    // Drama
    { genreId: 1, language: 'en', name: 'Drama' },
    { genreId: 1, language: 'lo', name: 'ລະຄອນ' },
    // Romance
    { genreId: 2, language: 'en', name: 'Romance' },
    { genreId: 2, language: 'lo', name: 'ຄວາມຮັກ' },
    // Comedy
    { genreId: 3, language: 'en', name: 'Comedy' },
    { genreId: 3, language: 'lo', name: 'ຕະຫຼົກ' },
    // Action
    { genreId: 4, language: 'en', name: 'Action' },
    { genreId: 4, language: 'lo', name: 'ບູຮານ' },
    // Documentary
    { genreId: 5, language: 'en', name: 'Documentary' },
    { genreId: 5, language: 'lo', name: 'ສາລະຄະດີ' },
  ]).onConflictDoNothing();

  // Insert sample movie
  console.log('Inserting sample movie...');
  const [movie] = await db.insert(movies).values({
    originalTitle: 'Sample Lao Film',
    posterPath: undefined,
    backdropPath: undefined,
    releaseDate: '2024-01-01',
    runtime: 120,
    voteAverage: 8.5,
    voteCount: 100,
    popularity: 75.5,
    adult: false,
  }).returning();

  // Insert movie translations
  console.log('Inserting movie translations...');
  await db.insert(movieTranslations).values([
    {
      movieId: movie.id,
      language: 'en',
      title: 'Sample Lao Film',
      overview: 'A beautiful story set in Laos, showcasing the rich culture and traditions of the Lao people.',
    },
    {
      movieId: movie.id,
      language: 'lo',
      title: 'ຮູບເງົາລາວ',
      overview: 'ເລື່ອງລາວທີ່ງົດງາມ, ສະແດງໃຫ້ເຫັນວັດທະນະທໍາ ແລະ ປະເພນີອັນອຸດົມສົມບູນຂອງຊາວລາວ.',
    },
  ]);

  // Link genres to movie
  console.log('Linking genres to movie...');
  await db.insert(movieGenres).values([
    { movieId: movie.id, genreId: 1 }, // Drama
    { movieId: movie.id, genreId: 2 }, // Romance
  ]);

  // Insert cast
  console.log('Inserting cast...');
  const [castMember] = await db.insert(cast).values({
    movieId: movie.id,
    profilePath: undefined,
    order: 1,
  }).returning();

  // Insert cast translations
  console.log('Inserting cast translations...');
  await db.insert(castTranslations).values([
    {
      castId: castMember.id,
      language: 'en',
      name: 'Actor Name',
      character: 'Main Character',
    },
    {
      castId: castMember.id,
      language: 'lo',
      name: 'ຊື່ນັກສະແດງ',
      character: 'ຕົວລະຄອນຫຼັກ',
    },
  ]);

  // Insert crew
  console.log('Inserting crew...');
  const [crewMember] = await db.insert(crew).values({
    movieId: movie.id,
    department: 'Directing',
    profilePath: undefined,
  }).returning();

  // Insert crew translations
  console.log('Inserting crew translations...');
  await db.insert(crewTranslations).values([
    {
      crewId: crewMember.id,
      language: 'en',
      name: 'Director Name',
      job: 'Director',
    },
    {
      crewId: crewMember.id,
      language: 'lo',
      name: 'ຊື່ຜູ້ກໍາກັບ',
      job: 'ຜູ້ກໍາກັບ',
    },
  ]);

  // Insert video source
  console.log('Inserting video source...');
  await db.insert(videoSources).values({
    movieId: movie.id,
    quality: 'original',
    format: 'mp4',
    url: '/sample-video.mp4',
    sizeBytes: 1024 * 1024 * 500, // 500MB
  });

  console.log('Seeding completed!');
  console.log(`Created movie with ID: ${movie.id}`);
}

seed()
  .catch((err) => {
    console.error('Seeding failed!');
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
