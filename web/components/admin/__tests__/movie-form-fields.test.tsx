/**
 * Movie Form Fields Component Tests
 * 
 * Tests for admin movie form field components.
 */

import React from 'react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  EnglishContentFields,
  LaoContentFields,
  MovieDetailsFields,
  VideoSourceFields,
  type MovieFormData,
} from '../movie-form-fields';

// Create base form data
const createFormData = (overrides: Partial<MovieFormData> = {}): MovieFormData => ({
  title_en: '',
  overview_en: '',
  tagline_en: '',
  title_lo: '',
  overview_lo: '',
  tagline_lo: '',
  original_title: '',
  original_language: 'lo',
  release_date: '',
  runtime: '',
  imdb_id: '',
  video_url: '',
  video_quality: 'original',
  video_format: 'mp4',
  video_aspect_ratio: '16:9',
  ...overrides,
});

describe('EnglishContentFields', () => {
  let formData: MovieFormData;
  let handleChange: jest.Mock;

  beforeEach(() => {
    formData = createFormData();
    handleChange = jest.fn();
  });

  it('should render English title input', () => {
    render(<EnglishContentFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Title \(English\)/)).toBeInTheDocument();
  });

  it('should render English overview textarea', () => {
    render(<EnglishContentFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Overview \(English\)/)).toBeInTheDocument();
  });

  it('should render English tagline input', () => {
    render(<EnglishContentFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Tagline \(English\)/)).toBeInTheDocument();
  });

  it('should display current values', () => {
    formData = createFormData({
      title_en: 'Test Title',
      overview_en: 'Test Overview',
      tagline_en: 'Test Tagline',
    });
    render(<EnglishContentFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Overview')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Tagline')).toBeInTheDocument();
  });

  it('should call onChange when title changes', () => {
    render(<EnglishContentFields formData={formData} onChange={handleChange} />);
    
    const titleInput = screen.getByLabelText(/Title \(English\)/);
    fireEvent.change(titleInput, { target: { value: 'New Title', name: 'title_en' } });
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('should mark required fields', () => {
    render(<EnglishContentFields formData={formData} onChange={handleChange} />);
    
    const titleInput = screen.getByLabelText(/Title \(English\)/);
    const overviewInput = screen.getByLabelText(/Overview \(English\)/);
    
    expect(titleInput).toHaveAttribute('required');
    expect(overviewInput).toHaveAttribute('required');
  });
});

describe('LaoContentFields', () => {
  let formData: MovieFormData;
  let handleChange: jest.Mock;

  beforeEach(() => {
    formData = createFormData();
    handleChange = jest.fn();
  });

  it('should render Lao title input', () => {
    render(<LaoContentFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Title \(Lao\)/)).toBeInTheDocument();
  });

  it('should render Lao overview textarea', () => {
    render(<LaoContentFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Overview \(Lao\)/)).toBeInTheDocument();
  });

  it('should render Lao tagline input', () => {
    render(<LaoContentFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Tagline \(Lao\)/)).toBeInTheDocument();
  });

  it('should have Lao placeholders', () => {
    render(<LaoContentFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByPlaceholderText(/ປ້ອນຊື່ຮູບເງົາເປັນພາສາລາວ/)).toBeInTheDocument();
  });

  it('should not mark fields as required', () => {
    render(<LaoContentFields formData={formData} onChange={handleChange} />);
    
    const titleInput = screen.getByLabelText(/Title \(Lao\)/);
    expect(titleInput).not.toHaveAttribute('required');
  });
});

describe('MovieDetailsFields', () => {
  let formData: MovieFormData;
  let handleChange: jest.Mock;

  beforeEach(() => {
    formData = createFormData();
    handleChange = jest.fn();
  });

  it('should render original title input', () => {
    render(<MovieDetailsFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Original Title/)).toBeInTheDocument();
  });

  it('should render language select', () => {
    render(<MovieDetailsFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Original Language/)).toBeInTheDocument();
  });

  it('should render release date input', () => {
    render(<MovieDetailsFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Release Date/)).toBeInTheDocument();
  });

  it('should render runtime input', () => {
    render(<MovieDetailsFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Runtime/)).toBeInTheDocument();
  });

  it('should render IMDB ID input', () => {
    render(<MovieDetailsFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/IMDB ID/)).toBeInTheDocument();
  });

  it('should have language options', () => {
    render(<MovieDetailsFields formData={formData} onChange={handleChange} />);
    
    const languageSelect = screen.getByLabelText(/Original Language/);
    expect(languageSelect).toContainElement(screen.getByText('Lao'));
    expect(languageSelect).toContainElement(screen.getByText('English'));
    expect(languageSelect).toContainElement(screen.getByText('Thai'));
  });

  it('should call onChange when release date changes', () => {
    render(<MovieDetailsFields formData={formData} onChange={handleChange} />);
    
    const dateInput = screen.getByLabelText(/Release Date/);
    fireEvent.change(dateInput, { target: { value: '2024-01-15', name: 'release_date' } });
    
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('VideoSourceFields', () => {
  let formData: MovieFormData;
  let handleChange: jest.Mock;

  beforeEach(() => {
    formData = createFormData();
    handleChange = jest.fn();
  });

  it('should render video URL input', () => {
    render(<VideoSourceFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Video URL/)).toBeInTheDocument();
  });

  it('should render format select', () => {
    render(<VideoSourceFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Format/)).toBeInTheDocument();
  });

  it('should render quality select', () => {
    render(<VideoSourceFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Quality/)).toBeInTheDocument();
  });

  it('should render aspect ratio select', () => {
    render(<VideoSourceFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByLabelText(/Aspect Ratio/)).toBeInTheDocument();
  });

  it('should have format options', () => {
    render(<VideoSourceFields formData={formData} onChange={handleChange} />);
    
    const formatSelect = screen.getByLabelText(/Format/);
    expect(formatSelect).toContainElement(screen.getByText('MP4'));
    expect(formatSelect).toContainElement(screen.getByText('HLS (.m3u8)'));
  });

  it('should have quality options', () => {
    render(<VideoSourceFields formData={formData} onChange={handleChange} />);
    
    const qualitySelect = screen.getByLabelText(/Quality/);
    expect(qualitySelect).toContainElement(screen.getByText('Original'));
    expect(qualitySelect).toContainElement(screen.getByText('1080p'));
    expect(qualitySelect).toContainElement(screen.getByText('720p'));
  });

  it('should have aspect ratio options', () => {
    render(<VideoSourceFields formData={formData} onChange={handleChange} />);
    
    const aspectSelect = screen.getByLabelText(/Aspect Ratio/);
    expect(aspectSelect).toContainElement(screen.getByText('16:9 (Widescreen)'));
    expect(aspectSelect).toContainElement(screen.getByText('2.35:1 (Cinemascope)'));
  });

  it('should show help text for video URL', () => {
    render(<VideoSourceFields formData={formData} onChange={handleChange} />);
    
    expect(screen.getByText(/For local files/)).toBeInTheDocument();
  });
});
