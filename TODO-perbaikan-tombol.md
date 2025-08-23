# TODO - Perbaikan Tombol Waktu dan Pemilihan Kata

## Masalah:
- Tombol waktu 120 dan 180 detik tidak berfungsi
- Tombol pemilihan kata (top 200, 1000, 10000 words) tidak berfungsi

## Langkah Perbaikan:
1. [x] Analisis kode dan identifikasi masalah
2. [ ] Perbaiki event listener di main.js
3. [ ] Tambahkan logging untuk debugging
4. [ ] Test di browser http://127.0.0.1:5500
5. [ ] Verifikasi perbaikan berhasil

## File yang Diedit:
- js/main.js

## Catatan:
- Event listener menggunakan document.querySelectorAll yang mungkin tidak menemukan elemen
- Perlu memastikan DOM sudah siap sebelum menambahkan event listener
- Tambahkan console.log untuk memastikan event listener terpanggil
