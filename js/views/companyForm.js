import { LIMITS } from '../constants.js';
import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml, truncate, fieldLabel } from '../ui/dom.js';
import {
  applyFormErrors,
  bindFormFieldErrors,
} from '../ui/forms.js';
import { validateCompanyForm } from '../services/validation.js';
import { bindIntegerInput } from '../formInputs.js';
import {
  createId,
  deleteCompany,
  getCompany,
  getNextColorIndex,
  nowIso,
  upsertCompany,
} from '../storage.js';

export function renderCompanyForm(companyId) {
  const data = getData();
  const existing = companyId ? getCompany(data, companyId) : null;
  const isEdit = Boolean(existing);

  updateChrome({
    subtitle: isEdit ? 'Edit Company' : 'Add Company',
    showBack: true,
    showFab: false,
  });

  dom.appRoot.innerHTML = `
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
      <div class="form-actions">
        <button type="submit" class="btn btn-primary btn-block">${isEdit ? 'Save Changes' : 'Add Company'}</button>
        ${isEdit ? '<button type="button" class="btn btn-danger btn-block" id="delete-company">Delete Company</button>' : ''}
      </div>
    </form>
  `;

  const form = dom.appRoot.querySelector('#company-form');

  bindIntegerInput(dom.appRoot.querySelector('#partner-count'));
  bindFormFieldErrors(form);

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = truncate(formData.get('name'), LIMITS.companyName);
    const partnerCount = Number(formData.get('partnerCount'));
    const errors = validateCompanyForm({ name, partnerCount });

    if (!applyFormErrors(form, errors)) {
      return;
    }

    const timestamp = nowIso();
    const company = {
      id: existing?.id || createId(),
      name,
      partnerCount,
      documentationUrl: existing?.documentationUrl || '',
      colorIndex: existing?.colorIndex ?? getNextColorIndex(getData()),
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
    };

    upsertCompany(getData(), company);
    navigate('company-detail', { companyId: company.id });
  });

  const deleteButton = dom.appRoot.querySelector('#delete-company');
  if (deleteButton) {
    deleteButton.onclick = () => {
      if (
        window.confirm(
          'Delete this company and all of its projects? This cannot be undone.',
        )
      ) {
        deleteCompany(getData(), existing.id);
        navigate('portfolio');
      }
    };
  }
}
