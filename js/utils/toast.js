// js/utils/toast.js
//
// Toast notifikasi ringan yang bisa dipakai di halaman mana pun. Dibuat
// generic (bukan cuma "level up") supaya bisa dipakai ulang nanti kalau ada
// notifikasi lain, tapi untuk sekarang cuma dipanggil oleh
// js/game/game-logic.js -> animateXPBar() saat user naik level.
//
// Elemen toast dibuat secara dinamis lewat JS (bukan hardcoded di HTML)
// supaya beberapa toast bisa muncul bertumpuk kalau perlu, dan supaya
// halaman yang tidak butuh toast tidak perlu markup tambahan.

const CONTAINER_ID = 'tc-toast-container';

function getOrCreateContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.className = 'tc-toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Tampilkan toast "Level Up!" (atau pesan lain) selama beberapa detik lalu
 * hilang otomatis.
 * @param {string} message
 * @param {{duration?: number, icon?: string}} [options]
 */
export function showLevelUpToast(message, options = {}) {
  const { duration = 3200, icon = '🎉' } = options;
  const container = getOrCreateContainer();

  const toast = document.createElement('div');
  toast.className = 'tc-toast tc-toast-levelup';
  toast.innerHTML = `
    <span class="tc-toast-icon" aria-hidden="true">${icon}</span>
    <span class="tc-toast-message"></span>
  `;
  toast.querySelector('.tc-toast-message').textContent = message;

  container.appendChild(toast);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const remove = () => {
    toast.classList.remove('show');
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 350);
  };

  setTimeout(remove, duration);
  toast.addEventListener('click', remove);
}