// js/lessons-generator.js

import { initDarkMode } from './utils/dark-mode.js';
import { lessons } from './learn-typing-lessons.js';

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
        imageSrc = `img/${lesson.preview.join('')}.svg`;
      } else {
        imageSrc = 'https://via.placeholder.com/200x150';
      }

      // Ambil judul pelajaran
      let lessonTitle = lesson.title || "Pelajaran Tanpa Judul";

      // Hapus jika diawali "Pelajaran <nomor>: "
      if (/^Pelajaran\s\d+:\s/.test(lessonTitle)) {
        lessonTitle = lessonTitle.replace(/^Pelajaran\s\d+:\s/, '');
      }

      // Hapus kata "Latihan" dan "Pengenalan" di manapun
      lessonTitle = lessonTitle.replace(/\bLatihan\b/gi, '').replace(/\bPengenalan\b/gi, '');

      // Rapikan spasi berlebih
      lessonTitle = lessonTitle.trim();

      // Fallback kalau kosong
      if (!lessonTitle) {
        lessonTitle = "Pelajaran Tanpa Judul";
      }

      cardLink.innerHTML = `
        <div class="card-header">
          <span class="lesson-number">${index + 1}</span>
        </div>
        <div class="card-body">
          <div class="lesson-image" data-light-src="${imageSrc}">
            <img src="${imageSrc}" alt="Gambar Pelajaran ${index + 1}">
          </div>
          ${lesson.isCompleted ? '<img class="lesson-completed-indicator" src="img/ok.png" alt="Pelajaran Selesai">' : ''}
        </div>
        <div class="card-footer">
          <h3 class="lesson-title">${lessonTitle}</h3>
        </div>
      `;

      lessonList.appendChild(cardLink);
    });
  }

  // Inisialisasi dark mode (akan otomatis swap gambar via dark-mode.js)
  const darkModeToggle = document.getElementById('darkModeToggle');
  initDarkMode(darkModeToggle);
});
