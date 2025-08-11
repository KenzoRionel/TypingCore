// js/hand-visualizer.js
const keyFingerMap = {
    'f': { id: 'hand-f', adjust: { x: '-33%', y: '-5%' } },
    'j': { id: 'hand-j', adjust: { x: '-62%', y: '-5%' } },
    ' ': { id: 'hand-space', adjust: { x: '-48%', y: '-35%' } },
    'd': { id: 'hand-d', adjust: { x: '-25%', y: '-5%' } },
    'k': { id: 'hand-k', adjust: { x: '-73%', y: '-7%' } },
    // Tambahkan kunci lain di sini sesuai kebutuhan pelajaran
};

export function resetHandVisualizer() {
    const handVisualizer = document.getElementById('hand-visualizer');
    if (handVisualizer) {
        handVisualizer.style.transform = '';
        handVisualizer.style.opacity = '0';
        const handImages = handVisualizer.querySelectorAll('.hand-image');
        handImages.forEach(img => {
            img.classList.remove('active');
            img.style.transform = '';
        });
    }
}

export function renderHandVisualizer(keyChar) {
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
                const left = targetKeyElement.offsetLeft + (targetKeyElement.offsetWidth / 2);
                const top = targetKeyElement.offsetTop + (targetKeyElement.offsetHeight / 2);
                
                handVisualizer.style.transform = `translate(${left}px, ${top}px)`;
                handVisualizer.style.opacity = '1';

                activeHandImage.classList.add('active');
                activeHandImage.style.transform = `translate(${keyData.adjust.x}, ${keyData.adjust.y})`;
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