// --- STATE KEYBOARD ---
let currentHighlightedKeyElement = null;
let keyboardContainer = null;
let hiddenInput = null;

// --- KEYBOARD LAYOUT CONFIG ---
const defaultKeyLayout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
    ['ShiftLeft', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'ShiftRight'],
    ['ControlLeft', 'MetaLeft', 'AltLeft', '', 'Space', '', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight']
];

// --- CORE FUNCTIONS ---
export function initKeyboard(containerId = 'virtual-keyboard') {
    // Inisialisasi DOM elements
    keyboardContainer = document.getElementById(containerId);
    initHiddenInput();
    createKeyboard(defaultKeyLayout);
}

function initHiddenInput() {
    hiddenInput = document.getElementById('learnTypingHiddenInput');
    if (!hiddenInput) {
        hiddenInput = document.createElement('input');
        hiddenInput.type = 'text';
        hiddenInput.id = 'learnTypingHiddenInput';
        hiddenInput.style.position = 'absolute';
        hiddenInput.style.opacity = '0';
        hiddenInput.style.pointerEvents = 'none';
        hiddenInput.autocapitalize = 'off';
        hiddenInput.autocomplete = 'off';
        hiddenInput.spellcheck = false;
        document.body.appendChild(hiddenInput);
    }
    hiddenInput.focus();
}

export function createKeyboard(keyLayout) {
    if (!keyboardContainer) return;

    keyboardContainer.innerHTML = '';
    keyLayout.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.classList.add('keyboard-row');
        row.forEach(key => {
            if (key === '') return;
            
            const keyElement = createKeyElement(key);
            rowElement.appendChild(keyElement);
        });
        keyboardContainer.appendChild(rowElement);
    });
}

function createKeyElement(key) {
    const keyElement = document.createElement('div');
    keyElement.classList.add('key');
    
    // Special key handling
    const { displayKey, lowerKey } = getKeyDisplay(key);
    keyElement.textContent = displayKey;
    keyElement.setAttribute('data-key', lowerKey);

    // Size classes
    if (['Backspace', 'CapsLock', 'Enter'].includes(key)) keyElement.classList.add('key-medium');
    if (key === 'Space') keyElement.classList.add('key-space');
    if (['ControlLeft', 'AltLeft', 'MetaLeft', 'ContextMenu'].includes(key)) keyElement.classList.add('key-small');
    if (key === 'ShiftLeft' || key === 'ShiftRight') keyElement.classList.add('key-wide');
    if (key === 'Tab') keyElement.classList.add('key-tab');

    return keyElement;
}

function getKeyDisplay(key) {
    const specialKeys = {
        'ShiftLeft': 'Shift',
        'ShiftRight': 'Shift',
        'ControlLeft': 'Ctrl',
        'ControlRight': 'Ctrl',
        'AltLeft': 'Alt',
        'AltRight': 'Alt',
        'MetaLeft': 'Win',
        'MetaRight': 'Win',
        'ContextMenu': 'Menu',
        'Space': ''
    };
    
    return {
        displayKey: specialKeys[key] || key,
        lowerKey: key === 'Space' ? ' ' : key.toLowerCase()
    };
}

// --- HIGHLIGHT FUNCTIONS ---
export function clearKeyboardHighlights() {
    if (!keyboardContainer) return;
    
    keyboardContainer.querySelectorAll('.key.next-key').forEach(el => {
        el.classList.remove('next-key', 'key-highlight-animation');
    });

    if (currentHighlightedKeyElement) {
        currentHighlightedKeyElement.classList.remove('next-key');
        currentHighlightedKeyElement.style.animation = '';
        currentHighlightedKeyElement = null;
    }
}

export function highlightKey(keyChar) {
    if (!keyboardContainer || !keyChar || keyChar.length === 0) return;

    clearKeyboardHighlights();
    const targetKey = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);
    if (targetKey) {
        targetKey.classList.add('next-key');
        void targetKey.offsetWidth; // Force reflow
        targetKey.style.animation = 'highlight-move 0.6s ease-out infinite';
        currentHighlightedKeyElement = targetKey;
    }
}

// --- FOCUS MANAGEMENT ---
export function focusKeyboard() {
    if (hiddenInput) hiddenInput.focus();
}

export function setupFocusHandlers() {
    window.addEventListener('focus', () => setTimeout(focusKeyboard, 10));
    
    document.addEventListener('mousedown', (e) => {
        const isUIElement = e.target.closest('.navigation-buttons, .modal-overlay');
        if (!isUIElement) setTimeout(focusKeyboard, 0);
    });
}