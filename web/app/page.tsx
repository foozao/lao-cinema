import { MovieCard } from '@/components/movie-card';
import { movies } from '@/lib/data/movies';
import { Film } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Film className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Lao Cinema
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ຮູບເງົາລາວ
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
            Featured Films
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Discover amazing Lao cinema
          </p>
        </section>

        {/* Movie Grid */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </section>

        {/* Empty State (if no movies) */}
        {movies.length === 0 && (
          <div className="text-center py-20">
            <Film className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">
              No films available yet
            </h3>
            <p className="text-gray-500 dark:text-gray-500">
              Check back soon for new content
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white dark:bg-gray-900 mt-20">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© 2024 Lao Cinema. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
