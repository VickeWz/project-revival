import { describe, expect, it } from 'vitest';
import { earnedScreenMinutes, formatPassDistance, stepsToNextMinute } from '@/lib/pass-metrics';

describe('active pass rules', () => {
  it('earns one whole minute for every 200 steps', () => {
    expect(earnedScreenMinutes(199)).toBe(0);
    expect(earnedScreenMinutes(200)).toBe(1);
    expect(earnedScreenMinutes(399)).toBe(1);
    expect(earnedScreenMinutes(400)).toBe(2);
    expect(earnedScreenMinutes(1000)).toBe(5);
    expect(earnedScreenMinutes(12572)).toBe(62);
    expect(stepsToNextMinute(199)).toBe(1);
    expect(stepsToNextMinute(200)).toBe(200);
  });
  it('shows every complete meter through 100 meters', () => {
    expect(formatPassDistance(0)).toBe('0 m');
    expect(formatPassDistance(1)).toBe('1 m');
    expect(formatPassDistance(99.9)).toBe('99 m');
    expect(formatPassDistance(100)).toBe('100 m');
  });
  it('shows complete ten-meter increments below one kilometer', () => {
    expect(formatPassDistance(109)).toBe('100 m');
    expect(formatPassDistance(110)).toBe('110 m');
    expect(formatPassDistance(119)).toBe('110 m');
    expect(formatPassDistance(120)).toBe('120 m');
    expect(formatPassDistance(999)).toBe('990 m');
  });
  it('shows kilometers in complete hundred-meter increments', () => {
    expect(formatPassDistance(1000)).toBe('1 km');
    expect(formatPassDistance(1099)).toBe('1 km');
    expect(formatPassDistance(1100)).toBe('1,1 km');
    expect(formatPassDistance(1200)).toBe('1,2 km');
    expect(formatPassDistance(2000)).toBe('2 km');
  });
});