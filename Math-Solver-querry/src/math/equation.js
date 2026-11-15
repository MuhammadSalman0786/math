// Polynomial equations in one variable: linear, quadratic (real or complex roots)
// and higher degree when they factor over the rationals.

const P = require('./polynomial');
const { Q, formatDecimal } = require('./rational');

function normalizeEquationText(raw) {
  return String(raw || '')
    .replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/\\left|\\right/g, '')
    .replace(/\\cdot|\\times|×|·/g, '*')
    .replace(/[−–—]/g, '-')
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .trim();
}

function solveEquation(rawInput) {
  const text = normalizeEquationText(rawInput);
  const sides = text.split('=');
  if (sides.length !== 2 || !sides[0].trim() || !sides[1].trim()) return null;

  const letters = [...new Set((text.match(/[a-zA-Z]/g) || []))];
  if (letters.length !== 1) return null;
  const v = letters[0];

  const L = P.parsePolynomial(sides[0], v);
  const R = P.parsePolynomial(sides[1], v);
  if (!L || !R) return null;

  const p = P.sub(L.poly, R.poly);
  const deg = P.degree(p);
  const T = (poly) => P.toTex(poly, v);
  const steps = [{ label: 'Given equation:', katex: `${T(L.poly)} = ${T(R.poly)}` }];

  if (!(R.poly.length === 1 && R.poly[0].isZero())) {
    steps.push({ label: 'Step 1: Move every term to the left side so the right side is 0:', katex: `${T(p)} = 0` });
  }
  let n = steps.length;

  if (deg === 0) {
    if (p[0].isZero()) {
      steps.push({ label: `Step ${n}: Both sides are always equal:`, katex: '0 = 0' });
      return { answer: '\\text{All real numbers (identity)}', steps };
    }
    steps.push({ label: `Step ${n}: The variable cancels out and leaves a false statement:`, katex: `${p[0].toTex()} = 0 \\;\\; (\\text{false})` });
    return { answer: '\\text{No solution}', steps };
  }

  if (deg === 1) {
    const [c0, c1] = p;
    const rhs = c0.neg();
    steps.push({ label: `Step ${n++}: Keep the ${v}-term on the left and move the constant to the right:`, katex: `${T([new Q(0n), c1])} = ${rhs.toTex()}` });
    const x = rhs.div(c1);
    if (!c1.equals(1)) steps.push({ label: `Step ${n++}: Divide both sides by $${c1.toTex()}$:`, katex: `${v} = \\frac{${rhs.toTex()}}{${c1.toTex()}}` });
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${v} = ${x.toTex()}}` });
    return { answer: `${v} = ${x.toTex()}`, steps };
  }

  if (deg === 2) {
    const [c, b, a] = p;
    steps.push({ label: `Step ${n++}: Identify the coefficients of $a${v}^2 + b${v} + c = 0$:`, katex: `a = ${a.toTex()}, \\quad b = ${b.toTex()}, \\quad c = ${c.toTex()}` });
    const disc = b.mul(b).sub(new Q(4n).mul(a).mul(c));
    const nature = disc.isZero() ? '\\Delta = 0 \\Rightarrow \\text{one repeated real root}'
      : disc.isNegative() ? '\\Delta < 0 \\Rightarrow \\text{two complex (non-real) roots}'
        : '\\Delta > 0 \\Rightarrow \\text{two different real roots}';
    steps.push({
      label: `Step ${n++}: Calculate the discriminant $\\Delta = b^2 - 4ac$:`,
      katex: `\\Delta = \\left(${b.toTex()}\\right)^2 - 4\\left(${a.toTex()}\\right)\\left(${c.toTex()}\\right) = ${disc.toTex()}`
    });
    steps.push({ label: 'Nature of the roots:', katex: nature });

    const r = P.quadraticRoots(a, b, c);
    if (r.kind === 'rational') {
      const f = P.factor(p);
      if (f.factors.length === 2) {
        steps.push({ label: `Step ${n++}: Factor the quadratic:`, katex: `${P.factoredTex(f, v)} = 0` });
      }
    }
    steps.push({
      label: `Step ${n++}: Apply the quadratic formula $${v} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$:`,
      katex: `${v} = \\frac{-\\left(${b.toTex()}\\right) \\pm \\sqrt{${disc.toTex()}}}{2\\left(${a.toTex()}\\right)}`
    });

    let answer;
    if (r.roots.length === 1) {
      answer = `${v} = ${r.roots[0]}`;
      steps.push({ label: 'Final Answer (repeated root):', katex: `\\mathbf{${v} = ${r.roots[0]}}` });
      return { answer: `${answer} \\;\\; (\\text{repeated root})`, steps };
    }
    answer = `${v}_1 = ${r.roots[0]}, \\quad ${v}_2 = ${r.roots[1]}`;
    if (r.kind === 'irrational') {
      steps.push({ label: `Step ${n++}: Decimal approximations:`, katex: `${v}_1 \\approx ${formatDecimal(+r.approx[0].toFixed(6))}, \\quad ${v}_2 \\approx ${formatDecimal(+r.approx[1].toFixed(6))}` });
    }
    steps.push({ label: 'Final Answer:', katex: `\\mathbf{${answer}}` });
    return { answer, steps };
  }

  // Degree 3+: factor over the rationals
  const f = P.factor(p);
  steps.push({ label: `Step ${n++}: Factor using the rational root theorem:`, katex: `${P.factoredTex(f, v)} = 0` });
  steps.push({ label: `Step ${n++}: Set each factor equal to zero:`, katex: '' });

  const roots = [];
  let unsolved = false;
  for (const fac of f.factors) {
    const d = P.degree(fac);
    if (d === 1) {
      const root = fac[0].neg().div(fac[1]);
      steps.push({ label: '', katex: `${T(fac)} = 0 \\Rightarrow ${v} = ${root.toTex()}` });
      roots.push(root.toTex());
    } else if (d === 2) {
      const r = P.quadraticRoots(fac[2], fac[1], fac[0]);
      steps.push({ label: '', katex: `${T(fac)} = 0 \\Rightarrow ${v} = ${r.roots.join(',\\; ')}` });
      roots.push(...r.roots);
    } else {
      unsolved = true;
      steps.push({ label: 'This factor has no rational roots and is not solved exactly here:', katex: `${T(fac)} = 0` });
    }
  }
  const unique = [...new Set(roots)];
  if (!unique.length) return null;
  const answer = unique.map(r => `${v} = ${r}`).join(', \\; ') + (unsolved ? ' \\;\\; (\\text{plus roots of the remaining factor})' : '');
  steps.push({ label: 'Final Answer:', katex: `\\mathbf{${unique.map(r => `${v} = ${r}`).join(', \\; ')}}` });
  return { answer, steps };
}

module.exports = { solveEquation };
