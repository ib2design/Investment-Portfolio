import { SHARE_PIN_LENGTH, SHARE_FILE_EXTENSION } from '../constants.js';
import { dom, viewState, reloadData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { canUseBackupEncryption } from '../backup.js';
import { decryptShareFile, isValidSharePin, parseShareFile } from '../share.js';
import {
  applyShareImport,
  buildShareImportPlan,
  buildShareImportReviewRows,
  buildShareImportSummary,
} from '../services/shareImport.js';
import {
  showPinFormError,
  runPinFormAction,
  sharePinFieldMarkup,
  bindPinForm,
} from '../ui/forms.js';

function clearShareImportState() {
  viewState.shareImportFile = null;
  viewState.shareImportPayload = null;
}

export function renderShareImportPin() {
  if (!viewState.shareImportFile) {
    navigate('settings');
    return;
  }

  updateChrome({
    subtitle: 'Import shared project',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <section class="card settings-group">
      <h2 class="section-title">Enter Share PIN</h2>
      <p class="field-hint">
        This file is encrypted. Enter the ${SHARE_PIN_LENGTH}-digit Share PIN sent with the
        <code>${SHARE_FILE_EXTENSION}</code> file.
      </p>
      <form class="form pin-form share-project-form project-form" id="share-import-pin-form" autocomplete="off" novalidate>
        ${sharePinFieldMarkup('shareImportPin', 'Share PIN', SHARE_PIN_LENGTH)}
        <p class="field-error hidden" data-form-error="share-import"></p>
        <button type="submit" class="btn btn-primary btn-block">Continue</button>
      </form>
    </section>
  `;

  const form = dom.appRoot.querySelector('#share-import-pin-form');

  if (!form) {
    return;
  }

  bindPinForm(form, SHARE_PIN_LENGTH, {
    autocomplete: 'one-time-code',
    requireTap: false,
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    void runPinFormAction(form, async () => {
      const sharePin = String(new FormData(form).get('shareImportPin') ?? '');

      if (!isValidSharePin(sharePin)) {
        showPinFormError(form, `Share PIN must be ${SHARE_PIN_LENGTH} digits.`);
        return;
      }

      try {
        viewState.shareImportPayload = await decryptShareFile(viewState.shareImportFile, sharePin);
        navigate('share-import-review');
      } catch (error) {
        showPinFormError(
          form,
          error instanceof Error ? error.message : 'Could not open this share file.',
        );
      }
    });
  });
}

export function renderShareImportReview() {
  if (!viewState.shareImportPayload) {
    navigate('settings');
    return;
  }

  const plan = buildShareImportPlan(viewState.shareImportPayload);
  const summary = buildShareImportSummary(plan);
  const reviewRows = buildShareImportReviewRows(viewState.shareImportPayload);

  updateChrome({
    subtitle: 'Review import',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <section class="card settings-group share-import-review">
      <h2 class="section-title">Review shared project</h2>
      <p class="field-hint share-import-summary">${summary}</p>
      <div class="detail-grid share-import-details">${reviewRows}</div>
      <div class="share-import-actions">
        <button type="button" class="btn btn-primary btn-block" id="share-import-confirm">Import project</button>
        <button type="button" class="btn btn-secondary btn-block" id="share-import-discard">Discard</button>
      </div>
    </section>
  `;

  dom.appRoot.querySelector('#share-import-discard')?.addEventListener('click', () => {
    clearShareImportState();
    navigate('settings');
  });

  dom.appRoot.querySelector('#share-import-confirm')?.addEventListener('click', () => {
    try {
      const result = applyShareImport(viewState.shareImportPayload);
      clearShareImportState();
      reloadData();
      navigate('project-detail', {
        companyId: result.companyId,
        projectId: result.projectId,
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not import this project.');
    }
  });
}

export async function handleImportShareFile(json) {
  let parsed;

  try {
    parsed = parseShareFile(json);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Could not read share file.');
    return;
  }

  if (parsed.encrypted) {
    if (!canUseBackupEncryption()) {
      window.alert('This encrypted share file cannot be opened in this browser.');
      return;
    }

    viewState.shareImportFile = parsed.file;
    viewState.shareImportPayload = null;
    navigate('share-import-pin');
    return;
  }

  viewState.shareImportFile = null;
  viewState.shareImportPayload = parsed.payload;
  navigate('share-import-review');
}
