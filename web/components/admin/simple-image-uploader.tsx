'use client';

import { Button } from '@/components/ui/button';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useImageUpload } from '@/lib/hooks/use-image-upload';
import type { ImageType } from '@/lib/api/upload-client';

interface SimpleImageUploaderProps {
  type: ImageType;
  onUploadSuccess?: (url: string) => void;
  label?: string;
  maxHeightClass?: string;
}

export function SimpleImageUploader({ 
  type, 
  onUploadSuccess,
  label,
  maxHeightClass = 'max-h-64'
}: SimpleImageUploaderProps) {
  const {
    uploading,
    error,
    success,
    previewUrl,
    selectedFile,
    isDragging,
    fileInputRef,
    handleFileSelect,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleUpload,
    handleClear,
  } = useImageUpload({ type, onSuccess: onUploadSuccess });

  const typeLabel = label || (type === 'poster' ? 'Poster' : type === 'backdrop' ? 'Backdrop' : type === 'logo' ? 'Logo' : 'Profile Photo');

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          id={`upload-${type}`}
        />
        
        <div className="flex flex-col items-center gap-3">
          <div className={`p-3 rounded-full ${
            isDragging ? 'bg-blue-100' : 'bg-gray-200'
          }`}>
            <Upload className={`w-8 h-8 ${
              isDragging ? 'text-blue-600' : 'text-gray-600'
            }`} />
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              {isDragging ? `Drop ${typeLabel} here` : `Drag and drop ${typeLabel}`}
            </p>
            <p className="text-xs text-gray-500">or</p>
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose {typeLabel}
          </Button>
          
          <p className="text-xs text-gray-500 mt-2">
            JPEG, PNG, WebP, or GIF (max 5MB)
          </p>
        </div>
      </div>

      {previewUrl && (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden border bg-gray-50">
            <img
              src={previewUrl}
              alt="Preview"
              className={`w-full ${maxHeightClass} object-contain`}
            />
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {selectedFile && (
            <div className="mt-2 text-sm text-gray-600">
              {selectedFile.name} {selectedFile.size ? `(${(selectedFile.size / 1024).toFixed(1)} KB)` : ''}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full mt-3"
            type="button"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : `Upload ${typeLabel}`}
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm p-3 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-600 text-sm p-3 bg-green-50 rounded-lg font-medium">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {typeLabel} uploaded successfully!
        </div>
      )}
    </div>
  );
}
