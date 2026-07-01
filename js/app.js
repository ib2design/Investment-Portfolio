import { hasPin } from './pin.js';
import { setPinUnlocked } from './context.js';
import { applyInitialTheme } from './ui/theme.js';
import { updateAmountModeIndicator } from './ui/chrome.js';
import { bindHelpModal } from './ui/help.js';
import { bindShareProjectModal } from './ui/shareModal.js';
import { render, bindGlobalEvents } from './router.js';
import { renderPinLock, setUnlockRenderCallback } from './views/pinLock.js';

applyInitialTheme();
updateAmountModeIndicator();
setUnlockRenderCallback(render);
bindGlobalEvents();
bindHelpModal();
bindShareProjectModal();

if (hasPin()) {
  renderPinLock();
} else {
  setPinUnlocked(true);
  render();
}
