// underline-logic.js

// Fungsi untuk mengupdate status aktif garis bawah dan memicu animasi
export function updateUnderlineStatus(lesson2SequenceContainer, lesson2UnderlineContainer, activeIndex) {
    if (!lesson2SequenceContainer || !lesson2UnderlineContainer) return;

    const keyElements = Array.from(lesson2SequenceContainer.children);
    const underlineElements = Array.from(lesson2UnderlineContainer.children);

    keyElements.forEach((keyEl, idx) => {
        keyEl.classList.toggle('active', idx === activeIndex);
    });

    underlineElements.forEach((underlineEl, idx) => {
        const wasActive = underlineEl.classList.contains('active');

        underlineEl.classList.remove('animate-slide-in-left', 'animate-slide-out-right');

        if (idx === activeIndex) {
            underlineEl.classList.add('active');
            underlineEl.style.setProperty('--pseudo-transform', 'translateX(-100%)');
            void underlineEl.offsetWidth;
            underlineEl.classList.add('animate-slide-in-left');
            underlineEl.style.setProperty('--pseudo-transform', 'translateX(0%)');
        } else {
            if (wasActive) {
                underlineEl.classList.remove('active');
                underlineEl.style.setProperty('--pseudo-transform', 'translateX(0%)');
                void underlineEl.offsetWidth;
                underlineEl.classList.add('animate-slide-out-right');
                underlineEl.style.setProperty('--pseudo-transform', 'translateX(100%)');
            } else {
                underlineEl.style.setProperty('--pseudo-transform', 'translateX(-100%)');
            }
        }

        underlineEl.addEventListener('animationend', function handler(event) {
            if (event.animationName === 'slideInLeft') {
                underlineEl.classList.remove('animate-slide-in-left');
                underlineEl.style.setProperty('--pseudo-transform', 'translateX(0%)');
            } else if (event.animationName === 'slideOutRight') {
                underlineEl.classList.remove('animate-slide-out-right');
                underlineEl.style.setProperty('--pseudo-transform', 'translateX(-100%)');
            }
            underlineEl.removeEventListener('animationend', handler);
        }, { once: true });
    });
}