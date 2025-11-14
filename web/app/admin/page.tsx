import Link from 'next/link';
import { movies } from '@/lib/data/movies';
import { getLocalizedText } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';

export default function AdminPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-gray-900">All Movies</h2>
        <Link href="/admin/add">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add New Movie
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {movies.map((movie) => (
          <Card key={movie.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {getLocalizedText(movie.title, 'lo')}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {getLocalizedText(movie.title, 'en')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Release Date:</span>
                  <p className="font-medium">{movie.release_date}</p>
                </div>
                <div>
                  <span className="text-gray-600">Runtime:</span>
                  <p className="font-medium">{movie.runtime} min</p>
                </div>
                <div>
                  <span className="text-gray-600">Rating:</span>
                  <p className="font-medium">{movie.vote_average}/10</p>
                </div>
                <div>
                  <span className="text-gray-600">Genres:</span>
                  <p className="font-medium">
                    {movie.genres.map((g) => getLocalizedText(g.name, 'en')).join(', ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
