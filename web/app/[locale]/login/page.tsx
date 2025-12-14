import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginPageContent } from './login-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  
  return {
    title: t('login.title'),
    description: t('login.description'),
  };
}

export default function LoginPage() {
  return <LoginPageContent />;
}
