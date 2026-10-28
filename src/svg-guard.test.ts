import { describe, expect, it } from 'vitest';
import { guardSvgDimensions } from '../shared/src/ui/svg-guard';

/**
 * Regression tests for the Android Expo Go crash:
 *   For input string: "auto"  (react-native-svg SVGLength → Double.valueOf)
 */
describe('guardSvgDimensions', () => {
  it('strips "auto" height from style and derives aspectRatio from viewBox', () => {
    const result = guardSvgDimensions(undefined, undefined, '0 0 400 260', {
      width: '100%',
      height: 'auto',
    });
    expect(result.dropped).toBe(true);
    expect(result.style?.height).toBeUndefined();
    expect(result.style?.width).toBe('100%');
    expect(result.style?.aspectRatio).toBeCloseTo(400 / 260);
  });

  it('strips "auto" width/height props and derives aspectRatio', () => {
    const result = guardSvgDimensions('auto', 'auto', '0 0 400 300', undefined);
    expect(result.dropped).toBe(true);
    expect(result.width).toBeUndefined();
    expect(result.height).toBeUndefined();
    expect(result.style?.aspectRatio).toBeCloseTo(400 / 300);
  });

  it('keeps an explicit aspectRatio instead of deriving one', () => {
    const result = guardSvgDimensions(undefined, undefined, '0 0 400 300', {
      width: '100%',
      height: 'auto',
      aspectRatio: 2,
    });
    expect(result.style?.aspectRatio).toBe(2);
  });

  it('passes numbers and percentage strings through unchanged', () => {
    const numeric = guardSvgDimensions(19, 19, '0 0 24 24', undefined);
    expect(numeric.width).toBe(19);
    expect(numeric.height).toBe(19);
    expect(numeric.dropped).toBe(false);
    expect(numeric.style).toBeUndefined();

    const percent = guardSvgDimensions('100%', '100%', '0 0 160 160', undefined);
    expect(percent.width).toBe('100%');
    expect(percent.height).toBe('100%');
    expect(percent.dropped).toBe(false);
    expect(percent.style).toBeUndefined();
  });

  it('leaves valid style dimensions untouched', () => {
    const style = { width: 120, height: 80, borderRadius: 8 };
    const result = guardSvgDimensions(undefined, undefined, '0 0 400 300', style);
    expect(result.dropped).toBe(false);
    expect(result.style).toEqual(style);
    expect(result.style).not.toBe(style);
  });
});
