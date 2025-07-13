export const lessons = [
    {
        title: "Pelajaran 1: Tombol F dan J",
        steps: [
            {
                key: 'f',
                instruction: `Tekan tombol <span class="keyboard-inline-key" id="inlineKeyF">f</span> menggunakan jari telunjuk kiri Anda.`
            },
            {
                key: 'j',
                instruction: `Tekan tombol <span class="keyboard-inline-key" id="inlineKeyJ">j</span> menggunakan jari telunjuk kanan Anda.`
            }
        ],
        preview: ['f', 'j']
    },
    {
        title: "Pelajaran 2: Latihan F dan J Lebih Banyak",
        // instruction: "Ulangi urutan 'f' dan 'j' lebih banyak untuk membiasakan posisi jari.", // Ini tidak lagi digunakan
        // sequence: Array(12).fill(['f', 'j']).flat(), // Ini juga tidak lagi digunakan
        preview: ['f', 'j'] // Preview masih bisa berguna untuk menampilkan di daftar pelajaran
    },
    // Tambahkan lesson berikutnya di sini
];