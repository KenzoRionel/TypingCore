// js/hand-visualizer.js

export function renderHandVisualizer(keyChar) {
    const handVisualizer = document.getElementById('hand-visualizer');
    const keyboardContainer = document.getElementById('virtual-keyboard');

    if (!handVisualizer || !keyboardContainer) {
        return;
    }

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
            } else if (keyChar === 'd') { // ✅ Logika baru untuk tombol 'd'
                handImageId = 'hand-d';
                fingerAdjustments = { x: '-25%', y: '-5%' };
            } else if (keyChar === 'k') { // ✅ Logika baru untuk tombol 'k'
                handImageId = 'hand-k';
                fingerAdjustments = { x: '-70%', y: '-5%' };
            }

            const activeHandImage = document.getElementById(handImageId);
            if (activeHandImage) {
                const left = targetKeyElement.offsetLeft + (targetKeyElement.offsetWidth / 2);
                const top = targetKeyElement.offsetTop + (targetKeyElement.offsetHeight / 2);
                
                handVisualizer.style.transform = `translate(${left}px, ${top}px)`;
                handVisualizer.style.opacity = '1';

                activeHandImage.classList.add('active');
                activeHandImage.style.transform = `translate(${fingerAdjustments.x}, ${fingerAdjustments.y})`;
            }
        }
    } else {
        handVisualizer.style.opacity = '0';
    }
}