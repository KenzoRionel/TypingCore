// js/history/history-dom.js

// Perbaikan: Ganti `import { DOM }` menjadi `import { getDOMReferences }`
import { getDOMReferences } from '../utils/dom-elements.js';

export function renderScoreTable(scores) {
    // Panggil fungsi getDOMReferences() di sini untuk mendapatkan objek DOM
    const DOM = getDOMReferences();
    
    let table = document.getElementById('scoreTable');
    if (!table) {
        table = document.createElement('table');
        table.id = 'scoreTable';
        table.classList.add('score-table');
        if (DOM.scoreHistoryList) {
            DOM.scoreHistoryList.innerHTML = ''; // Clear previous content
            DOM.scoreHistoryList.appendChild(table);
        } else {
            console.error("scoreHistoryList element not found for rendering table.");
            return;
        }
    } else {
        while (table.rows.length > 1) { // Keep header row
            table.deleteRow(1);
        }
    }

    if (table.rows.length === 0) {
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        ['No.', 'Tanggal', 'WPM', 'Akurasi', 'Waktu', 'Salah Karakter', 'Mode', 'Kata Benar', 'Kata Salah'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
    }

    scores.forEach((score, index) => {
        const row = table.insertRow();
        row.insertCell().textContent = index + 1;
        row.insertCell().textContent = new Date(score.date).toLocaleString('id-ID', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        row.insertCell().textContent = score.wpm;
        row.insertCell().textContent = score.accuracy + '%';
        row.insertCell().textContent = score.time + 's';
        row.insertCell().textContent = score.errors;
        row.insertCell().textContent = score.type;
        row.insertCell().textContent = score.correctWords;
        row.insertCell().textContent = score.incorrectWords;
    });
}
