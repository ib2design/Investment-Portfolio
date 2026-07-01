import { PROJECT_FILTER } from '../constants.js';
import { isCompletedProject } from '../calculations.js';
import { getProjectsForCompany, getProjectFilter } from '../storage.js';
import { getData } from '../context.js';

export function getVisibleProjects(projects) {
  const filter = getProjectFilter();

  if (filter === PROJECT_FILTER.ACTIVE) {
    return projects.filter((project) => !isCompletedProject(project));
  }

  if (filter === PROJECT_FILTER.PAST) {
    return projects.filter((project) => isCompletedProject(project));
  }

  return projects;
}

export function getVisibleProjectsForCompany(companyId) {
  return getVisibleProjects(getProjectsForCompany(getData(), companyId));
}

export function companyHasNoProjects(companyId) {
  return getProjectsForCompany(getData(), companyId).length === 0;
}

export function isCompanyVisible(companyId) {
  if (companyHasNoProjects(companyId)) {
    return true;
  }

  return getVisibleProjectsForCompany(companyId).length > 0;
}

export function getVisibleCompanies() {
  return getData().companies.filter((company) => isCompanyVisible(company.id));
}
