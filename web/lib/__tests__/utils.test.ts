import { describe, it, expect } from '@jest/globals';
import { cn } from '../utils';

describe('utils', () => {
  describe('cn (className merger)', () => {
    it('should merge single class name', () => {
      const result = cn('text-red-500');
      expect(result).toBe('text-red-500');
    });

    it('should merge multiple class names', () => {
      const result = cn('text-red-500', 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle conditional classes', () => {
      const result = cn('base-class', true && 'conditional-class', false && 'hidden-class');
      expect(result).toBe('base-class conditional-class');
    });

    it('should merge conflicting Tailwind classes (last one wins)', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500');
    });

    it('should handle array of classes', () => {
      const result = cn(['text-red-500', 'bg-blue-500']);
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle object with boolean values', () => {
      const result = cn({
        'text-red-500': true,
        'bg-blue-500': false,
        'p-4': true,
      });
      expect(result).toBe('text-red-500 p-4');
    });

    it('should handle mixed inputs', () => {
      const result = cn(
        'base-class',
        ['array-class-1', 'array-class-2'],
        { 'object-class': true, 'hidden': false },
        true && 'conditional-class'
      );
      expect(result).toBe('base-class array-class-1 array-class-2 object-class conditional-class');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle null and undefined', () => {
      const result = cn('text-red-500', null, undefined, 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should deduplicate identical classes', () => {
      const result = cn('text-red-500', 'text-red-500', 'bg-blue-500');
      expect(result).toBe('text-red-500 bg-blue-500');
    });

    it('should handle responsive classes', () => {
      const result = cn('text-sm', 'md:text-base', 'lg:text-lg');
      expect(result).toBe('text-sm md:text-base lg:text-lg');
    });

    it('should handle hover and state variants', () => {
      const result = cn('bg-blue-500', 'hover:bg-blue-600', 'active:bg-blue-700');
      expect(result).toBe('bg-blue-500 hover:bg-blue-600 active:bg-blue-700');
    });

    it('should resolve conflicting responsive classes', () => {
      const result = cn('text-red-500', 'md:text-blue-500', 'md:text-green-500');
      expect(result).toBe('text-red-500 md:text-green-500');
    });

    it('should handle arbitrary values', () => {
      const result = cn('text-[#ff0000]', 'bg-[rgb(0,0,255)]');
      expect(result).toBe('text-[#ff0000] bg-[rgb(0,0,255)]');
    });

    it('should handle dark mode variants', () => {
      const result = cn('bg-white', 'dark:bg-black', 'text-black', 'dark:text-white');
      expect(result).toBe('bg-white dark:bg-black text-black dark:text-white');
    });

    describe('real-world component scenarios', () => {
      it('should merge button variant classes', () => {
        const baseClasses = 'px-4 py-2 rounded font-medium';
        const variantClasses = 'bg-blue-500 text-white hover:bg-blue-600';
        const result = cn(baseClasses, variantClasses);
        expect(result).toBe('px-4 py-2 rounded font-medium bg-blue-500 text-white hover:bg-blue-600');
      });

      it('should handle conditional disabled state', () => {
        const isDisabled = true;
        const result = cn(
          'px-4 py-2 bg-blue-500',
          isDisabled && 'opacity-50 cursor-not-allowed',
          !isDisabled && 'hover:bg-blue-600'
        );
        expect(result).toBe('px-4 py-2 bg-blue-500 opacity-50 cursor-not-allowed');
      });

      it('should override base classes with prop classes', () => {
        const baseClasses = 'text-sm text-gray-700';
        const propClasses = 'text-lg text-blue-500';
        const result = cn(baseClasses, propClasses);
        expect(result).toBe('text-lg text-blue-500');
      });
    });
  });
});
