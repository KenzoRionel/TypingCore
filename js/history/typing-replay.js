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
      if (charSpans) {
        for (const charSpan of charSpans) {
          charSpan.className = 'replay-char untyped';
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

    const firstEl = wordElements[0];
    let lineHeight = firstEl ? firstEl.offsetHeight : 0;
    if (!lineHeight) {
      // Fallback kalau elemen belum punya tinggi terukur (mis. font belum siap).
      const computed = firstEl ? window.getComputedStyle(firstEl) : null;
      const parsed = computed ? parseFloat(computed.lineHeight) : 0;
      lineHeight = Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
    }
    this.cache.lineHeight = lineHeight;
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
          } else {
            charSpan.className = 'replay-char untyped';
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

    const topWithinView = wordTop - container.scrollTop;

    let newScrollTop = null;
    if (topWithinView >= lineHeight) {
      // Kata aktif sudah turun ke baris kedua -> geser satu baris supaya
      // selalu ada satu baris konteks di atasnya.
      newScrollTop = wordTop - lineHeight;
    } else if (topWithinView < 0) {
      // Kata aktif berada di atas viewport (mis. setelah seek/restart).
      newScrollTop = Math.max(0, wordTop);
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
    let idx = 0;
    while (idx < this.playbackTimestamps.length && this.playbackTimestamps[idx] <= targetVirtualTimeMs) idx++;

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

    this._isSeeking = false;
    this._boundOnMouseDown = null;
  }

  initReplayContainer() {
    if (this.isInitialized) return;

    const existingContainer = document.getElementById('replay-container');
    if (existingContainer) {
      this._wireUI(existingContainer);
      this.isInitialized = true;
      return;
    }

    const DOM = {
      scoreHistoryList: document.getElementById('scoreHistoryList'),
    };

    // Panel replay ini HANYA relevan di halaman Riwayat Skor
    // (score-history.html), yang punya #scoreHistoryList. Kalau elemen ini
    // tidak ada (mis. di index.html / halaman tes mengetik), jangan sisipkan
    // apa pun dan JANGAN tandai isInitialized, supaya tidak ada
    // side-effect di halaman lain.
    //
    // Sebelumnya kode ini punya fallback ke `.chart-container` terakhir di
    // halaman, dengan asumsi implisit ada elemen `.chart-container` kedua
    // yang selalu tersembunyi di score-history.html untuk "menampung" panel
    // ini secara tidak terlihat. Begitu duplikat itu dibersihkan (lihat
    // catatan bonus fix di index.html), fallback tsb malah menempelkan
    // panel replay ke `.chart-container` yang AKTIF/terlihat di index.html
    // (area hasil tes mengetik) - itulah kenapa "Tonton Replay Mengetik"
    // sempat nyasar muncul di halaman hasil tes, lengkap dengan
    // WPM/akurasi/waktu 0 karena belum ada skor yang dipilih.
    if (!DOM.scoreHistoryList) {
      return;
    }

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
          <button id="replay-play-btn" class="replay-btn" title="Play/Pause">
            <i class="fas fa-play"></i>
          </button>
          <button id="replay-reset-btn" class="replay-btn" title="Reset">
            <i class="fas fa-redo"></i>
          </button>
        </div>
      </div>
      <div class="replay-stats">
        <div class="replay-stat-item">
          <span class="replay-stat-label">WPM</span>
          <span id="replay-wpm" class="replay-stat-value">0</span>
        </div>
        <div class="replay-stat-item">
          <span class="replay-stat-label">Akurasi</span>
          <span id="replay-accuracy" class="replay-stat-value">0%</span>
        </div>
        <div class="replay-stat-item">
          <span class="replay-stat-label">Waktu</span>
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
    `;

    DOM.scoreHistoryList.before(replayContainer);

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

    const textDisplay = document.getElementById('replay-text-display');
    this.renderer = new TypingRenderer({
      containerEl: textDisplay,
    });

    this.replayer = new TypingPlayer({
      renderer: this.renderer,
      getKeystrokes: () => this.state.replayData?.keystrokes || [],
      getTargetText: () => this.state.replayData?.targetText || '',
      getTotalDurationSec: () => this.state.totalDurationSec,
      getFirstTimestampMs: () => this.state.firstTimestampMs,
      callbacks: {
        onUpdate: (currentTimeMs) => {
          // hook future jika dibutuhkan
        },
        onFinish: () => {
          const timeEl = document.getElementById('replay-time');
          if (timeEl) timeEl.textContent = '0s';
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

    // stop / pause aman
    if (this.replayer) this.replayer.pause();

    this.state.scoreId = scoreId;
    this.state.replayData = score.replayData;

    const keystrokes = this.state.replayData.keystrokes || [];

    // validasi dan build timeline
    this.state.playbackTimestamps = TypingRecorder.computePlaybackTimestamps(keystrokes);
    this.state.firstTimestampMs = TypingRecorder.computeFirstTimestamp(keystrokes);

    // totalDuration: field di data score adalah "time" (sec). fallback 60.
    const t = score.time;
    this.state.totalDurationSec = typeof t === 'number' && Number.isFinite(t) ? t : 60;

    this._updateReplayInfo(score);

    // Load timeline ke player dengan index awal 0
    this.replayer.loadTimeline(this.state.playbackTimestamps, { startIndex: 0 });

    const playBtn = this.playButton;
    if (playBtn) playBtn.disabled = false;
    this._setPlayButtonIcon(false);
  }

  // Sama seperti TypingPlayer.destroy(): tidak dipanggil di alur normal saat
  // ini (replayApp adalah singleton untuk satu halaman), tapi menyediakan
  // jalan keluar eksplisit untuk listener 'resize' dan player-nya.
  destroy() {
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    this.replayer?.destroy();
  }

  _addGlobalListeners() {
    document.addEventListener('click', (e) => {
      const playBtn = e.target.closest('#replay-play-btn');
      const resetBtn = e.target.closest('#replay-reset-btn');

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

    // Seek ke awal = 0
    const timeline = this.state.playbackTimestamps || [];
    this.replayer.currentIndex = 0;
    this.replayer.currentVirtualTimeMs = timeline[0] ?? 0;

    // Nyalakan lagi auto-scroll dan kembalikan scroll ke atas, karena replay
    // dimulai ulang dari awal teks.
    if (this.renderer?.cache) {
      this.renderer.cache.followMode = true;
      this.renderer.cache.lastScrolledWordIdx = -1;
      if (this.renderer.containerEl) {
        this.renderer._setScrollTop(0);
      }
    }

    // Render ulang langsung
    this.replayer.seekVirtualTime(this.replayer.currentVirtualTimeMs, { keepPlaying: false });

    // Reset UI stats
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

  _updateReplayInfo(score) {
    const info = document.getElementById('replay-score-info');
    if (!info) return;

    const date = new Date(score.date).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    info.textContent = `WPM: ${score.wpm} | Akurasi: ${score.accuracy}% | ${date}`;
  }

  _showNoReplayMessage(message) {
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