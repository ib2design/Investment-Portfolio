import {
  APR_TYPES,
  CURRENCY,
  AMOUNT_DISPLAY,
  LIMITS,
  PROJECT_TYPES,
  PROJECT_STATUS,
  PROJECT_STATUS_OPTIONS,
  REAL_ESTATE_STATUS_OPTIONS,
} from '../constants.js';
import {
  calculateExpectedReturn,
  calculateMaturityTotal,
  calculateActualReturn,
  calculateActualLoss,
  calculateUnrealizedGain,
  formatUsd,
  getDisplayAmount,
  isRealEstateProject,
  isSoldProjectStatus,
  isClosedProjectStatus,
} from '../calculations.js';
import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml, truncate, fieldLabel } from '../ui/dom.js';
import { normalizeDocumentationUrl } from '../ui/documentation.js';
import {
  applyFormErrors,
  bindFormFieldErrors,
  setFieldError,
} from '../ui/forms.js';
import {
  getAmountRecoveredError,
  statusRequiresAmountRecovered,
  validateProjectForm,
} from '../services/validation.js';
import {
  bindDateInputs,
  bindDecimalInput,
  getTodayIsoDate,
} from '../formInputs.js';
import {
  createId,
  deleteProject,
  getCompany,
  getProject,
  nowIso,
  upsertProject,
} from '../storage.js';

export function renderProjectForm(companyId, projectId) {
  const company = getCompany(getData(), companyId);

  if (!company) {
    navigate('portfolio');
    return;
  }

  const existing = projectId ? getProject(getData(), projectId) : null;
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

  dom.appRoot.innerHTML = `
    <form class="form project-form" id="project-form" novalidate>
      <div class="field" getData()-field="name">
        <label for="project-name">${fieldLabel('Project Name', true)}</label>
        <input id="project-name" name="name" maxlength="${LIMITS.projectName}" required value="${escapeHtml(existing?.name || '')}" />
        <p class="field-error hidden" getData()-field-error="name"></p>
      </div>
      <div class="field" getData()-field="type">
        <label for="project-type">Project Type</label>
        <select id="project-type" name="type">${typeOptions}</select>
      </div>
      <div class="field ${existing?.type === 'other' ? '' : 'hidden'}" id="type-other-field" getData()-field="typeOther">
        <label for="type-other">${fieldLabel('Other Type', true)}</label>
        <input id="type-other" name="typeOther" maxlength="${LIMITS.typeOther}" value="${escapeHtml(existing?.typeOther || '')}" />
        <p class="field-error hidden" getData()-field-error="typeOther"></p>
      </div>
      <div class="field" getData()-field="dateInvested">
        <label for="date-invested">${fieldLabel('Date Invested', true)}</label>
        <input id="date-invested" name="dateInvested" type="date" required value="${escapeHtml(existing?.dateInvested || '')}" />
        <p class="field-error hidden" getData()-field-error="dateInvested"></p>
      </div>
      <div class="field" getData()-field="amount">
        <label for="amount">${fieldLabel(`Total Investment (${CURRENCY})`, true)}</label>
        <input id="amount" name="amount" type="text" inputmode="decimal" autocomplete="off" required value="${escapeHtml(existing?.amount ?? '')}" />
        <p class="field-error hidden" getData()-field-error="amount"></p>
      </div>
      <div class="field interest-based-field" getData()-field="aprPercent">
        <label for="apr-percent">${fieldLabel('APR %', true)}</label>
        <input id="apr-percent" name="aprPercent" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(existing?.aprPercent ?? '')}" />
        <p class="field-error hidden" getData()-field-error="aprPercent"></p>
      </div>
      <div class="field interest-based-field" getData()-field="aprType">
        <label for="apr-type">APR Type</label>
        <select id="apr-type" name="aprType">${aprOptions}</select>
      </div>
      <div class="field interest-based-field" getData()-field="maturationDate">
        <label for="maturation-date">${fieldLabel('Maturation Date', true)}</label>
        <input id="maturation-date" name="maturationDate" type="date" value="${escapeHtml(existing?.maturationDate || '')}" />
        <p class="field-error hidden" getData()-field-error="maturationDate"></p>
      </div>
      <div class="field real-estate-field re-active-field hidden" id="loan-payoff-date-field" getData()-field="loanPayoffDate">
        <label for="loan-payoff-date">Loan Payoff Date</label>
        <input id="loan-payoff-date" name="loanPayoffDate" type="date" value="${escapeHtml(existing?.loanPayoffDate || existing?.maturationDate || '')}" />
        <span class="field-hint">Optional.</span>
        <p class="field-error hidden" getData()-field-error="loanPayoffDate"></p>
      </div>
      <div class="field real-estate-field re-active-field hidden" id="estimated-value-field" getData()-field="estimatedValue">
        <label for="estimated-value">Estimated Value (${CURRENCY})</label>
        <input id="estimated-value" name="estimatedValue" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(existing?.estimatedValue ?? '')}" />
        <span class="field-hint">Optional. Current appraisal or estimated property value.</span>
        <p class="field-error hidden" getData()-field-error="estimatedValue"></p>
      </div>
      <div class="field" getData()-field="status">
        <label for="project-status">Status</label>
        <select id="project-status" name="status">${statusOptions}</select>
        <span class="field-hint" id="status-hint">Overdue is applied automatically when a reminder or target date has passed.</span>
      </div>
      <div class="field open-only-field" id="reminder-date-field" getData()-field="reminderDate">
        <label for="reminder-date">Reminder Date</label>
        <input id="reminder-date" name="reminderDate" type="date" min="${getTodayIsoDate()}" value="${escapeHtml(existing?.reminderDate || '')}" />
        <span class="field-hint">Optional. Must be today or later.</span>
        <p class="field-error hidden" getData()-field-error="reminderDate"></p>
      </div>
      <div class="field interest-closed-field hidden" id="closed-date-field" getData()-field="closedDate">
        <label for="closed-date">${fieldLabel('Date Closed', true)}</label>
        <input id="closed-date" name="closedDate" type="date" value="${escapeHtml(existing?.closedDate || '')}" />
        <p class="field-error hidden" getData()-field-error="closedDate"></p>
      </div>
      <div class="field interest-closed-field closed-recovered-field hidden" id="amount-recovered-field" getData()-field="amountRecovered">
        <label for="amount-recovered">${fieldLabel(`Amount Recovered (${CURRENCY})`, true)}</label>
        <input id="amount-recovered" name="amountRecovered" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(existing?.amountRecovered ?? '')}" />
        <span class="field-hint" id="amount-recovered-hint"></span>
        <p class="field-error hidden" getData()-field-error="amountRecovered"></p>
      </div>
      <div class="field re-sold-field hidden" id="sold-date-field" getData()-field="soldDate">
        <label for="sold-date">${fieldLabel('Date Sold', true)}</label>
        <input id="sold-date" name="soldDate" type="date" value="${escapeHtml(existing?.soldDate || existing?.closedDate || '')}" />
        <p class="field-error hidden" getData()-field-error="soldDate"></p>
      </div>
      <div class="field re-sold-field hidden" id="sold-price-field" getData()-field="soldPrice">
        <label for="sold-price">${fieldLabel(`Total Net Proceeds (${CURRENCY})`, true)}</label>
        <input id="sold-price" name="soldPrice" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(existing?.soldPrice ?? existing?.amountRecovered ?? '')}" />
        <span class="field-hint">Cash received after loan payoff.</span>
        <p class="field-error hidden" getData()-field-error="soldPrice"></p>
      </div>
      <div class="field">
        <label for="contact-person">Contact Person</label>
        <input id="contact-person" name="contactPerson" maxlength="${LIMITS.contactPerson}" value="${escapeHtml(existing?.contactPerson || '')}" />
      </div>
      <div class="field" getData()-field="documentationUrl">
        <label for="project-documentation-url">Documentation Link</label>
        <input id="project-documentation-url" name="documentationUrl" type="text" inputmode="url" autocomplete="off" maxlength="${LIMITS.documentationUrl}" value="${escapeHtml(existing?.documentationUrl || '')}" />
        <span class="field-hint">Optional. Any web or cloud link.</span>
        <p class="field-error hidden" getData()-field-error="documentationUrl"></p>
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

  const form = dom.appRoot.querySelector('#project-form');
  const typeSelect = dom.appRoot.querySelector('#project-type');
  const typeOtherField = dom.appRoot.querySelector('#type-other-field');
  const statusSelect = dom.appRoot.querySelector('#project-status');
  const statusHint = dom.appRoot.querySelector('#status-hint');
  const returnPreview = dom.appRoot.querySelector('#return-preview');
  const valuePreview = dom.appRoot.querySelector('#value-preview');
  const outcomePreview = dom.appRoot.querySelector('#outcome-preview');
  const amountRecoveredField = dom.appRoot.querySelector('#amount-recovered-field');
  const amountRecoveredInput = dom.appRoot.querySelector('#amount-recovered');
  const amountRecoveredHint = dom.appRoot.querySelector('#amount-recovered-hint');
  const estimatedValueField = dom.appRoot.querySelector('#estimated-value-field');
  const soldDateField = dom.appRoot.querySelector('#sold-date-field');
  const soldPriceField = dom.appRoot.querySelector('#sold-price-field');
  const soldDateInput = dom.appRoot.querySelector('#sold-date');
  const soldPriceInput = dom.appRoot.querySelector('#sold-price');
  const closedDateInput = dom.appRoot.querySelector('#closed-date');
  const maturationDateInput = dom.appRoot.querySelector('#maturation-date');
  const loanPayoffDateInput = dom.appRoot.querySelector('#loan-payoff-date');
  const aprPercentInput = dom.appRoot.querySelector('#apr-percent');
  const estimatedValueInput = dom.appRoot.querySelector('#estimated-value');
  const previewReturnRow = dom.appRoot.querySelector('#preview-return-row');
  const previewMyGainRow = dom.appRoot.querySelector('#preview-my-gain-row');
  const previewMyLossRow = dom.appRoot.querySelector('#preview-my-loss-row');

  bindDecimalInput(dom.appRoot.querySelector('#amount'));
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

    dom.appRoot.querySelectorAll('.interest-based-field').forEach((element) => {
      element.classList.toggle('hidden', isRealEstate);
    });
    dom.appRoot.querySelectorAll('.real-estate-field').forEach((element) => {
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

    dom.appRoot.querySelectorAll('.open-only-field').forEach((element) => {
      element.classList.toggle('hidden', isRealEstate ? isSold : interestClosed);
    });
    dom.appRoot.querySelectorAll('.interest-closed-field').forEach((element) => {
      element.classList.toggle('hidden', !interestClosed);
    });
    dom.appRoot.querySelectorAll('.re-sold-field').forEach((element) => {
      element.classList.toggle('hidden', !isSold);
    });
    amountRecoveredField.classList.toggle('hidden', !showAmountRecovered);

    if (isRealEstate) {
      dom.appRoot.querySelectorAll('.re-active-field').forEach((element) => {
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
      const previewGain = dom.appRoot.querySelector('#preview-unrealized-gain');

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

      dom.appRoot.querySelector('#preview-return').textContent = formatUsd(expectedReturn);
      dom.appRoot.querySelector('#preview-total').textContent = formatUsd(
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
      const previewGain = dom.appRoot.querySelector('#preview-my-actual-gain');
      previewGain.textContent = formatUsd(myActualReturn);
      previewGain.classList.toggle('highlight', !hasLoss);
      previewGain.classList.toggle('loss', hasLoss);
    } else if (hasLoss) {
      dom.appRoot.querySelector('#preview-my-actual-loss').textContent = formatUsd(myActualLoss);
    } else {
      previewReturnRow.classList.remove('hidden');
      dom.appRoot.querySelector('#preview-actual-return').textContent = formatUsd(actualReturn);
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

    upsertProject(getData(), project);
    navigate('project-detail', { companyId, projectId: project.id });
  });

  const deleteButton = dom.appRoot.querySelector('#delete-project');
  if (deleteButton) {
    deleteButton.onclick = () => {
      if (window.confirm('Delete this project? This cannot be undone.')) {
        deleteProject(getData(), existing.id);
        navigate('company-detail', { companyId });
      }
    };
  }
}
