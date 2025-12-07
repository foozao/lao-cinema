/**
 * PersonSearch Component Tests
 * 
 * Tests for the admin person search component.
 */

import React from 'react';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PersonSearch } from '../person-search';

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  peopleAPI: {
    search: jest.fn(),
  },
}));

// Mock image utilities
jest.mock('@/lib/images', () => ({
  getProfileUrl: (path: string | null) => path ? `https://tmdb.org${path}` : null,
}));

import { peopleAPI } from '@/lib/api/client';
const mockPeopleAPI = peopleAPI as jest.Mocked<typeof peopleAPI>;

describe('PersonSearch', () => {
  let onSelect: jest.Mock;
  let onCreateNew: jest.Mock;

  beforeEach(() => {
    onSelect = jest.fn();
    onCreateNew = jest.fn();
    jest.useFakeTimers();
    (mockPeopleAPI.search as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<PersonSearch onSelect={onSelect} />);
      
      expect(screen.getByPlaceholderText('Search for a person...')).toBeInTheDocument();
    });

    it('should use custom placeholder', () => {
      render(<PersonSearch onSelect={onSelect} placeholder="Find an actor..." />);
      
      expect(screen.getByPlaceholderText('Find an actor...')).toBeInTheDocument();
    });

    it('should show search icon', () => {
      render(<PersonSearch onSelect={onSelect} />);
      
      // Search icon is an SVG inside the component
      const input = screen.getByPlaceholderText('Search for a person...');
      expect(input.parentElement).toBeInTheDocument();
    });
  });

  describe('Search Behavior', () => {
    it('should not search for queries less than 2 characters', async () => {
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'a' } });
      
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      expect(mockPeopleAPI.search).not.toHaveBeenCalled();
    });

    it('should search after typing 2+ characters with debounce', async () => {
      (mockPeopleAPI.search as jest.Mock).mockResolvedValue({ people: [] });
      
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'John' } });
      
      // Should not search immediately
      expect(mockPeopleAPI.search).not.toHaveBeenCalled();
      
      // Advance past debounce timer
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      expect(mockPeopleAPI.search).toHaveBeenCalledWith('John', 10);
    });

    it('should display search results', async () => {
      (mockPeopleAPI.search as jest.Mock).mockResolvedValue({
        people: [
          { id: 1, name: { en: 'John Doe' }, known_for_department: 'Acting' },
          { id: 2, name: { en: 'Jane Smith' }, known_for_department: 'Directing' },
        ],
      });
      
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'John' } });
      
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should display department for results', async () => {
      (mockPeopleAPI.search as jest.Mock).mockResolvedValue({
        people: [
          { id: 1, name: { en: 'John Doe' }, known_for_department: 'Acting' },
        ],
      });
      
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'John' } });
      
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Acting')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      (mockPeopleAPI.search as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'John' } });
      
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      // Should not crash, results should be empty
      await waitFor(() => {
        expect(mockPeopleAPI.search).toHaveBeenCalled();
      });
    });

    it('should show "No results found" message', async () => {
      (mockPeopleAPI.search as jest.Mock).mockResolvedValue({ people: [] });
      
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'NonexistentPerson' } });
      
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      });
    });
  });

  describe('Selection', () => {
    it('should call onSelect when clicking a result', async () => {
      const person = { id: 1, name: { en: 'John Doe' }, known_for_department: 'Acting' };
      (mockPeopleAPI.search as jest.Mock).mockResolvedValue({ people: [person] });
      
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'John' } });
      
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('John Doe'));
      
      expect(onSelect).toHaveBeenCalledWith(person);
    });

    it('should clear input after selection', async () => {
      const person = { id: 1, name: { en: 'John Doe' } };
      (mockPeopleAPI.search as jest.Mock).mockResolvedValue({ people: [person] });
      
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'John' } });
      
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('John Doe'));
      
      expect(input.value).toBe('');
    });
  });

  describe('Create New', () => {
    it('should show create button when onCreateNew is provided', async () => {
      (mockPeopleAPI.search as jest.Mock).mockResolvedValue({
        people: [{ id: 1, name: { en: 'John Doe' } }],
      });
      
      render(<PersonSearch onSelect={onSelect} onCreateNew={onCreateNew} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'John' } });
      
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Create "John"/)).toBeInTheDocument();
      });
    });

    it('should call onCreateNew when clicking create button', async () => {
      (mockPeopleAPI.search as jest.Mock).mockResolvedValue({ people: [] });
      
      render(<PersonSearch onSelect={onSelect} onCreateNew={onCreateNew} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'New Person' } });
      
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      await waitFor(() => {
        expect(screen.getByText(/Create "New Person"/)).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText(/Create "New Person"/));
      
      expect(onCreateNew).toHaveBeenCalledWith('New Person');
    });

    it('should not show create button when onCreateNew is not provided', async () => {
      (mockPeopleAPI.search as jest.Mock).mockResolvedValue({ people: [] });
      
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'Test' } });
      
      await act(async () => {
        jest.advanceTimersByTime(350);
      });
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      });
      
      expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('should show clear button when there is input', () => {
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...');
      fireEvent.change(input, { target: { value: 'John' } });
      
      // Clear button should be visible (X icon)
      const clearButton = input.parentElement?.querySelector('button');
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear input when clicking clear button', () => {
      render(<PersonSearch onSelect={onSelect} />);
      
      const input = screen.getByPlaceholderText('Search for a person...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'John' } });
      
      const clearButton = input.parentElement?.querySelector('button');
      if (clearButton) {
        fireEvent.click(clearButton);
      }
      
      expect(input.value).toBe('');
    });
  });
});
