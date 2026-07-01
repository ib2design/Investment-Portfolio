import { SCHEMA_VERSION, SHARE_PIN_LENGTH } from './constants.js';
import {
  canUseBackupEncryption,
  encryptSharePayload,
  getEncryptionUnavailableMessage,
} from './backup.js';

const SHARE_FILE_MIME_TYPES = [
  'application/octet-stream',
  'text/plain',
  'application/json',
];

function isValidPinDigits(pin, length) {
  return new RegExp(`^\\d{${length}}$`).test(pin);
}

function sanitizeFilenamePart(value) {
  return String(value ?? '')
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 60);
}

export function buildProjectSharePayload(company, project) {
  return {
    schemaVersion: SCHEMA_VERSION,
    company: {
      id: company.id,
      name: company.name,
      partnerCount: company.partnerCount,
      colorIndex: company.colorIndex,
      documentationUrl: company.documentationUrl ?? '',
    },
    project: { ...project },
  };
}

export function getProjectShareFilename(companyName, projectName) {
  const date = new Date().toISOString().slice(0, 10);
  const companyPart = sanitizeFilenamePart(companyName) || 'Company';
  const projectPart = sanitizeFilenamePart(projectName) || 'Project';

  return `${companyPart}_${projectPart}_${date}.json`;
}

export function isValidSharePin(pin) {
  return isValidPinDigits(pin, SHARE_PIN_LENGTH);
}

function canShareFiles(files) {
  if (!navigator.share) {
    return false;
  }

  if (!navigator.canShare) {
    return true;
  }

  return navigator.canShare({ files });
}

function buildShareableFile(blob, filename) {
  for (const type of SHARE_FILE_MIME_TYPES) {
    const file = new File([blob], filename, { type });

    if (canShareFiles([file])) {
      return file;
    }
  }

  return new File([blob], filename, { type: 'application/octet-stream' });
}

function downloadShareFile(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function invokeNavigatorShare(file, { title, text }) {
  if (!navigator.share) {
    throw new Error('Sharing is not supported here. Save the file instead.');
  }

  const files = [file];
  const shareData = { files, title, text };

  if (navigator.canShare && !navigator.canShare({ files })) {
    throw new Error('This browser cannot share this file type.');
  }

  return navigator.share(shareData);
}

export async function createEncryptedShareFile({ company, project, sharePin }) {
  if (!canUseBackupEncryption()) {
    throw new Error(getEncryptionUnavailableMessage());
  }

  if (!isValidSharePin(sharePin)) {
    throw new Error(`Share PIN must be ${SHARE_PIN_LENGTH} digits.`);
  }

  const payload = buildProjectSharePayload(company, project);
  const encryptedFile = await encryptSharePayload(payload, sharePin);
  const filename = getProjectShareFilename(company.name, project.name);
  const json = JSON.stringify(encryptedFile, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  return buildShareableFile(blob, filename);
}

export function sharePreparedFile(file, { companyName, projectName }) {
  const title = `${companyName} — ${projectName}`;
  const text = 'Encrypted Investment Portfolio project. Import in the app using the Share PIN sent separately.';

  try {
    const sharePromise = invokeNavigatorShare(file, { title, text });

    return sharePromise
      .then(() => ({ cancelled: false, usedDownloadFallback: false }))
      .catch((error) => {
        if (error?.name === 'AbortError') {
          return { cancelled: true, usedDownloadFallback: false };
        }

        downloadShareFile(file);
        return { cancelled: false, usedDownloadFallback: true };
      });
  } catch (error) {
    downloadShareFile(file);
    return Promise.resolve({ cancelled: false, usedDownloadFallback: true });
  }
}

export async function shareEncryptedProject({ company, project, sharePin }) {
  const file = await createEncryptedShareFile({ company, project, sharePin });
  return sharePreparedFile(file, {
    companyName: company.name,
    projectName: project.name,
  });
}
