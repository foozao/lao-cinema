'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Film, Users } from 'lucide-react';

interface SubHeaderProps {
  variant?: 'light' | 'dark';
}

export function SubHeader({ variant = 'light' }: SubHeaderProps) {
  const t = useTranslations();

  const bgClass = variant === 'dark' 
    ? 'bg-gray-900 border-gray-800' 
    : 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700';

  const textClass = variant === 'dark'
    ? 'text-gray-300 hover:text-white'
    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';

  return (
    <nav className={`border-b ${bgClass}`}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-6">
          <Link 
            href="/movies" 
            className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${textClass}`}
          >
            <Film className="w-4 h-4" />
            {t('home.browseAll')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
