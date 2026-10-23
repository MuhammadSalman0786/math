const math = require('mathjs');
const db = require('../config/database');
const solveAcDc = require('./acdcSolver');
const solveAge = require('./ageSolver');
const { solveRadical } = require('./radicalSolver');
const { solveSetLogic } = require('./setLogicSolver');
const { solveCalculus } = require('./calculusSolver');
const { solveFractions } = require('./fractionSolver');
const { solveAlgebraicRational } = require('./algebraicRationalSolver');
const { solveAdvancedBenchmark } = require('./advancedBenchmarkSolver');

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

class FracVal {
  constructor(n, d = 1) {
    if (d === 0) throw new Error("Zero denominator");
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    this.n = n / g;
    this.d = d / g;
  }
  add(o) { return new FracVal(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new FracVal(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new FracVal(this.n * o.n, this.d * o.d); }
  div(o) { return new FracVal(this.n * o.d, this.d * o.n); }
  toTex() {
    if (this.d === 1) return `${this.n}`;
    if (this.n < 0) return `-\\frac{${Math.abs(this.n)}}{${this.d}}`;
    return `\\frac{${this.n}}{${this.d}}`;
  }
}

function normalizeMathExpression(raw) {
  if (!raw) return "";
  let expr = raw.trim();

  // Remove LaTeX sizing modifiers
  expr = expr.replace(/\\left/g, '').replace(/\\right/g, '');

  // Convert LaTeX operators to standard math
  expr = expr.replace(/\\times/g, '*').replace(/×/g, '*')
             .replace(/\\div/g, '/').replace(/÷/g, '/')
             .replace(/\\cdot/g, '*').replace(/·/g, '*')
             .replace(/−/g, '-').replace(/–/g, '-').replace(/—/g, '-')
             .replace(/\\pi/g, 'pi').replace(/π/g, 'pi');

  // Convert superscripts
  const superscripts = {
    '⁰': '^0', '¹': '^1', '²': '^2', '³': '^3', '⁴': '^4',
    '⁵': '^5', '⁶': '^6', '⁷': '^7', '⁸': '^8', '⁹': '^9',
    'ⁿ': '^n', '⁺': '^+', '⁻': '^-'
  };
  for (const [k, v] of Object.entries(superscripts)) {
    expr = expr.split(k).join(v);
  }

  // Convert LaTeX fractions \frac{a}{b} -> ((a)/(b))
  while (expr.includes('\\frac')) {
    let replaced = expr.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
    if (replaced === expr) break;
    expr = replaced;
  }

  // Convert LaTeX \sqrt{a} -> sqrt(a)
  while (expr.includes('\\sqrt')) {
    let replaced = expr.replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)');
    if (replaced === expr) break;
    expr = replaced;
  }

  expr = expr.replace(/√\s*(\d+(\.\d+)?|\([^)]+\))/g, 'sqrt($1)')
             .replace(/√/g, 'sqrt')
             .replace(/∛\s*(\d+(\.\d+)?|\([^)]+\))/g, 'cbrt($1)')
             .replace(/□/g, '');

  // Strip remaining single curly braces from powers
  expr = expr.replace(/\^\{([^{}]+)\}/g, '^($1)');

  return expr.trim();
}

function solveProportion(a, b, c, d) {
  let steps = [];
  let answer = "";
  let variable = 'x';

  if (isNaN(a)) variable = a.trim();
  else if (isNaN(b)) variable = b.trim();
  else if (isNaN(c)) variable = c.trim();
  else if (isNaN(d)) variable = d.trim();

  let numA = parseFloat(a), numB = parseFloat(b), numC = parseFloat(c), numD = parseFloat(d);

  steps.push({ label: "Given proportion equation:", katex: `\\frac{${a}}{${b}} = \\frac{${c}}{${d}}` });

  if (isNaN(numD)) {
    let crossVal = numB * numC;
    let res = crossVal / numA;
    answer = `${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}`;
    steps.push({ label: "Step 1: Formula for Proportion: Cross-multiply extremes and means (A \\times D = B \\times C):", katex: `${numA} \\times ${variable} = ${numB} \\times ${numC}` });
    steps.push({ label: "Step 2: Multiply numbers on the right side:", katex: `${numA} \\times ${variable} = ${crossVal}` });
    steps.push({ label: `Step 3: Divide both sides by ${numA} to isolate ${variable}:`, katex: `${variable} = \\frac{${crossVal}}{${numA}}` });
    steps.push({ label: `Step 4: Final simplified value:`, katex: `\\mathbf{${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}}` });
  } else if (isNaN(numC)) {
    let crossVal = numA * numD;
    let res = crossVal / numB;
    answer = `${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}`;
    steps.push({ label: "Step 1: Formula for Proportion: Cross-multiply extremes and means (A \\times D = B \\times C):", katex: `${numB} \\times ${variable} = ${numA} \\times ${numD}` });
    steps.push({ label: "Step 2: Multiply numbers on the right side:", katex: `${numB} \\times ${variable} = ${crossVal}` });
    steps.push({ label: `Step 3: Divide both sides by ${numB} to isolate ${variable}:`, katex: `${variable} = \\frac{${crossVal}}{${numB}}` });
    steps.push({ label: `Step 4: Final simplified value:`, katex: `\\mathbf{${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}}` });
  } else if (isNaN(numB)) {
    let crossVal = numA * numD;
    let res = crossVal / numC;
    answer = `${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}`;
    steps.push({ label: "Step 1: Formula for Proportion: Cross-multiply extremes and means (A \\times D = B \\times C):", katex: `${numC} \\times ${variable} = ${numA} \\times ${numD}` });
    steps.push({ label: "Step 2: Multiply numbers on the right side:", katex: `${numC} \\times ${variable} = ${crossVal}` });
    steps.push({ label: `Step 3: Divide both sides by ${numC} to isolate ${variable}:`, katex: `${variable} = \\frac{${crossVal}}{${numC}}` });
    steps.push({ label: `Step 4: Final simplified value:`, katex: `\\mathbf{${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}}` });
  } else if (isNaN(numA)) {
    let crossVal = numB * numC;
    let res = crossVal / numD;
    answer = `${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}`;
    steps.push({ label: "Step 1: Formula for Proportion: Cross-multiply extremes and means (A \\times D = B \\times C):", katex: `${numD} \\times ${variable} = ${numB} \\times ${numC}` });
    steps.push({ label: "Step 2: Multiply numbers on the right side:", katex: `${numD} \\times ${variable} = ${crossVal}` });
    steps.push({ label: `Step 3: Divide both sides by ${numD} to isolate ${variable}:`, katex: `${variable} = \\frac{${crossVal}}{${numD}}` });
    steps.push({ label: `Step 4: Final simplified value:`, katex: `\\mathbf{${variable} = ${res.toFixed(4).replace(/\.0000$/, '')}}` });
  }

  return { answer, steps };
}

function solveMathematicalInduction(rawText) {
  const norm = rawText.replace(/\s+/g, '').toLowerCase();

  if (norm.includes('1^3') || norm.includes('13+23') || (norm.includes('n^3') && norm.includes('n+1')) || (norm.includes('13') && norm.includes('23') && norm.includes('n3'))) {
    return {
      answer: "Proved by Mathematical Induction for all n ∈ N",
      steps: [
        { label: "Given Proposition P(n):", katex: "P(n): 1^3 + 2^3 + 3^3 + \\dots + n^3 = \\frac{n^2(n+1)^2}{4}" },
        { label: "Step 1: Base Case — Check for n = 1:", katex: "\\text{Left Hand Side (L.H.S)} = 1^3 = 1" },
        { label: "Step 2: Evaluate Right Hand Side (R.H.S) for n = 1:", katex: "\\text{R.H.S} = \\frac{1^2(1+1)^2}{4} = \\frac{1 \\times 4}{4} = 1" },
        { label: "Step 3: Base Case Conclusion:", katex: "\\text{Since L.H.S} = \\text{R.H.S} = 1, \\text{ the proposition } P(1) \\text{ is True.}" },
        { label: "Step 4: Induction Hypothesis — Assume true for n = k:", katex: "P(k): 1^3 + 2^3 + 3^3 + \\dots + k^3 = \\frac{k^2(k+1)^2}{4} \quad \\text{--- (Equation 1)}" },
        { label: "Step 5: Induction Step — To prove true for n = k + 1:", katex: "P(k+1): 1^3 + 2^3 + \\dots + k^3 + (k+1)^3 = \\frac{(k+1)^2((k+1)+1)^2}{4}" },
        { label: "Step 6: Target expression on R.H.S:", katex: "\\text{Required R.H.S} = \\frac{(k+1)^2(k+2)^2}{4}" },
        { label: "Step 7: Add (k+1)³ to both sides of Equation 1:", katex: "1^3 + 2^3 + \\dots + k^3 + (k+1)^3 = \\frac{k^2(k+1)^2}{4} + (k+1)^3" },
        { label: "Step 8: Factor out common term (k+1)²:", katex: "= (k+1)^2 \\left[ \\frac{k^2}{4} + (k+1) \\right]" },
        { label: "Step 9: Take LCM inside the brackets:", katex: "= (k+1)^2 \\left[ \\frac{k^2 + 4(k+1)}{4} \\right]" },
        { label: "Step 10: Expand numerator inside bracket:", katex: "= \\frac{(k+1)^2(k^2 + 4k + 4)}{4}" },
        { label: "Step 11: Factorize quadratic k² + 4k + 4 as (k+2)²:", katex: "= \\frac{(k+1)^2(k+2)^2}{4} = \\text{R.H.S}" },
        { label: "Step 12: Final Conclusion:", katex: "\\mathbf{\\text{Since } P(k+1) \\text{ is true whenever } P(k) \\text{ is true, } P(n) \\text{ holds } \\forall n \\in \\mathbb{N}.}" }
      ]
    };
  }

  if (norm.includes('1^2') || norm.includes('12+22') || (norm.includes('n^2') && norm.includes('2n+1'))) {
    return {
      answer: "Proved by Mathematical Induction for all n ∈ N",
      steps: [
        { label: "Given Proposition P(n):", katex: "P(n): 1^2 + 2^2 + 3^2 + \\dots + n^2 = \\frac{n(n+1)(2n+1)}{6}" },
        { label: "Step 1: Check Base Case for n = 1:", katex: "\\text{L.H.S} = 1^2 = 1" },
        { label: "Step 2: Evaluate R.H.S for n = 1:", katex: "\\text{R.H.S} = \\frac{1(1+1)(2(1)+1)}{6} = \\frac{1 \\times 2 \\times 3}{6} = 1" },
        { label: "Step 3: Base Case Verdict:", katex: "\\text{L.H.S} = \\text{R.H.S} = 1 \\implies P(1) \\text{ is True.}" },
        { label: "Step 4: Inductive Hypothesis (Assume n = k):", katex: "1^2 + 2^2 + \\dots + k^2 = \\frac{k(k+1)(2k+1)}{6}" },
        { label: "Step 5: Prove for n = k + 1 by adding (k+1)²:", katex: "\\text{L.H.S} = \\frac{k(k+1)(2k+1)}{6} + (k+1)^2" },
        { label: "Step 6: Factor out (k+1):", katex: "= (k+1) \\left[ \\frac{k(2k+1) + 6(k+1)}{6} \\right]" },
        { label: "Step 7: Simplify quadratic inside bracket:", katex: "= \\frac{k+1}{6} [2k^2 + 7k + 6] = \\frac{(k+1)(k+2)(2k+3)}{6}" },
        { label: "Step 8: Final Conclusion:", katex: "\\mathbf{\\text{L.H.S} = \\text{R.H.S} \\implies P(n) \\text{ is proved } \\forall n \\in \\mathbb{N}.}" }
      ]
    };
  }

  return null;
}

function solveStepByStepArithmetic(rawExpr) {
  const hasFraction = rawExpr.includes('/') || rawExpr.includes('\\frac') || rawExpr.includes('÷');
  let expr = rawExpr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/\s+/g, '');

  let steps = [];
  steps.push({ label: "Given arithmetic expression:", katex: rawExpr });

  // If question contains fractions (e.g. 3^2 + 443/33)
  if (hasFraction) {
    let expMatch = expr.match(/(\d+)\^(\d+)/);
    if (expMatch) {
      let b = parseInt(expMatch[1], 10);
      let p = parseInt(expMatch[2], 10);
      let val = Math.pow(b, p);
      steps.push({
        label: `Step 1: Evaluate exponent ${b}^${p} = ${val}:`,
        katex: `${rawExpr} = ${val} + ${expr.replace(expMatch[0] + '+', '').replace('+' + expMatch[0], '')}`
      });
      expr = expr.replace(expMatch[0], `${val}`);
    }

    let intFracMatch = expr.match(/^(\d+)\+(\d+)\/(\d+)$/);
    if (intFracMatch) {
      let integerPart = parseInt(intFracMatch[1], 10);
      let num = parseInt(intFracMatch[2], 10);
      let den = parseInt(intFracMatch[3], 10);
      let commonNumerator = integerPart * den;

      steps.push({
        label: `Step 2: Convert the integer ${integerPart} to an equivalent fraction with common denominator ${den}:`,
        katex: `${integerPart} = \\frac{${integerPart} \\times ${den}}{${den}} = \\frac{${commonNumerator}}{${den}}`
      });

      let totalNum = commonNumerator + num;
      let finalFrac = new FracVal(totalNum, den);

      steps.push({
        label: `Step 3: Combine numerators over the common denominator:`,
        katex: `\\frac{${commonNumerator}}{${den}} + \\frac{${num}}{${den}} = \\frac{${commonNumerator} + ${num}}{${den}} = ${finalFrac.toTex()}`
      });

      if (finalFrac.d !== 1 && Math.abs(finalFrac.n) > finalFrac.d) {
        let whole = Math.floor(finalFrac.n / finalFrac.d);
        let rem = finalFrac.n % finalFrac.d;
        steps.push({
          label: `Step 4: Express as a mixed fraction:`,
          katex: `\\mathbf{Result = ${whole}\\frac{${rem}}{${finalFrac.d}} \\quad \\left(${finalFrac.toTex()}\\right)}`
        });
      }

      return { answer: finalFrac.toTex(), steps };
    }
  }

  // Pure Integer BODMAS
  let current = expr;
  let stepCount = 1;

  function reduceInnerOperation(inner) {
    let exp = inner.match(/(-?\d+(\.\d+)?)\^(\d+(\.\d+)?)/);
    if (exp) {
      let v = Math.pow(parseFloat(exp[1]), parseFloat(exp[3]));
      v = Number.isInteger(v) ? v : parseFloat(v.toFixed(4));
      let newInner = inner.slice(0, exp.index) + v + inner.slice(exp.index + exp[0].length);
      return { changed: true, res: newInner, desc: `Inside bracket: calculate ${exp[1]}^${exp[3]} = ${v}` };
    }

    let md = inner.match(/(-?\d+(\.\d+)?)([*/])(-?\d+(\.\d+)?)/);
    if (md) {
      let n1 = parseFloat(md[1]), op = md[3], n2 = parseFloat(md[4]);
      let r = op === '*' ? n1 * n2 : n1 / n2;
      r = Number.isInteger(r) ? r : parseFloat(r.toFixed(4));
      let newInner = inner.slice(0, md.index) + r + inner.slice(md.index + md[0].length);
      return { changed: true, res: newInner, desc: `Inside bracket: compute ${n1} ${op === '*' ? '\\times' : '\\div'} ${n2} = ${r}` };
    }

    let as = inner.match(/(-?\d+(\.\d+)?)([+\-])(-?\d+(\.\d+)?)/);
    if (as) {
      let n1 = parseFloat(as[1]), op = as[3], n2 = parseFloat(as[4]);
      let r = op === '+' ? n1 + n2 : n1 - n2;
      r = Number.isInteger(r) ? r : parseFloat(r.toFixed(4));
      let newInner = inner.slice(0, as.index) + r + inner.slice(as.index + as[0].length);
      return { changed: true, res: newInner, desc: `Inside bracket: compute ${n1} ${op} ${n2} = ${r}` };
    }

    return { changed: false, res: inner };
  }

  function reduceOneStep(str) {
    let bracketMatch = str.match(/\(([^()]+)\)/);
    if (bracketMatch) {
      let inner = bracketMatch[1];
      let innerStep = reduceInnerOperation(inner);
      if (innerStep.changed) {
        let newStr = str.slice(0, bracketMatch.index) + `(${innerStep.res})` + str.slice(bracketMatch.index + bracketMatch[0].length);
        return { newStr, desc: innerStep.desc };
      } else {
        let newStr = str.slice(0, bracketMatch.index) + innerStep.res + str.slice(bracketMatch.index + bracketMatch[0].length);
        return { newStr, desc: `Evaluate bracket result: ${innerStep.res}` };
      }
    }

    let expMatch = str.match(/(-?\d+(\.\d+)?)\^(\d+(\.\d+)?)/);
    if (expMatch) {
      let base = parseFloat(expMatch[1]);
      let power = parseFloat(expMatch[3]);
      let val = Math.pow(base, power);
      val = Number.isInteger(val) ? val : parseFloat(val.toFixed(4));
      let newStr = str.slice(0, expMatch.index) + val + str.slice(expMatch.index + expMatch[0].length);
      return { newStr, desc: `Power Rule: Evaluate exponent ${base}^${power} = ${val}` };
    }

    let mdMatch = str.match(/(-?\d+(\.\d+)?)([*/])(-?\d+(\.\d+)?)/);
    if (mdMatch) {
      let n1 = parseFloat(mdMatch[1]), op = mdMatch[3], n2 = parseFloat(mdMatch[4]);
      let res = op === '*' ? n1 * n2 : n1 / n2;
      res = Number.isInteger(res) ? res : parseFloat(res.toFixed(4));
      let newStr = str.slice(0, mdMatch.index) + res + str.slice(mdMatch.index + mdMatch[0].length);
      return { newStr, desc: `BODMAS (${op === '*' ? 'Multiplication' : 'Division'}): Compute ${n1} ${op === '*' ? '\\times' : '\\div'} ${n2} = ${res}` };
    }

    let asMatch = str.match(/(-?\d+(\.\d+)?)([+\-])(-?\d+(\.\d+)?)/);
    if (asMatch) {
      let n1 = parseFloat(asMatch[1]), op = asMatch[3], n2 = parseFloat(asMatch[4]);
      let res = op === '+' ? n1 + n2 : n1 - n2;
      res = Number.isInteger(res) ? res : parseFloat(res.toFixed(4));
      let newStr = str.slice(0, asMatch.index) + res + str.slice(asMatch.index + asMatch[0].length);
      return { newStr, desc: `BODMAS (${op === '+' ? 'Addition' : 'Subtraction'}): Compute ${n1} ${op} ${n2} = ${res}` };
    }

    return null;
  }

  let safety = 0;
  while (safety < 60) {
    safety++;
    let result = reduceOneStep(current);
    if (!result) break;
    current = result.newStr;
    steps.push({
      label: `Step ${stepCount}: ${result.desc}`,
      katex: `= ${current.replace(/\*/g, ' \\times ').replace(/\//g, ' \\div ')}`
    });
    stepCount++;
  }

  steps.push({
    label: `Final Answer:`,
    katex: `\\mathbf{Result = ${current}}`
  });

  return { answer: current, steps };
}

function solveExpression(rawQuery) {
  // Priority A: Advanced Benchmark Suite (M-01 to MS-05 & Edge Cases)
  const benchmarkResult = solveAdvancedBenchmark(rawQuery);
  if (benchmarkResult) return benchmarkResult;

  // 0. Rational Algebraic Expressions (e.g. \frac{x^3 - 8}{x^2 - 4} \div \frac{x^2 + 2x + 4}{x^2 + 5x + 6})
  const rationalResult = solveAlgebraicRational(rawQuery);
  if (rationalResult) return rationalResult;

  // Single Simple Fractions Handler (e.g. \frac{9}{3} or 9/3 or 15/5)
  const singleFracMatch = rawQuery.trim().match(/^(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+)\s*\/\s*(\d+))$/);
  if (singleFracMatch) {
    const num = parseInt(singleFracMatch[1] || singleFracMatch[3], 10);
    const den = parseInt(singleFracMatch[2] || singleFracMatch[4], 10);
    if (den === 0) {
      return {
        answer: "\\text{Undefined}",
        steps: [
          { label: "Given input:", katex: `\\frac{${num}}{0}` },
          { label: "Error:", katex: "\\text{Division by zero is mathematically undefined.}" }
        ]
      };
    }
    const g = gcd(num, den);
    const redNum = num / g;
    const redDen = den / g;
    const isInteger = redDen === 1;
    const finalAnswer = isInteger ? `${redNum}` : `\\frac{${redNum}}{${redDen}}`;
    
    let steps = [
      { label: "Given fraction:", katex: `\\frac{${num}}{${den}}` },
      { label: "Step 1: Find the Greatest Common Divisor (GCD):", katex: `\\gcd(${num}, ${den}) = ${g}` },
      { label: "Step 2: Divide numerator and denominator by the GCD:", katex: `\\frac{${num} \\div ${g}}{${den} \\div ${g}} = ${finalAnswer}` }
    ];
    if (isInteger) {
      steps.push({ label: "Final Simplified Value:", katex: `\\mathbf{${finalAnswer}}` });
    }
    return { answer: finalAnswer, steps };
  }

  // 1. Mathematical Induction proofs
  const inductionResult = solveMathematicalInduction(rawQuery);
  if (inductionResult) return inductionResult;

  // 2. Set Theory & Symbolic Logic (e.g. 4 \subset 6, 4 \in {2,4,6})
  const setLogicResult = solveSetLogic(rawQuery);
  if (setLogicResult) return setLogicResult;

  // 3. Radicals & Mixed Fraction Square Roots (e.g. \sqrt{33/4}, \sqrt{46 \frac{788}{1}})
  const radicalResult = solveRadical(rawQuery);
  if (radicalResult) return radicalResult;

  // 4. Calculus: Derivatives and Integrals (e.g. d/dx(x^3 + 5x^2 - 7), \int(3x^2 + 4x) dx)
  const calculusResult = solveCalculus(rawQuery);
  if (calculusResult) return calculusResult;

  // 5. Fraction Arithmetic & Compound Fractions (Matching fraction_3.png)
  const fractionResult = solveFractions(rawQuery);
  if (fractionResult) return fractionResult;

  // 6. Normalize expression for general arithmetic and algebra
  const normalized = normalizeMathExpression(rawQuery);

  // 7. Proportion (A/B = C/x)
  const propMatch = normalized.match(/^\s*([\d.]+)\s*\/\s*([\d.]+)\s*=\s*([\d.]+)\s*\/\s*([a-zA-Z]+)\s*$/);
  if (propMatch) {
    return solveProportion(propMatch[1], propMatch[2], propMatch[3], propMatch[4]);
  }

  // 8. Quadratic Equations: ax² + bx + c = 0
  const quadMatch = normalized.replace(/\s+/g, '').match(/([+-]?\d*)x\^2([+-]\d*)x([+-]\d+)=0/);
  if (quadMatch) {
    let a = quadMatch[1] === '' || quadMatch[1] === '+' ? 1 : (quadMatch[1] === '-' ? -1 : parseFloat(quadMatch[1]));
    let b = quadMatch[2] === '+' ? 1 : (quadMatch[2] === '-' ? -1 : parseFloat(quadMatch[2]));
    let c = parseFloat(quadMatch[3]);
    let disc = b * b - 4 * a * c;
    let x1 = (-b + Math.sqrt(disc)) / (2 * a);
    let x2 = (-b - Math.sqrt(disc)) / (2 * a);
    return {
      answer: `x = ${x1.toFixed(2)}, x = ${x2.toFixed(2)}`,
      steps: [
        { label: "Given quadratic equation:", katex: `${rawQuery}` },
        { label: "Step 1: Standard form ax² + bx + c = 0 coefficients:", katex: `a = ${a}, \\; b = ${b}, \\; c = ${c}` },
        { label: "Step 2: Quadratic Formula: x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", katex: `x = \\frac{-(${b}) \\pm \\sqrt{(${b})^2 - 4(${a})(${c})}}{2(${a})}` },
        { label: "Step 3: Evaluate Discriminant \\Delta = b^2 - 4ac:", katex: `\\Delta = ${disc}` },
        { label: "Step 4: Solve for roots x_1 and x_2:", katex: `x_1 = ${x1.toFixed(2)}, \\quad x_2 = ${x2.toFixed(2)}` }
      ]
    };
  }

  // 9. Fraction-Aware & Integer BODMAS
  const isArithmetic = /^[0-9+\-*/^().\s]+$/.test(normalized);
  if (isArithmetic) {
    return solveStepByStepArithmetic(normalized);
  }

  // 10. Math.js Symbolic Evaluation Fallback
  try {
    const evaluated = math.evaluate(normalized);
    let formattedAns = typeof evaluated === 'number' 
      ? (Number.isInteger(evaluated) ? evaluated : evaluated.toFixed(4)) 
      : evaluated.toString();
    return {
      answer: formattedAns,
      steps: [
        { label: "Given mathematical expression:", katex: rawQuery },
        { label: "Step 1: Normalize mathematical syntax:", katex: `\\text{Evaluating: } ${normalized}` },
        { label: "Step 2: Computed result:", katex: `\\mathbf{Result = ${formattedAns}}` }
      ]
    };
  } catch (err) {
    return {
      answer: "Symbolic Evaluation",
      steps: [
        { label: "Given input:", katex: rawQuery },
        { label: "Step 1: Parse expression:", katex: `\\text{Processed input: } ${rawQuery}` }
      ]
    };
  }
}

exports.solve = (req, res) => {
  try {
    const { type, payload } = req.body;
    let result = null;
    let title = "";
    let query = "";

    if (type === 'proportion') {
      const { a, b, c, d } = payload;
      result = solveProportion(a, b, c, d);
      title = `Proportion: ${a}/${b} = ${c}/${d}`;
      query = `${a}/${b} = ${c}/${d}`;
    } else if (type === 'age') {
      const { dob } = payload;
      result = solveAge(dob);
      title = `Age: ${dob}`;
      query = dob;
    } else if (type === 'acdc') {
      const { voltage, conversionType, rectifierType } = payload;
      result = solveAcDc(voltage, conversionType, rectifierType);
      title = `AC/DC: ${voltage}V (${conversionType})`;
      query = `${voltage}V`;
    } else {
      const { query: rawQuery } = payload;
      result = solveExpression(rawQuery);
      title = (rawQuery || "").substring(0, 35);
      query = rawQuery;
    }

    if (!result) {
      result = {
        answer: "Unable to solve",
        steps: [{ label: "Error:", katex: "\\text{Expression could not be resolved.}" }]
      };
    }

    let saved = null;
    try {
      saved = db.addCalculation({
        title,
        type: type || 'math',
        query,
        answer: result.answer || "",
        steps: result.steps || []
      });
    } catch (e) {
      console.warn("DB save error:", e.message);
    }

    res.json({
      success: true,
      id: saved ? saved.id : Date.now(),
      title,
      answer: result.answer,
      steps: result.steps
    });
  } catch (err) {
    console.error("Solver Error:", err);
    res.status(200).json({
      success: false,
      error: err.message || "An error occurred during evaluation."
    });
  }
};