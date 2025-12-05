import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Film } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Film className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">
                {t('home.title')} {t('admin.dashboard')}
              </h1>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content */}
        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}
