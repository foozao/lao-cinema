'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Film, Users, Building2 } from 'lucide-react';

interface SubHeaderProps {
  variant?: 'light' | 'dark';
  activePage?: 'movies' | 'people' | 'production';
}

export function SubHeader({ variant = 'light', activePage }: SubHeaderProps) {
  const t = useTranslations();

  const bgClass = variant === 'dark' 
    ? 'bg-black border-gray-800' 
    : 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700';

  const getTextClass = (page: 'movies' | 'people' | 'production') => {
    if (activePage === page) {
      return variant === 'dark'
        ? 'text-white font-bold cursor-default'
        : 'text-gray-900 dark:text-white font-bold cursor-default';
    }
    return variant === 'dark'
      ? 'text-gray-300 hover:text-white'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';
  };

  const NavItem = ({ page, href, icon: Icon, label }: { 
    page: 'movies' | 'people' | 'production';
    href: string;
    icon: typeof Film;
    label: string;
  }) => {
    const isActive = activePage === page;
    const className = `inline-flex items-center gap-2 text-sm transition-colors whitespace-nowrap ${getTextClass(page)}`;
    
    if (isActive) {
      return (
        <span className={className}>
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </span>
      );
    }
    
    return (
      <Link href={href} className={className}>
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav className={`border-b sticky top-16 z-40 ${bgClass}`}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center gap-6">
          <NavItem page="movies" href="/movies" icon={Film} label={t('nav.movies')} />
          <NavItem page="people" href="/people" icon={Users} label={t('nav.people')} />
          <NavItem page="production" href="/production" icon={Building2} label={t('nav.production')} />
        </div>
      </div>
    </nav>
  );
}
