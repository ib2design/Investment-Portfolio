import { PROJECT_STATUS } from '../constants.js';
import {
  isRealEstateProject,
  isOtherProject,
  isSoldProjectStatus,
  isClosedProjectStatus,
} from '../calculations.js';
import { getTodayIsoDate } from '../formInputs.js';
import { validateDocumentationUrlField } from '../ui/documentation.js';

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
  const {
    name,
    type,
    typeOther,
    dateInvested,
    maturationDate,
    loanPayoffDate,
    estimatedValue,
    amount,
    aprPercent,
    status,
    closed,
    closedDate,
    amountRecovered,
    soldDate,
    soldPrice,
    reminderDate,
    documentationUrl,
  } = values;
  const isRealEstate = isRealEstateProject(type);
  const isOther = isOtherProject(type);
  const isSold = isRealEstate && isSoldProjectStatus(status);
  const interestClosed = !isRealEstate && closed;

  if (!name) {
    errors.name = 'Project name is required.';
  }

  if (type === 'other' && !typeOther) {
    errors.typeOther = 'Please describe the other project type.';
  }

  if (!dateInvested) {
    errors.dateInvested = 'Investment date is required.';
  }

  if (isRealEstate) {
    if (isSold) {
      if (!soldDate) {
        errors.soldDate = 'Date sold is required.';
      }

      if (Number.isNaN(soldPrice) || soldPrice < 0) {
        errors.soldPrice = 'Total net proceeds must be zero or greater.';
      }
    } else if (
      loanPayoffDate &&
      dateInvested &&
      new Date(loanPayoffDate) <= new Date(dateInvested)
    ) {
      errors.loanPayoffDate = 'Loan payoff date must be after the investment date.';
    }

    if (!isSold && estimatedValue !== null && estimatedValue !== undefined && estimatedValue !== '') {
      if (Number.isNaN(estimatedValue) || estimatedValue <= 0) {
        errors.estimatedValue = 'Estimated value must be greater than zero.';
      }
    }
  } else if (!isOther) {
    if (!maturationDate) {
      errors.maturationDate = 'Maturation date is required.';
    } else if (dateInvested && new Date(maturationDate) <= new Date(dateInvested)) {
      errors.maturationDate = 'Maturation date must be after the investment date.';
    }

    if (Number.isNaN(aprPercent) || aprPercent < 0) {
      errors.aprPercent = 'APR is required and must be zero or greater.';
    }
  }

  if (!amount || amount <= 0 || Number.isNaN(amount)) {
    errors.amount = 'Total investment must be greater than zero.';
  }

  if (!isSold && !interestClosed && reminderDate && reminderDate < getTodayIsoDate()) {
    errors.reminderDate = 'Reminder date cannot be in the past.';
  }

  if (interestClosed) {
    if (!closedDate) {
      errors.closedDate = 'Date closed is required for this status.';
    }

    if (isOther && status !== PROJECT_STATUS.CLOSED_LOSS) {
      if (Number.isNaN(amountRecovered) || amountRecovered < 0) {
        errors.amountRecovered = 'Return amount must be zero or greater.';
      } else {
        const recoveredError = getAmountRecoveredError(status, amount, amountRecovered);

        if (recoveredError) {
          errors.amountRecovered = recoveredError.replace(/^Amount recovered/, 'Return amount');
        } else if (status === PROJECT_STATUS.MATURED && amountRecovered <= 0) {
          errors.amountRecovered = 'Return amount must be greater than zero.';
        }
      }
    } else if (statusRequiresAmountRecovered(status)) {
      const recoveredError = getAmountRecoveredError(status, amount, amountRecovered);

      if (recoveredError) {
        errors.amountRecovered = recoveredError;
      }
    }
  }

  validateDocumentationUrlField(documentationUrl, errors);

  return errors;
}

export function validateCompanyForm(values) {
  const errors = {};
  const { name, partnerCount, documentationUrl } = values;

  if (!name) {
    errors.name = 'Company name is required.';
  }

  if (!Number.isInteger(partnerCount) || partnerCount < 1) {
    errors.partnerCount = 'Partner count must be at least 1.';
  }

  validateDocumentationUrlField(documentationUrl, errors);

  return errors;
}
