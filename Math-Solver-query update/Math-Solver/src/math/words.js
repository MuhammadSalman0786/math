// Everyday maths written in words:
//   "What is 3 plus 4 times 2?"  "12 divided by 4"  "5 squared"  "square root of 144"
//   "area of a circle with radius 3"  "volume of a sphere of radius 2"  "perimeter of a rectangle 5 by 3"
//   "average of 4, 8, 15"  "sum of 1, 2, 3"  "factorial of 6"

const R = String.raw;
const fmt = (v) => { const r = Math.round(v * 1e6) / 1e6; return String(Object.is(r, -0) ? 0 : r); };

// number words → operators
function wordsToOperators(s) {
  return String(s)
    .replace(/\bto\s+the\s+power\s+of\b|\braised\s+to(?:\s+the\s+power)?\b/gi, '^')
    .replace(/\bsquared\b/gi, '^2').replace(/\bcubed\b/gi, '^3')
    .replace(/\bmultiplied\s+by\b|\btimes\b|\binto\b(?=\s*\d)/gi, '*')
    .replace(/\bdivided\s+by\b|\bover\b(?=\s*\d)/gi, '/')
    .replace(/\bplus\b|\badded\s+to\b/gi, '+')
    .replace(/\bminus\b/gi, '-')
    .replace(/\bsquare\s+root\s+of\s+(\d+(?:\.\d+)?)/gi, 'sqrt($1)')
    .replace(/\bcube\s+root\s+of\s+(\d+(?:\.\d+)?)/gi, 'cbrt($1)')
    .replace(/\b(\d+)\s*(?:factorial|!)/gi, '$1!');
}

const num = (re, s) => { const m = s.match(re); return m ? Number(m[1]) : null; };
const unitOf = (s) => { const m = s.match(/\d(?:\.\d+)?\s*(mm|cm|km|m|in(?:ches)?|ft|feet|yd|miles?)\b/i); return m ? m[1].toLowerCase().replace(/inches/, 'in').replace(/feet/, 'ft') : ''; };
function shapeFormula(raw) {
  const s = String(raw).toLowerCase().replace(/,(?=\d{3}\b)/g, '');
  const u = unitOf(s);
  const U = (p) => (u ? `\\ \\text{${u}}${p > 1 ? `^${p}` : ''}` : p === 2 ? R`\ \text{square units}` : p === 3 ? R`\ \text{cubic units}` : R`\ \text{units}`);
  const r0 = num(/radius\s*(?:of|is|=|r\s*=)?\s*(\d+(?:\.\d+)?)/, s) ?? num(/(\d+(?:\.\d+)?)\s*(?:\w+\s+)?radius/, s);
  const d0 = num(/diameter\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/, s);
  const r = r0 ?? (d0 != null ? d0 / 2 : null);
  const h = num(/height\s*(?:of|is|=|h\s*=)?\s*(\d+(?:\.\d+)?)/, s);
  const side = num(/(?:side|edge)(?:\s+length)?\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/, s);
  const want = /circumference|perimeter/.test(s) ? 'perim' : /surface\s+area/.test(s) ? 'surface' : /volume/.test(s) ? 'volume' : /area/.test(s) ? 'area' : null;
  if (!want) return null;
  const out = (title, formula, sub, value, power, exactPi) => {
    const v = fmt(value);
    const steps = [{ label: `${title}:`, katex: formula }, { label: 'Substitute the values:', katex: sub }];
    if (exactPi) steps.push({ label: 'Exact value:', katex: exactPi });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${exactPi ? `${exactPi} \\approx ` : ''}${v}${U(power)}}` });
    return { answer: `${exactPi ? `${exactPi} \\approx ` : ''}${v}${U(power)}`, steps };
  };
  const piTex = (c) => (c === 1 ? R`\pi` : `${fmt(c)}\\pi`);
  if (/circle/.test(s) && r != null) {
    const pre = d0 != null && r0 == null ? [`r = \\frac{d}{2} = ${fmt(r)}`] : [];
    if (want === 'area') { const o = out('Area of a circle', R`A = \pi r^2`, `${pre.length ? pre[0] + ', \\quad ' : ''}A = \\pi \\times ${fmt(r)}^2`, Math.PI * r * r, 2, piTex(r * r)); return o; }
    if (want === 'perim') return out('Circumference of a circle', R`C = 2\pi r`, `${pre.length ? pre[0] + ', \\quad ' : ''}C = 2\\pi \\times ${fmt(r)}`, 2 * Math.PI * r, 1, piTex(2 * r));
  }
  if (/sphere|ball/.test(s) && r != null) {
    if (want === 'volume') return out('Volume of a sphere', R`V = \frac{4}{3}\pi r^3`, `V = \\frac{4}{3}\\pi \\times ${fmt(r)}^3`, 4 / 3 * Math.PI * r ** 3, 3, (Number.isInteger(4 * r ** 3 / 3) ? piTex(4 * r ** 3 / 3) : `\\frac{${fmt(4 * r ** 3)}}{3}\\pi`));
    if (want === 'surface' || want === 'area') return out('Surface area of a sphere', R`A = 4\pi r^2`, `A = 4\\pi \\times ${fmt(r)}^2`, 4 * Math.PI * r * r, 2, piTex(4 * r * r));
  }
  if (/cylinder/.test(s) && r != null && h != null) {
    if (want === 'volume') return out('Volume of a cylinder', R`V = \pi r^2 h`, `V = \\pi \\times ${fmt(r)}^2 \\times ${fmt(h)}`, Math.PI * r * r * h, 3, piTex(r * r * h));
    if (want === 'surface' || want === 'area') return out('Total surface area of a cylinder', R`A = 2\pi r^2 + 2\pi r h`, `A = 2\\pi(${fmt(r)})^2 + 2\\pi(${fmt(r)})(${fmt(h)})`, 2 * Math.PI * r * (r + h), 2, piTex(2 * r * (r + h)));
  }
  if (/cone/.test(s) && r != null && h != null && want === 'volume') return out('Volume of a cone', R`V = \frac{1}{3}\pi r^2 h`, `V = \\frac{1}{3}\\pi \\times ${fmt(r)}^2 \\times ${fmt(h)}`, Math.PI * r * r * h / 3, 3, Number.isInteger(r * r * h / 3) ? piTex(r * r * h / 3) : `\\frac{${fmt(r * r * h)}}{3}\\pi`);
  if (/cube/.test(s) && side != null) {
    if (want === 'volume') return out('Volume of a cube', R`V = a^3`, `V = ${fmt(side)}^3`, side ** 3, 3);
    if (want === 'surface' || want === 'area') return out('Surface area of a cube', R`A = 6a^2`, `A = 6 \\times ${fmt(side)}^2`, 6 * side * side, 2);
  }
  if (/square/.test(s) && !/root/.test(s) && side != null) {
    if (want === 'area') return out('Area of a square', R`A = a^2`, `A = ${fmt(side)}^2`, side * side, 2);
    if (want === 'perim') return out('Perimeter of a square', R`P = 4a`, `P = 4 \\times ${fmt(side)}`, 4 * side, 1);
  }
  if (/rectangle|rectangular/.test(s)) {
    let l = num(/length\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/, s), w = num(/(?:width|breadth)\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/, s);
    const by = s.match(/(\d+(?:\.\d+)?)\s*(?:[a-z]+\s*)?(?:by|x|×|\*)\s*(\d+(?:\.\d+)?)/);
    if ((l == null || w == null) && by) { l = Number(by[1]); w = Number(by[2]); }
    if (l != null && w != null) {
      if (want === 'area') return out('Area of a rectangle', R`A = l \times w`, `A = ${fmt(l)} \\times ${fmt(w)}`, l * w, 2);
      if (want === 'perim') return out('Perimeter of a rectangle', R`P = 2(l + w)`, `P = 2(${fmt(l)} + ${fmt(w)})`, 2 * (l + w), 1);
    }
  }
  if (/triangle/.test(s) && want === 'area') {
    const b = num(/base\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/, s);
    if (b != null && h != null) return out('Area of a triangle', R`A = \frac{1}{2} \times \text{base} \times \text{height}`, `A = \\frac{1}{2} \\times ${fmt(b)} \\times ${fmt(h)}`, b * h / 2, 2);
    const sides = s.match(/sides?\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,?\s*(?:and\s*)?(\d+(?:\.\d+)?)/);
    if (sides) {
      const [a, bb, c] = sides.slice(1, 4).map(Number), p = (a + bb + c) / 2, A2 = p * (p - a) * (p - bb) * (p - c);
      if (A2 <= 0) return null;
      return { answer: `${fmt(Math.sqrt(A2))}${U(2)}`, steps: [{ label: "Heron's formula, with the semi-perimeter s:", katex: R`A = \sqrt{s(s-a)(s-b)(s-c)}, \quad s = \frac{a+b+c}{2}` }, { label: 'Substitute:', katex: `s = \\frac{${a} + ${bb} + ${c}}{2} = ${fmt(p)}, \\quad A = \\sqrt{${fmt(p)}(${fmt(p - a)})(${fmt(p - bb)})(${fmt(p - c)})} = \\sqrt{${fmt(A2)}}` }, { label: 'Final Answer:', katex: `\\mathbf{${fmt(Math.sqrt(A2))}${U(2)}}` }] };
    }
  }
  // a shape with no measurements: give the formula
  const F = [
    [/circle/, 'area', R`A = \pi r^2`], [/circle/, 'perim', R`C = 2\pi r = \pi d`], [/sphere/, 'volume', R`V = \frac{4}{3}\pi r^3`], [/sphere/, 'surface', R`A = 4\pi r^2`],
    [/cylinder/, 'volume', R`V = \pi r^2 h`], [/cylinder/, 'surface', R`A = 2\pi r^2 + 2\pi r h`], [/cone/, 'volume', R`V = \frac{1}{3}\pi r^2 h`], [/cube/, 'volume', R`V = a^3`], [/cube/, 'surface', R`A = 6a^2`],
    [/square/, 'area', R`A = a^2`], [/square/, 'perim', R`P = 4a`], [/rectangle/, 'area', R`A = l \times w`], [/rectangle/, 'perim', R`P = 2(l + w)`], [/triangle/, 'area', R`A = \frac{1}{2}bh`], [/trapezi?um|trapezoid/, 'area', R`A = \frac{1}{2}(a + b)h`], [/parallelogram/, 'area', R`A = bh`]
  ];
  if (!/\d/.test(s)) for (const [re, w, f] of F) if (re.test(s) && (w === want || (want === 'area' && w === 'surface' && /sphere|cube|cylinder/.test(s)))) {
    return { answer: f, steps: [{ label: 'Formula:', katex: f }, { label: 'Give the measurements (for example "with radius 3") to get a number.', katex: '' }, { label: 'Final Answer:', katex: `\\mathbf{${f}}` }] };
  }
  return null;
}

function listStats(raw) {
  const s = String(raw).toLowerCase();
  const m = s.match(/\b(average|mean|median|mode|range|sum|total|product)\s+of\s+(?:the\s+numbers?\s+)?([-\d.,\sand]+)/);
  if (!m) return null;
  const xs = m[2].split(/[\s,]+|and/).filter(t => /^-?\d+(?:\.\d+)?$/.test(t)).map(Number);
  if (xs.length < 2) return null;
  const kind = m[1] === 'average' ? 'mean' : m[1] === 'total' ? 'sum' : m[1];
  const sum = xs.reduce((a, b) => a + b, 0);
  const sorted = [...xs].sort((a, b) => a - b);
  const steps = [{ label: 'Numbers:', katex: xs.join(',\\ ') }];
  let ans;
  if (kind === 'sum') { ans = fmt(sum); steps.push({ label: 'Add them:', katex: `${xs.join(' + ')} = ${ans}`.replace(/\+ -/g, '- ') }); }
  else if (kind === 'product') { ans = fmt(xs.reduce((a, b) => a * b, 1)); steps.push({ label: 'Multiply them:', katex: `${xs.join(R` \times `)} = ${ans}` }); }
  else if (kind === 'mean') { ans = fmt(sum / xs.length); steps.push({ label: 'Mean = sum ÷ how many numbers:', katex: `\\frac{${xs.join(' + ')}}{${xs.length}} = \\frac{${fmt(sum)}}{${xs.length}} = ${ans}`.replace(/\+ -/g, '- ') }); }
  else if (kind === 'median') {
    steps.push({ label: 'Put them in order:', katex: sorted.join(',\\ ') });
    const n = sorted.length; ans = n % 2 ? fmt(sorted[(n - 1) / 2]) : fmt((sorted[n / 2 - 1] + sorted[n / 2]) / 2);
    steps.push({ label: n % 2 ? 'The middle value:' : 'Average of the two middle values:', katex: n % 2 ? ans : `\\frac{${sorted[n / 2 - 1]} + ${sorted[n / 2]}}{2} = ${ans}` });
  } else if (kind === 'mode') {
    const cnt = new Map(); xs.forEach(x => cnt.set(x, (cnt.get(x) || 0) + 1));
    const mx = Math.max(...cnt.values()); const modes = [...cnt].filter(([, c]) => c === mx).map(([x]) => x);
    ans = mx === 1 ? R`\text{no mode (every value appears once)}` : modes.join(',\\ ');
    steps.push({ label: 'Count how often each value appears:', katex: [...cnt].map(([x, c]) => `${x}: ${c}`).join(',\\ ') });
  } else { ans = fmt(sorted[sorted.length - 1] - sorted[0]); steps.push({ label: 'Range = largest − smallest:', katex: `${sorted[sorted.length - 1]} - ${sorted[0]} = ${ans}`.replace(/- -/g, '+ ') }); }
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

module.exports = { wordsToOperators, shapeFormula, listStats };
