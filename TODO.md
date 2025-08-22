# TODO - Perbaikan UI TypingCore

## ✅ **Perubahan yang Telah Dilakukan:**

### 1. **js/game/game-events.js**
- [x] Memastikan logo muncul dengan `window.triggerLogoPop()` saat mengetik dimulai
- [x] Memastikan speedometer muncul dengan `showStatsContainer()` saat mengetik dimulai
- [x] Memastikan header, menu button, restart button hilang dengan kelas `hidden`

### 2. **js/game/game-logic.js**
- [x] Memastikan logo dan speedometer hilang saat restart dengan `hideStatsContainer()` dan `window.resetLogoPop()`
- [x] Memastikan header, menu button, restart button muncul kembali saat restart
- [x] Memastikan logo dan speedometer hilang saat test selesai (sudah ada di fungsi `endTest()`)

### 3. **js/game/game-events.js (Update Terbaru)**
- [x] Menambahkan fungsi `handleMouseMove()` untuk mendeteksi pergerakan mouse
- [x] Menambahkan event listener `mousemove` pada document
- [x] Memperbaiki logika: saat mouse bergerak selama mengetik, logo dan speedometer muncul kembali
- [x] Memastikan header/menu/restart button tetap tersembunyi selama mengetik aktif

### 4. **js/main.js**
- [x] Memastikan logo dan speedometer hilang saat pointer bergerak (fungsi lama)
- [x] Memastikan header, menu button, restart button muncul kembali saat pointer bergerak (fungsi lama)

## 🔄 **Status Saat Ini:**
Semua perubahan utama telah diterapkan. Perlu dilakukan testing untuk memverifikasi bahwa semua fungsi bekerja sesuai dengan yang diharapkan.

## 🧪 **Testing yang Perlu Dilakukan:**
1. **Mulai Mengetik**: Logo dan speedometer harus muncul, header/menu/restart button harus hilang
2. **Pointer Bergerak**: Logo dan speedometer harus muncul kembali, header/menu/restart button tetap tersembunyi
3. **Restart Test**: Logo dan speedometer harus hilang, header/menu/restart button harus muncul
4. **Selesai Mengetik**: Logo dan speedometer harus hilang (otomatis melalui fungsi endTest)

## 📝 **Catatan:**
- Fungsi `endTest()` sudah memiliki logika untuk menyembunyikan logo dan speedometer
- Fungsi `resetTestState()` telah dimodifikasi untuk menangani tampilan UI saat restart
- Event listener mousemove telah diperbaiki untuk menangani tampilan UI saat pointer bergerak
