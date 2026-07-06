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

const DEFAULT_DELAY_CAP_MS = 2000;
const DEFAULT_PLAYBACK_SPEED = 1; // 1 = realtime

// Kecepatan berbasis multiplier:
// setSpeed(0.5) = 2x lebih lambat, setSpeed(2) = 2x lebih cepat.
// Requirement di task menyebut “0.5 s/d 4”; implementasi ini kompatibel (kamu bisa setSpeed(0.5..4)).
const SPEED_MIN = 0.5;
const SPEED_MAX = 4;

const RENDER_BATCH_LIMIT_WORDS = 64; // batas kata yang boleh di-render per frame untuk mencegah frame drop

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

    // Ambil timestamp yang valid. Kita tidak crash jika ada timestamp corrupt.
    const validTimestamps = [];
    for (let i = 0; i < keystrokes.length; i++) {
      const t = keystrokes[i]?.timestamp;
      validTimestamps[i] = typeof t === 'number' && Number.isFinite(t) ? t : null;
    }

    // Cari timestamp pertama yang valid
    let firstValidIdx = 0;
    while (firstValidIdx < validTimestamps.length && validTimestamps[firstValidIdx] === null) firstValidIdx++;
    if (firstValidIdx >= validTimestamps.length) return [];

    // timeline virtual: akumulasi delay antar timestamp yang valid.
    const timeline = new Array(keystrokes.length).fill(0);
    const firstTs = validTimestamps[firstValidIdx];
    let prevTs = firstTs;
    let acc = 0;

    for (let i = firstValidIdx; i < keystrokes.length; i++) {
      const ts = validTimestamps[i];
      if (ts === null) {
        // Timestamp corrupt/blank: kita skip secara aman dengan memakai timestamp sebelumnya.
        timeline[i] = acc;
        continue;
      }

      const rawDelay = ts - prevTs;
      // delay negatif/corrupt -> clamp ke 0
      const delay = Math.min(Math.max(0, rawDelay), DEFAULT_DELAY_CAP_MS);
      acc += delay;
      timeline[i] = acc;
      prevTs = ts;
    }

    // Untuk indeks sebelum firstValidIdx, jadikan 0 (tidak mempengaruhi karena player tidak akan seek ke sana dengan target waktu valid)
    for (let i = 0; i < firstValidIdx; i++) timeline[i] = 0;

    timeline[0] = 0;
    return timeline;
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
    this._suppressNextScrollEvent = false;

    this._attachManualScrollDetection();
  }

  clear() {
    this.containerEl.innerHTML = '';
    this.cache = {
      targetText: '',
      targetWords: [],
      wordElements: [],
      wordTops: [],
      lineHeight: 0,
      lastRenderedWordIdx: -1,
      lastScrolledWordIdx: -1,
      containerBuilt: false,
      followMode: true,
    };
  }

  /**
   * Deteksi scroll manual dari user (wheel, touch drag, drag scrollbar).
   * Begitu terdeteksi, followMode dimatikan supaya auto-scroll tidak
   * menimpa posisi scroll yang sedang dibaca user.
   * followMode dinyalakan lagi otomatis kalau user scroll balik ke dekat
   * baris yang sedang aktif diketik.
   */
  _attachManualScrollDetection() {
    const el = this.containerEl;
    if (!el || el._replayScrollWired) return;
    el._replayScrollWired = true;

    const disableFollow = () => {
      this.cache.followMode = false;
    };

    el.addEventListener('wheel', disableFollow, { passive: true });
    el.addEventListener('touchmove', disableFollow, { passive: true });

    el.addEventListener('scroll', () => {
      if (this._suppressNextScrollEvent) {
        // Ini scroll hasil auto-scroll kita sendiri, abaikan.
        this._suppressNextScrollEvent = false;
        return;
      }
      // Scroll yang bukan dari auto-scroll kita (termasuk drag scrollbar/keyboard).
      this.cache.followMode = false;
      this._maybeResumeFollow();
    }, { passive: true });
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

    if (topWithinView >= 0 && topWithinView < lineHeight * 1.5) {
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
      this._suppressNextScrollEvent = true;
      this.containerEl.scrollTop = 0;
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

      for (let i = 0; i < targetWord.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'replay-char untyped';
        charSpan.textContent = targetWord[i];
        wordSpan.appendChild(charSpan);
      }

      frag.appendChild(wordSpan);
      this.cache.wordElements[wordIdx] = wordSpan;

      if (wordIdx < targetWords.length - 1) {
        const spaceSpan = document.createElement('span');
        spaceSpan.className = 'replay-char space-char untyped';
        spaceSpan.textContent = ' ';
        frag.appendChild(spaceSpan);
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
    this._suppressNextScrollEvent = true;
    this.containerEl.scrollTop = 0;
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

      const wrongExtras = wordEl.querySelectorAll('.wrong-extra');
      for (const el of wrongExtras) el.remove();

      const charSpans = wordEl.querySelectorAll('.replay-char');
      for (const charSpan of charSpans) {
        charSpan.className = 'replay-char untyped';
      }

      const nextEl = wordEl.nextElementSibling;
      if (nextEl && nextEl.classList?.contains('space-char')) {
        nextEl.className = 'replay-char space-char untyped';
      }
    }
  }

  recomputeWordPositionCache() {
    const wordElements = this.cache.wordElements;
    if (!wordElements.length) return;

    // offsetTop/offsetHeight adalah read -> dilakukan sekali
    this.cache.wordTops = wordElements.map((el) => el?.offsetTop ?? 0);
    this.cache.lineHeight = wordElements[0]?.offsetHeight ?? 0;
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
  render({ keystrokes, currentIndex, targetText }) {
    if (!this.containerEl) return;
    if (!Array.isArray(keystrokes)) return;

    const targetWords = this.cache.targetWords;
    if (!targetWords?.length) return;

    const safeIndex = Math.max(0, Math.min(currentIndex, keystrokes.length));
    const currentInput = safeIndex > 0 ? (keystrokes[safeIndex - 1]?.inputState || '') : '';

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

    for (let wordIdx = startIndex; wordIdx <= endIndex; wordIdx++) {
      if (renderedWords >= RENDER_BATCH_LIMIT_WORDS) break;

      const wordEl = this.cache.wordElements[wordIdx];
      if (!wordEl) continue;

      const targetWord = targetWords[wordIdx] ?? '';
      const typedWord = currentWords[wordIdx] ?? '';
      const isCurrentWord = wordIdx === currentWordIdx;

      wordEl.classList.toggle('active-word', isCurrentWord);

      // Hapus extra wrong spans secara aman.
      // (Ini masih DOM op; tapi dibatasi dan dilakukan per word yang berubah.)
      // Hindari querySelectorAll untuk semua frame dengan mengikat ke wordEl saja.
      const wrongExtras = wordEl.querySelectorAll('.wrong-extra');
      for (const el of wrongExtras) el.remove();

      const charSpans = wordEl.querySelectorAll('.replay-char');

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

      // Spasi setelah kata di DOM: elemen berikutnya biasanya space-char
      const nextEl = wordEl.nextElementSibling;
      if (nextEl && nextEl.classList?.contains('space-char')) {
        const isPassed = wordIdx < currentWordIdx;
        nextEl.className = `replay-char space-char ${isPassed ? 'correct' : 'untyped'}`;
      }

      // Auto-scroll (tanpa DOM read)
      if (isCurrentWord && this.cache.lastScrolledWordIdx !== wordIdx) {
        this.ensureScrollSync(wordIdx);
        this.cache.lastScrolledWordIdx = wordIdx;
        this.onActiveWordIndexChange?.(wordIdx);
      }

      renderedWords++;
    }

    this.cache.lastRenderedWordIdx = currentWordIdx;
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
      newScrollTop = wordTop - lineHeight;
    } else if (topWithinView < 0) {
      newScrollTop = Math.max(0, wordTop);
    }

    if (newScrollTop !== null) {
      // Tandai scroll berikutnya sebagai hasil auto-scroll kita sendiri,
      // supaya listener 'scroll' tidak salah mengira ini scroll manual user.
      this._suppressNextScrollEvent = true;
      container.scrollTop = newScrollTop;
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
    this._seeking = false;

    this._lastUpdateReportedMs = -1;
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

    this._seeking = true;

    // cari currentIndex via upper bound linear (aman untuk jumlah keystrokes biasanya < 15k)
    // optimasi bisa binary search, tapi linear cukup aman karena seek jarang.
    let idx = 0;
    while (idx < this.playbackTimestamps.length && this.playbackTimestamps[idx] <= targetVirtualTimeMs) idx++;

    this.currentIndex = Math.min(idx, keystrokes.length);

    // update currentVirtualTimeMs
    const actualVirtual = this.playbackTimestamps[this.currentIndex] ?? targetVirtualTimeMs;
    this.currentVirtualTimeMs = targetVirtualTimeMs;

    // update renderer agar langsung sinkron
    this.renderCurrent();
    this.updateUIStats();
    this.updateProgressUI();
    this.callbacks.onUpdate?.(this.currentVirtualTimeMs);

    // set referensi waktu untuk lanjutan playback
    this.playStartWallTime = performance.now();
    this.playStartVirtualTime = this.currentVirtualTimeMs;

    this._seeking = false;

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
      if (advanced && this.currentIndex % 2000 === 0) {
        // nothing, just keep loop safe
      }
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

  updateProgressUI() {
    const track = document.getElementById('replay-progress-track');
    const progressBar = document.getElementById('replay-progress-bar');
    if (!progressBar || !this.playbackTimestamps?.length) return;

    const totalVirtualTime = this.playbackTimestamps[this.playbackTimestamps.length - 1] || 1;
    const progress = Math.min(100, (this.currentVirtualTimeMs / totalVirtualTime) * 100);

    progressBar.style.width = `${progress}%`;
    const handle = document.getElementById('replay-progress-handle');
    if (handle) handle.style.left = `${progress}%`;
  }

  finish() {
    this.isPlaying = false;
    this._updatePlayButton(false);

    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;

    // pastikan waktu 0s di UI
    this.currentIndex = this.getKeystrokes().length;
    this.currentVirtualTimeMs = this.playbackTimestamps[this.playbackTimestamps.length - 1] ?? 0;

    this.updateUIStats();
    this.updateProgressUI();

    this.callbacks.onFinish?.();
  }

  _updatePlayButton(isPlaying) {
    if (!this.ui?.playButton) return;
    const btn = this.ui.playButton;
    const icon = btn.querySelector('i');
    if (icon) icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
  }

  _handleVisibilityChange() {
    // Akurasi: jika tab disembunyikan, pause supaya wall clock tidak membuat targetVirtualTime lompat saat kembali.
    if (document.visibilityState === 'hidden') {
      // simpan currentVirtualTime dengan pause() formula
      this.pause();
      return;
    }
    // Jika kembali visible dan tadinya paused karena hidden, kita resume? (pilih behavior aman: resume otomatis)
    // Namun requirement hanya mencegah loncatan: aman melakukan resume.
    // Untuk menghindari race, hanya resume jika sempat playing sebelumnya.
    // Kita deteksi dengan flag: jika isPlaying sudah false karena pause, kita resume.
    if (this.ui?.autoResumeOnVisible) {
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

    // Hapus container duplikat
    const dups = document.querySelectorAll('#replay-container');
    dups.forEach((el) => el.remove());

    const DOM = {
      scoreHistoryList: document.getElementById('scoreHistoryList'),
    };

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

    const chartContainers = document.querySelectorAll('.chart-container');
    if (chartContainers.length > 0) {
      chartContainers[chartContainers.length - 1].after(replayContainer);
    } else if (DOM.scoreHistoryList) {
      DOM.scoreHistoryList.before(replayContainer);
    }

    this._wireUI(replayContainer);
    this.isInitialized = true;

    if (!this.eventListenersAdded) {
      this._addGlobalListeners();
      this.eventListenersAdded = true;
    }

    // Resize cache word positions
    let resizeDebounceId = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeDebounceId);
      resizeDebounceId = setTimeout(() => {
        this.renderer?.recomputeWordPositionCache();
        // render ulang jika ada aktif state
        if (this.state.replayData) this.renderer?.render({
          keystrokes: this.state.replayData.keystrokes || [],
          currentIndex: this.replayer?.currentIndex || 0,
          targetText: this.state.replayData.targetText || ''
        });
      }, 150);
    });
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
    const scores = JSON.parse(localStorage.getItem('typingScores') || '[]');
    const score = scores?.[scoreId];

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
        this.renderer._suppressNextScrollEvent = true;
        this.renderer.containerEl.scrollTop = 0;
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
    const btn = document.getElementById('replay-play-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    if (icon) icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
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