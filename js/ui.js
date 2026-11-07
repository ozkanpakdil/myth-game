/**
 * ui.js — small rendering helpers shared by the screens.
 * Templates are plain strings; every piece of content is escaped here.
 */

export const playIcon = '<svg class="button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.4v13.2L19 12z" fill="currentColor"/></svg>';
export const stopIcon = '<svg class="button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="7" width="10" height="10" rx="1.2" fill="currentColor"/></svg>';

export function listenButtonContent(label, speaking = false) {
  return `${speaking ? stopIcon : playIcon}<span>${escapeHtml(label)}</span>`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function iconImg(id, { size = '', className = 'sigil' } = {}) {
  return `<img class="${className}${size ? ` ${size}` : ''}" src="assets/svg/icons/${escapeHtml(id)}.svg" alt="" width="48" height="48" decoding="async">`;
}

export function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function progressBar(value, total, label, { compact = false } = {}) {
  const pct = percent(value, total);
  return `<div class="progress${compact ? ' progress--compact' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${value}" aria-label="${escapeHtml(label)}">
    <span class="progress__fill" style="width:${pct}%"></span>
  </div>`;
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function yearLabel(year) {
  if (!Number.isFinite(year)) return 'unknown';
  if (year === 2026) return 'present';
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} CE`;
}

export function rangeLabel(start, end) {
  const left = yearLabel(start);
  const right = end === 2026 ? 'present' : yearLabel(end);
  return `${left} – ${right}`;
}

export function regionSlug(region) {
  return String(region).toLowerCase().replace(/\s+/g, '-');
}

export function setDocumentTitle(page) {
  document.title = page ? `${page} · Mythos` : 'Mythos · A world mythology game';
}

export function focusPage() {
  const target = document.getElementById('page-title') || document.getElementById('main');
  if (!target) return;
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

let toastTimer = null;

export function toast(message, { tone = 'info', duration = 4200 } = {}) {
  const host = document.getElementById('toast');
  if (!host) return;
  host.replaceChildren();
  const item = document.createElement('div');
  item.className = `toast__item toast__item--${tone}`;
  item.textContent = message;
  host.append(item);
  requestAnimationFrame(() => item.classList.add('is-visible'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    item.classList.remove('is-visible');
    setTimeout(() => item.remove(), 300);
  }, duration);
}

export function confirmDialog({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'dialog';
    dialog.innerHTML = `
      <form method="dialog" class="dialog__panel">
        <h2 class="dialog__title">${escapeHtml(title)}</h2>
        <p class="dialog__body">${escapeHtml(message)}</p>
        <div class="dialog__actions">
          <button class="button button--ghost" value="cancel" autofocus>${escapeHtml(cancelLabel)}</button>
          <button class="button ${danger ? 'button--danger' : 'button--primary'}" value="confirm">${escapeHtml(confirmLabel)}</button>
        </div>
      </form>`;
    document.body.append(dialog);
    dialog.addEventListener('close', () => {
      const confirmed = dialog.returnValue === 'confirm';
      dialog.remove();
      resolve(confirmed);
    });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      dialog.returnValue = 'cancel';
      dialog.close();
    });
    dialog.showModal();
  });
}

export function emptyState(title, body, action = '') {
  return `<div class="empty-state">
    <p class="empty-state__mark" aria-hidden="true">✦</p>
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(body)}</p>
    ${action}
  </div>`;
}

export function difficultyClass(difficulty) {
  return ['easy', 'medium', 'hard'].includes(difficulty) ? `is-${difficulty}` : '';
}
