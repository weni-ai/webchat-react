import { createNavigationMonitor } from './navigationMonitor';

describe('createNavigationMonitor', () => {
  let onNavigate;
  let monitor;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  beforeEach(() => {
    onNavigate = jest.fn();
    monitor = createNavigationMonitor(onNavigate);
  });

  afterEach(() => {
    monitor.stop();
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  });

  describe('start/stop lifecycle', () => {
    it('activates monitoring on start()', () => {
      monitor.start();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('deactivates monitoring on stop()', () => {
      monitor.start();
      monitor.stop();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('can be restarted after stop()', () => {
      monitor.start();
      monitor.stop();
      monitor.start();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('VTEX IO pageView detection', () => {
    beforeEach(() => {
      monitor.start();
    });

    it('calls onNavigate for vtex:pageView messages from same window', () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { eventName: 'vtex:pageView' },
          source: window,
        }),
      );
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('ignores vtex:pageView messages from cross-origin sources', () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { eventName: 'vtex:pageView' },
          source: null,
        }),
      );
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('ignores messages with other eventNames', () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { eventName: 'vtex:productView' },
          source: window,
        }),
      );
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('ignores messages without an eventName', () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { foo: 'bar' },
          source: window,
        }),
      );
      expect(onNavigate).not.toHaveBeenCalled();
    });

    it('ignores messages with no data', () => {
      window.dispatchEvent(new MessageEvent('message'));
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe('history.pushState interception', () => {
    it('calls onNavigate when pushState is called', () => {
      monitor.start();
      history.pushState(null, '', '/new-page');
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('preserves original pushState behaviour', () => {
      monitor.start();
      history.pushState({ key: 'val' }, '', '/pushed');
      expect(location.pathname).toBe('/pushed');
    });
  });

  describe('history.replaceState interception', () => {
    it('calls onNavigate when replaceState is called', () => {
      monitor.start();
      history.replaceState(null, '', '/replaced');
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('preserves original replaceState behaviour', () => {
      const before = location.pathname;
      monitor.start();
      history.replaceState(null, '', '/replaced-path');
      expect(location.pathname).toBe('/replaced-path');
      history.replaceState(null, '', before);
    });
  });

  describe('popstate event', () => {
    it('calls onNavigate on popstate', () => {
      monitor.start();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup restores originals', () => {
    it('restores history.pushState after stop()', () => {
      monitor.start();
      expect(history.pushState).not.toBe(originalPushState);
      monitor.stop();
      expect(history.pushState).toBe(originalPushState);
    });

    it('restores history.replaceState after stop()', () => {
      monitor.start();
      expect(history.replaceState).not.toBe(originalReplaceState);
      monitor.stop();
      expect(history.replaceState).toBe(originalReplaceState);
    });
  });

  describe('double-start guard', () => {
    it('does not add duplicate listeners when start() is called twice', () => {
      monitor.start();
      monitor.start();
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    it('fires onNavigate only once per pushState when started twice', () => {
      monitor.start();
      monitor.start();
      history.pushState(null, '', '/dup');
      expect(onNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop when not started', () => {
    it('does not throw when stop() is called without start()', () => {
      expect(() => monitor.stop()).not.toThrow();
    });

    it('leaves history methods untouched when stop() is called without start()', () => {
      monitor.stop();
      expect(history.pushState).toBe(originalPushState);
      expect(history.replaceState).toBe(originalReplaceState);
    });
  });
});
