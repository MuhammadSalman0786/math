// Single-variable polynomials with exact rational coefficients.
// A polynomial is an array of Q where index = power: [c0, c1, c2] = c0 + c1 x + c2 x^2

const { Q, gcdB, absB } = require('./rational');

// ---------- Basic operations ----------
function trim(p) {
  const r = p.slice();
  while (r.length > 1 && r[r.length - 1].isZero()) r.pop();
  return r.length ? r : [new Q(0n)];
}
const degree = (p) => trim(p).length - 1;
const isZeroPoly = (p) => degree(p) === 0 && trim(p)[0].isZero();
const constPoly = (c) => [Q.from(c)];

function add(a, b) {
  const r = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) r.push((a[i] || new Q(0n)).add(b[i] || new Q(0n)));
  return trim(r);
}
function scale(a, k) { return trim(a.map(c => c.mul(k))); }
function sub(a, b) { return add(a, scale(b, new Q(-1n))); }
function mul(a, b) {
  const r = Array.from({ length: a.length + b.length - 1 }, () => new Q(0n));
  a.forEach((x, i) => b.forEach((y, j) => { r[i + j] = r[i + j].add(x.mul(y)); }));
  return trim(r);
}
function pow(a, n) {
  let r = constPoly(1);
  for (let i = 0; i < n; i++) r = mul(r, a);
  return r;
}
function equal(a, b) {
  a = trim(a); b = trim(b);
  return a.length === b.length && a.every((c, i) => c.equals(b[i]));
}
function evaluate(p, x) {
  let r = new Q(0n);
  for (let i = p.length - 1; i >= 0; i--) r = r.mul(x).add(p[i]);
  return r;
}

// ---------- Parser ----------
// Returns { poly, variable } or null when the text isn't a polynomial in one letter.
function parsePolynomial(input, forcedVar = null) {
  let src = String(input || '')
    .replace(/\\left|\\right/g, '')
    .replace(/\\cdot|\\times|×|·/g, '*')
    .replace(/[−–—]/g, '-')
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    .replace(/\{/g, '(').replace(/\}/g, ')')
    .replace(/\s+/g, '');
  if (!src || /\\/.test(src)) return null;

  const letters = [...new Set(src.match(/[a-zA-Z]/g) || [])];
  if (letters.length > 1) return null;
  const v = forcedVar || letters[0] || 'x';
  if (letters.length === 1 && letters[0] !== v) return null;

  const tokens = [];
  for (let i = 0; i < src.length;) {
    const num = src.slice(i).match(/^(\d+\.?\d*|\.\d+)/);
    if (num) { tokens.push({ t: 'num', v: num[1] }); i += num[1].length; continue; }
    const ch = src[i];
    if (ch === v) tokens.push({ t: 'var' });
    else if ('+-*/^()'.includes(ch)) tokens.push({ t: ch });
    else return null;
    i++;
  }
  // implicit multiplication
  const tk = [];
  for (const t of tokens) {
    const p = tk[tk.length - 1];
    if (p && ['num', 'var', ')'].includes(p.t) && ['num', 'var', '('].includes(t.t) && !(p.t === 'num' && t.t === 'num')) tk.push({ t: '*' });
    tk.push(t);
  }

  let pos = 0;
  const peek = () => tk[pos];
  const fail = () => { throw new Error('parse'); };

  function expr() {
    let r = term();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = tk[pos++].t;
      r = op === '+' ? add(r, term()) : sub(r, term());
    }
    return r;
  }
  function term() {
    let r = unary();
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = tk[pos++].t;
      const rhs = unary();
      if (op === '*') r = mul(r, rhs);
      else {
        if (degree(rhs) !== 0 || rhs[0].isZero()) fail(); // only divide by non-zero numbers
        r = scale(r, new Q(1n).div(rhs[0]));
      }
    }
    return r;
  }
  function unary() {
    if (peek() && peek().t === '-') { pos++; return scale(unary(), new Q(-1n)); }
    if (peek() && peek().t === '+') { pos++; return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (peek() && peek().t === '^') {
      pos++;
      const e = unary();
      if (degree(e) !== 0 || !e[0].isInteger() || e[0].isNegative() || e[0].n > 50n) fail();
      return pow(base, Number(e[0].n));
    }
    return base;
  }
  function primary() {
    const t = tk[pos++];
    if (!t) fail();
    if (t.t === 'num') return constPoly(Q.parse(t.v));
    if (t.t === 'var') return [new Q(0n), new Q(1n)];
    if (t.t === '(') { const r = expr(); if (!peek() || peek().t !== ')') fail(); pos++; return r; }
    fail();
  }

  try {
    const poly = expr();
    if (pos !== tk.length) return null;
    return { poly: trim(poly), variable: v };
  } catch (e) {
    return null;
  }
}

// ---------- Display ----------
function toTex(p, v = 'x') {
  p = trim(p);
  const parts = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i];
    if (c.isZero()) continue;
    const neg = c.isNegative();
    const a = c.abs();
    let coef = a.toTex();
    if (i > 0 && a.equals(1)) coef = '';
    const xs = i === 0 ? '' : i === 1 ? v : `${v}^{${i}}`;
    parts.push({ neg, s: coef + xs });
  }
  if (!parts.length) return '0';
  return parts.map((t, idx) => (idx === 0 ? (t.neg ? '-' : '') + t.s : (t.neg ? ' - ' : ' + ') + t.s)).join('');
}

// ---------- Integer helpers ----------
function lcmB(a, b) { return a === 0n || b === 0n ? 0n : absB(a * b) / gcdB(a, b); }

function divisors(n) {
  n = absB(n);
  if (n === 0n) return [];
  if (n > 10n ** 12n) return [1n, n];
  const out = [];
  for (let i = 1n; i * i <= n; i++) {
    if (n % i === 0n) { out.push(i); if (i * i !== n) out.push(n / i); }
  }
  return out;
}

// Make integer coefficients with gcd 1 and positive leading coefficient.
// Returns { content: Q, prim: poly } with p = content * prim
function primitive(p) {
  p = trim(p);
  let L = 1n;
  for (const c of p) if (c.exact) L = lcmB(L, c.d);
  const ints = p.map(c => c.mul(new Q(L)).n);
  let g = 0n;
  for (const x of ints) g = gcdB(g, x);
  if (g === 0n) g = 1n;
  if (ints[ints.length - 1] < 0n) g = -g;
  return { content: new Q(g, L), prim: ints.map(x => new Q(x / g)) };
}

// Divide p by (b x - a); returns quotient (assumes a/b is a root)
function divideByLinear(p, a, b) {
  const r = Q.from(a).div(Q.from(b));
  const n = p.length - 1;
  const q = new Array(n);
  let carry = new Q(0n);
  for (let i = n; i >= 1; i--) {
    carry = p[i].add(carry.mul(r));
    q[i - 1] = carry;
  }
  return trim(q.map(c => c.div(Q.from(b))));
}

function simplifyRadical(n) {
  // n BigInt >= 0 -> { out, inside } with sqrt(n) = out*sqrt(inside)
  n = BigInt(n);
  if (n === 0n) return { out: 0n, inside: 1n };
  let out = 1n, inside = n;
  for (let f = 2n; f * f <= inside; f++) {
    while (inside % (f * f) === 0n) { inside /= f * f; out *= f; }
  }
  return { out, inside };
}

// Factor over the rationals: linear factors via the rational root theorem,
// anything left over is returned as one (irreducible over Q for degree 2-3) factor.
// Returns { constant: Q, factors: [poly...] }; each factor has integer coefficients.
function factor(p) {
  p = trim(p);
  if (degree(p) === 0) return { constant: p[0], factors: [] };
  const { content, prim } = primitive(p);
  let cur = prim;
  const factors = [];

  for (let guard = 0; guard < 60 && degree(cur) >= 1; guard++) {
    if (degree(cur) === 1) { factors.push(cur); cur = constPoly(1); break; }
    const a0 = cur[0].n, an = cur[cur.length - 1].n;
    let root = null;
    if (a0 === 0n) root = [0n, 1n];
    else {
      search:
      for (const q of divisors(an)) {
        for (const pp of divisors(a0)) {
          for (const s of [1n, -1n]) {
            if (evaluate(cur, new Q(s * pp, q)).isZero()) { root = [s * pp, q]; break search; }
          }
        }
      }
    }
    if (!root) break;
    const g = gcdB(root[0], root[1]) || 1n;
    const [ra, rb] = [root[0] / g, root[1] / g];
    factors.push([new Q(-ra), new Q(rb)]); // rb*x - ra
    cur = primitive(divideByLinear(cur, ra, rb)).prim;
  }
  if (degree(cur) >= 1) factors.push(cur);
  return { constant: content, factors };
}

// Exact roots of A x^2 + B x + C (rational coefficients).
// Returns { kind: 'rational'|'irrational'|'complex', roots: [tex...], approx: [string...], disc: Q }
function quadraticRoots(A, B, C) {
  const { prim } = primitive([C, B, A]);
  const [c, b, a] = prim.map(q => q.n);
  const D = b * b - 4n * a * c;
  const twoA = 2n * a;

  if (D >= 0n) {
    const s = simplifyRadical(D);
    if (s.inside === 1n) {
      const r1 = new Q(-b + s.out, twoA), r2 = new Q(-b - s.out, twoA);
      const roots = r1.equals(r2) ? [r1] : [r1, r2];
      return { kind: 'rational', roots: roots.map(r => r.toTex()), values: roots, disc: new Q(D), a, b, c };
    }
    const g = gcdB(gcdB(b, s.out), twoA) * (twoA < 0n ? -1n : 1n);
    const [bb, kk, den] = [-b / g, s.out / g, twoA / g];
    const kStr = kk === 1n ? '' : `${absB(kk)}`;
    const rad = `${kStr}\\sqrt{${s.inside}}`;
    const numer = bb === 0n ? null : `${bb}`;
    const tex = (sign) => {
      const top = numer === null ? `${sign === '-' ? '-' : ''}${rad}` : `${numer} ${sign} ${rad}`;
      return den === 1n ? top : `\\frac{${top}}{${den}}`;
    };
    const dv = Math.sqrt(Number(D));
    const approx = [(-Number(b) + dv) / Number(twoA), (-Number(b) - dv) / Number(twoA)];
    return { kind: 'irrational', roots: [tex('+'), tex('-')], approx, disc: new Q(D), a, b, c };
  }

  const s = simplifyRadical(-D);
  const g = gcdB(gcdB(b, s.out), twoA) * (twoA < 0n ? -1n : 1n);
  const [bb, kk, den] = [-b / g, s.out / g, twoA / g];
  const kStr = kk === 1n ? '' : `${absB(kk)}`;
  const imag = s.inside === 1n ? `${kStr}i` : `${kStr}\\sqrt{${s.inside}}\\,i`;
  const tex = (sign) => {
    const top = bb === 0n ? `${sign === '-' ? '-' : ''}${imag}` : `${bb} ${sign} ${imag}`;
    return den === 1n ? top : `\\frac{${top}}{${den}}`;
  };
  return { kind: 'complex', roots: [tex('+'), tex('-')], disc: new Q(D), a, b, c };
}

// "2(x - 1)^{2}(x + 3)" from factor() output; repeated factors are grouped
function factoredTex(f, v = 'x') {
  const groups = [];
  for (const fac of f.factors) {
    const g = groups.find(x => equal(x.fac, fac));
    if (g) g.count++; else groups.push({ fac, count: 1 });
  }
  const c = f.constant;
  let out = c.equals(1) ? '' : c.equals(-1) ? '-' : c.toTex();
  for (const { fac, count } of groups) {
    const t = toTex(fac, v);
    const bare = t === v; // plain x needs no brackets
    const body = bare ? t : `(${t})`;
    out += count > 1 ? `${body}^{${count}}` : body;
  }
  return out || c.toTex();
}

module.exports = {
  factoredTex,
  trim, degree, isZeroPoly, add, sub, mul, scale, pow, equal, evaluate, constPoly,
  parsePolynomial, toTex, factor, primitive, quadraticRoots, simplifyRadical, divideByLinear
};
