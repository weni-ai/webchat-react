import { useEffect } from 'react';

export function syncVtexCxVisualViewportCssVars(root) {
  if (!root) return;
  const vv = window.visualViewport;
  const innerH = window.innerHeight;
  const innerW = window.innerWidth;

  if (vv) {
    root.style.setProperty('--vtex-cx-webchat-height', `${vv.height * 0.85}px`);
    root.style.setProperty('--vtex-cx-webchat-width', `${vv.width}px`);
  } else {
    root.style.setProperty('--vtex-cx-webchat-height', `${innerH * 0.85}px`);
    root.style.setProperty('--vtex-cx-webchat-width', `${innerW}px`);
  }
}

export function useVtexCxVisualViewportCssVars(rootRef, active) {
  useEffect(() => {
    if (!active) return undefined;

    const root = rootRef.current;
    if (!root) return undefined;

    const sync = () => syncVtexCxVisualViewportCssVars(root);
    sync();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', sync);
      vv.addEventListener('scroll', sync);
    }
    window.addEventListener('resize', sync);

    return () => {
      if (vv) {
        vv.removeEventListener('resize', sync);
        vv.removeEventListener('scroll', sync);
      }
      window.removeEventListener('resize', sync);
    };
  }, [active, rootRef]);
}
