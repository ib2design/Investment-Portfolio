export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function truncate(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

export function detailRow(label, value, { highlight = false, valueClass = '' } = {}) {
  const classes = ['detail-value', highlight ? 'highlight' : '', valueClass].filter(Boolean).join(' ');

  return `
    <div class="detail-item">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="${classes}">${value}</span>
    </div>
  `;
}

export function detailRowIf(label, show, value, options = {}) {
  if (!show) {
    return '';
  }

  return detailRow(label, value, options);
}

export function gainLossStyle(value) {
  const amount = Number(value);

  if (amount < 0) {
    return { valueClass: 'loss' };
  }

  if (amount > 0) {
    return { highlight: true };
  }

  return {};
}

export function fieldLabel(text, required = false) {
  return `${escapeHtml(text)}${
    required ? '<span class="required-mark" aria-hidden="true">*</span>' : ''
  }`;
}
