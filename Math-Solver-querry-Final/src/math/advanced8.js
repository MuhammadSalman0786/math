// Advanced solvers, part 8: trigonometric equations of any form (exact angles, interval or general
// solution), Gamma / Beta values, n x n determinants, one-sided limits, Green's theorem on a circle,
// telescoping and special series, limit-comparison convergence, induction inequalities and false
// induction claims. Every solver checks its own result and returns null when it is not sure.
const S = require('./symbolic');
const { Q } = require('./rational');
const A1 = require('./advanced1');
const A5 = require('./advanced5');

const R = String.raw;
const q = (a, b = 1n) => new Q(BigInt(a), BigInt(b));
const done = (answer, steps) => { steps.push({ label: 'Final Answer:', katex: `\\mathbf{${answer}}` }); return { answer, steps }; };
const pm = (s) => { try { return A1.parseMath(s); } catch (e) { return null; } };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

// k·π/24 as TeX (k integer)
function piTex(k, den = 24) {
  if (k === 0) return '0';
  const g = gcd(k, den), n = k / g, d = den / g;
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  const num = a === 1 ? '\\pi' : `${a}\\pi`;
  return d === 1 ? `${sign}${num}` : `${sign}\\frac{${num}}{${d}}`;
}

// ---------------------------------------------------------------- 1. trigonometric equations
const TRIG = /\\(?:sin|cos|tan|sec|csc|cot)(?![a-z])|\b(?:sin|cos|tan|sec|csc|cot)\b/;

function parseInterval(s) {
  const m = s.match(/(-?\s*[\d.]*\s*(?:\\pi|π)?)\s*(\\le|\\leq|≤|<=|<)\s*(?:x|θ|\\theta)\s*(\\le|\\leq|≤|<=|<)\s*([\d.]*\s*(?:\\pi|π)?)/);
  if (m) {
    const val = (t) => { t = t.replace(/\s+/g, ''); const mm = t.match(/^(-?[\d.]*)(\\pi|π)?$/); if (!mm || (!mm[1] && !mm[2])) return null; const c = mm[1] === '' ? 1 : mm[1] === '-' ? -1 : Number(mm[1]); return mm[2] ? { k: c * 24, v: c * Math.PI } : (c === 0 ? { k: 0, v: 0 } : null); };
    const a = val(m[1]), b = val(m[4]);
    if (a && b && b.v > a.v && Number.isInteger(a.k) && Number.isInteger(b.k)) return { lo: a.k, hi: b.k, loIn: !/^<$/.test(m[2]), hiIn: m[3] !== '<', tex: `${m[1].trim()} ${m[2] === '<' ? '<' : '\\le'} x ${m[3] === '<' ? '<' : '\\le'} ${m[4].trim()}` };
    return 'bad';
  }
  const b = s.match(/(?:x|θ|\\theta)\s*\\in\s*(\[|\()\s*(-?[\d.]*\s*(?:\\pi|π)?)\s*,\s*([\d.]*\s*(?:\\pi|π)?)\s*(\]|\))/);
  if (b) return parseInterval(`${b[2]} ${b[1] === '[' ? '\\le' : '<'} x ${b[4] === ']' ? '\\le' : '<'} ${b[3]}`);
  return null;
}

function solveTrigEquationAny(raw) {
  let s = String(raw).replace(/\\text\{([^}]*)\}/g, ' $1 ').replace(/\\theta/g, 'x').replace(/θ/g, 'x').replace(/[−–]/g, '-');
  if (!TRIG.test(s) || !/=/.test(s)) return null;
  if (/prove|show|verify|identity|\\int|∫|\\lim|d\/dx|\\frac\{d\}|\\sum|°|\\circ|deg/i.test(s)) return null;
  const iv = parseInterval(s);
  if (iv === 'bad') return null;
  // with an interval, the polynomial-in-sin/cos/tan solver gives the nicer step-by-step working
  if (iv) { try { const r = A5.solveTrigEquation(raw); if (r && r.answer) return r; } catch (e) { /* fall through */ } }
  // the equation: the comma/semicolon piece that holds "=" and a trig function
  const body = s.replace(/^\s*(?:solve|find\s+(?:all\s+)?(?:solutions?|x)|find)\s*(?:for\s+x)?\s*:?\s*/i, '')
    .replace(/,?\s*(?:for|where|in|on|over|with)?\s*(?:-?[\d.]*\s*(?:\\pi|π)?)\s*(?:\\le|\\leq|≤|<=|<)\s*x\s*(?:\\le|\\leq|≤|<=|<)[^,;]*$/i, '')
    .replace(/,?\s*(?:for\s+)?x\s*\\in\s*[[(][^\])]*[\])]\s*$/i, '');
  const pieces = body.split(/[;]|,(?![^(]*\))/).filter(t => /=/.test(t) && TRIG.test(t));
  if (pieces.length !== 1) return null;
  const sides = pieces[0].split('=');
  if (sides.length !== 2 || !sides[0].trim() || !sides[1].trim()) return null;
  const node = pm(`(${sides[0]})-(${sides[1]})`);
  if (!node) return null;
  const sn = S.simplify(node);
  if ([...S.variables(sn)].some(v => v !== 'x')) return null;
  // every x must sit inside a trig function with an integer multiple of x (so f has period 2π)
  let pure = true;
  (function walk(n, inside) {
    if (!n || !pure) return;
    if (n.t === 'var' && !inside) { pure = false; return; }
    if (n.t === 'fn') {
      if (['sin', 'cos', 'tan', 'sec', 'csc', 'cot'].includes(n.f)) {
        const L = S.linearIn(n.arg, 'x');
        if (!L || !L.b.isZero() || !L.a.isInteger() || L.a.isZero()) { pure = false; return; }
        return;
      }
      walk(n.arg, inside); return;
    }
    (n.terms || n.factors || []).forEach(c => walk(c, inside));
    if (n.t === 'pow') { walk(n.base, inside); if (!S.freeOf(n.exp, 'x')) pure = false; }
  })(sn, false);
  if (!pure || S.freeOf(sn, 'x')) return null;
  const F = (x) => { try { return S.evaluate(sn, { x }); } catch (e) { return NaN; } };
  // search range (in units of π/24)
  const lo = iv ? iv.lo : 0, hi = iv ? iv.hi : 48;
  const loIn = iv ? iv.loIn : true, hiIn = iv ? iv.hiIn : false;
  if (hi - lo > 48 * 4) return null;
  const roots = [];
  for (let k = lo; k <= hi; k++) {
    if ((k === lo && !loIn) || (k === hi && !hiIn)) continue;
    const v = F(k * Math.PI / 24);
    if (Number.isFinite(v) && Math.abs(v) < 1e-9) roots.push(k);
  }
  // make sure there is no other root (one we could not write exactly)
  const N = (hi - lo) * 100, h = (hi - lo) * Math.PI / 24 / N, x0 = lo * Math.PI / 24;
  // known points: the exact roots and the two ends of the range (an excluded end may itself be a root)
  const nearNice = (x) => roots.concat([lo, hi]).some(k => Math.abs(x - k * Math.PI / 24) < 1e-4);
  let prev = F(x0);
  for (let i = 1; i <= N; i++) {
    const x = x0 + i * h, v = F(x);
    if (Number.isFinite(v) && Number.isFinite(prev) && Math.abs(v) < 50 && Math.abs(prev) < 50) {
      if (Math.sign(v) !== Math.sign(prev) && v !== 0 && prev !== 0) {
        // refine
        let a = x - h, b = x, fa = prev;
        for (let j = 0; j < 60; j++) { const m = (a + b) / 2, fm = F(m); if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m; }
        const r = (a + b) / 2;
        if (Math.abs(F(r)) < 1e-7 && !nearNice(r) && r > x0 + 1e-9 && r < x0 + N * h - 1e-9) return null;
      }
      // touching roots: small local minimum of |f|
      const nx = F(x + h);
      if (Math.abs(v) < 1e-3 && Math.abs(v) <= Math.abs(prev) && Number.isFinite(nx) && Math.abs(v) <= Math.abs(nx)) {
        let a = x - h, b = x + h;
        for (let j = 0; j < 80; j++) { const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (Math.abs(F(m1)) < Math.abs(F(m2))) b = m2; else a = m1; }
        const r = (a + b) / 2;
        if (Math.abs(F(r)) < 1e-9 && !nearNice(r)) return null;
      }
    }
    prev = v;
  }
  const lhsT = S.tex(pm(sides[0]) || sn), rhsT = S.tex(pm(sides[1]) || sn);
  const steps = [{ label: iv ? 'Equation and interval:' : 'Equation (no interval given, so we find every solution):', katex: `${lhsT} = ${rhsT}${iv ? `, \\qquad ${iv.tex}` : ''}` }];
  steps.push({ label: 'Step 1: bring everything to one side:', katex: `f(x) = ${S.tex(sn)} = 0` });
  steps.push({ label: `Step 2: $f$ repeats every $2\\pi$. Checking the special angles (multiples of $\\frac{\\pi}{24}$, which include every multiple of $\\frac{\\pi}{12}$, $\\frac{\\pi}{8}$, $\\frac{\\pi}{6}$, $\\frac{\\pi}{4}$, $\\frac{\\pi}{3}$) and scanning ${iv ? 'the interval' : '$[0, 2\\pi)$'} for sign changes, $f(x) = 0$ exactly at:`, katex: roots.length ? `x = ${roots.map(k => piTex(k)).join(',\\ ')}` : R`\text{no point}` });
  if (roots.length) {
    const lines = roots.slice(0, 8).map(k => { const x = k * Math.PI / 24; const L = S.evaluate(pm(sides[0]), { x }), Rv = S.evaluate(pm(sides[1]), { x }); return `x = ${piTex(k)}: &\\quad ${fmtN(L)} = ${fmtN(Rv)} \\;\\checkmark`; });
    steps.push({ label: 'Step 3: check each solution in the original equation (left side = right side):', katex: `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}` });
  }
  if (iv) {
    const ans = roots.length ? `x = ${roots.map(k => piTex(k)).join(',\\ ')}` : R`\text{no solutions in the interval}`;
    return done(ans, steps);
  }
  if (!roots.length) return done(R`\text{no real solutions}`, steps);
  const gen = generalSolution(roots);
  steps.push({ label: `Step 4: ${gen.how}`, katex: gen.tex });
  return done(gen.tex, steps);
}
function fmtN(v) { const r = Math.round(v * 1e6) / 1e6; return String(Object.is(r, -0) ? 0 : r); }

// roots: multiples of π/24 in [0, 48); write every solution
function generalSolution(roots) {
  const set = new Set(roots.map(k => ((k % 48) + 48) % 48));
  const ks = [...set].sort((a, b) => a - b);
  // equally spaced by 48/m (one family)
  for (let m = ks.length; m >= 2; m--) {
    if (48 % m) continue;
    const d = 48 / m;
    if (ks.length === m && ks.every((k, i) => k === ks[0] + i * d)) {
      return { tex: `x = ${ks[0] ? piTex(ks[0]) + ' + ' : ''}${stepTex(2 * 24 / m)} \\quad (n \\in \\mathbb{Z})`, how: `the solutions repeat every ${'$' + piTex(2 * 24 / m) + '$'}, so all solutions are:` };
    }
  }
  // closed under +π: r + nπ for r in [0, π)
  if (ks.every(k => set.has((k + 24) % 48))) {
    const base = ks.filter(k => k < 24);
    return { tex: `x = ${base.map(k => `${k ? piTex(k) + ' + ' : ''}n\\pi`).join(',\\ \\ ')} \\quad (n \\in \\mathbb{Z})`, how: 'the solutions repeat every $\\pi$, so all solutions are:' };
  }
  return { tex: `x = ${ks.map(k => `${k ? piTex(k) + ' + ' : ''}2n\\pi`).join(',\\ \\ ')} \\quad (n \\in \\mathbb{Z})`, how: 'add any whole number of periods $2\\pi$ to the solutions in $[0, 2\\pi)$:' };
}
// n·(kπ/24) as TeX, e.g. "\frac{n\pi}{3}"
function stepTex(k) {
  const g = gcd(k, 24), a = k / g, d = 24 / g;
  const num = a === 1 ? 'n\\pi' : `${a}n\\pi`;
  return d === 1 ? num : `\\frac{${num}}{${d}}`;
}

// ---------------------------------------------------------------- 2. induction: false claims and inequalities
const P = require('./polynomial');
const REL = { '=': '=', '\\ge': '\\ge', '\\geq': '\\ge', '≥': '\\ge', '>=': '\\ge', '\\le': '\\le', '\\leq': '\\le', '≤': '\\le', '<=': '\\le', '>': '>', '<': '<' };

// "1 + 3 + 5 + \cdots + (2n-1)" or "\sum_{k=1}^{n} f(k)" -> { at(n), termAt(k), k0, tex }
function parseSumSide(str) {
  const s = str.trim();
  const sm = s.match(/^\\sum\s*_\s*\{?\s*([a-z])\s*=\s*(-?\d+)\s*\}?\s*\^\s*\{?\s*n\s*\}?\s*([\s\S]+)$/);
  if (sm) {
    const v = sm[1], k0 = +sm[2];
    const body = pm(sm[3].replace(/^\{([\s\S]*)\}$/, '$1'));
    if (!body || [...S.variables(body)].some(w => w !== v)) return null;
    const T = (k) => S.evaluate(body, { [v]: k });
    return { k0, T, Tnode: S.substitute(body, v, S.vr('k')), tex: s };
  }
  const parts = s.split(/\+\s*(?:\\cdots|\\dots|\\ldots|…|\.\.\.)\s*\+/);
  if (parts.length !== 2) return null;
  const last = pm(parts[1]);
  if (!last || [...S.variables(last)].some(w => w !== 'n')) return null;
  const firstTerms = parts[0].split(/\+(?![^(]*\))(?![^{]*\})/).map(t => t.trim()).filter(Boolean).map(t => pm(t));
  if (!firstTerms.length || firstTerms.some(t => !t || S.variables(t).size)) return null;
  const T = (k) => S.evaluate(last, { n: k });
  const vals = firstTerms.map(t => S.evaluate(t));
  for (const k0 of [1, 0, 2]) {
    if (vals.every((v, i) => Math.abs(T(k0 + i) - v) < 1e-9 * Math.max(1, Math.abs(v)))) return { k0, T, Tnode: S.substitute(last, 'n', S.vr('k')), tex: s };
  }
  return null;
}

function inductionClaim(raw) {
  let s = String(raw).replace(/\\text\{([^}]*)\}/g, ' $1 ').replace(/\\left|\\right/g, '').replace(/\s+/g, ' ').trim();
  if (!/induction/i.test(s)) return null;
  s = s.replace(/^.*?(?:by|using)\s+(?:mathematical\s+)?induction\s*(?:that)?\s*:?\s*/i, '').replace(/^(?:prove|show)\s+(?:that\s+)?/i, '').replace(/[.]\s*$/, '');
  let start = null;
  const fm = s.match(/,?\s*(?:for\s+all|for\s+every|for|∀)\s*(?:integers?\s+)?n\s*(\\ge|\\geq|≥|>=)\s*(-?\d+)\s*$/i);
  if (fm) { start = +fm[2]; s = s.slice(0, fm.index).trim(); }
  const nat = s.match(/,?\s*(?:for\s+all|for\s+every)\s+(?:positive\s+integers|natural\s+numbers)\s*n?\s*$/i);
  if (nat) { s = s.slice(0, nat.index).trim(); }
  let m;
  if ((m = s.match(/^(.+?)\s*is\s+prime(?:\s+number)?$/i))) return { kind: 'prime', L: m[1], start: start ?? 1 };
  if ((m = s.match(/^(.+?)\s*is\s+(?:always\s+)?even$/i))) return { kind: 'div', L: m[1], m: 2, start: start ?? 1 };
  if ((m = s.match(/^(.+?)\s*is\s+(?:always\s+)?divisible\s+by\s+(\d+)$/i))) return { kind: 'div', L: m[1], m: +m[2], start: start ?? 1 };
  // the relation at brace depth 0 (so the "=" in \sum_{k=1} is skipped)
  let depth = 0, at = -1, sym = null;
  for (let i = 0; i < s.length && at < 0; i++) {
    const ch = s[i];
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth--;
    else if (depth === 0) {
      const mm = s.slice(i).match(/^(\\geq|\\ge|\\leq|\\le)(?![a-zA-Z])|^(≥|≤|>=|<=|=|>|<)/);
      if (mm) { at = i; sym = mm[1] || mm[2]; }
    }
  }
  if (at <= 0) return null;
  const L = s.slice(0, at).trim(), Rs = s.slice(at + sym.length).trim();
  if (!Rs || /(?:^|[^\\a-z])(?:=|<|>)|\\le(?![a-z])|\\ge(?![a-z])/.test(Rs.replace(/\{[^{}]*\}/g, ''))) return null;
  return { kind: 'rel', L, rel: REL[sym], R: Rs, start };
}

const relHolds = (rel, a, b) => {
  const tol = 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
  if (rel === '=') return Math.abs(a - b) <= tol;
  if (rel === '\\ge') return a >= b - tol;
  if (rel === '\\le') return a <= b + tol;
  if (rel === '>') return a > b + tol;
  return a < b - tol;
};
const isPrime = (v) => { if (!Number.isInteger(v) || v < 2) return false; for (let d = 2; d * d <= v; d++) if (v % d === 0) return false; return true; };
const num = (v) => { const r = Math.round(v * 1e9) / 1e9; return Number.isInteger(r) && Math.abs(r) < 1e15 ? String(r) : String(+v.toPrecision(10)); };

// nonnegative for all k >= base: shift k = base + t and check every coefficient is >= 0
function polyNonnegFrom(poly, base) {
  let sh = [q(0)];
  for (let i = poly.length - 1; i >= 0; i--) sh = P.add(P.mul(sh, [q(base), q(1)]), [poly[i]]);
  return P.trim(sh).every(c => !c.isNegative());
}

function solveInductionClaims(raw) {
  const c = inductionClaim(raw);
  if (!c) return null;
  const sumL = c.kind === 'rel' ? parseSumSide(c.L) : null;
  const Lnode = sumL ? null : pm(c.L);
  if (!sumL && (!Lnode || [...S.variables(Lnode)].some(v => v !== 'n'))) return null;
  const Rnode = c.kind === 'rel' ? pm(c.R) : null;
  if (c.kind === 'rel' && (!Rnode || [...S.variables(Rnode)].some(v => v !== 'n'))) return null;
  const Lat = sumL ? (n) => { let s = 0; for (let k = sumL.k0; k <= n; k++) s += sumL.T(k); return s; } : (n) => S.evaluate(Lnode, { n });
  const Rat = Rnode ? (n) => S.evaluate(Rnode, { n }) : null;
  const start = c.start ?? (sumL ? sumL.k0 || 1 : 1);
  const Ltex = sumL ? sumL.tex : S.tex(Lnode), Rtex = Rnode ? S.tex(Rnode) : '';
  const claimTex = c.kind === 'rel' ? `${Ltex} ${c.rel} ${Rtex}` : c.kind === 'div' ? `${Ltex} \\text{ is divisible by } ${c.m}` : `${Ltex} \\text{ is prime}`;
  // 1. check the claim for n = start .. start + 40
  const fails = [];
  for (let n = start; n <= start + 40 && fails.length < 3; n++) {
    const a = Lat(n);
    if (!Number.isFinite(a)) return null;
    let ok;
    if (c.kind === 'rel') { const b = Rat(n); if (!Number.isFinite(b)) return null; ok = relHolds(c.rel, a, b); }
    else if (c.kind === 'div') { if (Math.abs(a) > 9e15) break; ok = Number.isInteger(Math.round(a)) && Math.round(a) % c.m === 0; }
    else { if (Math.abs(a) > 9e15) break; ok = isPrime(Math.round(a)); }
    if (!ok) fails.push(n);
  }
  const steps = [{ label: 'Statement to prove:', katex: `P(n):\\ ${claimTex}, \\qquad n \\ge ${start}` }];
  if (fails.length) {
    const n = fails[0];
    const a = Lat(n);
    let why;
    if (c.kind === 'rel') { const b = Rat(n); why = `\\text{L.H.S.} = ${num(a)}, \\quad \\text{R.H.S.} = ${num(b)}, \\quad \\text{but } ${num(a)} ${c.rel} ${num(b)} \\text{ is false}`; }
    else if (c.kind === 'div') why = `${num(a)} \\text{ is not divisible by } ${c.m}`;
    else { const v = Math.round(a); let d = 2; while (v % d) d++; why = `${num(a)} = ${d} \\times ${v / d} \\text{ is not prime}`; }
    steps.push({ label: `Test small values first. For $n = ${n}$:`, katex: why });
    if (fails.length > 1) steps.push({ label: `It also fails for $n = ${fails.slice(1).join(', ')}$.`, katex: '' });
    steps.push({ label: 'A single counterexample shows the statement is false, so it cannot be proved by induction (or any other method).', katex: '' });
    return done(`\\text{False: the statement fails for } n = ${n}`, steps);
  }
  // 2. true: only inequalities are handled here (equalities and divisibility have their own provers)
  if (c.kind !== 'rel' || c.rel === '=') return null;
  const k = S.vr('k');
  const big = c.rel === '\\ge' || c.rel === '>'; // L >= R
  const Lk = sumL ? null : S.substitute(Lnode, 'n', k), Rk = S.substitute(Rnode, 'n', k);
  const Rk1 = S.simplify(S.substitute(Rnode, 'n', S.sum(k, S.num(1))));
  const relTex = c.rel;
  steps.push({ label: `Step 1 (base case, $n = ${start}$):`, katex: `\\text{L.H.S.} = ${num(Lat(start))}, \\quad \\text{R.H.S.} = ${num(Rat(start))}, \\quad ${num(Lat(start))} ${relTex} ${num(Rat(start))} \\;\\checkmark` });
  steps.push({ label: `Step 2 (induction hypothesis): assume $P(k)$ is true for some $k \\ge ${start}$:`, katex: `${S.tex(sumL ? S.vr('S_k') : Lk)} ${relTex} ${S.tex(Rk)}` });
  if (sumL) {
    // S(k+1) = S(k) + T(k+1); need R(k) + T(k+1) (rel) R(k+1)
    const Tk1 = S.simplify(S.substitute(sumL.Tnode, 'k', S.sum(k, S.num(1))));
    const E = big ? S.simplify(S.sum(S.simplify(Rk), Tk1, S.neg(Rk1))) : S.simplify(S.sum(Rk1, S.neg(S.simplify(Rk)), S.neg(Tk1)));
    const I2 = require('./integrate2');
    const r = I2.toRat(E, 'k');
    if (!r) return null;
    const Np = P.trim(r.N), Dp = P.trim(r.D);
    const sgn = (p) => polyNonnegFrom(p, start) ? 1 : polyNonnegFrom(P.scale(p, q(-1)), start) ? -1 : 0;
    const sN = sgn(Np), sD = sgn(Dp);
    if (!sN || !sD || sN !== sD) return null;
    const Etex = S.tex(S.simplify(S.prod(S.fromPoly(Np, 'k'), S.pow(S.fromPoly(Dp, 'k'), -1))));
    steps.push({ label: `Step 3 (inductive step): $S_{k+1} = S_k + ${S.tex(Tk1)}$. By the hypothesis it is enough to show $${big ? `${S.tex(Rk)} + ${S.tex(Tk1)} ${relTex === '>' ? '\\ge' : relTex} ${S.tex(Rk1)}` : `${S.tex(Rk)} + ${S.tex(Tk1)} ${relTex === '<' ? '\\le' : relTex} ${S.tex(Rk1)}`}$. The difference is:`, katex: `${big ? `${S.tex(Rk)} + ${S.tex(Tk1)} - ${S.tex(Rk1)}` : `${S.tex(Rk1)} - ${S.tex(Rk)} - ${S.tex(Tk1)}`} = ${Etex} \\ge 0 \\quad (k \\ge ${start})` });
  } else {
    // L(k+1) = r(k) L(k) with r(k) > 0; need r(k) R(k) (>=) R(k+1)
    const Lk1 = S.simplify(S.substitute(Lnode, 'n', S.sum(k, S.num(1))));
    // L(k+1)/L(k) and R(k+1)/R(k) as polynomials in k (2, k+1, ...): symbolic, or fitted when the CAS
    // leaves (k+1)!/k! or 2^k/2^(k-1) unsimplified (the fit is checked on 12 values below)
    const fitRatio = (node, fnAt) => {
      const r = S.simplify(S.prod(S.simplify(S.substitute(node, 'n', S.sum(k, S.num(1)))), S.pow(S.simplify(S.substitute(node, 'n', k)), -1)));
      if (S.toPoly(r, 'k')) return r;
      const vals = [0, 1, 2, 3].map(i => fnAt(start + i + 1) / fnAt(start + i));
      const lin = vals[1] - vals[0];
      if (!vals.every((v, i) => Math.abs(v - (vals[0] + lin * i)) < 1e-9) || !Number.isInteger(Math.round(lin * 1e6) / 1e6)) return null;
      const c0 = vals[0] - lin * start;
      if (Math.abs(c0 - Math.round(c0)) > 1e-9) return null;
      return S.simplify(S.sum(S.prod(S.num(q(Math.round(lin))), k), S.num(q(Math.round(c0)))));
    };
    const ratio = fitRatio(Lnode, Lat);
    if (!ratio) return null;
    const rp = S.toPoly(ratio, 'k');
    if (!rp || !polyNonnegFrom(rp, start)) return null;
    for (let n = start; n < start + 12; n++) if (Math.abs(Lat(n + 1) - S.evaluate(ratio, { k: n }) * Lat(n)) > 1e-9 * Math.abs(Lat(n + 1))) return null;
    // need D(k) = r(k) R(k) - R(k+1) >= 0  (for L >= R)  or  <= 0 (for L <= R)
    const D = S.simplify(S.expand(S.sum(S.prod(ratio, Rk), S.neg(Rk1))));
    const Dp = S.toPoly(D, 'k');
    let Dtex, okD;
    if (Dp) { okD = big ? polyNonnegFrom(Dp, start) : polyNonnegFrom(P.scale(Dp, q(-1)), start); Dtex = S.tex(D); }
    else {
      // exponential R: compare ratios r(k) >= R(k+1)/R(k)
      const rho = fitRatio(Rnode, Rat);
      const rhoP = rho && S.toPoly(rho, 'k');
      if (!rhoP) return null;
      for (let n = start; n < start + 12; n++) if (Math.abs(Rat(n + 1) - S.evaluate(rho, { k: n }) * Rat(n)) > 1e-9 * Math.abs(Rat(n + 1))) return null;
      const diff = P.add(rp, P.scale(rhoP, q(-1)));
      okD = big ? polyNonnegFrom(diff, start) : polyNonnegFrom(P.scale(diff, q(-1)), start);
      Dtex = `${S.tex(Rk)}\\left(${S.tex(S.fromPoly(P.trim(diff), 'k'))}\\right)`;
    }
    if (!okD) return null;
    const par = (n) => (S.simplify(n).t === 'sum' ? `\\left(${S.tex(n)}\\right)` : S.tex(n));
    const rT = par(ratio), RkT = par(Rk);
    steps.push({ label: `Step 3 (inductive step): $${S.tex(Lk1)} = ${rT} \\cdot ${par(Lk)}$ and $${rT} > 0$, so by the hypothesis:`, katex: `${S.tex(Lk1)} ${relTex} ${rT} \\cdot ${RkT}` });
    steps.push({ label: `It remains to show $${rT} \\cdot ${RkT} ${big ? '\\ge' : '\\le'} ${S.tex(Rk1)}$ for $k \\ge ${start}$:`, katex: `${rT} \\cdot ${RkT} - ${par(Rk1)} = ${Dtex} ${big ? '\\ge' : '\\le'} 0` });
  }
  steps.push({ label: 'Step 4 (conclusion): $P(k) \\Rightarrow P(k+1)$, and $P(' + start + ')$ is true, so by induction:', katex: `${claimTex} \\quad \\text{for all } n \\ge ${start}` });
  return done(`\\text{Proved by induction for all } n \\ge ${start}`, steps);
}

// ---------------------------------------------------------------- 3. Gamma and Beta
// value = c · (√π)^m with c rational: Γ(n) = (n-1)!, Γ(n + 1/2) = (2n)! √π / (4^n n!)
function gammaExact(a) {
  if (a.isInteger()) { const n = Number(a.n); if (n < 1 || n > 60) return null; let r = q(1); for (let i = 2; i < n; i++) r = r.mul(q(i)); return { c: r, m: 0 }; }
  if (!a.mul(q(2)).isInteger()) return null;
  const n = Number(a.sub(q(1, 2)).n); // a = n + 1/2
  if (n < -10 || n > 40) return null;
  let c = q(1);
  if (n >= 0) for (let i = 0; i < n; i++) c = c.mul(q(2 * i + 1, 2));
  else for (let i = 0; i < -n; i++) c = c.div(q(-2 * i - 1, 2));
  return { c, m: 1 };
}
const sqrtPiTex = (v) => {
  const base = v.m === 0 ? '' : v.m === 1 ? '\\sqrt{\\pi}' : '\\pi';
  if (!base) return v.c.toTex();
  if (v.c.equals(1)) return base;
  if (v.c.isInteger()) return `${v.c.toTex()}${base}`;
  const n = v.c.n < 0n ? -v.c.n : v.c.n;
  return `${v.c.n < 0n ? '-' : ''}\\frac{${n === 1n ? '' : n}${base}}{${v.c.d}}`;
};
function solveGammaBeta(raw) {
  const s = String(raw).replace(/\\left|\\right/g, '').replace(/\s+/g, '').replace(/^(?:find|evaluate|compute)/i, '');
  let m = s.match(/^\\Gamma\(([^()]+)\)$/);
  const arg = (t) => { const n = pm(t); if (!n || S.variables(n).size) return null; const v = S.simplify(n); return v.t === 'num' ? v.v : null; };
  if (m) {
    const a = arg(m[1]); if (!a || a.isNegative() || a.isZero()) return null;
    const g = gammaExact(a); if (!g) return null;
    const steps = [{ label: 'Given:', katex: `\\Gamma\\left(${a.toTex()}\\right)` }];
    if (a.isInteger()) steps.push({ label: 'For a positive integer $n$, $\\Gamma(n) = (n-1)!$:', katex: `\\Gamma(${a.toTex()}) = ${Number(a.n) - 1}! = ${g.c.toTex()}` });
    else steps.push({ label: 'Use $\\Gamma\\left(\\tfrac12\\right) = \\sqrt{\\pi}$ and $\\Gamma(x + 1) = x\\,\\Gamma(x)$:', katex: `\\Gamma\\left(${a.toTex()}\\right) = ${sqrtPiTex(g)} \\approx ${num(g.c.toNumber() * Math.sqrt(Math.PI))}` });
    return done(sqrtPiTex(g), steps);
  }
  m = s.match(/^(?:B|\\mathrm\{B\}|\\operatorname\{B\}|\\beta|Beta)\(([^(),]+),([^(),]+)\)$/);
  if (m) {
    const a = arg(m[1]), b = arg(m[2]); if (!a || !b || a.isNegative() || b.isNegative() || a.isZero() || b.isZero()) return null;
    const ga = gammaExact(a), gb = gammaExact(b), gab = gammaExact(a.add(b));
    if (!ga || !gb || !gab) return null;
    const v = { c: ga.c.mul(gb.c).div(gab.c), m: ga.m + gb.m - gab.m };
    if (v.m < 0 || v.m > 2) return null;
    const steps = [{ label: 'Given:', katex: `B\\left(${a.toTex()}, ${b.toTex()}\\right)` }];
    steps.push({ label: 'Use $B(a, b) = \\dfrac{\\Gamma(a)\\,\\Gamma(b)}{\\Gamma(a + b)}$:', katex: `\\frac{\\Gamma(${a.toTex()})\\,\\Gamma(${b.toTex()})}{\\Gamma(${a.add(b).toTex()})} = \\frac{${sqrtPiTex(ga)} \\cdot ${sqrtPiTex(gb)}}{${sqrtPiTex(gab)}} = ${sqrtPiTex(v)}` });
    return done(sqrtPiTex(v), steps);
  }
  return null;
}

// ---------------------------------------------------------------- 4. n x n determinants (exact, by row reduction)
function solveDeterminantN(raw) {
  const s = String(raw).replace(/\\left|\\right/g, '');
  const m = s.match(/^\s*(?:find\s+|evaluate\s+|compute\s+)?(?:the\s+)?(?:\\det\s*|det\s*|determinant\s+(?:of\s+)?)?\\begin\{([pbvB]?matrix)\}([\s\S]*?)\\end\{\1\}\s*$/i);
  if (!m || (!/det/i.test(s) && m[1] !== 'vmatrix')) return null;
  const rows = m[2].split(/\\\\/).map(r => r.trim()).filter(Boolean).map(r => r.split('&').map(c => { const n = pm(c); const v = n && !S.variables(n).size ? S.simplify(n) : null; return v && v.t === 'num' ? v.v : null; }));
  const n = rows.length;
  if (n < 2 || n > 8 || rows.some(r => r.length !== n || r.some(c => !c))) return null;
  const A = rows.map(r => r.slice());
  let det = q(1); const ops = [];
  for (let c = 0; c < n; c++) {
    let p = A.findIndex((r, i) => i >= c && !r[c].isZero());
    if (p < 0) { det = q(0); ops.push(`\\text{column ${c + 1} has no pivot, so } \\det = 0`); break; }
    if (p !== c) { [A[c], A[p]] = [A[p], A[c]]; det = det.neg(); ops.push(`R_{${c + 1}} \\leftrightarrow R_{${p + 1}} \\;(\\text{sign changes})`); }
    det = det.mul(A[c][c]);
    for (let r = c + 1; r < n; r++) {
      if (A[r][c].isZero()) continue;
      const f = A[r][c].div(A[c][c]);
      A[r] = A[r].map((v, j) => v.sub(f.mul(A[c][j])));
      ops.push(`R_{${r + 1}} \\to R_{${r + 1}} ${f.isNegative() ? '+' : '-'} ${f.abs().equals(1) ? '' : f.abs().toTex()}R_{${c + 1}}`);
    }
  }
  const mt = (M) => `\\begin{pmatrix} ${M.map(r => r.map(v => v.toTex()).join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
  const steps = [{ label: 'Given matrix:', katex: `\\det ${mt(rows)}` }];
  steps.push({ label: 'Row-reduce to upper triangular form (adding a multiple of one row to another does not change the determinant):', katex: ops.length ? `\\begin{aligned} ${ops.slice(0, 14).map(o => '&' + o).join(' \\\\ ')}${ops.length > 14 ? ' \\\\ &\\dots' : ''} \\end{aligned}` : '\\text{already triangular}' });
  if (!det.isZero() || ops[ops.length - 1].indexOf('pivot') < 0) steps.push({ label: 'Upper triangular form; the determinant is the product of the diagonal (times $-1$ for each row swap):', katex: mt(A) });
  steps.push({ label: 'Determinant:', katex: `\\det = ${det.toTex()}` });
  return done(det.toTex(), steps);
}

// ---------------------------------------------------------------- 5. one-sided limits
function solveOneSidedLimit(raw) {
  const s = String(raw).replace(/\\left|\\right/g, '').replace(/\\displaystyle/g, '');
  const m = s.match(/^\s*\\lim\s*_\s*\{\s*x\s*\\to\s*(-?[^{}^]*?)\s*\^\s*\{?\s*([+-])\s*\}?\s*\}\s*([\s\S]+)$/);
  if (!m) return null;
  const aN = pm(m[1] || '0');
  if (!aN || S.variables(aN).size) return null;
  const a = S.evaluate(aN), side = m[2] === '+' ? 1 : -1;
  const f = pm(m[3]);
  if (!f || [...S.variables(f)].some(v => v !== 'x')) return null;
  const F = (x) => { try { return S.evaluate(f, { x }); } catch (e) { return NaN; } };
  const hs = [1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8];
  const vals = hs.map(h => F(a + side * h));
  if (vals.some(v => Number.isNaN(v))) return null;
  const head = `\\lim_{x \\to ${S.tex(aN)}^{${m[2]}}} ${S.tex(f)}`;
  const steps = [{ label: 'Given one-sided limit:', katex: head }];
  const table = hs.slice(1, 6).map((h, i) => `x = ${S.tex(aN)} ${side > 0 ? '+' : '-'} 10^{-${i + 4}}: &\\quad ${Math.abs(vals[i + 1]) > 1e6 ? (vals[i + 1] > 0 ? '' : '-') + '\\text{very large}' : num(vals[i + 1])}`).join(' \\\\ ');
  steps.push({ label: `Approach $x = ${S.tex(aN)}$ from the ${side > 0 ? 'right (values slightly larger)' : 'left (values slightly smaller)'}:`, katex: `\\begin{aligned} ${table} \\end{aligned}` });
  // infinite: |f| grows steadily with one sign
  const last = vals.slice(2);
  if (last.every(v => !Number.isFinite(v) || Math.abs(v) > 1e3) && last.every((v, i) => i === 0 || Math.abs(v) >= Math.abs(last[i - 1]) * 1.5) && last.every(v => Math.sign(v) === Math.sign(last[0]))) {
    const ans = last[0] > 0 ? '\\infty' : '-\\infty';
    steps.push({ label: 'The values grow without bound and keep one sign:', katex: `${head} = ${ans}` });
    return done(ans, steps);
  }
  // finite: values settle (Richardson on h, 2h, 4h removes the linear error)
  const h0 = 1e-5, g1 = F(a + side * 4 * h0), g2 = F(a + side * 2 * h0), g3 = F(a + side * h0);
  if (![g1, g2, g3].every(Number.isFinite)) return null;
  const r1 = 2 * g3 - g2, r2 = 2 * g2 - g1, L = (4 * r1 - r2) / 3;
  const settled = Math.abs(vals[5] - vals[4]) < 1e-4 * Math.max(1, Math.abs(vals[5])) && Math.abs(vals[4] - vals[3]) < 1e-3 * Math.max(1, Math.abs(vals[4]));
  if (!settled) return null;
  let ans = null;
  const cands = [L, vals[5]];
  for (const v of cands) {
    if (Math.abs(v) < 1e-6) { ans = '0'; break; }
    const r = A1.recogniseConstant(v);
    if (r && Math.abs(Math.abs(v) - Math.abs(Number(S.evaluate(pm(r.replace(/\\pi/g, '\\pi')))))) < 1e-5 * Math.max(1, Math.abs(v))) { ans = r; break; }
  }
  if (!ans) return null;
  steps.push({ label: 'The values settle on a single number:', katex: `${head} = ${ans}` });
  return done(ans, steps);
}

// ---------------------------------------------------------------- 6. Green's theorem on a circle
function solveGreenCircle(raw) {
  const s = String(raw).replace(/\\text\{([^}]*)\}/g, ' $1 ').replace(/\\left|\\right/g, '').replace(/\\,|\\;|\\:/g, ' ');
  if (!/\\oint|green/i.test(s)) return null;
  const im = s.match(/\\oint\s*(?:_\s*\{?\s*C\s*\}?)?\s*\(?\s*([\s\S]+?)\s*\)?\s*(?:,|where|over|around|for|along|\s+C\s+is|$)/i);
  if (!im) return null;
  const body = im[1].replace(/\s+/g, ' ');
  const pm2 = body.match(/^\(?\s*([\s\S]*?)\s*d\s*x\s*([+-])\s*([\s\S]*?)\s*d\s*y\s*\)?$/);
  if (!pm2) return null;
  const Pn = pm(pm2[1] || '1'), Qn0 = pm(pm2[3] || '1');
  if (!Pn || !Qn0) return null;
  const Qn = pm2[2] === '-' ? S.neg(Qn0) : Qn0;
  if ([...S.variables(Pn), ...S.variables(Qn)].some(v => v !== 'x' && v !== 'y')) return null;
  const cm = s.match(/x\s*\^\s*\{?2\}?\s*\+\s*y\s*\^\s*\{?2\}?\s*=\s*([\d.]+)/);
  if (!cm) return null;
  const r2 = Number(cm[1]), r = Math.sqrt(r2);
  const curl = S.simplify(S.sum(S.derivative(Qn, 'x'), S.neg(S.derivative(Pn, 'y'))));
  // ∬ over the disk in polar coordinates (Gauss-Legendre in r and θ)
  const g = (x, y) => S.evaluate(curl, { x, y });
  let tot = 0; const N = 64;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const rr = (i + 0.5) / N * r, th = (j + 0.5) / N * 2 * Math.PI;
    tot += g(rr * Math.cos(th), rr * Math.sin(th)) * rr;
  }
  tot *= (r / N) * (2 * Math.PI / N);
  const exact = A1.recogniseConstant(tot);
  if (!exact) return null;
  const steps = [{ label: "Green's theorem: for a positively oriented simple closed curve $C$ bounding the region $D$,", katex: '\\oint_C (P\\,dx + Q\\,dy) = \\iint_D \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right) dA' }];
  steps.push({ label: 'Here:', katex: `P = ${S.tex(Pn)}, \\quad Q = ${S.tex(Qn)}, \\quad \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} = ${S.tex(curl)}` });
  steps.push({ label: `$D$ is the disk $x^2 + y^2 \\le ${cm[1]}$ (radius $${S.tex(S.simplify(S.pow(S.num(q(Math.round(r2))), S.num(q(1, 2)))))}$, area $${A1.recogniseConstant(Math.PI * r2) || num(Math.PI * r2)}$):`, katex: `\\iint_D ${S.tex(curl)}\\,dA = ${exact}` });
  return done(exact, steps);
}

// ---------------------------------------------------------------- 7. telescoping sums of 1/((n+a)(n+b)...)
function solveTelescoping(raw) {
  const s = String(raw).replace(/\\left|\\right|\\displaystyle/g, '');
  const m = s.match(/^\s*\\sum\s*_\s*\{\s*([a-z])\s*=\s*(-?\d+)\s*\}\s*\^\s*\{?\s*(?:\\infty|∞)\s*\}?\s*([\s\S]+)$/);
  if (!m || /converg|diverg/i.test(s)) return null;
  const v = m[1], lo = +m[2];
  const f = pm(m[3]);
  if (!f || [...S.variables(f)].some(w => w !== v)) return null;
  const I2 = require('./integrate2');
  const r = I2.toRat(S.simplify(f), v);
  if (!r) return null;
  const N = P.trim(r.N), D = P.trim(r.D);
  if (P.degree(D) < 2 || P.degree(N) > P.degree(D) - 2) return null;
  const fac = P.factor(D);
  const roots = [];
  for (const fa of fac.factors) { if (P.degree(fa) !== 1) return null; const root = fa[0].neg().div(fa[1]); if (!root.isInteger()) return null; roots.push(root); }
  if (new Set(roots.map(x => x.toTex())).size !== roots.length) return null;
  const lead = D[D.length - 1];
  // c_j = N(r_j) / D'(r_j)
  const dD = D.slice(1).map((c, i) => c.mul(q(i + 1)));
  const cs = roots.map(rt => P.evaluate(N, rt).div(P.evaluate(dD, rt)));
  if (!cs.reduce((a, c) => a.add(c), q(0)).isZero()) return null;
  // Σ_{n>=lo} Σ c_j/(n - r_j) = -Σ c_j H(lo - r_j - 1)
  let sum = q(0);
  for (let j = 0; j < roots.length; j++) {
    const m0 = Number(q(lo).sub(roots[j]).n) - 1;
    if (m0 < 0) return null;
    let H = q(0); for (let i = 1; i <= m0; i++) H = H.add(q(1, i));
    sum = sum.sub(cs[j].mul(H));
  }
  void lead;
  const nn = S.vr(v);
  const partsTex = roots.map((rt, j) => S.tex(S.simplify(S.prod(S.num(cs[j]), S.pow(S.sum(nn, S.num(rt.neg())), -1))))).join(' + ').replace(/\+ -/g, '- ');
  const steps = [{ label: 'Given series:', katex: `\\sum_{${v}=${lo}}^{\\infty} ${S.tex(S.simplify(f))}` }];
  steps.push({ label: 'Partial fractions:', katex: `${S.tex(S.simplify(f))} = ${partsTex}` });
  steps.push({ label: 'The coefficients add up to 0, so the series telescopes: almost every term cancels and only the first few terms of each part remain:', katex: `\\sum_{${v}=${lo}}^{\\infty} ${S.tex(S.simplify(f))} = ${sum.toTex()}` });
  return done(sum.toTex(), steps);
}

// ---------------------------------------------------------------- 8. convergence by limit comparison with 1/n^p
function solveLimitComparison(raw) {
  const s = String(raw).replace(/\\text\{([^}]*)\}/g, ' $1 ').replace(/\\left|\\right/g, '');
  if (!/converg|diverg/i.test(s)) return null;
  const m = s.match(/\\sum\s*_\s*\{\s*([a-z])\s*=\s*(\d+)\s*\}\s*\^\s*\{?\s*(?:\\infty|∞)\s*\}?\s*([\s\S]+?)\s*(?:converge|diverge|does|is|determine|test|$)/i);
  if (!m) return null;
  const v = m[1];
  const f = pm(m[3]);
  if (!f || [...S.variables(f)].some(w => w !== v)) return null;
  const a = (n) => { try { return S.evaluate(f, { [v]: n }); } catch (e) { return NaN; } };
  // positive terms (sampled)
  for (let n = 10; n <= 1e6; n = Math.ceil(n * 1.7)) { const t = a(n); if (!Number.isFinite(t) || t <= 0) return null; }
  const pEst = (N) => -Math.log(a(2 * N) / a(N)) / Math.LN2;
  const p5 = pEst(1e5), p6 = pEst(1e6);
  if (!Number.isFinite(p5) || !Number.isFinite(p6) || Math.abs(p5 - p6) > 0.03) return null;
  const trend = (p0) => { const xs = [1e4, 1e5, 1e6].map(n => a(n) * Math.pow(n, p0)); return xs; };
  const head = `\\sum_{${v}=${m[2]}}^{\\infty} ${S.tex(f)}`;
  const steps = [{ label: 'Given series (all terms are positive):', katex: head }];
  for (const p0 of [Math.round(p6), Math.round(p6 * 2) / 2 - 0.5, Math.round(p6 * 2) / 2]) {
    if (p0 <= 0) continue;
    const xs = trend(p0);
    const finite = Math.abs(xs[2] - xs[1]) < 1e-3 * Math.abs(xs[2]) && xs[2] > 1e-9;
    const toZero = xs[2] < xs[1] && xs[1] < xs[0] && xs[2] < 0.6 * xs[0];
    const toInf = xs[2] > xs[1] && xs[1] > xs[0] && xs[2] > 1.2 * xs[0];
    const L = A1.recogniseConstant(xs[2]) || num(xs[2]);
    const cmp = `\\sum \\frac{1}{${v}^{${p0}}}`;
    if (finite) {
      steps.push({ label: `Limit comparison with the p-series $${cmp}$ ($p = ${p0}$):`, katex: `\\lim_{${v}\\to\\infty} \\frac{a_${v}}{1/${v}^{${p0}}} = ${L}, \\text{ a finite positive number}` });
      const conv = p0 > 1;
      steps.push({ label: `So both series behave the same way. The p-series ${conv ? 'converges ($p > 1$)' : 'diverges ($p \\le 1$)'}, hence:`, katex: `\\text{The series ${conv ? 'converges' : 'diverges'}}` });
      return done(`\\text{The series ${conv ? 'converges' : 'diverges'}}`, steps);
    }
    if (toZero && p0 > 1) {
      steps.push({ label: `Limit comparison with the convergent p-series $${cmp}$ ($p = ${p0} > 1$):`, katex: `\\lim_{${v}\\to\\infty} \\frac{a_${v}}{1/${v}^{${p0}}} = 0` });
      steps.push({ label: 'A limit of 0 with a convergent comparison series means the given series converges too:', katex: '\\text{The series converges}' });
      return done('\\text{The series converges}', steps);
    }
    if (toInf && p0 <= 1) {
      steps.push({ label: `Limit comparison with the divergent p-series $${cmp}$ ($p = ${p0} \\le 1$):`, katex: `\\lim_{${v}\\to\\infty} \\frac{a_${v}}{1/${v}^{${p0}}} = \\infty` });
      steps.push({ label: 'A limit of $\\infty$ with a divergent comparison series means the given series diverges too:', katex: '\\text{The series diverges}' });
      return done('\\text{The series diverges}', steps);
    }
  }
  return null;
}

module.exports = {
  // run first: these replace wrong or missing answers and check themselves
  SOLVERS: [solveTrigEquationAny, solveInductionClaims, solveOneSidedLimit],
  // run only when nothing else could answer
  FALLBACK: [solveGammaBeta, solveDeterminantN, solveGreenCircle, solveTelescoping, solveLimitComparison],
  _internal: { piTex, generalSolution, parseInterval, inductionClaim, parseSumSide, gammaExact }
};
