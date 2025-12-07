import { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { RegisterForm } from '@/components/auth/register-form';
import { Footer } from '@/components/footer';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  
  return {
    title: t('register.title'),
    description: t('register.description'),
  };
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Create Account
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Join Lao Cinema to sync your rentals across devices
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
                Already have an account?
              </span>
            </div>
          </div>
          
          {/* Login Link */}
          <Link href="/login">
            <button className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Sign In
            </button>
          </Link>
          
          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to Home
            </Link>
          </div>
        </div>
        
        {/* Benefits */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-900 mb-2">
            Benefits of creating an account:
          </p>
          <ul className="text-sm text-green-800 space-y-1 ml-4 list-disc">
            <li>Access your rentals from any device</li>
            <li>Continue watching from where you left off</li>
            <li>Keep track of your watch history</li>
            <li>Get personalized recommendations (coming soon)</li>
          </ul>
        </div>
        
        {/* Privacy Note */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
      </div>
      
      <Footer />
    </div>
  );
}
