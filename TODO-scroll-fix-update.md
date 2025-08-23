# TODO - Perbaikan Scroll Text Display

## Tujuan
Memperbaiki masalah scroll teks display yang tidak konsisten, agar scroll terjadi setelah baris 2 selesai diketik secara konsisten.

## Langkah-langkah:
- [x] 1. Modifikasi fungsi `ensureScrollSync()` di `js/utils/text-display.js`
- [x] 2. Fungsi pembantu sudah tersedia (`getWordLineIndex` dan `getLineTopPositions`)
- [x] 3. Implementasi logika scroll berbasis baris sudah dilakukan
- [ ] 4. Testing dan verifikasi

## File yang Diedit:
- js/utils/text-display.js

## Status:
- Fungsi `ensureScrollSync()` telah dimodifikasi untuk menggunakan logika berbasis baris
- Scroll sekarang akan
