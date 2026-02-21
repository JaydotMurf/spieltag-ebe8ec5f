import { describe, it, expect } from 'vitest';
import { calculateRollingYield, getValueSignal } from '@/lib/metrics';

describe('calculateRollingYield', () => {
  it('returns correct yield for normal player', () => {
    const result = calculateRollingYield({ last_5_points: 41, price: 21.0 });
    expect(result).toBeCloseTo(1.952, 3);
  });

  it('returns 0 when price is 0 (division by zero guard)', () => {
    const result = calculateRollingYield({ last_5_points: 41, price: 0 });
    expect(result).toBe(0);
  });

  it('returns 0 when last_5_points is 0', () => {
    const result = calculateRollingYield({ last_5_points: 0, price: 15.0 });
    expect(result).toBe(0);
  });
});

describe('getValueSignal', () => {
  it('returns UNDERVALUED when playerYield > benchmark * 1.20', () => {
    // 1.952 > 1.60 * 1.20 = 1.92 → UNDERVALUED
    expect(getValueSignal(1.952, 1.60)).toBe('UNDERVALUED');
  });

  it('returns FAIR when playerYield is between thresholds', () => {
    // 1.50 > 1.60 * 0.75 = 1.20, and 1.50 < 1.60 * 1.20 = 1.92 → FAIR
    expect(getValueSignal(1.50, 1.60)).toBe('FAIR');
  });

  it('returns OVERVALUED when playerYield < benchmark * 0.75', () => {
    // 1.10 < 1.60 * 0.75 = 1.20 → OVERVALUED
    expect(getValueSignal(1.10, 1.60)).toBe('OVERVALUED');
  });

  it('returns FAIR at exact upper boundary (1.20x)', () => {
    // 1.92 is NOT > 1.92 → FAIR
    expect(getValueSignal(1.92, 1.60)).toBe('FAIR');
  });

  it('returns FAIR just above lower boundary', () => {
    // 1.25 is NOT < 1.60 * 0.75 = 1.20 → FAIR
    expect(getValueSignal(1.25, 1.60)).toBe('FAIR');
  });
});
