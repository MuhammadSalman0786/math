// Extra integration methods used by symbolic.integrate when the basic table does not apply:
// u-substitution, partial fractions, powers of sin/cos, products of sin/cos, inverse trig by parts,
// completing the square. Every result is checked by differentiating before it is returned.
const P = require('./polynomial');
const { Q } = require('./rational');

let S = null; // symbolic.js (loaded lazily: it requires this file)
const q = (a, b = 1n) => new Q(BigInt(a), BigInt(b));

function checkAnti(F, f, x) {
  if (!S) S = require('./symbolic');
  try {
    const dF = S.derivative(F, x);
    let good = 0;
    // extra small points for functions defined only near 0 (e.g. 1/sqrt(1 - 4x^2))
    for (const v of [0.31, 0.77, 1.43, 2.19, -0.57, 3.7, 0.13, -0.21, 0.07, 0.42, -0.37]) {
      const A = S.evaluate(dF, { [x]: v }), B = S.evaluate(f, { [x]: v });
      if (!Number.isFinite(A) || !Number.isFinite(B)) continue;
      if (Math.abs(A - B) > 1e-7 * Math.max(1, Math.abs(B))) return false;
      good++;
    }
    return good >= 3;
  } catch (e) { return false; }
}

// replace every occurrence of sub-expression `target` in n by variable u
function replaceSub(n, target, u) {
  const k = S.key(target);
  const rec = (m) => {
    if (S.key(m) === k) return S.vr(u);
    switch (m.t) {
      case 'sum': return S.sum(...m.terms.map(rec));
      case 'prod': return S.prod(...m.factors.map(rec));
      case 'pow': return S.pow(rec(m.base), rec(m.exp));
      case 'fn': return S.fn(m.f, rec(m.arg));
    }
    return m;
  };
  return rec(n);
}

function candidates(n, x, out = []) {
  if (S.freeOf(n, x)) return out;
  if (n.t === 'fn') { out.push(n.arg); out.push(n); candidates(n.arg, x, out); }
  else if (n.t === 'pow') {
    if (!S.freeOf(n.base, x) && n.base.t !== 'var') out.push(n.base);
    if (!S.freeOf(n.exp, x)) out.push(n.exp);
    candidates(n.base, x, out); candidates(n.exp, x, out);
  } else if (n.t === 'sum' || n.t === 'prod') (n.terms || n.factors).forEach(c => candidates(c, x, out));
  return out;
}

// ∫ f(g(x)) g'(x) dx = ∫ f(u) du
function bySubstitution(n, x, steps, integ, depth) {
  if (depth > 2) return null;
  const seen = new Set();
  for (const g of candidates(n, x)) {
    const k = S.key(g);
    if (seen.has(k) || (g.t === 'var')) continue;
    seen.add(k);
    let dg;
    try { dg = S.derivative(g, x); } catch (e) { continue; }
    if (S.freeOf(dg, x) && S.linearIn(g, x)) continue; // linear inner functions are handled by the table
    const ratio = S.simplify(S.prod(n, S.pow(dg, -1)));
    const inU = S.simplify(replaceSub(ratio, g, 'u'));
    if (!S.freeOf(inU, x)) continue;
    const sub = [];
    const Fu = integ(inU, 'u', sub, depth + 1);
    if (!Fu) continue;
    const F = S.simplify(S.substitute(S.simplify(Fu), 'u', g));
    if (!checkAnti(F, n, x)) continue;
    steps.push({ label: `Substitution: let $u = ${S.tex(g)}$, so $du = ${S.tex(dg)}\\,d${x}$. The integral becomes:`, katex: `\\int ${S.tex(inU)}\\,du = ${S.tex(S.simplify(Fu))} + C` });
    steps.push({ label: 'Substitute back $u$:', katex: `${S.tex(F)} + C` });
    return F;
  }
  return null;
}

// ---- rational functions ----
function toRat(n, x) {
  if (!S) S = require('./symbolic');
  n = S.simplify(n);
  if (S.freeOf(n, x)) return n.t === 'num' ? { N: [n.v], D: [q(1)] } : null;
  if (n.t === 'var') return n.n === x ? { N: [q(0), q(1)], D: [q(1)] } : null;
  if (n.t === 'sum') {
    let acc = { N: [q(0)], D: [q(1)] };
    for (const t of n.terms) {
      const r = toRat(t, x); if (!r) return null;
      acc = { N: P.add(P.mul(acc.N, r.D), P.mul(r.N, acc.D)), D: P.mul(acc.D, r.D) };
    }
    return acc;
  }
  if (n.t === 'prod') {
    let acc = { N: [q(1)], D: [q(1)] };
    for (const f of n.factors) {
      const r = toRat(f, x); if (!r) return null;
      acc = { N: P.mul(acc.N, r.N), D: P.mul(acc.D, r.D) };
    }
    return acc;
  }
  if (n.t === 'pow' && n.exp.t === 'num' && n.exp.v.isInteger()) {
    const r = toRat(n.base, x); if (!r) return null;
    const k = Number(n.exp.v.n);
    if (Math.abs(k) > 12) return null;
    const N = P.pow(r.N, Math.abs(k)), D = P.pow(r.D, Math.abs(k));
    return k >= 0 ? { N, D } : { N: D, D: N };
  }
  return null;
}

function pdiv(a, b) {
  a = P.trim(a); b = P.trim(b);
  const out = Array(Math.max(1, a.length - b.length + 1)).fill(q(0));
  let r = a.slice();
  while (P.degree(r) >= P.degree(b) && !P.isZeroPoly(r)) {
    const shift = P.degree(r) - P.degree(b);
    const c = r[r.length - 1].div(b[b.length - 1]);
    out[shift] = out[shift].add(c);
    r = P.trim(P.sub(r, Array(shift).fill(q(0)).concat(b.map(v => v.mul(c)))));
  }
  return { quo: P.trim(out), rem: r };
}

// Gaussian elimination over Q; returns solution array or null
function solveLinear(M, rhs) {
  const n = rhs.length, m = M[0].length;
  const A = M.map((row, i) => [...row, rhs[i]]);
  const piv = [];
  let r = 0;
  for (let c = 0; c < m && r < n; c++) {
    let p = -1;
    for (let i = r; i < n; i++) if (!A[i][c].isZero()) { p = i; break; }
    if (p < 0) continue;
    [A[r], A[p]] = [A[p], A[r]];
    const inv = q(1).div(A[r][c]);
    A[r] = A[r].map(v => v.mul(inv));
    for (let i = 0; i < n; i++) if (i !== r && !A[i][c].isZero()) { const f = A[i][c]; A[i] = A[i].map((v, j) => v.sub(f.mul(A[r][j]))); }
    piv.push(c); r++;
  }
  if (piv.length < m) return null;
  for (let i = r; i < n; i++) if (!A[i][m].isZero()) return null;
  const sol = Array(m).fill(q(0));
  piv.forEach((c, i) => { sol[c] = A[i][m]; });
  return sol;
}

function polyNode(p, x) { return S.fromPoly(P.trim(p), x); }

function byPartialFractions(n, x, steps) {
  const r = toRat(n, x);
  if (!r || P.degree(r.D) < 1) return null;
  let { quo, rem } = pdiv(r.N, r.D);
  const D = r.D;
  const f = P.factor(D);
  // group equal factors
  const groups = [];
  for (const fac of f.factors) {
    const mon = P.scale(fac, q(1).div(fac[fac.length - 1]));
    const g = groups.find(G => P.equal(G.p, mon));
    if (g) g.k++; else groups.push({ p: mon, k: 1 });
  }
  if (groups.some(g => P.degree(g.p) > 2)) return null;
  for (const g of groups) if (P.degree(g.p) === 2) { const [c, b, a] = g.p; if (!b.mul(b).sub(q(4).mul(a).mul(c)).isNegative()) return null; if (g.k > 1) return null; }
  // unknowns: for linear (x-r)^j  A_j ; for quadratic  (Bx + C)
  const basis = []; // polynomials multiplying each unknown such that sum = rem
  const terms = []; // descriptors
  const lead = f.constant.mul(f.factors.reduce((acc, fac) => acc.mul(fac[fac.length - 1]), q(1)));
  const Dmon = P.scale(D, q(1).div(D[D.length - 1]));
  for (const g of groups) {
    for (let j = 1; j <= g.k; j++) {
      const other = pdiv(Dmon, P.pow(g.p, j)).quo;
      if (P.degree(g.p) === 1) { basis.push(other); terms.push({ g, j, kind: 'A' }); }
      else { basis.push(P.mul(other, [q(0), q(1)])); terms.push({ g, j, kind: 'B' }); basis.push(other); terms.push({ g, j, kind: 'C' }); }
    }
  }
  const remMon = P.scale(rem, q(1).div(D[D.length - 1]));
  const deg = P.degree(Dmon);
  const M = [], rhs = [];
  for (let i = 0; i < deg; i++) { M.push(basis.map(b => b[i] || q(0))); rhs.push(remMon[i] || q(0)); }
  const sol = solveLinear(M, rhs);
  if (!sol) return null;
  void lead;
  const pieces = [];
  const decomp = [];
  if (!P.isZeroPoly(quo)) {
    const qn = polyNode(quo, x);
    pieces.push(S.integrate(qn, x).result);
    decomp.push(S.tex(S.simplify(qn)));
  }
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i], c = sol[i];
    const base = polyNode(t.g.p, x);
    if (t.kind === 'A') {
      if (c.isZero()) continue;
      decomp.push(S.tex(S.simplify(S.prod(S.num(c), S.pow(base, -t.j)))));
      if (t.j === 1) pieces.push(S.prod(S.num(c), S.fn('ln', S.fn('abs', base))));
      else pieces.push(S.prod(S.num(c.div(q(1 - t.j))), S.pow(base, 1 - t.j)));
    } else if (t.kind === 'B') {
      const B = c, C = sol[i + 1];
      i++;
      if (B.isZero() && C.isZero()) continue;
      decomp.push(S.tex(S.simplify(S.prod(S.sum(S.prod(S.num(B), S.vr(x)), S.num(C)), S.pow(base, -1)))));
      // x^2 + p x + s  ->  (x + p/2)^2 + k^2
      const [s0, p1] = t.g.p;
      const h = p1.div(q(2));
      const k2 = s0.sub(h.mul(h));
      // Bx + C = (B/2)(2x + p) + (C - B p/2)
      if (!B.isZero()) pieces.push(S.prod(S.num(B.div(q(2))), S.fn('ln', base)));
      const rest = C.sub(B.mul(h));
      if (!rest.isZero()) {
        const k = S.simplify(S.pow(S.num(k2), S.num(q(1, 2))));
        pieces.push(S.prod(S.num(rest), S.pow(k, -1), S.fn('arctan', S.prod(S.sum(S.vr(x), S.num(h)), S.pow(k, -1)))));
      }
    }
  }
  if (!pieces.length) return null;
  const F = S.simplify(S.sum(...pieces));
  if (!checkAnti(F, n, x)) return null;
  if (decomp.length > 1 || groups.length > 1) steps.push({ label: 'Partial fractions: split the fraction into simple parts, then integrate each part:', katex: `${S.tex(n)} = ${decomp.join(' + ').replace(/\+ -/g, '- ')}` });
  else steps.push({ label: 'Complete the square in the denominator and use $\\int \\frac{du}{u^2 + k^2} = \\frac{1}{k}\\arctan\\frac{u}{k}$ (and $\\int \\frac{u\'}{u} = \\ln|u|$):', katex: '' });
  return F;
}

// ---- trig powers sin^m(ax) cos^n(ax) ----
function trigParts(n, x) {
  const fs = n.t === 'prod' ? n.factors : [n];
  let m = 0, k = 0, arg = null;
  for (const f of fs) {
    let fn = f, e = 1;
    if (f.t === 'pow' && f.exp.t === 'num' && f.exp.v.isInteger() && !f.exp.v.isNegative()) { fn = f.base; e = Number(f.exp.v.n); }
    if (fn.t !== 'fn' || (fn.f !== 'sin' && fn.f !== 'cos')) return null;
    if (arg && S.key(arg) !== S.key(fn.arg)) return null;
    arg = fn.arg;
    if (fn.f === 'sin') m += e; else k += e;
  }
  const L = arg && S.linearIn(arg, x);
  if (!L) return null;
  return { m, k, arg, a: L.a };
}

function byTrigPowers(n, x, steps) {
  const t = trigParts(n, x);
  if (!t || t.m + t.k < 2 || t.m + t.k > 12) return null;
  const { m, k, arg, a } = t;
  const u = 'u';
  let F = null, label = '';
  if (m % 2 === 1 || k % 2 === 1) {
    // odd power of sin: u = cos;   odd power of cos: u = sin
    const oddSin = m % 2 === 1;
    const odd = oddSin ? m : k, other = oddSin ? k : m;
    // (1-u^2)^((odd-1)/2) u^other du  * (oddSin ? -1 : 1)/a
    let poly = P.mul(P.pow([q(1), q(0), q(-1)], (odd - 1) / 2), Array(other).fill(q(0)).concat([q(1)]));
    const integ = poly.map((c, i) => c.div(q(i + 1)));
    const sgn = oddSin ? q(-1) : q(1);
    const U = S.fn(oddSin ? 'cos' : 'sin', arg);
    const terms = integ.map((c, i) => c.isZero() ? null : S.prod(S.num(c.mul(sgn).div(a)), S.pow(U, i + 1))).filter(Boolean);
    F = S.sum(...terms);
    label = oddSin
      ? `Odd power of sine: keep one $\\sin$, write the rest with $\\sin^2 = 1 - \\cos^2$, then substitute $u = \\cos(${S.tex(arg)})$:`
      : `Odd power of cosine: keep one $\\cos$, write the rest with $\\cos^2 = 1 - \\sin^2$, then substitute $u = \\sin(${S.tex(arg)})$:`;
    void u;
  } else {
    // both even: power-reduction formulas, expand and integrate term by term
    const two = S.prod(S.num(2), arg);
    const s2 = S.prod(S.num(q(1, 2)), S.sum(S.num(1), S.neg(S.fn('cos', two))));
    const c2 = S.prod(S.num(q(1, 2)), S.sum(S.num(1), S.fn('cos', two)));
    const ex = S.expand(S.prod(S.pow(s2, m / 2), S.pow(c2, k / 2)));
    const r = S.integrate(ex, x);
    if (!r) return null;
    F = r.result;
    label = 'Even powers: use $\\sin^2\\theta = \\frac{1 - \\cos 2\\theta}{2}$ and $\\cos^2\\theta = \\frac{1 + \\cos 2\\theta}{2}$, expand, and integrate term by term:';
  }
  F = S.simplify(F);
  if (!checkAnti(F, n, x)) return null;
  steps.push({ label, katex: `\\int ${S.tex(n)}\\,d${x} = ${S.tex(F)} + C` });
  return F;
}

// sin(ax) cos(bx), sin sin, cos cos with a != b
function byProductToSum(n, x, steps) {
  if (n.t !== 'prod' || n.factors.length !== 2) return null;
  const [f, g] = n.factors;
  if (f.t !== 'fn' || g.t !== 'fn' || !['sin', 'cos'].includes(f.f) || !['sin', 'cos'].includes(g.f)) return null;
  const A = S.linearIn(f.arg, x), B = S.linearIn(g.arg, x);
  if (!A || !B || S.key(f.arg) === S.key(g.arg)) return null;
  const sumA = S.simplify(S.sum(f.arg, g.arg)), difA = S.simplify(S.sum(f.arg, S.neg(g.arg)));
  let ex, rule;
  const h = S.num(q(1, 2));
  if (f.f === 'sin' && g.f === 'cos') { ex = S.prod(h, S.sum(S.fn('sin', sumA), S.fn('sin', difA))); rule = '\\sin A\\cos B = \\tfrac12[\\sin(A+B) + \\sin(A-B)]'; }
  else if (f.f === 'cos' && g.f === 'sin') { ex = S.prod(h, S.sum(S.fn('sin', sumA), S.neg(S.fn('sin', difA)))); rule = '\\cos A\\sin B = \\tfrac12[\\sin(A+B) - \\sin(A-B)]'; }
  else if (f.f === 'sin') { ex = S.prod(h, S.sum(S.fn('cos', difA), S.neg(S.fn('cos', sumA)))); rule = '\\sin A\\sin B = \\tfrac12[\\cos(A-B) - \\cos(A+B)]'; }
  else { ex = S.prod(h, S.sum(S.fn('cos', difA), S.fn('cos', sumA))); rule = '\\cos A\\cos B = \\tfrac12[\\cos(A-B) + \\cos(A+B)]'; }
  const r = S.integrate(S.expand(ex), x);
  if (!r || !checkAnti(r.result, n, x)) return null;
  steps.push({ label: `Product-to-sum identity: $${rule}$`, katex: `${S.tex(n)} = ${S.tex(S.simplify(ex))}` });
  return r.result;
}

// ∫ arctan(ax), arcsin(ax), arccos(ax) (times a constant) by parts
function byInverseTrigParts(n, x, steps) {
  if (n.t !== 'fn' || !['arctan', 'arcsin', 'arccos'].includes(n.f)) return null;
  const L = S.linearIn(n.arg, x);
  if (!L || !L.b.isZero()) return null;
  const a = L.a, u = n.arg; // u = a x
  let F;
  if (n.f === 'arctan') F = S.sum(S.prod(S.vr(x), n), S.neg(S.prod(S.num(q(1).div(a.mul(q(2)))), S.fn('ln', S.sum(S.num(1), S.pow(u, 2))))));
  else {
    const root = S.pow(S.sum(S.num(1), S.neg(S.pow(u, 2))), S.num(q(1, 2)));
    F = S.sum(S.prod(S.vr(x), n), S.prod(S.num((n.f === 'arcsin' ? q(1) : q(-1)).div(a)), root));
  }
  F = S.simplify(F);
  if (!checkAnti(F, n, x)) return null;
  steps.push({ label: `Integration by parts with $u = ${S.tex(n)}$ and $dv = d${x}$: $\\int u\\,dv = uv - \\int v\\,du$.`, katex: `= ${S.tex(F)} + C` });
  return F;
}

// 1/sqrt(x^2 + a^2)  and  1/sqrt(x^2 - a^2)
function byInverseHyperbolic(n, x, steps) {
  if (n.t !== 'pow' || n.exp.t !== 'num' || !n.exp.v.equals(q(-1, 2))) return null;
  const p = S.toPoly(n.base, x);
  if (!p || P.degree(p) !== 2 || !p[1].isZero() || !p[2].equals(1) || p[0].isZero()) return null;
  const F = S.fn('ln', S.fn('abs', S.sum(S.vr(x), S.pow(n.base, S.num(q(1, 2))))));
  if (!checkAnti(F, n, x)) return null;
  steps.push({ label: 'Standard result $\\int \\frac{dx}{\\sqrt{x^2 \\pm a^2}} = \\ln\\left|x + \\sqrt{x^2 \\pm a^2}\\right| + C$:', katex: '' });
  return F;
}

// tan^2 = sec^2 - 1, cot^2 = csc^2 - 1
function byPythagorean(n, x, steps) {
  if (n.t !== 'pow' || n.base.t !== 'fn' || !['tan', 'cot'].includes(n.base.f) || !n.exp.t === 'num' || !n.exp.v || !n.exp.v.equals(2)) return null;
  const u = n.base.arg;
  const ex = n.base.f === 'tan' ? S.sum(S.pow(S.fn('sec', u), 2), S.num(-1)) : S.sum(S.pow(S.fn('csc', u), 2), S.num(-1));
  const r = S.integrate(ex, x);
  if (!r || !checkAnti(r.result, n, x)) return null;
  steps.push({ label: `Use $${n.base.f === 'tan' ? '\\tan^2 = \\sec^2 - 1' : '\\cot^2 = \\csc^2 - 1'}$:`, katex: `\\int ${S.tex(ex)}\\,d${x}` });
  return r.result;
}

// sqrt(c - b x^2), sqrt(b x^2 + c), 1/sqrt(c - b x^2)   (b, c > 0)
function bySqrtQuadratic(n, x, steps) {
  if (n.t !== 'pow' || n.exp.t !== 'num') return null;
  const half = n.exp.v.equals(q(1, 2)), mhalf = n.exp.v.equals(q(-1, 2));
  if (!half && !mhalf) return null;
  const p = S.toPoly(n.base, x);
  if (!p || P.degree(p) !== 2 || !p[1].isZero() || p[0].isZero()) return null;
  const c = p[0], b2 = p[2];
  const root = (v) => S.simplify(S.pow(S.num(v), S.num(q(1, 2))));
  const X = S.vr(x), R = n.base;
  let F, label;
  if (b2.isNegative() && !c.isNegative()) {
    const b = b2.neg(), sb = root(b), sc = root(c);
    const arc = S.fn('arcsin', S.simplify(S.prod(sb, X, S.pow(sc, -1))));
    if (mhalf) { F = S.prod(S.pow(sb, -1), arc); label = 'Standard result $\\int \\frac{dx}{\\sqrt{a^2 - u^2}} = \\arcsin\\frac{u}{a} + C$:'; }
    else {
      F = S.sum(S.prod(S.num(q(1, 2)), X, S.pow(R, S.num(q(1, 2)))), S.prod(S.num(c.div(q(2))), S.pow(sb, -1), arc));
      label = 'Trigonometric substitution $x = a\\sin\\theta$ gives the standard result $\\int \\sqrt{a^2 - x^2}\\,dx = \\frac{x}{2}\\sqrt{a^2 - x^2} + \\frac{a^2}{2}\\arcsin\\frac{x}{a} + C$:';
    }
  } else if (!b2.isNegative() && !c.isNegative() && half) {
    const sb = root(b2);
    F = S.sum(S.prod(S.num(q(1, 2)), X, S.pow(R, S.num(q(1, 2)))), S.prod(S.num(c.div(q(2))), S.pow(sb, -1), S.fn('ln', S.sum(S.prod(sb, X), S.pow(R, S.num(q(1, 2)))))));
    label = 'Hyperbolic substitution gives the standard result $\\int \\sqrt{x^2 + a^2}\\,dx = \\frac{x}{2}\\sqrt{x^2 + a^2} + \\frac{a^2}{2}\\ln\\left(x + \\sqrt{x^2 + a^2}\\right) + C$:';
  } else return null;
  F = S.simplify(F);
  if (!checkAnti(F, n, x)) return null;
  steps.push({ label, katex: `\\int ${S.tex(n)}\\,d${x} = ${S.tex(F)} + C` });
  return F;
}

// one radical sqrt(a x + b): substitute u = sqrt(a x + b), x = (u^2 - b)/a, dx = (2u/a) du -> rational in u
function byRootSubstitution(n, x, steps, integ, depth) {
  if (depth > 1) return null;
  let base = null;
  const find = (m) => {
    if (!m || base === false) return;
    if (m.t === 'pow' && m.exp.t === 'num' && !m.exp.v.isInteger() && m.exp.v.mul(q(2)).isInteger() && !S.freeOf(m.base, x)) {
      const L = S.linearIn(m.base, x);
      if (!L || L.a.isZero()) { base = false; return; }
      if (base && S.key(base) !== S.key(m.base)) { base = false; return; }
      base = m.base; return;
    }
    (m.terms || m.factors || []).forEach(find);
    if (m.t === 'pow') { find(m.base); find(m.exp); }
    if (m.t === 'fn') find(m.arg);
  };
  find(n);
  if (!base) return null;
  const L = S.linearIn(base, x), a = L.a, b = L.b;
  const U = S.vr('u');
  const xOfU = S.simplify(S.prod(S.sum(S.pow(U, 2), S.num(b.neg())), S.num(q(1).div(a))));
  const rec = (m) => {
    if (m.t === 'pow' && S.key(m.base) === S.key(base) && m.exp.t === 'num') return S.pow(U, S.num(m.exp.v.mul(q(2))));
    if (m.t === 'var' && m.n === x) return xOfU;
    if (m.t === 'sum') return S.sum(...m.terms.map(rec));
    if (m.t === 'prod') return S.prod(...m.factors.map(rec));
    if (m.t === 'pow') return S.pow(rec(m.base), rec(m.exp));
    if (m.t === 'fn') return S.fn(m.f, rec(m.arg));
    return m;
  };
  const inU = S.simplify(S.prod(rec(n), S.num(q(2).div(a)), U));
  if (!S.freeOf(inU, x) || !toRat(inU, 'u')) return null;
  const sub = [];
  const Fu = integ(inU, 'u', sub, depth + 1);
  if (!Fu) return null;
  const F = S.simplify(S.substitute(S.simplify(Fu), 'u', S.pow(base, S.num(q(1, 2)))));
  if (!checkAnti(F, n, x)) return null;
  steps.push({ label: `Substitution: let $u = \\sqrt{${S.tex(base)}}$, so $${x} = ${S.tex(xOfU)}$ and $d${x} = ${S.tex(S.simplify(S.prod(S.num(q(2).div(a)), U)))}\\,du$. The integral becomes a rational one:`, katex: `\\int ${S.tex(inU)}\\,du = ${S.tex(S.simplify(Fu))} + C` });
  steps.push({ label: 'Substitute back $u$:', katex: `${S.tex(F)} + C` });
  return F;
}

// x appears only inside e^{kx}: substitute u = e^{gx}, dx = du/(g u) -> rational in u
function byExpSubstitution(n, x, steps, integ, depth) {
  if (depth > 1) return null;
  const E = S.key(S.cst('e'));
  const ks = []; let bad = false;
  const scan = (m) => {
    if (bad || S.freeOf(m, x)) return;
    if (m.t === 'pow' && m.base.t === 'const' && S.key(m.base) === E) {
      const L = S.linearIn(m.exp, x);
      if (!L || !L.b.isZero() || L.a.isZero()) { bad = true; return; }
      ks.push(L.a); return;
    }
    if (m.t === 'var') { bad = true; return; }
    if (m.t === 'fn') { bad = true; return; }
    (m.terms || m.factors || []).forEach(scan);
    if (m.t === 'pow') { scan(m.base); if (!S.freeOf(m.exp, x)) bad = true; }
  };
  scan(n);
  if (bad || !ks.length) return null;
  // g = gcd of the coefficients (rationals): use the smallest |k| that divides all of them
  let g = ks.reduce((acc, k) => (k.abs().lt ? (k.abs().lt(acc) ? k.abs() : acc) : acc), ks[0].abs());
  if (!ks.every(k => k.div(g).isInteger())) return null;
  const U = S.vr('u');
  const rec = (m) => {
    if (m.t === 'pow' && m.base.t === 'const' && S.key(m.base) === E && !S.freeOf(m.exp, x)) return S.pow(U, S.num(S.linearIn(m.exp, x).a.div(g)));
    if (m.t === 'sum') return S.sum(...m.terms.map(rec));
    if (m.t === 'prod') return S.prod(...m.factors.map(rec));
    if (m.t === 'pow') return S.pow(rec(m.base), m.exp);
    return m;
  };
  const inU = S.simplify(S.prod(rec(n), S.pow(S.prod(S.num(g), U), -1)));
  if (!S.freeOf(inU, x) || !toRat(inU, 'u')) return null;
  const sub = [];
  const Fu = integ(inU, 'u', sub, depth + 1);
  if (!Fu) return null;
  const eg = S.pow(S.cst('e'), S.simplify(S.prod(S.num(g), S.vr(x))));
  const F = S.simplify(S.substitute(S.simplify(Fu), 'u', eg));
  if (!checkAnti(F, n, x)) return null;
  steps.push({ label: `Substitution: let $u = ${S.tex(eg)}$, so $d${x} = \\frac{du}{${S.tex(S.simplify(S.prod(S.num(g), U)))}}$. The integral becomes a rational one:`, katex: `\\int ${S.tex(inU)}\\,du = ${S.tex(S.simplify(Fu))} + C` });
  steps.push({ label: 'Substitute back $u$:', katex: `${S.tex(F)} + C` });
  return F;
}

// polynomial times arctan / arcsin / arccos / ln: by parts with u = the function, dv = polynomial
function byPolyTimesFunction(n, x, steps, integ, depth) {
  if (depth > 1 || n.t !== 'prod') return null;
  const fnIdx = n.factors.findIndex(f => f.t === 'fn' && ['arctan', 'arcsin', 'arccos', 'ln'].includes(f.f) && !S.freeOf(f, x));
  if (fnIdx < 0) return null;
  const f = n.factors[fnIdx];
  const rest = S.simplify(S.prod(...n.factors.filter((_, i) => i !== fnIdx)));
  const p = S.toPoly(rest, x);
  if (!p || P.degree(p) < 1) return null;
  const vPoly = [q(0)].concat(p.map((c, i) => c.div(q(i + 1))));
  const v = polyNode(vPoly, x);
  const du = S.derivative(f, x);
  const second = S.simplify(S.prod(v, du));
  const sub = [];
  const G = integ(second, x, sub, depth + 1);
  if (!G) return null;
  const F = S.simplify(S.sum(S.prod(v, f), S.neg(G)));
  if (!checkAnti(F, n, x)) return null;
  steps.push({ label: `Integration by parts with $u = ${S.tex(f)}$ and $dv = ${S.tex(rest)}\\,d${x}$, so $v = ${S.tex(v)}$: $\\int u\\,dv = uv - \\int v\\,du$.`, katex: `= ${S.tex(S.prod(v, f))} - \\int ${S.tex(second)}\\,d${x}` });
  steps.push({ label: 'Integrate the remaining part and combine:', katex: `${S.tex(F)} + C` });
  return F;
}

function integAdvanced(n, x, steps, integ, depth = 0) {
  if (!S) S = require('./symbolic');
  for (const t of [byRootSubstitution, byExpSubstitution, byPolyTimesFunction]) {
    const sub = [];
    let r = null;
    try { r = t(n, x, sub, integ, depth); } catch (e) { r = null; }
    if (r) { steps.push(...sub); return r; }
  }
  const tries = [bySqrtQuadratic, byPythagorean, byTrigPowers, byProductToSum, byInverseTrigParts, byInverseHyperbolic, byPartialFractions];
  for (const t of tries) {
    const sub = [];
    let r = null;
    try { r = t(n, x, sub); } catch (e) { r = null; }
    if (r) { steps.push(...sub); return r; }
  }
  const sub = [];
  let r = null;
  try { r = bySubstitution(n, x, sub, integ, depth); } catch (e) { r = null; }
  if (r) { steps.push(...sub); return r; }
  return null;
}

module.exports = { integAdvanced, checkAnti, solveLinear, toRat, pdiv };
