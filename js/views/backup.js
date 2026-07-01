import { PIN_LENGTH } from '../constants.js';
import { hasPin, isValidPin, verifyPin } from '../pin.js';
import { dom, getData, viewState, setImportFileInput, importFileInput, reloadData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome, updateAmountModeIndicator } from '../ui/chrome.js';
import { applyInitialTheme } from '../ui/theme.js';
import {
  buildPortfolioPreferences,
  importPortfolioSnapshot,
} from '../storage.js';
import {
  buildPlainBackupPayload,
  canUseBackupEncryption,
  decryptBackupFile,
  downloadBackupFile,
  encryptBackupPayload,
  parseBackupFile,
} from '../backup.js';
import {
  showPinFormError,
  runPinFormAction,
  pinFieldMarkup,
  bindPinForm,
} from '../ui/forms.js';

export function buildCurrentBackupPayload() {
  const data = getData();
  return buildPlainBackupPayload({
    companies: data.companies,
    projects: data.projects,
    preferences: buildPortfolioPreferences(),
  });
}

export function applyImportedBackup(snapshot) {
  importPortfolioSnapshot(snapshot);
  reloadData();
  applyInitialTheme();
  updateAmountModeIndicator();
}

export function ensureImportFileInput() {
  if (importFileInput) {
    return importFileInput;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.hidden = true;
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.value = '';

    if (file) {
      void handleImportBackupFile(file);
    }
  });
  document.body.appendChild(input);
  setImportFileInput(input);
  return input;
}

async function exportPlainBackup() {
  downloadBackupFile(buildCurrentBackupPayload());
}

export function handleExportBackupClick() {
  if (hasPin()) {
    if (!canUseBackupEncryption()) {
      window.alert('Encrypted export is not available in this browser.');
      return;
    }

    navigate('backup-export');
    return;
  }

  const exportAnyway = window.confirm(
    'No app PIN is set. Your export will not be encrypted, and anyone with the file can read your portfolio data.\n\nSet up a PIN under Security to encrypt backup files.\n\nExport without encryption anyway?',
  );

  if (exportAnyway) {
    void exportPlainBackup();
  }
}

export async function handleImportBackupFile(file) {
  let parsed;

  try {
    parsed = parseBackupFile(JSON.parse(await file.text()));
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Could not read backup file.');
    return;
  }

  if (parsed.encrypted) {
    if (!canUseBackupEncryption()) {
      window.alert('This encrypted backup cannot be opened in this browser.');
      return;
    }

    viewState.backupPayload = parsed.file;
    navigate('backup-import');
    return;
  }

  const replace = window.confirm(
    parsed.payload.encrypted === false
      ? 'This backup is not encrypted. Import will replace all companies and projects on this device. Continue?'
      : 'Import will replace all companies and projects on this device. Continue?',
  );

  if (!replace) {
    return;
  }

  try {
    applyImportedBackup(parsed.payload);
    window.alert('Portfolio imported successfully.');
    navigate('portfolio');
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Could not import backup.');
  }
}

export function renderBackupExport() {
  if (!hasPin()) {
    navigate('settings');
    return;
  }

  updateChrome({
    subtitle: 'Export backup',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <section class="card settings-group">
      <h2 class="section-title">Export backup</h2>
      <p class="field-hint">Enter your app PIN to create an encrypted backup file on your device.</p>
      <form class="form pin-form project-form" id="backup-export-form" novalidate>
        ${pinFieldMarkup('pin', 'App PIN')}
        <p class="field-error hidden" data-form-error="backup-export"></p>
        <button type="submit" class="btn btn-primary btn-block">Export encrypted file</button>
      </form>
    </section>
  `;

  const form = dom.appRoot.querySelector('#backup-export-form');

  if (!form) {
    return;
  }

  bindPinForm(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    void runPinFormAction(form, async () => {
      const pin = String(new FormData(form).get('pin') ?? '');

      if (!isValidPin(pin)) {
        showPinFormError(form, `PIN must be ${PIN_LENGTH} digits.`);
        return;
      }

      if (!(await verifyPin(pin))) {
        showPinFormError(form, 'Incorrect PIN. Try again.');
        return;
      }

      try {
        const encryptedFile = await encryptBackupPayload(buildCurrentBackupPayload(), pin);
        downloadBackupFile(encryptedFile);
        navigate('settings');
      } catch (error) {
        showPinFormError(form, error instanceof Error ? error.message : 'Could not export backup.');
      }
    });
  });
}

export function renderBackupImport() {
  if (!viewState.backupPayload) {
    navigate('settings');
    return;
  }

  updateChrome({
    subtitle: 'Import backup',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <section class="card settings-group">
      <h2 class="section-title">Import backup</h2>
      <p class="field-hint">This backup is encrypted. Enter the app PIN that was used when it was exported.</p>
      <form class="form pin-form project-form" id="backup-import-form" novalidate>
        ${pinFieldMarkup('pin', 'App PIN')}
        <p class="field-error hidden" data-form-error="backup-import"></p>
        <button type="submit" class="btn btn-primary btn-block">Decrypt and import</button>
      </form>
    </section>
  `;

  const form = dom.appRoot.querySelector('#backup-import-form');

  if (!form) {
    return;
  }

  bindPinForm(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    void runPinFormAction(form, async () => {
      const pin = String(new FormData(form).get('pin') ?? '');

      if (!isValidPin(pin)) {
        showPinFormError(form, `PIN must be ${PIN_LENGTH} digits.`);
        return;
      }

      let snapshot;

      try {
        snapshot = await decryptBackupFile(viewState.backupPayload, pin);
      } catch (error) {
        showPinFormError(
          form,
          error instanceof Error ? error.message : 'Could not decrypt backup file.',
        );
        return;
      }

      const replace = window.confirm(
        'Import will replace all companies and projects on this device. Continue?',
      );

      if (!replace) {
        return;
      }

      try {
        applyImportedBackup(snapshot);
        viewState.backupPayload = null;
        window.alert('Portfolio imported successfully.');
        navigate('portfolio');
      } catch (error) {
        showPinFormError(form, error instanceof Error ? error.message : 'Could not import backup.');
      }
    });
  });
}
