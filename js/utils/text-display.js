// js/utils/text-display.js

// Perbaikan: Ganti `import { DOM }` menjadi `import { getGameDOMReferences }`
import { getGameDOMReferences } from "./dom-elements.js";
import { gameState } from "../game/game-state.js";

const MAX_OVERTYPED_CHARS_HIGHLIGHT = 5;

export function prepareAndRenderLines() {
  // Perbaikan: Panggil getGameDOMReferences()
  const DOM = getGameDOMReferences();
  if (!DOM.textDisplay || !gameState.fullTextWords.length) return;
  calculateLines();
  renderAllLines();
}

export function renderAllLines() {
  const DOM = getGameDOMReferences();
  DOM.textDisplay.innerHTML = "";

  gameState.fullTextWords.forEach((word, i) => {
    const wordContainer = document.createElement("span");
    wordContainer.classList.add("word-container");
    wordContainer.id = `word-${i}`;

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
  lockTextDisplayHeightTo3Lines();
}

export function lockTextDisplayHeightTo3Lines() {
  const DOM = getGameDOMReferences();
  const words = DOM.textDisplay.querySelectorAll(".word-container");
  if (words.length === 0) return;

  // Kelompokkan kata per baris
  const lineMap = {};
  words.forEach(w => {
    const top = w.offsetTop;
    if (!lineMap[top]) lineMap[top] = [];
    lineMap[top].push(w);
  });

  const lineTops = Object.keys(lineMap).map(Number).sort((a, b) => a - b);

  // Ambil 3 baris pertama
  const firstTop = lineTops[0];
  const thirdTop = lineTops[Math.min(2, lineTops.length - 1)];

  const firstEl = lineMap[firstTop][0];
  const thirdEl = lineMap[thirdTop][0];

  // Hitung tinggi aktual (dari atas baris pertama sampai bawah baris ketiga)
  const height = (thirdEl.offsetTop + thirdEl.offsetHeight) - firstEl.offsetTop;

  // Tambahkan padding container
  const style = getComputedStyle(DOM.textDisplay);
  const paddingTop = parseFloat(style.paddingTop) || 0;
  const paddingBottom = parseFloat(style.paddingBottom) || 0;

  DOM.textDisplay.style.maxHeight = `${height + paddingTop + paddingBottom}px`;
  DOM.textDisplay.style.overflowY = "hidden"; // atau 'auto' kalau mau scroll
}




function calculateLines() {
  const DOM = getGameDOMReferences();
  DOM.textDisplay.innerHTML = "";
  gameState.lines = [];

  // render kata dummy untuk ukur posisi
  const wordElements = gameState.fullTextWords.map((word, index) => {
    const span = document.createElement("span");
    span.classList.add("word-container");
    span.id = `word-measure-${index}`;
    span.textContent = word + " ";
    return span;
  });

  const tempLine = document.createElement("div");
  tempLine.classList.add("text-line");
  wordElements.forEach((el) => tempLine.appendChild(el));
  DOM.textDisplay.appendChild(tempLine);

  // Grouping berdasarkan offsetTop unik
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

  // Urutkan baris sesuai posisi vertical
  const sortedTops = Object.keys(linesMap)
    .map(Number)
    .sort((a, b) => a - b);
  sortedTops.forEach((top) => gameState.lines.push(linesMap[top]));
}

export function updateWordHighlighting() {
  const DOM = getGameDOMReferences();

  // Hapus kursor lama
  const oldCursor = DOM.textDisplay.querySelector(".blinking-cursor");
  if (oldCursor) oldCursor.remove();

  // Reset status kata yang sudah lewat
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

  // Kata aktif
  const currentWordElement = document.getElementById(
    `word-${gameState.typedWordIndex}`
  );
  if (!currentWordElement) return;

  currentWordElement.classList.add("current-word-target");
  currentWordElement.classList.remove("word-correct", "word-incorrect");

  const targetWord = gameState.fullTextWords[gameState.typedWordIndex] || "";
  const typedValue = DOM.hiddenInput.value || "";

  // === Render ulang total: base chars selalu tampil, wrong-extra disisipkan DI DEPAN huruf caret ===
  currentWordElement.innerHTML = "";

  // 1) Buat semua span huruf target (selalu terlihat)
  const baseSpans = [];
  for (let i = 0; i < targetWord.length; i++) {
    const s = document.createElement("span");
    s.textContent = targetWord[i];
    currentWordElement.appendChild(s);
    baseSpans.push(s);
  }

  // 2) Proses input: kursor "nempel" di index i, kalau salah → sisip wrong-extra sebelum baseSpans[i]
  let i = 0; // index huruf target (caret)
  let t = 0; // index huruf yang diketik
  let lastAnchor = null;

  while (t < typedValue.length) {
    const ch = typedValue[t];
    const expected = targetWord[i];

    if (expected !== undefined) {
      if (ch === expected) {
        // match → tandai base benar dan maju caret
        const base = baseSpans[i];
        if (base) {
          base.classList.add("correct");
          base.classList.remove("wrong");
          lastAnchor = base;
        }
        i++;
        t++;
      } else {
        // mismatch → sisip wrong-extra PERSIS sebelum huruf target di posisi caret
        const extra = document.createElement("span");
        extra.className = "wrong-extra";
        extra.textContent = ch;

        const anchorBase = baseSpans[i];
        if (anchorBase) {
          currentWordElement.insertBefore(extra, anchorBase);
        } else {
          // fallback (mustahil kalau expected ada), tapi jaga-jaga
          currentWordElement.appendChild(extra);
        }
        lastAnchor = extra;
        t++; // caret TIDAK maju
      }
    } else {
      // Sudah melewati panjang target → overtype di UJUNG kata
      const extra = document.createElement("span");
      extra.className = "wrong-extra";
      extra.textContent = ch;
      currentWordElement.appendChild(extra);
      lastAnchor = extra;
      t++;
    }
  }

  // 3) Kursor mode caret → taruh setelah node terakhir yang mewakili input terakhir
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

window.updateWordHighlighting = updateWordHighlighting; // Ekspor ke window

export function triggerShakeAnimation() {
  // Perbaikan: Panggil getGameDOMReferences()
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
  const rect = currentWordEl.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  if (rect.bottom > containerRect.bottom || rect.top < containerRect.top) {
    container.scrollTop = currentWordEl.offsetTop - container.clientHeight / 2;
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

