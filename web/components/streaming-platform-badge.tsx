'use client';

import { ExternalLink } from 'lucide-react';
import type { StreamingPlatform, ExternalPlatform } from '@/lib/types';

// Platform display configuration
const platformConfig: Record<StreamingPlatform, { name: string; color: string; bgColor: string }> = {
  netflix: { name: 'Netflix', color: 'text-white', bgColor: 'bg-[#E50914]' },
  prime: { name: 'Prime Video', color: 'text-white', bgColor: 'bg-[#00A8E1]' },
  disney: { name: 'Disney+', color: 'text-white', bgColor: 'bg-[#113CCF]' },
  hbo: { name: 'Max', color: 'text-white', bgColor: 'bg-[#5822B4]' },
  apple: { name: 'Apple TV+', color: 'text-white', bgColor: 'bg-black' },
  hulu: { name: 'Hulu', color: 'text-white', bgColor: 'bg-[#1CE783]' },
  other: { name: 'Other', color: 'text-white', bgColor: 'bg-gray-600' },
};

interface StreamingPlatformBadgeProps {
  platform: ExternalPlatform;
  size?: 'sm' | 'md' | 'lg';
}

export function StreamingPlatformBadge({ platform, size = 'md' }: StreamingPlatformBadgeProps) {
  const config = platformConfig[platform.platform];
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const content = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bgColor} ${config.color} ${sizeClasses[size]}`}
    >
      {config.name}
      {platform.url && <ExternalLink className="w-3 h-3" />}
    </span>
  );

  if (platform.url) {
    return (
      <a
        href={platform.url}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        {content}
      </a>
    );
  }

  return content;
}

interface StreamingPlatformListProps {
  platforms: ExternalPlatform[];
  size?: 'sm' | 'md' | 'lg';
}

export function StreamingPlatformList({ platforms, size = 'md' }: StreamingPlatformListProps) {
  if (!platforms || platforms.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform, index) => (
        <StreamingPlatformBadge key={`${platform.platform}-${index}`} platform={platform} size={size} />
      ))}
    </div>
  );
}
