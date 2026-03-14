export function createNavigationMonitor(onNavigate) {
  let isActive = false;
  let originalPushState = null;
  let originalReplaceState = null;
  let messageHandler = null;
  let popstateHandler = null;

  function start() {
    if (isActive) {
      return;
    }

    isActive = true;

    originalPushState = history.pushState;
    originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      onNavigate();
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      onNavigate();
    };

    messageHandler = (event) => {
      if (event.data?.eventName === 'vtex:pageView') {
        onNavigate();
      }
    };

    popstateHandler = () => {
      onNavigate();
    };

    window.addEventListener('message', messageHandler);
    window.addEventListener('popstate', popstateHandler);
  }

  function stop() {
    if (!isActive) {
      return;
    }

    window.removeEventListener('message', messageHandler);
    window.removeEventListener('popstate', popstateHandler);

    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;

    originalPushState = null;
    originalReplaceState = null;
    messageHandler = null;
    popstateHandler = null;
    isActive = false;
  }

  return { start, stop };
}
