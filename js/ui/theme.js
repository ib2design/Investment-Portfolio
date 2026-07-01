import { getTheme, saveTheme } from '../storage.js';

export function setTheme(theme) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  saveTheme(resolved);
  document.documentElement.setAttribute('data-theme', resolved);
}

export function applyInitialTheme() {
  setTheme(getTheme());
}
