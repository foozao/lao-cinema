'use client';

import { useState } from 'react';
import { Play, X } from 'lucide-react';

interface TrailerPlayerProps {
  youtubeKey: string;
  title: string;
  className?: string;
}

export function TrailerPlayer({ youtubeKey, title, className = '' }: TrailerPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!isPlaying) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-gray-900 ${className}`}>
        <button
          onClick={() => setIsPlaying(true)}
          className="relative group overflow-hidden w-full h-full"
        >
          {/* YouTube Thumbnail */}
          <img
            src={`https://img.youtube.com/vi/${youtubeKey}/maxresdefault.jpg`}
            alt={`${title} - Trailer`}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = `https://img.youtube.com/vi/${youtubeKey}/hqdefault.jpg`;
            }}
          />
          
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
          
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 group-hover:bg-red-700 flex items-center justify-center transition-all group-hover:scale-110 shadow-xl">
              <Play className="w-8 h-8 md:w-10 md:h-10 fill-white text-white ml-1" />
            </div>
          </div>
          
          {/* Trailer label */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white font-semibold text-sm md:text-base">
              {title}
            </p>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Close button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setIsPlaying(false)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gray-800 hover:bg-gray-700 transition-colors text-sm text-white"
          aria-label="Close trailer"
        >
          <X className="w-4 h-4" />
          <span>Close</span>
        </button>
      </div>

      {/* YouTube iframe - responsive 16:9 embed */}
      <div className="relative w-full h-0 pb-[56.25%] bg-black rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&mute=1&rel=0&modestbranding=1&fs=1&iv_load_policy=3&disablekb=1`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute top-0 left-0 w-full h-full border-0"
        />
      </div>
    </div>
  );
}
