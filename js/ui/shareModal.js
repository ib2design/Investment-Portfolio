import { SHARE_PIN_LENGTH } from '../constants.js';
import { dom } from '../context.js';
import { escapeHtml } from './dom.js';
import { focusPinInput } from '../formInputs.js';
import {
  createEncryptedShareFile,
  sharePreparedFile,
} from '../share.js';
import {
  showPinFormError,
  sharePinFieldMarkup,
  bindPinForm,
} from './forms.js';

let pendingShare = null;
let preparedShare = null;

function dismissHelpModal() {
  if (!dom.helpModal) {
    return;
  }

  dom.helpModal.classList.add('hidden');
  dom.helpModal.setAttribute('aria-hidden', 'true');
}

function renderShareForm(companyName, projectName) {
  return `
    <p class="share-instructions">
      Share <strong>${escapeHtml(projectName)}</strong> from <strong>${escapeHtml(companyName)}</strong> as an encrypted file.
      Choose a ${SHARE_PIN_LENGTH}-digit Share PIN and send it to the recipient separately (text, call, etc.).
      The file is not saved on this device — only passed through your share app as an attachment.
    </p>
    <form class="form pin-form share-project-form" id="share-project-form" autocomplete="off" novalidate>
      ${sharePinFieldMarkup('sharePinEntry', 'Share PIN', SHARE_PIN_LENGTH)}
      ${sharePinFieldMarkup('sharePinAgain', 'Share PIN again', SHARE_PIN_LENGTH)}
      <p class="field-error hidden" data-form-error="share-project"></p>
      <button type="submit" class="btn btn-primary btn-block" id="share-project-submit">Create &amp; Share File</button>
    </form>
  `;
}

function readSharePins(form) {
  const sharePin = String(new FormData(form).get('sharePinEntry') ?? '');
  const againPin = String(new FormData(form).get('sharePinAgain') ?? '');

  return { sharePin, againPin };
}

function pinsAreReady(sharePin, againPin) {
  return (
    new RegExp(`^\\d{${SHARE_PIN_LENGTH}}$`).test(sharePin)
    && sharePin === againPin
  );
}

function clearPreparedShare() {
  preparedShare = null;
}

function scheduleSharePrepare(form) {
  const { sharePin, againPin } = readSharePins(form);

  if (!pinsAreReady(sharePin, againPin) || !pendingShare) {
    clearPreparedShare();
    return;
  }

  if (preparedShare?.sharePin === sharePin && preparedShare.file) {
    return;
  }

  if (preparedShare?.sharePin === sharePin && preparedShare.promise) {
    return;
  }

  const { company, project } = pendingShare;
  const preparePromise = createEncryptedShareFile({
    company,
    project,
    sharePin,
  })
    .then((file) => {
      if (preparedShare?.sharePin === sharePin) {
        preparedShare.file = file;
      }

      return file;
    })
    .catch((error) => {
      if (preparedShare?.sharePin === sharePin) {
        clearPreparedShare();
      }

      throw error;
    });

  preparedShare = {
    sharePin,
    file: null,
    promise: preparePromise,
  };
}

function bindSharePinAutoAdvance(form) {
  const entryInput = form.querySelector('#sharePinEntry');
  const againInput = form.querySelector('#sharePinAgain');

  if (!entryInput || !againInput) {
    return;
  }

  const handleInput = () => {
    scheduleSharePrepare(form);
  };

  entryInput.addEventListener('input', () => {
    handleInput();

    if (entryInput.value.length === SHARE_PIN_LENGTH) {
      focusPinInput(againInput);
    }
  });
  againInput.addEventListener('input', handleInput);
}

function setShareBusy(form, submitButton, busy) {
  form.dataset.busy = busy ? 'true' : '';

  if (submitButton) {
    submitButton.disabled = busy;
  }
}

function finishShareAttempt(form, submitButton, result) {
  if (!result.cancelled) {
    closeShareProjectModal();
    return;
  }

  setShareBusy(form, submitButton, false);
}

function handleShareResult(form, submitButton, result) {
  if (result.usedDownloadFallback) {
    showPinFormError(
      form,
      'Share sheet was unavailable, so the file was downloaded instead. Send it from Files or your downloads folder.',
    );
    window.setTimeout(() => closeShareProjectModal(), 2500);
    return;
  }

  finishShareAttempt(form, submitButton, result);
}

function mountShareForm() {
  if (!pendingShare) {
    return null;
  }

  clearPreparedShare();

  const { company, project } = pendingShare;
  dom.shareModalBody.innerHTML = renderShareForm(company.name, project.name);

  const form = dom.shareModal.querySelector('#share-project-form');
  const submitButton = dom.shareModal.querySelector('#share-project-submit');
  const entryInput = form?.querySelector('#sharePinEntry');

  if (!form) {
    return null;
  }

  bindPinForm(form, SHARE_PIN_LENGTH, {
    autocomplete: 'one-time-code',
    requireTap: false,
  });
  bindSharePinAutoAdvance(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (form.dataset.busy === 'true') {
      return;
    }

    showPinFormError(form, '');

    const { sharePin, againPin } = readSharePins(form);

    if (!new RegExp(`^\\d{${SHARE_PIN_LENGTH}}$`).test(sharePin) || !new RegExp(`^\\d{${SHARE_PIN_LENGTH}}$`).test(againPin)) {
      showPinFormError(form, `Share PIN must be ${SHARE_PIN_LENGTH} digits in both fields.`);
      return;
    }

    if (sharePin !== againPin) {
      showPinFormError(form, 'Share PINs do not match. Check both fields and try again.');
      return;
    }

    const launchShare = (file) => {
      setShareBusy(form, submitButton, true);

      void sharePreparedFile(file)
        .then((result) => handleShareResult(form, submitButton, result))
        .catch((error) => {
          console.error(error);
          showPinFormError(
            form,
            error instanceof Error ? error.message : 'Could not share this project.',
          );
          setShareBusy(form, submitButton, false);
        });
    };

    if (preparedShare?.sharePin === sharePin && preparedShare.file) {
      launchShare(preparedShare.file);
      return;
    }

    scheduleSharePrepare(form);

    if (!preparedShare?.promise) {
      showPinFormError(form, 'Could not prepare the share file. Try again.');
      return;
    }

    setShareBusy(form, submitButton, true);
    if (submitButton) {
      submitButton.textContent = 'Preparing file…';
    }

    void preparedShare.promise
      .then((file) => {
        if (submitButton) {
          submitButton.textContent = 'Create & Share File';
        }

        launchShare(file);
      })
      .catch((error) => {
        console.error(error);
        showPinFormError(
          form,
          error instanceof Error ? error.message : 'Could not prepare the share file.',
        );
        setShareBusy(form, submitButton, false);

        if (submitButton) {
          submitButton.textContent = 'Create & Share File';
        }
      });
  });

  return entryInput;
}

export function closeShareProjectModal() {
  if (!dom.shareModal) {
    return;
  }

  dom.shareModal.classList.add('hidden');
  dom.shareModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('help-modal-open');
  pendingShare = null;
  clearPreparedShare();
}

export function openShareProjectModal({ company, project }) {
  if (!dom.shareModal || !dom.shareModalBody || !company || !project) {
    return;
  }

  dismissHelpModal();
  pendingShare = { company, project };
  dom.shareModal.classList.remove('hidden');
  dom.shareModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('help-modal-open');

  const entryInput = mountShareForm();
  focusPinInput(entryInput, { delay: 50 });
}

export function bindShareProjectModal() {
  if (!dom.shareModal) {
    return;
  }

  dom.shareModal.querySelectorAll('[data-share-close]').forEach((element) => {
    element.addEventListener('click', closeShareProjectModal);
  });
}
