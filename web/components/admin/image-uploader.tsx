'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { uploadClient, type ImageType } from '@/lib/api/upload-client';

interface ImageUploaderProps {
  type: ImageType;
  onUploadSuccess?: (url: string) => void;
}

export function ImageUploader({ type, onUploadSuccess }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await uploadClient.uploadImage(selectedFile, type);
      setSuccess(true);
      onUploadSuccess?.(result.url);
      
      setTimeout(() => {
        setSuccess(false);
        setPreviewUrl(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const typeLabel = type === 'poster' ? 'Poster' : type === 'backdrop' ? 'Backdrop' : type === 'logo' ? 'Logo' : 'Profile Photo';

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
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
              className={`w-full ${type === 'poster' ? 'max-h-96' : 'max-h-64'} object-contain`}
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
              {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
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
