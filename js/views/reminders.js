import { dom } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { getAttentionProjects, renderProjectSummaryCard } from '../services/portfolioMetrics.js';
import { escapeHtml } from '../ui/dom.js';

export function renderReminders() {
  updateChrome({
    showBack: false,
    showFab: false,
  });

  const items = getAttentionProjects();

  if (items.length === 0) {
    dom.appRoot.innerHTML = `
      <section class="empty-state">
        <p>No overdue or at-risk projects right now.</p>
      </section>
    `;
    return;
  }

  const cards = items
    .map(({ project, company, metrics }) => {
      return renderProjectSummaryCard(project, metrics, {
        extraMeta: `<p class="card-meta">${escapeHtml(company?.name || 'Unknown company')}</p>`,
        showAmount: false,
        dataAttrs: `data-project-id="${escapeHtml(project.id)}" data-company-id="${escapeHtml(project.companyId)}"`,
      });
    })
    .join('');

  dom.appRoot.innerHTML = `<section class="card-list">${cards}</section>`;

  dom.appRoot.querySelectorAll('[data-project-id]').forEach((card) => {
    card.addEventListener('click', () => {
      navigate('project-detail', {
        companyId: card.dataset.companyId,
        projectId: card.dataset.projectId,
      });
    });
  });
}
