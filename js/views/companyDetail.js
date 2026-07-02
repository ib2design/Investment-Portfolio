import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml } from '../ui/dom.js';
import { companyColorStyle } from '../colors.js';
import { formatUsdCompact, getProjectInvestmentAmount } from '../calculations.js';
import { getCompany, getProjectsForCompany } from '../storage.js';

function renderProjectCard(project) {
  const invested = formatUsdCompact(getProjectInvestmentAmount(project));

  return `
    <article class="card clickable company-detail-project-card" data-project-id="${escapeHtml(project.id)}">
      <div class="card-row">
        <h2 class="card-title">${escapeHtml(project.name)}</h2>
        <p class="card-amount">${escapeHtml(invested)}</p>
      </div>
    </article>
  `;
}

export function renderCompanyDetail(companyId) {
  const data = getData();
  const company = getCompany(data, companyId);

  if (!company) {
    navigate('portfolio');
    return;
  }

  const projects = getProjectsForCompany(data, companyId);
  const projectCount = projects.length;

  updateChrome({
    showBack: true,
    showFab: false,
    headerLabel: 'Edit',
    headerHandler: () => navigate('company-form', { companyId }),
  });

  const addProjectButton =
    '<button type="button" class="btn btn-primary btn-block company-add-project" data-action="add-project">Add Project</button>';
  const projectCards = projects.map((project) => renderProjectCard(project)).join('');

  dom.appRoot.innerHTML = `
    <section class="card company-card company-detail-card" style="${companyColorStyle(company.colorIndex)}; margin-bottom: 12px;">
      <p class="company-detail-line">
        <span class="company-detail-name">${escapeHtml(company.name)}</span><span class="company-detail-meta"> · ${projectCount} project${projectCount === 1 ? '' : 's'} · ${company.partnerCount} partner${company.partnerCount === 1 ? '' : 's'}</span>
      </p>
    </section>
    ${projectCount === 0 ? addProjectButton : ''}
    <h2 class="section-title">Projects</h2>
    <section class="card-list">
      ${projectCards}
      ${projectCount > 0 ? addProjectButton : ''}
    </section>
  `;

  dom.appRoot.querySelectorAll('[data-project-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate('project-detail', { companyId, projectId: card.dataset.projectId });
    });
  });

  dom.appRoot.querySelectorAll('[data-action="add-project"]').forEach((button) => {
    button.onclick = () => navigate('project-form', { companyId });
  });
}
