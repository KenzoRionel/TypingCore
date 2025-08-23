
# TODO: Ubah Sumbu X Chart Menjadi Total Waktu

## Tujuan
Mengubah sumbu x pada result chart dari urutan kata menjadi total waktu yang dipilih user

## File yang Perlu Diubah
- [x] js/history/result-chart.js (utama)
- [x] js/game/game-logic.js (tidak perlu perubahan, data waktu sudah tersedia)

## Langkah-langkah

### 1. js/history/result-chart.js
- [x] Hitung waktu kumulatif untuk setiap titik data
- [x] Ubah labels dari urutan kata menjadi waktu dalam detik
- [x] Update konfigurasi sumbu x untuk format waktu
- [x] Sesuaikan callback function untuk ticks

### 2. js/game/game-logic.js
- [x] Pastikan data waktu tersedia dengan benar di history (sudah tersedia: startTime, endTime, durationMs)
- [x] Verifikasi tidak ada breaking changes

## Progress
- [x] Analisis kode selesai
- [x] Rencana disetujui
- [x] Implementasi perubahan
- [x] Testing dan verifikasi
