'use client';

import { useEffect, useState, useRef } from 'react';
import { Movie } from '@/lib/types';
import { MovieCard } from './movie-card';

interface AnimatedMovieGridProps {
  movies: Movie[];
  staggerDelay?: number; // Delay between each card in ms
}

export function AnimatedMovieGrid({ movies, staggerDelay = 100 }: AnimatedMovieGridProps) {
  const [visibleCards, setVisibleCards] = useState<Set<number>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-index'));
            // Stagger the animation
            setTimeout(() => {
              setVisibleCards((prev) => new Set([...prev, index]));
            }, index * staggerDelay);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    );

    const cards = gridRef.current.querySelectorAll('[data-index]');
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [movies, staggerDelay]);

  return (
    <div 
      ref={gridRef}
      className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {movies.map((movie, index) => (
        <div
          key={movie.id}
          data-index={index}
          className={`transform transition-all duration-500 ease-out ${
            visibleCards.has(index)
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <MovieCard movie={movie} />
        </div>
      ))}
    </div>
  );
}
