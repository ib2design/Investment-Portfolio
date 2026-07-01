import { hasPin } from './pin.js';
import { dom, viewState, reloadData, isPinUnlocked } from './context.js';
import { resetScrollPosition } from './ui/chrome.js';
import { closeHelpModal } from './ui/help.js';
import { closeShareProjectModal } from './ui/shareModal.js';
import { renderPortfolio } from './views/portfolio.js';
import { renderCompanyDetail } from './views/companyDetail.js';
import { renderProjectDetail } from './views/projectDetail.js';
import { renderCompanyForm } from './views/companyForm.js';
import { renderProjectForm } from './views/projectForm.js';
import { renderReminders } from './views/reminders.js';
import { renderReports } from './views/reports.js';
import { renderSettings } from './views/settings.js';
import { renderPinSetup, renderPinChange, renderPinRemove, renderEraseData } from './views/pinViews.js';
import { SHARE_FORMAT } from '../constants.js';
import { renderBackupExport, renderBackupImport } from './views/backup.js';
import { renderShareImportPin, renderShareImportReview } from './views/shareImport.js';

export function navigate(view, options = {}) {
  if (hasPin() && !isPinUnlocked() && view !== 'pin-setup' && view !== 'pin-change') {
    return;
  }

  viewState.view = view;
  viewState.companyId = options.companyId ?? null;
  viewState.projectId = options.projectId ?? null;
  render();
  resetScrollPosition();
}

export function render() {
  if (hasPin() && !isPinUnlocked()) {
    return;
  }

  reloadData();
  dom.appRoot.parentElement?.classList.toggle('app-main--report', viewState.view === 'reports');

  switch (viewState.view) {
    case 'company-detail':
      renderCompanyDetail(viewState.companyId);
      break;
    case 'company-form':
      renderCompanyForm(viewState.companyId);
      break;
    case 'project-detail':
      renderProjectDetail(viewState.projectId);
      break;
    case 'project-form':
      renderProjectForm(viewState.companyId, viewState.projectId);
      break;
    case 'reminders':
      renderReminders();
      break;
    case 'reports':
      renderReports();
      break;
    case 'settings':
      renderSettings();
      break;
    case 'pin-setup':
      renderPinSetup();
      break;
    case 'pin-change':
      renderPinChange();
      break;
    case 'pin-remove':
      renderPinRemove();
      break;
    case 'erase-data':
      renderEraseData();
      break;
    case 'backup-export':
      renderBackupExport();
      break;
    case 'backup-import':
      renderBackupImport();
      break;
    case 'share-import-pin':
      renderShareImportPin();
      break;
    case 'share-import-review':
      renderShareImportReview();
      break;
    case 'portfolio':
    default:
      renderPortfolio();
      break;
  }
}

export function goBack() {
  switch (viewState.view) {
    case 'company-form':
      navigate(viewState.companyId ? 'company-detail' : 'portfolio', {
        companyId: viewState.companyId,
      });
      break;
    case 'company-detail':
      navigate('portfolio');
      break;
    case 'project-form':
      navigate(viewState.projectId ? 'project-detail' : 'company-detail', {
        companyId: viewState.companyId,
        projectId: viewState.projectId,
      });
      break;
    case 'project-detail':
      navigate('company-detail', { companyId: viewState.companyId });
      break;
    case 'pin-setup':
    case 'pin-change':
    case 'pin-remove':
    case 'erase-data':
    case 'backup-export':
    case 'backup-import':
    case 'share-import-pin':
    case 'share-import-review':
      if (viewState.view === 'backup-import') {
        viewState.backupPayload = null;
      }
      if (viewState.view === 'share-import-pin' || viewState.view === 'share-import-review') {
        viewState.shareImportFile = null;
        viewState.shareImportPayload = null;
      }
      navigate('settings');
      break;
    default:
      navigate('portfolio');
      break;
  }
}

export function bindGlobalEvents() {
  dom.backButton.addEventListener('click', goBack);

  dom.appRoot.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-external-link]');

    if (!link) {
      return;
    }

    const href = link.getAttribute('href');

    if (!href) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    window.open(href, '_blank', 'noopener,noreferrer');
  });

  dom.bottomNav.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      closeHelpModal();
      closeShareProjectModal();
      navigate(button.dataset.nav);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    if (dom.shareModal && !dom.shareModal.classList.contains('hidden')) {
      closeShareProjectModal();
      return;
    }

    if (dom.helpModal && !dom.helpModal.classList.contains('hidden')) {
      closeHelpModal();
    }
  });
}
