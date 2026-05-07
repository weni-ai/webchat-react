import { renderHook, act } from '@testing-library/react';
import {
  syncVtexCxVisualViewportCssVars,
  useVtexCxVisualViewportCssVars,
} from './useVtexCxVisualViewportCssVars';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoot() {
  return { style: { setProperty: jest.fn() } };
}

function makeRef(current = null) {
  return { current };
}

function setVisualViewport(overrides = null) {
  if (overrides === null) {
    delete window.visualViewport;
    return;
  }
  Object.defineProperty(window, 'visualViewport', {
    value: {
      height: 800,
      width: 400,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      ...overrides,
    },
    configurable: true,
    writable: true,
  });
}

function setWindowSize(width, height) {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: height,
    configurable: true,
    writable: true,
  });
}

// ---------------------------------------------------------------------------
// syncVtexCxVisualViewportCssVars
// ---------------------------------------------------------------------------

describe('syncVtexCxVisualViewportCssVars', () => {
  afterEach(() => {
    setVisualViewport(null);
  });

  it('does nothing when root is null', () => {
    expect(() => syncVtexCxVisualViewportCssVars(null)).not.toThrow();
    expect(() => syncVtexCxVisualViewportCssVars(undefined)).not.toThrow();
  });

  it('sets CSS vars from visualViewport when available', () => {
    setVisualViewport({ height: 600, width: 320 });
    const root = makeRoot();

    syncVtexCxVisualViewportCssVars(root);

    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-height',
      `${600 * 0.85}px`,
    );
    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-width',
      '320px',
    );
  });

  it('falls back to window.innerHeight / innerWidth when visualViewport is absent', () => {
    setVisualViewport(null);
    setWindowSize(1024, 768);
    const root = makeRoot();

    syncVtexCxVisualViewportCssVars(root);

    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-height',
      `${768 * 0.85}px`,
    );
    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-width',
      '1024px',
    );
  });

  it('applies the 0.85 scale factor to the height', () => {
    setVisualViewport({ height: 1000, width: 500 });
    const root = makeRoot();

    syncVtexCxVisualViewportCssVars(root);

    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-height',
      '850px',
    );
  });
});

// ---------------------------------------------------------------------------
// useVtexCxVisualViewportCssVars — inactive
// ---------------------------------------------------------------------------

describe('useVtexCxVisualViewportCssVars — inactive', () => {
  afterEach(() => {
    setVisualViewport(null);
    jest.restoreAllMocks();
  });

  it('does not set any CSS vars when active is false', () => {
    const root = makeRoot();
    const rootRef = makeRef(root);

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, false));

    expect(root.style.setProperty).not.toHaveBeenCalled();
  });

  it('does not add any event listeners when active is false', () => {
    setVisualViewport({ height: 600, width: 300 });
    const addWindowListener = jest.spyOn(window, 'addEventListener');
    const root = makeRoot();
    const rootRef = makeRef(root);

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, false));

    expect(addWindowListener).not.toHaveBeenCalled();
    expect(window.visualViewport.addEventListener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useVtexCxVisualViewportCssVars — no root
// ---------------------------------------------------------------------------

describe('useVtexCxVisualViewportCssVars — no root element', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not set CSS vars when rootRef.current is null', () => {
    const addWindowListener = jest.spyOn(window, 'addEventListener');
    const rootRef = makeRef(null);

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, true));

    expect(addWindowListener).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useVtexCxVisualViewportCssVars — active with visualViewport
// ---------------------------------------------------------------------------

describe('useVtexCxVisualViewportCssVars — active, visualViewport present', () => {
  beforeEach(() => {
    setVisualViewport({ height: 800, width: 400 });
  });

  afterEach(() => {
    setVisualViewport(null);
    jest.restoreAllMocks();
  });

  it('calls sync immediately on mount', () => {
    const root = makeRoot();
    const rootRef = makeRef(root);

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, true));

    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-height',
      `${800 * 0.85}px`,
    );
    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-width',
      '400px',
    );
  });

  it('registers resize and scroll listeners on visualViewport', () => {
    const rootRef = makeRef(makeRoot());

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, true));

    expect(window.visualViewport.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(window.visualViewport.addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    );
  });

  it('registers a resize listener on window', () => {
    const addWindowListener = jest.spyOn(window, 'addEventListener');
    const rootRef = makeRef(makeRoot());

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, true));

    expect(addWindowListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('removes all listeners on unmount', () => {
    const removeWindowListener = jest.spyOn(window, 'removeEventListener');
    const rootRef = makeRef(makeRoot());

    const { unmount } = renderHook(() =>
      useVtexCxVisualViewportCssVars(rootRef, true),
    );

    unmount();

    expect(window.visualViewport.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(window.visualViewport.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    );
    expect(removeWindowListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('syncs CSS vars when the visualViewport resize listener fires', () => {
    const root = makeRoot();
    const rootRef = makeRef(root);

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, true));

    root.style.setProperty.mockClear();

    window.visualViewport.height = 500;
    const [, resizeHandler] =
      window.visualViewport.addEventListener.mock.calls.find(
        ([event]) => event === 'resize',
      );

    act(() => {
      resizeHandler();
    });

    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-height',
      `${500 * 0.85}px`,
    );
  });
});

// ---------------------------------------------------------------------------
// useVtexCxVisualViewportCssVars — active without visualViewport
// ---------------------------------------------------------------------------

describe('useVtexCxVisualViewportCssVars — active, no visualViewport', () => {
  beforeEach(() => {
    setVisualViewport(null);
    setWindowSize(1280, 720);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls sync immediately using window dimensions', () => {
    const root = makeRoot();
    const rootRef = makeRef(root);

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, true));

    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-height',
      `${720 * 0.85}px`,
    );
    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-width',
      '1280px',
    );
  });

  it('registers only a window resize listener (no visualViewport listeners)', () => {
    const addWindowListener = jest.spyOn(window, 'addEventListener');
    const rootRef = makeRef(makeRoot());

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, true));

    expect(addWindowListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
    expect(addWindowListener).toHaveBeenCalledTimes(1);
  });

  it('removes the window resize listener on unmount', () => {
    const removeWindowListener = jest.spyOn(window, 'removeEventListener');
    const rootRef = makeRef(makeRoot());

    const { unmount } = renderHook(() =>
      useVtexCxVisualViewportCssVars(rootRef, true),
    );

    unmount();

    expect(removeWindowListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });

  it('syncs CSS vars when the window resize listener fires', () => {
    const root = makeRoot();
    const rootRef = makeRef(root);
    const addWindowListener = jest.spyOn(window, 'addEventListener');

    renderHook(() => useVtexCxVisualViewportCssVars(rootRef, true));

    root.style.setProperty.mockClear();

    setWindowSize(800, 600);
    const [, resizeHandler] = addWindowListener.mock.calls.find(
      ([event]) => event === 'resize',
    );

    act(() => {
      resizeHandler();
    });

    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-height',
      `${600 * 0.85}px`,
    );
    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-width',
      '800px',
    );
  });
});

// ---------------------------------------------------------------------------
// useVtexCxVisualViewportCssVars — active toggling
// ---------------------------------------------------------------------------

describe('useVtexCxVisualViewportCssVars — active toggling', () => {
  afterEach(() => {
    setVisualViewport(null);
    jest.restoreAllMocks();
  });

  it('starts syncing when active transitions from false to true', () => {
    const root = makeRoot();
    const rootRef = makeRef(root);

    const { rerender } = renderHook(
      ({ active }) => useVtexCxVisualViewportCssVars(rootRef, active),
      { initialProps: { active: false } },
    );

    expect(root.style.setProperty).not.toHaveBeenCalled();

    setWindowSize(1024, 768);
    rerender({ active: true });

    expect(root.style.setProperty).toHaveBeenCalledWith(
      '--vtex-cx-webchat-height',
      `${768 * 0.85}px`,
    );
  });

  it('removes listeners when active transitions from true to false', () => {
    const removeWindowListener = jest.spyOn(window, 'removeEventListener');
    setWindowSize(1024, 768);
    const rootRef = makeRef(makeRoot());

    const { rerender } = renderHook(
      ({ active }) => useVtexCxVisualViewportCssVars(rootRef, active),
      { initialProps: { active: true } },
    );

    rerender({ active: false });

    expect(removeWindowListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function),
    );
  });
});
