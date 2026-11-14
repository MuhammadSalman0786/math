// Advanced solvers, part 2: sequences (A.P./G.P.), circle through 3 points,
// eigenvalues/eigenvectors, series convergence, linear ODEs with constant coefficients.
const S = require('./symbolic');
const P = require('./polynomial');
const LA = require('./linalg');
const { Q, formatDecimal } = require('./rational');
const { keyText, parseMath, recogniseConstant } = require('./advanced1');
const { num, vr, cst, sum, prod, pow, fn, neg, tex, simplify } = S;

const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
const qp = (s) => Q.parse(String(s).replace(/−/g, '-'));

// ---------- 1. Arithmetic / geometric progressions ----------
function solveSequenceQuestion(raw) {
  const k = keyText(raw);
  const isAP = /a\.?p\.?|arithmetic(progression|sequence|series)?|commondifference/.test(k);
  const isGP = /g\.?p\.?(?![a-z])|geometric(progression|sequence|series)?|commonratio/.test(k);
  if (!isAP && !isGP) return null;
  if (!/term/.test(k) && !/a_\d|s_\d/.test(k)) return null;

  // Known terms: "5th term is 17", "a_5 = 17", "T5 = 17"
  const known = [];
  let m;
  const reTerm = /(\d+)(?:st|nd|rd|th)term[a-z.]{0,14}?(?:is|=)(-?\d+(?:\.\d+)?(?:\/\d+)?)/g;
  while ((m = reTerm.exec(k))) known.push({ n: +m[1], v: qp(m[2]) });
  const reSub = /(?:a|t|u)_?\(?(\d+)\)?=(-?\d+(?:\.\d+)?(?:\/\d+)?)/g;
  while ((m = reSub.exec(k))) known.push({ n: +m[1], v: qp(m[2]) });
  let first = (m = k.match(/firstterm(?:is|=|a=)?(-?\d+(?:\.\d+)?(?:\/\d+)?)/)) ? qp(m[1]) : null;
  const diff = (m = k.match(/commondifference(?:is|=|d=)?(-?\d+(?:\.\d+)?(?:\/\d+)?)/)) ? qp(m[1]) : null;
  const ratio = (m = k.match(/commonratio(?:is|=|r=)?(-?\d+(?:\.\d+)?(?:\/\d+)?)/)) ? qp(m[1]) : null;
  if (first) known.push({ n: 1, v: first });

  const sumN = (m = k.match(/(?:sumof(?:the)?first|first)(\d+)terms/)) ? +m[1] : (m = k.match(/s_?\(?(\d+)\)?(?!=)/)) ? +m[1] : null;
  const termN = (m = k.match(/find(?:the)?(\d+)(?:st|nd|rd|th)term/)) ? +m[1] : null;
  if (!sumN && !termN) return null;

  const steps = [];
  const uniq = known.filter((x, i) => known.findIndex(y => y.n === x.n) === i);

  if (isAP && !isGP) {
    let a, d;
    if (diff && uniq.length >= 1) {
      d = diff; const t = uniq[0]; a = t.v.sub(d.mul(new Q(BigInt(t.n - 1))));
      steps.push({ label: 'Given:', katex: `a_{${t.n}} = ${t.v.toTex()}, \\quad d = ${d.toTex()}` });
    } else if (uniq.length >= 2) {
      const [t1, t2] = uniq;
      steps.push({ label: 'Given (the n-th term of an A.P. is $a_n = a + (n-1)d$):', katex: `a_{${t1.n}} = a + ${t1.n - 1}d = ${t1.v.toTex()}, \\qquad a_{${t2.n}} = a + ${t2.n - 1}d = ${t2.v.toTex()}` });
      d = t2.v.sub(t1.v).div(new Q(BigInt(t2.n - t1.n)));
      steps.push({ label: 'Step 1: Subtract the two equations to find the common difference $d$:', katex: `${t2.n - t1.n}d = ${t2.v.toTex()} - ${t1.v.toTex()} = ${t2.v.sub(t1.v).toTex()} \\;\\Rightarrow\\; d = ${d.toTex()}` });
      a = t1.v.sub(d.mul(new Q(BigInt(t1.n - 1))));
      steps.push({ label: 'Step 2: Find the first term $a$:', katex: `a = ${t1.v.toTex()} - ${t1.n - 1}\\left(${d.toTex()}\\right) = ${a.toTex()}` });
    } else return null;
    let answer = [];
    if (termN) {
      const t = a.add(d.mul(new Q(BigInt(termN - 1))));
      steps.push({ label: `Step 3: The ${ordinal(termN)} term:`, katex: `a_{${termN}} = a + ${termN - 1}d = ${a.toTex()} + ${termN - 1}\\left(${d.toTex()}\\right) = ${t.toTex()}` });
      answer.push(`a_{${termN}} = ${t.toTex()}`);
    }
    if (sumN) {
      const Sn = new Q(BigInt(sumN), 2n).mul(a.mul(new Q(2n)).add(d.mul(new Q(BigInt(sumN - 1)))));
      steps.push({ label: `Step ${termN ? 4 : 3}: Sum of the first ${sumN} terms, $S_n = \\frac{n}{2}\\left[2a + (n-1)d\\right]$:`, katex: `S_{${sumN}} = \\frac{${sumN}}{2}\\left[2\\left(${a.toTex()}\\right) + ${sumN - 1}\\left(${d.toTex()}\\right)\\right] = ${Sn.toTex()}` });
      answer.push(`S_{${sumN}} = ${Sn.toTex()}`);
    }
    const ans = answer.join(', \\quad ');
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
    return { answer: ans, steps };
  }

  // Geometric progression
  let a, r, rTex, rNum;
  if (ratio && uniq.length >= 1) {
    r = ratio; const t = uniq[0]; a = t.v.div(r.pow(new Q(BigInt(t.n - 1))));
    rTex = r.toTex(); rNum = r.toNumber();
    steps.push({ label: 'Given:', katex: `a_{${t.n}} = ${t.v.toTex()}, \\quad r = ${r.toTex()}` });
  } else if (uniq.length >= 2) {
    const [t1, t2] = uniq;
    const gap = t2.n - t1.n;
    const ratioPow = t2.v.div(t1.v);
    steps.push({ label: 'Given (the n-th term of a G.P. is $a_n = a r^{n-1}$):', katex: `a r^{${t1.n - 1}} = ${t1.v.toTex()}, \\qquad a r^{${t2.n - 1}} = ${t2.v.toTex()}` });
    r = ratioPow.pow(new Q(1n, BigInt(gap)));
    if (!r.exact && gap % 2 === 1 && ratioPow.isNegative()) r = Q.float(-Math.pow(-ratioPow.toNumber(), 1 / gap));
    rNum = r.toNumber(); rTex = r.toTex();
    steps.push({ label: 'Step 1: Divide the two equations to find the common ratio $r$:', katex: `r^{${gap}} = \\frac{${t2.v.toTex()}}{${t1.v.toTex()}} = ${ratioPow.toTex()} \\;\\Rightarrow\\; r = ${rTex}${gap % 2 === 0 ? ` \\;(\\text{or } r = -${rTex})` : ''}` });
    a = t1.v.div(r.pow(new Q(BigInt(t1.n - 1))));
    steps.push({ label: 'Step 2: Find the first term:', katex: `a = \\frac{${t1.v.toTex()}}{r^{${t1.n - 1}}} = ${a.toTex()}` });
  } else return null;
  const answer = [];
  if (termN) {
    const t = a.mul(r.pow(new Q(BigInt(termN - 1))));
    steps.push({ label: `Step 3: The ${ordinal(termN)} term:`, katex: `a_{${termN}} = a r^{${termN - 1}} = ${t.toTex()}` });
    answer.push(`a_{${termN}} = ${t.toTex()}`);
  }
  if (sumN) {
    let Sn;
    if (r.equals(1)) Sn = a.mul(new Q(BigInt(sumN)));
    else Sn = a.mul(r.pow(new Q(BigInt(sumN))).sub(1)).div(r.sub(1));
    steps.push({ label: `Step ${termN ? 4 : 3}: Sum of the first ${sumN} terms, $S_n = a\\frac{r^n - 1}{r - 1}$:`, katex: `S_{${sumN}} = ${a.toTex()} \\cdot \\frac{\\left(${rTex}\\right)^{${sumN}} - 1}{${rTex} - 1} = ${Sn.toTex()}` });
    answer.push(`S_{${sumN}} = ${Sn.toTex()}`);
  }
  const ans = answer.join(', \\quad ');
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

// ---------- 2. Circle through three points ----------
function solveCircleQuestion(raw) {
  const k = keyText(raw);
  if (!/circle/.test(k)) return null;
  const pts = [];
  const re = /\(\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)\s*,\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)\s*\)/g;
  let m;
  const src = String(raw).replace(/[−–]/g, '-').replace(/\\left|\\right/g, '');
  while ((m = re.exec(src))) pts.push([qp(m[1]), qp(m[2])]);
  if (pts.length !== 3) return null;

  // x^2 + y^2 + Dx + Ey + F = 0  ->  D x + E y + F = -(x^2 + y^2)
  const A = pts.map(([x, y]) => [x, y, new Q(1n)]);
  const b = pts.map(([x, y]) => x.mul(x).add(y.mul(y)).neg());
  const steps = [{ label: 'Given points:', katex: pts.map(([x, y]) => `(${x.toTex()}, ${y.toTex()})`).join(', \\quad ') }];
  steps.push({ label: 'Step 1: General equation of a circle: $x^2 + y^2 + Dx + Ey + F = 0$. Substitute each point:', katex: `\\begin{aligned} ${pts.map(([x, y], i) => `${x.toTex()}D ${y.isNegative() ? '-' : '+'} ${y.abs().toTex()}E + F &= ${b[i].toTex()}`).join(' \\\\ ')} \\end{aligned}` });
  const sol = LA.solve(A, b);
  if (!sol) {
    steps.push({ label: 'The three points lie on one straight line, so no circle passes through all of them.', katex: '' });
    return { answer: '\\text{No circle (the points are collinear)}', steps };
  }
  const [D, E, F] = sol;
  steps.push({ label: 'Step 2: Solve the three equations:', katex: `D = ${D.toTex()}, \\quad E = ${E.toTex()}, \\quad F = ${F.toTex()}` });
  const term = (c, v) => c.isZero() ? '' : `${c.isNegative() ? ' - ' : ' + '}${c.abs().equals(1) && v ? '' : c.abs().toTex()}${v}`;
  let general = `x^2 + y^2${term(D, 'x')}${term(E, 'y')}${term(F, '')} = 0`;
  const h = D.div(new Q(-2n)), kk = E.div(new Q(-2n));
  const r2 = h.mul(h).add(kk.mul(kk)).sub(F);
  const rNode = simplify(pow(num(r2), num(new Q(1n, 2n))));
  const shift = (v, c) => c.isZero() ? `${v}^2` : `\\left(${v} ${c.isNegative() ? '+' : '-'} ${c.abs().toTex()}\\right)^2`;
  const standard = `${shift('x', h)} + ${shift('y', kk)} = ${r2.toTex()}`;
  // whole-number version, e.g. 3x^2 + 3y^2 - 20x - 10y + 25 = 0
  const lcmD = [D, E, F].reduce((acc, v) => { const g = (x, y) => { while (y) [x, y] = [y, x % y]; return x; }; return acc * v.d / g(acc, v.d); }, 1n);
  if (lcmD > 1n) {
    const L = new Q(lcmD);
    const ti = (cf, v) => cf.isZero() ? '' : `${cf.isNegative() ? ' - ' : ' + '}${cf.abs().equals(1) && v ? '' : cf.abs().toTex()}${v}`;
    general = `${lcmD}x^2 + ${lcmD}y^2${ti(D.mul(L), 'x')}${ti(E.mul(L), 'y')}${ti(F.mul(L), '')} = 0`;
  }
  steps.push({ label: 'Step 3: Equation of the circle (general form):', katex: general });
  steps.push({ label: 'Step 4: Complete the squares to get the centre and radius:', katex: `${standard} \\quad \\Rightarrow \\quad \\text{centre } (${h.toTex()}, ${kk.toTex()}), \\; r = ${tex(rNode)}` });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${general}}` });
  return { answer: general, steps };
}

// ---------- 3. Eigenvalues & eigenvectors ----------
function parseMatrix(raw) {
  const s = String(raw).replace(/[−–]/g, '-');
  let rows = null;
  const env = s.match(/\\begin\{[bpvBV]?matrix\}([\s\S]*?)\\end\{[bpvBV]?matrix\}/);
  if (env) rows = env[1].split(/\\\\/).map(r => r.split('&').map(c => c.trim())).filter(r => r.join('') !== '');
  if (!rows) {
    const found = [];
    const re = /\[\s*(-?\d+(?:\.\d+)?(?:\/\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?(?:\/\d+)?)+)\s*\]/g;
    let m;
    while ((m = re.exec(s))) found.push(m[1].split(',').map(c => c.trim()));
    if (found.length) rows = found.slice(0, found[0].length);
  }
  if (!rows) return null;
  const n = rows.length;
  if (n < 2 || n > 3 || rows.some(r => r.length !== n)) return null;
  const M = rows.map(r => r.map(qp));
  if (M.some(r => r.some(v => !v))) return null;
  return M;
}

function solveEigenQuestion(raw) {
  const k = keyText(raw);
  if (!/eigen|characteristic(equation|polynomial)/.test(k)) return null;
  const M = parseMatrix(raw);
  if (!M) return null;
  const n = M.length;
  const steps = [{ label: 'Given matrix:', katex: `A = ${LA.matrixTex(M)}` }];

  // characteristic polynomial det(A - λI) as polynomial in λ (coefficients Q)
  let charPoly;
  const tr = M.reduce((s, r, i) => s.add(r[i]), new Q(0n));
  const detA = LA.det(M);
  if (n === 2) {
    charPoly = [detA, tr.neg(), new Q(1n)];
    steps.push({ label: 'Step 1: Characteristic equation $\\det(A - \\lambda I) = 0$:', katex: `\\begin{vmatrix} ${M[0][0].toTex()} - \\lambda & ${M[0][1].toTex()} \\\\ ${M[1][0].toTex()} & ${M[1][1].toTex()} - \\lambda \\end{vmatrix} = \\lambda^2 - (\\text{tr}A)\\lambda + \\det A = ${P.toTex(charPoly, '\\lambda')} = 0` });
  } else {
    const minors = [[1, 2], [0, 2], [0, 1]].reduce((s, [i, j]) => s.add(M[i][i].mul(M[j][j]).sub(M[i][j].mul(M[j][i]))), new Q(0n));
    // det(λI - A) = λ^3 - tr λ^2 + minors λ - det
    charPoly = [detA.neg(), minors, tr.neg(), new Q(1n)];
    steps.push({ label: 'Step 1: Characteristic equation $\\det(\\lambda I - A) = \\lambda^3 - (\\text{tr}A)\\lambda^2 + (\\text{sum of principal } 2\\times2 \\text{ minors})\\lambda - \\det A = 0$:', katex: `${P.toTex(charPoly, '\\lambda')} = 0` });
  }
  const f = P.factor(charPoly);
  steps.push({ label: 'Step 2: Factor the characteristic polynomial:', katex: `${P.factoredTex(f, '\\lambda')} = 0` });

  const eig = []; // { tex, value(Q)|null }
  for (const fac of f.factors) {
    if (P.degree(fac) === 1) eig.push({ value: fac[0].neg().div(fac[1]) });
    else if (P.degree(fac) === 2) {
      const r = P.quadraticRoots(fac[2], fac[1], fac[0]);
      r.roots.forEach(t => eig.push({ tex: t, kind: r.kind }));
    } else {
      // cubic with no rational roots: numerical roots
      const { polyRoots } = require('./advanced3');
      polyRoots(fac).forEach(z => {
        const re = formatDecimal(+z.re.toFixed(6)), im = Math.abs(z.im) < 1e-9 ? '' : ` ${z.im > 0 ? '+' : '-'} ${formatDecimal(+Math.abs(z.im).toFixed(6))}i`;
        eig.push({ tex: `\\approx ${re}${im}`.replace('\\approx ', ''), approx: true });
      });
      steps.push({ label: 'The cubic has no rational roots, so its roots are found numerically:', katex: '' });
    }
  }
  // multiplicities
  const groups = [];
  for (const e of eig) {
    const key = e.value ? e.value.toPlain() : e.tex;
    const g = groups.find(x => x.key === key);
    if (g) g.mult++; else groups.push({ ...e, key, mult: 1 });
  }
  steps.push({ label: 'Step 3: Eigenvalues:', katex: groups.map((g, i) => `\\lambda_{${i + 1}} ${g.approx ? '\\approx' : '='} ${g.value ? g.value.toTex() : g.tex}${g.mult > 1 ? ` \\;(\\text{repeated } ${g.mult}\\times)` : ''}`).join(', \\quad ') });

  const answers = [];
  let diagonalizable = true;
  groups.forEach((g, i) => {
    const lamTex = g.value ? g.value.toTex() : g.tex;
    if (g.value) {
      const B = M.map((row, r) => row.map((v, c) => (r === c ? v.sub(g.value) : v)));
      const basis = LA.nullSpace(B);
      if (basis.length < g.mult) diagonalizable = false;
      steps.push({
        label: `Step ${4 + i}: For $\\lambda = ${lamTex}$, solve $(A - ${lamTex}I)\\mathbf{v} = \\mathbf{0}$:`,
        katex: `${LA.matrixTex(B)}\\mathbf{v} = \\mathbf{0} \\;\\Rightarrow\\; ${basis.map(v => `\\mathbf{v} = ${LA.vectorTex(v)}`).join(',\\; ')}`
      });
      answers.push(`\\lambda = ${lamTex}: ${basis.map(v => `(${v.map(x => x.toTex()).join(', ')})^T`).join(', ')}`);
    } else if (n === 2) {
      // v = (b, λ - a) when b ≠ 0, else (λ - d, c)
      const [[a, b], [c, d]] = M;
      const vec = !b.isZero()
        ? `\\begin{pmatrix} ${b.toTex()} \\\\ ${lamTex} - ${a.isNegative() ? `(${a.toTex()})` : a.toTex()} \\end{pmatrix}`
        : `\\begin{pmatrix} ${lamTex} - ${d.toTex()} \\\\ ${c.toTex()} \\end{pmatrix}`;
      steps.push({ label: `Step ${4 + i}: For $\\lambda = ${lamTex}$, the first row of $(A - \\lambda I)\\mathbf{v} = 0$ gives:`, katex: `\\mathbf{v} = ${vec}` });
      answers.push(`\\lambda = ${lamTex}`);
    } else {
      answers.push(`\\lambda ${g.approx ? '\\approx' : '='} ${lamTex}`);
    }
  });
  if (groups.every(g => g.value)) {
    steps.push({ label: 'Conclusion:', katex: diagonalizable ? '\\text{There are enough independent eigenvectors, so } A \\text{ is diagonalizable.}' : '\\text{A repeated eigenvalue has too few eigenvectors, so } A \\text{ is not diagonalizable (defective).}' });
  }
  const answer = answers.join(';\\quad ');
  return { answer, steps };
}

// ---------- 4. Series convergence ----------
function extractSeries(raw) {
  const s = String(raw).replace(/[−–]/g, '-');
  let m = s.match(/\\sum\s*_\s*\{\s*([a-z])\s*=\s*(-?\d+)\s*\}\s*\^\s*\{?\s*(\\infty|∞|inf)\s*\}?\s*(.+)$/);
  if (m) return { n: m[1], start: +m[2], body: m[4] };
  m = s.match(/(?:[Σ∑]|\\sum)\s*_?\s*[({]?\s*([a-z])\s*=\s*(-?\d+)\s*[)}]?\s*\^?\s*\{?\s*(?:∞|\\infty|inf)\s*\}?\s*(.+?)(?:\s*(?:converges?|diverges?).*)?$/i);
  if (m) return { n: m[1], start: +m[2], body: m[3] };
  m = s.match(/\\sum\s*(.+)$/) || s.match(/[Σ∑]\s*(.+?)(?:\s+(?:converges?|diverges?)\b.*)?$/);
  if (m) return { n: 'n', start: 1, body: m[1] };
  return null;
}

function solveSeriesQuestion(raw) {
  const k = keyText(raw);
  if (!/sum|σ|∑|series|converge|diverge/.test(k) || !/converge|diverge|series|test/.test(k)) return null;
  const ex = extractSeries(raw);
  if (!ex) return null;
  let body = ex.body.replace(/\s*(converges?|diverges?|or\s+diverges?|\?|\.)+\s*$/gi, '').replace(/\s*(converges?|diverges?)\s*\??\s*$/i, '').replace(/^\(\s*(.*)\s*\)$/, '$1');
  const term = parseMath(body);
  if (!term) return null;
  const n = ex.n;
  if ([...S.variables(term)].some(v => v !== n)) return null;
  const a = simplify(term);
  const A = (v) => { try { return S.evaluate(a, { [n]: v }); } catch (e) { return NaN; } };
  const steps = [{ label: 'Given series:', katex: `\\sum_{${n}=${ex.start}}^{\\infty} ${tex(a)}` }];

  // Alternating?
  let alt = null, b = a;
  if (a.t === 'prod') {
    const sgn = a.factors.find(f => f.t === 'pow' && S.isNum ? false : f.t === 'pow' && f.base.t === 'num' && f.base.v.equals(-1));
    if (sgn) { alt = sgn; b = simplify(prod(...a.factors.filter(f => f !== sgn))); }
  }
  const B = (v) => { try { return S.evaluate(b, { [n]: v }); } catch (e) { return NaN; } };

  // nth-term test
  const big = B(1e6), bigger = B(1e7);
  if (Number.isFinite(bigger) && Math.abs(bigger) > 1e-3 && Math.abs(bigger - big) < Math.abs(bigger) * 0.5) {
    steps.push({ label: 'Step 1: n-th term (divergence) test: the terms do not tend to 0.', katex: `\\lim_{${n}\\to\\infty} ${tex(alt ? b : a)} \\neq 0` });
    return { answer: '\\text{The series diverges}', steps: [...steps, { label: 'Conclusion:', katex: '\\mathbf{\\text{Diverges}}' }] };
  }
  if (alt) {
    const dec = B(100) > B(101) && B(1000) > B(1001);
    if (dec && Math.abs(bigger) < 1e-4) {
      const absConv = classify(b, n, ex.start, B, []);
      steps.push({ label: 'Step 1: Alternating series test (Leibniz): $b_n$ is positive, decreasing and tends to 0, so the series converges.', katex: `b_${n} = ${tex(b)} \\to 0` });
      if (absConv && absConv.converges !== undefined) {
        steps.push({ label: `Step 2: Absolute convergence: $\\sum b_n$ ${absConv.converges ? 'converges' : 'diverges'} (${absConv.test}).`, katex: '' });
        const ans = absConv.converges ? '\\text{Converges absolutely}' : '\\text{Converges conditionally}';
        steps.push({ label: 'Conclusion:', katex: `\\mathbf{${ans}}` });
        return { answer: ans, steps };
      }
      steps.push({ label: 'Conclusion:', katex: '\\mathbf{\\text{Converges}}' });
      return { answer: '\\text{The series converges}', steps };
    }
  }
  const res = classify(a, n, ex.start, A, steps);
  if (!res) return null;
  const ans = res.converges ? '\\text{The series converges}' : '\\text{The series diverges}';
  steps.push({ label: 'Conclusion:', katex: `\\mathbf{\\text{${res.converges ? 'Converges' : 'Diverges'}}} \\quad (${res.test})` });
  return { answer: ans, steps };
}

// Recognise standard positive series; pushes explanation steps
function classify(a, n, start, A, steps) {
  const N = vr(n);
  // 1 / (n (ln n)^p)
  const lnPow = matchNLnP(a, n);
  if (lnPow) {
    const p = lnPow;
    steps.push({ label: 'Step 1: Use the integral test with $f(x) = \\frac{1}{x(\\ln x)^p}$, which is positive and decreasing for $x \\ge 2$.', katex: `\\int_{2}^{\\infty} \\frac{dx}{x(\\ln x)^{${p.toTex()}}} = \\int_{\\ln 2}^{\\infty} \\frac{du}{u^{${p.toTex()}}} \\quad (u = \\ln x,\\; du = \\tfrac{dx}{x})` });
    if (p.toNumber() > 1) {
      steps.push({ label: 'Step 2: This is a p-integral with $p > 1$, so it is finite:', katex: `\\int_{\\ln 2}^{\\infty} u^{-${p.toTex()}}\\,du = \\left[\\frac{u^{1-${p.toTex()}}}{1-${p.toTex()}}\\right]_{\\ln 2}^{\\infty} = \\frac{(\\ln 2)^{1-${p.toTex()}}}{${p.sub(1).toTex()}} < \\infty` });
      return { converges: true, test: `\\text{integral test}, p = ${p.toTex()} > 1` };
    }
    steps.push({ label: 'Step 2: This is a p-integral with $p \\le 1$, so it is infinite.', katex: '\\int_{\\ln 2}^{\\infty} u^{-p}\\,du = \\infty' });
    return { converges: false, test: `\\text{integral test}, p = ${p.toTex()} \\le 1` };
  }
  // c / n^p
  const pser = matchPSeries(a, n);
  if (pser) {
    const p = pser;
    steps.push({ label: `Step 1: This is a p-series $\\sum \\frac{1}{n^p}$ with $p = ${p.toTex()}$. It converges exactly when $p > 1$.`, katex: '' });
    return { converges: p.toNumber() > 1, test: `p\\text{-series}, p = ${p.toTex()}` };
  }
  // geometric c * r^n
  const geo = matchGeometric(a, n);
  if (geo) {
    const r = geo;
    steps.push({ label: `Step 1: Geometric series with common ratio $r = ${r.toTex()}$. It converges exactly when $|r| < 1$.`, katex: `|r| = ${r.abs().toTex()}` });
    return { converges: Math.abs(r.toNumber()) < 1, test: `\\text{geometric}, |r| = ${r.abs().toTex()}` };
  }
  // Ratio test (numeric)
  const ratio = A(51) / A(50), ratio2 = A(101) / A(100);
  if (Number.isFinite(ratio2) && Number.isFinite(ratio)) {
    const L = ratio2;
    const bothSmall = Math.abs(ratio) < 0.98 && Math.abs(ratio2) < 0.98 && Math.abs(ratio2) <= Math.abs(ratio) + 0.02;
    const bothBig = Math.abs(ratio) > 1.02 && Math.abs(ratio2) > 1.02;
    if (bothBig && Math.abs(ratio2) > Math.abs(ratio) * 1.5) {
      steps.push({ label: 'Step 1: Ratio test: the ratio of consecutive terms grows without bound.', katex: `\\lim_{n\\to\\infty}\\left|\\frac{a_{n+1}}{a_n}\\right| = \\infty > 1` });
      return { converges: false, test: '\\text{ratio test}' };
    }
    if (bothSmall && Math.abs(ratio2) < Math.abs(ratio) * 0.7) {
      steps.push({ label: 'Step 1: Ratio test: the ratio of consecutive terms tends to 0.', katex: `\\lim_{n\\to\\infty}\\left|\\frac{a_{n+1}}{a_n}\\right| = 0 < 1` });
      return { converges: true, test: '\\text{ratio test}' };
    }
    if (bothSmall) {
      steps.push({ label: 'Step 1: Ratio test:', katex: `L = \\lim_{n\\to\\infty}\\left|\\frac{a_{n+1}}{a_n}\\right| \\approx ${recogniseConstant(+L.toFixed(6)) || formatDecimal(+L.toFixed(4))} < 1` });
      return { converges: true, test: '\\text{ratio test}' };
    }
    if (bothBig) {
      steps.push({ label: 'Step 1: Ratio test:', katex: `L = \\lim_{n\\to\\infty}\\left|\\frac{a_{n+1}}{a_n}\\right| \\approx ${formatDecimal(+L.toFixed(4))} > 1` });
      return { converges: false, test: '\\text{ratio test}' };
    }
  }
  // Limit comparison with 1/n^p: estimate p from growth
  const p1 = Math.log(Math.abs(A(1e4)) / Math.abs(A(1e5))) / Math.log(10);
  const p2 = Math.log(Math.abs(A(1e5)) / Math.abs(A(1e6))) / Math.log(10);
  if (Number.isFinite(p2) && Math.abs(p1 - p2) < 0.02) {
    const p = Math.round(p2 * 2) / 2;
    if (Math.abs(p - p2) < 0.02 && p !== 1) {
      steps.push({ label: `Step 1: Limit comparison test with the p-series $\\sum \\frac{1}{n^{${p}}}$: for large $n$ the terms behave like $\\frac{c}{n^{${p}}}$.`, katex: `\\lim_{n\\to\\infty} \\frac{a_n}{1/n^{${p}}} = c, \\; 0 < c < \\infty` });
      return { converges: p > 1, test: `\\text{comparison with } p = ${p}` };
    }
  }
  return null;
}

function matchNLnP(a, n) {
  // a = n^-1 * ln(n)^-p
  if (a.t !== 'prod') return null;
  let hasN = false, p = null, other = false;
  for (const f of a.factors) {
    if (f.t === 'pow' && f.base.t === 'var' && f.base.n === n && f.exp.t === 'num' && f.exp.v.equals(-1)) hasN = true;
    else if (f.t === 'pow' && f.base.t === 'fn' && f.base.f === 'ln' && f.base.arg.t === 'var' && f.exp.t === 'num' && f.exp.v.isNegative()) p = f.exp.v.neg();
    else if (f.t === 'num' && !f.v.isNegative()) { /* constant multiple */ }
    else other = true;
  }
  return hasN && p && !other ? p : null;
}
function matchPSeries(a, n) {
  const [c, rest] = S.splitCoef(a);
  if (!rest || c.isNegative()) return null;
  if (rest.t === 'pow' && rest.base.t === 'var' && rest.base.n === n && rest.exp.t === 'num' && rest.exp.v.isNegative()) return rest.exp.v.neg();
  if (rest.t === 'pow' && rest.base.t === 'var' && rest.base.n === n && rest.exp.t === 'num') return rest.exp.v.neg();
  return null;
}
function matchGeometric(a, n) {
  const [c, rest] = S.splitCoef(a);
  if (!rest) return null;
  const fs = rest.t === 'prod' ? rest.factors : [rest];
  let r = new Q(1n);
  for (const f of fs) {
    if (f.t !== 'pow' || f.base.t !== 'num') return null;
    const L = S.linearIn(f.exp, n);
    if (!L || !L.a.isInteger()) return null;
    r = r.mul(f.base.v.pow(L.a));
  }
  return r;
}

// ---------- 5. Linear ODEs with constant coefficients (order 1 or 2) ----------
function normalisePrimes(s) {
  return String(s)
    .replace(/\^\{\\prime\\prime\}|\^\{''\}|\\doubleprime|″|''/g, "''")
    .replace(/\^\{\\prime\}|\\prime|′|’/g, "'")
    .replace(/\\frac\{d\^\{?2\}?y\}\{dx\^\{?2\}?\}|d\^2y\/dx\^2/g, "y''")
    .replace(/\\frac\{dy\}\{dx\}|dy\/dx/g, "y'");
}

function solveODEQuestion(raw) {
  let s = normalisePrimes(raw).replace(/[−–]/g, '-').replace(/\\left|\\right/g, '');
  if (!/y'/.test(s)) return null;
  // drop instruction words before the equation
  const eqm = s.match(/([-+\d\s.*\\a-z]*y''?[^=]*=[^,;]+)/i);
  if (!eqm) return null;
  // conditions like y(0)=1, y'(0)=2
  const conds = [];
  let cm;
  const reC = /y('?)\(\s*0\s*\)\s*=\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)/g;
  while ((cm = reC.exec(s))) conds.push({ order: cm[1] ? 1 : 0, v: qp(cm[2]) });
  let eq = (s.includes(':') ? s.slice(s.indexOf(':') + 1) : s).replace(/,.*$/, '');
  eq = eq.replace(/^\s*((solve|find|the|general|solution|of|differential|equation|ode|for)\b\s*)+/i, '');
  let [lhsRaw, rhsRaw] = eq.split('=');
  if (rhsRaw === undefined) return null;
  // move y, y', y'' terms from the right side to the left (e.g. y' = y  ->  y' - y = 0)
  let movedRhs = rhsRaw.replace(/\s+/g, '').replace(/\\cdot|\*/g, '');
  const moved = [];
  movedRhs = movedRhs.replace(/([+-]?)(\d*(?:\.\d+)?(?:\/\d+)?)y('{0,2})(?![a-z(])/g, (all, sg, c, pr) => { moved.push({ sg: sg === '-' ? '+' : '-', c, pr }); return ''; });
  if (moved.length) {
    lhsRaw = lhsRaw + moved.map(m => `${m.sg}${m.c}y${m.pr}`).join('');
    rhsRaw = movedRhs.replace(/^\+/, '') || '0';
  }
  const lhs = lhsRaw.replace(/\s+/g, '').replace(/\\cdot|\*/g, '');
  // coefficients of y'', y', y
  const coef = { 2: new Q(0n), 1: new Q(0n), 0: new Q(0n) };
  let rest = lhs.replace(/([+-]?)(\d*(?:\.\d+)?(?:\/\d+)?)y('{0,2})/g, (all, sg, c, pr) => {
    const v = qp((sg === '-' ? '-' : '') + (c || '1'));
    coef[pr.length] = coef[pr.length].add(v);
    return '';
  });
  if (rest.replace(/[\s+\-]/g, '') !== '') return null; // something other than y'', y', y on the left
  const order = !coef[2].isZero() ? 2 : !coef[1].isZero() ? 1 : 0;
  if (order === 0) return null;

  const rhsText = rhsRaw.replace(/[.\s]+$/, '').replace(/,.*$/, '');
  const rhs = parseMath(rhsText);
  if (!rhs) return null;
  if ([...S.variables(rhs)].some(v => v !== 'x')) return null;
  const [a, b, c] = [coef[2], coef[1], coef[0]];
  const charP = order === 2 ? [c, b, a] : [c, b];
  const pAt = (r) => P.evaluate(charP, r);
  const dpAt = (r) => P.evaluate(P.trim(charP.slice(1).map((v, i) => v.mul(new Q(BigInt(i + 1))))), r);

  const yTerms = [];
  if (!a.isZero()) yTerms.push(`${a.equals(1) ? '' : a.equals(-1) ? '-' : a.toTex()}y''`);
  if (!b.isZero()) yTerms.push(`${b.isNegative() ? '-' : '+'} ${b.abs().equals(1) ? '' : b.abs().toTex()}y'`);
  if (!c.isZero()) yTerms.push(`${c.isNegative() ? '-' : '+'} ${c.abs().equals(1) ? '' : c.abs().toTex()}y`);
  const lhsTex = yTerms.join(' ').replace(/^\+ /, '');
  const steps = [{ label: 'Given differential equation:', katex: `${lhsTex} = ${tex(simplify(rhs))}` }];

  // ----- complementary solution -----
  const ch = order === 2 ? `${P.toTex([c, b, a], 'r')} = 0` : `${P.toTex([c, b], 'r')} = 0`;
  steps.push({ label: 'Step 1: Solve the homogeneous equation. Try $y = e^{rx}$ to get the characteristic equation:', katex: ch });
  let yc, rootsInfo, rootVals = [];
  let ycTerms = null; // [{ name, basis }] when the constants can be found from initial conditions
  const eRx = (r) => (r.isZero() ? '' : `e^{${r.equals(1) ? '' : r.equals(-1) ? '-' : r.toTex()}x}`);
  if (order === 1) {
    const r = c.neg().div(b);
    rootVals = [r];
    ycTerms = [{ name: 'C', basis: eRx(r) }];
    rootsInfo = `r = ${r.toTex()}`;
  } else {
    const qr = P.quadraticRoots(a, b, c);
    if (qr.kind === 'rational') {
      if (qr.values.length === 1) {
        const r = qr.values[0];
        ycTerms = [{ name: 'C_1', basis: eRx(r) }, { name: 'C_2', basis: 'x' + eRx(r) }];
        rootsInfo = `r = ${r.toTex()} \\; (\\text{repeated})`;
        rootVals = [r, r];
      } else {
        const [r1, r2] = qr.values;
        rootVals = [r1, r2];
        ycTerms = [{ name: 'C_1', basis: eRx(r1) }, { name: 'C_2', basis: eRx(r2) }];
        rootsInfo = `r_1 = ${r1.toTex()}, \\; r_2 = ${r2.toTex()}`;
      }
    } else if (qr.kind === 'irrational') {
      yc = `C_1 e^{\\left(${qr.roots[0]}\\right)x} + C_2 e^{\\left(${qr.roots[1]}\\right)x}`;
      rootsInfo = `r = ${qr.roots[0]}, \\; ${qr.roots[1]}`;
    } else {
      const alpha = b.neg().div(a.mul(new Q(2n)));
      const beta2 = a.mul(c).mul(new Q(4n)).sub(b.mul(b)).div(a.mul(a).mul(new Q(4n)));
      const beta = simplify(pow(num(beta2), num(new Q(1n, 2n))));
      const bt = tex(beta);
      const trigArg = bt === '1' ? 'x' : `${bt}x`;
      yc = alpha.isZero()
        ? `C_1\\cos(${trigArg}) + C_2\\sin(${trigArg})`
        : `e^{${alpha.equals(1) ? '' : alpha.equals(-1) ? '-' : alpha.toTex()}x}\\left(C_1\\cos(${trigArg}) + C_2\\sin(${trigArg})\\right)`;
      rootsInfo = `r = ${qr.roots[0]}, \\; ${qr.roots[1]} \\quad (\\alpha = ${alpha.toTex()}, \\beta = ${bt})`;
    }
  }
  const coefBasis = (cf, basis) => {
    if (typeof cf === 'string') return `${cf}${basis}`;
    if (cf.isZero()) return '';
    if (!basis) return cf.toTex();
    return (cf.equals(1) ? '' : cf.equals(-1) ? '-' : cf.toTex()) + basis;
  };
  const joinTerms = (parts) => parts.filter(Boolean).reduce((acc, t) => !acc ? t : t.startsWith('-') ? `${acc} - ${t.slice(1)}` : `${acc} + ${t}`, '');
  if (ycTerms) yc = joinTerms(ycTerms.map(t => coefBasis(t.name, t.basis)));
  steps.push({ label: 'Step 2: Roots and complementary solution:', katex: `${rootsInfo} \\quad\\Rightarrow\\quad y_c = ${yc}` });

  // ----- particular solution (undetermined coefficients) -----
  const mult = (m) => rootVals.filter(r => r.equals(m)).length;
  const expanded = S.expand(rhs);
  const terms = expanded.t === 'sum' ? expanded.terms : [expanded];
  let polyPart = [new Q(0n)];
  const expParts = []; // {k, m}
  const trigParts = new Map(); // w -> {cos, sin}
  for (const t of terms) {
    const [k0, rest0] = S.splitCoef(t);
    if (!rest0) { polyPart = P.add(polyPart, [k0]); continue; }
    const pp = S.toPoly(t, 'x');
    if (pp) { polyPart = P.add(polyPart, pp); continue; }
    if (rest0.t === 'pow' && rest0.base.t === 'const' && rest0.base.n === 'e') {
      const L = S.linearIn(rest0.exp, 'x');
      if (!L || !L.b.isZero()) return null;
      expParts.push({ k: k0, m: L.a, poly: [k0] });
      continue;
    }
    // x^k e^{mx}
    if (rest0.t === 'prod') {
      const ex = rest0.factors.find(f => f.t === 'pow' && f.base.t === 'const' && f.base.n === 'e');
      const others = rest0.factors.filter(f => f !== ex);
      const L = ex && S.linearIn(ex.exp, 'x');
      const pp = others.length && S.toPoly(prod(num(k0), ...others), 'x');
      if (L && L.b.isZero() && pp) { expParts.push({ k: k0, m: L.a, poly: pp }); continue; }
    }
    if (rest0.t === 'fn' && (rest0.f === 'sin' || rest0.f === 'cos')) {
      const L = S.linearIn(rest0.arg, 'x');
      if (!L || !L.b.isZero()) return null;
      const key = L.a.toPlain();
      const e = trigParts.get(key) || { w: L.a, cos: new Q(0n), sin: new Q(0n) };
      e[rest0.f] = e[rest0.f].add(k0);
      trigParts.set(key, e);
      continue;
    }
    return null; // unsupported forcing term
  }

  const ypParts = []; // symbolic ASTs
  const ypLines = [];
  const X = vr('x');
  // polynomial * e^{mx}: write y = e^{mx} v; then a v'' + (2am + b) v' + p(m) v = P(x)
  const solvePolyRhs = (A0, B0, C0, rhsPoly) => {
    const deg = P.degree(rhsPoly);
    const s0 = !C0.isZero() ? 0 : !B0.isZero() ? 1 : 2;
    const Lop = (poly) => {
      const d1 = P.trim(poly.slice(1).map((v, i) => v.mul(new Q(BigInt(i + 1)))));
      const d2 = P.trim(d1.slice(1).map((v, i) => v.mul(new Q(BigInt(i + 1)))));
      return P.add(P.add(P.scale(d2.length ? d2 : [new Q(0n)], A0), P.scale(d1.length ? d1 : [new Q(0n)], B0)), P.scale(poly, C0));
    };
    const basis = Array.from({ length: deg + 1 }, (_, j) => { const p = Array(s0 + j + 1).fill(new Q(0n)); p[s0 + j] = new Q(1n); return p; });
    const images = basis.map(Lop);
    const Mx = Array.from({ length: deg + 1 }, (_, row) => images.map(img => img[row] || new Q(0n)));
    const rhsV = Array.from({ length: deg + 1 }, (_, row) => rhsPoly[row] || new Q(0n));
    const coefs = LA.solve(Mx, rhsV);
    if (!coefs) return null;
    let out = [new Q(0n)];
    coefs.forEach((cf, j) => { out = P.add(out, P.scale(basis[j], cf)); });
    return out;
  };
  for (const ep of expParts.filter(e => P.degree(e.poly) >= 1)) {
    const { m } = ep;
    const v = solvePolyRhs(a, a.mul(m).mul(new Q(2n)).add(b), pAt(m), ep.poly);
    if (!v) return null;
    const node = simplify(prod(S.fromPoly(v, 'x'), pow(cst('e'), prod(num(m), X))));
    ypParts.push(node);
    ypLines.push(`\\text{For } (${P.toTex(ep.poly, 'x')})e^{${m.equals(1) ? '' : m.toTex()}x}: \\; y = e^{${m.equals(1) ? '' : m.toTex()}x}v \\Rightarrow v = ${P.toTex(v, 'x')}`);
  }
  // exponential terms
  for (const { k: kk, m } of expParts.filter(e => P.degree(e.poly) < 1)) {
    const s0 = mult(m);
    let A;
    if (s0 === 0) A = kk.div(pAt(m));
    else if (s0 === 1) A = kk.div(dpAt(m));
    else A = kk.div(a.mul(new Q(2n)));
    const trial = `${s0 === 0 ? '' : s0 === 1 ? 'x' : 'x^2'}Ae^{${m.equals(1) ? '' : m.toTex()}x}`;
    const node = simplify(prod(num(A), s0 ? pow(X, s0) : num(1), pow(cst('e'), prod(num(m), X))));
    ypParts.push(node);
    ypLines.push(`\\text{For } ${kk.equals(1) ? '' : kk.toTex()}e^{${m.equals(1) ? '' : m.toTex()}x}: \\; y_p = ${trial}${s0 ? ` \\;(${m.toTex()} \\text{ is a root of multiplicity } ${s0})` : ''} \\Rightarrow A = ${A.toTex()}`);
  }
  // polynomial terms
  if (!P.isZeroPoly(polyPart)) {
    const deg = P.degree(polyPart);
    const s0 = !c.isZero() ? 0 : !b.isZero() ? 1 : 2;
    const L = (poly) => {
      const d1 = P.trim(poly.slice(1).map((v, i) => v.mul(new Q(BigInt(i + 1)))));
      const d2 = P.trim(d1.slice(1).map((v, i) => v.mul(new Q(BigInt(i + 1)))));
      return P.add(P.add(P.scale(d2.length ? d2 : [new Q(0n)], a), P.scale(d1.length ? d1 : [new Q(0n)], b)), P.scale(poly, c));
    };
    const basis = Array.from({ length: deg + 1 }, (_, j) => { const p = Array(s0 + j + 1).fill(new Q(0n)); p[s0 + j] = new Q(1n); return p; });
    const images = basis.map(L);
    const Mx = Array.from({ length: deg + 1 }, (_, row) => images.map(img => img[row] || new Q(0n)));
    const rhsV = Array.from({ length: deg + 1 }, (_, row) => polyPart[row] || new Q(0n));
    const coefs = LA.solve(Mx, rhsV);
    if (!coefs) return null;
    let yp = [new Q(0n)];
    coefs.forEach((cf, j) => { yp = P.add(yp, P.scale(basis[j], cf)); });
    ypParts.push(S.fromPoly(yp, 'x'));
    ypLines.push(`\\text{For the polynomial } ${P.toTex(polyPart, 'x')}: \\; y_p = ${s0 ? (s0 === 1 ? 'x' : 'x^2') + '(\\dots)' : '\\text{polynomial of degree } ' + deg} \\Rightarrow y_p = ${P.toTex(yp, 'x')}`);
  }
  // trig terms
  for (const { w, cos: kc, sin: ks } of trigParts.values()) {
    const w2 = w.mul(w);
    const cc = c.sub(a.mul(w2)), bw = b.mul(w);
    let node, line;
    if (cc.isZero() && bw.isZero()) {
      // resonance (only possible when b = 0 and c = a w^2)
      const B2 = kc.div(a.mul(w).mul(new Q(2n)));
      const A2 = ks.neg().div(a.mul(w).mul(new Q(2n)));
      node = simplify(prod(X, sum(prod(num(A2), fn('cos', prod(num(w), X))), prod(num(B2), fn('sin', prod(num(w), X))))));
      line = `\\text{Resonance: } y_p = x\\left(A\\cos(${w.toTex()}x) + B\\sin(${w.toTex()}x)\\right) \\Rightarrow A = ${A2.toTex()}, B = ${B2.toTex()}`;
    } else {
      // A cc + B bw = kc ;  -A bw + B cc = ks
      const sol = LA.solve([[cc, bw], [bw.neg(), cc]], [kc, ks]);
      if (!sol) return null;
      const [A2, B2] = sol;
      node = simplify(sum(prod(num(A2), fn('cos', prod(num(w), X))), prod(num(B2), fn('sin', prod(num(w), X)))));
      line = `y_p = A\\cos(${w.toTex()}x) + B\\sin(${w.toTex()}x) \\Rightarrow A = ${A2.toTex()}, \\; B = ${B2.toTex()}`;
    }
    ypParts.push(node);
    ypLines.push(line);
  }
  const yp = ypParts.length ? simplify(sum(...ypParts)) : num(0);
  if (ypParts.length) {
    steps.push({ label: 'Step 3: Find a particular solution by undetermined coefficients (substitute the trial form and compare coefficients):', katex: `\\begin{aligned} ${ypLines.map(l => '&' + l).join(' \\\\ ')} \\end{aligned}` });
    steps.push({ label: 'Particular solution:', katex: `y_p = ${tex(yp)}` });
  }
  let general = `y = ${joinTerms([yc, ypParts.length ? tex(yp) : ''])}`;
  steps.push({ label: `Step ${ypParts.length ? 4 : 3}: General solution $y = y_c + y_p$:`, katex: general });

  // initial conditions at x = 0 (rational distinct/repeated roots only)
  if (ycTerms && conds.length === order && rootVals.length === order) {
    const yp0 = simplify(S.substitute(yp, 'x', num(0)));
    const dyp0 = simplify(S.substitute(S.derivative(yp, 'x'), 'x', num(0)));
    if (yp0.t === 'num' && dyp0.t === 'num') {
      let Mc, names;
      if (order === 1) { Mc = [[new Q(1n)]]; names = ['C']; }
      else if (rootVals[0].equals(rootVals[1])) { Mc = [[new Q(1n), new Q(0n)], [rootVals[0], new Q(1n)]]; names = ['C_1', 'C_2']; }
      else { Mc = [[new Q(1n), new Q(1n)], [rootVals[0], rootVals[1]]]; names = ['C_1', 'C_2']; }
      const rhsC = conds.sort((p1, p2) => p1.order - p2.order).map(cd => cd.v.sub(cd.order === 0 ? yp0.v : dyp0.v));
      const Cs = LA.solve(Mc.slice(0, order), rhsC);
      if (Cs) {
        const fin = `y = ${joinTerms([...ycTerms.map((t, i) => coefBasis(Cs[i], t.basis)), ypParts.length ? tex(yp) : '']) || '0'}`;
        steps.push({ label: 'Step 5: Use the initial conditions to find the constants:', katex: names.map((nm, i) => `${nm} = ${Cs[i].toTex()}`).join(', \\quad ') });
        general = fin;
        steps.push({ label: 'Final Answer:', katex: `\\mathbf{${general}}` });
        return { answer: general, steps };
      }
    }
  }
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${general}}` });
  return { answer: general, steps };
}

module.exports = { solveSequenceQuestion, solveCircleQuestion, solveEigenQuestion, solveSeriesQuestion, solveODEQuestion, parseMatrix, normalisePrimes };
