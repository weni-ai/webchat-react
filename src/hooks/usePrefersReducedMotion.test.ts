import { act, renderHook } from '@testing-library/react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

describe('usePrefersReducedMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      value: originalMatchMedia,
      configurable: true,
      writable: true,
    });
  });

  it('returns false safely when window.matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('reads initial preference, reacts to live changes, and cleans up listener', () => {
    let listener: ((event: MediaQueryListEvent) => void) | null = null;
    const addEventListener = jest.fn((_event, cb) => {
      listener = cb;
    });
    const removeEventListener = jest.fn();

    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockReturnValue({
        matches: true,
        addEventListener,
        removeEventListener,
      }),
      configurable: true,
      writable: true,
    });

    const { result, unmount } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);

    act(() => {
      listener?.({ matches: false } as MediaQueryListEvent);
    });
    expect(result.current).toBe(false);

    unmount();
    expect(removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('falls back to legacy addListener/removeListener when addEventListener is absent', () => {
    let listener: ((event: MediaQueryListEvent) => void) | null = null;
    const addListener = jest.fn((cb) => {
      listener = cb;
    });
    const removeListener = jest.fn();

    Object.defineProperty(window, 'matchMedia', {
      value: jest.fn().mockReturnValue({
        matches: false,
        addListener,
        removeListener,
      }),
      configurable: true,
      writable: true,
    });

    const { result, unmount } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      listener?.({ matches: true } as MediaQueryListEvent);
    });
    expect(result.current).toBe(true);

    unmount();
    expect(removeListener).toHaveBeenCalledWith(expect.any(Function));
  });
});
