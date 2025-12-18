'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, LucideIcon } from 'lucide-react';

type ColorVariant = 'blue' | 'purple' | 'green' | 'orange' | 'pink' | 'teal' | 'gray';

interface DashboardCardProps {
  href: string;
  icon: LucideIcon;
  color: ColorVariant;
  title: string;
  description: string;
  stat?: number | string;
  statLabel?: string;
  content?: string;
  loading?: boolean;
}

const colorClasses: Record<ColorVariant, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

export function DashboardCard({
  href,
  icon: Icon,
  color,
  title,
  description,
  stat,
  statLabel,
  content,
  loading = false,
}: DashboardCardProps) {
  const colors = colorClasses[color];

  return (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 ${colors.bg} rounded-lg`}>
                <Icon className={`w-6 h-6 ${colors.text}`} />
              </div>
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          {stat !== undefined ? (
            <>
              <div className="text-3xl font-bold text-gray-900">
                {loading ? '...' : stat}
              </div>
              {statLabel && (
                <p className="text-sm text-gray-600 mt-1">{statLabel}</p>
              )}
            </>
          ) : content ? (
            <p className="text-sm text-gray-600">{content}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
