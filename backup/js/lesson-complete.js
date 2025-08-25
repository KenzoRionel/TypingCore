document.addEventListener('DOMContentLoaded', () => {
    const continueBtn = document.getElementById('continue-to-next-lesson-btn');
    const nextLessonPreview = document.getElementById('next-lesson-preview');

    // Ambil data pelajaran berikutnya dari localStorage
    const nextLessonPreviewData = localStorage.getItem('nextLessonPreview');
    if (nextLessonPreviewData) {
        const nextLessonPreview = JSON.parse(nextLessonPreviewData);
        // Tampilkan preview tombol
        nextLessonPreview.forEach(key => {
            const span = document.createElement('span');
            span.textContent = key;
            nextLessonPreview.appendChild(span);
        });
    }

    // Event listener untuk tombol "Lanjutkan"
    continueBtn.addEventListener('click', () => {
        // Pindah ke pelajaran berikutnya
        window.location.href = 'learn-typing.html';
    });
});