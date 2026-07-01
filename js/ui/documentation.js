import { escapeHtml, detailRow } from './dom.js';

const UNSAFE_DOCUMENTATION_PROTOCOL = /^(javascript|data|vbscript):/i;

export function normalizeDocumentationUrl(value) {
  return String(value ?? '').trim();
}

export function getDocumentationHref(url) {
  const normalized = normalizeDocumentationUrl(url);

  if (!normalized || UNSAFE_DOCUMENTATION_PROTOCOL.test(normalized)) {
    return '';
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(normalized)) {
    return normalized;
  }

  return `https://${normalized}`;
}

export function isAllowedDocumentationUrl(url) {
  const normalized = normalizeDocumentationUrl(url);

  if (!normalized) {
    return false;
  }

  return !UNSAFE_DOCUMENTATION_PROTOCOL.test(normalized);
}

export function validateDocumentationUrlField(url, errors, field = 'documentationUrl') {
  const normalized = normalizeDocumentationUrl(url);

  if (!normalized) {
    return '';
  }

  if (!isAllowedDocumentationUrl(normalized)) {
    errors[field] = 'This link is not allowed.';
  }

  return normalized;
}

export function documentationLinkHtml(url) {
  const href = getDocumentationHref(url);

  if (!href) {
    return '';
  }

  return `<a class="detail-link" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" data-external-link>Documentation Online</a>`;
}

export function detailDocumentationRow(url) {
  const link = documentationLinkHtml(url);

  if (!link) {
    return '';
  }

  return detailRow('Documentation', link);
}
