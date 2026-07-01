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
import { completeDataWipe } from './pinLock.js';

export function renderPinSetup() {
  updateChrome({
    subtitle: 'Set up PIN',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <form class="form pin-form project-form" id="pin-setup-form" novalidate>
      <p class="field-hint">Choose a ${PIN_LENGTH}-digit PIN. You will enter it each time you open the app.</p>
      ${pinFieldMarkup('pin', 'PIN', 'new-password')}
      ${pinFieldMarkup('confirmPin', 'Confirm PIN', 'new-password')}
      <p class="field-error hidden" data-form-error="pin-setup"></p>
      <button type="submit" class="btn btn-primary btn-block">Save PIN</button>
    </form>
  `;

  const form = dom.appRoot.querySelector('#pin-setup-form');

  if (!form) {
    return;
  }

  bindPinForm(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    void runPinFormAction(form, async () => {
      const formData = new FormData(form);
      const pin = String(formData.get('pin') ?? '');
      const confirmPin = String(formData.get('confirmPin') ?? '');

      if (!isValidPin(pin)) {
        showPinFormError(form, `PIN must be ${PIN_LENGTH} digits.`);
        return;
      }

      if (pin !== confirmPin) {
        showPinFormError(form, 'PINs do not match.');
        return;
      }

      await savePin(pin);
      setPinUnlocked(true);
      navigate('settings');
    });
  });
}

export function renderPinChange() {
  updateChrome({
    subtitle: 'Change PIN',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <form class="form pin-form project-form" id="pin-change-form" novalidate>
      ${pinFieldMarkup('currentPin', 'Current PIN', 'current-password')}
      ${pinFieldMarkup('newPin', 'New PIN', 'new-password')}
      ${pinFieldMarkup('confirmNewPin', 'Confirm New PIN', 'new-password')}
      <p class="field-error hidden" data-form-error="pin-change"></p>
      <button type="submit" class="btn btn-primary btn-block">Update PIN</button>
    </form>
  `;

  const form = dom.appRoot.querySelector('#pin-change-form');

  if (!form) {
    return;
  }

  bindPinForm(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    void runPinFormAction(form, async () => {
      const formData = new FormData(form);
      const currentPin = String(formData.get('currentPin') ?? '');
      const newPin = String(formData.get('newPin') ?? '');
      const confirmNewPin = String(formData.get('confirmNewPin') ?? '');

      if (!isValidPin(currentPin)) {
        showPinFormError(form, `Current PIN must be ${PIN_LENGTH} digits.`);
        return;
      }

      if (!(await verifyPin(currentPin))) {
        showPinFormError(form, 'Current PIN is incorrect.');
        return;
      }

      if (!isValidPin(newPin)) {
        showPinFormError(form, `New PIN must be ${PIN_LENGTH} digits.`);
        return;
      }

      if (newPin !== confirmNewPin) {
        showPinFormError(form, 'New PINs do not match.');
        return;
      }

      if (newPin === currentPin) {
        showPinFormError(form, 'New PIN must be different from your current PIN.');
        return;
      }

      await savePin(newPin);
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
    <form class="form pin-form project-form" id="pin-remove-form" novalidate>
      <p class="field-hint">Enter your current PIN to turn off app protection.</p>
      ${pinFieldMarkup('currentPin', 'Current PIN', 'current-password')}
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
