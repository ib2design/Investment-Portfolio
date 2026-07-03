import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml, detailRow, detailRowIf } from '../ui/dom.js';
import { formatDate, formatUsd } from '../calculations.js';
import { getCompany, getProject } from '../storage.js';

function getTotalExpectedReturn(project) {
  if (project.expectedReturn !== null && project.expectedReturn !== undefined && project.expectedReturn !== '') {
    const value = Number(project.expectedReturn);
    return Number.isNaN(value) ? null : value;
  }

  return null;
}

export function renderProjectDetail(projectId) {
  const data = getData();
  const project = getProject(data, projectId);

  if (!project) {
    navigate('portfolio');
    return;
  }

  const company = getCompany(data, project.companyId);
  const partnerCount = Math.max(1, Number(company?.partnerCount) || 1);
  const totalInvestment = Number(project.amount) || 0;
  const myInvestment = totalInvestment / partnerCount;
  const totalExpectedReturn = getTotalExpectedReturn(project);
  const myExpectedReturn =
    totalExpectedReturn !== null ? totalExpectedReturn / partnerCount : null;

  updateChrome({
    showBack: true,
    showFab: false,
    headerLabel: 'Edit',
    headerHandler: () =>
      navigate('project-form', { companyId: project.companyId, projectId: project.id }),
  });

  dom.appRoot.innerHTML = `
    <section class="card detail-grid detail-card">
      ${detailRow('Project Name', escapeHtml(project.name))}
      ${detailRow('Date Invested', escapeHtml(formatDate(project.dateInvested)))}
      ${detailRowIf(
        'Maturation Date',
        Boolean(project.maturationDate),
        escapeHtml(formatDate(project.maturationDate)),
      )}
      ${detailRow('Total Investment', escapeHtml(formatUsd(totalInvestment)))}
      ${detailRowIf(
        'Total Expected Return',
        totalExpectedReturn !== null,
        escapeHtml(formatUsd(totalExpectedReturn)),
      )}
      ${detailRow('My Investment', escapeHtml(formatUsd(myInvestment)))}
      ${detailRowIf(
        'My Expected Return',
        myExpectedReturn !== null,
        escapeHtml(formatUsd(myExpectedReturn)),
      )}
    </section>
  `;
}
