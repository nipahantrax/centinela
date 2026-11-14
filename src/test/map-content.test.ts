import { describe, expect, it } from 'vitest';
import { escapeMapText } from '@/lib/map-content';

describe('untrusted map labels', () => {
  it('prevents a water-point name from injecting executable HTML', () => {
    expect(escapeMapText('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });
});