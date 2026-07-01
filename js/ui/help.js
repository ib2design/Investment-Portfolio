import { dom } from '../context.js';
import { faqContentMarkup } from './faq.js';
import { closeShareProjectModal } from './shareModal.js';

export function setHelpModalVisible(visible) {
  if (!dom.helpModal) {
    return;
  }

  dom.helpModal.classList.toggle('hidden', !visible);
  dom.helpModal.setAttribute('aria-hidden', visible ? 'false' : 'true');
  document.body.classList.toggle('help-modal-open', visible);
}

export function openHelpModal() {
  if (!dom.helpModalBody) {
    return;
  }

  closeShareProjectModal();
  dom.helpModalBody.innerHTML = faqContentMarkup();
  setHelpModalVisible(true);
}

export function closeHelpModal() {
  setHelpModalVisible(false);
}

export function bindHelpModal() {
  if (!dom.helpModal) {
    return;
  }

  dom.helpModal.querySelectorAll('[data-help-close]').forEach((element) => {
    element.addEventListener('click', closeHelpModal);
  });
}
