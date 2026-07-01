const NON_NUMERIC_KEYS = new Set(['e', 'E', '+', '-']);

function blockInvalidNumberKeys(event, allowDecimal) {
  if (NON_NUMERIC_KEYS.has(event.key)) {
    event.preventDefault();
    return;
  }

  if (!allowDecimal && event.key === '.') {
    event.preventDefault();
  }
}

function sanitizeInteger(value) {
  return value.replace(/\D/g, '');
}

function sanitizeDecimal(value) {
  let cleaned = value.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');

  if (parts.length <= 1) {
    return cleaned;
  }

  return `${parts[0]}.${parts.slice(1).join('')}`;
}

export function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function bindDateInput(input) {
  if (!input || input.dataset.dateBound === 'true') {
    return;
  }

  const row = document.createElement('div');
  row.className = 'date-input-row';

  input.parentNode.insertBefore(row, input);
  row.appendChild(input);

  const todayButton = document.createElement('button');
  todayButton.type = 'button';
  todayButton.className = 'date-today-button';
  todayButton.textContent = 'Today';
  todayButton.setAttribute('aria-label', `Set ${input.labels?.[0]?.textContent || 'date'} to today`);
  todayButton.addEventListener('click', () => {
    input.value = getTodayIsoDate();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });

  row.appendChild(todayButton);
  input.dataset.dateBound = 'true';
}

export function bindDateInputs(root) {
  root.querySelectorAll('input[type="date"]').forEach(bindDateInput);
}

export function bindIntegerInput(input) {
  if (!input) {
    return;
  }

  input.addEventListener('keydown', (event) => blockInvalidNumberKeys(event, false));
  input.addEventListener('input', () => {
    const cleaned = sanitizeInteger(input.value);
    if (input.value !== cleaned) {
      input.value = cleaned;
    }
  });
  input.addEventListener('paste', (event) => {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    input.value = sanitizeInteger(pasted);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export function bindDecimalInput(input) {
  if (!input) {
    return;
  }

  input.addEventListener('keydown', (event) => blockInvalidNumberKeys(event, true));
  input.addEventListener('input', () => {
    const cleaned = sanitizeDecimal(input.value);
    if (input.value !== cleaned) {
      input.value = cleaned;
    }
  });
  input.addEventListener('paste', (event) => {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    input.value = sanitizeDecimal(pasted);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export function bindPinInput(input, maxLength = 6, { autocomplete = 'off', requireTap = true } = {}) {
  if (!input) {
    return;
  }

  input.setAttribute('autocomplete', autocomplete);

  if (requireTap) {
    input.readOnly = true;

    const enableInput = () => {
      input.readOnly = false;
    };

    input.addEventListener('focus', enableInput);
    input.addEventListener('touchstart', enableInput, { passive: true });
  }

  input.addEventListener('keydown', (event) => blockInvalidNumberKeys(event, false));
  input.addEventListener('input', () => {
    const cleaned = sanitizeInteger(input.value).slice(0, maxLength);
    if (input.value !== cleaned) {
      input.value = cleaned;
    }
  });
  input.addEventListener('paste', (event) => {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    input.value = sanitizeInteger(pasted).slice(0, maxLength);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export function focusPinInput(input, { delay = 0 } = {}) {
  if (!input) {
    return;
  }

  const focus = () => {
    input.readOnly = false;
    input.focus({ preventScroll: true });
  };

  if (delay > 0) {
    window.setTimeout(focus, delay);
  } else {
    window.setTimeout(focus, 0);
  }
}
