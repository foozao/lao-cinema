'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { RegisterForm } from '@/components/auth/register-form';
import { Footer } from '@/components/footer';

export function RegisterPageContent() {
  const t = useTranslations('auth.register');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('heading')}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {t('subtitle')}
            </p>
          </div>
          
          {/* Register Form */}
          <RegisterForm />
          
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                {t('hasAccount')}
              </span>
            </div>
          </div>
          
          {/* Login Link */}
          <Link href="/login">
            <button className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              {t('signIn')}
            </button>
          </Link>
          
          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← {t('backToHome')}
            </Link>
          </div>
        </div>
        
        {/* Benefits */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-900 mb-2">
            {t('benefitsTitle')}
          </p>
          <ul className="text-sm text-green-800 space-y-1 ml-4 list-disc">
            <li>{t('benefit1')}</li>
            <li>{t('benefit2')}</li>
            <li>{t('benefit3')}</li>
            <li>{t('benefit4')}</li>
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
      
      <Footer />
    </div>
  );
}
