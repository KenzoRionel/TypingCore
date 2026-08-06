// js/game/game-state.js

export const gameState = {
    fullTextWords: [],
    typedWordIndex: 0,
    correctChars: 0,
    incorrectChars: 0,
    startTime: null,
    timerInterval: null,
    updateStatsInterval: null,
    isTypingActive: false,
    totalCorrectWords: 0,
    totalIncorrectWords: 0,
    typedWordCorrectness: [],
    userTypedWords: [],
    TIMED_TEST_DURATION: 60,
    timeRemaining: 60,
    statsMode: 'speedometer',
    // Properti baru untuk rendering dinamis per baris
    lines: [], 
    currentLineIndex: 0, 

    INITIAL_WORD_BUFFER: 100,
    MAX_OVERTYPED_CHARS_HIGHLIGHT: 5,
    cursorMode: 'highlight',
    
    history: [],
    currentVisibleLines: 0, // Baris yang sedang ditampilkan
    lineBufferSize: 100, // Jumlah baris buffer di depan
    totalRenderedLines: 0, // Total baris yang telah dirender

    inactivityTimer: null,
    isTestInvalid: false,

    // Properti baru:
    RENDERED_LINE_BUFFER: 3, // Jumlah baris yang akan dirender di awal dan setiap kali scroll
    
    // Replay data recording
    keystrokeLog: [],
    correctCharsPerSecond: [],
    fullText: '', // Store the full text being typed

    // Latihan kata yang salah (wrong-words practice mode)
    practiceMode: false, // true = generateAndAppendWords() memakai practiceWords, bukan window.defaultKataKata
    practiceWords: [], // daftar kata (dengan pengulangan berbobot sesuai frekuensi salah) untuk mode latihan
    previousWordSet: null, // snapshot window.defaultKataKata sebelum mode latihan dimulai (dipakai baik oleh
                            // practiceMode MAUPUN ghostMode, karena keduanya tidak pernah aktif bersamaan),
                            // untuk dipulihkan nanti.

    // Latihan "Ghost Caret" (ulangi teks sesi sebelumnya + bayangan caret dari sesi itu)
    ghostMode: false, // true = generateAndAppendWords() memakai ghostWords (bukan random), bukan window.defaultKataKata
    ghostData: null, // replayData mentah (targetText + keystrokes) dari sesi tes TERAKHIR yang selesai
    ghostWords: [], // ghostData.targetText.split(' ') - urutan kata PERSIS sama seperti sesi sebelumnya
    ghostTimeline: [], // array ms virtual (hasil computeGhostTimeline), sejajar index dengan ghostData.keystrokes
    ghostCurrentIndex: 0, // index keystroke ghost yang sedang "ditunjuk" oleh ghost caret saat ini
    ghostInterval: null, // interval id yang memajukan ghostCurrentIndex mengikuti waktu tes berjalan
    ghostFromQuote: false, // true jika ghost mode dimulai dari sesi Quotes — ghostWords berhenti
                            // total tanpa fallback. false jika dari mode waktu — boleh fallback random.

    // Mode teks latihan "Quotes": BEDA dari practiceMode/ghostMode (yang
    // hanya aktif untuk satu sesi latihan lalu otomatis mati), quoteMode
    // adalah pilihan MODE yang persist sampai user mematikannya sendiri lewat
    // tombol Quotes (sejajar tombol waktu) - resetTestState() TIDAK mematikan
    // quoteMode secara otomatis, hanya mengosongkan buffer teksnya supaya
    // urutan quote dimulai ulang dari acak setiap kali tes direset.
    quoteMode: false, // true = generateAndAppendWords() mengambil kata dari quoteWordBuffer (quote sungguhan), bukan random dari window.defaultKataKata
    quoteWordBuffer: [], // daftar kata hasil split dari satu/lebih quote yang sudah "dituangkan" berurutan, tumbuh sesuai kebutuhan buffer
    quoteAuthorMarks: [], // [{ atIndex, author, text }] - penanda index awal tiap quote di dalam quoteWordBuffer, dipakai untuk menampilkan nama sumber/author quote yang sedang aktif diketik

    // Mode "Punctuation": TOGGLE persist (mirip quoteMode) yang menambahkan
    // ~30% tanda baca (koma/titik/dll) ke kata-kata acak, TAPI teksnya tetap
    // dihasilkan dari window.defaultKataKata/practiceWords seperti biasa dan
    // tetap memakai mode waktu (timer hitung mundur) - beda dari quoteMode
    // yang mengganti seluruh sumber teks & memakai stopwatch naik. Mutually
    // exclusive dengan quoteMode (lihat main.js): mengaktifkan salah satu
    // mematikan yang lain.
    punctuationMode: false,
    // true jika kata berikutnya adalah awal kalimat baru (huruf pertama
    // dikapitalisasi) - persist antar panggilan generateAndAppendWords()
    // karena buffer kata dihasilkan bertahap per-chunk, bukan sekaligus.
    punctuationSentenceStart: true,
    // Peluang sebuah kata diberi tanda baca (0.0 - 1.0). Diisi dari
    // localStorage ('punctuationChance', dalam persen) yang diatur user di
    // settings.html, supaya nilai sudah benar SEJAK modul dimuat - tidak
    // bergantung pada urutan panggilan initSettingsPanel()/resetTestState()
    // di main.js. Default 30% (0.3) jika belum pernah diatur.
    punctuationChance: (() => {
      let raw = null;
      try {
        raw = localStorage.getItem("punctuationChance");
      } catch (e) {}
      const value = raw === null ? NaN : parseFloat(raw);
      return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) / 100 : 0.3;
    })(),
};

window.gameState = gameState;