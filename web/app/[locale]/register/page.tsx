import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RegisterPageContent } from './register-content';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  
  return {
    title: t('register.title'),
    description: t('register.description'),
  };
}

export default function RegisterPage() {
  return <RegisterPageContent />;
}
