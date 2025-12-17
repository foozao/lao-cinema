'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Button } from './ui/button';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
}

export function LanguageSwitcher({ variant = 'light' }: LanguageSwitcherProps) {
  const t = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'lo' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  const textColor = variant === 'dark' ? 'text-gray-300' : 'text-gray-900';
  const separatorColor = variant === 'dark' ? 'text-gray-500' : 'text-gray-400';
  const hoverClass = variant === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100';

  // On mobile, show only the language you can switch TO
  const switchToLabel = locale === 'en' ? 'ລາວ' : 'English';

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className={`gap-1.5 ${hoverClass}`}
      aria-label={t('switchLanguage')}
      data-testid="language-toggle"
    >
      {/* Mobile: Show only the inactive language */}
      <span className={`md:hidden font-medium ${locale === 'en' ? 'text-lg leading-none' : ''} ${textColor}`}>
        {switchToLabel}
      </span>
      {/* Desktop: Show both languages */}
      <span className={`hidden md:inline font-medium text-lg leading-none ${textColor}`}>
        ລາວ
      </span>
      <span className={`hidden md:inline ${separatorColor}`}>/</span>
      <span className={`hidden md:inline font-medium ${textColor}`}>
        English
      </span>
    </Button>
  );
}
