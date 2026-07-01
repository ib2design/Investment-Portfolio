import {
  AMOUNT_DISPLAY,
  PROJECT_FILTER,
  PIN_LENGTH,
  SHARE_FILE_EXTENSION,
} from '../constants.js';
import { hasPin } from '../pin.js';
import { dom } from '../context.js';
import { navigate, render } from '../router.js';
import { updateChrome, updateAmountModeIndicator } from '../ui/chrome.js';
import { setTheme } from '../ui/theme.js';
import { openHelpModal } from '../ui/help.js';
import {
  getTheme,
  getAmountDisplayMode,
  getProjectFilter,
  saveProjectFilter,
  saveAmountDisplayMode,
} from '../storage.js';
import {
  ensureImportFileInput,
  handleExportBackupClick,
} from './backup.js';

export function renderSettings() {
  const currentTheme = getTheme();
  const displayMode = getAmountDisplayMode();
  const projectFilter = getProjectFilter();

  updateChrome({
    showBack: false,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <section class="card settings-group">
      <div class="settings-top-bar" role="group" aria-label="Help and appearance">
        <button type="button" class="btn btn-help" id="settings-help-button">Help / FAQ</button>
        <button type="button" class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">\u{1F506} Light</button>
        <button type="button" class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">\u263E Dark</button>
      </div>
    </section>
    <section class="card settings-group" style="margin-top: 8px;">
      <h2 class="section-title">Portfolio</h2>
      <div class="theme-options theme-options--three">
        <button type="button" class="theme-option ${projectFilter === PROJECT_FILTER.ALL ? 'active' : ''}" data-project-filter="${PROJECT_FILTER.ALL}">Show Both</button>
        <button type="button" class="theme-option ${projectFilter === PROJECT_FILTER.ACTIVE ? 'active' : ''}" data-project-filter="${PROJECT_FILTER.ACTIVE}">Show Active</button>
        <button type="button" class="theme-option ${projectFilter === PROJECT_FILTER.PAST ? 'active' : ''}" data-project-filter="${PROJECT_FILTER.PAST}">Show Past</button>
      </div>
      <p class="field-hint">Active includes ongoing and matured projects. Past is sold, closed loss, and partial recovered.</p>
    </section>
    <section class="card settings-group" style="margin-top: 8px;">
      <h2 class="section-title">Amounts</h2>
      <div class="theme-options">
        <button type="button" class="theme-option ${displayMode === AMOUNT_DISPLAY.GROUP ? 'active' : ''}" data-display-mode="${AMOUNT_DISPLAY.GROUP}">Group totals</button>
        <button type="button" class="theme-option ${displayMode === AMOUNT_DISPLAY.MY_SHARE ? 'active' : ''}" data-display-mode="${AMOUNT_DISPLAY.MY_SHARE}">My share</button>
      </div>
      <p class="field-hint">My share = company total ÷ partners.</p>
    </section>
    <section class="card settings-group" style="margin-top: 8px;">
      <h2 class="section-title">Backup</h2>
      <p class="field-hint">Export or import your full portfolio backup, or import a shared project file (${SHARE_FILE_EXTENSION}).</p>
      <div class="security-options security-options--two">
        <button type="button" class="btn btn-secondary security-action" id="settings-export-backup">Export</button>
        <button type="button" class="btn btn-secondary security-action" id="settings-import-backup">Import</button>
      </div>
    </section>
    <section class="card settings-group" style="margin-top: 8px;">
      <h2 class="section-title">Security</h2>
      <p class="field-hint">${hasPin() ? 'Manage your app unlock PIN.' : `Set a ${PIN_LENGTH}-digit PIN to protect the app.`}</p>
      ${
        hasPin()
          ? `
      <div class="security-options security-options--three">
        <button type="button" class="btn btn-secondary security-action" id="pin-change-button">Change PIN</button>
        <button type="button" class="btn btn-secondary security-action" id="settings-remove-pin">Remove PIN</button>
        <button type="button" class="btn btn-danger security-action" id="settings-erase-data">Erase All Data</button>
      </div>
      `
          : `
      <div class="security-options security-options--two">
        <button type="button" class="btn btn-secondary security-action" id="pin-setup-button">Create a Pin</button>
        <button type="button" class="btn btn-danger security-action" id="settings-erase-data">Erase All Data</button>
      </div>
      `
      }
    </section>
  `;

  dom.appRoot.querySelector('#pin-setup-button')?.addEventListener('click', () => {
    navigate('pin-setup');
  });

  dom.appRoot.querySelector('#pin-change-button')?.addEventListener('click', () => {
    navigate('pin-change');
  });

  dom.appRoot.querySelector('#settings-remove-pin')?.addEventListener('click', () => {
    navigate('pin-remove');
  });

  dom.appRoot.querySelector('#settings-erase-data')?.addEventListener('click', () => {
    navigate('erase-data');
  });

  dom.appRoot.querySelector('#settings-export-backup')?.addEventListener('click', handleExportBackupClick);

  dom.appRoot.querySelector('#settings-import-backup')?.addEventListener('click', () => {
    ensureImportFileInput().click();
  });

  dom.appRoot.querySelector('#settings-help-button')?.addEventListener('click', openHelpModal);

  dom.appRoot.querySelectorAll('[data-project-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      saveProjectFilter(button.dataset.projectFilter);
      render();
    });
  });

  dom.appRoot.querySelectorAll('[data-display-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      saveAmountDisplayMode(button.dataset.displayMode);
      updateAmountModeIndicator();
      render();
    });
  });

  dom.appRoot.querySelectorAll('.theme-option[data-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      setTheme(button.dataset.theme);
      renderSettings();
    });
  });
}
