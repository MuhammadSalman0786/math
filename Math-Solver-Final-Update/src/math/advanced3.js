// Advanced solvers, part 3: double integrals, Green's theorem, Laurent series,
// real integrals by residues, heat equation by separation of variables.
const S = require('./symbolic');
const P = require('./polynomial');
const { Q, formatDecimal } = require('./rational');
const { keyText, parseMath, recogniseConstant } = require('./advanced1');
const { num, vr, cst, sum, prod, pow, fn, neg, tex, simplify } = S;

const qp = (s) => Q.parse(String(s).replace(/−/g, '-'));

// ---------- Polynomials in x and y: Map "i,j" -> Q ----------
function toMPoly(n) {
  n = simplify(n);
  const one = () => new Map([['0,0', new Q(1n)]]);
  const add = (A, B) => { const R = new Map(A); for (const [k, v] of B) R.set(k, (R.get(k) || new Q(0n)).add(v)); return R; };
  const mul = (A, B) => {
    const R = new Map();
    for (const [k1, v1] of A) for (const [k2, v2] of B) {
      const [i1, j1] = k1.split(',').map(Number), [i2, j2] = k2.split(',').map(Number);
      const k = `${i1 + i2},${j1 + j2}`;
      R.set(k, (R.get(k) || new Q(0n)).add(v1.mul(v2)));
    }
    return R;
  };
  switch (n.t) {
    case 'num': return new Map([['0,0', n.v]]);
    case 'var': if (n.n === 'x') return new Map([['1,0', new Q(1n)]]); if (n.n === 'y') return new Map([['0,1', new Q(1n)]]); return null;
    case 'sum': { let R = new Map(); for (const t of n.terms) { const m = toMPoly(t); if (!m) return null; R = add(R, m); } return R; }
    case 'prod': { let R = one(); for (const f of n.factors) { const m = toMPoly(f); if (!m) return null; R = mul(R, m); } return R; }
    case 'pow': {
      if (n.exp.t !== 'num' || !n.exp.v.isInteger() || n.exp.v.isNegative() || n.exp.v.n > 20n) return null;
      const b = toMPoly(n.base); if (!b) return null;
      let R = one(); for (let i = 0n; i < n.exp.v.n; i++) R = mul(R, b); return R;
    }
  }
  return null;
}

function mpolyTex(M) {
  const terms = [...M].filter(([, v]) => !v.isZero()).sort((a, b) => {
    const [ai, aj] = a[0].split(',').map(Number), [bi, bj] = b[0].split(',').map(Number);
    return (bi + bj) - (ai + aj) || bi - ai;
  });
  if (!terms.length) return '0';
  return terms.map(([k, v], idx) => {
    const [i, j] = k.split(',').map(Number);
    const mon = (i ? (i === 1 ? 'x' : `x^{${i}}`) : '') + (j ? (j === 1 ? 'y' : `y^{${j}}`) : '');
    const a = v.abs();
    const c = mon && a.equals(1) ? '' : a.toTex();
    const sign = v.isNegative() ? (idx ? ' - ' : '-') : (idx ? ' + ' : '');
    return sign + c + mon;
  }).join('');
}

// double factorial for odd/even non-negative integers ((-1)!! = 1)
function dfact(n) { let r = 1n; for (let k = BigInt(n); k > 1n; k -= 2n) r *= k; return r; }

// ∬_disc x^i y^j dA over x^2 + y^2 <= r^2  = 2π (i-1)!!(j-1)!!/(i+j)!! · r^(i+j+2)/(i+j+2)   (0 if i or j odd)
function discIntegral(M, r) {
  let coefPi = new Q(0n);
  for (const [k, v] of M) {
    const [i, j] = k.split(',').map(Number);
    if (i % 2 || j % 2) continue;
    const ang = new Q(2n * dfact(i - 1) * dfact(j - 1), dfact(i + j));
    const rad = r.pow(new Q(BigInt(i + j + 2))).div(new Q(BigInt(i + j + 2)));
    coefPi = coefPi.add(v.mul(ang).mul(rad));
  }
  return coefPi; // result = coefPi * π
}

const piTex = (c) => c.isZero() ? '0' : c.equals(1) ? '\\pi' : c.equals(-1) ? '-\\pi' : c.isInteger() ? `${c.toTex()}\\pi` : `${c.isNegative() ? '-' : ''}\\frac{${c.abs().n === 1n ? '' : c.abs().n}\\pi}{${c.d}}`;

// ---------- 1. Green's theorem ----------
function solveGreenQuestion(raw) {
  const k = keyText(raw);
  if (!/green|oint|∮/.test(k)) return null;
  let s = String(raw).replace(/[−–]/g, '-').replace(/\\left|\\right/g, '').replace(/\\,|\\;/g, ' ');
  let start = s.search(/\\oint|∮/);
  if (start === -1) start = s.search(/\\int(?![a-z])|∫/);
  if (start === -1) return null;
  let body = s.slice(start).replace(/^(\\oint|∮|\\int)\s*(_\s*(\{[^}]*\}|\S+))?/, '');
  const dxI = body.search(/d\s*x/);
  if (dxI === -1) return null;
  const dyI = body.slice(dxI + 2).search(/d\s*y/);
  if (dyI === -1) return null;
  let Pstr = body.slice(0, dxI).replace(/^\s*\(/, '').trim();
  let Qstr = body.slice(dxI + 2, dxI + 2 + dyI).replace(/^\s*\+/, '').trim();
  const Pn = parseMath(Pstr), Qn = parseMath(Qstr);
  if (!Pn || !Qn) return null;
  // region: circle radius r (centre origin)
  let r = null;
  if (/unitcircle/.test(k)) r = new Q(1n);
  let m = k.match(/x\^2\+y\^2=(\d+(?:\.\d+)?)/); if (m) r = Q.float(Math.sqrt(+m[1])); if (m && Number.isInteger(Math.sqrt(+m[1]))) r = new Q(BigInt(Math.sqrt(+m[1])));
  m = k.match(/circle(?:of)?radius(?:r=)?(\d+(?:\.\d+)?(?:\/\d+)?)/) || k.match(/radius(\d+(?:\.\d+)?(?:\/\d+)?)/); if (m) r = qp(m[1]);
  if (!r) return null;

  const Qx = S.derivative(Qn, 'x'), Py = S.derivative(Pn, 'y');
  const integrand = simplify(sum(Qx, neg(Py)));
  const M = toMPoly(integrand);
  if (!M) {
    // numerical integration over the disc in polar coordinates
    const R0 = r.toNumber(), N = 400;
    let total = 0;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const rho = (i + 0.5) * R0 / N, th = (j + 0.5) * 2 * Math.PI / N;
      total += S.evaluate(integrand, { x: rho * Math.cos(th), y: rho * Math.sin(th) }) * rho * (R0 / N) * (2 * Math.PI / N);
    }
    if (!Number.isFinite(total)) return null;
    const val = recogniseConstant(+total.toFixed(7)) || formatDecimal(+total.toFixed(6));
    return {
      answer: `\\approx ${val}`.replace('\\approx \\', '\\'),
      steps: [
        { label: "Green's theorem: $\\oint_C P\\,dx + Q\\,dy = \\iint_D \\left(Q_x - P_y\\right) dA$", katex: `P = ${tex(simplify(Pn))}, \\quad Q = ${tex(simplify(Qn))}, \\quad Q_x - P_y = ${tex(integrand)}` },
        { label: `The integrand is not a polynomial, so the integral over the disc of radius ${r.toTex()} is evaluated numerically (polar coordinates):`, katex: `\\approx ${formatDecimal(+total.toFixed(6))}` }
      ]
    };
  }
  const c = discIntegral(M, r);
  const steps = [{ label: 'Given line integral (counter-clockwise):', katex: `\\oint_C \\left(${tex(simplify(Pn))}\\right)dx + \\left(${tex(simplify(Qn))}\\right)dy` }];
  steps.push({ label: "Step 1: Green's theorem: $\\oint_C P\\,dx + Q\\,dy = \\iint_D \\left(\\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y}\\right) dA$", katex: `P = ${tex(simplify(Pn))}, \\quad Q = ${tex(simplify(Qn))}` });
  steps.push({ label: 'Step 2: Compute the partial derivatives:', katex: `\\frac{\\partial Q}{\\partial x} = ${tex(Qx)}, \\quad \\frac{\\partial P}{\\partial y} = ${tex(Py)} \\quad\\Rightarrow\\quad \\frac{\\partial Q}{\\partial x} - \\frac{\\partial P}{\\partial y} = ${mpolyTex(M)}` });
  steps.push({ label: `Step 3: $D$ is the disc $x^2 + y^2 \\le ${r.mul(r).toTex()}$. Use polar coordinates $x = \\rho\\cos\\theta,\\; y = \\rho\\sin\\theta,\\; dA = \\rho\\,d\\rho\\,d\\theta$:`, katex: `\\iint_D \\left(${mpolyTex(M)}\\right) dA = \\int_0^{2\\pi}\\!\\!\\int_0^{${r.toTex()}} \\left(${mpolyTex(M).replace(/x/g, 'X').replace(/y/g, 'Y').replace(/X/g, '(\\rho\\cos\\theta)').replace(/Y/g, '(\\rho\\sin\\theta)')}\\right)\\rho\\,d\\rho\\,d\\theta` });
  const ans = piTex(c);
  // term-by-term values over the disc
  const termLines = [...M].filter(([, v]) => !v.isZero()).map(([key, v]) => {
    const one = new Map([[key, v]]);
    const [i, j] = key.split(',').map(Number);
    const mono = mpolyTex(one);
    const val = piTex(discIntegral(one, r));
    return `\\iint_D ${mono}\\,dA &= ${val}${(i % 2 || j % 2) ? ' \\quad (\\text{odd power} \\Rightarrow 0)' : ''}`;
  });
  steps.push({ label: 'Step 4: Evaluate each term over the disc (by symmetry, any odd power of $x$ or $y$ gives 0):', katex: `\\begin{aligned} ${termLines.join(' \\\\ ')} \\end{aligned}` });
  steps.push({ label: 'Add the terms:', katex: `= ${ans}` });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

// ---------- 2. Double integrals over regions between curves ----------
function solveDoubleIntegralQuestion(raw) {
  const k = keyText(raw);
  if (!/iint|∬|doubleintegral|\\int.*\\int/.test(k) && !/∬/.test(raw)) return null;
  const s = String(raw).replace(/[−–]/g, '-').replace(/\\left|\\right/g, '').replace(/\\,|\\;/g, ' ');

  // integrand between ∬/\iint and dA / dx dy / over
  let m = s.match(/(?:∬|\\iint|double integral(?: of)?)\s*(?:_\s*\{?[A-Za-z]\}?)?\s*(.+?)\s*(?:\\,)?\s*d\s*A(?=over|\W|$)/) || s.match(/(?:∬|\\iint|double integral(?: of)?)\s*(?:_\s*\{?[A-Za-z]\}?)?\s*(.+?)\s*d\s*[xy]\s*d\s*[xy]/i);
  if (!m) return null;
  const f = parseMath(m[1].replace(/^(∬|\\iint)\s*/, '').replace(/^\(\s*(.*)\s*\)$/, '$1'));
  if (!f) return null;
  const F = toMPoly(f);
  if (!F) return null;

  // region: curves y = f(x)
  const tail = s.slice(m.index + m[0].length);
  const curves = [];
  const re = /y\s*=\s*([^,;]+?)(?=\s*(?:,|;|and|\.\s*$|$))/gi;
  let c;
  while ((c = re.exec(tail))) {
    const node = parseMath(c[1]);
    const pp = node ? S.toPoly(node, 'x') : null;
    if (pp) curves.push({ node: simplify(node), poly: pp });
  }
  if (curves.length < 2) return null;
  const [c1, c2] = curves;
  const diff = P.sub(c1.poly, c2.poly);
  const fac = P.factor(diff);
  const roots = fac.factors.filter(fc => P.degree(fc) === 1).map(fc => fc[0].neg().div(fc[1]));
  const uniq = [...new Map(roots.map(r => [r.toPlain(), r])).values()].sort((a, b) => a.toNumber() - b.toNumber());
  if (uniq.length < 2) return null;
  const a = uniq[0], b = uniq[uniq.length - 1];
  const mid = (a.toNumber() + b.toNumber()) / 2;
  const v1 = S.evaluate(c1.node, { x: mid }), v2 = S.evaluate(c2.node, { x: mid });
  const top = v1 >= v2 ? c1 : c2, bot = v1 >= v2 ? c2 : c1;

  // inner integral in y: ∫ x^i y^j dy from bot to top = x^i (top^{j+1} - bot^{j+1})/(j+1)
  let inner = [new Q(0n)];
  for (const [key, coef] of F) {
    const [i, j] = key.split(',').map(Number);
    const xi = Array(i + 1).fill(new Q(0n)); xi[i] = new Q(1n);
    const part = P.scale(P.sub(P.pow(top.poly, j + 1), P.pow(bot.poly, j + 1)), coef.div(new Q(BigInt(j + 1))));
    inner = P.add(inner, P.mul(xi, part));
  }
  // outer integral in x from a to b
  const anti = [new Q(0n), ...P.trim(inner).map((cf, i) => cf.div(new Q(BigInt(i + 1))))];
  const value = P.evaluate(anti, b).sub(P.evaluate(anti, a));

  const steps = [{ label: 'Given double integral:', katex: `\\iint_R \\left(${mpolyTex(F)}\\right) dA` }];
  steps.push({ label: 'Step 1: Find where the curves meet:', katex: `${tex(c1.node)} = ${tex(c2.node)} \\;\\Rightarrow\\; ${P.factoredTex(fac, 'x')} = 0 \\;\\Rightarrow\\; x = ${uniq.map(r => r.toTex()).join(',\\; ')}` });
  steps.push({ label: `Step 2: For ${a.toTex()} ≤ x ≤ ${b.toTex()}, the upper curve is $y = ${tex(top.node)}$ and the lower is $y = ${tex(bot.node)}$:`, katex: `\\int_{${a.toTex()}}^{${b.toTex()}} \\int_{${tex(bot.node)}}^{${tex(top.node)}} \\left(${mpolyTex(F)}\\right) dy\\,dx` });
  steps.push({ label: 'Step 3: Integrate with respect to $y$ first:', katex: `\\int_{${tex(bot.node)}}^{${tex(top.node)}} \\left(${mpolyTex(F)}\\right) dy = ${P.toTex(inner, 'x')}` });
  steps.push({ label: 'Step 4: Integrate with respect to $x$:', katex: `\\int_{${a.toTex()}}^{${b.toTex()}} \\left(${P.toTex(inner, 'x')}\\right) dx = \\left[${P.toTex(anti, 'x')}\\right]_{${a.toTex()}}^{${b.toTex()}} = ${value.toTex()}` });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${value.toTex()}}` });
  return { answer: value.toTex(), steps };
}

// ---------- 3. Laurent series of 1/((z-a)(z-b)) ----------
function solveLaurentQuestion(raw) {
  const k = keyText(raw);
  if (!/laurent/.test(k)) return null;
  let s = String(raw).replace(/[−–]/g, '-').replace(/\\left|\\right/g, '');
  let m = s.match(/f\s*\(\s*z\s*\)\s*=\s*(.+?)(?=\s*(?:about|around|inthe|in\s|in(?=\s*\d)|for|on\s|,|$))/i) || s.match(/of\s+(.+?)\s+(?:about|around|in|for)\b/i);
  if (!m) return null;
  const f = parseMath(m[1].replace(/z/g, 'x'));
  if (!f) return null;
  const fs = simplify(f);
  // expect 1/D(x) (or c/D)
  const [c0, rest] = S.splitCoef(fs);
  if (!rest || rest.t !== 'prod' && rest.t !== 'pow') return null;
  const denomFactors = (rest.t === 'prod' ? rest.factors : [rest]);
  let D = [new Q(1n)];
  for (const fct of denomFactors) {
    if (fct.t !== 'pow' || fct.exp.t !== 'num' || !fct.exp.v.equals(-1)) return null;
    const pp = S.toPoly(fct.base, 'x');
    if (!pp) return null;
    D = P.mul(D, pp);
  }
  const fac = P.factor(D);
  const lin = fac.factors.filter(x => P.degree(x) === 1);
  if (P.degree(D) !== 2 || lin.length !== 2) return null;
  const [p1, p2] = lin.map(x => x[0].neg().div(x[1]));
  if (p1.equals(p2)) return null;
  const lead = fac.constant.mul(lin[0][1]).mul(lin[1][1]);
  const C = c0.div(lead); // f = C / ((z-p1)(z-p2))

  // region r1 < |z| < r2
  const kk = k.replace(/\\/g, '');
  let r1 = 0, r2 = Infinity;
  if ((m = kk.match(/(\d+(?:\.\d+)?)<\|z\|<(\d+(?:\.\d+)?|∞|infty)/))) { r1 = +m[1]; r2 = /\d/.test(m[2]) ? +m[2] : Infinity; }
  else if ((m = kk.match(/\|z\|>(\d+(?:\.\d+)?)/))) { r1 = +m[1]; }
  else if ((m = kk.match(/\|z\|<(\d+(?:\.\d+)?)/))) { r2 = +m[1]; }
  else return null;
  const zTex = (n) => n === 0 ? '1' : n === 1 ? 'z' : `z^{${n}}`;

  // partial fractions: C/((z-p1)(z-p2)) = A1/(z-p1) + A2/(z-p2)
  const A1 = C.div(p1.sub(p2)), A2 = C.div(p2.sub(p1));
  const steps = [{ label: 'Given function and region:', katex: `f(z) = ${tex(fs).replace(/x/g, 'z')}, \\qquad ${r1} < |z| < ${r2 === Infinity ? '\\infty' : r2}` }];
  steps.push({ label: 'Step 1: Partial fractions:', katex: `f(z) = \\frac{${A1.toTex()}}{z ${p1.isNegative() ? '+' : '-'} ${p1.abs().toTex()}} + \\frac{${A2.toTex()}}{z ${p2.isNegative() ? '+' : '-'} ${p2.abs().toTex()}}`.replace(/z - 0/g, 'z') });

  const coef = new Map(); // power -> Q
  const addC = (n, v) => coef.set(n, (coef.get(n) || new Q(0n)).add(v));
  const pieceTex = [];
  for (const [A, p] of [[A1, p1], [A2, p2]]) {
    const absP = Math.abs(p.toNumber());
    const coefT = (c) => c.equals(1) ? '' : c.equals(-1) ? '-' : c.toTex();
    const pw = (base, e) => base.equals(1) ? '1' : `(${base.toTex()})^{${e}}`;
    if (p.isZero()) { addC(-1, A); pieceTex.push(`${A.isNegative() ? '-' : ''}\\frac{${A.abs().toTex()}}{z}`); continue; }
    if (r2 <= absP) {
      // |z| < |p|: 1/(z-p) = -1/p · 1/(1 - z/p) = -Σ z^n / p^(n+1)
      for (let n = 0; n <= 6; n++) addC(n, A.neg().div(p.pow(new Q(BigInt(n + 1)))));
      pieceTex.push(`\\frac{${A.toTex()}}{z - ${p.toTex()}} = ${coefT(A.neg())}\\sum_{n=0}^{\\infty} ${p.equals(1) ? 'z^{n}' : `\\frac{z^{n}}{${pw(p, 'n+1')}}`} \\quad (|z| < ${absP})`);
    } else if (r1 >= absP) {
      // |z| > |p|: 1/(z-p) = 1/z · 1/(1 - p/z) = Σ p^n / z^(n+1)
      for (let n = 0; n <= 6; n++) addC(-(n + 1), A.mul(p.pow(new Q(BigInt(n)))));
      pieceTex.push(`\\frac{${A.toTex()}}{z - ${p.toTex()}} = ${coefT(A)}\\sum_{n=0}^{\\infty} \\frac{${pw(p, 'n')}}{z^{n+1}} \\quad (|z| > ${absP})`);
    } else return null; // region crosses a pole
  }
  steps.push({ label: 'Step 2: Expand each piece as a geometric series that converges in the given region ($\\frac{1}{1-w} = \\sum w^n$ for $|w| < 1$):', katex: `\\begin{aligned} ${pieceTex.map(t => '&' + t).join(' \\\\ ')} \\end{aligned}` });
  const negInfinite = [...coef.keys()].some(n => n <= -6) ;
  const posInfinite = [...coef.keys()].some(n => n >= 6);
  let powers = [...coef.keys()].filter(n => !coef.get(n).isZero());
  // show the finite side first, the infinite tail last
  powers.sort((a, b) => (negInfinite && !posInfinite) ? b - a : a - b);
  const shown = powers.filter(n => n >= -4 && n <= 4);
  const series = shown.map((n, i) => {
    const v = coef.get(n);
    const body = n < 0 ? `\\frac{${v.abs().equals(1) ? '1' : v.abs().toTex()}}{${zTex(-n)}}` : (v.abs().equals(1) && n !== 0 ? '' : v.abs().toTex()) + (n === 0 ? '' : zTex(n));
    return (v.isNegative() ? (i ? ' - ' : '-') : (i ? ' + ' : '')) + body;
  }).join('') + ' + \\cdots';
  const lead2 = negInfinite && posInfinite ? '\\cdots ' + (series.startsWith('-') ? '' : '+ ') : '';
  steps.push({ label: 'Step 3: Combine the two series:', katex: `f(z) = ${lead2}${series}` });
  // closed form for the classic 1/(z(z-a)), 0<|z|<|a|
  let closed = null;
  if ((p1.isZero() || p2.isZero()) && r1 === 0) {
    const a = p1.isZero() ? p2 : p1;
    closed = `-\\sum_{n=0}^{\\infty} \\frac{z^{n-1}}{${a.equals(1) ? '1' : `(${a.toTex()})^{n+1}`}}`.replace('\\frac{z^{n-1}}{1}', 'z^{n-1}');
    if (!C.equals(1)) closed = `${C.toTex()}\\left(${closed}\\right)`;
    steps.push({ label: 'Closed form:', katex: `f(z) = ${closed}` });
  }
  const answer = closed ? `f(z) = ${closed}` : `f(z) = ${lead2}${series}`;
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${answer}}` });
  return { answer, steps };
}

// ---------- 4. Real integrals ∫_{-∞}^{∞} R(x) dx by residues ----------
function polyRoots(p) {
  // Durand–Kerner, complex roots of a real polynomial (numbers)
  const c = P.trim(p).map(v => v.toNumber());
  const n = c.length - 1;
  const a = c.map(v => v / c[n]);
  let z = Array.from({ length: n }, (_, k) => ({ re: Math.cos(2 * Math.PI * k / n + 0.4) * 1.1, im: Math.sin(2 * Math.PI * k / n + 0.4) * 1.1 }));
  const mul = (x, y) => ({ re: x.re * y.re - x.im * y.im, im: x.re * y.im + x.im * y.re });
  const sub = (x, y) => ({ re: x.re - y.re, im: x.im - y.im });
  const div = (x, y) => { const d = y.re * y.re + y.im * y.im; return { re: (x.re * y.re + x.im * y.im) / d, im: (x.im * y.re - x.re * y.im) / d }; };
  const evalP = (x) => { let r = { re: a[n], im: 0 }; for (let i = n - 1; i >= 0; i--) r = { re: r.re * x.re - r.im * x.im + a[i], im: r.re * x.im + r.im * x.re }; return r; };
  for (let it = 0; it < 500; it++) {
    z = z.map((zi, i) => {
      let den = { re: 1, im: 0 };
      z.forEach((zj, j) => { if (i !== j) den = mul(den, sub(zi, zj)); });
      return sub(zi, div(evalP(zi), den));
    });
  }
  return z;
}

function solveResidueIntegralQuestion(raw) {
  const k = keyText(raw);
  const s = String(raw).replace(/[−–]/g, '-').replace(/\\left|\\right/g, '');
  const m = s.match(/(?:\\int|∫)\s*_\s*\{?\s*(-\s*\\infty|-\s*∞|-\s*inf)\s*\}?\s*\^\s*\{?\s*(\\infty|∞|inf)\s*\}?\s*(.+)$/) || s.match(/(?:\\int|∫)\s*[−-]\s*(?:∞|\\infty)\s*(?:∞|\\infty)\s*(.+)$/);
  if (!m) return null;
  let body = (m[3] || m[1]).trim();
  body = body.replace(/(?:\\,)?\s*d\s*x\s*\.?\s*$/, '').replace(/\\frac\{\s*dx\s*\}/, '\\frac{1}').replace(/^d\s*x\s*\/\s*/, '1/');
  const f = parseMath(body);
  if (!f) return null;
  const fs = simplify(f);
  // rational function N/D in x
  const { N, D } = splitRational(fs);
  if (!N || !D) return null;
  if (P.degree(D) < P.degree(N) + 2) return null;
  const rootsAll = polyRoots(D);
  if (rootsAll.some(z => Math.abs(z.im) < 1e-9)) return null; // real poles: not this method
  const upper = rootsAll.filter(z => z.im > 0);

  // numeric residues: N(z)/D'(z) for simple poles
  const dD = P.trim(D.slice(1).map((v, i) => v.mul(new Q(BigInt(i + 1)))));
  const cev = (p, z) => { let r = { re: 0, im: 0 }; for (let i = p.length - 1; i >= 0; i--) r = { re: r.re * z.re - r.im * z.im + p[i].toNumber(), im: r.re * z.im + r.im * z.re }; return r; };
  let total = { re: 0, im: 0 };
  for (const z of upper) {
    const nz = cev(N, z), dz = cev(dD, z);
    const d2 = dz.re * dz.re + dz.im * dz.im;
    total = { re: total.re + (nz.re * dz.re + nz.im * dz.im) / d2, im: total.im + (nz.im * dz.re - nz.re * dz.im) / d2 };
  }
  const value = -2 * Math.PI * total.im; // 2πi * Σres, real part
  let nice = recogniseConstant(value) || formatDecimal(+value.toFixed(8));

  const steps = [{ label: 'Given integral:', katex: `\\int_{-\\infty}^{\\infty} ${tex(fs)} \\, dx` }];
  steps.push({ label: 'Step 1: Use the closed contour made of the real axis and a large upper semicircle. Since $\\deg(\\text{denominator}) \\ge \\deg(\\text{numerator}) + 2$, the semicircle part tends to 0, so:', katex: `\\int_{-\\infty}^{\\infty} f(x)\\,dx = 2\\pi i \\sum_{\\operatorname{Im} z_k > 0} \\operatorname{Res}(f, z_k)` });

  // exact description for x^m + 1 and x^2 + a^2 type denominators
  const Dt = P.trim(D);
  const isXmPlus1 = P.degree(N) === 0 && N[0].equals(1) && Dt[0].equals(1) && Dt[Dt.length - 1].equals(1) && Dt.slice(1, -1).every(v => v.isZero()) && (Dt.length - 1) % 2 === 0;
  if (isXmPlus1) {
    const mDeg = Dt.length - 1;
    const poles = Array.from({ length: mDeg / 2 }, (_, j) => `e^{i\\pi${2 * j + 1 === 1 ? '' : `\\cdot ${2 * j + 1}`}/${mDeg}}`.replace(`\\pi/${1}`, '\\pi'));
    steps.push({ label: `Step 2: Poles: solutions of $x^{${mDeg}} = -1$. Those in the upper half-plane are:`, katex: `z_k = e^{i\\pi(2k+1)/${mDeg}}, \\; k = 0, \\dots, ${mDeg / 2 - 1}: \\quad ${poles.join(', \\;')}` });
    if (!recogniseConstant(value)) nice = `\\frac{\\pi}{${mDeg / 2}\\sin(\\pi/${mDeg})} \\approx ${formatDecimal(+value.toFixed(6))}`;
    steps.push({ label: 'Step 3: Each pole is simple, so $\\operatorname{Res}(f, z_k) = \\frac{1}{' + mDeg + ' z_k^{' + (mDeg - 1) + '}} = -\\frac{z_k}{' + mDeg + '}$ (because $z_k^{' + mDeg + '} = -1$). Sum and multiply by $2\\pi i$:', katex: `2\\pi i \\sum_k \\left(-\\frac{z_k}{${mDeg}}\\right) = \\frac{\\pi}{${mDeg / 2}\\sin(\\pi/${mDeg})}` });
  } else {
    steps.push({ label: 'Step 2: Poles in the upper half-plane (roots of the denominator with positive imaginary part):', katex: upper.map(z => `z \\approx ${formatDecimal(+z.re.toFixed(4))} ${z.im >= 0 ? '+' : '-'} ${formatDecimal(+Math.abs(z.im).toFixed(4))}i`).join(', \\;') });
    steps.push({ label: 'Step 3: For simple poles, $\\operatorname{Res}(f, z_k) = \\frac{N(z_k)}{D\'(z_k)}$. Sum and multiply by $2\\pi i$:', katex: `2\\pi i \\sum \\operatorname{Res} = ${nice}` });
  }
  steps.push({ label: 'Final Answer:', katex: nice.includes('approx') ? `\\mathbf{${nice}}` : `\\mathbf{${nice}} \\approx ${formatDecimal(+value.toFixed(6))}` });
  return { answer: nice, steps };
}

function splitRational(n) {
  n = simplify(n);
  const fs = n.t === 'prod' ? n.factors : [n];
  let N = [new Q(1n)], D = [new Q(1n)];
  for (const f of fs) {
    if (f.t === 'pow' && f.exp.t === 'num' && f.exp.v.isNegative() && f.exp.v.isInteger()) {
      const b = S.toPoly(f.base, 'x'); if (!b) return {};
      D = P.mul(D, P.pow(b, Number(-f.exp.v.n)));
    } else {
      const p = S.toPoly(f, 'x'); if (!p) return {};
      N = P.mul(N, p);
    }
  }
  return { N, D };
}

// ---------- 5. Heat equation u_t = k u_xx on [0, L], zero ends ----------
function solveHeatQuestion(raw) {
  const k = keyText(raw);
  if (!/heat|u_t=|ut=|u_\{t\}=/.test(k) || !/u_?\(?x,0\)?=|u\(x,0\)=/.test(k)) return null;
  const s = String(raw).replace(/[−–]/g, '-').replace(/\\left|\\right/g, '').replace(/·/g, '*');
  // diffusion constant between "=" and u_xx
  let m = s.match(/u_?\{?t\}?\s*=\s*(.*?)\s*\*?\s*u_?\{?xx\}?/);
  let kTex = 'k';
  if (m && m[1].trim()) {
    const c = m[1].trim().replace(/\*$/, '');
    const cn = /\\[a-zA-Z]/.test(c) ? null : parseMath(c);
    kTex = cn ? tex(simplify(cn)) : c.replace(/\s+/g, ' ');
  }
  // initial condition
  m = s.match(/u\s*\(\s*x\s*,\s*0\s*\)\s*=\s*([^,;]+?)(?=\s*(?:,|;|\.\s*$|$|\bwith\b|\band\b))/);
  if (!m) return null;
  const f = parseMath(m[1].replace(/L/g, 'l'));
  if (!f) return null;
  const vars = [...S.variables(f)];
  if (vars.some(v => v !== 'x' && v !== 'l')) return null;
  const fx = simplify(f);
  // coefficients of x^0, x^1, x^2 (each may contain L)
  const ex = S.expand(fx);
  const terms = ex.t === 'sum' ? ex.terms : [ex];
  const cj = [[], [], []];
  for (const t of terms) {
    if (!S.toPoly(S.substitute(t, 'l', num(1)), 'x')) return null;
    // separate x-power from L-part
    let xp = 0, rest = t;
    const fs = t.t === 'prod' ? t.factors : [t];
    const lpart = [];
    for (const g of fs) {
      if (g.t === 'var' && g.n === 'x') xp += 1;
      else if (g.t === 'pow' && g.base.t === 'var' && g.base.n === 'x' && g.exp.t === 'num') xp += Number(g.exp.v.n);
      else lpart.push(g);
    }
    if (xp > 2) return null;
    cj[xp].push(lpart.length ? prod(...lpart) : num(1));
  }
  const Ls = vr('l');
  const sN = vr('(-1)^{n}');
  const Nn = vr('(n\\pi)');
  // ∫0^L x^j sin(nπx/L) dx
  const I = [
    prod(Ls, sum(num(1), neg(sN)), pow(Nn, -1)),
    neg(prod(pow(Ls, 2), sN, pow(Nn, -1))),
    prod(pow(Ls, 3), sum(neg(prod(sN, pow(Nn, -1))), prod(num(2), sum(sN, num(-1)), pow(Nn, -3))))
  ];
  const parts = [];
  cj.forEach((list, j) => list.forEach(c => parts.push(prod(c, I[j]))));
  let bn = S.expand(prod(num(2), pow(Ls, -1), sum(...parts)));
  // Group c/N^k - c(-1)^n/N^k  into  c(1 - (-1)^n)/N^k
  if (bn.t === 'sum') {
    const items = bn.terms.map(t => {
      const fs = t.t === 'prod' ? t.factors : [t];
      const hasS = fs.some(f => f.t === 'var' && f.n === '(-1)^{n}');
      const others = fs.filter(f => !(f.t === 'var' && f.n === '(-1)^{n}'));
      const [cf, rest] = S.splitCoef(others.length === 1 ? others[0] : prod(...others));
      return { hasS, cf, rest, used: false };
    });
    const out = [];
    for (const a of items) {
      if (a.used) continue;
      const b = items.find(o => !o.used && o !== a && o.hasS !== a.hasS && o.cf.equals(a.cf.neg()) && ((o.rest && a.rest && S.same(o.rest, a.rest)) || (!o.rest && !a.rest)));
      if (b) {
        a.used = b.used = true;
        const plain = a.hasS ? b : a; // the term without (-1)^n
        const grouped = sum(num(1), neg(sN));
        out.push(prod(num(plain.cf), grouped, ...(plain.rest ? [plain.rest] : [])));
      } else { a.used = true; out.push(prod(num(a.cf), ...(a.hasS ? [sN] : []), ...(a.rest ? [a.rest] : []))); }
    }
    bn = out.length === 1 ? out[0] : sum(...out);
  }
  const bnTex = tex(simplify(bn)).replace(/\bl\b/g, 'L').replace(/(^|[^a-z\\])l(?=[\^\s}\\(]|$)/g, '$1L');
  const fixL = (t) => t.replace(/(^|[^a-z\\])l(?![a-z])/g, '$1L').replace(/\(n\\pi\)(?!\^)/g, 'n\\pi');
  const fTex = fixL(tex(fx));
  const kk = kTex === '1' ? '' : kTex;
  const steps = [{ label: 'Given problem:', katex: `u_t = ${kk}\\,u_{xx}, \\quad u(0,t) = u(L,t) = 0, \\quad u(x,0) = ${fTex}` }];
  steps.push({ label: 'Step 1: Separate variables, $u(x,t) = X(x)T(t)$:', katex: `\\frac{T'}{${kk ? kk + ' ' : ''}T} = \\frac{X''}{X} = -\\lambda` });
  steps.push({ label: 'Step 2: Spatial problem $X\'\' + \\lambda X = 0$, $X(0) = X(L) = 0$ has non-zero solutions only for:', katex: `\\lambda_n = \\left(\\frac{n\\pi}{L}\\right)^2, \\quad X_n(x) = \\sin\\frac{n\\pi x}{L}, \\quad n = 1, 2, 3, \\dots` });
  steps.push({ label: 'Step 3: Time part:', katex: `T_n(t) = e^{-${kk}\\left(\\frac{n\\pi}{L}\\right)^2 t}` });
  steps.push({ label: 'Step 4: Superpose the solutions and match the initial condition with a Fourier sine series:', katex: `u(x,t) = \\sum_{n=1}^{\\infty} b_n \\sin\\frac{n\\pi x}{L}\\, e^{-${kk}(n\\pi/L)^2 t}, \\qquad b_n = \\frac{2}{L}\\int_0^L ${fTex}\\,\\sin\\frac{n\\pi x}{L}\\,dx` });
  steps.push({ label: 'Step 5: Evaluate the integral (integration by parts):', katex: `b_n = ${fixL(bnTex)}` });
  let bnFinal = fixL(bnTex).replace(/\\left\(-\(-1\)\^\{n\} \+ 1\\right\)/g, '\\left(1 - (-1)^{n}\\right)');
  // is the whole coefficient one fraction?  (then it needs no extra brackets)
  const singleFrac = (t) => {
    const m0 = t.match(/^-?\\frac\{/); if (!m0) return false;
    let depth = 0, groups = 0;
    for (let i = m0[0].length - 1; i < t.length; i++) {
      if (t[i] === '{') depth++;
      else if (t[i] === '}') { depth--; if (depth === 0) { groups++; if (groups === 2) return i === t.length - 1; } }
    }
    return false;
  };
  let note = '';
  if (bnFinal.includes('1 - (-1)^{n}')) steps.push({ label: 'Note: $1 - (-1)^n$ is 0 for even $n$ and 2 for odd $n$, so only odd terms appear.', katex: '' });
  steps[steps.length - 1].katex = `b_n = ${bnFinal}`;
  const answer = `u(x,t) = \\sum_{n=1}^{\\infty} ${/[+-] /.test(bnFinal) && !singleFrac(bnFinal) ? `\\left(${bnFinal}\\right)` : bnFinal} \\sin\\left(\\frac{n\\pi x}{L}\\right) e^{-${kk}\\left(\\frac{n\\pi}{L}\\right)^{2} t}`;
  steps.push({ label: 'Final Answer:', katex: `${answer}${note}` });
  return { answer, steps };
}

module.exports = { solveGreenQuestion, solveDoubleIntegralQuestion, solveLaurentQuestion, solveResidueIntegralQuestion, solveHeatQuestion, toMPoly, polyRoots };
