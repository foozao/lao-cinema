'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { RegisterForm } from '@/components/auth/register-form';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export function RegisterPageContent() {
  const t = useTranslations('auth.register');

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Header variant="dark" minimal />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">
              {t('heading')}
            </h1>
          </div>
          
          {/* Register Form */}
          <RegisterForm />
          
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-zinc-900 text-zinc-400">
                {t('hasAccount')}
              </span>
            </div>
          </div>
          
          {/* Login Link */}
          <Link href="/login">
            <button className="w-full py-2 px-4 border border-zinc-600 rounded-md text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:border-zinc-500 transition-colors">
              {t('signIn')}
            </button>
          </Link>
        </div>
        
        {/* Benefits */}
        <div className="mt-6 bg-zinc-900/80 border border-zinc-700 rounded-lg p-4">
          <p className="text-sm font-semibold text-white mb-2">
            {t('benefitsTitle')}
          </p>
          <ul className="text-sm text-zinc-300 space-y-1 ml-4 list-disc">
            <li>{t('benefit1')}</li>
            <li>{t('benefit2')}</li>
            <li>{t('benefit3')}</li>
          </ul>
        </div>
        
        {/* Privacy Note */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            {t('termsNotice')}
          </p>
        </div>
      </div>
      </div>
      
      <Footer variant="dark" minimal />
    </div>
  );
}
