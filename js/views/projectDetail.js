import { AMOUNT_DISPLAY, PROJECT_FILTER, PROJECT_STATUS } from '../constants.js';
import {
  formatDate,
  formatDateSpanCountdown,
  formatMaturationCountdown,
  formatPercent,
  formatUsd,
  getDisplayAmount,
  getProjectEndDate,
  getProjectOutcome,
  getProjectTypeLabel,
  isCompletedProject,
  isRealEstateProject,
  isRealEstateSold,
  isProjectClosed,
} from '../calculations.js';
import { dom, getData } from '../context.js';
import { navigate } from '../router.js';
import { updateChrome } from '../ui/chrome.js';
import { escapeHtml, detailRow, detailRowIf, gainLossStyle } from '../ui/dom.js';
import { detailDocumentationRow } from '../ui/documentation.js';
import { openShareProjectModal } from '../ui/shareModal.js';
import { getCompany, getProject, getProjectFilter } from '../storage.js';
import { getProjectMetrics, projectStatusBadge } from '../services/portfolioMetrics.js';

export function renderProjectDetail(projectId) {
  const data = getData();
  const project = getProject(data, projectId);

  if (!project) {
    navigate('portfolio');
    return;
  }

  const projectFilter = getProjectFilter();

  if (projectFilter === PROJECT_FILTER.ACTIVE && isCompletedProject(project)) {
    navigate('company-detail', { companyId: project.companyId });
    return;
  }

  if (projectFilter === PROJECT_FILTER.PAST && !isCompletedProject(project)) {
    navigate('company-detail', { companyId: project.companyId });
    return;
  }

  const company = getCompany(data, project.companyId);
  const metrics = getProjectMetrics(project);
  const partnerCount = company?.partnerCount ?? 1;
  const isRealEstate = isRealEstateProject(project.type);
  const endDate = getProjectEndDate(project);
  const isSold = isRealEstateSold(project);
  const isClosed = isProjectClosed(project);
  const outcome = isClosed ? getProjectOutcome(project) : null;
  const myShareAmount = getDisplayAmount(project.amount, partnerCount, AMOUNT_DISPLAY.MY_SHARE);
  const myShareExpectedReturn = getDisplayAmount(
    metrics.expectedReturn,
    partnerCount,
    AMOUNT_DISPLAY.MY_SHARE,
  );
  const myShareMaturityTotal = getDisplayAmount(
    metrics.maturityTotal,
    partnerCount,
    AMOUNT_DISPLAY.MY_SHARE,
  );
  const myRecovered = outcome
    ? getDisplayAmount(outcome.amountRecovered, partnerCount, AMOUNT_DISPLAY.MY_SHARE)
    : 0;
  const myActualReturn = outcome
    ? getDisplayAmount(outcome.actualReturn, partnerCount, AMOUNT_DISPLAY.MY_SHARE)
    : 0;
  const myActualLoss = outcome
    ? getDisplayAmount(outcome.actualLoss, partnerCount, AMOUNT_DISPLAY.MY_SHARE)
    : 0;
  const hideExpectedNumbers =
    isRealEstate ||
    project.status === PROJECT_STATUS.CLOSED_LOSS ||
    project.status === PROJECT_STATUS.PARTIAL_RECOVERED;
  const isClosedLoss = project.status === PROJECT_STATUS.CLOSED_LOSS;
  const isPartialRecovered = project.status === PROJECT_STATUS.PARTIAL_RECOVERED;
  const showRecoveredAmounts =
    isClosed && !isClosedLoss && !isPartialRecovered;
  const unrealizedGain = metrics.unrealizedGain;
  const myUnrealizedGain =
    unrealizedGain === null
      ? null
      : getDisplayAmount(unrealizedGain, partnerCount, AMOUNT_DISPLAY.MY_SHARE);
  const showValueMetrics =
    isRealEstate &&
    !isSold &&
    project.estimatedValue !== null &&
    unrealizedGain !== null;
  const myEstimatedValue = showValueMetrics
    ? getDisplayAmount(project.estimatedValue, partnerCount, AMOUNT_DISPLAY.MY_SHARE)
    : 0;
  const closedEndDate = isRealEstate ? project.soldDate : project.closedDate;
  const hasLoss = Boolean(outcome?.actualLoss > 0);
  const showExpectedTime = Boolean(!isClosed && project.dateInvested && endDate);
  const showApr = Boolean(
    !isRealEstate && project.aprPercent !== null && project.aprPercent !== undefined && project.aprType,
  );
  const showNetProceeds = Boolean(isRealEstate && isClosed && project.soldPrice !== null && project.soldPrice !== undefined);

  const totalFinancialRows = `
    ${
      isClosedLoss
        ? detailRow('Total Loss', escapeHtml(formatUsd(project.amount)), { valueClass: 'loss' })
        : detailRow('Total Investment', escapeHtml(formatUsd(project.amount)))
    }
    ${
      showValueMetrics
        ? `
          ${detailRow('Estimated Value', escapeHtml(formatUsd(project.estimatedValue)))}
          ${detailRow('Unrealized Gain', escapeHtml(formatUsd(unrealizedGain)))}
        `
        : ''
    }
    ${
      hideExpectedNumbers
        ? ''
        : `
          ${detailRow(
            'Total Expected Return',
            escapeHtml(formatUsd(metrics.expectedReturn)),
            gainLossStyle(metrics.expectedReturn),
          )}
          ${detailRow('Total at Maturity', escapeHtml(formatUsd(metrics.maturityTotal)))}
        `
    }
    ${
      isClosed
        ? `
          ${
            isRealEstate
              ? `
                  ${detailRowIf(
                    'Total Net Proceeds',
                    showNetProceeds,
                    escapeHtml(formatUsd(project.soldPrice)),
                  )}
                  ${detailRowIf(
                    'Total Gain / Loss',
                    showNetProceeds,
                    escapeHtml(formatUsd(outcome.actualReturn)),
                    hasLoss ? { valueClass: 'loss' } : { highlight: true },
                  )}
                `
              : isPartialRecovered
                ? `
                  ${detailRow('Amount Recovered', escapeHtml(formatUsd(outcome.amountRecovered)))}
                  ${detailRow('Total Loss', escapeHtml(formatUsd(outcome.actualLoss)), { valueClass: 'loss' })}
                `
              : showRecoveredAmounts
                ? detailRow('Amount Recovered', escapeHtml(formatUsd(outcome.amountRecovered)))
                : ''
          }
          ${
            outcome.actualLoss > 0
              ? ''
              : !isRealEstate
                ? detailRow(
                    'Actual Return',
                    escapeHtml(formatUsd(outcome.actualReturn)),
                  )
                : ''
          }
        `
        : ''
    }
  `;

  const myFinancialRows = `
    ${
      isClosedLoss
        ? detailRow('My Loss', escapeHtml(formatUsd(myShareAmount)), { valueClass: 'loss' })
        : detailRow('My Investment', escapeHtml(formatUsd(myShareAmount)))
    }
    ${
      showValueMetrics
        ? `
          ${detailRow('My Estimated Value', escapeHtml(formatUsd(myEstimatedValue)))}
          ${detailRow(
            myUnrealizedGain < 0 ? 'My Unrealized Loss' : 'My Unrealized Gain',
            escapeHtml(formatUsd(myUnrealizedGain)),
          )}
        `
        : ''
    }
    ${
      hideExpectedNumbers
        ? ''
        : `
          ${detailRow(
            'My Expected Return',
            escapeHtml(formatUsd(myShareExpectedReturn)),
            isClosed ? {} : gainLossStyle(myShareExpectedReturn),
          )}
          ${detailRow('My Total at Maturity', escapeHtml(formatUsd(myShareMaturityTotal)))}
        `
    }
    ${
      isClosed
        ? `
          ${
            isRealEstate
              ? detailRowIf(
                  'My Net Proceeds',
                  showNetProceeds,
                  escapeHtml(formatUsd(myRecovered)),
                )
              : isPartialRecovered
                ? `
                  ${detailRow('My Amount Recovered', escapeHtml(formatUsd(myRecovered)))}
                  ${detailRow('My Loss', escapeHtml(formatUsd(myActualLoss)), { valueClass: 'loss' })}
                `
              : showRecoveredAmounts
                ? detailRow('My Recovered', escapeHtml(formatUsd(myRecovered)))
                : ''
          }
          ${
            isClosedLoss || isPartialRecovered
              ? ''
              : isRealEstate
                ? detailRowIf(
                    'My Gain / Loss',
                    showNetProceeds,
                    escapeHtml(formatUsd(myActualReturn)),
                    hasLoss ? { valueClass: 'loss' } : { highlight: true },
                  )
                : hasLoss
                  ? detailRow('My Actual Loss', escapeHtml(formatUsd(myActualLoss)), { valueClass: 'loss' })
                  : detailRow('My Actual Return', escapeHtml(formatUsd(myActualReturn)))
          }
        `
        : ''
    }
  `;

  updateChrome({
    showBack: true,
    showFab: false,
    headerLabel: 'Edit',
    headerHandler: () =>
      navigate('project-form', { companyId: project.companyId, projectId: project.id }),
  });

  dom.appRoot.innerHTML = `
    <section class="card detail-grid detail-card">
      <div class="detail-card-header">
        ${projectStatusBadge(metrics.displayStatus)}
        <button type="button" class="detail-share-button" aria-label="Share project">
          <span class="detail-share-icon" aria-hidden="true">\u{27A4}</span>
        </button>
      </div>
      ${detailRow('Company', escapeHtml(company?.name || 'Unknown'))}
      ${detailRow('Project', escapeHtml(project.name))}
      ${detailRow('Project Type', escapeHtml(getProjectTypeLabel(project.type, project.typeOther)))}
      ${detailRow('Date Invested', escapeHtml(formatDate(project.dateInvested)))}
      ${detailRowIf(
        'Date Sold',
        isSold && project.soldDate,
        escapeHtml(formatDate(project.soldDate)),
      )}
      ${detailRowIf(
        'Loan Payoff Date',
        isRealEstate && !isSold && project.loanPayoffDate,
        escapeHtml(formatDate(project.loanPayoffDate)),
      )}
      ${detailRowIf(
        'Maturation Date',
        !isRealEstate && project.maturationDate,
        escapeHtml(formatDate(project.maturationDate)),
      )}
      ${detailRowIf(
        'Date Closed',
        !isRealEstate && isClosed && project.closedDate,
        escapeHtml(formatDate(project.closedDate)),
      )}
      ${detailRowIf(
        'Reminder Date',
        !isClosed && project.reminderDate,
        escapeHtml(formatDate(project.reminderDate)),
      )}
      ${detailRowIf(
        'Expected Time',
        showExpectedTime,
        escapeHtml(formatDateSpanCountdown(project.dateInvested, endDate)),
      )}
      ${detailRowIf(
        'Actual Time',
        isClosed && project.dateInvested && closedEndDate,
        escapeHtml(formatDateSpanCountdown(project.dateInvested, closedEndDate)),
      )}
      ${detailRowIf(
        'Time Remaining',
        !isClosed && endDate,
        escapeHtml(formatMaturationCountdown(endDate)),
      )}
      ${detailRowIf(
        'APR',
        showApr,
        `${escapeHtml(formatPercent(project.aprPercent))} (${escapeHtml(project.aprType)})`,
      )}
      ${detailRowIf(
        'Contact Person',
        Boolean(project.contactPerson?.trim()),
        escapeHtml(project.contactPerson.trim()),
      )}
      ${detailDocumentationRow(project.documentationUrl)}
      ${totalFinancialRows}
      ${myFinancialRows}
    </section>
  `;

  dom.appRoot.querySelector('.detail-share-button')?.addEventListener('click', () => {
    if (!company) {
      return;
    }

    openShareProjectModal({ company, project });
  });
}
