import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml } from '../ui/dom.js';
import { companyColorStyle } from '../colors.js';
import { formatUsdCompact } from '../calculations.js';
import { AMOUNT_DISPLAY, PROJECT_STATUS } from '../constants.js';
import { getCompanyDetailTotals } from '../services/portfolioMetrics.js';
import {
  createId,
  deleteCompany,
  getNextColorIndex,
  getProjectsForCompany,
  nowIso,
  upsertCompany,
  upsertProject,
} from '../storage.js';

const SAMPLE_COMPANY_NAME = 'Sample Holdings LLC';

function companyCardMeta(companyId, partnerCount) {
  const projectCount = getProjectsForCompany(getData(), companyId).length;
  return `${projectCount} project${projectCount === 1 ? '' : 's'} · ${partnerCount} partner${partnerCount === 1 ? '' : 's'}`;
}

function getSampleCompany(data = getData()) {
  return data.companies.find((company) => company.name === SAMPLE_COMPANY_NAME) ?? null;
}

function portfolioActionButtons() {
  return `
    <div class="portfolio-actions">
      <button type="button" class="btn btn-primary btn-block" data-action="add-company">Add Company</button>
      <div class="portfolio-sample-actions">
        <button type="button" class="btn btn-primary btn-block" data-action="add-sample-data">Add Sample Data</button>
        <button type="button" class="btn btn-danger btn-block" data-action="delete-sample-data">Delete Sample Data</button>
      </div>
    </div>
  `;
}

function bindPortfolioActions(root) {
  root.querySelector('[data-action="add-company"]')?.addEventListener('click', () => navigate('company-form'));
  root.querySelector('[data-action="add-sample-data"]')?.addEventListener('click', () => {
    if (!createSampleData()) {
      return;
    }

    renderPortfolio();
  });
  root.querySelector('[data-action="delete-sample-data"]')?.addEventListener('click', () => {
    if (!deleteSampleData()) {
      return;
    }

    renderPortfolio();
  });
}

function createSampleData() {
  const data = getData();

  if (getSampleCompany(data)) {
    window.alert('Sample data already exists.');
    return false;
  }

  const timestamp = nowIso();
  const companyId = createId();

  upsertCompany(data, {
    id: companyId,
    name: SAMPLE_COMPANY_NAME,
    partnerCount: 3,
    documentationUrl: '',
    colorIndex: getNextColorIndex(data),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  [
    {
      name: 'Bridge Loan A',
      dateInvested: '2024-01-15',
      amount: 50000,
      maturationDate: '2025-06-15',
      expectedReturn: 4500,
    },
    {
      name: 'Growth Fund B',
      dateInvested: '2024-03-01',
      amount: 120000,
      maturationDate: '2026-03-01',
      expectedReturn: 18000,
    },
  ].forEach((sample) => {
    upsertProject(data, {
      id: createId(),
      companyId,
      name: sample.name,
      type: 'lent_interest',
      typeOther: '',
      status: PROJECT_STATUS.ACTIVE,
      dateInvested: sample.dateInvested,
      amount: sample.amount,
      maturationDate: sample.maturationDate,
      expectedReturn: sample.expectedReturn,
      aprPercent: null,
      aprType: null,
      closedDate: null,
      amountRecovered: null,
      soldDate: null,
      soldPrice: null,
      loanPayoffDate: null,
      estimatedValue: null,
      reminderDate: null,
      contactPerson: '',
      documentationUrl: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  return true;
}

function deleteSampleData() {
  const data = getData();
  const sampleCompany = getSampleCompany(data);

  if (!sampleCompany) {
    window.alert('No sample data to delete.');
    return false;
  }

  deleteCompany(data, sampleCompany.id);
  return true;
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
        ${portfolioActionButtons()}
      </section>
    `;

    bindPortfolioActions(dom.appRoot);
    return;
  }

  const cards = data.companies
    .map((company) => {
      const { invested } = getCompanyDetailTotals(company.id, AMOUNT_DISPLAY.MY_SHARE);

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
              <span class="card-share-label">My share</span>
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
      ${portfolioActionButtons()}
    </section>
  `;

  dom.appRoot.querySelectorAll('[data-company-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate('company-detail', { companyId: card.dataset.companyId });
    });
  });

  bindPortfolioActions(dom.appRoot);
}
