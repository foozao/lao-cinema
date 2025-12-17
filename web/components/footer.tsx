import { useTranslations } from 'next-intl';

interface FooterProps {
  variant?: 'light' | 'dark';
  minimal?: boolean;
}

export function Footer({ variant = 'light', minimal = false }: FooterProps) {
  const t = useTranslations('footer');

  const isDark = variant === 'dark';

  return (
    <footer className={`border-t mt-16 ${
      isDark 
        ? 'border-gray-800 bg-black' 
        : 'border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800'
    }`}>
      <div className="container mx-auto px-4 py-8">
        <div className={`text-center text-sm space-y-2 ${
          isDark 
            ? 'text-gray-400' 
            : 'text-gray-600 dark:text-gray-400'
        }`}>
          <p>{t('copyright')}</p>
          {!minimal && (
            <p className="text-xs">
              {t('tmdbPrefix')}{' '}
              <a 
                href="https://www.themoviedb.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className={isDark 
                  ? 'text-blue-400 hover:text-blue-300 hover:underline' 
                  : 'text-blue-600 dark:text-blue-400 hover:underline'
                }
              >
                TMDB
              </a>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
