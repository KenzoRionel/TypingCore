// js/utils/text-display.js

import { getGameDOMReferences } from "./dom-elements.js";
import { gameState } from "../game/game-state.js";

const MAX_OVERTYPED_CHARS_HIGHLIGHT = 5;

/* ==========================================================================
   Smooth Caret
   ==========================================================================
   Kursor "lama" digambar lewat pseudo-element ::after yang ditempel ke
   karakter yang berbeda-beda setiap kali posisi kursor berubah. Karena
   setiap perpindahan = elemen ::after baru, transisinya tidak pernah
   benar-benar "meluncur" antar karakter.

   Untuk membuat perpindahan kursor benar-benar mulus, kita pakai SATU
   elemen <div class="smooth-caret"> yang tetap sama sepanjang waktu; posisi
   (left/top/width/height) elemen ini di-update lewat JS setiap kali kursor
   berpindah, dan CSS transition yang membuatnya "meluncur" ke posisi baru.

   Fitur ini opsional (default nonaktif) dan dikendalikan lewat Modal
   Pengaturan -> setCaretSmoothness().
*/
const CARET_SMOOTH_DURATIONS = {
  off: 0,
  low: 90,
  medium: 160,
  high: 280,
};

let smoothCaretDuration = 0; // 0 = transisi instan (bukan 0-lama: overlay tetap dipakai)
let smoothCaretEl = null;

/* Cache mode highlight (.highlight-text-layer di dalam .smooth-caret).
   Rebuild clone kata (cloneNode + getComputedStyle + innerHTML) di SETIAP
   keystroke terbukti menyebabkan jank - padahal isi/posisi kata tidak
   berubah tiap ketik. Variabel ini membuat clone cuma di-rebuild kalau
   target kata berganti ATAU isi kata (warna correct/wrong) berubah, dan
   metrik font diukur sekali lalu dipakai ulang untuk semua clone. */
let lastHighlightSourceEl = null; // targetEl terakhir yang di-clone
let lastHighlightSnapshot = ""; // innerHTML terakhir yang di-clone
let highlightFontMetrics = null; // metrik font cache (dari getComputedStyle)
let highlightLayerEl = null; // referensi .highlight-text-layer (cache query)

/* ==========================================================================
   Mode Caret Baru
   ==========================================================================
   Daftar mode caret (lama + baru) yang punya "bentuk" sendiri di smooth-caret
   (dipakai untuk toggle class `mode-<nama>` pada elemen tunggal smooth-caret,
   lihat positionSmoothCaret()). "highlight" tidak masuk sini tapi DIPERLAKUKAN
   terpisah (class `mode-highlight` di-toggle manual di positionSmoothCaret()),
   karena geometrinya kotak penuh kata, bukan batang/glow.
*/
const CARET_SHAPE_MODES = [
  "box",
  "outline",
  "bracket",
  "dot",
  "doubleline",
  "laser",
  "typewriter",
  "comet",
  "pen",
  "reactive",
];

/* Mode yang menempatkan kursor SETELAH karakter terakhir yang diketik,
   persis seperti mode "caret" klasik - kebalikannya (default/else) menempatkan
   kursor SEBELUM karakter berikutnya yang akan diketik (seperti "underline"
   / "box"). Dipakai di updateWordHighlighting() untuk menentukan
   cursor-before vs cursor-after untuk mode-mode baru. */
const CARET_AFTER_POSITION_MODES = new Set([
  "caret",
  "laser",
  "comet",
  "reactive",
  "pen",
]);

// Timestamp panggilan positionSmoothCaret() sebelumnya, dipakai mengukur
// interval antar-keystroke -> "speedFactor" (0 = lambat, 1 = cepat) yang
// menggerakkan efek reaktif-kecepatan (glow laser, ekor comet) dan efek
// reaktif-performa (warna mode reactive). Kecepatan dihitung dari JARAK
// piksel antar posisi caret dibagi waktu (velocity = jarak / dt), bukan cuma
// selisih waktu antar-keystroke -- supaya yang terukur adalah gerakan visual
// caret, bukan sekedar ritme ketik.
let lastCaretMoveTs = null;
let lastCaretRect = null; // { left, top } posisi batang caret sebelumnya.

// Ambang velocity (px/ms) yang dianggap "ketik cepat". Dipakai menormalkan
// jarak/dt menjadi speedFactor 0..1: ~1 karakter per 100ms (monospace kira-kira
// 19px per karakter) -> 0.19/0.2 -> ~0.95; ketik lambat ~1 karakter per 200ms
// -> ~0.5.
const CARET_SPEED_VELOCITY_REF = 0.2;

/* Peluruhan (decay) ekor saat idle: berhenti mengetik -> panjang ekor harus
   menyusut mulus ke 0. Di sini dipakai SATU timer pendek + transisi CSS yang
   sudah ada pada --caret-speed (didaftarkan via @property di CSS sehingga bisa
   di-transition), bukan loop requestAnimationFrame yang menurunkan nilai
   bertahap -- hasil visualnya setara (menyusut ~250ms via transition ease-out),
   tapi jauh lebih hemat dan tidak bertabrakan dengan transition property yang
   sama. Timer ini dibatalkan/direset setiap ada keystroke baru dan setiap caret
   disembunyikan, jadi tidak ada timer "nyangkut". */
const CARET_DECAY_IDLE_MS = 200; // jeda tanpa keystroke sebelum decay mulai
let caretDecayTimer = null;

function scheduleCaretDecay() {
  if (caretDecayTimer) {
    clearTimeout(caretDecayTimer);
  }
  caretDecayTimer = setTimeout(() => {
    caretDecayTimer = null;
    if (smoothCaretEl) {
      smoothCaretEl.style.setProperty("--caret-speed", "0");
    }
    cursorMarkedEls.forEach((el) => el.style.setProperty("--caret-speed", "0"));
  }, CARET_DECAY_IDLE_MS);
}

function cancelCaretDecay() {
  if (caretDecayTimer) {
    clearTimeout(caretDecayTimer);
    caretDecayTimer = null;
  }
}

/**
 * Fungsi tunggal penghitung kecepatan caret, dipanggil dari DUA jalur:
 * positionSmoothCaret() (Smooth Caret aktif) DAN jalur fallback non-smooth
 * (updateWordHighlighting()) -- supaya elemen yang "mewarisi" ekor comet
 * (.smooth-caret maupun .has-cursor target) selalu menerima --caret-speed
 * dan data-caret-direction, bukan hanya .smooth-caret.
 * @param {HTMLElement} targetEl elemen yang menerima CSS var & atribut arah
 * @param {{left:number, top:number}} rect posisi batang caret saat ini (px)
 * @returns {number} speedFactor 0..1 (dipakai juga oleh mode reactive)
 */
function updateCaretSpeed(targetEl, rect) {
  const now = performance.now();
  let speedFactor;
  let direction = "forward";
  if (lastCaretRect) {
    const d = Math.hypot(rect.left - lastCaretRect.left, rect.top - lastCaretRect.top);
    const dt = Math.max(1, now - lastCaretMoveTs);
    speedFactor = Math.max(0, Math.min(1, d / dt / CARET_SPEED_VELOCITY_REF));
    // Arah gerak: prioritas selisih baris (top), lalu horizontal (left).
    const dy = rect.top - lastCaretRect.top;
    if (dy > 0.5) direction = "forward";
    else if (dy < -0.5) direction = "backward";
    else direction = rect.left >= lastCaretRect.left ? "forward" : "backward";
  } else {
    // Keystroke pertama / keadaan sudah ter-reset: tanpa data jarak, fallback
    // ritme ketik (persis perilaku lama).
    const dt = lastCaretMoveTs !== null ? now - lastCaretMoveTs : 200;
    speedFactor = Math.max(0, Math.min(1, 1 - dt / 400));
  }
  lastCaretMoveTs = now;
  lastCaretRect = { left: rect.left, top: rect.top };

  if (targetEl) {
    targetEl.style.setProperty("--caret-speed", speedFactor.toFixed(3));
    targetEl.dataset.caretDirection = direction;
  }
  scheduleCaretDecay();
  return speedFactor;
}

/* ==========================================================================
   PERFORMANCE FIX: cache untuk updateWordHighlighting()
   ==========================================================================
   Sebelumnya, SETIAP keystroke melakukan:
   1. querySelectorAll ke SELURUH #textDisplay untuk reset class kursor
   2. Loop dari kata ke-0 sampai kata terakhir yang SUDAH selesai, dan
      innerHTML="" + createElement ULANG untuk setiap kata tsb.

   Kata yang sudah selesai diketik TIDAK PERNAH berubah lagi tampilannya,
   jadi tidak perlu di-rebuild berulang-ulang. Yang perlu dilakukan hanyalah
   me-render kata itu SEKALI saat baru selesai (finalize), lalu tidak
   disentuh lagi. Begitu juga class kursor (has-cursor, cursor-before, dst)
   hanya pernah menempel di kata AKTIF + 1 elemen spasi, jadi cukup lacak
   elemen tsb secara eksplisit alih-alih query seluruh dokumen.

   Ini mengubah kompleksitas per keystroke dari O(jumlah kata yang sudah
   diketik) menjadi O(1), sehingga performa tidak lagi menurun seiring
   makin banyak kata yang sudah diketik.
*/
let lastFinalizedWordIndex = -1; // index kata terakhir yang sudah di-render final
let cursorMarkedEls = []; // elemen yang sedang membawa class terkait kursor/kata-aktif

/* ==========================================================================
   PERFORMANCE FIX: DOM word pruning
   ==========================================================================
   generateAndAppendWords() di game-logic.js terus menambah kata ke
   gameState.fullTextWords tanpa batas selama tes berjalan (array ini baru
   dikosongkan di resetTestState() saat restart). Selama ini appendLines()
   di bawah juga cuma appendChild kata baru ke #textDisplay dan TIDAK PERNAH
   menghapus word-group lama yang sudah selesai diketik dan sudah discroll
   lewat. Untuk pengetik cepat / mode waktu panjang, ini bisa menumpuk
   ribuan elemen (tiap kata = word-group + word-container + N char-span +
   space-char) yang tidak lagi terlihat sama sekali (viewport dikunci 3
   baris via lockTextDisplayHeightTo3Lines), tapi tetap ikut kena layout
   cost browser.

   Solusinya: begitu sebuah BARIS UTUH (semua kata di dalamnya) sudah selesai
   diketik DAN sudah cukup jauh di belakang baris yang sedang berjalan
   (lebih dari LINES_PRUNE_KEEP_BEHIND baris, jauh lebih besar dari jumlah
   baris yang mungkin masih terlihat di 3 baris terkunci), seluruh
   word-group di baris itu langsung dihapus dari DOM sekaligus.

   PENTING - kenapa harus per BARIS UTUH, bukan per jumlah-kata mundur:
   word-group adalah elemen inline-block (white-space: nowrap) yang posisi
   barisnya ditentukan browser lewat wrapping berurutan berdasarkan lebar
   kumulatif kata-kata SEBELUMNYA di baris yang sama. Kalau yang dihapus
   cuma SEBAGIAN kata dari sebuah baris (bukan seluruhnya - ini yang terjadi
   kalau prune dipatok dari jumlah kata mundur, karena jumlah kata per baris
   itu variatif), sisa kata di baris itu ikut re-wrap dan bisa "menarik naik"
   kata-kata dari baris berikutnya ke baris tsb. Efeknya: baris yang sedang
   diketik terlihat "sudah naik" sebelum benar-benar selesai, karena isi
   baris berikutnya memang sudah pindah posisi akibat reflow ini. Dengan
   selalu menghapus SATU BARIS UTUH sekaligus (dipatok dari gameState.lines,
   sumber data yang sama dipakai logika pindah-baris di game-events.js),
   penghapusan hanya mengurangi tinggi total tanpa pernah mengubah
   pengelompokan kata per baris untuk sisa teks yang masih ada.

   PENTING: fungsi lockTextDisplayHeightTo3Lines() & ensureScrollSync() di
   bawah sebelumnya memakai document.getElementById("word-0") sebagai
   patokan tinggi satu baris. Karena word-0 sekarang bisa ikut kepruning,
   referensi itu diganti dengan getReferenceLineHeight() yang di-cache dan
   fallback ke word-container pertama yang MASIH ada di DOM.
*/
const LINES_PRUNE_KEEP_BEHIND = 5; // jauh lebih besar dari jumlah baris yg muat di 3 baris terkunci
let lowestPrunedLineIndex = -1; // index (dalam gameState.lines) baris terpruning terakhir

function pruneOldWordElements(latestFinalizedIndex) {
  if (!gameState.lines || gameState.lines.length === 0) return;

  const pruneLinesUpTo = gameState.currentLineIndex - LINES_PRUNE_KEEP_BEHIND;

  for (let li = lowestPrunedLineIndex + 1; li <= pruneLinesUpTo; li++) {
    const line = gameState.lines[li];
    if (!line || line.length === 0) {
      lowestPrunedLineIndex = li;
      continue;
    }

    // Kalau masih ada kata di baris ini yang belum final diketik, hentikan -
    // jangan sampai baris yang sedang berjalan ikut terpotong sebagian.
    const lastWordIndexInLine = line[line.length - 1].index;
    if (lastWordIndexInLine > latestFinalizedIndex) break;

    line.forEach((w) => {
      const groupEl = document.getElementById(`word-group-${w.index}`);
      if (groupEl && groupEl.parentNode) {
        groupEl.parentNode.removeChild(groupEl);
      }
    });
    lowestPrunedLineIndex = li;
  }
}

let cachedLineHeight = null; // hasil pengukuran tinggi 1 baris, di-cache supaya
                              // tidak bergantung pada elemen kata tertentu yg
                              // bisa hilang karena pruning

// Ukur tinggi satu baris dari word-container PERTAMA YANG MASIH ADA di DOM
// (bukan selalu word-0, karena word-0 bisa sudah kepruning), lalu cache
// hasilnya supaya pemanggilan berikutnya tidak perlu query DOM lagi.
function getReferenceLineHeight(DOM) {
  if (cachedLineHeight !== null) return cachedLineHeight;
  const anyWord = DOM.textDisplay.querySelector(".word-container");
  if (!anyWord) return null;
  const height = anyWord.getBoundingClientRect().height;
  if (height > 0) cachedLineHeight = height;
  return height > 0 ? height : null;
}

// Dipanggil setiap kali teks dirender ulang dari awal (test baru / restart),
// supaya cache tidak "mengingat" state dari test sebelumnya.
export function resetHighlightCache() {
  lastFinalizedWordIndex = -1;
  cursorMarkedEls = [];
  lowestPrunedLineIndex = -1;
  cachedLineHeight = null;
  // Reset metrik kecepatan & decay caret: state dari tes sebelumnya tidak
  // boleh "terbawa" ke tes baru (kalau tidak, keystroke pertama di tes baru
  // akan mengukur jarak palsu dari posisi caret lama).
  cancelCaretDecay();
  lastCaretMoveTs = null;
  lastCaretRect = null;
  // Reset cache mode highlight supaya tidak "nyangkut" ke elemen kata dari
  // tes sebelumnya (elemen kata lama sudah dibuang oleh renderAllLines()).
  lastHighlightSourceEl = null;
  lastHighlightSnapshot = "";
  highlightFontMetrics = null;
  highlightLayerEl = null;
}

/* ==========================================================================
   Caret Overlay
   ==========================================================================
   #textDisplay adalah scroll container ASLI (overflow-y:hidden + JS
   men-drive scrollTop-nya langsung, lihat ensureScrollSync()) dan punya
   mask-image untuk memudarkan baris lama di tepi atas. Karena mask & clip
   itu berlaku untuk SELURUH subtree #textDisplay (termasuk box-shadow glow
   milik .smooth-caret kalau ia jadi child-nya), mode caret yang punya glow
   (laser/lightsaber, comet, dst) selalu ikut terpotong/memudar tajam kalau
   posisinya dekat tepi atas.

   Solusinya: .smooth-caret dipindah ke .caret-overlay - elemen SIBLING dari
   #textDisplay (lihat index.html, di dalam .text-display-container yang
   sama), yang di-stack pas di atasnya lewat position:absolute; inset:0,
   TANPA overflow-hidden dan TANPA mask. Karena bukan lagi descendant
   #textDisplay, .smooth-caret tidak lagi ikut ter-scroll otomatis oleh
   scrollTop #textDisplay - makanya computeSmoothCaretRect() untuk elemen
   ini TIDAK menambahkan kembali scrollTop (beda dengan ghost-caret, yang
   tetap tinggal di dalam #textDisplay dan tetap butuh kompensasi itu).
*/
function getCaretOverlay(textDisplayEl) {
  if (!textDisplayEl) return null;
  const parent = textDisplayEl.parentElement;
  if (!parent) return null;
  let overlay = parent.querySelector(":scope > .caret-overlay");
  if (!overlay) {
    // Fallback kalau markup di index.html belum diupdate - buat sendiri.
    overlay = document.createElement("div");
    overlay.className = "caret-overlay";
    parent.appendChild(overlay);
  }
  // Tandai #textDisplay sebagai container yang sudah memakai overlay caret.
  // Dipakai CSS untuk MENGUBAH pseudo-element `.has-cursor::before/::after`
  // (jalur caret lama yang masih descendant #textDisplay) hanya di halaman
  // game sungguhan - PRATINJAUAN di settings.html punya salinan sendiri tanpa
  // overlay dan masih memakai pseudo element itu (jangan ikut di-sembunyikan).
  textDisplayEl.classList.add("caret-overlay-active");
  return overlay;
}

function getOrCreateSmoothCaret(textDisplayEl) {
  const overlay = getCaretOverlay(textDisplayEl) || textDisplayEl;
  if (smoothCaretEl && smoothCaretEl.parentElement === overlay) {
    return smoothCaretEl;
  }
  // Parent lama sudah tidak valid (mis. overlay baru dibuat ulang). Hapus
  // elemen lama supaya tidak ada .smooth-caret "nyangkut" yang tertinggal.
  if (smoothCaretEl && smoothCaretEl.parentElement) {
    smoothCaretEl.parentElement.removeChild(smoothCaretEl);
  }
  smoothCaretEl = document.createElement("div");
  smoothCaretEl.className = "smooth-caret";
  overlay.appendChild(smoothCaretEl);
  return smoothCaretEl;
}

export function hideSmoothCaret() {
  // Hentikan decay yang mungkin terjadwal supaya tidak ada timer yang terus
  // jalan setelah caret disembunyikan, dan reset --caret-speed agar ekor
  // comet yang tersisa ikut hilang (jangan "nyangkut" di panjang terakhir).
  cancelCaretDecay();
  if (smoothCaretEl) {
    smoothCaretEl.style.setProperty("--caret-speed", "0");
    smoothCaretEl.classList.remove("is-visible");
  }
  cursorMarkedEls.forEach((el) => el.style.setProperty("--caret-speed", "0"));
}
window.hideSmoothCaret = hideSmoothCaret;

/* ==========================================================================
   Ghost Caret (latihan "ulangi sesi sebelumnya")
   ==========================================================================
   Elemen tunggal terpisah dari smooth-caret (kursor milik user sendiri).
   Posisinya dihitung dari inputState keystroke ghost yang sedang "ditunjuk"
   oleh gameState.ghostCurrentIndex (dimajukan oleh timer di game-logic.js
   berdasarkan waktu tes berjalan vs gameState.ghostTimeline). Dipakai
   sebagai bayangan visual: user bisa melihat di mana posisi mengetik dirinya
   pada sesi SEBELUMNYA di waktu yang sama.
*/
let ghostCaretEl = null;

function getOrCreateGhostCaret(container) {
  if (ghostCaretEl && ghostCaretEl.parentElement === container) {
    return ghostCaretEl;
  }
  ghostCaretEl = document.createElement("div");
  ghostCaretEl.className = "ghost-caret";
  container.appendChild(ghostCaretEl);
  return ghostCaretEl;
}

export function hideGhostCaret() {
  if (ghostCaretEl) ghostCaretEl.classList.remove("is-visible");
}
window.hideGhostCaret = hideGhostCaret;

// inputState yang direkam adalah "kata-kata yang sudah selesai (dipisah spasi)
// + kata yang sedang berjalan (kalau ada)". Jumlah spasi = jumlah kata yang
// sudah selesai = index kata yang sedang diketik pada momen itu. Panjang
// segmen terakhir (setelah spasi terakhir) = posisi karakter di kata itu.
function parseGhostPosition(inputState) {
  if (!inputState) return { wordIndex: 0, charIndex: 0 };
  const parts = inputState.split(" ");
  const wordIndex = parts.length - 1;
  const charIndex = parts[parts.length - 1].length;
  return { wordIndex, charIndex };
}

/**
 * Posisikan ghost caret mengikuti gameState.ghostCurrentIndex saat ini.
 * Dipanggil dari updateWordHighlighting() supaya ghost caret selalu
 * ikut ter-reposisi setiap kali tampilan teks berubah (baris baru, resize,
 * scroll sync, dsb) - bukan hanya saat timer ghost berjalan.
 */
export function updateGhostHighlighting() {
  const DOM = getGameDOMReferences();
  if (!DOM || !DOM.textDisplay) return;

  const keystrokes = gameState.ghostData && gameState.ghostData.keystrokes;
  if (!gameState.ghostMode || !Array.isArray(keystrokes) || keystrokes.length === 0) {
    hideGhostCaret();
    return;
  }

  const idx = Math.max(0, Math.min(gameState.ghostCurrentIndex || 0, keystrokes.length - 1));
  const keystroke = keystrokes[idx];
  if (!keystroke) {
    hideGhostCaret();
    return;
  }

  const { wordIndex, charIndex } = parseGhostPosition(keystroke.inputState);
  const wordEl = document.getElementById(`word-${wordIndex}`);
  if (!wordEl) {
    // Kata ghost belum/tidak lagi ada di DOM (mis. sudah kepruning atau
    // belum dirender) - sembunyikan sementara daripada menampilkan posisi salah.
    hideGhostCaret();
    return;
  }

  const chars = wordEl.querySelectorAll("span");
  const spaceEl = document.getElementById(`space-${wordIndex}`);

  let targetEl = null;
  let isBefore = true;

  if (chars.length === 0) {
    targetEl = wordEl;
    isBefore = true;
  } else if (charIndex <= 0) {
    targetEl = chars[0];
    isBefore = true;
  } else if (charIndex < chars.length) {
    targetEl = chars[charIndex - 1];
    isBefore = false;
  } else {
    // Ghost sudah menyelesaikan kata ini pada momen itu - taruh di spasi
    // (persis seperti perilaku smooth caret untuk kata yang baru selesai).
    targetEl = spaceEl || chars[chars.length - 1];
    isBefore = !!spaceEl;
  }

  if (!targetEl) {
    hideGhostCaret();
    return;
  }

  const el = getOrCreateGhostCaret(DOM.textDisplay);
  const rect = computeSmoothCaretRect(DOM.textDisplay, targetEl, isBefore, "caret");
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.classList.add("is-visible");
}
window.updateGhostHighlighting = updateGhostHighlighting;

function computeSmoothCaretRect(referenceEl, targetEl, isBefore, mode, compensateScroll = true) {
  const containerRect = referenceEl.getBoundingClientRect();
  const elRect = targetEl.getBoundingClientRect();
  // compensateScroll=true: referenceEl ADALAH scroll container-nya sendiri
  // (mis. ghost-caret, yang masih jadi child #textDisplay) - posisi harus
  // dihitung dalam koordinat lokal yang tidak terpengaruh scroll, karena
  // scrollTop-nya ditambahkan kembali di sini supaya elemen yang kita
  // posisikan (yang NANTINYA ikut ter-scroll oleh #textDisplay) tetap jatuh
  // di tempat yang benar setelah scroll itu terjadi.
  //
  // compensateScroll=false: referenceEl adalah .caret-overlay, yang TIDAK
  // ikut ter-scroll oleh #textDisplay (ia sibling, bukan descendant).
  // elRect sudah mencerminkan posisi visual TERKINI target (setelah scroll
  // #textDisplay diterapkan), jadi selisih mentah terhadap overlay sudah
  // benar tanpa perlu kompensasi scrollTop apa pun.
  const scrollLeft = compensateScroll ? referenceEl.scrollLeft : 0;
  const scrollTop = compensateScroll ? referenceEl.scrollTop : 0;
  const baseLeft = elRect.left - containerRect.left + scrollLeft;
  const baseTop = elRect.top - containerRect.top + scrollTop;

  // Mode highlight mengelilingi SELURUH kata (bukan satu karakter): geometrinya
  // kotak penuh elemen target (diisi currentWordEl oleh updateWordHighlighting).
  if (mode === "highlight") {
    return { left: baseLeft, top: baseTop, width: elRect.width, height: elRect.height };
  }

  if (mode === "underline") {
    return {
      left: baseLeft,
      top: baseTop + elRect.height - 3,
      width: elRect.width,
      height: 3,
    };
  }

  // Box, Block Outline, Corner Bracket, Double Line: sama-sama mengelilingi
  // seluruh kotak karakter - bedanya cuma gaya visual (diatur lewat CSS
  // lewat class mode-<nama>), bukan geometrinya.
  if (mode === "box" || mode === "outline" || mode === "bracket" || mode === "doubleline") {
    return { left: baseLeft, top: baseTop, width: elRect.width, height: elRect.height };
  }

  // Dot / Circle: buletan kecil di baseline (bawah) karakter, dipusatkan
  // secara horizontal.
  if (mode === "dot") {
    const size = 6;
    return {
      left: baseLeft + elRect.width / 2 - size / 2,
      top: baseTop + elRect.height - size / 2,
      width: size,
      height: size,
    };
  }

  // Typewriter Head: kotak kecil di ATAS karakter (kebalikan underline).
  if (mode === "typewriter") {
    return { left: baseLeft, top: baseTop - 6, width: elRect.width, height: 4 };
  }

  // Mode "caret" dan kerabat garis-tegaknya (laser, comet, reactive, pen):
  // garis tegak tipis, di kiri (before) atau kanan (after) karakter.
  // Catatan: laser mode DULU mengecilkan tinggi jadi 0.8x supaya glow-nya
  // tidak menabrak tepi #textDisplay. Sekarang caret hidup di .caret-overlay
  // yang tidak di-clip/mask sama sekali, jadi tidak perlu dikecilkan lagi -
  // tinggi penuh seperti mode garis-tegak lainnya.
  const barWidth = mode === "laser" ? 3 : 2;
  const left = isBefore ? baseLeft - 1 : baseLeft + elRect.width - 1;
  return { left, top: baseTop, width: barWidth, height: elRect.height };
}

function positionSmoothCaret(targetEl, isBefore, mode) {
  const DOM = getGameDOMReferences();
  if (!DOM || !DOM.textDisplay) return;

  // Overlay caret dipakai SELALU untuk semua mode (kecuali hidden / tanpa
  // target), TERPISAH dari smoothCaretDuration. smoothCaretDuration hanya
  // mengontrol durasi transisi CSS (0ms = lompat instan, > 0 = sliding),
  // BUKAN lagi "apakah pakai overlay". Dulu syarat `smoothCaretDuration <= 0`
  // di sini membuat caret jatuh ke pseudo-element `.has-cursor::after` yang
  // masih jadi descendant #textDisplay -> ikut ke-clip oleh mask. Sekarang
  // overlay selalu aktif, jadi tidak ada lagi jalur caret yang kena mask.
  if (mode === "hidden" || !targetEl) {
    hideSmoothCaret();
    return;
  }

  const el = getOrCreateSmoothCaret(DOM.textDisplay);
  const overlay = getCaretOverlay(DOM.textDisplay);
  const rect = computeSmoothCaretRect(
    overlay || DOM.textDisplay,
    targetEl,
    isBefore,
    mode,
    /* compensateScroll */ !overlay
  );

  // Kalau mode bukan highlight, buang sisa layer teks highlight (jangan sampai
  // teks kata lama ikut tampil di kotak caret mode lain). Cache dulu
  // referensinya, fallback ke query kalau cache null / layer milik el lain.
  if (mode !== "highlight") {
    const staleLayer =
      (highlightLayerEl && highlightLayerEl.parentElement === el
        ? highlightLayerEl
        : null) ||
      el.querySelector(":scope > .highlight-text-layer");
    if (staleLayer) {
      highlightLayerEl = null;
      staleLayer.remove();
      // Layer lama hilang -> paksa rebuild penuh next time mode highlight aktif
      // lagi, walau targetEl/snapshot kebetulan sama seperti sebelum mode diganti
      // (kalau tidak, kotak highlight tampil kosong sampai kata aktif berganti).
      lastHighlightSourceEl = null;
      lastHighlightSnapshot = "";
    }
  }

  // .smooth-caret sekarang tinggal di .caret-overlay, bukan descendant
  // #textDisplay lagi - mirror atribut/class/CSS-var yang dibutuhkan
  // selector & transition-nya supaya tetap berfungsi sama seperti dulu.
  if (overlay) {
    overlay.dataset.cursorMode = mode;
    overlay.classList.toggle(
      "cursor-no-blink",
      DOM.textDisplay.classList.contains("cursor-no-blink")
    );
    // --caret-smooth-duration tidak di-sinkronkan di sini (per-keystroke):
    // nilainya hanya berubah saat setCaretSmoothness() dipanggil, dan fungsi
    // itu sudah menuliskannya langsung ke overlay lewat getCaretOverlay().
    // CSS fallback 0ms menutup kasus overlay yang baru dibuat tanpa durasi.
  }

  CARET_SHAPE_MODES.forEach((m) => el.classList.toggle(`mode-${m}`, mode === m));
  // Mode highlight diperlakukan terpisah dari CARET_SHAPE_MODES (ada class
  // mode-highlight sendiri pada elemen overlay).
  el.classList.toggle("mode-highlight", mode === "highlight");

  // Kotak highlight duduk di .caret-overlay (TANPA mask), sedangkan teks kata
  // asli di #textDisplay masih descendant yang ikut ter-mask di baris teratas.
  // Supaya glyph tidak ikut ke-clip, teks kata dirender ULANG di dalam kotak
  // overlay (clone) dengan metrik & warna yang SAMA - kotak + teks klona ini
  // yang jadi satu-satunya visual kata aktif. Klon hanya di-rebuild saat kata
  // aktif berganti atau isi kata berubah (warna correct/wrong), sehingga
  // warna dan karakter extra selalu sinkron dengan #textDisplay tanpa membawa
  // beban cloneNode/getComputedStyle di setiap keystroke.
  if (mode === "highlight") {
    // Cache referensi layer supaya tidak query DOM tiap keystroke; re-query
    // kalau elemen .smooth-caret (el) bukan lagi parent layer yang di-cache.
    let highlightLayer =
      highlightLayerEl && highlightLayerEl.parentElement === el
        ? highlightLayerEl
        : null;
    if (!highlightLayer) {
      highlightLayer = el.querySelector(":scope > .highlight-text-layer");
      if (!highlightLayer) {
        highlightLayer = document.createElement("span");
        highlightLayer.className = "highlight-text-layer";
        el.appendChild(highlightLayer);
      }
      highlightLayerEl = highlightLayer;
    }

    // Rebuild clone HANYA kalau kata aktif berganti ATAU isi kata (jumlah/
    // warna karakter correct/wrong) berubah - bukan di setiap keystroke.
    // getComputedStyle() (forced reflow) juga cuma diukur sekali, lalu metrik
    // font-nya di-cache untuk semua clone berikutnya. Teks di dalam kotak
    // highlight selalu sinkron dengan #textDisplay selama snapshot cocok.
    const snapshot = targetEl.innerHTML;
    if (targetEl !== lastHighlightSourceEl || snapshot !== lastHighlightSnapshot) {
      if (!highlightFontMetrics) {
        const cs = window.getComputedStyle(targetEl);
        highlightFontMetrics = {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          wordSpacing: cs.wordSpacing,
          whiteSpace: cs.whiteSpace,
          color: cs.color,
        };
      }
      const clone = targetEl.cloneNode(true);
      clone.classList.remove(
        "current-word-target",
        "has-cursor",
        "cursor-before",
        "cursor-after",
        "current-space-target"
      );
      clone.removeAttribute("id");
      clone.style.position = "absolute";
      clone.style.left = "0";
      clone.style.top = "0";
      clone.style.fontFamily = highlightFontMetrics.fontFamily;
      clone.style.fontSize = highlightFontMetrics.fontSize;
      clone.style.lineHeight = highlightFontMetrics.lineHeight;
      clone.style.letterSpacing = highlightFontMetrics.letterSpacing;
      clone.style.wordSpacing = highlightFontMetrics.wordSpacing;
      clone.style.whiteSpace = highlightFontMetrics.whiteSpace;
      clone.style.color = highlightFontMetrics.color;
      highlightLayer.innerHTML = "";
      highlightLayer.appendChild(clone);
      lastHighlightSourceEl = targetEl;
      lastHighlightSnapshot = snapshot;
    }
  }

  // Ukur kecepatan gerak caret (velocity = jarak piksel / waktu) -> speedFactor
  // 0..1 (1 = gerak cepat, 0 = stabil/diam). Dipakai mode Lightsaber (panjang
  // glow), Comet (panjang ekor), dan Reactive Color (ambang hijau/kuning).
  // updateCaretSpeed() juga menyalurkan --caret-speed + data-caret-direction
  // ke elemen (el), dan menjadwalkan decay saat idle.
  const speedFactor = updateCaretSpeed(el, rect);

  if (mode === "reactive") {
    // Hijau = ritme stabil & cepat, Kuning = melambat, Merah = karakter
    // terakhir yang diketik salah (menang atas kecepatan).
    const isWrong = targetEl.classList && targetEl.classList.contains("wrong");
    el.classList.remove("state-good", "state-slow", "state-error");
    if (isWrong) {
      el.classList.add("state-error");
    } else if (speedFactor > 0.5) {
      el.classList.add("state-good");
    } else {
      el.classList.add("state-slow");
    }
  }

  if (mode === "typewriter") {
    // Restart animasi "ketak-ketuk" tiap kursor berpindah (satu keystroke =
    // satu ketukan). Class dilepas lalu dipasang lagi setelah reflow paksa
    // (el.offsetWidth) supaya browser mengulang animasinya dari awal walau
    // class-nya sebenarnya "tetap" terpasang antar-panggilan.
    el.classList.remove("tap");
    void el.offsetWidth;
    el.classList.add("tap");
  }

  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.classList.add("is-visible");
}

/**
 * Mengatur tingkat kehalusan perpindahan caret.
 * @param {"off"|"low"|"medium"|"high"} level
 */
export function setCaretSmoothness(level) {
  const ms = CARET_SMOOTH_DURATIONS.hasOwnProperty(level)
    ? CARET_SMOOTH_DURATIONS[level]
    : 0;
  smoothCaretDuration = ms;

  const DOM = getGameDOMReferences();
  if (!DOM || !DOM.textDisplay) return;

  DOM.textDisplay.classList.toggle("smooth-caret-active", ms > 0);
  DOM.textDisplay.style.setProperty("--caret-smooth-duration", `${ms}ms`);
  // .smooth-caret hidup di .caret-overlay (sibling), jadi tidak mewarisi
  // custom property dari #textDisplay lewat CSS cascade - mirror manual.
  const overlayForDuration = getCaretOverlay(DOM.textDisplay);
  if (overlayForDuration) {
    overlayForDuration.style.setProperty("--caret-smooth-duration", `${ms}ms`);
  }

  // Ms <= 0 TIDAK lagi menyembunyikan caret: overlay tetap dipakai dengan
  // transisi 0ms (instan). Jika tidak, caret akan "klip" lagi lewat jalur
  // .has-cursor::after di dalam #textDisplay yang ter-mask.
  if (ms <= 0) {
    if (typeof window.updateWordHighlighting === "function") {
      window.updateWordHighlighting();
    }
    return;
  }

  // Saat baru diaktifkan / level baru saja diganti, lompat dulu ke posisi
  // yang benar TANPA animasi (biar tidak "meluncur" dari pojok kiri-atas),
  // baru transisi dinyalakan lagi untuk perpindahan berikutnya.
  if (smoothCaretEl) {
    smoothCaretEl.style.transition = "none";
    requestAnimationFrame(() => {
      if (smoothCaretEl) smoothCaretEl.style.transition = "";
    });
  }

  if (typeof window.updateWordHighlighting === "function") {
    window.updateWordHighlighting();
  }
}
window.setCaretSmoothness = setCaretSmoothness;

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
  // Container di-clear total di sini, jadi semua elemen lama (termasuk yang
  // mungkin masih dilacak cache) sudah tidak valid lagi. Reset cache-nya.
  resetHighlightCache();
  DOM.textDisplay.innerHTML = "";

  wordsToRender.forEach((word, i) => {
    DOM.textDisplay.appendChild(createWordGroup(word, startIndex + i));
  });
  updateWordHighlighting();
  ensureScrollSync();
}

// Bungkus word-container + space-char dalam satu unit yang tidak bisa
// terpecah antar baris (white-space: nowrap), supaya jika sebuah kata
// melebar (mis. karena karakter overtyped), yang turun ke baris baru
// adalah kata itu SENDIRI beserta spasinya — bukan spasinya saja.
function createWordGroup(word, index) {
  const wordGroup = document.createElement("span");
  wordGroup.classList.add("word-group");
  wordGroup.id = `word-group-${index}`;
  wordGroup.style.whiteSpace = "nowrap";
  wordGroup.style.display = "inline-block";

  const wordContainer = document.createElement("span");
  wordContainer.classList.add("word-container");
  wordContainer.id = `word-${index}`;

  // Render hanya kata, TANPA spasi
  word.split("").forEach((char) => {
    const charSpan = document.createElement("span");
    charSpan.textContent = char;
    wordContainer.appendChild(charSpan);
  });

  wordGroup.appendChild(wordContainer);

  // Spasi tetap elemen TERPISAH dari word-container (untuk keperluan
  // styling/highlighting yang sudah ada), tapi sekarang berada dalam
  // wordGroup yang sama sehingga selalu ikut turun bersama katanya.
  const spaceSpan = document.createElement("span");
  spaceSpan.textContent = " ";
  spaceSpan.classList.add("space-char");
  spaceSpan.id = `space-${index}`;
  wordGroup.appendChild(spaceSpan);

  return wordGroup;
}

function appendLines(wordsToRender, startIndex) {
  const DOM = getGameDOMReferences();

  wordsToRender.forEach((word, i) => {
    DOM.textDisplay.appendChild(createWordGroup(word, startIndex + i));
  });

  updateWordHighlighting();
  ensureScrollSync();
}

export function lockTextDisplayHeightTo3Lines() {
  const DOM = getGameDOMReferences();
  // Dulu ambil tinggi baris langsung dari document.getElementById("word-0")
  // (O(1), lebih murah dari querySelectorAll ke seluruh dokumen). Tapi
  // sekarang word-group lama bisa dipruning dari DOM (lihat
  // pruneOldWordElements di atas), jadi word-0 tidak dijamin selalu ada
  // begitu tes berjalan cukup lama. getReferenceLineHeight() meng-cache
  // tinggi baris sekali saja dan memakai ulang cache-nya, jadi tetap O(1)
  // amortized tanpa terikat pada elemen kata tertentu.
  const lineHeight = getReferenceLineHeight(DOM);
  if (!lineHeight) return;

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

// Render tampilan FINAL satu kata yang baru saja selesai diketik (benar
// ataupun salah). Dipanggil TEPAT SEKALI per kata lewat lastFinalizedWordIndex
// di updateWordHighlighting, bukan berulang-ulang untuk semua kata lama.
function finalizeCompletedWord(i) {
  const wordEl = document.getElementById(`word-${i}`);
  if (!wordEl) return;

  const isWordCorrect = gameState.typedWordCorrectness[i];
  const targetWord = gameState.fullTextWords[i] || "";
  const typedWord = gameState.userTypedWords[i] || "";

  wordEl.classList.toggle("completed-wrong", isWordCorrect === false);

  wordEl.innerHTML = "";
  for (let j = 0; j < targetWord.length; j++) {
    const charSpan = document.createElement("span");
    charSpan.textContent = targetWord[j];
    if (j < typedWord.length && typedWord[j] === targetWord[j]) {
      charSpan.classList.add("correct");
    } else if (j < typedWord.length) {
      charSpan.classList.add("wrong");
    }
    wordEl.appendChild(charSpan);
  }

  // Karakter extra (kelebihan ketik) jika kata ternyata salah & lebih panjang
  if (typedWord.length > targetWord.length) {
    for (let j = targetWord.length; j < typedWord.length; j++) {
      const extraSpan = document.createElement("span");
      extraSpan.className = "wrong-extra";
      extraSpan.textContent = typedWord[j];
      wordEl.appendChild(extraSpan);
    }
  }
}

export function updateWordHighlighting() {
  const DOM = getGameDOMReferences();
  if (gameState.isTestInvalid) {
    hideSmoothCaret();
    return;
  }

  // 1. Bersihkan class kursor/kata-aktif HANYA dari elemen yang kita tandai
  //    sendiri di panggilan sebelumnya (bukan query ke seluruh DOM).
  cursorMarkedEls.forEach((el) => {
    el.classList.remove(
      "current-word-target",
      "has-cursor",
      "cursor-before",
      "cursor-after",
      "current-space-target"
    );
  });
  cursorMarkedEls = [];

  // 2. Finalisasi HANYA kata yang baru saja selesai sejak panggilan
  //    terakhir (biasanya cuma 1 kata), bukan rebuild ulang semua kata lama.
  while (lastFinalizedWordIndex < gameState.typedWordIndex - 1) {
    lastFinalizedWordIndex++;
    finalizeCompletedWord(lastFinalizedWordIndex);
  }

  // Buang word-group yang sudah selesai & sudah cukup jauh di belakang
  // kursor dari DOM (lihat catatan LINES_PRUNE_KEEP_BEHIND di atas).
  if (lastFinalizedWordIndex >= 0) {
    pruneOldWordElements(lastFinalizedWordIndex);
  }

  const currentWordEl = document.getElementById(`word-${gameState.typedWordIndex}`);
  if (!currentWordEl) {
    hideSmoothCaret();
    return;
  }

  currentWordEl.classList.add("current-word-target");
  cursorMarkedEls.push(currentWordEl);

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

  // Info target kursor saat ini, dipakai untuk menggerakkan smooth caret
  // (elemen tunggal) di akhir blok ini, sejajar dengan logika ::after di atas.
  let smoothCaretTarget = null;
  let smoothCaretBefore = true;

  // PENTING: Check kondisi dalam urutan yang tepat dengan else-if
  if (typedValue.length === 0 && allChars.length > 0) {
    // Belum ada input: kursor di depan karakter pertama
    allChars[0].classList.add("has-cursor", "cursor-before");
    cursorMarkedEls.push(allChars[0]);
    smoothCaretTarget = allChars[0];
    smoothCaretBefore = true;
  } 
  else if (typedValue.length > 0 && typedValue.length < targetWord.length) {
    // Sedang mengetik (belum selesai): kursor di dalam word container
    if (CARET_AFTER_POSITION_MODES.has(mode)) {
      // Mode Caret & kerabatnya: Kursor di SETELAH karakter terakhir yang diketik
      const caretIndex = typedValue.length - 1;
      if (allChars[caretIndex]) {
        allChars[caretIndex].classList.add("has-cursor", "cursor-after");
        cursorMarkedEls.push(allChars[caretIndex]);
        smoothCaretTarget = allChars[caretIndex];
        smoothCaretBefore = false;
      }
    } else {
      // Mode Underline/Box: Kursor di SEBELUM karakter yang akan diketik
      const nextIndex = typedValue.length;
      if (allChars[nextIndex]) {
        allChars[nextIndex].classList.add("has-cursor", "cursor-before");
        cursorMarkedEls.push(allChars[nextIndex]);
        smoothCaretTarget = allChars[nextIndex];
        smoothCaretBefore = true;
      }
    }
  } 
   else if (typedValue.length === targetWord.length && nextSpace) {
     // Kata selesai, kursor pindah ke spasi (elemen terpisah)
     // Tandai juga spasi sebagai target agar mendapat highlight latar belakang
     nextSpace.classList.add("has-cursor", "cursor-before", "current-space-target");
     cursorMarkedEls.push(nextSpace);
     smoothCaretTarget = nextSpace;
     smoothCaretBefore = true;
  } 
  else if (typedValue.length > targetWord.length && allChars.length > 0) {
    // Kelebihan ketik: Kursor di karakter extra terakhir
    const lastExtra = allChars[allChars.length - 1];
    if (lastExtra) {
      if (CARET_AFTER_POSITION_MODES.has(mode)) {
        lastExtra.classList.add("has-cursor", "cursor-after");
        smoothCaretBefore = false;
      } else {
        lastExtra.classList.add("has-cursor", "cursor-before");
        smoothCaretBefore = true;
      }
      cursorMarkedEls.push(lastExtra);
      smoothCaretTarget = lastExtra;
    }
  }

  // Mode highlight mengelilingi SELURUH kata, bukan satu karakter - target
  // untuk overlay highlight harus elemen kata utuh (kotak penuh), diabaikan
  // pola karakter-per-karakter di atas.
  if (mode === "highlight") {
    smoothCaretTarget = currentWordEl;
    smoothCaretBefore = true;
  }

  DOM.textDisplay.dataset.cursorMode = mode;
  // PENTING: settle dulu scroll/tinggi baris SEBELUM menghitung posisi
  // caret. .smooth-caret sekarang di .caret-overlay (unscrolled) dan
  // posisinya dihitung sebagai snapshot getBoundingClientRect() saat ini -
  // kalau dihitung sebelum ensureScrollSync() menggeser scrollTop ke baris
  // baru, caret sempat "ketinggalan" di posisi baris lama selama 1 frame
  // (keliatan sebagai lompat ke baris berikutnya lalu balik). Ghost-caret
  // tidak terpengaruh urutan ini (masih descendant #textDisplay, otomatis
  // ikut scroll berapa pun urutannya).
  lockTextDisplayHeightTo3Lines();
  ensureScrollSync();
  positionSmoothCaret(smoothCaretTarget, smoothCaretBefore, mode);
  updateGhostHighlighting();
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

  // Dapatkan posisi top dari kata saat ini relatif terhadap kontainer.
  // PENTING: #textDisplay diberi `position: relative` di CSS, sehingga ia
  // otomatis menjadi offsetParent untuk semua word-container/word-group di
  // dalamnya (karena elemen-elemen itu tidak punya `position` sendiri).
  // Artinya currentWordEl.offsetTop SUDAH relatif terhadap #textDisplay -
  // TIDAK boleh dikurangi container.offsetTop lagi (itu posisi #textDisplay
  // relatif terhadap offsetParent-nya SENDIRI, angka yang sama sekali tidak
  // relevan di sini). Mengurangkannya menghasilkan offset "liar" yang bukan
  // kelipatan lineHeight, sehingga scrollTop yang dihasilkan tidak pernah
  // pas di batas baris -> baris atas & baris ke-4 sama-sama terlihat terpotong.
  const currentWordTop = currentWordEl.offsetTop;

  // Dapatkan tinggi satu baris sebagai referensi. Dulu selalu dari word-0,
  // tapi word-0 bisa sudah dipruning dari DOM (lihat pruneOldWordElements),
  // jadi pakai cache yang aman terhadap pruning.
  const lineHeight = getReferenceLineHeight(DOM);
  if (!lineHeight) return;

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
    // Resize asli (mis. ukuran font berubah) berarti tinggi baris lama
    // sudah tidak valid lagi, jadi cache-nya perlu di-invalidate supaya
    // getReferenceLineHeight() mengukur ulang dari word-container yang
    // masih ada di DOM.
    cachedLineHeight = null;
    lockTextDisplayHeightTo3Lines();
    ensureScrollSync();
  });
  observer.observe(DOM.textDisplay);

  /* Safety net untuk caret "nyangkut" (mis. saat notice AFK menggantikan
     isi #textDisplay). Dulu ini otomatis beres sendiri karena
     .smooth-caret jadi child #textDisplay - begitu isinya di-innerHTML="",
     caret ikut lenyap. Sekarang .smooth-caret tinggal di .caret-overlay
     (sibling, supaya tidak ikut ke-clip/mask), jadi tidak lagi otomatis
     ikut kehapus. Observer ini menggantikan efek itu secara generik: kapan
     pun children LANGSUNG #textDisplay berubah (word-group ditambah/
     dihapus, ATAU seluruh isinya diganti notice lain) dan sudah tidak ada
     .word-container tersisa sama sekali, sembunyikan kedua caret. Tidak
     perlu mengubah kode AFK di file lain sama sekali - kalau kode itu
     tetap ingin kontrol eksplisit, hideSmoothCaret() sekarang sudah
     ter-export & tersedia lewat window.hideSmoothCaret() juga. */
  const caretVisibilityObserver = new MutationObserver(() => {
    const hasWords = !!DOM.textDisplay.querySelector(".word-container");
    if (!hasWords) {
      hideSmoothCaret();
      hideGhostCaret();
    }
  });
  caretVisibilityObserver.observe(DOM.textDisplay, { childList: true });
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