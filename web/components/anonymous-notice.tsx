'use client';

interface AnonymousNoticeProps {
  message: string;
  signInMessage: string;
  variant?: 'info' | 'warning';
}

export function AnonymousNotice({
  message,
  signInMessage,
  variant = 'info',
}: AnonymousNoticeProps) {
  const variantClasses = {
    info: 'bg-blue-900/30 border-blue-700 text-blue-400',
    warning: 'bg-amber-900/30 border-amber-700 text-amber-400',
  };

  return (
    <div className={`mb-6 border rounded-lg p-4 ${variantClasses[variant]}`}>
      <p className="text-sm">
        <strong>{message}</strong> {signInMessage}
      </p>
    </div>
  );
}
