// js/lessons-generator.js

// Perbaikan: Impor modul dark mode.
import { initDarkMode } from './utils/dark-mode.js';

import { lessons } from './learn-typing-lessons.js';

// Perbaikan: Bungkus seluruh logika di dalam event listener DOMContentLoaded
// untuk memastikan semua elemen HTML sudah dimuat sebelum skrip dijalankan.
document.addEventListener('DOMContentLoaded', () => {

    const lessonList = document.querySelector('.lesson-list');

    if (lessonList) {
        lessons.forEach((lesson, index) => {
            const cardLink = document.createElement('a');
            cardLink.href = `learn-typing.html?lessonIndex=${index}`;
            cardLink.className = 'lesson-card';

            let imageSrc;
            if (lesson.image) {
                imageSrc = `img/${lesson.image}`;
            } else if (lesson.preview && lesson.preview.length === 2) {
                imageSrc = `img/${lesson.preview.join('')}.png`;
            } else {
                imageSrc = 'https://via.placeholder.com/200x150';
            }

            const lessonTitle = lesson.title || "Pelajaran Tanpa Judul";

            cardLink.innerHTML = `
                <div class="card-header">
                    <span class="lesson-number">${index + 1}</span>
                </div>
                <div class="card-body">
                    <img src="${imageSrc}" alt="Gambar Pelajaran ${index + 1}">
                    ${lesson.isCompleted ? '<img class="lesson-completed-indicator" src="img/ok.png" alt="Pelajaran Selesai">' : ''}
                </div>
                <div class="card-footer">
                    <h3 class="lesson-title">${lessonTitle}</h3>
                </div>
            `;

            lessonList.appendChild(cardLink);
        });
    }

    // Perbaikan: Inisialisasi dark mode setelah semua elemen di-render.
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        initDarkMode(darkModeToggle);
    }
});
