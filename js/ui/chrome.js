import { getAmountDisplayMode } from '../storage.js';
import { getAmountDisplayLabel } from '../calculations.js';
import { dom, viewState } from '../context.js';

export function updateAmountModeIndicator() {
  const indicator = document.getElementById('app-amount-mode');

  if (!indicator) {
    return;
  }

  indicator.textContent = `(${getAmountDisplayLabel(getAmountDisplayMode())})`;
}

export function updateChrome({ subtitle, showBack, showFab, fabAction, headerLabel, headerHandler }) {
  if (subtitle) {
    dom.pageSubtitle.textContent = subtitle;
    dom.pageSubtitle.classList.remove('hidden');
  } else {
    dom.pageSubtitle.textContent = '';
    dom.pageSubtitle.classList.add('hidden');
  }

  dom.backButton.classList.toggle('hidden', !showBack);
  dom.fabButton.classList.toggle('hidden', !showFab);
  document.body.classList.toggle('fab-visible', Boolean(showFab));

  if (showFab && fabAction) {
    dom.fabButton.onclick = fabAction;
  }

  if (headerLabel && headerHandler) {
    dom.headerAction.textContent = headerLabel;
    dom.headerAction.classList.remove('hidden');
    dom.headerAction.onclick = headerHandler;
  } else {
    dom.headerAction.textContent = '';
    dom.headerAction.classList.add('hidden');
    dom.headerAction.onclick = null;
  }

  dom.bottomNav.querySelectorAll('.nav-item').forEach((button) => {
    const nav = button.dataset.nav;
    const portfolioViews = [
      'portfolio',
      'company-detail',
      'project-detail',
      'company-form',
      'project-form',
    ];
    const isActive =
      (nav === 'portfolio' && portfolioViews.includes(viewState.view)) ||
      (nav === 'reminders' && viewState.view === 'reminders') ||
      (nav === 'reports' && viewState.view === 'reports') ||
      (nav === 'settings' && viewState.view === 'settings');
    button.classList.toggle('active', isActive);
  });

  updateAmountModeIndicator();
}

export function resetScrollPosition() {
  const active = document.activeElement;

  if (active instanceof HTMLElement) {
    active.blur();
  }

  dom.pinLock.scrollTop = 0;

  const scrollToTop = () => {
    dom.appRoot.scrollTop = 0;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  scrollToTop();
  requestAnimationFrame(() => {
    scrollToTop();
    void dom.appRoot.offsetHeight;
  });
  window.setTimeout(scrollToTop, 120);
  window.setTimeout(scrollToTop, 350);
}
