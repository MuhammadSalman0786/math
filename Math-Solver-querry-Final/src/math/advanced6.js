// Undergraduate and graduate question types:
// line integrals (scalar and vector), Stokes' theorem, curl / divergence / gradient, double integrals
// over rectangles, separable ODEs, Laplace and inverse Laplace transforms, heat and wave equations with
// sine initial data, epsilon–delta proofs, limits of integrals by dominated convergence, residues and
// contour integrals, and topological invariants of standard spaces.

const { Q } = require('./rational');
const S = require('./symbolic');
const P = require('./polynomial');
const A1 = require('./advanced1');
const { plain } = require('./advanced4');

const R = String.raw;
const qn = (v) => new Q(BigInt(v));
const qt = (q) => q.toTex();
function toFrac(v, maxDen = 360, tol = 1e-9) {
  if (!Number.isFinite(v)) return null;
  for (let d = 1; d <= maxDen; d++) { const n = Math.round(v * d); if (Math.abs(n / d - v) < tol * Math.max(1, Math.abs(v))) return new Q(BigInt(n), BigInt(d)); }
  return null;
}
const fmt = (v) => { const r = Math.round(v * 1e6) / 1e6; return String(Object.is(r, -0) ? 0 : r); };
// recognise a real number as p/q, (p/q)π, (p/q)√n or (p/q)π²
function niceNumber(v) {
  if (Math.abs(v) < 1e-10) return '0';
  const f = toFrac(v, 120, 1e-9);
  if (f) return qt(f);
  const fp = toFrac(v / Math.PI, 120, 1e-9);
  if (fp) return fp.equals(qn(1)) ? '\\pi' : fp.equals(qn(-1)) ? '-\\pi' : fp.d === 1n ? `${fp.n}\\pi` : `\\frac{${fp.n === 1n ? '' : fp.n === -1n ? '-' : fp.n}\\pi}{${fp.d}}`;
  const fp2 = toFrac(v / (Math.PI * Math.PI), 60, 1e-9);
  if (fp2) return fp2.equals(qn(1)) ? '\\pi^2' : `${qt(fp2)}\\pi^2`;
  for (const r of [2, 3, 5, 6, 7]) { const fr = toFrac(v / Math.sqrt(r), 60, 1e-9); if (fr) return `${fr.equals(qn(1)) ? '' : fr.equals(qn(-1)) ? '-' : qt(fr)}\\sqrt{${r}}`; }
  return null;
}
const showNum = (v) => niceNumber(v) || `${fmt(v)}`;
const simpson = (f, a, b, n = 2000) => { const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return s * h / 3; };
const pm = (str) => A1.parseMath(String(str).trim());

// split "(a, b, c)" respecting nested parentheses
function splitTop(str) {
  const out = []; let d = 0, cur = '';
  for (const ch of str) { if ('([{'.includes(ch)) d++; if (')]}'.includes(ch)) d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur); return out.map(t => t.trim()).filter(Boolean);
}
function parseVectorField(s) {
  // F = (P, Q[, R]) / <P, Q> / P i + Q j + R k
  let m = s.match(/(?:F|v|field)\s*(?:\(\s*x\s*,\s*y(?:\s*,\s*z)?\s*\))?\s*=\s*[(<⟨]\s*([^=]+?)\s*[)>⟩](?=\s*(?:,|\.|and|where|over|along|on|around|$|\s(?:c|is|for|in)\b))/i);
  if (m) { const comps = splitTop(m[1]); if (comps.length >= 2 && comps.length <= 3) { const nodes = comps.map(pm); if (nodes.every(Boolean)) return nodes; } }
  m = s.match(/(?:F|v)\s*=\s*([^=]*?(?:i|j|k)[^=,]*?)(?=\s*(?:,|where|over|along|on|around|$))/i);
  if (m) {
    const t = m[1].replace(/\s+/g, '').replace(/\\mathbf|\\hat|\\vec/g, '').replace(/[{}]/g, '');
    const comps = { i: '0', j: '0', k: '0' };
    const re = /([+-]?)(\([^()]*\)|[^+\-ijk]*?)\*?([ijk])(?![a-z])/g; let mm, any = false;
    while ((mm = re.exec(t))) { any = true; const c = mm[2] === '' ? '1' : mm[2]; comps[mm[3]] = `(${comps[mm[3]]})${mm[1] === '-' ? '-' : '+'}(${c})`; }
    if (any) { const n = [comps.i, comps.j, comps.k].map(pm); if (n.every(Boolean)) return /k/.test(t) ? n : n.slice(0, 2); }
  }
  return null;
}
// a curve: explicit parametrisation, circle, segment or y = g(x)
function parseCurve(s) {
  const range = s.match(/(-?[\d.]*\s*(?:π|pi)?|-?\d+(?:\/\d+)?|\(\([^)]*\)\/\([^)]*\)\))\s*(?:≤|<=|<|\\le|\\leq)\s*t\s*(?:≤|<=|<|\\le|\\leq)\s*(-?[\d.]*\s*(?:π|pi)?|\d+(?:\/\d+)?|\(\([^)]*\)\/\([^)]*\)\))/);
  const num = (t) => { if (t === undefined) return null; const x = t.replace(/\s+/g, '').replace(/π/g, 'pi'); if (/^-?pi$/.test(x)) return x.startsWith('-') ? -Math.PI : Math.PI; const mm = x.match(/^(-?[\d.]+)pi$/); if (mm) return Number(mm[1]) * Math.PI; const n = pm(x.replace(/pi/g, 'π')); return n ? S.evaluate(n) : null; };
  const xm = s.match(/\bx\s*(?:\(t\))?\s*=\s*([^,;=]+?)(?=\s*,|\s+and\b|\s*;)/), ym = s.match(/\by\s*(?:\(t\))?\s*=\s*([^,;=]+?)(?=\s*,|\s+and\b|\s*;|\s*$)/), zm = s.match(/\bz\s*(?:\(t\))?\s*=\s*([^,;=]+?)(?=\s*,|\s+and\b|\s*;|\s*$)/);
  const rm = s.match(/r\s*\(\s*t\s*\)\s*=\s*[(<⟨]\s*([^=]+?)\s*[)>⟩]/);
  if (rm && range) { const comps = splitTop(rm[1]).map(pm); if (comps.every(Boolean)) return { comps, t0: num(range[1]), t1: num(range[2]), desc: 'r(t)' }; }
  if (xm && ym && range && /t/.test(xm[1] + ym[1])) {
    const comps = [pm(xm[1]), pm(ym[1])]; if (zm && /t/.test(zm[1])) comps.push(pm(zm[1]));
    if (comps.every(Boolean)) return { comps, t0: num(range[1]), t1: num(range[2]) };
  }
  const circ = s.match(/x\s*\^\s*2\s*\+\s*y\s*\^\s*2\s*=\s*([\d.]+)/) || (/unit circle/i.test(s) ? ['', '1'] : null);
  if (circ) {
    const r = Math.sqrt(Number(circ[1]));
    const rt = Number.isInteger(r) ? (r === 1 ? '' : String(r)) : `\\sqrt{${circ[1]}}`;
    const rr = Number.isInteger(r) ? String(r) : `sqrt(${circ[1]})`;
    const cw = /clockwise/i.test(s) && !/counter|anti/i.test(s);
    const comps = [pm(`${rr}*cos(t)`), pm(`${cw ? '-' : ''}${rr}*sin(t)`)];
    const zc = s.match(/(?:plane|in)\s*z\s*=\s*(-?[\d.]+)/);
    if (zc) comps.push(pm(zc[1]));
    return { comps, t0: 0, t1: 2 * Math.PI, desc: `x = ${rt}\\cos t,\\ y = ${cw ? '-' : ''}${rt}\\sin t${zc ? `,\\ z = ${zc[1]}` : ''},\\ 0 \\le t \\le 2\\pi` + (cw ? ' (clockwise)' : ' (anticlockwise)') };
  }
  const seg = s.match(/from\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)\s*to\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
  if (seg && !/y\s*=\s*x\^/.test(s)) {
    const [x0, y0, x1, y1] = seg.slice(1).map(Number);
    return { comps: [pm(`${x0}+(${x1 - x0})*t`), pm(`${y0}+(${y1 - y0})*t`)], t0: 0, t1: 1, desc: `\\text{segment: } x = ${x0} + ${x1 - x0}t,\\ y = ${y0} + ${y1 - y0}t,\\ 0 \\le t \\le 1` };
  }
  const gr = s.match(/y\s*=\s*([^,;]+?)\s*(?:from|for)\s*x\s*=\s*(-?[\d.]+)\s*to\s*x\s*=\s*(-?[\d.]+)/);
  if (gr) { const g = pm(gr[1]); if (g) return { comps: [S.vr('t'), S.substitute(g, 'x', S.vr('t'))], t0: Number(gr[2]), t1: Number(gr[3]), desc: `x = t,\\ y = ${S.tex(S.substitute(g, 'x', S.vr('t')))},\\ ${gr[2]} \\le t \\le ${gr[3]}` }; }
  return null;
}
const subsXYZ = (node, comps) => { let n = node; ['x', 'y', 'z'].forEach((v, i) => { if (comps[i]) n = S.substitute(n, v, comps[i]); }); return S.simplify(n); };
const tEval = (node, t) => S.evaluate(node, { t });
function exactDefinite(node, t0, t1, varName = 't') {
  // try the step-by-step integral solver, fall back to Simpson's rule
  const lim = (v) => niceNumber(v) || fmt(v);
  try {
    const r = A1.solveIntegralQuestion(`\\int_{${lim(t0)}}^{${lim(t1)}} ${S.tex(node)} \\, d${varName}`);
    if (r && r.answer && !/Sorry|could not/.test(r.answer)) {
      const ans = r.answer.replace(/\\approx.*$/, '').trim();
      const val = simpson(t => S.evaluate(node, { [varName]: t }), t0, t1);
      return { tex: niceNumber(val) || ans, value: val };
    }
  } catch (e) { /* fall through */ }
  const val = simpson(t => S.evaluate(node, { [varName]: t }), t0, t1, 4000);
  return Number.isFinite(val) ? { tex: showNum(val), value: val } : null;
}

// ---------------------------------------------------------------- line integrals
function solveLineIntegral(raw) {
  const s = plain(raw);
  const k = A1.keyText(raw);
  if (!/lineintegral|∫_?\(?c\)?|∮|int_c|work done|circulation/.test(k) && !/∫\s*_\s*\(?C\)?|∮/.test(s)) return null;
  if (/stokes|green/.test(k)) return null;
  const curve = parseCurve(s);
  if (!curve || curve.t0 === null || curve.t1 === null) return null;
  const T = S.vr('t');
  const d = curve.comps.map(c => S.simplify(S.derivative(c, 't')));
  const steps = [];
  const isVector = /F\s*(?:·|\*|\\cdot)\s*d\s*r|dr\b|F\s*=|work|circulation/.test(s) && !/ds\b/.test(s);
  const curveTex = curve.desc || curve.comps.map((c, i) => `${'xyz'[i]} = ${S.tex(c)}`).join(',\\ ') + `,\\ ${showNum(curve.t0)} \\le t \\le ${showNum(curve.t1)}`;
  steps.push({ label: 'Parametrise the curve C:', katex: curveTex });
  steps.push({ label: 'Derivatives:', katex: d.map((di, i) => `${'xyz'[i]}'(t) = ${S.tex(di)}`).join(',\\quad ') });
  let integrand;
  if (isVector) {
    const F = parseVectorField(s);
    if (!F || F.length < curve.comps.length - (curve.comps.length === 3 && F.length === 2 ? 1 : 0)) return null;
    steps.push({ label: 'Vector field:', katex: `\\mathbf{F} = \\left(${F.map(S.tex).join(',\\ ')}\\right)` });
    const terms = F.map((Fi, i) => (d[i] ? S.prod(subsXYZ(Fi, curve.comps), d[i]) : S.num(qn(0))));
    integrand = S.simplify(S.sum(...terms));
    steps.push({ label: 'On C, $\\mathbf{F}\\cdot d\\mathbf{r} = \\left(P\\,x\'(t) + Q\\,y\'(t)' + (F.length === 3 ? ' + R\\,z\'(t)' : '') + '\\right)dt$:', katex: `\\int_C \\mathbf{F}\\cdot d\\mathbf{r} = \\int_{${showNum(curve.t0)}}^{${showNum(curve.t1)}} \\left(${S.tex(integrand)}\\right)dt` });
  } else {
    const fm = s.match(/∫\s*_?\s*\(?C\)?\s*\(?(.+?)\)?\s*d\s*s\b/);
    if (!fm) return null;
    const f = pm(fm[1]);
    if (!f) return null;
    // |r'(t)|
    const sp = S.simplify(S.sum(...d.map(di => S.pow(di, S.num(qn(2))))));
    const speedVals = [0.3, 1.1, 2.4].map(t => Math.sqrt(tEval(sp, t)));
    let speed;
    if (speedVals.every(v => Math.abs(v - speedVals[0]) < 1e-10)) {
      const nv = niceNumber(speedVals[0]);
      speed = nv && !/\\pi/.test(nv) ? pm(nv.replace(/\\sqrt\{(\d+)\}/, 'sqrt($1)').replace(/\\frac\{([^}]*)\}\{([^}]*)\}/, '($1)/($2)')) : S.num(toFrac(speedVals[0]) || qn(1));
      steps.push({ label: 'The speed is constant:', katex: `|\\mathbf{r}'(t)| = \\sqrt{${S.tex(sp)}} = ${nv || fmt(speedVals[0])}` });
    } else {
      speed = S.pow(sp, S.num(new Q(1n, 2n)));
      steps.push({ label: 'Speed along the curve:', katex: `|\\mathbf{r}'(t)| = \\sqrt{${S.tex(sp)}}` });
    }
    integrand = S.simplify(S.prod(subsXYZ(f, curve.comps), speed));
    steps.push({ label: 'Use $ds = |\\mathbf{r}\'(t)|\\,dt$:', katex: `\\int_C ${S.tex(f)}\\,ds = \\int_{${showNum(curve.t0)}}^{${showNum(curve.t1)}} ${S.tex(integrand)}\\,dt` });
  }
  const res = exactDefinite(integrand, curve.t0, curve.t1);
  if (!res) return null;
  steps.push({ label: 'Evaluate the integral:', katex: `= ${res.tex}` });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${res.tex}}` });
  return { answer: res.tex, steps };
}

// ---------------------------------------------------------------- curl, divergence, gradient
const D = (n, v) => S.simplify(S.derivative(n, v));
function curlOf(F) {
  const [Pf, Qf, Rf] = F.length === 3 ? F : [F[0], F[1], S.num(qn(0))];
  return [S.simplify(S.sub(D(Rf, 'y'), D(Qf, 'z'))), S.simplify(S.sub(D(Pf, 'z'), D(Rf, 'x'))), S.simplify(S.sub(D(Qf, 'x'), D(Pf, 'y')))];
}
function solveVectorCalculus(raw) {
  const s = plain(raw);
  const k = A1.keyText(raw);
  const want = /curl|rotational|∇×|nabla\\?times/.test(k) ? 'curl' : /divergence|div\b|∇·|nabla\\?cdot/.test(k) ? 'div' : /gradient|grad\b|∇f|nablaf/.test(k) ? 'grad' : null;
  if (!want) return null;
  const steps = [];
  if (want === 'grad') {
    const m = s.match(/(?:f|φ|phi)\s*(?:\(\s*x\s*,\s*y(?:\s*,\s*z)?\s*\))?\s*=\s*(.+?)(?=\s*(?:at|,|$))/) || s.match(/(?:gradient|grad)\s+of\s+(.+?)(?=\s*(?:at|,|$))/);
    if (!m) return null;
    const f = pm(m[1]);
    if (!f) return null;
    const vars = ['x', 'y', 'z'].filter(v => S.variables(f).has(v) || (v !== 'z'));
    const g = vars.map(v => D(f, v));
    steps.push({ label: 'Take each partial derivative: differentiate with respect to one variable, treating the other variables as constants:', katex: `\\begin{aligned} ${vars.map((v, i) => `\\frac{\\partial f}{\\partial ${v}} &= ${S.tex(g[i])}`).join(' \\\\ ')} \\end{aligned}` });
    steps.push({ label: 'Gradient = vector of partial derivatives:', katex: `\\nabla f = \\left(${vars.map(v => `\\frac{\\partial f}{\\partial ${v}}`).join(',\\ ')}\\right) = \\left(${g.map(S.tex).join(',\\ ')}\\right)` });
    const at = s.match(/at\s*\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)(?:\s*,\s*(-?[\d.]+))?\s*\)/);
    let ans = `\\nabla f = \\left(${g.map(S.tex).join(',\\ ')}\\right)`;
    if (at) {
      const pt = { x: Number(at[1]), y: Number(at[2]), z: Number(at[3] || 0) };
      const vals = g.map(gi => showNum(S.evaluate(gi, pt)));
      steps.push({ label: `At the point (${at.slice(1).filter(Boolean).join(', ')}):`, katex: `\\nabla f = \\left(${vals.join(',\\ ')}\\right)` });
      ans += `,\\quad \\nabla f(${at.slice(1).filter(Boolean).join(',')}) = \\left(${vals.join(',\\ ')}\\right)`;
    }
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
    return { answer: ans, steps };
  }
  const F = parseVectorField(s);
  if (!F) return null;
  steps.push({ label: 'Vector field:', katex: `\\mathbf{F} = \\left(${F.map(S.tex).join(',\\ ')}\\right)` });
  if (want === 'div') {
    const parts = F.map((Fi, i) => D(Fi, 'xyz'[i]));
    const dv = S.simplify(S.sum(...parts));
    steps.push({ label: 'Divergence $\\nabla\\cdot\\mathbf{F} = \\frac{\\partial P}{\\partial x} + \\frac{\\partial Q}{\\partial y}' + (F.length === 3 ? ' + \\frac{\\partial R}{\\partial z}' : '') + '$:', katex: `\\nabla\\cdot\\mathbf{F} = ${parts.map(S.tex).join(' + ')} = ${S.tex(dv)}`.replace(/\+ -/g, '- ') });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\nabla\\cdot\\mathbf{F} = ${S.tex(dv)}}` });
    return { answer: `\\nabla\\cdot\\mathbf{F} = ${S.tex(dv)}`, steps };
  }
  const c = curlOf(F);
  steps.push({ label: 'Curl as a determinant:', katex: R`\nabla\times\mathbf{F} = \begin{vmatrix} \mathbf{i} & \mathbf{j} & \mathbf{k} \\ \partial_x & \partial_y & \partial_z \\ P & Q & R \end{vmatrix} = \left(R_y - Q_z,\ P_z - R_x,\ Q_x - P_y\right)` });
  steps.push({ label: 'Compute each component:', katex: `\\nabla\\times\\mathbf{F} = \\left(${c.map(S.tex).join(',\\ ')}\\right)` });
  const zero = c.every(ci => ci.t === 'num' && ci.v.isZero());
  if (zero) steps.push({ label: 'The curl is zero, so F is irrotational (conservative on a simply connected region).', katex: '' });
  const ans = `\\nabla\\times\\mathbf{F} = ${zero ? '\\mathbf{0}' : `\\left(${c.map(S.tex).join(',\\ ')}\\right)`}`;
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

// ---------------------------------------------------------------- Stokes' theorem
function solveStokes(raw) {
  const s = plain(raw);
  const k = A1.keyText(raw);
  if (!/stokes/.test(k)) return null;
  const F = parseVectorField(s);
  if (!F || F.length !== 3) return null;
  let curve = parseCurve(s);
  // boundary of a surface like z = 4 - x^2 - y^2 above z = 0, or a disk
  if (!curve) {
    const pm2 = s.match(/z\s*=\s*([\d.]+)\s*-\s*x\s*\^\s*2\s*-\s*y\s*\^\s*2/);
    if (pm2) curve = parseCurve(`x^2+y^2=${pm2[1]} in plane z=0`);
  }
  if (!curve || curve.comps.length < 2) return null;
  if (curve.comps.length === 2) curve.comps.push(S.num(qn(0)));
  const steps = [];
  steps.push({ label: "Stokes' theorem: the circulation around C equals the flux of the curl through any surface S bounded by C:", katex: R`\oint_C \mathbf{F}\cdot d\mathbf{r} = \iint_S (\nabla\times\mathbf{F})\cdot\mathbf{n}\,dS` });
  const c = curlOf(F);
  steps.push({ label: 'Step 1: the curl of F:', katex: `\\nabla\\times\\mathbf{F} = \\left(${c.map(S.tex).join(',\\ ')}\\right)` });
  // flat disk in the plane of the circle: n = k (anticlockwise)
  const zc = S.evaluate(curve.comps[2], { t: 0 });
  const rad = Math.sqrt(tEval(curve.comps[0], 0) ** 2 + tEval(curve.comps[1], 0) ** 2);
  const cz = S.simplify(S.substitute(c[2], 'z', S.num(toFrac(zc) || qn(0))));
  steps.push({ label: `Step 2: take S to be the flat disk $x^2 + y^2 \\le ${showNum(rad * rad)}$ in the plane $z = ${showNum(zc)}$ with upward normal $\\mathbf{n} = \\mathbf{k}$ (matching the anticlockwise direction of C):`, katex: `(\\nabla\\times\\mathbf{F})\\cdot\\mathbf{k} = ${S.tex(cz)}` });
  // flux over the disk in polar coordinates
  const polar = S.simplify(S.prod(S.substitute(S.substitute(cz, 'x', S.prod(S.vr('r'), S.fn('cos', S.vr('θ')))), 'y', S.prod(S.vr('r'), S.fn('sin', S.vr('θ')))), S.vr('r')));
  const flux = simpson(th => simpson(r => S.evaluate(polar, { r, 'θ': th }), 0, rad, 400), 0, 2 * Math.PI, 400);
  steps.push({ label: 'Step 3: integrate over the disk in polar coordinates ($dA = r\\,dr\\,d\\theta$):', katex: `\\iint_S (\\nabla\\times\\mathbf{F})\\cdot\\mathbf{k}\\,dA = \\int_0^{2\\pi}\\!\\int_0^{${showNum(rad)}} ${S.tex(polar)}\\,dr\\,d\\theta = ${showNum(flux)}` });
  // check with the line integral
  const d = curve.comps.map(ci => S.simplify(S.derivative(ci, 't')));
  const integrand = S.simplify(S.sum(...F.map((Fi, i) => S.prod(subsXYZ(Fi, curve.comps), d[i]))));
  const line = exactDefinite(integrand, curve.t0, curve.t1);
  if (line) steps.push({ label: 'Check directly with the line integral around C:', katex: `\\oint_C \\mathbf{F}\\cdot d\\mathbf{r} = \\int_0^{2\\pi} \\left(${S.tex(integrand)}\\right)dt = ${line.tex}` });
  const val = line ? line.value : flux;
  const tex = niceNumber(val) || fmt(val);
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\oint_C \\mathbf{F}\\cdot d\\mathbf{r} = ${tex}}` });
  return { answer: `\\oint_C \\mathbf{F}\\cdot d\\mathbf{r} = ${tex}`, steps };
}

// ---------------------------------------------------------------- double integrals over rectangles / iterated
function solveRectangleIntegral(raw) {
  const s = plain(raw);
  let f, a, b, c, d, order = 'dydx';
  let m = s.match(/(?:∬|∫∫|iint)\s*_?\s*\(?[A-Z]?\)?\s*(.+?)\s*d\s*A\b.*?\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]\s*(?:\*|×|x|times)\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/);
  if (m) { f = pm(m[1].replace(/^\((.*)\)$/, '$1')); [a, b, c, d] = m.slice(2, 6).map(Number); }
  else {
    m = s.match(/∫\s*_\s*\(?(-?[\d.]+)\)?\s*\^\s*\(?(-?[\d.]+)\)?\s*∫\s*_\s*\(?(-?[\d.]+)\)?\s*\^\s*\(?(-?[\d.]+)\)?\s*(.+?)\s*d\s*([xy])\s*d\s*([xy])/);
    if (!m || m[6] === m[7]) return null;
    f = pm(m[5].replace(/^\((.*)\)$/, '$1'));
    // inner variable m[6] has limits m[3..4]
    if (m[6] === 'y') { [a, b, c, d] = [m[1], m[2], m[3], m[4]].map(Number); order = 'dydx'; }
    else { [c, d, a, b] = [m[1], m[2], m[3], m[4]].map(Number); order = 'dxdy'; }
  }
  if (!f || [a, b, c, d].some(v => !Number.isFinite(v))) return null;
  if ([...S.variables(f)].some(v => v !== 'x' && v !== 'y')) return null;
  const inner = order === 'dydx' ? 'y' : 'x', outer = order === 'dydx' ? 'x' : 'y';
  const [il, iu, ol, ou] = order === 'dydx' ? [c, d, a, b] : [a, b, c, d];
  const steps = [{ label: 'Write the double integral over the rectangle as an iterated integral (Fubini):', katex: `\\int_{${ol}}^{${ou}}\\!\\int_{${il}}^{${iu}} ${S.tex(f)}\\,d${inner}\\,d${outer}` }];
  const anti = S.integrate(f, inner);
  if (!anti) return null;
  const innerRes = S.simplify(S.sub(S.substitute(anti.result, inner, S.num(toFrac(iu))), S.substitute(anti.result, inner, S.num(toFrac(il)))));
  steps.push({ label: `Inner integral (with respect to ${inner}):`, katex: `\\int_{${il}}^{${iu}} ${S.tex(f)}\\,d${inner} = \\left[${S.tex(anti.result)}\\right]_{${inner}=${il}}^{${iu}} = ${S.tex(innerRes)}` });
  const outerRes = exactDefinite(innerRes, ol, ou, outer);
  if (!outerRes) return null;
  steps.push({ label: `Outer integral (with respect to ${outer}):`, katex: `\\int_{${ol}}^{${ou}} ${S.tex(innerRes)}\\,d${outer} = ${outerRes.tex}` });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${outerRes.tex}}` });
  return { answer: outerRes.tex, steps };
}

// ---------------------------------------------------------------- separable ODEs
function splitSeparable(node) {
  const n = S.simplify(node);
  const factors = n.t === 'prod' ? n.factors : [n];
  const fx = [], gy = [];
  for (let f of factors) {
    const vs = S.variables(f);
    if (vs.has('x') && vs.has('y')) {
      // e^(x ± y) -> e^x e^(±y)
      if (f.t === 'pow' && f.base.t === 'const' && f.exp.t === 'sum') {
        const ex = f.exp.terms.filter(t => !S.variables(t).has('y')), ey = f.exp.terms.filter(t => !S.variables(t).has('x'));
        if (ex.length + ey.length !== f.exp.terms.length) return null;
        fx.push(S.pow(f.base, S.sum(...ex))); gy.push(S.pow(f.base, S.sum(...ey))); continue;
      }
      return null;
    }
    (vs.has('y') ? gy : fx).push(f);
  }
  return { f: fx.length ? S.simplify(S.prod(...fx)) : S.num(qn(1)), g: gy.length ? S.simplify(S.prod(...gy)) : S.num(qn(1)) };
}
function solveSeparableODE(raw) {
  const s = plain(raw).replace(/\(\(d\s*y\)\/\(d\s*x\)\)|dy\s*\/\s*dx/g, "y'");
  if (!/y'\s*=/.test(s) || /y''/.test(s)) return null;
  const m = s.match(/y'\s*=\s*([^,;]+?)(?=\s*(?:,|;|$|\s(?:by|using|with|where|given|if|and)\b))/);
  if (!m) return null;
  const rhs = pm(m[1]);
  if (!rhs) return null;
  const vs = S.variables(rhs);
  if ([...vs].some(v => v !== 'x' && v !== 'y') || !vs.has('y') || !vs.has('x')) return null;
  const sp = splitSeparable(rhs);
  if (!sp) return null;
  const { f, g } = sp;
  const steps = [{ label: 'Differential equation:', katex: `\\frac{dy}{dx} = ${S.tex(rhs)}` }];
  steps.push({ label: 'Step 1: it is separable, $\\frac{dy}{dx} = f(x)\\,g(y)$. Divide by $g(y)$ and multiply by $dx$:', katex: `\\frac{dy}{${S.tex(g)}} = ${S.tex(f)}\\,dx` });
  const Gi = S.integrate(S.simplify(S.pow(g, S.num(qn(-1)))), 'y'), Fi = S.integrate(f, 'x');
  if (!Gi || !Fi) return null;
  steps.push({ label: 'Step 2: integrate both sides:', katex: `\\int \\frac{dy}{${S.tex(g)}} = \\int ${S.tex(f)}\\,dx \\;\\Longrightarrow\\; ${S.tex(Gi.result)} = ${S.tex(Fi.result)} + C` });
  // explicit solution when g = c·y
  const gq = S.simplify(S.prod(g, S.pow(S.vr('y'), S.num(qn(-1)))));
  let ans;
  if (gq.t === 'num' && !gq.v.isZero()) {
    const expo = S.simplify(S.prod(S.num(gq.v), Fi.result));
    ans = `y = C\\,e^{${S.tex(expo)}}`;
    steps.push({ label: 'Step 3: the left side is a logarithm, so exponentiate (the constant $e^{C}$ and the sign are absorbed into a new constant $C$):', katex: `\\ln|y| = ${S.tex(expo)} + C \\;\\Longrightarrow\\; ${ans}` });
  } else ans = `${S.tex(Gi.result)} = ${S.tex(Fi.result)} + C`;
  // initial condition y(a) = b
  const ic = s.match(/y\s*\(\s*(-?[\d.]+)\s*\)\s*=\s*(-?[\d.]+)/);
  if (ic && /C\\,e\^/.test(ans)) {
    const x0 = Number(ic[1]), y0 = Number(ic[2]);
    const expo = S.simplify(S.prod(S.num(gq.v), Fi.result));
    const Cv = y0 / Math.exp(S.evaluate(expo, { x: x0 }));
    const Ct = showNum(Cv);
    ans = ans.replace('C\\,', Ct === '1' ? '' : `${Ct}\\,`);
    steps.push({ label: `Step 4: use $y(${x0}) = ${y0}$ to find $C$:`, katex: `C = ${Ct}` });
  }
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

// ---------------------------------------------------------------- Laplace transforms
function laplaceTerm(t) {
  // c · t^n · e^{at} · {1, sin bt, cos bt, sinh bt, cosh bt}
  let c = qn(1), n = 0, a = qn(0), trig = null, b = null;
  const fs = t.t === 'prod' ? t.factors : [t];
  for (const f of fs) {
    if (f.t === 'num') c = c.mul(f.v);
    else if (f.t === 'var' && f.n === 't') n += 1;
    else if (f.t === 'pow' && f.base.t === 'var' && f.base.n === 't' && f.exp.t === 'num' && f.exp.v.d === 1n && !f.exp.v.isNegative()) n += Number(f.exp.v.n);
    else if (f.t === 'pow' && f.base.t === 'const' && f.base.n === 'e') {
      const e = S.simplify(f.exp);
      if (e.t === 'var' && e.n === 't') a = a.add(qn(1));
      else if (e.t === 'prod' && e.factors.length === 2 && e.factors[0].t === 'num' && e.factors[1].t === 'var' && e.factors[1].n === 't') a = a.add(e.factors[0].v);
      else return null;
    } else if (f.t === 'fn' && ['sin', 'cos', 'sinh', 'cosh'].includes(f.f) && !trig) {
      const e = S.simplify(f.arg);
      if (e.t === 'var' && e.n === 't') b = qn(1);
      else if (e.t === 'prod' && e.factors.length === 2 && e.factors[0].t === 'num' && e.factors[1].t === 'var' && e.factors[1].n === 't') b = e.factors[0].v;
      else return null;
      trig = f.f;
    } else return null;
  }
  if (trig && n > 0) return null;
  return { c, n, a, trig, b };
}
const sMinus = (a) => (a.isZero() ? 's' : `(s ${a.isNegative() ? '+' : '-'} ${qt(a.isNegative() ? a.neg() : a)})`);
const sMinusBare = (a) => (a.isZero() ? 's' : `s ${a.isNegative() ? '+' : '-'} ${qt(a.isNegative() ? a.neg() : a)}`);
function solveLaplace(raw) {
  const k = A1.keyText(raw);
  if (!/laplace/.test(k) || /inverse/.test(k)) return null;
  const s = plain(raw);
  const m = s.match(/(?:transform\s+of|L\s*\{|\\mathcal\s*L\s*\{)\s*(?:f\(t\)\s*=\s*)?(.+?)\s*(?:\}\s*$|\.?\s*$)/i);
  if (!m) return null;
  const node = pm(m[1].replace(/\s*\}\s*$/, ''));
  if (!node || [...S.variables(node)].some(v => v !== 't')) return null;
  const ex = S.simplify(S.expand(S.simplify(node)));
  const terms = ex.t === 'sum' ? ex.terms : [ex];
  const parsed = terms.map(laplaceTerm);
  if (parsed.some(p => !p)) return null;
  const steps = [{ label: 'Function:', katex: `f(t) = ${S.tex(node)}` }];
  steps.push({ label: 'Use linearity and the standard table: $\\mathcal{L}\\{t^n\\} = \\dfrac{n!}{s^{n+1}}$, $\\mathcal{L}\\{\\sin bt\\} = \\dfrac{b}{s^2+b^2}$, $\\mathcal{L}\\{\\cos bt\\} = \\dfrac{s}{s^2+b^2}$, and the shift rule $\\mathcal{L}\\{e^{at}g(t)\\} = G(s-a)$.', katex: '' });
  const outs = [];
  for (const p of parsed) {
    const sa = sMinus(p.a);
    let res;
    if (!p.trig) {
      const nf = [1, 1, 2, 6, 24, 120, 720, 5040, 40320][p.n] || null;
      if (!nf) return null;
      const num = p.c.mul(qn(nf));
      res = `\\frac{${qt(num)}}{${p.n === 0 && p.a.isZero() ? 's' : `${sa}^{${p.n + 1}}`}}`.replace('^{1}', '');
    } else {
      const b2 = p.b.mul(p.b);
      const den = `${p.a.isZero() ? 's^2' : `${sa}^2`} ${p.trig.endsWith('h') ? '-' : '+'} ${qt(b2)}`;
      const numT = p.trig.startsWith('sin') ? qt(p.c.mul(p.b)) : `${p.c.equals(qn(1)) ? '' : qt(p.c)}${p.a.isZero() ? 's' : `(${sMinusBare(p.a)})`}`;
      res = `\\frac{${numT}}{${den}}`;
    }
    const term = S.tex(S.simplify(S.prod(S.num(p.c), p.n ? S.pow(S.vr('t'), S.num(qn(p.n))) : S.num(qn(1)), p.a.isZero() ? S.num(qn(1)) : S.pow(S.cst('e'), S.prod(S.num(p.a), S.vr('t'))), p.trig ? S.fn(p.trig, S.prod(S.num(p.b), S.vr('t'))) : S.num(qn(1)))));
    steps.push({ label: `For ${p.trig ? `$${p.trig}(${qt(p.b)}t)$` : `$t^{${p.n}}$`}${p.a.isZero() ? '' : ` with the shift $s \\to ${sMinusBare(p.a)}$`}:`, katex: `\\mathcal{L}\\left\\{${term}\\right\\} = ${res}` });
    outs.push(res);
  }
  const ans = `F(s) = ${outs.join(' + ').replace(/\+ \\frac\{-/g, '- \\frac{')}`;
  steps.push({ label: `Final Answer (valid for $s > ${qt(parsed.reduce((mx, p) => (p.a.toNumber() > mx.toNumber() ? p.a : mx), qn(0)))}$):`, katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

// divide a polynomial (low → high coefficients) by (s - r)^m exactly
function deflate(p, r, m) {
  let q = p.slice();
  for (let k = 0; k < m; k++) {
    const n = q.length - 1; const out = Array(n).fill(null); let carry = qn(0);
    for (let i = n; i >= 1; i--) { carry = q[i].add(carry.mul(r)); out[i - 1] = carry; }
    q = out;
  }
  return q;
}
function solveInverseLaplace(raw) {
  const k = A1.keyText(raw);
  if (!/inverselaplace|laplace\^?\{?-1|l\^\{?-1\}?/.test(k)) return null;
  const s = plain(raw);
  const m = s.match(/(?:of|L\^\(-1\)\s*\{?|L\^-1\s*\{?)\s*(?:F\(s\)\s*=\s*)?(.+?)\}?\s*\.?$/i);
  if (!m) return null;
  const node = pm(m[1].replace(/\}\s*$/, ''));
  if (!node || [...S.variables(node)].some(v => v !== 's')) return null;
  const rat = (() => { try { return A1.toRational(node, 's'); } catch (e) { return null; } })();
  if (!rat) return null;
  let Np = P.trim(rat.N), Dp = P.trim(rat.D);
  if (P.degree(Np) >= P.degree(Dp)) return null;
  const lead = Dp[Dp.length - 1];
  Np = Np.map(c => c.div(lead)); Dp = Dp.map(c => c.div(lead));
  const steps = [{ label: 'Transform:', katex: `F(s) = \\frac{${P.toTex(Np, 's')}}{${P.toTex(Dp, 's')}}` }];
  const fac = P.factor(Dp);
  const lins = [], quads = [];
  const groups = [];
  for (const fa of fac.factors) {
    const pl0 = fa.poly || fa; const key = pl0.map(c => qt(c)).join(',');
    const g = groups.find(x => x.key === key); if (g) g.mult += fa.mult || 1; else groups.push({ key, pl: pl0, mult: fa.mult || 1 });
  }
  for (const gr of groups) {
    const pl = gr.pl; const mult = gr.mult; const dg = P.degree(pl);
    if (dg === 1) lins.push({ r: pl[0].neg().div(pl[1]), mult }); else if (dg === 2) quads.push({ pl: pl.map(c => c.div(pl[2])), mult }); else return null;
  }
  if (quads.some(q => q.mult > 1) || quads.length > 1) return null;
  const evalP = (p, x) => p.reduce((acc, c, i) => acc + c.toNumber() * x ** i, 0);
  const terms = [], pf = [];
  let quadNumTex = null;
  // linear factors via residues (handles multiplicity up to 3 through derivatives of N/rest)
  for (const L of lins) {
    const r = L.r.toNumber();
    const restP = deflate(Dp, L.r, L.mult);
    const rest = (x) => evalP(restP, x);
    const g = (x) => evalP(Np, x) / rest(x);
    const h = 1e-4;
    const derivs = [g(r), (g(r + h) - g(r - h)) / (2 * h), (g(r + h) - 2 * g(r) + g(r - h)) / (h * h)];
    for (let j = 0; j < L.mult; j++) {
      // coefficient of t^(m-1-j)/(m-1-j)! e^{rt} is g^{(j)}(r)/j!
      const coef = derivs[j] / [1, 1, 2][j];
      const pw = L.mult - 1 - j;
      const cq = toFrac(coef, 1000, 1e-6);
      if (!cq) return null;
      if (cq.isZero()) continue;
      const tpart = pw === 0 ? '' : pw === 1 ? 't' : `\\frac{t^{${pw}}}{${[1, 1, 2, 6][pw]}}`;
      pf.push({ c: cq, den: `${L.r.isZero() ? 's' : `(${sMinusBare(L.r)})`}${pw + 1 > 1 ? `^{${pw + 1}}` : ''}` });
      terms.push({ c: cq, tex: `${tpart}${L.r.isZero() ? '' : `e^{${L.r.equals(qn(1)) ? '' : L.r.equals(qn(-1)) ? '-' : qt(L.r)}t}`}` });
    }
  }
  // one irreducible quadratic s^2 + ps + q = (s - α)^2 + β^2
  if (quads.length) {
    const [q0, p1] = quads[0].pl;
    const alpha = p1.neg().div(qn(2)), beta2 = q0.sub(alpha.mul(alpha));
    const beta = Math.sqrt(beta2.toNumber());
    // remainder after the linear parts: N_q(s) = A s + B, found from two sample points
    const linPart = (x) => terms.reduce((acc, t) => acc, 0);
    const restLin = (x) => lins.reduce((acc, L) => acc * (x - L.r.toNumber()) ** L.mult, 1);
    // F(s) - Σ linear partial fractions = (A s + B)/quad
    const lf = (x) => lins.reduce((acc, L) => { const r = L.r.toNumber(); const rp = deflate(Dp, L.r, L.mult); const g = (y) => evalP(Np, y) / evalP(rp, y); let sum = 0; const h = 1e-4; const dv = [g(r), (g(r + h) - g(r - h)) / (2 * h), (g(r + h) - 2 * g(r) + g(r - h)) / (h * h)]; for (let j = 0; j < L.mult; j++) sum += dv[j] / [1, 1, 2][j] / (x - r) ** (L.mult - j); return acc + sum; }, 0);
    const resid = (x) => (evalP(Np, x) / evalP(Dp, x) - lf(x)) * evalP(quads[0].pl, x);
    const B0 = resid(0.37), B1 = resid(1.91);
    const A = (B1 - B0) / (1.91 - 0.37), B = B0 - A * 0.37;
    { const qa = toFrac(A, 1000, 1e-6), qb = toFrac(B, 1000, 1e-6); if (qa && qb) quadNumTex = P.toTex(P.trim([qb, qa]), 's'); }
    // A s + B = A (s - α) + (B + Aα)
    const cA = toFrac(A, 1000, 1e-6), cB = toFrac(B + A * alpha.toNumber(), 1000, 1e-6);
    if (!cA || !cB) return null;
    const bq = toFrac(beta, 100, 1e-9);
    const bTex = bq ? qt(bq) : `\\sqrt{${qt(beta2)}}`;
    const ex = alpha.isZero() ? '' : `e^{${alpha.equals(qn(1)) ? '' : alpha.equals(qn(-1)) ? '-' : qt(alpha)}t}`;
    const arg = bq && bq.equals(qn(1)) ? 't' : `${bTex}t`;
    if (!cA.isZero()) terms.push({ c: cA, tex: `${ex}\\cos(${arg})` });
    if (!cB.isZero()) {
      const sc = bq ? cB.div(bq) : null;
      if (sc) terms.push({ c: sc, tex: `${ex}\\sin(${arg})` });
      else terms.push({ c: cB, tex: `\\frac{${ex}\\sin(${arg})}{${bTex}}` });
    }
    steps.push({ label: `${alpha.isZero() ? `The denominator is $s^2 + \\beta^2$ with $\\beta = ${bTex}$` : `Complete the square: $${P.toTex(quads[0].pl, 's')} = (s ${alpha.isNegative() ? '+' : '-'} ${qt(alpha.isNegative() ? alpha.neg() : alpha)})^2 + ${qt(beta2)}$`}, and use $\\mathcal{L}^{-1}\\left\\{\\frac{s-\\alpha}{(s-\\alpha)^2+\\beta^2}\\right\\} = e^{\\alpha t}\\cos\\beta t$, $\\mathcal{L}^{-1}\\left\\{\\frac{\\beta}{(s-\\alpha)^2+\\beta^2}\\right\\} = e^{\\alpha t}\\sin\\beta t$.`.replace('(s - 0)^2', 's^2'), katex: '' });
  }
  if (lins.length) steps.push({ label: 'Partial fractions over the linear factors, using $\\mathcal{L}^{-1}\\left\\{\\frac{1}{(s-a)^{k}}\\right\\} = \\frac{t^{k-1}}{(k-1)!}e^{at}$:', katex: `F(s) = ${pf.map((t, i) => { const neg = t.c.isNegative(), av = neg ? t.c.neg() : t.c; const den = av.d === 1n ? t.den.replace(/^\((.*)\)$/, '$1') : `${av.d}${t.den.startsWith('(') || t.den === 's' || t.den.startsWith('s^') ? t.den : `(${t.den})`}`; return `${i === 0 ? (neg ? '-' : '') : (neg ? ' - ' : ' + ')}\\frac{${av.n}}{${den}}`; }).join('')}${quads.length && quadNumTex ? ` + \\frac{${quadNumTex}}{${P.toTex(quads[0].pl, 's')}}` : ''}` });
  if (!terms.length) return null;
  const tex = terms.map((t, i) => {
    const neg = t.c.isNegative(), av = neg ? t.c.neg() : t.c;
    const coef = av.equals(qn(1)) && t.tex ? '' : qt(av);
    return `${i === 0 ? (neg ? '-' : '') : (neg ? ' - ' : ' + ')}${coef}${t.tex || (coef ? '' : '1')}`;
  }).join('');
  steps.push({ label: 'Take the inverse transform of each piece:', katex: `f(t) = \\mathcal{L}^{-1}\\{F(s)\\} = ${tex}` });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{f(t) = ${tex}}` });
  return { answer: `f(t) = ${tex}`, steps };
}


// ---------------------------------------------------------------- linear IVPs solved with the Laplace transform
const pAdd = (a, b) => { const n = Math.max(a.length, b.length); const r = []; for (let i = 0; i < n; i++) r.push((a[i] || qn(0)).add(b[i] || qn(0))); return r; };
const pMul = (a, b) => { const r = Array(a.length + b.length - 1).fill(null).map(() => qn(0)); a.forEach((x, i) => b.forEach((y, j) => { r[i + j] = r[i + j].add(x.mul(y)); })); return r; };
const pStr = (p) => p.map((c, i) => (c.isZero() ? null : `(${c.toPlain ? c.toPlain() : qt(c)})*s^${i}`)).filter(Boolean).join('+') || '0';
function termToRational(p) {
  // returns [N, D] polynomials in s (coefficients low → high)
  const sa = [p.a.neg(), qn(1)]; // s - a
  if (!p.trig) {
    let D = [qn(1)]; for (let i = 0; i <= p.n; i++) D = pMul(D, sa);
    return [[p.c.mul(qn([1, 1, 2, 6, 24, 120][p.n]))], D];
  }
  const b2 = p.b.mul(p.b);
  const D = pAdd(pMul(sa, sa), [p.trig.endsWith('h') ? b2.neg() : b2]);
  return [p.trig.startsWith('sin') ? [p.c.mul(p.b)] : pMul([p.c], sa), D];
}
function solveLaplaceIVP(raw) {
  const k = A1.keyText(raw);
  if (!/laplace/.test(k) || !/y'/.test(raw.replace(/\\prime/g, "'"))) return null;
  let s = plain(raw).replace(/\\prime/g, "'").replace(/\(\(d\^?\(?2\)?\s*y\)\/\(d\s*[xt]\^?\(?2\)?\)\)/g, "y''").replace(/\(\(d\s*y\)\/\(d\s*[xt]\)\)/g, "y'");
  const seg = s.split(/[,;]/).map(t => t.trim()).find(t => /y/.test(t) && /=/.test(t) && !/y'*\s*\(\s*0\s*\)/.test(t));
  if (!seg) return null;
  const eqm = seg.match(/^(.*?)=(.*)$/);
  if (!eqm) return null;
  const strip = (t) => t.replace(/\b(?:solve|find|use|using|the|laplace|transforms?|to|by|with|method|of|and|for)\b/gi, ' ').trim();
  const eq = [null, strip(eqm[1]), strip(eqm[2])];
  if (!eq[1] || !eq[2]) return null;
  const lhsStr = eq[1];
  if (/[a-xz]/i.test(lhsStr.replace(/y/g, ''))) return null;
  const lhsN = pm(lhsStr.replace(/y''/g, '(p)').replace(/y'/g, '(q)').replace(/y/g, '(r)'));
  if (!lhsN || [...S.variables(lhsN)].some(v => !/^[pqr]$/.test(v))) return null;
  const co = (v) => S.evaluate(lhsN, { r: v === 0 ? 1 : 0, q: v === 1 ? 1 : 0, p: v === 2 ? 1 : 0 }) - S.evaluate(lhsN, { p: 0, q: 0, r: 0 });
  const a = [co(0), co(1), co(2)].map(v => toFrac(v, 1000, 1e-9));
  if (a.some(x => !x) || Math.abs(S.evaluate(lhsN, { p: 0, q: 0, r: 0 })) > 1e-12) return null;
  const order = !a[2].isZero() ? 2 : !a[1].isZero() ? 1 : 0;
  if (order === 0) return null;
  const rhsN = pm(eq[2].replace(/\bx\b/g, 't'));
  if (!rhsN || [...S.variables(rhsN)].some(v => v !== 't')) return null;
  const ic = (re) => { const m = s.match(re); return m ? toFrac(Number(m[1])) : null; };
  const y0 = ic(/y\s*\(\s*0\s*\)\s*=\s*(-?[\d.]+)/), y1 = ic(/y'\s*\(\s*0\s*\)\s*=\s*(-?[\d.]+)/);
  if (!y0 || (order === 2 && !y1)) return null;
  // transform of the right-hand side
  let Nf = [qn(0)], Df = [qn(1)];
  const rex = S.simplify(S.expand(S.simplify(rhsN)));
  const isZero = rex.t === 'num' && rex.v.isZero();
  if (!isZero) {
    for (const t of rex.t === 'sum' ? rex.terms : [rex]) {
      const lt = laplaceTerm(t); if (!lt) return null;
      const [n, d] = termToRational(lt);
      Nf = pAdd(pMul(Nf, d), pMul(n, Df)); Df = pMul(Df, d);
    }
  }
  const charP = order === 2 ? [a[0], a[1], a[2]] : [a[0], a[1]];
  // initial-value polynomial: a2 (s y0 + y1) + a1 y0
  const icP = order === 2 ? pAdd([a[2].mul(y1), a[2].mul(y0)], [a[1].mul(y0)]) : [a[1].mul(y0)];
  const N = pAdd(pMul(icP, Df), Nf), Dd = pMul(charP, Df);
  const inv = solveInverseLaplace(`inverse laplace transform of (${pStr(N)})/(${pStr(Dd)})`);
  if (!inv) return null;
  const odeTex = `${order === 2 ? `${a[2].equals(qn(1)) ? '' : qt(a[2])}y''` : ''}${a[1].isZero() ? '' : ` ${a[1].isNegative() ? '-' : '+'} ${a[1].abs ? '' : ''}${(a[1].isNegative() ? a[1].neg() : a[1]).equals(qn(1)) ? '' : qt(a[1].isNegative() ? a[1].neg() : a[1])}y'`}${a[0].isZero() ? '' : ` ${a[0].isNegative() ? '-' : '+'} ${(a[0].isNegative() ? a[0].neg() : a[0]).equals(qn(1)) ? '' : qt(a[0].isNegative() ? a[0].neg() : a[0])}y`} = ${S.tex(rhsN)}`.replace(/^ \+ /, '').replace(/^ - /, '-');
  const steps = [{ label: 'Initial value problem:', katex: `${odeTex}, \\qquad y(0) = ${qt(y0)}${order === 2 ? `,\\ y'(0) = ${qt(y1)}` : ''}` }];
  steps.push({ label: 'Step 1: take the Laplace transform of both sides, with $Y(s) = \\mathcal{L}\\{y\\}$ and', katex: order === 2 ? R`\mathcal{L}\{y'\} = sY - y(0), \qquad \mathcal{L}\{y''\} = s^2Y - s\,y(0) - y'(0)` : R`\mathcal{L}\{y'\} = sY - y(0)` });
  const Ftex = isZero ? '0' : `\\frac{${P.toTex(P.trim(Nf), 's')}}{${P.toTex(P.trim(Df), 's')}}`;
  steps.push({ label: 'Step 2: substitute the initial conditions and collect the $Y$ terms:', katex: `\\left(${P.toTex(P.trim(charP), 's')}\\right)Y - \\left(${P.toTex(P.trim(icP), 's')}\\right) = ${Ftex}` });
  steps.push({ label: 'Step 3: solve for $Y(s)$:', katex: `Y(s) = \\frac{${P.toTex(P.trim(N), 's')}}{${P.factoredTex ? P.factoredTex(P.factor(P.trim(Dd)), 's') : P.toTex(P.trim(Dd), 's')}}` });
  inv.steps.filter(st => !/^(Transform:|Final Answer)/.test(st.label)).forEach(st => steps.push({ label: st.label.replace(/^Take the inverse/, 'Step 4: take the inverse'), katex: st.katex.replace(/^f\(t\)/, 'y(t)') }));
  const ans = inv.answer.replace(/^f\(t\)/, 'y(t)');
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

// ---------------------------------------------------------------- heat / wave equation with sine data
function solveHeatWaveSine(raw) {
  const s = plain(raw);
  const k = A1.keyText(raw);
  const isWave = /wave|u_?tt|u_\(tt\)/.test(k);
  if (!/heat|diffusion|u_?t=|u_\(t\)=|wave|u_?tt/.test(k)) return null;
  const ic = s.match(/u\s*\(\s*x\s*,\s*0\s*\)\s*=\s*([^,;]+?)(?=\s*(?:,|;|$|\s(?:and|with|for)\b))/);
  if (!ic) return null;
  const f = pm(ic[1]);
  if (!f || [...S.variables(f)].some(v => v !== 'x')) return null;
  // interval length L from u(L,t) = 0 or 0 < x < L
  let L = null;
  const bm = s.match(/u\s*\(\s*([^,()]+(?:\([^()]*\))?)\s*,\s*t\s*\)\s*=\s*0/g);
  if (bm) for (const b of bm) { const v = b.match(/u\s*\(\s*([^,]+)\s*,/)[1]; const n = pm(v); if (n && !S.variables(n).size) { const val = S.evaluate(n); if (val > 0) L = val; } }
  const dom = s.match(/0\s*<\s*x\s*<\s*([^\s,]+)/);
  if (!L && dom) { const n = pm(dom[1]); if (n) L = S.evaluate(n); }
  if (!L) return null;
  // diffusion constant / wave speed
  const km = isWave ? s.match(/u_?\(?tt\)?\s*=\s*([^u]*?)\s*\*?\s*u_?\(?xx\)?/) : s.match(/u_?\(?t\)?\s*=\s*([^u]*?)\s*\*?\s*u_?\(?xx\)?/);
  let kc = 1, kTex = '';
  if (km && km[1].trim()) { const n = pm(km[1].trim().replace(/\*$/, '')); if (!n || S.variables(n).size) return null; kc = S.evaluate(n); kTex = S.tex(n); }
  // f must be a combination of sin(nπx/L)
  const ex = S.simplify(S.expand(S.simplify(f)));
  const terms = ex.t === 'sum' ? ex.terms : [ex];
  const modes = [];
  for (const t of terms) {
    const fs = t.t === 'prod' ? t.factors : [t];
    let c = qn(1), w = null;
    for (const g of fs) {
      if (g.t === 'num') c = c.mul(g.v);
      else if (g.t === 'fn' && g.f === 'sin') { const a = S.simplify(g.arg); const val = S.evaluate(a, { x: 1 }); if (Math.abs(S.evaluate(a, { x: 2 }) - 2 * val) > 1e-12) return null; w = val; }
      else return null;
    }
    if (w === null) return null;
    const n = w * L / Math.PI;
    if (Math.abs(n - Math.round(n)) > 1e-9 || Math.round(n) < 1) return null;
    modes.push({ c, n: Math.round(n), w });
  }
  const Ltex = niceNumber(L) || fmt(L);
  const isPi = Math.abs(L - Math.PI) < 1e-12;
  const argN = isPi ? 'nx' : `\\frac{n\\pi x}{${Ltex}}`, lamN = isPi ? 'n^2' : `\\left(\\frac{n\\pi}{${Ltex}}\\right)^2`;
  const steps = [{ label: isWave ? 'Wave equation with fixed ends:' : 'Heat equation with zero boundary values:', katex: `${isWave ? 'u_{tt}' : 'u_t'} = ${kTex}u_{xx}, \\quad 0 < x < ${Ltex}, \\qquad u(0,t) = u(${Ltex},t) = 0, \\qquad u(x,0) = ${S.tex(f)}` }];
  steps.push({ label: 'Step 1 (separation of variables): try $u = X(x)T(t)$. Then $X\'\' + \\lambda X = 0$ with $X(0) = X(L) = 0$, which gives the eigenfunctions', katex: `X_n(x) = \\sin\\left(${argN}\\right), \\qquad \\lambda_n = ${lamN}` });
  steps.push({ label: isWave ? 'Step 2: the time equation $T\'\' + c^2\\lambda_n T = 0$ gives $T_n = a_n\\cos(c\\sqrt{\\lambda_n}t) + b_n\\sin(c\\sqrt{\\lambda_n}t)$. With zero initial velocity, $b_n = 0$.' : `Step 2: the time equation $T' + ${kTex || ''}\\lambda_n T = 0$ gives $T_n(t) = e^{-${kTex || ''}\\lambda_n t}$, so`, katex: isWave ? R`u(x,t) = \sum_{n} a_n \cos\left(\frac{c\,n\pi t}{L}\right)\sin\left(\frac{n\pi x}{L}\right)` : `u(x,t) = \\sum_{n\\ge1} b_n\\, e^{-${kTex || ''}${lamN} t}\\sin\\left(${argN}\\right)` });
  steps.push({ label: 'Step 3: the initial condition is already a sum of these sines, so the coefficients can be read off directly (no Fourier integrals needed):', katex: modes.map(m2 => `b_{${m2.n}} = ${qt(m2.c)}`).join(',\\quad ') + R`, \quad \text{all others } 0` });
  const wTex = (m2) => { const wq = toFrac(m2.w, 60); return wq ? (wq.equals(qn(1)) ? '' : qt(wq)) : niceNumber(m2.w); };
  const parts = modes.map(m2 => {
    const wt = wTex(m2);
    const decay = kc * m2.w * m2.w;
    const dTex = niceNumber(decay) || fmt(decay);
    const timePart = isWave ? `\\cos(${(() => { const v = Math.sqrt(kc) * m2.w; const vt = niceNumber(v); return vt === '1' ? '' : vt || fmt(v); })()}t)` : `e^{-${dTex === '1' ? '' : dTex}t}`;
    const coef = m2.c.equals(qn(1)) ? '' : m2.c.equals(qn(-1)) ? '-' : qt(m2.c);
    return `${coef}${timePart}\\sin(${wt}x)`;
  });
  const ans = `u(x,t) = ${parts.join(' + ').replace(/\+ -/g, '- ')}`;
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

// ---------------------------------------------------------------- epsilon–delta proofs
function solveEpsilonDelta(raw) {
  const k = A1.keyText(raw);
  if (!/epsilon|delta|ε|δ|definition|rigorous|continuousat|isccontinuous|iscontinuous/.test(k)) return null;
  const s = plain(raw);
  // sequence limits: lim_{n→∞} a_n = L
  let m = s.match(/lim\s*_?\s*\(?\s*n\s*(?:→|->|to)\s*∞\s*\)?\s*(.+?)\s*=\s*([^\s,]+)/);
  if (m) {
    const a = pm(m[1]), Lv = pm(m[2]);
    if (!a || !Lv || [...S.variables(a)].some(v => v !== 'n')) return null;
    const L = S.evaluate(Lv);
    // check the limit numerically
    const big = S.evaluate(a, { n: 1e7 });
    if (Math.abs(big - L) > 1e-4) return null;
    // |a_n - L| simplified
    const diff = S.simplify(S.sub(a, Lv));
    const dRat = (() => { try { return A1.toRational(diff, 'n'); } catch (e) { return null; } })();
    if (!dRat) return null;
    // bound |a_n - L| <= C / n for n >= 1 (C found numerically)
    let C = 0;
    for (let n = 1; n <= 2000; n++) C = Math.max(C, Math.abs(S.evaluate(diff, { n })) * n);
    const decaysLikeN = Math.abs(S.evaluate(diff, { n: 1e6 }) * 1e6) > 1e-9;
    const Cq = toFrac(C, 100, 1e-6);
    const Ct = Cq ? qt(Cq) : fmt(Math.ceil(C * 1000) / 1000);
    const steps = [
      { label: 'Claim:', katex: `\\lim_{n\\to\\infty} ${S.tex(a)} = ${S.tex(Lv)}` },
      { label: 'Definition: for every $\\varepsilon > 0$ we must find $N$ such that $|a_n - L| < \\varepsilon$ for all $n > N$.', katex: '' },
      { label: 'Step 1: simplify the distance to the limit:', katex: `|a_n - L| = \\left|${S.tex(diff)}\\right|` },
      { label: `Step 2: bound it by a simple expression (for all $n \\ge 1$):`, katex: `\\left|${S.tex(diff)}\\right| \\le \\frac{${Ct}}{n}` },
      { label: 'Step 3: choose $N$. Let $\\varepsilon > 0$ and take', katex: `N = \\frac{${Ct}}{\\varepsilon}` },
      { label: 'Step 4: then for every $n > N$:', katex: `|a_n - L| \\le \\frac{${Ct}}{n} < \\frac{${Ct}}{N} = \\varepsilon` },
      { label: `So the sequence converges to ${S.tex(Lv)}. ∎`, katex: '' },
      { label: 'Final Answer:', katex: `\\mathbf{\\lim_{n\\to\\infty} ${S.tex(a)} = ${S.tex(Lv)}\\ \\text{(proved, } N = ${Ct}/\\varepsilon)}` }
    ];
    if (!decaysLikeN) steps.splice(3, 0, { label: '(It actually decays faster than $1/n$, so the bound below is generous.)', katex: '' });
    return { answer: `\\lim_{n\\to\\infty} ${S.tex(a)} = ${S.tex(Lv)}\\ (N = ${Ct}/\\varepsilon)`, steps, proof: true };
  }
  // function limits / continuity at a point: polynomial f
  let f, c, L;
  m = s.match(/lim\s*_?\s*\(?\s*x\s*(?:→|->|to)\s*(-?[\d.\/]+)\s*\)?\s*\(?(.+?)\)?\s*=\s*(-?[\d.\/]+)/);
  if (m) { c = Number(S.evaluate(pm(m[1]))); f = pm(m[2]); L = Number(S.evaluate(pm(m[3]))); }
  else {
    m = s.match(/(?:f\s*\(\s*x\s*\)\s*=\s*)?([^,]*?x[^,]*?)\s+is\s+continuous\s+at\s+x\s*=\s*(-?[\d.\/]+)/);
    if (!m) return null;
    f = pm(m[1].replace(/^.*?(?:that|prove|show)\s+/i, '').replace(/^.*=\s*/, '')); c = Number(S.evaluate(pm(m[2]))); L = f ? S.evaluate(f, { x: c }) : NaN;
  }
  if (!f || !Number.isFinite(c) || [...S.variables(f)].some(v => v !== 'x')) return null;
  const poly = S.toPoly(S.simplify(S.expand(S.simplify(f))), 'x');
  if (!poly) return null;
  const p = P.trim(poly);
  const deg = P.degree(p);
  if (deg < 1 || deg > 6) return null;
  if (Math.abs(p.reduce((acc, co, i) => acc + co.toNumber() * c ** i, 0) - L) > 1e-9) {
    return { answer: R`\text{The stated limit is false}`, steps: [{ label: `At $x = ${c}$ the polynomial equals ${fmt(p.reduce((acc, co, i) => acc + co.toNumber() * c ** i, 0))}, not ${L}, so the statement is false (a polynomial's limit is its value).`, katex: '' }] };
  }
  const cT = toFrac(c) ? qt(toFrac(c)) : fmt(c), LT = toFrac(L) ? qt(toFrac(L)) : fmt(L);
  const steps = [
    { label: 'Claim:', katex: `\\lim_{x\\to ${cT}} ${S.tex(f)} = ${LT}` },
    { label: 'Definition: for every $\\varepsilon > 0$ we must find $\\delta > 0$ such that $0 < |x - c| < \\delta \\Rightarrow |f(x) - L| < \\varepsilon$.', katex: '' }
  ];
  let deltaTex;
  if (deg === 1) {
    const a = p[1];
    const aa = a.isNegative() ? a.neg() : a;
    steps.push({ label: 'Step 1: factor $|f(x) - L|$:', katex: `|f(x) - ${LT}| = |${P.toTex(P.trim([p[0].sub(toFrac(L) || qn(0)), p[1]]), 'x')}| = ${aa.equals(qn(1)) ? '' : qt(aa)}|x - ${cT}|`.replace('- -', '+ ') });
    deltaTex = aa.equals(qn(1)) ? '\\varepsilon' : `\\frac{\\varepsilon}{${qt(aa)}}`;
    steps.push({ label: 'Step 2: choose', katex: `\\delta = ${deltaTex}` });
    steps.push({ label: 'Step 3: then whenever $0 < |x - c| < \\delta$:', katex: `|f(x) - ${LT}| = ${aa.equals(qn(1)) ? '' : qt(aa)}|x - ${cT}| < ${aa.equals(qn(1)) ? '' : qt(aa)}\\delta = \\varepsilon` });
  } else {
    // f(x) - L = (x - c) q(x); on |x - c| < 1 we have |x| < |c| + 1, so |q(x)| <= sum |q_k| (|c| + 1)^k
    const cq = toFrac(c), Lq = toFrac(L);
    if (!cq || !Lq) return null;
    const shifted = p.slice(); shifted[0] = shifted[0].sub(Lq);
    const q = P.trim(deflate(shifted, cq, 1));
    const bnd = Math.abs(c) + 1;
    const M = q.reduce((acc, co, i) => acc + Math.abs(co.toNumber()) * bnd ** i, 0);
    const Mq = toFrac(M), MT = Mq ? qt(Mq) : fmt(Math.ceil(M * 1000) / 1000);
    const inner = P.toTex(q, 'x');
    steps.push({ label: 'Step 1: factor $f(x) - L$ (it vanishes at $x = c$):', katex: `|f(x) - ${LT}| = |x - ${cT}|\\,\\left|${inner}\\right|`.replace('- -', '+ ') });
    steps.push({ label: `Step 2: bound the second factor near $c$. If $|x - c| < 1$ then $|x| < ${fmt(bnd)}$, and the triangle inequality applied term by term gives`, katex: `\\left|${inner}\\right| \\le ${q.map((co, i) => `${fmt(Math.abs(co.toNumber()))}${i ? `\\cdot ${fmt(bnd)}${i > 1 ? `^{${i}}` : ''}` : ''}`).filter((t, i) => !q[i].isZero()).reverse().join(' + ')} = ${MT}` });
    deltaTex = `\\min\\left(1,\\ \\frac{\\varepsilon}{${MT}}\\right)`;
    steps.push({ label: 'Step 3: choose', katex: `\\delta = ${deltaTex}` });
    steps.push({ label: 'Step 4: then whenever $0 < |x - c| < \\delta$ (so $|x - c| < 1$ as well):', katex: `|f(x) - ${LT}| \\le ${MT}\\,|x - ${cT}| < ${MT}\\cdot\\frac{\\varepsilon}{${MT}} = \\varepsilon` });
  }
  const isCont = /continuous/.test(k);
  const fT = f.t === 'sum' || S.simplify(f).t === 'sum' ? `\\left(${S.tex(f)}\\right)` : S.tex(f);
  steps.forEach(st => { st.katex = st.katex.replace(/- -/g, '+ ').replace(/\\lim_\{x\\to ([^}]*)\} (.*?) = /, (m0, a1, b1) => (b1 === S.tex(f) ? `\\lim_{x\\to ${a1}} ${fT} = ` : m0)); st.label = st.label.replace(/- -/g, '+ '); });
  steps.push({ label: isCont ? `Since the limit equals $f(${cT}) = ${LT}$, f is continuous at $x = ${cT}$. ∎` : 'This proves the limit. ∎', katex: '' });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\delta = ${deltaTex}}` });
  return { answer: `${isCont ? `f \\text{ is continuous at } x = ${cT}` : `\\lim_{x\\to ${cT}} ${fT} = ${LT}`}:\\ \\delta = ${deltaTex}`, steps, proof: true };
}

// ---------------------------------------------------------------- limits of integrals (DCT / MCT)
function solveLimitOfIntegral(raw) {
  const s = plain(raw);
  const m = s.match(/lim\s*_?\s*\(?\s*n\s*(?:→|->|to)\s*∞\s*\)?\s*∫\s*_\s*\(?(-?[\d.]+)\)?\s*\^\s*\(?(-?[\d.]+|∞)\)?\s*(.+?)\s*d\s*x/);
  if (!m) return null;
  const a = Number(m[1]), b = m[2] === '∞' ? Infinity : Number(m[2]);
  if (!Number.isFinite(b)) return null;
  const fn = pm(m[3].replace(/^\((.*)\)$/, '$1'));
  if (!fn || [...S.variables(fn)].some(v => v !== 'x' && v !== 'n')) return null;
  const F = (x, n) => S.evaluate(fn, { x, n });
  // pointwise limit at sample points
  const xs = [0.05, 0.2, 0.5, 0.8, 0.95].map(t => a + (b - a) * t);
  const lim = xs.map(x => F(x, 1e8));
  const limZero = lim.every(v => Math.abs(v) < 1e-5);
  // a dominating constant on [a,b]
  let M = 0;
  for (const n of [1, 2, 5, 10, 50, 100, 1000, 1e4]) for (let i = 0; i <= 400; i++) { const v = Math.abs(F(a + (b - a) * i / 400, n)); if (Number.isFinite(v)) M = Math.max(M, v); }
  const Iseq = [10, 100, 1000, 10000].map(n => simpson(x => F(x, n), a, b, 20000));
  const steps = [{ label: 'Limit of integrals:', katex: `\\lim_{n\\to\\infty}\\int_{${a}}^{${b}} ${S.tex(fn)}\\,dx` }];
  if (!limZero || !Number.isFinite(M) || M > 1e6) return null;
  steps.push({ label: 'Step 1 (pointwise limit): for each fixed $x$ in the interval (except possibly one point, a null set), the integrand tends to 0:', katex: `f_n(x) = ${S.tex(fn)} \\xrightarrow{n\\to\\infty} 0 \\quad \\text{a.e.}` });
  const Mq = toFrac(M, 60, 1e-4);
  const hint = /nx\/\(1\+n\^2x\^2\)|\(n\*?x\)\/\(1\+n\^2\*?x\^2\)/.test(m[3].replace(/\s+/g, '')) ? ' (for instance $\\frac{nx}{1+n^2x^2} \\le \\frac12$ by $2nx \\le 1 + n^2x^2$)' : /x\s*\^\s*\(?n\)?/.test(m[3]) ? ' (since $0 \\le x \\le 1$ gives $0 \\le x^n \\le 1$)' : '';
  steps.push({ label: `Step 2 (domination): for all $n$ and $x$, $|f_n(x)| \\le ${Mq ? qt(Mq) : fmt(M)}$${hint}. A constant is integrable on a bounded interval.`, katex: `|f_n(x)| \\le g(x) = ${Mq ? qt(Mq) : fmt(M)}, \\qquad \\int_{${a}}^{${b}} g\\,dx < \\infty` });
  steps.push({ label: 'Step 3: by the dominated convergence theorem we may take the limit inside the integral:', katex: `\\lim_{n\\to\\infty}\\int_{${a}}^{${b}} f_n\\,dx = \\int_{${a}}^{${b}} \\lim_{n\\to\\infty} f_n\\,dx = \\int_{${a}}^{${b}} 0\\,dx = 0` });
  steps.push({ label: 'Numerical check:', katex: Iseq.map((v, i) => `I_{${[10, 100, 1000, 10000][i]}} \\approx ${fmt(v)}`).join(',\\ ') });
  steps.push({ label: 'Final Answer:', katex: R`\mathbf{0}` });
  return { answer: '0', steps };
}

// ---------------------------------------------------------------- residues and contour integrals
// complex arithmetic on AST nodes
const C = {
  add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }), mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
  div: (a, b) => { const d = b.re * b.re + b.im * b.im; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; },
  exp: (a) => ({ re: Math.exp(a.re) * Math.cos(a.im), im: Math.exp(a.re) * Math.sin(a.im) }),
  log: (a) => ({ re: Math.log(Math.hypot(a.re, a.im)), im: Math.atan2(a.im, a.re) })
};
function cEval(n, z) {
  switch (n.t) {
    case 'num': return { re: n.v.toNumber(), im: 0 };
    case 'var': if (n.n === 'z' || n.n === 'x') return z; if (n.n === 'i') return { re: 0, im: 1 }; throw new Error('var');
    case 'const': return { re: n.n === 'pi' ? Math.PI : Math.E, im: 0 };
    case 'sum': return n.terms.reduce((acc, t) => C.add(acc, cEval(t, z)), { re: 0, im: 0 });
    case 'prod': return n.factors.reduce((acc, t) => C.mul(acc, cEval(t, z)), { re: 1, im: 0 });
    case 'pow': {
      const b = cEval(n.base, z);
      if (n.exp.t === 'num' && n.exp.v.d === 1n) { const e = Number(n.exp.v.n); let r = { re: 1, im: 0 }; const base = e < 0 ? C.div({ re: 1, im: 0 }, b) : b; for (let i = 0; i < Math.abs(e); i++) r = C.mul(r, base); return r; }
      if (n.base.t === 'const' && n.base.n === 'e') return C.exp(cEval(n.exp, z));
      return C.exp(C.mul(cEval(n.exp, z), C.log(b)));
    }
    case 'fn': {
      const a = cEval(n.arg, z), iz = { re: -a.im, im: a.re }, miz = { re: a.im, im: -a.re };
      const e1 = C.exp(iz), e2 = C.exp(miz);
      if (n.f === 'exp') return C.exp(a);
      if (n.f === 'sqrt') { if (a.re === 0 && a.im === 0) return a; return C.exp(C.mul({ re: 0.5, im: 0 }, C.log(a))); }
      if (n.f === 'abs') return { re: Math.hypot(a.re, a.im), im: 0 };
      if (n.f === 'sin') { const d = { re: e1.re - e2.re, im: e1.im - e2.im }; return { re: d.im / 2, im: -d.re / 2 }; }
      if (n.f === 'cos') return { re: (e1.re + e2.re) / 2, im: (e1.im + e2.im) / 2 };
      if (n.f === 'ln' || n.f === 'log') return C.log(a);
      throw new Error('fn');
    }
    default: throw new Error('node');
  }
}
// residue at z0 by a small circular contour (trapezoid rule is spectrally accurate for periodic integrands)
function numericResidue(node, z0, r = 1e-3, N = 256) {
  let acc = { re: 0, im: 0 };
  for (let j = 0; j < N; j++) {
    const th = 2 * Math.PI * j / N, w = { re: r * Math.cos(th), im: r * Math.sin(th) };
    const z = { re: z0.re + w.re, im: z0.im + w.im };
    acc = C.add(acc, C.mul(cEval(node, z), w)); // f(z) · (z - z0) · dθ / (2π) ... ×(i dθ)/(2πi)
  }
  return { re: acc.re / N, im: acc.im / N };
}
// residue from circles of several radii: the value is the same for every radius that encloses no other singularity,
// and larger circles avoid the rounding error of a tiny circle around a high-order pole
function stableResidue(node, z0) {
  const rs = [0.5, 0.25, 0.1, 0.05, 0.01, 1e-3];
  const vals = rs.map(r => { try { const v = numericResidue(node, z0, r, 512); return Number.isFinite(v.re) && Number.isFinite(v.im) ? v : null; } catch (e) { return null; } });
  for (let i = 0; i + 1 < vals.length; i++) {
    const a = vals[i], b = vals[i + 1];
    if (a && b && Math.hypot(a.re - b.re, a.im - b.im) < 1e-7 * Math.max(1, Math.hypot(a.re, a.im))) return a;
  }
  return null;
}
const cTex = (c) => {
  const re = Math.abs(c.re) < 1e-9 ? 0 : c.re, im = Math.abs(c.im) < 1e-9 ? 0 : c.im;
  const rt = niceNumber(re) || fmt(re), it = niceNumber(Math.abs(im)) || fmt(Math.abs(im));
  if (!im) return rt;
  const iu = (t) => (t === '1' ? 'i' : /[a-zA-Z]$/.test(t) ? `${t}\\,i` : `${t}i`);
  if (!re) return `${im < 0 ? '-' : ''}${iu(it)}`;
  return `${rt} ${im < 0 ? '-' : '+'} ${iu(it)}`;
};
function poleOrder(node, z0) {
  for (let m = 1; m <= 12; m++) {
    const vals = [1e-3, 5e-4].map(r => { const v = cEval(node, { re: z0.re + r, im: z0.im }); const p = { re: r ** m, im: 0 }; return C.mul(v, p); });
    const a = Math.hypot(vals[0].re, vals[0].im), b = Math.hypot(vals[1].re, vals[1].im);
    if (Number.isFinite(a) && Math.abs(a - b) < 0.05 * Math.max(a, 1e-12) && a > 1e-9) return m;
  }
  return null;
}
function solveResidue(raw) {
  const k = A1.keyText(raw);
  if (!/residue/.test(k)) return null;
  const s = plain(raw).replace(/Res\s*_?\s*\(?\s*z\s*=\s*[^)]*\)?/i, (mm) => mm);
  const zm = s.match(/(?:at|z\s*=)\s*z?\s*=?\s*(-?[\d.]+|-?i|0)\b/);
  const fm = s.match(/(?:of|Res\s*_?\(?\s*z\s*=\s*[^)\s]*\)?\s*)\s*(?:f\(z\)\s*=\s*)?(.+?)\s+(?:at|about)\b/i) || s.match(/Res\s*_\s*\(\s*z\s*=\s*[^)]*\)\s*(.+)$/i);
  if (!fm || !zm) return null;
  const node = pm(fm[1]);
  if (!node || [...S.variables(node)].some(v => v !== 'z' && v !== 'i')) return null;
  const z0 = zm[1] === 'i' ? { re: 0, im: 1 } : zm[1] === '-i' ? { re: 0, im: -1 } : { re: Number(zm[1]), im: 0 };
  let res, m;
  try { m = poleOrder(node, z0); res = stableResidue(node, z0); } catch (e) { return null; }
  if (m && !res) return null;
  const z0t = cTex(z0);
  if (!m) {
    // analytic at z0: f is bounded near the point
    let bounded = true;
    try { for (const r of [1e-2, 1e-3, 1e-4]) { const v = cEval(node, { re: z0.re + r, im: z0.im }); if (!Number.isFinite(v.re) || Math.hypot(v.re, v.im) > 1e6) bounded = false; } } catch (e) { bounded = false; }
    if (!bounded) return null;
    return { answer: `\\operatorname{Res}_{z=${z0t}} f = 0`, steps: [{ label: 'Function and point:', katex: `f(z) = ${S.tex(node)}, \\qquad z_0 = ${z0t}` }, { label: `f is analytic (holomorphic) at $z_0 = ${z0t}$: it has no singularity there, so its Laurent series has no $\\frac{1}{z - z_0}$ term.`, katex: '' }, { label: 'Final Answer:', katex: `\\mathbf{\\operatorname{Res}_{z=${z0t}} f = 0}` }] };
  }
  const steps = [{ label: 'Function and point:', katex: `f(z) = ${S.tex(node)}, \\qquad z_0 = ${z0t}` }];
  steps.push({ label: `Step 1: $z_0$ is a pole of order ${m}: $(z - z_0)^{${m}} f(z)$ has a finite non-zero limit.`, katex: '' });
  steps.push({ label: m === 1 ? 'Step 2: for a simple pole,' : `Step 2: for a pole of order m,`, katex: m === 1 ? R`\operatorname{Res}_{z=z_0} f = \lim_{z\to z_0} (z - z_0) f(z)` : `\\operatorname{Res}_{z=z_0} f = \\frac{1}{(m-1)!}\\lim_{z\\to z_0} \\frac{d^{m-1}}{dz^{m-1}}\\left[(z - z_0)^m f(z)\\right], \\quad m = ${m}` });
  // symbolic attempt for z0 real
  if (!z0.im) {
    try {
      const zz = S.vr('z');
      let g = S.simplify(S.prod(S.pow(S.sum(zz, S.num(toFrac(-z0.re) || qn(0))), S.num(qn(m))), node));
      for (let j = 1; j < m; j++) g = S.simplify(S.derivative(g, 'z'));
      steps.push({ label: m === 1 ? 'Step 3:' : `Step 3: differentiate ${m - 1} time${m > 2 ? 's' : ''}:`, katex: m === 1 ? `(z - z_0)f(z) = ${S.tex(S.simplify(S.prod(S.pow(S.sum(zz, S.num(toFrac(-z0.re) || qn(0))), S.num(qn(1))), node)))}` : `\\frac{d^{${m - 1}}}{dz^{${m - 1}}}\\left[(z-z_0)^{${m}}f(z)\\right] = ${S.tex(g)}` });
    } catch (e) { /* the numeric value below is still exact enough */ }
  }
  const rt = cTex(res);
  steps.push({ label: m > 1 ? `Divide by $(${m}-1)! = ${[1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800][m - 1]}$ and let $z \\to z_0$:` : 'Let $z \\to z_0$:', katex: `\\operatorname{Res}_{z=${z0t}} f = ${rt}` });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\operatorname{Res}_{z=${z0t}} ${S.tex(node)} = ${rt}}` });
  return { answer: `\\operatorname{Res}_{z=${z0t}} f = ${rt}`, steps };
}

function solveContourIntegral(raw) {
  const s = plain(raw);
  const s2 = s.replace(/\(\(d\s*z\)\/\(([^()]*(?:\([^()]*\))*[^()]*)\)\)/, '(1/($1)) dz');
  const m = s2.match(/∮\s*_?\s*\(?\s*\|\s*z\s*(?:-\s*(-?[\d.]+))?\s*\|\s*=\s*([\d.]+)\s*\)?\s*(.+?)\s*d\s*z/) || s2.match(/∮\s*(?:_C)?\s*(.+?)\s*d\s*z.*?\|\s*z\s*(?:-\s*(-?[\d.]+))?\s*\|\s*=\s*([\d.]+)/);
  if (!m) return null;
  let center, Rr, body;
  if (/^∮\s*_?\s*\(?\s*\|/.test(m[0])) { center = Number(m[1] || 0); Rr = Number(m[2]); body = m[3]; }
  else { body = m[1]; center = Number(m[2] || 0); Rr = Number(m[3]); }
  body = body.replace(/^\((.*)\)$/, '$1').replace(/^\(\(d\s*z\)\/\((.*)\)\)$/, '1/($1)').replace(/\(\(1\)\/\((.*)\)\)/, '1/($1)');
  const node = pm(body.replace(/^d\s*z\s*\/\s*/, '1/'));
  if (!node || [...S.variables(node)].some(v => v !== 'z')) return null;
  // denominator polynomial D(z): factors with negative integer powers; the rest must be entire (polynomial, exp, sin, cos)
  const sn = S.simplify(node);
  const facs = sn.t === 'prod' ? sn.factors : [sn];
  let Dpoly = [qn(1)];
  for (const f of facs) {
    if (f.t === 'pow' && f.exp.t === 'num' && f.exp.v.isNegative() && f.exp.v.d === 1n) {
      const bp = S.toPoly(S.simplify(S.expand(f.base)), 'z'); if (!bp) return null;
      for (let i = 0n; i < -f.exp.v.n; i++) Dpoly = pMul(Dpoly, bp);
    } else {
      const ok = (n) => n.t === 'num' || n.t === 'const' || (n.t === 'var' && n.n === 'z') || ((n.t === 'sum' || n.t === 'prod') && (n.terms || n.factors).every(ok)) || (n.t === 'pow' && ok(n.base) && (n.exp.t === 'num' ? !n.exp.v.isNegative() && n.exp.v.d === 1n : n.base.t === 'const' && ok(n.exp))) || (n.t === 'fn' && ['exp', 'sin', 'cos', 'sinh', 'cosh'].includes(n.f) && ok(n.arg));
      if (!ok(f)) return null;
    }
  }
  if (P.degree(P.trim(Dpoly)) < 1) return null;
  const A3 = require('./advanced3');
  let poles = A3.polyRoots(P.trim(Dpoly)).map(p => ({ re: Math.abs(p.re) < 1e-10 ? 0 : p.re, im: Math.abs(p.im) < 1e-10 ? 0 : p.im }));
  { const merged = [];
    for (const p of poles) if (!merged.some(q => Math.hypot(q.re - p.re, q.im - p.im) < 1e-4)) merged.push({ re: Math.round(p.re * 1e8) / 1e8, im: Math.round(p.im * 1e8) / 1e8 });
    poles = merged; }
  const inside = poles.filter(p => Math.hypot(p.re - center, p.im) < Rr - 1e-9);
  const onC = poles.filter(p => Math.abs(Math.hypot(p.re - center, p.im) - Rr) < 1e-9);
  const steps = [{ label: 'Contour integral:', katex: `\\oint_{|z${center ? ` - ${center}` : ''}| = ${Rr}} ${S.tex(node)}\\,dz` }];
  if (onC.length) return { answer: R`\text{A pole lies on the contour: the integral is not defined}`, steps: [...steps, { label: 'A singularity lies on the circle itself, so the integral is not defined (as an ordinary integral).', katex: '' }] };
  steps.push({ label: 'Step 1: singularities (zeros of the denominator):', katex: poles.map(cTex).map(t => `z = ${t}`).join(',\\ ') || R`\text{none}` });
  steps.push({ label: `Step 2: those inside the circle $|z${center ? ` - ${center}` : ''}| < ${Rr}$:`, katex: inside.map(cTex).map(t => `z = ${t}`).join(',\\ ') || R`\text{none}` });
  let sum = { re: 0, im: 0 };
  const lines = [];
  for (const p of inside) {
    const r = stableResidue(node, p) || numericResidue(node, p);
    sum = C.add(sum, r);
    lines.push(`\\operatorname{Res}_{z=${cTex(p)}} = ${cTex(r)}`);
  }
  if (lines.length) steps.push({ label: 'Step 3: residues (e.g. for a simple pole, $\\operatorname{Res} = \\lim (z - z_0)f(z) = N(z_0)/D\'(z_0)$):', katex: lines.join(',\\quad ') });
  const total = C.mul({ re: 0, im: 2 * Math.PI }, sum);
  const tt = (() => {
    const re = Math.abs(total.re) < 1e-9 ? 0 : total.re, im = Math.abs(total.im) < 1e-9 ? 0 : total.im;
    if (!re && !im) return '0';
    const sr = cTex(sum);
    if (Math.abs(sum.im) < 1e-9) return `2\\pi i\\cdot ${/[+-]/.test(sr) ? `(${sr})` : sr} = ${niceNumber(sum.re * 2) ? `${niceNumber(sum.re * 2).replace(/^1\\pi$/, '\\pi')}` : fmt(sum.re * 2)}\\pi i`.replace(/= 1\\pi i/, '= 2\\pi i').replace(/= -1\\pi i/, '= -\\pi i');
    return cTex(total);
  })();
  steps.push({ label: 'Step 4 (residue theorem): $\\oint_C f\\,dz = 2\\pi i \\sum \\operatorname{Res}$ over the poles inside C:', katex: `\\oint f\\,dz = ${tt}` });
  const finalTex = tt.split('=').pop().trim();
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${finalTex}}` });
  return { answer: finalTex, steps };
}

// ---------------------------------------------------------------- topology table
const SPACES = [
  { re: /\b(circle|s\^?\(?1\)?)(?![\d^])/, name: R`S^1 \text{ (circle)}`, chi: '0', pi1: R`\mathbb{Z}`, H: [R`\mathbb{Z}`, R`\mathbb{Z}`], note: 'generated by the loop that goes once around' },
  { re: /\b(sphere|s\^?\(?2\)?)(?![\d^])/, name: R`S^2 \text{ (sphere)}`, chi: '2', pi1: '0', H: [R`\mathbb{Z}`, '0', R`\mathbb{Z}`], note: 'every loop can be shrunk (simply connected); V − E + F = 2 for any polyhedron' },
  { re: /\btorus\b|\bdonut\b|\bdoughnut\b|coffee\s*mug|\bt\^?\(?2\)?\b/, name: R`T^2 = S^1 \times S^1 \text{ (torus)}`, chi: '0', pi1: R`\mathbb{Z} \times \mathbb{Z}`, H: [R`\mathbb{Z}`, R`\mathbb{Z}^2`, R`\mathbb{Z}`], note: 'one square with opposite sides glued: V = 1, E = 2, F = 1' },
  { re: /klein\s*bottle/, name: R`K \text{ (Klein bottle)}`, chi: '0', pi1: R`\langle a, b \mid abab^{-1} \rangle`, H: [R`\mathbb{Z}`, R`\mathbb{Z} \oplus \mathbb{Z}_2`, '0'], note: 'non-orientable; V = 1, E = 2, F = 1' },
  { re: /projective\s*plane|rp\^?\(?2\)?|ℝp\^?2/, name: R`\mathbb{RP}^2 \text{ (real projective plane)}`, chi: '1', pi1: R`\mathbb{Z}_2`, H: [R`\mathbb{Z}`, R`\mathbb{Z}_2`, '0'], note: 'non-orientable; V = 1, E = 1, F = 1' },
  { re: /m(ö|o|oe)bius/, name: R`\text{Möbius band}`, chi: '0', pi1: R`\mathbb{Z}`, H: [R`\mathbb{Z}`, R`\mathbb{Z}`], note: 'deformation retracts onto its central circle' },
  { re: /cylinder|annulus/, name: R`\text{cylinder / annulus}`, chi: '0', pi1: R`\mathbb{Z}`, H: [R`\mathbb{Z}`, R`\mathbb{Z}`], note: 'deformation retracts onto a circle' },
  { re: /figure.?(eight|8)|wedge of two circles|s\^?1\s*(∨|vee)\s*s\^?1/, name: R`S^1 \vee S^1 \text{ (figure eight)}`, chi: '-1', pi1: R`F_2 = \langle a, b \rangle \text{ (free group)}`, H: [R`\mathbb{Z}`, R`\mathbb{Z}^2`], note: 'one vertex and two edges: V − E = 1 − 2' },
  { re: /\b(disk|disc|ball|contractible|r\^?n|ℝ\^?n)\b/, name: R`D^n \text{ (disk / ball, contractible)}`, chi: '1', pi1: '0', H: [R`\mathbb{Z}`], note: 'contractible, so all higher groups vanish' }
];
function solveTopologyQuestion(raw) {
  const k = A1.keyText(raw).replace(/\\mathbb\{r\}/g, 'r');
  const kind = /fundamentalgroup|π_?1|pi_?1|pi_\{?1\}?/.test(k) ? 'pi1' : /homology/.test(k) ? 'H' : /eulercharacteristic|χ|chi\b/.test(k) ? 'chi' : null;
  if (!kind) return null;
  const s = plain(raw).toLowerCase();
  // polyhedron with V, E, F given
  const v = s.match(/v\s*=\s*(\d+)/), e = s.match(/e\s*=\s*(\d+)/), f = s.match(/f\s*=\s*(\d+)/);
  if (kind === 'chi' && v && e && f) {
    const chi = Number(v[1]) - Number(e[1]) + Number(f[1]);
    return { answer: `\\chi = ${chi}`, steps: [{ label: 'Euler characteristic:', katex: `\\chi = V - E + F = ${v[1]} - ${e[1]} + ${f[1]} = ${chi}` }, { label: chi === 2 ? 'χ = 2: the surface is a sphere (any convex polyhedron).' : `For a closed orientable surface of genus g, χ = 2 − 2g, so g = ${(2 - chi) / 2}.`, katex: '' }, { label: 'Final Answer:', katex: `\\mathbf{\\chi = ${chi}}` }] };
  }
  const poly = s.match(/\b(cube|tetrahedron|octahedron|dodecahedron|icosahedron)\b/);
  if (kind === 'chi' && poly) {
    const t = { cube: [8, 12, 6], tetrahedron: [4, 6, 4], octahedron: [6, 12, 8], dodecahedron: [20, 30, 12], icosahedron: [12, 30, 20] }[poly[1]];
    return { answer: R`\chi = 2`, steps: [{ label: `A ${poly[1]} has V = ${t[0]} vertices, E = ${t[1]} edges, F = ${t[2]} faces:`, katex: `\\chi = ${t[0]} - ${t[1]} + ${t[2]} = 2` }, { label: 'Every convex polyhedron has χ = 2 (it is a sphere topologically).', katex: '' }, { label: 'Final Answer:', katex: R`\mathbf{\chi = 2}` }] };
  }
  // genus g surface
  const gm = s.match(/genus\s*(?:g\s*=\s*)?(\d+)/);
  if (gm) {
    const g = Number(gm[1]);
    const ans = kind === 'chi' ? `\\chi = 2 - 2g = ${2 - 2 * g}` : kind === 'pi1' ? `\\pi_1 = \\langle a_1, b_1, \\dots, a_{${g}}, b_{${g}} \\mid [a_1,b_1]\\cdots[a_{${g}},b_{${g}}] = 1 \\rangle` : `H_0 = \\mathbb{Z},\\ H_1 = \\mathbb{Z}^{${2 * g}},\\ H_2 = \\mathbb{Z}`;
    return { answer: ans, steps: [{ label: `Closed orientable surface of genus ${g} (a sphere with ${g} handles), built from a 4g-gon with edges glued in pairs:`, katex: `V = 1,\\ E = ${2 * g},\\ F = 1` }, { label: 'Final Answer:', katex: `\\mathbf{${ans}}` }] };
  }
  // spheres S^n, n >= 3
  const sn = s.match(/s\s*\^\s*\(?\s*(\d+)\s*\)?/);
  if (sn && Number(sn[1]) >= 3) {
    const n = Number(sn[1]);
    const ans = kind === 'chi' ? `\\chi(S^{${n}}) = 1 + (-1)^{${n}} = ${1 + (-1) ** n}` : kind === 'pi1' ? R`\pi_1(S^n) = 0 \ (n \ge 2)` : `H_k(S^{${n}}) = \\mathbb{Z} \\text{ for } k = 0, ${n};\\ 0 \\text{ otherwise}`;
    return { answer: ans, steps: [{ label: `The sphere S^${n} has a CW structure with one 0-cell and one ${n}-cell.`, katex: '' }, { label: 'Final Answer:', katex: `\\mathbf{${ans}}` }] };
  }
  const sp = SPACES.find(x => x.re.test(s));
  if (!sp) return null;
  const steps = [{ label: 'Space:', katex: sp.name }];
  let ans;
  if (kind === 'pi1') { ans = `\\pi_1 = ${sp.pi1}`; steps.push({ label: `Fundamental group (${sp.note}):`, katex: ans }); }
  else if (kind === 'chi') { ans = `\\chi = ${sp.chi}`; steps.push({ label: `Euler characteristic χ = V − E + F (${sp.note}):`, katex: ans }); }
  else { ans = sp.H.map((h, i) => `H_{${i}} = ${h}`).join(',\\ ') + R`,\ H_k = 0 \text{ for higher } k`; steps.push({ label: 'Homology groups (cellular homology from the standard CW structure):', katex: ans }); }
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

module.exports = { cTexPublic: (c) => cTex(c), niceNumber, toFrac, deflate, solveLaplaceIVP, solveLineIntegral, solveVectorCalculus, solveStokes, solveRectangleIntegral, solveSeparableODE, solveLaplace, solveInverseLaplace, solveHeatWaveSine, solveEpsilonDelta, solveLimitOfIntegral, solveResidue, solveContourIntegral, solveTopologyQuestion, cEval };
