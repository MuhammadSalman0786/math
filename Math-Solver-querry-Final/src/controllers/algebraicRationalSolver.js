// Algebraic Rational Fractions Solver
// Solves:
// 1. \frac{x^3 - 8}{x^2 - 4} \div \frac{x^2 + 2x + 4}{x^2 + 5x + 6}
// 2. ( x^3 - 8)/(x^2 - 4) ÷ (x^2 + 2x + 4)/(x^2 + 5x + 6)
// 3. ((x^3 - 8)/(x^2 - 4)) / ((x^2 + 2x + 4)/(x^2 + 5x + 6))
// 4. (x^3 - 8)/(x^2 - 4) / (x^2 + 2x + 4)/(x^2 + 5x + 6)

function cleanExpr(str) {
  if (!str) return '';
  return str.trim()
    .replace(/\\left|\\right/g, '')
    .replace(/\^\{([^{}]+)\}/g, '^$1')
    .replace(/\s+/g, ' ');
}

// Depth-aware balanced bracket extractor for fractions like (x^3 - 8)/(x^2 - 4)
function parseFractionPart(strPart) {
  let s = strPart.trim();

  // Strip redundant outer wrapping parens if the entire string is wrapped: ((A)/(B)) -> (A)/(B)
  if (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0;
    let allEnclosed = true;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++;
      else if (s[i] === ')') {
        depth--;
        if (depth === 0 && i < s.length - 1) {
          allEnclosed = false;
          break;
        }
      }
    }
    if (allEnclosed) {
      s = s.substring(1, s.length - 1).trim();
    }
  }

  // Find the division slash '/' at depth 0
  let depth = 0;
  let slashIdx = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === '/' && depth === 0) {
      slashIdx = i;
      break;
    }
  }

  if (slashIdx !== -1) {
    let num = s.substring(0, slashIdx).trim();
    let den = s.substring(slashIdx + 1).trim();
    if (num.startsWith('(') && num.endsWith(')')) num = num.substring(1, num.length - 1).trim();
    if (den.startsWith('(') && den.endsWith(')')) den = den.substring(1, den.length - 1).trim();
    return { num, den };
  }

  return null;
}

function extractBalancedBraces(s, startIdx) {
  if (startIdx >= s.length || s[startIdx] !== '{') return null;
  let depth = 0;
  for (let i = startIdx; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) return { content: s.substring(startIdx + 1, i), nextIdx: i + 1 };
    }
  }
  return null;
}

function parseTwoFractions(raw) {
  let s = raw.trim().replace(/\\left/g, '').replace(/\\right/g, '').replace(/\\ /g, ' ');

  // 1. LaTeX Fractions: \frac{N1}{D1} [op] \frac{N2}{D2}
  let pos1 = s.indexOf('\\frac');
  if (pos1 !== -1) {
    let b1 = s.indexOf('{', pos1);
    let num1Data = extractBalancedBraces(s, b1);
    if (num1Data) {
      let b2 = s.indexOf('{', num1Data.nextIdx);
      let den1Data = extractBalancedBraces(s, b2);
      if (den1Data) {
        let rem = s.substring(den1Data.nextIdx).trim();
        let opMatch = rem.match(/^(\\div|÷|\/|\\times|×|\*|\\cdot|·)/);
        if (opMatch) {
          let op = opMatch[1];
          rem = rem.substring(opMatch[0].length).trim();
          let pos2 = rem.indexOf('\\frac');
          if (pos2 !== -1) {
            let b3 = rem.indexOf('{', pos2);
            let num2Data = extractBalancedBraces(rem, b3);
            if (num2Data) {
              let b4 = rem.indexOf('{', num2Data.nextIdx);
              let den2Data = extractBalancedBraces(rem, b4);
              if (den2Data) {
                return {
                  num1: cleanExpr(num1Data.content),
                  den1: cleanExpr(den1Data.content),
                  op: op,
                  num2: cleanExpr(num2Data.content),
                  den2: cleanExpr(den2Data.content)
                };
              }
            }
          }
        }
      }
    }
  }

  // 2. Bracket Notation with explicit ÷ or \div:
  // e.g. ( x^3 - 8)/(x^2 - 4) ÷ (x^2 + 2x + 4)/(x^2 + 5x + 6)
  let divMatch = s.match(/\s*(\\div|÷)\s*/);
  if (divMatch) {
    let leftStr = s.substring(0, divMatch.index).trim();
    let op = divMatch[1];
    let rightStr = s.substring(divMatch.index + divMatch[0].length).trim();
    let f1 = parseFractionPart(leftStr);
    let f2 = parseFractionPart(rightStr);
    if (f1 && f2) {
      return {
        num1: cleanExpr(f1.num),
        den1: cleanExpr(f1.den),
        op: op,
        num2: cleanExpr(f2.num),
        den2: cleanExpr(f2.den)
      };
    }
  }

  // 3. Multi-slash notation at depth 0:
  // e.g. ((a)/(b)) / ((c)/(d)) or (a)/(b) / (c)/(d)
  let depth = 0;
  let candidateSlashes = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') depth--;
    else if (s[i] === '/' && depth === 0) {
      candidateSlashes.push(i);
    }
  }

  if (candidateSlashes.length === 1 || candidateSlashes.length === 3) {
    let midIdx = candidateSlashes.length === 1 ? candidateSlashes[0] : candidateSlashes[1];
    let leftStr = s.substring(0, midIdx).trim();
    let rightStr = s.substring(midIdx + 1).trim();
    let f1 = parseFractionPart(leftStr);
    let f2 = parseFractionPart(rightStr);
    if (f1 && f2) {
      return {
        num1: cleanExpr(f1.num),
        den1: cleanExpr(f1.den),
        op: '/',
        num2: cleanExpr(f2.num),
        den2: cleanExpr(f2.den)
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Generic factor-and-cancel engine (works for any polynomials in one variable)
// ---------------------------------------------------------------------------
const P = require('../math/polynomial');
const { Q } = require('../math/rational');

function factorTex(fac, v) {
  return `(${P.toTex(fac, v)})`;
}

// Real roots of a factor, as TeX strings (used for domain restrictions)
function realRootsOf(fac) {
  const d = P.degree(fac);
  if (d === 1) return { roots: [fac[0].neg().div(fac[1]).toTex()], unsolved: false };
  if (d === 2) {
    const r = P.quadraticRoots(fac[2], fac[1], fac[0]);
    return { roots: r.kind === 'complex' ? [] : r.roots, unsolved: false };
  }
  return { roots: [], unsolved: d > 2 };
}

// "2(x + 3)(x - 1)" style product. Returns '1' when empty.
function productTex(constQ, factors, v, cancelledFlags = null) {
  const parts = [];
  if (!constQ.equals(1) || factors.length === 0) parts.push(constQ.toTex());
  factors.forEach((f, i) => {
    const t = factorTex(f, v);
    parts.push(cancelledFlags && cancelledFlags[i] ? `\\cancel{${t}}` : t);
  });
  // A lone factor doesn't need brackets
  if (parts.length === 1 && factors.length === 1 && !(cancelledFlags && cancelledFlags[0])) return P.toTex(factors[0], v);
  return parts.join('').replace(/^-1(?=\()/, '-');
}

function solveAlgebraicRational(rawInput) {
  const parsed = parseTwoFractions(rawInput);
  if (!parsed) return null;
  const { num1, den1, op, num2, den2 } = parsed;

  const letters = [...new Set((num1 + den1 + num2 + den2).match(/[a-zA-Z]/g) || [])];
  if (letters.length !== 1) return null;
  const v = letters[0];

  const polys = [num1, den1, num2, den2].map(s => P.parsePolynomial(s, v));
  if (polys.some(x => !x)) return null;
  let [pN1, pD1, pN2, pD2] = polys.map(x => x.poly);

  const isDivision = (op === '\\div' || op === '÷' || op === '/');
  const T = (p) => P.toTex(p, v);
  const steps = [{
    label: 'Given input:',
    katex: `\\frac{${T(pN1)}}{${T(pD1)}} ${isDivision ? '\\div' : '\\times'} \\frac{${T(pN2)}}{${T(pD2)}}`
  }];

  if (P.isZeroPoly(pD1) || P.isZeroPoly(pD2) || (isDivision && P.isZeroPoly(pN2))) {
    steps.push({ label: 'Error:', katex: '\\text{A denominator (or the divisor) is zero, so the expression is undefined.}' });
    return { answer: '\\text{Undefined}', steps };
  }

  let stepNo = 1;
  const multNum = isDivision ? pD2 : pN2;
  const multDen = isDivision ? pN2 : pD2;
  if (isDivision) {
    steps.push({
      label: `Step ${stepNo++}: Change division into multiplication by the reciprocal (flip the second fraction):`,
      katex: `\\frac{${T(pN1)}}{${T(pD1)}} \\times \\frac{${T(multNum)}}{${T(multDen)}}`
    });
  }

  // Factor all four polynomials
  const fA = P.factor(pN1), fB = P.factor(pD1), fC = P.factor(multNum), fD = P.factor(multDen);
  const factorLines = [[pN1, fA], [pD1, fB], [multNum, fC], [multDen, fD]]
    .filter(([p, f]) => P.degree(p) >= 1)
    .map(([p, f]) => [T(p), productTex(f.constant, f.factors, v)])
    .filter(([lhs, rhs]) => lhs !== rhs)               // skip ones that can't be factored
    .map(([lhs, rhs]) => `${lhs} = ${rhs}`);
  const uniqueLines = [...new Set(factorLines)];
  steps.push({
    label: `Step ${stepNo++}: Factor each polynomial completely:`,
    katex: uniqueLines.length ? `\\begin{aligned} ${uniqueLines.map(l => l.replace(' = ', ' &= ')).join(' \\\\ ')} \\end{aligned}` : '\\text{(nothing can be factored further)}'
  });

  const numFactors = [...fA.factors, ...fC.factors];
  const denFactors = [...fB.factors, ...fD.factors];
  const constant = fA.constant.mul(fC.constant).div(fB.constant.mul(fD.constant));

  steps.push({
    label: `Step ${stepNo++}: Write everything as one fraction:`,
    katex: `\\frac{${productTex(fA.constant.mul(fC.constant), numFactors, v)}}{${productTex(fB.constant.mul(fD.constant), denFactors, v)}}`
  });

  // Cancel matching factors
  const numCancelled = numFactors.map(() => false);
  const denCancelled = denFactors.map(() => false);
  numFactors.forEach((nf, i) => {
    const j = denFactors.findIndex((df, k) => !denCancelled[k] && P.equal(nf, df));
    if (j !== -1) { numCancelled[i] = true; denCancelled[j] = true; }
  });
  const anyCancel = numCancelled.some(Boolean);
  if (anyCancel) {
    steps.push({
      label: `Step ${stepNo++}: Cancel the common factors from the numerator and denominator:`,
      katex: `\\frac{${productTex(fA.constant.mul(fC.constant), numFactors, v, numCancelled)}}{${productTex(fB.constant.mul(fD.constant), denFactors, v, denCancelled)}}`
    });
  } else {
    steps.push({ label: `Step ${stepNo++}: There are no common factors to cancel.`, katex: '' });
  }

  const restNum = numFactors.filter((_, i) => !numCancelled[i]);
  const restDen = denFactors.filter((_, i) => !denCancelled[i]);

  // Build the simplified result
  const cNum = new Q(constant.n < 0n ? -constant.n : constant.n);
  const sign = constant.isNegative() ? '-' : '';
  let numTex = productTex(cNum, restNum, v);
  const denTex = productTex(new Q(constant.d), restDen, v);
  if (sign && (restNum.length > 1 || !cNum.equals(1))) numTex = `${numTex}`;
  let answer;
  if (denTex === '1') {
    answer = sign ? (restNum.length === 1 && cNum.equals(1) ? `-(${numTex})` : `-${numTex}`) : numTex;
    // Also show the expanded form when it differs
    const expanded = T(P.scale(restNum.reduce((acc, f) => P.mul(acc, f), P.constPoly(1)), constant));
    if (expanded !== answer) answer = `${answer} = ${expanded}`;
  } else {
    answer = `${sign}\\frac{${numTex}}{${denTex}}`;
  }
  steps.push({ label: `Step ${stepNo++}: Simplified result:`, katex: `\\mathbf{${answer}}` });

  // Domain restrictions: original denominators, and the divisor's numerator when dividing
  const restricted = [...fB.factors, ...P.factor(pD2).factors, ...(isDivision ? P.factor(pN2).factors : [])];
  const excluded = [];
  let unsolved = false;
  for (const f of restricted) {
    const r = realRootsOf(f);
    excluded.push(...r.roots);
    unsolved = unsolved || r.unsolved;
  }
  const uniq = [...new Set(excluded)];
  if (uniq.length || unsolved) {
    steps.push({
      label: 'Domain restrictions (values that make an original denominator or the divisor zero):',
      katex: uniq.map(r => `${v} \\neq ${r}`).join(', \\quad ') + (unsolved ? ' \\quad (\\text{and roots of higher-degree factors})' : '')
    });
  }

  return { answer, steps };
}

module.exports = { solveAlgebraicRational };
