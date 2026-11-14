/**
 * typing-replay.js
 *
 * Replay latihan mengetik dengan sinkronisasi 100% antara teks dan waktu asli dari timestamp.
 * Prioritas: akurasi timing (tanpa drift), lalu performa untuk data > 15k karakter.
 *
 * API global yang dipertahankan:
 *  - window.initReplayContainer()
 *  - window.loadReplay(scoreId)
 *
 * Catatan:
 *  - Tidak mengubah struktur data score.replayData.keystrokes[]
 *  - Menggunakan requestAnimationFrame + performance.now() untuk menghindari drift dari setTimeout bertumpuk.
 */

/* eslint-disable no-console */

import { ReplayLiveStats } from './replay-live-stats.js';

/**
 * Preferensi tampilan replay. Disimpan di localStorage global (bukan per skor)
 * supaya pilihan yang sama langsung dipakai saat membuka replay berikutnya.
 */
const REPLAY_SETTINGS_KEY = 'replaySettings';
const DEFAULT_REPLAY_SETTINGS = Object.freeze({
  highlight: true, // sorot kata yang sedang diketik
  typingMode: false, // karakter muncul setelah diketik (bukan semua tampil)
  liveStats: true, // grafik + metrik detail selama replay
});

function loadReplaySettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(REPLAY_SETTINGS_KEY) || '{}');
    return {
      highlight: raw.highlight !== false,
      typingMode: raw.typingMode === true,
      // Default aktif untuk pengguna baru; pilihan "mati" yang pernah
      // disimpan tetap dihormati.
      liveStats: raw.liveStats !== false,
    };
  } catch (err) {
    console.warn('Gagal membaca pengaturan replay:', err);
    return { ...DEFAULT_REPLAY_SETTINGS };
  }
}

function saveReplaySettings(settings) {
  try {
    localStorage.setItem(REPLAY_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Gagal menyimpan pengaturan replay:', err);
  }
}

/**
 * Pengaman data rusak (mis. timestamp kacau/overflow), BUKAN pemotong jeda asli.
 *
 * Sebelumnya ada cap 2000ms per jeda antar keystroke. Efeknya replay
 * memampatkan semua jeda > 2 detik, jadi total durasi replay lebih pendek
 * daripada durasi asli dan posisi progress bar/Waktu tidak lagi cocok dengan
 * timestamp asli. Sekarang jeda diputar apa adanya (realtime persis); hanya
 * jeda yang jelas-jelas mustahil (data korup) yang dibatasi.
 */
const MAX_SANE_GAP_MS = 5 * 60 * 1000;

const DEFAULT_PLAYBACK_SPEED = 1; // 1 = realtime

// Kecepatan berbasis multiplier:
// setSpeed(0.5) = 2x lebih lambat, setSpeed(2) = 2x lebih cepat.
// Requirement di task menyebut “0.5 s/d 4”; implementasi ini kompatibel (kamu bisa setSpeed(0.5..4)).
const SPEED_MIN = 0.5;
const SPEED_MAX = 4;

const RENDER_BATCH_LIMIT_WORDS = 64; // batas kata yang boleh di-render per frame untuk mencegah frame drop

// Durasi animasi buka/tutup panel replay di layar hasil tes (ms). Dipakai oleh
// _animateInlineSlot() dan timer sinkronisasi setelah animasi selesai.
const INLINE_SLIDE_DURATION_MS = 480;

/**
 * Satu sumber kebenaran untuk mengubah ikon tombol play/pause.
 * Dipakai baik oleh TypingPlayer (saat play/pause/finish) maupun
 * TypingReplayApp (saat load replay awal), supaya tidak ada dua
 * implementasi terpisah yang berpotensi tidak sinkron.
 * @param {HTMLElement|null} btn
 * @param {boolean} isPlaying
 */
function setPlayButtonIcon(btn, isPlaying) {
  if (!btn) return;
  const icon = btn.querySelector('i');
  if (icon) icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

/**
 * @typedef {Object} Keystroke
 * @property {number} timestamp - timestamp milidetik (ms) dari awal rekaman
 * @property {string} inputState - state input sampai sebelum/ketika timestamp ini tercapai
 * @property {number} wpm
 * @property {number} accuracy
 * @property {number} timeElapsed
 */

/**
 * @typedef {Object} ReplayData
 * @property {Keystroke[]} keystrokes
 * @property {string} targetText
 */

class TypingRecorder {
  /**
   * Normalisasi dan validasi timeline virtual.
   * Kita TIDAK mengubah struktur data keystrokes[], hanya membuat array waktu virtual.
   *
   * @param {Keystroke[]} keystrokes
   * @returns {number[]} timelineMs, timeline[0] = 0
   */
  static computePlaybackTimestamps(keystrokes) {
    if (!Array.isArray(keystrokes) || keystrokes.length === 0) return [];

    // Cari timestamp pertama yang valid
    let firstValidIdx = 0;
    while (firstValidIdx < keystrokes.length) {
      const t = keystrokes[firstValidIdx]?.timestamp;
      if (typeof t === 'number' && Number.isFinite(t)) break;
      firstValidIdx++;
    }
    if (firstValidIdx >= keystrokes.length) return [];

    // timeline virtual = selisih timestamp asli terhadap keystroke pertama.
    // Tidak ada pemampatan: jeda 5 detik tetap 5 detik, sama seperti saat mengetik.
    const timeline = new Array(keystrokes.length).fill(0);
    let prevTs = keystrokes[firstValidIdx].timestamp;
    let acc = 0;

    for (let i = firstValidIdx; i < keystrokes.length; i++) {
      const ts = keystrokes[i]?.timestamp;

      // Timestamp corrupt/blank: diam di waktu terakhir yang valid.
      if (typeof ts !== 'number' || !Number.isFinite(ts)) {
        timeline[i] = acc;
        continue;
      }

      const rawDelay = ts - prevTs;

      // Timestamp tidak monoton (data rusak): jangan pernah mundur waktu.
      // prevTs sengaja tidak diturunkan supaya jeda berikutnya tetap dihitung
      // dari timestamp tertinggi yang pernah dilihat.
      if (rawDelay < 0) {
        timeline[i] = acc;
        continue;
      }

      acc += Math.min(rawDelay, MAX_SANE_GAP_MS);
      timeline[i] = acc;
      prevTs = ts;
    }

    // Indeks sebelum keystroke pertama yang valid tidak pernah dituju player,
    // tapi harus tetap terdefinisi supaya seek/progress tidak menghasilkan NaN.
    for (let i = 0; i < firstValidIdx; i++) timeline[i] = 0;

    timeline[0] = 0;
    return timeline;
  }

  /**
   * Terapkan satu keystroke ke state input (string yang sedang diketik).
   *
   * Dipakai untuk menghitung state AKHIR dari keystroke terakhir, karena
   * `inputState` yang direkam selalu berisi state SEBELUM tombol diproses.
   *
   * @param {string} inputState
   * @param {Keystroke|undefined} keystroke
   * @returns {string}
   */
  static applyKeystrokeToInputState(inputState, keystroke) {
    const base = typeof inputState === 'string' ? inputState : '';
    if (!keystroke) return base;

    if (keystroke.isDeletion) {
      // Backspace tidak bisa melewati batas kata (hidden input hanya berisi
      // kata aktif), jadi kalau kata aktif sudah kosong tidak ada yang dihapus.
      const lastSpace = base.lastIndexOf(' ');
      const currentWordLength = base.length - lastSpace - 1;
      if (currentWordLength <= 0) return base;
      return base.slice(0, -1);
    }

    const ch = typeof keystroke.char === 'string' ? keystroke.char : '';
    if (!ch) return base;

    // Spasi hanya memindahkan kata kalau ada kata yang sedang diketik.
    if (ch === ' ') {
      if (!base || base.endsWith(' ')) return base;
      return `${base} `;
    }

    return base + ch;
  }

  /**
   * State input yang HARUS tampil setelah `typedCount` keystroke diproses.
   *
   * Kenapa tidak langsung `keystrokes[typedCount - 1].inputState`?
   * Karena recorder mengambil snapshot `inputState` di event keydown, yaitu
   * SEBELUM karakter baru masuk ke input. Dengan cara lama, teks replay selalu
   * tertinggal satu karakter dari jumlah keystroke yang sudah diputar (dan
   * karakter terakhir tidak pernah muncul sama sekali).
   *
   * `keystrokes[typedCount].inputState` = state tepat sebelum keystroke
   * berikutnya = state setelah keystroke ke-(typedCount-1). Jadi itulah state
   * yang benar untuk posisi saat ini. Untuk posisi paling akhir (tidak ada
   * keystroke berikutnya) state dihitung dengan menerapkan keystroke terakhir.
   *
   * @param {Keystroke[]} keystrokes
   * @param {number} typedCount
   * @returns {string}
   */
  static resolveInputState(keystrokes, typedCount) {
    if (!Array.isArray(keystrokes) || keystrokes.length === 0) return '';

    const n = keystrokes.length;
    const count = Math.max(0, Math.min(typedCount, n));
    if (count === 0) return '';

    // Data normal: ambil snapshot "sebelum keystroke berikutnya".
    if (count < n) {
      const next = keystrokes[count];
      if (next && typeof next.inputState === 'string') return next.inputState;
    }

    // Fallback (data lama tanpa inputState berikutnya): pakai state terakhir
    // yang tersimpan lalu terapkan keystroke terakhir yang sudah diputar.
    const last = keystrokes[count - 1];
    const base = typeof last?.inputState === 'string' ? last.inputState : '';
    return TypingRecorder.applyKeystrokeToInputState(base, last);
  }

  /**
   * Cari timestamp pertama yang valid untuk perhitungan sisa waktu.
   *
   * @param {Keystroke[]} keystrokes
   * @returns {number}
   */
  static computeFirstTimestamp(keystrokes) {
    if (!Array.isArray(keystrokes) || keystrokes.length === 0) return 0;
    for (const k of keystrokes) {
      const t = k?.timestamp;
      if (typeof t === 'number' && Number.isFinite(t) && t >= 0) return t;
      if (typeof t === 'number' && Number.isFinite(t)) return t;
    }
    return 0;
  }

  /**
   * Normalisasi speed agar selalu dalam rentang.
   * @param {number} speed
   */
  static normalizeSpeed(speed) {
    const v = typeof speed === 'number' && Number.isFinite(speed) ? speed : DEFAULT_PLAYBACK_SPEED;
    return Math.min(SPEED_MAX, Math.max(SPEED_MIN, v));
  }
}

class TypingRenderer {
  /**
   * @param {{
   *  containerEl: HTMLElement,
   *  onActiveWordIndexChange?: (wordIdx:number)=>void
   * }} params
   */
  constructor({ containerEl, onActiveWordIndexChange }) {
    this.containerEl = containerEl;
    this.onActiveWordIndexChange = onActiveWordIndexChange;

    this.cache = {
      targetText: '',
      targetWords: [],
      wordElements: [],
      wordCharSpans: [], // cache referensi <span> per karakter tiap kata (hindari querySelectorAll per frame)
      wordSpaceSpans: [], // cache referensi <span> spasi setelah tiap kata
      wordTops: [],
      lineHeight: 0,
      lineGlyphHeight: 0,
      lastRenderedWordIdx: -1,
      lastScrolledWordIdx: -1,
      containerBuilt: false,
      // followMode: true = auto-scroll mengikuti kata aktif (perilaku default).
      // Dimatikan otomatis begitu user melakukan scroll manual, supaya scroll
      // tidak "lengket" dan menimpa scroll user saat replay sedang jalan.
      followMode: true,
    };

    // Flag internal untuk membedakan scroll yang kita set sendiri (programmatic)
    // vs scroll yang dilakukan user (wheel/touch/drag scrollbar).
    // Diisi nilai scrollTop hasil auto-scroll kita; scroll event yang posisinya
    // sama dengan nilai ini diabaikan.
    this._programmaticScrollTop = null;

    this._attachManualScrollDetection();
  }

  clear() {
    this.containerEl.innerHTML = '';
    this.cache = {
      targetText: '',
      targetWords: [],
      wordElements: [],
      wordCharSpans: [],
      wordSpaceSpans: [],
      wordTops: [],
      lineHeight: 0,
      lineGlyphHeight: 0,
      lastRenderedWordIdx: -1,
      lastScrolledWordIdx: -1,
      containerBuilt: false,
      followMode: true,
    };
  }

  /**
   * Deteksi scroll manual dari user (wheel, touch drag, drag scrollbar, keyboard).
   * Begitu posisi scroll berubah bukan karena auto-scroll kita, followMode
   * dimatikan supaya auto-scroll tidak menimpa posisi yang sedang dibaca user.
   * followMode dinyalakan lagi otomatis kalau user scroll balik ke dekat
   * baris yang sedang aktif diketik.
   *
   * Catatan: listener wheel/touchmove tidak dipakai lagi. Dulu setiap wheel di
   * atas area replay langsung mematikan followMode -- bahkan saat area itu tidak
   * ikut ter-scroll (mis. halaman yang di-scroll) -- sehingga auto-scroll bisa
   * mati tanpa user benar-benar menggeser teks replay.
   */
  _attachManualScrollDetection() {
    const el = this.containerEl;
    if (!el) return;

    // Bisa dipanggil ulang kalau TypingRenderer dibuat lagi untuk elemen yang
    // sama (mis. initReplayContainer() kedua kali). Handler lama dilepas dulu
    // supaya tidak ada dua renderer yang mendengarkan elemen yang sama.
    if (el._replayScrollHandler) {
      el.removeEventListener('scroll', el._replayScrollHandler);
    }

    el._replayScrollHandler = () => {
      // Abaikan scroll yang berasal dari auto-scroll kita sendiri.
      if (this._programmaticScrollTop !== null &&
          Math.abs(el.scrollTop - this._programmaticScrollTop) < 2) {
        return;
      }

      // Scroll yang bukan dari auto-scroll kita = user.
      this.cache.followMode = false;
      this._maybeResumeFollow();
    };

    el.addEventListener('scroll', el._replayScrollHandler, { passive: true });
  }

  /**
   * Jika user scroll balik sehingga baris aktif kembali terlihat di viewport,
   * nyalakan lagi followMode supaya auto-scroll lanjut mengikuti seperti biasa.
   */
  _maybeResumeFollow() {
    const idx = this.cache.lastScrolledWordIdx;
    if (idx == null || idx < 0) return;

    const wordTop = this.cache.wordTops[idx];
    const lineHeight = this.cache.lineHeight;
    if (wordTop === undefined || !lineHeight) return;

    const container = this.containerEl;
    const topWithinView = wordTop - container.scrollTop;
    const viewportHeight = container.clientHeight || lineHeight * 3;

    if (topWithinView >= -2 && topWithinView <= viewportHeight - lineHeight) {
      this.cache.followMode = true;
    }
  }

  /**
   * Build DOM awal untuk targetText.
   * @param {string} targetText
   */
  build(targetText) {
    const safeText = typeof targetText === 'string' ? targetText : '';
    if (this.cache.containerBuilt && this.cache.targetText === safeText) {
      // DOM (kata per kata) sama persis dengan sebelumnya, jadi tidak perlu
      // dibangun ulang. TAPI replay ini dianggap "baru dimulai", jadi state
      // visual dari playback sebelumnya (warna correct/wrong, cursor, scroll)
      // wajib direset -- kalau tidak, sisa tampilan playback lama masih akan
      // menempel/terlihat scroll di bawah saat replay yang baru ini dimulai.
      this._resetAllWordsToUntyped();
      this.cache.lastRenderedWordIdx = -1;
      this.cache.lastScrolledWordIdx = -1;
      this.cache.followMode = true;
      this._setScrollTop(0);
      return;
    }

    this.clear();
    this.cache.targetText = safeText;
    this.cache.targetWords = safeText.length ? safeText.split(' ') : [''];

    const targetWords = this.cache.targetWords;

    const wrapper = document.createElement('div');
    wrapper.className = 'replay-words-container';

    // Build dengan DocumentFragment agar minim reflow
    const frag = document.createDocumentFragment();

    targetWords.forEach((targetWord, wordIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'replay-word';
      wordSpan.id = `replay-word-${wordIdx}`;

      const charSpansForWord = new Array(targetWord.length);
      for (let i = 0; i < targetWord.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'replay-char untyped';
        charSpan.textContent = targetWord[i];
        wordSpan.appendChild(charSpan);
        charSpansForWord[i] = charSpan;
      }

      frag.appendChild(wordSpan);
      this.cache.wordElements[wordIdx] = wordSpan;
      // Simpan referensi langsung supaya render() tidak perlu querySelectorAll per frame.
      this.cache.wordCharSpans[wordIdx] = charSpansForWord;

      if (wordIdx < targetWords.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.className = 'replay-char space-char untyped';
        spaceSpan.textContent = ' ';
        frag.appendChild(spaceSpan);
        this.cache.wordSpaceSpans[wordIdx] = spaceSpan;
      } else {
        this.cache.wordSpaceSpans[wordIdx] = null;
      }
    });

    wrapper.appendChild(frag);
    this.containerEl.appendChild(wrapper);

    this.cache.containerBuilt = true;
    this.cache.lastRenderedWordIdx = -1;
    this.cache.lastScrolledWordIdx = -1;
    this.cache.followMode = true; // replay baru -> auto-scroll aktif lagi dari awal

    // Cache posisi (1x forced reflow)
    this.recomputeWordPositionCache();
    this._setScrollTop(0);
  }

  /**
   * Kembalikan SEMUA kata ke state untyped (dipakai saat replay "dimulai ulang"
   * tapi DOM lama dipakai lagi karena teksnya identik).
   */
  _resetAllWordsToUntyped() {
    const wordElements = this.cache.wordElements;
    if (!wordElements?.length) return;
    this._resetWordsRange(0, wordElements.length - 1);
  }

  /**
   * Kembalikan kata-kata pada rentang [fromIdx, toIdx] ke state untyped.
   * Dipakai ketika seek/reset MUNDUR: kata-kata yang sebelumnya sudah
   * diwarnai (correct/wrong) saat playback maju perlu "dihapus" warnanya,
   * karena posisi baru berada sebelum kata-kata tersebut.
   */
  _resetWordsRange(fromIdx, toIdx) {
    const wordElements = this.cache.wordElements;
    if (!wordElements?.length) return;

    const start = Math.max(0, fromIdx);
    const end = Math.min(wordElements.length - 1, toIdx);

    for (let wordIdx = start; wordIdx <= end; wordIdx++) {
      const wordEl = wordElements[wordIdx];
      if (!wordEl) continue;

      wordEl.classList.remove('active-word');

      // wrong-extra adalah span dinamis (kelebihan ketik) yang tidak di-cache
      // karena jumlahnya tidak tetap, jadi tetap perlu di-query saat dihapus.
      const wrongExtras = wordEl.querySelectorAll('.wrong-extra');
      for (const el of wrongExtras) el.remove();

      const charSpans = this.cache.wordCharSpans[wordIdx];
      const targetWord = this.cache.targetWords?.[wordIdx] ?? '';
      if (charSpans) {
        for (let i = 0; i < charSpans.length; i++) {
          const charSpan = charSpans[i];
          charSpan.className = 'replay-char untyped';
          // Kembalikan glyph ke huruf target: saat playback maju, posisi yang
          // salah menampilkan huruf yang diketik, jadi harus dipulihkan.
          charSpan.textContent = targetWord[i] ?? '';
          charSpan.removeAttribute('title');
        }
      }

      const spaceSpan = this.cache.wordSpaceSpans[wordIdx];
      if (spaceSpan) spaceSpan.className = 'replay-char space-char untyped';
    }
  }

  recomputeWordPositionCache() {
    const wordElements = this.cache.wordElements;
    if (!wordElements.length) return;

    const container = this.containerEl;
    if (!container) return;

    const firstEl = wordElements[0];
    // line-height dari computed style adalah tinggi baris sebenarnya
    // (mis. 1.2 x 24px = 28.8px). Sebelumnya dipakai offsetHeight span inline,
    // yang hanya setinggi kotak font -- lebih kecil dari jarak antar-baris,
    // sehingga posisi auto-scroll lama-kelamaan meleset dan memotong baris
    // paling atas.
    const computed = firstEl ? window.getComputedStyle(firstEl) : null;
    const computedLineHeight = computed ? parseFloat(computed.lineHeight) : 0;
    const lineHeight =
      Number.isFinite(computedLineHeight) && computedLineHeight > 0
        ? computedLineHeight
        : firstEl
          ? firstEl.offsetHeight || 24
          : 24;
    this.cache.lineHeight = lineHeight;
    // Tinggi kotak glyph (bukan line box). Dipakai untuk menentukan posisi
    // scroll paling atas yang masih menampilkan satu baris penuh tanpa
    // memperlihatkan potongan baris di atasnya.
    this.cache.lineGlyphHeight = firstEl
      ? firstEl.getBoundingClientRect().height || lineHeight
      : lineHeight;

    // Tinggi kotak HARUS kelipatan line-height. Sebelumnya tinggi dibatasi
    // `max-height: 150px`, sedangkan satu baris tingginya 28.8px
    // (150 / 28.8 = 5.2 baris). Akibatnya tepi bawah selalu memotong baris
    // keenam di tengah glyph, jadi baris yang sedang di-scroll terlihat
    // terpotong oleh batas kotak. Dengan tinggi = jumlah baris utuh, tepi
    // atas dan bawah selalu jatuh tepat di antara dua baris.
    const computedMaxHeight = computed ? parseFloat(computed.maxHeight) : 0;
    const maxBoxHeight =
      Number.isFinite(computedMaxHeight) && computedMaxHeight > 0
        ? computedMaxHeight
        : lineHeight * 5;

    container.style.height = '';
    container.style.paddingBottom = '';

    // scrollHeight dibaca SEBELUM tinggi kotak dipangkas supaya jumlah baris
    // yang dibutuhkan teks bisa dihitung dari isi aslinya. min-height CSS
    // dinolkan sementara agar teks pendek tidak dihitung lebih tinggi dari
    // isinya (min-height tetap berlaku saat kotak dirender).
    container.style.minHeight = '0px';
    const contentHeight = container.scrollHeight;
    container.style.minHeight = '';
    const maxLines = Math.max(1, Math.floor(maxBoxHeight / lineHeight));
    const visibleLines = Math.max(
      1,
      Math.min(maxLines, Math.ceil(contentHeight / lineHeight))
    );
    const boxHeight = visibleLines * lineHeight;
    container.style.height = `${boxHeight}px`;

    // Ruang kosong di bawah teks, hanya kalau teksnya memang lebih tinggi
    // dari viewport. Tanpa ini baris-baris terakhir tidak bisa lagi
    // diposisikan dengan satu baris konteks di atasnya (auto-scroll mentok
    // di dasar), sehingga baris paling atas terlihat terpotong.
    const overflows = contentHeight > boxHeight + 1;
    if (overflows) {
      const spacer = Math.max(0, Math.ceil(boxHeight - lineHeight * 2));
      if (spacer > 0) container.style.paddingBottom = `${spacer}px`;
    }

    // PENTING: offsetTop diukur terhadap offsetParent, dan offsetParent dari
    // span kata di sini adalah <body> (bukan kotak replay), sehingga nilainya
    // berisi jarak kotak replay dari atas halaman. Dulu nilai itu dipakai
    // langsung sebagai posisi di dalam kotak scroll -> auto-scroll selalu
    // salah dan kata aktif tidak pernah benar-benar masuk viewport.
    // Sekarang posisi dihitung relatif terhadap kotak scroll itu sendiri.
    const containerRect = container.getBoundingClientRect();
    const contentTop = containerRect.top + container.clientTop;
    const scrollTop = container.scrollTop;

    this.cache.wordTops = new Array(wordElements.length).fill(0);
    for (let i = 0; i < wordElements.length; i++) {
      const el = wordElements[i];
      if (!el) continue;
      this.cache.wordTops[i] = el.getBoundingClientRect().top - contentTop + scrollTop;
    }
  }

  /**
   * Update status berdasarkan currentIndex dan virtualTime.
   *
   * @param {{
   *  keystrokes: Keystroke[],
   *  currentIndex: number,
   *  targetText: string,
   *  currentVirtualTimeMs: number,
   *  firstTimestampMs: number,
   *  totalDurationSec: number
   * }} params
   */
  render(params) {
    const { keystrokes, currentIndex, targetText } = params;
    if (!this.containerEl) return;
    if (!Array.isArray(keystrokes)) return;

    const targetWords = this.cache.targetWords;
    if (!targetWords?.length) return;

    const safeIndex = Math.max(0, Math.min(currentIndex, keystrokes.length));
    // State input setelah `safeIndex` keystroke diproses (bukan state sebelum
    // keystroke terakhir -- lihat catatan resolveInputState soal snapshot
    // keydown yang membuat replay tertinggal satu karakter).
    const currentInput = TypingRecorder.resolveInputState(keystrokes, safeIndex);

    const currentWords = currentInput.length ? currentInput.split(' ') : [''];
    const currentWordIdx = Math.max(0, currentWords.length - 1);

    // Jika posisi baru MUNDUR dari posisi terakhir yang pernah dirender
    // (terjadi saat drag progress bar ke belakang, atau reset ke awal),
    // kata-kata di depan posisi baru masih membawa warna correct/wrong dari
    // playback sebelumnya. Bersihkan dulu supaya tidak "menempel".
    if (this.cache.lastRenderedWordIdx > currentWordIdx) {
      this._resetWordsRange(currentWordIdx + 1, this.cache.lastRenderedWordIdx);
    }

    // Tentukan range kata yang perlu di-update.
    // Supaya catch-up tidak menimbulkan beban tak terkendali.
    const startIndex =
      this.cache.lastRenderedWordIdx === -1
        ? Math.max(0, currentWordIdx - 1)
        : Math.max(0, Math.min(this.cache.lastRenderedWordIdx, currentWordIdx - 1));

    const endIndex = Math.min(targetWords.length - 1, currentWordIdx);

    let renderedWords = 0;
    // Menandai sejauh mana kata BENAR-BENAR selesai diproses pada pemanggilan ini.
    // PENTING: sebelumnya lastRenderedWordIdx selalu di-set ke currentWordIdx tanpa
    // syarat, walau loop berhenti lebih awal karena RENDER_BATCH_LIMIT_WORDS tercapai.
    // Itu membuat kata-kata di antara titik berhenti dan currentWordIdx dianggap
    // "sudah dirender" padahal DOM-nya masih untyped, dan tidak akan pernah
    // diperbaiki lagi (kecuali ada seek mundur). Sekarang kita hanya menandai
    // sejauh mana benar-benar diproses, lalu menjadwalkan lanjutan bila belum selesai.
    let lastProcessedIdx = startIndex - 1;

    for (let wordIdx = startIndex; wordIdx <= endIndex; wordIdx++) {
      if (renderedWords >= RENDER_BATCH_LIMIT_WORDS) break;

      const wordEl = this.cache.wordElements[wordIdx];
      if (!wordEl) {
        lastProcessedIdx = wordIdx;
        continue;
      }

      const targetWord = targetWords[wordIdx] ?? '';
      const typedWord = currentWords[wordIdx] ?? '';
      const isCurrentWord = wordIdx === currentWordIdx;

      wordEl.classList.toggle('active-word', isCurrentWord);

      // wrong-extra adalah span dinamis (kelebihan ketik), tidak di-cache karena
      // jumlahnya tidak tetap. Query ini hanya kena pada kata yang benar-benar berubah.
      const wrongExtras = wordEl.querySelectorAll('.wrong-extra');
      for (const el of wrongExtras) el.remove();

      // Pakai referensi char-span yang sudah di-cache saat build(), bukan
      // querySelectorAll ulang tiap frame -- lebih ringan untuk teks panjang (>15k karakter).
      const charSpans = this.cache.wordCharSpans[wordIdx];

      if (charSpans) {
        for (let i = 0; i < targetWord.length; i++) {
          const charSpan = charSpans[i];
          if (!charSpan) continue;
          if (i < typedWord.length) {
            const isCorrect = typedWord[i] === targetWord[i];
            charSpan.className = `replay-char ${isCorrect ? 'correct' : 'wrong'}`;
            // Tampilkan huruf yang BENAR-BENAR diketik pada posisi salah.
            // Sebelumnya span selalu berisi huruf target, sehingga replay bisa
            // memperlihatkan huruf kapital yang tidak pernah user ketik.
            charSpan.textContent = isCorrect ? targetWord[i] : typedWord[i];
            if (isCorrect) {
              charSpan.removeAttribute('title');
            } else {
              charSpan.title = `Kamu mengetik "${typedWord[i]}", seharusnya "${targetWord[i]}"`;
            }
          } else {
            charSpan.className = 'replay-char untyped';
            charSpan.textContent = targetWord[i];
            charSpan.removeAttribute('title');
          }

          charSpan.classList.toggle('cursor', isCurrentWord && i === typedWord.length);
        }
      }

      if (typedWord.length > targetWord.length) {
        // Extra chars (kelebihan ketik)
        for (let i = targetWord.length; i < typedWord.length; i++) {
          const extraSpan = document.createElement('span');
          extraSpan.className = 'replay-char wrong wrong-extra';
          extraSpan.textContent = typedWord[i];
          if (isCurrentWord && i === typedWord.length - 1) extraSpan.classList.add('cursor');
          wordEl.appendChild(extraSpan);
        }
      }

      // Spasi setelah kata: pakai referensi yang sudah di-cache.
      const spaceSpan = this.cache.wordSpaceSpans[wordIdx];
      if (spaceSpan) {
        const isPassed = wordIdx < currentWordIdx;
        spaceSpan.className = `replay-char space-char ${isPassed ? 'correct' : 'untyped'}`;
      }

      // Auto-scroll (tanpa DOM read)
      if (isCurrentWord && this.cache.lastScrolledWordIdx !== wordIdx) {
        this.ensureScrollSync(wordIdx);
        this.cache.lastScrolledWordIdx = wordIdx;
        this.onActiveWordIndexChange?.(wordIdx);
      }

      renderedWords++;
      lastProcessedIdx = wordIdx;
    }

    this.cache.lastRenderedWordIdx = lastProcessedIdx;

    // Kalau masih ada sisa kata yang belum sempat diproses karena limit batch,
    // lanjutkan secepatnya di frame berikutnya alih-alih menunggu keystroke berikutnya
    // (yang bisa saja tidak datang lagi kalau ini adalah kata terakhir dari sebuah seek besar).
    if (lastProcessedIdx < endIndex) {
      requestAnimationFrame(() => this.render(params));
    }
  }

  /**
   * Set scrollTop sambil mencatat nilainya sebagai scroll "programmatic",
   * supaya listener scroll tahu ini bukan scroll manual user.
   * Nilai dibaca ulang setelah assignment karena browser bisa meng-clamp.
   */
  _setScrollTop(value) {
    const container = this.containerEl;
    if (!container) return;
    container.scrollTop = value;
    this._programmaticScrollTop = container.scrollTop;
  }

  ensureScrollSync(wordIdx) {
    const container = this.containerEl;
    if (!container) return;

    // Jika user sedang scroll manual (followMode dimatikan), jangan paksa
    // scroll kembali ke kata aktif -- biarkan user bebas membaca teks lain.
    if (!this.cache.followMode) return;

    const wordTop = this.cache.wordTops[wordIdx];
    const lineHeight = this.cache.lineHeight;

    if (wordTop === undefined || !lineHeight) return;

    // Posisi paling atas yang masih menampilkan satu baris penuh: glyph baris
    // konteks diletakkan tepat di bawah tepi, sehingga tidak ada potongan
    // baris sebelumnya yang ikut terlihat di tepi atas.
    const lineGlyphHeight = this.cache.lineGlyphHeight || lineHeight;
    const topInset = Math.max(0, Math.min(4, lineHeight - lineGlyphHeight));

    // Indeks baris kata aktif relatif terhadap viewport (0 = baris teratas).
    // Posisi tujuan dihitung absolut dari wordTop (bukan menambah langkah),
    // jadi pembulatan subpiksel tidak menumpuk jadi drift.
    const lineIndex = Math.round((wordTop - container.scrollTop - topInset) / lineHeight);

    let newScrollTop = null;
    if (lineIndex >= 2) {
      // Kata aktif sudah turun ke baris ketiga -> posisikan tepat satu baris
      // konteks di atasnya, plus inset supaya glyph baris konteks tidak
      // terpotong tepi atas kotak scroll.
      newScrollTop = wordTop - lineHeight - topInset;
    } else if (lineIndex < 0) {
      // Kata aktif berada di atas viewport (mis. setelah seek/restart).
      newScrollTop = Math.max(0, wordTop - topInset);
    }

    if (newScrollTop !== null) {
      this._setScrollTop(newScrollTop);
    }
  }
}

class TypingPlayer {
  /**
   * @param {{
   *  renderer: TypingRenderer,
   *  getKeystrokes: ()=>Keystroke[],
   *  getTargetText: ()=>string,
   *  getTotalDurationSec: ()=>number,
   *  getFirstTimestampMs: ()=>number,
   *  callbacks?: {
   *    onUpdate?: (currentTimeMs:number)=>void,
   *    onFinish?: ()=>void
   *  },
   *  ui?: {
   *    wpmEl?: HTMLElement,
   *    accEl?: HTMLElement,
   *    timeEl?: HTMLElement,
   *    playButton?: HTMLButtonElement
   *  }
   * }} params
   */
  constructor({ renderer, getKeystrokes, getTargetText, getTotalDurationSec, getFirstTimestampMs, callbacks, ui }) {
    this.renderer = renderer;
    this.getKeystrokes = getKeystrokes;
    this.getTargetText = getTargetText;
    this.getTotalDurationSec = getTotalDurationSec;
    this.getFirstTimestampMs = getFirstTimestampMs;
    this.callbacks = callbacks || {};
    this.ui = ui || {};

    this.resetInternal();

    this._onVisibilityChange = this._handleVisibilityChange.bind(this);
    document.addEventListener('visibilitychange', this._onVisibilityChange);
  }

  // Tidak dipanggil di mana pun saat ini (halaman replay tidak pernah
  // membuat lebih dari satu TypingPlayer), tapi disediakan supaya listener
  // 'visibilitychange' ini punya jalan keluar yang jelas kalau nanti
  // TypingPlayer perlu dibuat ulang (mis. navigasi SPA antar halaman history).
  destroy() {
    this.pause();
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
  }

  resetInternal() {
    this.isPlaying = false;
    this.currentIndex = 0;
    this.playbackTimestamps = [];

    this.speed = DEFAULT_PLAYBACK_SPEED;

    this.playStartWallTime = 0; // performance.now() saat play/resume dimulai
    this.playStartVirtualTime = 0; // virtual time ms saat play/resume dimulai
    this.currentVirtualTimeMs = 0;

    this._renderToken = 0;
    this._rafId = null;
    this._wasPlayingBeforeHidden = false;
    this._progressEls = null;
    this._lastProgressWidth = null;
  }

  loadTimeline(playbackTimestamps, { startIndex = 0 } = {}) {
    this.playbackTimestamps = Array.isArray(playbackTimestamps) ? playbackTimestamps : [];
    this.currentIndex = Math.max(0, Math.min(startIndex, this.getKeystrokes().length));

    const last = this.playbackTimestamps[this.currentIndex] ?? 0;
    this.playStartVirtualTime = last;
    this.playStartWallTime = performance.now();
    this.currentVirtualTimeMs = last;

    this.renderer.build(this.getTargetText());
    this.renderCurrent();
    this.updateUIStats();
    this.updateProgressUI();
  }

  setSpeed(speed) {
    const next = TypingRecorder.normalizeSpeed(speed);
    if (next === this.speed) return;

    // Akurasi: ubah referensi waktu agar virtual time tetap konsisten.
    // currentVirtualTime = playStartVirtualTime + (now - playStartWallTime)*speed
    const now = performance.now();
    const elapsedWall = now - this.playStartWallTime;
    const prevVirtualNow = this.playStartVirtualTime + elapsedWall * this.speed;

    this.speed = next;

    this.playStartVirtualTime = prevVirtualNow;
    this.playStartWallTime = now;

    // Update tanpa menunggu frame berikutnya
    this.currentVirtualTimeMs = prevVirtualNow;
    this.seekVirtualTime(prevVirtualNow, { keepPlaying: this.isPlaying });
  }

  play() {
    if (this.isPlaying) return;

    const keystrokes = this.getKeystrokes();
    if (!keystrokes?.length) return;

    // jika index sudah di ujung
    if (this.currentIndex >= keystrokes.length) {
      this.currentIndex = 0;
      this.currentVirtualTimeMs = this.playbackTimestamps[0] ?? 0;
    }

    this.isPlaying = true;
    this._renderToken++;
    this._updatePlayButton(true);

    this.playStartWallTime = performance.now();
    this.playStartVirtualTime = this.currentVirtualTimeMs;

    const token = this._renderToken;

    const tick = () => {
      if (token !== this._renderToken || !this.isPlaying) return;

      const now = performance.now();
      const elapsedWall = now - this.playStartWallTime;
      const targetVirtualTime = this.playStartVirtualTime + elapsedWall * this.speed;

      // majukan index berdasarkan timeline
      this.advanceToVirtualTime(targetVirtualTime);
      this.updateUIStats();
      this.updateProgressUI();
      this.callbacks.onUpdate?.(this.currentVirtualTimeMs);

      if (this.currentIndex >= this.getKeystrokes().length) {
        this.finish();
        return;
      }

      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this._updatePlayButton(false);

    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;

    // freeze currentVirtualTime dengan formula yang benar
    const now = performance.now();
    const elapsedWall = now - this.playStartWallTime;
    this.currentVirtualTimeMs = this.playStartVirtualTime + elapsedWall * this.speed;
  }

  resume() {
    // alias play
    this.play();
  }

  /**
   * Seek berdasarkan timestamp virtual (ms).
   * requirement menyebut seek(timestamp_ms)
   * - timestamp_ms di sini berarti waktu virtual yang sama seperti timelinePlayback.
   */
  seek(timestampMs) {
    if (!this.playbackTimestamps?.length) return;
    const safe = typeof timestampMs === 'number' && Number.isFinite(timestampMs) ? timestampMs : 0;
    const clamped = Math.max(0, safe);

    const total = this.playbackTimestamps[this.playbackTimestamps.length - 1] ?? 0;
    const targetVirtual = Math.min(total, clamped);

    this.seekVirtualTime(targetVirtual, { keepPlaying: this.isPlaying });
  }

  seekVirtualTime(targetVirtualTimeMs, { keepPlaying }) {
    const keystrokes = this.getKeystrokes();
    if (!keystrokes?.length || !this.playbackTimestamps?.length) return;

    // cari currentIndex via upper bound linear (aman untuk jumlah keystrokes biasanya < 15k)
    // optimasi bisa binary search, tapi linear cukup aman karena seek jarang.
    //
    // Posisi 0 (tepat sebelum karakter pertama) ditangani khusus: timeline
    // ternormalisasi selalu memberi timestamp 0 pada keystroke pertama,
    // sehingga perbandingan `<=` langsung menerapkan keystroke itu. Saat
    // reset, itu membuat satu karakter sudah tampil sebelum replay dimulai.
    // Di titik nol belum ada karakter yang diketik, jadi index harus 0.
    let idx = 0;
    if (targetVirtualTimeMs > 0) {
      while (idx < this.playbackTimestamps.length && this.playbackTimestamps[idx] <= targetVirtualTimeMs) idx++;
    }

    this.currentIndex = Math.min(idx, keystrokes.length);
    this.currentVirtualTimeMs = targetVirtualTimeMs;

    // update renderer agar langsung sinkron
    this.renderCurrent();
    this.updateUIStats();
    this.updateProgressUI();
    this.callbacks.onUpdate?.(this.currentVirtualTimeMs);

    // set referensi waktu untuk lanjutan playback
    this.playStartWallTime = performance.now();
    this.playStartVirtualTime = this.currentVirtualTimeMs;

    if (keepPlaying) {
      // restart loop dengan token baru agar tidak ada 2 loop berjalan
      this.pause();
      this.play();
    }
  }

  advanceToVirtualTime(targetVirtualTimeMs) {
    const keystrokes = this.getKeystrokes();
    const ts = this.playbackTimestamps;
    if (!keystrokes?.length || !ts?.length) return;

    // clamp
    const total = ts[ts.length - 1] ?? 0;
    const target = Math.min(Math.max(0, targetVirtualTimeMs), total);

    let advanced = false;

    // majukan index sebanyak yang sudah <= target virtual time
    while (this.currentIndex < keystrokes.length && (ts[this.currentIndex] ?? 0) <= target) {
      this.currentIndex++;
      advanced = true;
    }

    if (this.currentIndex > keystrokes.length) this.currentIndex = keystrokes.length;

    // currentVirtualTime update
    this.currentVirtualTimeMs = target;

    if (advanced) {
      this.renderCurrent();
    }
  }

  renderCurrent() {
    const keystrokes = this.getKeystrokes();
    this.renderer.render({
      keystrokes,
      currentIndex: this.currentIndex,
      targetText: this.getTargetText(),
      currentVirtualTimeMs: this.currentVirtualTimeMs,
      firstTimestampMs: this.getFirstTimestampMs(),
      totalDurationSec: this.getTotalDurationSec(),
    });
  }

  updateUIStats() {
    const { wpmEl, accEl, timeEl } = this.ui;
    const keystrokes = this.getKeystrokes();

    if (!wpmEl && !accEl && !timeEl) return;

    if (!keystrokes?.length) {
      if (wpmEl) wpmEl.textContent = '0';
      if (accEl) accEl.textContent = '0%';
      if (timeEl) timeEl.textContent = '0s';
      return;
    }

    if (this.currentIndex >= keystrokes.length) {
      const last = keystrokes[keystrokes.length - 1];
      if (wpmEl) wpmEl.textContent = last?.wpm || 0;
      if (accEl) accEl.textContent = (last?.accuracy || 0) + '%';
      if (timeEl) timeEl.textContent = '0s';
      return;
    }

    const data = keystrokes[Math.max(0, this.currentIndex - 1)];

    if (data) {
      if (wpmEl) wpmEl.textContent = data.wpm || 0;
      if (accEl) accEl.textContent = (data.accuracy || 0) + '%';

      // Waktu tersisa berbasis timestamp asli
      const firstTs = this.getFirstTimestampMs();
      const relative = (typeof data.timestamp === 'number' ? data.timestamp : 0) - firstTs;
      const elapsedSeconds = Math.floor(Math.max(0, relative) / 1000);
      const remaining = Math.max(0, this.getTotalDurationSec() - elapsedSeconds);
      if (timeEl) timeEl.textContent = remaining + 's';
    }
  }

  _getProgressElements() {
    const cached = this._progressEls;
    if (cached && cached.bar?.isConnected && cached.handle?.isConnected) return cached;
    this._progressEls = {
      bar: document.getElementById('replay-progress-bar'),
      handle: document.getElementById('replay-progress-handle'),
    };
    return this._progressEls;
  }

  updateProgressUI() {
    const { bar, handle } = this._getProgressElements();
    if (!bar || !this.playbackTimestamps?.length) return;

    const totalVirtualTime = this.playbackTimestamps[this.playbackTimestamps.length - 1] || 1;
    const progress = Math.min(100, Math.max(0, (this.currentVirtualTimeMs / totalVirtualTime) * 100));
    const width = `${progress.toFixed(2)}%`;

    // Tulis DOM hanya kalau nilainya berubah (hemat style recalc tiap frame).
    if (this._lastProgressWidth === width) return;
    this._lastProgressWidth = width;

    bar.style.width = width;
    if (handle) handle.style.left = width;
  }

  finish() {
    this.isPlaying = false;
    this._updatePlayButton(false);

    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;

    // pastikan waktu 0s di UI
    this.currentIndex = this.getKeystrokes().length;
    this.currentVirtualTimeMs = this.playbackTimestamps[this.playbackTimestamps.length - 1] ?? 0;

    // Render state akhir: tanpa ini karakter terakhir yang diketik tidak pernah
    // muncul di layar karena loop berhenti tepat setelah keystroke terakhir.
    this.renderCurrent();

    this.updateUIStats();
    this.updateProgressUI();

    this.callbacks.onFinish?.();
  }

  _updatePlayButton(isPlaying) {
    setPlayButtonIcon(this.ui?.playButton, isPlaying);
  }

  _handleVisibilityChange() {
    // Akurasi: jika tab disembunyikan, pause supaya wall clock tidak membuat
    // targetVirtualTime melompat jauh saat tab kembali aktif (mis. laptop di-sleep).
    if (document.visibilityState === 'hidden') {
      if (this.isPlaying) this._wasPlayingBeforeHidden = true;
      this.pause();
      return;
    }

    // Tab kembali terlihat: hanya lanjutkan otomatis jika memang sedang
    // playing sebelum disembunyikan, supaya tidak diam-diam mulai memutar
    // replay yang memang sengaja di-pause oleh user.
    if (this._wasPlayingBeforeHidden) {
      this._wasPlayingBeforeHidden = false;
      this.play();
    }
  }
}

class TypingReplayApp {
  constructor() {
    this.isInitialized = false;
    this.eventListenersAdded = false;

    this.state = {
      replayData: null,
      scoreId: null,
      playbackTimestamps: [],
      firstTimestampMs: 0,
      totalDurationSec: 60,
    };

    this.replayer = null;
    this.renderer = null;

    // true = panel replay dipasang di halaman hasil tes (index.html) dan
    // dibuka/ditutup lewat tombol "Replay Mengetik"; false = halaman riwayat.
    this.inlineMode = false;
    this.inlineSlot = null;
    this._inlineOpenTimer = null;
    this._inlineScrollTimer = null;
    this._inlineAnimId = null;

    this.settings = loadReplaySettings();
    this.liveStats = null;
    this._liveMountedKey = '';

    this._isSeeking = false;
    this._boundOnMouseDown = null;
  }

  initReplayContainer() {
    if (this.isInitialized) return;

    const existingContainer = document.getElementById('replay-container');
    if (existingContainer) {
      this.inlineMode =
        !document.getElementById('scoreHistoryList') &&
        Boolean(document.getElementById('resultReplayMount'));
      this._wireUI(existingContainer);
      this.isInitialized = true;
      return;
    }

    const DOM = {
      scoreHistoryList: document.getElementById('scoreHistoryList'),
      resultReplayMount: document.getElementById('resultReplayMount'),
    };

    // Panel replay dipakai di DUA tempat:
    //  1. Halaman Riwayat Skor (#scoreHistoryList) - panel disisipkan di atas
    //     daftar skor, dipakai saat user memilih kartu yang punya replay.
    //  2. Halaman hasil tes di index.html (#resultReplayMount) - panel tinggal
    //     di dalam slot .result-replay-slot yang bisa membuka/menutup, dan
    //     dibuka lewat tombol "Replay Mengetik" di baris tombol hasil.
    // Kalau tidak ada keduanya, jangan sisipkan apa pun dan JANGAN tandai
    // isInitialized supaya tidak ada side-effect di halaman lain.
    if (!DOM.scoreHistoryList && !DOM.resultReplayMount) {
      return;
    }

    // Mode inline = panel berada di halaman hasil tes (index.html), bukan di
    // halaman riwayat. Di mode ini panel awalnya tertutup rapat (slot 0fr).
    this.inlineMode = !DOM.scoreHistoryList && Boolean(DOM.resultReplayMount);

    // Hapus container duplikat
    const dups = document.querySelectorAll('#replay-container');
    dups.forEach((el) => el.remove());

    const replayContainer = document.createElement('div');
    replayContainer.id = 'replay-container';
    replayContainer.className = 'replay-container';

    replayContainer.innerHTML = `
      <div class="replay-header">
        <h3>Tonton Replay Mengetik</h3>
        <div class="replay-controls">
          <button
            id="replay-close-btn"
            class="replay-btn replay-btn-icon replay-close-inline"
            type="button"
            title="Tutup replay"
            aria-label="Tutup replay"
            hidden
          >
            <i class="fas fa-times"></i>
          </button>
          <button
            id="replay-settings-btn"
            class="replay-btn replay-btn-icon"
            type="button"
            title="Pengaturan replay"
            aria-label="Pengaturan replay"
            aria-expanded="false"
            aria-controls="replay-settings"
          >
            <i class="fas fa-sliders-h"></i>
          </button>
          <button id="replay-play-btn" class="replay-btn" title="Play/Pause" type="button">
            <i class="fas fa-play"></i>
          </button>
          <button id="replay-reset-btn" class="replay-btn" title="Reset" type="button">
            <i class="fas fa-redo"></i>
          </button>
        </div>
      </div>

      <div id="replay-settings" class="replay-settings" hidden>
        <div class="replay-settings-head">
          <span class="replay-settings-title">Pengaturan replay</span>
          <span class="replay-settings-hint">Tersimpan otomatis</span>
        </div>
        <div class="replay-settings-list">
          <label class="replay-toggle">
            <span class="replay-toggle-copy">
              <span class="replay-toggle-label">Sorot teks</span>
              <span class="replay-toggle-desc">Tandai kata yang sedang diketik.</span>
            </span>
            <input type="checkbox" class="replay-toggle-input" data-replay-setting="highlight" role="switch" />
            <span class="replay-toggle-switch" aria-hidden="true"></span>
          </label>
          <label class="replay-toggle">
            <span class="replay-toggle-copy">
              <span class="replay-toggle-label">Mode mengetik</span>
              <span class="replay-toggle-desc">Karakter muncul setelah diketik, tidak semua sekaligus.</span>
            </span>
            <input type="checkbox" class="replay-toggle-input" data-replay-setting="typingMode" role="switch" />
            <span class="replay-toggle-switch" aria-hidden="true"></span>
          </label>
          <label class="replay-toggle">
            <span class="replay-toggle-copy">
              <span class="replay-toggle-label">Statistik live</span>
              <span class="replay-toggle-desc">Grafik dan metrik detail selama replay berjalan.</span>
            </span>
            <input type="checkbox" class="replay-toggle-input" data-replay-setting="liveStats" role="switch" />
            <span class="replay-toggle-switch" aria-hidden="true"></span>
          </label>
        </div>
      </div>

      <div class="replay-stats">
        <div class="replay-stat-item">
          <span id="replay-wpm" class="replay-stat-value">0</span>
        </div>
        <div class="replay-stat-item">
          <span id="replay-accuracy" class="replay-stat-value">0%</span>
        </div>
        <div class="replay-stat-item">
          <span id="replay-time" class="replay-stat-value">0s</span>
        </div>
      </div>
      <div class="replay-info">
        <span id="replay-score-info">Pilih skor untuk melihat replay</span>
      </div>
      <div id="replay-text-display" class="replay-text-display"></div>
      <div class="replay-progress" id="replay-progress-track">
        <div id="replay-progress-bar" class="replay-progress-bar"></div>
        <div id="replay-progress-handle" class="replay-progress-handle"></div>
      </div>

      <div id="replay-live" class="replay-live" hidden>
        <div class="replay-live-head">
          <div class="replay-live-heading">
            <h4>Statistik Live</h4>
            <span class="replay-live-legend">
              <span class="replay-live-key is-wpm">WPM</span>
              <span class="replay-live-key is-raw">Raw</span>
              <span class="replay-live-key is-burst">Burst</span>
              <span class="replay-live-key is-accuracy">Akurasi</span>
              <span class="replay-live-key is-error">Error</span>
            </span>
          </div>
          <span id="replay-live-clock" class="replay-live-clock">0s / 0s</span>
        </div>
        <p id="replay-live-note" class="replay-live-note">
          Pilih skor yang punya replay untuk melihat statistik live.
        </p>
        <div id="replay-live-body" class="replay-live-body" hidden>
          <div class="replay-live-main">
            <div class="replay-live-chart">
              <canvas id="replay-live-chart" role="img" aria-label="Grafik WPM, akurasi, dan titik error selama replay"></canvas>
            </div>
            <div class="replay-keymap" aria-label="Peta huruf yang sering salah ketik">
              <div class="replay-keymap-head">
                <span class="replay-keymap-title">Peta Salah Ketik</span>
                <span id="replay-keymap-top" class="replay-keymap-top">Belum ada salah ketik</span>
              </div>
              <div id="replay-keymap" class="replay-keymap-board" aria-hidden="true">
                <div class="replay-keymap-row">
                  <span class="replay-keymap-key" data-key="q">Q</span>
                  <span class="replay-keymap-key" data-key="w">W</span>
                  <span class="replay-keymap-key" data-key="e">E</span>
                  <span class="replay-keymap-key" data-key="r">R</span>
                  <span class="replay-keymap-key" data-key="t">T</span>
                  <span class="replay-keymap-key" data-key="y">Y</span>
                  <span class="replay-keymap-key" data-key="u">U</span>
                  <span class="replay-keymap-key" data-key="i">I</span>
                  <span class="replay-keymap-key" data-key="o">O</span>
                  <span class="replay-keymap-key" data-key="p">P</span>
                </div>
                <div class="replay-keymap-row">
                  <span class="replay-keymap-key" data-key="a">A</span>
                  <span class="replay-keymap-key" data-key="s">S</span>
                  <span class="replay-keymap-key" data-key="d">D</span>
                  <span class="replay-keymap-key" data-key="f">F</span>
                  <span class="replay-keymap-key" data-key="g">G</span>
                  <span class="replay-keymap-key" data-key="h">H</span>
                  <span class="replay-keymap-key" data-key="j">J</span>
                  <span class="replay-keymap-key" data-key="k">K</span>
                  <span class="replay-keymap-key" data-key="l">L</span>
                </div>
                <div class="replay-keymap-row">
                  <span class="replay-keymap-key" data-key="z">Z</span>
                  <span class="replay-keymap-key" data-key="x">X</span>
                  <span class="replay-keymap-key" data-key="c">C</span>
                  <span class="replay-keymap-key" data-key="v">V</span>
                  <span class="replay-keymap-key" data-key="b">B</span>
                  <span class="replay-keymap-key" data-key="n">N</span>
                  <span class="replay-keymap-key" data-key="m">M</span>
                </div>
              </div>
              <div class="replay-keymap-legend">
                <span>Jarang</span>
                <i aria-hidden="true"></i>
                <span>Sering</span>
              </div>
            </div>
          </div>
          <div class="replay-live-grid">
            <div class="replay-live-stat">
              <span class="replay-live-label">WPM</span>
              <strong id="replay-live-wpm" class="replay-live-value">0</strong>
            </div>
            <div class="replay-live-stat">
              <span class="replay-live-label">Akurasi</span>
              <strong id="replay-live-accuracy" class="replay-live-value">0%</strong>
            </div>
            <div class="replay-live-stat">
              <span class="replay-live-label">Karakter Diketik</span>
              <strong id="replay-live-typed" class="replay-live-value">0</strong>
            </div>
            <div class="replay-live-stat">
              <span class="replay-live-label">Karakter Benar</span>
              <strong id="replay-live-correct" class="replay-live-value is-good">0</strong>
            </div>
            <div class="replay-live-stat">
              <span class="replay-live-label">Karakter Salah</span>
              <strong id="replay-live-wrong" class="replay-live-value">0</strong>
            </div>
            <div class="replay-live-stat">
              <span class="replay-live-label">Kata Benar</span>
              <strong id="replay-live-words-correct" class="replay-live-value is-good">0</strong>
            </div>
            <div class="replay-live-stat">
              <span class="replay-live-label">Kata Salah</span>
              <strong id="replay-live-words-wrong" class="replay-live-value">0</strong>
            </div>
            <div class="replay-live-stat">
              <span class="replay-live-label">Konsistensi</span>
              <strong id="replay-live-consistency" class="replay-live-value">0%</strong>
            </div>
          </div>
          <p class="replay-live-foot">
            WPM: kumulatif (sama dengan kartu) &middot; Raw: semua karakter &middot; Burst: per detik &middot; Konsistensi: 15 dtk terakhir &middot; Kata dihitung saat spasi
          </p>
        </div>
      </div>
    `;

    // Di halaman hasil tes, panel replay tidak menampilkan blok "Statistik Live"
    // (grafik replay historis, peta salah ketik, dan kartu metrik). Statistik
    // live-nya memakai kartu grafik hasil tes yang sudah ada di bawah panel,
    // dan garisnya digerakkan mengikuti progres replay.
    if (this.inlineMode) {
      replayContainer.querySelector('#replay-live')?.remove();
      replayContainer
        .querySelector('[data-replay-setting="liveStats"]')
        ?.closest('.replay-toggle')
        ?.remove();
    }

    DOM.scoreHistoryList
      ? DOM.scoreHistoryList.before(replayContainer)
      : DOM.resultReplayMount.appendChild(replayContainer);

    this._wireUI(replayContainer);
    this.isInitialized = true;

    if (!this.eventListenersAdded) {
      this._addGlobalListeners();
      this._wireResizeListener();
      this.eventListenersAdded = true;
    }
  }

  // Sebelumnya listener 'resize' dipasang di luar guard `eventListenersAdded`,
  // sehingga aman-nya HANYA bergantung pada asumsi implisit bahwa
  // initReplayContainer() tidak pernah dipanggil dua kali (dijamin oleh
  // `if (this.isInitialized) return;` di awal fungsi itu). Sekarang listener
  // ini dipindah ke bawah guard `eventListenersAdded` yang sama dengan
  // listener lain, dan handler-nya disimpan sebagai referensi instance
  // (`this._onResize`) supaya bisa di-removeEventListener lewat destroy()
  // kalau suatu saat app ini perlu di-teardown (mis. SPA navigation).
  _wireResizeListener() {
    if (this._resizeListenerWired) return;
    this._resizeListenerWired = true;

    let resizeDebounceId = null;
    this._onResize = () => {
      clearTimeout(resizeDebounceId);
      resizeDebounceId = setTimeout(() => {
        this.renderer?.recomputeWordPositionCache();
        // Posisi kata berubah setelah resize -> paksa auto-scroll menyinkronkan
        // ulang ke kata aktif (kalau tidak, kata aktif bisa berada di luar
        // viewport sampai kata berikutnya datang).
        if (this.renderer?.cache) this.renderer.cache.lastScrolledWordIdx = -1;
        // render ulang jika ada aktif state
        if (this.state.replayData) this.renderer?.render({
          keystrokes: this.state.replayData.keystrokes || [],
          currentIndex: this.replayer?.currentIndex || 0,
          targetText: this.state.replayData.targetText || ''
        });
      }, 150);
    };
    window.addEventListener('resize', this._onResize);
  }

  _wireUI(replayContainer) {
    this.container = replayContainer;
    this.playButton = document.getElementById('replay-play-btn');
    this.inlineSlot = this.inlineMode
      ? document.getElementById('resultReplaySlot')
      : null;

    // Tombol tutup hanya relevan di halaman hasil tes: panel replay di sana
    // bisa ditutup dari dalam panel, karena tombol toggle-nya berada jauh di
    // bawah grafik setelah panel terbuka.
    const closeBtn = document.getElementById('replay-close-btn');
    if (closeBtn) closeBtn.hidden = !this.inlineMode;

    const textDisplay = document.getElementById('replay-text-display');
    this.renderer = new TypingRenderer({
      containerEl: textDisplay,
    });

    // Di halaman hasil tes blok statistik live sengaja tidak dirender (lihat
    // initReplayContainer), jadi objek ReplayLiveStats hanya dibuat kalau
    // root-nya memang ada (halaman Riwayat Skor).
    const liveRoot = document.getElementById('replay-live');
    this.liveStats = liveRoot ? new ReplayLiveStats({ root: liveRoot }) : null;

    this.replayer = new TypingPlayer({
      renderer: this.renderer,
      getKeystrokes: () => this.state.replayData?.keystrokes || [],
      getTargetText: () => this.state.replayData?.targetText || '',
      getTotalDurationSec: () => this.state.totalDurationSec,
      getFirstTimestampMs: () => this.state.firstTimestampMs,
      callbacks: {
        onUpdate: (currentTimeMs) => {
          this.liveStats?.update(this.replayer?.currentIndex || 0, currentTimeMs);
          // Gerakkan garis grafik hasil tes mengikuti posisi replay.
          this._syncResultChartReplay(currentTimeMs);
        },
        onFinish: () => {
          const timeEl = document.getElementById('replay-time');
          if (timeEl) timeEl.textContent = '0s';

          const keystrokes = this.state.replayData?.keystrokes || [];
          const timeline = this.state.playbackTimestamps || [];
          this.liveStats?.update(
            keystrokes.length,
            timeline[timeline.length - 1] ?? 0
          );
          this._syncResultChartReplay(timeline[timeline.length - 1] ?? 0);
        },
      },
      ui: {
        wpmEl: document.getElementById('replay-wpm'),
        accEl: document.getElementById('replay-accuracy'),
        timeEl: document.getElementById('replay-time'),
        playButton: this.playButton,
      },
    });

    // progress drag
    this._initProgressDrag();

    this._wireSettings(replayContainer);
  }

  /**
   * Pasang tombol + checkbox pengaturan replay, lalu terapkan preferensi
   * yang tersimpan.
   */
  _wireSettings(replayContainer) {
    const settingsButton = document.getElementById('replay-settings-btn');
    const settingsPanel = document.getElementById('replay-settings');

    if (settingsButton && settingsPanel) {
      settingsButton.addEventListener('click', () => {
        const willOpen = settingsPanel.hidden;
        settingsPanel.hidden = !willOpen;
        settingsButton.setAttribute('aria-expanded', String(willOpen));
      });
    }

    replayContainer
      .querySelectorAll('[data-replay-setting]')
      .forEach((input) => {
        const name = input.dataset.replaySetting;
        input.checked = Boolean(this.settings[name]);

        input.addEventListener('change', () => {
          this.settings[name] = input.checked;
          saveReplaySettings(this.settings);
          this._applySettings();
        });
      });

    this._applySettings();
  }

  /**
   * Terapkan preferensi ke tampilan replay: highlight, mode ketik, dan
   * panel statistik live.
   */
  _applySettings() {
    const textDisplay = document.getElementById('replay-text-display');
    if (textDisplay) {
      textDisplay.classList.toggle('replay-typing-mode', this.settings.typingMode);
      textDisplay.classList.toggle('replay-no-highlight', !this.settings.highlight);
    }

    const livePanel = document.getElementById('replay-live');
    if (livePanel) livePanel.hidden = !this.settings.liveStats;

    if (this.settings.liveStats) {
      this._syncLiveStats();
    } else {
      this.liveStats?.detach();
    }
  }

  /**
   * Pastikan data statistik live cocok dengan replay yang sedang dipilih.
   * Dipanggil saat load replay, saat replay di-reset, dan saat opsi diaktifkan.
   */
  _syncLiveStats() {
    if (!this.settings.liveStats || !this.liveStats) return;

    const note = document.getElementById('replay-live-note');
    const body = document.getElementById('replay-live-body');

    const keystrokes = this.state.replayData?.keystrokes || [];
    const hasData = keystrokes.length > 0;

    if (note) note.hidden = hasData;
    if (body) body.hidden = !hasData;

    if (!hasData) {
      this.liveStats.detach();
      this._liveMountedKey = '';
      return;
    }

    const key = `${this.state.scoreId}:${keystrokes.length}`;
    if (key !== this._liveMountedKey) {
      this.liveStats.load(keystrokes, {
        timeline: this.state.playbackTimestamps,
        totalDurationSec: this.state.totalDurationSec,
        key,
        targetText: this.state.replayData?.targetText || '',
      });
      this._liveMountedKey = key;
    }

    this.liveStats.attach();
    this.liveStats.update(
      this.replayer?.currentIndex || 0,
      this.replayer?.currentVirtualTimeMs || 0
    );
  }

  loadReplay(scoreId) {
    let scores = [];
    try {
      scores = JSON.parse(localStorage.getItem('typingScores') || '[]');
    } catch (err) {
      console.error('Gagal membaca typingScores dari localStorage:', err);
    }

    // Dukung kedua kemungkinan: skor punya field id unik sendiri (paling aman),
    // atau scoreId memang dimaksudkan sebagai index posisi array (perilaku lama).
    const score = Array.isArray(scores)
      ? scores.find((s) => s?.id === scoreId) ?? scores[scoreId]
      : undefined;

    if (!score || !score.replayData) {
      this._showNoReplayMessage('Replay tidak tersedia.');
      return;
    }

    this._applyReplayData(score.replayData, {
      scoreId,
      wpm: score.wpm,
      accuracy: score.accuracy,
      time: score.time,
      date: score.date,
    });
  }

  /**
   * Muat replay LANGSUNG dari objek replayData (tanpa membaca localStorage).
   * Dipakai halaman hasil tes: data tes yang baru selesai sudah ada di memori
   * (gameState.ghostData), jadi tombol "Replay Mengetik" tidak perlu mencari
   * skor di riwayat — dan tetap bekerja walau penyimpanan skor gagal.
   *
   * @param {ReplayData} replayData - { targetText, keystrokes[] }
   * @param {Object} meta - { wpm, accuracy, time (detik), date, scoreId }
   * @returns {boolean} true kalau timeline replay berhasil dimuat.
   */
  loadReplayFromData(replayData, meta = {}) {
    if (
      !replayData ||
      typeof replayData.targetText !== 'string' ||
      !Array.isArray(replayData.keystrokes) ||
      replayData.keystrokes.length === 0
    ) {
      this._showNoReplayMessage('Replay tidak tersedia untuk tes ini.');
      return false;
    }

    this._applyReplayData(replayData, {
      ...meta,
      scoreId: meta.scoreId ?? 'current-test',
    });
    return true;
  }

  /**
   * Inti pemuatan replay yang dipakai bersama oleh halaman riwayat skor
   * (loadReplay) dan halaman hasil tes (loadReplayFromData).
   */
  _applyReplayData(replayData, meta = {}) {
    // stop / pause aman
    if (this.replayer) this.replayer.pause();

    this.state.scoreId = meta.scoreId ?? null;
    this.state.replayData = replayData;

    const keystrokes = this.state.replayData.keystrokes || [];

    // validasi dan build timeline
    this.state.playbackTimestamps = TypingRecorder.computePlaybackTimestamps(keystrokes);
    this.state.firstTimestampMs = TypingRecorder.computeFirstTimestamp(keystrokes);

    // totalDuration: field "time" pada entry skor adalah detik. Kalau tidak
    // ada (mis. data tes langsung dari memori), pakai durasi timeline replay.
    const t = Number(meta.time);
    const timeline = this.state.playbackTimestamps;
    const timelineEndMs = timeline.length > 0 ? timeline[timeline.length - 1] : 0;
    const fallbackDuration =
      timelineEndMs > 0 ? Math.max(1, Math.round(timelineEndMs / 1000)) : 60;
    this.state.totalDurationSec =
      Number.isFinite(t) && t > 0 ? t : fallbackDuration;

    this._updateReplayInfo(meta);

    // Load timeline ke player dengan index awal 0
    this.replayer.loadTimeline(this.state.playbackTimestamps, { startIndex: 0 });

    const playBtn = this.playButton;
    if (playBtn) playBtn.disabled = false;
    this._setPlayButtonIcon(false);

    // Siapkan statistik live untuk replay yang baru dipilih.
    this._liveMountedKey = '';
    this._syncLiveStats();

    // Kalau panel inline sudah terbuka (mis. memuat replay lain), grafik hasil
    // langsung ikut mundur ke awal timeline replay.
    if (this.isInlineOpen()) {
      this._syncResultChartReplay(this.replayer?.currentVirtualTimeMs || 0);
    }
  }

  /**
   * Buka/tutup panel replay inline (halaman hasil tes). Slot dianimasikan
   * tingginya dari 0 ke tinggi panel, sehingga kartu grafik hasil di bawahnya
   * benar-benar bergerak turun dan teks replay muncul di antaranya.
   */
  setInlineOpen(open) {
    if (!this.inlineMode) return;

    const slot = this.inlineSlot || document.getElementById('resultReplaySlot');
    if (!slot) return;
    this.inlineSlot = slot;

    const willOpen = Boolean(open);
    slot.setAttribute('aria-hidden', String(!willOpen));
    // Saat panel tertutup tingginya 0, tapi tombol-tombolnya masih ada di DOM.
    // `inert` mengeluarkannya dari urutan Tab dan dari accessibility tree supaya
    // fokus keyboard tidak "menyelip" ke panel yang tidak terlihat.
    slot.inert = !willOpen;
    this._syncReplayButtonState(willOpen);

    clearTimeout(this._inlineOpenTimer);
    clearTimeout(this._inlineScrollTimer);

    if (!willOpen) {
      this.replayer?.pause();
      this._animateInlineSlot(false);
      this._emitResultChartReplay(false, 1);
      return;
    }

    this._animateInlineSlot(true);
    this._syncResultChartReplay(this.replayer?.currentVirtualTimeMs || 0);

    // Tombol replay berada di bawah grafik, sedangkan panel muncul di ATAS
    // grafik. Tanpa scroll, panel baru akan berada di luar viewport (scroll
    // anchoring browser menahan posisi tombol). Jadi panel digulirkan ke atas
    // layar tepat saat animasi buka mulai, supaya user melihat grafik turun.
    this._inlineScrollTimer = setTimeout(() => {
      const reduceMotion = window.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      )?.matches;
      slot.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }, 30);

    // Setelah animasi buka selesai, ukur ulang posisi kata (panel tadinya
    // setinggi 0) dan sinkronkan ulang statistik live/grafik.
    this._inlineOpenTimer = setTimeout(() => {
      if (this.renderer?.cache) {
        this.renderer.recomputeWordPositionCache();
        this.renderer.cache.lastScrolledWordIdx = -1;
      }
      if (this.replayer) {
        this.replayer.renderCurrent();
        this.replayer.updateUIStats();
        this.replayer.updateProgressUI();
      }
      this._syncLiveStats();
    }, INLINE_SLIDE_DURATION_MS + 30);
  }

  /**
   * Animasi tinggi slot inline. Sengaja memakai rAF sendiri (bukan CSS
   * transition) supaya pergerakan grafik hasil tetap terlihat meskipun OS
   * mematikan animasi lewat prefers-reduced-motion — animasi ini adalah
   * perilaku utama tombol replay, bukan hiasan.
   */
  _animateInlineSlot(open) {
    const slot = this.inlineSlot;
    if (!slot) return;

    if (this._inlineAnimId) {
      cancelAnimationFrame(this._inlineAnimId);
      this._inlineAnimId = null;
    }

    const easing = (t) => 1 - Math.pow(1 - t, 3);
    const duration = INLINE_SLIDE_DURATION_MS;

    let from = 0;
    let to = 0;

    if (open) {
      slot.classList.add('is-open');
      slot.style.height = 'auto';
      to = slot.scrollHeight;
      slot.style.height = '0px';
      slot.getBoundingClientRect(); // paksa reflow sebelum animasi
    } else {
      from = slot.getBoundingClientRect().height;
      to = 0;
      slot.classList.remove('is-open');
      slot.style.height = `${from}px`;
      slot.getBoundingClientRect();
    }

    const start = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const value = from + (to - from) * easing(t);
      slot.style.height = `${Math.max(0, value)}px`;

      if (t < 1) {
        this._inlineAnimId = requestAnimationFrame(step);
        return;
      }

      // Selesai: kembalikan ke tinggi otomatis (terbuka) atau 0 via CSS.
      this._inlineAnimId = null;
      slot.style.height = '';
    };

    this._inlineAnimId = requestAnimationFrame(step);
  }

  /**
   * Kirim posisi replay ke grafik hasil tes (result-chart.js). Grafik memakai
   * event ini untuk menggerakkan garisnya persis seperti grafik replay di
   * halaman Riwayat Skor.
   */
  _syncResultChartReplay(currentTimeMs = 0) {
    if (!this.inlineMode) return;

    const timeline = this.state.playbackTimestamps || [];
    const start = timeline.length ? timeline[0] : 0;
    const end = timeline.length ? timeline[timeline.length - 1] : 0;
    const span = end - start;
    const progress = span > 0
      ? Math.min(1, Math.max(0, (currentTimeMs - start) / span))
      : 0;

    this._emitResultChartReplay(this.isInlineOpen(), progress);
  }

  _emitResultChartReplay(active, progress = 0) {
    if (!this.inlineMode) return;
    window.dispatchEvent(
      new CustomEvent('typingreplay:progress', {
        detail: {
          active: Boolean(active),
          progress: Math.min(1, Math.max(0, Number(progress) || 0)),
        },
      })
    );
  }

  /** true kalau panel replay inline sedang terbuka. */
  isInlineOpen() {
    if (!this.inlineMode) return false;
    const slot = this.inlineSlot || document.getElementById('resultReplaySlot');
    return Boolean(slot?.classList.contains('is-open'));
  }

  /**
   * Tampilkan replay tes terakhir di panel inline.
   * @param {{replayData: ReplayData, wpm?:number, accuracy?:number, time?:number, date?:string}} payload
   */
  showResultReplay(payload = {}) {
    if (!this.inlineMode) return false;

    const replayData = payload.replayData || payload;
    const loaded = this.loadReplayFromData(replayData, payload);

    // Tetap buka panel walau data replay kosong, supaya pesan "Replay tidak
    // tersedia" terlihat oleh user (bukan tombol yang diam saja).
    this.setInlineOpen(true);
    return loaded;
  }

  /** Tutup panel replay inline (tanpa menghapus data replay yang termuat). */
  hideResultReplay() {
    this.setInlineOpen(false);
  }

  _syncReplayButtonState(open) {
    const btn = document.getElementById('replayTypingBtn');
    if (!btn) return;
    btn.classList.toggle('is-active', Boolean(open));
    btn.setAttribute('aria-pressed', String(Boolean(open)));
  }

  // Sama seperti TypingPlayer.destroy(): tidak dipanggil di alur normal saat
  // ini (replayApp adalah singleton untuk satu halaman), tapi menyediakan
  // jalan keluar eksplisit untuk listener 'resize' dan player-nya.
  destroy() {
    clearTimeout(this._inlineOpenTimer);
    clearTimeout(this._inlineScrollTimer);
    if (this._inlineAnimId) {
      cancelAnimationFrame(this._inlineAnimId);
      this._inlineAnimId = null;
    }
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    this.replayer?.destroy();
  }

  _addGlobalListeners() {
    document.addEventListener('click', (e) => {
      const playBtn = e.target.closest('#replay-play-btn');
      const resetBtn = e.target.closest('#replay-reset-btn');
      const closeBtn = e.target.closest('#replay-close-btn');

      if (closeBtn) {
        this.hideResultReplay();
        return;
      }

      if (playBtn) {
        if (!this.state.replayData) return;
        this.replayer.isPlaying ? this.replayer.pause() : this.replayer.play();
      }

      if (resetBtn) {
        this.resetReplay();
      }
    });
  }

  resetReplay() {
    if (!this.replayer) return;
    this.replayer.pause();

    // Nyalakan lagi auto-scroll dan kembalikan scroll ke atas, karena replay
    // dimulai ulang dari awal teks.
    if (this.renderer?.cache) {
      this.renderer.cache.followMode = true;
      this.renderer.cache.lastScrolledWordIdx = -1;
      if (this.renderer.containerEl) {
        this.renderer._setScrollTop(0);
      }
    }

    // seek(0) = posisi tepat SEBELUM karakter pertama. Jangan set index
    // manual lalu memanggil seekVirtualTime(0): jalur itu bisa menerapkan
    // keystroke pertama (timestamp 0) sehingga satu karakter tertinggal di
    // layar sebelum replay dijalankan lagi.
    this.replayer.seek(0);

    // Reset UI stats (seek sudah merender ulang teks + progres).
    this.replayer.updateUIStats();
    this.replayer.updateProgressUI();
  }

  _initProgressDrag() {
    if (this._progressWired) return;
    this._progressWired = true;

    document.addEventListener('mousedown', (e) => {
      const track = e.target.closest('#replay-progress-track');
      if (!track) return;
      if (!this.state.replayData) return;
      this._handleSeekStart(e);
    });

    document.addEventListener('touchstart', (e) => {
      const track = e.target.closest('#replay-progress-track');
      if (!track) return;
      if (!this.state.replayData) return;
      this._handleSeekStart(e);
    }, { passive: false });

    document.addEventListener('mousemove', (e) => this._handleSeekMove(e));
    document.addEventListener('touchmove', (e) => this._handleSeekMove(e), { passive: false });

    document.addEventListener('mouseup', () => this._handleSeekEnd());
    document.addEventListener('touchend', () => this._handleSeekEnd());
  }

  _handleSeekStart(e) {
    e.preventDefault();
    this._isSeeking = true;

    if (this.replayer?.isPlaying) this.replayer.pause();

    // Drag progress bar = user sengaja lompat ke posisi tertentu,
    // jadi auto-scroll perlu ikut menampilkan posisi barunya.
    if (this.renderer?.cache) this.renderer.cache.followMode = true;

    this._seekToPointerPosition(e);
  }

  _handleSeekMove(e) {
    if (!this._isSeeking) return;
    e.preventDefault();
    this._seekToPointerPosition(e);
  }

  _handleSeekEnd() {
    this._isSeeking = false;
  }

  _seekToPointerPosition(e) {
    if (!this.state.playbackTimestamps?.length) return;

    const track = document.getElementById('replay-progress-track');
    if (!track) return;
    const rect = track.getBoundingClientRect();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let position = (clientX - rect.left) / rect.width;
    position = Math.max(0, Math.min(1, position));

    const total = this.state.playbackTimestamps[this.state.playbackTimestamps.length - 1] || 0;
    const targetVirtual = position * total;

    // requirement: seek(timestamp_ms)
    this.replayer.seek(targetVirtual);
  }

  _updateReplayInfo(score = {}) {
    const info = document.getElementById('replay-score-info');
    if (!info) return;

    const dateValue = score.date ? new Date(score.date) : new Date();
    const safeDate = Number.isNaN(dateValue.getTime()) ? new Date() : dateValue;
    const date = safeDate.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const wpm = score.wpm ?? 0;
    const accuracy = score.accuracy ?? 0;

    info.textContent = `WPM: ${wpm} | Akurasi: ${accuracy}% | ${date}`;
  }

  _showNoReplayMessage(message) {
    // Bersihkan state playback lama supaya tombol play tidak memutar ulang
    // replay tes sebelumnya saat data yang baru tidak tersedia.
    this.state.replayData = null;
    this.state.playbackTimestamps = [];
    this.state.firstTimestampMs = 0;

    if (this.replayer) {
      this.replayer.pause();
      this.replayer.loadTimeline([], { startIndex: 0 });
    } else if (this.renderer) {
      this.renderer.clear();
    }

    if (this.playButton) this.playButton.disabled = true;
    this.liveStats?.detach();
    this._liveMountedKey = '';

    // Tidak ada replay untuk diputar: grafik hasil tes ditampilkan penuh lagi.
    this._emitResultChartReplay(false, 1);

    const textDisplay = document.getElementById('replay-text-display');
    if (textDisplay) textDisplay.innerHTML = `<p class="no-replay">${message}</p>`;
  }

  _setPlayButtonIcon(isPlaying) {
    setPlayButtonIcon(document.getElementById('replay-play-btn'), isPlaying);
  }
}

// Singleton app untuk menjaga hanya 1 engine berjalan.
const replayApp = new TypingReplayApp();

export function initReplayContainer() {
  replayApp.initReplayContainer();
}

export function loadReplay(scoreId) {
  replayApp.loadReplay(scoreId);
}

// expose global untuk kompatibilitas existing code
window.loadReplay = loadReplay;
window.initReplayContainer = initReplayContainer;

/**
 * API panel replay di halaman hasil tes (index.html). Dipakai game-logic.js
 * saat tombol "Replay Mengetik" diklik.
 */
export function showResultReplay(payload) {
  return replayApp.showResultReplay(payload);
}

export function hideResultReplay() {
  replayApp.hideResultReplay();
}

export function isResultReplayOpen() {
  return replayApp.isInlineOpen();
}

window.resultReplayAPI = {
  show: showResultReplay,
  hide: hideResultReplay,
  isOpen: isResultReplayOpen,
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initReplayContainer, { once: true });
} else {
  initReplayContainer();
}

// ========= Optional API (kalau kamu mau akses kontrol playback dari luar) =========
// requirement meminta fungsi play/pause/resume/seek/setSpeed + callback.
// Karena file ini terintegrasi dengan halaman history, API berikut dipasang ke window
// agar bisa dipanggil eksternal (tanpa mengganggu existing behavior).
window.typingReplayAPI = {
  play: () => replayApp.replayer?.play(),
  pause: () => replayApp.replayer?.pause(),
  resume: () => replayApp.replayer?.resume(),
  seek: (timestampMs) => replayApp.replayer?.seek(timestampMs),
  setSpeed: (speed) => replayApp.replayer?.setSpeed(speed),
  // callbacks: disediakan via setter agar tidak perlu rewire engine
  set onUpdate(fn) {
    if (replayApp.replayer?.callbacks) replayApp.replayer.callbacks.onUpdate = fn;
  },
  set onFinish(fn) {
    if (replayApp.replayer?.callbacks) replayApp.replayer.callbacks.onFinish = fn;
  },
};