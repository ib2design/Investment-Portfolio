import { PIN_LENGTH } from '../constants.js';
import { bindPinInput } from '../formInputs.js';
import { escapeHtml } from './dom.js';

export function showPinFormError(form, message) {
  const error = form?.querySelector('[data-form-error]');

  if (!error) {
    return;
  }

  error.textContent = message;
  error.classList.toggle('hidden', !message);
}

export async function runPinFormAction(form, action) {
  showPinFormError(form, '');

  try {
    await action();
  } catch (error) {
    console.error(error);
    showPinFormError(form, 'Could not save your PIN. Try again.');
  }
}

export function pinFieldMarkup(id, label, autocomplete) {
  return `
    <div class="field" data-field="${id}">
      <label for="${id}">${escapeHtml(label)}</label>
      <input
        id="${id}"
        name="${id}"
        type="password"
        class="pin-input"
        inputmode="numeric"
        autocomplete="${autocomplete}"
        maxlength="${PIN_LENGTH}"
        required
      />
    </div>
  `;
}

export function bindPinForm(form) {
  form.querySelectorAll('.pin-input').forEach((input) => bindPinInput(input, PIN_LENGTH));
}

export function clearFormErrors(form) {
  form.querySelectorAll('[data-field-error]').forEach((element) => {
    element.textContent = '';
    element.classList.add('hidden');
  });

  form.querySelectorAll('.field.has-error').forEach((element) => {
    element.classList.remove('has-error');
  });
}

export function setFieldError(form, fieldKey, message) {
  const fieldElement = form.querySelector(`[data-field="${fieldKey}"]`);
  const errorElement = form.querySelector(`[data-field-error="${fieldKey}"]`);

  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.toggle('hidden', !message);
  }

  if (fieldElement) {
    fieldElement.classList.toggle('has-error', Boolean(message));
  }
}

export function applyFormErrors(form, errors) {
  clearFormErrors(form);

  const fieldKeys = Object.keys(errors);

  fieldKeys.forEach((fieldKey) => {
    setFieldError(form, fieldKey, errors[fieldKey]);
  });

  if (fieldKeys.length === 0) {
    return true;
  }

  form.querySelector(`[data-field="${fieldKeys[0]}"]`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });

  return false;
}

export function bindFormFieldErrors(form) {
  const clearFieldError = (event) => {
    const fieldKey = event.target.closest('[data-field]')?.dataset.field;

    if (fieldKey) {
      setFieldError(form, fieldKey, '');
    }
  };

  form.addEventListener('input', clearFieldError);
  form.addEventListener('change', clearFieldError);
}

export function eraseDataFormMarkup(confirmPhrase) {
  return `
    <p class="erase-data-warning">
      This will permanently erase all companies, projects, and your PIN from this device.
      This cannot be undone.
    </p>
    <form class="form pin-form erase-data-form" data-erase-data-form>
      <div class="field">
        <label>Type <strong>${escapeHtml(confirmPhrase)}</strong> to confirm</label>
        <input
          name="confirmPhrase"
          type="text"
          class="erase-data-confirm-input"
          data-erase-data-confirm
          autocomplete="off"
          spellcheck="false"
          required
        />
      </div>
      <p class="field-error hidden" data-form-error="erase-data"></p>
      <button type="submit" class="btn btn-danger btn-block" data-erase-data-submit disabled>
        Erase all data
      </button>
    </form>
    <button type="button" class="btn btn-secondary btn-block erase-data-cancel" data-erase-data-cancel>
      Cancel
    </button>
  `;
}

export function bindEraseDataForm(scope, confirmPhrase, onCancel, onConfirm) {
  if (!scope) {
    return;
  }

  const form = scope.querySelector('[data-erase-data-form]');
  const confirmInput = scope.querySelector('[data-erase-data-confirm]');
  const submitButton = scope.querySelector('[data-erase-data-submit]');
  const cancelButton = scope.querySelector('[data-erase-data-cancel]');

  if (!form || !confirmInput || !submitButton) {
    return;
  }

  const isConfirmed = () => confirmInput.value.trim() === confirmPhrase;

  const syncSubmitButton = () => {
    submitButton.disabled = !isConfirmed();
  };

  const handleCancel = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onCancel?.();
  };

  cancelButton?.addEventListener('click', handleCancel);
  confirmInput.addEventListener('input', syncSubmitButton);
  syncSubmitButton();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    showPinFormError(form, '');

    if (!isConfirmed()) {
      showPinFormError(form, `Type ${confirmPhrase} to confirm.`);
      return;
    }

    onConfirm?.();
  });
}
