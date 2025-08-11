// js/learn-typing-lessons.js

export const lessons = [
    {
        title: "Pengenalan Tombol Baru",
        type: "character-drill",
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
        title: "Pelajaran 2: Huruf F dan J",
        type: "simple-drill",
        // PERBAIKAN: Menambahkan 'sequences' untuk logika progres bar
        sequences: [
            ['f', 'f', 'f', 'f', 'j', 'j'],
            ['j', 'j', 'f', 'f', 'f', 'f'],
            ['j', 'j', 'j', 'j', 'f', 'f'],
            ['j', 'j', 'f', 'f', 'j', 'j'],
            ['f', 'j', 'f', 'j', 'j', 'f'],
            ['j', 'f', 'f', 'j', 'f', 'j'],
        ],
        preview: ['f', 'j']
    },
    {
        title: "Pelajaran 3: Latihan Kata F dan J Lanjutan",
        type: "simple-drill",
        // PERBAIKAN: Menambahkan 'sequences' untuk logika progres bar
        sequences: [
            ['f', ' ', 'f', ' ', 'j', ' ', 'j'],
            [' ', 'f', 'f', ' ', ' ', 'f', 'f'],
            ['j', 'j', ' ', 'j', 'j', ' ', 'f'],
            ['j', ' ', 'j', 'f', ' ', 'f', 'f'],
            [' ', 'j', 'j', ' ', ' ', 'j', 'j'],
            ['f', 'f', ' ', ' ', 'f', 'f', ' '],
        ],
        preview: ['f', 'j']
    },
      {
        title: "Pelajaran 4: Test Mengetik F dan J",
        type: "free-typing",
        sequence: ['f', 'f', 'f', 'f', ' ', 'j', 'j', 'j', 'j', ' ', 'f', 'f', 'j', 'j', ' ', 'j', 'j', 'f', 'f', ' ', 'j', 'f',
                            ' ', 'f', 'j', ' ' , 'j', 'f', 'f', 'j', ' ', 'f', 'j', 'j', 'f', ' ', 'j', 'j', 'f', 'f', ' ', 'j', 'f',
                          'f', 'j', ' ', 'j', 'f', 'f', 'f', ' ', 'j', 'f', 'j', 'f', ' ', 'f', 'j', 'f', 'j', ' ', 'f', 'f', 'f', 'f', ' ', 'j', 'j', 'j', 'j',
                        ' ', 'f', 'j', ' ', 'f', 'j', ' ', 'j', 'f', ' ', 'j','f'],
        preview: ['f', 'j']
    },
    {
        title: "Pelajaran 5: Pengenalan Tombol D dan K",
        type: "character-drill",
        steps: [
            {
                key: 'd',
                instruction: `Tekan tombol <span class="keyboard-inline-key" id="inlineKeyD">d</span> menggunakan jari tengah kiri Anda.`
            },
            {
                key: 'k',
                instruction: `Tekan tombol <span class="keyboard-inline-key" id="inlineKeyK">k</span> menggunakan jari tengah kanan Anda.`
            }
        ],
        preview: ['d', 'k']
    },
    // ✅ Tambahkan Pelajaran 6
    {
        title: "Pelajaran 6: Latihan Huruf D dan K",
        type: "simple-drill",
        sequences: [
            ['d', 'd', 'd', 'd', 'k', 'k'],
            ['k', 'k', 'd', 'd', 'd', 'd'],
            ['k', 'k', 'k', 'k', 'd', 'd'],
            ['k', 'k', 'd', 'd', 'k', 'k'],
            ['d', 'k', 'd', 'k', 'k', 'd'],
            ['k', 'd', 'd', 'k', 'd', 'k'],
        ],
        preview: ['d', 'k']
    }
];