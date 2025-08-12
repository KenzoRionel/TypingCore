// js/learn-typing-lessons.js

export const lessons = [
    {
        title: "Pengenalan Tombol Baru",
        type: "character-drill",
        steps: [
            {
                key: 'f',
                instruction: `Tekan tombol <span class="keyboard-inline-key">f</span> menggunakan jari telunjuk kiri Anda.`
            },
            {
                key: 'j',
                instruction: `Tekan tombol <span class="keyboard-inline-key">j</span> menggunakan jari telunjuk kanan Anda.`
            }
        ],
        preview: ['f', 'j']
    },
    {
        title: "Pelajaran 2: Huruf F dan J",
        type: "simple-drill",
        sequences: [
            ['f', 'f', 'f', 'f', 'j', 'j'],
            ['j', 'j', 'f', 'f', 'f', 'f'],
            ['j', 'j', 'j', 'j', 'f', 'f'],
            ['j', 'j', 'f', 'f', 'j', 'j'],
            ['f', 'j', 'f', 'j', 'j', 'f'],
            ['j', 'f', 'f', 'j', 'f', 'j'],
        ],
        keys: ['f', 'j'],
        preview: ['f', 'j']
    },
    {
        title: "Pelajaran 3: Latihan Tombol Spasi",
        type: "simple-drill",
        sequences: [
            ['f', ' ', 'f', ' ', 'j', ' ', 'j'],
            [' ', 'f', 'f', ' ', ' ', 'f', 'f'],
            ['j', 'j', ' ', 'j', 'j', ' ', 'f'],
            ['j', ' ', 'j', 'f', ' ', 'f', 'f'],
            [' ', 'j', 'j', ' ', ' ', 'j', 'j'],
            ['f', 'f', ' ', ' ', 'f', 'f', ' '],
        ],
        keys: ['f', 'j', ' '],
        preview: ['f', 'j']
    },
    {
        title: "Pelajaran 4: Test Mengetik F dan J",
        type: "free-typing",
        sequence: ['f', 'f', 'f', 'f', ' ', 'j', 'j', 'j', 'j', ' ', 'f', 'f', 'j', 'j', ' ', 'j', 'j', 'f', 'f', ' ', 'j', 'f', 'f', 'j', ' ', 'j', 'f', 'f', 'j', 'f', 'j',
                   'j', 'f', ' ', 'j', 'j', 'f', 'f', ' ', 'j', 'f', 'f', 'j', ' ', 'j', 'f', 'f', 'f', ' ', 'j', 'f', 'j', 'f', ' ', 'f', 'j', 'f', 'j', ' ', 'f', 'f', 'f', 'f', ' ', 'j', 'j', 'j', 'j',
                   ' ', 'f', 'j', ' ', 'f', 'j', ' ', 'j', 'f', ' ', 'f', 'j', ' ', 'f', 'j', ' ', 'j', 'f', ' ', 'j', 'f'],
        preview: ['f', 'j']
    },
    {
        title: "Pelajaran 5: Pengenalan Tombol D dan K",
        type: "character-drill",
        steps: [
            {
                key: 'd',
                instruction: `Tekan tombol <span class="keyboard-inline-key">d</span> menggunakan jari tengah kiri Anda.`
            },
            {
                key: 'k',
                instruction: `Tekan tombol <span class="keyboard-inline-key">k</span> menggunakan jari tengah kanan Anda.`
            }
        ],
        preview: ['d', 'k']
    },
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
        keys: ['d', 'k'],
        preview: ['d', 'k']
    },
    {
        title: "Pelajaran 7: Test Mengetik D dan K",
        type: "free-typing",
        sequence: ['d', 'd', 'd', 'd', ' ', 'k', 'k', 'k', 'k', ' ', 'd', 'd', 'k', 'k', ' ', 'k', 'k', 'd', 'd', ' ', 'k', 'd',
                   ' ', 'd', 'k', ' ', 'k', 'd', 'd', 'k', ' ', 'd', 'k', 'k', 'd', ' ', 'k', 'k', 'd', 'd', ' ', 'k', 'd',
                   'd', 'k', ' ', 'k', 'd', 'd', 'd', ' ', 'k', 'd', 'k', 'd', ' ', 'd', 'k', 'd', 'k', ' ', 'd', 'd', 'd', 'd', ' ', 'k', 'k', 'k', 'k',
                   ' ', 'd', 'k', ' ', 'd', 'k', ' ', 'k', 'd', ' ', 'k', 'd'],
        preview: ['d', 'k']
    },
    {
        title: "Pelajaran 8: Test Mengetik D dan K",
        type: "free-typing",
        sequence: ['f', 'f', 'f', 'f', ' ', 'd', 'd', 'd', ' ', 'j', 'j', 'j', ' ', 'k', 'k', 'k', 'k', ' ', 'd', 'f', 'd', 'f', ' ', 'j', 'k', ' ', 'j', 'k', ' ', 'j', 'j', 'j', ' ', 'f', 'f', 'f', ' ',
                   'j', 'j', 'j', ' ', 'f','f', 'f', ' ', 'd', 'd', 'f', 'f', ' ', 'j', 'j', 'k', 'k', ' ', 'k', 'k', 'd', 'd', ' ', 'f', 'd', 'f', 'd', ' ', 'j', 'k', 'j', 'k', ' ', 'd', 'f', 'j', 'k', ' ', 'k', 'k', 'd', 'd', ' ',
                   'j', 'k', ' ', 'd', 'f', 'd', 'f', ' ', 'd', 'f', 'j', 'j', ' ', 'j', 'j', 'f', 'd', ' ', 'k', 'k', 'j', 'j', ' ', 'd', 'f', 'j', 'k', ' ', 'd', 'd', 'k', 'd', ' ', 'k', 'k', 'd', 'k' ],
        preview: ['f', 'j', 'd', 'k']
    },
    {
        title: "Pelajaran 9: Pengenalan Huruf S dan L",
        type: "character-drill",
        steps: [
            {
                key: 's',
                instruction: `Tekan tombol <span class="keyboard-inline-key">s</span> menggunakan jari manis kiri Anda.`
            },
            {
                key: 'l',
                instruction: `Tekan tombol <span class="keyboard-inline-key">l</span> menggunakan jari manis kanan Anda.`
            }
        ],
        preview: ['s', 'l']
    },
    {
        title: "Pelajaran 10: Latihan Huruf S dan L",
        type: "simple-drill",
        sequences: [
            ['s', 's', 's', 's', 'l', 'l'],
            ['l', 'l', 's', 's', 's', 's'],
            ['l', 'l', 'l', 'l', 's', 's'],
            ['l', 'l', 's', 's', 'l', 'l'],
            ['s', 'l', 's', 'l', 'l', 's'],
            ['l', 's', 's', 'l', 's', 'l'],
        ],
        keys: ['s', 'l'],
        preview: ['s', 'l']
    },
    {
        title: "Pelajaran 11: Test Mengetik S dan L",
        type: "free-typing",
        sequence: ['j', 'j', ' ', 'f', 'f', ' ', 'd', 'd', ' ', 'l', 'l', ' ', 's', 's', 's', 's', 'd', ' ', 'd', 'f', ' ', 'f', 'j', ' ', 'j', 'k', ' ', 'k', 'l', ' ', 's', 'd', 'f', 's', 'k',
                   ' ', 'd', 'l', ' ', 'k', 's', ' ', 'j', 'f', ' ', 'k', 'd', ' ', 'l', 's', 'l', 'f', 'l', ' ', 'k', 'l', ' ', 'j', 's', ' ', 'k', 'd', ' ', 'j', 'f', ' ', 's', 'd', 'f', 'l', 'l', 'k',
                   ' ', 'k', 'k', 'j', ' ', 'j', 'j', 'f'
        ],
        preview: ['s', 'l']
    },
    {
        title: "Pelajaran 12: Pengenalan Huruf A dan ;",
        type: "character-drill",
        steps: [
            {
                key: 'a',
                instruction: `Tekan tombol <span class="keyboard-inline-key">a</span> menggunakan jari kelingking kiri Anda.`
            },
            {
                key: ';',
                instruction: `Tekan tombol <span class="keyboard-inline-key">;</span> menggunakan jari kelingking kanan Anda.`
            }
        ],
        preview: ['a', ';']
    },
    {
        title: "Pelajaran 13: Latihan Huruf A dan ;",
        type: "simple-drill",
        sequences: [
            ['a', 'a', 'a', 'a', ';', ';'],
            [';', ';', 'a', 'a', 'a', 'a'],
            [';', ';', ';', ';', 'a', 'a'],
            [';', ';', 'a', 'a', ';', ';'],
            ['a', ';', 'a', ';', ';', 'a'],
            [';', 'a', 'a', ';', 'a', ';'],
        ],
        keys: ['a', ';'],
        preview: ['a', ';']
    },
    {
        title: "Pelajaran 14: Test Mengetik A dan ;",
        type: "free-typing",
        sequence: ['a', 'a', 'a', 'a', ' ', ';', ';', ';', ';', ' ', 'a', 'a', ';', ';', ' ', ';', ';', 'a', 'a', ' ', 'a', ';',
                   ' ', ';', 'a', 'a', ';', ' ', 'a', ';', ';', 'a', ' ', ';', ';', 'a', 'a', ' ', 'a', ';',
                   'a', ';', ' ', ';', 'a', 'a', 'a', ' ', ';', 'a', ';', 'a', ' ', 'a', ';', 'a', ';', ' ', 'a', 'a', 'a', 'a', ' ', ';', ';', ';', ';',
                   ' ', 'a', ';', ' ', 'a', ';', ' ', ';', 'a', ' ', ';', 'a'],
        preview: ['a', ';']
    },
    {
        title: "Pelajaran 15: Test Mengetik Home Row",
        type: "free-typing",
        sequence: ['a', 'd', 'a', ' ', 'a', 's', 'a', ' ', 'j', 'a', 'j', 'a', ' ', 'j', 'a', 'l', 'a', ';', ' ', 'd', 'a', 'd', 'a', ' ', 'l', 'a', 'l', 'a', ' ',
                   's', 'a', 'd', 'a', ' ', 'f', 'a', 'd', 'a', ' ', 'k', 'a', 's', ' ', 'a', 'l', 'a', 's', ' ', 's', 'a', 'k', 'a', ';', ' ', 'a', 's', 'f', ' ',
                   'a', 'd', 'a', ' ', 'a', 's', 'a', ' ', 'd', 'a', 'd', 'a', ' ', 'j', 'a', 'l', 'a', ' ', 's', 'a', 'j', 'a', ' ', 's', 'a', 'd', 'a', 'r', ' ',
                   'f', 'a', 's', 'a', ' ', 'a', 'l', 'a', 's', ';', ' ', 'j', 'a', 's', 'a', ' ', 'k', 'a', 's', 'a', ' ', 'j', 'a', 'k', 's', 'a', ' ', 'k', 'a', 'd', 's', 'a', ' ',
                   'a', 'l', 'a', 's', 'k', 'a', ' ', 's', 'a', 'd', 'a', ' ', 'f', 'a', 'd', 'a', ';', ' ', 'k', 'a', 's', ' ', 'a', 'l', 'a', 's', ' ', 's', 'a', 'k', 'a', ' '
                  ],
        preview: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';']
    },
    // ✅ Perubahan: Tambahkan pelajaran baru untuk menahan 'j'
    {
        title: "Pelajaran 16: Menahan Tombol J",
        type: "free-typing",
        requiredHoldKey: "j",
        instruction: `Tekan dan tahan tombol <span class="keyboard-inline-key">j</span> dengan jari telunjuk kananmu sambil mengetik.`,
        sequence: ['a', 's', 'd', 'f', ' ', 'f', 'd', 's', 'a', ' ', 'a', 'f', 's', 'd', ' ', 'd', 's', 'f', 'a'],
        preview: ['a', 's', 'd', 'f']
    }
];