// common-script.js

// Definisikan array kata-kata dalam Bahasa Indonesia secara global
window.defaultKataKata = [
    "dan", "yang", "untuk", "dengan", "adalah", "tidak", "pada", "saya", "itu",
    "ini", "mereka", "kita", "kamu", "dia", "dari", "ke", "di", "akan", "telah",
    "bisa", "harus", "sudah", "belum", "lagi", "lebih", "paling", "sangat",
    "seperti", "jika", "maka", "atau", "namun", "tetapi", "serta", "yaitu",
    "karena", "sehingga", "meskipun", "walaupun", "saat", "ketika", "setelah",
    "sebelum", "sampai", "hingga", "selama", "antara", "melalui", "terhadap",
    "menurut", "bagi", "oleh", "pada", "dalam", "luar", "atas", "bawah", "depan",
    "belakang", "samping", "tengah", "ujung", "pangkal", "dasar", "puncak",
    "tinggi", "rendah", "besar", "kecil", "panjang", "pendek", "berat", "ringan",
    "cepat", "lambat", "kuat", "lemah", "baru", "lama", "tua", "muda", "baik",
    "buruk", "indah", "jelek", "bersih", "kotor", "kaya", "miskin", "gelap",
    "terang", "dingin", "panas", "kering", "basah", "ramai", "sepi", "senang",
    "sedih", "marah", "takut", "cinta", "benci", "suka", "tidak", "mau", "pergi",
    "datang", "ambil", "beri", "lihat", "dengar", "rasa", "sentuh", "cium",
    "makan", "minum", "tidur", "bangun", "duduk", "berdiri", "jalan", "lari",
    "lompat", "terbang", "berenang", "bicara", "tulis", "baca", "hitung",
    "gambar", "main", "kerja", "belajar", "ajar", "cari", "temu", "jual", "beli",
    "buka", "tutup", "masuk", "keluar", "naik", "turun", "hidup", "mati", "pagi",
    "siang", "sore", "malam", "hari", "minggu", "bulan", "tahun", "jam", "menit",
    "detik", "sekarang", "nanti", "kemarin", "besok", "dulu", "kemudian", "akhir",
    "awal", "tujuan", "arah", "tempat", "waktu", "jumlah", "bagian", "jenis",
    "warna", "bentuk", "ukuran", "suara", "cahaya", "udara", "air", "tanah",
    "api", "angin", "hujan", "salju", "kabut", "awan", "matahari", "bulan",
    "bintang", "langit", "bumi", "laut", "gunung", "sungai", "pulau", "desa",
    "kota", "negara", "dunia", "manusia", "hewan", "tumbuhan", "benda", "alat",
    "hasil", "proses", "sistem", "metode", "prinsip", "teori", "fakta", "data",
    "informasi", "pengetahuan", "ide", "gagasan", "pikiran", "perasaan", "emosi",
    "jiwa", "roh", "akal", "rasa", "hati", "tubuh", "darah", "otak", "mata",
    "hidung", "mulut", "telinga", "tangan", "kaki", "jari", "rambut", "kulit",
    "nama", "usia", "jenis", "kelamin", "pekerjaan", "pendidikan", "hobi",
    "keluarga", "teman", "sahabat", "musuh", "guru", "murid", "siswa", "mahasiswa",
    "dokter", "perawat", "polisi", "tentara", "petani", "nelayan", "pedagang",
    "penulis", "seniman", "olahraga", "musik", "film", "buku", "berita", "surat",
    "telepon", "internet", "komputer", "ponsel", "mobil", "motor", "sepeda",
    "kereta", "pesawat", "kapal", "rumah", "gedung", "kantor", "sekolah", "pasar",
    "toko", "restoran", "hotel", "bank", "jalan", "jembatan", "pintu", "jendela"
];


    const mainContent = document.querySelector('.main-content'); // Dapatkan main-content
    // --- Fungsi Global untuk Menyimpan Skor (tetap sama) ---
    window.saveScore = function(wpm, accuracy, time, errors, type, mode, correctWords, incorrectWords) {
        const scores = JSON.parse(localStorage.getItem('typingScores') || '[]');
        const newScore = {
            wpm: wpm,
            accuracy: accuracy,
            time: time,
            errors: errors,
            type: type,
            mode: mode,
            correctWords: correctWords,
            incorrectWords: incorrectWords,
            date: new Date().toISOString()
        };
        scores.unshift(newScore);
        localStorage.setItem('typingScores', JSON.stringify(scores));
        console.log("Skor disimpan:", newScore);

        if (window.location.pathname.includes('score-history.html') && typeof window.displayFullScoreHistory === 'function') {
            window.displayFullScoreHistory();
        }
    };

    // --- Event listener untuk tombol 'X' di Modal Hasil (tetap sama) ---
    if (window.closeButton) {
        window.closeButton.addEventListener('click', () => {
            if (window.resultModal) {
                window.resultModal.classList.remove('show');
                console.log('Result modal closed by close button');
            }
        });
    }

    // --- Event listener untuk tombol 'Coba Lagi' di Modal Hasil (tetap sama) ---
    if (window.restartButtonModal) {
        window.restartButtonModal.addEventListener('click', () => {
            if (window.resetTest && typeof window.resetTest === 'function') {
                window.resetTest();
                console.log('Test restarted from modal');
            }
            if (window.resultModal) {
                window.resultModal.classList.remove('show');
            }
        });
    }