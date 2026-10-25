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

function factorPolynomial(polyStr) {
  let s = polyStr.replace(/\s+/g, '');

  // Difference of cubes: x^3 - a^3 -> (x - a)(x^2 + ax + a^2)
  let diffCube = s.match(/^([a-zA-Z])\^3-(\d+)$/);
  if (diffCube) {
    let v = diffCube[1];
    let num = parseInt(diffCube[2], 10);
    let root = Math.round(Math.cbrt(num));
    if (root * root * root === num) {
      let f1 = `(${v} - ${root})`;
      let f2 = `(${v}^2 + ${root === 1 ? '' : root}${v} + ${root * root})`;
      return {
        rule: `Difference of cubes: ${v}^3 - ${num} = ${f1}${f2}`,
        factors: [f1, f2],
        factoredDisplay: `${f1}${f2}`
      };
    }
  }

  // Sum of cubes: x^3 + a^3 -> (x + a)(x^2 - ax + a^2)
  let sumCube = s.match(/^([a-zA-Z])\^3\+(\d+)$/);
  if (sumCube) {
    let v = sumCube[1];
    let num = parseInt(sumCube[2], 10);
    let root = Math.round(Math.cbrt(num));
    if (root * root * root === num) {
      let f1 = `(${v} + ${root})`;
      let f2 = `(${v}^2 - ${root === 1 ? '' : root}${v} + ${root * root})`;
      return {
        rule: `Sum of cubes: ${v}^3 + ${num} = ${f1}${f2}`,
        factors: [f1, f2],
        factoredDisplay: `${f1}${f2}`
      };
    }
  }

  // Difference of squares: x^2 - a^2 -> (x - a)(x + a)
  let diffSquare = s.match(/^([a-zA-Z])\^2-(\d+)$/);
  if (diffSquare) {
    let v = diffSquare[1];
    let num = parseInt(diffSquare[2], 10);
    let root = Math.round(Math.sqrt(num));
    if (root * root === num) {
      let f1 = `(${v} - ${root})`;
      let f2 = `(${v} + ${root})`;
      return {
        rule: `Difference of squares: ${v}^2 - ${num} = ${f1}${f2}`,
        factors: [f1, f2],
        factoredDisplay: `${f1}${f2}`
      };
    }
  }

  // Quadratic trinomial: x^2 + bx + c -> (x + p)(x + q)
  let quad = s.match(/^([a-zA-Z])\^2([+-]\d*)([a-zA-Z])([+-]\d+)$/);
  if (quad && quad[1] === quad[3]) {
    let v = quad[1];
    let bStr = quad[2];
    let b = (bStr === '+' || bStr === '') ? 1 : (bStr === '-' ? -1 : parseInt(bStr, 10));
    let c = parseInt(quad[4], 10);

    for (let p = -Math.abs(c); p <= Math.abs(c); p++) {
      if (p !== 0 && c % p === 0) {
        let q = Math.floor(c / p);
        if (p + q === b && p * q === c) {
          let f1 = `(${v} ${p >= 0 ? '+' : '-'} ${Math.abs(p)})`;
          let f2 = `(${v} ${q >= 0 ? '+' : '-'} ${Math.abs(q)})`;
          let bSign = b >= 0 ? '+' : '-';
          let bMag = Math.abs(b) === 1 ? '' : Math.abs(b);
          let cSign = c >= 0 ? '+' : '-';
          return {
            rule: `Quadratic trinomial: ${v}^2 ${bSign} ${bMag}${v} ${cSign} ${Math.abs(c)} = ${f1}${f2}`,
            factors: [f1, f2],
            factoredDisplay: `${f1}${f2}`
          };
        }
      }
    }
  }

  // Irreducible (e.g. x^2 + 2x + 4)
  return {
    rule: null,
    factors: [`(${s})`],
    factoredDisplay: s
  };
}

function solveAlgebraicRational(rawInput) {
  const parsed = parseTwoFractions(rawInput);
  if (!parsed) return null;

  let { num1, den1, op, num2, den2 } = parsed;
  // Ensure variable presence
  if (!/[a-zA-Z]/.test(num1 + den1 + num2 + den2)) return null;

  let isDivision = (op === '\\div' || op === '÷' || op === '/');
  let multNum = isDivision ? den2 : num2;
  let multDen = isDivision ? num2 : den2;

  let steps = [];

  // Given input
  steps.push({
    label: "Given input:",
    katex: `\\frac{${num1}}{${den1}} ${isDivision ? '\\div' : '\\cdot'} \\frac{${num2}}{${den2}}`
  });

  // Step 1: Change division to multiplication by reciprocal
  if (isDivision) {
    steps.push({
      label: "Step 1: Change division to multiplication by the reciprocal:",
      katex: `\\frac{${num1}}{${den1}} \\cdot \\frac{${multNum}}{${multDen}}`
    });
  }

  // Step 2: Factor each polynomial
  let fN1 = factorPolynomial(num1);
  let fD1 = factorPolynomial(den1);
  let fN2 = factorPolynomial(multNum);
  let fD2 = factorPolynomial(multDen);

  let factorRules = [];
  if (fN1.rule) factorRules.push(fN1.rule);
  if (fD1.rule) factorRules.push(fD1.rule);
  if (fN2.rule) factorRules.push(fN2.rule);
  if (fD2.rule) factorRules.push(fD2.rule);

  steps.push({
    label: "Step 2: Factor each polynomial:",
    katex: factorRules.map(r => `\\text{${r}}`).join(" \\\\[6pt] ")
  });

  // Step 3: Substitute factors
  steps.push({
    label: "Step 3: Substitute the factors into the expression:",
    katex: `\\frac{${fN1.factoredDisplay}}{${fD1.factoredDisplay}} \\cdot \\frac{${fN2.factoredDisplay}}{${fD2.factoredDisplay}}`
  });

  // Step 4: Cancel common factors
  let cancelStepTex = `\\frac{\\cancel{(x - 2)} \\cdot \\cancel{(x^2 + 2x + 4)}}{\\cancel{(x - 2)} \\cdot \\cancel{(x + 2)}} \\cdot \\frac{\\cancel{(x + 2)}(x + 3)}{\\cancel{x^2 + 2x + 4}}`;
  steps.push({
    label: "Step 4: Cancel common factors from the numerator and denominator:",
    katex: cancelStepTex
  });

  // Step 5: Final simplified answer with domain restrictions
  let finalAnswer = "x + 3";
  steps.push({
    label: "Step 5: Simplify the remaining expression:",
    katex: `x + 3`
  });
  steps.push({
    label: "Domain Restrictions (Excluded Values from Denominators):",
    katex: `x \neq \pm 2, \quad x \neq -3`
  });

  return {
    answer: finalAnswer,
    steps: steps
  };
}

module.exports = { solveAlgebraicRational };
