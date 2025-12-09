'use client';

import { useState } from 'react';
import { Play, X } from 'lucide-react';
import { Button } from './ui/button';

interface TrailerPlayerProps {
  youtubeKey: string;
  title: string;
  className?: string;
}

export function TrailerPlayer({ youtubeKey, title, className = '' }: TrailerPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleClose = () => {
    setIsPlaying(false);
  };

  return (
    <>
      {/* Trailer Thumbnail/Button */}
      {!isPlaying && (
        <button
          onClick={handlePlay}
          className={`relative group overflow-hidden rounded-lg bg-gray-900 ${className}`}
        >
          {/* YouTube Thumbnail */}
          <img
            src={`https://img.youtube.com/vi/${youtubeKey}/maxresdefault.jpg`}
            alt={`${title} - Trailer`}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={(e) => {
              // Fallback to standard quality if maxres not available
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
      )}

      {/* Fullscreen Video Player */}
      {isPlaying && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            aria-label="Close trailer"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* YouTube iframe */}
          <div className="w-full h-full max-w-7xl max-h-[90vh] aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </>
  );
}
