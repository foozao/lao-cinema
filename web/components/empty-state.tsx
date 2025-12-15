'use client';

import { LucideIcon } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="bg-gray-900 rounded-lg shadow-sm p-12 text-center border border-gray-700">
      <Icon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
      <p className="text-gray-400 mb-4">{title}</p>
      <p className="text-sm text-gray-500 mb-6">{description}</p>
      {(actionLabel && actionHref) && (
        <Link href={actionHref}>
          <Button>
            <Icon className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        </Link>
      )}
      {(actionLabel && onAction) && (
        <Button onClick={onAction}>
          <Icon className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
