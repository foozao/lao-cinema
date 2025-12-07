import { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { LoginForm } from '@/components/auth/login-form';
import { Footer } from '@/components/footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  
  return {
    title: t('login.title'),
    description: t('login.description'),
  };
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Sign in to your account to continue
            </p>
          </div>
          
          {/* Login Form */}
          <LoginForm />
          
          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Don't have an account?
              </span>
            </div>
          </div>
          
          {/* Register Link */}
          <Link href="/register">
            <button className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Create Account
            </button>
          </Link>
          
          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to Home
            </Link>
          </div>
        </div>
        
        {/* Anonymous User Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Don't want to sign up?</strong> You can still rent and watch movies without an account. 
            Your rentals will be saved on this device.
          </p>
        </div>
      </div>
      </div>
      
      <Footer />
    </div>
  );
}
