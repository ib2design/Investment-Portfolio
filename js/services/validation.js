import { PROJECT_STATUS } from '../constants.js';
export function getAmountRecoveredError(status, amount, amountRecovered) {
  if (status === PROJECT_STATUS.CLOSED_LOSS) {
    return '';
  }

  if (Number.isNaN(amountRecovered) || amountRecovered < 0) {
    return 'Amount recovered must be zero or greater.';
  }

  if (status === PROJECT_STATUS.PARTIAL_RECOVERED) {
    if (amountRecovered <= 0) {
      return 'Partial recovered requires an amount greater than zero.';
    }

    if (!Number.isNaN(amount) && amount > 0 && amountRecovered >= amount) {
      return 'Partial recovered must be less than the invested amount.';
    }
  }

  if (status === PROJECT_STATUS.MATURED && amountRecovered <= 0) {
    return 'Matured requires a recovered amount greater than zero.';
  }

  return '';
}

export function statusRequiresAmountRecovered(status) {
  return (
    status === PROJECT_STATUS.MATURED || status === PROJECT_STATUS.PARTIAL_RECOVERED
  );
}

export function validateProjectForm(values) {
  const errors = {};
  const { name, dateInvested, amount, maturationDate, expectedReturn } = values;

  if (!name) {
    errors.name = 'Project name is required.';
  }

  if (!dateInvested) {
    errors.dateInvested = 'Investment date is required.';
  }

  if (!amount || amount <= 0 || Number.isNaN(amount)) {
    errors.amount = 'Total investment must be greater than zero.';
  }

  if (maturationDate && dateInvested && new Date(maturationDate) <= new Date(dateInvested)) {
    errors.maturationDate = 'Maturation date must be after the investment date.';
  }

  if (
    expectedReturn !== null &&
    expectedReturn !== undefined &&
    expectedReturn !== '' &&
    Number.isNaN(Number(expectedReturn))
  ) {
    errors.expectedReturn = 'Expected return must be a valid number.';
  }

  return errors;
}

export function validateCompanyForm(values) {
  const errors = {};
  const { name, partnerCount } = values;

  if (!name) {
    errors.name = 'Company name is required.';
  }

  if (!Number.isInteger(partnerCount) || partnerCount < 1) {
    errors.partnerCount = 'Partner count must be at least 1.';
  }

  return errors;
}
