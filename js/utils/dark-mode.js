// js/utils/dark-mode.js

/**
 * Mengelola logika dark mode, membaca preferensi dari localStorage
 * dan menerapkan kelas CSS ke body.
 */

// Kunci untuk menyimpan preferensi di localStorage
const STORAGE_KEY = 'darkMode';

/**
 * Mengaplikasikan kelas dark mode ke elemen <body> berdasarkan preferensi yang tersimpan.
 */
function applyDarkModePreference() {
    const isDarkModeEnabled = localStorage.getItem(STORAGE_KEY) === 'enabled';
    if (isDarkModeEnabled) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

/**
 * Menukar (toggle) status dark mode dan menyimpan preferensi ke localStorage.
 */
export function toggleDarkMode() {
    const isDarkModeEnabled = document.body.classList.toggle('dark-mode');
    if (isDarkModeEnabled) {
        localStorage.setItem(STORAGE_KEY, 'enabled');
    } else {
        localStorage.setItem(STORAGE_KEY, 'disabled');
    }
}

/**
 * Fungsi inisialisasi yang harus dipanggil di setiap halaman.
 * Ia akan memuat preferensi dari localStorage dan menambahkan event listener
 * ke tombol toggle dark mode.
 * @param {HTMLElement} toggleButton Tombol DOM untuk dark mode.
 */
export function initDarkMode(toggleButton) {
    // 1. Terapkan preferensi saat halaman dimuat
    applyDarkModePreference();

    // 2. Tambahkan event listener ke tombol toggle
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            toggleDarkMode();
        });
    }
}
