// js/index-keyboard.js
// Modul keyboard virtual khusus untuk halaman index.html
// File ini terpisah dari learn-typing-ui.js agar perubahan keyboard di index.html
// tidak mempengaruhi keyboard di learn-typing.html

import { keyLayout } from "./keyboard-layout.js";

// Keyboard visibility state
const KEYBOARD_VISIBILITY_KEY = 'typingCore_showKeyboard';
let showKeyboard = false;

// Animation state variables
let animatedKeyElement = null;
let rotation = 0;
const defaultAnimationSpeed = 3;
let animationSpeed = defaultAnimationSpeed;
let animationTimeout = null;
export let isCorrectInputAnimationActive = false;
let borderOpacity = 0;
let isAnimating = false;

// Active key highlight timeout management
let activeKeyTimeout = null;
const ACTIVE_KEY_DELAY = 30; // ms to keep highlight after keyup (reduced for faster response)

// Caps Lock state
let isCapsLockActive = false;





/**
 * Memuat preferensi visibilitas keyboard dari localStorage
 * @returns {boolean} Status visibilitas keyboard
 */
export function loadKeyboardVisibility() {
  try {
    const saved = localStorage.getItem(KEYBOARD_VISIBILITY_KEY);
    if (saved !== null) {
      showKeyboard = saved === 'true';
    }
  } catch (e) {
    console.warn('Failed to load keyboard visibility:', e);
  }
  return showKeyboard;
}

/**
 * Menyimpan preferensi visibilitas keyboard ke localStorage
 * @param {boolean} value - Status visibilitas keyboard
 */
export function saveKeyboardVisibility(value) {
  showKeyboard = value;
  try {
    localStorage.setItem(KEYBOARD_VISIBILITY_KEY, value ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save keyboard visibility:', e);
  }
}

/**
 * Mendapatkan status visibilitas keyboard saat ini
 * @returns {boolean} Status visibilitas keyboard
 */
export function getKeyboardVisibility() {
  return showKeyboard;
}

/**
 * Mengatur status visibilitas keyboard
 * @param {boolean} value - Status visibilitas keyboard
 */
export function setKeyboardVisibility(value) {
  showKeyboard = value;
}

/**
 * Mengatur kecepatan animasi border
 * @param {number} speed - Kecepatan animasi
 */
export function setAnimationSpeed(speed) {
  if (speed === 15) {
    animationSpeed = speed;
    if (animationTimeout) {
      clearTimeout(animationTimeout);
    }
    animationTimeout = setTimeout(() => {
      animationSpeed = defaultAnimationSpeed;
    }, 50);
  } else {
    animationSpeed = speed;
  }
}

/**
 * Mengatur tombol yang sedang dianimasi
 * @param {HTMLElement} keyElement - Elemen tombol yang akan dianimasi
 */
export function setAnimatingKey(keyElement) {
  clearAnimation();
  if (keyElement) {
    animatedKeyElement = keyElement;
    animatedKeyElement.classList.add('is-animating');
    borderOpacity = 0;
    if (!isAnimating) {
      isAnimating = true;
      requestAnimationFrame(animateBorder);
    }
  } else {
    animatedKeyElement = null;
  }
}

/**
 * Membersihkan animasi dari tombol
 */
export function clearAnimation() {
  if (animatedKeyElement) {
    animatedKeyElement.classList.remove('is-animating');
    animatedKeyElement.style.borderImageSource = '';
  }
  animatedKeyElement = null;
  borderOpacity = 0;
  isAnimating = false;
}

/**
 * Fungsi animasi border yang berputar
 */
export function animateBorder() {
  if (animatedKeyElement) {
    if (borderOpacity < 1) {
      borderOpacity = Math.min(1, borderOpacity + 0.05);
    }

    rotation += animationSpeed;
    let startColor = `rgba(0, 123, 255, ${0.8 * borderOpacity})`;
    let endColor = `rgba(255, 255, 255, ${1 * borderOpacity})`;
    
    if (isCorrectInputAnimationActive) {
      startColor = `rgba(253, 216, 53, ${1 * borderOpacity})`;
      endColor = `rgba(200, 255, 0, ${1 * borderOpacity})`;
    }
    
    const gradient = `conic-gradient(from ${rotation}deg, ${startColor} 0%, ${endColor} 25%, ${startColor} 50%, ${endColor} 75%, ${startColor} 100%)`;
    animatedKeyElement.style.borderImageSource = gradient;
    requestAnimationFrame(animateBorder);
  } else {
    isAnimating = false;
  }
}

/**
 * Mengatur status animasi input benar
 * @param {boolean} value - Status animasi
 */
export function setIsCorrectInputAnimationActive(value) {
  isCorrectInputAnimationActive = value;
}

/**
 * Membuat keyboard virtual di container yang ditentukan
 * @param {HTMLElement} keyboardContainer - Container untuk keyboard
 * @param {Array} layout - Layout keyboard (default: keyLayout)
 */
export function createKeyboard(keyboardContainer, layout = keyLayout) {
  if (!keyboardContainer) {
    console.error("keyboardContainer tidak ditemukan. Tidak dapat membuat keyboard.");
    return;
  }

  // Bersihkan container
  keyboardContainer.innerHTML = '';

  // Definisi kelas lebar untuk tombol khusus
  const keyWidthClasses = {
    'ShiftLeft': 'key-wide',
    'ShiftRight': 'key-wide',
    'Tab': 'key-tab',
    'CapsLock': 'key-medium',
    'Backspace': 'key-medium',
    'Enter': 'key-medium',
    'Space': 'key-space',
    'ControlLeft': 'key-small',
    'ControlRight': 'key-small',
    'AltLeft': 'key-small',
    'AltRight': 'key-small',
    'MetaLeft': 'key-small',
    'MetaRight': 'key-small',
    'ContextMenu': 'key-small',
  };

  // Definisi nama tampilan untuk tombol khusus
  const keyDisplayNames = {
    'ShiftLeft': 'Shift',
    'ShiftRight': 'Shift',
    'ControlLeft': 'Ctrl',
    'ControlRight': 'Ctrl',
    'AltLeft': 'Alt',
    'AltRight': 'Alt',
    'MetaLeft': 'Win',
    'MetaRight': 'Win',
    'ContextMenu': 'Menu',
    'Space': '',
  };

  // Buat baris-baris keyboard
  layout.forEach(row => {
    const rowElement = document.createElement('div');
    rowElement.classList.add('keyboard-row');

    row.forEach(key => {
      if (key === '') return;

      const keyElement = document.createElement('div');
      keyElement.classList.add('key');

      const displayKey = keyDisplayNames[key] !== undefined ? keyDisplayNames[key] : key;
      const lowerKey = key === 'Space' ? ' ' : key.toLowerCase();

      keyElement.textContent = displayKey;
      keyElement.setAttribute('data-key', lowerKey);

      // Tambahkan kelas lebar jika ada
      const widthClass = keyWidthClasses[key];
      if (widthClass) {
        keyElement.classList.add(widthClass);
      }

      rowElement.appendChild(keyElement);
    });

    keyboardContainer.appendChild(rowElement);
  });
}


/**
 * Membersihkan semua highlight dari keyboard
 * @param {HTMLElement} keyboardContainer - Container keyboard
 */
export function clearKeyboardHighlights(keyboardContainer) {
  if (!keyboardContainer) return;

  // Clear any pending timeout to prevent conflicts
  if (activeKeyTimeout) {
    clearTimeout(activeKeyTimeout);
    activeKeyTimeout = null;
  }

  keyboardContainer.querySelectorAll('.key').forEach(el => {
    el.classList.remove('next-key', 'correct-key', 'wrong-key', 'wrong-key-flash', 'active', 'jelly-effect', 'backspace-active');
    if (!el.classList.contains('is-animating')) {
      el.style.borderImageSource = '';
      el.style.border = '';
    }
  });
}




/**
 * Menyoroti tombol yang sedang ditekan dengan kelas active
 * @param {HTMLElement} keyboardContainer - Container keyboard
 * @param {string} keyChar - Karakter tombol yang ditekan
 */
export function highlightActiveKeyOnKeyboard(keyboardContainer, keyChar) {
  if (!keyboardContainer || !keyChar) return;

  // Clear any pending timeout to prevent removing highlight too early
  if (activeKeyTimeout) {
    clearTimeout(activeKeyTimeout);
    activeKeyTimeout = null;
  }

  // Hapus active class dari semua tombol terlebih dahulu
  keyboardContainer.querySelectorAll('.key.active').forEach(el => {
    el.classList.remove('active');
    el.classList.remove('backspace-active');
  });

  const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);
  if (targetKeyElement) {
    targetKeyElement.classList.add('active');
    // Tambahkan highlight khusus berwarna kuning untuk tombol backspace
    if (keyChar.toLowerCase() === 'backspace') {
      targetKeyElement.classList.add('backspace-active');
    }
  }
}


/**
 * Menghapus highlight tombol aktif dengan delay
 * @param {HTMLElement} keyboardContainer - Container keyboard
 * @param {number} delay - Delay dalam ms (default: ACTIVE_KEY_DELAY)
 */
export function clearActiveKeyHighlight(keyboardContainer, delay = ACTIVE_KEY_DELAY) {
  if (!keyboardContainer) return;

  // Clear any existing timeout
  if (activeKeyTimeout) {
    clearTimeout(activeKeyTimeout);
    activeKeyTimeout = null;
  }

  // Set new timeout to remove active class
  activeKeyTimeout = setTimeout(() => {
    keyboardContainer.querySelectorAll('.key.active').forEach(el => {
      el.classList.remove('active');
      el.classList.remove('backspace-active');
    });
    activeKeyTimeout = null;
  }, delay);

}



/**
 * Menyoroti tombol tertentu pada keyboard sebagai tombol berikutnya
 * @param {HTMLElement} keyboardContainer - Container keyboard
 * @param {string} keyChar - Karakter tombol yang akan disoroti
 */
export function highlightKeyOnKeyboard(keyboardContainer, keyChar) {
  if (!keyboardContainer) {
    console.error("ERROR: keyboardContainer tidak ditemukan.");
    return;
  }

  // Hapus highlight dari tombol sebelumnya
  const previousHighlightedKey = keyboardContainer.querySelector('.next-key');
  if (previousHighlightedKey) {
    previousHighlightedKey.classList.remove('next-key');
  }

  if (typeof keyChar === 'string' && keyChar.length > 0) {
    const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);
    if (targetKeyElement) {
      targetKeyElement.classList.add('next-key');
    }
  }
}

/**
 * Menyoroti tombol yang salah ditekan dengan efek flash
 * @param {HTMLElement} keyboardContainer - Container keyboard
 * @param {string} keyChar - Karakter tombol yang salah
 */
export function highlightWrongKeyOnKeyboard(keyboardContainer, keyChar) {
  if (!keyboardContainer || !keyChar) return;

  const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);
  if (targetKeyElement) {
    targetKeyElement.classList.add('wrong-key-flash');
    setTimeout(() => {
      targetKeyElement.classList.remove('wrong-key-flash');
    }, 200);
  }
}

/**
 * Menganimasikan efek jelly pada tombol
 * @param {HTMLElement} keyElement - Elemen tombol yang akan dianimasi
 */
export function animateJellyEffect(keyElement) {
  if (keyElement) {
    keyElement.classList.remove('jelly-effect');
    void keyElement.offsetWidth;
    keyElement.classList.add('jelly-effect');
  }
}


/**
 * Mengupdate UI berdasarkan status visibilitas keyboard
 * @param {Object} options - Opsi tambahan
 * @param {Function} options.hideStats - Fungsi untuk menyembunyikan stats
 * @param {Function} options.showStats - Fungsi untuk menampilkan stats
 * @param {string} options.statsMode - Mode stats saat ini
 */
export function updateKeyboardVisibilityUI(options = {}) {
  console.log('DEBUG: updateKeyboardVisibilityUI called, showKeyboard:', showKeyboard, 'isTestCompleted:', window.isTestCompleted);
  
  // Cek apakah tes sudah selesai - jika ya, sembunyikan keyboard
  if (window.isTestCompleted) {
    console.log('DEBUG: Test completed, forcing keyboard to hide');
  }
  
  const shouldShowKeyboard = showKeyboard && !window.isTestCompleted;
  const keyboardContainer = document.getElementById('virtual-keyboard-container');
  const keyboardToggle = document.getElementById('keyboardToggle');

  if (keyboardContainer) {
    console.log('DEBUG: keyboardContainer classes before update:', keyboardContainer.className);
    if (shouldShowKeyboard) {
      keyboardContainer.classList.remove('hidden');
      keyboardContainer.classList.add('visible');
      keyboardContainer.style.display = '';
    } else {
      keyboardContainer.classList.remove('visible');
      keyboardContainer.classList.add('hidden');
      keyboardContainer.style.display = 'none';
    }
    console.log('DEBUG: keyboardContainer classes after update:', keyboardContainer.className);
  } else {
    console.log('DEBUG: keyboardContainer NOT found in updateKeyboardVisibilityUI');
  }

  if (keyboardToggle) {
    keyboardToggle.checked = shouldShowKeyboard;
  }

  // Update stats visibility berdasarkan state keyboard
  // Gunakan shouldShowKeyboard agar stats muncul saat tes selesai
  updateStatsVisibilityBasedOnKeyboard({
    ...options,
    _forceShowStats: window.isTestCompleted
  });
}



/**
 * Mengupdate visibilitas stats berdasarkan state keyboard
 * @param {Object} options - Opsi tambahan
 * @param {Function} options.hideStats - Fungsi untuk menyembunyikan stats
 * @param {Function} options.showStats - Fungsi untuk menampilkan stats
 * @param {string} options.statsMode - Mode stats saat ini
 */
function updateStatsVisibilityBasedOnKeyboard(options = {}) {
  const { hideStats, showStats, statsMode, _forceShowStats } = options;

  // Jika tes sudah selesai, selalu tampilkan stats
  if (_forceShowStats) {
    if (typeof showStats === 'function') {
      showStats();
    }
    return;
  }

  if (showKeyboard) {

    // Nonaktifkan tampilan statistik ketika keyboard virtual aktif
    if (typeof hideStats === 'function') {
      hideStats();
    }
  } else {
    // Aktifkan kembali tampilan statistik sesuai mode yang dipilih
    const stored = localStorage.getItem('statsMode');
    const modeToUse = statsMode || stored || 'speedometer';

    const textStats = document.querySelector('.text-stats-container');
    const speedContainers = document.querySelectorAll('.speedometer-container');

    if (modeToUse === 'text') {
      if (textStats) textStats.style.display = 'flex';
      speedContainers.forEach((el) => (el.style.display = 'none'));
    } else {
      if (textStats) textStats.style.display = 'none';
      speedContainers.forEach((el) => (el.style.display = 'flex'));
    }

    if (typeof showStats === 'function') {
      showStats();
    }
  }
}

/**
 * Inisialisasi keyboard untuk halaman index
 * @param {Object} options - Opsi inisialisasi
 * @param {Function} options.hideStats - Fungsi untuk menyembunyikan stats
 * @param {Function} options.showStats - Fungsi untuk menampilkan stats
 * @param {string} options.statsMode - Mode stats saat ini
 */
export function initIndexKeyboard(options = {}) {
  // Load keyboard visibility preference
  loadKeyboardVisibility();

  // Create keyboard if container exists
  const keyboardContainer = document.getElementById('virtual-keyboard-container');
  if (keyboardContainer) {
    createKeyboard(keyboardContainer, keyLayout);
    updateKeyboardVisibilityUI(options);
  }

  // Setup event listener untuk keyboard toggle di modal
  const keyboardToggle = document.getElementById('keyboardToggle');
  if (keyboardToggle) {
    keyboardToggle.addEventListener('change', () => {
      // Trigger save settings button to be enabled
      const saveBtn = document.getElementById('saveSettings');
      if (saveBtn) {
        saveBtn.disabled = false;
      }
    });
  }
}

/**
 * Menyimpan pengaturan keyboard dan mengupdate UI
 * @param {boolean} shouldShowKeyboard - Apakah keyboard harus ditampilkan
 * @param {Object} options - Opsi tambahan
 * @param {Function} options.hideStats - Fungsi untuk menyembunyikan stats
 * @param {Function} options.showStats - Fungsi untuk menampilkan stats
 * @param {string} options.statsMode - Mode stats saat ini
 */
export function saveKeyboardSettings(shouldShowKeyboard, options = {}) {
  saveKeyboardVisibility(shouldShowKeyboard);
  updateKeyboardVisibilityUI(options);
}

/**
 * Mengupdate indikator Caps Lock pada keyboard
 * @param {HTMLElement} keyboardContainer - Container keyboard
 * @param {boolean} isCapsLockOn - Status Caps Lock (true = aktif)
 */
export function updateCapsLockIndicator(keyboardContainer, isCapsLockOn) {
  if (!keyboardContainer) return;

  isCapsLockActive = isCapsLockOn;
  const capsLockKey = keyboardContainer.querySelector('[data-key="capslock"]');
  
  if (capsLockKey) {
    if (isCapsLockOn) {
      capsLockKey.classList.add('capslock-active');
    } else {
      capsLockKey.classList.remove('capslock-active');
    }
  }
}

/**
 * Mendapatkan status Caps Lock saat ini
 * @returns {boolean} Status Caps Lock
 */
export function getCapsLockState() {
  return isCapsLockActive;
}
