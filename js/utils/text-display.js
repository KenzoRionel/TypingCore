// js/utils/text-display.js

import { getGameDOMReferences } from "./dom-elements.js";
import { gameState } from "../game/game-state.js";

const MAX_OVERTYPED_CHARS_HIGHLIGHT = 5;

export function prepareAndRenderText() {
  const DOM = getGameDOMReferences();
  if (!DOM.textDisplay || !gameState.fullTextWords.length) return;
  if (gameState.isTestInvalid) return;

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
  if (gameState.isTestInvalid) return;
  const DOM = getGameDOMReferences();
  const wordsToRender = gameState.fullTextWords.slice(
    gameState.totalRenderedLines,
    gameState.totalRenderedLines + gameState.lineBufferSize
  );

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
  gameState.currentVisibleLines = Math.min(
    gameState.totalRenderedLines,
    gameState.fullTextWords.length
  );
}

export function renderAllLines(
  wordsToRender = gameState.fullTextWords,
  startIndex = 0
) {
  const DOM = getGameDOMReferences();
  DOM.textDisplay.innerHTML = "";

  wordsToRender.forEach((word, i) => {
    const wordContainer = document.createElement("span");
    wordContainer.classList.add("word-container");
    wordContainer.id = `word-${startIndex + i}`;

    // Render hanya kata, TANPA spasi
    word.split("").forEach((char) => {
      const charSpan = document.createElement("span");
      charSpan.textContent = char;
      wordContainer.appendChild(charSpan);
    });

    DOM.textDisplay.appendChild(wordContainer);

    // Spasi sebagai elemen TERPISAH (bukan bagian dari word container)
    const spaceSpan = document.createElement("span");
    spaceSpan.textContent = " ";
    spaceSpan.classList.add("space-char");
    spaceSpan.id = `space-${startIndex + i}`;
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

    // Render hanya kata, TANPA spasi
    word.split("").forEach((char) => {
      const charSpan = document.createElement("span");
      charSpan.textContent = char;
      wordContainer.appendChild(charSpan);
    });

    DOM.textDisplay.appendChild(wordContainer);

    // Spasi sebagai elemen TERPISAH (bukan bagian dari word container)
    const spaceSpan = document.createElement("span");
    spaceSpan.textContent = " ";
    spaceSpan.classList.add("space-char");
    spaceSpan.id = `space-${startIndex + i}`;
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
  if (gameState.isTestInvalid) return;

  // 1. Reset & Bersihkan SEMUA Class Kursor, dan terapkan underline untuk kata yang salah
  const allElements = DOM.textDisplay.querySelectorAll(".word-container, .space-char, .word-container span");
  allElements.forEach(el => {
    el.classList.remove("current-word-target", "has-cursor", "cursor-before", "cursor-after", "current-space-target");
  });

  // 2. Update styling untuk kata-kata yang sudah selesai (sebelum kata saat ini)
  for (let i = 0; i < gameState.typedWordIndex; i++) {
    const wordEl = document.getElementById(`word-${i}`);
    if (wordEl) {
      // Periksa apakah kata ini salah
      const isWordCorrect = gameState.typedWordCorrectness[i];
      const targetWord = gameState.fullTextWords[i] || "";
      const typedWord = gameState.userTypedWords[i] || "";
      
      if (isWordCorrect === false) {
        // Tambahkan underline merah untuk kata yang salah
        wordEl.classList.add("completed-wrong");
        
        // Rebuild karakter spans untuk kata yang salah agar warna correct/wrong tetap ditampilkan
        wordEl.innerHTML = "";
        for (let j = 0; j < targetWord.length; j++) {
          const charSpan = document.createElement("span");
          charSpan.textContent = targetWord[j];
          // Tentukan apakah karakter ini benar atau salah
          if (j < typedWord.length) {
            charSpan.classList.add(typedWord[j] === targetWord[j] ? "correct" : "wrong");
          }
          wordEl.appendChild(charSpan);
        }
        
        // Tambahkan karakter extra jika ada
        if (typedWord.length > targetWord.length) {
          for (let j = targetWord.length; j < typedWord.length; j++) {
            const extraSpan = document.createElement("span");
            extraSpan.className = "wrong-extra";
            extraSpan.textContent = typedWord[j];
            wordEl.appendChild(extraSpan);
          }
        }
      } else {
        // Untuk kata yang selesai dan benar, rebuild dengan warna correct
        wordEl.classList.remove("completed-wrong");
        wordEl.innerHTML = "";
        
        for (let j = 0; j < targetWord.length; j++) {
          const charSpan = document.createElement("span");
          charSpan.textContent = targetWord[j];
          if (j < typedWord.length && typedWord[j] === targetWord[j]) {
            charSpan.classList.add("correct");
          }
          wordEl.appendChild(charSpan);
        }
      }
    }
  }

  const currentWordEl = document.getElementById(`word-${gameState.typedWordIndex}`);
  if (!currentWordEl) return;
  
  currentWordEl.classList.add("current-word-target");

  const targetWord = gameState.fullTextWords[gameState.typedWordIndex] || "";
  const typedValue = DOM.hiddenInput.value || "";

  // 3. Rebuild Karakter dalam kata yang sedang aktif
  currentWordEl.innerHTML = "";
  const baseSpans = [];
  for (let i = 0; i < targetWord.length; i++) {
    const s = document.createElement("span");
    s.textContent = targetWord[i];
    currentWordEl.appendChild(s);
    baseSpans.push(s);
  }

  // Warna karakter (Benar/Salah) - dengan tracking error yang berlanjut
  const minLen = Math.min(typedValue.length, targetWord.length);
  let hasErrorBefore = false; // Track jika ada error sebelumnya
  
  for (let i = 0; i < minLen; i++) {
    const isCorrect = typedValue[i] === targetWord[i];
    
    // Jika karakter ini benar tapi ada error sebelumnya, tetap tampilkan merah
    if (isCorrect && hasErrorBefore) {
      baseSpans[i].classList.add("wrong");
    } else if (isCorrect) {
      // Mode hidden: jangan tampilkan warna saat mengetik
      if (gameState.cursorMode !== "hidden") {
        baseSpans[i].classList.add("correct");
      }
    } else {
      // Karakter salah
      baseSpans[i].classList.add("wrong");
      hasErrorBefore = true;
    }
  }

  // Karakter extra (kelebihan ketik)
  if (typedValue.length > targetWord.length) {
    for (let i = targetWord.length; i < typedValue.length; i++) {
      const extra = document.createElement("span");
      extra.className = "wrong-extra";
      extra.textContent = typedValue[i];
      currentWordEl.appendChild(extra);
    }
  }

  // 3. Logika Penempatan Kursor - Termasuk spasi yang terpisah
  const allChars = currentWordEl.querySelectorAll("span");
  const nextSpace = currentWordEl.nextElementSibling; // Spasi yang terpisah
  const mode = gameState.cursorMode || 'caret';

  // PENTING: Check kondisi dalam urutan yang tepat dengan else-if
  if (typedValue.length === 0 && allChars.length > 0) {
    // Belum ada input: kursor di depan karakter pertama
    allChars[0].classList.add("has-cursor", "cursor-before");
  } 
  else if (typedValue.length > 0 && typedValue.length < targetWord.length) {
    // Sedang mengetik (belum selesai): kursor di dalam word container
    if (mode === "caret") {
      // Mode Caret: Kursor di SETELAH karakter terakhir yang diketik
      const caretIndex = typedValue.length - 1;
      if (allChars[caretIndex]) {
        allChars[caretIndex].classList.add("has-cursor", "cursor-after");
      }
    } else {
      // Mode Underline/Box: Kursor di SEBELUM karakter yang akan diketik
      const nextIndex = typedValue.length;
      if (allChars[nextIndex]) {
        allChars[nextIndex].classList.add("has-cursor", "cursor-before");
      }
    }
  } 
   else if (typedValue.length === targetWord.length && nextSpace) {
     // Kata selesai, kursor pindah ke spasi (elemen terpisah)
     // Tandai juga spasi sebagai target agar mendapat highlight latar belakang
     nextSpace.classList.add("has-cursor", "cursor-before", "current-space-target");
  } 
  else if (typedValue.length > targetWord.length && allChars.length > 0) {
    // Kelebihan ketik: Kursor di karakter extra terakhir
    const lastExtra = allChars[allChars.length - 1];
    if (lastExtra) {
      if (mode === "caret") {
        lastExtra.classList.add("has-cursor", "cursor-after");
      } else {
        lastExtra.classList.add("has-cursor", "cursor-before");
      }
    }
  }

  DOM.textDisplay.dataset.cursorMode = mode;
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
  const currentWordEl = document.getElementById(
    `word-${gameState.typedWordIndex}`
  );
  if (!currentWordEl) return;
  const container = DOM.textDisplay;

  // Dapatkan posisi top dari kata saat ini relatif terhadap kontainer
  const currentWordTop = currentWordEl.offsetTop - container.offsetTop;

  // Dapatkan tinggi satu baris dari elemen kata pertama sebagai referensi
  const firstWord = document.getElementById("word-0");
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
  DOM.textDisplay.addEventListener("scroll", () => {
    const scrollPosition =
      DOM.textDisplay.scrollTop + DOM.textDisplay.clientHeight;
    const threshold = DOM.textDisplay.scrollHeight - 50; // Threshold untuk menambah baris

    if (
      scrollPosition >= threshold &&
      gameState.totalRenderedLines < gameState.fullTextWords.length
    ) {
      renderVisibleLines();
    }
  });
}
