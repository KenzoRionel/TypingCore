// js/utils/dark-mode.js

/**
 * Mengelola logika dark mode, membaca preferensi dari localStorage,
 * menerapkan kelas CSS ke body, dan mengganti gambar.
 */

const STORAGE_KEY = 'darkMode';

/**
 * Ganti semua gambar sesuai tema
 */
function swapImages(isDark) {
    document.querySelectorAll('.lesson-image').forEach(wrapper => {
        const img = wrapper.querySelector('img');
        if (!img) return;

        const light = wrapper.dataset.lightSrc || img.getAttribute('src');
        const file = light.split('/').pop().replace(/\.\w+$/, ''); // nama file tanpa ekstensi
        const dark = `img/dark-mode/${file}.svg`;

        const target = isDark ? dark : light;

        if (img.src.endsWith(target)) return;

        img.onerror = () => {
            img.onerror = null;
            img.src = light; // fallback ke light kalau dark 404
        };
        img.src = target;
    });
}

/**
 * Mengaplikasikan preferensi dark mode ke body & gambar.
 */
function applyDarkModePreference() {
    const isDarkModeEnabled = localStorage.getItem(STORAGE_KEY) === 'enabled';
    if (isDarkModeEnabled) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    swapImages(isDarkModeEnabled);
}

/**
 * Toggle dark mode + simpan preferensi + swap gambar
 */
export function toggleDarkMode() {
    const isDarkModeEnabled = document.body.classList.toggle('dark-mode');
    if (isDarkModeEnabled) {
        localStorage.setItem(STORAGE_KEY, 'enabled');
    } else {
        localStorage.setItem(STORAGE_KEY, 'disabled');
    }
    swapImages(isDarkModeEnabled);
}

/**
 * Inisialisasi dark mode di tiap halaman
 */
export function initDarkMode(toggleButton) {
    // Terapkan preferensi awal
    applyDarkModePreference();

    // Tambahkan listener ke tombol toggle
    if (toggleButton) {
        toggleButton.addEventListener('click', () => {
            toggleDarkMode();
        });
    }
}
