// js/hand-visualizer.js

// Pemetaan tombol -> jari yang menekan + pose yang tersedia.
// poseKey: tombol pose di img/hands.svg (di-generate oleh
// scripts/import-hand-pose.js). Isi hanya jika pose sudah dibuat.
const keyFingerMap = {
    'a': { finger: 'left-index' },
    'f': { finger: 'left-index', poseKey: 'f' },
    'r': { finger: 'left-index', poseKey: 'r' },
    'v': { finger: 'left-index', poseKey: 'v' },
    't': { finger: 'left-index', poseKey: 't' },
    'g': { finger: 'left-index', poseKey: 'g' },
    'b': { finger: 'left-index', poseKey: 'b' },
    'j': { finger: 'right-index', poseKey: 'j' },
    'u': { finger: 'right-index', poseKey: 'u' },
    'y': { finger: 'right-index', poseKey: 'y' },
    'h': { finger: 'right-index', poseKey: 'h' },
    'n': { finger: 'right-index', poseKey: 'n' },
    'm': { finger: 'right-index', poseKey: 'm' },
    'd': { finger: 'left-middle', poseKey: 'd' },
    'e': { finger: 'left-middle', poseKey: 'e' },
    'c': { finger: 'left-middle', poseKey: 'c' },
    'k': { finger: 'right-middle', poseKey: 'k' },
    'i': { finger: 'right-middle', poseKey: 'i' },
    ',': { finger: 'right-middle', poseKey: ',' },
    's': { finger: 'left-ring', poseKey: 's' },
    'w': { finger: 'left-ring', poseKey: 'w' },
    'x': { finger: 'left-ring', poseKey: 'x' },
    'l': { finger: 'right-ring', poseKey: 'l' },
    'o': { finger: 'right-ring', poseKey: 'o' },
    '.': { finger: 'right-ring', poseKey: '.' },
    ';': { finger: 'right-pinky', poseKey: ';' },
    'p': { finger: 'right-pinky', poseKey: 'p' },
    '/': { finger: 'right-pinky', poseKey: '/' },
    'q': { finger: 'left-pinky', poseKey: 'q' },
    'z': { finger: 'left-pinky', poseKey: 'z' },
    ' ': { finger: 'left-thumb', poseKey: ' ' },
    '1': { finger: 'left-pinky', poseKey: '1' },
    '2': { finger: 'left-ring', poseKey: '2' },
    '3': { finger: 'left-middle', poseKey: '3' },
    '4': { finger: 'left-index', poseKey: '4' },
    '5': { finger: 'left-index', poseKey: '5' },
    '6': { finger: 'right-index', poseKey: '6' },
    '7': { finger: 'right-index', poseKey: '7' },
    '8': { finger: 'right-middle', poseKey: '8' },
    '9': { finger: 'right-ring', poseKey: '9' },
    '0': { finger: 'right-pinky', poseKey: '0' },
};

const HANDS_SVG_URL = 'img/hands.svg';

let svgTextPromise = null;

function getSvgText() {
    if (!svgTextPromise) {
        svgTextPromise = fetch(HANDS_SVG_URL)
            .then(res => {
                if (!res.ok) throw new Error(`Gagal memuat ${HANDS_SVG_URL}: ${res.status}`);
                return res.text();
            })
            .catch(err => {
                console.error(err);
                svgTextPromise = null;
                throw err;
            });
    }
    return svgTextPromise;
}

// Pastikan container punya SVG master terpasang (kalau container di-recreate,
// SVG perlu dipasang ulang).
async function ensureSvg(container) {
    if (container.querySelector('.hands-root')) return;
    const svgText = await getSvgText();
    const wrapper = document.createElement('div');
    wrapper.className = 'hands-root';
    wrapper.innerHTML = svgText;
    container.appendChild(wrapper);
}

function resetPoses(container) {
    const baseFingers = container.querySelectorAll('.hand-finger:not([data-key])');
    baseFingers.forEach(g => g.classList.remove('hide', 'press'));
    const poses = container.querySelectorAll('.hand-finger[data-key]');
    poses.forEach(g => g.classList.remove('active'));
}

function findPoses(container, poseKey) {
    const poses = container.querySelectorAll('.hand-finger[data-key]');
    return [...poses].filter(p => p.getAttribute('data-key') === String(poseKey));
}

function applyPose(container, poseKey) {
    const poses = findPoses(container, poseKey);
    if (poses.length === 0) return false;
    // Tampilkan semua pose untuk tombol ini, sembunyikan versi base jari yang
    // sama agar tidak dobel. Satu tombol boleh melibatkan lebih dari satu jari.
    poses.forEach(pose => {
        pose.classList.add('active');
        const fingerId = pose.getAttribute('data-finger');
        if (fingerId) {
            const baseFinger = container.querySelector(`.hand-finger[data-finger="${fingerId}"]:not([data-key])`);
            if (baseFinger) baseFinger.classList.add('hide');
        }
    });
    return true;
}

function render(container, keyChar) {
    container.style.opacity = '0';

    const keyData = keyChar ? keyFingerMap[keyChar.toLowerCase()] : null;
    if (!keyData) return;

    resetPoses(container);

    applyPose(container, keyData.poseKey);
    container.style.opacity = '1';
}

export function resetHandVisualizer() {
    const handVisualizer = document.getElementById('hand-visualizer');
    if (!handVisualizer) return;
    handVisualizer.style.opacity = '0';
    resetPoses(handVisualizer);
}

export function renderHandVisualizer(keyChar) {
    const handVisualizer = document.getElementById('hand-visualizer');
    if (!handVisualizer) return;

    ensureSvg(handVisualizer)
        .then(() => render(handVisualizer, keyChar))
        .catch(err => console.error('hand-visualizer:', err));
}