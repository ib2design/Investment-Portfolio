import { PIN_LENGTH, ERASE_DATA_CONFIRM_WORD } from '../constants.js';
import { isValidPin, verifyPin, savePin, removePin, hasPin } from '../pin.js';
import { dom, setPinUnlocked } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import {
  showPinFormError,
  runPinFormAction,
  pinFieldMarkup,
  bindPinForm,
  eraseDataFormMarkup,
  bindEraseDataForm,
} from '../ui/forms.js';
import { focusPinInput } from '../formInputs.js';
import { completeDataWipe } from './pinLock.js';

function mountPinSetupStep(step, draftPin = '') {
  if (step === 1) {
    dom.appRoot.innerHTML = `
      <form class="form pin-form project-form" id="pin-setup-form" autocomplete="off" novalidate>
        <p class="field-hint">Choose a ${PIN_LENGTH}-digit PIN. You will enter it each time you open the app.</p>
        ${pinFieldMarkup('setupCode', 'Enter PIN')}
        <p class="field-error hidden" data-form-error="pin-setup"></p>
        <button type="submit" class="btn btn-primary btn-block">Continue</button>
      </form>
    `;

    const form = dom.appRoot.querySelector('#pin-setup-form');
    bindPinForm(form);
    focusPinInput(form.querySelector('.pin-input'));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      showPinFormError(form, '');

      const pin = String(new FormData(form).get('setupCode') ?? '');

      if (!isValidPin(pin)) {
        showPinFormError(form, `PIN must be ${PIN_LENGTH} digits.`);
        return;
      }

      mountPinSetupStep(2, pin);
    });
    return;
  }

  dom.appRoot.innerHTML = `
    <form class="form pin-form project-form" id="pin-setup-form" autocomplete="off" novalidate>
      <p class="field-hint">Re-enter your ${PIN_LENGTH}-digit PIN to confirm.</p>
      ${pinFieldMarkup('setupCodeConfirm', 'Confirm PIN')}
      <p class="field-error hidden" data-form-error="pin-setup"></p>
      <button type="submit" class="btn btn-primary btn-block">Save PIN</button>
      <button type="button" class="btn btn-secondary btn-block" id="pin-setup-back">Back</button>
    </form>
  `;

  const form = dom.appRoot.querySelector('#pin-setup-form');
  bindPinForm(form);
  focusPinInput(form.querySelector('.pin-input'));

  dom.appRoot.querySelector('#pin-setup-back')?.addEventListener('click', () => {
    mountPinSetupStep(1);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    void runPinFormAction(form, async () => {
      const confirmPin = String(new FormData(form).get('setupCodeConfirm') ?? '');

      if (!isValidPin(confirmPin)) {
        showPinFormError(form, `PIN must be ${PIN_LENGTH} digits.`);
        return;
      }

      if (confirmPin !== draftPin) {
        showPinFormError(form, 'PINs do not match. Tap Back and try again.');
        return;
      }

      await savePin(confirmPin);
      setPinUnlocked(true);
      navigate('settings');
    });
  });
}

export function renderPinSetup() {
  updateChrome({
    subtitle: 'Set up PIN',
    showBack: true,
    showFab: false,
  });

  mountPinSetupStep(1);
}

export function renderPinChange() {
  updateChrome({
    subtitle: 'Change PIN',
    showBack: true,
    showFab: false,
  });

  mountPinChangeStep(1);
}

function mountPinChangeStep(step, state = {}) {
  if (step === 1) {
    dom.appRoot.innerHTML = `
      <form class="form pin-form project-form" id="pin-change-form" autocomplete="off" novalidate>
        ${pinFieldMarkup('currentCode', 'Current PIN')}
        <p class="field-error hidden" data-form-error="pin-change"></p>
        <button type="submit" class="btn btn-primary btn-block">Continue</button>
      </form>
    `;

    const form = dom.appRoot.querySelector('#pin-change-form');
    bindPinForm(form);
    focusPinInput(form.querySelector('.pin-input'));

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      void runPinFormAction(form, async () => {
        const currentPin = String(new FormData(form).get('currentCode') ?? '');

        if (!isValidPin(currentPin)) {
          showPinFormError(form, `Current PIN must be ${PIN_LENGTH} digits.`);
          return;
        }

        if (!(await verifyPin(currentPin))) {
          showPinFormError(form, 'Current PIN is incorrect.');
          return;
        }

        mountPinChangeStep(2, { currentPin });
      });
    });
    return;
  }

  if (step === 2) {
    dom.appRoot.innerHTML = `
      <form class="form pin-form project-form" id="pin-change-form" autocomplete="off" novalidate>
        ${pinFieldMarkup('newCode', 'New PIN')}
        <p class="field-error hidden" data-form-error="pin-change"></p>
        <button type="submit" class="btn btn-primary btn-block">Continue</button>
        <button type="button" class="btn btn-secondary btn-block" id="pin-change-back">Back</button>
      </form>
    `;

    const form = dom.appRoot.querySelector('#pin-change-form');
    bindPinForm(form);
    focusPinInput(form.querySelector('.pin-input'));

    dom.appRoot.querySelector('#pin-change-back')?.addEventListener('click', () => {
      mountPinChangeStep(1);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      void runPinFormAction(form, async () => {
        const newPin = String(new FormData(form).get('newCode') ?? '');

        if (!isValidPin(newPin)) {
          showPinFormError(form, `New PIN must be ${PIN_LENGTH} digits.`);
          return;
        }

        if (newPin === state.currentPin) {
          showPinFormError(form, 'New PIN must be different from your current PIN.');
          return;
        }

        mountPinChangeStep(3, { ...state, newPin });
      });
    });
    return;
  }

  dom.appRoot.innerHTML = `
    <form class="form pin-form project-form" id="pin-change-form" autocomplete="off" novalidate>
      <p class="field-hint">Re-enter your new ${PIN_LENGTH}-digit PIN.</p>
      ${pinFieldMarkup('newCodeConfirm', 'Confirm New PIN')}
      <p class="field-error hidden" data-form-error="pin-change"></p>
      <button type="submit" class="btn btn-primary btn-block">Update PIN</button>
      <button type="button" class="btn btn-secondary btn-block" id="pin-change-back">Back</button>
    </form>
  `;

  const form = dom.appRoot.querySelector('#pin-change-form');
  bindPinForm(form);
  focusPinInput(form.querySelector('.pin-input'));

  dom.appRoot.querySelector('#pin-change-back')?.addEventListener('click', () => {
    mountPinChangeStep(2, state);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    void runPinFormAction(form, async () => {
      const confirmNewPin = String(new FormData(form).get('newCodeConfirm') ?? '');

      if (!isValidPin(confirmNewPin)) {
        showPinFormError(form, `New PIN must be ${PIN_LENGTH} digits.`);
        return;
      }

      if (confirmNewPin !== state.newPin) {
        showPinFormError(form, 'New PINs do not match. Tap Back and try again.');
        return;
      }

      await savePin(confirmNewPin);
      setPinUnlocked(true);
      navigate('settings');
    });
  });
}

export function renderPinRemove() {
  if (!hasPin()) {
    navigate('settings');
    return;
  }

  updateChrome({
    subtitle: 'Remove PIN',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <form class="form pin-form project-form" id="pin-remove-form" autocomplete="off" novalidate>
      <p class="field-hint">Enter your current PIN to turn off app protection.</p>
      ${pinFieldMarkup('currentPin', 'Current PIN')}
      <p class="field-error hidden" data-form-error="pin-remove"></p>
      <button type="submit" class="btn btn-danger btn-block">Remove PIN</button>
    </form>
  `;

  const form = dom.appRoot.querySelector('#pin-remove-form');

  if (!form) {
    return;
  }

  bindPinForm(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    void runPinFormAction(form, async () => {
      const currentPin = String(new FormData(form).get('currentPin') ?? '');

      if (!isValidPin(currentPin)) {
        showPinFormError(form, `PIN must be ${PIN_LENGTH} digits.`);
        return;
      }

      if (!(await verifyPin(currentPin))) {
        showPinFormError(form, 'Current PIN is incorrect.');
        return;
      }

      removePin();
      setPinUnlocked(true);
      navigate('settings');
    });
  });
}

export function renderEraseData() {
  updateChrome({
    subtitle: 'Erase all data',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <section class="card settings-group">
      <h2 class="section-title">Erase all data</h2>
      ${eraseDataFormMarkup(ERASE_DATA_CONFIRM_WORD)}
    </section>
  `;

  bindEraseDataForm(
    dom.appRoot,
    ERASE_DATA_CONFIRM_WORD,
    () => navigate('settings'),
    completeDataWipe,
  );
}
