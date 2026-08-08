# TODO: Revisi Caret Comet (Ekor Memanjang Sesuai Kecepatan)

## Ringkasan Masalah Saat Ini
- Ekor comet hanya reaktif terhadap kecepatan ketika **Smooth Caret** aktif
  (`.smooth-caret.mode-comet`). Saat Smooth Caret "off", dipakai fallback
  `.has-cursor::after` yang ekornya **statis** (3 box-shadow tetap di
  -5px/-10px/-15px), tidak pernah membaca `--caret-speed`.
- Ekor berbentuk 3 "titik" box-shadow terpisah yang jaraknya melebar saat
  cepat — bukan gradasi/ekor menyambung yang benar-benar memanjang.
- `--caret-speed` di-set langsung lewat `el.style.setProperty(...)` tanpa
  transisi, jadi panjang ekor berubah "patah-patah" per keystroke, bukan
  animasi halus.
- Tidak ada peluruhan (decay): begitu berhenti mengetik, ekor nyangkut di
  panjang terakhir sampai keystroke berikutnya, bukannya menyusut pelan.
- Tidak ada logika arah: ekor selalu ke arah yang sama meski mundur
  (backspace), jadi tampilannya bisa terbalik/aneh saat menghapus.

## Tujuan Revisi
Ekor caret comet harus muncul begitu caret bergerak, memanjang secara halus
sebanding dengan kecepatan gerak (bukan lompatan diskrit), memudar/menyusut
mulus saat berhenti mengetik, konsisten baik saat Smooth Caret aktif maupun
tidak, dan mengarah sesuai arah gerak caret (maju/mundur).

---

## 1. `text-display.js`

- [ ] **Satukan logika kecepatan** ke satu fungsi util (mis. `updateCaretSpeed(el, targetRect)`)
      yang dipanggil dari dua tempat: `positionSmoothCaret()` (mode Smooth Caret
      aktif) DAN dari path fallback non-smooth (lihat blok `has-cursor`/`cursor-before`/
      `cursor-after` di `updateWordHighlighting()`, sekitar baris 824–886) — supaya
      elemen `.has-cursor::after` juga menerima `--caret-speed` lewat CSS var yang
      di-set ke elemen karakter aktif (`targetEl.style.setProperty('--caret-speed', ...)`),
      bukan hanya ke `.smooth-caret`.
- [ ] **Perbaiki metrik kecepatan**: saat ini `speedFactor` dihitung murni dari
      selisih waktu antar keystroke (`dt`). Tambahkan juga jarak piksel antar posisi
      caret lama vs baru (pakai `getBoundingClientRect()` sebelum/sesudah), lalu hitung
      velocity = jarak / waktu, supaya kecepatan lebih akurat merepresentasikan
      gerakan visual caret, bukan hanya ritme ketik.
- [ ] **Tambahkan decay/peluruhan saat idle**: buat loop kecil (mis. `requestAnimationFrame`
      atau `setInterval` ringan ~16–33ms) yang menurunkan `--caret-speed` menuju 0
      secara bertahap ketika tidak ada keystroke baru dalam X ms (mis. 150–250ms),
      lalu hentikan loop begitu nilainya sudah 0 (jangan jalan terus-menerus demi
      performa). Loop ini harus dibatalkan/direset setiap ada keystroke baru.
- [ ] **Tambahkan deteksi arah gerak** (maju vs mundur, misal saat backspace atau
      klik-pindah kursor manual): simpan posisi/index caret sebelumnya, bandingkan
      dengan yang baru, lalu set atribut/kelas (mis. `data-caret-direction="forward"`
      atau `"backward"`) ke `.smooth-caret` / elemen `has-cursor` aktif, supaya CSS
      bisa membalik arah ekor (`transform: scaleX(-1)` atau ganti sisi offset)
      ketika arah mundur.
- [ ] Pastikan pemanggilan `hideSmoothCaret()` (mis. saat `isTestInvalid` atau ganti
      kata) juga mereset/menghentikan loop decay di atas supaya tidak ada timer yang
      "nyangkut" dan terus jalan setelah caret disembunyikan.
- [ ] Cek ulang bagian `getOrCreateSmoothCaret()` (baris ~227): kalau opsi desain di
      CSS memilih pendekatan "elemen ekor terpisah" (lihat opsi B di bagian CSS di
      bawah) daripada box-shadow, tambahkan pembuatan elemen anak `.caret-tail` di
      sini juga (satu kali, lalu di-reuse — ikuti pola cache yang sudah ada).

## 2. `text-display.css`

- [ ] **Daftarkan `--caret-speed` sebagai custom property bertipe angka** via
      `@property --caret-speed { syntax: '<number>'; inherits: true; initial-value: 0; }`
      di bagian atas file (dekat variabel caret lain). Ini penting supaya perubahan
      nilainya bisa di-*transition* oleh browser (custom property biasa tidak bisa
      animasi halus tanpa ini).
- [ ] Tambahkan `transition: --caret-speed 150ms ease-out;` (atau lewat properti yang
      memakainya, mis. `width`/`transform`) pada elemen ekor comet, supaya perubahan
      kecepatan terasa mulus, bukan patah-patah.
- [ ] **Ganti pendekatan ekor** dari 3 box-shadow diskrit ke salah satu opsi berikut
      (pilih satu, dokumentasikan alasan di komentar CSS):
  - **Opsi A (lebih ringan, tetap box-shadow tapi digabung jadi gradasi semu):**
    tambah lebih banyak "step" box-shadow dengan opacity makin turun dan jarak makin
    rapat mendekati caret, agar terlihat lebih menyatu (bukan solusi ideal tapi
    minim perubahan struktur).
  - **Opsi B (direkomendasikan): elemen ekor terpisah** — pseudo-element `::before`
    atau child element `.caret-tail` dengan `background: linear-gradient(to right,
    transparent, var(--caret-trail-strong))`, `transform-origin` di sisi caret, dan
    `width: calc(<base>px + <multiplier>px * var(--caret-speed, 0))` supaya ekor
    benar-benar berupa gradasi menyambung yang memanjang, bukan titik-titik terpisah.
    Tambahkan `filter: blur(1px)` tipis agar ujungnya lembut seperti ekor komet asli.
- [ ] Tambahkan versi CSS yang sama untuk **kedua jalur**:
  `.smooth-caret.mode-comet` (Smooth Caret aktif) **dan**
  `[data-cursor-mode="comet"] .has-cursor.cursor-before::after` /
  `.has-cursor.cursor-after::after` (Smooth Caret nonaktif) — supaya perilaku ekor
  konsisten di kedua mode, sesuai temuan masalah di atas.
- [ ] Tambahkan aturan pembalik arah, mis.
      `.smooth-caret.mode-comet[data-caret-direction="backward"] { transform: scaleX(-1); }`
      (menyesuaikan dengan atribut yang ditambahkan di `text-display.js`).
- [ ] **Batasi panjang maksimum ekor** dengan `min()` (mis. `width: min(60px, calc(...))`)
      supaya ketikan sangat cepat/burst tidak membuat ekor keluar dari area teks atau
      terlihat berlebihan.
- [ ] Pastikan ekor **transparan/hilang total** saat `--caret-speed` = 0 (idle), bukan
      cuma pendek — cek opacity di ujung gradient sudah 0.

## 3. `theme.css`

- [ ] (Opsional, kalau perlu kontrol desain lebih halus) tambahkan variabel baru,
      mis. `--caret-trail-max-length` atau `--caret-trail-blur`, supaya panjang
      maksimum & blur ekor comet bisa disetel terpusat per tema (light/dark) tanpa
      mengubah CSS mode comet itu sendiri.
- [ ] Cek ulang bahwa `--caret-trail-strong` / `--caret-trail-medium` / `--caret-trail-soft`
      (baris 50–52) masih relevan dipakai sebagai *color stop* di gradient baru
      (Opsi B di atas) — kalau pendekatan gradient dipakai, kemungkinan cukup 1–2
      warna saja (strong → transparent) sehingga variabel `-medium`/`-soft` bisa
      jadi tidak terpakai lagi dan boleh dihapus atau digabung.

## 4. `dom-elements.js`

- [ ] Tidak ada perubahan struktural yang wajib di sini — elemen caret dibuat secara
      dinamis di `text-display.js` (`getOrCreateSmoothCaret`), bukan lewat modul ini.
      Cukup **verifikasi**: kalau Opsi B (elemen `.caret-tail` terpisah) dipilih dan
      elemen tersebut butuh direset saat halaman/game di-rebuild, pastikan
      `resetGameDOMCache()` / `resetLessonDOMCache()` tetap dipanggil di tempat yang
      sudah ada (tidak perlu menambah elemen baru ke `cachedGameDOM`/`cachedLessonDOM`
      karena caret bukan bagian dari referensi yang di-cache di sini).

## 5. `settings-panel.js`

- [ ] Tidak ada perubahan wajib untuk revisi inti ini.
- [ ] (Opsional / nice-to-have) kalau ingin user bisa mengatur intensitas efek,
      tambahkan opsi baru di panel pengaturan (mis. slider/radio "Panjang Ekor Comet:
      Pendek/Sedang/Panjang") yang menyimpan ke `localStorage` (pola sama seperti
      `caretSmoothness`, baris ~144–145 & ~362–377) dan di-map ke variabel
      `--caret-trail-max-length` di `theme.css`.

## 6. `style.css`

- [ ] Cek tidak ada aturan global (mis. `overflow: hidden` pada container caret
      overlay) yang akan memotong ekor baru yang lebih panjang dari sebelumnya.
      Fokus cek area `.caret-overlay` (didefinisikan di `text-display.css` tapi
      pastikan parent-nya di `style.css`/`index.html` tidak clip).

---

## Urutan Pengerjaan yang Disarankan
1. `text-display.css` — daftarkan `@property --caret-speed`, buat versi baru ekor
   (Opsi A/B), terapkan ke kedua jalur (smooth & non-smooth).
2. `text-display.js` — satukan logika `updateCaretSpeed`, terapkan ke jalur
   non-smooth, tambahkan decay loop, tambahkan deteksi arah.
3. `theme.css` — sesuaikan/rapikan variabel warna ekor sesuai pendekatan final.
4. Uji manual: Smooth Caret ON vs OFF, ketik cepat vs lambat, backspace, ganti tema
   light/dark, dan pastikan tidak ada memory leak dari timer decay (cek lewat
   DevTools Performance saat idle lama).
