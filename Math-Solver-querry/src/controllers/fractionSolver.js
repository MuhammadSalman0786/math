// Advanced Fractional Arithmetic & Complex Fraction Solver (Matching AllMath.com)
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    let t = b;
    b = a % b;
    a = t;
  }
  return a || 1;
}

function lcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

class Frac {
  constructor(n, d = 1) {
    if (d === 0) throw new Error("Division by zero");
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
  }
  add(o) { return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new Frac(this.n * o.n, this.d * o.d); }
  div(o) { return new Frac(this.n * o.d, this.d * o.n); }
  toTex() {
    if (this.d === 1) return `${this.n}`;
    if (this.n < 0) return `-\\frac{${Math.abs(this.n)}}{${this.d}}`;
    return `\\frac{${this.n}}{${this.d}}`;
  }
}

// Parses string like "rac{14}{15}", "14/15", "5" to Frac
function strToFrac(str) {
  if (!str) return null;
  str = str.trim();
  // Match LaTeX fraction rac{a}{b} with balanced braces or simple digits
  let m = str.match(/^(?:\\frac\{([^{}]+)\}\{([^{}]+)\}|(-?\d+)\s*\/\s*(-?\d+))$/);
  if (m) {
    return new Frac(parseInt(m[1] || m[3], 10), parseInt(m[2] || m[4], 10));
  }
  let intM = str.match(/^(-?\d+)$/);
  if (intM) return new Frac(parseInt(intM[1], 10), 1);
  return null;
}

function parseOuterBalancedFraction(raw) {
  let s = raw.trim().replace(/\\left/g, '').replace(/\\right/g, '');
  if (!s.startsWith('\\frac')) return null;

  let firstBrace = s.indexOf('{', 5);
  if (firstBrace === -1) return null;

  let depth = 0;
  let numEnd = -1;
  for (let i = firstBrace; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        numEnd = i;
        break;
      }
    }
  }
  if (numEnd === -1) return null;

  let numContent = s.substring(firstBrace + 1, numEnd).trim();

  let denStart = s.indexOf('{', numEnd);
  if (denStart === -1 || s.substring(numEnd + 1, denStart).trim() !== '') return null;

  depth = 0;
  let denEnd = -1;
  for (let i = denStart; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        denEnd = i;
        break;
      }
    }
  }
  if (denEnd === -1 || s.substring(denEnd + 1).trim() !== '') return null;

  let denContent = s.substring(denStart + 1, denEnd).trim();
  return { num: numContent, den: denContent };
}

function explainAddSub(f1, op, f2) {
  const commonDen = lcm(f1.d, f2.d);
  const m1 = commonDen / f1.d;
  const m2 = commonDen / f2.d;
  const adjN1 = f1.n * m1;
  const adjN2 = f2.n * m2;
  const resFrac = op === '+' ? f1.add(f2) : f1.sub(f2);
  const resNumUnreduced = op === '+' ? adjN1 + adjN2 : adjN1 - adjN2;

  let stepLabel = `Find a common denominator, which is ${commonDen}.`;
  let stepKatex = `\\frac{${f1.n} \\times ${m1}}{${commonDen}} ${op} \\frac{${f2.n} \\times ${m2}}{${commonDen}} = \\frac{${adjN1}}{${commonDen}} ${op} \\frac{${adjN2}}{${commonDen}} = \\frac{${resNumUnreduced}}{${commonDen}} = ${resFrac.toTex()}`;

  return {
    res: resFrac,
    steps: [{ label: stepLabel, katex: stepKatex }]
  };
}

function explainMul(f1, f2) {
  const unreducedN = f1.n * f2.n;
  const unreducedD = f1.d * f2.d;
  const res = f1.mul(f2);
  return {
    res,
    steps: [{
      label: ``,
      katex: `\\frac{${f1.n} \\times ${f2.n}}{${f1.d} \\times ${f2.d}} = \\frac{${unreducedN}}{${unreducedD}} = ${res.toTex()}`
    }]
  };
}

function explainDiv(f1, f2) {
  const recip = new Frac(f2.d, f2.n);
  const res = f1.div(f2);
  return {
    res,
    steps: [{
      label: ``,
      katex: `${f1.toTex()} \\times ${recip.toTex()} = \\frac{${f1.n * f2.d}}{${f1.d * f2.n}} = ${res.toTex()}`
    }]
  };
}

function solveCompoundFraction(rawQuery) {
  const outer = parseOuterBalancedFraction(rawQuery);
  if (!outer) return null;

  let numExpr = outer.num;
  let denExpr = outer.den;
  let steps = [{ label: "Given input:", katex: rawQuery }];
  let stepNum = 1;

  // 1. Numerator: Parenthesis
  let numParen = numExpr.match(/\(([^()]+)\)/);
  if (numParen) {
    let inner = numParen[1].trim();
    let parts = inner.match(/(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)\s*([+\-])\s*(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)/);
    if (parts) {
      let f1 = strToFrac(parts[1]), op = parts[2], f2 = strToFrac(parts[3]);
      steps.push({ label: `Step ${stepNum}: Simplify the numerator inside the parenthesis ${f1.toTex()} ${op} ${f2.toTex()}`, katex: "" });
      stepNum++;
      let exp = explainAddSub(f1, op, f2);
      steps.push(...exp.steps);
      numExpr = numExpr.replace(numParen[0], exp.res.toTex());
    }
  }

  // Numerator: Multiplication / Division
  let numMul = numExpr.match(/(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)\s*(?:\\times|\*|×)\s*(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)/);
  if (numMul) {
    let f1 = strToFrac(numMul[1]), f2 = strToFrac(numMul[2]);
    steps.push({ label: `Step ${stepNum}: Complete the multiplication in the numerator ${f1.toTex()} \\times ${f2.toTex()}`, katex: "" });
    stepNum++;
    let exp = explainMul(f1, f2);
    steps.push(...exp.steps);
    numExpr = numExpr.replace(numMul[0], exp.res.toTex());
  }

  // Numerator: Subtraction / Addition
  let numFinal = null;
  let numSub = numExpr.match(/(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)\s*([+\-])\s*(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)/);
  if (numSub) {
    let f1 = strToFrac(numSub[1]), op = numSub[2], f2 = strToFrac(numSub[3]);
    steps.push({ label: `Step ${stepNum}: Complete the ${op === '+' ? 'addition' : 'subtraction'} in the numerator ${f1.toTex()} ${op} ${f2.toTex()}`, katex: "" });
    stepNum++;
    let exp = explainAddSub(f1, op, f2);
    steps.push(...exp.steps);
    numFinal = exp.res;
  } else {
    numFinal = strToFrac(numExpr);
  }

  // 2. Denominator: Parenthesis
  let denParen = denExpr.match(/\(([^()]+)\)/);
  if (denParen) {
    let inner = denParen[1].trim();
    let parts = inner.match(/(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)\s*([+\-])\s*(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)/);
    if (parts) {
      let f1 = strToFrac(parts[1]), op = parts[2], f2 = strToFrac(parts[3]);
      steps.push({ label: `Step ${stepNum}: Simplify the denominator inside the parenthesis ${f1.toTex()} ${op} ${f2.toTex()}`, katex: "" });
      stepNum++;
      let exp = explainAddSub(f1, op, f2);
      steps.push(...exp.steps);
      denExpr = denExpr.replace(denParen[0], exp.res.toTex());
    }
  }

  // Denominator: Division
  let denFinal = null;
  let denDiv = denExpr.match(/(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)\s*(?:\\div|\/|÷)\s*(\\frac\{[^{}]+\}\{[^{}]+\}|\d+\/\d+)/);
  if (denDiv) {
    let f1 = strToFrac(denDiv[1]), f2 = strToFrac(denDiv[2]);
    steps.push({ label: `Step ${stepNum}: Complete the division in the denominator ${f1.toTex()} \\div ${f2.toTex()}`, katex: "" });
    stepNum++;
    let exp = explainDiv(f1, f2);
    steps.push(...exp.steps);
    denFinal = exp.res;
  } else {
    denFinal = strToFrac(denExpr);
  }

  // 3. Final Division
  if (numFinal && denFinal) {
    steps.push({ label: `Step ${stepNum}: Complete the division between the numerator and denominator:`, katex: `\\frac{${numFinal.toTex()}}{${denFinal.toTex()}} = ${numFinal.toTex()} \\div ${denFinal.toTex()}` });
    let finalExp = explainDiv(numFinal, denFinal);
    steps.push(...finalExp.steps);
    return { answer: finalExp.res.toTex(), steps };
  }

  return null;
}

function solveFractions(inputStr) {
  let compound = solveCompoundFraction(inputStr);
  if (compound) return compound;

  let cleaned = inputStr.trim().replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  let opMatch = cleaned.match(/^(.+?)\s*([\+\-\*\/])\s*(.+)$/);
  if (!opMatch) return null;

  let f1 = strToFrac(opMatch[1]), op = opMatch[2], f2 = strToFrac(opMatch[3]);
  if (!f1 || !f2 || (f1.d === 1 && f2.d === 1 && op !== '/')) return null;

  let steps = [{ label: "Given fraction expression:", katex: `${f1.toTex()} ${op === '*' ? '\\times' : (op === '/' ? '\\div' : op)} ${f2.toTex()}` }];
  let resFrac = null;

  if (op === '+' || op === '-') {
    let exp = explainAddSub(f1, op, f2);
    steps.push(...exp.steps);
    resFrac = exp.res;
  } else if (op === '*') {
    let exp = explainMul(f1, f2);
    steps.push(...exp.steps);
    resFrac = exp.res;
  } else if (op === '/') {
    let exp = explainDiv(f1, f2);
    steps.push(...exp.steps);
    resFrac = exp.res;
  }

  if (resFrac) {
    return { answer: resFrac.toTex(), steps };
  }
  return null;
}

module.exports = { solveFractions, solveCompoundFraction, Frac };
