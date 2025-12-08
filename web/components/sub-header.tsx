'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Film, Search } from 'lucide-react';

interface SubHeaderProps {
  variant?: 'light' | 'dark';
}

export function SubHeader({ variant = 'light' }: SubHeaderProps) {
  const t = useTranslations();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const bgClass = variant === 'dark' 
    ? 'bg-gray-900 border-gray-800' 
    : 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700';

  const textClass = variant === 'dark'
    ? 'text-gray-300 hover:text-white'
    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';

  const inputBgClass = variant === 'dark'
    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400';

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/movies?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className={`border-b ${bgClass}`}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-4 md:gap-6">
          <Link 
            href="/movies" 
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors whitespace-nowrap ${textClass}`}
          >
            <Film className="w-4 h-4" />
            <span className="hidden sm:inline">{t('home.browseAll')}</span>
            <span className="sm:hidden">{t('nav.movies')}</span>
          </Link>
          
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('subheader.searchPlaceholder')}
                className={`w-full pl-10 pr-4 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${inputBgClass}`}
              />
            </div>
          </form>
        </div>
      </div>
    </nav>
  );
}
