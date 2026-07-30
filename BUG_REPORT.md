# Laporan Bug & Masalah - TypingCore

## 🔴 CRITICAL BUGS

### 1. Duplikasi `resultsDisplayArea` di `index.html`
**File:** `index.html`  
**Baris:** ~200 (pertama) dan ~254 (kedua)  
**Deskripsi:** Ada DUA elemen dengan `id="resultsDisplayArea"` di halaman yang sama. `document.getElementById()` hanya mengembalikan elemen pertama, sehingga elemen kedua tidak pernah digunakan. Ketika tes selesai, konten hasil hanya muncul di satu tempat, dan elemen lainnya tetap `display: none`.
**Dampak:** Tampilan hasil tes tidak konsisten. Ada markup duplikat yang membingungkan.

### 2. Duplikasi ID pada Elemen Hasil di `index.html`
**File:** `index.html`  
**ID yang duplikat:** `finalWPM`, `finalAccuracy`, `finalTime`, `finalChars`, `finalConsistency`  
**Deskripsi:** ID unik HTML digunakan dua kali:
- `finalWPM` ada di `.mini-result-stats` DAN di `.summary-main`
- `finalAccuracy` ada di `.mini-result-stats` DAN di `.summary-main`
- `finalTime` ada di `.xp-bar-container` DAN di `.summary-details`
- `finalChars` ada dua kali
- `finalConsistency` ada dua kali

`document.getElementById()` hanya mengembalikan elemen **pertama**. Ketika `calculateAndDisplayFinalResults()` memperbarui nilai, hanya elemen pertama yang berubah.
**Dampak:** Pengguna melihat nilai " — " pada beberapa area hasil karena elemen kedua tidak pernah di-update.

### 3. Duplikasi History Entry Setiap Spasi
**Files:** `js/game/game-logic.js` (`processTypedWord`) dan `js/game/game-events.js` (`handleKeydown`)  
**Deskripsi:** Setiap kali user menekan spasi:
1. `processTypedWord()` dipanggil → push 1 entry ke `gameState.history`
2. Setelah itu, di `handleKeydown()` ada **push lagi** ke `gameState.history` dengan format berbeda

Ini menghasilkan **2 entry sekaligus** untuk setiap kata yang diketik.
**Dampak:** Data history menjadi dobel. Grafik hasil (result chart) dan statistik panel menampilkan data yang tidak akurat karena entry terhitung dua kali.

### 4. Overwrite Fungsi `window.saveScore` - Parameter `language` Hilang
**Files:** `js/common-script.js` vs `js/history/score-manager.js`  
**Deskripsi:** 
- `common-script.js` (non-module, script biasa): `saveScore(wpm, accuracy, time, errors, type, mode, correctWords, incorrectWords, replayData)` — **TANPA `language`**
- `score-manager.js` (ES module): `saveScore(wpm, accuracy, time, errors, type, mode, correctWords, incorrectWords, replayData, language)` — **DENGAN `language`**

Karena `common-script.js` di-load tanpa `type="module"` dan meng-assign ke `window.saveScore` langsung, sedangkan `score-manager.js` adalah module yang juga meng-assign ke `window.saveScore`, fungsi dari `common-script.js` bisa menimpa fungsi dari module.
**Dampak:** Parameter `language` tidak pernah tersimpan ke localStorage. Semua skor tersimpan dengan language default atau undefined.

### 5. Event Listener `mousemove` Saling Bertentangan
**Files:** `js/main.js` dan `js/game/game-events.js`  
**Deskripsi:** Ada DUA event listener `mousemove`:
- Di `main.js`: **menyembunyikan** stats, mereset logo, set `isTypingActive = false`
- Di `game-events.js` `handleMouseMove`: **menampilkan** stats, memicu logo saat `isTypingActive && startTime`

Kedua listener terdaftar di `document` dan akan dijalankan berurutan. Hasil akhir tergantung urutan eksekusi, menyebabkan perilaku yang tidak konsisten — kadang stats muncul, kadang tidak.
**Dampak:** Pengalaman mengetik tidak konsisten. Speedometer dan logo muncul/hilang secara tidak terduga saat mouse bergerak.

---

## 🟠 HIGH BUGS

### 6. Triple Assignment WPM/Accuracy di `updateRealtimeStats()`
**File:** `js/game/game-logic.js` (baris ~140-150)  
**Deskripsi:** Ada tiga blok assignment untuk `DOM.wpmDisplay` dan `DOM.accuracyDisplay`:
```javascript
if (DOM.wpmDisplay) DOM.wpmDisplay.textContent = displayWPM;
if (DOM.accuracyDisplay) DOM.accuracyDisplay.textContent = displayAcc;
// ... kode lain ...
if (DOM.wpmDisplay) DOM.wpmDisplay.textContent = String(Math.round(gameState.smootherWPM));
if (DOM.accuracyDisplay) DOM.accuracyDisplay.textContent = `${accuracyPercent}%`;
```
Baris pertama dan terakhir melakukan SET yang sama, menyebabkan baris pertama mubazir.
**Dampak:** Wasted CPU cycles pada setiap update (setiap 100ms). Minor performance issue.

### 7. Format Inkonsisten pada `gameState.history`
**Files:** `js/game/game-logic.js` dan `js/game/game-events.js`  
**Deskripsi:** Ada dua format objek yang berbeda di-push ke array yang sama:
- `processTypedWord()` push: `{ word, typed, correct, errorCount, correctCount, startTime, endTime, durationMs, errorPerSecond }`
- `handleKeydown()` push: `{ wpm, rawWpm, errors, correct, errorPercentage }`

Akibat duplikasi di Bug #3, array berisi campuran kedua format ini.
**Dampak:** `result-chart.js` dan `statistics-panel.js` yang membaca array ini bisa mendapatkan data undefined/null untuk field yang diharapkan.

### 8. `finalRawWPM` Tidak Ada di Markup (Elemen Pertama)
**File:** `index.html` dan `js/game/game-logic.js`  
**Deskripsi:** `calculateAndDisplayFinalResults()` mencari `finalRawWPM` via `document.getElementById()`, tapi elemen ini hanya ada di `resultsDisplayArea` yang KEDUA (yang tersembunyi). Elemen pertama tidak memiliki `finalRawWPM`.
**Dampak:** Nilai RAW WPM tidak pernah tampil ke pengguna meskipun sudah dihitung.

---

## 🟡 MEDIUM BUGS

### 9. Perfoma: `getBoundingClientRect()` di Setiap Keystroke
**File:** `js/utils/text-display.js`  
**Fungsi:** `updateWordHighlighting()` → `lockTextDisplayHeightTo3Lines()` → `getBoundingClientRect()`  
**Deskripsi:** Setiap kali user mengetik, fungsi `updateWordHighlighting()` dipanggil, yang memanggil `lockTextDisplayHeightTo3Lines()`, yang memanggil `getBoundingClientRect()` untuk `word-0`. Ini memicu forced layout/reflow di browser.
**Dampak:** Pada perangkat low-end atau dengan banyak kata, bisa menyebabkan lag/stutter saat mengetik cepat.

### 10. Potensi QuotaExceededError dari KeystrokeDetails
**File:** `js/game/game-logic.js`  
**Deskripsi:** `keystrokeDetails` menyimpan objek besar per stroke. Test 60 detik dengan ~300 stroke bisa menghasilkan data besar yang disimpan ke localStorage. Meskipun ada `cleanupOldScores`, ukuran per entry bisa cukup besar hingga melebihi kuota (5-10MB).
**Dampak:** Skor tidak bisa disimpan, user mendapat alert "Penyimpanan penuh".

### 11. Double Event Listener `statisticsButton`
**File:** `js/history/statistics-panel.js` dan `js/game/game-logic.js`  
**Deskripsi:** `initStatisticsPanel()` dipanggil di `initGameListeners()`, yang dipanggil di `main.js`. Jika fungsi ini dipanggil lebih dari sekali (misal dari side effect), event listener `click` pada `statisticsButton` akan terdaftar dua kali, menyebabkan panel toggle dua kali saat diklik.
**Dampak:** Panel statistik terbuka dan langsung tertutup (atau sebaliknya) saat tombol diklik.

### 12. Deteksi Caps Lock Tidak Selalu Akurat
**File:** `js/game/game-events.js`  
**Deskripsi:** `e.getModifierState('CapsLock')` digunakan untuk deteksi Caps Lock. Meskipun didukung browser modern, ada edge case di beberapa browser/sistem operasi yang tidak mengupdate state ini dengan benar.
**Dampak:** Indikator Caps Lock di keyboard virtual mungkin tidak sinkron dengan status sebenarnya.

---

## 🔵 LOW BUGS

### 13. File Gambar dengan Ekstensi Aneh
**Folder:** `img/`  
**File:** `a;.svg`, `target-a;.svg`, `test-a;.svg` (menggunakan titik koma `;` bukan titik `.`)  
**Deskripsi:** Ada file gambar dengan format nama tidak biasa (`.svg` dieja dengan `;` bukan titik). Ini bisa jadi typo atau file yang salah nama.
**Dampak:** Jika file-file ini direferensikan di kode, browser tidak akan bisa memuatnya.

### 14. Array `top10000Words` Tidak Lengkap
**File:** `js/data/default-words.js`  
**Deskripsi:** Array `top10000Words` hanya berisi sekitar 450-500 kata, bukan 10.000 seperti yang dijanjikan nama variabelnya.
**Dampak:** Tidak ada error fungsional, tapi nama variabel menyesatkan.

### 15. `inactivityTimer` Tanpa Validasi Awal
**File:** `js/main.js` (visibilitychange handler)  
**Deskripsi:** Kondisi `if (DOM && document.hidden && gameState.startTime && !gameState.isTestInvalid && gameState.inactivityTimer)` mengakses `gameState.startTime` dan `gameState.inactivityTimer` tanpa null check.
**Dampak:** Jika `gameState` belum diinisialisasi saat event `visibilitychange` dipicu, akan terjadi ReferenceError.

---

## Ringkasan Dampak ke Pengalaman Mengetik

| No | Bug | Dampak ke User |
|----|-----|----------------|
| 1 | Duplikasi hasil area | UI kacau, hasil tidak konsisten |
| 2 | Duplikasi ID elemen | Nilai hasil tidak muncul di beberapa tempat |
| 3 | History dobel | Grafik dan statistik hasil tidak akurat |
| 4 | Language hilang | Fitur multi-bahasa tidak berfungsi |
| 5 | Mouse handler konflik | Speedometer muncul/hilang tak terduga |
| 6 | Triple assignment | Minor performance hit |
| 7 | Format history inkonsisten | Panel statistik error/null |
| 8 | RAW WPM tidak tampil | Fitur RAW WPM tidak berguna |
| 9-10 | Performa | Lag pada device lambat / storage penuh |
| 11 | Double listener | Panel statistik error |

