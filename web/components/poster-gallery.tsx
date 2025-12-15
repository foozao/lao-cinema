'use client';

import { useState } from 'react';
import { OptimizedImage as Image } from './optimized-image';
import { MovieImage } from '@/lib/types';
import { getImageUrl } from '@/lib/images';
import { Check, Star, Trash2 } from 'lucide-react';
import { Button } from './ui/button';

interface PosterGalleryProps {
  images: MovieImage[];
  type: 'poster' | 'backdrop' | 'logo';
  onSelectPrimary?: (imageId: string) => void;
  onDelete?: (imageId: string) => Promise<void>;
  allowSelection?: boolean;
  columns?: 2 | 3 | 4 | 5;
}

export function PosterGallery({
  images,
  type,
  onSelectPrimary,
  onDelete,
  allowSelection = false,
  columns = 4,
}: PosterGalleryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter images by type
  const filteredImages = images.filter((img) => img.type === type);

  if (filteredImages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No {type}s available</p>
      </div>
    );
  }

  const handleImageClick = (imageId: string) => {
    if (!allowSelection) return;
    
    setSelectedId(imageId);
    onSelectPrimary?.(imageId);
  };

  const handleDelete = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    setDeletingId(imageId);
    try {
      await onDelete(imageId);
    } finally {
      setDeletingId(null);
    }
  };

  const gridColsClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 md:grid-cols-5',
  }[columns];

  return (
    <div className={`grid ${gridColsClass} gap-4`}>
      {filteredImages.map((image) => {
        const imageUrl = getImageUrl(image.file_path, type, 'medium');
        const isPrimary = image.is_primary;
        const isSelected = selectedId === image.id;

        return (
          <div
            key={image.id}
            className={`relative group ${
              allowSelection ? 'cursor-pointer' : ''
            } rounded-lg overflow-hidden border-2 transition-all ${
              isPrimary
                ? 'border-blue-500 ring-2 ring-blue-200'
                : isSelected
                ? 'border-green-500 ring-2 ring-green-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleImageClick(image.id)}
          >
            {/* Image */}
            <div className={`relative bg-gray-100 ${
              type === 'backdrop' ? 'aspect-[16/9]' : 
              type === 'logo' ? 'aspect-[3/1]' : 
              'aspect-[2/3]'
            }`}>
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={`${type} ${image.id}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>

            {/* Primary Badge */}
            {isPrimary && (
              <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                <Star className="w-3 h-3 fill-current" />
                Primary
              </div>
            )}

            {/* Selected Badge */}
            {isSelected && !isPrimary && (
              <div className="absolute top-2 right-2 bg-green-500 text-white p-1.5 rounded-full shadow-lg">
                <Check className="w-4 h-4" />
              </div>
            )}

            {/* Language Badge */}
            {image.iso_639_1 && (
              <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-0.5 rounded text-xs font-medium uppercase">
                {image.iso_639_1}
              </div>
            )}

            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={(e) => handleDelete(image.id, e)}
                disabled={deletingId === image.id}
                className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                title="Delete image"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Hover Overlay with Metadata */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors pointer-events-none">
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="text-xs space-y-1">
                  {image.width && image.height && (
                    <p className="font-medium">{image.width} × {image.height}</p>
                  )}
                  {image.vote_average !== null && image.vote_average !== undefined && (
                    <p>Rating: {image.vote_average.toFixed(1)}/10</p>
                  )}
                  {image.vote_count !== null && image.vote_count !== undefined && image.vote_count > 0 && (
                    <p>{image.vote_count} votes</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
