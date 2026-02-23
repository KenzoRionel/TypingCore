// js/learn-typing.js

import { initDOMAndState, getHiddenInput } from './learn-typing-state.js';
import { createKeyboard, animateBorder } from './learn-typing-ui.js';
import { renderLesson, setupEventListeners } from './learn-typing-logic.js';
import { keyLayout } from './keyboard-layout.js';

function initApp() {
    const domElements = initDOMAndState();
    createKeyboard(domElements.keyboardContainer, keyLayout);


    // Panggil renderLesson() tanpa parameter, karena semua yang dibutuhkan sudah ada di learn-typing-logic
    renderLesson();
    setupEventListeners();
    const input = getHiddenInput();
    if (input) {
        input.focus();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    window.requestAnimationFrame(animateBorder);
    document.body.addEventListener('click', () => {
        const input = getHiddenInput();
        if (input && document.activeElement !== input) {
            input.focus();
        }
    });
});
