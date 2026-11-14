// Advanced solvers, part 1: exponential equations, derivatives, integrals, limits.
const S = require('./symbolic');
const P = require('./polynomial');
const { Q, formatDecimal } = require('./rational');
const { num, vr, cst, sum, prod, pow, fn, neg, tex, simplify } = S;

// ---------- Shared helpers ----------
// Lower-case, no spaces, no LaTeX markup: used to recognise question wording
function keyText(raw) {
  return String(raw || '')
    .replace(/\\(text|mathrm|operatorname|mathbf|textbf|mathit)\{([^{}]*)\}/g, '$2')
    .replace(/ℝ|\\mathbb\{R\}|\\R\b/g, 'R').replace(/ℚ|\\mathbb\{Q\}/g, 'Q').replace(/ℤ|\\mathbb\{Z\}/g, 'Z').replace(/ℕ|\\mathbb\{N\}/g, 'N').replace(/ℂ|\\mathbb\{C\}/g, 'C')
    .replace(/[−–—]/g, '-').replace(/[·×]/g, '*')
    .replace(/\\(left|right)/g, '')
    .replace(/\\[,;:! ]/g, '')
    .replace(/\\/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

// Parse a math snippet; if it has no ^ or LaTeX, also repair PDF-flattened superscripts
function parseMath(str, extraOpts = {}) {
  const clean = String(str || '').replace(/[.\s]+$/, '').trim();
  if (!clean) return null;
  const plainish = !/\^/.test(clean); // no powers written at all: flattened superscripts like x2 likely
  return S.tryParse(clean, { pdf: plainish, ...extraOpts }) || (plainish ? S.tryParse(clean) : null);
}

const T = (n) => tex(simplify(n));
const q = (v) => Q.from(v);

// ---------- 1. Exponential equations: a·b^(2x) + c·b^x + d = 0 ----------
// "Solve for x: 2^x = 8" -> "2^x = 8"
function stripInstruction(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/^[A-Za-z ,]*(?:solve|find|evaluate|compute|simplify|calculate)[A-Za-z ,()]*:\s*(.+)$/i);
  return m ? m[1] : s;
}

function solveExponentialEquation(raw) {
  let text = S.toPlain(stripInstruction(raw)).replace(/\s+/g, '');
  // PDF copy of 2^{2x} - 5·2^{x} + 4 = 0 looks like "22x-5*2x+4=0"
  const pdf = text.match(/^(\d)2x([+-])(\d*)\*?\1x([+-]\d+)=0$/);
  if (pdf) text = `${pdf[1]}^(2x)${pdf[2]}${pdf[3]}*${pdf[1]}^(x)${pdf[4]}=0`;
  if (!text.includes('=') || !/\^\(?[-\d]*\*?x/.test(text) && !/e\^/.test(text)) return null;
  const [lhsS, rhsS] = text.split('=');
  if (rhsS === undefined) return null;
  const L = S.tryParse(lhsS), R = S.tryParse(rhsS);
  if (!L || !R) return null;
  const expr = S.expand(sum(L, neg(R)));
  const vars = S.variables(expr);
  if (vars.size !== 1 || !vars.has('x')) return null;

  // Collect terms coef * base^(k x + m)
  const terms = expr.t === 'sum' ? expr.terms : [expr];
  const items = [];
  for (const t of terms) {
    const [c, rest] = S.splitCoef(t);
    if (!rest) { items.push({ c, base: null, k: new Q(0n), m: new Q(0n) }); continue; }
    if (rest.t !== 'pow') return null;
    const lin = S.linearIn(rest.exp, 'x');
    if (!lin) return null;
    const b = rest.base;
    if (!(b.t === 'num' && b.v.isInteger() && b.v.n > 1n) && !(b.t === 'const' && b.n === 'e')) return null;
    items.push({ c, base: b, k: lin.a, m: lin.b });
  }
  const bases = items.filter(i => i.base);
  if (!bases.length) return null;
  // smallest base B, and express others as powers of B
  const isE = bases.some(i => i.base.t === 'const');
  if (isE && bases.some(i => i.base.t !== 'const')) return null;
  const Bn = isE ? null : bases.map(i => i.base.v.n).reduce((a, b) => (a < b ? a : b));
  const BTex = isE ? 'e' : Bn.toString();
  const poly = [new Q(0n), new Q(0n), new Q(0n), new Q(0n), new Q(0n)];
  for (const it of items) {
    if (!it.base) { poly[0] = poly[0].add(it.c); continue; }
    let qexp = new Q(1n);
    if (!isE) {
      let v = it.base.v.n, e = 0n;
      while (v > 1n && v % Bn === 0n) { v /= Bn; e++; }
      if (v !== 1n) return null;
      qexp = new Q(e);
    }
    const power = it.k.mul(qexp);              // power of t = B^x
    if (!power.isInteger() || power.isNegative() || power.n > 4n) return null;
    // B^(m) constant factor (m may be from b^(x+1))
    let factor = new Q(1n);
    if (!it.m.isZero()) {
      if (isE || !it.m.isInteger()) return null;
      factor = new Q(it.base.v.n).pow(it.m);
    }
    poly[Number(power.n)] = poly[Number(power.n)].add(it.c.mul(factor));
  }
  const p = P.trim(poly);
  const deg = P.degree(p);
  if (deg < 1) return null;

  const steps = [{ label: 'Given equation:', katex: `${T(L)} = ${T(R)}` }];
  steps.push({ label: `Step 1: Substitute $t = ${BTex}^{x}$ (note $${BTex}^{2x} = (${BTex}^{x})^2 = t^2$):`, katex: `${P.toTex(p, 't')} = 0` });

  // Solve the polynomial in t
  let roots = [];
  const f = P.factor(p);
  if (f.factors.length > 1 || deg === 1) steps.push({ label: 'Step 2: Factor:', katex: `${P.factoredTex(f, 't')} = 0` });
  for (const fac of f.factors) {
    if (P.degree(fac) === 1) roots.push({ exact: fac[0].neg().div(fac[1]) });
    else if (P.degree(fac) === 2) {
      const r = P.quadraticRoots(fac[2], fac[1], fac[0]);
      if (r.kind === 'irrational') r.roots.forEach((tx, i) => roots.push({ tex: tx, approx: r.approx[i] }));
    }
  }
  steps.push({ label: 'Step 3: Solve for $t$:', katex: roots.map(r => `t = ${r.exact ? r.exact.toTex() : r.tex}`).join(', \\quad ') || '\\text{no real solutions}' });

  const sols = [];
  const lines = [];
  for (const r of roots) {
    const val = r.exact ? r.exact.toNumber() : r.approx;
    const tTex = r.exact ? r.exact.toTex() : r.tex;
    if (!(val > 0)) { lines.push(`${BTex}^{x} = ${tTex} \\;\\Rightarrow\\; \\text{no solution } (${BTex}^{x} > 0)`); continue; }
    // exact power?
    let xTex = null;
    if (!isE && r.exact) {
      for (let k = -20; k <= 20; k++) {
        if (new Q(Bn).pow(new Q(BigInt(k))).equals(r.exact)) { xTex = String(k); break; }
      }
    }
    if (isE && r.exact && r.exact.equals(1)) xTex = '0';
    if (!xTex) {
      const approx = Math.log(val) / (isE ? 1 : Math.log(Number(Bn)));
      xTex = isE ? `\\ln\\left(${tTex}\\right) \\approx ${formatDecimal(+approx.toFixed(6))}` : `\\log_{${BTex}}\\left(${tTex}\\right) = \\frac{\\ln\\left(${tTex}\\right)}{\\ln ${BTex}} \\approx ${formatDecimal(+approx.toFixed(6))}`;
    }
    lines.push(`${BTex}^{x} = ${tTex} \\;\\Rightarrow\\; x = ${xTex}`);
    sols.push(`x = ${xTex.split(' \\approx')[0].split(' = \\frac')[0]}`);
  }
  steps.push({ label: `Step 4: Change back using $${BTex}^{x} = t$:`, katex: `\\begin{aligned} ${lines.map(l => l.replace('\\;\\Rightarrow\\;', '&\\Rightarrow')).join(' \\\\ ')} \\end{aligned}` });
  if (!sols.length) return { answer: '\\text{No real solution}', steps };
  const answer = sols.join(', \\quad ');
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${answer}}` });
  return { answer, steps };
}

// ---------- 2. Derivatives ----------
function extractDerivativeTarget(raw) {
  const s = String(raw);
  const k = keyText(raw);
  const isDerivQ = /dy\/dx|fracdydx|derivative|differentiate|fracddx|d\/dx|f'\(x\)|fprime/.test(k);
  if (!isDerivQ) return null;
  if (/=.*=/.test(k) && /y/.test(s.split('=').slice(1).join('='))) return null; // implicit equations not handled here
  let m;
  if ((m = s.match(/(?:^|[^a-zA-Z])y\s*=\s*(.+)$/))) return { expr: m[1], name: 'y' };
  // text without spaces, e.g. "Finddy/dxify=x^2\sin(3x)"
  const afterDx = s.search(/dx|\{dx\}/);
  if (afterDx !== -1 && (m = s.slice(afterDx).match(/y\s*=\s*(.+)$/))) return { expr: m[1], name: 'y' };
  if ((m = s.match(/f\s*\(\s*x\s*\)\s*=\s*(.+?)(?:,|;|\s+find|\s+then|$)/i))) return { expr: m[1], name: 'f' };
  if ((m = s.match(/\\frac\{d\}\{dx\}\s*(.+)$/))) return { expr: m[1], name: 'f' };
  if ((m = s.match(/d\s*\/\s*dx\s*(.+)$/i))) return { expr: m[1], name: 'f' };
  if ((m = s.match(/(?:derivative|differentiate)\s*(?:of)?\s*(.+?)(?:\s*with respect to.*)?$/i))) return { expr: m[1], name: 'f' };
  return null;
}

function solveDerivativeQuestion(raw) {
  const target = extractDerivativeTarget(raw);
  if (!target) return null;
  let body = target.expr.replace(/\\left|\\right/g, '').replace(/withrespectto.*$|with respect to.*$/i, '').trim();
  body = body.replace(/^\((.*)\)$/, '$1');
  const f = parseMath(body);
  if (!f) return null;
  const vars = [...S.variables(f)];
  const x = vars.includes('x') ? 'x' : vars[0];
  if (!x || vars.length > 1) return null;
  if (target.name === 'y' && x === 'y') return null; // y = f(y) is an implicit equation, not handled here

  const fs = simplify(f);
  const dfx = S.derivative(fs, x);
  const lhs = target.name === 'y' ? `\\frac{dy}{d${x}}` : `f'(${x})`;
  const steps = [{ label: 'Given function:', katex: `${target.name === 'y' ? 'y' : `f(${x})`} = ${tex(fs)}` }];
  S.explainDerivative(fs, x).forEach((st, i) => steps.push({ label: `Step ${i + 1}: ${st.label}`, katex: st.katex }));
  steps.push({ label: 'Simplify:', katex: `${lhs} = ${tex(dfx)}` });
  let finalTex = tex(dfx);
  const combined = combineRational(dfx, x);
  if (combined && combined !== finalTex) {
    steps.push({ label: 'Combine into a single fraction:', katex: `${lhs} = ${combined}` });
    finalTex = combined;
  }
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${lhs} = ${finalTex}}` });
  return { answer: `${lhs} = ${finalTex}`, steps };
}

// Rational functions: write a sum of fractions as one fraction num/den (polynomials)
function toRational(n, x) {
  n = simplify(n);
  if (S.freeOf(n, x)) { return n.t === 'num' ? { N: [n.v], D: [new Q(1n)] } : null; }
  if (n.t === 'var') return { N: [new Q(0n), new Q(1n)], D: [new Q(1n)] };
  if (n.t === 'sum') {
    let acc = { N: [new Q(0n)], D: [new Q(1n)] };
    for (const t of n.terms) {
      const r = toRational(t, x); if (!r) return null;
      acc = { N: P.add(P.mul(acc.N, r.D), P.mul(r.N, acc.D)), D: P.mul(acc.D, r.D) };
    }
    return acc;
  }
  if (n.t === 'prod') {
    let acc = { N: [new Q(1n)], D: [new Q(1n)] };
    for (const f of n.factors) {
      const r = toRational(f, x); if (!r) return null;
      acc = { N: P.mul(acc.N, r.N), D: P.mul(acc.D, r.D) };
    }
    return acc;
  }
  if (n.t === 'pow' && n.exp.t === 'num' && n.exp.v.isInteger() && n.exp.v.n >= -20n && n.exp.v.n <= 20n) {
    const b = toRational(n.base, x); if (!b) return null;
    const k = Number(n.exp.v.n < 0n ? -n.exp.v.n : n.exp.v.n);
    const Np = P.pow(b.N, k), Dp = P.pow(b.D, k);
    return n.exp.v.isNegative() ? { N: Dp, D: Np } : { N: Np, D: Dp };
  }
  return null;
}

function polyGcd(a, b) {
  a = P.trim(a); b = P.trim(b);
  while (!P.isZeroPoly(b)) {
    // remainder of a / b
    let r = a.slice();
    while (P.degree(r) >= P.degree(b) && !P.isZeroPoly(r)) {
      const shift = P.degree(r) - P.degree(b);
      const c = r[r.length - 1].div(b[b.length - 1]);
      const sub = Array(shift).fill(new Q(0n)).concat(b.map(v => v.mul(c)));
      r = P.trim(P.sub(r, sub));
    }
    a = b; b = r;
  }
  return P.scale(a, new Q(1n).div(a[a.length - 1]));
}

function polyDiv(a, b) {
  a = P.trim(a); b = P.trim(b);
  const out = Array(Math.max(1, a.length - b.length + 1)).fill(new Q(0n));
  let r = a.slice();
  while (P.degree(r) >= P.degree(b) && !P.isZeroPoly(r)) {
    const shift = P.degree(r) - P.degree(b);
    const c = r[r.length - 1].div(b[b.length - 1]);
    out[shift] = out[shift].add(c);
    const sub = Array(shift).fill(new Q(0n)).concat(b.map(v => v.mul(c)));
    r = P.trim(P.sub(r, sub));
  }
  return P.trim(out);
}

function combineRational(n, x) {
  if (simplify(n).t !== 'sum') return null;
  const r = toRational(n, x);
  if (!r || P.degree(r.D) < 1) return null;
  const g = polyGcd(r.N, r.D);
  const N = polyDiv(r.N, g), D = polyDiv(r.D, g);
  const fN = P.factor(N), fD = P.factor(D);
  const k = fN.constant.div(fD.constant);
  const ft = (c, fs) => (fs.length === 1 && c.equals(1)) ? P.toTex(fs[0], x) : P.factoredTex({ constant: c, factors: fs }, x);
  const numT = ft(new Q(k.n < 0n ? -k.n : k.n), fN.factors);
  const denT = ft(new Q(k.d), fD.factors);
  return `${k.isNegative() ? '-' : ''}\\frac{${numT}}{${denT}}`;
}

// ---------- 3. Integrals (indefinite and definite) ----------
function parseLimit(str) {
  if (str === undefined || str === null) return null;
  const s = String(str).replace(/[{}]/g, '').trim();
  if (/^[+]?(\\infty|∞|inf(inity)?)$/i.test(s)) return { inf: 1 };
  if (/^-(\\infty|∞|inf(inity)?)$/i.test(s)) return { inf: -1 };
  const n = parseMath(s);
  if (!n) return null;
  const sn = simplify(n);
  if (!S.freeOf(sn, 'x')) return null;
  try { return { node: sn, value: S.evaluate(sn) }; } catch (e) { return null; }
}

function extractIntegral(raw) {
  let s = String(raw).trim();
  // \int_{a}^{b} f dx   |  ∫_a^b f dx   |  int f dx   |  "Evaluate: ∫ x·ex dx"
  const m = s.match(/(?:\\int|∫|\bint(?:egrate)?\b)\s*(?:_\s*(\{[^}]*\}|-?\\infty|-?∞|-?[\w.]+)\s*\^\s*(\{[^}]*\}|\\infty|∞|[\w.]+))?\s*(.*)$/i);
  if (!m) return null;
  let body = m[3].trim();
  let dv = 'x';
  const dm = body.match(/\\?,?\s*d([a-z])\s*\.?\s*$/);
  if (dm) { dv = dm[1]; body = body.slice(0, dm.index).trim(); }
  body = body.replace(/\\,$/, '').trim();
  // \frac{dx}{x^4+1}  ->  1/(x^4+1)
  body = body.replace(/\\frac\{\s*d([a-z])\s*\}/, (all, v) => { dv = v; return '\\frac{1}'; });
  body = body.replace(/^d([a-z])\s*\/\s*/, (all, v) => { dv = v; return '1/'; });
  return { lower: m[1], upper: m[2], body, dv };
}

function solveIntegralQuestion(raw) {
  const k = keyText(raw);
  if (!/^(evaluate:?|find:?|compute:?|integrate)?(int|∫)/.test(k) && !/(evaluate|find|compute).*(int|∫)/.test(k)) return null;
  if (/iint|∬|oint|∮|doubleintegral/.test(k)) return null;
  const ex = extractIntegral(raw);
  if (ex && !ex.body && /d[a-z]/.test(String(raw))) ex.body = '1';
  if (!ex || !ex.body) return null;
  const f = parseMath(ex.body);
  if (!f) return null;
  const x = ex.dv;
  const vars = [...S.variables(f)].filter(v => v !== x);
  if (vars.length) return null;
  const fs = simplify(f);
  const res = S.integrate(fs, x);
  const hasLimits = ex.lower !== undefined && ex.upper !== undefined;

  if (!res) {
    if (!hasLimits) return null;
    // numeric fallback for definite integrals
    const a = parseLimit(ex.lower), b = parseLimit(ex.upper);
    if (!a || !b || a.inf || b.inf) return null;
    const val = simpson(v => S.evaluate(fs, { [x]: v }), a.value, b.value);
    if (!Number.isFinite(val)) return null;
    return {
      answer: `\\approx ${formatDecimal(+val.toFixed(8))}`,
      steps: [
        { label: 'Given definite integral:', katex: `\\int_{${tex(a.node)}}^{${tex(b.node)}} ${tex(fs)} \\, d${x}` },
        { label: 'No elementary antiderivative was found, so the integral is evaluated numerically (Simpson\'s rule, 2000 intervals):', katex: `\\approx ${formatDecimal(+val.toFixed(8))}` }
      ]
    };
  }

  const F = res.result;
  const steps = [{ label: hasLimits ? 'Given definite integral:' : 'Given integral:', katex: hasLimits ? `\\int_{${ex.lower.replace(/[{}]/g, '')}}^{${ex.upper.replace(/[{}]/g, '')}} ${tex(fs)} \\, d${x}` : `\\int ${tex(fs)} \\, d${x}` }];
  res.steps.forEach((st, i) => steps.push({ label: `Step ${i + 1}: ${st.label}`, katex: st.katex }));
  if (fs.t === 'sum' && !res.steps.length) {
    steps.push({ label: 'Step 1: Integrate term by term (sum rule) using the standard formulas:', katex: `\\begin{aligned} ${fs.terms.map(t => { const r = S.integrate(t, x); return `\\int ${tex(t)}\\,d${x} &= ${r ? tex(r.result) : '?'}`; }).join(' \\\\ ')} \\end{aligned}` });
  }
  // check
  const back = S.derivative(F, x);
  const ok = checkEqual(back, fs, x);

  if (!hasLimits) {
    steps.push({ label: 'Result (add the constant of integration C):', katex: `\\mathbf{\\int ${tex(fs)}\\,d${x} = ${tex(F)} + C}` });
    if (ok) steps.push({ label: 'Check: differentiating the answer gives back the integrand.', katex: `\\frac{d}{d${x}}\\left[${tex(F)}\\right] = ${tex(back)}` });
    return { answer: `${tex(F)} + C`, steps };
  }

  const a = parseLimit(ex.lower), b = parseLimit(ex.upper);
  if (!a || !b) return null;
  if (a.inf || b.inf) {
    // improper: evaluate F at the finite end and the limit at infinity numerically
    const at = (lim) => {
      if (!lim.inf) return { node: simplify(S.substitute(F, x, lim.node)), v: S.evaluate(F, { [x]: lim.value }) };
      const v1 = S.evaluate(F, { [x]: lim.inf * 1e6 }), v2 = S.evaluate(F, { [x]: lim.inf * 1e7 });
      if (!Number.isFinite(v2) || Math.abs(v2 - v1) > 1e-4 * Math.max(1, Math.abs(v2))) return null;
      return { v: v2 };
    };
    const Fa = at(a), Fb = at(b);
    if (!Fa || !Fb) return { answer: '\\text{The integral diverges}', steps: [...steps, { label: 'The antiderivative does not approach a finite limit, so the improper integral diverges.', katex: `F(${x}) = ${tex(F)}` }] };
    const val = Fb.v - Fa.v;
    const nice = recogniseConstant(val);
    steps.push({ label: 'Antiderivative:', katex: `F(${x}) = ${tex(F)}` });
    steps.push({ label: 'Improper integral: take the limit of the antiderivative at the infinite end(s):', katex: `\\lim F(${x}) \\Big|_{${ex.lower.replace(/[{}]/g, '')}}^{${ex.upper.replace(/[{}]/g, '')}} = ${nice || formatDecimal(+val.toFixed(8))}` });
    return { answer: nice || `\\approx ${formatDecimal(+val.toFixed(8))}`, steps };
  }

  const Fb = simplify(S.substitute(F, x, b.node)), Fa = simplify(S.substitute(F, x, a.node));
  const exact = simplify(sum(Fb, neg(Fa)));
  let value;
  try { value = S.evaluate(exact); } catch (e) { value = NaN; }
  steps.push({ label: 'Antiderivative:', katex: `F(${x}) = ${tex(F)}` });
  steps.push({ label: 'Evaluate $F(b) - F(a)$:', katex: `F(${tex(b.node)}) - F(${tex(a.node)}) = ${tex(Fb)} - \\left(${tex(Fa)}\\right)` });
  const exactTex = tex(exact);
  const approx = Number.isFinite(value) && exact.t !== 'num' ? ` \\approx ${formatDecimal(+value.toFixed(6))}` : '';
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${exactTex}}${approx}` });
  return { answer: exactTex + approx, steps };
}

function simpson(f, a, b, n = 2000) {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

function checkEqual(a, b, x) {
  for (const v of [0.37, 1.21, 2.53]) {
    let A, B;
    try { A = S.evaluate(a, { [x]: v }); B = S.evaluate(b, { [x]: v }); } catch (e) { return false; }
    if (!Number.isFinite(A) || !Number.isFinite(B) || Math.abs(A - B) > 1e-7 * Math.max(1, Math.abs(B))) return false;
  }
  return true;
}

// Turn a decimal into an exact-looking value when it is a simple multiple of π, √2, √3, e, ln 2
function recogniseConstant(v) {
  if (!Number.isFinite(v)) return null;
  const cands = [
    [1, ''], [Math.PI, '\\pi'], [Math.PI * Math.SQRT2, '\\pi\\sqrt{2}'], [Math.PI * Math.sqrt(3), '\\pi\\sqrt{3}'],
    [Math.PI * Math.PI, '\\pi^{2}'], [Math.E, 'e'], [Math.LN2, '\\ln 2'], [Math.SQRT2, '\\sqrt{2}'], [Math.sqrt(3), '\\sqrt{3}']
  ];
  for (const [c, name] of cands) {
    const r = v / c;
    for (let d = 1; d <= 64; d++) {
      const n = Math.round(r * d);
      if (Math.abs(r * d - n) < 1e-9 * Math.max(1, Math.abs(r * d)) && Math.abs(n) <= 5000) {
        if (n === 0) return '0';
        const Qv = new Q(BigInt(n), BigInt(d));
        if (!name) return Qv.toTex();
        if (Qv.equals(1)) return name;
        if (Qv.equals(-1)) return '-' + name;
        return Qv.isInteger() ? `${Qv.toTex()}${name}` : `\\frac{${Qv.n < 0n ? -Qv.n : Qv.n === 1n ? '' : Qv.n}${name}}{${Qv.d}}`.replace('\\frac{', Qv.n < 0n ? '-\\frac{' : '\\frac{').replace(/\{-?(\\)/, '{$1');
      }
    }
  }
  return null;
}

// ---------- 4. Limits ----------
function extractLimit(raw) {
  const s = String(raw);
  let m = s.match(/\\lim(?:its)?\s*_\s*\{\s*([a-z])\s*(?:\\to|\\rightarrow|→|->)\s*([^}]+)\}\s*(.+)$/);
  if (!m) m = s.match(/\blim\s*_?\s*\(?\s*([a-z])\s*(?:→|->|\\to|to)\s*([-+]?(?:\\infty|∞|inf(?:inity)?|[\d.]+|pi|π)(?:\^[+-])?)\s*\)?\s*(.+)$/i);
  if (!m) return null;
  return { x: m[1], point: m[2].trim(), body: m[3].trim().replace(/[.\s]+$/, '') };
}

function solveLimitQuestion(raw) {
  if (!/lim/.test(keyText(raw))) return null;
  const ex = extractLimit(raw);
  if (!ex) return null;
  const x = ex.x;
  let side = 0;
  let pt = ex.point.replace(/\^\{?([+-])\}?$/, (a, sg) => { side = sg === '+' ? 1 : -1; return ''; });
  const isInf = /\\infty|∞|inf/i.test(pt);
  const infSign = /^-/.test(pt) ? -1 : 1;
  let aNode = null, a = null;
  if (!isInf) {
    aNode = parseMath(pt);
    if (!aNode || !S.freeOf(aNode, x)) return null;
    aNode = simplify(aNode);
    a = S.evaluate(aNode);
  }
  const f = parseMath(ex.body);
  if (!f) return null;
  const vars = [...S.variables(f)];
  if (vars.some(v => v !== x)) return null;
  const fs = simplify(f);
  const pointTex = isInf ? (infSign < 0 ? '-\\infty' : '\\infty') : tex(aNode) + (side ? `^{${side > 0 ? '+' : '-'}}` : '');
  const limTex = `\\lim_{${x} \\to ${pointTex}}`;
  const steps = [{ label: 'Given limit:', katex: `${limTex} ${tex(fs)}` }];

  // Exponential indeterminate forms u^v: use ln
  if (fs.t === 'pow' && !S.freeOf(fs.exp, x) && !S.freeOf(fs.base, x)) {
    const inner = simplify(prod(fs.exp, fn('ln', fs.base)));
    steps.push({ label: 'Step 1: The form is $1^\\infty$ (or similar). Take logarithms: $\\ln L = \\lim v\\ln u$.', katex: `\\ln L = ${limTex} ${tex(inner)}` });
    const r = limitQuotient(inner, x, a, aNode, isInf, infSign, side, steps, 2);
    if (!r) return null;
    const ans = r.exact ? (r.exact.isZero() ? '1' : `e^{${r.exact.toTex()}}`) : r.tex === '\\infty' ? '\\infty' : r.tex === '-\\infty' ? '0' : `e^{${r.tex}}`;
    steps.push({ label: 'Exponentiate:', katex: `L = ${ans}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
    return { answer: ans, steps };
  }

  const r = limitQuotient(fs, x, a, aNode, isInf, infSign, side, steps, 1);
  if (!r) return null;
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${r.tex}}` });
  return { answer: r.tex, steps };
}

function splitFraction(n) {
  n = simplify(n);
  if (n.t !== 'prod' && !(n.t === 'pow' && n.exp.t === 'num' && n.exp.v.isNegative())) return { N: n, D: num(1) };
  const fs = n.t === 'prod' ? n.factors : [n];
  const top = [], bot = [];
  for (const f of fs) {
    if (f.t === 'pow' && f.exp.t === 'num' && f.exp.v.isNegative()) bot.push(simplify(pow(f.base, num(f.exp.v.neg()))));
    else top.push(f);
  }
  return { N: simplify(top.length ? prod(...top) : num(1)), D: simplify(bot.length ? prod(...bot) : num(1)) };
}

function limitQuotient(expr, x, a, aNode, isInf, infSign, side, steps, stepNo) {
  let { N, D } = splitFraction(expr);
  // For products like x*ln(x) (0·∞) rewrite as ln(x)/(1/x)
  const evalAt = (g, v) => { try { return S.evaluate(g, { [x]: v }); } catch (e) { return NaN; } };
  const near = (g) => {
    if (isInf) return evalAt(g, infSign * 1e7);
    const h = side ? side * 1e-7 : 1e-7;
    return evalAt(g, a + h);
  };
  const atPoint = (g) => {
    if (isInf) {
      const v1 = evalAt(g, infSign * 1e6), v2 = evalAt(g, infSign * 1e8);
      if (Math.abs(v2) > 1e5 && Math.abs(v2) > Math.abs(v1) * 1.5) return v2 > 0 ? Infinity : -Infinity;
      return v2;
    }
    const v = evalAt(g, a);
    if (Number.isFinite(v)) return v;
    const vn = near(g);
    return Math.abs(vn) > 1e5 ? (vn > 0 ? Infinity : -Infinity) : vn;
  };
  const isZero = (v) => Math.abs(v) < 1e-9;

  for (let iter = 0; iter < 7; iter++) {
    const nv = atPoint(N), dv = atPoint(D);
    const bothZero = isZero(nv) && isZero(dv);
    const bothInf = !Number.isFinite(nv) && !Number.isFinite(dv);
    if (bothZero || bothInf) {
      const form = bothZero ? '\\frac{0}{0}' : '\\frac{\\infty}{\\infty}';
      const dN = S.derivative(N, x), dD = S.derivative(D, x);
      steps.push({
        label: `Step ${stepNo++}: Substituting gives the indeterminate form $${form}$, so apply L'Hôpital's rule (differentiate the top and the bottom separately):`,
        katex: `\\lim \\frac{${tex(N)}}{${tex(D)}} = \\lim \\frac{${tex(dN)}}{${tex(dD)}}`
      });
      N = dN; D = dD;
      continue;
    }
    if (isZero(dv) && !isZero(nv)) {
      const left = evalAt(simplify(prod(N, pow(D, -1))), (a || 0) - 1e-6), right = evalAt(simplify(prod(N, pow(D, -1))), (a || 0) + 1e-6);
      if (side > 0 || (!side && Math.sign(left) === Math.sign(right))) {
        const r = side < 0 ? left : right;
        const t = r > 0 ? '\\infty' : '-\\infty';
        steps.push({ label: `Step ${stepNo++}: The denominator tends to 0 but the numerator does not, so the expression grows without bound:`, katex: t });
        return { tex: t };
      }
      steps.push({ label: `Step ${stepNo++}: The left and right limits are different ($\\pm\\infty$), so the two-sided limit does not exist.`, katex: '' });
      return { tex: '\\text{Does not exist}' };
    }
    // Direct substitution works
    let exact = null;
    if (!isInf) {
      const Nn = simplify(S.substitute(N, x, aNode)), Dn = simplify(S.substitute(D, x, aNode));
      if (Nn.t === 'num' && Dn.t === 'num' && !Dn.v.isZero()) exact = Nn.v.div(Dn.v);
      const valNode = simplify(prod(Nn, pow(Dn, -1)));
      const shown = exact ? exact.toTex() : (valNode.t !== 'pow' && !/\\infty/.test(tex(valNode)) ? tex(valNode) : null);
      const value = nv / dv;
      const out = shown || recogniseConstant(value) || formatDecimal(+value.toFixed(8));
      steps.push({ label: `Step ${stepNo++}: Now substitute $${x} = ${tex(aNode)}$ directly:`, katex: `\\frac{${tex(Nn)}}{${tex(Dn)}} = ${out}` });
      return { tex: out, exact };
    }
    // x -> infinity
    let value = nv / dv;
    if (!Number.isFinite(nv) && Number.isFinite(dv)) value = nv * Math.sign(dv || 1);
    if (Number.isFinite(nv) && !Number.isFinite(dv)) value = 0;
    const out = !Number.isFinite(value) ? (value > 0 ? '\\infty' : '-\\infty') : (recogniseConstant(value) || formatDecimal(+value.toFixed(8)));
    if (S.freeOf(N, x) && S.freeOf(D, x)) {
      const e = simplify(prod(N, pow(D, -1)));
      steps.push({ label: `Step ${stepNo++}: The expression no longer depends on $${x}$:`, katex: tex(e) });
      return { tex: tex(e), exact: e.t === 'num' ? e.v : null };
    }
    steps.push({ label: `Step ${stepNo++}: Evaluate the behaviour as $${x} \\to ${infSign < 0 ? '-' : ''}\\infty$:`, katex: `\\frac{${tex(N)}}{${tex(D)}} \\to ${out}` });
    return { tex: out, exact: null };
  }
  return null;
}

module.exports = {
  stripInstruction, toRational, combineRational,
  keyText, parseMath, recogniseConstant, simpson, checkEqual,
  solveExponentialEquation, solveDerivativeQuestion, solveIntegralQuestion, solveLimitQuestion
};
