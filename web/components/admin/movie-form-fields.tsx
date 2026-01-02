'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Supported languages - extensible for future additions
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export interface MovieFormData {
  // English fields
  title_en: string;
  overview_en: string;
  tagline_en: string;
  // Lao fields
  title_lo: string;
  overview_lo: string;
  tagline_lo: string;
  // Common fields
  original_title: string;
  original_language: string;
  release_date: string;
  runtime: string;
  imdb_id: string;
  // Video fields
  video_url: string;
  video_quality: string;
  video_format: string;
  video_aspect_ratio?: string;
}

interface MovieFormFieldsProps {
  formData: MovieFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

// Helper to check if a language has required content
function hasRequiredContent(formData: MovieFormData, lang: LanguageCode): boolean {
  const title = formData[`title_${lang}` as keyof MovieFormData] as string;
  const overview = formData[`overview_${lang}` as keyof MovieFormData] as string;
  return Boolean(title?.trim() && overview?.trim());
}

// Helper to check if a language has any content
function hasAnyContent(formData: MovieFormData, lang: LanguageCode): boolean {
  const title = formData[`title_${lang}` as keyof MovieFormData] as string;
  const overview = formData[`overview_${lang}` as keyof MovieFormData] as string;
  const tagline = formData[`tagline_${lang}` as keyof MovieFormData] as string;
  return Boolean(title?.trim() || overview?.trim() || tagline?.trim());
}

// Placeholder text for each language
const PLACEHOLDERS: Record<LanguageCode, { title: string; overview: string; tagline: string }> = {
  en: {
    title: 'Enter movie title in English',
    overview: 'Enter movie description in English',
    tagline: 'A catchy tagline for the movie',
  },
  lo: {
    title: 'ປ້ອນຊື່ຮູບເງົາເປັນພາສາລາວ',
    overview: 'ປ້ອນຄໍາອະທິບາຍຮູບເງົາເປັນພາສາລາວ',
    tagline: 'ປ້ອນຄຳຂວັນຮູບເງົາເປັນພາສາລາວ',
  },
};

interface LocalizedContentFieldsProps extends MovieFormFieldsProps {
  showValidationError?: boolean;
}

// Unified Localized Content Section with Language Toggle
export function LocalizedContentFields({ formData, onChange, showValidationError }: LocalizedContentFieldsProps) {
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');
  
  // Check if at least one language has required content
  const hasAnyRequiredContent = SUPPORTED_LANGUAGES.some(lang => 
    hasRequiredContent(formData, lang.code)
  );
  
  const placeholders = PLACEHOLDERS[activeLanguage];
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Movie Content</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Title and overview required in at least one language
            </p>
          </div>
        </div>
        
        {/* Language Toggle */}
        <div className="flex gap-2 mt-4">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const hasRequired = hasRequiredContent(formData, lang.code);
            const hasPartial = hasAnyContent(formData, lang.code) && !hasRequired;
            const isActive = activeLanguage === lang.code;
            
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setActiveLanguage(lang.code)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
                  'hover:bg-gray-50 cursor-pointer',
                  isActive
                    ? 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'
                    : 'border-gray-200 bg-white text-gray-700'
                )}
              >
                <span className="font-medium">{lang.name}</span>
                <span className={cn(
                  'text-xs',
                  isActive ? 'text-gray-300' : 'text-gray-400'
                )}>
                  ({lang.nativeName})
                </span>
                
                {/* Status indicator */}
                {hasRequired && (
                  <Check className={cn(
                    'w-4 h-4',
                    isActive ? 'text-green-300' : 'text-green-500'
                  )} />
                )}
                {hasPartial && (
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    isActive ? 'bg-yellow-300' : 'bg-yellow-500'
                  )} />
                )}
              </button>
            );
          })}
        </div>
        
        {/* Validation warning */}
        {showValidationError && !hasAnyRequiredContent && (
          <div className="flex items-center gap-2 mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>Please enter title and overview in at least one language</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[100px_1fr] items-center gap-4">
          <Label htmlFor={`title_${activeLanguage}`}>
            Title
            {!hasAnyRequiredContent && <span className="text-red-500"> *</span>}
          </Label>
          <Input
            id={`title_${activeLanguage}`}
            name={`title_${activeLanguage}`}
            value={formData[`title_${activeLanguage}` as keyof MovieFormData] as string}
            onChange={onChange}
            placeholder={placeholders.title}
          />
        </div>

        <div>
          <Label htmlFor={`overview_${activeLanguage}`} className="mb-2 block">
            Overview
            {!hasAnyRequiredContent && <span className="text-red-500"> *</span>}
          </Label>
          <Textarea
            id={`overview_${activeLanguage}`}
            name={`overview_${activeLanguage}`}
            value={formData[`overview_${activeLanguage}` as keyof MovieFormData] as string}
            onChange={onChange}
            rows={4}
            placeholder={placeholders.overview}
          />
        </div>

        <div className="grid grid-cols-[100px_1fr] items-center gap-4">
          <Label htmlFor={`tagline_${activeLanguage}`}>Tagline</Label>
          <Input
            id={`tagline_${activeLanguage}`}
            name={`tagline_${activeLanguage}`}
            value={formData[`tagline_${activeLanguage}` as keyof MovieFormData] as string}
            onChange={onChange}
            placeholder={placeholders.tagline}
          />
        </div>
        
        {/* Content status summary */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2">Content status:</p>
          <div className="flex flex-wrap gap-3">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const hasRequired = hasRequiredContent(formData, lang.code);
              const hasPartial = hasAnyContent(formData, lang.code) && !hasRequired;
              
              return (
                <div key={lang.code} className="flex items-center gap-1.5 text-sm">
                  {hasRequired ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : hasPartial ? (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-gray-300" />
                    </div>
                  )}
                  <span className={cn(
                    hasRequired ? 'text-green-700' : hasPartial ? 'text-yellow-700' : 'text-gray-400'
                  )}>
                    {lang.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Keep legacy exports for backward compatibility but mark as deprecated
/** @deprecated Use LocalizedContentFields instead */
export function EnglishContentFields({ formData, onChange }: MovieFormFieldsProps) {
  return <LocalizedContentFields formData={formData} onChange={onChange} />;
}

/** @deprecated Use LocalizedContentFields instead */
export function LaoContentFields({ formData: _formData, onChange: _onChange }: MovieFormFieldsProps) {
  // No-op - content is now unified in LocalizedContentFields
  return null;
}

// Movie Details Section
export function MovieDetailsFields({ formData, onChange }: MovieFormFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Movie Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="original_title">Original Title</Label>
            <Input
              id="original_title"
              name="original_title"
              value={formData.original_title}
              onChange={onChange}
              placeholder="Original title (if different)"
            />
          </div>

          <div>
            <Label htmlFor="original_language">Original Language</Label>
            <select
              id="original_language"
              name="original_language"
              value={formData.original_language}
              onChange={(e) => onChange(e as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="lo">Lao</option>
              <option value="en">English</option>
              <option value="th">Thai</option>
              <option value="vi">Vietnamese</option>
              <option value="km">Khmer</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="release_date">Release Date *</Label>
            <Input
              id="release_date"
              name="release_date"
              type="date"
              value={formData.release_date}
              onChange={onChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="runtime">Runtime (minutes) *</Label>
            <Input
              id="runtime"
              name="runtime"
              type="number"
              value={formData.runtime}
              onChange={onChange}
              required
              placeholder="120"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="imdb_id">IMDB ID</Label>
          <Input
            id="imdb_id"
            name="imdb_id"
            value={formData.imdb_id}
            onChange={onChange}
            placeholder="tt1234567"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Video Source Section
export function VideoSourceFields({ formData, onChange }: MovieFormFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Source</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="video_url">Video URL</Label>
          <Input
            id="video_url"
            name="video_url"
            value={formData.video_url}
            onChange={onChange}
            placeholder="/videos/movie.mp4 or https://stream.example.com/video.m3u8"
          />
          <p className="text-xs text-gray-500 mt-1">
            For local files: upload to /public/videos/ and enter path. For HLS: enter full URL
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="video_format">Format</Label>
            <select
              id="video_format"
              name="video_format"
              value={formData.video_format}
              onChange={(e) => onChange(e as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="mp4">MP4</option>
              <option value="hls">HLS (.m3u8)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="video_quality">Quality</Label>
            <select
              id="video_quality"
              name="video_quality"
              value={formData.video_quality}
              onChange={(e) => onChange(e as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="original">Original</option>
              <option value="1080p">1080p</option>
              <option value="720p">720p</option>
              <option value="480p">480p</option>
            </select>
          </div>

          <div>
            <Label htmlFor="video_aspect_ratio">Aspect Ratio</Label>
            <select
              id="video_aspect_ratio"
              name="video_aspect_ratio"
              value={formData.video_aspect_ratio || '16:9'}
              onChange={(e) => onChange(e as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="4:3">4:3 (Standard)</option>
              <option value="21:9">21:9 (Ultrawide)</option>
              <option value="2.35:1">2.35:1 (Cinemascope)</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
