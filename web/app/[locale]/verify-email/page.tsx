'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/lib/config';

type VerificationState = 'loading' | 'success' | 'error' | 'invalid';

export default function VerifyEmailPage() {
  const t = useTranslations('auth.verifyEmail');
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [state, setState] = useState<VerificationState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-email?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        setState('success');
      } else {
        const data = await response.json();
        setErrorMessage(data.message || 'Verification failed');
        setState('error');
      }
    } catch (err) {
      setErrorMessage('Failed to verify email');
      setState('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header variant="light" />
      
      <div className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {state === 'loading' && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-gray-900">{t('verifying')}</h1>
              <p className="text-gray-600 mt-2">{t('pleaseWait')}</p>
            </div>
          )}

          {state === 'success' && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{t('success')}</h1>
              <p className="text-gray-600 mt-2">{t('successMessage')}</p>
              <Link href="/profile">
                <Button className="mt-6">{t('goToProfile')}</Button>
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{t('error')}</h1>
              <p className="text-gray-600 mt-2">{errorMessage || t('errorMessage')}</p>
              <Link href="/profile">
                <Button variant="outline" className="mt-6">{t('goToProfile')}</Button>
              </Link>
            </div>
          )}

          {state === 'invalid' && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">{t('invalidLink')}</h1>
              <p className="text-gray-600 mt-2">{t('invalidLinkMessage')}</p>
              <Link href="/profile">
                <Button variant="outline" className="mt-6">{t('goToProfile')}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
