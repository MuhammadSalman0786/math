// Solvers for the single-purpose calculator pages:
// LCM / GCF (HCF), percentages, quadratic equations from a, b, c, and a general
// mathematical induction prover (sum formulas and divisibility statements).

const { Q } = require('./rational');
const { solveEquation } = require('./equation');
const S = require('./symbolic');
const P = require('./polynomial');
const A1 = require('./advanced1');

const err = (msg, given) => ({
  answer: '\\text{Please check the input}',
  steps: [
    ...(given ? [{ label: 'Given input:', katex: given }] : []),
    { label: msg, katex: '' }
  ]
});

// ---------------------------------------------------------------- LCM & GCF
const MAX_NUMBERS = 10;
const MAX_VALUE = 1e12;

function parseNumberList(input) {
  const parts = String(input == null ? '' : input).split(/[\s,;]+/).filter(Boolean);
  if (parts.length < 2) return { error: 'Enter at least two whole numbers, separated by commas (for example 12, 18, 30).' };
  if (parts.length > MAX_NUMBERS) return { error: `Enter at most ${MAX_NUMBERS} numbers.` };
  const nums = [];
  for (const p of parts) {
    if (!/^\d+$/.test(p)) return { error: `"${p.slice(0, 20)}" is not a positive whole number. Use whole numbers such as 12, 18, 30.` };
    const v = Number(p);
    if (v === 0) return { error: 'Use numbers greater than 0.' };
    if (v > MAX_VALUE) return { error: 'Numbers must be at most 1,000,000,000,000.' };
    nums.push(v);
  }
  return { nums };
}

function primeFactors(n) {
  const f = new Map();
  for (let p = 2; p * p <= n; p += (p === 2 ? 1 : 2)) {
    while (n % p === 0) { f.set(p, (f.get(p) || 0) + 1); n /= p; }
  }
  if (n > 1) f.set(n, (f.get(n) || 0) + 1);
  return f;
}
const factorTex = (f) => f.size === 0 ? '1' : [...f.entries()].map(([p, e]) => e > 1 ? `${p}^{${e}}` : `${p}`).join(' \\times ');
const gcd2 = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };
const gcd2B = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };

function solveLcmGcf(input, which) {
  const isLcm = which === 'lcm';
  const name = isLcm ? 'LCM' : 'GCF';
  const { nums, error } = parseNumberList(input);
  if (error) return err(error);
  const list = nums.join(', ');
  const steps = [{ label: `Find the ${isLcm ? 'least common multiple (LCM)' : 'greatest common factor (GCF, also called HCF or GCD)'} of:`, katex: list }];

  // Method 1: prime factorisation
  const facs = nums.map(primeFactors);
  steps.push({ label: 'Step 1: Write each number as a product of prime factors:', katex: nums.map((n, i) => `${n} = ${factorTex(facs[i])}`).join(', \\quad ') });
  const primes = [...new Set(facs.flatMap(f => [...f.keys()]))].sort((a, b) => a - b);
  const pick = new Map();
  for (const p of primes) {
    const exps = facs.map(f => f.get(p) || 0);
    const e = isLcm ? Math.max(...exps) : Math.min(...exps);
    if (e > 0) pick.set(p, e);
  }
  if (isLcm) {
    steps.push({ label: 'Step 2: Take every prime that appears, with its highest power:', katex: factorTex(pick) });
  } else {
    steps.push({ label: 'Step 2: Take only the primes common to all the numbers, with their lowest power:', katex: pick.size ? factorTex(pick) : '\\text{no common prime} \\Rightarrow 1' });
  }
  let value = 1n;
  for (const [p, e] of pick) value *= BigInt(p) ** BigInt(e);
  steps.push({ label: 'Step 3: Multiply:', katex: pick.size ? `\\text{${name}}(${list}) = ${factorTex(pick)} = ${value}` : `\\text{${name}}(${list}) = 1` });

  // Method 2: Euclid's algorithm (checks the answer)
  if (nums.length >= 2) {
    const a = BigInt(nums[0]), b = BigInt(nums[1]);
    const rows = [];
    let x = a > b ? a : b, y = a > b ? b : a;
    while (y !== 0n && rows.length < 12) { rows.push(`${x} &= ${x / y} \\times ${y} + ${x % y}`); [x, y] = [y, x % y]; }
    const g = gcd2B(a, b);
    steps.push({ label: `Check with Euclid's algorithm for ${nums[0]} and ${nums[1]} (keep dividing by the remainder until it is 0):`, katex: `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}` });
    if (isLcm) {
      steps.push({ label: `For two numbers, LCM = (a × b) ÷ GCF:`, katex: `\\text{LCM}(${nums[0]}, ${nums[1]}) = \\frac{${nums[0]} \\times ${nums[1]}}{${g}} = ${(a * b) / g}` });
      if (nums.length > 2) steps.push({ label: 'For more than two numbers, repeat: LCM(a, b, c) = LCM(LCM(a, b), c).', katex: '' });
    } else {
      steps.push({ label: `The last non-zero remainder is the GCF:`, katex: `\\text{GCF}(${nums[0]}, ${nums[1]}) = ${g}` });
      if (nums.length > 2) steps.push({ label: 'For more than two numbers, repeat: GCF(a, b, c) = GCF(GCF(a, b), c).', katex: '' });
    }
  }
  if (!isLcm && value === 1n) steps.push({ label: 'The GCF is 1, so these numbers are co-prime (relatively prime).', katex: '' });
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{\\text{${name}}(${list}) = ${value}}` });
  return { answer: `\\text{${name}} = ${value}`, steps };
}

// ---------------------------------------------------------------- Percentages
const fmt = (v) => {
  if (!Number.isFinite(v)) return '\\infty';
  const r = Math.round(v * 1e6) / 1e6;
  return String(Object.is(r, -0) ? 0 : r);
};
const parseNum = (s) => {
  const t = String(s == null ? '' : s).replace(/[,%\s]/g, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) && Math.abs(v) < 1e15 ? v : null;
};

function solvePercentage(mode, xIn, yIn) {
  const x = parseNum(xIn), y = parseNum(yIn);
  if (x === null || y === null) return err('Please enter two numbers (for example 15 and 80).');
  const steps = [];
  let answer;
  if (mode === 'of') {
    const r = x / 100 * y;
    steps.push({ label: `What is ${fmt(x)}% of ${fmt(y)}?`, katex: `${fmt(x)}\\% \\times ${fmt(y)}` });
    steps.push({ label: 'Step 1: Change the percentage to a decimal by dividing by 100:', katex: `${fmt(x)}\\% = \\frac{${fmt(x)}}{100} = ${fmt(x / 100)}` });
    steps.push({ label: 'Step 2: Multiply by the number:', katex: `${fmt(x / 100)} \\times ${fmt(y)} = ${fmt(r)}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${fmt(x)}\\% \\text{ of } ${fmt(y)} = ${fmt(r)}}` });
    answer = fmt(r);
  } else if (mode === 'whatpercent') {
    if (y === 0) return err('The second number (the whole) cannot be 0.');
    const r = x / y * 100;
    steps.push({ label: `${fmt(x)} is what percent of ${fmt(y)}?`, katex: `\\frac{${fmt(x)}}{${fmt(y)}} \\times 100\\%` });
    steps.push({ label: 'Step 1: Divide the part by the whole:', katex: `\\frac{${fmt(x)}}{${fmt(y)}} = ${fmt(x / y)}` });
    steps.push({ label: 'Step 2: Multiply by 100 to get a percentage:', katex: `${fmt(x / y)} \\times 100 = ${fmt(r)}\\%` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${fmt(x)} \\text{ is } ${fmt(r)}\\% \\text{ of } ${fmt(y)}}` });
    answer = `${fmt(r)}\\%`;
  } else if (mode === 'change') {
    if (x === 0) return err('The original value cannot be 0 for a percentage change.');
    const d = y - x, r = d / Math.abs(x) * 100;
    const word = r > 0 ? 'increase' : r < 0 ? 'decrease' : 'change';
    steps.push({ label: `Percentage change from ${fmt(x)} to ${fmt(y)}:`, katex: `\\text{change} = \\frac{\\text{new} - \\text{original}}{|\\text{original}|} \\times 100\\%` });
    steps.push({ label: 'Step 1: Find the difference (new − original):', katex: `${fmt(y)} - ${x < 0 ? `(${fmt(x)})` : fmt(x)} = ${fmt(d)}` });
    steps.push({ label: 'Step 2: Divide by the original value:', katex: `\\frac{${fmt(d)}}{${fmt(Math.abs(x))}} = ${fmt(d / Math.abs(x))}` });
    steps.push({ label: 'Step 3: Multiply by 100:', katex: `${fmt(d / Math.abs(x))} \\times 100 = ${fmt(r)}\\%` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${fmt(Math.abs(r))}\\% \\text{ ${word}}}` });
    answer = `${fmt(Math.abs(r))}\\% \\text{ ${word}}`;
  } else if (mode === 'increase' || mode === 'decrease') {
    const sign = mode === 'increase' ? 1 : -1;
    const factor = 1 + sign * x / 100, r = y * factor;
    steps.push({ label: `${mode === 'increase' ? 'Increase' : 'Decrease'} ${fmt(y)} by ${fmt(x)}%:`, katex: `${fmt(y)} \\times \\left(1 ${sign > 0 ? '+' : '-'} \\frac{${fmt(x)}}{100}\\right)` });
    steps.push({ label: 'Step 1: Work out the multiplier:', katex: `1 ${sign > 0 ? '+' : '-'} ${fmt(x / 100)} = ${fmt(factor)}` });
    steps.push({ label: 'Step 2: Multiply:', katex: `${fmt(y)} \\times ${fmt(factor)} = ${fmt(r)}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${fmt(r)}}` });
    answer = fmt(r);
  } else {
    return err('Choose what you want to calculate.');
  }
  return { answer, steps };
}

// ---------------------------------------------------------------- Quadratic from a, b, c
function solveQuadraticABC(aIn, bIn, cIn) {
  const vals = [aIn, bIn, cIn].map(v => String(v == null ? '' : v).trim() === '' ? '0' : String(v).trim());
  const qs = [];
  for (const v of vals) {
    if (!/^[-+]?(\d+\.?\d*|\.\d+)(\/\d+)?$/.test(v)) return err('Coefficients a, b and c must be numbers (decimals and fractions like 3/4 are fine).');
    try { qs.push(v.includes('/') ? Q.from(v.split('/')[0]).div(Q.from(v.split('/')[1])) : Q.from(v)); } catch (e) { return err('Coefficients a, b and c must be numbers.'); }
  }
  const [a, b, c] = qs;
  const term = (q, x, first) => {
    if (q.isZero()) return '';
    const neg = q.isNegative(), abs = neg ? q.neg() : q;
    let coef = abs.equals(1) && x ? '' : (abs.d === 1n ? abs.n.toString() : `(${abs.n}/${abs.d})`);
    return `${neg ? '-' : (first ? '' : '+')}${coef}${x}`;
  };
  if (a.isZero()) {
    if (b.isZero()) return err('a and b cannot both be 0: there is no x to solve for.');
    const eq = `${term(b, 'x', true)}${term(c, '', false)}=0`;
    const r = solveEquation(eq);
    if (r) r.steps.unshift({ label: 'Since a = 0 this is a linear equation, not a quadratic:', katex: '' });
    return r || err('Could not solve this equation.');
  }
  const eq = `${term(a, 'x^2', true)}${term(b, 'x', false)}${term(c, '', false)}=0`;
  const r = solveEquation(eq);
  if (!r) return err('Could not solve this equation.');
  // Vertex and axis of symmetry
  const h = b.neg().div(a.mul(new Q(2n)));
  const k = a.mul(h).mul(h).add(b.mul(h)).add(c);
  const qt = (q) => q.d === 1n ? q.n.toString() : `${q.isNegative() ? '-' : ''}\\frac{${q.isNegative() ? -q.n : q.n}}{${q.d}}`;
  const fin = r.steps.pop();
  r.steps.push({ label: 'Extra: sum and product of the roots:', katex: `x_1 + x_2 = -\\frac{b}{a} = ${qt(b.neg().div(a))}, \\quad x_1 x_2 = \\frac{c}{a} = ${qt(c.div(a))}` });
  r.steps.push({ label: `Extra: vertex of the parabola y = ax² + bx + c (axis of symmetry x = −b/2a; it opens ${a.isNegative() ? 'downwards' : 'upwards'}):`, katex: `\\left(${qt(h)},\\ ${qt(k)}\\right)` });
  r.steps.push(fin);
  return r;
}

// ---------------------------------------------------------------- Induction
// Rewrites a^(n + c) as a^c · a^n so that sums of powers can be simplified.
function splitPowers(node) {
  if (!node || typeof node !== 'object') return node;
  switch (node.t) {
    case 'sum': return S.sum(...node.terms.map(splitPowers));
    case 'prod': return S.prod(...node.factors.map(splitPowers));
    case 'fn': return S.fn(node.f, splitPowers(node.arg));
    case 'pow': {
      const base = splitPowers(node.base), exp = S.simplify(splitPowers(node.exp));
      if (exp.t === 'sum') {
        const consts = exp.terms.filter(t => t.t === 'num');
        const rest = exp.terms.filter(t => t.t !== 'num');
        if (consts.length && rest.length) {
          return S.prod(S.pow(base, consts.length === 1 ? consts[0] : S.sum(...consts)), S.pow(base, rest.length === 1 ? rest[0] : S.sum(...rest)));
        }
      }
      return S.pow(base, exp);
    }
    default: return node;
  }
}
const norm = (node) => { try { return S.simplify(S.expand(S.simplify(splitPowers(S.simplify(node))))); } catch (e) { return S.simplify(node); } };
const sameExpr = (a, b) => { try { const d = norm(S.sub(a, b)); return d.t === 'num' && d.v.isZero(); } catch (e) { return false; } };
const evalAt = (node, v, val) => S.evaluate(node, { [v]: val });
const close = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
const tidy = (t) => t.replace(/(\d) (\d+\^)/g, '$1 \\cdot $2');
const T = (node) => tidy(S.tex(S.simplify(node)));
const qs = (q) => q.d === 1n ? q.n.toString() : `${q.n}/${q.d}`;

function cleanStatement(raw) {
  let s = String(raw || '')
    .replace(/\\text\{([^{}]*)\}|\\mathrm\{([^{}]*)\}/g, (m, a, b) => ` ${a || b} `)
    .replace(/\\(left|right)/g, '')
    .replace(/[−–—]/g, '-');
  // drop the instruction and the "for all n" part
  s = s.replace(/^.*?\b(?:prove|show|verify|use)\b[^:=]*?\b(?:that|induction)\b\s*[:,]?/i, '')
    .replace(/^\s*(?:prove|show)\s*(?:that)?\s*/i, '')
    .replace(/^\s*(?:that|the\s+statement)\s*[:,]?\s*/i, '')
    .replace(/(?:,|\s)\s*(?:\\forall|∀|for\s+(?:all|every|each))[\s\S]*$/i, '')
    .replace(/(?:,|\s)\s*(?:where|when|if)\s+n\s*(?:≥|>=|\\geq?|\\ge|>|∈|\\in)[\s\S]*$/i, '')
    .replace(/,?\s*n\s*(?:∈|\\in)\s*(?:ℕ|\\mathbb\{N\}|N|ℤ\^?\+?)\s*$/i, '')
    .replace(/[.\s]+$/, '')
    .trim();
  return s;
}

// Sum statement: "1 + 3 + 5 + ... + (2n-1) = n^2" or "\sum_{i=1}^{n} i^2 = ..."
function parseSumStatement(s) {
  // the "=" inside a sum's lower limit (\sum_{i=1}) is not the equation's "="
  const eqParts = s.replace(/(_\{?\s*[a-z]\s*)=/gi, '$1\u0000').split('=').map(x => x.replace(/\u0000/g, '='));
  if (eqParts.length !== 2) return null;
  let [lhs, rhs] = eqParts.map(x => x.trim());
  let termStr, start = 1, idx = null, listed = [];
  const sm = lhs.match(/^\\?sum_\{?\s*([a-z])\s*=\s*(\d+)\s*\}?\^\{?\s*([a-z])\s*\}?\s*(.+)$/i) ||
             lhs.match(/^(?:Σ|∑)_?\{?\s*([a-z])\s*=\s*(\d+)\s*\}?\^\{?\s*([a-z])\s*\}?\s*(.+)$/i);
  let v;
  if (sm) {
    idx = sm[1]; start = Number(sm[2]); v = sm[3]; termStr = sm[4].replace(/^\{([\s\S]*)\}$/, '$1').replace(/^\(([\s\S]*)\)$/, '$1');
  } else {
    const dots = /\\[lc]?dots|\\dotsb|\\ldots|\\cdots|\.{2,}|…|⋯/;
    if (!dots.test(lhs)) return null;
    const pieces = lhs.split(dots);
    if (pieces.length !== 2) return null;
    termStr = pieces[1].replace(/^\s*\+\s*/, '').trim();
    listed = pieces[0].split(/\+(?![^(]*\))(?![^{]*\})/).map(x => x.trim()).filter(Boolean);
    if (!termStr || !listed.length) return null;
  }
  const term0 = A1.parseMath(termStr), R = A1.parseMath(rhs);
  if (!term0 || !R) return null;
  const varsR = [...S.variables(R)], varsT = [...S.variables(term0)];
  if (sm) {
    if (varsR.some(x => x !== v)) return null;
    if (varsT.some(x => x !== idx)) return null;
  } else {
    const all = [...new Set([...varsR, ...varsT])];
    if (all.length !== 1) return null;
    v = all[0];
  }
  const term = sm ? S.substitute(term0, idx, S.vr(v)) : term0;
  // the listed first terms must agree with the general term
  if (!sm) {
    for (let i = 0; i < listed.length; i++) {
      const ln = A1.parseMath(listed[i]);
      if (!ln || S.variables(ln).size) return null;
      try { if (!close(S.evaluate(ln), evalAt(term, v, start + i))) { if (i === 0 && listed.length === 1) { start = 0; if (!close(S.evaluate(ln), evalAt(term, v, 0))) return null; } else return null; } } catch (e) { return null; }
    }
  }
  return { kind: 'sum', v, term, R, start, lhsTex: sm ? `\\sum_{${idx}=${start}}^{${v}} ${T(term0)}` : `${listed.map(x => S.tex(A1.parseMath(x))).join(' + ')} + \\dots + ${S.simplify(term).t === 'sum' ? `\\left(${T(term)}\\right)` : T(term)}` };
}

// a^(m·n) -> (a^m)^n, e.g. 3^(2n) -> 9^n, so the base of the power is a plain number
function mergePowerBases(node) {
  if (!node || typeof node !== 'object') return node;
  switch (node.t) {
    case 'sum': return S.simplify(S.sum(...node.terms.map(mergePowerBases)));
    case 'prod': return S.simplify(S.prod(...node.factors.map(mergePowerBases)));
    case 'pow': {
      const base = mergePowerBases(node.base), exp = S.simplify(node.exp);
      if (base.t === 'num' && exp.t === 'prod' && exp.factors.length === 2 && exp.factors[0].t === 'num' && exp.factors[0].v.isInteger() && !exp.factors[0].v.isNegative() && exp.factors[1].t === 'var') {
        const m = Number(exp.factors[0].v.n);
        if (m <= 6 && base.v.isInteger()) return S.pow(S.num(base.v.n ** BigInt(m)), exp.factors[1]);
      }
      return S.pow(base, exp);
    }
    default: return node;
  }
}

// Divisibility: "n^3 - n is divisible by 6", "6 divides 7^n - 1", "3 | (4^n - 1)"
function parseDivisibility(s) {
  let m = s.match(/^(.+?)\s*(?:is\s+)?(?:divisible\s+by|is\s+a\s+multiple\s+of)\s*(\d+)\s*$/i);
  let exprStr, mod;
  if (m) { exprStr = m[1]; mod = Number(m[2]); }
  else if ((m = s.match(/^(\d+)\s*(?:divides|\\mid|\||∣)\s*(.+)$/i))) { mod = Number(m[1]); exprStr = m[2]; }
  else return null;
  exprStr = exprStr.replace(/^\s*(?:that\s+)?/, '').trim();
  const f = A1.parseMath(exprStr.replace(/^\((.*)\)$/, '$1'));
  if (!f || !mod || mod < 2 || mod > 1e6) return null;
  const vars = [...S.variables(f)];
  if (vars.length !== 1) return null;
  return { kind: 'div', v: vars[0], f, mod };
}

function solveInductionGeneric(raw) {
  if (String(raw || '').length > 400) return null;
  const s = cleanStatement(raw);
  const st = parseSumStatement(s) || parseDivisibility(s);
  if (!st) return null;
  const n = st.v, k = n === 'k' ? 'm' : 'k';
  const K = S.vr(k);
  const at = (node, val) => S.simplify(S.substitute(node, n, typeof val === 'number' ? S.num(val) : val));
  const kp1 = S.sum(K, S.num(1));

  if (st.kind === 'sum') {
    const { term, R, start } = st;
    // numeric check first: is the statement actually true?
    let partial = 0;
    for (let i = start; i <= start + 14; i++) {
      let t, r;
      try { t = evalAt(term, n, i); r = evalAt(R, n, i); } catch (e) { return null; }
      if (!Number.isFinite(t) || !Number.isFinite(r)) return null;
      partial += t;
      if (!close(partial, r)) {
        return {
          answer: '\\text{The statement is false}',
          steps: [
            { label: 'Statement to prove:', katex: `${st.lhsTex} = ${T(R)}` },
            { label: `Check n = ${i}: the left side adds up to ${+partial.toPrecision(12)}, but the right side gives ${+r.toPrecision(12)}.`, katex: `${+partial.toPrecision(12)} \\neq ${+r.toPrecision(12)}` },
            { label: 'Because one value of n fails, the formula is not true for all n, so it cannot be proved by induction. Check the formula for a typing mistake.', katex: '' }
          ]
        };
      }
    }
    const steps = [];
    steps.push({ label: 'Statement P(n):', katex: `P(${n}):\\ ${st.lhsTex} = ${T(R)}` });
    const t0 = at(term, start), r0 = at(R, start);
    steps.push({ label: `Step 1 (base case): check n = ${start}. Left side = first term, right side = formula at n = ${start}:`, katex: `\\text{LHS} = ${T(t0)}, \\quad \\text{RHS} = ${T(r0)}` });
    steps.push({ label: `Both sides are equal, so P(${start}) is true.`, katex: '' });
    const Rk = at(R, K), Rk1 = at(R, kp1), Tk1 = at(term, kp1);
    steps.push({ label: `Step 2 (induction hypothesis): assume P(${k}) is true for some ${k} ≥ ${start}:`, katex: `${st.lhsTex.replace(new RegExp(`(^|[^a-z\\\\])${n}(?![a-z])`, 'g'), `$1${k}`)} = ${T(Rk)}` });
    steps.push({ label: `Step 3 (induction step): we must show P(${k}+1), i.e. that adding the next term (${k}+1 in place of ${n}) gives the formula at ${k}+1:`, katex: `\\text{target: } ${T(Rk1)}` });
    const lhs = S.sum(Rk, Tk1);
    steps.push({ label: `Add the next term to both sides of the hypothesis:`, katex: `\\text{LHS} = ${T(Rk)} + ${S.tex(S.simplify(Tk1))}` });

    let shown = false;
    const pL = S.toPoly(lhs, k), pR = S.toPoly(Rk1, k);
    if (pL && pR) {
      const f = P.factor(pL);
      const ex = P.toTex(pL, k);
      steps.push({ label: 'Expand and collect like terms:', katex: `= ${ex}` });
      const ft = (f.factors.length > 1 || !f.constant.equals(1)) ? P.factoredTex(f, k) : ex;
      if (ft !== ex) steps.push({ label: 'Factorise:', katex: `= ${ft}` });
      steps.push({ label: `The formula at ${k}+1 expands to the same polynomial:`, katex: `${T(Rk1)} = ${P.toTex(pR, k)}` });
      shown = P.equal(pL, pR);
    }
    if (!shown) {
      const cL = (() => { try { return A1.combineRational(lhs, k); } catch (e) { return null; } })();
      const rR = (() => { try { return A1.toRational(Rk1, k); } catch (e) { return null; } })();
      const rL = (() => { try { return A1.toRational(lhs, k); } catch (e) { return null; } })();
      if (cL && rL && rR && P.isZeroPoly(P.sub(P.mul(rL.N, rR.D), P.mul(rR.N, rL.D)))) {
        steps.push({ label: 'Write over a common denominator and cancel the common factor:', katex: `= ${cL}` });
        steps.push({ label: `This is the formula at ${k}+1:`, katex: `${T(Rk1)}` });
        shown = true;
      }
    }
    if (!shown && sameExpr(lhs, Rk1)) {
      steps.push({ label: 'Use a^(k+1) = a × a^k and collect like terms:', katex: `= ${tidy(S.tex(norm(lhs)))}` });
      steps.push({ label: `The formula at ${k}+1 simplifies to the same expression:`, katex: `${T(Rk1)} = ${tidy(S.tex(norm(Rk1)))}` });
      shown = true;
    }
    if (!shown) {
      // last resort: identity checked at many values of k (both sides are explicit formulas)
      let ok = true;
      for (let i = 1; i <= 30 && ok; i++) { try { ok = close(evalAt(lhs, k, i), evalAt(Rk1, k, i)); } catch (e) { ok = false; } }
      if (!ok) return null;
      steps.push({ label: 'Simplify the left side; it equals the formula at k+1:', katex: `= ${T(Rk1)}` });
    }
    steps.push({ label: `So P(${k}) ⇒ P(${k}+1).`, katex: `\\text{LHS} = ${T(Rk1)} = \\text{RHS}` });
    steps.push({ label: 'Conclusion: by the principle of mathematical induction,', katex: `\\mathbf{P(${n}) \\text{ is true for all integers } ${n} \\ge ${start}.}\\ \\blacksquare` });
    return { answer: `\\text{Proved by induction for all } ${n} \\ge ${start}`, steps };
  }

  // ---- divisibility
  const { mod } = st;
  const fShown = st.f;
  const f = mergePowerBases(S.simplify(st.f));
  const start = 1;
  const val = (node, i) => { const x = evalAt(node, n, i); return Number.isFinite(x) ? Math.round(x) : NaN; };
  for (let i = start; i <= start + 8; i++) {
    const x = val(f, i);
    if (!Number.isSafeInteger(x)) break;
    if (x % mod !== 0) {
      return {
        answer: '\\text{The statement is false}',
        steps: [
          { label: 'Statement to prove:', katex: `${mod} \\mid ${T(f)}` },
          { label: `Check n = ${i}: the value is ${x}, which is not divisible by ${mod}.`, katex: `${x} \\div ${mod} = ${+(x / mod).toPrecision(8)}` },
          { label: 'So the statement is not true for all n and cannot be proved by induction.', katex: '' }
        ]
      };
    }
  }
  const fk = at(f, K), fk1 = at(f, kp1);
  // choose c so that f(k+1) - c·f(k) has no exponential part (c = the base of the power, if any)
  const bases = [];
  (function walk(x) {
    if (!x || typeof x !== 'object') return;
    if (x.t === 'pow' && x.base.t === 'num' && S.variables(x.exp).size) bases.push(x.base.v);
    ['terms', 'factors'].forEach(key => (x[key] || []).forEach(walk));
    if (x.base) walk(x.base); if (x.exp) walk(x.exp); if (x.arg) walk(x.arg);
  })(S.simplify(f));
  const uniqBases = [...new Map(bases.map(b => [b.toString(), b])).values()];
  if (uniqBases.length > 2) return null;
  const c = uniqBases.length ? uniqBases[0] : new Q(1n);
  const g = norm(S.sub(fk1, S.prod(S.num(c), fk)));
  // g must be visibly a multiple of mod
  let reason = null;
  const gPoly = S.toPoly(g, k);
  if (gPoly) {
    const allInt = gPoly.every(q => q.d === 1n);
    if (allInt && gPoly.every(q => q.n % BigInt(mod) === 0n)) reason = `every coefficient is a multiple of ${mod}`;
    else if (allInt && mod <= 1000) {
      let ok = true;
      for (let r = 0; r < mod && ok; r++) {
        let v = 0n; for (let i = gPoly.length - 1; i >= 0; i--) v = v * BigInt(r) + gPoly[i].n;
        ok = v % BigInt(mod) === 0n;
      }
      if (ok) reason = `it has integer coefficients and is ≡ 0 (mod ${mod}) for k ≡ 0, 1, …, ${mod - 1} (mod ${mod}), so for every integer k`;
    }
  } else {
    // c'·b^k + (polynomial) with c' a multiple of mod and the polynomial a multiple of mod
    const terms = g.t === 'sum' ? g.terms : [g];
    const ok = terms.every(t => {
      const coef = t.t === 'num' ? t.v : (t.t === 'prod' && t.factors[0].t === 'num') ? t.factors[0].v : (t.t === 'pow' ? new Q(1n) : null);
      return coef && coef.d === 1n && coef.n % BigInt(mod) === 0n;
    });
    if (ok) reason = `every term has a factor ${mod}`;
  }
  if (!reason) return null;
  const gTex = gPoly ? P.toTex(gPoly, k) : tidy(S.tex(g));
  const steps = [];
  steps.push({ label: 'Statement P(n):', katex: `P(${n}):\\ ${mod} \\mid ${T(fShown)}` });
  steps.push({ label: `Let f(${n}) = ${'$'}${T(fShown)}${'$'}. We show f(${n}) is a multiple of ${mod} for every n ≥ ${start}.`, katex: '' });
  if (T(fShown) !== T(f)) steps.push({ label: 'Rewrite the powers with a single exponent n:', katex: `f(${n}) = ${T(fShown)} = ${T(f)}` });
  steps.push({ label: `Step 1 (base case): n = ${start}:`, katex: `f(${start}) = ${val(f, start)} = ${mod} \\times ${val(f, start) / mod}` });
  steps.push({ label: `So P(${start}) is true.`, katex: '' });
  steps.push({ label: `Step 2 (induction hypothesis): assume P(${k}) is true, so for some integer q:`, katex: `${T(fk)} = ${mod}q` });
  steps.push({ label: `Step 3 (induction step): look at the expression for ${k}+1:`, katex: `f(${k}+1) = ${T(fk1)}` });
  const cs = qs(c);
  const cTex = c.equals(1) ? '' : `${cs}\\,`;
  steps.push({ label: `Subtract ${c.equals(1) ? '' : cs + ' × '}f(${k}) and simplify${uniqBases.length ? ` (use ${cs}^(${k}+1) = ${cs} × ${cs}^${k})` : ''}:`, katex: `f(${k}+1) - ${cTex}f(${k}) = ${gTex}` });
  steps.push({ label: `This is divisible by ${mod}: ${reason}.`, katex: '' });
  steps.push({ label: 'So f(k+1) is a sum of multiples of ' + mod + ':', katex: `f(${k}+1) = ${cTex === '' ? '' : cs + ' \\cdot '}${mod}q + \\left(${gTex}\\right)` });
  steps.push({ label: 'Conclusion: by the principle of mathematical induction,', katex: `\\mathbf{${mod} \\mid ${T(fShown)} \\text{ for all integers } ${n} \\ge ${start}.}\\ \\blacksquare` });
  return { answer: `\\text{Proved by induction for all } ${n} \\ge ${start}`, steps };
}

module.exports = { solveLcmGcf, solvePercentage, solveQuadraticABC, solveInductionGeneric, parseNumberList, primeFactors };
