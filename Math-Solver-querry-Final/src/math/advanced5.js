// School and intermediate question types (Matric → A-level):
// percentages and ratios in words, factorising, simultaneous equations (elimination, Cramer's rule,
// matrix inverse), matrix inverse / determinant / transpose, speed–distance–time and profit–loss
// word problems, trigonometric identities and equations, permutations, combinations and probability.

const { Q } = require('./rational');
const S = require('./symbolic');
const P = require('./polynomial');
const A1 = require('./advanced1');
const LA = require('./linalg');
const { parseMatrix } = require('./advanced2');
const { plain } = require('./advanced4');
const TOOLS = require('./tools');

const R = String.raw;
const qn = (v) => new Q(BigInt(v));
const qt = (q) => q.toTex();
function toFrac(v, maxDen = 1000) {
  if (!Number.isFinite(v)) return null;
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-9 * Math.max(1, Math.abs(v))) return new Q(BigInt(n), BigInt(d));
  }
  return null;
}
const fmt = (v) => { const r = Math.round(v * 1e6) / 1e6; return String(Object.is(r, -0) ? 0 : r); };
const numTex = (v) => { const q = toFrac(v, 1000); return q ? qt(q) : fmt(v); };
const lower = (raw) => plain(raw).toLowerCase();

// ---------------------------------------------------------------- percentages & ratios in words
function solvePercentRatioWords(raw) {
  const s = lower(raw).replace(/,(?=\d{3}\b)/g, '');
  let m;
  if ((m = s.match(/(-?\d+(?:\.\d+)?)\s*(?:%|percent|per cent)\s+of\s+(-?\d+(?:\.\d+)?)/))) return TOOLS.solvePercentage('of', m[1], m[2]);
  if ((m = s.match(/(-?\d+(?:\.\d+)?)\s+is\s+what\s+(?:percent|percentage|%)\s+of\s+(-?\d+(?:\.\d+)?)/)) ||
      (m = s.match(/what\s+(?:percent|percentage|%)\s+of\s+(-?\d+(?:\.\d+)?)\s+is\s+(-?\d+(?:\.\d+)?)/))) {
    return /^what/.test(m[0]) ? TOOLS.solvePercentage('whatpercent', m[2], m[1]) : TOOLS.solvePercentage('whatpercent', m[1], m[2]);
  }
  if ((m = s.match(/percent(?:age)?\s+(?:change|increase|decrease)\s+from\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)/))) return TOOLS.solvePercentage('change', m[1], m[2]);
  if (/percent|%/.test(s) && (m = s.match(/(?:increase[sd]?|decrease[sd]?|rises?|rose|falls?|fell|drops?|dropped|goes up|went up|goes down|went down|chang(?:es|ed)|grows?|grew)\s+from\s+(?:rs\.?\s*|\$|£|€)?(-?\d+(?:\.\d+)?)\s+to\s+(?:rs\.?\s*|\$|£|€)?(-?\d+(?:\.\d+)?)/))) return TOOLS.solvePercentage('change', m[1], m[2]);
  if ((m = s.match(/(increase|decrease)\s+(-?\d+(?:\.\d+)?)\s+by\s+(\d+(?:\.\d+)?)\s*(?:%|percent)/))) return TOOLS.solvePercentage(m[1], m[3], m[2]);

  // divide N in the ratio a:b(:c)
  if ((m = s.match(/(?:divide|share|split)\s+(?:rs\.?\s*|\$|£|€)?(\d+(?:\.\d+)?)\s+(?:\w+\s+){0,3}?(?:in|into)\s+(?:the\s+)?ratio\s+(\d+(?:\s*:\s*\d+){1,4})/))) {
    const total = Number(m[1]);
    const parts = m[2].split(':').map(t => Number(t.trim()));
    const sum = parts.reduce((a, b) => a + b, 0);
    if (!sum) return null;
    const shares = parts.map(p => total * p / sum);
    const steps = [
      { label: `Divide ${fmt(total)} in the ratio ${parts.join(' : ')}.`, katex: '' },
      { label: 'Step 1: add the parts of the ratio:', katex: `${parts.join(' + ')} = ${sum}` },
      { label: 'Step 2: each share is (its part ÷ total parts) × the amount:', katex: shares.map((v, i) => `\\frac{${parts[i]}}{${sum}} \\times ${fmt(total)} = ${numTex(v)}`).join(', \\quad ') },
      { label: 'Check: the shares add up to the total.', katex: `${shares.map(numTex).join(' + ')} = ${fmt(total)}` },
      { label: 'Final Answer:', katex: `\\mathbf{${shares.map(numTex).join(' : ')}}` }
    ];
    return { answer: shares.map(numTex).join(',\\ '), steps };
  }
  // simplify a ratio a:b(:c)
  if ((m = s.match(/(?:simplify|simplest form|lowest terms|reduce)[^0-9]*?(\d+(?:\.\d+)?(?:\s*:\s*\d+(?:\.\d+)?){1,4})/)) ||
      (m = s.match(/(\d+(?:\.\d+)?(?:\s*:\s*\d+(?:\.\d+)?){1,4})\s*(?:in|to)\s*(?:its\s+)?(?:simplest|lowest)/))) {
    let parts = m[1].split(':').map(t => t.trim());
    const dec = Math.max(...parts.map(t => (t.split('.')[1] || '').length));
    const steps = [{ label: `Simplify the ratio ${parts.join(' : ')}.`, katex: '' }];
    let ints = parts.map(t => BigInt(Math.round(Number(t) * 10 ** dec)));
    if (dec) steps.push({ label: `Step 1: multiply every part by ${10 ** dec} to remove the decimals:`, katex: ints.join(' : ') });
    const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
    const g = ints.reduce(gcd);
    if (g === 0n) return null;
    steps.push({ label: `Step ${dec ? 2 : 1}: divide every part by their greatest common factor, ${g}:`, katex: ints.map(v => `\\frac{${v}}{${g}}`).join(' : ') + ' = ' + ints.map(v => v / g).join(' : ') });
    const out = ints.map(v => v / g).join(':');
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${out.replace(/:/g, ' : ')}}` });
    return { answer: out, steps };
  }
  return null;
}

// ---------------------------------------------------------------- factorising
function solveFactorCommand(raw) {
  const s = plain(raw);
  const m = s.match(/^\s*(?:please\s+)?(factor(?:ise|ize)?|factori[sz]ation\s+of|completely\s+factor(?:ise|ize)?|expand|multiply\s+out)\s*:?\s+(.+?)\s*\.?$/i);
  if (!m) return null;
  const isExpand = /expand|multiply/i.test(m[1]);
  const node = A1.parseMath(m[2]);
  if (!node) return null;
  const vars = [...S.variables(node)];
  if (vars.length !== 1) return null;
  const v = vars[0];
  const steps = [{ label: isExpand ? 'Expand:' : 'Factorise:', katex: S.tex(node) }];
  if (isExpand) {
    const e = S.simplify(S.expand(S.simplify(node)));
    const poly = S.toPoly(e, v);
    const tex = poly ? P.toTex(P.trim(poly), v) : S.tex(e);
    const sn = S.simplify(node);
    try {
      const fs = sn.t === 'prod' ? sn.factors : null;
      if (fs && fs.length === 2 && fs.every(f => f.t === 'sum')) {
        const pieces = [];
        fs[0].terms.forEach(a => fs[1].terms.forEach(b => pieces.push(`\\left(${S.tex(a)}\\right)\\left(${S.tex(b)}\\right)`)));
        const prods = [];
        fs[0].terms.forEach(a => fs[1].terms.forEach(b => prods.push(S.simplify(S.prod(a, b)))));
        steps.push({ label: 'Multiply every term in the first bracket by every term in the second (FOIL: first, outer, inner, last):', katex: `= ${pieces.join(' + ')}` });
        steps.push({ label: 'Work out each product:', katex: `= ${S.tex(S.sum(...prods))}` });
        steps.push({ label: 'Collect like terms:', katex: `= ${tex}` });
      } else if (sn.t === 'pow' && sn.base.t === 'sum' && sn.base.terms.length === 2 && sn.exp.t === 'num' && sn.exp.v.isInteger() && sn.exp.v.n >= 2n && sn.exp.v.n <= 8n) {
        const n = Number(sn.exp.v.n), [a, b] = sn.base.terms;
        const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
        steps.push({ label: `Binomial theorem: $(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^{k}$ with $a = ${S.tex(a)}$, $b = ${S.tex(b)}$, $n = ${n}$. The coefficients $\\binom{${n}}{k}$ (row ${n} of Pascal's triangle) are:`, katex: Array.from({ length: n + 1 }, (_, k) => C(n, k)).join(',\\ ') });
        steps.push({ label: 'Write out each term:', katex: '= ' + Array.from({ length: n + 1 }, (_, k) => `${C(n, k)}\\left(${S.tex(a)}\\right)^{${n - k}}\\left(${S.tex(b)}\\right)^{${k}}`).join(' + ') });
        steps.push({ label: 'Simplify each term and collect like terms:', katex: `= ${tex}` });
      } else steps.push({ label: 'Multiply out every bracket (distributive law: a(b + c) = ab + ac) and collect like terms:', katex: `= ${tex}` });
    } catch (e) { steps.push({ label: 'Multiply out every bracket and collect like terms:', katex: `= ${tex}` }); }
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${tex}}` });
    return { answer: tex, steps };
  }
  const poly = S.toPoly(S.simplify(S.expand(S.simplify(node))), v);
  if (!poly) return null;
  const p = P.trim(poly);
  const deg = P.degree(p);
  if (deg < 1) return null;
  const expanded = P.toTex(p, v);
  if (expanded !== S.tex(node)) steps.push({ label: 'In standard form:', katex: expanded });
  // explain the method
  if (deg === 2) {
    const a = p[2], b = p[1], c = p[0];
    if (b.isZero() && c.isNegative() && a.mul(c.neg()).n > 0n) {
      steps.push({ label: 'This is a difference of two squares, $a^2 - b^2 = (a - b)(a + b)$:', katex: '' });
    } else {
      steps.push({ label: `Find two numbers that multiply to $ac = ${qt(a.mul(c))}$ and add to $b = ${qt(b)}$ (or use the roots of the quadratic):`, katex: '' });
    }
  } else {
    steps.push({ label: 'Take out any common factor, then use the factor theorem: if $p(r) = 0$ then $(' + v + ' - r)$ is a factor (try divisors of the constant term ÷ divisors of the leading coefficient).', katex: '' });
  }
  const f = P.factor(p);
  const ft = P.factoredTex(f, v);
  if (ft === expanded) {
    steps.push({ label: 'It has no rational roots, so it does not factorise over the rational numbers.', katex: '' });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${expanded}} \\text{ (irreducible over } \\mathbb{Q})` });
    return { answer: `${expanded}\\ \\text{(does not factorise over } \\mathbb{Q})`, steps };
  }
  steps.push({ label: 'Factorised form:', katex: `${expanded} = ${ft}` });
  steps.push({ label: 'Check: multiplying the factors out gives back the original expression.', katex: '' });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ft}}` });
  return { answer: ft, steps };
}

// ---------------------------------------------------------------- linear systems
function parseLinearSystem(raw) {
  let s = plain(raw).replace(/\\\\/g, ',').replace(/\bcases\b/g, ' ').replace(/begin|end/g, ' ');
  s = s.replace(/^.*?(?:equations?|system|rule|inverse|method|elimination|substitution)\s*(?:of\s+equations)?\s*[:,]?\s*/i, (mm) => (/[=]/.test(mm) ? mm : ''));
  const pieces = s.split(/\s*(?:,|;|\band\b|\n)\s*/).map(t => t.trim()).filter(t => t.includes('='));
  if (pieces.length < 2 || pieces.length > 3) return null;
  const eqs = [];
  const varSet = new Set();
  for (let pc of pieces) {
    pc = pc.replace(/^[^=]*?\b(?:solve|find|where|if|that)\b\s*/i, '');
    const parts = pc.split('=');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return null;
    const node = A1.parseMath(`(${parts[0]})-(${parts[1]})`);
    if (!node) return null;
    const vs = [...S.variables(node)];
    if (!vs.length || vs.some(v => !/^[a-z]$/.test(v))) return null;
    vs.forEach(v => varSet.add(v));
    eqs.push({ node, text: `${S.tex(A1.parseMath(parts[0]) || node)} = ${S.tex(A1.parseMath(parts[1]) || node)}` });
  }
  const order = ['x', 'y', 'z', 'a', 'b', 'c', 'p', 'q', 'r', 'u', 'v', 'w'];
  const vars = [...varSet].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (vars.length !== eqs.length) return null;
  // coefficients (must be linear)
  const A = [], bvec = [];
  for (const e of eqs) {
    const zero = Object.fromEntries(vars.map(v => [v, 0]));
    const c0 = S.evaluate(e.node, zero);
    const row = vars.map(v => S.evaluate(e.node, { ...zero, [v]: 1 }) - c0);
    // linearity check at a random point
    const pt = Object.fromEntries(vars.map((v, i) => [v, 1.3 + i * 0.7]));
    const lin = c0 + row.reduce((acc, c, i) => acc + c * pt[vars[i]], 0);
    if (Math.abs(lin - S.evaluate(e.node, pt)) > 1e-8) return null;
    const rq = row.map(c => toFrac(c)), bq = toFrac(-c0);
    if (rq.some(q => !q) || !bq) return null;
    A.push(rq); bvec.push(bq);
  }
  return { vars, A, b: bvec, eqs };
}

const matTex = (M) => `\\begin{pmatrix} ${M.map(r => r.map(qt).join(' & ')).join(' \\\\ ')} \\end{pmatrix}`;
const detTex = (M) => `\\begin{vmatrix} ${M.map(r => r.map(qt).join(' & ')).join(' \\\\ ')} \\end{vmatrix}`;
const colTex = (v) => `\\begin{pmatrix} ${v.map(qt).join(' \\\\ ')} \\end{pmatrix}`;

function inverseOf(M) {
  const n = M.length;
  const d = LA.det(M);
  if (d.isZero()) return null;
  // adjugate via cofactors
  const minor = (i, j) => M.filter((_, r) => r !== i).map(row => row.filter((_, c) => c !== j));
  const C = M.map((row, i) => row.map((_, j) => { const m = n === 2 ? [[minor(i, j)[0][0]]] : minor(i, j); const md = n === 2 ? Q.from(m[0][0]) : LA.det(m); return (i + j) % 2 ? md.neg() : md; }));
  const adj = C[0].map((_, j) => C.map(row => row[j]));
  return { d, C, adj, inv: adj.map(row => row.map(v => v.div(d))) };
}

const cq1 = (c) => (c.equals(new Q(1n)) ? '' : c.equals(new Q(-1n)) ? '-' : qt(c));
function solveLinearSystemQuestion(raw) {
  const k = A1.keyText(raw);
  const sys = parseLinearSystem(raw);
  if (!sys) return null;
  const { vars, A, b, eqs } = sys;
  const n = vars.length;
  const steps = [{ label: 'System of equations:', katex: `\\begin{cases} ${eqs.map(e => e.text).join(' \\\\ ')} \\end{cases}` }];
  const D = LA.det(A);
  const method = /cramer/.test(k) ? 'cramer' : /inverse|matrixmethod|usingmatrix|matrices/.test(k) ? 'inverse' : 'elimination';
  steps.push({ label: 'In matrix form $AX = B$:', katex: `${matTex(A)}${colTex(vars.map(v => ({ toTex: () => v })))} = ${colTex(b)}`.replace(/\[object Object\]/g, '') });
  if (D.isZero()) {
    // consistent?
    const aug = A.map((row, i) => [...row, b[i]]);
    const { pivots } = LA.rref(aug);
    const none = pivots.includes(n);
    steps.push({ label: `The determinant of the coefficient matrix is 0, so there is no unique solution: the system has ${none ? 'no solution (the equations are inconsistent)' : 'infinitely many solutions (the equations are dependent)'}.`, katex: `\\det A = ${detTex(A)} = 0` });
    const ans = none ? R`\text{No solution (inconsistent system)}` : R`\text{Infinitely many solutions}`;
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
    return { answer: ans, steps };
  }
  const sol = LA.solve(A, b);
  if (!sol) return null;
  if (method === 'cramer') {
    steps.push({ label: "Cramer's rule: $x_i = \\dfrac{D_i}{D}$, where $D_i$ is $D$ with column $i$ replaced by the constants.", katex: `D = ${detTex(A)} = ${qt(D)}` });
    vars.forEach((v, i) => {
      const Ai = A.map((row, r) => row.map((c, j) => (j === i ? b[r] : c)));
      const Di = LA.det(Ai);
      steps.push({ label: `For ${v}:`, katex: `D_{${v}} = ${detTex(Ai)} = ${qt(Di)}, \\qquad ${v} = \\frac{D_{${v}}}{D} = \\frac{${qt(Di)}}{${qt(D)}} = ${qt(Di.div(D))}` });
    });
  } else if (method === 'inverse') {
    const inv = inverseOf(A);
    steps.push({ label: 'Step 1: the determinant is not zero, so $A$ is invertible:', katex: `\\det A = ${qt(D)}` });
    steps.push({ label: 'Step 2: $A^{-1} = \\dfrac{1}{\\det A}\\operatorname{adj}(A)$:', katex: `A^{-1} = \\frac{1}{${qt(D)}}${matTex(inv.adj)} = ${matTex(inv.inv)}` });
    steps.push({ label: 'Step 3: multiply: $X = A^{-1}B$:', katex: `${colTex(vars.map(v => ({ toTex: () => v })))} = ${matTex(inv.inv)}${colTex(b)} = ${colTex(sol)}` });
  } else if (n === 2) {
    // elimination with steps
    const [[a1, b1], [a2, b2]] = A, [c1, c2] = b;
    const [v1, v2] = vars;
    if (!b1.isZero() && !b2.isZero()) {
      let m1 = b2.isNegative() ? b2.neg() : b2, m2 = b1.isNegative() ? b1.neg() : b1;
      if (m1.d === 1n && m2.d === 1n) { let x = m1.n, y = m2.n; while (y) [x, y] = [y, x % y]; if (x > 1n) { m1 = new Q(m1.n / x); m2 = new Q(m2.n / x); } }
      const same = b1.isNegative() === b2.isNegative();
      const e1 = [a1.mul(m1), b1.mul(m1), c1.mul(m1)], e2 = [a2.mul(m2), b2.mul(m2), c2.mul(m2)];
      const cf = (q, v) => (q.equals(new Q(1n)) ? v : q.equals(new Q(-1n)) ? `-${v}` : `${qt(q)}${v}`);
      const line = (e) => `${e[0].isZero() ? '' : cf(e[0], v1) + ' '}${e[1].isNegative() ? '-' : e[0].isZero() ? '' : '+'} ${cf(e[1].isNegative() ? e[1].neg() : e[1], v2)} = ${qt(e[2])}`;
      const ra = same ? e1[0].sub(e2[0]) : e1[0].add(e2[0]), rc = same ? e1[2].sub(e2[2]) : e1[2].add(e2[2]);
      const scaled = !m1.equals(new Q(1n)) || !m2.equals(new Q(1n));
      steps.push({ label: scaled ? `Step 1 (elimination): multiply equation 1 by ${qt(m1)} and equation 2 by ${qt(m2)} so the ${v2}-terms have the same size:` : `Step 1 (elimination): the ${v2}-terms already have the same size:`, katex: `\\begin{aligned} ${line(e1)} \\\\ ${line(e2)} \\end{aligned}` });
      steps.push({ label: `${same ? 'Subtract' : 'Add'} the two equations to eliminate ${v2}:`, katex: `${cf(ra, v1)} = ${qt(rc)}` });
    }
    steps.push({ label: `So ${v1} is`, katex: `${v1} = ${qt(sol[0])}` });
    const useEq = !b1.isZero() ? 0 : 1;
    const [ae, be, ce] = useEq === 0 ? [a1, b1, c1] : [a2, b2, c2];
    steps.push({ label: `Step 2 (substitution): put ${v1} = ${qt(sol[0])} into equation ${useEq + 1}:`, katex: `${cq1(ae)}(${qt(sol[0])}) + ${cq1(be)}${v2} = ${qt(ce)} \\;\\Rightarrow\\; ${v2} = ${qt(sol[1])}`.replace(/\+ -/g, '- ') });
  } else {
    // Gaussian elimination on the augmented matrix
    const aug = A.map((row, i) => [...row, b[i]]);
    steps.push({ label: 'Step 1: write the augmented matrix and row-reduce (Gaussian elimination):', katex: `\\left(\\begin{array}{${'c'.repeat(n)}|c} ${aug.map(r => r.map(qt).join(' & ')).join(' \\\\ ')} \\end{array}\\right)` });
    const { rref } = LA.rref(aug);
    steps.push({ label: 'Reduced row-echelon form:', katex: `\\left(\\begin{array}{${'c'.repeat(n)}|c} ${rref.map(r => r.map(qt).join(' & ')).join(' \\\\ ')} \\end{array}\\right)` });
  }
  // check
  steps.push({ label: 'Check: substitute back into every equation.', katex: A.map((row, i) => `${row.map((c, j) => `${cq1(c)}(${qt(sol[j])})`).join(' + ')} = ${qt(b[i])}`.replace(/\+ -/g, '- ')).join(' \\\\ ') });
  const ans = vars.map((v, i) => `${v} = ${qt(sol[i])}`).join(',\\ ');
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ans}}` });
  return { answer: ans, steps };
}

// ---------------------------------------------------------------- matrices
function solveMatrixQuestion(raw) {
  const k = A1.keyText(raw);
  const M = parseMatrix(raw);
  if (!M) return null;
  const isDet = /det|determinant|vmatrix/.test(k) || /\\begin\{vmatrix\}/.test(raw);
  const isInv = /inverse|\^\{?-1\}?|invert/.test(k);
  const isT = /transpose|\^\{?t\}?(?![a-z])/.test(k) && !isInv;
  if (!isDet && !isInv && !isT) return null;
  if (/eigen|characteristic/.test(k)) return null;
  const n = M.length;
  const steps = [{ label: 'Matrix:', katex: `A = ${matTex(M)}` }];
  const D = LA.det(M);
  const detSteps = () => {
    if (n === 2) steps.push({ label: 'For a 2×2 matrix, $\\det A = ad - bc$:', katex: `\\det A = (${qt(M[0][0])})(${qt(M[1][1])}) - (${qt(M[0][1])})(${qt(M[1][0])}) = ${qt(D)}` });
    else {
      const minor = (j) => M.slice(1).map(row => row.filter((_, c) => c !== j));
      const terms = M[0].map((a, j) => `${j % 2 ? '-' : (j ? '+' : '')} ${qt(a)}${detTex(minor(j))}`).join(' ');
      const vals = M[0].map((a, j) => `${j % 2 ? '-' : (j ? '+' : '')} (${qt(a)})(${qt(LA.det(minor(j)))})`).join(' ');
      steps.push({ label: 'Expand along the first row (cofactor expansion):', katex: `\\det A = ${terms}` });
      steps.push({ label: 'Work out the 2×2 minors:', katex: `= ${vals} = ${qt(D)}` });
    }
  };
  if (isT) {
    const T = M[0].map((_, j) => M.map(row => row[j]));
    steps.push({ label: 'Swap rows and columns: row $i$ of $A$ becomes column $i$ of $A^T$:', katex: `A^T = ${matTex(T)}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{A^T = ${matTex(T)}}` });
    return { answer: `A^T = ${matTex(T)}`, steps };
  }
  if (isDet && !isInv) {
    detSteps();
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\det A = ${qt(D)}}` });
    return { answer: `\\det A = ${qt(D)}`, steps };
  }
  detSteps();
  if (D.isZero()) {
    steps.push({ label: 'The determinant is 0, so the matrix is singular and has no inverse.', katex: '' });
    steps.push({ label: 'Final Answer:', katex: R`\mathbf{A^{-1} \text{ does not exist (singular matrix)}}` });
    return { answer: R`A^{-1}\ \text{does not exist}`, steps };
  }
  const inv = inverseOf(M);
  if (n === 2) {
    steps.push({ label: 'For a 2×2 matrix, swap the diagonal entries, change the signs of the others, and divide by the determinant:', katex: `A^{-1} = \\frac{1}{${qt(D)}}${matTex(inv.adj)}` });
  } else {
    steps.push({ label: 'Matrix of cofactors $C_{ij} = (-1)^{i+j} M_{ij}$:', katex: `C = ${matTex(inv.C)}` });
    steps.push({ label: 'The adjugate is the transpose of the cofactor matrix, and $A^{-1} = \\frac{1}{\\det A}\\operatorname{adj}A$:', katex: `A^{-1} = \\frac{1}{${qt(D)}}${matTex(inv.adj)}` });
  }
  steps.push({ label: 'So', katex: `A^{-1} = ${matTex(inv.inv)}` });
  steps.push({ label: 'Check: $AA^{-1} = I$.', katex: '' });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{A^{-1} = ${matTex(inv.inv)}}` });
  return { answer: `A^{-1} = ${matTex(inv.inv)}`, steps };
}

// ---------------------------------------------------------------- word problems
const UNIT = {
  dist: [[/\b(km|kilomet(?:er|re)s?)\b/, 'km', 1], [/\b(m|met(?:er|re)s?)\b/, 'm', 1], [/\b(miles?|mi)\b/, 'miles', 1]],
  time: [[/\b(h|hrs?|hours?)\b/, 'h', 1], [/\b(min|mins|minutes?)\b/, 'min', 1 / 60], [/\b(s|secs?|seconds?)\b/, 's', 1 / 3600]]
};
function solveWordProblem(raw) {
  const s = lower(raw).replace(/,(?=\d{3}\b)/g, '');
  const steps = [];
  // ---- profit and loss
  const cp = s.match(/(?:buys?|bought|costs?(?:\s+price)?(?:\s+of)?|purchased?|c\.?p\.?)\s*(?:an?\s+\w+\s+|it\s+)?(?:for|at|is|=|of)?\s*(?:rs\.?|\$|£|€|pkr|inr)?\s*(\d+(?:\.\d+)?)/);
  const sp = s.match(/(?:sells?|sold|selling\s+price(?:\s+of)?|s\.?p\.?)\s*(?:it\s+|an?\s+\w+\s+)?(?:for|at|is|=|of)?\s*(?:rs\.?|\$|£|€|pkr|inr)?\s*(\d+(?:\.\d+)?)/);
  if (cp && sp && /profit|loss|gain/.test(s)) {
    const C = Number(cp[1]), Sv = Number(sp[1]);
    if (!C) return null;
    const diff = Sv - C, pct = Math.abs(diff) / C * 100;
    const word = diff >= 0 ? 'profit' : 'loss';
    steps.push({ label: 'Given:', katex: `\\text{Cost price (CP)} = ${fmt(C)}, \\quad \\text{Selling price (SP)} = ${fmt(Sv)}` });
    steps.push({ label: `Step 1: SP ${diff >= 0 ? '>' : '<'} CP, so there is a ${word}:`, katex: `\\text{${word === 'profit' ? 'Profit' : 'Loss'}} = ${diff >= 0 ? '\\text{SP} - \\text{CP}' : '\\text{CP} - \\text{SP}'} = ${fmt(Math.abs(diff))}` });
    steps.push({ label: `Step 2: ${word} percentage is always worked out on the cost price:`, katex: `\\text{${word === 'profit' ? 'Profit' : 'Loss'}}\\,\\% = \\frac{${fmt(Math.abs(diff))}}{${fmt(C)}} \\times 100 = ${fmt(pct)}\\%` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\text{${word === 'profit' ? 'Profit' : 'Loss'}} = ${fmt(Math.abs(diff))},\\ ${fmt(pct)}\\%}` });
    return { answer: `\\text{${word === 'profit' ? 'Profit' : 'Loss'}} = ${fmt(Math.abs(diff))}\\ (${fmt(pct)}\\%)`, steps };
  }
  // ---- profit or loss given as a percentage
  const pctPL = s.match(/(profit|gain|loss)\s+of\s+(\d+(?:\.\d+)?)\s*(?:%|percent)/);
  if (pctPL) {
    const r = Number(pctPL[2]), isLoss = pctPL[1] === 'loss', f = 1 + (isLoss ? -r : r) / 100;
    const word = isLoss ? 'Loss' : 'Profit';
    const sign = isLoss ? '-' : '+';
    if (cp && !(sp && /find\s+(?:the\s+)?cost|cost\s+price\s*\?/.test(s))) {
      const C = Number(cp[1]), Sv = C * f;
      steps.push({ label: 'Given:', katex: `\\text{Cost price (CP)} = ${fmt(C)}, \\quad \\text{${word}} = ${fmt(r)}\\%` });
      steps.push({ label: `Step 1: ${word.toLowerCase()} percentages are worked out on the cost price, so`, katex: `\\text{SP} = \\text{CP} \\times \\frac{100 ${sign} ${fmt(r)}}{100}` });
      steps.push({ label: 'Step 2: substitute:', katex: `\\text{SP} = ${fmt(C)} \\times \\frac{${fmt(100 + (isLoss ? -r : r))}}{100} = ${fmt(Sv)}` });
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\text{Selling price} = ${fmt(Sv)}}` });
      return { answer: `\\text{SP} = ${fmt(Sv)}`, steps };
    }
    if (sp && f > 0) {
      const Sv = Number(sp[1]), C = Sv / f;
      steps.push({ label: 'Given:', katex: `\\text{Selling price (SP)} = ${fmt(Sv)}, \\quad \\text{${word}} = ${fmt(r)}\\%` });
      steps.push({ label: `Step 1: the ${word.toLowerCase()} is a percentage of the cost price, so SP is ${fmt(100 + (isLoss ? -r : r))}% of CP:`, katex: `\\text{SP} = \\text{CP} \\times \\frac{${fmt(100 + (isLoss ? -r : r))}}{100}` });
      steps.push({ label: 'Step 2: rearrange for CP:', katex: `\\text{CP} = \\frac{${fmt(Sv)} \\times 100}{${fmt(100 + (isLoss ? -r : r))}} = ${fmt(C)}` });
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\text{Cost price} = ${fmt(C)}}` });
      return { answer: `\\text{CP} = ${fmt(C)}`, steps };
    }
  }
  // ---- simple interest
  if (/simple interest/.test(s)) {
    const pm = s.match(/(?:principal|sum|amount|deposit(?:s|ed)?|invest(?:s|ed)?|borrow(?:s|ed)?|of|on)\s*(?:of\s*)?(?:rs\.?|\$|£|€)?\s*(\d+(?:\.\d+)?)/);
    const rm = s.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/);
    const tm = s.match(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/);
    if (pm && rm && tm) {
      const Pv = Number(pm[1]), r = Number(rm[1]), t = Number(tm[1]);
      const I = Pv * r * t / 100;
      steps.push({ label: 'Simple interest formula:', katex: R`I = \frac{P \times R \times T}{100}` });
      steps.push({ label: 'Substitute:', katex: `I = \\frac{${fmt(Pv)} \\times ${fmt(r)} \\times ${fmt(t)}}{100} = ${fmt(I)}` });
      steps.push({ label: 'Total amount:', katex: `A = P + I = ${fmt(Pv)} + ${fmt(I)} = ${fmt(Pv + I)}` });
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{I = ${fmt(I)},\\ A = ${fmt(Pv + I)}}` });
      return { answer: `I = ${fmt(I)},\\ A = ${fmt(Pv + I)}`, steps };
    }
  }
  // ---- speed, distance, time
  const speedM = s.match(/(\d+(?:\.\d+)?)\s*(km\/h|kmph|km per hour|kilomet(?:er|re)s? per hour|m\/s|metres? per second|meters? per second|mph|miles per hour)/);
  const distM = s.match(/(\d+(?:\.\d+)?)\s*(km|kilomet(?:er|re)s?|miles?|mi|m|met(?:er|re)s?)\b(?!\s*\/|\s*per)/);
  const timeM = s.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?|seconds?|secs?)\b/);
  const askSpeed = /speed|how fast|velocity|rate/.test(s) && !speedM;
  const askTime = /how long|time (?:taken|will|does|is|needed)|how many (?:hours|minutes)|find the time|take to/.test(s) && !timeM;
  const askDist = /how far|distance|how many (?:km|kilomet|miles|metres|meters)/.test(s) && !(distM && !speedM && timeM && false);
  if ((speedM || distM || timeM) && (askSpeed || askTime || askDist)) {
    const speedUnit = speedM ? (/m\/s|second/.test(speedM[2]) ? 'm/s' : /mph|miles/.test(speedM[2]) ? 'mph' : 'km/h') : null;
    const tUnit = timeM ? (/^min/.test(timeM[2]) ? 'min' : /^s/.test(timeM[2]) ? 's' : 'h') : null;
    const dUnit = distM ? (/^mi/.test(distM[2]) ? 'miles' : /^k/.test(distM[2]) ? 'km' : 'm') : null;
    const toHours = (v, u) => (u === 'min' ? v / 60 : u === 's' ? v / 3600 : v);
    steps.push({ label: 'Speed, distance and time are linked by', katex: R`\text{speed} = \frac{\text{distance}}{\text{time}}, \qquad \text{distance} = \text{speed} \times \text{time}, \qquad \text{time} = \frac{\text{distance}}{\text{speed}}` });
    if (askSpeed && distM && timeM) {
      const d = Number(distM[1]); let t = Number(timeM[1]);
      const u = dUnit === 'm' && tUnit === 's' ? 'm/s' : dUnit === 'miles' ? 'mph' : 'km/h';
      let tt = t;
      if (u !== 'm/s' && tUnit !== 'h') { tt = toHours(t, tUnit); steps.push({ label: `Convert the time to hours: ${fmt(t)} ${tUnit} = ${fmt(tt)} h.`, katex: '' }); }
      const dd = dUnit === 'm' && u === 'km/h' ? d / 1000 : d;
      const v = dd / tt;
      steps.push({ label: 'Speed = distance ÷ time:', katex: `\\text{speed} = \\frac{${fmt(dd)}}{${fmt(tt)}} = ${fmt(v)}\\ \\text{${u}}` });
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{${fmt(v)}\\ \\text{${u}}}` });
      return { answer: `${fmt(v)}\\ \\text{${u}}`, steps };
    }
    if (askTime && distM && speedM) {
      const d = Number(distM[1]), v = Number(speedM[1]);
      const t = d / v;
      const unit = speedUnit === 'm/s' ? 's' : 'h';
      steps.push({ label: 'Time = distance ÷ speed:', katex: `\\text{time} = \\frac{${fmt(d)}}{${fmt(v)}} = ${fmt(t)}\\ \\text{${unit === 'h' ? 'hours' : 'seconds'}}` });
      let extra = '';
      if (unit === 'h' && t % 1) { const hh = Math.floor(t), mm = Math.round((t - hh) * 60); extra = ` = ${hh}\\text{ h } ${mm}\\text{ min}`; steps.push({ label: 'In hours and minutes:', katex: `${fmt(t)}\\text{ h}${extra}` }); }
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{${fmt(t)}\\ \\text{${unit === 'h' ? 'hours' : 'seconds'}}${extra}}` });
      return { answer: `${fmt(t)}\\ \\text{${unit === 'h' ? 'hours' : 'seconds'}}`, steps };
    }
    if (askDist && speedM && timeM) {
      const v = Number(speedM[1]); let t = Number(timeM[1]);
      if (speedUnit !== 'm/s' && tUnit !== 'h') { const th = toHours(t, tUnit); steps.push({ label: `Convert the time to hours: ${fmt(t)} ${tUnit} = ${fmt(th)} h.`, katex: '' }); t = th; }
      const d = v * t;
      const unit = speedUnit === 'm/s' ? 'm' : speedUnit === 'mph' ? 'miles' : 'km';
      steps.push({ label: 'Distance = speed × time:', katex: `\\text{distance} = ${fmt(v)} \\times ${fmt(t)} = ${fmt(d)}\\ \\text{${unit}}` });
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{${fmt(d)}\\ \\text{${unit}}}` });
      return { answer: `${fmt(d)}\\ \\text{${unit}}`, steps };
    }
  }
  return null;
}

// ---------------------------------------------------------------- trigonometry
// polynomials in s = sin x, c = cos x: Map "i,j" -> Q
const MP = {
  c: (q) => new Map(q.isZero() ? [] : [['0,0', q]]),
  s: () => new Map([['1,0', qn(1)]]),
  co: () => new Map([['0,1', qn(1)]]),
  add(a, b) { const r = new Map(a); for (const [k, v] of b) { const w = (r.get(k) || qn(0)).add(v); if (w.isZero()) r.delete(k); else r.set(k, w); } return r; },
  neg(a) { return new Map([...a].map(([k, v]) => [k, v.neg()])); },
  mul(a, b) { let r = new Map(); for (const [k1, v1] of a) for (const [k2, v2] of b) { const [i1, j1] = k1.split(',').map(Number), [i2, j2] = k2.split(',').map(Number); r = MP.add(r, new Map([[`${i1 + i2},${j1 + j2}`, v1.mul(v2)]])); } return r; },
  pow(a, n) { let r = MP.c(qn(1)); for (let i = 0; i < n; i++) r = MP.mul(r, a); return r; },
  // reduce with c^2 = 1 - s^2 (unique normal form: powers of c are 0 or 1)
  reduce(a) {
    let r = new Map();
    for (const [k, v] of a) {
      const [i, j] = k.split(',').map(Number);
      const half = Math.floor(j / 2);
      // c^j = c^(j mod 2) (1 - s^2)^half
      let term = new Map([[`${i},${j % 2}`, v]]);
      const oneMinus = new Map([['0,0', qn(1)], ['2,0', qn(-1)]]);
      for (let h = 0; h < half; h++) term = MP.mul(term, oneMinus);
      r = MP.add(r, term);
    }
    return r;
  },
  isZero(a) { return a.size === 0; },
  tex(a) {
    if (!a.size) return '0';
    const keys = [...a.keys()].sort((x, y) => { const [i1, j1] = x.split(',').map(Number), [i2, j2] = y.split(',').map(Number); return (i2 + j2) - (i1 + j1) || i2 - i1; });
    let out = '';
    for (const k of keys) {
      const v = a.get(k), [i, j] = k.split(',').map(Number);
      const mono = `${i ? `\\sin${i > 1 ? `^{${i}}` : ''} x` : ''}${i && j ? '\\,' : ''}${j ? `\\cos${j > 1 ? `^{${j}}` : ''} x` : ''}`;
      const neg = v.isNegative(), av = neg ? v.neg() : v;
      const coef = mono && av.equals(qn(1)) ? '' : qt(av);
      out += (out ? (neg ? ' - ' : ' + ') : (neg ? '-' : '')) + coef + mono;
    }
    return out;
  }
};
// AST -> rational function N/D in s, c (null if not supported)
function toSC(n, v) {
  switch (n.t) {
    case 'num': return { N: MP.c(n.v), D: MP.c(qn(1)) };
    case 'var': return null;
    case 'sum': {
      let acc = { N: MP.c(qn(0)), D: MP.c(qn(1)) };
      for (const t of n.terms) { const r = toSC(t, v); if (!r) return null; acc = { N: MP.add(MP.mul(acc.N, r.D), MP.mul(r.N, acc.D)), D: MP.mul(acc.D, r.D) }; }
      return acc;
    }
    case 'prod': {
      let acc = { N: MP.c(qn(1)), D: MP.c(qn(1)) };
      for (const f of n.factors) { const r = toSC(f, v); if (!r) return null; acc = { N: MP.mul(acc.N, r.N), D: MP.mul(acc.D, r.D) }; }
      return acc;
    }
    case 'pow': {
      if (n.exp.t !== 'num' || n.exp.v.d !== 1n) return null;
      const e = Number(n.exp.v.n);
      if (Math.abs(e) > 8) return null;
      const b = toSC(n.base, v); if (!b) return null;
      return e >= 0 ? { N: MP.pow(b.N, e), D: MP.pow(b.D, e) } : { N: MP.pow(b.D, -e), D: MP.pow(b.N, -e) };
    }
    case 'fn': {
      const a = S.simplify(n.arg);
      let k = null;
      if (a.t === 'var' && a.n === v) k = 1;
      else if (a.t === 'prod' && a.factors.length === 2 && a.factors[0].t === 'num' && a.factors[1].t === 'var' && a.factors[1].n === v) k = Number(a.factors[0].v.n) / Number(a.factors[0].v.d);
      if (k !== 1 && k !== 2 && k !== 3) return null;
      const s1 = MP.s(), c1 = MP.co();
      let sin, cos;
      if (k === 1) { sin = s1; cos = c1; }
      else if (k === 2) { sin = MP.mul(MP.c(qn(2)), MP.mul(s1, c1)); cos = MP.add(MP.mul(c1, c1), MP.neg(MP.mul(s1, s1))); }
      else { sin = MP.add(MP.mul(MP.c(qn(3)), s1), MP.mul(MP.c(qn(-4)), MP.pow(s1, 3))); cos = MP.add(MP.mul(MP.c(qn(4)), MP.pow(c1, 3)), MP.mul(MP.c(qn(-3)), c1)); }
      const one = MP.c(qn(1));
      switch (n.f) {
        case 'sin': return { N: sin, D: one };
        case 'cos': return { N: cos, D: one };
        case 'tan': return { N: sin, D: cos };
        case 'cot': return { N: cos, D: sin };
        case 'sec': return { N: one, D: cos };
        case 'csc': case 'cosec': return { N: one, D: sin };
        default: return null;
      }
    }
    default: return null;
  }
}
const scTex = (r) => { const N = MP.tex(MP.reduce(r.N)), D = MP.tex(MP.reduce(r.D)); return D === '1' ? N : `\\frac{${N}}{${D}}`; };

function prepTrig(str) {
  return String(str)
    .replace(/\\(?:operatorname\{)?(cosec|csc|sec|cot|tan|sin|cos)\}?/g, '\\$1')
    .replace(/\b(cosec|csc|sec|cot|tan|sin|cos)\b/g, '\\$1').replace(/\\\\+/g, '\\')
    .replace(/\\cosec/g, '\\csc')
    .replace(/θ|\\theta|\\alpha|α|A(?![a-z])/g, 'x')
    .replace(/°/g, '');
}

function solveTrigIdentity(raw) {
  const k = A1.keyText(raw);
  if (!/prove|show|verify|identity/.test(k)) return null;
  let body = String(raw).replace(/\\text\{[^}]*\}/g, ' ').replace(/^.*?(?:prove|show|verify)\s*(?:that)?\s*:?/i, '').replace(/\s*(?:is an identity|identity)\.?\s*$/i, '');
  body = prepTrig(body).replace(/[−–]/g, '-');
  if (!/\\(sin|cos|tan|cot|sec|csc)/.test(body)) return null;
  const parts = body.split('=');
  if (parts.length !== 2) return null;
  const L = A1.parseMath(parts[0].trim()), Rn = A1.parseMath(parts[1].trim());
  if (!L || !Rn) return null;
  const vars = new Set([...S.variables(L), ...S.variables(Rn)]);
  if ([...vars].some(v => v !== 'x')) return null;
  // numeric check first
  let holds = true;
  for (const x of [0.3, 0.71, 1.13, 2.2, -0.9]) {
    const a = S.evaluate(L, { x }), b = S.evaluate(Rn, { x });
    if (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 1e-9 * Math.max(1, Math.abs(a))) { holds = false; break; }
  }
  const steps = [{ label: 'Identity to prove:', katex: `${S.tex(L)} = ${S.tex(Rn)}` }];
  if (!holds) {
    const x = 0.5, a = S.evaluate(L, { x }), b = S.evaluate(Rn, { x });
    steps.push({ label: `This is not an identity: at x = 0.5 the left side is ${fmt(a)} but the right side is ${fmt(b)}.`, katex: `${fmt(a)} \\ne ${fmt(b)}` });
    steps.push({ label: 'Final Answer:', katex: R`\mathbf{\text{Not an identity (false for some } x)}` });
    return { answer: R`\text{Not an identity}`, steps };
  }
  const l = toSC(S.simplify(L), 'x'), r = toSC(S.simplify(Rn), 'x');
  if (!l || !r) return null;
  steps.push({ label: 'Step 1: write everything in terms of $\\sin x$ and $\\cos x$ (using $\\tan x = \\frac{\\sin x}{\\cos x}$, $\\sec x = \\frac{1}{\\cos x}$, $\\csc x = \\frac{1}{\\sin x}$, $\\cot x = \\frac{\\cos x}{\\sin x}$, $\\sin 2x = 2\\sin x\\cos x$, $\\cos 2x = \\cos^2 x - \\sin^2 x$):', katex: R`\text{LHS} = ` + scTex(l) + R`, \qquad \text{RHS} = ` + scTex(r) });
  // LHS - RHS = (Nl Dr - Nr Dl) / (Dl Dr)
  const num = MP.add(MP.mul(l.N, r.D), MP.neg(MP.mul(r.N, l.D)));
  const numTexRaw = MP.tex(num);
  steps.push({ label: 'Step 2: subtract over a common denominator. The identity holds exactly when the numerator is 0:', katex: R`\text{LHS} - \text{RHS} = \frac{(` + MP.tex(l.N) + ')(' + MP.tex(r.D) + ') - (' + MP.tex(r.N) + ')(' + MP.tex(l.D) + `)}{(${MP.tex(l.D)})(${MP.tex(r.D)})}` });
  steps.push({ label: 'Step 3: expand the numerator:', katex: `${numTexRaw}` });
  const red = MP.reduce(num);
  steps.push({ label: 'Step 4: use the Pythagorean identity $\\cos^2 x = 1 - \\sin^2 x$ to replace every even power of $\\cos x$. Everything cancels:', katex: `= ${MP.tex(red)}` });
  if (!MP.isZero(red)) return null;
  steps.push({ label: 'So LHS − RHS = 0 wherever both sides are defined, which proves the identity. ∎', katex: `${S.tex(L)} = ${S.tex(Rn)}` });
  steps.push({ label: 'Final Answer:', katex: R`\mathbf{\text{Identity proved}}` });
  return { answer: R`\text{Proved: } ` + `${S.tex(L)} = ${S.tex(Rn)}`, steps };
}

// exact angle for sin/cos/tan values
const SPECIAL = [
  [0, '0'], [Math.PI / 6, '\\frac{\\pi}{6}'], [Math.PI / 4, '\\frac{\\pi}{4}'], [Math.PI / 3, '\\frac{\\pi}{3}'], [Math.PI / 2, '\\frac{\\pi}{2}'],
  [2 * Math.PI / 3, '\\frac{2\\pi}{3}'], [3 * Math.PI / 4, '\\frac{3\\pi}{4}'], [5 * Math.PI / 6, '\\frac{5\\pi}{6}'], [Math.PI, '\\pi'],
  [7 * Math.PI / 6, '\\frac{7\\pi}{6}'], [5 * Math.PI / 4, '\\frac{5\\pi}{4}'], [4 * Math.PI / 3, '\\frac{4\\pi}{3}'], [3 * Math.PI / 2, '\\frac{3\\pi}{2}'],
  [5 * Math.PI / 3, '\\frac{5\\pi}{3}'], [7 * Math.PI / 4, '\\frac{7\\pi}{4}'], [11 * Math.PI / 6, '\\frac{11\\pi}{6}'], [2 * Math.PI, '2\\pi']
];
function angleTex(a, deg) {
  if (deg) { const d = a * 180 / Math.PI; return Math.abs(d - Math.round(d)) < 1e-7 ? `${Math.round(d)}^\\circ` : `${fmt(d)}^\\circ`; }
  for (const [v, t] of SPECIAL) if (Math.abs(v - a) < 1e-9) return t;
  for (let m = -4; m <= 4; m++) for (const [v, t] of SPECIAL) if (Math.abs(v + 2 * Math.PI * m - a) < 1e-9) return null;
  return fmt(a);
}

function solveTrigEquation(raw) {
  const s0 = String(raw).replace(/\\text\{([^}]*)\}/g, ' $1 ').replace(/[−–]/g, '-');
  const s = prepTrig(s0);
  if (!/\\(sin|cos|tan)/.test(s) || !/=/.test(s)) return null;
  if (/prove|show|verify|identity|\\int|∫|lim|d\/dx|\\frac\{d\}/i.test(s0)) return null;
  // domain
  const deg = /°|\\circ|360|180\s*(?:°|\\circ|deg)/.test(s0) && !/\\pi|π/.test(s0);
  let lo = 0, hi = 2 * Math.PI, hiIncl = true, loIncl = true, domTex = R`0 \le x \le 2\pi`;
  const dm = !/\\le|≤|<=|</.test(s0) ? null : s0.match(/(?<![\d.π])(-?\s*[\d.]*\s*(?:\\pi|π)?|\d+)\s*(\\le|\\leq|≤|<=|<)\s*(?:x|θ|\\theta)\s*(\\le|\\leq|≤|<=|<)\s*([\d.]*\s*(?:\\pi|π)?|\d+)\s*(?:°|\^\\circ|\^\{\\circ\})?/);
  const val = (t) => { t = t.replace(/\s+/g, ''); if (!t) return null; const m = t.match(/^(-?[\d.]*)(\\pi|π)?$/); if (!m) return null; const c = m[1] === '' || m[1] === '-' ? (m[1] === '-' ? -1 : 1) : Number(m[1]); return m[2] ? c * Math.PI : (deg ? c * Math.PI / 180 : c); };
  if (dm) {
    const a = val(dm[1]), b = val(dm[4]);
    if (a !== null && b !== null && b > a) { lo = a; hi = b; loIncl = !/^</.test(dm[2]) || /le|≤|<=/.test(dm[2]); hiIncl = /le|≤|<=/.test(dm[3]); domTex = `${dm[1].trim() || '0'} ${loIncl ? '\\le' : '<'} x ${hiIncl ? '\\le' : '<'} ${dm[4].trim()}${deg ? '^\\circ' : ''}`; }
  }
  // the equation itself
  // the piece (between commas / semicolons) that holds the trig equation; a split keeps this linear on long input
  const cut = s.replace(/(?:for|where|in|on|over|with)\s+[^=]*?(?:\\le|≤|<).*$/i, '').replace(/,\s*(?:-?[\d.]*\s*(?:\\pi|π)?)\s*(?:\\le|≤|<).*$/, '');
  const piece = cut.split(/[,;:]/).find(t => /=/.test(t) && /\\(?:sin|cos|tan)/.test(t.split('=')[0] + t.split('=')[1]));
  const em = piece && piece.split('=').length === 2 && piece.split('=')[1].trim() ? [null, piece] : null;
  if (!em) return null;
  const eq = em[1].replace(/^\s*(?:solve|find|x)\s*/i, '').trim();
  const [lhsS, rhsS] = eq.split('=');
  const node = A1.parseMath(`(${lhsS})-(${rhsS})`);
  if (!node) return null;
  if ([...S.variables(node)].some(v => v !== 'x')) return null;
  // which function, which multiple of x?
  const fns = new Set(), args = new Set();
  (function walk(n) { if (!n || typeof n !== 'object') return; if (n.t === 'fn') { fns.add(n.f); args.add(S.tex(S.simplify(n.arg))); } ['terms', 'factors'].forEach(key => (n[key] || []).forEach(walk)); if (n.base) walk(n.base); if (n.exp) walk(n.exp); if (n.arg && n.t !== 'fn') walk(n.arg); })(S.simplify(node));
  if (fns.size !== 1 || args.size !== 1) return null;
  const f = [...fns][0];
  if (!['sin', 'cos', 'tan'].includes(f)) return null;
  const argTex = [...args][0];
  const km = argTex === 'x' ? 1 : (argTex.match(/^(\d+)x$/) || [])[1];
  if (!km) return null;
  const kk = Number(km);
  // polynomial in t = f(kx)
  const sub = S.simplify(S.substitute(S.simplify(node), 'x', S.vr('x'))); // keep
  const tNode = (function rep(n) {
    if (!n || typeof n !== 'object') return n;
    if (n.t === 'fn') return S.vr('t');
    if (n.t === 'sum') return S.sum(...n.terms.map(rep));
    if (n.t === 'prod') return S.prod(...n.factors.map(rep));
    if (n.t === 'pow') return S.pow(rep(n.base), rep(n.exp));
    return n;
  })(sub);
  const poly = S.toPoly(S.simplify(S.expand(S.simplify(tNode))), 't');
  if (!poly) return null;
  const p = P.trim(poly);
  const dg = P.degree(p);
  if (dg < 1 || dg > 3) return null;
  const fT = `\\${f}${kk === 1 ? ' x' : `(${kk}x)`}`;
  const steps = [{ label: 'Equation and interval:', katex: `${S.tex(A1.parseMath(lhsS) || node)} = ${S.tex(A1.parseMath(rhsS) || node)}, \\qquad ${domTex}` }];
  steps.push({ label: `Step 1: let $t = ${fT}$. The equation becomes a polynomial equation in $t$:`, katex: `${P.toTex(p, 't')} = 0` });
  // roots of p
  let roots = [];
  const fac = P.factor(p);
  fac.factors.forEach(fa => { const pl = fa.poly || fa; if (P.degree(pl) === 1) roots.push({ v: pl[0].neg().div(pl[1]).toNumber(), tex: qt(pl[0].neg().div(pl[1])) }); });
  if (dg === 2 && !roots.length) {
    const qr = P.quadraticRoots(p[2], p[1], p[0]);
    if (qr.kind === 'irrational') { const a = p[2].toNumber(), b = p[1].toNumber(), c = p[0].toNumber(); const d = Math.sqrt(b * b - 4 * a * c); roots = [{ v: (-b + d) / (2 * a), tex: qr.roots[0] }, { v: (-b - d) / (2 * a), tex: qr.roots[1] }]; }
  }
  if (!roots.length && dg > 1) return null;
  steps.push({ label: 'Step 2: solve for $t$:', katex: `${P.factoredTex(fac, 't')} = 0 \\;\\Rightarrow\\; t = ${roots.map(r => r.tex).join(', \\ ')}` });
  // angles
  const sols = [];
  const lines = [];
  for (const r of roots) {
    if (f !== 'tan' && Math.abs(r.v) > 1 + 1e-12) { lines.push(`${fT} = ${r.tex}: \\text{ no solution, since } |${'\\' + f}| \\le 1`); continue; }
    const base = f === 'sin' ? Math.asin(Math.max(-1, Math.min(1, r.v))) : f === 'cos' ? Math.acos(Math.max(-1, Math.min(1, r.v))) : Math.atan(r.v);
    const cand = [];
    for (let m = -6; m <= 6 + 2 * kk; m++) {
      const period = f === 'tan' ? Math.PI : 2 * Math.PI;
      const gen = f === 'sin' ? [base + m * period, Math.PI - base + m * period] : f === 'cos' ? [base + m * period, -base + m * period] : [base + m * period];
      for (const u of gen) {
        const x = u / kk;
        if ((x > lo || (loIncl && Math.abs(x - lo) < 1e-12)) && (x < hi || (hiIncl && Math.abs(x - hi) < 1e-12)) && x >= lo - 1e-12 && x <= hi + 1e-12) cand.push(x);
      }
    }
    const uniq = [...new Set(cand.map(x => Math.round(x * 1e10) / 1e10))].sort((a, b) => a - b);
    lines.push(`${fT} = ${r.tex} \\;\\Rightarrow\\; x = ${uniq.map(x => angleTex(x, deg) || fmt(x)).join(', \\ ') || '\\text{none in the interval}'}`);
    sols.push(...uniq);
  }
  const all = [...new Set(sols.map(x => Math.round(x * 1e10) / 1e10))].sort((a, b) => a - b);
  steps.push({ label: `Step 3: find every angle in the interval${kk > 1 ? ` (solve for ${kk}x first, over ${kk} times the interval, then divide by ${kk})` : ''}. ${f === 'sin' ? 'Sine is positive in quadrants I and II: $x$ and $\\pi - x$.' : f === 'cos' ? 'Cosine is positive in quadrants I and IV: $x$ and $2\\pi - x$.' : 'Tangent repeats every $\\pi$.'}`, katex: `\\begin{aligned} ${lines.map(l => '&' + l).join(' \\\\ ')} \\end{aligned}` });
  const ansTex = all.length ? `x = ${all.map(x => angleTex(x, deg) || fmt(x)).join(',\\ ')}` : R`\text{no solutions in the interval}`;
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${ansTex}}` });
  return { answer: ansTex, steps };
}

// ---------------------------------------------------------------- counting & probability
const fact = (n) => { let r = 1n; for (let i = 2n; i <= BigInt(n); i++) r *= i; return r; };
const nPr = (n, r) => fact(n) / fact(n - r);
const nCr = (n, r) => fact(n) / (fact(r) * fact(n - r));
const WORDNUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const words2num = (s) => s.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, (m) => WORDNUM[m]);

function solveCountingQuestion(raw) {
  const s0 = plain(raw);
  const s = words2num(s0.toLowerCase());
  const steps = [];
  let m;
  // nCr / nPr notation
  if ((m = s0.match(/\^?\(?(\d+)\)?\s*([CP])\s*_?\(?(\d+)\)?/)) || (m = s.match(/\b(\d+)\s*(c|p)\s*(\d+)\b/)) || (m = s0.match(/\\binom\{?(\d+)\}?\{?(\d+)\}?/))) {
    let n, r, type;
    if (m.length === 3) { n = Number(m[1]); r = Number(m[2]); type = 'C'; } else { n = Number(m[1]); r = Number(m[3]); type = m[2].toUpperCase(); }
    if (r > n || n > 170) return null;
    if (type === 'C') {
      steps.push({ label: 'Combinations (order does not matter):', katex: `{}^{${n}}C_{${r}} = \\binom{${n}}{${r}} = \\frac{${n}!}{${r}!\\,(${n}-${r})!}` });
      steps.push({ label: 'Cancel and multiply:', katex: `= \\frac{${Array.from({ length: r }, (_, i) => n - i).join(' \\times ') || '1'}}{${r}!} = ${nCr(n, r)}` });
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{${nCr(n, r)}}` });
      return { answer: String(nCr(n, r)), steps };
    }
    steps.push({ label: 'Permutations (order matters):', katex: `{}^{${n}}P_{${r}} = \\frac{${n}!}{(${n}-${r})!}` });
    steps.push({ label: 'Multiply the first r factors of n!:', katex: `= ${Array.from({ length: r }, (_, i) => n - i).join(' \\times ') || '1'} = ${nPr(n, r)}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${nPr(n, r)}}` });
    return { answer: String(nPr(n, r)), steps };
  }
  const k = s;
  if (!/how many|number of ways|in how many|ways|arrange|probability|chance|p\(/.test(k)) return null;
  // letters of a word
  if ((m = s0.match(/letters\s+(?:of|in)\s+(?:the\s+)?(?:word\s+)?["“']?([A-Za-z]{2,14})["”']?/i))) {
    const w = m[1].toUpperCase();
    const counts = {};
    for (const ch of w) counts[ch] = (counts[ch] || 0) + 1;
    const reps = Object.entries(counts).filter(([, c]) => c > 1);
    let total = fact(w.length);
    reps.forEach(([, c]) => { total /= fact(c); });
    steps.push({ label: `The word ${w} has ${w.length} letters${reps.length ? ', with repeats: ' + reps.map(([ch, c]) => `${ch} × ${c}`).join(', ') : ', all different'}.`, katex: '' });
    steps.push({ label: reps.length ? 'Arrangements of n objects with repeated groups: divide n! by the factorial of each repeat count:' : 'All letters are different, so the number of arrangements is n!:', katex: reps.length ? `\\frac{${w.length}!}{${reps.map(([, c]) => `${c}!`).join('\\,')}} = ${total}` : `${w.length}! = ${total}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${total}}` });
    return { answer: String(total), steps };
  }
  // conditional probability P(A|B)
  const pv = (name) => { const mm = s0.match(new RegExp(`P\\s*\\(\\s*${name}\\s*\\)\\s*=\\s*(\\d*\\.?\\d+(?:\\s*\\/\\s*\\d+)?)`)); return mm ? A1.parseMath(mm[1]) && S.evaluate(A1.parseMath(mm[1])) : null; };
  const pAB = (() => { const mm = s0.match(/P\s*\(\s*A\s*(?:∩|\\cap|and|n)\s*B\s*\)\s*=\s*(\d*\.?\d+(?:\s*\/\s*\d+)?)/i); return mm ? S.evaluate(A1.parseMath(mm[1])) : null; })();
  if (/P\s*\(\s*A\s*(?:\||\\mid|\\vert)\s*B\s*\)|P\s*\(\s*B\s*(?:\||\\mid|\\vert)\s*A\s*\)/.test(s0) && pAB !== null) {
    const givenB = /P\s*\(\s*A\s*(?:\||\\mid|\\vert)\s*B/.test(s0);
    const den = givenB ? pv('B') : pv('A');
    if (!den) return null;
    const r = pAB / den;
    steps.push({ label: 'Conditional probability:', katex: givenB ? R`P(A \mid B) = \frac{P(A \cap B)}{P(B)}` : R`P(B \mid A) = \frac{P(A \cap B)}{P(A)}` });
    steps.push({ label: 'Substitute:', katex: `= \\frac{${fmt(pAB)}}{${fmt(den)}} = ${fmt(r)}` });
    if (givenB && pv('A') !== null) steps.push({ label: Math.abs(r - pv('A')) < 1e-12 ? 'Since $P(A \\mid B) = P(A)$, the events A and B are independent.' : 'Since $P(A \\mid B) \\ne P(A)$, the events A and B are not independent.', katex: '' });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${givenB ? 'P(A \\mid B)' : 'P(B \\mid A)'} = ${fmt(r)}}` });
    return { answer: `${givenB ? 'P(A \\mid B)' : 'P(B \\mid A)'} = ${fmt(r)}`, steps };
  }
  if (/p\s*\(\s*a\s*(∪|\\cup|or)\s*b\s*\)/i.test(s0) && pAB !== null && pv('A') !== null && pv('B') !== null) {
    const r = pv('A') + pv('B') - pAB;
    steps.push({ label: 'Addition rule:', katex: R`P(A \cup B) = P(A) + P(B) - P(A \cap B)` });
    steps.push({ label: 'Substitute:', katex: `= ${fmt(pv('A'))} + ${fmt(pv('B'))} - ${fmt(pAB)} = ${fmt(r)}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{P(A \\cup B) = ${fmt(r)}}` });
    return { answer: `P(A \\cup B) = ${fmt(r)}`, steps };
  }
  // two dice
  if (/(two|2|pair of) dice/.test(s) && /sum|total/.test(s)) {
    const target = s.match(/(?:sum|total)\s*(?:of\s*the\s*numbers\s*)?(?:is|equals|=|of)?\s*(?:(at least|at most|greater than|less than|more than)\s*)?(\d+)/);
    if (target) {
      const t = Number(target[2]), rel = target[1] || 'eq';
      const ok = (v) => rel === 'eq' ? v === t : /least/.test(rel) ? v >= t : /most/.test(rel) ? v <= t : /greater|more/.test(rel) ? v > t : v < t;
      const outs = [];
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (ok(a + b)) outs.push(`(${a},${b})`);
      const pr = new Q(BigInt(outs.length), 36n);
      steps.push({ label: 'Two dice give $6 \\times 6 = 36$ equally likely outcomes.', katex: '' });
      steps.push({ label: `Favourable outcomes (${outs.length}):`, katex: outs.length ? outs.join(',\\ ') : '\\varnothing' });
      steps.push({ label: 'Probability = favourable ÷ total:', katex: `P = \\frac{${outs.length}}{36} = ${qt(pr)}` });
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{${qt(pr)}}` });
      return { answer: qt(pr), steps };
    }
  }
  // balls in a bag
  if ((m = s.match(/(\d+)\s+(\w+)\s+(?:balls?|marbles?|counters?|beads?)?\s*and\s+(\d+)\s+(\w+)\s+(?:balls?|marbles?|counters?|beads?)/)) && /drawn|picked|chosen|selected|taken/.test(s)) {
    const a = Number(m[1]), colA = m[2], b = Number(m[3]), colB = m[4];
    const nDraw = Number((s.match(/(\d+)\s+(?:balls?\s+|marbles?\s+)?(?:are|is)?\s*(?:drawn|picked|chosen|selected|taken)/) || [])[1] || 2);
    const withRep = /with replacement/.test(s) && !/without replacement/.test(s);
    const wantBoth = s.match(new RegExp(`(?:both|all)\\s+(?:are\\s+|being\\s+)?(${colA}|${colB})`));
    if (!wantBoth || nDraw !== 2) return null;
    const col = wantBoth[1], good = col === colA ? a : b, tot = a + b;
    let pr, line;
    if (withRep) { pr = new Q(BigInt(good * good), BigInt(tot * tot)); line = `\\frac{${good}}{${tot}} \\times \\frac{${good}}{${tot}}`; }
    else { pr = new Q(BigInt(good * (good - 1)), BigInt(tot * (tot - 1))); line = `\\frac{${good}}{${tot}} \\times \\frac{${good - 1}}{${tot - 1}}`; }
    steps.push({ label: `There are ${tot} balls: ${a} ${colA} and ${b} ${colB}. Two are drawn ${withRep ? 'with' : 'without'} replacement.`, katex: '' });
    steps.push({ label: withRep ? 'The draws are independent, so multiply:' : 'After the first ball is taken there is one fewer in the bag, so multiply the conditional probabilities:', katex: `P(\\text{both ${col}}) = ${line} = ${qt(pr)}` });
    if (!withRep) steps.push({ label: 'Same result with combinations:', katex: `\\frac{\\binom{${good}}{2}}{\\binom{${tot}}{2}} = \\frac{${nCr(good, 2)}}{${nCr(tot, 2)}} = ${qt(pr)}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${qt(pr)}}` });
    return { answer: qt(pr), steps };
  }
  // committees / selections: "choose/chosen/selected r from n"
  if ((m = s.match(/(?:committee|team|group|selection|hand)\s+of\s+(\d+)\s+(?:\w+\s+){0,3}?(?:be\s+)?(?:chosen|selected|formed|picked|made)\s+from\s+(?:a\s+group\s+of\s+)?(\d+)/)) ||
      (m = s.match(/(?:choose|select|pick)\s+(\d+)\s+(?:\w+\s+){0,2}?from\s+(?:a\s+group\s+of\s+)?(\d+)/))) {
    const r = Number(m[1]), n = Number(m[2]);
    if (r > n || n > 170) return null;
    steps.push({ label: `Choosing ${r} from ${n} where order does not matter is a combination:`, katex: `\\binom{${n}}{${r}} = \\frac{${n}!}{${r}!\\,${n - r}!} = \\frac{${Array.from({ length: r }, (_, i) => n - i).join(' \\times ')}}{${Array.from({ length: r }, (_, i) => r - i).join(' \\times ')}} = ${nCr(n, r)}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${nCr(n, r)}}` });
    return { answer: String(nCr(n, r)), steps };
  }
  // arrangements in a row / circle
  if ((m = s.match(/(\d+)\s+(?:different\s+|distinct\s+)?(?:people|persons|students|books|boys|girls|children|objects|items|letters|cars|flags|friends)\s+(?:\w+\s+){0,3}?(?:be\s+)?(?:arranged|seated|sit|placed|lined up|stand|ordered)/))) {
    const n = Number(m[1]);
    if (n > 170) return null;
    const rm = s.match(/(\d+)\s+(?:of\s+them|at a time)/);
    if (/circle|round table|circular/.test(s)) {
      steps.push({ label: 'In a circle, rotations of the same seating are identical, so fix one person and arrange the rest:', katex: `(${n} - 1)! = ${n - 1}! = ${fact(n - 1)}` });
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{${fact(n - 1)}}` });
      return { answer: String(fact(n - 1)), steps };
    }
    if (rm && Number(rm[1]) < n) {
      const r = Number(rm[1]);
      steps.push({ label: `Arranging ${r} out of ${n} (order matters) is a permutation:`, katex: `{}^{${n}}P_{${r}} = ${Array.from({ length: r }, (_, i) => n - i).join(' \\times ')} = ${nPr(n, r)}` });
      steps.push({ label: 'Final Answer:', katex: `\\mathbf{${nPr(n, r)}}` });
      return { answer: String(nPr(n, r)), steps };
    }
    steps.push({ label: `The first place can be filled in ${n} ways, the next in ${n - 1}, and so on (multiplication principle):`, katex: `${n}! = ${Array.from({ length: n }, (_, i) => n - i).join(' \\times ')} = ${fact(n)}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${fact(n)}}` });
    return { answer: String(fact(n)), steps };
  }
  return null;
}

module.exports = { solvePercentRatioWords, solveFactorCommand, solveLinearSystemQuestion, solveMatrixQuestion, solveWordProblem, solveTrigIdentity, solveTrigEquation, solveCountingQuestion, toSC, MP };
