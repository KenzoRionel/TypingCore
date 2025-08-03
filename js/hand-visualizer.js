// js/hand-visualizer.js
export function updateHandVisualizer(keyboardContainer, keyChar) {
    const handVisualizer = document.getElementById('hand-visualizer-container');
    if (!handVisualizer) {
        console.warn("updateHandVisualizer: hand-visualizer-container tidak ditemukan.");
        return;
    }

    // Sembunyikan semua gambar tangan terlebih dahulu
    handVisualizer.querySelectorAll('.hand-image').forEach(img => {
        img.classList.remove('active');
        img.style.transform = '';
    });

    if (typeof keyChar === 'string' && keyChar.length > 0) {
        const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);

        if (targetKeyElement) {
            const keyRect = targetKeyElement.getBoundingClientRect();
            
            let handImageId;
            let fingerAdjustments;
            
            if (keyChar === 'f') {
                handImageId = 'hand-f';
                // Nilai ini harus disesuaikan (trial & error) agar jari tepat di atas tombol
                fingerAdjustments = { x: '-80%', y: '-20%' }; 
            } else if (keyChar === 'j') {
                handImageId = 'hand-j';
                fingerAdjustments = { x: '-20%', y: '-20%' };
            } else if (keyChar === ' ') {
                handImageId = 'hand-space';
                fingerAdjustments = { x: '-50%', y: '50%' };
            }

            const activeHandImage = document.getElementById(handImageId);
            if (activeHandImage) {
                // Atur posisi kontainer gambar berdasarkan posisi tombol
                handVisualizer.style.position = 'absolute';
                handVisualizer.style.left = `${keyRect.left + (keyRect.width / 2)}px`;
                handVisualizer.style.top = `${keyRect.top + (keyRect.height / 2)}px`;

                // Tampilkan gambar dan sesuaikan posisi jari
                activeHandImage.classList.add('active');
                activeHandImage.style.transform = `translate(${fingerAdjustments.x}, ${fingerAdjustments.y})`;
            }
        } else {
            // Jika tombol tidak ditemukan, hapus sorotan tangan
            handVisualizer.querySelectorAll('.hand-image').forEach(img => img.classList.remove('active'));
            handVisualizer.style.position = '';
            handVisualizer.style.left = '';
            handVisualizer.style.top = '';
        }
    }
}