import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml } from '../ui/dom.js';
import { getAmountDisplayMode, getProjectFilter } from '../storage.js';
import {
  buildPortfolioReport,
  formatReportGainLoss,
  formatReportTotalMoney,
  reportAmountModeHtml,
  reportGainLossClass,
  reportProjectFilterHtml,
  renderReportCompanySection,
  renderReportTableRow,
  reportTableColgroup,
  reportRoiiCell,
} from '../services/reports.js';

export function renderReports() {
  updateChrome({
    showBack: false,
    showFab: false,
  });

  const data = getData();
  const displayMode = getAmountDisplayMode();
  const projectFilter = getProjectFilter();
  const { sections, grand } = buildPortfolioReport(displayMode);
  const generatedAt = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  if (sections.length === 0) {
    const emptyMessage =
      data.projects.length > 0
        ? 'No projects match the current project filter. Change Show Both, Show Active, or Show Past in Settings.'
        : 'No projects to report yet. Add companies and projects first.';

    dom.appRoot.innerHTML = `
      <section class="empty-state">
        <p>${escapeHtml(emptyMessage)}</p>
      </section>
    `;
    return;
  }

  const companySections = sections.map(renderReportCompanySection).join('');
  const grandGainClass = reportGainLossClass(grand.trackGain ? grand.gainLoss : null);
  const grandGain = grand.trackGain ? grand.gainLoss : null;

  dom.appRoot.innerHTML = `
    <article class="report-document card">
      <header class="report-header">
        <div class="report-header-bar">
          <h1 class="report-title">Portfolio Report</h1>
          <button type="button" class="btn btn-primary" id="report-print-button">Print / Save PDF</button>
        </div>
        <p class="report-meta">Generated ${escapeHtml(generatedAt)}</p>
        <p class="report-meta">Projects included: ${reportProjectFilterHtml(projectFilter)}</p>
        <p class="report-meta">All amounts shown as ${reportAmountModeHtml(displayMode)}</p>
        <p class="report-note">Closed projects use actual results; open projects use expected or unrealized amounts where available.</p>
      </header>
      ${companySections}
      <section class="report-grand-total">
        <table class="report-table">
          ${reportTableColgroup()}
          <tfoot>
            ${renderReportTableRow(
              [
                { html: '<strong>Grand total</strong>', className: 'report-subtotal-label' },
                { html: '' },
                { html: '' },
                { html: `<strong>${escapeHtml(formatReportTotalMoney(grand.investment))}</strong>`, className: 'report-num' },
                {
                  html: `<strong>${escapeHtml(formatReportGainLoss(grandGain, { total: true }))}</strong>`,
                  className: `report-num ${grandGainClass}`.trim(),
                },
                reportRoiiCell(grand.investment, grandGain, { trackGain: grand.trackGain, strong: true }),
              ],
              { rowClass: 'report-grand-total-row' },
            )}
          </tfoot>
        </table>
      </section>
    </article>
  `;

  dom.appRoot.querySelector('#report-print-button')?.addEventListener('click', () => {
    window.print();
  });
}
