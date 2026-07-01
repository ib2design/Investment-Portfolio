import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml } from '../ui/dom.js';
import { documentationLinkHtml } from '../ui/documentation.js';
import { companyColorStyle } from '../colors.js';
import { getCompanyProjectsSectionTitle } from '../calculations.js';
import { getCompany, getProjectsForCompany, getProjectFilter } from '../storage.js';
import {
  getProjectMetrics,
  companyDetailStatsMarkup,
  companyPartnerIcon,
  renderProjectSummaryCard,
} from '../services/portfolioMetrics.js';
import { getVisibleProjectsForCompany } from '../services/visibility.js';

export function renderCompanyDetail(companyId) {
  const data = getData();
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

  dom.appRoot.innerHTML = `
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

  dom.appRoot.querySelectorAll('[data-project-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate('project-detail', { companyId, projectId: card.dataset.projectId });
    });
  });
}
