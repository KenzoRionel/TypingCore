const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000/learn-typing.html', { waitUntil: 'networkidle2' });

  // Tunggu elemen judul pelajaran muncul
  await page.waitForSelector('#lesson-title');

  // Ambil teks judul pelajaran
  const lessonTitle = await page.$eval('#lesson-title', el => el.textContent);

  if (lessonTitle.includes('Pelajaran 9')) {
    console.log('Pelajaran 9 ditemukan:', lessonTitle);
  } else {
    console.error('Pelajaran 9 tidak ditemukan. Judul saat ini:', lessonTitle);
  }

  await browser.close();
})();
