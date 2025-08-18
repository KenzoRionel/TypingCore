export const lessons = [
    {
        title: "Pelajaran 1: Pengenalan Tombol F dan J",
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
        preview: ['f', 'j'],
        isCompleted: true //Menambahkan tanda di kartu untuk pelajaran selesai.
    },
    {
        title: "Pelajaran 2: Tombol F dan J",
        type: "simple-drill",
        image: 'target-fj.svg',
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
        image: 'spacebar.svg',
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
        image: 'test-fj.svg',
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
        title: "Pelajaran 6: Latihan Tombol D dan K",
        type: "simple-drill",
        image: "target-dk.svg",
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
        image: 'test-dk.svg',
        sequence: ['d', 'd', 'd', 'd', ' ', 'k', 'k', 'k', 'k', ' ', 'd', 'd', 'k', 'k', ' ', 'k', 'k', 'd', 'd', ' ', 'k', 'd',
            ' ', 'd', 'k', ' ', 'k', 'd', 'd', 'k', ' ', 'd', 'k', 'k', 'd', ' ', 'k', 'k', 'd', 'd', ' ', 'k', 'd',
            'd', 'k', ' ', 'k', 'd', 'd', 'd', ' ', 'k', 'd', 'k', 'd', ' ', 'd', 'k', 'd', 'k', ' ', 'd', 'd', 'd', 'd', ' ', 'k', 'k', 'k', 'k',
            ' ', 'd', 'k', ' ', 'd', 'k', ' ', 'k', 'd', ' ', 'k', 'd'],
        preview: ['d', 'k']
    },
    {
        title: "Pelajaran 8: Test Mengetik D dan K",
        type: "free-typing",
        image: 'test-dk.svg',
        sequence: ['f', 'f', 'f', 'f', ' ', 'd', 'd', 'd', ' ', 'j', 'j', 'j', ' ', 'k', 'k', 'k', 'k', ' ', 'd', 'f', 'd', 'f', ' ', 'j', 'k', ' ', 'j', 'k', ' ', 'j', 'j', 'j', ' ', 'f', 'f', 'f', ' ',
            'j', 'j', 'j', ' ', 'f', 'f', 'f', ' ', 'd', 'd', 'f', 'f', ' ', 'j', 'j', 'k', 'k', ' ', 'k', 'k', 'd', 'd', ' ', 'f', 'd', 'f', 'd', ' ', 'j', 'k', 'j', 'k', ' ', 'd', 'f', 'j', 'k', ' ', 'k', 'k', 'd', 'd', ' ',
            'j', 'k', ' ', 'd', 'f', 'd', 'f', ' ', 'd', 'f', 'j', 'j', ' ', 'j', 'j', 'f', 'd', ' ', 'k', 'k', 'j', 'j', ' ', 'd', 'f', 'j', 'k', ' ', 'd', 'd', 'k', 'd', ' ', 'k', 'k', 'd', 'k'],
        preview: ['f', 'j', 'd', 'k']
    },
    {
        title: "Pelajaran 9: Pengenalan Tombol S dan L",
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
        title: "Pelajaran 10: Latihan Tombol S dan L",
        type: "simple-drill",
        image: "target-sl.svg",
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
        image: "test-sl.svg",
        sequence: ['j', 'j', ' ', 'f', 'f', ' ', 'd', 'd', ' ', 'l', 'l', ' ', 's', 's', 's', 's', 'd', ' ', 'd', 'f', ' ', 'f', 'j', ' ', 'j', 'k', ' ', 'k', 'l', ' ', 's', 'd', 'f', 's', 'k',
            ' ', 'd', 'l', ' ', 'k', 's', ' ', 'j', 'f', ' ', 'k', 'd', ' ', 'l', 's', 'l', 'f', 'l', ' ', 'k', 'l', ' ', 'j', 's', ' ', 'k', 'd', ' ', 'j', 'f', ' ', 's', 'd', 'f', 'l', 'l', 'k',
            ' ', 'k', 'k', 'j', ' ', 'j', 'j', 'f'
        ],
        preview: ['s', 'l']
    },
    {
        title: "Pelajaran 12: Pengenalan Tombol A dan ;",
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
        title: "Pelajaran 13: Latihan Tombol A dan ;",
        type: "simple-drill",
        image: "target-a;.svg",
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
        image: "test-a;.svg",
        sequence: ['a', 'a', 'a', 'a', ' ', ';', ';', ';', ';', ' ', 'a', 'a', ';', ';', ' ', ';', ';', 'a', 'a', ' ', 'a', ';',
            ' ', ';', 'a', 'a', ';', ' ', 'a', ';', ';', 'a', ' ', ';', ';', 'a', 'a', ' ', 'a', ';',
            'a', ';', ' ', ';', 'a', 'a', 'a', ' ', ';', 'a', ';', 'a', ' ', 'a', ';', 'a', ';', ' ', 'a', 'a', 'a', 'a', ' ', ';', ';', ';', ';',
            ' ', 'a', ';', ' ', 'a', ';', ' ', ';', 'a', ' ', ';', 'a'],
        preview: ['a', ';']
    },
    {
        title: "Pelajaran 15: Home Row: Tangan Kiri",
        type: "free-typing",
        requiredHoldKey: "j",
        image: "homerow-left.svg",
        instruction: `Tekan dan tahan tombol <span class="keyboard-inline-key">j</span> dengan jari telunjuk kananmu sambil mengetik kombinasi Tombol A, S, D, dan F.`,
        sequence: ['a', 'd', 'a', ' ', 's', 'a', 'd', 'a', ' ', 'f', 'a', 's', ' ', 'a', 's', 'a', ' ', 'd', 'a', 'f', ' ', 'd', 'a', 's', ' ', 'f', 'a', 'd', 'a', ' ', 'a', 's', 'a', 'd', ' ', 's', 'a', 'd', 'a', 'f', ' ', 'a', 's', 'd', ' ', 'd', 'f', 's', ' ', 's', 'a', 'f', ' ', 'f', 'd', 'a', 's', ' ', 'a', 'd', 's', ' ', 'f', 'a', 'd', ' ', 's', 'a', 'd', ' ', 'd', 'a', 's', 'f', ' ', 'f', 'a', 's', 'a', 'd', ' ', 'd', 's', 'a', 'd', 'f', ' ', 'a', 'd', 'a', 's'],
        preview: ['a', 's', 'd', 'f']
    },
    {
        title: "Pelajaran 16: Home Row: Tangan Kanan",
        type: "free-typing",
        requiredHoldKey: "f", // Tangan kiri menahan 'f'
        image: "homerow-right.svg",
        instruction: `Tekan dan tahan tombol <span class="keyboard-inline-key">f</span> dengan jari telunjuk kirimu sambil mengetik kombinasi Tombol J, K, L, dan ;.`,
        sequence: [
            // String 1
            'j', 'k', 'l', ' ', 'l', 'k', 'j', ' ', ';', ';', ';', ';', ' ', 'j', 'l', 'k', ' ',
            'k', 'j', 'l', ' ', 'j', ';', 'k', ' ', 'l', 'j', 'k', ' ',

            // String 2
            'j', 'k', 'l', ' ', 'k', 'l', 'j', ' ', 'j', ';', 'l', ' ', 'k', 'l', ';', 'j', ' ',
            'j', 'k', 'l', ' ', ';', ';', ';', ';', ' ', 'l', 'k', 'j', ' ',

            // String 3
            'j', 'k', 'l', 'j', ' ', 'k', 'l', ';', ' ', 'l', 'j', 'k', ' ', 'j', ';', 'l', 'k', ' ',
            'k', 'j', 'l', ' ', 'j', 'k', ';', ' ', ';', ';', ';', ';', ' ', 'j', 'l', 'k', ' ',

            // String 4
            'j', 'k', 'l', ' ', 'l', 'k', 'j', ' ', 'j', ';', 'l', ' ', 'k', 'j', 'l', ' ', 'j', 'k', 'l', ' ',
            'k', 'l', ';', 'j', ' ', 'j', 'k', ';', 'l', ' ', ';', ';', ';', ';', ' ', 'l', 'j', 'k'
        ],
        preview: ['j', 'k', 'l', ';'] // Ganti preview jadi tombol kanan
    },
    {
        title: "Pelajaran 17: Pengenalan Tombol G dan H",
        type: "character-drill",
        steps: [
            {
                key: 'g',
                instruction: `Tekan tombol <span class="keyboard-inline-key">g</span> menggunakan jari telunjuk kiri Anda.`
            },
            {
                key: 'h',
                instruction: `Tekan tombol <span class="keyboard-inline-key">h</span> menggunakan jari telunjuk kanan Anda.`
            }
        ],
        preview: ['g', 'h'],
    },
    {
        title: "Pelajaran 18: Tombol G dan H",
        type: "simple-drill",
        image: 'target-gh.svg',
        sequences: [
            ['g', 'g', 'g', 'g', 'h', 'h'],
            ['h', 'h', 'g', 'g', 'g', 'g'],
            ['h', 'h', 'h', 'h', 'g', 'g'],
            ['h', 'h', 'g', 'g', 'h', 'h'],
            ['g', 'h', 'g', 'h', 'h', 'g'],
            ['h', 'g', 'g', 'h', 'g', 'h'],
        ],
        keys: ['g', 'h'],
        preview: ['g', 'h']
    },
    {
        title: "Pelajaran 19: Test Mengetik G dan H",
        type: "free-typing",
        image: 'test-gh.svg',
        sequence: [
            // String 1
            'f', 'g', 'h', 'j', ' ', 'j', 'h', 'g', 'f', ' ', 'f', 'h', 'g', ' ', 'g', 'j', 'h', ' ',

            // String 2
            'f', 'j', ' ', 'g', 'h', ' ', 'f', 'g', ' ', 'h', 'j', ' ', 'f', 'g', 'h', 'j', ' ',

            // String 3
            'h', 'g', 'f', ' ', 'j', 'h', 'g', ' ', 'f', 'g', 'h', ' ', 'j', 'f', 'h', ' ',

            // String 4
            'f', 'h', 'j', ' ', 'g', 'f', 'h', ' ', 'j', 'g', 'f', ' ', 'h', 'j', 'g', ' ',

            // String 5 (pola berulang)
            'f', 'g', 'h', 'j', ' ', 'f', 'g', 'h', 'j', ' ', 'j', 'h', 'g', 'f', ' ', 'h', 'g', 'f', 'j'
        ],
        preview: ['g', 'h']
    },
    {
        title: "Pelajaran 20: Test Mengetik G dan H",
        type: "free-typing",
        image: 'test-gh.svg',
        sequence: [
            'g', 'a', ' ', 'h', 'a', 'l', ' ', 'g', 'a', 'l', 'a', ' ', 'h', 'a', ' ',
            'j', 'a', 'g', ' ', 'l', 'a', 'g', ' ', 's', 'a', 'g', 'a', ' ', 'g', 'a', ' ',

            'h', 'a', 's', ' ', 'j', 'a', 'g', 'a', ' ', 'h', 'a', 'l', 'a', ' ', 'l', 'a', 'g', 'a', ' ',
            'g', 'a', 's', ' ', 'h', 'a', ' ', 'l', 'a', 's', 'a', ' ', 'g', 'a', ' ',

            'h', 'a', ' ', 's', 'a', 'g', 'a', ' ', 'g', 'a', 'l', ' ', 'h', 'a', 's', 'a', ' ',
            'j', 'a', 'g', ' ', 'g', 'a', 'l', 'a', ' ', 'h', 'a', ' ', 'l', 'a', 'g', 'a'
        ],
        preview: ['g', 'h']
    },
    {
        title: "Pelajaran 21: Home Row",
        type: "free-typing",
        image: 'homerow.svg',
        sequence: [
            'j', 'a', 's', 'a', ' ', 's', 'a', ' ', 'l', ';', ' ', 'h', 'a', 's', ' ',
            'g', 'a', 'l', 'a', ' ', 'j', 'a', 'l', ' ', 'a', 's', 'a', ' ', 'k', 'a', 's', ' ',

            'j', ';', 'a', ' ', 'h', 'a', 'l', 'a', ' ', 's', 'a', 'd', ' ', 'j', 'a', 's', ' ',
            'l', 'a', ' ', 'g', 'a', 's', ' ', 'f', 'a', 'l', ' ', 'j', 'a', ';', 'a', ' ',

            'h', 'a', 's', ' ', 'k', 'a', ' ', 'j', 'a', 's', 'a', ' ', 'l', 'a', ';', ' ',
            'g', 'a', 'l', ' ', 's', 'a', ' ', 'j', 'a', 'l', 'a', ' ', 'h', 'a', ' ',

            'j', ';', 'l', ' ', 's', 'a', 'l', 'a', ' ', 'f', 'a', 's', ' ', 'j', 'a', ' ',
            'h', 'a', 'l', ' ', 'k', 'a', 's', ' ', 'l', 'a', ';', 'a', ' ',

            'j', 'a', 's', ' ', 'g', 'a', 's', ' ', 'h', 'a', ' ', 'j', ';', 'a', ' ',
            's', 'a', ' ', 'l', 'a', 's', 'a', ' ', 'j', 'a', 's', 'a', ' '
        ],
        preview: ['g', 'h']
    },

];
console.log("Memeriksa data pelajaran 17:");
console.log(lessons[16]);
