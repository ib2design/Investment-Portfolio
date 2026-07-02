import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml, detailRow, detailRowIf } from '../ui/dom.js';
import { formatDate, formatUsd } from '../calculations.js';
import { getProject } from '../storage.js';

function getExpectedReturnDisplay(project) {
  if (project.expectedReturn !== null && project.expectedReturn !== undefined && project.expectedReturn !== '') {
    return Number(project.expectedReturn);
  }

  return null;
}

export function renderProjectDetail(projectId) {
  const project = getProject(getData(), projectId);

  if (!project) {
    navigate('portfolio');
    return;
  }

  const expectedReturn = getExpectedReturnDisplay(project);

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
      ${detailRow('Total Investment', escapeHtml(formatUsd(project.amount)))}
      ${detailRowIf(
        'Maturation Date',
        Boolean(project.maturationDate),
        escapeHtml(formatDate(project.maturationDate)),
      )}
      ${detailRowIf(
        'Expected Return',
        expectedReturn !== null && !Number.isNaN(expectedReturn),
        escapeHtml(formatUsd(expectedReturn)),
      )}
    </section>
  `;
}
