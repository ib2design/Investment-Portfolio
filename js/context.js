import { loadData } from './storage.js';

export const dom = {
  appRoot: document.getElementById('app-root'),
  pageSubtitle: document.getElementById('page-subtitle'),
  backButton: document.getElementById('back-button'),
  headerAction: document.getElementById('header-action'),
  bottomNav: document.getElementById('bottom-nav'),
  fabButton: document.getElementById('fab-button'),
  pinLock: document.getElementById('pin-lock'),
  helpModal: document.getElementById('help-modal'),
  helpModalBody: document.getElementById('help-modal-body'),
  shareModal: document.getElementById('share-modal'),
  shareModalBody: document.getElementById('share-modal-body'),
};

export const viewState = {
  view: 'portfolio',
  companyId: null,
  projectId: null,
  backupPayload: null,
  shareImportFile: null,
  shareImportPayload: null,
};

export let portfolioData = loadData();
export let pinUnlocked = false;
export let importFileInput = null;

export function getData() {
  return portfolioData;
}

export function setData(nextData) {
  portfolioData = nextData;
}

export function reloadData() {
  portfolioData = loadData();
  return portfolioData;
}

export function setPinUnlocked(unlocked) {
  pinUnlocked = unlocked;
}

export function isPinUnlocked() {
  return pinUnlocked;
}

export function resetViewStateAfterWipe() {
  viewState.view = 'portfolio';
  viewState.companyId = null;
  viewState.projectId = null;
  viewState.backupPayload = null;
  viewState.shareImportFile = null;
  viewState.shareImportPayload = null;
}

export function setImportFileInput(input) {
  importFileInput = input;
}
