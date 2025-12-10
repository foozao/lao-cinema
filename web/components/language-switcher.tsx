'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { Button } from './ui/button';

export function LanguageSwitcher() {
  const t = useTranslations('language');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'lo' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="gap-1.5"
      aria-label={t('switchLanguage')}
    >
      <span className={`font-medium transition-colors ${locale === 'lo' ? 'text-gray-900' : 'text-gray-400'}`}>
        ລາວ
      </span>
      <span className="text-gray-400">/</span>
      <span className={`font-medium transition-colors ${locale === 'en' ? 'text-gray-900' : 'text-gray-400'}`}>
        English
      </span>
    </Button>
  );
}
