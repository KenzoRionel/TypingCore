// js/data/quotes-loader.js
//
// Modul kecil untuk memuat data quotes (mode teks latihan "Quotes") dari
// data/quotes.json lewat fetch, lalu meng-cache hasilnya di memori supaya
// file JSON hanya diambil sekali per page-load, meski loadQuotes() dipanggil
// berkali-kali (mis. setiap kali tombol "Quotes" diklik lagi).
//
// Format data/quotes.json: array of { text, author }.

const QUOTES_URL = "data/quotes.json";

let quotesCache = null; // array hasil fetch, null = belum pernah dicoba
let quotesPromise = null; // in-flight promise, supaya panggilan paralel tidak fetch berkali-kali

/**
 * Memuat (dan meng-cache) daftar quotes dari data/quotes.json.
 * Aman dipanggil berkali-kali; fetch jaringan hanya terjadi sekali (atau
 * sekali lagi jika percobaan sebelumnya gagal).
 * @returns {Promise<Array<{text: string, author: string}>>}
 */
export async function loadQuotes() {
  if (quotesCache) return quotesCache;

  if (!quotesPromise) {
    quotesPromise = fetch(QUOTES_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Gagal memuat ${QUOTES_URL}: HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : (data && Array.isArray(data.quotes) ? data.quotes : []);
        // Validasi ringan: buang entry yang tidak punya teks.
        quotesCache = list.filter((q) => q && typeof q.text === "string" && q.text.trim().length > 0);
        return quotesCache;
      })
      .catch((err) => {
        console.error("Gagal memuat data quotes:", err);
        quotesCache = null;
        throw err;
      })
      .finally(() => {
        quotesPromise = null;
      });
  }

  return quotesPromise;
}

/**
 * Mengembalikan true jika quotes sudah berhasil dimuat & tersedia (>0 item).
 */
export function isQuotesLoaded() {
  return Array.isArray(quotesCache) && quotesCache.length > 0;
}

/**
 * Mengambil satu quote acak secara SYNCHRONOUS dari cache yang sudah dimuat.
 * Panggil loadQuotes() (dan tunggu resolve-nya) minimal sekali sebelum
 * memakai fungsi ini. Mengembalikan null kalau cache belum siap/kosong.
 * @returns {{text: string, author: string}|null}
 */
export function getRandomQuoteSync() {
  if (!isQuotesLoaded()) return null;
  const idx = Math.floor(Math.random() * quotesCache.length);
  return quotesCache[idx];
}