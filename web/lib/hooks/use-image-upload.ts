import { useState, useRef } from 'react';
import { uploadClient, type ImageType } from '@/lib/api/upload-client';

export interface UseImageUploadOptions {
  type: ImageType;
  onSuccess?: (url: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export interface UseImageUploadReturn {
  uploading: boolean;
  error: string | null;
  success: boolean;
  previewUrl: string | null;
  selectedFile: File | null;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  processFile: (file: File) => void;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleUpload: () => Promise<void>;
  handleClear: () => void;
  setError: (error: string | null) => void;
}

export function useImageUpload({
  type,
  onSuccess,
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
}: UseImageUploadOptions): UseImageUploadReturn {
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

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`);
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
      
      setTimeout(() => {
        onSuccess?.(result.url);
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

  return {
    uploading,
    error,
    success,
    previewUrl,
    selectedFile,
    isDragging,
    fileInputRef,
    processFile,
    handleFileSelect,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleUpload,
    handleClear,
    setError,
  };
}
