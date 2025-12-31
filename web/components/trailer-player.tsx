'use client';

import { useState, useRef } from 'react';
import { Play, X } from 'lucide-react';
import type { Trailer } from '@/lib/types';

interface TrailerPlayerProps {
  trailer: Trailer;
  className?: string;
}

export function TrailerPlayer({ trailer, className = '' }: TrailerPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get thumbnail based on trailer type
  const getThumbnail = () => {
    if (trailer.type === 'youtube') {
      return `https://img.youtube.com/vi/${trailer.key}/maxresdefault.jpg`;
    }
    // For self-hosted video trailers, use the thumbnail_url field
    if (trailer.type === 'video' && trailer.thumbnail_url) {
      // Build full URL if it's not already a full URL
      if (trailer.thumbnail_url.startsWith('http')) {
        return trailer.thumbnail_url;
      }
      // Build from base URL - check environment
      const baseUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? 'https://storage.googleapis.com/lao-cinema-trailers'
        : 'http://localhost:3002';
      return `${baseUrl}/${trailer.thumbnail_url}`;
    }
    return null;
  };

  const thumbnail = getThumbnail();

  if (!isPlaying) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-gray-900 ${className}`}>
        <button
          onClick={() => setIsPlaying(true)}
          className="relative group overflow-hidden w-full h-full"
        >
          {/* Thumbnail */}
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={`${trailer.name} - Trailer`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                if (trailer.type === 'youtube') {
                  e.currentTarget.src = `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`;
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <Play className="w-20 h-20 text-white opacity-50" />
            </div>
          )}
          
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
              {trailer.name}
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

      {/* Player based on trailer type */}
      <div className="relative w-full h-0 pb-[56.25%] bg-black rounded-lg overflow-hidden">
        {trailer.type === 'youtube' ? (
          // YouTube iframe
          <iframe
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&rel=0&modestbranding=1&fs=1&iv_load_policy=3&disablekb=1`}
            title={trailer.name}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full border-0"
          />
        ) : (
          // Video file player
          <video
            ref={videoRef}
            src={trailer.video_url}
            className="absolute top-0 left-0 w-full h-full"
            controls
            autoPlay
            muted
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </div>
  );
}
