import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml } from '../ui/dom.js';
import { companyColorStyle } from '../colors.js';
import { formatUsdCompact } from '../calculations.js';
import { getAmountDisplayMode } from '../storage.js';
import {
  companyActiveInvested,
  companyPartnerIcon,
  companyProjectMetaMarkup,
} from '../services/portfolioMetrics.js';
import { getVisibleCompanies } from '../services/visibility.js';

export function renderPortfolio() {
  const displayMode = getAmountDisplayMode();
  const data = getData();

  updateChrome({
    showBack: false,
    showFab: true,
    fabAction: () => navigate('company-form'),
  });

  if (data.companies.length === 0) {
    dom.appRoot.innerHTML = `
      <section class="empty-state">
        <p>No companies yet. Add your first company to start tracking investments.</p>
        <button type="button" class="btn btn-primary" data-action="add-company">Add Company</button>
      </section>
    `;

    dom.appRoot.querySelector('[data-action="add-company"]').onclick = () => navigate('company-form');
    return;
  }

  const companies = getVisibleCompanies();

  if (companies.length === 0) {
    dom.appRoot.innerHTML = `
      <section class="empty-state">
        <p>No companies match the current project filter. Change Show Both, Show Active, or Show Past in Settings.</p>
      </section>
    `;
    return;
  }

  const cards = companies
    .map((company) => {
      const activeInvested = companyActiveInvested(company.id, displayMode);

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
            <div class="company-card-amount">
              <span class="company-card-amount-label">Active</span>
              <p class="card-amount">${escapeHtml(formatUsdCompact(activeInvested))}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  dom.appRoot.innerHTML = `<section class="card-list">${cards}</section>`;

  dom.appRoot.querySelectorAll('[data-company-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate('company-detail', { companyId: card.dataset.companyId });
    });
  });
}
