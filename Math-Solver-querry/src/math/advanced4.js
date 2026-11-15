// Master-level solvers:
//  - Mellin-type improper integrals  ∫_0^∞ x^(s-1)/(1+x^n) dx  (keyhole contour / residues)
//  - Galois groups and splitting fields of quadratics, cubics and biquadratic quartics over ℚ
//  - Calculus of variations: extremals of J[y] = ∫ F(x, y, y') dx for quadratic F, with
//    boundary conditions, Legendre's condition, Jacobi conjugate points and the second variation

const { Q } = require('./rational');
const S = require('./symbolic');
const P = require('./polynomial');
const A1 = require('./advanced1');

const R = String.raw;

// ---------------------------------------------------------------- shared helpers
const GREEK = { alpha: 'α', beta: 'β', gamma: 'γ', lambda: 'λ', mu: 'μ', nu: 'ν', sigma: 'σ', theta: 'θ', pi: 'π', infty: '∞', varepsilon: 'ε', epsilon: 'ε' };

// LaTeX / unicode / PDF text -> one plain line that is easy to pattern-match
function plain(raw) {
  let s = String(raw || '')
    .replace(/\\(text|textrm|mathrm|operatorname|mathit|mathbf)\{([^{}]*)\}/g, ' $2 ')
    .replace(/\\(left|right|big|Big|bigl|bigr)\b/g, '')
    .replace(/\\[,;:! ]/g, ' ')
    .replace(/\\(?:cdot|times)/g, '*')
    .replace(/[−–—]/g, '-').replace(/[·×]/g, '*')
    .replace(/[′’]/g, "'").replace(/″/g, "''")
    .replace(/\^\{\\prime\\prime\}|\^\\prime\\prime/g, "''").replace(/\^\{\\prime\}|\^\\prime/g, "'")
    .replace(/\\mathbb\{Q\}|ℚ/g, 'Q').replace(/\\mathbb\{R\}|ℝ/g, 'R').replace(/\\mathbb\{C\}|ℂ/g, 'C')
    .replace(/\\iint(?![a-z])/g, '∬').replace(/\\oint(?![a-z])/g, '∮').replace(/\\int(?![a-z])/g, '∫')
    .replace(/\\leq?(?![a-z])/g, '≤').replace(/\\geq?(?![a-z])/g, '≥').replace(/\\neq?(?![a-z])/g, '≠')
    .replace(/\\lt(?![a-z])/g, '<').replace(/\\gt(?![a-z])/g, '>').replace(/\\to(?![a-z])/g, '→').replace(/\\mid(?![a-z])/g, '|')
    .replace(/\\(alpha|beta|gamma|lambda|mu|nu|sigma|theta|pi|infty|varepsilon|epsilon)\b/g, (m, g) => GREEK[g]);
  // innermost groups first, until no braces of these kinds are left
  for (let i = 0; i < 20; i++) {
    const before = s;
    s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\^\{([^{}]*)\}/g, '^($1)').replace(/_\{([^{}]*)\}/g, '_($1)');
    if (s === before) break;
  }
  s = s.replace(/\\(sin|cos|tan|sinh|cosh|ln|log|exp)\b/g, '$1')
    .replace(/[{}]/g, ' ')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

// exact integer square root (Newton's method on BigInt)
const sqrtBig = (n) => {
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  if (x === 0n) x = 1n;
  for (let i = 0; i < 200; i++) { const y = (x + n / x) >> 1n; if (y >= x && x * x <= n) break; x = y; }
  while (x * x > n) x--;
  while ((x + 1n) * (x + 1n) <= n) x++;
  return x;
};
const isSquareBig = (n) => n >= 0n && sqrtBig(n) ** 2n === n;
// generator of ℚ(√q): √(squarefree part), e.g. √12 -> √3, √(-4) -> i
function genTex(q) {
  const neg = q.isNegative();
  const a = neg ? q.neg() : q;
  const { inside } = P.simplifyRadical(a.n * a.d);
  if (inside === 1n) return neg ? 'i' : '1';
  return neg ? `\\sqrt{-${inside}}` : `\\sqrt{${inside}}`;
}
const isSquareQ = (q) => !q.isNegative() && isSquareBig(q.n) && isSquareBig(q.d);
const qt = (q) => q.toTex();
const qn = (v) => new Q(BigInt(v));

// sqrt of a rational as TeX: m√d / k
function sqrtTex(q) {
  if (q.isZero()) return '0';
  const neg = q.isNegative();
  const a = neg ? q.neg() : q;
  // sqrt(n/d) = sqrt(n d)/d
  const { out, inside } = P.simplifyRadical(a.n * a.d);
  let num = inside === 1n ? `${out}` : `${out === 1n ? '' : out}\\sqrt{${inside}}`;
  let t = a.d === 1n ? num : `\\frac{${num}}{${a.d}}`;
  if (neg) t = inside === 1n && a.d === 1n ? `${out === 1n ? '' : out}i` : `i\\,${t}`;
  return t;
}

// Recognise a decimal as a simple fraction
function toFrac(v, maxDen = 360) {
  if (!Number.isFinite(v)) return null;
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9 * Math.max(1, Math.abs(v))) return new Q(BigInt(n), BigInt(d));
  }
  return null;
}
const fmt = (v) => { const r = Math.round(v * 1e6) / 1e6; return String(Object.is(r, -0) ? 0 : r); };

// ---------------------------------------------------------------- 1. Mellin integral
// Exact sin(π r) for rational r with small denominators
function exactSinPi(r) {
  // reduce r to [0, 2)
  let n = Number(r.n), d = Number(r.d);
  n = ((n % (2 * d)) + 2 * d) % (2 * d);
  const table = { '0/1': ['0', 0], '1/6': ['\\frac{1}{2}', 0.5], '1/4': ['\\frac{\\sqrt{2}}{2}', Math.SQRT1_2], '1/3': ['\\frac{\\sqrt{3}}{2}', Math.sqrt(3) / 2], '1/2': ['1', 1] };
  const frac = new Q(BigInt(n), BigInt(d));
  let x = frac.toNumber();
  let sign = 1;
  if (x >= 1) { x -= 1; sign = -1; }
  if (x > 0.5) x = 1 - x;
  const fx = toFrac(x, 12);
  if (!fx) return null;
  const key = `${fx.n}/${fx.d}`;
  if (!table[key]) return null;
  return { tex: (sign < 0 && table[key][0] !== '0' ? '-' : '') + table[key][0], value: sign * table[key][1] };
}

function solveMellinIntegral(raw) {
  const s0 = plain(raw);
  // ∫ from 0 to ∞
  const m = s0.match(/∫\s*(?:_\(?\s*0\s*\)?\s*\^\(?\s*(?:\+\s*)?∞\s*\)?|0\s*∞|_0\s*\^\s*∞)\s*([\s\S]*?)\s*d\s*x\b/);
  if (!m) return null;
  let f = m[1].replace(/\s+/g, '');
  if (/^\[.*\]$/.test(f)) f = f.slice(1, -1);
  // strip one pair of outer parentheses
  const stripOuter = (t) => { while (/^\(.*\)$/.test(t)) { let depth = 0, ok = true; for (let i = 0; i < t.length; i++) { if (t[i] === '(') depth++; else if (t[i] === ')') depth--; if (depth === 0 && i < t.length - 1) { ok = false; break; } } if (!ok) break; t = t.slice(1, -1); } return t; };
  f = stripOuter(f);

  let expo = null, n = null;
  // PDF flattening: "xα-1/(1+x)" means x^(α-1)/(1+x)
  let mm = f.match(/^x([α-ωa-wyz])-1\/\(?(1\+x|x\+1)\)?$/);
  if (mm) { expo = `${mm[1]}-1`; n = 1; }
  if (!mm) {
    const den = '\\(?(?:1\\+x(?:\\^\\(?(\\d+)\\)?)?|x(?:\\^\\(?(\\d+)\\)?)?\\+1)\\)?';
    mm = f.match(new RegExp(`^\\(?x\\^\\(([^()]+)\\)\\)?\\/${den}$`)) ||
         f.match(new RegExp(`^\\(?x\\^\\(?([^/]+?)\\)?\\)?\\/${den}$`)) ||
         f.match(new RegExp(`^\\(?x\\^\\(?([^/]+?)\\)?\\)?\\/\\(${den}\\)$`));
    if (mm) { expo = mm[1]; n = Number(mm[2] || mm[3] || 1); }
  }
  if (!mm) {
    const den = '\\(?(?:1\\+x(?:\\^\\(?(\\d+)\\)?)?|x(?:\\^\\(?(\\d+)\\)?)?\\+1)\\)?';
    const one = f.match(new RegExp(`^\\(?1\\)?\\/${den}$`));
    if (one) { expo = '0'; n = Number(one[1] || one[2] || 1); }
    const lin = f.match(new RegExp(`^\\(?x\\)?\\/${den}$`));
    if (lin) { expo = '1'; n = Number(lin[1] || lin[2] || 1); }
  }
  if (expo === null || !n || n > 12) return null;
  expo = stripOuter(expo);

  // s = exponent + 1
  let sNum = null, sTex, sIsParam = false, param = null;
  const em = expo.match(/^([α-ωa-wyz])-1$/);
  if (em) { sIsParam = true; param = em[1]; sTex = param === 'α' ? '\\alpha' : param === 'β' ? '\\beta' : param === 'λ' ? '\\lambda' : param === 'μ' ? '\\mu' : param; }
  else if (/^([α-ωa-wyz])$/.test(expo)) { sIsParam = true; param = expo; const t = param === 'α' ? '\\alpha' : param; sTex = `${t}+1`; }
  else {
    const node = A1.parseMath(expo);
    if (!node || S.variables(node).size) return null;
    const v = S.evaluate(node);
    const fq = toFrac(v + 1, 60);
    if (!fq) return null;
    sNum = fq; sTex = qt(fq);
  }
  const pTex = (t) => (/^[a-z\\]+$|^\\alpha$/.test(t) ? t : `\\left(${t}\\right)`);
  const nTex = String(n);
  const xs = n === 1 ? 'x' : `x^{${n}}`;
  const numTex = sIsParam ? `x^{${expo.endsWith('-1') ? `${sTex}-1` : sTex.replace('+1', '')}}` : (sNum.equals(qn(1)) ? '1' : sNum.equals(qn(2)) ? 'x' : `x^{${qt(sNum.sub(qn(1)))}}`);
  const integrandTex = `\\frac{${numTex}}{1+${xs}}`;
  const I = `\\int_0^{\\infty} ${integrandTex}\\,dx`;

  if (sNum && (sNum.isNegative() || sNum.isZero() || sNum.toNumber() >= n)) {
    return {
      answer: R`\text{The integral diverges}`,
      steps: [
        { label: 'Integral:', katex: I },
        { label: `Near $x = 0$ the integrand behaves like $x^{s-1}$ and near $\\infty$ like $x^{s-1-n}$ (here $s = ${sTex}$, $n = ${n}$). It converges only when $0 < s < n$.`, katex: '' },
        { label: 'This condition fails, so the integral diverges.', katex: R`\text{diverges}` }
      ]
    };
  }

  const steps = [];
  steps.push({ label: 'Integral to evaluate:', katex: I });
  steps.push({ label: `Write it as $\\int_0^\\infty \\frac{x^{s-1}}{1+x^{n}}\\,dx$ with $s = ${sTex}$ and $n = ${n}$. It converges because $0 < s < n$ (the integrand is like $x^{s-1}$ near $0$ and $x^{s-1-n}$ near $\\infty$).`, katex: sIsParam ? `0 < ${sTex} < ${n}` : `0 < ${sTex} < ${n} \\;\\checkmark` });
  if (n > 1) {
    steps.push({ label: `Reduce to the case $n = 1$ with $t = x^{${n}}$, so $x = t^{1/${n}}$ and $dx = \\frac{1}{${n}} t^{\\frac{1}{${n}}-1}dt$:`, katex: `\\int_0^\\infty \\frac{x^{s-1}}{1+x^{${n}}}\\,dx = \\frac{1}{${n}}\\int_0^\\infty \\frac{t^{\\frac{s}{${n}}-1}}{1+t}\\,dt` });
    steps.push({ label: `So it is enough to find $I(a) = \\int_0^\\infty \\frac{t^{a-1}}{1+t}\\,dt$ for $0 < a < 1$, here with $a = s/${n}$.`, katex: '' });
  }
  const a = n > 1 ? 'a' : 's';
  steps.push({ label: `Step 1: take $f(z) = \\dfrac{z^{${a}-1}}{1+z}$ with the branch cut along the positive real axis, $z^{${a}-1} = e^{(${a}-1)\\log z}$ and $0 < \\arg z < 2\\pi$.`, katex: '' });
  steps.push({ label: 'Step 2: integrate over the keyhole contour: the big circle $C_R$, the small circle $C_\\varepsilon$ around 0, the upper edge of the cut ($\\arg z = 0$) and the lower edge ($\\arg z = 2\\pi$). The only pole inside is $z = -1 = e^{i\\pi}$:', katex: `\\operatorname{Res}_{z=e^{i\\pi}} f = \\left(e^{i\\pi}\\right)^{${a}-1} = e^{i\\pi(${a}-1)} = -e^{i\\pi ${a}}` });
  steps.push({ label: `Step 3: the circles contribute nothing in the limit, since $0 < ${a} < 1$:`, katex: `\\left|\\int_{C_R}\\right| \\le 2\\pi R\\,\\frac{R^{${a}-1}}{R-1} \\to 0, \\qquad \\left|\\int_{C_\\varepsilon}\\right| \\le 2\\pi\\varepsilon\\,\\frac{\\varepsilon^{${a}-1}}{1-\\varepsilon} \\to 0` });
  steps.push({ label: `Step 4: on the lower edge $z = x e^{2\\pi i}$, so $z^{${a}-1} = x^{${a}-1}e^{2\\pi i(${a}-1)} = x^{${a}-1}e^{2\\pi i ${a}}$ and that edge is traversed from $\\infty$ to $0$. The residue theorem gives`, katex: `\\left(1 - e^{2\\pi i ${a}}\\right) I(${a}) = 2\\pi i\\left(-e^{i\\pi ${a}}\\right)` });
  steps.push({ label: `Step 5: divide and multiply top and bottom by $e^{-i\\pi ${a}}$:`, katex: `I(${a}) = \\frac{-2\\pi i\\,e^{i\\pi ${a}}}{1-e^{2\\pi i ${a}}} = \\frac{2\\pi i}{e^{i\\pi ${a}} - e^{-i\\pi ${a}}} = \\frac{2\\pi i}{2i\\sin(\\pi ${a})} = \\frac{\\pi}{\\sin(\\pi ${a})}` });

  let ansTex, numeric = null;
  const sv = sIsParam ? (sTex.endsWith('+1') ? `\\left(${sTex}\\right)` : sTex) : sTex;
  if (n === 1) ansTex = `\\frac{\\pi}{\\sin(\\pi ${sIsParam && !sTex.includes('+') ? sv : pTex(sv)})}`;
  else ansTex = `\\frac{\\pi}{${n}\\sin\\left(\\frac{\\pi ${sIsParam && !sTex.includes('+') ? sv : pTex(sv)}}{${n}}\\right)}`;
  
  if (sNum) {
    const r = sNum.div(qn(n));
    const piTex = r.equals(qn(1)) ? '\\pi' : r.d === 1n ? `${r.n}\\pi` : `\\frac{${r.n === 1n ? '' : (r.n === -1n ? '-' : r.n)}\\pi}{${r.d}}`;
    ansTex = `\\frac{\\pi}{${n > 1 ? n : ''}\\sin\\left(${piTex}\\right)}`;
    const ex = exactSinPi(r);
    numeric = Math.PI / (n * Math.sin(Math.PI * r.toNumber()));
    if (ex) {
      // π / (n · sin)
      const sinTex = ex.tex;
      // value = π / (n·sin), written as (p/q)·√r·π
      const mk = (cq, rad) => {
        const num = `${cq.n === 1n ? '' : cq.n}${rad ? `\\sqrt{${rad}}\\,` : ''}\\pi`;
        return cq.d === 1n ? num : `\\frac{${num}}{${cq.d}}`;
      };
      let val = null;
      const neg = sinTex.startsWith('-');
      const body = neg ? sinTex.slice(1) : sinTex;
      if (body === '1') val = mk(new Q(1n, BigInt(n)), null);
      else if (body === '\\frac{1}{2}') val = mk(new Q(2n, BigInt(n)), null);
      else if (body === '\\frac{\\sqrt{2}}{2}') val = mk(new Q(1n, BigInt(n)), 2);
      else if (body === '\\frac{\\sqrt{3}}{2}') val = mk(new Q(2n, 3n * BigInt(n)), 3);
      if (val && neg) val = '-' + val;
      if (val) ansTex = `${ansTex} = ${val}`;
    }
  }
  if (n > 1) steps.push({ label: `Step 6: go back to $s$ with $a = s/${n}$ and the factor $\\frac{1}{${n}}$:`, katex: `\\int_0^\\infty \\frac{x^{s-1}}{1+x^{${n}}}\\,dx = \\frac{1}{${n}}\\cdot\\frac{\\pi}{\\sin\\left(\\frac{\\pi s}{${n}}\\right)}` });
  steps.push({ label: 'Check: this is Euler’s reflection formula, since the integral equals the Beta function $B(s, 1-s) = \\Gamma(s)\\Gamma(1-s)$ (for $n = 1$).', katex: n === 1 ? `B(s,1-s) = \\Gamma(s)\\Gamma(1-s) = \\frac{\\pi}{\\sin(\\pi s)}` : '' });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${I} = ${ansTex}}${numeric !== null ? ` \\approx ${fmt(numeric)}` : ''}` });
  return { answer: `${I} = ${ansTex}`, steps };
}

// ---------------------------------------------------------------- 2. Galois groups
function findPolynomial(text) {
  const t = plain(text);
  const cands = [];
  let m = t.match(/[a-z]\(x\)\s*=\s*([-+x0-9^()*\/ .]+?)(?=\s+(?:in|over|is|be)\b|[,;:]|\.\s|\.$|$)/i);
  if (m) cands.push(m[1]);
  m = t.match(/(?:of|for|polynomial)\s+([-+x0-9^()*\/ .]*x[-+x0-9^()*\/ .]*?)(?=\s+(?:in|over|is)\b|[,;:]|\.\s|\.$|$)/i);
  if (m) cands.push(m[1]);
  for (const c of cands) {
    const str = c.trim().replace(/\.$/, '');
    if (!/x/.test(str)) continue;
    const node = A1.parseMath(str);
    if (!node) continue;
    const vars = [...S.variables(node)];
    if (vars.length !== 1 || vars[0] !== 'x') continue;
    const poly = S.toPoly(node, 'x');
    if (!poly) continue;
    return { poly: P.trim(poly), node };
  }
  return null;
}

function rationalRoots(poly) {
  const f = P.factor(poly);
  return f.factors.filter(fa => P.degree(fa.poly || fa) === 1);
}


// Integer monic version of a monic rational quartic: g(y) = L^4 f(y/L)
function integerMonic(p) {
  let L = 1n;
  const lcm = (a, b) => { const g = (x, y) => (y === 0n ? x : g(y, x % y)); return a / g(a, b) * b; };
  for (const c of p) L = lcm(L, c.d);
  // smallest L with L^k * c_{4-k} integer for all k (L = lcm of denominators is enough)
  const deg = p.length - 1;
  return { q: p.map((c, i) => c.mul(new Q(L ** BigInt(deg - i)))), L };
}
const divisors = (n) => {
  n = n < 0n ? -n : n; const out = [];
  if (n > 10n ** 7n) return null;
  for (let i = 1n; i * i <= n; i++) if (n % i === 0n) { out.push(i, -i); if (i * i !== n) out.push(n / i, -(n / i)); }
  return out;
};
// Monic integer quartic -> quadratic factors (x^2+px+q)(x^2+rx+s), or null
function quadraticSplit(g) {
  const [d, c, b, a] = [g[0].n, g[1].n, g[2].n, g[3].n];
  const divs = divisors(d);
  if (!divs) return null;
  for (const q of divs) {
    const sv = d / q;
    if (sv !== q) {
      const num = c - a * q, den = sv - q;
      if (num % den !== 0n) continue;
      const pp = num / den, rr = a - pp;
      if (q + sv + pp * rr === b) return [[q, pp], [sv, rr]];
    } else {
      // p + r = a, p r = b - 2q
      const disc = a * a - 4n * (b - 2n * q);
      if (disc < 0n || !isSquareBig(disc)) continue;
      const rt = sqrtBig(disc);
      if ((a + rt) % 2n !== 0n) continue;
      const pp = (a + rt) / 2n, rr = a - pp;
      if (pp * sv + q * rr === c) return [[q, pp], [sv, rr]];
    }
  }
  return null;
}

function galoisGeneralQuartic(p, steps) {
  const { q: g, L } = integerMonic(p);
  if (g.some(c => c.d !== 1n)) return null;
  const a = g[3], b = g[2], c = g[1], d = g[0];
  if (L !== 1n) steps.push({ label: `Rescale with $x = y/${L}$ to get a monic quartic with integer coefficients (this does not change the splitting field):`, katex: `g(y) = ${P.toTex(g, 'y')}` });
  const lin = rationalRoots(g);
  const split = lin.length ? null : quadraticSplit(g);
  if (lin.length || split) {
    // reducible: collect square classes of the irreducible quadratic factors
    const fac = P.factor(g);
    const discs = [];
    let cubic = false;
    if (split) {
      steps.push({ label: 'Step 1 (irreducible?): f has no rational root, but it splits into two quadratics over ℤ (Gauss’s lemma):', katex: `(y^2 ${split[0][1] < 0n ? '-' : '+'} ${split[0][1] < 0n ? -split[0][1] : split[0][1]}y ${split[0][0] < 0n ? '-' : '+'} ${split[0][0] < 0n ? -split[0][0] : split[0][0]})(y^2 ${split[1][1] < 0n ? '-' : '+'} ${split[1][1] < 0n ? -split[1][1] : split[1][1]}y ${split[1][0] < 0n ? '-' : '+'} ${split[1][0] < 0n ? -split[1][0] : split[1][0]})` });
      for (const [qq, pp] of split) { const D = new Q(pp * pp - 4n * qq); if (!isSquareQ(D)) discs.push(D); }
    } else {
      steps.push({ label: 'Step 1 (irreducible?): f has a rational root, so it is reducible:', katex: `${P.factoredTex(fac, 'y')}` });
      for (const fa of fac.factors) {
        const poly = fa.poly || fa; const dg = P.degree(poly);
        if (dg === 2) { const D = poly[1].mul(poly[1]).sub(qn(4).mul(poly[0]).mul(poly[2])); if (!isSquareQ(D)) discs.push(D); }
        if (dg === 3) cubic = true;
      }
    }
    if (cubic) return null;
    // independent square classes
    const classes = [];
    for (const D of discs) if (!classes.some(E => isSquareQ(E.mul(D)))) classes.push(D);
    if (classes.length === 3) classes.pop();
    const degK = 2 ** classes.length;
    const grp = degK === 1 ? R`\{e\}` : degK === 2 ? R`\mathbb{Z}_2` : R`\mathbb{Z}_2 \times \mathbb{Z}_2`;
    const K = degK === 1 ? R`\mathbb{Q}` : `\\mathbb{Q}\\left(${classes.map(genTex).join(', ')}\\right)`;
    steps.push({ label: 'Each irreducible quadratic factor needs the square root of its discriminant:', katex: `K = ${K}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{K = ${K},\\ [K:\\mathbb{Q}] = ${degK},\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong ${grp}}` });
    return { answer: `K = ${K},\\ [K:\\mathbb{Q}] = ${degK},\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong ${grp}`, steps };
  }
  steps.push({ label: 'Step 1 (irreducible): there is no rational root (rational root theorem) and no factorisation into two integer quadratics (checked over all factor pairs of the constant term), so f is irreducible over ℚ.', katex: '' });
  // resolvent cubic R(y) = y^3 - b y^2 + (ac - 4d) y - (a^2 d - 4bd + c^2)
  const r2 = b.neg(), r1 = a.mul(c).sub(qn(4).mul(d)), r0 = a.mul(a).mul(d).sub(qn(4).mul(b).mul(d)).add(c.mul(c)).neg();
  const Rpoly = [r0, r1, r2, qn(1)];
  steps.push({ label: 'Step 2: the resolvent cubic (its roots are $\\alpha_1\\alpha_2 + \\alpha_3\\alpha_4$ and the two similar sums):', katex: `R(t) = ${P.toTex(Rpoly, 't')}` });
  const D = qn(18).mul(r2).mul(r1).mul(r0).sub(qn(4).mul(r2.pow(3)).mul(r0)).add(r2.mul(r2).mul(r1).mul(r1)).sub(qn(4).mul(r1.pow(3))).sub(qn(27).mul(r0).mul(r0));
  steps.push({ label: 'Step 3: the discriminant of f equals the discriminant of R:', katex: `\\Delta = ${qt(D)}${isSquareQ(D) ? ' = (' + sqrtTex(D) + ')^2 \\text{ (a square)}' : ' \\text{ (not a square)}'}` });
  const rr = rationalRoots(Rpoly);
  const roots = P.factor(Rpoly).factors.filter(fa => P.degree(fa.poly || fa) === 1).map(fa => { const pl = fa.poly || fa; return pl[0].neg().div(pl[1]); });
  let grp, degK, why;
  if (!rr.length) {
    if (isSquareQ(D)) { grp = 'A_4'; degK = 12; why = 'R is irreducible and Δ is a square'; }
    else { grp = 'S_4'; degK = 24; why = 'R is irreducible and Δ is not a square'; }
  } else if (roots.length >= 3 || (roots.length && isSquareQ(D))) {
    grp = R`V_4 \cong \mathbb{Z}_2 \times \mathbb{Z}_2`; degK = 4; why = 'R splits completely over ℚ';
  } else {
    const th = roots[0];
    const e1 = th.mul(th).sub(qn(4).mul(d)), e2 = a.mul(a).sub(qn(4).mul(b.sub(th)));
    const sqOver = (e) => e.isZero() || isSquareQ(e.mul(D));
    const c4 = sqOver(e1) && sqOver(e2);
    grp = c4 ? R`\mathbb{Z}_4` : 'D_4'; degK = c4 ? 4 : 8;
    why = `R has exactly one rational root θ = ${th.toPlain()}; by the Kappe–Warren test, $x^2 - θx + d$ and $x^2 + ax + (b - θ)$ ${c4 ? 'both split' : 'do not both split'} over $\\mathbb{Q}(\\sqrt{\\Delta})$`;
  }
  steps.push({ label: `Step 4: ${why}, so:`, katex: `\\mathrm{Gal}(K/\\mathbb{Q}) \\cong ${grp}, \\qquad [K:\\mathbb{Q}] = ${degK}` });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{[K:\\mathbb{Q}] = ${degK},\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong ${grp}}` });
  return { answer: `[K:\\mathbb{Q}] = ${degK},\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong ${grp}`, steps };
}

function solveGaloisQuestion(raw) {
  const k = A1.keyText(raw);
  if (!/galois|splittingfield|splitfield/.test(k)) return null;
  const found = findPolynomial(raw);
  if (!found) return null;
  let p = found.poly;
  const deg = P.degree(p);
  if (deg > 4) {
    return { answer: R`\text{Only degrees 2, 3 and 4 are supported}`, steps: [
      { label: 'Polynomial:', katex: `f(x) = ${P.toTex(p, 'x')}` },
      { label: 'This solver finds Galois groups of quadratics, cubics and quartics over ℚ. For degree 5 and higher there is no general formula in radicals, and the group (often $S_5$) needs more advanced methods such as reduction modulo primes.', katex: '' }
    ] };
  }
  if (deg < 2) return null;
  // keep the exact arithmetic (square-free parts, factor search) fast
  if (p.some(c => c.n > 1000000n || c.n < -1000000n || c.d > 1000n)) {
    return { answer: R`\text{The coefficients are too large}`, steps: [{ label: 'Please use a polynomial with coefficients up to 1,000,000 in size.', katex: '' }] };
  }
  // make monic
  const lead = p[deg];
  p = p.map(c => c.div(lead));
  const xTex = P.toTex(p, 'x');
  const steps = [{ label: 'Polynomial over ℚ:', katex: `f(x) = ${xTex}` }];

  // ---- quadratic
  if (deg === 2) {
    const b = p[1], c = p[0];
    const D = b.mul(b).sub(c.mul(qn(4)));
    steps.push({ label: 'Discriminant:', katex: `\\Delta = b^2 - 4c = ${qt(D)}` });
    if (isSquareQ(D)) {
      steps.push({ label: 'Δ is a perfect square, so both roots are rational: f splits over ℚ.', katex: '' });
      steps.push({ label: 'Final Answer:', katex: R`\mathbf{K = \mathbb{Q},\ [K:\mathbb{Q}] = 1,\ \mathrm{Gal}(K/\mathbb{Q}) = \{e\}}` });
      return { answer: R`K = \mathbb{Q},\ \mathrm{Gal} = \{e\}`, steps };
    }
    steps.push({ label: `Δ is not a square in ℚ, so f is irreducible and its roots are $\\frac{-b \\pm \\sqrt{\\Delta}}{2}$. The splitting field is`, katex: `K = \\mathbb{Q}\\left(${genTex(D)}\\right)` });
    steps.push({ label: 'Final Answer:', katex: R`\mathbf{[K:\mathbb{Q}] = 2,\ \mathrm{Gal}(K/\mathbb{Q}) \cong \mathbb{Z}_2}` });
    return { answer: R`[K:\mathbb{Q}] = 2,\ \mathrm{Gal}(K/\mathbb{Q}) \cong \mathbb{Z}_2`, steps };
  }

  // ---- cubic
  if (deg === 3) {
    const a = qn(1), b = p[2], c = p[1], d = p[0];
    const lin = rationalRoots(p);
    const D = qn(18).mul(a).mul(b).mul(c).mul(d).sub(qn(4).mul(b.pow(3)).mul(d)).add(b.mul(b).mul(c).mul(c)).sub(qn(4).mul(a).mul(c.pow(3))).sub(qn(27).mul(a).mul(a).mul(d).mul(d));
    steps.push({ label: 'Step 1 (irreducible?): by the rational root theorem, a cubic is reducible over ℚ exactly when it has a rational root.', katex: lin.length ? `\\text{rational root found: } f(x) = ${P.factoredTex(P.factor(p), 'x')}` : R`\text{no rational root} \Rightarrow f \text{ is irreducible over } \mathbb{Q}` });
    steps.push({ label: 'Step 2: discriminant of the cubic:', katex: `\\Delta = 18abcd - 4b^3d + b^2c^2 - 4ac^3 - 27a^2d^2 = ${qt(D)}` });
    if (lin.length) {
      const sq = isSquareQ(D);
      steps.push({ label: sq ? 'The remaining quadratic factor also splits (Δ is a square), so all roots are rational.' : 'The remaining quadratic factor has irrational roots, so one square root is adjoined.', katex: '' });
      const ans = sq ? R`K = \mathbb{Q},\ \mathrm{Gal} = \{e\}` : `K = \\mathbb{Q}\\left(${genTex(D)}\\right),\\ [K:\\mathbb{Q}] = 2,\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong \\mathbb{Z}_2`;
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
      return { answer: ans, steps };
    }
    if (isSquareQ(D)) {
      steps.push({ label: 'Step 3: f is irreducible and Δ is a perfect square, so the Galois group is a transitive subgroup of $S_3$ inside $A_3$: it is $A_3$. Adjoining one root θ gives all three roots.', katex: `\\sqrt{\\Delta} = ${sqrtTex(D)} \\in \\mathbb{Q}` });
      steps.push({ label: 'Final Answer:', katex: R`\mathbf{K = \mathbb{Q}(\theta),\ [K:\mathbb{Q}] = 3,\ \mathrm{Gal}(K/\mathbb{Q}) \cong A_3 \cong \mathbb{Z}_3}` });
      return { answer: R`[K:\mathbb{Q}] = 3,\ \mathrm{Gal}(K/\mathbb{Q}) \cong A_3 \cong \mathbb{Z}_3`, steps };
    }
    const pureCube = b.isZero() && c.isZero();
    steps.push({ label: 'Step 3: f is irreducible and Δ is not a square, so the Galois group is all of $S_3$: adjoining a real root θ gives degree 3, and the other two roots also need $\\sqrt{\\Delta}$.', katex: `K = \\mathbb{Q}\\left(\\theta, ${genTex(D)}\\right)${pureCube ? ` = \\mathbb{Q}\\left(\\sqrt[3]{${qt(d.neg())}},\\ \\omega\\right),\\ \\omega = e^{2\\pi i/3}` : ''}` });
    steps.push({ label: 'Final Answer:', katex: R`\mathbf{[K:\mathbb{Q}] = 6,\ \mathrm{Gal}(K/\mathbb{Q}) \cong S_3 \cong D_3}` });
    return { answer: R`[K:\mathbb{Q}] = 6,\ \mathrm{Gal}(K/\mathbb{Q}) \cong S_3`, steps };
  }

  // ---- quartic: biquadratic x^4 + b x^2 + c gets a detailed treatment; others use the resolvent cubic
  if (!p[3].isZero() || !p[1].isZero()) return galoisGeneralQuartic(p, steps);
  const b = p[2], c = p[0];
  if (c.isZero()) return null;
  const D = b.mul(b).sub(c.mul(qn(4)));
  steps.push({ label: 'This is a biquadratic $x^4 + bx^2 + c$. With $u = x^2$ it becomes $u^2 + bu + c = 0$, so', katex: `x^2 = \\frac{-b \\pm \\sqrt{b^2-4c}}{2}, \\qquad b = ${qt(b)},\\ c = ${qt(c)},\\ b^2 - 4c = ${qt(D)}` });

  // roots α^2, β^2 as TeX
  const half = (q) => q.div(qn(2));
  let u1, u2;
  if (isSquareQ(D)) {
    const r = new Q(sqrtBig(D.n), sqrtBig(D.d));
    u1 = half(b.neg().add(r)); u2 = half(b.neg().sub(r));
    steps.push({ label: 'Step 1 (irreducible?): $b^2-4c$ is a perfect square, so f factors into two quadratics over ℚ:', katex: `f(x) = \\left(x^2 - ${qt(u1)}\\right)\\left(x^2 - ${qt(u2)}\\right)` });
    // splitting field of product of two quadratics
    const parts = [u1, u2].filter(u => !isSquareQ(u));
    const gens = parts.map(u => genTex(u));
    let sameField = false;
    if (parts.length === 2) sameField = isSquareQ(parts[0].mul(parts[1]));
    const degK = parts.length === 0 ? 1 : (parts.length === 1 || sameField ? 2 : 4);
    const grp = degK === 1 ? R`\{e\}` : degK === 2 ? R`\mathbb{Z}_2` : R`\mathbb{Z}_2 \times \mathbb{Z}_2`;
    const K = degK === 1 ? R`\mathbb{Q}` : `\\mathbb{Q}\\left(${sameField ? gens[0] : gens.join(', ')}\\right)`;
    steps.push({ label: 'The splitting field is generated by the square roots of the two values of $x^2$:', katex: `K = ${K}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{K = ${K},\\ [K:\\mathbb{Q}] = ${degK},\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong ${grp}}` });
    return { answer: `K = ${K},\\ [K:\\mathbb{Q}] = ${degK},\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong ${grp}`, steps };
  }
  // b^2-4c not a square: f is reducible only as (x^2+px+q)(x^2-px+q) with q^2 = c, p^2 = 2q - b
  let reducible = null;
  if (isSquareQ(c)) {
    const q0 = new Q(sqrtBig(c.n), sqrtBig(c.d));
    for (const q of [q0, q0.neg()]) {
      const p2 = q.mul(qn(2)).sub(b);
      if (isSquareQ(p2) && !p2.isZero()) { reducible = { q, p: new Q(sqrtBig(p2.n), sqrtBig(p2.d)) }; break; }
    }
  }
  const sqD = sqrtTex(D);
  // α^2 = (-b + √D)/2
  const u1Tex = (() => {
    const { out, inside } = P.simplifyRadical(D.n * D.d);
    const den = D.d; // √D = out√inside / den
    // (-b ± (out/den)√inside)/2
    const A = half(b.neg()), B = new Q(out, den * 2n);
    const Bt = B.equals(qn(1)) ? '' : qt(B);
    return (sgn) => `${A.isZero() ? (sgn < 0 ? '-' : '') : `${qt(A)} ${sgn < 0 ? '-' : '+'} `}${Bt}\\sqrt{${inside}}`;
  })();
  if (reducible) {
    const { p: pp, q } = reducible;
    steps.push({ label: 'Step 1 (irreducible?): f has no rational roots, but it factors into two quadratics:', katex: `f(x) = \\left(x^2 + ${qt(pp)}x ${q.isNegative() ? '-' : '+'} ${qt(q.isNegative() ? q.neg() : q)}\\right)\\left(x^2 - ${qt(pp)}x ${q.isNegative() ? '-' : '+'} ${qt(q.isNegative() ? q.neg() : q)}\\right)` });
    const disc = pp.mul(pp).sub(q.mul(qn(4)));
    const K = `\\mathbb{Q}\\left(${genTex(disc)}\\right)`;
    steps.push({ label: 'Both quadratic factors have the same discriminant, so one square root generates the splitting field:', katex: `K = ${K}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{K = ${K},\\ [K:\\mathbb{Q}] = 2,\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong \\mathbb{Z}_2}` });
    return { answer: `K = ${K},\\ [K:\\mathbb{Q}] = 2,\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong \\mathbb{Z}_2`, steps };
  }
  steps.push({ label: 'Step 1 (irreducible): $b^2 - 4c$ is not a square, so f has no factor $x^2 - r$ with r rational. A factorisation $(x^2+px+q)(x^2-px+q)$ would need $q^2 = c$ and $p^2 = 2q - b$ to be rational squares, which is not the case. So f is irreducible over ℚ.', katex: '' });
  steps.push({ label: 'Step 2 (roots): write $\\alpha^2$ and $\\beta^2$ for the two values of $x^2$. The four roots are $\\pm\\alpha, \\pm\\beta$:', katex: `\\alpha = \\sqrt{${u1Tex(1)}}, \\qquad \\beta = \\sqrt{${u1Tex(-1)}}` });
  steps.push({ label: 'Step 3: the key quantities are $\\alpha^2\\beta^2 = c$ and $\\alpha^2 - \\beta^2 = \\sqrt{b^2 - 4c}$:', katex: `\\alpha\\beta = \\pm\\sqrt{c} = \\pm ${sqrtTex(c)}` });
  const cSq = isSquareQ(c);
  const cD = c.mul(D);
  const discTex = `\\operatorname{disc}(f) = 16\\,c\\,(b^2-4c)^2 = ${qt(qn(16).mul(c).mul(D).mul(D))}`;
  if (cSq) {
    // V4
    const s = new Q(sqrtBig(c.n), sqrtBig(c.d));
    const g1 = b.neg().add(s.mul(qn(2))), g2 = b.neg().sub(s.mul(qn(2)));
    const K = `\\mathbb{Q}\\left(${genTex(g1)}, ${genTex(g2)}\\right)`;
    steps.push({ label: 'Step 4: $c$ is a perfect square, so $\\alpha\\beta \\in \\mathbb{Q}$ and $\\beta = \\sqrt{c}/\\alpha \\in \\mathbb{Q}(\\alpha)$. Using $(\\alpha \\pm \\beta)^2 = -b \\pm 2\\sqrt{c}$, the splitting field is generated by two square roots:', katex: `K = \\mathbb{Q}(\\alpha) = ${K}` });
    steps.push({ label: 'Step 5: $[K:\\mathbb{Q}] = 4$ and every non-identity automorphism has order 2 (each changes the sign of one or both square roots).', katex: discTex });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{K = ${K},\\ [K:\\mathbb{Q}] = 4,\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong \\mathbb{Z}_2 \\times \\mathbb{Z}_2 \\text{ (Klein four-group)}}` });
    return { answer: `K = ${K},\\ [K:\\mathbb{Q}] = 4,\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong \\mathbb{Z}_2 \\times \\mathbb{Z}_2`, steps };
  }
  if (isSquareQ(cD)) {
    // C4
    const kq = new Q(sqrtBig(cD.n), sqrtBig(cD.d)); // c(b^2-4c) = k^2
    // √c = k/√D and √D = 2α^2 + b
    const coef = kq.div(D); // √c = (k/D)·√D
    steps.push({ label: `Step 4: $c\\,(b^2-4c) = ${qt(cD)} = (${qt(kq)})^2$ is a perfect square, so $\\sqrt{c} = \\dfrac{${qt(kq)}}{\\sqrt{b^2-4c}}$ lies in $\\mathbb{Q}(\\sqrt{b^2-4c}) \\subset \\mathbb{Q}(\\alpha)$ (because $\\sqrt{b^2-4c} = 2\\alpha^2 + b$). Hence $\\beta = \\sqrt{c}/\\alpha \\in \\mathbb{Q}(\\alpha)$:`, katex: `\\alpha\\beta = \\sqrt{c} = ${coef.equals(qn(1)) ? '' : qt(coef)}\\left(2\\alpha^2 ${b.isNegative() ? '-' : '+'} ${qt(b.isNegative() ? b.neg() : b)}\\right) \\in \\mathbb{Q}(\\alpha)` });
    steps.push({ label: 'Step 5: so all four roots lie in $\\mathbb{Q}(\\alpha)$, and since f is irreducible of degree 4:', katex: `K = \\mathbb{Q}(\\alpha) = \\mathbb{Q}\\left(\\sqrt{${u1Tex(1)}}\\right), \\qquad [K:\\mathbb{Q}] = \\deg f = 4` });
    steps.push({ label: 'Step 6 (the group): let σ send α ↦ β. Then σ(β) = σ(√c)/σ(α) = (−√c)/β = −α, because σ(√(b²−4c)) = σ(2α² + b) = 2β² + b = −√(b²−4c) changes the sign of √c. So σ: α → β → −α → −β → α has order 4.', katex: R`\sigma:\ \alpha \mapsto \beta \mapsto -\alpha \mapsto -\beta \mapsto \alpha, \qquad \sigma^4 = e` });
    steps.push({ label: 'A group of order 4 containing an element of order 4 is cyclic.', katex: discTex });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{K = \\mathbb{Q}\\left(\\sqrt{${u1Tex(1)}}\\right),\\ [K:\\mathbb{Q}] = 4,\\ \\mathrm{Gal}(K/\\mathbb{Q}) = \\langle\\sigma\\rangle \\cong \\mathbb{Z}_4 \\text{ (cyclic of order 4)}}` });
    return { answer: `K = \\mathbb{Q}\\left(\\sqrt{${u1Tex(1)}}\\right),\\ [K:\\mathbb{Q}] = 4,\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong \\mathbb{Z}_4`, steps };
  }
  // D4
  const pureQuartic = b.isZero();
  const Ktex = pureQuartic
    ? (c.isNegative() ? `\\mathbb{Q}\\left(\\sqrt[4]{${qt(c.neg())}},\\ i\\right)` : `\\mathbb{Q}\\left(\\alpha,\\ ${genTex(c)}\\right)`)
    : `\\mathbb{Q}\\left(\\alpha,\\ ${genTex(c)}\\right)`;
  steps.push({ label: 'Step 4: neither $c$ nor $c\\,(b^2-4c)$ is a square in ℚ. Then $\\sqrt{c} = \\alpha\\beta \\notin \\mathbb{Q}(\\alpha)$, so the splitting field needs both α and √c:', katex: `K = ${Ktex}` });
  steps.push({ label: 'Step 5: $[\\mathbb{Q}(\\alpha):\\mathbb{Q}] = 4$ and $[K:\\mathbb{Q}(\\alpha)] = 2$, so $[K:\\mathbb{Q}] = 8$. The only transitive subgroup of $S_4$ of order 8 is the dihedral group (the symmetries of a square whose corners are $\\alpha, \\beta, -\\alpha, -\\beta$).', katex: discTex });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{K = ${Ktex},\\ [K:\\mathbb{Q}] = 8,\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong D_4 \\text{ (dihedral of order 8)}}` });
  return { answer: `K = ${Ktex},\\ [K:\\mathbb{Q}] = 8,\\ \\mathrm{Gal}(K/\\mathbb{Q}) \\cong D_4`, steps };
}

// ---------------------------------------------------------------- 3. Calculus of variations
// Fit a polynomial (degree <= 3) to f on sample points; null if f is not such a polynomial
function fitPoly(f, maxDeg = 8) {
  const n = maxDeg + 1;
  const xs = Array.from({ length: n }, (_, i) => i - Math.floor(n / 2)), ys = xs.map(f);
  if (ys.some(v => !Number.isFinite(v))) return null;
  // Newton divided differences -> monomial coefficients
  const coef = ys.slice();
  for (let j = 1; j < n; j++) for (let i = n - 1; i >= j; i--) coef[i] = (coef[i] - coef[i - 1]) / (xs[i] - xs[i - j]);
  let poly = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const np = Array(n).fill(0);
    for (let d = 0; d < n; d++) { if (d + 1 < n) np[d + 1] += poly[d]; np[d] -= poly[d] * xs[i]; }
    np[0] += coef[i]; poly = np;
  }
  for (const x of [-1.7, 4.3, 0.5, 2.9]) {
    const v = poly.reduce((acc, c, d) => acc + c * x ** d, 0), w = f(x);
    if (!Number.isFinite(w) || Math.abs(v - w) > 1e-6 * Math.max(1, Math.abs(w))) return null;
  }
  const qs = poly.map(c => (Math.abs(c) < 1e-9 ? qn(0) : toFrac(c, 1000)));
  if (qs.some(q => !q)) return null;
  return qs; // low -> high
}
const polyEval = (qs, x) => qs.reduce((s, c, d) => s + c.toNumber() * x ** d, 0);
const polyD = (qs) => qs.slice(1).map((c, i) => c.mul(qn(i + 1))).concat([qn(0)]);
const polyTex = (qs, v = 'x') => { const t = P.trim(qs.slice()); return P.degree(t) <= 0 && t[0].isZero() ? '0' : P.toTex(t, v); };
const isZeroPolyQ = (qs) => qs.every(q => q.isZero());

// x-value: number or rational multiple of π
function parsePoint(str) {
  const node = A1.parseMath(String(str).replace(/^\((.*)\)$/, '$1'));
  if (!node || S.variables(node).size) return null;
  const v = S.evaluate(node);
  if (!Number.isFinite(v)) return null;
  const r = toFrac(v, 360), rp = toFrac(v / Math.PI, 24);
  if (r) return { v, q: r, tex: qt(r), pi: null };
  if (rp) {
    const tex = rp.equals(qn(1)) ? '\\pi' : rp.d === 1n ? `${rp.n}\\pi` : `\\frac{${rp.n === 1n ? '' : rp.n}\\pi}{${rp.d}}`;
    return { v, q: null, tex, pi: rp };
  }
  return { v, q: null, tex: fmt(v), pi: null };
}

// y'' - λ y = R(x) (R polynomial) with y(x0) = A, y(x1) = B: pushes the steps, returns the solution
function linearBVP(lam, RP, L, Rb, steps, W) {
  let kind, kQ = null, kTex = '', kNum;
  if (lam.isZero()) kind = 'lin';
  else {
    kind = lam.isNegative() ? 'trig' : 'hyp';
    const k2 = lam.isNegative() ? lam.neg() : lam;
    kNum = Math.sqrt(k2.toNumber());
    if (isSquareQ(k2)) { kQ = new Q(sqrtBig(k2.n), sqrtBig(k2.d)); kTex = kQ.equals(qn(1)) ? '' : (kQ.d === 1n ? qt(kQ) : null); }
    else kTex = `${sqrtTex(k2)}\\,`;
  }
  const arg = (v = 'x') => {
    if (kQ && kQ.d !== 1n) return `\\left(\\frac{${kQ.n === 1n ? '' : kQ.n}${v}}{${kQ.d}}\\right)`;
    if (kQ && kQ.equals(qn(1))) return ` ${v}`;
    return `(${kTex}${v})`;
  };
  const phi = kind === 'lin' ? [(x) => 1, (x) => x] : kind === 'trig' ? [(x) => Math.cos(kNum * x), (x) => Math.sin(kNum * x)] : [(x) => Math.cosh(kNum * x), (x) => Math.sinh(kNum * x)];
  const phiTex = kind === 'lin' ? ['1', 'x'] : kind === 'trig' ? [`\\cos${arg()}`, `\\sin${arg()}`] : [`\\cosh${arg()}`, `\\sinh${arg()}`];
  // particular solution (polynomial)
  let yp;
  if (kind === 'lin') {
    // integrate R twice
    yp = [qn(0), qn(0), ...RP.map((c, i) => c.div(qn((i + 1) * (i + 2))))].slice(0, 6);
  } else {
    // y'' - λy = R  ->  y_p = -(R/λ + R''/λ² + R''''/λ³ + ...)  (finite for a polynomial R)
    yp = RP.map(() => qn(0));
    let Rk = RP.slice(), pw = lam;
    for (let j = 0; j < 8 && !isZeroPolyQ(Rk); j++) {
      yp = yp.map((c, i) => c.sub((Rk[i] || qn(0)).div(pw)));
      Rk = polyD(polyD(Rk)); pw = pw.mul(lam);
    }
  }
  const homTex = kind === 'lin' ? 'C_1 + C_2 x' : `C_1${phiTex[0]} + C_2${phiTex[1]}`;
  steps.push({ label: kind === 'lin' ? 'Step 2: integrate twice:' : `Step 2: the characteristic equation $m^2 ${lam.isNegative() ? '+' : '-'} ${qt(lam.isNegative() ? lam.neg() : lam)} = 0$ has ${kind === 'trig' ? 'imaginary roots $m = \\pm ' + (kQ ? (kQ.equals(qn(1)) ? '' : qt(kQ)) : sqrtTex(lam.neg())) + 'i$' : 'real roots $m = \\pm ' + (kQ ? qt(kQ) : sqrtTex(lam)) + '$'}, so the general solution is`, katex: `y(x) = ${homTex}${isZeroPolyQ(yp) ? '' : ` + ${polyTex(yp)}`}`.replace('+ -', '- ') });

  // boundary conditions
  const x0 = L.x.v, x1 = Rb.x.v, A = L.val.v, B = Rb.val.v;
  const M = [[phi[0](x0), phi[1](x0)], [phi[0](x1), phi[1](x1)]];
  const rhs = [A - polyEval(yp, x0), B - polyEval(yp, x1)];
  const det = M[0][0] * M[1][1] - M[0][1] * M[1][0];
  steps.push({ label: 'Step 3: apply the boundary conditions:', katex: `y(${L.x.tex}) = ${L.val.tex}, \\qquad y(${Rb.x.tex}) = ${Rb.val.tex}` });
  if (Math.abs(det) < 1e-10) {
    const consistent = Math.abs(rhs[1] - (M[1][0] / (M[0][0] || 1)) * rhs[0]) < 1e-9;
    steps.push({ label: consistent
      ? `The two conditions are not independent: the interval length is a multiple of the period, so there are infinitely many ${W.plural} through the two points (a whole family).`
      : `The two conditions contradict each other: no solution of the ${W.eq} passes through both points.`, katex: '' });
    const ans = consistent ? `\\text{infinitely many ${W.plural}${W.many}}` : `\\text{no ${W.one} satisfies both boundary conditions}`;
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
    return { done: { answer: ans, steps } };
  }
  const C1 = (rhs[0] * M[1][1] - M[0][1] * rhs[1]) / det;
  const C2 = (M[0][0] * rhs[1] - rhs[0] * M[1][0]) / det;
  // exact forms when possible
  const exact = (v) => { const q = toFrac(v, 1000); return q ? qt(q) : null; };
  // a constant can only be a plain fraction when the basis functions take exact values at the end points
  const exactEnd = (pt) => kind === 'lin' || pt.v === 0 || (kind === 'trig' && kQ && pt.pi && exactSinPi(kQ.mul(pt.pi)) && exactSinPi(kQ.mul(pt.pi).add(new Q(1n, 2n))));
  const phiExact = exactEnd(L.x) && exactEnd(Rb.x);
  let c1t = phiExact || Math.abs(x0) < 1e-12 ? exact(C1) : null, c2t = phiExact ? exact(C2) : null;
  if (!c2t && Math.abs(x0) < 1e-12 && c1t !== null) {
    // C2 = (B - yp(x1) - C1·φ1(x1)) / φ2(x1) with φ2(x1) shown symbolically
    const num = rhs[1] - C1 * phi[0](x1);
    const nq = toFrac(num, 1000);
    // argument k·x1 written out: sinh 2, sin(3π/2), ...
    const atVal = (() => {
      if (kQ && Rb.x.q) { const v = kQ.mul(Rb.x.q); return v.d === 1n ? `${v.n}` : qt(v); }
      if (kQ && Rb.x.pi) { const r = kQ.mul(Rb.x.pi); return r.equals(qn(1)) ? '\\pi' : r.d === 1n ? `${r.n}\\pi` : `\\frac{${r.n === 1n ? '' : r.n}\\pi}{${r.d}}`; }
      return kQ && kQ.equals(qn(1)) ? Rb.x.tex : `${kTex}\\cdot ${Rb.x.tex}`;
    })();
    const at = kind === 'lin' ? Rb.x.tex : (/^[0-9]+$|^\\pi$/.test(atVal) ? ` ${atVal}` : `\\left(${atVal}\\right)`);
    const den = kind === 'trig' ? `\\sin${at}` : kind === 'hyp' ? `\\sinh${at}` : Rb.x.tex;
    // exact sine values such as sin(π/4) = √2/2
    let ex = null;
    if (kind === 'trig' && kQ && Rb.x.pi) ex = exactSinPi(kQ.mul(Rb.x.pi));
    if (nq && ex && ex.tex === '\\frac{\\sqrt{2}}{2}') c2t = `${nq.equals(qn(1)) ? '' : qt(nq)}\\sqrt{2}`;
    else if (nq && ex && ex.tex === '\\frac{\\sqrt{3}}{2}') { const cc = nq.mul(new Q(2n, 3n)); c2t = `${cc.equals(qn(1)) ? '' : qt(cc)}\\sqrt{3}`; }
    else if (nq) c2t = nq.equals(qn(1)) ? `\\frac{1}{${den}}` : `\\frac{${qt(nq)}}{${den}}`;
    else {
      // numerator = (B - y_p(x1)) - C1·φ1(x1), shown symbolically
      const r1 = toFrac(rhs[1], 1000), q1 = toFrac(C1, 1000);
      if (r1 && q1 && kind !== 'lin') {
        const f1 = kind === 'trig' ? `\\cos${at}` : `\\cosh${at}`;
        const c1abs = q1.isNegative() ? q1.neg() : q1;
        const numTex = `${r1.isZero() ? (q1.isNegative() ? '' : '-') : qt(r1) + (q1.isNegative() ? ' + ' : ' - ')}${c1abs.equals(qn(1)) ? '' : qt(c1abs)}${f1}`;
        c2t = `\\frac{${numTex}}{${den}}`;
      }
    }
  }
  if (c1t === null) c1t = `${fmt(C1)}`;
  if (c2t === null) c2t = `${fmt(C2)}`;
  steps.push({ label: 'Solving the two linear equations gives the constants:', katex: `C_1 = ${c1t}, \\qquad C_2 ${/^-?\d/.test(c2t) && !toFrac(C2, 1000) ? '\\approx' : '='} ${c2t}` });
  // final extremal TeX
  const term = (ct, ft) => {
    if (ct === '0') return '';
    if (ft === '1') return ct;
    if (ct === '1') return ft.replace(/^\s+/, '');
    if (ct === '-1') return '-' + ft.replace(/^\s+/, '');
    if (/^\\frac\{1\}\{(.+)\}$/.test(ct)) return `\\frac{${ft.replace(/^\s+/, '')}}{${ct.match(/^\\frac\{1\}\{(.+)\}$/)[1]}}`;
    return `${ct}${ft}`;
  };
  let parts = [term(c1t, phiTex[0]), term(c2t, phiTex[1]), isZeroPolyQ(yp) ? '' : polyTex(yp)].filter(Boolean);
  // polynomial case: write C1 + C2 x + y_p as one polynomial
  const q1 = toFrac(C1, 1000), q2 = toFrac(C2, 1000);
  if (kind === 'lin' && q1 && q2) { const all = yp.slice(); while (all.length < 2) all.push(qn(0)); all[0] = all[0].add(q1); all[1] = all[1].add(q2); parts = [polyTex(all)]; }
  let yTex = parts.length ? parts.join(' + ').replace(/\+ -/g, '- ') : '0';
  yTex = yTex.replace(/\\(sin|cos|sinh|cosh) x\b/g, '\\$1 x');
  steps.push({ label: `The ${W.one} is`, katex: `y(x) = ${yTex}` });
  return { C1, C2, phi, yp, kind, kQ, kNum, yTex };

}

function findBCs(s) {
  const bcs = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== 'y' || /[a-z]/i.test(s[i - 1] || '')) continue;
    let j = i + 1; while (s[j] === ' ') j++;
    if (s[j] === "'") continue;
    if (s[j] !== '(') continue;
    let d = 0, end = -1;
    for (let t = j; t < s.length; t++) { if (s[t] === '(') d++; else if (s[t] === ')' && --d === 0) { end = t; break; } }
    if (end < 0) continue;
    let t = end + 1; while (s[t] === ' ') t++;
    if (s[t] !== '=') continue;
    t++; while (s[t] === ' ') t++;
    // value: up to a comma, semicolon, " and", or the end
    const rest = s.slice(t);
    const vm = rest.match(/^(.+?)(?=\s*(?:,|;|\band\b|\.\s|\.$|$))/);
    if (!vm) continue;
    const x = parsePoint(s.slice(j + 1, end)), val = parsePoint(vm[1].replace(/\s+/g, ''));
    if (x && val && !bcs.some(b => Math.abs(b.x.v - x.v) < 1e-12)) bcs.push({ x, val });
    i = end;
  }
  return bcs;
}

function solveVariationalQuestion(raw) {
  const k = A1.keyText(raw);
  const s = plain(raw);
  if (!/∫/.test(s)) return null;
  if (!/(y'|y′)/.test(s)) return null;
  if (!/functional|extremal|extremum|extremi|minimi|maximi|euler-?lagrange|j\[y\]|i\[y\]|variation|stationary/.test(k) && !/y\(\s*[^)]*\)\s*=/.test(s)) return null;
  // boundary conditions y(a) = A
  const bcs = findBCs(s);
  if (bcs.length !== 2) return null;
  bcs.sort((a, b) => a.x.v - b.x.v);
  const [L, Rb] = bcs;

  // integrand: between ∫ (+ limits) and dx
  const im = s.match(/∫([\s\S]*?)d\s*x\b/);
  if (!im) return null;
  let body = im[1];
  // remove "_a^b" limits (balanced parentheses)
  const takeGroup = (str, i) => {
    while (str[i] === ' ') i++;
    if (str[i] === '(') { let d = 0; for (let j = i; j < str.length; j++) { if (str[j] === '(') d++; else if (str[j] === ')' && --d === 0) return j + 1; } return -1; }
    const m2 = str.slice(i).match(/^[^\s^_(\[]+/); return m2 ? i + m2[0].length : -1;
  };
  { let i = 0; while (body[i] === ' ') i++;
    if (body[i] === '_') { const e1 = takeGroup(body, i + 1); if (e1 > 0) { let j = e1; while (body[j] === ' ') j++; if (body[j] === '^') { const e2 = takeGroup(body, j + 1); if (e2 > 0) body = body.slice(e2); } } } }
  // PDF: "∫0π/2 [ ... ]": drop anything before the first bracket
  const firstBr = body.search(/[\[(]/);
  if (firstBr > 0 && /^[\s0-9π\/.\-+a-z]*$/i.test(body.slice(0, firstBr))) body = body.slice(firstBr);
  body = body.replace(/\[/g, '(').replace(/\]/g, ')').trim();
  if (!body) return null;
  let expr = body.replace(/y\s*''/g, 'Ypp').replace(/y\s*'/g, 'p').replace(/\bYpp\b/g, 'q');
  if (/q/.test(expr)) return null; // second derivatives: not handled here
  if (!/\^/.test(expr)) expr = expr.replace(/([a-z)])\s*(\d)(?![\d.])/g, '$1^$2'); // PDF-flattened powers: y2 -> y^2
  const node = S.tryParse(expr) || A1.parseMath(expr);
  if (!node) return null;
  const vars = [...S.variables(node)];
  if (vars.some(v => !['x', 'y', 'p'].includes(v)) || !vars.includes('p')) return null;
  const F = (pp, yy, xx) => S.evaluate(node, { p: pp, y: yy, x: xx });

  // F = a p^2 + e p y + b y^2 + h(x) y + g(x) p + k(x)
  const coefAt = (x) => {
    const f00 = F(0, 0, x);
    return {
      a: (F(1, 0, x) + F(-1, 0, x) - 2 * f00) / 2,
      b: (F(0, 1, x) + F(0, -1, x) - 2 * f00) / 2,
      e: F(1, 1, x) - F(1, 0, x) - F(0, 1, x) + f00,
      h: (F(0, 1, x) - F(0, -1, x)) / 2,
      g: (F(1, 0, x) - F(-1, 0, x)) / 2,
      k: f00
    };
  };
  const c0 = coefAt(0.3), c1 = coefAt(1.7);
  // F depending on y' only (e.g. (y')^3, sqrt(1 + y'^2)): the extremals are straight lines
  const onlyP = [[0.4, 1.3, 2.2], [1.1, -0.7, 0.3]].every(([pp, y1, x1]) => Math.abs(F(pp, y1, x1) - F(pp, 0, 0)) < 1e-9 * Math.max(1, Math.abs(F(pp, 0, 0))));
  if (onlyP) return straightLineExtremal(node, F, L, Rb);
  for (const key of ['a', 'b', 'e']) if (Math.abs(c0[key] - c1[key]) > 1e-9) return null; // coefficients must be constant
  // the model must reproduce F (no cubic terms etc.)
  for (const [pp, yy, xx] of [[2.1, -1.3, 0.7], [-0.6, 2.2, 1.4], [3.3, 0.9, 2.6]]) {
    const c = coefAt(xx);
    const model = c.a * pp * pp + c.e * pp * yy + c.b * yy * yy + c.h * yy + c.g * pp + c.k;
    if (Math.abs(model - F(pp, yy, xx)) > 1e-7 * Math.max(1, Math.abs(model))) return null;
  }
  const aQ = toFrac(c0.a, 1000), bQ = toFrac(c0.b, 1000), eQ = toFrac(c0.e, 1000);
  if (!aQ || !bQ || !eQ || aQ.isZero()) return null;
  const hP = fitPoly(x => coefAt(x).h), gP = fitPoly(x => coefAt(x).g);
  if (!hP || !gP) return null;
  // Euler–Lagrange: 2a y'' - 2b y = h(x) - g'(x)
  const rP = hP.map((c, i) => c.sub(polyD(gP)[i]));
  const lam = bQ.div(aQ);                            // y'' - λ y = r/(2a)
  const RP = rP.map(c => c.div(aQ.mul(qn(2))));      // right-hand side R(x)

  const steps = [];
  const Ftex = S.tex(S.simplify(node)).replace(/\bp\b/g, "y'");
  steps.push({ label: 'Functional and boundary conditions:', katex: `J[y] = \\int_{${L.x.tex}}^{${Rb.x.tex}} \\left(${Ftex}\\right)dx, \\qquad y(${L.x.tex}) = ${L.val.tex},\\ y(${Rb.x.tex}) = ${Rb.val.tex}` });
  steps.push({ label: "Step 1 (Euler–Lagrange equation): an extremal satisfies $\\dfrac{\\partial F}{\\partial y} - \\dfrac{d}{dx}\\dfrac{\\partial F}{\\partial y'} = 0$. Here:", katex: `\\frac{\\partial F}{\\partial y} = ${polyTex([rP[0].add(hP[0]).sub(rP[0]), ...hP.slice(1)].map((c, i) => c)) === '0' && bQ.isZero() && eQ.isZero() ? '0' : '\\dots'}` });
  // replace the placeholder step with an explicit one
  steps.pop();
  const Fy = [];
  if (!eQ.isZero()) Fy.push(`${eQ.equals(qn(1)) ? '' : qt(eQ)}y'`);
  if (!bQ.isZero()) Fy.push(`${qt(bQ.mul(qn(2)))}y`);
  if (!isZeroPolyQ(hP)) Fy.push(polyTex(hP));
  const Fp = [`${qt(aQ.mul(qn(2)))}y'`];
  if (!eQ.isZero()) Fp.push(`${eQ.equals(qn(1)) ? '' : qt(eQ)}y`);
  if (!isZeroPolyQ(gP)) Fp.push(polyTex(gP));
  const join = (arr) => arr.length ? arr.join(' + ').replace(/\+ -/g, '- ') : '0';
  steps.push({ label: "Step 1 (Euler–Lagrange equation): an extremal satisfies $\\dfrac{\\partial F}{\\partial y} - \\dfrac{d}{dx}\\dfrac{\\partial F}{\\partial y'} = 0$, with", katex: `\\frac{\\partial F}{\\partial y} = ${join(Fy)}, \\qquad \\frac{\\partial F}{\\partial y'} = ${join(Fp)}` });
  const lhsTex = `${qt(aQ.mul(qn(2)))}y'' ${bQ.isZero() ? '' : (bQ.isNegative() ? '+ ' + qt(bQ.mul(qn(2)).neg()) : '- ' + qt(bQ.mul(qn(2)))) + 'y'}`.replace('1y', 'y');
  const cf = (q) => (q.equals(qn(1)) ? '' : qt(q));
  steps.push({ label: 'So the Euler–Lagrange equation is the linear ODE', katex: `${lhsTex} = ${polyTex(rP)} \\quad\\Longleftrightarrow\\quad y'' ${lam.isZero() ? '' : (lam.isNegative() ? '+ ' + cf(lam.neg()) : '- ' + cf(lam)) + 'y'} = ${polyTex(RP)}` });

  const W = { one: 'extremal', plural: 'extremals', eq: 'Euler–Lagrange equation', many: ' (no unique minimiser)' };
  const sol = linearBVP(lam, RP, L, Rb, steps, W);
  if (sol.done) return sol.done;
  const { C1, C2, phi, yp, kind, kQ, kNum, yTex } = sol;
  const x0 = L.x.v, x1 = Rb.x.v;

  // value of J along the extremal (Simpson's rule on the explicit solution)
  const yv = (x) => C1 * phi[0](x) + C2 * phi[1](x) + polyEval(yp, x);
  const dyv = (x) => (yv(x + 1e-5) - yv(x - 1e-5)) / 2e-5;
  let Jv = 0; const N = 2000, hstep = (x1 - x0) / N;
  for (let i = 0; i <= N; i++) { const x = x0 + i * hstep; const w = i === 0 || i === N ? 1 : (i % 2 ? 4 : 2); Jv += w * F(dyv(x), yv(x), x); }
  Jv *= hstep / 3;
  const Jq = toFrac(Jv, 60);
  steps.push({ label: 'Value of the functional along the extremal:', katex: `J[y] ${Jq ? '= ' + qt(Jq) : '\\approx ' + fmt(Jv)}` });

  // second variation
  const aPos = !aQ.isNegative();
  steps.push({ label: `Step 4 (Legendre's condition): $F_{y'y'} = ${qt(aQ.mul(qn(2)))} ${aPos ? '> 0' : '< 0'}$ everywhere, so the strengthened Legendre condition for a ${aPos ? 'minimum' : 'maximum'} holds (and rules out a ${aPos ? 'maximum' : 'minimum'}).`, katex: `\\frac{\\partial^2 F}{\\partial y'^2} = ${qt(aQ.mul(qn(2)))} ${aPos ? '> 0' : '< 0'}` });
  steps.push({ label: 'Step 5 (second variation): for a variation $\\eta$ with $\\eta(x_0) = \\eta(x_1) = 0$ (the $y\\,y\'$ term integrates to zero),', katex: `\\delta^2 J[\\eta] = \\int_{${L.x.tex}}^{${Rb.x.tex}} \\left(${qt(aQ.mul(qn(2)))}\\,\\eta'^2 ${bQ.isNegative() ? '-' : '+'} ${qt(bQ.mul(qn(2)).isNegative() ? bQ.mul(qn(2)).neg() : bQ.mul(qn(2)))}\\,\\eta^2\\right)dx` });
  const len = x1 - x0;
  let verdict, verdictTex;
  if (kind !== 'trig') {
    steps.push({ label: `Step 6 (Jacobi's condition): the Jacobi equation $${qt(aQ)}\\,h'' ${bQ.isNegative() ? '+' : '-'} ${qt(bQ.isNegative() ? bQ.neg() : bQ)}\\,h = 0$ with $h(x_0) = 0$ has ${kind === 'lin' ? '$h = x - x_0$' : `$h = \\sinh(${kQ ? (kQ.equals(qn(1)) ? '' : qt(kQ)) : sqrtTex(lam)}(x - x_0))$`}, which never vanishes again: there is no conjugate point. Directly: both terms of $\\delta^2 J$ have the sign of $F_{y'y'}$, so $\\delta^2 J[\\eta] ${aPos ? '> 0' : '< 0'}$ for every $\\eta \\ne 0$.`, katex: '' });
    verdict = aPos ? 'minimum' : 'maximum';
  } else {
    const conj = x0 + Math.PI / kNum;
    const conjTex = (() => { const pp = parsePoint(String(conj)); return pp ? pp.tex : fmt(conj); })();
    steps.push({ label: `Step 6 (Jacobi's condition): the Jacobi equation $h'' + ${cf(lam.neg())}h = 0$ with $h(x_0) = 0$ gives $h = \\sin${kQ && kQ.equals(qn(1)) ? '(x - x_0)' : `\\left(${kQ ? qt(kQ) : sqrtTex(lam.neg())}(x - x_0)\\right)`}$, whose next zero (the conjugate point) is`, katex: `x^{*} = x_0 + ${kQ && kQ.equals(qn(1)) ? '\\pi' : `\\frac{\\pi}{${kQ ? qt(kQ) : sqrtTex(lam.neg())}}`} = ${conjTex}` });
    if (conj > x1 + 1e-12) {
      steps.push({ label: `The conjugate point lies outside the interval ($x^* > ${Rb.x.tex}$), so Jacobi's condition holds. Directly: by Wirtinger's inequality, $\\int \\eta'^2 \\ge \\left(\\frac{\\pi}{x_1 - x_0}\\right)^2 \\int \\eta^2$, and $\\left(\\frac{\\pi}{x_1-x_0}\\right)^2 = ${fmt((Math.PI / len) ** 2)} > ${qt(lam.neg())}$, so`, katex: `\\delta^2 J[\\eta] ${aPos ? '\\ge' : '\\le'} ${qt(aQ.mul(qn(2)))}\\left(\\frac{\\pi^2}{(x_1-x_0)^2} - ${qt(lam.neg())}\\right)\\int \\eta^2\\,dx ${aPos ? '> 0' : '< 0'} \\quad (\\eta \\ne 0)` });
      verdict = aPos ? 'minimum' : 'maximum';
    } else {
      steps.push({ label: `The conjugate point lies inside the interval ($x^* < ${Rb.x.tex}$), so Jacobi's condition fails: for $\\eta = \\sin\\left(\\frac{\\pi (x-x_0)}{x_1-x_0}\\right)$ the second variation has the opposite sign to $F_{y'y'}$, while variations concentrated near one point have the same sign as $F_{y'y'}$. So $\\delta^2 J$ takes both signs.`, katex: '' });
      verdict = 'saddle';
    }
  }
  if (verdict === 'minimum') verdictTex = R`\text{a true (strong) minimum}`;
  else if (verdict === 'maximum') verdictTex = R`\text{a true (strong) maximum}`;
  else verdictTex = R`\text{not a minimum or maximum (saddle point)}`;
  steps.push({ label: verdict === 'saddle' ? 'Conclusion: the extremal is not a minimum (and not a maximum): it is a saddle point of J.' : `Conclusion: Legendre's and Jacobi's conditions both hold and $F$ is ${aPos ? 'convex' : 'concave'} in $y'$, so the extremal gives ${verdict === 'minimum' ? 'a minimum' : 'a maximum'} of J.`, katex: '' });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{y(x) = ${yTex},\\ J ${Jq ? '= ' + qt(Jq) : '\\approx ' + fmt(Jv)}:\\ ${verdictTex}}` });
  return { answer: `y = ${yTex}\\ (${verdict === 'saddle' ? R`\text{not a minimum: saddle point}` : R`\text{${verdict}}`})`, steps };
}


function straightLineExtremal(node, F, L, Rb) {
  const x0 = L.x.v, x1 = Rb.x.v, A = L.val.v, B = Rb.val.v;
  const m = (B - A) / (x1 - x0);
  const mq = toFrac(m, 1000), cq = toFrac(A - m * x0, 1000);
  const Ftex = S.tex(S.simplify(node)).replace(/\bp\b/g, "y'");
  const yTex = mq && cq ? polyTex([cq, mq]) : `${fmt(m)}x ${A - m * x0 < 0 ? '-' : '+'} ${fmt(Math.abs(A - m * x0))}`;
  const G2 = (F(m + 1e-3, 0, 0) - 2 * F(m, 0, 0) + F(m - 1e-3, 0, 0)) / 1e-6;
  const steps = [
    { label: 'Functional and boundary conditions:', katex: `J[y] = \\int_{${L.x.tex}}^{${Rb.x.tex}} ${Ftex.includes('+') || Ftex.includes('-') ? `\\left(${Ftex}\\right)` : Ftex}\\,dx, \\qquad y(${L.x.tex}) = ${L.val.tex},\\ y(${Rb.x.tex}) = ${Rb.val.tex}` },
    { label: "Step 1: F depends only on $y'$, so $\\partial F/\\partial y = 0$ and the Euler–Lagrange equation says $\\frac{d}{dx}F_{y'}(y') = 0$, i.e. $F_{y'}(y')$ is constant. Hence $y'$ is constant (wherever $F_{y'y'} \\ne 0$) and the extremals are straight lines:", katex: `y = mx + c` },
    { label: 'Step 2: the line through the two boundary points:', katex: `m = \\frac{${Rb.val.tex} - ${L.val.tex}}{${Rb.x.tex} - ${L.x.tex}}, \\qquad y(x) = ${yTex}` },
    { label: `Step 3 (Legendre's condition): along the line $F_{y'y'}(m) ${Math.abs(G2) < 1e-6 ? '= 0' : (G2 > 0 ? '> 0' : '< 0')}$ (≈ ${fmt(G2)}).`, katex: '' }
  ];
  let verdict;
  if (Math.abs(G2) < 1e-6) verdict = R`\text{Legendre's test is inconclusive}`;
  else verdict = G2 > 0 ? R`\text{a (weak) minimum}` : R`\text{a (weak) maximum}`;
  steps.push({ label: 'There are no conjugate points (the Jacobi equation is $h\'\' = 0$, so $h = x - x_0$ never vanishes again).', katex: '' });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{y(x) = ${yTex}:\\ ${verdict}}` });
  return { answer: `y = ${yTex}\\ (${verdict})`, steps };
}

// Boundary value problem y'' + c y = R(x) with y(a) = A, y(b) = B
function solveBVPQuestion(raw) {
  const s = plain(raw);
  if (/∫/.test(s) || !/y\s*''/.test(s)) return null;
  const bcs = findBCs(s);
  if (bcs.length !== 2 || /y\s*'\s*\(/.test(s)) return null;
  bcs.sort((a, b) => a.x.v - b.x.v);
  const [L, Rb] = bcs;
  const em = s.match(/(^|[\s,:;])([^,;:=]*y\s*''[^,;=]*)=([^,;=]+?)(?=\s*(?:,|;|$|\s(?:with|and|where|subject)\b))/);
  if (!em) return null;
  const lhs0 = em[2].replace(/^\s*(?:[a-z]+\s+)+/i, '').replace(/^.*:\s*/, '');
  let expr = `(${lhs0})-(${em[3]})`.replace(/y\s*''/g, 'q').replace(/y\s*'/g, 'p');
  expr = expr.replace(/^.*?(?=\()/, '');
  const node = S.tryParse(expr) || A1.parseMath(expr);
  if (!node) return null;
  const vars = [...S.variables(node)];
  if (vars.some(v => !['x', 'y', 'p', 'q'].includes(v)) || !vars.includes('q')) return null;
  const G = (q, p, y, x) => S.evaluate(node, { q, p, y, x });
  const cq = G(1, 0, 0, 0.5) - G(0, 0, 0, 0.5), cp = G(0, 1, 0, 0.5) - G(0, 0, 0, 0.5), cy = G(0, 0, 1, 0.5) - G(0, 0, 0, 0.5);
  if (Math.abs(cp) > 1e-12 || Math.abs(cq) < 1e-12) return null; // y' terms: left to the general ODE solver
  // linear check
  for (const [q, p, y, x] of [[2.3, 0, -1.1, 0.7], [-0.4, 0, 3.2, 1.9]]) {
    if (Math.abs(G(q, p, y, x) - (cq * q + cy * y + G(0, 0, 0, x))) > 1e-8) return null;
  }
  const rest = fitPoly(x => -G(0, 0, 0, x) / cq);
  const cqQ = toFrac(cq, 1000), cyQ = toFrac(cy, 1000);
  if (!rest || !cqQ || !cyQ) return null;
  const lam = cyQ.div(cqQ).neg();
  const steps = [{ label: 'Boundary value problem:', katex: `y'' ${lam.isZero() ? '' : (lam.isNegative() ? '+ ' : '- ') + (lam.isNegative() ? (lam.neg().equals(qn(1)) ? '' : qt(lam.neg())) : (lam.equals(qn(1)) ? '' : qt(lam))) + 'y'} = ${polyTex(rest)}, \\qquad y(${L.x.tex}) = ${L.val.tex},\\ y(${Rb.x.tex}) = ${Rb.val.tex}` }];
  const W = { one: 'solution', plural: 'solutions', eq: 'differential equation', many: '' };
  const sol = linearBVP(lam, rest, L, Rb, steps, W);
  if (sol.done) return sol.done;
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{y(x) = ${sol.yTex}}` });
  return { answer: `y = ${sol.yTex}`, steps };
}

module.exports = { solveMellinIntegral, solveGaloisQuestion, solveVariationalQuestion, solveBVPQuestion, plain };
