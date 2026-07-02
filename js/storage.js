import {
  SCHEMA_VERSION,
  STORAGE_KEY,
  AMOUNT_DISPLAY,
  AMOUNT_DISPLAY_KEY,
  ACTIVE_PROJECTS_ONLY_KEY,
  PROJECT_FILTER,
  PROJECT_FILTER_KEY,
  PROJECT_STATUS,
  PIN_HASH_KEY,
} from './constants.js';
import { getSpreadColorIndices } from './colors.js';

const INTEREST_CLOSED_STATUSES = new Set([
  PROJECT_STATUS.MATURED,
  PROJECT_STATUS.CLOSED_LOSS,
  PROJECT_STATUS.PARTIAL_RECOVERED,
]);

function ensureCompanyColors(data) {
  if (data.companies.length === 0) {
    return;
  }

  const sorted = [...data.companies].sort((a, b) => a.name.localeCompare(b.name));

  const spreadIndices = getSpreadColorIndices(sorted.length);
  let changed = false;

  sorted.forEach((company, index) => {
    const nextIndex = spreadIndices[index];
    if (company.colorIndex !== nextIndex) {
      company.colorIndex = nextIndex;
      changed = true;
    }
  });

  if (changed) {
    writeRaw(data);
  }
}

export function getNextColorIndex(data) {
  const spreadIndices = getSpreadColorIndices(data.companies.length + 1);
  return spreadIndices[spreadIndices.length - 1];
}

function createEmptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    companies: [],
    projects: [],
  };
}

function normalizeProject(project) {
  const validStatuses = new Set(Object.values(PROJECT_STATUS));
  const isRealEstate = project.type === 'real_estate';
  const isOther = project.type === 'other';
  let loanPayoffDate = project.loanPayoffDate || null;
  let status = validStatuses.has(project.status) ? project.status : PROJECT_STATUS.ACTIVE;
  let soldDate = project.soldDate || null;
  let soldPrice =
    project.soldPrice !== null && project.soldPrice !== undefined
      ? Number(project.soldPrice)
      : null;

  if (isRealEstate && !loanPayoffDate && project.maturationDate) {
    loanPayoffDate = project.maturationDate;
  }

  if (isRealEstate) {
    if (INTEREST_CLOSED_STATUSES.has(status) || status === PROJECT_STATUS.AT_RISK) {
      status = PROJECT_STATUS.SOLD;
    }

    if (status === PROJECT_STATUS.SOLD) {
      soldDate = soldDate || project.closedDate || null;
      soldPrice =
        soldPrice !== null && !Number.isNaN(soldPrice)
          ? soldPrice
          : project.amountRecovered !== null && project.amountRecovered !== undefined
            ? Number(project.amountRecovered)
            : null;
    }
  }

  return {
    ...project,
    status: isRealEstate
      ? status === PROJECT_STATUS.SOLD
        ? PROJECT_STATUS.SOLD
        : PROJECT_STATUS.ACTIVE
      : status,
    closedDate: isRealEstate ? null : project.closedDate || null,
    soldDate: isRealEstate && status === PROJECT_STATUS.SOLD ? soldDate : null,
    soldPrice: isRealEstate && status === PROJECT_STATUS.SOLD ? soldPrice : null,
    loanPayoffDate: isRealEstate ? loanPayoffDate : null,
    maturationDate: isRealEstate || isOther ? null : project.maturationDate || null,
    estimatedValue:
      isRealEstate && status !== PROJECT_STATUS.SOLD && project.estimatedValue !== null
        ? Number(project.estimatedValue)
        : null,
    aprPercent: isRealEstate || isOther ? null : project.aprPercent ?? null,
    aprType: isRealEstate || isOther ? null : project.aprType ?? null,
    amountRecovered: isRealEstate
      ? null
      : project.amountRecovered === null || project.amountRecovered === undefined
        ? null
        : Number(project.amountRecovered),
    documentationUrl:
      typeof project.documentationUrl === 'string' ? project.documentationUrl.trim() : '',
  };
}

function readRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyData();
    }

    const parsed = JSON.parse(raw);
    return {
      schemaVersion: parsed.schemaVersion ?? SCHEMA_VERSION,
      companies: Array.isArray(parsed.companies) ? parsed.companies : [],
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map(normalizeProject)
        : [],
    };
  } catch {
    return createEmptyData();
  }
}

function writeRaw(data) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      companies: data.companies,
      projects: data.projects,
    }),
  );
}

export function loadData() {
  const data = readRaw();
  ensureCompanyColors(data);
  return data;
}

export function saveData(data) {
  writeRaw(data);
}

export function createId() {
  if (crypto?.randomUUID) {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function getCompany(data, companyId) {
  return data.companies.find((company) => company.id === companyId) ?? null;
}

export function getProjectsForCompany(data, companyId) {
  return data.projects
    .filter((project) => project.companyId === companyId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getProject(data, projectId) {
  return data.projects.find((project) => project.id === projectId) ?? null;
}

export function upsertCompany(data, company) {
  const index = data.companies.findIndex((item) => item.id === company.id);
  if (index >= 0) {
    data.companies[index] = company;
  } else {
    data.companies.push(company);
  }

  data.companies.sort((a, b) => a.name.localeCompare(b.name));
  saveData(data);
  return company;
}

export function deleteCompany(data, companyId) {
  data.companies = data.companies.filter((company) => company.id !== companyId);
  data.projects = data.projects.filter((project) => project.companyId !== companyId);
  saveData(data);
}

export function upsertProject(data, project) {
  const index = data.projects.findIndex((item) => item.id === project.id);
  if (index >= 0) {
    data.projects[index] = project;
  } else {
    data.projects.push(project);
  }

  saveData(data);
  return project;
}

export function deleteProject(data, projectId) {
  data.projects = data.projects.filter((project) => project.id !== projectId);
  saveData(data);
}

export function getTheme() {
  const theme = localStorage.getItem('investment-portfolio-theme');
  return theme === 'dark' ? 'dark' : 'light';
}

export function saveTheme(theme) {
  localStorage.setItem('investment-portfolio-theme', theme);
}

export function getAmountDisplayMode() {
  return AMOUNT_DISPLAY.GROUP;
}

export function saveAmountDisplayMode(mode) {
  const resolved =
    mode === AMOUNT_DISPLAY.MY_SHARE ? AMOUNT_DISPLAY.MY_SHARE : AMOUNT_DISPLAY.GROUP;
  localStorage.setItem(AMOUNT_DISPLAY_KEY, resolved);
}

export function getProjectFilter() {
  const stored = localStorage.getItem(PROJECT_FILTER_KEY);

  if (
    stored === PROJECT_FILTER.ALL ||
    stored === PROJECT_FILTER.ACTIVE ||
    stored === PROJECT_FILTER.PAST
  ) {
    return stored;
  }

  if (localStorage.getItem(ACTIVE_PROJECTS_ONLY_KEY) === 'true') {
    return PROJECT_FILTER.ACTIVE;
  }

  return PROJECT_FILTER.ALL;
}

export function saveProjectFilter(filter) {
  const resolved =
    filter === PROJECT_FILTER.ACTIVE || filter === PROJECT_FILTER.PAST
      ? filter
      : PROJECT_FILTER.ALL;
  localStorage.setItem(PROJECT_FILTER_KEY, resolved);
  localStorage.removeItem(ACTIVE_PROJECTS_ONLY_KEY);
}

export function wipePortfolioAndPin() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PIN_HASH_KEY);
}

export function buildPortfolioPreferences() {
  return {
    theme: getTheme(),
    amountDisplay: getAmountDisplayMode(),
    projectFilter: getProjectFilter(),
  };
}

export function importPortfolioSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid backup data.');
  }

  if (!Array.isArray(snapshot.companies) || !Array.isArray(snapshot.projects)) {
    throw new Error('Backup file is missing portfolio data.');
  }

  const imported = {
    schemaVersion: snapshot.schemaVersion ?? SCHEMA_VERSION,
    companies: snapshot.companies,
    projects: snapshot.projects.map(normalizeProject),
  };

  writeRaw(imported);
  ensureCompanyColors(imported);

  const preferences = snapshot.preferences;

  if (preferences && typeof preferences === 'object') {
    if (preferences.theme === 'dark' || preferences.theme === 'light') {
      saveTheme(preferences.theme);
    }

    if (preferences.amountDisplay) {
      saveAmountDisplayMode(preferences.amountDisplay);
    }

    if (preferences.projectFilter) {
      saveProjectFilter(preferences.projectFilter);
    }
  }

  return imported;
}
