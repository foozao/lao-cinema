import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t bg-white dark:bg-gray-900 mt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400 text-sm space-y-2">
          <p>{t('copyright')}</p>
          <p className="text-xs">{t('tmdbDisclaimer')}</p>
        </div>
      </div>
    </footer>
  );
}
