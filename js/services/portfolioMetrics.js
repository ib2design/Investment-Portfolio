import { PROJECT_STATUS, PROJECT_DISPLAY_STATUS, REMINDER_WINDOW_DAYS } from '../constants.js';
import {
  calculateExpectedReturn,
  calculateMaturityTotal,
  calculateUnrealizedGain,
  formatDate,
  formatDisplayUsdCompact,
  formatMaturationCountdown,
  formatUsdCompact,
  getProjectEndDate,
  getProjectInvestmentAmount,
  getDisplayAmount,
  getProjectTypeIcon,
  getProjectStatusLabel,
  getProjectOutcome,
  isRealEstateProject,
  isProjectClosed,
  resolveProjectStatus,
} from '../calculations.js';
import { getCompany, getProjectsForCompany, getAmountDisplayMode } from '../storage.js';
import { getData } from '../context.js';
import { escapeHtml } from '../ui/dom.js';
import { getVisibleProjects, getVisibleProjectsForCompany } from './visibility.js';

function reportMoneyParts(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const amount = Number(value);

  if (Number.isNaN(amount) || amount === 0) {
    return null;
  }

  return {
    amount,
    abs: Math.abs(amount),
    sign: amount < 0 ? '-' : '',
  };
}

export function formatReportMoney(value) {
  const parts = reportMoneyParts(value);

  if (!parts) {
    return '—';
  }

  return `${parts.sign}$${Math.round(parts.abs)}`;
}

export function getProjectMetrics(project) {
  const displayStatus = resolveProjectStatus(project, REMINDER_WINDOW_DAYS);

  if (isRealEstateProject(project.type)) {
    return {
      expectedReturn: 0,
      maturityTotal: project.amount,
      unrealizedGain: calculateUnrealizedGain(project.amount, project.estimatedValue),
      displayStatus,
    };
  }

  const expectedReturn = calculateExpectedReturn(
    project.amount,
    project.aprPercent,
    project.aprType,
    project.dateInvested,
    project.maturationDate,
  );

  return {
    expectedReturn,
    maturityTotal: calculateMaturityTotal(project.amount, expectedReturn),
    unrealizedGain: null,
    displayStatus,
  };
}

export function getAttentionProjects() {
  const data = getData();

  return getVisibleProjects(data.projects)
    .map((project) => {
      const company = getCompany(data, project.companyId);
      const metrics = getProjectMetrics(project);
      const { displayStatus } = metrics;

      if (
        displayStatus !== PROJECT_DISPLAY_STATUS.OVERDUE &&
        displayStatus !== PROJECT_STATUS.AT_RISK
      ) {
        return null;
      }

      return { project, company, metrics };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const priority = {
        [PROJECT_DISPLAY_STATUS.OVERDUE]: 0,
        [PROJECT_STATUS.AT_RISK]: 1,
      };
      return priority[a.metrics.displayStatus] - priority[b.metrics.displayStatus];
    });
}

export function companyTotalInvested(companyId, displayMode = getAmountDisplayMode()) {
  const data = getData();
  const company = getCompany(data, companyId);

  if (!company) {
    return 0;
  }

  return getProjectsForCompany(data, companyId).reduce(
    (sum, project) =>
      sum + getDisplayAmount(getProjectInvestmentAmount(project), company.partnerCount, displayMode),
    0,
  );
}

export function getProjectReportGainLoss(project, metrics) {
  if (isProjectClosed(project)) {
    return getProjectOutcome(project).actualReturn;
  }

  if (isRealEstateProject(project.type)) {
    return metrics.unrealizedGain;
  }

  return metrics.expectedReturn;
}

export function getCompanyDetailTotals(companyId, displayMode = getAmountDisplayMode()) {
  const data = getData();
  const company = getCompany(data, companyId);

  if (!company) {
    return { invested: 0, activeInvested: 0, realized: 0, expected: 0 };
  }

  const totals = { invested: 0, activeInvested: 0, realized: 0, expected: 0 };

  getProjectsForCompany(data, companyId).forEach((project) => {
    const metrics = getProjectMetrics(project);
    const share = (amount) => getDisplayAmount(amount, company.partnerCount, displayMode);
    const investment = share(getProjectInvestmentAmount(project));

    totals.invested += investment;

    if (!isProjectClosed(project)) {
      totals.activeInvested += investment;
    }

    if (isProjectClosed(project)) {
      const netGainLoss = getProjectOutcome(project).actualReturn;

      if (!Number.isNaN(Number(netGainLoss))) {
        totals.realized += share(netGainLoss);
      }

      return;
    }

    const expectedGainLoss = getProjectReportGainLoss(project, metrics);

    if (expectedGainLoss !== null && expectedGainLoss !== undefined && !Number.isNaN(Number(expectedGainLoss))) {
      totals.expected += share(expectedGainLoss);
    }
  });

  return totals;
}

export function companyDetailStatsMarkup(companyId) {
  const { invested, activeInvested, realized, expected } = getCompanyDetailTotals(companyId);
  const realizedClass = realized > 0 ? 'gain' : realized < 0 ? 'loss' : '';
  const expectedClass = expected > 0 ? 'gain' : expected < 0 ? 'loss' : '';

  return `
    <div class="company-detail-stats">
      <div class="company-detail-stat">
        <span class="company-detail-stat-label">Total Invested</span>
        <span class="company-detail-stat-value">${escapeHtml(formatUsdCompact(invested))}</span>
      </div>
      <div class="company-detail-stat">
        <span class="company-detail-stat-label">Active Investment</span>
        <span class="company-detail-stat-value">${escapeHtml(formatUsdCompact(activeInvested))}</span>
      </div>
      <div class="company-detail-stat">
        <span class="company-detail-stat-label">Net Gain / Loss</span>
        <span class="company-detail-stat-value ${realizedClass}">${escapeHtml(formatReportMoney(realized))}</span>
      </div>
      <div class="company-detail-stat">
        <span class="company-detail-stat-label">Expected Return</span>
        <span class="company-detail-stat-value ${expectedClass}">${escapeHtml(formatReportMoney(expected))}</span>
      </div>
    </div>
  `;
}

export function companyPartnerIcon(partnerCount) {
  const count = Number(partnerCount) || 1;
  return count <= 1 ? '\u{1F464}' : '\u{1F465}';
}

export function companyProjectMetaMarkup(companyId, partnerCount) {
  const projectCount = getVisibleProjectsForCompany(companyId).length;
  const noProjects = getProjectsForCompany(getData(), companyId).length === 0;
  const warning = noProjects
    ? '<span class="company-no-projects-icon" aria-hidden="true">\u{26A0}</span> '
    : '';

  return `${warning}${projectCount} project${projectCount === 1 ? '' : 's'} · ${partnerCount} partner${partnerCount === 1 ? '' : 's'}`;
}

export function projectStatusBadge(displayStatus) {
  const label = getProjectStatusLabel(displayStatus);
  const statusClass = displayStatus.replace(/_/g, '-');

  return `<span class="badge status-${statusClass}">${escapeHtml(label)}</span>`;
}

export function projectCardMain(project, extraMeta = '') {
  return `
    <div class="project-card-main">
      <span class="project-type-icon" aria-hidden="true">${getProjectTypeIcon(project.type)}</span>
      <div class="project-card-text">
        <h2 class="card-title">${escapeHtml(project.name)}</h2>
        ${extraMeta}
      </div>
    </div>
  `;
}

export function projectCountdown(project) {
  return `<p class="card-countdown">${escapeHtml(formatMaturationCountdown(getProjectEndDate(project)))}</p>`;
}

export function projectMaturityDate(project, displayStatus) {
  const overdueClass = displayStatus === PROJECT_DISPLAY_STATUS.OVERDUE ? ' overdue' : '';

  return `<p class="card-maturity-date${overdueClass}">${escapeHtml(formatDate(getProjectEndDate(project)))}</p>`;
}

export function getProjectCardAmountDisplay(project) {
  const data = getData();
  const company = getCompany(data, project.companyId);
  const partnerCount = company?.partnerCount ?? 1;
  const displayMode = getAmountDisplayMode();

  if (isProjectClosed(project)) {
    const netGainLoss = getDisplayAmount(
      getProjectOutcome(project).actualReturn,
      partnerCount,
      displayMode,
    );
    const valueClass = netGainLoss > 0 ? 'gain' : netGainLoss < 0 ? 'loss' : '';

    return {
      text: formatReportMoney(netGainLoss),
      className: valueClass,
    };
  }

  return {
    text: formatDisplayUsdCompact(project.amount, partnerCount, displayMode),
    className: '',
  };
}

export function renderProjectSummaryCard(project, metrics, options = {}) {
  const { extraMeta = '', showAmount = true, dataAttrs = '' } = options;
  const badge = projectStatusBadge(metrics.displayStatus);
  const amountDisplay = getProjectCardAmountDisplay(project);
  const isRealEstate = isRealEstateProject(project.type);

  if (isRealEstate) {
    return `
      <article class="card clickable project-summary-card project-summary-card--re" ${dataAttrs}>
        <div class="project-summary-card-body">
          <div class="card-row project-card-compact">
            <span class="project-type-icon" aria-hidden="true">${getProjectTypeIcon(project.type)}</span>
            <h2 class="card-title project-card-compact-title">${escapeHtml(project.name)}</h2>
            ${badge}
            ${showAmount ? `<p class="card-amount ${amountDisplay.className}">${escapeHtml(amountDisplay.text)}</p>` : ''}
          </div>
          ${extraMeta ? `<div class="project-card-compact-meta">${extraMeta}</div>` : ''}
        </div>
        <span class="project-card-chevron" aria-hidden="true">→</span>
      </article>
    `;
  }

  return `
    <article class="card clickable project-summary-card" ${dataAttrs}>
      <div class="project-summary-card-body">
        <div class="card-row project-card-top">
          ${projectCardMain(project, extraMeta)}
          ${showAmount ? `<p class="card-amount ${amountDisplay.className}">${escapeHtml(amountDisplay.text)}</p>` : ''}
        </div>
        <div class="project-card-main project-card-bottom">
          <span class="project-type-icon project-type-icon-spacer" aria-hidden="true"></span>
          <div class="project-card-status-row">
            ${projectCountdown(project)}
            ${badge}
            ${projectMaturityDate(project, metrics.displayStatus)}
          </div>
        </div>
      </div>
      <span class="project-card-chevron" aria-hidden="true">→</span>
    </article>
  `;
}
