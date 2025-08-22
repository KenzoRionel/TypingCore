// js/hand-visualizer.js

// Tidak perlu properti 'adjust' lagi karena posisi gambar tidak akan digeser
const keyFingerMap = {
    'f': { id: 'hand-f' },
    'j': { id: 'hand-j' },
    ' ': { id: 'hand-space' },
    'd': { id: 'hand-d' },
    'k': { id: 'hand-k' },
    's': { id: 'hand-s' },
    'l': { id: 'hand-l' },
    'a': { id: 'hand-a' },
    ';': { id: 'hand-;' },
    'h': { id: 'hand-h' },
    'g': { id: 'hand-g' }
    // Tambahkan kunci lain di sini sesuai kebutuhan pelajaran
};

export function resetHandVisualizer() {
    const handVisualizer = document.getElementById('hand-visualizer');
    if (handVisualizer) {
        // Hapus transform dan opacity karena tidak digunakan lagi
        handVisualizer.style.transform = '';
        handVisualizer.style.opacity = '0';
        const handImages = handVisualizer.querySelectorAll('.hand-image');
        handImages.forEach(img => {
            img.classList.remove('active');
            // Hapus baris ini karena tidak perlu ada transform di setiap gambar
            img.style.transform = ''; 
        });
    }
}

export function renderHandVisualizer(keyChar) {
    // Perbaikan: Tambahkan pengecekan null di sini sebelum mencoba memanggil .toLowerCase()
    if (!keyChar) {
        const handVisualizer = document.getElementById('hand-visualizer');
        if (handVisualizer) {
            handVisualizer.style.opacity = '0';
        }
        return;
    }

    const handVisualizer = document.getElementById('hand-visualizer');
    const keyboardContainer = document.getElementById('virtual-keyboard');

    if (!handVisualizer || !keyboardContainer) {
        return;
    }
    
    // Hapus class 'active' dari semua gambar tangan
    const allHandImages = handVisualizer.querySelectorAll('.hand-image');
    allHandImages.forEach(img => img.classList.remove('active'));

    const keyData = keyFingerMap[keyChar.toLowerCase()];

    if (keyData) {
        const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);

        if (targetKeyElement) {
            const activeHandImage = document.getElementById(keyData.id);
            if (activeHandImage) {
                // Baris kode ini dihapus karena tidak ada pergeseran posisi
                // const left = targetKeyElement.offsetLeft + (targetKeyElement.offsetWidth / 2);
                // const top = targetKeyElement.offsetTop + (targetKeyElement.offsetHeight / 2);
                
                // Set opacity ke 1 untuk menampilkan visualizer
                handVisualizer.style.opacity = '1';

                activeHandImage.classList.add('active');
                // Baris ini juga dihapus karena properti 'adjust' tidak lagi digunakan
                // activeHandImage.style.transform = `translate(${keyData.adjust.x}, ${keyData.adjust.y})`;
            } else {
                // Sembunyikan jika gambar tangan tidak ditemukan
                handVisualizer.style.opacity = '0';
            }
        } else {
            // Sembunyikan jika elemen target tidak ditemukan
            handVisualizer.style.opacity = '0';
        }
    } else {
        // Sembunyikan jika keyChar tidak ada dalam map
        handVisualizer.style.opacity = '0';
    }
}