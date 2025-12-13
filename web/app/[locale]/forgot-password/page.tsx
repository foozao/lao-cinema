import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Footer } from '@/components/footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  
  return {
    title: t('forgotPassword.title'),
    description: t('forgotPassword.description'),
  };
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-md p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                Forgot Password
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>
            
            {/* Forgot Password Form */}
            <ForgotPasswordForm />
            
            {/* Back to Login */}
            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-800">
                ← Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
