'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, AlertCircle, CheckCircle, Crop } from 'lucide-react';
import { uploadClient } from '@/lib/api/upload-client';
import ReactCrop, { type Crop as CropType, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ProfileImageUploaderProps {
  onUploadSuccess?: (url: string) => void;
}

export function ProfileImageUploader({ onUploadSuccess }: ProfileImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const processFile = (file: File) => {
    setError(null);
    setSuccess(false);

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const getCroppedImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!completedCrop || !imgRef.current) {
        reject(new Error('No crop area selected'));
        return;
      }

      const canvas = document.createElement('canvas');
      const image = imgRef.current;
      
      // Use a single scale factor to maintain aspect ratio
      const scale = image.naturalWidth / image.width;

      // Set canvas to 400x600 for profile photos (2:3 width:height ratio to match TMDB)
      const targetWidth = 400;
      const targetHeight = 600;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        image,
        completedCrop.x * scale,
        completedCrop.y * scale,
        completedCrop.width * scale,
        completedCrop.height * scale,
        0,
        0,
        targetWidth,
        targetHeight
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        0.9
      );
    });
  };

  const handleUpload = async () => {
    if (!completedCrop || !selectedFile) {
      setError('Please select a crop area');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const croppedBlob = await getCroppedImage();
      const croppedFile = new File([croppedBlob], selectedFile.name, {
        type: 'image/jpeg',
      });

      const result = await uploadClient.uploadImage(croppedFile, 'profile');
      setSuccess(true);
      
      setTimeout(() => {
        onUploadSuccess?.(result.url);
        handleClear();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    setShowCropper(false);
    setCompletedCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {!showCropper ? (
        <>
          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-lg p-8 text-center
              transition-colors cursor-pointer
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, WebP or GIF (max 5MB)
            </p>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Crop className="w-4 h-4" />
                  Crop Profile Photo
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm text-gray-600">
                Drag to select the area you want to use. The image will be resized to 400x600 pixels (2:3 width:height ratio).
              </p>

              <div className="max-w-full overflow-auto flex justify-center bg-gray-50 rounded-lg p-4">
                <ReactCrop
                  crop={crop}
                  onChange={(c: CropType) => setCrop(c)}
                  onComplete={(c: PixelCrop) => setCompletedCrop(c)}
                  aspect={2 / 3}
                >
                  <img
                    ref={imgRef}
                    src={previewUrl || ''}
                    alt="Crop preview"
                    style={{ maxWidth: '600px', maxHeight: '600px', width: 'auto', height: 'auto' }}
                  />
                </ReactCrop>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !completedCrop}
                  className="gap-2"
                >
                  {uploading ? (
                    <>Uploading...</>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload Cropped Image
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Profile photo uploaded successfully!</span>
        </div>
      )}
    </div>
  );
}
