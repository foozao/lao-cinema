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

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className={`gap-1.5 ${hoverClass}`}
      aria-label={t('switchLanguage')}
    >
      <span className={`font-medium ${textColor}`}>
        ລາວ
      </span>
      <span className={separatorColor}>/</span>
      <span className={`font-medium ${textColor}`}>
        English
      </span>
    </Button>
  );
}
