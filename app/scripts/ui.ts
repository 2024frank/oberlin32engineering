export function escapeHtml(value: unknown = ''): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' };
  return String(value).replace(/[&<>'"]/g, (character) => map[character] ?? character);
}

export function safeUrl(value: unknown = ''): string {
  try {
    const url = new URL(String(value), location.origin);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

export function statusPanel(type: 'loading' | 'empty' | 'error', title: string, message: string): string {
  const icon = type === 'error' ? '!' : type === 'empty' ? '—' : '';
  return `<div class="component-status component-status--${type}" role="${type === 'error' ? 'alert' : 'status'}"><span class="component-status__icon" aria-hidden="true">${icon}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p></div>`;
}

export function setBusy(button: HTMLButtonElement | null, busy: boolean, label = 'Sending…'): void {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.innerHTML;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span>${escapeHtml(label)}`;
    return;
  }
  button.disabled = false;
  button.removeAttribute('aria-busy');
  if (button.dataset.originalLabel) button.innerHTML = button.dataset.originalLabel;
}

export function toast(message: string, type: 'success' | 'error' = 'success'): void {
  const region = document.querySelector<HTMLElement>('[data-toast-region]');
  if (!region) return;
  const node = document.createElement('div');
  node.className = `toast ${type}`;
  node.textContent = message;
  region.append(node);
  window.setTimeout(() => node.remove(), 5200);
}
