/* All Math Solver: solve a question from a photo
 * 1. Take a photo with the camera (or pick one from the gallery)
 * 2. Crop it to just the question (rotate if needed)
 * 3. The cropped photo is kept and shown above the input / with the solution
 * 4. The text in the photo is read (OCR, done in the browser with Tesseract)
 * 5. The text is put in the math field and solved
 * Libraries are loaded only when the user first opens the photo tool.
 */
(function () {
  'use strict';

  const CROPPER_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.css';
  const CROPPER_JS = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.2/cropper.min.js';
  const TESSERACT_JS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

  const loaded = {};
  function loadScript(src) {
    if (!loaded[src]) {
      loaded[src] = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = resolve;
        s.onerror = () => { delete loaded[src]; reject(new Error('Could not load ' + src)); };
        document.head.appendChild(s);
      });
    }
    return loaded[src];
  }
  function loadCss(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }

  /* ---------------- OCR ---------------- */
  let workerPromise = null;
  let progressCb = null;
  function getWorker() {
    if (!workerPromise) {
      workerPromise = (async () => {
        await loadScript(TESSERACT_JS);
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: (m) => { if (progressCb && m && typeof m.progress === 'number') progressCb(m.status, m.progress); }
        });
        // 6 = one uniform block of text: best for a cropped question
        await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
        return worker;
      })().catch((e) => { workerPromise = null; throw e; });
    }
    return workerPromise;
  }

  // Grey scale, scaled so the text is a size Tesseract likes, with a white border
  function prepareForOcr(canvas, clean = true) {
    const target = 1600;
    const scale = Math.max(0.5, Math.min(3, target / Math.max(canvas.width, canvas.height)));
    const w = Math.round(canvas.width * scale), h = Math.round(canvas.height * scale);
    const pad = Math.round(Math.max(w, h) * 0.04) + 10;
    const out = document.createElement('canvas');
    out.width = w + 2 * pad; out.height = h + 2 * pad;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, pad, pad, w, h);
    const img = ctx.getImageData(0, 0, out.width, out.height);
    const d = img.data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = d[i + 1] = d[i + 2] = g;
      sum += g;
    }
    // light text on a dark background (e.g. a dark-mode screenshot): invert
    if (sum / (d.length / 4) < 110) {
      for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
    }
    if (clean) binarize(d, out.width, out.height);
    ctx.putImageData(img, 0, 0);
    return out;
  }

  // Phone photos have shadows, uneven light and grain. Each pixel is compared with the
  // average brightness around it (Bradley adaptive threshold) after a light blur, so the
  // writing becomes clean black on white wherever it is on the page.
  function binarize(d, w, h) {
    const n = w * h;
    const g = new Float32Array(n);
    for (let i = 0; i < n; i++) g[i] = d[i * 4];
    // 3x3 box blur against grain
    const b = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= w) continue; s += g[yy * w + xx]; c++; } }
      b[y * w + x] = s / c;
    }
    // integral image
    const I = new Float64Array((w + 1) * (h + 1));
    for (let y = 1; y <= h; y++) { let row = 0; for (let x = 1; x <= w; x++) { row += b[(y - 1) * w + x - 1]; I[y * (w + 1) + x] = I[(y - 1) * (w + 1) + x] + row; } }
    const r = Math.max(8, Math.round(Math.max(w, h) / 24));
    const t = 0.16;
    let dark = 0;
    const res = new Uint8Array(n);
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
      for (let x = 0; x < w; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r);
        const cnt = (x1 - x0 + 1) * (y1 - y0 + 1);
        const sum = I[(y1 + 1) * (w + 1) + x1 + 1] - I[y0 * (w + 1) + x1 + 1] - I[(y1 + 1) * (w + 1) + x0] + I[y0 * (w + 1) + x0];
        const on = b[y * w + x] * cnt < sum * (1 - t);
        res[y * w + x] = on ? 0 : 255;
        if (on) dark++;
      }
    }
    if (dark / n > 0.45) return; // looks wrong (e.g. a photo of a dark surface): leave the grey image
    for (let i = 0; i < n; i++) d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = res[i];
  }

  const median = (arr) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };

  // Shadows, the table or the page edge in a photo come out as low-confidence junk words.
  // Keep a line only if its words are mostly read with confidence; drop junk words in it.
  function keepGoodWords(words) {
    words = words.filter(w => (w.text || '').trim());
    if (!words.length) return null;
    // maths ("3x2", "+y=7") is never in Tesseract's dictionary, so it gets low confidence even when right
    const mathy = (w) => /[0-9=+\-*/^()?]/.test(w.text) || /^[a-zA-Z]$/.test(w.text);
    const mean = words.reduce((a, w) => a + w.confidence, 0) / words.length;
    const best = Math.max(...words.map(w => w.confidence));
    const anyMath = words.some(w => /[0-9]/.test(w.text) && (w.confidence >= 30 || /[0-9][=+\-*/^]|[=+\-*/^][0-9a-z]/.test(w.text)));
    if (anyMath ? mean < 12 : (mean < 45 && best < 75)) return null;
    let ws = words.filter(w => mathy(w) ? w.confidence >= 5 : w.confidence >= 35);
    const loneEdge = (w) => w.text.length === 1 && w.confidence < 60 && !/^[=+\-]$/.test(w.text);
    const junkEdge = (w) => !mathy(w) && w.confidence < 65 && w.text.length <= 2;
    const strayMark = (w) => /^[|;:}{\]\[_~'".,]+$|^[JIl]$/.test(w.text);
    const edgeBad = (w) => strayMark(w) || junkEdge(w) || (ws.length > 2 && loneEdge(w));
    // a single digit or letter standing alone after a finished expression ("= 11 4", "and 48 3", "dx 3")
    // or before a capitalised first word ("4 Solve ...") is a speck on the photo, not part of the question
    const strayTail = () => {
      if (ws.length < 2) return false;
      const w = ws[ws.length - 1], prev = ws[ws.length - 2].text;
      if (/^[a-zA-Z]$/.test(w.text) && /(?:sin|cos|tan|sec|cot|csc|log|ln|\^\d|[a-z]\d)$/i.test(prev)) return false;
      if (/^[xyztnk]$/.test(w.text) && (w.confidence >= 60 || /^(?:for|of|in|wrt|respect|to)$/i.test(prev))) return false;
      return /^[0-9a-zA-Z]$/.test(w.text) && w.confidence < 95 && !/(?:^|[=+\-*/^(,:])$|^(?:of|and|is|to|by|from|at|than|power|root|x|y)$/i.test(prev);
    };
    const strayHead = () => ws.length >= 2 && /^[0-9a-zA-Z]$/.test(ws[0].text) && !/^[aAIxy]$/.test(ws[0].text) &&
      (/^[A-Z][a-z]{2,}/.test(ws[1].text) || ws[0].confidence < 70);
    let guard = 0;
    while (ws.length && guard++ < 20) {
      if (edgeBad(ws[ws.length - 1]) || strayTail()) ws.pop();
      else if (edgeBad(ws[0]) || strayHead()) ws.shift();
      else break;
    }
    // a ")" left over at the end that closes nothing
    if (ws.length > 1 && ws[ws.length - 1].text === ')') {
      const txt = ws.map(w => w.text).join(' ');
      if ((txt.match(/\(/g) || []).length < (txt.match(/\)/g) || []).length) ws.pop();
    }
    return ws.length ? ws : null;
  }

  // Rebuild each line from the letters, writing small raised letters as powers: x2 -> x^2
  function lineWithPowers(line) {
    const words = line.words || [];
    const syms = [];
    words.forEach((w, wi) => (w.symbols || []).forEach((s, si) => syms.push({ ...s, wi, first: si === 0 })));
    if (!syms.length) return (line.text || '').trim();
    const isTall = (t) => /[0-9A-Za-z()]/.test(t) && !/[acemnorsuvwxz]/.test(t); // letters with full height
    const tall = syms.filter(s => isTall(s.text));
    const ref = tall.length ? tall : syms;
    const hMed = median(ref.map(s => s.bbox.y1 - s.bbox.y0));
    const bottomMed = median(ref.map(s => s.bbox.y1));
    let out = '';
    let inPow = false;
    let prevWi = -1;
    syms.forEach((s, i) => {
      const h = s.bbox.y1 - s.bbox.y0;
      const word = words[s.wi].text || '';
      const plainWord = /^[A-Za-z]{3,}[.,:;?!]?$/.test(word); // an ordinary word has no powers in it
      const raised = i > 0 && /^[0-9a-z]$/.test(s.text) && !plainWord && hMed > 0 &&
        h < 0.8 * hMed && s.bbox.y1 < bottomMed - 0.28 * hMed;
      const newWord = s.wi !== prevWi && i > 0;
      if (inPow && (!raised || newWord)) { out += '}'; inPow = false; }
      if (newWord) out += ' ';
      if (raised && !inPow) {
        const prev = out.slice(-1);
        if (/[0-9a-zA-Z)\]]/.test(prev)) { out += '^{'; inPow = true; }
      }
      out += s.text;
      prevWi = s.wi;
    });
    if (inPow) out += '}';
    return out.replace(/\^\{([^{}])\}/g, '^$1').trim();
  }

  // Turn what Tesseract read into a question the solver understands
  function cleanText(lines) {
    let ls = lines.map(l => l
      .replace(/[−–—‐‑]/g, '-')
      .replace(/[×✕✖]/g, '*')
      .replace(/[·•∙]/g, '*')
      .replace(/÷/g, '/')
      .replace(/[“”„]/g, '"').replace(/[‘’`´]/g, "'")
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/¹/g, '^1').replace(/⁴/g, '^4')
      .replace(/½/g, '1/2').replace(/¼/g, '1/4').replace(/¾/g, '3/4')
      .replace(/√\s*\(?/g, (m) => (m.includes('(') ? 'sqrt(' : 'sqrt '))
      .replace(/π/g, 'pi')
      .replace(/≠/g, '!=')
      // letters read in place of digits, only when between digits / operators
      .replace(/(?<=[0-9+\-*/=^(])\s*[Oo](?=\s*[0-9+\-*/=)])/g, '0')
      .replace(/(?<=[0-9])[Oo](?=[0-9])/g, '0')
      .replace(/(?<=[0-9+\-*/=(^]\s?)[lI|](?=[0-9])/g, '1')
      .replace(/(?<=[0-9])[lI|](?=[0-9+\-*/=)]|$)/g, '1')
      .replace(/\s+/g, ' ')
      .trim()
      // an instruction word run into the maths: "Solvex^2+4x", "Solve4x-9"
      .replace(/\b(Solve|Simplify|Evaluate|Factori[sz]e|Factor|Expand|Find|Differentiate|Integrate|Calculate|Compute|Prove|Show)(?=[0-9(]|[a-z](?:\^|\d|\s*[=+\-*/)]|$))/gi, '$1 ')
    ).filter(l => l && /[0-9A-Za-z]/.test(l)).map(fixMath);

    // question numbers like "1.", "Q2)", "(a)", "Question 3:" ("Ql." is "Q1." misread)
    ls = ls.map(l => l.replace(/^(?:q(?:uestion|uestion\s*no\.?)?\s*)?(?:\(?\s*(?:[\dlI|]{1,2}|[a-hA-H]|[ivx]{1,4})\s*[.)\]:]\s*)(?=\S)/i, ''));
    ls = ls.filter(Boolean);
    if (!ls.length) return '';

    // several short equations under each other: a system of equations
    const eqLines = ls.filter(l => /=/.test(l) && l.length < 40 && !/[a-z]{4,}/i.test(l.replace(/sqrt|sin|cos|tan|log|ln/g, '')));
    if (ls.length > 1 && eqLines.length === ls.length) return ls.join(', ');
    if (ls.length > 1 && eqLines.length === ls.length - 1 && !/=/.test(ls[0])) return ls[0] + ' ' + eqLines.join(', ');
    return ls.join(' ');
  }

  // Typical misreadings of printed maths (small raised 2 -> "?" or "*", italic x -> z / r / X, 5 -> b)
  function fixMath(l) {
    const mathy = /[=+^]|[\d)]\s*[\-*/]|[\-*/(]\s*[\d(]|\d\s*[a-z]\b|\b(?:sin|cos|tan|log|ln|dx|lim)\b/i.test(l);
    if (!mathy) return l;
    l = l
      .replace(/\b(Sin|Cos|Tan|Sec|Cosec|Csc|Cot|Log|Ln|Lim)(?=[\s(^?*]|\d)/g, (m) => m.toLowerCase())
      .replace(/\b(?:Xx|xX)(?=\d|\b)/g, 'x')
      .replace(/([A-Za-z)\]])\s?[?*º](?=\s*[+\-=)/]|\s*$|\s+[a-zA-Z(])/g, '$1^2') // x? + 1, sin? x, 3x* + 4x
      .replace(/(^|[\s(+\-*/=^\d])X(?=[\s)+\-*/=^\d]|$)/g, '$1x')
      .replace(/(^|[\s(+\-=])b(?=x\b|x[\s+\-=^)])/g, '$15') // bx - 7 -> 5x - 7
      .replace(/d\s?z\s?x\b|\bdz\b(?=\s*$)/g, 'dx')
      .replace(/(\bd[xt])\s+\S$/, '$1') // a stray mark after "dx"
      // x2 + 3x, x3 - 1: a power whose raised digit was read on the line
      .replace(/(^|[^A-Za-z0-9^_])([xyzt])(\d)(?=\s*[+\-=)/]|\s*$)/g, '$1$2^$3');
    // no x anywhere but z / r used like x (next to a number or a power): it is x in italics
    if (!/x/.test(l.replace(/\b(?:exp|max|xor)\b|dx\b/g, ''))) {
      const asVar = /(?:\d|\^)\s?[zr](?![a-z])|(?<![a-z])[zr]\s?\^/;
      if (asVar.test(l)) l = l.replace(/(?<![A-Za-z])[zr](?![A-Za-z])/g, 'x').replace(/(\d)z(?=dx)/g, '$1x');
    }
    return l;
  }

  async function recognise(worker, src) {
    const { data } = await worker.recognize(src, {}, { text: true, blocks: true });
    const lines = [], dbg = [];
    (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(p => (p.lines || []).forEach(l => {
      dbg.push((l.words || []).map(w => w.text + ':' + Math.round(w.confidence)).join(' '));
      const kept = keepGoodWords(l.words || []);
      if (!kept) return;
      const line = lineWithPowers({ ...l, words: kept });
      // the same text read twice (a faint shadow copy of the line)
      const flat = (t) => t.replace(/\s+/g, '').toLowerCase();
      if (line && !lines.some(x => flat(x).includes(flat(line)))) lines.push(line);
    })));
    const text = cleanText(lines);
    return { text, raw: lines.join('\n'), confidence: text ? data.confidence : 0, dbg };
  }

  async function readText(canvas, onProgress) {
    progressCb = onProgress || null;
    try {
      const worker = await getWorker();
      let best = await recognise(worker, prepareForOcr(canvas, true));
      // hard to read: also try the plain grey photo and keep whichever reads better
      if (!best.text || best.confidence < 45) {
        const other = await recognise(worker, prepareForOcr(canvas, false));
        if (other.text && other.confidence > best.confidence) best = other;
      }
      return best;
    } finally {
      progressCb = null;
    }
  }

  /* ---------------- UI ---------------- */
  let modal, els = {}, cropper = null, stream = null, facing = 'environment';
  let currentPhoto = null; // { full: dataURL, thumb: dataURL }

  const isTouch = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const toast = (t, m, k) => (typeof window.showToast === 'function' ? window.showToast(t, m, k) : console.log(t, m));

  function buildModal() {
    if (modal) return;
    modal = document.createElement('div');
    modal.className = 'photo-modal hidden';
    modal.id = 'photoModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'photoModalTitle');
    modal.innerHTML = `
      <div class="photo-dialog">
        <div class="photo-head">
          <h3 id="photoModalTitle"><i class="fa-solid fa-camera"></i> <span data-ph="title">Solve from a photo</span></h3>
          <button type="button" class="photo-x" data-act="close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="photo-stage" data-stage="choose">
          <p class="photo-hint">Take a clear photo of one question, then crop it so only that question is inside the box.</p>
          <div class="photo-choose">
            <button type="button" class="photo-big-btn" data-act="camera"><i class="fa-solid fa-camera"></i><span>Take Photo</span></button>
            <button type="button" class="photo-big-btn alt" data-act="gallery"><i class="fa-regular fa-image"></i><span>Upload Image</span></button>
          </div>
          <p class="photo-tip"><i class="fa-regular fa-lightbulb"></i> Best results: printed or neat handwriting, good light, text straight and in focus.</p>
        </div>

        <div class="photo-stage hidden" data-stage="camera">
          <div class="photo-video-wrap"><video playsinline muted autoplay></video></div>
          <div class="photo-actions">
            <button type="button" class="photo-btn ghost" data-act="back"><i class="fa-solid fa-arrow-left"></i> Back</button>
            <button type="button" class="photo-shutter" data-act="snap" aria-label="Capture photo"></button>
            <button type="button" class="photo-btn ghost" data-act="flip"><i class="fa-solid fa-camera-rotate"></i> Flip</button>
          </div>
        </div>

        <div class="photo-stage hidden" data-stage="crop">
          <p class="photo-hint">Drag the box around your question.</p>
          <div class="photo-crop-wrap"><img alt="Photo to crop"></div>
          <div class="photo-tools">
            <button type="button" class="photo-btn ghost" data-act="rotl" title="Rotate left"><i class="fa-solid fa-rotate-left"></i></button>
            <button type="button" class="photo-btn ghost" data-act="rotr" title="Rotate right"><i class="fa-solid fa-rotate-right"></i></button>
            <button type="button" class="photo-btn ghost" data-act="reset" title="Reset crop"><i class="fa-solid fa-expand"></i></button>
          </div>
          <div class="photo-actions">
            <button type="button" class="photo-btn ghost" data-act="retake"><i class="fa-solid fa-camera"></i> Retake</button>
            <button type="button" class="photo-btn primary" data-act="cropdone"><i class="fa-solid fa-crop-simple"></i> Crop &amp; Solve</button>
          </div>
        </div>

        <div class="photo-stage hidden" data-stage="work">
          <img class="photo-work-img" alt="Your cropped question">
          <div class="photo-progress"><div class="photo-progress-bar"></div></div>
          <p class="photo-status">Reading the question…</p>
        </div>

        <div class="photo-stage hidden" data-stage="view">
          <img class="photo-view-img" alt="Your question photo">
          <div class="photo-actions">
            <button type="button" class="photo-btn ghost" data-act="save"><i class="fa-solid fa-download"></i> Save Photo</button>
            <button type="button" class="photo-btn primary" data-act="close">Close</button>
          </div>
        </div>
      </div>
      <input type="file" accept="image/*" capture="environment" hidden data-in="camera">
      <input type="file" accept="image/*" hidden data-in="gallery">`;
    document.body.appendChild(modal);
    els.video = modal.querySelector('video');
    els.cropImg = modal.querySelector('.photo-crop-wrap img');
    els.workImg = modal.querySelector('.photo-work-img');
    els.viewImg = modal.querySelector('.photo-view-img');
    els.bar = modal.querySelector('.photo-progress-bar');
    els.status = modal.querySelector('.photo-status');
    els.title = modal.querySelector('[data-ph="title"]');
    els.inCam = modal.querySelector('[data-in="camera"]');
    els.inGal = modal.querySelector('[data-in="gallery"]');

    modal.addEventListener('click', (e) => {
      if (e.target === modal) { close(); return; }
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'close') close();
      else if (act === 'camera') openCamera();
      else if (act === 'gallery') els.inGal.click();
      else if (act === 'back') { stopCamera(); show('choose'); }
      else if (act === 'flip') { facing = facing === 'environment' ? 'user' : 'environment'; openCamera(true); }
      else if (act === 'snap') snap();
      else if (act === 'retake') { destroyCropper(); show('choose'); }
      else if (act === 'rotl') cropper && cropper.rotate(-90);
      else if (act === 'rotr') cropper && cropper.rotate(90);
      else if (act === 'reset') cropper && cropper.reset();
      else if (act === 'cropdone') finishCrop();
      else if (act === 'save') savePhoto();
    });
    [els.inCam, els.inGal].forEach(inp => inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      inp.value = '';
      if (f) loadFile(f);
    }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) close();
    });
  }

  function show(stage) {
    modal.querySelectorAll('.photo-stage').forEach(s => s.classList.toggle('hidden', s.dataset.stage !== stage));
    els.title.textContent = stage === 'view' ? 'Your question photo' : stage === 'crop' ? 'Crop your question' : 'Solve from a photo';
  }

  function open() {
    buildModal();
    loadCss(CROPPER_CSS);
    loadScript(CROPPER_JS).catch(() => {});
    getWorker().catch(() => {}); // start downloading the reader in the background
    modal.classList.remove('hidden');
    document.body.classList.add('photo-open');
    show('choose');
  }

  function close() {
    if (!modal) return;
    stopCamera();
    destroyCropper();
    modal.classList.add('hidden');
    document.body.classList.remove('photo-open');
  }

  async function openCamera(again) {
    // Phones: the built-in camera app gives the sharpest photo (focus, flash)
    if (!again && (isTouch() || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
      els.inCam.click();
      return;
    }
    stopCamera();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false
      });
      els.video.srcObject = stream;
      show('camera');
    } catch (err) {
      console.warn('camera', err);
      toast('Camera not available', 'Allow camera access in your browser, or choose "Upload Image".', 'warning');
      els.inCam.click(); // falls back to the device's own picker / camera
    }
  }

  function stopCamera() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (els.video) els.video.srcObject = null;
  }

  function snap() {
    const v = els.video;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    stopCamera();
    startCrop(c.toDataURL('image/jpeg', 0.95));
  }

  function loadFile(file) {
    if (!/^image\//.test(file.type || 'image/')) { toast('Not an image', 'Please choose a photo (JPG, PNG…).', 'warning'); return; }
    // Large phone photos are scaled down first so cropping stays smooth
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 2400;
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      startCrop(c.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => { URL.revokeObjectURL(url); toast('Could not open image', 'Please try a different photo.', 'error'); };
    img.src = url;
  }

  async function startCrop(dataUrl) {
    if (modal.classList.contains('hidden')) { modal.classList.remove('hidden'); document.body.classList.add('photo-open'); }
    destroyCropper();
    show('crop');
    els.cropImg.src = dataUrl;
    try {
      await loadScript(CROPPER_JS);
    } catch (e) {
      toast('Connection Problem', 'The crop tool could not load. Check your internet and try again.', 'error');
      return;
    }
    const init = () => {
      cropper = new Cropper(els.cropImg, {
        viewMode: 1, autoCropArea: 1, background: false, responsive: true,
        dragMode: 'crop', movable: true, zoomable: true, zoomOnWheel: false, toggleDragModeOnDblclick: false
      });
    };
    if (els.cropImg.complete && els.cropImg.naturalWidth) init();
    else els.cropImg.onload = () => { els.cropImg.onload = null; init(); };
  }

  function destroyCropper() {
    if (cropper) { cropper.destroy(); cropper = null; }
  }

  function scaled(canvas, max, quality) {
    const k = Math.min(1, max / Math.max(canvas.width, canvas.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(canvas.width * k)); c.height = Math.max(1, Math.round(canvas.height * k));
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(canvas, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  }

  async function finishCrop() {
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ maxWidth: 2400, maxHeight: 2400, fillColor: '#fff', imageSmoothingQuality: 'high' });
    if (!canvas || !canvas.width) { toast('Nothing selected', 'Drag the box around your question.', 'warning'); return; }
    destroyCropper();
    currentPhoto = { full: scaled(canvas, 1400, 0.88), thumb: scaled(canvas, 420, 0.72), at: Date.now() };
    showPreview(currentPhoto);
    els.workImg.src = currentPhoto.full;
    els.bar.style.width = '3%';
    els.status.textContent = 'Reading the question…';
    show('work');
    try {
      const res = await readText(canvas, (status, p) => {
        const loading = /load|initializ/i.test(status);
        els.status.textContent = loading ? 'Getting the text reader ready (first time only)…' : 'Reading the question…';
        els.bar.style.width = Math.round((loading ? 0.3 * p : 0.3 + 0.7 * p) * 100) + '%';
      });
      els.bar.style.width = '100%';
      close();
      if (!res.text) {
        toast('No text found', 'We could not read any text in the photo. Try a clearer, closer photo, or type the question.', 'warning');
        focusField();
        return;
      }
      putInField(res.text);
      if (res.confidence < 55) toast('Please check the question', 'The photo was hard to read. Check the text in the box and fix anything wrong, then press Calculate.', 'warning');
      if (typeof window.handleCalculate === 'function') window.handleCalculate();
    } catch (err) {
      console.error('OCR', err);
      close();
      toast('Could not read the photo', navigator.onLine ? 'Something went wrong reading the photo. Please try again.' : 'Reading a photo needs an internet connection the first time.', 'error');
    }
  }

  function focusField() {
    const mf = document.getElementById('mainExprInput');
    if (mf && mf.focus) mf.focus();
  }

  // Plain text -> what the maths box holds: words stay words (\text{...}, with their spaces),
  // the maths stays maths
  const MATH_WORDS = /^(?:sin|cos|tan|sec|csc|cosec|cot|sinh|cosh|tanh|log|ln|lim|exp|sqrt|dx|dy|dt|mod|gcd|lcm|pi|max|min)$/;
  function toLatex(text) {
    const toks = String(text).split(/\s+/).filter(Boolean);
    const isWord = (t) => /^[A-Za-z]{2,}[.,:;?!]*$/.test(t) && !MATH_WORDS.test(t.replace(/[.,:;?!]+$/, ''));
    const mathTok = (t) => t
      .replace(/%/g, '\\%')
      .replace(/\b(sinh|cosh|tanh|sin|cos|tan|sec|csc|cot|log|ln|exp|lim|gcd|lcm|max|min)(?![a-zA-Z])/g, '\\$1')
      .replace(/\bpi\b/g, '\\pi')
      .replace(/\^(\d{2,})/g, '^{$1}');
    let out = '', words = [];
    const flush = (last) => {
      if (!words.length) return;
      out += `\\text{${out ? ' ' : ''}${words.join(' ')}${last ? '' : ' '}}`;
      words = [];
    };
    toks.forEach((t, i) => {
      if (isWord(t)) { words.push(t); return; }
      flush(false);
      out += (out && !/\}$/.test(out) ? ' ' : '') + mathTok(t);
    });
    flush(true);
    return out;
  }

  function putInField(text) {
    const mf = document.getElementById('mainExprInput');
    if (!mf) return;
    try { mf.value = toLatex(text); } catch (e) { mf.value = text; }
    if (!String(mf.value || '').trim()) mf.value = text;
  }

  /* preview of the photo the question came from */
  function showPreview(photo) {
    const box = document.getElementById('photoPreview');
    if (!box) return;
    if (!photo) { box.classList.add('hidden'); box.querySelector('img').removeAttribute('src'); return; }
    box.querySelector('img').src = photo.thumb || photo.full;
    box.classList.remove('hidden');
  }

  function viewPhoto(photo) {
    photo = photo || currentPhoto;
    if (!photo) return;
    buildModal();
    els.viewImg.src = photo.full || photo.thumb;
    els.viewing = photo;
    modal.classList.remove('hidden');
    document.body.classList.add('photo-open');
    show('view');
  }

  function savePhoto() {
    const photo = els.viewing || currentPhoto;
    if (!photo) return;
    const a = document.createElement('a');
    a.href = photo.full || photo.thumb;
    a.download = 'math-question-' + new Date(photo.at || Date.now()).toISOString().slice(0, 19).replace(/[:T]/g, '-') + '.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function clearPhoto() {
    currentPhoto = null;
    showPreview(null);
    const r = document.getElementById('resultPhoto');
    if (r) r.classList.add('hidden');
  }

  // Result card: "Question from your photo"
  function showInResult(photo) {
    const r = document.getElementById('resultPhoto');
    if (!r) return;
    if (!photo) { r.classList.add('hidden'); return; }
    r.querySelector('img').src = photo.thumb || photo.full;
    r._photo = photo;
    r.classList.remove('hidden');
  }

  function init() {
    const btn = document.getElementById('btnPhotoSolve');
    if (!btn) return;
    btn.addEventListener('click', (e) => { e.preventDefault(); open(); });
    const prev = document.getElementById('photoPreview');
    if (prev) {
      prev.querySelector('[data-pp="view"]')?.addEventListener('click', () => viewPhoto());
      prev.querySelector('img')?.addEventListener('click', () => viewPhoto());
      prev.querySelector('[data-pp="retake"]')?.addEventListener('click', () => open());
      prev.querySelector('[data-pp="save"]')?.addEventListener('click', () => { els.viewing = null; buildModal(); savePhoto(); });
      prev.querySelector('[data-pp="remove"]')?.addEventListener('click', clearPhoto);
    }
    const r = document.getElementById('resultPhoto');
    r?.addEventListener('click', () => viewPhoto(r._photo));
  }

  window.PhotoSolve = {
    open, close, clearPhoto, showInResult, viewPhoto,
    current: () => currentPhoto,
    // for tests
    _readText: readText, _cleanText: cleanText, _toLatex: toLatex
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
