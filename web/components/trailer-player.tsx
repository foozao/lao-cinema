'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, X, Loader2 } from 'lucide-react';
import type { Trailer } from '@/lib/types';
import { getSignedTrailerUrl } from '@/lib/api/trailer-tokens-client';

interface TrailerPlayerProps {
  trailer: Trailer;
  className?: string;
}

export function TrailerPlayer({ trailer, className = '' }: TrailerPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
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

  // Request signed URL when playing starts (for self-hosted trailers)
  useEffect(() => {
    if (isPlaying && trailer.type === 'video' && !signedUrl && !loadingToken) {
      setLoadingToken(true);
      setTokenError(null);
      
      getSignedTrailerUrl(trailer.id)
        .then(response => {
          setSignedUrl(response.url);
          setLoadingToken(false);
        })
        .catch(error => {
          console.error('Failed to get signed trailer URL:', error);
          setTokenError(error.message || 'Failed to load trailer');
          setLoadingToken(false);
        });
    }
    // Only run when isPlaying changes or trailer.id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, trailer.id]);

  // Keyboard controls for play/pause (space bar)
  useEffect(() => {
    if (!isPlaying || trailer.type !== 'video') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle space bar, and only if not typing in an input
      if (e.code === 'Space' && e.target === document.body) {
        const video = videoRef.current;
        // Only control video if it exists and is connected to the DOM
        if (video && document.contains(video)) {
          e.preventDefault();
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, trailer.type]);

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
      {/* Player based on trailer type */}
      <div className="relative w-full h-0 pb-[56.25%] bg-black rounded-lg overflow-hidden">
        {/* Close button overlay - only for self-hosted videos */}
        {trailer.type === 'video' && (
          <button
            onClick={() => setIsPlaying(false)}
            className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/70 hover:bg-black/90 transition-all text-white backdrop-blur-sm"
            aria-label="Close trailer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {trailer.type === 'youtube' ? (
          // YouTube iframe
          <iframe
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&rel=0&modestbranding=1&fs=1&iv_load_policy=3&disablekb=1`}
            title={trailer.name}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full border-0"
          />
        ) : loadingToken ? (
          // Loading state for token request
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-400">Loading trailer...</p>
            </div>
          </div>
        ) : tokenError ? (
          // Error state
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="flex flex-col items-center gap-3 px-4 text-center">
              <p className="text-sm text-red-400">{tokenError}</p>
              <button
                onClick={() => {
                  setTokenError(null);
                  setLoadingToken(false);
                  setSignedUrl(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : signedUrl ? (
          // Video file player with signed URL
          <video
            ref={videoRef}
            src={signedUrl}
            className="absolute top-0 left-0 w-full h-full"
            controls
            autoPlay
            muted
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        ) : null}
      </div>
    </div>
  );
}
