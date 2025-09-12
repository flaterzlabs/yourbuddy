import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('combines class names and dedupes tailwind conflicts', () => {
    expect(cn('p-2', 'text-sm', 'p-4')).toContain('p-4');
    expect(cn('text-sm', false && 'hidden', undefined)).toBe('text-sm');
  });
});

