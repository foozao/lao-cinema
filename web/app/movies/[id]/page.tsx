import { notFound } from 'next/navigation';
import Link from 'next/link';
import { movies } from '@/lib/data/movies';
import { getLocalizedText } from '@/lib/i18n';
import { VideoPlayer } from '@/components/video-player';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, Star, Users } from 'lucide-react';

interface MoviePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;
  const movie = movies.find((m) => m.id === id);

  if (!movie) {
    notFound();
  }

  // Get the primary video source (prefer HLS, fallback to MP4)
  const videoSource =
    movie.video_sources.find((vs) => vs.format === 'hls') ||
    movie.video_sources[0];

  // Default to Lao language
  const language = 'lo';
  const title = getLocalizedText(movie.title, language);
  const titleEn = getLocalizedText(movie.title, 'en');
  const overview = getLocalizedText(movie.overview, language);
  const overviewEn = getLocalizedText(movie.overview, 'en');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Video Player */}
        <section className="mb-8">
          <VideoPlayer
            src={videoSource.url}
            poster={movie.backdrop_path || movie.poster_path}
            title={title}
          />
        </section>

        {/* Movie Info */}
        <section className="grid md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2">
            <h1 className="text-4xl font-bold mb-2">{title}</h1>
            <h2 className="text-xl text-gray-400 mb-4">{titleEn}</h2>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
              {movie.release_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{new Date(movie.release_date).getFullYear()}</span>
                </div>
              )}
              {movie.runtime && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{movie.runtime} minutes</span>
                </div>
              )}
              {movie.vote_average && (
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span>{movie.vote_average.toFixed(1)}/10</span>
                </div>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-6">
              {movie.genres.map((genre) => (
                <Badge key={genre.id} variant="secondary" className="text-sm">
                  {getLocalizedText(genre.name, language)} / {getLocalizedText(genre.name, 'en')}
                </Badge>
              ))}
            </div>

            {/* Overview */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">Overview</h3>
              <p className="text-gray-300 leading-relaxed mb-4">
                {overview}
              </p>
              <p className="text-gray-400 leading-relaxed text-sm">
                {overviewEn}
              </p>
            </div>

            {/* Cast */}
            {movie.cast.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Cast
                </h3>
                <div className="space-y-3">
                  {movie.cast.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {getLocalizedText(member.name, language)}
                        </p>
                        <p className="text-sm text-gray-400">
                          as {getLocalizedText(member.character, language)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Crew */}
            {movie.crew.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-3">Crew</h3>
                <div className="grid grid-cols-2 gap-4">
                  {movie.crew.map((member) => (
                    <div key={member.id} className="p-3 bg-gray-800/50 rounded-lg">
                      <p className="font-medium">
                        {getLocalizedText(member.name, language)}
                      </p>
                      <p className="text-sm text-gray-400">
                        {getLocalizedText(member.job, language)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="md:col-span-1">
            {/* Poster */}
            {movie.poster_path && (
              <div className="aspect-[2/3] relative rounded-lg overflow-hidden mb-6 bg-gray-800">
                <img
                  src={movie.poster_path}
                  alt={title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Additional Info */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-sm text-gray-400 mb-1">Original Title</p>
                <p className="font-medium">{movie.original_title || titleEn}</p>
              </div>
              {movie.vote_count && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Votes</p>
                  <p className="font-medium">{movie.vote_count.toLocaleString()}</p>
                </div>
              )}
              {movie.popularity && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Popularity</p>
                  <p className="font-medium">{movie.popularity.toFixed(1)}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
