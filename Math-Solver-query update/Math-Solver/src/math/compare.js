// Comparisons, inequalities and true/false questions:
//   5 > 3, 2 + 2 = 5, \frac12 < \frac23, sin 30° = 1/2         → TRUE / FALSE with the values worked out
//   2x + 3 > 7, x^2 - 5x + 6 \le 0, \frac{x-1}{x+2} \ge 0,
//   |x - 2| < 3, -3 < x + 1 \le 5, 2x + 1 \ne 5                 → solution set with a sign chart
//   Is 2^10 greater than 1000?  Which is greater, 3/4 or 5/7?   → comparison
//   Is 91 divisible by 7?  Is 17 prime?  Is √2 rational?        → number properties
//   True or false: every prime is odd                           → common facts with a reason

const { Q } = require('./rational');
const S = require('./symbolic');
const P = require('./polynomial');
const A1 = require('./advanced1');
const A6 = require('./advanced6');

const R = String.raw;
const qn = (v) => new Q(BigInt(v));
const qt = (q) => q.toTex();
const fmt = (v) => { const r = Math.round(v * 1e6) / 1e6; return String(Object.is(r, -0) ? 0 : r); };
const pm = (t) => { try { return A1.parseMath(String(t).trim()); } catch (e) { return null; } };
const REL_TEX = { '<': '<', '>': '>', '≤': R`\le`, '≥': R`\ge`, '≠': R`\ne`, '=': '=' };
const REL_WORD = { '<': 'less than', '>': 'greater than', '≤': 'less than or equal to', '≥': 'greater than or equal to', '≠': 'not equal to', '=': 'equal to' };
const FLIP = { '<': '>', '>': '<', '≤': '≥', '≥': '≤', '≠': '≠', '=': '=' };

// ---------------------------------------------------------------- text helpers
// recurring decimals: 0.999..., 0.\overline{3}, 0.(142857), 0.1\dot{6}
const RECUR_NOTES = [];
function recurringToFraction(s) {
  const toFrac = (intPart, nonRep, rep, orig) => {
    const n = nonRep.length, k = rep.length;
    const whole = BigInt(intPart || '0');
    const num = BigInt((nonRep + rep) || '0') - BigInt(nonRep || '0');
    const den = 10n ** BigInt(n + k) - 10n ** BigInt(n);
    const q = new Q(whole * den + num, den);
    if (orig) RECUR_NOTES.push(`${orig.replace(/\.\.\.|…|\\ldots|\\cdots|\\dots/, '\\ldots')} = ${whole ? `${whole} + ` : ''}\\frac{${num}}{${den}} = ${qt(q)}`);
    return q.d === 1n ? `${q.n}` : `(${q.n}/${q.d})`;
  };
  return s
    .replace(/(\d+)\.(\d*)\\overline\{(\d+)\}/g, (m, a, b, c) => toFrac(a, b, c, m))
    .replace(/(\d+)\.(\d*)\\dot\{(\d)\}/g, (m, a, b, c) => toFrac(a, b, c, m))
    .replace(/(\d+)\.(\d*)\((\d+)\)/g, (m, a, b, c) => toFrac(a, b, c, m))
    .replace(/(\d+)\.(\d+)(?:\.\.\.|…|\\ldots|\\cdots|\\dots)/g, (m, a, digits) => {
      // smallest period that repeats at least twice at the end, otherwise the last digit repeats
      for (let k = 1; k <= Math.floor(digits.length / 2); k++) {
        const rep = digits.slice(-k);
        if (digits.endsWith(rep + rep)) {
          let start = digits.length - k;
          while (start - k >= 0 && digits.slice(start - k, start) === rep) start -= k;
          return toFrac(a, digits.slice(0, start), rep, m);
        }
      }
      return toFrac(a, digits.slice(0, -1), digits.slice(-1), m);
    });
}

function normaliseRelations(s) {
  return String(s)
    .replace(/\\left|\\right/g, '')
    .replace(/\\leqslant|\\leq(?![a-z])|\\le(?![a-z])|≤|<=|=</g, '≤')
    .replace(/\\geqslant|\\geq(?![a-z])|\\ge(?![a-z])|≥|>=|=>/g, '≥')
    .replace(/\\neq(?![a-z])|\\ne(?![a-z])|≠|!=|=\/=|<>/g, '≠')
    .replace(/\\lt(?![a-z])/g, '<').replace(/\\gt(?![a-z])/g, '>')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}
// split "a < b ≤ c" into parts and relations at bracket depth 0
function splitRelations(s) {
  const parts = [], rels = []; let d = 0, cur = '';
  for (const ch of s) {
    if ('({['.includes(ch)) d++;
    if (')}]'.includes(ch)) d--;
    if (d === 0 && '<>≤≥≠='.includes(ch)) { parts.push(cur); rels.push(ch); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return { parts: parts.map(t => t.trim()), rels };
}
const isEq = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
function holds(a, b, rel) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const e = isEq(a, b);
  switch (rel) {
    case '=': return e; case '≠': return !e;
    case '<': return a < b && !e; case '>': return a > b && !e;
    case '≤': return a < b || e; case '≥': return a > b || e;
  }
  return false;
}
// exact comparison of two rational numbers
function holdsQ(a, b, rel) {
  const d = a.sub(b), z = d.isZero(), neg = d.isNegative();
  switch (rel) {
    case '=': return z; case '≠': return !z;
    case '<': return neg && !z; case '>': return !neg && !z;
    case '≤': return neg || z; case '≥': return !neg || z;
  }
  return false;
}
const ev = (node, x, v = 'x') => { try { return S.evaluate(node, { [v]: x }); } catch (e) { return NaN; } };
function exactConst(node) {
  try {
    if (S.variables(node).size) return null;
    const r = A1.toRational(node, 'x');
    if (!r) return null;
    const N = P.trim(r.N), D = P.trim(r.D);
    if (P.degree(N) > 0 || P.degree(D) > 0) return null;
    const q = N[0].div(D[0]);
    return q.exact === false ? null : q;
  } catch (e) { return null; }
}
const valueTex = (node) => {
  const q = exactConst(node);
  if (q) return qt(q);
  const v = ev(node, 0);
  const nice = A6.niceNumber(v);
  return nice && !/\\pi|\\sqrt/.test(nice) ? nice : `${Number.isInteger(v) ? v : parseFloat(v.toPrecision(10))}`;
};

// how a part is shown: decimals as typed, degrees as degrees, expressions tidied
const degFix = (t) => t.replace(/\\frac\{(\d+(?:\.\d+)?) \\pi\}\{180\}/g, '$1^\\circ').replace(/\\left\((\d+(?:\.\d+)?)\^\\circ\\right\)/g, ' $1^\\circ');
function dispTex(node, text) {
  const t = String(text || '').trim();
  if (/^-?\d+\.\d+$/.test(t)) return t;
  if (S.variables(node).size) { try { return degFix(S.tex(S.simplify(node))); } catch (e) { return degFix(S.tex(node)); } }
  return degFix(S.tex(node));
}
const dispVal = (node, text) => { const t = String(text || '').trim(); return /^-?\d+\.\d+$/.test(t) ? t : valueTex(node); };

// ---------------------------------------------------------------- 1. statements without variables
function checkConstantStatement(parts, rels, nodes) {
  const steps = [{ label: 'Statement to check:', katex: nodes.map((n, i) => dispTex(n, parts[i]) + (rels[i] ? ` ${REL_TEX[rels[i]]} ` : '')).join('') }];
  const exact = nodes.map(exactConst);
  const vals = nodes.map(n => ev(n, 0));
  if (vals.some(v => !Number.isFinite(v))) return null;
  nodes.forEach((n, i) => {
    const shown = dispTex(n, parts[i]), val = /^-?\d+\.\d+$/.test(String(parts[i]).trim()) ? shown : exact[i] ? qt(exact[i]) : valueTex(n);
    if (shown !== val) steps.push({ label: `Work out ${nodes.length === 2 ? (i === 0 ? 'the left side' : 'the right side') : `part ${i + 1}`}:`, katex: `${shown} = ${val}${!exact[i] && !Number.isInteger(vals[i]) && val === `${parseFloat(vals[i].toPrecision(10))}` ? '' : !exact[i] && A6.niceNumber(vals[i]) === null ? ` \\approx ${parseFloat(vals[i].toPrecision(10))}` : ''}` });
  });
  let ok = true;
  const lines = [];
  for (let i = 0; i < rels.length; i++) {
    const useExact = exact[i] && exact[i + 1];
    const h = useExact ? holdsQ(exact[i], exact[i + 1], rels[i]) : holds(vals[i], vals[i + 1], rels[i]);
    const shownV = (k) => (/^-?\d+\.\d+$/.test(String(parts[k]).trim()) ? String(parts[k]).trim() : exact[k] ? qt(exact[k]) : valueTex(nodes[k]));
    const a = shownV(i), b = shownV(i + 1);
    lines.push(`${a} ${REL_TEX[rels[i]]} ${b} \\text{ is ${h ? 'true' : 'false'}}`);
    if (!h) ok = false;
    if (!h && (rels[i] === '=' || rels[i] === '≠')) {
      const diff = vals[i] - vals[i + 1];
      if (Number.isFinite(diff) && rels[i] === '=') lines.push(`\\text{(the left side is ${diff > 0 ? 'greater' : 'smaller'} by } ${useExact ? qt(exact[i].sub(exact[i + 1]).abs()) : fmt(Math.abs(diff))}\\text{)}`);
    }
  }
  steps.push({ label: useLabel(rels), katex: lines.join(R` \\ `).replace(/^(.*)$/, lines.length > 1 ? R`\begin{gathered} $1 \end{gathered}` : '$1') });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\text{${ok ? 'TRUE' : 'FALSE'}}}` });
  return { answer: `\\text{${ok ? 'True' : 'False'}}`, steps };
}
const useLabel = (rels) => (rels.length > 1 ? 'Check each comparison (all must hold):' : `Compare the two values (${REL_WORD[rels[0]]}):`);

// ---------------------------------------------------------------- 2. inequalities in one variable
function simplifySqrtInt(n) { let k = 1n, m = n; for (let f = 2n; f * f <= m && f < 10000n; f++) while (m % (f * f) === 0n) { m /= f * f; k *= f; } return [k, m]; }
// real roots of a polynomial (coefficients low → high) with exact LaTeX where possible
function realRoots(poly) {
  const p = P.trim(poly);
  if (P.degree(p) < 1) return [];
  const out = [];
  const fac = P.factor(p);
  for (const f of fac.factors) {
    const dg = P.degree(f);
    if (dg === 1) { const r = f[0].neg().div(f[1]); out.push({ v: r.toNumber(), tex: qt(r) }); }
    else if (dg === 2) {
      const [c, b, a] = f, disc = b.mul(b).sub(qn(4).mul(a).mul(c));
      if (disc.isNegative()) continue;
      const pq = b.neg().div(qn(2).mul(a));            // -b/2a
      const qq = disc.div(qn(4).mul(a).mul(a));        // (b²-4ac)/4a²  → root = p ± √q
      // √(n/d) = √(n·d)/d, then pull out square factors
      const [k, m] = simplifySqrtInt(qq.n * qq.d);
      const coef = new Q(k, qq.d);
      const rad = m === 1n ? null : `\\sqrt{${m}}`;
      const sq = rad ? `${coef.equals(qn(1)) ? '' : coef.d === 1n ? qt(coef) : ''}${coef.d !== 1n ? `\\frac{${coef.n === 1n ? '' : coef.n}${rad}}{${coef.d}}` : rad}` : qt(coef);
      const sv = Math.sqrt(qq.toNumber()), pv = pq.toNumber();
      for (const sg of [-1, 1]) {
        if (!rad) { const r = pq.add(sg < 0 ? coef.neg() : coef); out.push({ v: r.toNumber(), tex: qt(r) }); continue; }
        const tex = pq.isZero() ? `${sg < 0 ? '-' : ''}${sq}` : `${qt(pq)} ${sg < 0 ? '-' : '+'} ${sq}`;
        out.push({ v: pv + sg * sv, tex });
      }
    } else {
      const A3 = require('./advanced3');
      for (const r of A3.polyRoots(f)) if (Math.abs(r.im) < 1e-9) out.push({ v: r.re, tex: `${fmt(r.re)}`, approx: true });
    }
  }
  return out;
}
function countAbs(n) { if (!n || typeof n !== 'object') return 0; let c = n.t === 'fn' && n.f === 'abs' ? 1 : 0; for (const k of ['arg', 'base', 'exp']) if (n[k]) c += countAbs(n[k]); for (const k of ['terms', 'factors']) if (n[k]) n[k].forEach(t => { c += countAbs(t); }); return c; }
function absArgs(n, out = []) { if (!n || typeof n !== 'object') return out; if (n.t === 'fn' && n.f === 'abs') out.push(n.arg); for (const k of ['arg', 'base', 'exp']) if (n[k]) absArgs(n[k], out); for (const k of ['terms', 'factors']) if (n[k]) n[k].forEach(t => absArgs(t, out)); return out; }
function mapAbs(n, choices, idx) {
  if (!n || typeof n !== 'object') return n;
  if (n.t === 'fn' && n.f === 'abs') { const k = idx.i++; const inner = mapAbs(n.arg, choices, idx); return choices[k] ? inner : S.neg(inner); }
  const c = { ...n };
  for (const k of ['arg', 'base', 'exp']) if (n[k]) c[k] = mapAbs(n[k], choices, idx);
  for (const k of ['terms', 'factors']) if (n[k]) c[k] = n[k].map(t => mapAbs(t, choices, idx));
  return c;
}
function rationalOf(node, v) { try { const r = A1.toRational(S.simplify(node), v); if (!r) return null; return { N: P.trim(r.N), D: P.trim(r.D) }; } catch (e) { return null; } }
// candidate boundary points of f(x) rel 0
const eval0 = (tex, v) => v; // keep the bisected value; the LaTeX label comes from niceNumber
const niceX = (v) => { const n = A6.niceNumber(v); if (n && n.length < 26) return n; for (let d = 1; d <= 12; d++) { const k = Math.round(v * d / Math.E); if (k && Math.abs(k * Math.E / d - v) < 1e-9) return `${k === 1 && d === 1 ? '' : k === -1 && d === 1 ? '-' : d === 1 ? k : `\\frac{${k}}{${d}}`}e`; } for (let k = 2; k <= 30; k++) { if (Math.abs(Math.log(k) - v) < 1e-9) return `\\ln ${k}`; if (Math.abs(-Math.log(k) - v) < 1e-9) return `-\\ln ${k}`; } return null; };
function criticalPoints(f, v) {
  const pts = [], zeros = [], poles = [];
  const nAbs = countAbs(f);
  const variants = [];
  if (nAbs && nAbs <= 3) { for (let mask = 0; mask < (1 << nAbs); mask++) variants.push(S.simplify(mapAbs(f, [...Array(nAbs)].map((_, i) => !!(mask & (1 << i))), { i: 0 }))); }
  else if (!nAbs) variants.push(f);
  else return null;
  for (const a of absArgs(f)) { const r = rationalOf(a, v); if (!r) return null; realRoots(r.N).forEach(p => pts.push({ ...p, kind: 'abs' })); }
  let allRational = true;
  for (const g of variants) {
    const r = rationalOf(g, v);
    if (!r) { allRational = false; break; }
    realRoots(r.N).forEach(p => { pts.push({ ...p, kind: 'zero' }); });
    realRoots(r.D).forEach(p => { pts.push({ ...p, kind: 'pole' }); });
  }
  if (!allRational) {
    // non-rational expressions: scan numerically for sign changes and zeros
    const F = (x) => ev(f, x, v);
    let prev = F(-60), px = -60;
    for (let i = 1; i <= 12000; i++) {
      const x = -60 + i * 0.01, y = F(x);
      if (Number.isFinite(prev) && Number.isFinite(y) && (prev === 0 || prev * y < 0)) {
        let lo = px, hi = x;
        for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (F(lo) * F(mid) <= 0) hi = mid; else lo = mid; }
        const root = (lo + hi) / 2, nice = niceX(root);
        // a sign change where f blows up (like tan x at π/2) is a break, not a zero
        const blowUp = Math.abs(F(root)) > 1e-6 && (Math.abs(F(root - 1e-7)) > 1e5 || Math.abs(F(root + 1e-7)) > 1e5);
        pts.push({ v: root, tex: nice || fmt(root), approx: !nice, kind: blowUp ? 'pole' : 'zero' });
      } else if (Number.isFinite(prev) !== Number.isFinite(y)) {
        // edge of the domain: locate it by bisection on "is f defined here?"
        let lo = px, hi = x; const okLo = Number.isFinite(prev);
        for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (Number.isFinite(F(mid)) === okLo) lo = mid; else hi = mid; }
        const edge = Math.abs((lo + hi) / 2) < 1e-9 ? 0 : (lo + hi) / 2, nice = A6.niceNumber(edge);
        pts.push({ v: edge, tex: nice && nice.length < 26 ? nice : fmt(edge), approx: !nice, kind: 'edge' });
      }
      prev = y; px = x;
    }
  }
  // keep only zeros/poles that really are zeros/poles of f itself, merge duplicates
  const out = [];
  for (const p of pts.sort((a, b) => a.v - b.v)) {
    const prev = out[out.length - 1];
    if (prev && Math.abs(prev.v - p.v) < 1e-9) { if (p.kind === 'pole') prev.kind = 'pole'; if (!p.approx && prev.approx) { prev.tex = p.tex; prev.approx = false; } continue; }
    out.push({ ...p });
  }
  zeros.push(...out.filter(p => p.kind !== 'pole' && Math.abs(ev(f, p.v, v)) < 1e-7));
  poles.push(...out.filter(p => p.kind === 'pole' || !Number.isFinite(ev(f, p.v, v))));
  out.forEach(p => { if (p.kind === 'edge' && !Number.isFinite(ev(f, p.v, v))) p.kind = 'pole'; });
  return { pts: out, zeros, poles, rational: allRational };
}
// solve a list of conditions [{L, R, rel}] in variable v; returns pieces of the real line
function solveConditions(conds, v) {
  let pts = [];
  const crits = [];
  for (const c of conds) {
    const f = S.simplify(S.sub(c.L, c.R));
    const cp = criticalPoints(f, v);
    if (!cp) return null;
    crits.push({ f, cp });
    pts.push(...cp.pts);
  }
  pts = pts.sort((a, b) => a.v - b.v).filter((p, i, arr) => i === 0 || Math.abs(p.v - arr[i - 1].v) > 1e-9);
  const test = (x) => conds.every(c => holds(ev(c.L, x, v), ev(c.R, x, v), c.rel));
  const elems = [];
  const sample = (lo, hi) => (lo === -Infinity && hi === Infinity ? 0 : lo === -Infinity ? hi - 1 : hi === Infinity ? lo + 1 : (lo + hi) / 2);
  for (let i = 0; i <= pts.length; i++) {
    const lo = i === 0 ? -Infinity : pts[i - 1].v, hi = i === pts.length ? Infinity : pts[i].v;
    const x = sample(lo, hi);
    elems.push({ type: 'I', lo: i === 0 ? null : pts[i - 1], hi: i === pts.length ? null : pts[i], x, ok: test(x) });
    if (i < pts.length) elems.push({ type: 'P', p: pts[i], ok: pts[i].kind !== 'pole' && test(pts[i].v) });
  }
  // runs of consecutive true elements → pieces
  const pieces = [];
  let start = -1;
  for (let i = 0; i <= elems.length; i++) {
    const ok = i < elems.length && elems[i].ok;
    if (ok && start < 0) start = i;
    if (!ok && start >= 0) {
      const a = elems[start], b = elems[i - 1];
      pieces.push({
        lo: a.type === 'P' ? a.p : a.lo, loIn: a.type === 'P',
        hi: b.type === 'P' ? b.p : b.hi, hiIn: b.type === 'P'
      });
      start = -1;
    }
  }
  return { pieces, elems, pts, crits };
}
function piecesTex(pieces, v) {
  if (!pieces.length) return { set: R`\varnothing`, ineq: R`\text{no real solution}`, kind: 'empty' };
  const all = pieces.length === 1 && !pieces[0].lo && !pieces[0].hi;
  if (all) return { set: R`\mathbb{R}`, ineq: R`\text{all real numbers}`, kind: 'all' };
  // ℝ minus finitely many points
  const gapsOnly = pieces.every((p, i) => (i === 0 ? !p.lo : p.lo && !p.loIn && pieces[i - 1].hi && pieces[i - 1].hi.v === p.lo.v)) && !pieces[pieces.length - 1].hi;
  if (gapsOnly && pieces.length > 1) {
    const pts = pieces.slice(1).map(p => p.lo.tex);
    return { set: `\\mathbb{R} \\setminus \\{${pts.join(', ')}\\}`, ineq: `${v} \\ne ${pts.join(',\\ ')}`, kind: 'gaps' };
  }
  const set = pieces.map(p => {
    if (p.lo && p.hi && p.lo.v === p.hi.v) return `\\{${p.lo.tex}\\}`;
    return `${p.loIn ? '[' : '('}${p.lo ? p.lo.tex : '-\\infty'}, ${p.hi ? p.hi.tex : '\\infty'}${p.hiIn ? ']' : ')'}`;
  }).join(R` \cup `);
  const ineq = pieces.map(p => {
    if (p.lo && p.hi && p.lo.v === p.hi.v) return `${v} = ${p.lo.tex}`;
    if (!p.lo) return `${v} ${p.hiIn ? '\\le' : '<'} ${p.hi.tex}`;
    if (!p.hi) return `${v} ${p.loIn ? '\\ge' : '>'} ${p.lo.tex}`;
    return `${p.lo.tex} ${p.loIn ? '\\le' : '<'} ${v} ${p.hiIn ? '\\le' : '<'} ${p.hi.tex}`;
  }).join(R` \ \text{or}\ `);
  return { set, ineq, kind: 'pieces' };
}
const approxNote = (pieces) => (pieces.some(p => (p.lo && p.lo.approx) || (p.hi && p.hi.approx)) ? R` \ (\text{endpoints rounded})` : '');

function solveInequality(parts, rels, nodes, v, domainConds = [], domainText = null, periodic = false) {
  const conds = rels.map((rel, i) => ({ L: nodes[i], R: nodes[i + 1], rel })).concat(domainConds);
  const sol = solveConditions(conds, v);
  if (!sol) return null;
  const out = piecesTex(sol.pieces, v);
  const original = nodes.map((n, i) => dispTex(n, parts[i]) + (rels[i] ? ` ${REL_TEX[rels[i]]} ` : '')).join('');
  const steps = [{ label: rels.length > 1 ? 'Compound inequality (both parts must hold):' : rels[0] === '≠' ? 'Given:' : 'Inequality:', katex: original + (domainText ? `, \\qquad ${domainText}` : '') }];
  if (domainText && periodic && /2\\pi/.test(domainText) && /^0 /.test(domainText)) steps.push({ label: 'Trigonometric functions repeat, so we solve over one full turn, $0 \\le ' + v + ' < 2\\pi$. (Add multiples of the period for every solution.)', katex: '' });
  const single = conds.length === 1 ? conds[0] : null;
  const f0 = sol.crits[0].f;
  const rat = single && !countAbs(f0) ? rationalOf(f0, v) : null;
  const linear = rat && P.degree(rat.N) === 1 && P.degree(rat.D) === 0;

  if (single && single.rel === '≠') {
    const z = sol.crits[0].cp.zeros, poles = sol.crits[0].cp.poles;
    steps.push({ label: `Step 1: first solve the equation $${dispTex(single.L, parts[0])} = ${dispTex(single.R, parts[1])}$:`, katex: z.length ? z.map(p => `${v} = ${p.tex}`).join(',\\ ') : R`\text{no real solution}` });
    if (poles.length) steps.push({ label: 'The expression is also undefined at:', katex: poles.map(p => `${v} = ${p.tex}`).join(',\\ ') });
    steps.push({ label: `Step 2: the two sides are different for every other value of ${v}:`, katex: `${out.ineq}` });
  } else if (linear) {
    const a = rat.N[1].div(rat.D[0]), b = rat.N[0].div(rat.D[0]);
    const rel = single.rel, flip = a.isNegative();
    const lhs = P.toTex(P.trim([b, a]), v);
    steps.push({ label: `Step 1: move every term to the left side (subtract $${dispTex(single.R, parts[1])}$ from both sides):`, katex: `${lhs} ${REL_TEX[rel]} 0` });
    steps.push({ label: `Step 2: move the constant to the right side:`, katex: `${a.equals(qn(1)) ? '' : a.equals(qn(-1)) ? '-' : qt(a)}${v} ${REL_TEX[rel]} ${qt(b.neg())}` });
    const r = b.neg().div(a);
    if (!a.equals(qn(1))) steps.push({ label: flip ? `Step 3: divide both sides by ${qt(a)}. Dividing by a negative number reverses the inequality sign (${rel} becomes ${FLIP[rel]}):` : `Step 3: divide both sides by ${qt(a)} (positive, so the sign stays the same):`, katex: `${v} ${REL_TEX[flip ? FLIP[rel] : rel]} ${qt(r)}` });
    steps.push({ label: 'Check with a test value:', katex: (() => { const sp = sol.elems.find(e => e.type === 'I' && e.ok); if (!sp) return R`\text{no value works}`; const x = Number.isInteger(sp.x) ? sp.x : Math.round(sp.x * 100) / 100; return `${v} = ${fmt(x)}:\\quad ${fmt(ev(single.L, x, v))} ${REL_TEX[rel]} ${fmt(ev(single.R, x, v))} \\ \\checkmark`; })() });
  } else {
    // sign chart
    if (single) {
      const rf = rat ? `\\frac{${P.factoredTex(P.factor(rat.N), v)}}{${P.factoredTex(P.factor(rat.D), v)}}`.replace(/\\frac\{(.*)\}\{1\}$/, '$1') : S.tex(f0);
      steps.push({ label: 'Step 1: move everything to one side and factor:', katex: `${rf} ${REL_TEX[single.rel]} 0` });
    } else steps.push({ label: 'Step 1: solve both parts together. Rewrite each as "expression compared with 0":', katex: conds.map(c => `${S.tex(S.simplify(S.sub(c.L, c.R)))} ${REL_TEX[c.rel]} 0`).join(R`\quad\text{and}\quad `) });
    const z = sol.crits.flatMap(c => c.cp.zeros), poles = sol.crits.flatMap(c => c.cp.poles);
    const absPts = sol.pts.filter(p => p.kind === 'abs');
    if (absPts.length) steps.push({ label: 'The absolute value changes form where the expression inside it is 0:', katex: absPts.map(p => `${v} = ${p.tex}`).join(',\\ ') });
    steps.push({ label: 'Step 2: critical points, where the expression is 0 (it can change sign there) or undefined (always excluded):', katex: [...z.map(p => `${v} = ${p.tex}${p.approx ? R`\ (\approx)` : ''}`), ...poles.map(p => `${v} = ${p.tex}\\ (\\text{undefined})`)].join(',\\quad ') || R`\text{none: the expression never changes sign}` });
    const rows = sol.elems.filter(e => e.type === 'I').map(e => {
      const iv = `(${e.lo ? e.lo.tex : '-\\infty'}, ${e.hi ? e.hi.tex : '\\infty'})`;
      const x = Math.abs(e.x - Math.round(e.x)) < 1e-9 ? Math.round(e.x) : Math.round(e.x * 1000) / 1000;
      const sign = single && single.rel !== '=' ? (ev(f0, x, v) > 0 ? '+' : ev(f0, x, v) < 0 ? '-' : '0') : '';
      return `${iv} & ${fmt(x)} & ${sign ? `${sign} &` : ''} ${e.ok ? R`\checkmark` : R`\times`}`;
    });
    steps.push({ label: 'Step 3: sign chart. Test one value from each interval:', katex: `\\begin{array}{c|c|${single ? 'c|' : ''}c} \\text{interval} & \\text{test } ${v} & ${single ? '\\text{sign} &' : ''} \\text{holds?} \\\\ \\hline ${rows.join(R` \\ `)} \\end{array}` });
    const ptsInfo = sol.elems.filter(e => e.type === 'P');
    if (ptsInfo.length) steps.push({ label: 'Step 4: check the critical points themselves:', katex: ptsInfo.map(e => `${v} = ${e.p.tex}: ${e.ok ? R`\text{included}` : e.p.kind === 'pole' ? R`\text{excluded (undefined)}` : R`\text{excluded}`}`).join(',\\quad ') });
  }
  const note = approxNote(sol.pieces);
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${out.ineq}}${note}` });
  if (out.kind === 'pieces' || out.kind === 'gaps') steps.push({ label: 'In interval notation:', katex: `${v} \\in ${out.set}` });
  return { answer: out.kind === 'pieces' || out.kind === 'gaps' ? `${out.ineq} \\quad (${v} \\in ${out.set})` : out.ineq, steps, solution: out };
}

// ---------------------------------------------------------------- 3. relation questions written in symbols
function solveRelation(text, opts = {}) {
  RECUR_NOTES.length = 0;
  let s = normaliseRelations(recurringToFraction(String(text)));
  const notes = RECUR_NOTES.slice();
  if (!/[<>≤≥≠=]/.test(s)) return null;
  s = s.replace(/^\s*(?:please\s+)?(?:solve|find|determine|check|verify|show|prove|is\s+it\s+true\s+that|true\s+or\s+false|t\s*\/\s*f|state\s+whether)\b\s*(?:the\s+)?(?:inequality|statement|whether|if|that)?\s*[:,]?\s*/i, '')
    .replace(/^\s*(?:the\s+)?(?:inequality|statement)\s*[:,]?\s*/i, '')
    .replace(/\s*(?:for|where)\s+(?:all\s+|every\s+|any\s+)?(?:real\s+)?(?:values?\s+of\s+)?[a-z]\s*(?:∈\s*ℝ|in\s+r|\\in\s*\\mathbb\{R\})?\s*[.?]?\s*$/i, '')
    .replace(/\s*(?:true\s+or\s+false|is\s+this\s+(?:true|correct))\s*\??\s*$/i, '').replace(/[?.]\s*$/, '').trim();
  // a domain written after the inequality: "tan x > 1 for 0 ≤ x < 2π"
  let domainConds = [], domainText = null;
  const dm = s.match(/^(.*?[<>≤≥≠=].*?)\s*(?:,\s*)?(?:\bfor\b|\bwhere\b|\bon\b|\bwith\b|\bin\b)\s+(.*[<>≤≥].*)$/i);
  if (dm) {
    const d = splitRelations(dm[2].replace(/°/g, '°'));
    const dn = d.parts.map(pm);
    if (d.rels.length >= 1 && d.rels.length <= 2 && dn.every(Boolean)) { domainConds = d.rels.map((rel, i) => ({ L: dn[i], R: dn[i + 1], rel })); domainText = dn.map((n, i) => dispTex(n, d.parts[i]) + (d.rels[i] ? ` ${REL_TEX[d.rels[i]]} ` : '')).join(''); s = dm[1].trim(); }
  }
  const { parts, rels } = splitRelations(s);
  if (!rels.length || rels.length > 2 || parts.some(p => !p)) return null;
  if (rels.length === 2 && (rels.includes('=') || rels.includes('≠'))) return null;
  const nodes = parts.map(pm);
  if (nodes.some(n => !n)) return null;
  const vars = new Set(); nodes.forEach(n => S.variables(n).forEach(x => vars.add(x)));
  ['e', 'i', 'π', 'pi'].forEach(c => vars.delete(c));
  if (vars.size === 0) {
    const r0 = checkConstantStatement(parts, rels, nodes);
    if (r0 && notes.length) r0.steps.splice(1, 0, { label: 'Write the recurring decimal as a fraction (for a repeating block of k digits, multiply by 10^k and subtract):', katex: notes.join(R`, \quad `) });
    return r0;
  }
  if (vars.size > 1) return null;
  const v = [...vars][0];
  if (rels.length === 1 && rels[0] === '=' && !opts.allowEquation) return null; // equations belong to the equation solvers
  const periodic = nodes.some(n => /\\(?:sin|cos|tan|sec|csc|cot)/.test(S.tex(n)));
  if (periodic && !domainConds.length) {
    domainConds = [{ L: S.vr(v), R: S.num(qn(0)), rel: '≥' }, { L: S.vr(v), R: S.prod(S.num(qn(2)), S.cst('pi')), rel: '<' }];
    domainText = `0 \\le ${v} < 2\\pi`;
  }
  const r = solveInequality(parts, rels, nodes, v, domainConds, domainText, periodic);
  if (!r) return null;
  if (opts.quantifier) {
    const all = r.solution.kind === 'all', some = r.solution.kind !== 'empty';
    const ok = opts.quantifier === 'all' ? all : some;
    r.steps.push({ label: opts.quantifier === 'all' ? `The statement claims it holds for every real ${v}. ${all ? 'It does.' : 'It does not: some values fail.'}` : `The statement claims some real ${v} works. ${some ? 'Yes.' : 'No value works.'}`, katex: `\\mathbf{\\text{${ok ? 'TRUE' : 'FALSE'}}}` });
    r.answer = `\\text{${ok ? 'True' : 'False'}}`;
  }
  return r;
}

// ---------------------------------------------------------------- 4. questions in words
const WORD_REL = [
  [/\s+(?:is\s+)?(?:greater|larger|bigger|more|higher)\s+than\s+or\s+equal\s+to\s+/i, '≥'],
  [/\s+(?:is\s+)?(?:less|smaller|lower|fewer)\s+than\s+or\s+equal\s+to\s+/i, '≤'],
  [/\s+(?:is\s+)?(?:at\s+least|not\s+less\s+than|no\s+less\s+than)\s+/i, '≥'],
  [/\s+(?:is\s+)?(?:at\s+most|not\s+(?:greater|more)\s+than|no\s+more\s+than)\s+/i, '≤'],
  [/\s+(?:is\s+)?(?:greater|larger|bigger|more|higher)\s+than\s+/i, '>'],
  [/\s+(?:is\s+)?(?:less|smaller|lower|fewer)\s+than\s+/i, '<'],
  [/\s+(?:is\s+)?(?:not\s+equal\s+to|different\s+from|unequal\s+to)\s+/i, '≠'],
  [/\s+(?:is\s+)?(?:equal\s+to|equals|the\s+same\s+as)\s+/i, '='],
  [/\s+is\s+(?=[-\d\\(√π])/i, '=']
];
function wordsToSymbols(s) {
  for (const [re, sym] of WORD_REL) if (re.test(s)) return s.replace(re, ` ${sym} `);
  return null;
}
function isPrimeBig(n) {
  if (n < 2n) return false;
  for (const p of [2n, 3n, 5n, 7n, 11n, 13n]) { if (n === p) return true; if (n % p === 0n) return false; }
  for (let f = 17n; f * f <= n; f += 2n) { if (n % f === 0n) return false; if (f > 2000000n) return null; }
  return true;
}
function smallestFactor(n) { for (let f = 2n; f * f <= n; f++) if (n % f === 0n) return f; return n; }
function primeFactorTex(n) {
  const out = []; let m = n;
  for (let f = 2n; f * f <= m; f++) { let k = 0; while (m % f === 0n) { m /= f; k++; } if (k) out.push(k > 1 ? `${f}^{${k}}` : `${f}`); }
  if (m > 1n) out.push(`${m}`);
  return out.join(R` \times `);
}
function numberProperty(raw) {
  const s = recurringToFraction(String(raw)).replace(/[?]/g, '').trim();
  let m = s.match(/^(?:is|check\s+(?:if|whether)|determine\s+(?:if|whether)|find\s+(?:if|whether))\s+(.+?)\s+(?:is\s+)?(?:an?\s+)?(prime|composite|even|odd|(?:a\s+)?perfect\s+square|(?:a\s+)?perfect\s+cube|rational|irrational|(?:an?\s+)?integer|whole\s+number|natural\s+number|positive|negative|zero)(?:\s+number)?\s*\.?$/i);
  if (m) {
    const node = pm(m[1]); if (!node || S.variables(node).size) return null;
    const prop = m[2].toLowerCase().replace(/^(?:a|an)\s+/, '');
    const q = exactConst(node), val = ev(node, 0);
    const steps = [{ label: 'Question:', katex: `\\text{Is } ${S.tex(node)} \\text{ ${prop}?}` }];
    if (S.tex(node) !== valueTex(node)) steps.push({ label: 'Work out the value:', katex: `${S.tex(node)} = ${valueTex(node)}` });
    let ok, why;
    const isInt = q && q.d === 1n;
    if (prop === 'prime' || prop === 'composite') {
      if (!isInt) { ok = false; why = 'Only whole numbers can be prime or composite.'; }
      else {
        const n = q.n; const pr = isPrimeBig(n);
        if (pr === null) return null;
        if (n < 2n) { ok = false; why = `${n} is neither prime nor composite: a prime must be a whole number greater than 1.`; }
        else if (prop === 'prime') { ok = pr; why = pr ? `${n} has no divisor between 2 and √${n} ≈ ${fmt(Math.sqrt(Number(n)))}, so its only factors are 1 and ${n}.` : `${n} = ${smallestFactor(n)} × ${n / smallestFactor(n)}, so it has a factor other than 1 and itself.`; }
        else { ok = !pr; why = pr ? `${n} is prime (its only factors are 1 and ${n}), so it is not composite.` : `${n} = ${smallestFactor(n)} × ${n / smallestFactor(n)}, so it is composite.`; }
        if (n >= 4n && !pr) steps.push({ label: 'Prime factorisation:', katex: `${n} = ${primeFactorTex(n)}` });
      }
    } else if (prop === 'even' || prop === 'odd') {
      if (!isInt) { ok = false; why = 'Only integers are even or odd.'; }
      else { const even = q.n % 2n === 0n; ok = prop === 'even' ? even : !even; why = `${q.n} ÷ 2 ${even ? `= ${q.n / 2n} with no remainder` : 'leaves remainder 1'}, so it is ${even ? 'even' : 'odd'}.`; }
    } else if (/square|cube/.test(prop)) {
      const k = /square/.test(prop) ? 2 : 3;
      if (!q || q.isNegative() && k === 2) { ok = false; why = q ? 'A negative number is not a perfect square.' : 'It is not a rational number.'; }
      else {
        const root = Math.round(Math.cbrt ? (k === 2 ? Math.sqrt(q.toNumber()) : Math.cbrt(q.toNumber())) : 0);
        const rq = isInt ? qn(root) : null;
        ok = !!(isInt && rq && qn(root).pow(qn(k)).equals(q));
        why = ok ? `${q.n} = ${root}^${k}.` : `${k === 2 ? '√' : '∛'}${qt(q)} ≈ ${fmt(k === 2 ? Math.sqrt(q.toNumber()) : Math.cbrt(q.toNumber()))} is not a whole number.`;
      }
    } else if (prop === 'rational' || prop === 'irrational') {
      let rational;
      if (q) { rational = true; why = `It equals ${qt(q)}, a fraction of two integers.`; }
      else {
        const t = S.tex(node);
        if (/\\pi|\be\b/.test(t) && !/\\sqrt/.test(t)) { rational = false; why = 'π and e are irrational (a non-zero rational multiple or rational shift of an irrational number stays irrational).'; }
        else if (/^\\sqrt\{(\d+)\}$/.test(t)) { const n = Number(t.match(/\d+/)[0]); rational = Number.isInteger(Math.sqrt(n)); why = rational ? `√${n} = ${Math.sqrt(n)}.` : `${n} is not a perfect square, so √${n} is irrational (if √${n} = p/q in lowest terms then p² = ${n}q², which forces a common factor).`; }
        else return null;
      }
      ok = prop === 'rational' ? rational : !rational;
      if (/\$/.test(why)) why = why.replace(/\$/g, '');
      steps.push({ label: why.replace(/\\frac\{(\d+)\}\{(\d+)\}/g, '$1/$2').replace(/-\\frac/g, '-'), katex: '' });
      why = null;
    } else if (/integer|whole|natural/.test(prop)) {
      ok = !!isInt && (prop === 'integer' || !q.isNegative()) && (!/natural/.test(prop) || !q.isZero());
      why = isInt ? `${qt(q)} is a whole number${q.isNegative() ? ' but it is negative' : ''}.` : `${valueTex(node)} is not a whole number.`;
      if (/natural/.test(prop) && isInt && q.isZero()) why = 'Using ℕ = {1, 2, 3, …}, 0 is not a natural number. (Some books and computer science use ℕ = {0, 1, 2, …}, which includes 0.)';
    } else {
      ok = prop === 'positive' ? val > 0 && !isEq(val, 0) : prop === 'negative' ? val < 0 && !isEq(val, 0) : isEq(val, 0);
      why = `The value is ${valueTex(node)}.`;
    }
    if (why) steps.push({ label: why, katex: '' });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\text{${ok ? 'Yes' : 'No'}}}` });
    return { answer: `\\text{${ok ? 'Yes' : 'No'}${''}}`, steps };
  }
  // divisibility / factors / multiples
  m = s.match(/^(?:is|check\s+(?:if|whether))\s+(.+?)\s+(?:exactly\s+)?(divisible\s+by|a\s+multiple\s+of|a\s+factor\s+of|a\s+divisor\s+of)\s+(.+?)\s*\.?$/i);
  if (m) {
    const a = exactConst(pm(m[1]) || S.num(qn(0))), b = exactConst(pm(m[3]) || S.num(qn(0)));
    if (!a || !b || a.d !== 1n || b.d !== 1n) return null;
    const kind = m[2].toLowerCase();
    const [n, d] = /factor|divisor/.test(kind) ? [b.n, a.n] : [a.n, b.n];
    if (d === 0n) return { answer: R`\text{No}`, steps: [{ label: 'Question:', katex: `\\text{Is } ${a.n} \\text{ ${kind} } ${b.n}\\text{?}` }, { label: 'Nothing can be divided by 0: division by zero is undefined, so no number is divisible by 0 in the usual sense.', katex: '' }, { label: 'Final Answer:', katex: R`\mathbf{\text{No}}` }] };
    const rmd = ((n % d) + (d < 0n ? -d : d)) % (d < 0n ? -d : d), ok = rmd === 0n;
    const steps = [{ label: 'Question:', katex: `\\text{Is } ${a.n} \\text{ ${kind} } ${b.n}\\text{?}` },
      { label: `Divide ${n} by ${d}:`, katex: ok ? `${n} \\div ${d} = ${n / d} \\quad (\\text{remainder } 0)` : `${n} = ${d} \\times ${(n - rmd) / d} + ${rmd} \\quad (\\text{remainder } ${rmd})` },
      { label: ok ? `The remainder is 0, so ${d} divides ${n} exactly.` : `The remainder is not 0, so ${d} does not divide ${n}.`, katex: '' },
      { label: 'Final Answer:', katex: `\\mathbf{\\text{${ok ? 'Yes' : 'No'}}}` }];
    return { answer: `\\text{${ok ? 'Yes' : 'No'}}`, steps };
  }
  return null;
}
// "Which is greater, A or B?"  "Compare A and B"  "A or B, which is bigger?"
function solveCompareWords(raw) {
  const s = recurringToFraction(normaliseRelations(String(raw))).replace(/\?/g, '').trim();
  let m = s.match(/^(?:which\s+(?:number\s+)?is\s+(greater|larger|bigger|more|smaller|less|lower)\s*[,:]?\s*)(.+?)\s+or\s+(.+)$/i)
    || s.match(/^(.+?)\s+or\s+(.+?)\s*[,:]?\s*which\s+(?:one\s+)?is\s+(greater|larger|bigger|more|smaller|less|lower)\s*$/i);
  let A, B, want = 'greater';
  if (m) { if (/^which/i.test(m[0])) { want = m[1]; A = m[2]; B = m[3]; } else { A = m[1]; B = m[2]; want = m[3]; } }
  else { m = s.match(/^compare\s+(.+?)\s+(?:and|with|to|vs\.?|versus)\s+(.+)$/i); if (!m) return null; A = m[1]; B = m[2]; }
  const a = pm(A.replace(/^the\s+number\s+/i, '')), b = pm(B);
  if (!a || !b || S.variables(a).size || S.variables(b).size) return null;
  const qa = exactConst(a), qb = exactConst(b), va = ev(a, 0), vb = ev(b, 0);
  if (!Number.isFinite(va) || !Number.isFinite(vb)) return null;
  const cmp = qa && qb ? (qa.sub(qb).isZero() ? 0 : qa.sub(qb).isNegative() ? -1 : 1) : isEq(va, vb) ? 0 : va < vb ? -1 : 1;
  const steps = [{ label: 'Compare:', katex: `${S.tex(a)} \\quad\\text{and}\\quad ${S.tex(b)}` }];
  // fractions: cross-multiply
  if (qa && qb && (qa.d !== 1n || qb.d !== 1n)) {
    steps.push({ label: 'Cross-multiply (both denominators are positive):', katex: `${qa.n} \\times ${qb.d} = ${qa.n * qb.d}, \\qquad ${qb.n} \\times ${qa.d} = ${qb.n * qa.d}` });
    steps.push({ label: 'As decimals:', katex: `${qt(qa)} \\approx ${fmt(va)}, \\qquad ${qt(qb)} \\approx ${fmt(vb)}` });
  } else if (a.t === 'pow' && b.t === 'pow' && a.exp.t === 'num' && b.exp.t === 'num' && a.base.t === 'num' && b.base.t === 'num') {
    const ea = a.exp.v, eb = b.exp.v; const g = (() => { let x = ea.n, y = eb.n; while (y) [x, y] = [y, x % y]; return x; })();
    if (g > 1n && ea.d === 1n && eb.d === 1n) steps.push({ label: `Write both with the same power ${g}:`, katex: `${S.tex(a)} = (${a.base.v.toTex()}^{${ea.n / g}})^{${g}} = ${qt(a.base.v.pow(new Q(ea.n / g)))}^{${g}}, \\qquad ${S.tex(b)} = (${b.base.v.toTex()}^{${eb.n / g}})^{${g}} = ${qt(b.base.v.pow(new Q(eb.n / g)))}^{${g}}` });
    steps.push({ label: 'Values:', katex: `${S.tex(a)} = ${valueTex(a)}, \\qquad ${S.tex(b)} = ${valueTex(b)}` });
  } else steps.push({ label: 'Work out both values:', katex: `${S.tex(a)} = ${valueTex(a)}${qa ? '' : ` \\approx ${fmt(va)}`}, \\qquad ${S.tex(b)} = ${valueTex(b)}${qb ? '' : ` \\approx ${fmt(vb)}`}` });
  const rel = cmp === 0 ? '=' : cmp < 0 ? '<' : '>';
  steps.push({ label: 'So', katex: `${S.tex(a)} ${rel} ${S.tex(b)}` });
  const small = /smaller|less|lower/i.test(want);
  const winner = cmp === 0 ? null : (cmp > 0) !== small ? a : b;
  const ans = cmp === 0 ? `${S.tex(a)} = ${S.tex(b)}\\ \\text{(they are equal)}` : `${S.tex(winner)} \\text{ is ${small ? 'smaller' : 'greater'}}\\quad (${S.tex(a)} ${rel} ${S.tex(b)})`;
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

// ---------------------------------------------------------------- 5. common true / false facts
const FACTS = [
  [/(every|all|each)\s+primes?\s+(numbers?\s+)?(is|are)\s+odd/, false, '2 is a prime number and it is even. (Every prime other than 2 is odd.)'],
  [/^1\s+is\s+(a\s+)?prime/, false, 'A prime must have exactly two different factors. 1 has only one factor, so it is neither prime nor composite.'],
  [/^2\s+is\s+the\s+only\s+even\s+prime/, true, 'Any other even number is divisible by 2, so it has a factor other than 1 and itself.'],
  [/^(0|zero)\s+is\s+(an?\s+)?even/, true, '0 = 2 × 0, so 0 is divisible by 2: it is even.'],
  [/^(0|zero)\s+is\s+(an?\s+)?odd/, false, '0 = 2 × 0 is divisible by 2, so it is even, not odd.'],
  [/^(0|zero)\s+is\s+(a\s+)?positive/, false, '0 is neither positive nor negative.'],
  [/^(0|zero)\s+is\s+(a\s+)?negative/, false, '0 is neither positive nor negative.'],
  [/^(0|zero)\s+is\s+(a\s+)?(rational|real|an?\s+integer|whole)/, true, '0 = 0/1 is an integer, so it is also rational and real.'],
  [/(every|all|each|any)\s+integers?\s+(is|are)\s+(a\s+)?rational/, true, 'Any integer n can be written as n/1.'],
  [/(every|all|each|any)\s+rational\s+numbers?\s+(is|are)\s+(an?\s+)?integers?/, false, 'Counter-example: 1/2 is rational but not an integer.'],
  [/(every|all|each|any)\s+real\s+numbers?\s+(is|are)\s+rational/, false, 'Counter-example: √2 and π are real but irrational.'],
  [/(every|all|each|any)\s+natural\s+numbers?\s+(is|are)\s+(an?\s+)?(integers?|whole|real|rational)/, true, 'ℕ ⊂ ℤ ⊂ ℚ ⊂ ℝ.'],
  [/(every|all|each|any)\s+irrational\s+numbers?\s+(is|are)\s+real/, true, 'The irrational numbers are exactly the real numbers that are not rational.'],
  [/division\s+by\s+(0|zero)\s+is\s+undefined|cannot\s+divide\s+by\s+(0|zero)/, true, 'If a/0 = c then a = 0 × c = 0, which fails for a ≠ 0 (and 0/0 could be anything), so no value can be assigned.'],
  [/(the\s+)?squares?\s+of\s+(any|every|a)\s+real\s+numbers?\s+(is|are)\s+(always\s+)?(non.?negative|positive\s+or\s+zero|≥\s*0)/, true, 'x² = x·x, and the product of two numbers with the same sign is never negative.'],
  [/(the\s+)?squares?\s+of\s+(any|every|a)\s+real\s+numbers?\s+(is|are)\s+(always\s+)?positive/, false, 'Counter-example: 0² = 0 is not positive.'],
  [/(a\s+)?negative\s+(number\s+)?(times|multiplied\s+by)\s+(a\s+)?negative\s+(number\s+)?is\s+(a\s+)?positive/, true, '(−a)(−b) = ab for positive a, b.'],
  [/(the\s+)?(sum\s+of\s+(the\s+)?(interior\s+)?angles|angles?\s+sum)\s+(of|in)\s+(a|any|every)\s+triangle\s+(is|equals?|=)\s*180/, true, 'Draw the line through one vertex parallel to the opposite side: the three angles become alternate angles that form a straight line, 180°.'],
  [/(the\s+)?(sum\s+of\s+(the\s+)?(interior\s+)?angles|angles?\s+sum)\s+(of|in)\s+(a|any|every)\s+quadrilateral\s+(is|equals?|=)\s*360/, true, 'A diagonal splits the quadrilateral into two triangles, 2 × 180° = 360°.'],
  [/(every|all|each|a)\s+squares?\s+(is|are)\s+(an?\s+)?rectangles?/, true, 'A square has four right angles, which is the definition of a rectangle.'],
  [/(every|all|each|a)\s+rectangles?\s+(is|are)\s+(an?\s+)?squares?/, false, 'Counter-example: a 2 × 1 rectangle does not have four equal sides.'],
  [/(every|all|each|a)\s+squares?\s+(is|are)\s+(an?\s+)?rhomb(us|uses|i)/, true, 'A square has four equal sides, which is the definition of a rhombus.'],
  [/(every|all|each|a)\s+rhomb(us|uses|i)\s+(is|are)\s+(an?\s+)?squares?/, false, 'A rhombus need not have right angles.'],
  [/parallel\s+lines\s+(never|do\s+not|don.?t)\s+(meet|intersect|cross)/, true, 'In a plane (Euclidean geometry), parallel lines have no common point.'],
  [/parallel\s+lines\s+(meet|intersect|cross)/, false, 'In a plane (Euclidean geometry), parallel lines never meet.'],
  [/(the\s+)?empty\s+set\s+is\s+(a\s+)?subset\s+of\s+(every|all|any)/, true, 'There is no element of ∅ that fails to be in A, so ∅ ⊆ A for every set A.'],
  [/(every|all|each|any)\s+differentiable\s+functions?\s+(is|are)\s+continuous/, true, 'f(x) − f(a) = ((f(x) − f(a))/(x − a))·(x − a) → f′(a)·0 = 0.'],
  [/(every|all|each|any)\s+continuous\s+functions?\s+(is|are)\s+differentiable/, false, 'Counter-example: f(x) = |x| is continuous at 0 but has no derivative there.'],
  [/(the\s+)?sum\s+of\s+(any\s+)?two\s+odd\s+(numbers|integers)\s+is\s+(always\s+)?even/, true, '(2a + 1) + (2b + 1) = 2(a + b + 1).'],
  [/(the\s+)?sum\s+of\s+(any\s+)?two\s+odd\s+(numbers|integers)\s+is\s+(always\s+)?odd/, false, '(2a + 1) + (2b + 1) = 2(a + b + 1) is even.'],
  [/(the\s+)?sum\s+of\s+(any\s+)?two\s+even\s+(numbers|integers)\s+is\s+(always\s+)?even/, true, '2a + 2b = 2(a + b).'],
  [/(the\s+)?product\s+of\s+(any\s+)?two\s+odd\s+(numbers|integers)\s+is\s+(always\s+)?odd/, true, '(2a + 1)(2b + 1) = 2(2ab + a + b) + 1.'],
  [/(the\s+)?sum\s+of\s+(an?\s+)?odd\s+and\s+(an?\s+)?even\s+(number|integer)s?\s+is\s+(always\s+)?odd/, true, '(2a + 1) + 2b = 2(a + b) + 1.'],
  [/(the\s+)?square\s+root\s+of\s+(a\s+)?negative\s+numbers?\s+is\s+(a\s+)?real/, false, 'x² ≥ 0 for every real x, so no real number squares to a negative number (its square roots are imaginary).'],
  [/log(arithm)?\s*(of\s+)?\(?(0|zero)\)?\s+is\s+undefined/, true, 'b^y > 0 for every real y, so no power of the base equals 0.'],
  [/(every|all|each|any)\s+bounded\s+sequences?\s+(is|are)\s+convergent|(every|all|each|any)\s+bounded\s+sequences?\s+converges?/, false, 'Counter-example: (−1)ⁿ is bounded but does not converge. (Bolzano–Weierstrass only gives a convergent subsequence.)'],
  [/(every|all|each|any)\s+convergent\s+sequences?\s+(is|are)\s+bounded/, true, 'Beyond some N all terms lie within 1 of the limit, and there are finitely many terms before N.'],
  [/(every|all|each|any)\s+cauchy\s+sequences?\s+(in\s+(r|ℝ|the\s+reals?)\s+)?(is|are)\s+convergent|(every|all|each|any)\s+cauchy\s+sequences?\s+in\s+(r|ℝ|the\s+reals?)\s+converges?/, true, 'ℝ is complete: a Cauchy sequence is bounded, has a convergent subsequence, and then converges to the same limit.'],
  [/(the\s+)?harmonic\s+series\s+(converges|is\s+convergent)/, false, '1 + 1/2 + (1/3 + 1/4) + (1/5 + … + 1/8) + … ≥ 1 + 1/2 + 1/2 + 1/2 + …, so it diverges.'],
  [/(the\s+)?harmonic\s+series\s+(diverges|is\s+divergent)/, true, 'Grouping the terms in blocks of 2, 4, 8, … gives at least 1/2 for each block, so the sum is unbounded.'],
  [/matri(x|ces)\s+multiplication\s+is\s+commutative/, false, 'Counter-example: with A = [[0,1],[0,0]] and B = [[0,0],[1,0]], AB ≠ BA.'],
  [/(every|all|each|any)\s+groups?\s+of\s+prime\s+order\s+(is|are)\s+cyclic/, true, 'By Lagrange, any element g ≠ e has order p, so ⟨g⟩ is the whole group.'],
  [/(every|all|each|any)\s+abelian\s+groups?\s+(is|are)\s+cyclic/, false, 'Counter-example: the Klein four-group ℤ₂ × ℤ₂ is abelian but has no element of order 4.'],
  [/(every|all|each|any)\s+cyclic\s+groups?\s+(is|are)\s+abelian/, true, 'gᵐgⁿ = gᵐ⁺ⁿ = gⁿgᵐ.'],
  [/(π|pi)\s+is\s+(a\s+)?rational/, false, 'π is irrational (Lambert, 1761); 22/7 and 3.14 are only approximations.'],
  [/(π|pi)\s+is\s+(an\s+)?irrational/, true, 'π is irrational (Lambert, 1761).'],
  [/\be\s+is\s+(an\s+)?irrational/, true, 'e = Σ 1/n! is irrational (Euler); multiplying by n! would leave a non-integer remainder between 0 and 1.'],
  [/(√|sqrt\s*\(?|\\sqrt\{?|root\s+)2\)?\}?\s+is\s+(a\s+)?rational/, false, 'If √2 = p/q in lowest terms, then p² = 2q², so p is even, then q is even too: a contradiction.'],
  [/(√|sqrt\s*\(?|\\sqrt\{?|root\s+)2\)?\}?\s+is\s+(an\s+)?irrational/, true, 'If √2 = p/q in lowest terms, then p² = 2q², so p and q are both even: a contradiction.'],
  [/there\s+are\s+infinitely\s+many\s+primes/, true, 'Euclid: if p₁, …, pₙ were all the primes, p₁⋯pₙ + 1 would have a prime factor not in the list.'],
  [/(every|all|each|any)\s+even\s+numbers?\s+(greater|bigger)\s+than\s+2\s+(is|are|can\s+be\s+written\s+as)\s+(the\s+)?sum\s+of\s+two\s+primes/, null, 'This is Goldbach’s conjecture: checked by computer far beyond 10¹⁸ but still unproved, so it is not known to be true.']
];
function solveFact(raw) {
  const s = String(raw).toLowerCase().replace(/^\s*(?:true\s+or\s+false|t\s*\/\s*f|is\s+it\s+true\s+that|is\s+the\s+following\s+(?:statement\s+)?true|state\s+(?:true\s+or\s+false|whether\s+(?:true|the\s+statement)))\s*[:,\-]?\s*/, '')
    .replace(/\s*[,(]?\s*(?:true\s+or\s+false|t\s*\/\s*f)\s*\)?\s*\??\s*$/, '').replace(/^(?:is\s+)(.+)$/, (m0, rest) => rest).replace(/[?.!]\s*$/, '').trim();
  for (const [re, val, why] of FACTS) {
    if (re.test(s)) {
      const verdict = val === null ? 'Unknown (open problem)' : val ? 'True' : 'False';
      const steps = [{ label: 'Statement:', katex: `\\text{${String(raw).replace(/^\s*(?:true\s+or\s+false|t\s*\/\s*f|is\s+it\s+true\s+that)\s*[:,\-]?\s*/i, '').replace(/[\\{}$&#^_%~]/g, ' ').slice(0, 140)}}` },
        { label: `${val === null ? '' : val ? 'Reason: ' : 'Reason (counter-example or proof): '}${why}`, katex: '' },
        { label: 'Final Answer:', katex: `\\mathbf{\\text{${verdict.toUpperCase()}}}` }];
      return { answer: `\\text{${verdict}}`, steps };
    }
  }
  return null;
}

// ---------------------------------------------------------------- entry point
function solveComparisonQuestion(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  // facts in words
  const fact = solveFact(text);
  if (fact) return fact;
  const prop = numberProperty(text);
  if (prop) return prop;
  const cmp = solveCompareWords(text);
  if (cmp) return cmp;
  // "Is 2x + 3 = 5 when x = 1?"
  let m = text.replace(/\?/g, '').match(/^(?:is|does|check\s+(?:if|whether))\s+(.+?)\s+(?:when|if|for|at)\s+([a-z])\s*=\s*([^,]+)$/i);
  if (m) {
    const r = solveRelation(m[1].replace(/\s+hold$/i, ''), { allowEquation: true });
    const node = pm(m[3]);
    if (node && !S.variables(node).size) {
      const val = S.tex(node);
      const sub = normaliseRelations(m[1]).replace(new RegExp(`(?<![a-z\\\\])${m[2]}(?![a-z])`, 'g'), `(${m[3]})`);
      const c = solveRelation(sub);
      if (c) { c.steps.unshift({ label: `Substitute ${m[2]} = ${val}:`, katex: '' }); c.answer = c.answer.replace('True', 'Yes').replace('False', 'No'); c.steps[c.steps.length - 1].katex = c.steps[c.steps.length - 1].katex.replace('TRUE', 'YES').replace('FALSE', 'NO'); return c; }
    }
    if (r) return r;
  }
  // quantifiers: "x^2 + 1 > 0 for all x", "there is an x with ..."
  let quant = null, body = text;
  if (/\bfor\s+(all|every|each|any)\b/i.test(text)) { quant = 'all'; }
  else if (/\b(there\s+(is|exists)|for\s+some)\b/i.test(text)) { quant = 'some'; body = text.replace(/^.*?\b(?:there\s+(?:is|exists)\s+(?:an?\s+)?(?:real\s+)?(?:number\s+)?[a-z]?\s*(?:such\s+that|with|where|for\s+which)?|for\s+some\s+(?:real\s+)?[a-z])\s*/i, ''); }
  const tfPrefix = /^\s*(?:true\s+or\s+false|t\s*\/\s*f|is\s+it\s+true\s+that)\b/i.test(text);
  // "Is 2^10 greater than 1000?"  "Is π > 3.14?"
  let rel = text;
  if (/^\s*(?:is|are|does|check\s+(?:if|whether))\b/i.test(text) || tfPrefix) {
    const inner = text.replace(/^\s*(?:true\s+or\s+false|t\s*\/\s*f|is\s+it\s+true\s+that)\s*[:,\-]?\s*/i, '').replace(/^\s*(?:is|are|does|check\s+(?:if|whether))\s+/i, '').replace(/\?\s*$/, '');
    rel = /[<>≤≥≠=]|\\(?:le|ge|ne|lt|gt)/.test(normaliseRelations(inner)) ? inner : (wordsToSymbols(inner) || inner);
  } else if (!/[<>≤≥≠=]|\\(?:le|ge|ne|lt|gt|leq|geq|neq)(?![a-z])/.test(text)) {
    const w = wordsToSymbols(text.replace(/\?\s*$/, ''));
    if (!w) return null;
    rel = w;
  }
  if (quant === 'some') rel = body;
  const r = solveRelation(rel, { quantifier: quant });
  if (r && /^\s*(?:is|are|does|do)\b/i.test(text) && !tfPrefix && /^\\text\{(True|False)\}$/.test(r.answer)) {
    const yes = /True/.test(r.answer);
    r.answer = `\\text{${yes ? 'Yes' : 'No'}}`;
    const last = r.steps[r.steps.length - 1];
    last.katex = `\\mathbf{\\text{${yes ? 'Yes' : 'No'}}}`;
  }
  if (r && (tfPrefix || /^\s*(?:is|are)\b/i.test(text)) && !quant && /True|False/.test(r.answer) === false && r.solution) {
    // "Is x^2 - 1 > 0?" asks whether it always holds
    const all = r.solution.kind === 'all';
    r.steps.push({ label: all ? 'It holds for every real value.' : 'It does not hold for every value (see the solution set).', katex: '' });
  }
  return r;
}

module.exports = { solveComparisonQuestion, solveRelation, normaliseRelations, recurringToFraction, splitRelations, realRoots };
