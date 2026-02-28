let setter = null;

export function registerSetter(fn) {
  setter = fn;
}

export function setStarters(starters) {
  if (setter) {
    setter(starters);
  }
}
