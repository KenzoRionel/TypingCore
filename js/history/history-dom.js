// js/history/history-dom.js
import { getHistoryDOMReferences } from '../utils/dom-elements.js';

export function renderScoreTable(scores, formatDate) {
    const DOM = getHistoryDOMReferences();
    let table = document.getElementById('scoreTable');
    if (!table) {
        table = document.createElement('table');
        table.id = 'scoreTable';
        table.classList.add('score-table');
        DOM.scoreHistoryList.innerHTML = '';
        DOM.scoreHistoryList.appendChild(table);
    } else {
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }
    }

    if (!table.tHead) {
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        ['No.', 'Tanggal', 'WPM', 'Akurasi', 'Waktu', 'Salah Karakter', 'Jenis Tes', 'Mode', 'Kata Benar', 'Kata Salah'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });
    }

    scores.forEach((score, index) => {
        const row = table.insertRow();
        row.insertCell().textContent = index + 1;
        row.insertCell().textContent = formatDate(score.date);
        row.insertCell().textContent = score.wpm;
        row.insertCell().textContent = score.accuracy + '%';
        row.insertCell().textContent = score.time + 's';
        row.insertCell().textContent = score.errors;
        row.insertCell().textContent = score.type || '-';
        row.insertCell().textContent = score.mode || '-';
        row.insertCell().textContent = score.correctWords;
        row.insertCell().textContent = score.incorrectWords;
    });
}