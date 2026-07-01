import {
  formatDate,
  formatPercent,
  formatUsd,
  getProjectStatusLabel,
  getProjectTypeLabel,
  isRealEstateProject,
  isOtherProject,
  resolveProjectStatus,
} from '../calculations.js';
import { REMINDER_WINDOW_DAYS } from '../constants.js';
import { escapeHtml } from '../ui/dom.js';
import {
  createId,
  getNextColorIndex,
  loadData,
  nowIso,
  upsertCompany,
  upsertProject,
} from '../storage.js';
import { validateSharePayload, parseShareFile } from '../share.js';
import { canUseBackupEncryption } from '../backup.js';
import { viewState } from '../context.js';

function namesMatch(left, right) {
  return left.localeCompare(right, undefined, { sensitivity: 'accent' }) === 0;
}

function findCompanyByName(data, name) {
  const trimmed = String(name ?? '').trim();

  if (!trimmed) {
    return null;
  }

  return data.companies.find((company) => namesMatch(company.name.trim(), trimmed)) ?? null;
}

function findProjectByName(data, companyId, name) {
  const trimmed = String(name ?? '').trim();

  if (!trimmed) {
    return null;
  }

  return (
    data.projects.find(
      (project) => project.companyId === companyId && namesMatch(project.name.trim(), trimmed),
    ) ?? null
  );
}

export function buildShareImportPlan(payload) {
  validateSharePayload(payload);

  const data = loadData();
  const incomingCompany = payload.company;
  const incomingProject = payload.project;
  const companyName = incomingCompany.name.trim();
  const projectName = incomingProject.name.trim();
  const existingCompany = findCompanyByName(data, companyName);
  const existingProject = existingCompany
    ? findProjectByName(data, existingCompany.id, projectName)
    : null;

  return {
    companyName,
    projectName,
    existingCompany,
    existingProject,
    willCreateCompany: !existingCompany,
    willOverwriteProject: Boolean(existingProject),
    incomingCompany,
    incomingProject,
  };
}

function detailRow(label, value) {
  if (!value) {
    return '';
  }

  return `
    <div class="detail-item">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${value}</span>
    </div>
  `;
}

function formatOptionalUsd(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }

  return escapeHtml(formatUsd(value));
}

function formatOptionalDate(value) {
  if (!value) {
    return '';
  }

  return escapeHtml(formatDate(value));
}

export function buildShareImportReviewRows(payload) {
  const project = payload.project;
  const company = payload.company;
  const displayStatus = resolveProjectStatus(project, REMINDER_WINDOW_DAYS);
  const isRealEstate = isRealEstateProject(project.type);
  const isOther = isOtherProject(project.type);
  const rows = [
    detailRow('Company', escapeHtml(company.name.trim())),
    detailRow('Partners', escapeHtml(String(company.partnerCount ?? 1))),
    detailRow('Project', escapeHtml(project.name.trim())),
    detailRow('Type', escapeHtml(getProjectTypeLabel(project.type, project.typeOther))),
    detailRow('Status', escapeHtml(getProjectStatusLabel(displayStatus))),
    detailRow('Investment', formatOptionalUsd(project.amount)),
  ];

  if (isRealEstate) {
    rows.push(
      detailRow('Date invested', formatOptionalDate(project.dateInvested)),
      detailRow('Loan payoff', formatOptionalDate(project.loanPayoffDate)),
      detailRow('Estimated value', formatOptionalUsd(project.estimatedValue)),
      detailRow('Sold date', formatOptionalDate(project.soldDate)),
      detailRow('Sold price', formatOptionalUsd(project.soldPrice)),
    );
  } else if (isOther) {
    rows.push(
      detailRow('Date invested', formatOptionalDate(project.dateInvested)),
      detailRow('Return amount', formatOptionalUsd(project.amountRecovered)),
      detailRow('Closed date', formatOptionalDate(project.closedDate)),
    );
  } else {
    rows.push(
      detailRow('Date invested', formatOptionalDate(project.dateInvested)),
      detailRow('Maturation', formatOptionalDate(project.maturationDate)),
      detailRow('APR', project.aprPercent !== null && project.aprPercent !== undefined
        ? escapeHtml(formatPercent(project.aprPercent))
        : ''),
      detailRow('APR type', project.aprType ? escapeHtml(project.aprType) : ''),
      detailRow('Amount recovered', formatOptionalUsd(project.amountRecovered)),
      detailRow('Closed date', formatOptionalDate(project.closedDate)),
    );
  }

  rows.push(
    detailRow('Contact', project.contactPerson ? escapeHtml(project.contactPerson) : ''),
    detailRow('Reminder', formatOptionalDate(project.reminderDate)),
    detailRow(
      'Documentation',
      project.documentationUrl ? escapeHtml(project.documentationUrl) : '',
    ),
    detailRow('Notes', project.notes ? escapeHtml(project.notes) : ''),
  );

  return rows.filter(Boolean).join('');
}

export function buildShareImportSummary(plan) {
  if (plan.willOverwriteProject) {
    return `This will replace your existing project <strong>${escapeHtml(plan.projectName)}</strong> in <strong>${escapeHtml(plan.companyName)}</strong>. Other companies and projects stay unchanged.`;
  }

  if (plan.willCreateCompany) {
    return `This will add company <strong>${escapeHtml(plan.companyName)}</strong> and project <strong>${escapeHtml(plan.projectName)}</strong> to your portfolio.`;
  }

  return `This will add project <strong>${escapeHtml(plan.projectName)}</strong> to <strong>${escapeHtml(plan.companyName)}</strong>. Other data stays unchanged.`;
}

export function applyShareImport(payload) {
  validateSharePayload(payload);

  const data = loadData();
  const plan = buildShareImportPlan(payload);
  const incomingCompany = payload.company;
  const incomingProject = payload.project;
  const timestamp = nowIso();
  let company = plan.existingCompany;

  if (!company) {
    company = {
      id: createId(),
      name: plan.companyName,
      partnerCount: Number(incomingCompany.partnerCount) > 0 ? Number(incomingCompany.partnerCount) : 1,
      colorIndex: getNextColorIndex(data),
      documentationUrl: String(incomingCompany.documentationUrl ?? '').trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    upsertCompany(data, company);
  }

  const existingProject = plan.existingProject;
  const project = {
    ...incomingProject,
    id: existingProject?.id ?? createId(),
    companyId: company.id,
    name: plan.projectName,
    createdAt: existingProject?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  upsertProject(data, project);

  return {
    companyId: company.id,
    projectId: project.id,
    createdCompany: plan.willCreateCompany,
    overwroteProject: plan.willOverwriteProject,
  };
}

export function prepareShareImportFromFile(json) {
  const parsed = parseShareFile(json);

  if (parsed.encrypted) {
    if (!canUseBackupEncryption()) {
      throw new Error('This encrypted share file cannot be opened in this browser.');
    }

    viewState.shareImportFile = parsed.file;
    viewState.shareImportPayload = null;
    return 'share-import-pin';
  }

  viewState.shareImportFile = null;
  viewState.shareImportPayload = parsed.payload;
  return 'share-import-review';
}
