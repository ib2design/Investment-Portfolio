export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'investment-portfolio-v1';

export const LIMITS = {
  companyName: 100,
  projectName: 100,
  typeOther: 80,
  contactPerson: 120,
  documentationUrl: 500,
};

export const PROJECT_TYPES = [
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'reit', label: 'REIT' },
  { value: 'lent_interest', label: 'Lent on Interest' },
  { value: 'other', label: 'Other' },
];

export const APR_TYPES = [
  { value: 'simple', label: 'Simple' },
  { value: 'compound', label: 'Compound' },
];

export const REMINDER_WINDOW_DAYS = 7;

export const CURRENCY = 'USD';

export const AMOUNT_DISPLAY = {
  GROUP: 'group',
  MY_SHARE: 'my_share',
};

export const AMOUNT_DISPLAY_KEY = 'investment-portfolio-amount-display';

export const PROJECT_FILTER = {
  ALL: 'all',
  ACTIVE: 'active',
  PAST: 'past',
};

export const PROJECT_FILTER_KEY = 'investment-portfolio-project-filter';

export const PIN_HASH_KEY = 'investment-portfolio-pin-hash';

export const PIN_LENGTH = 6;

export const SHARE_PIN_LENGTH = 4;

export const SHARE_FORMAT = 'investment-portfolio-share';
export const SHARE_VERSION = 1;
export const SHARE_FILE_EXTENSION = '.ipshare';

export const ERASE_DATA_CONFIRM_WORD = 'delete';

/** @deprecated Migrated to PROJECT_FILTER_KEY */
export const ACTIVE_PROJECTS_ONLY_KEY = 'investment-portfolio-active-only';

export const PROJECT_STATUS = {
  ACTIVE: 'active',
  AT_RISK: 'at_risk',
  MATURED: 'matured',
  CLOSED_LOSS: 'closed_loss',
  PARTIAL_RECOVERED: 'partial_recovered',
  SOLD: 'sold',
};

export const PROJECT_DISPLAY_STATUS = {
  ...PROJECT_STATUS,
  OVERDUE: 'overdue',
};

export const PROJECT_STATUS_OPTIONS = [
  { value: PROJECT_STATUS.ACTIVE, label: 'Active' },
  { value: PROJECT_STATUS.AT_RISK, label: 'At Risk' },
  { value: PROJECT_STATUS.MATURED, label: 'Matured' },
  { value: PROJECT_STATUS.CLOSED_LOSS, label: 'Closed Loss' },
  { value: PROJECT_STATUS.PARTIAL_RECOVERED, label: 'Partial Recovered' },
];

export const REAL_ESTATE_STATUS_OPTIONS = [
  { value: PROJECT_STATUS.ACTIVE, label: 'Active' },
  { value: PROJECT_STATUS.SOLD, label: 'Sold' },
];
