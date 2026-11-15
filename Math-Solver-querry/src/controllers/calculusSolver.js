// Calculus Engine: Differentiation & Integration with Formal Formulas & Steps
const math = require('mathjs');
const { Q } = require('../math/rational');

// Removes one pair of brackets only if they wrap the WHOLE expression: (x+1) -> x+1, but not (x+1)(x+2)
function stripWrapping(str) {
  str = str.trim();
  const pairs = { '(': ')', '[': ']', '{': '}' };
  if (!pairs[str[0]] || str[str.length - 1] !== pairs[str[0]]) return str;
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if ('([{'.includes(str[i])) depth++;
    else if (')]}'.includes(str[i])) depth--;
    if (depth === 0 && i < str.length - 1) return str;
  }
  return str.slice(1, -1).trim();
}

function solveCalculus(inputStr) {
  const raw = inputStr.trim();

  // Differentiation: d/dx(x^3 + 5x^2 - 7), \frac{d}{dx}(...), dy/dx ..., diff(...), derivative of ...
  const diffMatch = raw.match(/^(?:d\/dx|\\frac\{d\}\{dx\}|dy\/dx|diff|derivative)\s*(?:of\s+)?(.+)$/i);
  if (diffMatch) {
    const body = stripWrapping(diffMatch[1]);
    if (body) return solveDifferentiation(body);
  }

  // Integration: \int (x^2 + 3x) dx, int(x^2), integrate x^3
  const intMatch = raw.match(/^(?:\\int|integrate|int)\b\s*(?:of\s+)?(.+?)\s*(?:\\,)?\s*(?:d[xt])?$/i);
  if (intMatch) {
    const body = stripWrapping(intMatch[1]);
    if (body) return solveIntegration(body);
  }

  return null;
}

function solveDifferentiation(exprStr) {
  let cleanExpr = exprStr.replace(/\s*dx$/i, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').trim();
  let steps = [];

  steps.push({
    label: "Given function to differentiate:",
    katex: `f(x) = ${cleanExpr}`
  });

  steps.push({
    label: "Step 1: Differentiation rules:",
    katex: '\\begin{aligned} &\\frac{d}{dx}[x^n] = n x^{n-1} \\\\ &\\frac{d}{dx}[c \\cdot u] = c \\frac{du}{dx} \\\\ &\\frac{d}{dx}[u \\pm v] = \\frac{du}{dx} \\pm \\frac{dv}{dx} \\end{aligned}'
  });

  try {
    const parsed = math.parse(cleanExpr);
    const derivative = math.derivative(parsed, 'x');
    const simplified = math.simplify(derivative);

    const ansLatex = simplified.toTex();

    steps.push({
      label: "Step 2: Differentiate term by term and simplify:",
      katex: `f'(x) = ${ansLatex}`
    });

    steps.push({
      label: "Final Result:",
      katex: `\\mathbf{\\frac{df}{dx} = ${ansLatex}}`
    });

    return { answer: `f'(x) = ${ansLatex}`, steps };
  } catch (err) {
    return null;
  }
}

// Parses one term like "3x^2", "-x", "5", "2/x", "4x^-3", "x^(1/2)" into { coeff: Q, power: Q }
function parseTerm(t) {
  let str = t.replace(/\s+/g, '').replace(/\*/g, '');
  if (!str) return null;
  let sign = 1n;
  while (str.startsWith('+') || str.startsWith('-')) { if (str[0] === '-') sign = -sign; str = str.slice(1); }

  // c/x or c/x^n
  let m = str.match(/^(\d*\.?\d*)\/x(?:\^\(?(-?\d+(?:\/\d+)?)\)?)?$/);
  if (m) {
    const c = Q.parse(m[1] || '1');
    const p = m[2] ? Q.parse(m[2]) : new Q(1n);
    if (!c || !p) return null;
    return { coeff: c.mul(new Q(sign)), power: p.neg() };
  }
  // c x^n   (c may be a fraction like 3/4)
  m = str.match(/^(\d*\.?\d*(?:\/\d+)?)(x)?(?:\^\(?(-?\d+(?:\.\d+)?(?:\/\d+)?)\)?)?$/);
  if (!m || (!m[1] && !m[2])) return null;
  if (m[3] && !m[2]) return null; // like "2^3" — not handled here
  const c = m[1] ? Q.parse(m[1]) : new Q(1n);
  if (!c) return null;
  const p = m[2] ? (m[3] ? Q.parse(m[3]) : new Q(1n)) : new Q(0n);
  if (!p) return null;
  return { coeff: c.mul(new Q(sign)), power: p };
}

function termTex(coeff, power) {
  if (coeff.isZero()) return '0';
  const c = coeff.abs();
  const sign = coeff.isNegative() ? '-' : '';
  const xs = power.isZero() ? '' : power.equals(1) ? 'x' : `x^{${power.toTex()}}`;
  if (!xs) return sign + c.toTex();
  return sign + (c.equals(1) ? '' : c.toTex()) + xs;
}

function solveIntegration(exprStr) {
  let cleanExpr = exprStr.replace(/\s*d[xt]$/i, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').trim();
  // remove one pair of wrapping brackets
  if (/^\(.*\)$/.test(cleanExpr)) cleanExpr = cleanExpr.slice(1, -1);
  const steps = [{ label: 'Given indefinite integral:', katex: `\\int \\left(${cleanExpr}\\right) \\, dx` }];

  // Split into terms at + / - that are not inside brackets or exponents
  const terms = [];
  let depth = 0, cur = '';
  for (let i = 0; i < cleanExpr.length; i++) {
    const ch = cleanExpr[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if ((ch === '+' || ch === '-') && depth === 0 && cur.trim() !== '' && !/[\^]$/.test(cur.trim())) {
      terms.push(cur); cur = ch;
    } else cur += ch;
  }
  if (cur.trim()) terms.push(cur);

  const parsed = terms.map(parseTerm);
  if (!parsed.length || parsed.some(p => !p)) {
    steps.push({
      label: 'Not supported yet:',
      katex: '\\text{This integrator handles sums of terms like } 3x^2,\; 5,\; \\frac{2}{x},\; x^{-3}. \\text{ Functions like } \\sin x \\text{ or } e^x \\text{ are not supported yet.}'
    });
    return { answer: '\\text{This integral is not supported yet}', steps };
  }

  steps.push({
    label: 'Step 1: Integration rules used:',
    katex: '\\begin{aligned} &\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1) \\\\ &\\int x^{-1} \\, dx = \\ln|x| + C \\\\ &\\int c \\, dx = c\\,x + C \\end{aligned}'
  });

  const pieces = [];
  const lines = [];
  for (const { coeff, power } of parsed) {
    if (coeff.isZero()) continue;
    if (power.equals(-1)) {
      const res = (coeff.equals(1) ? '' : coeff.equals(-1) ? '-' : coeff.toTex()) + '\\ln|x|';
      lines.push(`\\int ${termTex(coeff, power)} \\, dx &= ${res}`);
      pieces.push(res);
    } else {
      const np = power.add(1);
      const nc = coeff.div(np);
      const res = termTex(nc, np);
      lines.push(`\\int ${termTex(coeff, power)} \\, dx &= ${res}`);
      pieces.push(res);
    }
  }
  steps.push({ label: 'Step 2: Integrate term by term:', katex: `\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}` });

  const combined = pieces.length
    ? pieces.map((p, i) => (i === 0 ? p : p.startsWith('-') ? ` - ${p.slice(1)}` : ` + ${p}`)).join('')
    : '0';
  steps.push({ label: 'Step 3: Combine the terms and add the constant of integration C:', katex: `\\mathbf{${combined} + C}` });
  return { answer: `${combined} + C`, steps };
}

module.exports = { solveCalculus };
