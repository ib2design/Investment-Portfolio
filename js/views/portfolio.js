import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml } from '../ui/dom.js';
import { companyColorStyle } from '../colors.js';
import { formatUsdCompact } from '../calculations.js';
import { AMOUNT_DISPLAY } from '../constants.js';
import { getCompanyDetailTotals } from '../services/portfolioMetrics.js';
import { getProjectsForCompany } from '../storage.js';

function companyCardMeta(companyId, partnerCount) {
  const projectCount = getProjectsForCompany(getData(), companyId).length;
  return `${projectCount} project${projectCount === 1 ? '' : 's'} · ${partnerCount} partner${partnerCount === 1 ? '' : 's'}`;
}

export function renderPortfolio() {
  const data = getData();

  updateChrome({
    showBack: false,
    showFab: false,
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

  const cards = data.companies
    .map((company) => {
      const { invested } = getCompanyDetailTotals(company.id, AMOUNT_DISPLAY.GROUP);

      return `
        <article class="card company-card clickable" style="${companyColorStyle(company.colorIndex)}" data-company-id="${escapeHtml(company.id)}">
          <div class="card-row">
            <div class="company-card-heading">
              <div class="company-card-text">
                <h2 class="card-title">${escapeHtml(company.name)}</h2>
                <p class="card-meta">${escapeHtml(companyCardMeta(company.id, company.partnerCount))}</p>
              </div>
            </div>
            <div class="company-card-amount">
              <p class="card-amount">${escapeHtml(formatUsdCompact(invested))}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  dom.appRoot.innerHTML = `
    <section class="card-list">
      ${cards}
      <button type="button" class="btn btn-primary btn-block portfolio-add-company" data-action="add-company">Add Company</button>
    </section>
  `;

  dom.appRoot.querySelectorAll('[data-company-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate('company-detail', { companyId: card.dataset.companyId });
    });
  });

  dom.appRoot.querySelector('[data-action="add-company"]').onclick = () => navigate('company-form');
}
