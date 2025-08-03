// js/hand-visualizer.js

export function updateHandVisualizer(handVisualizer, keyboardContainer, keyChar) {
    if (!handVisualizer || !keyboardContainer) {
        return;
    }

    // Hapus kelas aktif dari semua gambar tangan
    const handImages = handVisualizer.querySelectorAll('.hand-image');
    handImages.forEach(img => {
        img.classList.remove('active');
        img.style.transform = '';
    });
    
    if (typeof keyChar === 'string' && keyChar.length > 0) {
        const targetKeyElement = keyboardContainer.querySelector(`[data-key="${keyChar.toLowerCase()}"]`);

        if (targetKeyElement) {
            let handImageId;
            let fingerAdjustments;

            if (keyChar === 'f') {
                handImageId = 'hand-f';
                fingerAdjustments = { x: '-33%', y: '-5%' }; 
            } else if (keyChar === 'j') {
                handImageId = 'hand-j';
                fingerAdjustments = { x: '-62%', y: '-5%' };
            } else if (keyChar === ' ') {
                handImageId = 'hand-space';
                fingerAdjustments = { x: '-48%', y: '-35%' };
            }

            const activeHandImage = document.getElementById(handImageId);
            if (activeHandImage) {
                // Perhitungan posisi relatif terhadap kontainer keyboard
                const left = targetKeyElement.offsetLeft + (targetKeyElement.offsetWidth / 2);
                const top = targetKeyElement.offsetTop + (targetKeyElement.offsetHeight / 2);
                
                // Gunakan transform untuk menempatkan kontainer utama
                handVisualizer.style.transform = `translate(${left}px, ${top}px)`;
                handVisualizer.style.opacity = '1';

                // Tambahkan kelas aktif dan sesuaikan posisi jari
                activeHandImage.classList.add('active');
                activeHandImage.style.transform = `translate(${fingerAdjustments.x}, ${fingerAdjustments.y})`;
            }
        }
    } else {
        // Jika tidak ada karakter yang harus disorot, sembunyikan visualizer
        handVisualizer.style.opacity = '0';
    }
}