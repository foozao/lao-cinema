import { Film } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { UserMenu } from '@/components/auth/user-menu';

interface HeaderProps {
  variant?: 'light' | 'dark';
  fullWidth?: boolean; // Use full width instead of container
  minimal?: boolean; // Minimal version without user menu
}

export function Header({ variant = 'light', fullWidth = false, minimal = false }: HeaderProps) {
  const t = useTranslations();

  const bgClass = variant === 'dark' 
    ? 'bg-black border-gray-800' 
    : 'bg-white/80 border-gray-200 dark:bg-gray-900/80 dark:border-gray-800';

  const textClass = variant === 'dark'
    ? 'text-gray-400'
    : 'text-gray-900 dark:text-white';

  const logoClass = variant === 'dark'
    ? 'text-gray-600'
    : 'text-red-600';

  return (
    <header className={`border-b backdrop-blur-sm sticky top-0 z-50 h-16 ${bgClass} ${textClass}`}>
      <div className={fullWidth ? "px-3 h-full flex items-center" : "mx-auto px-3 h-full flex items-center max-w-[1600px]"}>
        <div className="flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Film className={`w-8 h-8 ${logoClass}`} />
            <h1 className="text-2xl font-bold">
              {t('home.title')}
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            {!minimal && <UserMenu variant={variant} />}
            <LanguageSwitcher variant={variant} />
          </div>
        </div>
      </div>
    </header>
  );
}
