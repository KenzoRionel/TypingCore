// js/utils/text-display.js

import { getGameDOMReferences } from "./dom-elements.js";
import { gameState } from "../game/game-state.js";

const MAX_OVERTYPED_CHARS_HIGHLIGHT = 5;

export function prepareAndRenderText() {
  const DOM = getGameDOMReferences();
  if (!DOM.textDisplay || !gameState.fullTextWords.length) return;

  // Reset state rendering dinamis
  gameState.currentVisibleLines = 0;
  gameState.totalRenderedLines = 0;
  
  renderVisibleLines();
  updateWordHighlighting();
  ensureScrollSync();
  
  // Tambahkan event listener untuk scroll
  addScrollEventListener();
}

export function renderVisibleLines() {
  const DOM = getGameDOMReferences();
  const wordsToRender = gameState.fullTextWords.slice(gameState.totalRenderedLines, gameState.totalRenderedLines + gameState.lineBufferSize);
  
  if (gameState.totalRenderedLines === 0) {
    // Render awal - hapus semua dan render dari awal
    renderAllLines(wordsToRender, gameState.totalRenderedLines);
  } else {
    // Tambahkan kata baru tanpa menghapus yang sudah ada
    appendLines(wordsToRender, gameState.totalRenderedLines);
  }
  
  // Update jumlah baris yang dirender
  gameState.totalRenderedLines += wordsToRender.length;
  
  // Update currentVisibleLines
  gameState.currentVisibleLines = Math.min(gameState.totalRenderedLines, gameState.fullTextWords.length);
}

export function renderAllLines(wordsToRender = gameState.fullTextWords, startIndex = 0) {
  const DOM = getGameDOMReferences();
  DOM.textDisplay.innerHTML = "";

  wordsToRender.forEach((word, i) => {
    const wordContainer = document.createElement("span");
    wordContainer.classList.add("word-container");
    wordContainer.id = `word-${startIndex + i}`;

    word.split("").forEach((char) => {
      const charSpan = document.createElement("span");
      charSpan.textContent = char;
      wordContainer.appendChild(charSpan);
    });

    DOM.textDisplay.appendChild(wordContainer);

    const spaceSpan = document.createElement("span");
    spaceSpan.textContent = " ";
    spaceSpan.classList.add("space-char");
    DOM.textDisplay.appendChild(spaceSpan);
  });
  updateWordHighlighting();
  ensureScrollSync();
}

function appendLines(wordsToRender, startIndex) {
  const DOM = getGameDOMReferences();
  
  wordsToRender.forEach((word, i) => {
    const wordContainer = document.createElement("span");
    wordContainer.classList.add("word-container");
    wordContainer.id = `word-${startIndex + i}`;

    word.split("").forEach((char) => {
      const charSpan = document.createElement("span");
      charSpan.textContent = char;
      wordContainer.appendChild(charSpan);
    });

    DOM.textDisplay.appendChild(wordContainer);

    const spaceSpan = document.createElement("span");
    spaceSpan.textContent = " ";
    spaceSpan.classList.add("space-char");
    DOM.textDisplay.appendChild(spaceSpan);
  });
  
  updateWordHighlighting();
  ensureScrollSync();
}

export function lockTextDisplayHeightTo3Lines() {
  const DOM = getGameDOMReferences();
  const words = DOM.textDisplay.querySelectorAll(".word-container");
  if (words.length === 0) return;

  // Mendapatkan tinggi satu baris dari kata pertama
  const lineHeight = words[0].offsetHeight;
  
  // Menetapkan tinggi maksimum 3 baris secara dinamis
  DOM.textDisplay.style.maxHeight = `${lineHeight * 3}px`;
  // Hapus baris ini karena akan memblokir scroll
  // DOM.textDisplay.style.overflowY = "hidden";
}

function calculateLines() {
  const DOM = getGameDOMReferences();
  
  // Perbaikan: Hindari membersihkan DOM sebelum offsetTop dihitung
  const container = document.createElement("div");
  container.style.visibility = "hidden";
  container.style.position = "absolute";
  container.style.width = DOM.textDisplay.offsetWidth + "px";
  
  gameState.lines = [];

  const wordElements = gameState.fullTextWords.map((word, index) => {
    const span = document.createElement("span");
    span.classList.add("word-container");
    span.id = `word-measure-${index}`;
    span.textContent = word + " ";
    return span;
  });

  wordElements.forEach((el) => container.appendChild(el));
  document.body.appendChild(container);

  let linesMap = {};
  wordElements.forEach((el, idx) => {
    const top = el.offsetTop;
    if (!linesMap[top]) linesMap[top] = [];
    linesMap[top].push({
      word: gameState.fullTextWords[idx],
      index: idx,
      indexInLine: linesMap[top].length,
    });
  });

  const sortedTops = Object.keys(linesMap)
    .map(Number)
    .sort((a, b) => a - b);
  sortedTops.forEach((top) => gameState.lines.push(linesMap[top]));
  
  // Hapus elemen dummy setelah perhitungan selesai
  document.body.removeChild(container);
}

export function updateWordHighlighting() {
  const DOM = getGameDOMReferences();
  const oldCursor = DOM.textDisplay.querySelector(".blinking-cursor");
  if (oldCursor) oldCursor.remove();
  const allWordContainers = DOM.textDisplay.querySelectorAll(".word-container");
  allWordContainers.forEach((wc) => {
    wc.classList.remove("current-word-target");
    const wordIndex = parseInt(wc.id.replace("word-", ""), 10);
    if (wordIndex < gameState.typedWordIndex) {
      wc.classList.toggle(
        "word-correct",
        gameState.typedWordCorrectness[wordIndex]
      );
      wc.classList.toggle(
        "word-incorrect",
        !gameState.typedWordCorrectness[wordIndex]
      );
    } else {
      wc.classList.remove("word-correct", "word-incorrect");
    }
  });
  const currentWordElement = document.getElementById(
    `word-${gameState.typedWordIndex}`
  );
  if (!currentWordElement) return;
  currentWordElement.classList.add("current-word-target");
  currentWordElement.classList.remove("word-correct", "word-incorrect");
  const targetWord = gameState.fullTextWords[gameState.typedWordIndex] || "";
  const typedValue = DOM.hiddenInput.value || "";
  currentWordElement.innerHTML = "";
  const baseSpans = [];
  for (let i = 0; i < targetWord.length; i++) {
    const s = document.createElement("span");
    s.textContent = targetWord[i];
    currentWordElement.appendChild(s);
    baseSpans.push(s);
  }
  let i = 0;
  let t = 0;
  let lastAnchor = null;
  while (t < typedValue.length) {
    const ch = typedValue[t];
    const expected = targetWord[i];
    if (expected !== undefined) {
      if (ch === expected) {
        const base = baseSpans[i];
        if (base) {
          base.classList.add("correct");
          base.classList.remove("wrong");
          lastAnchor = base;
        }
        i++;
        t++;
      } else {
        const extra = document.createElement("span");
        extra.className = "wrong-extra";
        extra.textContent = ch;
        const anchorBase = baseSpans[i];
        if (anchorBase) {
          currentWordElement.insertBefore(extra, anchorBase);
        } else {
          currentWordElement.appendChild(extra);
        }
        lastAnchor = extra;
        t++;
      }
    } else {
      const extra = document.createElement("span");
      extra.className = "wrong-extra";
      extra.textContent = ch;
      currentWordElement.appendChild(extra);
      lastAnchor = extra;
      t++;
    }
  }
  if (gameState.cursorMode === "caret") {
    const cursor = document.createElement("span");
    cursor.classList.add("blinking-cursor");
    let cursorLeft = 0;
    if (lastAnchor) {
      const a = lastAnchor.getBoundingClientRect();
      const ref = currentWordElement.getBoundingClientRect();
      cursorLeft = Math.round(a.right - ref.left);
    }
    cursor.style.left = `${cursorLeft}px`;
    currentWordElement.appendChild(cursor);
  }
  lockTextDisplayHeightTo3Lines();
  ensureScrollSync();
}

window.updateWordHighlighting = updateWordHighlighting;

export function triggerShakeAnimation() {
  const DOM = getGameDOMReferences();
  if (!DOM.textDisplay.classList.contains("error-shake")) {
    DOM.textDisplay.classList.add("error-shake");
    setTimeout(() => {
      DOM.textDisplay.classList.remove("error-shake");
    }, 200);
  }
}

export function ensureScrollSync() {
    const DOM = getGameDOMReferences();
    const currentWordEl = document.getElementById(`word-${gameState.typedWordIndex}`);
    if (!currentWordEl) return;
    const container = DOM.textDisplay;

    // Dapatkan posisi top dari kata saat ini relatif terhadap kontainer
    const currentWordTop = currentWordEl.offsetTop - container.offsetTop;

    // Dapatkan tinggi satu baris dari elemen kata pertama sebagai referensi
    const firstWord = document.getElementById('word-0');
    if (!firstWord) return;
    const lineHeight = firstWord.offsetHeight;

    // Jika kata saat ini berada di baris ke-2 atau lebih
    if (currentWordTop >= lineHeight) {
        // Atur posisi scroll agar baris saat ini menjadi baris pertama yang terlihat
        container.scrollTop = currentWordTop - lineHeight;
    }
}

function getLineTopPositions() {
  const DOM = getGameDOMReferences();
  const words = DOM.textDisplay.querySelectorAll(".word-container");
  if (words.length === 0) return [];
  const tops = [...words].map((w) => w.offsetTop);
  return [...new Set(tops)].sort((a, b) => a - b);
}

function getWordLineIndex(wordElement) {
  const DOM = getGameDOMReferences();
  const words = DOM.textDisplay.querySelectorAll(".word-container");
  const tops = getLineTopPositions();
  const wordTop = wordElement.offsetTop;
  return tops.indexOf(wordTop);
}

export function initTextDisplayResizeObserver() {
  const DOM = getGameDOMReferences();
  if (!DOM.textDisplay) return;
  const observer = new ResizeObserver(() => {
    lockTextDisplayHeightTo3Lines();
    ensureScrollSync();
  });
  observer.observe(DOM.textDisplay);
}

function addScrollEventListener() {
  const DOM = getGameDOMReferences();
  DOM.textDisplay.addEventListener('scroll', () => {
    const scrollPosition = DOM.textDisplay.scrollTop + DOM.textDisplay.clientHeight;
    const threshold = DOM.textDisplay.scrollHeight - 50; // Threshold untuk menambah baris

    if (scrollPosition >= threshold && gameState.totalRenderedLines < gameState.fullTextWords.length) {
      renderVisibleLines();
    }
  });
}
