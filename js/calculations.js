import { PROJECT_STATUS, PROJECT_DISPLAY_STATUS, AMOUNT_DISPLAY, PROJECT_FILTER } from './constants.js';

function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.max(0, (end - start) / msPerDay);
}

export function calculateExpectedReturn(amount, aprPercent, aprType, dateInvested, maturationDate) {
  if (!amount || !aprPercent || !dateInvested || !maturationDate) {
    return 0;
  }

  const years = daysBetween(dateInvested, maturationDate) / 365;
  if (years <= 0) {
    return 0;
  }

  const rate = aprPercent / 100;

  if (aprType === 'compound') {
    return amount * (Math.pow(1 + rate, years) - 1);
  }

  return amount * rate * years;
}

export function calculateMaturityTotal(amount, expectedReturn) {
  return amount + expectedReturn;
}

export function calculateActualReturn(investedAmount, amountRecovered) {
  return Number(amountRecovered || 0) - Number(investedAmount || 0);
}

export function calculateActualLoss(investedAmount, amountRecovered) {
  const invested = Number(investedAmount || 0);
  const recovered = Number(amountRecovered || 0);

  return Math.max(0, invested - recovered);
}

export function getProjectOutcome(project) {
  const amountRecovered = isRealEstateSold(project)
    ? Number(project.soldPrice ?? 0)
    : Number(project.amountRecovered ?? 0);
  const actualReturn = calculateActualReturn(project.amount, amountRecovered);
  const actualLoss = calculateActualLoss(project.amount, amountRecovered);

  return {
    amountRecovered,
    actualReturn,
    actualLoss,
  };
}

export function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function formatUsdCompact(value) {
  const amount = Number(value || 0);

  if (amount >= 1000) {
    const thousands = amount / 1000;
    const formatted =
      thousands >= 100 || Number.isInteger(thousands)
        ? String(Math.round(thousands))
        : thousands.toFixed(1).replace(/\.0$/, '');

    return `$${formatted}k`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDisplayAmount(amount, partnerCount, displayMode) {
  const value = Number(amount || 0);

  if (displayMode === AMOUNT_DISPLAY.MY_SHARE) {
    const partners = Math.max(1, Number(partnerCount) || 1);
    return value / partners;
  }

  return value;
}

export function formatDisplayUsdCompact(amount, partnerCount, displayMode) {
  return formatUsdCompact(getDisplayAmount(amount, partnerCount, displayMode));
}

export function getAmountDisplayLabel(displayMode) {
  return displayMode === AMOUNT_DISPLAY.MY_SHARE ? 'My share' : 'Group totals';
}

export function getProjectFilterLabel(filter) {
  if (filter === PROJECT_FILTER.ACTIVE) {
    return 'Show Active';
  }

  if (filter === PROJECT_FILTER.PAST) {
    return 'Show Past only';
  }

  return 'Show Both';
}

export function formatDate(isoDate) {
  if (!isoDate) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoDate));
}

export function formatPercent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export function getProjectTypeLabel(type, typeOther) {
  const labels = {
    real_estate: 'Real Estate',
    reit: 'REIT',
    lent_interest: 'Lent on Interest',
    other: typeOther?.trim() || 'Other',
  };

  return labels[type] || 'Other';
}

export function getProjectTypeReportLabel(type, typeOther) {
  const labels = {
    real_estate: 'RE',
    reit: 'REIT',
    lent_interest: 'Int.',
    other: typeOther?.trim() || 'Other',
  };

  return labels[type] || 'Other';
}

export function getProjectTypeIcon(type) {
  const icons = {
    real_estate: '\u{1F3E2}',
    reit: '\u{1F3DB}',
    lent_interest: '\u{1F4B5}',
    other: '\u{1F5C3}',
  };

  return icons[type] || '\u{1F5C3}';
}

export function getReminderStatus(reminderDate, maturationDate, windowDays = 7) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = [reminderDate, maturationDate].filter(Boolean);
  if (dates.length === 0) {
    return null;
  }

  let earliest = null;
  let earliestTime = Infinity;

  for (const dateStr of dates) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    if (date.getTime() < earliestTime) {
      earliest = date;
      earliestTime = date.getTime();
    }
  }

  const diffDays = Math.ceil((earliest - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'overdue';
  }

  if (diffDays <= windowDays) {
    return 'upcoming';
  }

  return null;
}

export function getDateSpanCountdown(fromDate, toDate) {
  if (!fromDate || !toDate) {
    return null;
  }

  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);

  if (end < start) {
    return { years: 0, months: 0, days: 0, invalid: true };
  }

  if (end.getTime() === start.getTime()) {
    return { years: 0, months: 0, days: 0, matured: false };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += daysInPrevMonth;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days, matured: false };
}

export function formatDateSpanCountdown(fromDate, toDate) {
  const span = getDateSpanCountdown(fromDate, toDate);

  if (!span || span.invalid) {
    return '—';
  }

  return `${span.years}y ${span.months}m ${span.days}d`;
}

export function getMaturationCountdown(maturationDate) {
  if (!maturationDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(maturationDate);
  target.setHours(0, 0, 0, 0);

  if (target <= today) {
    return { years: 0, months: 0, days: 0, matured: true };
  }

  return getDateSpanCountdown(today, target);
}

export function formatMaturationCountdown(maturationDate) {
  const countdown = getMaturationCountdown(maturationDate);

  if (!countdown) {
    return '—';
  }

  if (countdown.matured) {
    return 'Matured';
  }

  return `${countdown.years}y ${countdown.months}m ${countdown.days}d`;
}

const CLOSED_STATUSES = new Set([
  PROJECT_STATUS.MATURED,
  PROJECT_STATUS.CLOSED_LOSS,
  PROJECT_STATUS.PARTIAL_RECOVERED,
]);

const PROJECT_STATUS_LABELS = {
  [PROJECT_DISPLAY_STATUS.ACTIVE]: 'Active',
  [PROJECT_DISPLAY_STATUS.OVERDUE]: 'Overdue',
  [PROJECT_DISPLAY_STATUS.AT_RISK]: 'At Risk',
  [PROJECT_DISPLAY_STATUS.MATURED]: 'Matured',
  [PROJECT_DISPLAY_STATUS.CLOSED_LOSS]: 'Closed Loss',
  [PROJECT_DISPLAY_STATUS.PARTIAL_RECOVERED]: 'Partial Recovered',
  [PROJECT_STATUS.SOLD]: 'Sold',
};

export function isSoldProjectStatus(status) {
  return status === PROJECT_STATUS.SOLD;
}

export function isRealEstateSold(project) {
  return isRealEstateProject(project.type) && isSoldProjectStatus(project.status);
}

export function isProjectClosed(project) {
  if (isRealEstateProject(project.type)) {
    return isRealEstateSold(project);
  }

  return CLOSED_STATUSES.has(project.status);
}

export function isClosedProjectStatus(status) {
  return CLOSED_STATUSES.has(status);
}

export function isCompletedProject(project) {
  const status = project.status;

  return (
    status === PROJECT_STATUS.SOLD ||
    status === PROJECT_STATUS.CLOSED_LOSS ||
    status === PROJECT_STATUS.PARTIAL_RECOVERED
  );
}

export function isRealEstateProject(type) {
  return type === 'real_estate';
}

export function isInterestBasedProject(type) {
  return !isRealEstateProject(type);
}

export function getProjectEndDate(project) {
  if (isRealEstateProject(project.type)) {
    return project.loanPayoffDate || null;
  }

  return project.maturationDate || null;
}

export function calculateUnrealizedGain(investment, estimatedValue) {
  if (estimatedValue === null || estimatedValue === undefined || estimatedValue === '') {
    return null;
  }

  const value = Number(estimatedValue);

  if (Number.isNaN(value)) {
    return null;
  }

  return value - Number(investment || 0);
}

export function resolveProjectStatus(project, windowDays = 7) {
  const stored = project.status || PROJECT_STATUS.ACTIVE;

  if (isRealEstateProject(project.type)) {
    if (stored === PROJECT_STATUS.SOLD) {
      return PROJECT_STATUS.SOLD;
    }

    if (getReminderStatus(project.reminderDate, getProjectEndDate(project), windowDays) === 'overdue') {
      return PROJECT_DISPLAY_STATUS.OVERDUE;
    }

    return PROJECT_STATUS.ACTIVE;
  }

  if (CLOSED_STATUSES.has(stored)) {
    return stored;
  }

  if (stored === PROJECT_STATUS.AT_RISK) {
    return PROJECT_STATUS.AT_RISK;
  }

  if (getReminderStatus(project.reminderDate, getProjectEndDate(project), windowDays) === 'overdue') {
    return PROJECT_DISPLAY_STATUS.OVERDUE;
  }

  return PROJECT_STATUS.ACTIVE;
}

export function getProjectStatusLabel(displayStatus) {
  return PROJECT_STATUS_LABELS[displayStatus] || 'Active';
}

export function getProjectStatusReportLabel(displayStatus) {
  const labels = {
    [PROJECT_DISPLAY_STATUS.ACTIVE]: 'Active',
    [PROJECT_DISPLAY_STATUS.OVERDUE]: 'OD',
    [PROJECT_DISPLAY_STATUS.AT_RISK]: 'Risk',
    [PROJECT_DISPLAY_STATUS.MATURED]: 'Mat.',
    [PROJECT_DISPLAY_STATUS.CLOSED_LOSS]: 'Cl. Loss',
    [PROJECT_DISPLAY_STATUS.PARTIAL_RECOVERED]: 'Part. Rec.',
    [PROJECT_STATUS.SOLD]: 'Sold',
  };

  return labels[displayStatus] || 'Active';
}
