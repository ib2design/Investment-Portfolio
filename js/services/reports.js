import {
  getAmountDisplayLabel,
  getProjectFilterLabel,
  getProjectTypeReportLabel,
  getProjectStatusReportLabel,
  getProjectInvestmentAmount,
  getDisplayAmount,
} from '../calculations.js';
import { getAmountDisplayMode } from '../storage.js';
import { getData } from '../context.js';
import { escapeHtml } from '../ui/dom.js';
import {
  getProjectMetrics,
  getProjectReportGainLoss,
  formatReportMoney,
} from './portfolioMetrics.js';
import { getVisibleProjectsForCompany } from './visibility.js';

export { formatReportMoney };

export function projectHasReportAmounts(investment, gainLoss) {
  if (Number(investment) > 0) {
    return true;
  }

  return gainLoss !== null && gainLoss !== undefined && !Number.isNaN(Number(gainLoss));
}

export function buildPortfolioReport(displayMode = getAmountDisplayMode()) {
  const data = getData();
  const companies = [...data.companies].sort((a, b) => a.name.localeCompare(b.name));
  const grand = { investment: 0, gainLoss: 0, trackGain: false };
  const sections = [];

  companies.forEach((company) => {
    const projects = [...getVisibleProjectsForCompany(company.id)].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    if (projects.length === 0) {
      return;
    }

    const subtotal = { investment: 0, gainLoss: 0, trackGain: false };
    const rows = projects
      .map((project) => {
        const metrics = getProjectMetrics(project);
        const investment = getDisplayAmount(
          getProjectInvestmentAmount(project),
          company.partnerCount,
          displayMode,
        );
        const rawGain = getProjectReportGainLoss(project, metrics);
        const gainLoss =
          rawGain === null || rawGain === undefined
            ? null
            : getDisplayAmount(rawGain, company.partnerCount, displayMode);

        return { project, metrics, investment, gainLoss };
      })
      .filter(({ investment, gainLoss }) => projectHasReportAmounts(investment, gainLoss));

    if (rows.length === 0) {
      return;
    }

    rows.forEach(({ investment, gainLoss }) => {
      subtotal.investment += investment;
      grand.investment += investment;

      if (gainLoss !== null && !Number.isNaN(gainLoss)) {
        subtotal.gainLoss += gainLoss;
        subtotal.trackGain = true;
        grand.gainLoss += gainLoss;
        grand.trackGain = true;
      }
    });

    sections.push({ company, rows, subtotal });
  });

  return { sections, grand, displayMode };
}

export function reportGainLossClass(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (value < 0) {
    return 'loss';
  }

  if (value > 0) {
    return 'highlight';
  }

  return '';
}

export function formatReportTotalMoney(value) {
  return formatReportMoney(value, { decimals: 2 });
}

export function formatReportGainLoss(value, { total = false } = {}) {
  return total ? formatReportTotalMoney(value) : formatReportMoney(value);
}

export function calculateReportRoii(investment, gainLoss) {
  const invested = Number(investment);

  if (!invested || Number.isNaN(invested) || gainLoss === null || gainLoss === undefined) {
    return null;
  }

  const gain = Number(gainLoss);

  if (Number.isNaN(gain)) {
    return null;
  }

  return (gain / invested) * 100;
}

export function reportRoiiCell(investment, gainLoss, { trackGain = true, strong = false } = {}) {
  const roii = trackGain ? calculateReportRoii(investment, gainLoss) : null;
  const text = roii === null ? '—' : `${roii.toFixed(1)}%`;
  const html = strong ? `<strong>${escapeHtml(text)}</strong>` : escapeHtml(text);

  return {
    html,
    className: `report-num ${reportGainLossClass(roii)}`.trim(),
  };
}

export function reportTableColgroup() {
  return `
    <colgroup>
      <col class="report-col-project" />
      <col class="report-col-type" />
      <col class="report-col-status" />
      <col class="report-col-money" />
      <col class="report-col-money" />
      <col class="report-col-roii" />
    </colgroup>
  `;
}

export function reportAmountModeHtml(displayMode) {
  const label = getAmountDisplayLabel(displayMode);
  return `<span class="report-amount-mode">${escapeHtml(label)}</span>`;
}

export function reportProjectFilterHtml(filter) {
  const label = getProjectFilterLabel(filter);
  return `<span class="report-amount-mode">${escapeHtml(label)}</span>`;
}

export function reportStatusHtml(displayStatus) {
  const statusClass = displayStatus.replace(/_/g, '-');
  const label = getProjectStatusReportLabel(displayStatus);

  return `<span class="report-status report-status-${statusClass}">${escapeHtml(label)}</span>`;
}

export function renderReportTableRow(cells, { rowClass = '' } = {}) {
  const classAttr = rowClass ? ` class="${rowClass}"` : '';

  return `<tr${classAttr}>${cells
    .map((cell) => {
      if (typeof cell === 'string') {
        return `<td>${cell}</td>`;
      }

      const className = cell.className ? ` class="${cell.className}"` : '';
      return `<td${className}>${cell.html}</td>`;
    })
    .join('')}</tr>`;
}

export function renderReportCompanySection({ company, rows, subtotal }) {
  const bodyRows = rows
    .map(({ project, metrics, investment, gainLoss }) =>
      renderReportTableRow([
        { html: escapeHtml(project.name) },
        { html: escapeHtml(getProjectTypeReportLabel(project.type, project.typeOther)) },
        { html: reportStatusHtml(metrics.displayStatus) },
        { html: escapeHtml(formatReportMoney(investment)), className: 'report-num' },
        {
          html: escapeHtml(formatReportGainLoss(gainLoss)),
          className: `report-num ${reportGainLossClass(gainLoss)}`.trim(),
        },
        reportRoiiCell(investment, gainLoss, { trackGain: gainLoss !== null }),
      ]),
    )
    .join('');

  const subtotalGainClass = reportGainLossClass(subtotal.trackGain ? subtotal.gainLoss : null);
  const subtotalGain = subtotal.trackGain ? subtotal.gainLoss : null;

  return `
    <section class="report-company">
      <h2 class="report-company-title">${escapeHtml(company.name)}</h2>
      <table class="report-table">
        ${reportTableColgroup()}
        <thead>
          <tr>
            <th scope="col">Project</th>
            <th scope="col">Type</th>
            <th scope="col">Status</th>
            <th scope="col" class="report-num">Invest.</th>
            <th scope="col" class="report-num">Net G/L</th>
            <th scope="col" class="report-num">ROI%</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
        <tfoot>
          ${renderReportTableRow(
            [
              { html: '<strong>Subtotal</strong>', className: 'report-subtotal-label' },
              { html: '' },
              { html: '' },
              { html: `<strong>${escapeHtml(formatReportTotalMoney(subtotal.investment))}</strong>`, className: 'report-num' },
              {
                html: `<strong>${escapeHtml(formatReportGainLoss(subtotalGain, { total: true }))}</strong>`,
                className: `report-num ${subtotalGainClass}`.trim(),
              },
              reportRoiiCell(subtotal.investment, subtotalGain, {
                trackGain: subtotal.trackGain,
                strong: true,
              }),
            ],
            { rowClass: 'report-subtotal-row' },
          )}
        </tfoot>
      </table>
    </section>
  `;
}
