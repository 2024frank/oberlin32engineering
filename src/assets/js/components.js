(() => {
  'use strict';

  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

  function statusPanel({ type = 'empty', title, message } = {}) {
    const icon = type === 'error' ? '!' : type === 'loading' ? '' : '—';
    return `<div class="component-status component-status--${escapeHTML(type)}" role="${type === 'error' ? 'alert' : 'status'}"><span class="component-status__icon" aria-hidden="true">${icon}</span><h3>${escapeHTML(title || 'Nothing here yet')}</h3><p>${escapeHTML(message || '')}</p></div>`;
  }

  function setBusy(button, busy, label = 'Sending…') {
    if (!button) return;
    if (busy) {
      button.dataset.originalLabel = button.innerHTML;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span>${escapeHTML(label)}`;
    } else {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      if (button.dataset.originalLabel) button.innerHTML = button.dataset.originalLabel;
    }
  }

  window.O32Components = { statusPanel, setBusy };
})();
