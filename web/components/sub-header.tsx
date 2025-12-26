'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Film, Users, Building2, Package } from 'lucide-react';

interface SubHeaderProps {
  variant?: 'light' | 'dark';
  activePage?: 'movies' | 'people' | 'production' | 'shorts';
}

export function SubHeader({ variant = 'light', activePage }: SubHeaderProps) {
  const t = useTranslations();

  const bgClass = variant === 'dark' 
    ? 'bg-black border-gray-800' 
    : 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700';

  const getTextClass = (page: 'movies' | 'people' | 'production' | 'shorts') => {
    if (activePage === page) {
      return variant === 'dark'
        ? 'text-white font-bold cursor-default'
        : 'text-gray-900 dark:text-white font-bold cursor-default';
    }
    return variant === 'dark'
      ? 'text-gray-200 hover:text-white'
      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';
  };

  const NavLink = ({ page, href, icon: Icon, children }: { 
    page: 'movies' | 'people' | 'production' | 'shorts';
    href: string;
    icon: typeof Film;
    children: React.ReactNode;
  }) => {
    const isActive = activePage === page;
    const className = `inline-flex items-center gap-2 text-base transition-colors whitespace-nowrap ${getTextClass(page)}`;
    
    if (isActive) {
      return (
        <span className={className}>
          <Icon className="w-4 h-4" />
          {children}
        </span>
      );
    }
    
    return (
      <Link href={href} className={className}>
        <Icon className="w-4 h-4" />
        {children}
      </Link>
    );
  };

  return (
    <nav className={`border-b sticky top-16 z-40 ${bgClass}`}>
      <div className="mx-auto px-3 py-2 max-w-[1600px]">
        <div className="flex items-center gap-4 md:gap-6 overflow-x-auto scrollbar-hide">
          <NavLink page="movies" href="/movies" icon={Film}>
            <span className="hidden md:inline">{t('nav.browse')} </span>
            <span>{t('nav.movies')}</span>
          </NavLink>
          <span className={`text-xs ${variant === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>•</span>
          <NavLink page="shorts" href="/short-packs" icon={Package}>
            <span className="hidden md:inline">{t('nav.browse')} </span>
            <span>{t('nav.shorts')}</span>
          </NavLink>
          <span className={`text-xs ${variant === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>•</span>
          <NavLink page="people" href="/people" icon={Users}>
            <span className="hidden md:inline">{t('nav.browse')} </span>
            <span>{t('nav.people')}</span>
          </NavLink>
          <span className={`text-xs ${variant === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>•</span>
          <NavLink page="production" href="/production" icon={Building2}>
            <span className="hidden md:inline">{t('nav.browse')} </span>
            <span>{t('nav.productionStudios')}</span>
          </NavLink>
        </div>
      </div>
    </nav>
  );
}
