// scripts/import-hand-pose.js
//
// Mengimpor pose jari dari file hand_<key>.svg ke master img/hands.svg.
//
// Cara pakai:
//   node scripts/import-hand-pose.js <file-pose.svg> <key>
//   contoh: node scripts/import-hand-pose.js img/hand_a.svg a
//
// Cara kerja:
//   1. Baca base img/main_hands.svg sebagai pose "istirahat".
//   2. Kelompokkan path di file pose berdasarkan warna stroke (setiap jari
//      punya warna unik di main_hands.svg).
//   3. Bandingkan dengan base per jari. Jari yang benar-benar berubah posisi
//      (path beda / transform beda di luar toleransi re-export) diekstrak.
//   4. Rebuild penuh img/hands.svg: base + semua pose yang sudah ada
//      (pose untuk key sama diganti). Proses idempoten - tidak pernah dobel.
//
// Master dipertahankan secara otomatis - tidak perlu diedit manual.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE_FILE = path.join(ROOT, 'img', 'main_hands.svg');
const MASTER_FILE = path.join(ROOT, 'img', 'hands.svg');

// Warna stroke tiap jari di main_hands.svg (harus unik per jari).
const FINGER_BY_COLOR = {
    '#7ed957': 'left-pinky',
    '#cb6ce6': 'left-ring',
    '#af4c0f': 'left-thumb',
    '#ff6d4d': 'left-index',
    '#00bf63': 'left-palm',
    '#0571d3': 'left-middle',
    '#9cdc8f': 'right-pinky',
    '#5170ff': 'right-ring',
    '#ffde59': 'right-middle',
    '#ff3131': 'right-index',
    '#ff5757': 'right-thumb',
    '#5ce1e6': 'right-palm',
};

const TOLERANCE = 1;

function fail(msg) {
    console.error(`[ERROR] ${msg}`);
    process.exit(1);
}

function nums(str) {
    return (str.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}

// ==== Parsing SVG sederhana ====

function parseSvg(svgText) {
    const groups = []; // { id, stroke }
    const paths = [];  // { stroke, transform, d, clip }
    const clipPaths = {}; // id -> inner markup

    const tagRe = /<(defs|clipPath|g|path)\b[^>]*>|<\/defs>|<\/clipPath>|<\/g>/g;
    let m;
    let currentDefs = false;
    let strokeStack = [];

    while ((m = tagRe.exec(svgText)) !== null) {
        const tag = m[0];

        if (tag === '</defs>') { currentDefs = false; continue; }
        if (tag === '</clipPath>') { continue; }
        if (tag === '</g>') { strokeStack.pop(); continue; }

        if (tag.startsWith('<defs')) { currentDefs = true; continue; }

        if (tag.startsWith('<clipPath')) {
            if (!currentDefs) continue;
            const idMatch = /id="([^"]+)"/.exec(tag);
            if (!idMatch) continue;
            const start = m.index;
            const innerStart = svgText.indexOf('>', start) + 1;
            const endIdx = svgText.indexOf('</clipPath>', innerStart);
            if (endIdx === -1) continue;
            clipPaths[idMatch[1]] = svgText.slice(innerStart, endIdx).trim();
            continue;
        }

        if (tag.startsWith('<g')) {
            const idMatch = /id="([^"]+)"/.exec(tag);
            const strokeMatch = /stroke="(#[0-9a-fA-F]+)"/.exec(tag);
            const stroke = strokeMatch ? strokeMatch[1]
                : (strokeStack.length ? strokeStack[strokeStack.length - 1] : null);
            if (idMatch) groups.push({ id: idMatch[1], stroke });
            strokeStack.push(stroke);
            continue;
        }

        if (tag.startsWith('<path')) {
            const strokeMatch = /stroke="(#[0-9a-fA-F]+)"/.exec(tag);
            const stroke = strokeMatch ? strokeMatch[1]
                : (strokeStack.length ? strokeStack[strokeStack.length - 1] : null);
            const transformMatch = /transform="([^"]*)"/.exec(tag);
            const dMatch = /d="([^"]*)"/.exec(tag);
            const clipMatch = /clip-path="url\(#([^)]+)\)"/.exec(tag);
            if (!stroke || !transformMatch || !dMatch) continue;
            paths.push({
                stroke,
                transform: transformMatch[1],
                d: dMatch[1],
                clip: clipMatch ? clipMatch[1] : null,
            });
        }
    }

    return { groups, paths, clipPaths };
}

function samePath(a, b) {
    const na = nums(a.transform), nb = nums(b.transform);
    const da = nums(a.d), db = nums(b.d);
    if (na.length !== nb.length || da.length !== db.length) return false;
    for (let i = 0; i < na.length; i++) {
        if (Math.abs(na[i] - nb[i]) > TOLERANCE) return false;
    }
    for (let i = 0; i < da.length; i++) {
        if (Math.abs(da[i] - db[i]) > TOLERANCE) return false;
    }
    return true;
}

function pathsByFinger(parsed, colorToFinger) {
    const byFinger = {};
    for (const p of parsed.paths) {
        const finger = colorToFinger[p.stroke] || p.stroke;
        if (!byFinger[finger]) byFinger[finger] = [];
        byFinger[finger].push(p);
    }
    return byFinger;
}

function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ==== Ekstraksi blok <g ...>...</g> (menghormati nesting) ====

function extractGroupBlock(text, openTag) {
    const start = text.indexOf(openTag);
    if (start === -1) return null;
    const contentStart = text.indexOf('>', start) + 1;
    let depth = 1;
    let i = contentStart;
    while (i < text.length && depth > 0) {
        const nextOpen = text.indexOf('<g', i);
        const nextClose = text.indexOf('</g>', i);
        if (nextClose === -1) return null;
        if (nextOpen !== -1 && nextOpen < nextClose) {
            depth++;
            i = nextOpen + 2;
        } else {
            depth--;
            i = nextClose + 4;
        }
    }
    return text.slice(start, i);
}

function collectPoseBlocks(masterText) {
    // Ambil semua blok <g id="pose-...">...</g> yang sudah ada di master.
    const blocks = [];
    if (!masterText) return blocks;
    const idRe = /<g id="pose-[^"]+"[^>]*>/g;
    let m;
    while ((m = idRe.exec(masterText)) !== null) {
        const openTag = m[0];
        const start = m.index;
        const contentStart = m.index + openTag.length;
        let depth = 1;
        let i = contentStart;
        while (i < masterText.length && depth > 0) {
            const nextOpen = masterText.indexOf('<g', i);
            const nextClose = masterText.indexOf('</g>', i);
            if (nextClose === -1) break;
            if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                i = nextOpen + 2;
            } else {
                depth--;
                i = nextClose + 4;
            }
        }
        const block = masterText.slice(start, i);
        const keyMatch = /data-key="([^"]+)"/.exec(openTag);
        blocks.push({ block, key: keyMatch ? keyMatch[1] : null });
    }
    return blocks;
}

function buildMaster(baseText, baseParsed) {
    const svgOpenEnd = baseText.indexOf('>') + 1;
    const header = baseText.slice(0, svgOpenEnd);

    const defsMatch = /<defs>([\s\S]*?)<\/defs>/.exec(baseText);
    const defsInner = defsMatch ? defsMatch[1].trim() : '';

    const fingerGroups = [];
    for (const g of baseParsed.groups) {
        const block = extractGroupBlock(baseText, `<g id="${g.id}"`);
        if (!block) continue;
        // Pertahankan seluruh atribut styling di tag <g> asli (stroke-width,
        // fill, stroke-linecap, dst) dengan mengganti id saja.
        const openTag = block.slice(0, block.indexOf('>') + 1);
        const attrs = [];
        const attrRe = /([a-zA-Z-]+)="([^"]*)"/g;
        let am;
        while ((am = attrRe.exec(openTag)) !== null) {
            if (am[1] === 'id') continue;
            attrs.push(`${am[1]}="${am[2]}"`);
        }
        const innerStart = openTag.length;
        const inner = block.slice(innerStart, block.length - '</g>'.length).trim();
        fingerGroups.push(`    <g id="finger-${g.id}" class="hand-finger" data-finger="${g.id}" ${attrs.join(' ')}>\n        ${inner}\n    </g>`);
    }

    return {
        header,
        defsInner,
        fingerGroups,
    };
}

// ==== Main ====

function main() {
    const [poseArg, keyArg] = process.argv.slice(2);
    if (!poseArg || !keyArg) {
        console.log('Cara pakai: node scripts/import-hand-pose.js <file-pose.svg> <key>');
        console.log('Contoh:     node scripts/import-hand-pose.js img/hand_a.svg a');
        process.exit(0);
    }
    const key = keyArg.toLowerCase();
    const poseFile = path.resolve(ROOT, poseArg);
    if (!fs.existsSync(poseFile)) fail(`File pose tidak ditemukan: ${poseArg}`);
    if (!fs.existsSync(BASE_FILE)) fail(`Base tidak ditemukan: ${BASE_FILE}`);

    const baseText = fs.readFileSync(BASE_FILE, 'utf8');
    const poseText = fs.readFileSync(poseFile, 'utf8');

    const baseParsed = parseSvg(baseText);
    const poseParsed = parseSvg(poseText);

    const baseByFinger = pathsByFinger(baseParsed, FINGER_BY_COLOR);
    const poseByFinger = pathsByFinger(poseParsed, FINGER_BY_COLOR);

    // Jari yang benar-benar berubah.
    const changed = {};
    const allFingers = new Set([...Object.keys(baseByFinger), ...Object.keys(poseByFinger)]);
    for (const finger of allFingers) {
        const basePaths = baseByFinger[finger] || [];
        const posePaths = poseByFinger[finger] || [];
        const same = basePaths.length === posePaths.length
            && basePaths.every((p, i) => posePaths[i] && samePath(p, posePaths[i]));
        if (!same) changed[finger] = posePaths;
    }

    if (Object.keys(changed).length === 0) {
        console.log(`Tidak ada perubahan posisi jari untuk tombol "${key}" - tidak diimpor.`);
        return;
    }

    // Ambil clipPath yang dipakai pose berubah (untuk palm misalnya).
    const neededClips = new Set();
    for (const paths of Object.values(changed)) {
        for (const p of paths) {
            if (p.clip) neededClips.add(p.clip);
        }
    }

    const clipRename = {};
    const clipDefs = [];
    for (const clipId of neededClips) {
        const inner = poseParsed.clipPaths[clipId];
        if (!inner) continue;
        const newId = `pose-${key}-${clipId}`;
        clipRename[clipId] = newId;
        clipDefs.push(`<clipPath id="${newId}">${inner}</clipPath>`);
    }

    // Warna stroke tiap jari (dari base) agar group pose diwarnai konsisten.
    const fingerStrokes = {};
    for (const g of baseParsed.groups) {
        if (g.stroke) fingerStrokes[g.id] = g.stroke;
    }

    const newPoseBlock = buildPoseBlock(changed, key, fingerStrokes, clipRename);

    // ==== Rebuild master ====

    const master = buildMaster(baseText, baseParsed);
    const masterText = fs.existsSync(MASTER_FILE) ? fs.readFileSync(MASTER_FILE, 'utf8') : '';

    // Kumpulkan pose lama (kecuali yang key-nya sama dengan yang baru).
    const existingBlocks = collectPoseBlocks(masterText)
        .filter(b => b.key !== key)
        .map(b => b.block);

    const poseClipIds = new Set();
    for (const b of existingBlocks) {
        const cRe = /url\(#pose-[^)]+\)/g;
        let cm;
        while ((cm = cRe.exec(b)) !== null) {
            poseClipIds.add(cm[0].slice('url(#'.length, -1));
        }
    }
    for (const cd of clipDefs) {
        const id = /id="([^"]+)"/.exec(cd)[1];
        poseClipIds.add(id);
    }

    const poseClipDefs = [...poseClipIds].map(id => {
        const inner = masterText ? clipPathInnerFromMaster(masterText, id) : null;
        return inner ? `<clipPath id="${id}">${inner}</clipPath>` : null;
    }).filter(Boolean);

    const out = `${master.header}
    <defs>
        ${master.defsInner}
        ${poseClipDefs.join('\n        ')}
    </defs>
${master.fingerGroups.join('\n')}
${existingBlocks.join('\n')}
${newPoseBlock}
</svg>`;

    fs.writeFileSync(MASTER_FILE, out, 'utf8');
    console.log(`Pose tombol "${key}" diimpor ke img/hands.svg`);
    console.log(`Jari yang berubah: ${Object.keys(changed).join(', ')}`);
}

function buildPoseBlock(changed, key, fingerStrokes, clipRename) {
    // Styling default (konsisten dengan base): stroke-width 40, dsb.
    const STYLE_ATTRS = 'class="hand-finger" fill="none" stroke-linecap="butt" stroke-linejoin="miter" stroke-width="40"';
    let poseMarkup = '';
    for (const [finger, paths] of Object.entries(changed)) {
        const strokeAttr = fingerStrokes[finger] ? ` stroke="${fingerStrokes[finger]}"` : '';
        const body = paths.map(p => {
            const clipAttr = p.clip && clipRename[p.clip]
                ? ` clip-path="url(#${clipRename[p.clip]})"`
                : '';
            return `<path transform="${p.transform}"${clipAttr} d="${p.d}"/>`;
        }).join('\n        ');
        poseMarkup += `    <g id="pose-${finger}-${key}" data-key="${esc(key)}" data-finger="${esc(finger)}" ${STYLE_ATTRS}${strokeAttr}>\n        ${body}\n    </g>`;
    }
    return poseMarkup;
}

function clipPathInnerFromMaster(masterText, id) {
    const dRe = /<defs>([\s\S]*?)<\/defs>/;
    const dm = dRe.exec(masterText);
    if (!dm) return null;
    const cRe = new RegExp(`<clipPath id="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">([\\s\\S]*?)<\\/clipPath>`);
    const cm = cRe.exec(dm[1]);
    return cm ? cm[1].trim() : null;
}

main();