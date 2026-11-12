// Radical & Mixed Fraction Radical Solver (Matching AllMath.com exactly)
function isPerfectSquare(n) {
  if (n < 0) return false;
  const s = Math.round(Math.sqrt(n));
  return s * s === n;
}

function primeFactors(n) {
  let factors = [];
  let d = 2;
  let temp = n;
  while (d * d <= temp) {
    while (temp % d === 0) {
      factors.push(d);
      temp = Math.floor(temp / d);
    }
    d++;
  }
  if (temp > 1) factors.push(temp);
  return factors;
}

function simplifyRadicalInt(n) {
  if (!Number.isSafeInteger(n)) throw new Error('Number too large to simplify exactly');
  if (n === 0) return { outside: 0, inside: 0 };
  if (n === 1) return { outside: 1, inside: 1 };
  let outside = 1;
  let inside = n;
  for (let i = Math.floor(Math.sqrt(n)); i >= 2; i--) {
    if (n % (i * i) === 0) {
      outside = i;
      inside = Math.floor(n / (i * i));
      break;
    }
  }
  return { outside, inside };
}

function formatRadical(outside, inside) {
  if (outside === 0) return "0";
  if (inside === 1) return `${outside}`;
  if (outside === 1) return `\\sqrt{${inside}}`;
  return `${outside}\\sqrt{${inside}}`;
}

function solveRadical(inputStr) {
  let raw = inputStr.trim();

  // Pattern A: Mixed fraction under radical e.g. \sqrt{46 \frac{788}{1}} or sqrt(46 788/1)
  let mixedMatch = raw.match(/(?:\\sqrt|sqrt)\s*[\{\(]\s*(\d+)\s+(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+)\s*\/\s*(\d+))\s*[\}\)]/i)
                || raw.match(/√\s*(\d+)\s+(\d+)\s*\/\s*(\d+)/);

  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2] || mixedMatch[4], 10);
    const den = parseInt(mixedMatch[3] || mixedMatch[5], 10);

    const improperNum = whole * den + num;
    let steps = [];

    steps.push({
      label: "Given input:",
      katex: `\\sqrt{${whole}\\frac{${num}}{${den}}}`
    });

    steps.push({
      label: `Step 1: Multiply the integer ${whole} by the denominator ${den} and add the numerator ${num} to convert to an improper fraction:`,
      katex: `${whole} \\times ${den} + ${num} = ${whole * den} + ${num} = ${improperNum}`
    });

    if (den === 1) {
      steps.push({
        label: "Step 2: Express the square root of the improper fraction:",
        katex: `\\sqrt{\\frac{${improperNum}}{1}} = \\sqrt{${improperNum}}`
      });

      const factors = primeFactors(improperNum);
      const factorStr = factors.join(' \\times ');
      const sim = simplifyRadicalInt(improperNum);

      if (sim.outside > 1) {
        steps.push({
          label: `Step 3: Factor the number ${improperNum} to simplify the radical:`,
          katex: `${improperNum} = ${factorStr}`
        });
        const ansLatex = formatRadical(sim.outside, sim.inside);
        steps.push({
          label: `Step 4: Extract perfect square factor (${sim.outside}² = ${sim.outside * sim.outside}):`,
          katex: `\\sqrt{${improperNum}} = ${ansLatex}`
        });
        const dec = Math.sqrt(improperNum).toFixed(3);
        steps.push({
          label: "Step 5: Calculate the decimal approximation:",
          katex: `${ansLatex} \\approx ${dec}`
        });
        return { answer: ansLatex, steps };
      } else {
        steps.push({
          label: `Step 3: Factor the number ${improperNum} to simplify the radical:`,
          katex: `${improperNum} = ${factorStr}`
        });
        steps.push({
          label: "Since there are no perfect square factors greater than 1, the radical cannot be simplified further in integer form.",
          katex: `\\text{Radical is in simplest integer form: } \\sqrt{${improperNum}}`
        });
        const dec = Math.sqrt(improperNum).toFixed(3);
        steps.push({
          label: "Step 4: Calculate the decimal approximation:",
          katex: `\\sqrt{${improperNum}} \\approx ${dec}`
        });
        return { answer: `\\sqrt{${improperNum}}`, steps };
      }
    } else {
      return solveFractionRadical(improperNum, den, steps);
    }
  }

  // Pattern B: Fraction under radical e.g. \sqrt{33/4} or \sqrt{\frac{33}{4}}
  let fracMatch = raw.match(/(?:\\sqrt|sqrt)\s*[\{\(]\s*(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+)\s*\/\s*(\d+))\s*[\}\)]/i)
               || raw.match(/√\s*(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+)\s*\/\s*(\d+))/);

  if (fracMatch) {
    const num = parseInt(fracMatch[1] || fracMatch[3], 10);
    const den = parseInt(fracMatch[2] || fracMatch[4], 10);
    return solveFractionRadical(num, den);
  }

  // Pattern C: Pure integer radical: e.g. \sqrt{72}
  let intMatch = raw.match(/^(?:\\sqrt|sqrt)\s*[\{\(]?\s*(\d+)\s*[\}\)]?$/i) || raw.match(/^√\s*(\d+)$/);
  if (intMatch) {
    const num = parseInt(intMatch[1], 10);
    return solveIntegerRadical(num);
  }

  return null;
}

function gcdInt(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function fracTex(top, bottom) {
  return bottom === 1 ? top : `\\frac{${top}}{${bottom}}`;
}

function solveFractionRadical(a, b, existingSteps = []) {
  let steps = existingSteps.length > 0 ? existingSteps : [{ label: "Given input:", katex: `\\sqrt{\\frac{${a}}{${b}}}` }];
  let n = steps.length;

  if (b === 0) {
    steps.push({ label: "Error:", katex: "\\text{Division by zero is undefined.}" });
    return { answer: "\\text{Undefined}", steps };
  }

  // Reduce the fraction first, e.g. 8/12 -> 2/3
  const g = gcdInt(a, b);
  if (g > 1) {
    steps.push({
      label: `Step ${n++}: Simplify the fraction inside the root (divide top and bottom by ${g}):`,
      katex: `\\sqrt{\\frac{${a}}{${b}}} = \\sqrt{\\frac{${a / g}}{${b / g}}}`
    });
    a = a / g; b = b / g;
  }

  if (b === 1) {
    const sim = simplifyRadicalInt(a);
    const ans = formatRadical(sim.outside, sim.inside);
    steps.push({ label: `Step ${n++}: Simplify the square root:`, katex: `\\sqrt{${a}} = ${ans}` });
    return { answer: ans, steps };
  }

  steps.push({
    label: `Step ${n++}: Use the quotient property of radicals $\\sqrt{\\frac{a}{b}} = \\frac{\\sqrt{a}}{\\sqrt{b}}$:`,
    katex: `\\frac{\\sqrt{${a}}}{\\sqrt{${b}}}`
  });

  let finalAnswer;
  if (isPerfectSquare(b)) {
    const sqrtB = Math.round(Math.sqrt(b));
    const simA = simplifyRadicalInt(a);
    finalAnswer = fracTex(formatRadical(simA.outside, simA.inside), sqrtB);
    steps.push({ label: `Step ${n++}: Take the square root of the denominator ($\\sqrt{${b}} = ${sqrtB}$):`, katex: finalAnswer });
  } else {
    // Rationalize: sqrt(a)/sqrt(b) = sqrt(ab)/b, then simplify
    const simProd = simplifyRadicalInt(a * b);
    const k = gcdInt(simProd.outside, b);
    const outside = simProd.outside / k;
    const bottom = b / k;
    finalAnswer = fracTex(formatRadical(outside, simProd.inside), bottom);
    steps.push({
      label: `Step ${n++}: Rationalize the denominator by multiplying top and bottom by $\\sqrt{${b}}$:`,
      katex: `\\frac{\\sqrt{${a}} \\times \\sqrt{${b}}}{\\sqrt{${b}} \\times \\sqrt{${b}}} = \\frac{\\sqrt{${a * b}}}{${b}} = \\frac{${formatRadical(simProd.outside, simProd.inside)}}{${b}}`
    });
    if (k > 1) {
      steps.push({ label: `Step ${n++}: Cancel the common factor ${k}:`, katex: finalAnswer });
    }
  }
  const approx = Math.sqrt(a / b).toFixed(4);
  steps.push({ label: "Final Answer:", katex: `\\mathbf{${finalAnswer}} \\approx ${approx}` });
  return { answer: finalAnswer, steps };
}

function solveIntegerRadical(n) {
  let steps = [{ label: "Given input:", katex: `\\sqrt{${n}}` }];
  if (isPerfectSquare(n)) {
    const ans = Math.round(Math.sqrt(n));
    steps.push({
      label: `Step 1: ${n} is a perfect square (${ans}² = ${n}):`,
      katex: `\\sqrt{${n}} = ${ans}`
    });
    return { answer: `${ans}`, steps };
  }
  const factors = primeFactors(n);
  steps.push({
    label: `Step 1: Prime factorization of ${n}:`,
    katex: `${n} = ${factors.join(' \\times ')}`
  });
  const sim = simplifyRadicalInt(n);
  const ansLatex = formatRadical(sim.outside, sim.inside);
  if (sim.outside > 1) {
    steps.push({
      label: `Step 2: Extract perfect square factor ${sim.outside}² = ${sim.outside * sim.outside}:`,
      katex: `\\sqrt{${n}} = \\sqrt{${sim.outside * sim.outside} \\times ${sim.inside}} = ${ansLatex}`
    });
  } else {
    steps.push({
      label: "Step 2: Since there are no square factors greater than 1, the radical is in simplest form:",
      katex: `\\sqrt{${n}}`
    });
  }
  const dec = Math.sqrt(n).toFixed(3);
  steps.push({
    label: "Step 3: Calculate the decimal approximation:",
    katex: `\\sqrt{${n}} \\approx ${dec}`
  });
  return { answer: ansLatex, steps };
}

module.exports = { solveRadical };
