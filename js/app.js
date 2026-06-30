import {
  APR_TYPES,
  CURRENCY,
  AMOUNT_DISPLAY,
  LIMITS,
  PROJECT_FILTER,
  PROJECT_TYPES,
  PIN_LENGTH,
  ERASE_DATA_CONFIRM_WORD,
  PROJECT_STATUS,
  PROJECT_STATUS_OPTIONS,
  REAL_ESTATE_STATUS_OPTIONS,
  PROJECT_DISPLAY_STATUS,
  REMINDER_WINDOW_DAYS,
} from './constants.js';
import {
  calculateExpectedReturn,
  calculateMaturityTotal,
  calculateActualReturn,
  calculateActualLoss,
  getProjectOutcome,
  getProjectEndDate,
  isRealEstateProject,
  isInterestBasedProject,
  isRealEstateSold,
  isProjectClosed,
  isSoldProjectStatus,
  isCompletedProject,
  calculateUnrealizedGain,
  formatDate,
  formatDateSpanCountdown,
  formatDisplayUsdCompact,
  formatMaturationCountdown,
  formatPercent,
  formatUsd,
  formatUsdCompact,
  getAmountDisplayLabel,
  getProjectFilterLabel,
  getCompanyProjectsSectionTitle,
  getProjectInvestmentAmount,
  getDisplayAmount,
  getProjectTypeIcon,
  getProjectTypeLabel,
  getProjectTypeReportLabel,
  getProjectStatusLabel,
  getProjectStatusReportLabel,
  isClosedProjectStatus,
  resolveProjectStatus,
} from './calculations.js';
import { companyColorStyle } from './colors.js';
import {
  bindDateInputs,
  bindDecimalInput,
  bindIntegerInput,
  bindPinInput,
  getTodayIsoDate,
} from './formInputs.js';
import { hasPin, isValidPin, verifyPin, savePin, removePin } from './pin.js';
import {
  createId,
  deleteCompany,
  deleteProject,
  getCompany,
  getProject,
  getProjectsForCompany,
  getNextColorIndex,
  getAmountDisplayMode,
  getProjectFilter,
  getTheme,
  loadData,
  nowIso,
  saveProjectFilter,
  saveAmountDisplayMode,
  saveTheme,
  upsertCompany,
  upsertProject,
  wipePortfolioAndPin,
} from './storage.js';

const appRoot = document.getElementById('app-root');
const pageSubtitle = document.getElementById('page-subtitle');
const backButton = document.getElementById('back-button');
const headerAction = document.getElementById('header-action');
const bottomNav = document.getElementById('bottom-nav');
const fabButton = document.getElementById('fab-button');
const pinLock = document.getElementById('pin-lock');
const helpModal = document.getElementById('help-modal');
const helpModalBody = document.getElementById('help-modal-body');

let data = loadData();
let pinUnlocked = false;

const state = {
  view: 'portfolio',
  companyId: null,
  projectId: null,
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function companyPartnerIcon(partnerCount) {
  const count = Number(partnerCount) || 1;
  return count <= 1 ? '\u{1F464}' : '\u{1F465}';
}

function companyProjectMetaMarkup(companyId, partnerCount) {
  const projectCount = getVisibleProjectsForCompany(companyId).length;
  const noProjects = getProjectsForCompany(data, companyId).length === 0;
  const warning = noProjects
    ? '<span class="company-no-projects-icon" aria-hidden="true">\u{26A0}</span> '
    : '';

  return `${warning}${projectCount} project${projectCount === 1 ? '' : 's'} · ${partnerCount} partner${partnerCount === 1 ? '' : 's'}`;
}

function helpContentMarkup() {
  return '<div class="settings-help" id="settings-help"></div>';
}

function setHelpModalVisible(visible) {
  if (!helpModal) {
    return;
  }

  helpModal.classList.toggle('hidden', !visible);
  helpModal.setAttribute('aria-hidden', visible ? 'false' : 'true');
  document.body.classList.toggle('help-modal-open', visible);
}

function openHelpModal() {
  if (!helpModalBody) {
    return;
  }

  helpModalBody.innerHTML = helpContentMarkup();
  setHelpModalVisible(true);
}

function closeHelpModal() {
  setHelpModalVisible(false);
}

function bindHelpModal() {
  if (!helpModal) {
    return;
  }

  helpModal.querySelectorAll('[data-help-close]').forEach((element) => {
    element.addEventListener('click', closeHelpModal);
  });
}

function fieldLabel(text, required = false) {
  return `${escapeHtml(text)}${
    required ? '<span class="required-mark" aria-hidden="true">*</span>' : ''
  }`;
}

function showPinFormError(form, message) {
  const error = form?.querySelector('[data-form-error]');

  if (!error) {
    return;
  }

  error.textContent = message;
  error.classList.toggle('hidden', !message);
}

async function runPinFormAction(form, action) {
  showPinFormError(form, '');

  try {
    await action();
  } catch (error) {
    console.error(error);
    showPinFormError(form, 'Could not save your PIN. Try again.');
  }
}

function pinFieldMarkup(id, label, autocomplete) {
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

function bindPinForm(form) {
  form.querySelectorAll('.pin-input').forEach((input) => bindPinInput(input, PIN_LENGTH));
}

function resetScrollPosition() {
  const active = document.activeElement;

  if (active instanceof HTMLElement) {
    active.blur();
  }

  pinLock.scrollTop = 0;

  const scrollToTop = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  scrollToTop();
  requestAnimationFrame(() => {
    scrollToTop();
    void appRoot.offsetHeight;
  });
  window.setTimeout(scrollToTop, 120);
  window.setTimeout(scrollToTop, 350);
}

function setPinLockVisible(visible) {
  pinLock.classList.toggle('hidden', !visible);
  pinLock.setAttribute('aria-hidden', visible ? 'false' : 'true');
  document.body.classList.toggle('pin-locked', visible);

  if (visible) {
    pinLock.scrollTop = 0;
    return;
  }

  pinLock.scrollTop = 0;
  resetScrollPosition();
}

function unlockApp() {
  pinUnlocked = true;
  setPinLockVisible(false);
  render();
  resetScrollPosition();
}

function completeDataWipe() {
  wipePortfolioAndPin();
  data = loadData();
  state.view = 'portfolio';
  state.companyId = null;
  state.projectId = null;
  unlockApp();
}

function eraseDataFormMarkup(confirmPhrase) {
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

function bindEraseDataForm(scope, confirmPhrase, onCancel) {
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

    completeDataWipe();
  });
}

function bindPinForgotFlow() {
  const unlockPanel = pinLock.querySelector('#pin-unlock-panel');
  const forgotPanel = pinLock.querySelector('#pin-forgot-panel');
  const forgotToggle = pinLock.querySelector('#pin-forgot-toggle');

  const showUnlockPanel = () => {
    forgotPanel.classList.add('hidden');
    unlockPanel.classList.remove('hidden');
    forgotToggle.classList.remove('hidden');
    showPinFormError(pinLock.querySelector('#pin-unlock-form'), '');
    showPinFormError(forgotPanel.querySelector('[data-erase-data-form]'), '');
    pinLock.querySelector('#unlock-pin')?.focus();
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
  bindEraseDataForm(forgotPanel, ERASE_DATA_CONFIRM_WORD, showUnlockPanel);
}

async function renderPinLock() {
  setPinLockVisible(true);

  pinLock.innerHTML = `
    <section class="pin-lock-card card">
      <img src="app_icon.png" alt="" class="pin-lock-icon" width="56" height="56" />
      <div id="pin-unlock-panel">
        <h1 class="pin-lock-title">Enter PIN</h1>
        <p class="pin-lock-subtitle">Enter your ${PIN_LENGTH}-digit PIN to open Investment Portfolio.</p>
        <form class="form pin-form" id="pin-unlock-form" novalidate>
          <div class="field">
            <label for="unlock-pin">PIN</label>
            <input
              id="unlock-pin"
              name="pin"
              type="password"
              class="pin-input"
              inputmode="numeric"
              autocomplete="current-password"
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

  const form = pinLock.querySelector('#pin-unlock-form');
  const submitButton = pinLock.querySelector('#pin-unlock-submit');
  const pinInput = pinLock.querySelector('#unlock-pin');
  const forgotToggle = pinLock.querySelector('#pin-forgot-toggle');
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

    const pin = new FormData(form).get('pin');

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

function renderEraseData() {
  updateChrome({
    subtitle: 'Erase all data',
    showBack: true,
    showFab: false,
  });

  appRoot.innerHTML = `
    <section class="card settings-group">
      <h2 class="section-title">Erase all data</h2>
      ${eraseDataFormMarkup(ERASE_DATA_CONFIRM_WORD)}
    </section>
  `;

  bindEraseDataForm(appRoot, ERASE_DATA_CONFIRM_WORD, () => navigate('settings'));
}

function renderPinSetup() {
  updateChrome({
    subtitle: 'Set up PIN',
    showBack: true,
    showFab: false,
  });

  appRoot.innerHTML = `
    <form class="form pin-form project-form" id="pin-setup-form" novalidate>
      <p class="field-hint">Choose a ${PIN_LENGTH}-digit PIN. You will enter it each time you open the app.</p>
      ${pinFieldMarkup('pin', 'PIN', 'new-password')}
      ${pinFieldMarkup('confirmPin', 'Confirm PIN', 'new-password')}
      <p class="field-error hidden" data-form-error="pin-setup"></p>
      <button type="submit" class="btn btn-primary btn-block">Save PIN</button>
    </form>
  `;

  const form = appRoot.querySelector('#pin-setup-form');

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
      pinUnlocked = true;
      navigate('settings');
    });
  });
}

function renderPinChange() {
  updateChrome({
    subtitle: 'Change PIN',
    showBack: true,
    showFab: false,
  });

  appRoot.innerHTML = `
    <form class="form pin-form project-form" id="pin-change-form" novalidate>
      ${pinFieldMarkup('currentPin', 'Current PIN', 'current-password')}
      ${pinFieldMarkup('newPin', 'New PIN', 'new-password')}
      ${pinFieldMarkup('confirmNewPin', 'Confirm New PIN', 'new-password')}
      <p class="field-error hidden" data-form-error="pin-change"></p>
      <button type="submit" class="btn btn-primary btn-block">Update PIN</button>
    </form>
  `;

  const form = appRoot.querySelector('#pin-change-form');

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
      pinUnlocked = true;
      navigate('settings');
    });
  });
}

function renderPinRemove() {
  if (!hasPin()) {
    navigate('settings');
    return;
  }

  updateChrome({
    subtitle: 'Remove PIN',
    showBack: true,
    showFab: false,
  });

  appRoot.innerHTML = `
    <form class="form pin-form project-form" id="pin-remove-form" novalidate>
      <p class="field-hint">Enter your current PIN to turn off app protection.</p>
      ${pinFieldMarkup('currentPin', 'Current PIN', 'current-password')}
      <p class="field-error hidden" data-form-error="pin-remove"></p>
      <button type="submit" class="btn btn-danger btn-block">Remove PIN</button>
    </form>
  `;

  const form = appRoot.querySelector('#pin-remove-form');

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
      pinUnlocked = true;
      navigate('settings');
    });
  });
}

function truncate(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizeDocumentationUrl(value) {
  return String(value ?? '').trim();
}

const UNSAFE_DOCUMENTATION_PROTOCOL = /^(javascript|data|vbscript):/i;

function getDocumentationHref(url) {
  const normalized = normalizeDocumentationUrl(url);

  if (!normalized || UNSAFE_DOCUMENTATION_PROTOCOL.test(normalized)) {
    return '';
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) {
    return normalized;
  }

  return `https://${normalized}`;
}

function isAllowedDocumentationUrl(url) {
  const normalized = normalizeDocumentationUrl(url);

  if (!normalized) {
    return false;
  }

  return !UNSAFE_DOCUMENTATION_PROTOCOL.test(normalized);
}

function validateDocumentationUrlField(url, errors, field = 'documentationUrl') {
  const normalized = normalizeDocumentationUrl(url);

  if (!normalized) {
    return '';
  }

  if (!isAllowedDocumentationUrl(normalized)) {
    errors[field] = 'This link is not allowed.';
  }

  return normalized;
}

function documentationLinkHtml(url) {
  const href = getDocumentationHref(url);

  if (!href) {
    return '';
  }

  return `<a class="detail-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" data-external-link>Documentation Online</a>`;
}

function detailDocumentationRow(url) {
  const link = documentationLinkHtml(url);

  if (!link) {
    return '';
  }

  return detailRow('Documentation', link);
}

function clearFormErrors(form) {
  form.querySelectorAll('[data-field-error]').forEach((element) => {
    element.textContent = '';
    element.classList.add('hidden');
  });

  form.querySelectorAll('.field.has-error').forEach((element) => {
    element.classList.remove('has-error');
  });
}

function setFieldError(form, fieldKey, message) {
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

function applyFormErrors(form, errors) {
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

function bindFormFieldErrors(form) {
  const clearFieldError = (event) => {
    const fieldKey = event.target.closest('[data-field]')?.dataset.field;

    if (fieldKey) {
      setFieldError(form, fieldKey, '');
    }
  };

  form.addEventListener('input', clearFieldError);
  form.addEventListener('change', clearFieldError);
}

function getAmountRecoveredError(status, amount, amountRecovered) {
  if (status === PROJECT_STATUS.CLOSED_LOSS) {
    return '';
  }

  if (Number.isNaN(amountRecovered) || amountRecovered < 0) {
    return 'Amount recovered must be zero or greater.';
  }

  if (status === PROJECT_STATUS.PARTIAL_RECOVERED) {
    if (amountRecovered <= 0) {
      return 'Partial recovered requires an amount greater than zero.';
    }

    if (!Number.isNaN(amount) && amount > 0 && amountRecovered >= amount) {
      return 'Partial recovered must be less than the invested amount.';
    }
  }

  if (status === PROJECT_STATUS.MATURED && amountRecovered <= 0) {
    return 'Matured requires a recovered amount greater than zero.';
  }

  return '';
}

function statusRequiresAmountRecovered(status) {
  return (
    status === PROJECT_STATUS.MATURED || status === PROJECT_STATUS.PARTIAL_RECOVERED
  );
}

function validateProjectForm(values) {
  const errors = {};
  const {
    name,
    type,
    typeOther,
    dateInvested,
    maturationDate,
    loanPayoffDate,
    estimatedValue,
    amount,
    aprPercent,
    status,
    closed,
    closedDate,
    amountRecovered,
    soldDate,
    soldPrice,
    reminderDate,
    documentationUrl,
  } = values;
  const isRealEstate = isRealEstateProject(type);
  const isSold = isRealEstate && isSoldProjectStatus(status);
  const interestClosed = !isRealEstate && closed;

  if (!name) {
    errors.name = 'Project name is required.';
  }

  if (type === 'other' && !typeOther) {
    errors.typeOther = 'Please describe the other project type.';
  }

  if (!dateInvested) {
    errors.dateInvested = 'Investment date is required.';
  }

  if (isRealEstate) {
    if (isSold) {
      if (!soldDate) {
        errors.soldDate = 'Date sold is required.';
      }

      if (Number.isNaN(soldPrice) || soldPrice < 0) {
        errors.soldPrice = 'Total net proceeds must be zero or greater.';
      }
    } else if (
      loanPayoffDate &&
      dateInvested &&
      new Date(loanPayoffDate) <= new Date(dateInvested)
    ) {
      errors.loanPayoffDate = 'Loan payoff date must be after the investment date.';
    }

    if (!isSold && estimatedValue !== null && estimatedValue !== undefined && estimatedValue !== '') {
      if (Number.isNaN(estimatedValue) || estimatedValue <= 0) {
        errors.estimatedValue = 'Estimated value must be greater than zero.';
      }
    }
  } else {
    if (!maturationDate) {
      errors.maturationDate = 'Maturation date is required.';
    } else if (dateInvested && new Date(maturationDate) <= new Date(dateInvested)) {
      errors.maturationDate = 'Maturation date must be after the investment date.';
    }

    if (Number.isNaN(aprPercent) || aprPercent < 0) {
      errors.aprPercent = 'APR is required and must be zero or greater.';
    }
  }

  if (!amount || amount <= 0 || Number.isNaN(amount)) {
    errors.amount = 'Total investment must be greater than zero.';
  }

  if (!isSold && !interestClosed && reminderDate && reminderDate < getTodayIsoDate()) {
    errors.reminderDate = 'Reminder date cannot be in the past.';
  }

  if (interestClosed) {
    if (!closedDate) {
      errors.closedDate = 'Date closed is required for this status.';
    }

    if (statusRequiresAmountRecovered(status)) {
      const recoveredError = getAmountRecoveredError(status, amount, amountRecovered);

      if (recoveredError) {
        errors.amountRecovered = recoveredError;
      }
    }
  }

  validateDocumentationUrlField(documentationUrl, errors);

  return errors;
}

function validateCompanyForm(values) {
  const errors = {};
  const { name, partnerCount, documentationUrl } = values;

  if (!name) {
    errors.name = 'Company name is required.';
  }

  if (!Number.isInteger(partnerCount) || partnerCount < 1) {
    errors.partnerCount = 'Partner count must be at least 1.';
  }

  validateDocumentationUrlField(documentationUrl, errors);

  return errors;
}

function setTheme(theme) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  saveTheme(resolved);
  document.documentElement.setAttribute('data-theme', resolved);
}

function applyInitialTheme() {
  setTheme(getTheme());
}

function resetViewAfterNavigation() {
  resetScrollPosition();
}

function navigate(view, options = {}) {
  if (hasPin() && !pinUnlocked && view !== 'pin-setup' && view !== 'pin-change') {
    return;
  }

  state.view = view;
  state.companyId = options.companyId ?? null;
  state.projectId = options.projectId ?? null;
  render();
  resetViewAfterNavigation();
}

function getVisibleProjects(projects) {
  const filter = getProjectFilter();

  if (filter === PROJECT_FILTER.ACTIVE) {
    return projects.filter((project) => !isCompletedProject(project));
  }

  if (filter === PROJECT_FILTER.PAST) {
    return projects.filter((project) => isCompletedProject(project));
  }

  return projects;
}

function getVisibleProjectsForCompany(companyId) {
  return getVisibleProjects(getProjectsForCompany(data, companyId));
}

function companyHasNoProjects(companyId) {
  return getProjectsForCompany(data, companyId).length === 0;
}

function isCompanyVisible(companyId) {
  if (companyHasNoProjects(companyId)) {
    return true;
  }

  return getVisibleProjectsForCompany(companyId).length > 0;
}

function getVisibleCompanies() {
  return data.companies.filter((company) => isCompanyVisible(company.id));
}

function getProjectMetrics(project) {
  const displayStatus = resolveProjectStatus(project, REMINDER_WINDOW_DAYS);

  if (isRealEstateProject(project.type)) {
    return {
      expectedReturn: 0,
      maturityTotal: project.amount,
      unrealizedGain: calculateUnrealizedGain(project.amount, project.estimatedValue),
      displayStatus,
    };
  }

  const expectedReturn = calculateExpectedReturn(
    project.amount,
    project.aprPercent,
    project.aprType,
    project.dateInvested,
    project.maturationDate,
  );

  return {
    expectedReturn,
    maturityTotal: calculateMaturityTotal(project.amount, expectedReturn),
    unrealizedGain: null,
    displayStatus,
  };
}

function getAttentionProjects() {
  return getVisibleProjects(data.projects)
    .map((project) => {
      const company = getCompany(data, project.companyId);
      const metrics = getProjectMetrics(project);
      const { displayStatus } = metrics;

      if (
        displayStatus !== PROJECT_DISPLAY_STATUS.OVERDUE &&
        displayStatus !== PROJECT_STATUS.AT_RISK
      ) {
        return null;
      }

      return { project, company, metrics };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const priority = {
        [PROJECT_DISPLAY_STATUS.OVERDUE]: 0,
        [PROJECT_STATUS.AT_RISK]: 1,
      };
      return priority[a.metrics.displayStatus] - priority[b.metrics.displayStatus];
    });
}

function companyTotalInvested(companyId, displayMode = getAmountDisplayMode()) {
  const company = getCompany(data, companyId);

  if (!company) {
    return 0;
  }

  return getProjectsForCompany(data, companyId).reduce(
    (sum, project) =>
      sum + getDisplayAmount(getProjectInvestmentAmount(project), company.partnerCount, displayMode),
    0,
  );
}

function getCompanyDetailTotals(companyId, displayMode = getAmountDisplayMode()) {
  const company = getCompany(data, companyId);

  if (!company) {
    return { invested: 0, activeInvested: 0, realized: 0, expected: 0 };
  }

  const totals = { invested: 0, activeInvested: 0, realized: 0, expected: 0 };

  getProjectsForCompany(data, companyId).forEach((project) => {
    const metrics = getProjectMetrics(project);
    const share = (amount) => getDisplayAmount(amount, company.partnerCount, displayMode);
    const investment = share(getProjectInvestmentAmount(project));

    totals.invested += investment;

    if (!isProjectClosed(project)) {
      totals.activeInvested += investment;
    }

    if (isProjectClosed(project)) {
      const netGainLoss = getProjectOutcome(project).actualReturn;

      if (!Number.isNaN(Number(netGainLoss))) {
        totals.realized += share(netGainLoss);
      }

      return;
    }

    const expectedGainLoss = getProjectReportGainLoss(project, metrics);

    if (expectedGainLoss !== null && expectedGainLoss !== undefined && !Number.isNaN(Number(expectedGainLoss))) {
      totals.expected += share(expectedGainLoss);
    }
  });

  return totals;
}

function companyDetailStatsMarkup(companyId) {
  const { invested, activeInvested, realized, expected } = getCompanyDetailTotals(companyId);
  const realizedClass = realized > 0 ? 'gain' : realized < 0 ? 'loss' : '';
  const expectedClass = expected > 0 ? 'gain' : expected < 0 ? 'loss' : '';

  return `
    <div class="company-detail-stats">
      <div class="company-detail-stat">
        <span class="company-detail-stat-label">Total Invested</span>
        <span class="company-detail-stat-value">${escapeHtml(formatUsdCompact(invested))}</span>
      </div>
      <div class="company-detail-stat">
        <span class="company-detail-stat-label">Active Investment</span>
        <span class="company-detail-stat-value">${escapeHtml(formatUsdCompact(activeInvested))}</span>
      </div>
      <div class="company-detail-stat">
        <span class="company-detail-stat-label">Net Gain / Loss</span>
        <span class="company-detail-stat-value ${realizedClass}">${escapeHtml(formatReportMoney(realized))}</span>
      </div>
      <div class="company-detail-stat">
        <span class="company-detail-stat-label">Expected Return</span>
        <span class="company-detail-stat-value ${expectedClass}">${escapeHtml(formatReportMoney(expected))}</span>
      </div>
    </div>
  `;
}

function projectStatusBadge(displayStatus) {
  const label = getProjectStatusLabel(displayStatus);
  const statusClass = displayStatus.replace(/_/g, '-');

  return `<span class="badge status-${statusClass}">${escapeHtml(label)}</span>`;
}

function projectCardMain(project, extraMeta = '') {
  return `
    <div class="project-card-main">
      <span class="project-type-icon" aria-hidden="true">${getProjectTypeIcon(project.type)}</span>
      <div class="project-card-text">
        <h2 class="card-title">${escapeHtml(project.name)}</h2>
        ${extraMeta}
      </div>
    </div>
  `;
}

function projectCountdown(project) {
  return `<p class="card-countdown">${escapeHtml(formatMaturationCountdown(getProjectEndDate(project)))}</p>`;
}

function projectMaturityDate(project, displayStatus) {
  const overdueClass = displayStatus === PROJECT_DISPLAY_STATUS.OVERDUE ? ' overdue' : '';

  return `<p class="card-maturity-date${overdueClass}">${escapeHtml(formatDate(getProjectEndDate(project)))}</p>`;
}

function getProjectCardAmountDisplay(project) {
  const company = getCompany(data, project.companyId);
  const partnerCount = company?.partnerCount ?? 1;
  const displayMode = getAmountDisplayMode();

  if (isProjectClosed(project)) {
    const netGainLoss = getDisplayAmount(
      getProjectOutcome(project).actualReturn,
      partnerCount,
      displayMode,
    );
    const valueClass = netGainLoss > 0 ? 'gain' : netGainLoss < 0 ? 'loss' : '';

    return {
      text: formatReportMoney(netGainLoss),
      className: valueClass,
    };
  }

  return {
    text: formatDisplayUsdCompact(project.amount, partnerCount, displayMode),
    className: '',
  };
}

function renderProjectSummaryCard(project, metrics, options = {}) {
  const { extraMeta = '', showAmount = true, dataAttrs = '' } = options;
  const badge = projectStatusBadge(metrics.displayStatus);
  const amountDisplay = getProjectCardAmountDisplay(project);
  const isRealEstate = isRealEstateProject(project.type);

  if (isRealEstate) {
    return `
      <article class="card clickable project-summary-card project-summary-card--re" ${dataAttrs}>
        <div class="project-summary-card-body">
          <div class="card-row project-card-compact">
            <span class="project-type-icon" aria-hidden="true">${getProjectTypeIcon(project.type)}</span>
            <h2 class="card-title project-card-compact-title">${escapeHtml(project.name)}</h2>
            ${badge}
            ${showAmount ? `<p class="card-amount ${amountDisplay.className}">${escapeHtml(amountDisplay.text)}</p>` : ''}
          </div>
          ${extraMeta ? `<div class="project-card-compact-meta">${extraMeta}</div>` : ''}
        </div>
        <span class="project-card-chevron" aria-hidden="true">→</span>
      </article>
    `;
  }

  return `
    <article class="card clickable project-summary-card" ${dataAttrs}>
      <div class="project-summary-card-body">
        <div class="card-row project-card-top">
          ${projectCardMain(project, extraMeta)}
          ${showAmount ? `<p class="card-amount ${amountDisplay.className}">${escapeHtml(amountDisplay.text)}</p>` : ''}
        </div>
        <div class="project-card-main project-card-bottom">
          <span class="project-type-icon project-type-icon-spacer" aria-hidden="true"></span>
          <div class="project-card-status-row">
            ${projectCountdown(project)}
            ${badge}
            ${projectMaturityDate(project, metrics.displayStatus)}
          </div>
        </div>
      </div>
      <span class="project-card-chevron" aria-hidden="true">→</span>
    </article>
  `;
}

function detailRow(label, value, { highlight = false, valueClass = '' } = {}) {
  const classes = ['detail-value', highlight ? 'highlight' : '', valueClass].filter(Boolean).join(' ');

  return `
    <div class="detail-item">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="${classes}">${value}</span>
    </div>
  `;
}

function detailRowIf(label, show, value, options = {}) {
  if (!show) {
    return '';
  }

  return detailRow(label, value, options);
}

function gainLossStyle(value) {
  const amount = Number(value);

  if (amount < 0) {
    return { valueClass: 'loss' };
  }

  if (amount > 0) {
    return { highlight: true };
  }

  return {};
}

function updateAmountModeIndicator() {
  const indicator = document.getElementById('app-amount-mode');

  if (!indicator) {
    return;
  }

  indicator.textContent = `(${getAmountDisplayLabel(getAmountDisplayMode())})`;
}

function updateChrome({ subtitle, showBack, showFab, fabAction, headerLabel, headerHandler }) {
  if (subtitle) {
    pageSubtitle.textContent = subtitle;
    pageSubtitle.classList.remove('hidden');
  } else {
    pageSubtitle.textContent = '';
    pageSubtitle.classList.add('hidden');
  }

  backButton.classList.toggle('hidden', !showBack);
  fabButton.classList.toggle('hidden', !showFab);
  document.body.classList.toggle('fab-visible', Boolean(showFab));

  if (showFab && fabAction) {
    fabButton.onclick = fabAction;
  }

  if (headerLabel && headerHandler) {
    headerAction.textContent = headerLabel;
    headerAction.classList.remove('hidden');
    headerAction.onclick = headerHandler;
  } else {
    headerAction.textContent = '';
    headerAction.classList.add('hidden');
    headerAction.onclick = null;
  }

  bottomNav.querySelectorAll('.nav-item').forEach((button) => {
    const nav = button.dataset.nav;
    const portfolioViews = [
      'portfolio',
      'company-detail',
      'project-detail',
      'company-form',
      'project-form',
    ];
    const isActive =
      (nav === 'portfolio' && portfolioViews.includes(state.view)) ||
      (nav === 'reminders' && state.view === 'reminders') ||
      (nav === 'reports' && state.view === 'reports') ||
      (nav === 'settings' && state.view === 'settings');
    button.classList.toggle('active', isActive);
  });

  updateAmountModeIndicator();
}

function renderPortfolio() {
  const displayMode = getAmountDisplayMode();

  updateChrome({
    showBack: false,
    showFab: true,
    fabAction: () => navigate('company-form'),
  });

  if (data.companies.length === 0) {
    appRoot.innerHTML = `
      <section class="empty-state">
        <p>No companies yet. Add your first company to start tracking investments.</p>
        <button type="button" class="btn btn-primary" data-action="add-company">Add Company</button>
      </section>
    `;

    appRoot.querySelector('[data-action="add-company"]').onclick = () => navigate('company-form');
    return;
  }

  const companies = getVisibleCompanies();

  if (companies.length === 0) {
    appRoot.innerHTML = `
      <section class="empty-state">
        <p>No companies match the current project filter. Change Show Both, Show Active, or Show Past in Settings.</p>
      </section>
    `;
    return;
  }

  const cards = companies
    .map((company) => {
      const investedTotal = companyTotalInvested(company.id, displayMode);

      return `
        <article class="card company-card clickable" style="${companyColorStyle(company.colorIndex)}" data-company-id="${escapeHtml(company.id)}">
          <div class="card-row">
            <div class="company-card-heading">
              <span class="company-partner-icon" aria-hidden="true">${companyPartnerIcon(company.partnerCount)}</span>
              <div class="company-card-text">
                <h2 class="card-title">${escapeHtml(company.name)}</h2>
                <p class="card-meta">${companyProjectMetaMarkup(company.id, company.partnerCount)}</p>
              </div>
            </div>
            <div class="card-amount">${escapeHtml(formatUsdCompact(investedTotal))}</div>
          </div>
        </article>
      `;
    })
    .join('');

  appRoot.innerHTML = `<section class="card-list">${cards}</section>`;

  appRoot.querySelectorAll('[data-company-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate('company-detail', { companyId: card.dataset.companyId });
    });
  });
}

function renderCompanyDetail(companyId) {
  const company = getCompany(data, companyId);

  if (!company) {
    navigate('portfolio');
    return;
  }

  const projects = getVisibleProjectsForCompany(companyId);
  const projectCount = projects.length;
  const noProjects = getProjectsForCompany(data, companyId).length === 0;
  const noProjectsWarning = noProjects
    ? '<span class="company-no-projects-icon" aria-hidden="true">\u{26A0}</span> '
    : '';

  updateChrome({
    showBack: true,
    showFab: true,
    fabAction: () => navigate('project-form', { companyId }),
    headerLabel: 'Edit',
    headerHandler: () => navigate('company-form', { companyId }),
  });

  const projectCards =
    projects.length === 0
      ? `<div class="empty-state"><p>No projects yet for this company.</p></div>`
      : projects
          .map((project) => {
            const metrics = getProjectMetrics(project);

            return renderProjectSummaryCard(project, metrics, {
              dataAttrs: `data-project-id="${escapeHtml(project.id)}"`,
            });
          })
          .join('');
  const companyDocLink = documentationLinkHtml(company.documentationUrl);

  appRoot.innerHTML = `
    <section class="card company-card company-detail-card" style="${companyColorStyle(company.colorIndex)}; margin-bottom: 12px;">
      <div class="company-detail-header">
        <span class="company-partner-icon" aria-hidden="true">${companyPartnerIcon(company.partnerCount)}</span>
        <p class="company-detail-line">
          ${noProjectsWarning}<span class="company-detail-name">${escapeHtml(company.name)}</span><span class="company-detail-meta"> · ${projectCount} project${projectCount === 1 ? '' : 's'} · ${company.partnerCount} partner${company.partnerCount === 1 ? '' : 's'}</span>
        </p>
      </div>
      ${companyDetailStatsMarkup(companyId)}
      ${companyDocLink ? `<p class="card-meta company-detail-doc">${companyDocLink}</p>` : ''}
    </section>
    <h2 class="section-title">${escapeHtml(getCompanyProjectsSectionTitle(getProjectFilter()))}</h2>
    <section class="card-list">${projectCards}</section>
  `;

  appRoot.querySelectorAll('[data-project-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate('project-detail', { companyId, projectId: card.dataset.projectId });
    });
  });
}

function renderProjectDetail(projectId) {
  const project = getProject(data, projectId);

  if (!project) {
    navigate('portfolio');
    return;
  }

  const projectFilter = getProjectFilter();

  if (projectFilter === PROJECT_FILTER.ACTIVE && isCompletedProject(project)) {
    navigate('company-detail', { companyId: project.companyId });
    return;
  }

  if (projectFilter === PROJECT_FILTER.PAST && !isCompletedProject(project)) {
    navigate('company-detail', { companyId: project.companyId });
    return;
  }

  const company = getCompany(data, project.companyId);
  const metrics = getProjectMetrics(project);
  const partnerCount = company?.partnerCount ?? 1;
  const isRealEstate = isRealEstateProject(project.type);
  const endDate = getProjectEndDate(project);
  const isSold = isRealEstateSold(project);
  const isClosed = isProjectClosed(project);
  const outcome = isClosed ? getProjectOutcome(project) : null;
  const myShareAmount = getDisplayAmount(project.amount, partnerCount, AMOUNT_DISPLAY.MY_SHARE);
  const myShareExpectedReturn = getDisplayAmount(
    metrics.expectedReturn,
    partnerCount,
    AMOUNT_DISPLAY.MY_SHARE,
  );
  const myShareMaturityTotal = getDisplayAmount(
    metrics.maturityTotal,
    partnerCount,
    AMOUNT_DISPLAY.MY_SHARE,
  );
  const myRecovered = outcome
    ? getDisplayAmount(outcome.amountRecovered, partnerCount, AMOUNT_DISPLAY.MY_SHARE)
    : 0;
  const myActualReturn = outcome
    ? getDisplayAmount(outcome.actualReturn, partnerCount, AMOUNT_DISPLAY.MY_SHARE)
    : 0;
  const myActualLoss = outcome
    ? getDisplayAmount(outcome.actualLoss, partnerCount, AMOUNT_DISPLAY.MY_SHARE)
    : 0;
  const hideExpectedNumbers =
    isRealEstate ||
    project.status === PROJECT_STATUS.CLOSED_LOSS ||
    project.status === PROJECT_STATUS.PARTIAL_RECOVERED;
  const isClosedLoss = project.status === PROJECT_STATUS.CLOSED_LOSS;
  const isPartialRecovered = project.status === PROJECT_STATUS.PARTIAL_RECOVERED;
  const showRecoveredAmounts =
    isClosed && !isClosedLoss && !isPartialRecovered;
  const unrealizedGain = metrics.unrealizedGain;
  const myUnrealizedGain =
    unrealizedGain === null
      ? null
      : getDisplayAmount(unrealizedGain, partnerCount, AMOUNT_DISPLAY.MY_SHARE);
  const showValueMetrics =
    isRealEstate &&
    !isSold &&
    project.estimatedValue !== null &&
    unrealizedGain !== null;
  const myEstimatedValue = showValueMetrics
    ? getDisplayAmount(project.estimatedValue, partnerCount, AMOUNT_DISPLAY.MY_SHARE)
    : 0;
  const closedEndDate = isRealEstate ? project.soldDate : project.closedDate;
  const hasLoss = Boolean(outcome?.actualLoss > 0);
  const showExpectedTime = Boolean(!isClosed && project.dateInvested && endDate);
  const showApr = Boolean(
    !isRealEstate && project.aprPercent !== null && project.aprPercent !== undefined && project.aprType,
  );
  const showNetProceeds = Boolean(isRealEstate && isClosed && project.soldPrice !== null && project.soldPrice !== undefined);

  const totalFinancialRows = `
    ${
      isClosedLoss
        ? detailRow('Total Loss', escapeHtml(formatUsd(project.amount)), { valueClass: 'loss' })
        : detailRow('Total Investment', escapeHtml(formatUsd(project.amount)))
    }
    ${
      showValueMetrics
        ? `
          ${detailRow('Estimated Value', escapeHtml(formatUsd(project.estimatedValue)))}
          ${detailRow('Unrealized Gain', escapeHtml(formatUsd(unrealizedGain)))}
        `
        : ''
    }
    ${
      hideExpectedNumbers
        ? ''
        : `
          ${detailRow(
            'Total Expected Return',
            escapeHtml(formatUsd(metrics.expectedReturn)),
            gainLossStyle(metrics.expectedReturn),
          )}
          ${detailRow('Total at Maturity', escapeHtml(formatUsd(metrics.maturityTotal)))}
        `
    }
    ${
      isClosed
        ? `
          ${
            isRealEstate
              ? `
                  ${detailRowIf(
                    'Total Net Proceeds',
                    showNetProceeds,
                    escapeHtml(formatUsd(project.soldPrice)),
                  )}
                  ${detailRowIf(
                    'Total Gain / Loss',
                    showNetProceeds,
                    escapeHtml(formatUsd(outcome.actualReturn)),
                    hasLoss ? { valueClass: 'loss' } : { highlight: true },
                  )}
                `
              : isPartialRecovered
                ? `
                  ${detailRow('Amount Recovered', escapeHtml(formatUsd(outcome.amountRecovered)))}
                  ${detailRow('Total Loss', escapeHtml(formatUsd(outcome.actualLoss)), { valueClass: 'loss' })}
                `
              : showRecoveredAmounts
                ? detailRow('Amount Recovered', escapeHtml(formatUsd(outcome.amountRecovered)))
                : ''
          }
          ${
            outcome.actualLoss > 0
              ? ''
              : !isRealEstate
                ? detailRow(
                    'Actual Return',
                    escapeHtml(formatUsd(outcome.actualReturn)),
                  )
                : ''
          }
        `
        : ''
    }
  `;

  const myFinancialRows = `
    ${
      isClosedLoss
        ? detailRow('My Loss', escapeHtml(formatUsd(myShareAmount)), { valueClass: 'loss' })
        : detailRow('My Investment', escapeHtml(formatUsd(myShareAmount)))
    }
    ${
      showValueMetrics
        ? `
          ${detailRow('My Estimated Value', escapeHtml(formatUsd(myEstimatedValue)))}
          ${detailRow(
            myUnrealizedGain < 0 ? 'My Unrealized Loss' : 'My Unrealized Gain',
            escapeHtml(formatUsd(myUnrealizedGain)),
          )}
        `
        : ''
    }
    ${
      hideExpectedNumbers
        ? ''
        : `
          ${detailRow(
            'My Expected Return',
            escapeHtml(formatUsd(myShareExpectedReturn)),
            isClosed ? {} : gainLossStyle(myShareExpectedReturn),
          )}
          ${detailRow('My Total at Maturity', escapeHtml(formatUsd(myShareMaturityTotal)))}
        `
    }
    ${
      isClosed
        ? `
          ${
            isRealEstate
              ? detailRowIf(
                  'My Net Proceeds',
                  showNetProceeds,
                  escapeHtml(formatUsd(myRecovered)),
                )
              : isPartialRecovered
                ? `
                  ${detailRow('My Amount Recovered', escapeHtml(formatUsd(myRecovered)))}
                  ${detailRow('My Loss', escapeHtml(formatUsd(myActualLoss)), { valueClass: 'loss' })}
                `
              : showRecoveredAmounts
                ? detailRow('My Recovered', escapeHtml(formatUsd(myRecovered)))
                : ''
          }
          ${
            isClosedLoss || isPartialRecovered
              ? ''
              : isRealEstate
                ? detailRowIf(
                    'My Gain / Loss',
                    showNetProceeds,
                    escapeHtml(formatUsd(myActualReturn)),
                    hasLoss ? { valueClass: 'loss' } : { highlight: true },
                  )
                : hasLoss
                  ? detailRow('My Actual Loss', escapeHtml(formatUsd(myActualLoss)), { valueClass: 'loss' })
                  : detailRow('My Actual Return', escapeHtml(formatUsd(myActualReturn)))
          }
        `
        : ''
    }
  `;

  updateChrome({
    showBack: true,
    showFab: false,
    headerLabel: 'Edit',
    headerHandler: () =>
      navigate('project-form', { companyId: project.companyId, projectId: project.id }),
  });

  appRoot.innerHTML = `
    <section class="card detail-grid detail-card">
      <div class="detail-card-header">
        ${projectStatusBadge(metrics.displayStatus)}
        <button type="button" class="detail-share-button" aria-label="Share project">
          <span class="detail-share-icon" aria-hidden="true">\u{27A4}</span>
        </button>
      </div>
      ${detailRow('Company', escapeHtml(company?.name || 'Unknown'))}
      ${detailRow('Project', escapeHtml(project.name))}
      ${detailRow('Project Type', escapeHtml(getProjectTypeLabel(project.type, project.typeOther)))}
      ${detailRow('Date Invested', escapeHtml(formatDate(project.dateInvested)))}
      ${detailRowIf(
        'Date Sold',
        isSold && project.soldDate,
        escapeHtml(formatDate(project.soldDate)),
      )}
      ${detailRowIf(
        'Loan Payoff Date',
        isRealEstate && !isSold && project.loanPayoffDate,
        escapeHtml(formatDate(project.loanPayoffDate)),
      )}
      ${detailRowIf(
        'Maturation Date',
        !isRealEstate && project.maturationDate,
        escapeHtml(formatDate(project.maturationDate)),
      )}
      ${detailRowIf(
        'Date Closed',
        !isRealEstate && isClosed && project.closedDate,
        escapeHtml(formatDate(project.closedDate)),
      )}
      ${detailRowIf(
        'Reminder Date',
        !isClosed && project.reminderDate,
        escapeHtml(formatDate(project.reminderDate)),
      )}
      ${detailRowIf(
        'Expected Time',
        showExpectedTime,
        escapeHtml(formatDateSpanCountdown(project.dateInvested, endDate)),
      )}
      ${detailRowIf(
        'Actual Time',
        isClosed && project.dateInvested && closedEndDate,
        escapeHtml(formatDateSpanCountdown(project.dateInvested, closedEndDate)),
      )}
      ${detailRowIf(
        'Time Remaining',
        !isClosed && endDate,
        escapeHtml(formatMaturationCountdown(endDate)),
      )}
      ${detailRowIf(
        'APR',
        showApr,
        `${escapeHtml(formatPercent(project.aprPercent))} (${escapeHtml(project.aprType)})`,
      )}
      ${detailRowIf(
        'Contact Person',
        Boolean(project.contactPerson?.trim()),
        escapeHtml(project.contactPerson.trim()),
      )}
      ${detailDocumentationRow(project.documentationUrl)}
      ${totalFinancialRows}
      ${myFinancialRows}
    </section>
  `;
}

function renderCompanyForm(companyId) {
  const existing = companyId ? getCompany(data, companyId) : null;
  const isEdit = Boolean(existing);

  updateChrome({
    subtitle: isEdit ? 'Edit Company' : 'Add Company',
    showBack: true,
    showFab: false,
  });

  appRoot.innerHTML = `
    <form class="form" id="company-form">
      <div class="field" data-field="name">
        <label for="company-name">${fieldLabel('Company Name', true)}</label>
        <input id="company-name" name="name" maxlength="${LIMITS.companyName}" required value="${escapeHtml(existing?.name || '')}" />
        <span class="field-hint">Max ${LIMITS.companyName} characters</span>
        <p class="field-error hidden" data-field-error="name"></p>
      </div>
      <div class="field" data-field="partnerCount">
        <label for="partner-count">${fieldLabel('Number of Partners', true)}</label>
        <input id="partner-count" name="partnerCount" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" required value="${escapeHtml(existing?.partnerCount ?? 1)}" />
        <p class="field-error hidden" data-field-error="partnerCount"></p>
      </div>
      <div class="field" data-field="documentationUrl">
        <label for="company-documentation-url">Documentation Link</label>
        <input id="company-documentation-url" name="documentationUrl" type="text" inputmode="url" autocomplete="off" maxlength="${LIMITS.documentationUrl}" value="${escapeHtml(existing?.documentationUrl || '')}" />
        <span class="field-hint">Optional. Any web or cloud link.</span>
        <p class="field-error hidden" data-field-error="documentationUrl"></p>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Save Changes' : 'Add Company'}</button>
        ${isEdit ? '<button type="button" class="btn btn-danger btn-block" id="delete-company">Delete Company</button>' : ''}
      </div>
    </form>
  `;

  const form = appRoot.querySelector('#company-form');

  bindIntegerInput(appRoot.querySelector('#partner-count'));
  bindDateInputs(form);
  bindFormFieldErrors(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = truncate(formData.get('name'), LIMITS.companyName);
    const partnerCount = Number(formData.get('partnerCount'));
    const documentationUrl = truncate(formData.get('documentationUrl'), LIMITS.documentationUrl);
    const errors = validateCompanyForm({ name, partnerCount, documentationUrl });

    if (!applyFormErrors(form, errors)) {
      return;
    }

    const timestamp = nowIso();
    const company = {
      id: existing?.id || createId(),
      name,
      partnerCount,
      documentationUrl: normalizeDocumentationUrl(documentationUrl),
      colorIndex: existing?.colorIndex ?? getNextColorIndex(data),
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    upsertCompany(data, company);
    navigate('company-detail', { companyId: company.id });
  });

  const deleteButton = appRoot.querySelector('#delete-company');
  if (deleteButton) {
    deleteButton.onclick = () => {
      if (
        window.confirm(
          'Delete this company and all of its projects? This cannot be undone.',
        )
      ) {
        deleteCompany(data, existing.id);
        navigate('portfolio');
      }
    };
  }
}

function renderProjectForm(companyId, projectId) {
  const company = getCompany(data, companyId);

  if (!company) {
    navigate('portfolio');
    return;
  }

  const existing = projectId ? getProject(data, projectId) : null;
  const isEdit = Boolean(existing);

  updateChrome({
    subtitle: isEdit ? 'Edit Project' : 'Add Project',
    showBack: true,
    showFab: false,
  });

  const typeOptions = PROJECT_TYPES.map(
    (type) =>
      `<option value="${type.value}" ${existing?.type === type.value ? 'selected' : ''}>${escapeHtml(type.label)}</option>`,
  ).join('');

  const aprOptions = APR_TYPES.map(
    (type) =>
      `<option value="${type.value}" ${existing?.aprType === type.value ? 'selected' : ''}>${escapeHtml(type.label)}</option>`,
  ).join('');

  const initialType = existing?.type || PROJECT_TYPES[0].value;
  const initialStatusOptions = isRealEstateProject(initialType)
    ? REAL_ESTATE_STATUS_OPTIONS
    : PROJECT_STATUS_OPTIONS;
  const statusOptions = initialStatusOptions.map(
    (status) =>
      `<option value="${status.value}" ${(existing?.status || PROJECT_STATUS.ACTIVE) === status.value ? 'selected' : ''}>${escapeHtml(status.label)}</option>`,
  ).join('');

  appRoot.innerHTML = `
    <form class="form project-form" id="project-form" novalidate>
      <div class="field" data-field="name">
        <label for="project-name">${fieldLabel('Project Name', true)}</label>
        <input id="project-name" name="name" maxlength="${LIMITS.projectName}" required value="${escapeHtml(existing?.name || '')}" />
        <p class="field-error hidden" data-field-error="name"></p>
      </div>
      <div class="field" data-field="type">
        <label for="project-type">Project Type</label>
        <select id="project-type" name="type">${typeOptions}</select>
      </div>
      <div class="field ${existing?.type === 'other' ? '' : 'hidden'}" id="type-other-field" data-field="typeOther">
        <label for="type-other">${fieldLabel('Other Type', true)}</label>
        <input id="type-other" name="typeOther" maxlength="${LIMITS.typeOther}" value="${escapeHtml(existing?.typeOther || '')}" />
        <p class="field-error hidden" data-field-error="typeOther"></p>
      </div>
      <div class="field" data-field="dateInvested">
        <label for="date-invested">${fieldLabel('Date Invested', true)}</label>
        <input id="date-invested" name="dateInvested" type="date" required value="${escapeHtml(existing?.dateInvested || '')}" />
        <p class="field-error hidden" data-field-error="dateInvested"></p>
      </div>
      <div class="field" data-field="amount">
        <label for="amount">${fieldLabel(`Total Investment (${CURRENCY})`, true)}</label>
        <input id="amount" name="amount" type="text" inputmode="decimal" autocomplete="off" required value="${escapeHtml(existing?.amount ?? '')}" />
        <p class="field-error hidden" data-field-error="amount"></p>
      </div>
      <div class="field interest-based-field" data-field="aprPercent">
        <label for="apr-percent">${fieldLabel('APR %', true)}</label>
        <input id="apr-percent" name="aprPercent" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(existing?.aprPercent ?? '')}" />
        <p class="field-error hidden" data-field-error="aprPercent"></p>
      </div>
      <div class="field interest-based-field" data-field="aprType">
        <label for="apr-type">APR Type</label>
        <select id="apr-type" name="aprType">${aprOptions}</select>
      </div>
      <div class="field interest-based-field" data-field="maturationDate">
        <label for="maturation-date">${fieldLabel('Maturation Date', true)}</label>
        <input id="maturation-date" name="maturationDate" type="date" value="${escapeHtml(existing?.maturationDate || '')}" />
        <p class="field-error hidden" data-field-error="maturationDate"></p>
      </div>
      <div class="field real-estate-field re-active-field hidden" id="loan-payoff-date-field" data-field="loanPayoffDate">
        <label for="loan-payoff-date">Loan Payoff Date</label>
        <input id="loan-payoff-date" name="loanPayoffDate" type="date" value="${escapeHtml(existing?.loanPayoffDate || existing?.maturationDate || '')}" />
        <span class="field-hint">Optional.</span>
        <p class="field-error hidden" data-field-error="loanPayoffDate"></p>
      </div>
      <div class="field real-estate-field re-active-field hidden" id="estimated-value-field" data-field="estimatedValue">
        <label for="estimated-value">Estimated Value (${CURRENCY})</label>
        <input id="estimated-value" name="estimatedValue" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(existing?.estimatedValue ?? '')}" />
        <span class="field-hint">Optional. Current appraisal or estimated property value.</span>
        <p class="field-error hidden" data-field-error="estimatedValue"></p>
      </div>
      <div class="field" data-field="status">
        <label for="project-status">Status</label>
        <select id="project-status" name="status">${statusOptions}</select>
        <span class="field-hint" id="status-hint">Overdue is applied automatically when a reminder or target date has passed.</span>
      </div>
      <div class="field open-only-field" id="reminder-date-field" data-field="reminderDate">
        <label for="reminder-date">Reminder Date</label>
        <input id="reminder-date" name="reminderDate" type="date" min="${getTodayIsoDate()}" value="${escapeHtml(existing?.reminderDate || '')}" />
        <span class="field-hint">Optional. Must be today or later.</span>
        <p class="field-error hidden" data-field-error="reminderDate"></p>
      </div>
      <div class="field interest-closed-field hidden" id="closed-date-field" data-field="closedDate">
        <label for="closed-date">${fieldLabel('Date Closed', true)}</label>
        <input id="closed-date" name="closedDate" type="date" value="${escapeHtml(existing?.closedDate || '')}" />
        <p class="field-error hidden" data-field-error="closedDate"></p>
      </div>
      <div class="field interest-closed-field closed-recovered-field hidden" id="amount-recovered-field" data-field="amountRecovered">
        <label for="amount-recovered">${fieldLabel(`Amount Recovered (${CURRENCY})`, true)}</label>
        <input id="amount-recovered" name="amountRecovered" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(existing?.amountRecovered ?? '')}" />
        <span class="field-hint" id="amount-recovered-hint"></span>
        <p class="field-error hidden" data-field-error="amountRecovered"></p>
      </div>
      <div class="field re-sold-field hidden" id="sold-date-field" data-field="soldDate">
        <label for="sold-date">${fieldLabel('Date Sold', true)}</label>
        <input id="sold-date" name="soldDate" type="date" value="${escapeHtml(existing?.soldDate || existing?.closedDate || '')}" />
        <p class="field-error hidden" data-field-error="soldDate"></p>
      </div>
      <div class="field re-sold-field hidden" id="sold-price-field" data-field="soldPrice">
        <label for="sold-price">${fieldLabel(`Total Net Proceeds (${CURRENCY})`, true)}</label>
        <input id="sold-price" name="soldPrice" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(existing?.soldPrice ?? existing?.amountRecovered ?? '')}" />
        <span class="field-hint">Cash received after loan payoff.</span>
        <p class="field-error hidden" data-field-error="soldPrice"></p>
      </div>
      <div class="field">
        <label for="contact-person">Contact Person</label>
        <input id="contact-person" name="contactPerson" maxlength="${LIMITS.contactPerson}" value="${escapeHtml(existing?.contactPerson || '')}" />
      </div>
      <div class="field" data-field="documentationUrl">
        <label for="project-documentation-url">Documentation Link</label>
        <input id="project-documentation-url" name="documentationUrl" type="text" inputmode="url" autocomplete="off" maxlength="${LIMITS.documentationUrl}" value="${escapeHtml(existing?.documentationUrl || '')}" />
        <span class="field-hint">Optional. Any web or cloud link.</span>
        <p class="field-error hidden" data-field-error="documentationUrl"></p>
      </div>
      <div class="card detail-grid hidden" id="value-preview">
        <div class="detail-item">
          <span class="detail-label">Unrealized Gain (Preview)</span>
          <span class="detail-value" id="preview-unrealized-gain">${escapeHtml(formatUsd(0))}</span>
        </div>
      </div>
      <div class="card detail-grid" id="return-preview">
        <div class="detail-item">
          <span class="detail-label">Expected Return (Preview)</span>
          <span class="detail-value" id="preview-return">${escapeHtml(formatUsd(0))}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Total at Maturity (Preview)</span>
          <span class="detail-value" id="preview-total">${escapeHtml(formatUsd(0))}</span>
        </div>
      </div>
      <div class="card detail-grid hidden" id="outcome-preview">
        <div class="detail-item" id="preview-return-row">
          <span class="detail-label">Actual Return (Preview)</span>
          <span class="detail-value highlight" id="preview-actual-return">${escapeHtml(formatUsd(0))}</span>
        </div>
        <div class="detail-item hidden" id="preview-my-gain-row">
          <span class="detail-label">My Gain / Loss (Preview)</span>
          <span class="detail-value highlight" id="preview-my-actual-gain">${escapeHtml(formatUsd(0))}</span>
        </div>
        <div class="detail-item hidden" id="preview-my-loss-row">
          <span class="detail-label">My Actual Loss (Preview)</span>
          <span class="detail-value loss" id="preview-my-actual-loss">${escapeHtml(formatUsd(0))}</span>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Save Changes' : 'Add Project'}</button>
        ${isEdit ? '<button type="button" class="btn btn-danger btn-block" id="delete-project">Delete Project</button>' : ''}
      </div>
    </form>
  `;

  const form = appRoot.querySelector('#project-form');
  const typeSelect = appRoot.querySelector('#project-type');
  const typeOtherField = appRoot.querySelector('#type-other-field');
  const statusSelect = appRoot.querySelector('#project-status');
  const statusHint = appRoot.querySelector('#status-hint');
  const returnPreview = appRoot.querySelector('#return-preview');
  const valuePreview = appRoot.querySelector('#value-preview');
  const outcomePreview = appRoot.querySelector('#outcome-preview');
  const amountRecoveredField = appRoot.querySelector('#amount-recovered-field');
  const amountRecoveredInput = appRoot.querySelector('#amount-recovered');
  const amountRecoveredHint = appRoot.querySelector('#amount-recovered-hint');
  const estimatedValueField = appRoot.querySelector('#estimated-value-field');
  const soldDateField = appRoot.querySelector('#sold-date-field');
  const soldPriceField = appRoot.querySelector('#sold-price-field');
  const soldDateInput = appRoot.querySelector('#sold-date');
  const soldPriceInput = appRoot.querySelector('#sold-price');
  const closedDateInput = appRoot.querySelector('#closed-date');
  const maturationDateInput = appRoot.querySelector('#maturation-date');
  const loanPayoffDateInput = appRoot.querySelector('#loan-payoff-date');
  const aprPercentInput = appRoot.querySelector('#apr-percent');
  const estimatedValueInput = appRoot.querySelector('#estimated-value');
  const previewReturnRow = appRoot.querySelector('#preview-return-row');
  const previewMyGainRow = appRoot.querySelector('#preview-my-gain-row');
  const previewMyLossRow = appRoot.querySelector('#preview-my-loss-row');

  bindDecimalInput(appRoot.querySelector('#amount'));
  bindDecimalInput(aprPercentInput);
  bindDecimalInput(amountRecoveredInput);
  bindDecimalInput(soldPriceInput);
  bindDecimalInput(estimatedValueInput);
  bindDateInputs(form);
  bindFormFieldErrors(form);

  function getProjectFormValues() {
    const formData = new FormData(form);
    const type = formData.get('type');
    const isRealEstate = isRealEstateProject(type);
    const status = formData.get('status') || PROJECT_STATUS.ACTIVE;
    const isSold = isRealEstate && isSoldProjectStatus(status);
    const closed = !isRealEstate && isClosedProjectStatus(status);
    const estimatedRaw = String(formData.get('estimatedValue') ?? '').trim();
    const aprRaw = String(formData.get('aprPercent') ?? '').trim();
    const soldPriceRaw = String(formData.get('soldPrice') ?? '').trim();

    return {
      name: truncate(formData.get('name'), LIMITS.projectName),
      type,
      typeOther: truncate(formData.get('typeOther'), LIMITS.typeOther),
      dateInvested: formData.get('dateInvested'),
      amount: Number(formData.get('amount')),
      aprPercent: isRealEstate ? null : aprRaw ? Number(aprRaw) : Number.NaN,
      aprType: isRealEstate ? null : formData.get('aprType'),
      maturationDate: isRealEstate ? null : formData.get('maturationDate'),
      loanPayoffDate: isRealEstate && !isSold ? formData.get('loanPayoffDate') : null,
      estimatedValue: isRealEstate && !isSold && estimatedRaw ? Number(estimatedRaw) : null,
      status,
      closed,
      closedDate: closed ? formData.get('closedDate') : null,
      amountRecovered: closed
        ? status === PROJECT_STATUS.CLOSED_LOSS
          ? 0
          : Number(formData.get('amountRecovered'))
        : null,
      soldDate: isSold ? formData.get('soldDate') : null,
      soldPrice: isSold && soldPriceRaw ? Number(soldPriceRaw) : isSold ? Number.NaN : null,
      reminderDate:
        isSold || closed ? null : String(formData.get('reminderDate') ?? '').trim() || null,
      documentationUrl: truncate(formData.get('documentationUrl'), LIMITS.documentationUrl),
    };
  }

  function validateReminderDateField() {
    const values = getProjectFormValues();
    const isRealEstate = isRealEstateProject(values.type);
    const isSold = isRealEstate && isSoldProjectStatus(values.status);

    if (isSold || values.closed) {
      setFieldError(form, 'reminderDate', '');
      return;
    }

    if (values.reminderDate && values.reminderDate < getTodayIsoDate()) {
      setFieldError(form, 'reminderDate', 'Reminder date cannot be in the past.');
      return;
    }

    setFieldError(form, 'reminderDate', '');
  }

  function rebuildStatusOptions() {
    const options = isRealEstateProject(typeSelect.value)
      ? REAL_ESTATE_STATUS_OPTIONS
      : PROJECT_STATUS_OPTIONS;
    const currentStatus = statusSelect.value;

    statusSelect.innerHTML = options
      .map(
        (status) =>
          `<option value="${status.value}">${escapeHtml(status.label)}</option>`,
      )
      .join('');

    if (options.some((option) => option.value === currentStatus)) {
      statusSelect.value = currentStatus;
    } else {
      statusSelect.value = PROJECT_STATUS.ACTIVE;
    }
  }

  function validateClosedAmountRecovered() {
    if (!statusRequiresAmountRecovered(statusSelect.value)) {
      setFieldError(form, 'amountRecovered', '');
      return;
    }

    const rawValue = amountRecoveredInput.value.trim();

    if (!rawValue) {
      setFieldError(form, 'amountRecovered', '');
      return;
    }

    const values = getProjectFormValues();
    const recoveredError = getAmountRecoveredError(
      values.status,
      values.amount,
      values.amountRecovered,
    );

    setFieldError(form, 'amountRecovered', recoveredError);
  }

  function validateDateFields() {
    validateReminderDateField();

    const values = getProjectFormValues();
    const isRealEstate = isRealEstateProject(values.type);
    const isSold = isRealEstate && isSoldProjectStatus(values.status);

    if (values.closed || isSold) {
      setFieldError(form, 'maturationDate', '');
      setFieldError(form, 'loanPayoffDate', '');
      return;
    }

    if (!values.dateInvested) {
      return;
    }

    const endDate = isRealEstate ? values.loanPayoffDate : values.maturationDate;
    const endField = isRealEstate ? 'loanPayoffDate' : 'maturationDate';
    const endLabel = isRealEstate ? 'Loan payoff date' : 'Maturation date';

    if (!endDate) {
      setFieldError(form, endField, '');
      return;
    }

    if (new Date(endDate) <= new Date(values.dateInvested)) {
      setFieldError(form, endField, `${endLabel} must be after the investment date.`);
      return;
    }

    setFieldError(form, endField, '');
    setFieldError(form, isRealEstate ? 'maturationDate' : 'loanPayoffDate', '');
  }

  function toggleTypeFields() {
    rebuildStatusOptions();

    const isRealEstate = isRealEstateProject(typeSelect.value);

    appRoot.querySelectorAll('.interest-based-field').forEach((element) => {
      element.classList.toggle('hidden', isRealEstate);
    });
    appRoot.querySelectorAll('.real-estate-field').forEach((element) => {
      element.classList.toggle('hidden', !isRealEstate);
    });

    maturationDateInput.required = !isRealEstate;
    aprPercentInput.required = !isRealEstate;

    statusHint.textContent = isRealEstate
      ? 'Overdue is applied automatically when a reminder or loan payoff date has passed.'
      : 'Overdue is applied automatically when a reminder or maturation date has passed.';

    if (isRealEstate) {
      setFieldError(form, 'aprPercent', '');
      setFieldError(form, 'maturationDate', '');
      setFieldError(form, 'closedDate', '');
      setFieldError(form, 'amountRecovered', '');
    } else {
      loanPayoffDateInput.required = false;
      soldDateInput.required = false;
      soldPriceInput.required = false;
      setFieldError(form, 'loanPayoffDate', '');
      setFieldError(form, 'estimatedValue', '');
      setFieldError(form, 'soldDate', '');
      setFieldError(form, 'soldPrice', '');
    }

    toggleStatusFields();
  }

  function toggleStatusFields() {
    const isRealEstate = isRealEstateProject(typeSelect.value);
    const status = statusSelect.value;
    const isSold = isRealEstate && isSoldProjectStatus(status);
    const interestClosed = !isRealEstate && isClosedProjectStatus(status);
    const showAmountRecovered = interestClosed && statusRequiresAmountRecovered(status);

    appRoot.querySelectorAll('.open-only-field').forEach((element) => {
      element.classList.toggle('hidden', isRealEstate ? isSold : interestClosed);
    });
    appRoot.querySelectorAll('.interest-closed-field').forEach((element) => {
      element.classList.toggle('hidden', !interestClosed);
    });
    appRoot.querySelectorAll('.re-sold-field').forEach((element) => {
      element.classList.toggle('hidden', !isSold);
    });
    amountRecoveredField.classList.toggle('hidden', !showAmountRecovered);

    if (isRealEstate) {
      appRoot.querySelectorAll('.re-active-field').forEach((element) => {
        element.classList.toggle('hidden', isSold);
      });
      loanPayoffDateInput.required = false;
      soldDateInput.required = isSold;
      soldPriceInput.required = isSold;
    }

    closedDateInput.required = interestClosed;
    amountRecoveredInput.required = showAmountRecovered;

    returnPreview.classList.toggle('hidden', isRealEstate || interestClosed);
    valuePreview.classList.toggle('hidden', !isRealEstate || isSold);
    outcomePreview.classList.toggle('hidden', !(isSold || interestClosed));

    if (!isRealEstate && interestClosed) {
      updateAmountRecoveredHint(status);
    } else {
      amountRecoveredHint.textContent = '';
    }

    if (isSold && isRealEstate) {
      estimatedValueInput.value = '';
      setFieldError(form, 'estimatedValue', '');
    }

    if (!showAmountRecovered) {
      amountRecoveredInput.value = '';
      setFieldError(form, 'amountRecovered', '');
    }

    updatePreviews();
  }

  function toggleOtherField() {
    typeOtherField.classList.toggle('hidden', typeSelect.value !== 'other');
  }

  function updateAmountRecoveredHint(status) {
    const hints = {
      [PROJECT_STATUS.MATURED]: 'Total cash returned to the group.',
      [PROJECT_STATUS.PARTIAL_RECOVERED]:
        'Must be greater than zero and less than the invested amount.',
    };

    amountRecoveredHint.textContent = hints[status] || '';
  }

  function updatePreviews() {
    const formData = new FormData(form);
    const amount = Number(formData.get('amount'));
    const isRealEstate = isRealEstateProject(typeSelect.value);
    const isSold = isRealEstate && isSoldProjectStatus(statusSelect.value);
    const interestClosed = !isRealEstate && isClosedProjectStatus(statusSelect.value);

    if (isRealEstate && !isSold) {
      const estimatedRaw = String(formData.get('estimatedValue') ?? '').trim();
      const estimatedValue = estimatedRaw ? Number(estimatedRaw) : null;
      const unrealizedGain = calculateUnrealizedGain(amount, estimatedValue);
      const previewGain = appRoot.querySelector('#preview-unrealized-gain');

      if (unrealizedGain === null) {
        previewGain.textContent = '—';
        previewGain.classList.remove('highlight', 'loss');
      } else {
        previewGain.textContent = formatUsd(unrealizedGain);
        previewGain.classList.toggle('highlight', unrealizedGain > 0);
        previewGain.classList.toggle('loss', unrealizedGain < 0);
      }
    } else if (!isRealEstate && !interestClosed) {
      const expectedReturn = calculateExpectedReturn(
        amount,
        Number(formData.get('aprPercent')),
        formData.get('aprType'),
        formData.get('dateInvested'),
        formData.get('maturationDate'),
      );

      appRoot.querySelector('#preview-return').textContent = formatUsd(expectedReturn);
      appRoot.querySelector('#preview-total').textContent = formatUsd(
        calculateMaturityTotal(amount, expectedReturn),
      );
    }

    if (!isSold && !interestClosed) {
      validateDateFields();
      validateClosedAmountRecovered();
      return;
    }

    const recovered = isRealEstate
      ? Number(formData.get('soldPrice')) || 0
      : statusSelect.value === PROJECT_STATUS.CLOSED_LOSS
        ? 0
        : Number(formData.get('amountRecovered')) || 0;
    const actualReturn = calculateActualReturn(amount, recovered);
    const actualLoss = calculateActualLoss(amount, recovered);
    const hasLoss = actualLoss > 0;
    const myActualLoss = getDisplayAmount(
      actualLoss,
      company.partnerCount,
      AMOUNT_DISPLAY.MY_SHARE,
    );
    const myActualReturn = getDisplayAmount(
      actualReturn,
      company.partnerCount,
      AMOUNT_DISPLAY.MY_SHARE,
    );

    previewReturnRow.classList.toggle('hidden', hasLoss || isRealEstate);
    previewMyGainRow.classList.toggle('hidden', !isRealEstate);
    previewMyLossRow.classList.toggle('hidden', hasLoss || isRealEstate);

    if (isRealEstate) {
      const previewGain = appRoot.querySelector('#preview-my-actual-gain');
      previewGain.textContent = formatUsd(myActualReturn);
      previewGain.classList.toggle('highlight', !hasLoss);
      previewGain.classList.toggle('loss', hasLoss);
    } else if (hasLoss) {
      appRoot.querySelector('#preview-my-actual-loss').textContent = formatUsd(myActualLoss);
    } else {
      previewReturnRow.classList.remove('hidden');
      appRoot.querySelector('#preview-actual-return').textContent = formatUsd(actualReturn);
    }

    validateClosedAmountRecovered();
  }

  typeSelect.addEventListener('change', () => {
    toggleOtherField();
    toggleTypeFields();
    validateClosedAmountRecovered();
  });
  statusSelect.addEventListener('change', toggleStatusFields);
  form.addEventListener('input', updatePreviews);
  toggleOtherField();
  toggleTypeFields();

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const values = getProjectFormValues();
    const errors = validateProjectForm(values);

    if (!applyFormErrors(form, errors)) {
      return;
    }

    const contactPerson = truncate(formData.get('contactPerson'), LIMITS.contactPerson);
    const {
      name,
      type,
      typeOther,
      dateInvested,
      amount,
      aprPercent,
      aprType,
      maturationDate,
      loanPayoffDate,
      estimatedValue,
      status,
      closed,
      closedDate,
      amountRecovered,
      soldDate,
      soldPrice,
      reminderDate,
      documentationUrl,
    } = values;
    const isRealEstate = isRealEstateProject(type);
    const isSold = isRealEstate && isSoldProjectStatus(status);

    const timestamp = nowIso();
    const project = {
      id: existing?.id || createId(),
      companyId,
      name,
      type,
      typeOther: type === 'other' ? typeOther : '',
      dateInvested,
      amount,
      aprPercent,
      aprType,
      maturationDate,
      loanPayoffDate: isSold ? null : loanPayoffDate,
      estimatedValue: isSold ? null : estimatedValue,
      soldDate: isSold ? soldDate : null,
      soldPrice: isSold ? soldPrice : null,
      reminderDate: isSold || closed ? null : reminderDate,
      contactPerson,
      documentationUrl: normalizeDocumentationUrl(documentationUrl),
      status,
      closedDate: closed ? closedDate : null,
      amountRecovered: closed ? amountRecovered : null,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    upsertProject(data, project);
    navigate('project-detail', { companyId, projectId: project.id });
  });

  const deleteButton = appRoot.querySelector('#delete-project');
  if (deleteButton) {
    deleteButton.onclick = () => {
      if (window.confirm('Delete this project? This cannot be undone.')) {
        deleteProject(data, existing.id);
        navigate('company-detail', { companyId });
      }
    };
  }
}

function renderReminders() {
  updateChrome({
    showBack: false,
    showFab: false,
  });

  const items = getAttentionProjects();

  if (items.length === 0) {
    appRoot.innerHTML = `
      <section class="empty-state">
        <p>No overdue or at-risk projects right now.</p>
      </section>
    `;
    return;
  }

  const cards = items
    .map(({ project, company, metrics }) => {
      return renderProjectSummaryCard(project, metrics, {
        extraMeta: `<p class="card-meta">${escapeHtml(company?.name || 'Unknown company')}</p>`,
        showAmount: false,
        dataAttrs: `data-project-id="${escapeHtml(project.id)}" data-company-id="${escapeHtml(project.companyId)}"`,
      });
    })
    .join('');

  appRoot.innerHTML = `<section class="card-list">${cards}</section>`;

  appRoot.querySelectorAll('[data-project-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate('project-detail', {
        companyId: card.dataset.companyId,
        projectId: card.dataset.projectId,
      });
    });
  });
}

function getProjectReportGainLoss(project, metrics) {
  if (isProjectClosed(project)) {
    return getProjectOutcome(project).actualReturn;
  }

  if (isRealEstateProject(project.type)) {
    return metrics.unrealizedGain;
  }

  return metrics.expectedReturn;
}

function projectHasReportAmounts(investment, gainLoss) {
  if (Number(investment) > 0) {
    return true;
  }

  return gainLoss !== null && gainLoss !== undefined && !Number.isNaN(Number(gainLoss));
}

function buildPortfolioReport(displayMode = getAmountDisplayMode()) {
  const companies = [...data.companies].sort((a, b) => a.name.localeCompare(b.name));
  const grand = { investment: 0, gainLoss: 0, trackGain: false };
  const sections = [];

  companies.forEach((company) => {
    const projects = [...getVisibleProjectsForCompany(company.id)].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    if (projects.length === 0) {
      return;
    }

    const subtotal = { investment: 0, gainLoss: 0, trackGain: false };
    const rows = projects
      .map((project) => {
        const metrics = getProjectMetrics(project);
        const investment = getDisplayAmount(
          getProjectInvestmentAmount(project),
          company.partnerCount,
          displayMode,
        );
        const rawGain = getProjectReportGainLoss(project, metrics);
        const gainLoss =
          rawGain === null || rawGain === undefined
            ? null
            : getDisplayAmount(rawGain, company.partnerCount, displayMode);

        return { project, metrics, investment, gainLoss };
      })
      .filter(({ investment, gainLoss }) => projectHasReportAmounts(investment, gainLoss));

    if (rows.length === 0) {
      return;
    }

    rows.forEach(({ investment, gainLoss }) => {
      subtotal.investment += investment;
      grand.investment += investment;

      if (gainLoss !== null && !Number.isNaN(gainLoss)) {
        subtotal.gainLoss += gainLoss;
        subtotal.trackGain = true;
        grand.gainLoss += gainLoss;
        grand.trackGain = true;
      }
    });

    sections.push({ company, rows, subtotal });
  });

  return { sections, grand, displayMode };
}

function reportGainLossClass(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (value < 0) {
    return 'loss';
  }

  if (value > 0) {
    return 'highlight';
  }

  return '';
}

function formatReportMoney(value) {
  if (value === null || value === undefined) {
    return '—';
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return '—';
  }

  if (amount === 0) {
    return '—';
  }

  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 100000) {
    return `${sign}$${(abs / 1000).toFixed(2)}k`;
  }

  return `${sign}$${Math.round(abs)}`;
}

function formatReportGainLoss(value) {
  return formatReportMoney(value);
}

function calculateReportRoii(investment, gainLoss) {
  const invested = Number(investment);

  if (!invested || Number.isNaN(invested) || gainLoss === null || gainLoss === undefined) {
    return null;
  }

  const gain = Number(gainLoss);

  if (Number.isNaN(gain)) {
    return null;
  }

  return (gain / invested) * 100;
}

function reportRoiiCell(investment, gainLoss, { trackGain = true, strong = false } = {}) {
  const roii = trackGain ? calculateReportRoii(investment, gainLoss) : null;
  const text = roii === null ? '—' : `${roii.toFixed(1)}%`;
  const html = strong ? `<strong>${escapeHtml(text)}</strong>` : escapeHtml(text);

  return {
    html,
    className: `report-num ${reportGainLossClass(roii)}`.trim(),
  };
}

function reportTableColgroup() {
  return `
    <colgroup>
      <col class="report-col-project" />
      <col class="report-col-type" />
      <col class="report-col-status" />
      <col class="report-col-money" />
      <col class="report-col-money" />
      <col class="report-col-roii" />
    </colgroup>
  `;
}

function reportAmountModeHtml(displayMode) {
  const label = getAmountDisplayLabel(displayMode);
  return `<span class="report-amount-mode">${escapeHtml(label)}</span>`;
}

function reportProjectFilterHtml(filter) {
  const label = getProjectFilterLabel(filter);
  return `<span class="report-amount-mode">${escapeHtml(label)}</span>`;
}

function reportStatusHtml(displayStatus) {
  const statusClass = displayStatus.replace(/_/g, '-');
  const label = getProjectStatusReportLabel(displayStatus);

  return `<span class="report-status report-status-${statusClass}">${escapeHtml(label)}</span>`;
}

function renderReportTableRow(cells, { rowClass = '' } = {}) {
  const classAttr = rowClass ? ` class="${rowClass}"` : '';

  return `<tr${classAttr}>${cells
    .map((cell) => {
      if (typeof cell === 'string') {
        return `<td>${cell}</td>`;
      }

      const className = cell.className ? ` class="${cell.className}"` : '';
      return `<td${className}>${cell.html}</td>`;
    })
    .join('')}</tr>`;
}

function renderReportCompanySection({ company, rows, subtotal }) {
  const bodyRows = rows
    .map(({ project, metrics, investment, gainLoss }) =>
      renderReportTableRow([
        { html: escapeHtml(project.name) },
        { html: escapeHtml(getProjectTypeReportLabel(project.type, project.typeOther)) },
        { html: reportStatusHtml(metrics.displayStatus) },
        { html: escapeHtml(formatReportMoney(investment)), className: 'report-num' },
        {
          html: escapeHtml(formatReportGainLoss(gainLoss)),
          className: `report-num ${reportGainLossClass(gainLoss)}`.trim(),
        },
        reportRoiiCell(investment, gainLoss, { trackGain: gainLoss !== null }),
      ]),
    )
    .join('');

  const subtotalGainClass = reportGainLossClass(subtotal.trackGain ? subtotal.gainLoss : null);
  const subtotalGain = subtotal.trackGain ? subtotal.gainLoss : null;

  return `
    <section class="report-company">
      <h2 class="report-company-title">${escapeHtml(company.name)}</h2>
      <table class="report-table">
        ${reportTableColgroup()}
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col">Type</th>
            <th scope="col">Status</th>
            <th scope="col" class="report-num">Invest.</th>
            <th scope="col" class="report-num">Net G/L</th>
            <th scope="col" class="report-num">ROI%</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>
          ${renderReportTableRow(
            [
              { html: '<strong>Subtotal</strong>', className: 'report-subtotal-label' },
              { html: '' },
              { html: '' },
              { html: `<strong>${escapeHtml(formatReportMoney(subtotal.investment))}</strong>`, className: 'report-num' },
              {
                html: `<strong>${escapeHtml(formatReportGainLoss(subtotalGain))}</strong>`,
                className: `report-num ${subtotalGainClass}`.trim(),
              },
              reportRoiiCell(subtotal.investment, subtotalGain, {
                trackGain: subtotal.trackGain,
                strong: true,
              }),
            ],
            { rowClass: 'report-subtotal-row' },
          )}
        </tfoot>
      </table>
    </section>
  `;
}

function renderReports() {
  updateChrome({
    showBack: false,
    showFab: false,
  });

  const displayMode = getAmountDisplayMode();
  const projectFilter = getProjectFilter();
  const { sections, grand } = buildPortfolioReport(displayMode);
  const generatedAt = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  if (sections.length === 0) {
    const emptyMessage =
      data.projects.length > 0
        ? 'No projects match the current project filter. Change Show Both, Show Active, or Show Past in Settings.'
        : 'No projects to report yet. Add companies and projects first.';

    appRoot.innerHTML = `
      <section class="empty-state">
        <p>${escapeHtml(emptyMessage)}</p>
      </section>
    `;
    return;
  }

  const companySections = sections.map(renderReportCompanySection).join('');
  const grandGainClass = reportGainLossClass(grand.trackGain ? grand.gainLoss : null);
  const grandGain = grand.trackGain ? grand.gainLoss : null;

  appRoot.innerHTML = `
    <article class="report-document card">
      <header class="report-header">
        <div class="report-header-bar">
          <h1 class="report-title">Portfolio Report</h1>
          <button type="button" class="btn btn-primary" id="report-print-button">Print / Save PDF</button>
        </div>
        <p class="report-meta">Generated ${escapeHtml(generatedAt)}</p>
        <p class="report-meta">Projects included: ${reportProjectFilterHtml(projectFilter)}</p>
        <p class="report-meta">All amounts shown as ${reportAmountModeHtml(displayMode)}</p>
        <p class="report-note">Closed projects use actual results; open projects use expected or unrealized amounts where available.</p>
      </header>
      ${companySections}
      <section class="report-grand-total">
        <table class="report-table">
          ${reportTableColgroup()}
          <tfoot>
            ${renderReportTableRow(
              [
                { html: '<strong>Grand total</strong>', className: 'report-subtotal-label' },
                { html: '' },
                { html: '' },
                { html: `<strong>${escapeHtml(formatReportMoney(grand.investment))}</strong>`, className: 'report-num' },
                {
                  html: `<strong>${escapeHtml(formatReportGainLoss(grandGain))}</strong>`,
                  className: `report-num ${grandGainClass}`.trim(),
                },
                reportRoiiCell(grand.investment, grandGain, { trackGain: grand.trackGain, strong: true }),
              ],
              { rowClass: 'report-grand-total-row' },
            )}
          </tfoot>
        </table>
      </section>
    </article>
  `;

  appRoot.querySelector('#report-print-button')?.addEventListener('click', () => {
    window.print();
  });
}

function renderSettings() {
  const currentTheme = getTheme();
  const displayMode = getAmountDisplayMode();
  const projectFilter = getProjectFilter();

  updateChrome({
    showBack: false,
    showFab: false,
  });

  appRoot.innerHTML = `
    <section class="card settings-group">
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
      <h2 class="section-title">Appearance</h2>
      <div class="theme-options">
        <button type="button" class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">Light</button>
        <button type="button" class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">Dark</button>
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
    <section class="card settings-group" style="margin-top: 8px;">
      <button type="button" class="btn btn-help btn-block" id="settings-help-button">Help</button>
    </section>
  `;

  appRoot.querySelector('#pin-setup-button')?.addEventListener('click', () => {
    navigate('pin-setup');
  });

  appRoot.querySelector('#pin-change-button')?.addEventListener('click', () => {
    navigate('pin-change');
  });

  appRoot.querySelector('#settings-remove-pin')?.addEventListener('click', () => {
    navigate('pin-remove');
  });

  appRoot.querySelector('#settings-erase-data')?.addEventListener('click', () => {
    navigate('erase-data');
  });

  appRoot.querySelector('#settings-help-button')?.addEventListener('click', openHelpModal);

  appRoot.querySelectorAll('[data-project-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      saveProjectFilter(button.dataset.projectFilter);
      render();
    });
  });

  appRoot.querySelectorAll('[data-display-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      saveAmountDisplayMode(button.dataset.displayMode);
      updateAmountModeIndicator();
      render();
    });
  });

  appRoot.querySelectorAll('.theme-option[data-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      setTheme(button.dataset.theme);
      renderSettings();
    });
  });
}

function render() {
  if (hasPin() && !pinUnlocked) {
    return;
  }

  data = loadData();
  appRoot.parentElement?.classList.toggle('app-main--report', state.view === 'reports');

  switch (state.view) {
    case 'company-detail':
      renderCompanyDetail(state.companyId);
      break;
    case 'company-form':
      renderCompanyForm(state.companyId);
      break;
    case 'project-detail':
      renderProjectDetail(state.projectId);
      break;
    case 'project-form':
      renderProjectForm(state.companyId, state.projectId);
      break;
    case 'reminders':
      renderReminders();
      break;
    case 'reports':
      renderReports();
      break;
    case 'settings':
      renderSettings();
      break;
    case 'pin-setup':
      renderPinSetup();
      break;
    case 'pin-change':
      renderPinChange();
      break;
    case 'pin-remove':
      renderPinRemove();
      break;
    case 'erase-data':
      renderEraseData();
      break;
    case 'portfolio':
    default:
      renderPortfolio();
      break;
  }
}

function goBack() {
  switch (state.view) {
    case 'company-form':
      navigate(state.companyId ? 'company-detail' : 'portfolio', {
        companyId: state.companyId,
      });
      break;
    case 'company-detail':
      navigate('portfolio');
      break;
    case 'project-form':
      navigate(state.projectId ? 'project-detail' : 'company-detail', {
        companyId: state.companyId,
        projectId: state.projectId,
      });
      break;
    case 'project-detail':
      navigate('company-detail', { companyId: state.companyId });
      break;
    case 'pin-setup':
    case 'pin-change':
    case 'pin-remove':
    case 'erase-data':
      navigate('settings');
      break;
    default:
      navigate('portfolio');
      break;
  }
}

function bindGlobalEvents() {
  backButton.addEventListener('click', goBack);

  appRoot.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-external-link]');

    if (!link) {
      return;
    }

    const href = link.getAttribute('href');

    if (!href) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.open(href, '_blank', 'noopener,noreferrer');
  });

  bottomNav.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      closeHelpModal();
      navigate(button.dataset.nav);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && helpModal && !helpModal.classList.contains('hidden')) {
      closeHelpModal();
    }
  });
}

applyInitialTheme();
updateAmountModeIndicator();
bindGlobalEvents();
bindHelpModal();

if (hasPin()) {
  renderPinLock();
} else {
  pinUnlocked = true;
  render();
}
