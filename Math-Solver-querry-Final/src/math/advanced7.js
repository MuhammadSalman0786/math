// Advanced solvers, part 7: plain-English rewriting, higher / partial derivatives, sums and series,
// Taylor and Fourier series, more linear algebra, first-order linear ODEs, complex numbers,
// combinatorics, number theory, statistics, probability, vector calculus, multiple integrals,
// fraction conversions and common word problems.
// Every solver returns null when it is not sure, so the next solver can try.
const S = require('./symbolic');
const P = require('./polynomial');
const { Q, formatDecimal } = require('./rational');
const A1 = require('./advanced1');
const { niceNumber, toFrac } = require('./advanced6');
const { solveLinear, checkAnti } = require('./integrate2');

const R = String.raw;
const q = (a, b = 1n) => new Q(BigInt(a), BigInt(b));
const T = (n) => S.tex(S.simplify(n));
const fmt = (v) => { const r = Math.round(v * 1e10) / 1e10; return formatDecimal(Object.is(r, -0) ? 0 : r); };
const show = (v) => niceNumber(v) || fmt(v);
const done = (answer, steps) => { steps.push({ label: 'Final Answer:', katex: `\\mathbf{${answer}}` }); return { answer, steps }; };
const pm = (s) => { try { return A1.parseMath(s); } catch (e) { return null; } };
const plainWords = (raw) => String(raw).replace(/\\(text|mathrm|operatorname)\{([^{}]*)\}/g, '$2').replace(/\\[,;:! ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- 1. plain English -> LaTeX forms
function rewritePlain(raw) {
  let s = plainWords(raw).replace(/[.?]\s*$/, '');
  const lim = '(-?(?:infinity|inf|∞|\\\\infty|[\\w.^/()*+-]+?))';
  let m;
  // area under y = f from a to b / between x=a and x=b
  if ((m = s.match(/^(?:find\s+)?(?:the\s+)?area\s+under\s+(?:the\s+)?(?:curve\s+|graph\s+(?:of\s+)?)?(?:y\s*=\s*|f\(x\)\s*=\s*)?(.+?)\s+(?:from|between)\s+(?:x\s*=\s*)?(\S+)\s+(?:to|and)\s+(?:x\s*=\s*)?(\S+)$/i)))
    return `\\int_{${m[2]}}^{${m[3]}} ${m[1]} dx`;
  // integral from a to b of f dx
  if ((m = s.match(new RegExp(`^(?:find\\s+|evaluate\\s+|compute\\s+|calculate\\s+)?(?:the\\s+)?(?:definite\\s+)?integral\\s+from\\s+${lim}\\s+to\\s+${lim}\\s+of\\s+(.+)$`, 'i'))))
    return `\\int_{${fixInf(m[1])}}^{${fixInf(m[2])}} ${dx(m[3])}`;
  // integral of f (dx) from a to b
  if ((m = s.match(new RegExp(`^(?:find\\s+|evaluate\\s+|compute\\s+|calculate\\s+)?(?:the\\s+)?(?:definite\\s+)?(?:integral\\s+of|integrate)\\s+(.+?)\\s+from\\s+${lim}\\s+to\\s+${lim}$`, 'i'))))
    return `\\int_{${fixInf(m[2])}}^{${fixInf(m[3])}} ${dx(m[1])}`;
  if ((m = s.match(/^(?:find\s+|evaluate\s+|compute\s+)?(?:the\s+)?(?:indefinite\s+)?(?:integral\s+of|antiderivative\s+of|integrate)\s+(.+)$/i)) && !/\bfrom\b/i.test(s))
    return `\\int ${dx(m[1])}`;
  // limit of f as x -> a
  if ((m = s.match(/^(?:find\s+|evaluate\s+)?(?:the\s+)?lim(?:it)?\s+(?:of\s+)?(.+?)\s+as\s+([a-z])\s*(?:->|→|approaches|tends\s+to|goes\s+to|\\to)\s*(.+)$/i)))
    return `\\lim_{${m[2]}\\to ${fixInf(m[3])}} ${m[1]}`;
  // sum of f from n=a to b
  if ((m = s.match(/^(?:find\s+|evaluate\s+)?(?:the\s+)?sum\s+(?:of\s+)?(.+?)\s+(?:from|for)\s+([a-z])\s*=\s*(-?\d+)\s+to\s+(\S+)$/i)))
    return `\\sum_{${m[2]}=${m[3]}}^{${fixInf(m[4])}} ${m[1]}`;
  if (/epsilon|delta|ε|δ/i.test(s) && (m = s.match(/\blim\s*([a-z])\s*(?:->|→|\\to)\s*(\S+)\s+of\s+/i))) return s.replace(m[0], `lim ${m[1]}->${m[2]} `);
  return null;
}
const fixInf = (t) => (/^(?:\+)?(?:infinity|inf|∞)$/i.test(t.trim()) ? '\\infty' : /^-(?:infinity|inf|∞)$/i.test(t.trim()) ? '-\\infty' : t.trim());
const dx = (body) => (/\bd[a-z]\s*$/.test(body) ? body : body + ' dx');

// ---------------------------------------------------------------- 2. derivatives
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5 };
function parseFn(body) {
  body = String(body).replace(/\\left|\\right/g, '').trim().replace(/^\((.*)\)$/, '$1').replace(/^(?:y|f\s*\(\s*x\s*\))\s*=\s*/, '');
  return pm(body);
}
function solveHigherDerivative(raw) {
  const s = plainWords(raw);
  let m, n = null, body = null;
  if ((m = s.match(/^(?:find\s+)?(?:the\s+)?(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|(\d+)(?:th|st|nd|rd))\s+derivative\s+of\s+(.+?)(?:\s+with\s+respect\s+to\s+x)?$/i))) { n = ORD[m[1].toLowerCase()] || +m[2]; body = m[3]; }
  else if ((m = s.match(/^\\frac\{d\^\{?(\d+)\}?\s*\}\{d\s*x\^\{?\1\}?\}\s*(.+)$/))) { n = +m[1]; body = m[2]; }
  else if ((m = s.match(/^d\^(\d+)\s*\/\s*dx\^\1\s*(.+)$/i))) { n = +m[1]; body = m[2]; }
  else if ((m = s.match(/^\\frac\{d\^\{?(\d+)\}?\s*y\}\{d\s*x\^\{?\1\}?\}.*?y\s*=\s*(.+)$/))) { n = +m[1]; body = m[2]; }
  if (!n || n < 1 || n > 10 || !body) return null;
  const f = parseFn(body);
  if (!f) return null;
  const vars = [...S.variables(f)];
  if (vars.some(v => v !== 'x')) return null;
  let d = S.simplify(f);
  const steps = [{ label: 'Given function:', katex: `f(x) = ${T(f)}` }];
  const names = ["f'(x)", "f''(x)", "f'''(x)"];
  for (let k = 1; k <= n; k++) {
    d = S.derivative(d, 'x');
    steps.push({ label: `Differentiate ${k === 1 ? 'once' : 'again'} (derivative number ${k}):`, katex: `${names[k - 1] || `f^{(${k})}(x)`} = ${S.tex(d)}` });
  }
  const lhs = names[n - 1] || `f^{(${n})}(x)`;
  return done(`${lhs} = ${S.tex(d)}`, steps);
}

function solvePartialDerivative(raw) {
  const s = plainWords(raw);
  let m, v = null, body = null;
  if ((m = s.match(/partial\s+derivative\s+of\s+(.+?)\s+(?:with\s+respect\s+to|w\.?r\.?t\.?)\s+([a-z])$/i))) { body = m[1]; v = m[2]; }
  else if ((m = s.match(/^\\frac\{\\partial\s*\}\{\\partial\s*([a-z])\}\s*(.+)$/))) { v = m[1]; body = m[2]; }
  else if ((m = s.match(/^\\frac\{\\partial\s*(?:f|z|u)\}\{\\partial\s*([a-z])\}.*?(?:f|z|u)\s*(?:\(.*?\))?\s*=\s*(.+)$/))) { v = m[1]; body = m[2]; }
  else if ((m = s.match(/^(?:∂|\\partial)\s*\/\s*(?:∂|\\partial)\s*([a-z])\s*(.+)$/))) { v = m[1]; body = m[2]; }
  if (!v || !body) return null;
  const f = parseFn(body);
  if (!f) return null;
  const d = S.derivative(f, v);
  const others = [...S.variables(f)].filter(w => w !== v);
  const steps = [
    { label: 'Function:', katex: `f = ${T(f)}` },
    { label: `Partial derivative: differentiate with respect to $${v}$ and treat ${others.length ? others.map(w => `$${w}$`).join(', ') : 'the other variables'} as constants.`, katex: `\\frac{\\partial f}{\\partial ${v}} = ${S.tex(d)}` }
  ];
  return done(`\\frac{\\partial f}{\\partial ${v}} = ${S.tex(d)}`, steps);
}

function solveDerivativeAtPoint(raw) {
  const s = plainWords(raw);
  let m, body = null, a = null, kind = 'slope';
  if ((m = s.match(/slope\s+of\s+(?:the\s+)?tangent(?:\s+line)?\s+(?:to|of)\s+(?:the\s+curve\s+)?(?:y\s*=\s*)?(.+?)\s+at\s+(?:x\s*=\s*|the\s+point\s+x\s*=\s*)?(-?[\d./]+)$/i))) { body = m[1]; a = m[2]; }
  else if ((m = s.match(/^f\s*\(\s*x\s*\)\s*=\s*(.+?)\s*[,;]\s*(?:find\s+)?f\s*'\s*\(\s*(-?[\d./]+)\s*\)$/i))) { body = m[1]; a = m[2]; kind = 'f'; }
  else if ((m = s.match(/^(?:find\s+)?f\s*'\s*\(\s*(-?[\d./]+)\s*\)\s*(?:if|where|for)\s+f\s*\(\s*x\s*\)\s*=\s*(.+)$/i))) { body = m[2]; a = m[1]; kind = 'f'; }
  else if ((m = s.match(/^(?:find\s+)?(?:the\s+)?derivative\s+of\s+(.+?)\s+at\s+x\s*=\s*(-?[\d./]+)$/i))) { body = m[1]; a = m[2]; kind = 'f'; }
  if (!body) return null;
  const f = parseFn(body), an = pm(a);
  if (!f || !an || [...S.variables(f)].some(v => v !== 'x')) return null;
  const d = S.derivative(f, 'x');
  const val = S.simplify(S.substitute(d, 'x', an));
  const steps = [
    { label: 'Function:', katex: `f(x) = ${T(f)}` },
    { label: 'Differentiate:', katex: `f'(x) = ${S.tex(d)}` },
    { label: `Substitute $x = ${T(an)}$:`, katex: `f'(${T(an)}) = ${S.tex(val)}` }
  ];
  let ans = S.tex(val);
  if (val.t !== 'num') { const v = S.evaluate(val); if (!Number.isFinite(v)) return null; ans = niceNumber(v) || `${S.tex(val)} \\approx ${fmt(v)}`; }
  if (kind === 'slope') steps.push({ label: 'The slope of the tangent line equals the derivative at that point.', katex: '' });
  return done(ans, steps);
}

// ---------------------------------------------------------------- 3. sums and series
function extractSum(raw) {
  const s = String(raw).replace(/\\left|\\right|\\displaystyle/g, '');
  const m = s.match(/^\s*\\sum\s*_\s*\{\s*([a-z])\s*=\s*(-?\d+)\s*\}\s*\^\s*(\{[^{}]*\}|\\infty|∞|\d+|[a-z])\s*(.+)$/);
  if (!m) return null;
  const up = m[3].replace(/[{}]/g, '').trim();
  return { v: m[1], lo: +m[2], up: /infty|∞|inf/.test(up) ? Infinity : /^\d+$/.test(up) ? +up : up, body: m[4].trim() };
}
const ZETA = { 2: '\\frac{\\pi^{2}}{6}', 4: '\\frac{\\pi^{4}}{90}', 6: '\\frac{\\pi^{6}}{945}', 8: '\\frac{\\pi^{8}}{9450}' };
function exactValue(v) {
  if (!Number.isFinite(v)) return null;
  const n = niceNumber(v) || A1.recogniseConstant(v);
  if (n) return n;
  const cands = [[Math.E, 'e'], [Math.E ** 2, 'e^{2}'], [Math.E ** 3, 'e^{3}'], [Math.sqrt(Math.E), '\\sqrt{e}'], [Math.LN2, '\\ln 2'], [1 / Math.E, '\\frac{1}{e}'], [Math.E - 1, 'e - 1'], [Math.PI ** 4, '\\pi^{4}'], [Math.sqrt(Math.PI), '\\sqrt{\\pi}']];
  for (const [c, name] of cands) { const f = toFrac(v / c, 1000, 1e-10); if (f) return f.equals(q(1)) ? name : `${f.toTex()}${name.length > 2 ? '\\,' : ''}${name}`; }
  return null;
}
function solveSum(raw) {
  if (/converg|diverg|test/i.test(raw)) return null;
  const ex = extractSum(raw);
  if (!ex) return null;
  const f = pm(ex.body);
  if (!f) return null;
  const { v, lo, up } = ex;
  const vars = [...S.variables(f)];
  if (vars.some(w => w !== v)) return null;
  const F = S.simplify(f);
  const at = (k) => S.evaluate(F, { [v]: k });
  const head = `\\sum_{${v}=${lo}}^{${up === Infinity ? '\\infty' : up}} ${S.tex(F)}`;
  const steps = [{ label: 'Given sum:', katex: head }];
  // symbolic upper limit: polynomial summand (Faulhaber via fitting a polynomial of degree d+1)
  if (typeof up === 'string') {
    const p = S.toPoly(F, v);
    if (!p) return null;
    const d = P.degree(p) + 1;
    const pts = [];
    let acc = q(0);
    for (let k = lo; pts.length <= d; k++) { acc = acc.add(P.evaluate(p, q(k))); pts.push([q(k), acc]); }
    const M = pts.map(([k]) => Array.from({ length: d + 1 }, (_, j) => k.pow(q(j))));
    const c = solveLinear(M, pts.map(([, y]) => y));
    if (!c) return null;
    const node = S.simplify(S.fromPoly(c, up));
    let fact = node;
    const fp = P.factor(c.map(x => x));
    if (fp.factors.length > 1) fact = null;
    steps.push({ label: 'Use the standard formulas $\\sum k = \\frac{n(n+1)}{2}$, $\\sum k^2 = \\frac{n(n+1)(2n+1)}{6}$, $\\sum k^3 = \\left(\\frac{n(n+1)}{2}\\right)^2$:', katex: `${head} = ${S.tex(node)}` });
    const factored = fp.factors.length > 1 ? P.factoredTex(fp, up) : null;
    if (factored) steps.push({ label: 'Factored:', katex: `= ${factored}` });
    void fact;
    return done(factored || S.tex(node), steps);
  }
  if (up !== Infinity) {
    if (up - lo > 100000 || up < lo) return null;
    // exact rational sum when possible (short sums only: long ones are added as decimals)
    let exact = q(0), ok = up - lo <= 400;
    for (let k = lo; ok && k <= up; k++) {
      const t = S.simplify(S.substitute(F, v, S.num(k)));
      if (t.t !== 'num') { ok = false; break; }
      exact = exact.add(t.v);
    }
    if (ok) {
      const terms = [];
      for (let k = lo; k <= Math.min(up, lo + 3); k++) terms.push(T(S.substitute(F, v, S.num(k))));
      steps.push({ label: 'Add the terms:', katex: `${terms.join(' + ')}${up > lo + 3 ? ' + \\cdots' : ''} = ${exact.toTex()}` });
      return done(exact.toTex(), steps);
    }
    let tot = 0; for (let k = lo; k <= up; k++) tot += at(k);
    if (!Number.isFinite(tot)) return null;
    steps.push({ label: 'Add the terms (as decimals):', katex: `\\approx ${fmt(tot)}` });
    return done(Number.isInteger(tot) ? String(tot) : `\\approx ${fmt(tot)}`, steps);
  }
  // ---- infinite series ----
  const knownTex = knownSeries(F, v, lo, steps);
  if (knownTex) return done(knownTex, steps);
  const val = numericSeries(at, lo);
  if (val === null) return null;
  const ev = exactValue(val.value);
  if (!ev) return null;
  steps.push({ label: 'The partial sums settle on a limit; its value is recognised exactly:', katex: `${head} = ${ev}` });
  return done(ev, steps);
}
function knownSeries(F, v, lo, steps) {
  // p-series 1/n^p
  if (F.t === 'pow' && F.base.t === 'var' && F.exp.t === 'num' && F.exp.v.isInteger() && lo === 1) {
    const p = -Number(F.exp.v.n);
    if (p <= 1) { steps.push({ label: `This is a p-series with $p = ${p} \\le 1$, so it diverges.`, katex: '' }); return '\\text{The series diverges}'; }
    if (ZETA[p]) { steps.push({ label: `This is the p-series $\\zeta(${p})$ (Euler's result):`, katex: `\\sum_{n=1}^{\\infty} \\frac{1}{n^{${p}}} = ${ZETA[p]}` }); return ZETA[p]; }
  }
  // geometric a r^n
  const [c, rest] = S.splitCoef(F);
  if (rest && rest.t === 'pow' && S.freeOf(rest.base, v) && S.linearIn(rest.exp, v)) {
    const L = S.linearIn(rest.exp, v);
    if (L.a.equals(1) || L.a.equals(-1)) {
      let r = S.evaluate(rest.base);
      if (L.a.equals(-1)) r = 1 / r;
      const first = c.toNumber() * S.evaluate(S.substitute(rest, v, S.num(lo)));
      if (Math.abs(r) >= 1) { steps.push({ label: `Geometric series with ratio $|r| \\ge 1$: it diverges.`, katex: '' }); return '\\text{The series diverges}'; }
      const val = first / (1 - r);
      const t = show(val);
      steps.push({ label: `Geometric series: first term $a = ${show(first)}$, ratio $r = ${show(r)}$, and $|r| < 1$, so the sum is $\\frac{a}{1 - r}$:`, katex: `\\frac{${show(first)}}{1 - ${show(r)}} = ${t}` });
      return t;
    }
  }
  return null;
}
function numericSeries(at, lo) {
  // terms must go to zero (check at a size where factorials and powers still fit in a double)
  const t2 = [2000, 300, 100].map(k => at(lo + k)).find(Number.isFinite);
  if (t2 === undefined || Math.abs(t2) > 1e-3) return null;
  const alt = Math.sign(at(lo + 21)) !== Math.sign(at(lo + 20)) && at(lo + 20) !== 0 && Math.sign(at(lo + 22)) === Math.sign(at(lo + 20));
  const partial = (N) => { let s = 0; for (let k = lo; k <= N; k++) s += at(k); return s; };
  if (alt) {
    // average of consecutive partial sums, repeated (Euler transform style)
    let row = []; let s = 0;
    for (let k = lo; k < lo + 40; k++) { s += at(k); row.push(s); }
    for (let r = 0; r < 30; r++) row = row.slice(1).map((x, i) => (x + row[i]) / 2);
    const v = row[row.length - 1];
    return Number.isFinite(v) ? { value: v } : null;
  }
  // fast convergence (ratio < 1)?
  // geometric-or-faster decay: the ratio of consecutive terms stays well below 1
  const r = Math.abs(at(lo + 31) / at(lo + 30));
  const rFar = Math.abs(at(lo + 201) / at(lo + 200));
  if (r < 0.7 || (Number.isFinite(rFar) && rFar < 0.95)) {
    let v = 0;
    for (let k = lo; k <= lo + 2000; k++) { const t = at(k); if (!Number.isFinite(t)) break; v += t; if (k > lo + 10 && Math.abs(t) < 1e-18 * Math.max(1, Math.abs(v))) break; }
    return Number.isFinite(v) ? { value: v } : null;
  }
  // algebraic decay: Richardson extrapolation in 1/N
  const Ns = [1000, 2000, 4000, 8000, 16000];
  let A = Ns.map(N => partial(lo + N - 1));
  const rows = [A.slice()];
  for (let j = 1; j < Ns.length; j++) {
    const nxt = [];
    for (let i = 0; i + 1 < A.length; i++) nxt.push((Math.pow(2, j) * A[i + 1] - A[i]) / (Math.pow(2, j) - 1));
    A = nxt; rows.push(A.slice());
  }
  const last = rows[rows.length - 1][0], prev = rows[rows.length - 2];
  if (!prev || Math.abs(prev[prev.length - 1] - last) > 1e-8 * Math.max(1, Math.abs(last))) return null;
  return { value: last };
}

// ---------------------------------------------------------------- 4. Taylor / Maclaurin series
function solveTaylor(raw) {
  const s = plainWords(raw);
  let m = s.match(/(?:taylor|maclaurin)\s+(?:series|polynomial|expansion)\s+(?:of|for)\s+(.+?)(?:\s+(?:at|about|around|centered\s+at)\s+(?:x\s*=\s*)?(-?[\w./]+))?(?:\s*,?\s*(?:up\s+to|to|order|degree|through|of\s+order|of\s+degree)\s+(?:x\^\{?(\d+)\}?|(?:order|degree|the\s+)?\s*(\d+)(?:\s*(?:terms?|order|degree))?))?$/i);
  if (!m) return null;
  const body = m[1].replace(/\s*(?:up\s+to|order|degree).*$/i, '');
  const f = parseFn(body);
  if (!f || [...S.variables(f)].some(v => v !== 'x')) return null;
  const center = m[2] ? pm(m[2]) : S.num(0);
  if (!center || !S.freeOf(center, 'x')) return null;
  const N = Math.min(10, +(m[3] || m[4] || 4));
  const aT = T(center);
  const isZero = center.t === 'num' && center.v.isZero();
  const steps = [{ label: `Taylor series about $x = ${aT}$: $f(x) = \\sum \\frac{f^{(k)}(${aT})}{k!}(x - ${aT})^k$`, katex: `f(x) = ${T(f)}` }];
  const terms = [];
  let d = S.simplify(f);
  let fact = q(1);
  const rows = [];
  for (let k = 0; k <= N; k++) {
    if (k > 0) { d = S.derivative(d, 'x'); fact = fact.mul(q(k)); }
    let val = S.simplify(S.substitute(d, 'x', center));
    const num = S.evaluate(val);
    if (!Number.isFinite(num)) return null;
    if (val.t !== 'num') { const fr = toFrac(num, 5000, 1e-11); if (fr) val = S.num(fr); }
    rows.push(`f^{(${k})}(${aT}) = ${S.tex(val)}`);
    if (Math.abs(num) < 1e-14) continue;
    const xa = isZero ? S.vr('x') : S.sum(S.vr('x'), S.neg(center));
    terms.push(S.prod(val, S.num(q(1).div(fact)), S.pow(xa, k)));
  }
  if (!terms.length) return null;
  const poly = S.simplify(S.sum(...terms));
  steps.push({ label: 'Derivatives at the centre:', katex: `\\begin{aligned} ${rows.map(r => r.replace(' = ', ' &= ')).join(' \\\\ ')} \\end{aligned}` });
  const polyTex = isZero ? texAscending(terms) : S.tex(poly);
  steps.push({ label: `Put them into the formula (terms up to order ${N}):`, katex: `f(x) \\approx ${polyTex}` });
  return done(`${polyTex} + \\cdots`, steps);
}
function texAscending(terms) {
  return terms.map((t, i) => { const tx = T(t); return i === 0 ? tx : (tx.startsWith('-') ? ` - ${tx.slice(1)}` : ` + ${tx}`); }).join('');
}

// ---------------------------------------------------------------- 5. Fourier series of a polynomial on [-L, L]
function solveFourier(raw) {
  const s = plainWords(raw);
  const m = s.match(/fourier\s+series\s+(?:of|for)\s+(?:f\(x\)\s*=\s*)?(.+?)\s+(?:on|over|in|for)\s+(?:the\s+interval\s+)?[[(]\s*-\s*(\\pi|pi|π|\d+)\s*,\s*(\\pi|pi|π|\d+)\s*[\])]$/i);
  if (!m) return null;
  const f = parseFn(m[1]);
  if (!f) return null;
  const p = S.toPoly(f, 'x');
  if (!p || P.degree(p) > 3) return null;
  const isPi = /pi|π/.test(m[2]);
  if (/pi|π/.test(m[2]) !== /pi|π/.test(m[3]) || (!isPi && m[2] !== m[3])) return null;
  if (!isPi) return null; // general L would need π in the frequencies; only [-π, π] supported here
  // a0/2 = (1/2π)∫ f ; an = (1/π)∫ f cos nx ; bn = (1/π)∫ f sin nx    (with n integer: sin nπ = 0, cos nπ = (-1)^n)
  // For x^k: closed forms (k <= 3)
  //   ∫_{-π}^{π} x^k dx = 2π^{k+1}/(k+1) for even k, 0 odd
  //   ∫ x^k cos nx : k=0:0 ; k=2: 4π(-1)^n/n^2
  //   ∫ x^k sin nx : k=1: -2π(-1)^n/n ; k=3: (-1)^n (12π/n^3 - 2π^3/n)
  const c = (k) => (p[k] ? p[k] : q(0));
  const a0half = c(0).toNumber() + c(2).toNumber() * Math.PI ** 2 / 3; // (1/2π)·∫
  const terms = [];
  const a0 = c(0).add(c(2).mul(q(1, 3)));
  // build TeX pieces
  const pi2 = !c(2).isZero() ? `${c(2).equals(1) ? '' : c(2).toTex()}\\frac{\\pi^{2}}{3}` : '';
  const constTex = [c(0).isZero() ? '' : c(0).toTex(), pi2].filter(Boolean).join(' + ') || '';
  void a0; void a0half;
  // an = (1/π)·c2·4π(-1)^n/n^2 = 4c2(-1)^n/n^2
  if (!c(2).isZero()) terms.push(`${coefTex(c(2).mul(q(4)))}\\frac{(-1)^{n}}{n^{2}}\\cos(nx)`);
  // bn = (1/π)[c1·(-2π(-1)^n/n) + c3·(-1)^n(12π/n^3 - 2π^3/n)] = (-1)^n[ -2c1/n + c3(12/n^3 - 2π^2/n) ]
  const bParts = [];
  if (!c(1).isZero()) bParts.push(`${coefTex(c(1).mul(q(2)))}\\frac{(-1)^{n+1}}{n}`);
  if (!c(3).isZero()) bParts.push(`${coefTex(c(3))}(-1)^{n}\\left(\\frac{12}{n^{3}} - \\frac{2\\pi^{2}}{n}\\right)`);
  if (bParts.length) terms.push(`\\left(${bParts.join(' + ')}\\right)\\sin(nx)`);
  const steps = [
    { label: 'On $[-\\pi, \\pi]$: $f(x) = \\frac{a_0}{2} + \\sum_{n=1}^{\\infty}\\left(a_n\\cos nx + b_n\\sin nx\\right)$ with $a_n = \\frac{1}{\\pi}\\int_{-\\pi}^{\\pi} f(x)\\cos nx\\,dx$, $b_n = \\frac{1}{\\pi}\\int_{-\\pi}^{\\pi} f(x)\\sin nx\\,dx$.', katex: `f(x) = ${T(f)}` },
    { label: 'Integrate by parts, using $\\sin n\\pi = 0$ and $\\cos n\\pi = (-1)^n$. Odd parts of $f$ give only sine terms, even parts give the constant and cosine terms:', katex: '' }
  ];
  if (!terms.length && !constTex) return null;
  const series = `${constTex ? constTex + (terms.length ? ' + ' : '') : ''}${terms.length ? `\\sum_{n=1}^{\\infty} ${terms.join(' + ')}` : ''}`.replace(/\+ -/g, '- ');
  return done(`f(x) = ${series}`, steps);
}
const coefTex = (c) => (c.equals(1) ? '' : c.equals(-1) ? '-' : c.toTex());

// ---------------------------------------------------------------- 6. linear algebra extras
function parseMatrices(raw) {
  const s = String(raw);
  const out = [];
  const envRe = /\\begin\{[bpvBV]?matrix\}([\s\S]*?)\\end\{[bpvBV]?matrix\}/g;
  let m;
  while ((m = envRe.exec(s))) out.push(m[1].split(/\\\\/).map(r => r.split('&').map(c => c.trim())).filter(r => r.join('') !== ''));
  if (!out.length) {
    const re = /\[\s*(\[[^\[\]]*\](?:\s*,\s*\[[^\[\]]*\])*)\s*\]/g;
    while ((m = re.exec(s))) out.push(m[1].match(/\[[^\[\]]*\]/g).map(r => r.slice(1, -1).split(',').map(c => c.trim())));
  }
  const res = [];
  for (const rows of out) {
    const M = rows.map(r => r.map(c => { const n = pm(c); const v = n && S.simplify(n); return v && v.t === 'num' ? v.v : null; }));
    if (!M.length || M.some(r => r.length !== M[0].length || r.some(v => !v))) return null;
    res.push(M);
  }
  return res;
}
function parseVectors(raw) {
  const out = [];
  const re = /[(<⟨]\s*(-?[\d./]+(?:\s*,\s*-?[\d./]+)+)\s*[)>⟩]/g;
  let m;
  while ((m = re.exec(raw))) out.push(m[1].split(',').map(t => { const n = pm(t.trim()); return n ? S.evaluate(n) : NaN; }));
  return out.filter(v => v.every(Number.isFinite));
}
const mtex = (M) => `\\begin{pmatrix} ${M.map(r => r.map(v => (v.toTex ? v.toTex() : show(v))).join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
function rankQ(M) {
  const A = M.map(r => r.slice());
  let rank = 0;
  for (let c = 0; c < A[0].length && rank < A.length; c++) {
    let p = -1;
    for (let i = rank; i < A.length; i++) if (!A[i][c].isZero()) { p = i; break; }
    if (p < 0) continue;
    [A[rank], A[p]] = [A[p], A[rank]];
    for (let i = 0; i < A.length; i++) if (i !== rank && !A[i][c].isZero()) { const f = A[i][c].div(A[rank][c]); A[i] = A[i].map((v, j) => v.sub(f.mul(A[rank][j]))); }
    rank++;
  }
  return rank;
}
function solveLinearAlgebraExtra(raw) {
  const k = plainWords(raw).toLowerCase();
  const Ms = /matrix|\[\[|\\begin/.test(raw) ? parseMatrices(raw) : null;
  let m;
  if (Ms && Ms.length === 1) {
    const M = Ms[0];
    const steps = [{ label: 'Matrix:', katex: `A = ${mtex(M)}` }];
    if (/\brank\b/.test(k)) {
      const r = rankQ(M);
      steps.push({ label: 'Row-reduce to echelon form and count the non-zero rows (pivots):', katex: `\\operatorname{rank}(A) = ${r}` });
      return done(String(r), steps);
    }
    if (/transpose/.test(k)) {
      const Tm = M[0].map((_, j) => M.map(r => r[j]));
      steps.push({ label: 'Swap rows and columns:', katex: `A^{T} = ${mtex(Tm)}` });
      return done(`A^{T} = ${mtex(Tm)}`, steps);
    }
    if (/\btrace\b/.test(k)) {
      if (M.length !== M[0].length) return null;
      const t = M.reduce((a, r, i) => a.add(r[i]), q(0));
      steps.push({ label: 'Add the entries on the main diagonal:', katex: `\\operatorname{tr}(A) = ${M.map((r, i) => r[i].toTex()).join(' + ')} = ${t.toTex()}` });
      return done(t.toTex(), steps);
    }
  }
  const V = parseVectors(raw);
  if ((m = k.match(/dot\s+product|scalar\s+product/)) && V.length === 2 && V[0].length === V[1].length) {
    const d = V[0].reduce((a, x, i) => a + x * V[1][i], 0);
    return done(show(d), [{ label: 'Multiply matching components and add:', katex: `${V[0].map((x, i) => `(${show(x)})(${show(V[1][i])})`).join(' + ')} = ${show(d)}` }]);
  }
  if (/cross\s+product|vector\s+product/.test(k) && V.length === 2 && V[0].length === 3 && V[1].length === 3) {
    const [a, b] = V;
    const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    return done(`(${c.map(show).join(', ')})`, [{ label: 'Use $\\mathbf a \\times \\mathbf b = (a_2b_3 - a_3b_2,\\ a_3b_1 - a_1b_3,\\ a_1b_2 - a_2b_1)$:', katex: `(${c.map(show).join(', ')})` }]);
  }
  if (/magnitude|length|norm/.test(k) && V.length === 1) {
    const s2 = V[0].reduce((a, x) => a + x * x, 0);
    const r = Math.sqrt(s2);
    const ex = Number.isInteger(r) ? String(r) : niceNumber(r) || `\\sqrt{${show(s2)}}`;
    return done(ex, [{ label: 'Magnitude $= \\sqrt{\\text{sum of squares of the components}}$:', katex: `\\sqrt{${V[0].map(x => `(${show(x)})^2`).join(' + ')}} = \\sqrt{${show(s2)}} = ${ex}` }]);
  }
  if (/angle\s+between/.test(k) && V.length === 2 && V[0].length === V[1].length) {
    const d = V[0].reduce((a, x, i) => a + x * V[1][i], 0);
    const na = Math.hypot(...V[0]), nb = Math.hypot(...V[1]);
    if (!na || !nb) return null;
    const th = Math.acos(Math.max(-1, Math.min(1, d / (na * nb))));
    const deg = th * 180 / Math.PI;
    return done(`${show(th)} \\text{ rad} = ${fmt(deg)}^{\\circ}`, [{ label: '$\\cos\\theta = \\frac{\\mathbf a\\cdot\\mathbf b}{|\\mathbf a||\\mathbf b|}$:', katex: `\\cos\\theta = \\frac{${show(d)}}{${show(na)}\\cdot ${show(nb)}}` }]);
  }
  return null;
}

// ---------------------------------------------------------------- 7. first-order linear ODE  a(x) y' + b(x) y = c(x)
function solveLinearODE1(raw) {
  let s = plainWords(raw).replace(/^(?:solve|find\s+the\s+general\s+solution\s+(?:of|to))\s*:?\s*/i, '');
  if (/y''|y\^\{?\(?2|\\frac\{d\^\{?2/.test(s)) return null;
  const ic = s.match(/[,;]\s*y\s*\(\s*(-?[\d./]+)\s*\)\s*=\s*(-?[\d./]+)\s*$/);
  if (ic) s = s.slice(0, ic.index);
  if (/[,;]/.test(s)) return null;
  // replace derivative notations by a placeholder variable D
  let t = s.replace(/\\frac\{dy\}\{dx\}|dy\s*\/\s*dx|y\s*'|y\s*\\prime|\\dot\{y\}/g, ' D ');
  if (!/\bD\b/.test(t) || !t.includes('=')) return null;
  t = t.replace(/\bD\b/g, '(w)');
  const [Ls, Rs] = t.split('=');
  const L = pm(Ls), Rn = pm(Rs);
  if (!L || !Rn) return null;
  const E = S.expand(S.simplify(S.sub(L, Rn))); // linear in w and y
  const vars = S.variables(E);
  if ([...vars].some(v => !['w', 'y', 'x'].includes(v))) return null;
  const a = S.simplify(S.derivative(E, 'w'));
  const b = S.simplify(S.derivative(E, 'y'));
  if (!S.freeOf(a, 'w') || !S.freeOf(a, 'y') || !S.freeOf(b, 'w') || !S.freeOf(b, 'y')) return null;
  const c = S.simplify(S.neg(S.substitute(S.substitute(E, 'w', S.num(0)), 'y', S.num(0))));
  if (S.freeOf(b, 'x') && S.freeOf(a, 'x') && S.freeOf(c, 'x') && false) return null;
  const Px = S.simplify(S.prod(b, S.pow(a, -1)));
  const Qx = S.simplify(S.prod(c, S.pow(a, -1)));
  if (b.t === 'num' && b.v.isZero()) return null; // y' = g(x): plain integration, handled elsewhere
  const IP = S.integrate(Px, 'x');
  if (!IP) return null;
  // ln|x| -> ln x inside the integrating factor (x > 0)
  const ipNode = S.simplify(stripAbsLn(IP.result));
  const mu = S.simplify(S.pow(S.cst('e'), ipNode));
  const muQ = S.simplify(S.prod(mu, Qx));
  const IQ = (muQ.t === 'num' && muQ.v.isZero()) ? { result: S.num(0) } : S.integrate(muQ, 'x');
  if (!IQ) return null;
  const Cn = S.vr('C');
  let y = S.simplify(S.expand(S.prod(S.pow(mu, -1), S.sum(IQ.result, Cn))));
  // verify y' + P y = Q for two values of C
  const yp = S.derivative(y, 'x');
  for (const Cv of [0, 1.7]) for (const xv of [0.6, 1.3, 2.2]) {
    const env = { x: xv, C: Cv };
    let lhs, rhs;
    try { lhs = S.evaluate(yp, env) + S.evaluate(Px, env) * S.evaluate(y, env); rhs = S.evaluate(Qx, env); } catch (e) { return null; }
    if (!Number.isFinite(lhs) || Math.abs(lhs - rhs) > 1e-7 * Math.max(1, Math.abs(rhs))) return null;
  }
  const steps = [
    { label: 'First-order linear equation. Write it as $y\' + P(x)\\,y = Q(x)$:', katex: `y' + ${T(Px)}\\,y = ${T(Qx)}` },
    { label: 'Integrating factor $\\mu = e^{\\int P\\,dx}$:', katex: `\\mu(x) = e^{${S.tex(ipNode)}} = ${S.tex(mu)}` },
    { label: 'Multiply through: the left side becomes $(\\mu y)\'$. Integrate both sides:', katex: `${S.tex(mu)}\\,y = \\int ${S.tex(muQ)}\\,dx = ${S.tex(IQ.result)} + C` },
    { label: 'Solve for $y$:', katex: `y = ${S.tex(y)}` }
  ];
  if (ic) {
    const x0 = S.evaluate(pm(ic[1])), y0 = S.evaluate(pm(ic[2]));
    const y0C0 = S.evaluate(y, { x: x0, C: 0 }), slope = S.evaluate(y, { x: x0, C: 1 }) - y0C0;
    if (!slope) return null;
    const Cval = (y0 - y0C0) / slope;
    const Cq = toFrac(Cval, 1000, 1e-10);
    const Cnode = Cq ? S.num(Cq) : null;
    if (!Cnode) return null;
    y = S.simplify(S.expand(S.substitute(y, 'C', Cnode)));
    steps.push({ label: `Use $y(${ic[1]}) = ${ic[2]}$ to find $C$:`, katex: `C = ${Cq.toTex()}` });
  }
  return done(`y = ${S.tex(y)}`, steps);
}
function stripAbsLn(n) {
  if (n.t === 'fn' && n.f === 'ln' && n.arg.t === 'fn' && n.arg.f === 'abs') return S.fn('ln', n.arg.arg);
  if (n.t === 'sum') return S.sum(...n.terms.map(stripAbsLn));
  if (n.t === 'prod') return S.prod(...n.factors.map(stripAbsLn));
  if (n.t === 'pow') return S.pow(stripAbsLn(n.base), n.exp);
  if (n.t === 'fn') return S.fn(n.f, stripAbsLn(n.arg));
  return n;
}

// ---------------------------------------------------------------- 8. complex numbers (exact, Gaussian rationals)
const C = {
  mk: (re, im) => ({ re, im }),
  add: (a, b) => C.mk(a.re.add(b.re), a.im.add(b.im)),
  mul: (a, b) => C.mk(a.re.mul(b.re).sub(a.im.mul(b.im)), a.re.mul(b.im).add(a.im.mul(b.re))),
  div: (a, b) => { const d = b.re.mul(b.re).add(b.im.mul(b.im)); if (d.isZero()) throw new Error('div0'); const n = C.mul(a, C.mk(b.re, b.im.neg())); return C.mk(n.re.div(d), n.im.div(d)); },
  pow: (a, k) => { let r = C.mk(q(1), q(0)); let b = a; let n = Math.abs(k); while (n) { if (n & 1) r = C.mul(r, b); b = C.mul(b, b); n >>= 1; } return k < 0 ? C.div(C.mk(q(1), q(0)), r) : r; },
  tex: (z) => {
    const re = z.re, im = z.im;
    if (im.isZero()) return re.toTex();
    const imAbs = im.abs();
    const imT = imAbs.equals(1) ? 'i' : imAbs.d === 1n ? `${imAbs.toTex()}i` : `\\frac{${imAbs.n}}{${imAbs.d}}i`;
    if (re.isZero()) return (im.isNegative() ? '-' : '') + imT;
    return `${re.toTex()} ${im.isNegative() ? '-' : '+'} ${imT}`;
  }
};
function cEvalExact(n) {
  switch (n.t) {
    case 'num': return C.mk(n.v, q(0));
    case 'var': if (n.n === 'i') return C.mk(q(0), q(1)); throw new Error('var');
    case 'sum': return n.terms.reduce((a, t) => C.add(a, cEvalExact(t)), C.mk(q(0), q(0)));
    case 'prod': return n.factors.reduce((a, t) => C.mul(a, cEvalExact(t)), C.mk(q(1), q(0)));
    case 'pow': {
      if (n.exp.t !== 'num' || !n.exp.v.isInteger() || Math.abs(Number(n.exp.v.n)) > 64) throw new Error('pow');
      return C.pow(cEvalExact(n.base), Number(n.exp.v.n));
    }
  }
  throw new Error('complex');
}
function parseComplex(str) {
  const n = pm(String(str).replace(/\\left|\\right/g, ''));
  if (!n) return null;
  const vars = [...S.variables(n)];
  if (!vars.includes('i') || vars.some(v => v !== 'i')) return null;
  try { return { node: n, z: cEvalExact(n) }; } catch (e) { return null; }
}
function solveComplex(raw) {
  const s = plainWords(raw);
  let m;
  const k = s.toLowerCase();
  if ((m = s.match(/^(?:find\s+)?(?:the\s+)?(modulus|absolute\s+value|magnitude|conjugate|argument|arg|polar\s+form|real\s+part|imaginary\s+part)\s+of\s+(.+)$/i))) {
    const c = parseComplex(m[2]);
    if (!c) return null;
    const { z } = c, kind = m[1].toLowerCase();
    const zT = C.tex(z);
    const steps = [{ label: 'Complex number:', katex: `z = ${zT}` }];
    const r2 = z.re.mul(z.re).add(z.im.mul(z.im));
    const modTex = () => { const r = Math.sqrt(r2.toNumber()); return Number.isInteger(r) ? String(r) : niceNumber(r) || `\\sqrt{${r2.toTex()}}`; };
    if (/modulus|absolute|magnitude/.test(kind)) { steps.push({ label: '$|a + bi| = \\sqrt{a^2 + b^2}$:', katex: `|z| = \\sqrt{(${z.re.toTex()})^2 + (${z.im.toTex()})^2} = ${modTex()}` }); return done(modTex(), steps); }
    if (/conjugate/.test(kind)) { const w = C.tex(C.mk(z.re, z.im.neg())); steps.push({ label: 'Change the sign of the imaginary part:', katex: `\\bar z = ${w}` }); return done(w, steps); }
    if (/real/.test(kind)) return done(z.re.toTex(), steps);
    if (/imaginary/.test(kind)) return done(z.im.toTex(), steps);
    const th = Math.atan2(z.im.toNumber(), z.re.toNumber());
    const thT = niceNumber(th) || fmt(th);
    steps.push({ label: '$\\arg z = \\operatorname{atan2}(b, a)$ (the angle from the positive real axis):', katex: `\\arg z = ${thT}` });
    if (/polar/.test(kind)) return done(`${modTex()}\\left(\\cos ${thT} + i\\sin ${thT}\\right)`, steps);
    return done(thT, steps);
  }
  if (/[a-hj-z]{2,}/i.test(s.replace(/\\[a-z]+/gi, '').replace(/\bi\b/g, ''))) return null;
  if (!/i/.test(s) || /=/.test(s)) return null;
  const c = parseComplex(s);
  if (!c) return null;
  const vars = S.variables(c.node);
  if (!vars.has('i')) return null;
  const zT = C.tex(c.z);
  const steps = [
    { label: 'Expression:', katex: S.tex(c.node) },
    { label: 'Expand and use $i^2 = -1$ (to divide, multiply top and bottom by the conjugate of the denominator):', katex: `= ${zT}` }
  ];
  return done(zT, steps);
}

// ---------------------------------------------------------------- 9. combinatorics and number theory
const big = (n) => { let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; return r; };
const nCr = (n, r) => (r < 0 || r > n ? 0n : big(n) / (big(r) * big(n - r)));
const nPr = (n, r) => (r < 0 || r > n ? 0n : big(n) / big(n - r));
function solveCombinatorics(raw) {
  const s = plainWords(raw);
  let m, n, r, kind;
  if ((m = s.match(/^\\binom\{(\d+)\}\{(\d+)\}$/)) || (m = s.match(/^\\binom(\d)(\d)$/))) { n = +m[1]; r = +m[2]; kind = 'C'; }
  else if ((m = s.match(/^(?:n\s*c\s*r|ncr|comb(?:ination)?s?|c|choose)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)$/i))) { n = +m[1]; r = +m[2]; kind = 'C'; }
  else if ((m = s.match(/^(?:n\s*p\s*r|npr|perm(?:utation)?s?|p)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)$/i))) { n = +m[1]; r = +m[2]; kind = 'P'; }
  else if ((m = s.match(/^(\d+)\s*([CP])\s*(\d+)$/))) { n = +m[1]; r = +m[3]; kind = m[2]; }
  else if ((m = s.match(/^(\d+)\s+choose\s+(\d+)$/i))) { n = +m[1]; r = +m[2]; kind = 'C'; }
  else if ((m = s.match(/(?:how\s+many\s+ways|number\s+of\s+ways)\s+(?:can\s+you\s+|to\s+)?(?:arrange|order|line\s+up|permute|seat)\s+(\d+)\s+(?:different\s+|distinct\s+)?[a-z]+(?:\s+in\s+a\s+(?:row|line))?$/i))) { n = +m[1]; r = n; kind = 'P'; }
  else if ((m = s.match(/(?:how\s+many\s+ways|number\s+of\s+ways)\s+(?:can\s+you\s+|to\s+)?(?:choose|select|pick)\s+(\d+)\s+(?:[a-z]+\s+)?(?:from|out\s+of)\s+(\d+)/i))) { n = +m[2]; r = +m[1]; kind = 'C'; }
  else return null;
  if (n > 1000) return null;
  const val = kind === 'C' ? nCr(n, r) : nPr(n, r);
  const steps = kind === 'C'
    ? [{ label: 'Combinations (order does not matter): $\\binom{n}{r} = \\frac{n!}{r!\\,(n-r)!}$', katex: `\\binom{${n}}{${r}} = \\frac{${n}!}{${r}!\\,${n - r}!} = ${val}` }]
    : [{ label: 'Permutations (order matters): $P(n, r) = \\frac{n!}{(n-r)!}$', katex: `P(${n}, ${r}) = \\frac{${n}!}{${n - r}!} = ${val}` }];
  return done(String(val), steps);
}
function factorize(n) {
  const f = [];
  for (let p = 2n; p * p <= n; p += (p === 2n ? 1n : 2n)) { let e = 0; while (n % p === 0n) { n /= p; e++; } if (e) f.push([p, e]); }
  if (n > 1n) f.push([n, 1]);
  return f;
}
function solveNumberTheory(raw) {
  const s = plainWords(raw).toLowerCase();
  let m;
  if ((m = s.match(/^(?:find\s+|what\s+is\s+)?(?:the\s+)?prime\s+factori[sz]ation\s+of\s+(\d+)$/)) || (m = s.match(/^(?:find\s+the\s+)?prime\s+factors\s+of\s+(\d+)$/))) {
    const n = BigInt(m[1]);
    if (n < 2n || n > 10n ** 14n) return null;
    const f = factorize(n);
    const t = f.map(([p, e]) => (e > 1 ? `${p}^{${e}}` : `${p}`)).join(' \\times ');
    return done(t, [{ label: 'Divide repeatedly by the smallest prime that goes in:', katex: `${n} = ${t}` }]);
  }
  if ((m = s.match(/^(?:find\s+|what\s+is\s+|how\s+many\s+)?(?:the\s+)?(?:number\s+of\s+)?(?:positive\s+)?(divisors|factors)\s+(?:of|does)\s+(\d+)(?:\s+have)?$/))) {
    const n = Number(m[2]);
    if (n < 1 || n > 1e9) return null;
    const ds = [];
    for (let d = 1; d * d <= n; d++) if (n % d === 0) { ds.push(d); if (d * d !== n) ds.push(n / d); }
    ds.sort((a, b) => a - b);
    if (/number\s+of|how\s+many/.test(s)) {
      const f = factorize(BigInt(n));
      return done(String(ds.length), [{ label: 'Prime factorisation, then multiply (exponent + 1) for each prime:', katex: `${n} = ${f.map(([p, e]) => `${p}^{${e}}`).join('\\cdot ')} \\Rightarrow ${f.map(([, e]) => `(${e}+1)`).join('')} = ${ds.length}` }, { label: 'The divisors:', katex: ds.join(',\\ ') }]);
    }
    return done(ds.join(',\\ '), [{ label: 'Test each number up to the square root and pair it with its partner:', katex: ds.join(',\\ ') }]);
  }
  if ((m = s.match(/^\(?(-?\d+)\^\{?(\d+)\}?\)?\s*(?:mod|\\bmod|\\pmod)\s*\(?(\d+)\)?$/))) {
    const b = BigInt(m[1]), e = BigInt(m[2]), md = BigInt(m[3]);
    if (md === 0n) return null;
    let r = 1n, x = ((b % md) + md) % md, k = e;
    while (k > 0n) { if (k & 1n) r = r * x % md; x = x * x % md; k >>= 1n; }
    return done(String(r), [{ label: 'Modular exponentiation (square and multiply, reducing mod m each time):', katex: `${m[1]}^{${m[2]}} \\equiv ${r} \\pmod{${m[3]}}` }]);
  }
  return null;
}

// ---------------------------------------------------------------- 10. statistics and probability
function numbersAfter(s) {
  const xs = (s.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  return xs;
}
function solveStatistics(raw) {
  const s = plainWords(raw).toLowerCase();
  const m = s.match(/^(?:find\s+|calculate\s+|compute\s+|what\s+is\s+)?(?:the\s+)?(population\s+|sample\s+)?(standard\s+deviation|variance|std|stdev|sd)\s*(?:of\s+)?(?:the\s+)?(?:data\s+|numbers\s+|values\s+)?:?\s*([-\d.,\s]+)$/);
  if (!m) return null;
  const xs = numbersAfter(m[3]);
  if (xs.length < 2) return null;
  const sample = /sample/.test(m[1] || '');
  const n = xs.length, mean = xs.reduce((a, b) => a + b, 0) / n;
  const ss = xs.reduce((a, x) => a + (x - mean) ** 2, 0);
  const vr = ss / (sample ? n - 1 : n);
  const isVar = /variance/.test(m[2]);
  const val = isVar ? vr : Math.sqrt(vr);
  const steps = [
    { label: 'Data:', katex: xs.join(',\\ ') },
    { label: 'Mean:', katex: `\\bar x = \\frac{${fmt(mean * n)}}{${n}} = ${show(mean)}` },
    { label: 'Sum of squared deviations from the mean:', katex: `\\sum (x - \\bar x)^2 = ${show(ss)}` },
    { label: sample ? 'Sample variance (divide by n − 1):' : 'Population variance (divide by n). For the sample version ask for the "sample standard deviation":', katex: `${sample ? 's^2' : '\\sigma^2'} = \\frac{${show(ss)}}{${sample ? n - 1 : n}} = ${show(vr)}` }
  ];
  if (!isVar) steps.push({ label: 'Standard deviation = square root of the variance:', katex: `${sample ? 's' : '\\sigma'} = \\sqrt{${show(vr)}} = ${show(val)}${niceNumber(val) ? '' : ''}` });
  const ans = Number.isInteger(+val.toFixed(10)) ? fmt(val) : (niceNumber(val) && niceNumber(val).length < 14 ? `${niceNumber(val)} \\approx ${fmt(+val.toFixed(6))}` : fmt(+val.toFixed(6)));
  return done(ans, steps);
}
function solveProbability(raw) {
  const s = plainWords(raw).toLowerCase();
  let m;
  if ((m = s.match(/probability\s+of\s+(?:rolling|getting|throwing)\s+(?:a|an)\s+(\d)\s+(?:on|with)\s+(?:a|one)\s+(?:fair\s+)?(?:six-sided\s+)?die$/))) {
    if (+m[1] < 1 || +m[1] > 6) return done('0', [{ label: 'A die only shows 1 to 6.', katex: '' }]);
    return done('\\frac{1}{6}', [{ label: 'One favourable outcome out of 6 equally likely outcomes:', katex: 'P = \\frac{1}{6}' }]);
  }
  if ((m = s.match(/probability\s+of\s+(?:getting\s+)?(?:exactly\s+)?(\d+)\s+heads?\s+(?:in|from|when\s+tossing|with)\s+(\d+)\s+(?:fair\s+)?(?:coin\s+)?(?:tosses|flips|tosses\s+of\s+a\s+coin|coins)$/))) {
    const k = +m[1], n = +m[2];
    if (n > 60 || k > n) return null;
    const num = nCr(n, k), den = 2n ** BigInt(n);
    const fr = new Q(num, den);
    return done(fr.toTex(), [{ label: 'Binomial: $P = \\binom{n}{k}\\left(\\tfrac12\\right)^n$', katex: `\\binom{${n}}{${k}}\\cdot\\frac{1}{2^{${n}}} = \\frac{${num}}{${den}} = ${fr.toTex()}` }]);
  }
  return null;
}

// ---------------------------------------------------------------- 11. vector calculus and multiple integrals
function parseField(str) {
  const inner = String(str).trim().replace(/^\\left|\\right$/g, '').replace(/^[(<⟨\[]|[)>⟩\]]$/g, '');
  const parts = splitTop(inner);
  if (parts.length < 2 || parts.length > 3) return null;
  const nodes = parts.map(p => pm(p));
  if (nodes.some(n => !n)) return null;
  return nodes;
}
function splitTop(s) {
  const out = []; let dep = 0, cur = '';
  for (const ch of s) { if ('({['.includes(ch)) dep++; if (')}]'.includes(ch)) dep--; if (ch === ',' && dep === 0) { out.push(cur); cur = ''; } else cur += ch; }
  out.push(cur);
  return out.map(t => t.trim()).filter(Boolean);
}
function solveVectorCalc(raw) {
  const s = plainWords(raw).replace(/\\left|\\right/g, '');
  let m;
  const V = ['x', 'y', 'z'];
  if ((m = s.match(/^(?:find\s+)?(?:the\s+)?(divergence|div|curl)\s+(?:of\s+)?(?:F\s*=\s*)?(.+)$/i))) {
    const F = parseField(m[2]);
    if (!F) return null;
    const vs = V.slice(0, F.length);
    if (/curl/i.test(m[1])) {
      if (F.length !== 3) return null;
      const d = (i, v) => S.derivative(F[i], v);
      const c = [S.simplify(S.sub(d(2, 'y'), d(1, 'z'))), S.simplify(S.sub(d(0, 'z'), d(2, 'x'))), S.simplify(S.sub(d(1, 'x'), d(0, 'y')))];
      const t = `\\left(${c.map(S.tex).join(',\\ ')}\\right)`;
      return done(`\\nabla \\times \\mathbf F = ${t}`, [{ label: '$\\nabla\\times\\mathbf F = \\left(\\frac{\\partial R}{\\partial y} - \\frac{\\partial Q}{\\partial z},\\ \\frac{\\partial P}{\\partial z} - \\frac{\\partial R}{\\partial x},\\ \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right)$', katex: `\\mathbf F = \\left(${F.map(T).join(',\\ ')}\\right)` }]);
    }
    const parts = F.map((f, i) => S.derivative(f, vs[i]));
    const dv = S.simplify(S.sum(...parts));
    return done(`\\nabla \\cdot \\mathbf F = ${S.tex(dv)}`, [{ label: 'Add the partial derivative of each component with respect to its own variable:', katex: `${parts.map((p, i) => `\\frac{\\partial}{\\partial ${vs[i]}}(${T(F[i])})`).join(' + ')} = ${parts.map(S.tex).join(' + ')}` }]);
  }
  if ((m = s.match(/^(?:find\s+)?(?:the\s+)?laplacian\s+of\s+(.+)$/i))) {
    const f = parseFn(m[1]);
    if (!f) return null;
    const vs = V.filter(v => S.variables(f).has(v));
    const lap = S.simplify(S.sum(...vs.map(v => S.derivative(S.derivative(f, v), v))));
    return done(`\\nabla^2 f = ${S.tex(lap)}`, [{ label: 'Sum of the second partial derivatives:', katex: `${vs.map(v => `\\frac{\\partial^2 f}{\\partial ${v}^2}`).join(' + ')} = ${S.tex(lap)}` }]);
  }
  if ((m = s.match(/^(?:find\s+)?(?:the\s+)?jacobian(?:\s+matrix)?\s+of\s+(.+?)(?:\s+with\s+respect\s+to\s+.*)?$/i))) {
    const F = parseField(m[1]);
    if (!F) return null;
    const vs = V.filter(v => F.some(f => S.variables(f).has(v)));
    if (!vs.length) return null;
    const J = F.map(f => vs.map(v => S.tex(S.derivative(f, v))));
    const t = `\\begin{pmatrix} ${J.map(r => r.join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
    return done(`J = ${t}`, [{ label: 'Row i holds the partial derivatives of component i:', katex: `J = ${t}` }]);
  }
  if ((m = s.match(/directional\s+derivative\s+of\s+(.+?)\s+at\s+\(([^)]*)\)\s+in\s+(?:the\s+)?direction\s+(?:of\s+)?[(<]([^)>]*)[)>]$/i))) {
    const f = parseFn(m[1]);
    const pt = m[2].split(',').map(t => S.evaluate(pm(t)));
    const dir = m[3].split(',').map(t => S.evaluate(pm(t)));
    if (!f || pt.length !== dir.length) return null;
    const vs = V.slice(0, pt.length);
    const env = Object.fromEntries(vs.map((v, i) => [v, pt[i]]));
    const g = vs.map(v => S.evaluate(S.derivative(f, v), env));
    const nrm = Math.hypot(...dir);
    if (!nrm) return null;
    const val = g.reduce((a, gi, i) => a + gi * dir[i] / nrm, 0);
    return done(show(val), [{ label: 'Gradient at the point:', katex: `\\nabla f = (${g.map(show).join(', ')})` }, { label: 'Dot it with the unit vector in the given direction:', katex: `D_{\\mathbf u} f = ${show(val)}` }]);
  }
  if ((m = s.match(/(?:critical|stationary)\s+points?\s+of\s+(?:f\s*\(\s*x\s*,\s*y\s*\)\s*=\s*)?(.+)$/i))) {
    const f = parseFn(m[1]);
    if (!f) return null;
    const vs = [...S.variables(f)].sort();
    if (vs.join() !== 'x,y') return null;
    const fx = S.derivative(f, 'x'), fy = S.derivative(f, 'y');
    // only when both partials are linear in x and y
    const lin = (g) => { const e = S.expand(g); const a = S.simplify(S.derivative(e, 'x')), b = S.simplify(S.derivative(e, 'y')); if (a.t !== 'num' || b.t !== 'num') return null; const c = S.simplify(S.substitute(S.substitute(e, 'x', S.num(0)), 'y', S.num(0))); return c.t === 'num' ? [a.v, b.v, c.v.neg()] : null; };
    const r1 = lin(fx), r2 = lin(fy);
    if (!r1 || !r2) return null;
    const sol = solveLinear([[r1[0], r1[1]], [r2[0], r2[1]]], [r1[2], r2[2]]);
    if (!sol) return null;
    const fxx = S.evaluate(S.derivative(fx, 'x'), { x: 0, y: 0 }), fyy = S.evaluate(S.derivative(fy, 'y'), { x: 0, y: 0 }), fxy = S.evaluate(S.derivative(fx, 'y'), { x: 0, y: 0 });
    const D = fxx * fyy - fxy * fxy;
    const kind = D > 0 ? (fxx > 0 ? 'local minimum' : 'local maximum') : D < 0 ? 'saddle point' : 'test inconclusive';
    const pt = `(${sol[0].toTex()}, ${sol[1].toTex()})`;
    return done(`${pt}\\ (\\text{${kind}})`, [{ label: 'Set both partial derivatives to zero:', katex: `f_x = ${S.tex(fx)} = 0,\\quad f_y = ${S.tex(fy)} = 0` }, { label: 'Second-derivative test $D = f_{xx}f_{yy} - f_{xy}^2$:', katex: `D = ${show(D)}` }]);
  }
  return null;
}
// iterated integrals \int_a^b \int_c^d f dy dx (inner first), "double integral of f dx dy from a to b, c to d"
function solveMultipleIntegral(raw) {
  let s = plainWords(raw).replace(/\\left|\\right/g, '');
  let m;
  if ((m = s.match(/^(?:find\s+|evaluate\s+)?(?:the\s+)?triple\s+integral\s+of\s+(.+?)\s+over\s+\[([^\]]+)\]\s*(?:x|\\times)\s*\[([^\]]+)\]\s*(?:x|\\times)\s*\[([^\]]+)\]$/i))) {
    const f = pm(m[1]);
    const lims = [m[2], m[3], m[4]].map(t => t.split(',').map(u => pm(u.trim())));
    if (!f || lims.some(l => l.length !== 2 || l.some(v => !v))) return null;
    return iterate(f, [['z', ...lims[2]], ['y', ...lims[1]], ['x', ...lims[0]]]);
  }
  if ((m = s.match(/^(?:find\s+|evaluate\s+)?(?:the\s+)?double\s+integral\s+of\s+(.+?)\s+d([a-z])\s*d([a-z])\s+from\s+(\S+)\s+to\s+(\S+?)\s*,\s*(\S+)\s+to\s+(\S+)$/i))) {
    const f = pm(m[1]);
    if (!f) return null;
    return iterate(f, [[m[2], pm(m[4]), pm(m[5])], [m[3], pm(m[6]), pm(m[7])]]);
  }
  // LaTeX: \int_{a}^{b}\int_{c}^{d} f \, dy \, dx
  const re = /^\s*((?:\\int\s*_\s*(?:\{[^{}]*\}|-?[\w.]+|-?\\pi)\s*\^\s*(?:\{[^{}]*\}|[\w.]+|\\pi)\s*){2,3})(.+?)((?:\s*d\s*\\?[a-z]+){2,3})\s*$/;
  if (!(m = s.match(re))) return null;
  const lims = [...m[1].matchAll(/\\int\s*_\s*(\{[^{}]*\}|-?\\pi|-?[\w.]+)\s*\^\s*(\{[^{}]*\}|\\pi|[\w.]+)/g)].map(x => [x[1].replace(/[{}]/g, ''), x[2].replace(/[{}]/g, '')]);
  const dvs = [...m[3].matchAll(/d\s*\\?([a-z]+)/g)].map(x => (x[1] === 'theta' ? 't' : x[1]));
  if (lims.length !== dvs.length) return null;
  let body = m[2].trim().replace(/\\theta/g, 't');
  const f = pm(body);
  if (!f) return null;
  // innermost integral sign pairs with the first differential
  const order = dvs.map((v, i) => [v, pm(lims[lims.length - 1 - i][0].replace(/\\theta/g, 't')), pm(lims[lims.length - 1 - i][1].replace(/\\theta/g, 't'))]);
  if (order.some(o => !o[1] || !o[2])) return null;
  return iterate(f, order);
}
function iterate(f, order) {
  const steps = [{ label: 'Integrate from the inside out (the inner integral first, treating the other variables as constants):', katex: '' }];
  let cur = S.simplify(f);
  for (const [v, a, b] of order) {
    const r = S.integrate(cur, v);
    if (!r) return null;
    const F = r.result;
    const val = S.simplify(S.sub(S.substitute(F, v, b), S.substitute(F, v, a)));
    steps.push({ label: `Integrate with respect to $${v}$ from $${T(a)}$ to $${T(b)}$:`, katex: `\\int_{${T(a)}}^{${T(b)}} ${S.tex(cur)}\\,d${v} = ${S.tex(val)}` });
    cur = val;
  }
  if ([...S.variables(cur)].length) return null;
  let ans = S.tex(cur);
  if (cur.t !== 'num') { const v = S.evaluate(cur); if (!Number.isFinite(v)) return null; const nn = niceNumber(v); ans = nn || `${ans} \\approx ${fmt(v)}`; }
  return done(ans, steps);
}

// ---------------------------------------------------------------- 12. fractions, decimals, percents, conversions
function solveConversions(raw) {
  const s = plainWords(raw).toLowerCase().replace(/^(?:convert|write|express|change)\s+/, '').replace(/^what\s+is\s+/, '');
  let m;
  if ((m = s.match(/^(-?\d*\.\d+|-?\d+)\s+(?:as|to|into|in)\s+(?:a\s+)?(?:simplified\s+)?fraction$/))) {
    const [ip, dp = ''] = m[1].replace('-', '').split('.');
    const den = 10n ** BigInt(dp.length);
    const fr = new Q(BigInt((m[1].startsWith('-') ? '-' : '') + ip + dp), den);
    return done(fr.toTex(), [{ label: `Write it over ${den} and simplify:`, katex: `${m[1]} = \\frac{${(m[1].startsWith('-') ? '-' : '') + (ip + dp).replace(/^0+(?=\d)/, '')}}{${den}} = ${fr.toTex()}` }]);
  }
  const frac = '(?:\\\\frac\\{(\\d+)\\}\\{(\\d+)\\}|(\\d+)\\s*/\\s*(\\d+))';
  if ((m = s.match(new RegExp(`^${frac}\\s+(?:as|to|into|in)\\s+(?:a\\s+)?(decimal|percent(?:age)?|%)$`)))) {
    const n = +(m[1] || m[3]), d = +(m[2] || m[4]);
    if (!d) return null;
    const v = n / d;
    if (/decimal/.test(m[5])) return done(fmt(v), [{ label: 'Divide the numerator by the denominator:', katex: `${n} \\div ${d} = ${fmt(v)}` }]);
    return done(`${fmt(v * 100)}\\%`, [{ label: 'Multiply by 100%:', katex: `\\frac{${n}}{${d}} \\times 100\\% = ${fmt(v * 100)}\\%` }]);
  }
  if ((m = s.match(new RegExp(`^${frac}\\s+of\\s+(-?\\d+(?:\\.\\d+)?)$`)))) {
    const fr = new Q(BigInt(m[1] || m[3]), BigInt(m[2] || m[4]));
    const v = fr.mul(Q.parse(m[5]));
    return done(v.toTex(), [{ label: '"of" means multiply:', katex: `${fr.toTex()} \\times ${m[5]} = ${v.toTex()}` }]);
  }
  if ((m = s.match(/^(-?\d+(?:\.\d+)?)\s*(?:degrees?|°|deg)\s+(?:to|in|into)\s+radians?$/))) {
    const v = Q.parse(m[1]).div(q(180));
    const t = v.isZero() ? '0' : v.equals(1) ? '\\pi' : v.d === 1n ? `${v.n}\\pi` : `\\frac{${v.n === 1n ? '' : v.n === -1n ? '-' : v.n}\\pi}{${v.d}}`;
    return done(t, [{ label: 'Multiply by $\\frac{\\pi}{180}$:', katex: `${m[1]}^{\\circ} \\times \\frac{\\pi}{180} = ${t}` }]);
  }
  if ((m = s.match(/^(.+?)\s*(?:radians?|rad)\s+(?:to|in|into)\s+degrees?$/))) {
    const n = pm(m[1]);
    if (!n) return null;
    const v = S.evaluate(n) * 180 / Math.PI;
    if (!Number.isFinite(v)) return null;
    return done(`${fmt(v)}^{\\circ}`, [{ label: 'Multiply by $\\frac{180}{\\pi}$:', katex: `${T(n)} \\times \\frac{180^{\\circ}}{\\pi} = ${fmt(v)}^{\\circ}` }]);
  }
  // mixed numbers: 1 1/2 + 2 1/4
  if (/^\s*-?\d+\s+\d+\s*\/\s*\d+/.test(s) && /^[-\d\s/+*()]+$/.test(s)) {
    const expr = s.replace(/(\d+)\s+(\d+)\s*\/\s*(\d+)/g, '($1+$2/$3)');
    const n = pm(expr);
    if (!n) return null;
    const v = S.simplify(n);
    if (v.t !== 'num') return null;
    const whole = v.v.isInteger() ? null : (() => { const w = v.v.n / v.v.d; const r = new Q(v.v.n - w * v.v.d, v.v.d); return w !== 0n ? `${w}\\tfrac{${r.n < 0n ? -r.n : r.n}}{${r.d}}` : null; })();
    return done(`${v.v.toTex()}${whole ? ` = ${whole}` : ''}`, [{ label: 'Write each mixed number as an improper fraction, then work it out:', katex: `${expr.replace(/\*/g, '\\times ')} = ${v.v.toTex()}` }]);
  }
  return null;
}

// ---------------------------------------------------------------- 13. word problems
function solveWordProblems(raw) {
  const s = plainWords(raw).toLowerCase().replace(/\$/g, '').replace(/,(?=\d{3}\b)/g, '');
  let m;
  const num = '(\\d+(?:\\.\\d+)?)';
  if ((m = s.match(new RegExp(`compound\\s+interest\\s+(?:on|for)\\s+(?:rs\\.?\\s*|pkr\\s*|usd\\s*)?${num}\\s+at\\s+${num}\\s*%\\s*(?:per\\s+(?:year|annum)|p\\.?a\\.?|annually|yearly)?\\s*(?:compounded\\s+(annually|yearly|semi-annually|half-yearly|quarterly|monthly))?\\s*for\\s+${num}\\s+years?(?:\\s*compounded\\s+(annually|yearly|semi-annually|half-yearly|quarterly|monthly))?`)))) {
    const Pv = +m[1], r = +m[2] / 100, t = +m[4];
    const freq = m[3] || m[5] || 'annually';
    const nper = /quarter/.test(freq) ? 4 : /month/.test(freq) ? 12 : /semi|half/.test(freq) ? 2 : 1;
    const A = Pv * Math.pow(1 + r / nper, nper * t);
    const I = A - Pv;
    return done(`CI = ${fmt(+I.toFixed(2))}`, [
      { label: `Compound amount $A = P\\left(1 + \\frac{r}{n}\\right)^{nt}$ with $P = ${Pv}$, $r = ${r}$, $n = ${nper}$, $t = ${t}$:`, katex: `A = ${Pv}\\left(1 + \\frac{${r}}{${nper}}\\right)^{${nper * t}} = ${fmt(+A.toFixed(2))}` },
      { label: 'Compound interest = A − P:', katex: `${fmt(+A.toFixed(2))} - ${Pv} = ${fmt(+I.toFixed(2))}` }
    ]);
  }
  if ((m = s.match(new RegExp(`^(?:a\\s+|the\\s+)?(?:price|cost|value|number|salary|amount)?\\s*(?:of\\s+)?(?:rs\\.?\\s*)?${num}\\s+(?:is\\s+)?(increased|decreased|reduced|raised|discounted)\\s+by\\s+${num}\\s*%`))) || (m = s.match(new RegExp(`^(increase|decrease|reduce)\\s+${num}\\s+by\\s+${num}\\s*%`)))) {
    let base, up, pct;
    if (/^(increase|decrease|reduce)$/.test(m[1])) { base = +m[2]; up = m[1] === 'increase'; pct = +m[3]; }
    else { base = +m[1]; up = /increased|raised/.test(m[2]); pct = +m[3]; }
    const v = base * (1 + (up ? 1 : -1) * pct / 100);
    return done(fmt(+v.toFixed(6)), [{ label: `${up ? 'Increase' : 'Decrease'} by ${pct}%: multiply by $${fmt(1 + (up ? 1 : -1) * pct / 100)}$`, katex: `${base} \\times ${fmt(1 + (up ? 1 : -1) * pct / 100)} = ${fmt(+v.toFixed(6))}` }]);
  }
  if ((m = s.match(new RegExp(`if\\s+${num}\\s+([a-z]+?)s?\\s+costs?\\s+(?:rs\\.?\\s*)?${num}.*?how\\s+much\\s+(?:do|does|will|would)\\s+${num}\\s+\\2`)))) {
    const n1 = +m[1], c = +m[3], n2 = +m[4];
    const v = c / n1 * n2;
    return done(fmt(+v.toFixed(6)), [{ label: 'Unit price (cost of one):', katex: `${c} \\div ${n1} = ${fmt(c / n1)}` }, { label: `Cost of ${n2}:`, katex: `${fmt(c / n1)} \\times ${n2} = ${fmt(+v.toFixed(6))}` }]);
  }
  if ((m = s.match(new RegExp(`hypotenuse\\s+(?:of\\s+)?(?:a\\s+)?(?:right(?:-angled)?\\s+triangle\\s+)?(?:with\\s+)?(?:legs|sides|perpendicular\\s+sides)\\s+(?:of\\s+)?${num}\\s+(?:and|,)\\s+${num}`)))) {
    const a = +m[1], b = +m[2], c2 = a * a + b * b, c = Math.sqrt(c2);
    const t = Number.isInteger(c) ? String(c) : niceNumber(c) || `\\sqrt{${fmt(c2)}} \\approx ${fmt(+c.toFixed(6))}`;
    return done(t, [{ label: 'Pythagoras: $c^2 = a^2 + b^2$', katex: `c = \\sqrt{${a}^2 + ${b}^2} = \\sqrt{${fmt(c2)}} = ${t}` }]);
  }
  if ((m = s.match(new RegExp(`sum\\s+of\\s+two\\s+numbers\\s+is\\s+(-?${num})\\s+and\\s+their\\s+difference\\s+is\\s+(-?${num})`)))) {
    const sm = +m[1], df = +m[3];
    const a = (sm + df) / 2, b = (sm - df) / 2;
    return done(`${fmt(a)}\\ \\text{and}\\ ${fmt(b)}`, [{ label: 'Let the numbers be x and y: x + y = sum, x − y = difference. Add the equations:', katex: `2x = ${fmt(sm)} + ${fmt(df)} \\Rightarrow x = ${fmt(a)},\\quad y = ${fmt(sm)} - ${fmt(a)} = ${fmt(b)}` }]);
  }
  return null;
}

// ---------------------------------------------------------------- 14. proofs that the router did not catch
function solveExtraProofs(raw) {
  const k = A1.keyText(raw);
  if (/cauchy/.test(k) && /bounded/.test(k) && /prove|show/.test(k)) {
    const steps = [
      { label: 'Let $(a_n)$ be Cauchy. Take $\\varepsilon = 1$: there is $N$ with $|a_n - a_m| < 1$ for all $n, m \\ge N$.', katex: '' },
      { label: 'For $n \\ge N$: $|a_n| \\le |a_n - a_N| + |a_N| < 1 + |a_N|$.', katex: '' },
      { label: 'Let $M = \\max\\{|a_1|, \\dots, |a_{N-1}|,\\ 1 + |a_N|\\}$. Then $|a_n| \\le M$ for every $n$.', katex: '|a_n| \\le M \\quad \\forall n' }
    ];
    return done('\\text{Every Cauchy sequence is bounded (by } M = \\max\\{|a_1|,\\dots,|a_{N-1}|, 1 + |a_N|\\})', steps);
  }
  if (/sum|1\+3\+5/.test(k) && /odd/.test(k) && /n\^?2/.test(k) && /prove|show/.test(k)) {
    const steps = [
      { label: 'Claim: $1 + 3 + 5 + \\cdots + (2n - 1) = n^2$. Base case $n = 1$: $1 = 1^2$. ✓', katex: '' },
      { label: 'Inductive step: assume $1 + 3 + \\cdots + (2k - 1) = k^2$. Add the next odd number $2k + 1$:', katex: 'k^2 + (2k + 1) = (k + 1)^2' },
      { label: 'So the statement holds for $k + 1$, and by induction for every $n \\ge 1$.', katex: '' }
    ];
    return done('1 + 3 + \\cdots + (2n-1) = n^{2}\\ \\text{(proved by induction)}', steps);
  }
  return null;
}

// ---------------------------------------------------------------- 15. more algebra and calculus
// two equations, one of them linear: substitute and solve the resulting polynomial
function solveNonlinearSystem(raw) {
  const s = plainWords(raw).replace(/^(?:solve|find\s+x\s+and\s+y)\s*:?\s*/i, '');
  const parts = s.split(/\s*(?:,|;|\band\b)\s*/).filter(Boolean);
  if (parts.length !== 2 || parts.some(p => (p.match(/=/g) || []).length !== 1)) return null;
  const eqs = parts.map(p => { const [a, b] = p.split('='); const L = pm(a), Rr = pm(b); return L && Rr ? S.expand(S.simplify(S.sub(L, Rr))) : null; });
  if (eqs.some(e => !e)) return null;
  const vs = [...new Set(eqs.flatMap(e => [...S.variables(e)]))].sort();
  if (vs.length !== 2) return null;
  const isLin = (e) => vs.every(v => { const d = S.simplify(S.derivative(e, v)); return S.freeOf(d, vs[0]) && S.freeOf(d, vs[1]); });
  const li = eqs.findIndex(isLin);
  if (li < 0 || isLin(eqs[1 - li])) return null; // both linear: the linear-system solver handles it
  const lin = eqs[li], other = eqs[1 - li];
  // solve lin for the variable with a non-zero coefficient
  const [x, y] = vs;
  let solveFor = y, keep = x;
  let cy = S.simplify(S.derivative(lin, y));
  if (cy.t === 'num' && cy.v.isZero()) { solveFor = x; keep = y; cy = S.simplify(S.derivative(lin, x)); }
  const rest = S.simplify(S.substitute(lin, solveFor, S.num(0)));
  const expr = S.simplify(S.prod(S.num(-1), rest, S.pow(cy, -1))); // solveFor = expr(keep)
  const sub = S.expand(S.simplify(S.substitute(other, solveFor, expr)));
  const p = S.toPoly(sub, keep);
  if (!p || P.degree(p) < 1 || P.degree(p) > 4) return null;
  const roots = [];
  const f = P.factor(p);
  for (const fac of f.factors) {
    if (P.degree(fac) === 1) roots.push(S.num(fac[0].neg().div(fac[1])));
    else if (P.degree(fac) === 2) {
      const [c0, b0, a0] = fac;
      const disc = b0.mul(b0).sub(q(4).mul(a0).mul(c0));
      if (disc.isNegative()) continue;
      for (const sg of [1, -1]) roots.push(S.simplify(S.prod(S.sum(S.num(b0.neg()), S.prod(S.num(sg), S.pow(S.num(disc), S.num(q(1, 2))))), S.pow(S.num(a0.mul(q(2))), -1))));
    } else return null;
  }
  const uniq = [];
  for (const r of roots) if (!uniq.some(u => S.key(u) === S.key(r))) uniq.push(r);
  if (!uniq.length) return done('\\text{No real solutions}', [{ label: 'After substituting, the equation has no real roots.', katex: `${S.tex(S.fromPoly(p, keep))} = 0` }]);
  const sols = uniq.map(r => { const o = S.simplify(S.substitute(expr, keep, r)); return keep === x ? `(${x}, ${y}) = (${S.tex(r)}, ${S.tex(o)})` : `(${x}, ${y}) = (${S.tex(o)}, ${S.tex(r)})`; });
  const steps = [
    { label: 'From the linear equation:', katex: `${solveFor} = ${S.tex(expr)}` },
    { label: 'Substitute into the other equation:', katex: `${S.tex(S.fromPoly(p, keep))} = 0` },
    { label: `Solve for $${keep}$ and find $${solveFor}$ for each value:`, katex: sols.join(',\\quad ') }
  ];
  return done(sols.join(',\\quad '), steps);
}

function solveExpandMulti(raw) {
  const m = plainWords(raw).match(/^(?:expand|multiply\s+out|simplify)\s+(.+)$/i);
  if (!m) return null;
  const n = pm(m[1]);
  if (!n) return null;
  const vs = [...S.variables(n)];
  if (vs.length < 2 || vs.includes('i')) return null;
  if (/simplify/i.test(raw) && !/\(/.test(m[1])) return null;
  const e = S.simplify(S.expand(S.simplify(n)));
  return done(S.tex(e), [{ label: 'Expand every bracket and collect like terms:', katex: `${S.tex(n)} = ${S.tex(e)}` }]);
}

// definite integrals with no elementary antiderivative
function solveKnownDefinite(raw) {
  const s = String(raw).replace(/\\left|\\right/g, '').replace(/\s+/g, '').replace(/e\^\((-[^()]*)\)/g, 'e^{$1}');
  let m = s.match(/^\\int_\{?(-\\infty|0)\}?\^\{?\\infty\}?(?:e\^\{-(\d*)x\^\{?2\}?\}|e\^\{-\((\d*)x\^\{?2\}?\)\}|\\exp\(-(\d*)x\^\{?2\}?\))d?x$/);
  if (m) {
    const a = +(m[2] || m[3] || m[4] || 1) || 1;
    const half = m[1] === '0';
    const v = Math.sqrt(Math.PI / a) / (half ? 2 : 1);
    const t = a === 1 ? (half ? '\\frac{\\sqrt{\\pi}}{2}' : '\\sqrt{\\pi}') : `${half ? '\\frac{1}{2}' : ''}\\sqrt{\\frac{\\pi}{${a}}}`;
    return done(t, [{ label: 'Gaussian integral: square it and switch to polar coordinates, $\\left(\\int_{-\\infty}^{\\infty} e^{-ax^2}dx\\right)^2 = \\int_0^{2\\pi}\\int_0^{\\infty} e^{-ar^2} r\\,dr\\,d\\theta = \\frac{\\pi}{a}$.', katex: `= ${t} \\approx ${fmt(+v.toFixed(8))}` }]);
  }
  m = s.match(/^\\int_\{?0\}?\^\{?\\infty\}?\\frac\{\\sin\(?(\d*)x\)?\}\{x\}d?x$/);
  if (m) return done('\\frac{\\pi}{2}', [{ label: 'Dirichlet integral: $\\int_0^\\infty \\frac{\\sin ax}{x}\\,dx = \\frac{\\pi}{2}$ for $a > 0$ (e.g. via $\\int_0^\\infty e^{-tx}\\frac{\\sin x}{x}dx = \\frac{\\pi}{2} - \\arctan t$, then $t \\to 0$).', katex: '' }]);
  return null;
}

// arithmetic and geometric sequences given by their first terms
function solveSequenceTerms(raw) {
  const s = plainWords(raw).toLowerCase();
  const lm = s.match(/(-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?){2,})/);
  if (!lm || !/term|sum|sequence|series|next/.test(s)) return null;
  const xs = lm[1].split(',').map(Number);
  const d = xs[1] - xs[0];
  const arith = xs.every((v, i) => i === 0 || Math.abs(v - xs[i - 1] - d) < 1e-12);
  const r = xs[0] !== 0 ? xs[1] / xs[0] : NaN;
  const geo = !arith && Number.isFinite(r) && xs.every((v, i) => i === 0 || Math.abs(v - xs[i - 1] * r) < 1e-9 * Math.abs(v));
  if (!arith && !geo) return null;
  const a = xs[0];
  const steps = [{ label: arith ? `Arithmetic sequence: first term $a = ${fmt(a)}$, common difference $d = ${fmt(d)}$.` : `Geometric sequence: first term $a = ${fmt(a)}$, common ratio $r = ${show(r)}$.`, katex: '' }];
  let m;
  if ((m = s.match(/sum\s+of\s+(?:the\s+)?first\s+(\d+)\s+terms/))) {
    const n = +m[1];
    const v = arith ? n / 2 * (2 * a + (n - 1) * d) : (r === 1 ? a * n : a * (1 - Math.pow(r, n)) / (1 - r));
    steps.push({ label: arith ? '$S_n = \\frac{n}{2}\\left(2a + (n-1)d\\right)$:' : '$S_n = a\\frac{1 - r^n}{1 - r}$:', katex: `S_{${n}} = ${fmt(v)}` });
    return done(fmt(v), steps);
  }
  if ((m = s.match(/(\d+)(?:st|nd|rd|th)\s+term/))) {
    const n = +m[1];
    const v = arith ? a + (n - 1) * d : a * Math.pow(r, n - 1);
    steps.push({ label: arith ? '$a_n = a + (n-1)d$:' : '$a_n = a\\,r^{n-1}$:', katex: `a_{${n}} = ${fmt(v)}` });
    return done(fmt(v), steps);
  }
  if (/nth\s+term|n-th\s+term|general\s+term|formula/.test(s)) {
    const t = arith ? S.tex(S.simplify(S.sum(S.num(Q.parse(String(a))), S.prod(S.num(Q.parse(String(d))), S.sum(S.vr('n'), S.num(-1)))))) : `${fmt(a)} \\cdot ${show(r)}^{n-1}`;
    steps.push({ label: arith ? '$a_n = a + (n-1)d$:' : '$a_n = a\\,r^{n-1}$:', katex: `a_n = ${t}` });
    return done(`a_n = ${t}`, steps);
  }
  if (/next/.test(s)) { const v = arith ? xs[xs.length - 1] + d : xs[xs.length - 1] * r; return done(fmt(v), steps); }
  return null;
}

// radius of convergence of sum c_n x^n by the ratio test
function solveRadiusOfConvergence(raw) {
  if (!/radius\s+of\s+convergence|interval\s+of\s+convergence/i.test(raw)) return null;
  const m = String(raw).match(/\\sum(?:_\{[^{}]*\})?(?:\^\{?[^{}\s]*\}?)?\s*(.+)$/);
  if (!m) return null;
  const body = m[1].replace(/\\left|\\right/g, '').trim();
  const f = pm(body);
  if (!f) return null;
  const vs = [...S.variables(f)];
  if (!vs.includes('x') || !vs.includes('n') || vs.length !== 2) return null;
  // c_n = f / x^n must be free of x
  const c = S.simplify(S.prod(f, S.pow(S.vr('x'), S.neg(S.vr('n')))));
  if (!S.freeOf(c, 'x')) return null;
  const ratioNode = S.simplify(S.expand(S.simplify(S.prod(c, S.pow(S.substitute(c, 'n', S.sum(S.vr('n'), S.num(1))), -1)))));
  const ratio = (n) => {
    let v = NaN;
    try { v = Math.abs(S.evaluate(ratioNode, { n })); } catch (e) { v = NaN; }
    if (Number.isFinite(v)) return v;
    return Math.abs(S.evaluate(c, { n }) / S.evaluate(c, { n: n + 1 }));
  };
  let r1 = ratio(1e5), r2 = ratio(1e6);
  if (!Number.isFinite(r1) || !Number.isFinite(r2)) { r1 = ratio(60); r2 = ratio(120); if (Number.isFinite(r1) && Number.isFinite(r2) && r2 > 1.8 * r1) { r1 = Infinity; r2 = Infinity; } }
  if (Number.isNaN(r1) || Number.isNaN(r2)) return null;
  let ans;
  if (!Number.isFinite(r2) || r2 > 1e12) ans = '\\infty';
  else if (Math.abs(r1 - r2) > 1e-3 * Math.max(1, r2)) { if (r2 > r1 * 5) ans = '\\infty'; else return null; }
  else ans = niceNumber(Math.round(r2 * 1e4) / 1e4) || fmt(r2);
  return done(`R = ${ans}`, [
    { label: 'Ratio test: the series converges when $|x| < R$ with $R = \\lim_{n\\to\\infty}\\left|\\frac{c_n}{c_{n+1}}\\right|$.', katex: `c_n = ${S.tex(c)}` },
    { label: 'Evaluate the limit:', katex: `R = ${ans}` }
  ]);
}

// Laplace transform of t^n g(t) with g from the table: L{t^n g} = (-1)^n G^{(n)}(s)
function solveLaplaceTimesT(raw) {
  const m = plainWords(raw).match(/^(?:find\s+)?(?:the\s+)?laplace\s+transform\s+of\s+(.+)$/i);
  if (!m) return null;
  const f = parseFn(m[1].replace(/\s+/g, ''));
  if (!f || [...S.variables(f)].some(v => v !== 't')) return null;
  const fs = S.simplify(f);
  const factors = fs.t === 'prod' ? fs.factors : [fs];
  let n = 0, coef = q(1), g = null;
  for (const fc of factors) {
    if (fc.t === 'num') coef = coef.mul(fc.v);
    else if (fc.t === 'var' && fc.n === 't') n += 1;
    else if (fc.t === 'pow' && fc.base.t === 'var' && fc.base.n === 't' && fc.exp.t === 'num' && fc.exp.v.isInteger()) n += Number(fc.exp.v.n);
    else if (!g) g = fc; else return null;
  }
  if (n < 1 || n > 6 || !g) return null;
  const sv = S.vr('s');
  let G = null;
  if (g.t === 'fn' && ['sin', 'cos', 'sinh', 'cosh'].includes(g.f)) {
    const L = S.linearIn(g.arg, 't');
    if (!L || !L.b.isZero()) return null;
    const b = S.num(L.a), b2 = S.num(L.a.mul(L.a));
    if (g.f === 'sin') G = S.prod(b, S.pow(S.sum(S.pow(sv, 2), b2), -1));
    if (g.f === 'cos') G = S.prod(sv, S.pow(S.sum(S.pow(sv, 2), b2), -1));
    if (g.f === 'sinh') G = S.prod(b, S.pow(S.sum(S.pow(sv, 2), S.neg(b2)), -1));
    if (g.f === 'cosh') G = S.prod(sv, S.pow(S.sum(S.pow(sv, 2), S.neg(b2)), -1));
  } else return null;
  let D = G;
  for (let k = 0; k < n; k++) D = S.derivative(D, 's');
  const res = S.simplify(S.prod(S.num(coef.mul(n % 2 ? q(-1) : q(1))), D));
  const combined = A1.combineRational(res, 's') || S.tex(res);
  return done(`F(s) = ${combined}`, [
    { label: `Multiplication by $t^{${n}}$: $\\mathcal{L}\\{t^n g(t)\\} = (-1)^n \\frac{d^n}{ds^n} G(s)$, where:`, katex: `G(s) = \\mathcal{L}\\{${S.tex(g)}\\} = ${S.tex(G)}` },
    { label: `Differentiate ${n} time${n > 1 ? 's' : ''} with respect to s:`, katex: `F(s) = ${combined}` }
  ]);
}

// inverse Laplace of c/s^k and c/(s-a)^k
function solveInverseLaplacePower(raw) {
  const m = plainWords(raw).match(/^(?:find\s+)?(?:the\s+)?inverse\s+laplace(?:\s+transform)?\s+of\s+(.+)$/i);
  if (!m) return null;
  const F = parseFn(m[1]);
  if (!F || [...S.variables(F)].some(v => v !== 's')) return null;
  const [c, rest] = S.splitCoef(S.simplify(F));
  if (!rest || rest.t !== 'pow' || rest.exp.t !== 'num' || !rest.exp.v.isInteger() || !rest.exp.v.isNegative()) return null;
  const k = Number(rest.exp.v.neg().n);
  const L = S.linearIn(rest.base, 's');
  if (!L || !L.a.equals(1) || k < 1 || k > 10) return null;
  const a = L.b.neg();
  let fact = 1n; for (let i = 2n; i < BigInt(k); i++) fact *= i;
  const coef = c.div(new Q(fact));
  const f = S.simplify(S.prod(S.num(coef), S.pow(S.vr('t'), k - 1), a.isZero() ? S.num(1) : S.pow(S.cst('e'), S.prod(S.num(a), S.vr('t')))));
  return done(`f(t) = ${S.tex(f)}`, [{ label: `Table: $\\mathcal{L}^{-1}\\left\\{\\frac{1}{(s-a)^{k}}\\right\\} = \\frac{t^{k-1}e^{at}}{(k-1)!}$ with $k = ${k}$, $a = ${a.toTex()}$:`, katex: `f(t) = ${S.tex(f)}` }]);
}
function solveIrrationalRoot(raw) {
  const m = plainWords(raw).match(/^(?:prove|show)\s+(?:that\s+)?(?:\\sqrt\{(\d+)\}|sqrt\s*\(?(\d+)\)?|√(\d+))\s+is\s+irrational$/i);
  if (!m) return null;
  const p = +(m[1] || m[2] || m[3]);
  const r = Math.round(Math.sqrt(p));
  if (r * r === p) return done(`\\sqrt{${p}} = ${r}\\ \\text{is rational}`, [{ label: `${p} is a perfect square.`, katex: '' }]);
  // a prime factor with odd exponent
  let n = p, q0 = null;
  for (let d = 2; d * d <= n; d++) { let e = 0; while (n % d === 0) { n /= d; e++; } if (e % 2 && !q0) q0 = d; }
  if (n > 1 && !q0) q0 = n;
  const steps = [
    { label: `Suppose $\\sqrt{${p}} = \\frac{a}{b}$ with integers $a, b$ in lowest terms. Then $a^2 = ${p}b^2$.`, katex: '' },
    { label: `The prime ${q0} appears in ${p} an odd number of times. In $a^2$ and $b^2$ every prime appears an even number of times, so it appears an even number of times on the left but an odd number of times on the right of $a^2 = ${p}b^2$.`, katex: '' },
    { label: 'This contradicts unique prime factorisation, so no such fraction exists.', katex: `\\sqrt{${p}} \\notin \\mathbb{Q}` }
  ];
  return done(`\\sqrt{${p}}\\ \\text{is irrational}`, steps);
}

// n! for any n: exact up to 1000, otherwise scientific notation by Stirling's formula
function solveFactorial(raw) {
  const m = String(raw).trim().match(/^(\d+)\s*!$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n <= 170) return null; // the general evaluator handles these
  if (n <= 1000) {
    let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i;
    const d = r.toString();
    return done(d, [{ label: `Multiply 1 × 2 × 3 × … × ${n}. The result has ${d.length} digits:`, katex: `${n}! = ${d.slice(0, 20)}\\ldots` }]);
  }
  // log10(n!) = sum log10(k) via Stirling with correction terms
  const ln = n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n) + 1 / (12 * n) - 1 / (360 * n ** 3);
  const l10 = ln / Math.LN10;
  const e = Math.floor(l10), mant = Math.pow(10, l10 - e);
  const t = `${mant.toFixed(6)} \\times 10^{${e}}`;
  return done(`${n}! \\approx ${t}`, [{ label: `${n}! is far too large to write out (it has ${e + 1} digits). Stirling's formula $\\ln n! \\approx n\\ln n - n + \\tfrac12\\ln(2\\pi n) + \\frac{1}{12n}$ gives:`, katex: `${n}! \\approx ${t}` }]);
}

// rational expressions in one variable: combine into one fraction and cancel common factors
function polyGcdQ(a, b) {
  a = P.trim(a); b = P.trim(b);
  while (!P.isZeroPoly(b)) {
    let r = a.slice();
    while (P.degree(r) >= P.degree(b) && !P.isZeroPoly(r)) {
      const sh = P.degree(r) - P.degree(b), c = r[r.length - 1].div(b[b.length - 1]);
      r = P.trim(P.sub(r, Array(sh).fill(q(0)).concat(b.map(v => v.mul(c)))));
    }
    a = b; b = r;
  }
  return P.scale(a, q(1).div(a[a.length - 1]));
}
function solveRationalSimplify(raw) {
  const m = plainWords(raw).match(/^(?:simplify|reduce|cancel)?\s*:?\s*(.+)$/i);
  if (!m || /[=<>]/.test(m[1])) return null;
  const n = pm(m[1]);
  if (!n) return null;
  const vs = [...S.variables(n)];
  if (vs.length !== 1 || vs[0] === 'i') return null;
  const x = vs[0];
  const { toRat, pdiv } = require('./integrate2');
  const r = toRat(n, x);
  if (!r || P.degree(r.D) < 1) return null;
  const g = polyGcdQ(r.N, r.D);
  const N1 = pdiv(r.N, g).quo, D1 = pdiv(r.D, g).quo;
  const lc = D1[D1.length - 1];
  const Nn = P.scale(N1, q(1).div(lc)), Dn = P.scale(D1, q(1).div(lc));
  const steps = [{ label: 'Expression:', katex: S.tex(n) }];
  if (P.degree(g) >= 1) steps.push({ label: 'Factor top and bottom and cancel the common factor:', katex: `\\text{common factor: } ${P.toTex(g, x)}` });
  else steps.push({ label: 'Write everything over a common denominator:', katex: '' });
  let ans;
  if (P.degree(Dn) === 0) ans = P.toTex(P.scale(Nn, q(1).div(Dn[0])), x);
  else {
    const fN = P.factor(Nn), fD = P.factor(Dn);
    const top = P.degree(Nn) >= 1 && fN.factors.length > 1 ? P.factoredTex(fN, x) : P.toTex(Nn, x);
    const bot = fD.factors.length > 1 ? P.factoredTex(fD, x) : P.toTex(Dn, x);
    ans = `\\frac{${top}}{${bot}}`;
  }
  // verify numerically against the input
  for (const v of [0.37, 1.71, -2.3]) {
    const a = S.evaluate(n, { [x]: v });
    const b = P.evaluate(Nn, q(Math.round(v * 100), 100n)).toNumber() / P.evaluate(Dn, q(Math.round(v * 100), 100n)).toNumber();
    if (Number.isFinite(a) && Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a))) return null;
  }
  steps.push({ label: 'Simplified:', katex: ans });
  if (P.degree(g) >= 1) steps.push({ label: `(valid where ${P.toTex(g, x)} \\ne 0)`.replace(/^\(/, '(').replace(/\)$/, ')'), katex: '' });
  return done(ans, steps);
}

module.exports = {
  rewritePlain, solveRationalSimplify,
  SOLVERS: [
    solveFactorial, solveExtraProofs, solveConversions, solveWordProblems, solveStatistics, solveProbability, solveCombinatorics, solveNumberTheory,
    solveComplex, solveHigherDerivative, solvePartialDerivative, solveDerivativeAtPoint, solveTaylor, solveFourier,
    solveSum, solveLinearAlgebraExtra, solveLinearODE1, solveVectorCalc, solveMultipleIntegral,
    solveNonlinearSystem, solveExpandMulti, solveKnownDefinite, solveSequenceTerms, solveRadiusOfConvergence, solveLaplaceTimesT, solveInverseLaplacePower, solveIrrationalRoot
  ],
  _internal: { cEvalExact, C, numericSeries, checkAnti }
};
