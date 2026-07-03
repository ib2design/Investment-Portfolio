import { CURRENCY, LIMITS, PROJECT_STATUS } from '../constants.js';
import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml, truncate, fieldLabel } from '../ui/dom.js';
import { applyFormErrors, bindFormFieldErrors } from '../ui/forms.js';
import { validateProjectForm } from '../services/validation.js';
import { bindDecimalInput } from '../formInputs.js';
import {
  createId,
  deleteProject,
  getCompany,
  getProject,
  nowIso,
  upsertProject,
} from '../storage.js';

function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function renderProjectForm(companyId, projectId) {
  const company = getCompany(getData(), companyId);

  if (!company) {
    navigate('portfolio');
    return;
  }

  const existing = projectId ? getProject(getData(), projectId) : null;
  const isEdit = Boolean(existing);
  const expectedReturnValue =
    existing?.expectedReturn !== null && existing?.expectedReturn !== undefined
      ? existing.expectedReturn
      : '';

  updateChrome({
    subtitle: isEdit ? 'Edit Project' : 'Add Project',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
    <form class="form project-form" id="project-form" novalidate>
      <div class="field" data-field="name">
        <label for="project-name">${fieldLabel('Project Name', true)}</label>
        <input id="project-name" name="name" maxlength="${LIMITS.projectName}" required value="${escapeHtml(existing?.name || '')}" />
        <p class="field-error hidden" data-field-error="name"></p>
      </div>
      <div class="field" data-field="dateInvested">
        <label for="date-invested">${fieldLabel('Date Invested', true)}</label>
        <input id="date-invested" name="dateInvested" type="date" required value="${escapeHtml(existing?.dateInvested || '')}" />
        <p class="field-error hidden" data-field-error="dateInvested"></p>
      </div>
      <div class="field" data-field="amount">
        <label for="amount">${fieldLabel(`Total Investment (${CURRENCY})`, true)} <span class="field-label-note">(Co. total, not your share.)</span></label>
        <input id="amount" name="amount" type="text" inputmode="decimal" autocomplete="off" required value="${escapeHtml(existing?.amount ?? '')}" />
        <p class="field-error hidden" data-field-error="amount"></p>
      </div>
      <div class="field" data-field="maturationDate">
        <label for="maturation-date">Maturation Date</label>
        <input id="maturation-date" name="maturationDate" type="date" value="${escapeHtml(existing?.maturationDate || '')}" />
        <p class="field-error hidden" data-field-error="maturationDate"></p>
      </div>
      <div class="field" data-field="expectedReturn">
        <label for="expected-return">Total Expected Return (${CURRENCY}) <span class="field-label-note">(Co. total)</span></label>
        <input id="expected-return" name="expectedReturn" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(expectedReturnValue)}" />
        <p class="field-error hidden" data-field-error="expectedReturn"></p>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Save Changes' : 'Add Project'}</button>
        ${isEdit ? '<button type="button" class="btn btn-danger btn-block" id="delete-project">Delete Project</button>' : ''}
      </div>
    </form>
  `;

  const form = dom.appRoot.querySelector('#project-form');

  bindDecimalInput(form.querySelector('#amount'));
  bindDecimalInput(form.querySelector('#expected-return'));
  bindFormFieldErrors(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = truncate(formData.get('name'), LIMITS.projectName);
    const dateInvested = formData.get('dateInvested');
    const amount = Number(formData.get('amount'));
    const maturationDate = formData.get('maturationDate') || null;
    const expectedReturn = parseOptionalNumber(formData.get('expectedReturn'));
    const errors = validateProjectForm({
      name,
      dateInvested,
      amount,
      maturationDate,
      expectedReturn,
    });

    if (!applyFormErrors(form, errors)) {
      return;
    }

    const timestamp = nowIso();
    const project = {
      id: existing?.id || createId(),
      companyId,
      name,
      type: existing?.type || 'lent_interest',
      typeOther: existing?.typeOther || '',
      status: existing?.status || PROJECT_STATUS.ACTIVE,
      dateInvested,
      amount,
      maturationDate,
      expectedReturn,
      aprPercent: null,
      aprType: null,
      closedDate: existing?.closedDate || null,
      amountRecovered: existing?.amountRecovered ?? null,
      soldDate: existing?.soldDate || null,
      soldPrice: existing?.soldPrice ?? null,
      loanPayoffDate: existing?.loanPayoffDate || null,
      estimatedValue: existing?.estimatedValue ?? null,
      reminderDate: existing?.reminderDate || null,
      contactPerson: existing?.contactPerson || '',
      documentationUrl: existing?.documentationUrl || '',
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    upsertProject(getData(), project);
    navigate('project-detail', { companyId, projectId: project.id });
  });

  const deleteButton = form.querySelector('#delete-project');
  if (deleteButton) {
    deleteButton.onclick = () => {
      if (window.confirm('Delete this project? This cannot be undone.')) {
        deleteProject(getData(), existing.id);
        navigate('company-detail', { companyId });
      }
    };
  }
}
