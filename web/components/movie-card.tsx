import Link from 'next/link';
import Image from 'next/image';
import { Movie } from '@/lib/types';
import { getLocalizedText } from '@/lib/i18n';
import { getPosterUrl } from '@/lib/images';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, Star } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  language?: 'en' | 'lo';
}

export function MovieCard({ movie, language = 'lo' }: MovieCardProps) {
  const title = getLocalizedText(movie.title, language);
  const titleEn = getLocalizedText(movie.title, 'en');
  const posterUrl = getPosterUrl(movie.poster_path, 'medium');
  
  return (
    <Link href={`/movies/${movie.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
        <div className="relative aspect-[2/3] overflow-hidden bg-gray-200">
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900">
              <span className="text-white text-4xl font-bold opacity-50">
                {title.charAt(0)}
              </span>
            </div>
          )}
          
          {/* Rating Badge */}
          {movie.vote_average && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-white text-xs font-semibold">
                {movie.vote_average.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">
            {title}
          </h3>
          <p className="text-sm text-gray-600 mb-2 line-clamp-1">
            {titleEn}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            {movie.release_date && (
              <span>{new Date(movie.release_date).getFullYear()}</span>
            )}
            {movie.runtime && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{movie.runtime} min</span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {movie.genres.slice(0, 2).map((genre) => (
              <Badge key={genre.id} variant="secondary" className="text-xs">
                {getLocalizedText(genre.name, language)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
