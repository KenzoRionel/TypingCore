// js/utils/time-mode-modal-helpers.js
//
// Dua helper untuk toolbar mode waktu (#timeModeToggleBtn +
// #timeModeModal):
//
// 1. formatDuration(totalSeconds) - ubah angka detik jadi teks singkat.
//    Di bawah 2 menit tetap tampil "Ns" (mis. "90s"), begitu >= 120 detik
//    otomatis dikonversi ke menit ("2m", "16m40s"), dan >= 1 jam ke jam
//    ("1h", "1h30m"). Dipakai untuk mengisi teks di dalam
//    #timeModeToggleValue supaya tidak lagi menampilkan angka detik yang
//    sangat panjang (mis. "1000s") yang menyebabkan teks keluar dari
//    border tombol.
//
// 2. positionTimeModeModal(triggerEl, modalEl) - hitung & pasang posisi
//    #timeModeModal (position: fixed) tepat di bawah tombol yang
//    memicunya (triggerEl), sekaligus menggeser modal ke kiri/kanan bila
//    perlu supaya tidak keluar dari tepi layar, dan menyetel posisi
//    panah kecil (var(--arrow-left) di time-mode-modal.css) supaya tetap
//    menunjuk tepat ke tombol.

/**
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));

  if (seconds < 120) {
    return `${seconds}s`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remSeconds = seconds % 60;
    return remSeconds === 0 ? `${minutes}m` : `${minutes}m${remSeconds}s`;
  }

  const hours = Math.floor(seconds / 3600);
  const remMinutes = Math.floor((seconds % 3600) / 60);
  return remMinutes === 0 ? `${hours}h` : `${hours}h${remMinutes}m`;
}

/**
 * Panggil ini SETELAH modal dibuat visible (hidden dihapus / display
 * diubah) tapi sebelum/langsung sesudah itu, karena butuh
 * modalEl.offsetWidth yang valid. Panggil ulang juga saat window resize
 * atau scroll selama modal masih terbuka, supaya posisinya tetap akurat.
 *
 * @param {HTMLElement} triggerEl - tombol pemicu, mis. #timeModeToggleBtn
 * @param {HTMLElement} modalEl - kotak modal, mis. #timeModeModal
 */
export function positionTimeModeModal(triggerEl, modalEl) {
  const GAP = 10; // jarak vertikal antara tombol & modal
  const EDGE_PADDING = 8; // jarak minimum ke tepi layar

  const rect = triggerEl.getBoundingClientRect();
  const modalWidth = modalEl.offsetWidth || 220;

  // Posisi ideal: modal di-center secara horizontal terhadap tombol.
  let left = rect.left + rect.width / 2 - modalWidth / 2;

  // Jangan sampai keluar dari tepi kiri/kanan layar.
  const maxLeft = window.innerWidth - modalWidth - EDGE_PADDING;
  left = Math.max(EDGE_PADDING, Math.min(left, maxLeft));

  let top = rect.bottom + GAP;
  let arrowOnTop = true;

  // Kalau tombolnya dekat bagian bawah layar dan modal tidak akan muat
  // di bawah, tampilkan modal di ATAS tombol sebagai gantinya.
  const modalHeight = modalEl.offsetHeight || 0;
  if (top + modalHeight > window.innerHeight - EDGE_PADDING) {
    top = rect.top - modalHeight - GAP;
    arrowOnTop = false;
  }

  modalEl.style.top = `${Math.max(EDGE_PADDING, top)}px`;
  modalEl.style.left = `${left}px`;
  modalEl.classList.toggle('arrow-bottom', !arrowOnTop);

  // Posisi panah relatif terhadap sisi kiri modal, supaya tetap presisi
  // menunjuk ke tengah tombol walau modal digeser karena mepet tepi layar.
  const arrowLeft = rect.left + rect.width / 2 - left;
  modalEl.style.setProperty('--arrow-left', `${arrowLeft}px`);
}