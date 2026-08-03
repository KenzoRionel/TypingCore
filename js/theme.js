// js/theme.js
// Sistem tema TypingCore — menggantikan dark-mode.js lama.
// Tidak ada warna hardcode di sini: semua styling ada di css/themes.css,
// file ini cuma mengatur atribut data-theme + localStorage + UI picker.

const STORAGE_KEY = 'typing-theme';
const LEGACY_STORAGE_KEY = 'darkMode'; // key lama dari dark-mode.js
const THEMES_JSON_PATH = 'data/themes.json';

let themesCache = null;

/**
 * Ambil daftar tema dari data/themes.json (di-cache setelah fetch pertama).
 */
export async function getThemes() {
  if (themesCache) return themesCache;
  const res = await fetch(THEMES_JSON_PATH);
  if (!res.ok) throw new Error(`Gagal memuat ${THEMES_JSON_PATH}: ${res.status}`);
  themesCache = await res.json();
  return themesCache;
}

/**
 * Migrasi satu kali dari key lama 'darkMode' ('enabled'/'disabled')
 * ke key baru 'typing-theme' ('dark'/'light'). Aman dipanggil berulang kali,
 * karena setelah migrasi key lama dihapus.
 */
function migrateLegacyPreference() {
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy === null) return;

  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, legacy === 'enabled' ? 'dark' : 'light');
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

/**
 * Tentukan tema aktif: localStorage > prefers-color-scheme > default.
 * Dipakai baik oleh script anti-FOUC (versi inline, lihat index.html)
 * maupun oleh init() di sini untuk konsistensi.
 */
export function resolveInitialTheme(defaultTheme = 'light') {
  migrateLegacyPreference();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return saved;

  const prefersDark = window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : defaultTheme;
}

/**
 * Terapkan tema ke <html data-theme="...">.
 */
export function applyTheme(themeId) {
  document.documentElement.setAttribute('data-theme', themeId);

  const themeList = themesCache?.themes || [];
  const selectedTheme = themeList.find((theme) => theme.id === themeId);
  const isDarkTheme = selectedTheme
    ? selectedTheme.type === 'dark'
    : ['dark', 'dracula', 'nord'].includes(themeId);

  document.documentElement.classList.toggle('dark-mode', isDarkTheme);
  document.documentElement.classList.toggle('theme-light', !isDarkTheme);
  document.documentElement.classList.toggle('theme-dark', isDarkTheme);
  document.body.classList.toggle('dark-mode', isDarkTheme);
  document.body.classList.toggle('theme-light', !isDarkTheme);
  document.body.classList.toggle('theme-dark', isDarkTheme);
}

/**
 * Ganti tema + simpan preferensi.
 */
export function setTheme(themeId) {
  applyTheme(themeId);
  localStorage.setItem(STORAGE_KEY, themeId);
  updateActivePickerState(themeId);
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeId } }));
}

/**
 * Tandai button aktif di picker (kalau picker sudah dirender).
 */
function updateActivePickerState(themeId) {
  document.querySelectorAll('.theme-option').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.themeId === themeId);
    btn.setAttribute('aria-pressed', btn.dataset.themeId === themeId ? 'true' : 'false');
  });
}

/**
 * Render grid picker tema ke dalam sebuah container.
 * Setiap tombol menampilkan: dot warna --bg + --accent, icon, dan nama,
 * diambil dinamis dari data/themes.json (tidak ada yang di-hardcode di JS).
 *
 * @param {HTMLElement} container - elemen tempat grid akan dirender
 */
export async function renderThemePicker(container) {
  if (!container) return;

  const { themes } = await getThemes();
  const activeTheme = document.documentElement.getAttribute('data-theme');

  container.classList.add('theme-picker-grid');
  container.innerHTML = '';

  themes.forEach((theme) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-option';
    btn.dataset.themeId = theme.id;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', theme.id === activeTheme ? 'true' : 'false');
    btn.setAttribute('aria-pressed', theme.id === activeTheme ? 'true' : 'false');
    if (theme.id === activeTheme) btn.classList.add('active');

    // Preview swatch dua warna: --bg dan --accent dari tema tsb.
    // Kita render preview dengan cara menaruh atribut data-theme SEMENTARA
    // pada elemen swatch itu sendiri, sehingga warnanya diambil murni dari
    // css/themes.css lewat CSS variables (tidak ada hex di JS).
    btn.innerHTML = `
      <span class="theme-option-swatch" data-theme="${theme.id}">
        <span class="theme-swatch-bg"></span>
        <span class="theme-swatch-accent"></span>
      </span>
      <span class="theme-option-icon"><i class="fas ${theme.icon}"></i></span>
      <span class="theme-option-name">${theme.name}</span>
    `;

    btn.addEventListener('click', () => setTheme(theme.id));
    container.appendChild(btn);
  });
}

/**
 * Aktifkan transisi halus antar tema. Dipanggil setelah first paint
 * supaya load awal halaman tidak ikut ter-animasi (anti "flash").
 */
function enableThemeTransitions() {
  requestAnimationFrame(() => {
    document.documentElement.classList.add('theme-transition-ready');
  });
}

/**
 * Inisialisasi sistem tema di sebuah halaman.
 * Panggil ini di setiap halaman (menggantikan initDarkMode lama).
 *
 * @param {Object} options
 * @param {HTMLElement} [options.pickerContainer] - opsional, container picker
 */
export function initTheme({ pickerContainer } = {}) {
  // Catatan: <html data-theme> idealnya SUDAH di-set oleh inline script
  // anti-FOUC di <head> sebelum file ini load. Baris ini hanya jaga-jaga
  // (misal ada halaman yang lupa pasang inline script).
  if (!document.documentElement.getAttribute('data-theme')) {
    applyTheme(resolveInitialTheme());
  }

  enableThemeTransitions();

  if (pickerContainer) {
    renderThemePicker(pickerContainer);
  }

  // Ikuti perubahan preferensi sistem HANYA jika user belum pernah memilih manual.
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}