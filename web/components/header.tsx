import { Film } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/language-switcher';
import { UserMenu } from '@/components/auth/user-menu';

interface HeaderProps {
  variant?: 'light' | 'dark';
  fullWidth?: boolean; // Use full width instead of container
}

export function Header({ variant = 'light', fullWidth = false }: HeaderProps) {
  const t = useTranslations();

  const bgClass = variant === 'dark' 
    ? 'bg-black/50 border-gray-800' 
    : 'bg-white/80 border-gray-200 dark:bg-gray-900/80 dark:border-gray-800';

  const textClass = variant === 'dark'
    ? 'text-white'
    : 'text-gray-900 dark:text-white';

  return (
    <header className={`border-b backdrop-blur-sm sticky top-0 z-50 ${bgClass}`}>
      <div className={fullWidth ? "px-4 py-4" : "container mx-auto px-4 py-4"}>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Film className="w-8 h-8 text-red-600" />
            <h1 className={`text-2xl font-bold ${textClass}`}>
              {t('home.title')}
            </h1>
          </Link>
          <div className="flex items-center gap-4">
            <UserMenu />
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
