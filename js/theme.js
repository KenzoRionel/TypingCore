// js/theme.js
// Sistem tema TypingCore — menggantikan dark-mode.js lama.
// Tidak ada warna hardcode di sini: semua styling ada di css/themes.css,
// file ini cuma mengatur atribut data-theme + localStorage + UI picker.

const STORAGE_KEY = 'typing-theme';
const LEGACY_STORAGE_KEY = 'darkMode'; // key lama dari dark-mode.js
const THEMES_JSON_PATH = 'data/themes.json';

let themesCache = null;
let committedThemeId = null;
let previewThemeId = null;

/* ---------------------------------------------------------------------
 * Helper localStorage yang aman. Di Safari private mode (dan browser lain
 * dengan storage dimatikan / kuota penuh), getItem/setItem/removeItem bisa
 * throw dan mematikan seluruh script kalau tidak dibungkus try/catch.
 * ------------------------------------------------------------------- */
function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[theme] Gagal membaca localStorage["${key}"]:`, err);
    return null;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[theme] Gagal menulis localStorage["${key}"]:`, err);
    return false;
  }
}

function safeRemoveItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[theme] Gagal menghapus localStorage["${key}"]:`, err);
  }
}

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
  const legacy = safeGetItem(LEGACY_STORAGE_KEY);
  if (legacy === null) return;

  if (!safeGetItem(STORAGE_KEY)) {
    safeSetItem(STORAGE_KEY, legacy === 'enabled' ? 'dark' : 'light');
  }
  safeRemoveItem(LEGACY_STORAGE_KEY);
}

/**
 * Tentukan tema aktif: localStorage > prefers-color-scheme > default.
 *
 * `defaultTheme` idealnya dikirim oleh pemanggil dari field "default" di
 * themes.json (lihat initTheme di bawah), supaya themes.json jadi SATU
 * sumber kebenaran, bukan angka hardcode di banyak tempat. Parameter ini
 * tetap punya fallback 'light' untuk kondisi darurat — misalnya kalau
 * fungsi ini dipanggil dari inline anti-FOUC script di <head> sebelum
 * ada kesempatan fetch JSON.
 */
export function resolveInitialTheme(defaultTheme = 'light') {
  migrateLegacyPreference();

  const saved = safeGetItem(STORAGE_KEY);
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

  // Kalau themes.json belum sempat di-fetch, JANGAN tebak dari daftar id
  // hardcode (rawan salah begitu ada tema dark baru, mis. "catppuccin").
  // Default aman: anggap bukan dark sampai data asli tersedia — applyTheme
  // akan dipanggil ulang dengan info lengkap begitu themesCache terisi
  // (lihat initTheme).
  const isDarkTheme = selectedTheme ? selectedTheme.type === 'dark' : false;

  document.documentElement.classList.toggle('dark-mode', isDarkTheme);
  document.documentElement.classList.toggle('theme-light', !isDarkTheme);
  document.documentElement.classList.toggle('theme-dark', isDarkTheme);
  document.body.classList.toggle('dark-mode', isDarkTheme);
  document.body.classList.toggle('theme-light', !isDarkTheme);
  document.body.classList.toggle('theme-dark', isDarkTheme);
}

function getThemeById(themeId) {
  return (themesCache?.themes || []).find((theme) => theme.id === themeId);
}

function updateThemeToggleLabel(themeId) {
  const selectedTheme = getThemeById(themeId);
  document.querySelectorAll('.theme-picker-current-name').forEach((label) => {
    label.textContent = selectedTheme?.name || themeId || 'Tema';
  });
}

function previewTheme(themeId) {
  if (!themeId || themeId === previewThemeId) return;
  previewThemeId = themeId;
  applyTheme(themeId);
  updateActivePickerState(themeId);
  updateThemeToggleLabel(themeId);
  document.dispatchEvent(new CustomEvent('themepreview', { detail: { theme: themeId } }));
}

function restoreCommittedTheme() {
  if (!previewThemeId || !committedThemeId) return;
  previewThemeId = null;
  applyTheme(committedThemeId);
  updateActivePickerState(committedThemeId);
  updateThemeToggleLabel(committedThemeId);
  document.dispatchEvent(new CustomEvent('themepreviewend', { detail: { theme: committedThemeId } }));
}

/**
 * Ganti tema + simpan preferensi.
 *
 * Divalidasi dulu terhadap themes.json supaya localStorage tidak pernah
 * kesimpan id yang tidak dikenal (typo, sisa JSON versi lama, dsb) — kalau
 * itu terjadi, [data-theme="..."] tidak match apa pun dan halaman jadi
 * tanpa styling tema sama sekali sampai user manual reset.
 */
export function setTheme(themeId) {
  const knownThemes = themesCache?.themes;
  if (knownThemes && !knownThemes.some((theme) => theme.id === themeId)) {
    console.warn(`[theme] Tema "${themeId}" tidak dikenal di themes.json, diabaikan.`);
    return;
  }

  applyTheme(themeId);
  committedThemeId = themeId;
  previewThemeId = null;
  safeSetItem(STORAGE_KEY, themeId);
  updateActivePickerState(themeId);
  updateThemeToggleLabel(themeId);
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeId } }));
}

/**
 * Tandai button aktif di picker (kalau picker sudah dirender).
 */
function updateActivePickerState(themeId) {
  document.querySelectorAll('.theme-option').forEach((btn) => {
    const isActive = btn.dataset.themeId === themeId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
  });
}

/**
 * Render grid picker tema ke dalam sebuah container.
 * Setiap tombol menampilkan: dot warna --bg + --accent, icon, dan nama,
 * diambil dinamis dari data/themes.json (tidak ada yang di-hardcode di JS).
 *
 * Dibangun murni lewat DOM API (createElement/textContent), BUKAN innerHTML
 * dengan template string — supaya field dari JSON (name, icon) tidak pernah
 * ditafsirkan sebagai markup. Aman sekarang, dan tetap aman kalau suatu saat
 * themes.json datang dari sumber yang tidak sepenuhnya terpercaya.
 *
 * @param {HTMLElement} container - elemen tempat grid akan dirender
 */
export async function renderThemePicker(container) {
  if (!container) return;

  const { themes } = await getThemes();
  const activeTheme = document.documentElement.getAttribute('data-theme');

  container.classList.add('theme-picker-grid');
  // role="radio" di tiap tombol butuh parent role="radiogroup" supaya
  // assistive technology membacanya sebagai satu grup pilihan tunggal.
  container.setAttribute('role', 'radiogroup');
  container.setAttribute('aria-label', 'Pilih tema');
  container.innerHTML = '';

  themes.forEach((theme) => {
    const isActive = theme.id === activeTheme;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-option';
    btn.dataset.themeId = theme.id;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    if (isActive) btn.classList.add('active');

    // Preview swatch dua warna: --bg dan --accent dari tema tsb.
    // Kita render preview dengan cara menaruh atribut data-theme SEMENTARA
    // pada elemen swatch itu sendiri, sehingga warnanya diambil murni dari
    // css/themes.css lewat CSS variables (tidak ada hex di JS).
    const swatch = document.createElement('span');
    swatch.className = 'theme-option-swatch';
    swatch.setAttribute('data-theme', theme.id);

    const swatchBg = document.createElement('span');
    swatchBg.className = 'theme-swatch-bg';
    const swatchAccent = document.createElement('span');
    swatchAccent.className = 'theme-swatch-accent';
    swatch.append(swatchBg, swatchAccent);

    const iconWrap = document.createElement('span');
    iconWrap.className = 'theme-option-icon';
    const icon = document.createElement('i');
    icon.className = 'fa-solid';
    // theme.icon diharapkan berupa satu nama class Font Awesome (mis.
    // "fa-moon"). classList.add menolak string kosong/berisi whitespace,
    // jadi ini sekaligus jadi validasi ringan terhadap data JSON.
    if (theme.icon && !/\s/.test(theme.icon)) {
      icon.classList.add(theme.icon);
    }
    iconWrap.appendChild(icon);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'theme-option-name';
    nameSpan.textContent = theme.name; // textContent, BUKAN innerHTML -> anti-XSS

    btn.append(swatch, iconWrap, nameSpan);
    btn.addEventListener('mouseenter', () => previewTheme(theme.id));
    btn.addEventListener('focus', () => previewTheme(theme.id));
    btn.addEventListener('click', () => setTheme(theme.id));
    container.appendChild(btn);
  });

  container.addEventListener('mouseleave', restoreCommittedTheme);
  container.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      if (!container.contains(document.activeElement)) restoreCommittedTheme();
    });
  });

  const dropdownMenu = container.closest('.dropdown-menu');
  if (dropdownMenu) {
    dropdownMenu.addEventListener('hidden.bs.dropdown', restoreCommittedTheme);
    dropdownMenu.parentElement?.addEventListener('hidden.bs.dropdown', restoreCommittedTheme);
  }
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
export async function initTheme({ pickerContainer } = {}) {
  // Muat themes.json lebih dulu supaya field "default" jadi satu-satunya
  // sumber kebenaran untuk tema fallback (bukan hardcode 'light' di JS).
  let defaultTheme = 'light';
  try {
    const loaded = await getThemes();
    if (loaded?.default) defaultTheme = loaded.default;
  } catch (err) {
    console.warn('[theme] Gagal memuat themes.json, pakai default "light":', err);
  }

  const currentTheme = document.documentElement.getAttribute('data-theme');
  if (currentTheme) {
    // <html data-theme> sudah di-set oleh inline anti-FOUC script di <head>
    // (untuk mencegah flash sebelum modul ini load). Re-apply di sini
    // supaya class dark-mode/theme-dark ikut benar sekarang setelah
    // themesCache terisi — inline script hanya sempat set atributnya saja.
    applyTheme(currentTheme);
    committedThemeId = currentTheme;
  } else {
    // Jaga-jaga kalau ada halaman yang lupa pasang inline script.
    committedThemeId = resolveInitialTheme(defaultTheme);
    applyTheme(committedThemeId);
  }

  updateThemeToggleLabel(committedThemeId);

  enableThemeTransitions();

  if (pickerContainer) {
    renderThemePicker(pickerContainer);
  }

  // Ikuti perubahan preferensi sistem HANYA jika user belum pernah memilih manual.
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!safeGetItem(STORAGE_KEY)) {
        applyTheme(e.matches ? 'dark' : defaultTheme);
      }
    });
  }
}
