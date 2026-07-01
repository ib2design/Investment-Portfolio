import { PIN_LENGTH, ERASE_DATA_CONFIRM_WORD } from '../constants.js';
import { isValidPin, verifyPin } from '../pin.js';
import { wipePortfolioAndPin } from '../storage.js';
import { dom, reloadData, resetViewStateAfterWipe, setPinUnlocked } from '../context.js';
import { resetScrollPosition } from '../ui/chrome.js';
import {
  showPinFormError,
  bindPinForm,
  eraseDataFormMarkup,
  bindEraseDataForm,
} from '../ui/forms.js';

let unlockRenderCallback = null;

export function setUnlockRenderCallback(callback) {
  unlockRenderCallback = callback;
}

export function setPinLockVisible(visible) {
  dom.pinLock.classList.toggle('hidden', !visible);
  dom.pinLock.setAttribute('aria-hidden', visible ? 'false' : 'true');
  document.body.classList.toggle('pin-locked', visible);

  if (visible) {
    dom.pinLock.scrollTop = 0;
    return;
  }

  dom.pinLock.scrollTop = 0;
  resetScrollPosition();
}

export function unlockApp() {
  setPinUnlocked(true);
  setPinLockVisible(false);
  unlockRenderCallback?.();
  resetScrollPosition();
}

export function completeDataWipe() {
  wipePortfolioAndPin();
  reloadData();
  resetViewStateAfterWipe();
  unlockApp();
}

export function bindPinForgotFlow() {
  const unlockPanel = dom.pinLock.querySelector('#pin-unlock-panel');
  const forgotPanel = dom.pinLock.querySelector('#pin-forgot-panel');
  const forgotToggle = dom.pinLock.querySelector('#pin-forgot-toggle');

  const showUnlockPanel = () => {
    forgotPanel.classList.add('hidden');
    unlockPanel.classList.remove('hidden');
    forgotToggle.classList.remove('hidden');
    showPinFormError(dom.pinLock.querySelector('#pin-unlock-form'), '');
    showPinFormError(forgotPanel.querySelector('[data-erase-data-form]'), '');
    dom.pinLock.querySelector('#unlock-pin')?.focus();
  };

  const showForgotPanel = () => {
    unlockPanel.classList.add('hidden');
    forgotPanel.classList.remove('hidden');
    forgotToggle.classList.add('hidden');
    const confirmInput = forgotPanel.querySelector('[data-erase-data-confirm]');
    if (confirmInput) {
      confirmInput.value = '';
      confirmInput.dispatchEvent(new Event('input'));
      confirmInput.focus();
    }
    showPinFormError(forgotPanel.querySelector('[data-erase-data-form]'), '');
  };

  forgotToggle?.addEventListener('click', () => {
    if (forgotToggle.disabled) {
      return;
    }

    showForgotPanel();
  });
  bindEraseDataForm(forgotPanel, ERASE_DATA_CONFIRM_WORD, showUnlockPanel, completeDataWipe);
}

export async function renderPinLock() {
  setPinLockVisible(true);

  dom.pinLock.innerHTML = `
    <section class="pin-lock-card card">
      <img src="app_icon.png" alt="" class="pin-lock-icon" width="56" height="56" />
      <div id="pin-unlock-panel">
        <h1 class="pin-lock-title">Enter PIN</h1>
        <p class="pin-lock-subtitle">Enter your ${PIN_LENGTH}-digit PIN to open Investment Portfolio.</p>
        <form class="form pin-form" id="pin-unlock-form" autocomplete="off" novalidate>
          <div class="field">
            <label for="unlock-pin">PIN</label>
            <input
              id="unlock-pin"
              name="unlock-pin"
              type="tel"
              class="pin-input"
              inputmode="numeric"
              pattern="[0-9]*"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="done"
              maxlength="${PIN_LENGTH}"
              required
            />
          </div>
          <p class="field-error hidden" data-form-error="pin-unlock"></p>
          <button type="submit" class="btn btn-primary btn-block" id="pin-unlock-submit">Unlock</button>
        </form>
        <button type="button" class="pin-forgot-link" id="pin-forgot-toggle">Forgot PIN?</button>
      </div>
      <div id="pin-forgot-panel" class="hidden">
        <h1 class="pin-lock-title">Forgot PIN?</h1>
        ${eraseDataFormMarkup(ERASE_DATA_CONFIRM_WORD)}
      </div>
    </section>
  `;

  const form = dom.pinLock.querySelector('#pin-unlock-form');
  const submitButton = dom.pinLock.querySelector('#pin-unlock-submit');
  const pinInput = dom.pinLock.querySelector('#unlock-pin');
  const forgotToggle = dom.pinLock.querySelector('#pin-forgot-toggle');
  bindPinForm(form);
  bindPinForgotFlow();

  const setUnlockBusy = (busy) => {
    if (submitButton) {
      submitButton.disabled = busy;
    }
    forgotToggle?.toggleAttribute('disabled', busy);
  };

  const focusPinInput = () => {
    window.setTimeout(() => pinInput?.focus(), 0);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (form.dataset.busy === 'true') {
      return;
    }

    const pin = new FormData(form).get('unlock-pin');

    if (!isValidPin(pin)) {
      showPinFormError(form, `PIN must be ${PIN_LENGTH} digits.`);
      focusPinInput();
      return;
    }

    form.dataset.busy = 'true';
    setUnlockBusy(true);

    void verifyPin(pin)
      .then((isValid) => {
        if (!isValid) {
          showPinFormError(form, 'Incorrect PIN. Try again.');
          if (pinInput) {
            pinInput.value = '';
          }
          focusPinInput();
          return;
        }

        unlockApp();
      })
      .catch((error) => {
        console.error(error);
        showPinFormError(form, 'Could not verify PIN. Try again.');
        focusPinInput();
      })
      .finally(() => {
        form.dataset.busy = '';
        setUnlockBusy(false);
      });
  });

  focusPinInput();
}
