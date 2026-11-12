// Page-specific text for each calculator page (rendered on the server).
// Each calculator page gets its own description, "how to use" steps, a worked example
// and FAQs (also published as FAQPage structured data). Keep answers accurate to what
// the tools actually do.

const CALC_CONTENT = {
  expression: {
    descCard: 'descExpression',
    howTitle: 'What can All Math Solver solve?',
    how: [
      '<strong>Arithmetic &amp; fractions</strong>: correct order of operations (BODMAS/PEMDAS) and exact fractions, e.g. <code>5 - 2^2</code>, <code>1/2 + 1/3</code>.',
      '<strong>Equations</strong>: linear, quadratic (including complex roots) and higher-degree equations that factor, e.g. <code>x^2 + 2x + 5 = 0</code>; exponential equations such as <code>2^{2x} - 5·2^x + 4 = 0</code>.',
      '<strong>Algebra</strong>: expanding, factoring and simplifying rational expressions with domain restrictions; square roots and radicals.',
      '<strong>Calculus</strong>: derivatives with product and chain rule steps, integrals (including integration by parts), definite and improper integrals, and limits with L\'Hôpital\'s rule.',
      '<strong>Linear algebra</strong>: eigenvalues and eigenvectors of 2×2 and 3×3 matrices.',
      '<strong>Sequences &amp; series</strong>: arithmetic and geometric progressions, and convergence tests (p-series, integral, ratio, comparison, alternating).',
      '<strong>Differential equations</strong>: first- and second-order linear ODEs with constant coefficients, including initial conditions.',
      '<strong>Advanced topics</strong>: double integrals, Green\'s theorem, Laurent series, real integrals by residues, the heat equation, and written proofs of standard theorems.'
    ],
    example: { q: 'Find dy/dx if y = x² sin(3x)', a: 'Product rule: dy/dx = 2x sin(3x) + 3x² cos(3x)' },
    faqs: [
      { q: 'Is All Math Solver free to use?', a: 'Yes. Every math and maths solver and calculator on the site is free, and you can use it without an account. Signing in only adds history that syncs across your devices.' },
      { q: 'Does it show the steps or only the answer?', a: 'It shows the full working: each step is written out with the rule used (for example BODMAS, the quadratic formula, the product rule or L\'Hôpital\'s rule), followed by the final answer.' },
      { q: 'How do I type powers, fractions and square roots?', a: 'Type ^ for powers (x^2), / for fractions (1/2), and use the fx button for symbols like √, π, ∫ and ∑. You can also paste a question copied from a worksheet or PDF.' },
      { q: 'Which topics are supported?', a: 'Arithmetic, algebra, linear and quadratic equations, exponential equations, derivatives, integrals, limits, eigenvalues, sequences and series, linear differential equations, and several advanced calculus topics, as listed above.' },
      { q: 'Which courses and exams is it useful for?', a: 'High school, A-level and college math and maths in any country: for example GCSE and A-level maths in the UK, Common Core, SAT and AP Calculus in the US and Canada, CBSE and JEE maths in India, and first-year university calculus and linear algebra.' }
    ]
  },
  induction: {
    descCard: 'descInduction',
    howTitle: 'How to use the induction solver',
    how: [
      'Type the statement to prove, for example <code>1 + 3 + 5 + ... + (2n-1) = n^2</code>, <code>\\sum_{i=1}^{n} i^2 = n(n+1)(2n+1)/6</code> or <code>4^n - 1 is divisible by 3</code>. You can start with "Prove by induction that".',
      'Press <strong>Calculate</strong>.',
      'You get the full proof: the <strong>base case</strong> (n = 1), the <strong>induction hypothesis</strong> P(k), the algebra of the <strong>inductive step</strong> P(k+1), and the conclusion. If the formula is false, you are shown the value of n where it fails.'
    ],
    example: { q: 'Prove 1 + 3 + 5 + ... + (2n−1) = n²', a: 'Base case 1 = 1²; assume k²; then k² + (2k+1) = (k+1)², so true for all n ≥ 1' },
    related: [['/', 'Math Solver'], ['/blog/mathematical-induction', 'Guide: mathematical induction'], ['/quadratic-equation-calculator', 'Quadratic Equation Calculator']],
    faqs: [
      { q: 'What is proof by mathematical induction?', a: 'It is a way to prove a statement P(n) for every whole number n. You prove the base case P(1), assume P(k) is true for some k, and use that to prove P(k+1). Like dominoes, each true case knocks over the next one.' },
      { q: 'Which statements can this induction solver prove?', a: 'Sum (series) formulas with polynomial, fraction or power terms, such as 1 + 2 + ... + n = n(n+1)/2, the sum of squares and cubes, geometric sums like 1 + 2 + 4 + ... + 2^(n−1) = 2^n − 1, telescoping sums like 1/(1·2) + ... + 1/(n(n+1)) = n/(n+1), and divisibility statements such as n³ − n is divisible by 6 or 7^n − 3^n is divisible by 4.' },
      { q: 'What happens if my formula is wrong?', a: 'The solver checks the statement for the first values of n before writing a proof. If it fails, you are told the first value of n where the two sides differ, so you can find the typing mistake.' },
      { q: 'Is induction on the GCSE, A-level, AP or JEE syllabus?', a: 'Proof by induction is part of A-level Further Maths in the UK, first-year university and discrete maths courses in the US and Canada, and Class 11 maths (Principle of Mathematical Induction) in India, so it is useful for JEE preparation too.' }
    ]
  },
  quadratic: {
    descCard: 'descQuadratic',
    howTitle: 'How to use the quadratic equation calculator',
    how: [
      'Write your equation in the form <strong>ax² + bx + c = 0</strong> (move every term to one side first).',
      'Enter the numbers <strong>a</strong>, <strong>b</strong> and <strong>c</strong>. Use a minus sign for negative coefficients and 0 for a missing term; decimals and fractions such as 3/4 are fine.',
      'Press <strong>Calculate</strong> to see the discriminant, the factorised form (when it exists), the quadratic formula, exact and decimal roots, and the vertex.'
    ],
    example: { q: 'x² − 5x + 6 = 0 (a = 1, b = −5, c = 6)', a: 'Δ = 25 − 24 = 1, (x − 2)(x − 3) = 0, so x = 2 or x = 3' },
    related: [['/blog/quadratic-formula', 'Guide: the quadratic formula'], ['/', 'Math Solver (any equation)'], ['/gcf-calculator', 'GCF Calculator']],
    faqs: [
      { q: 'What is the quadratic formula?', a: 'For ax² + bx + c = 0 with a ≠ 0, the solutions are x = (−b ± √(b² − 4ac)) / (2a). The expression b² − 4ac under the square root is called the discriminant.' },
      { q: 'What does the discriminant tell you?', a: 'If b² − 4ac is positive there are two different real roots, if it is zero there is one repeated real root, and if it is negative there are two complex roots (no real solutions).' },
      { q: 'Can it solve quadratics with complex or irrational roots?', a: 'Yes. Irrational roots are given exactly with surds, for example (3 ± √5)/2, plus decimals, and complex roots are written as a ± bi.' },
      { q: 'What if a = 0?', a: 'Then the equation is linear (bx + c = 0), not quadratic. The calculator tells you this and solves the linear equation instead.' }
    ]
  },
  lcm: {
    descCard: 'descLcm',
    howTitle: 'How to use the LCM calculator',
    how: [
      'Type two or more whole numbers separated by commas or spaces, for example <strong>12, 18, 30</strong> (up to 10 numbers).',
      'Press <strong>Calculate</strong>.',
      'You see the prime factorisation of each number, the highest power of each prime, the LCM, and a check using LCM(a, b) = a × b ÷ GCF(a, b).'
    ],
    example: { q: 'LCM of 12, 18 and 30', a: '12 = 2²·3, 18 = 2·3², 30 = 2·3·5, so LCM = 2²·3²·5 = 180' },
    related: [['/gcf-calculator', 'GCF / HCF Calculator'], ['/percentage-calculator', 'Percentage Calculator'], ['/', 'Fraction & Math Solver']],
    faqs: [
      { q: 'What is the LCM of two numbers?', a: 'The least common multiple (LCM), also called the lowest common multiple, is the smallest positive number that both numbers divide into exactly. For example, the LCM of 4 and 6 is 12.' },
      { q: 'How do you find the LCM using prime factorisation?', a: 'Write each number as a product of primes, then multiply every prime that appears, each raised to the highest power it has in any of the numbers.' },
      { q: 'What is the relationship between LCM and GCF?', a: 'For two positive whole numbers, LCM(a, b) × GCF(a, b) = a × b. So LCM(a, b) = a × b ÷ GCF(a, b).' },
      { q: 'Where is the LCM used?', a: 'To add or subtract fractions with different denominators (the LCM is the lowest common denominator), and in problems about events that repeat, such as when two buses next leave at the same time.' }
    ]
  },
  gcf: {
    descCard: 'descGcf',
    howTitle: 'How to use the GCF calculator',
    how: [
      'Type two or more whole numbers separated by commas or spaces, for example <strong>48, 180</strong> (up to 10 numbers).',
      'Press <strong>Calculate</strong>.',
      'You see the prime factors of each number, the common primes with their lowest powers, the GCF, and Euclid\'s algorithm as a check.'
    ],
    example: { q: 'GCF (HCF) of 48 and 180', a: '48 = 2⁴·3, 180 = 2²·3²·5, so GCF = 2²·3 = 12' },
    related: [['/lcm-calculator', 'LCM Calculator'], ['/', 'Fraction & Math Solver'], ['/proportion-calculator', 'Proportion Calculator']],
    faqs: [
      { q: 'Are GCF, HCF and GCD the same thing?', a: 'Yes. Greatest common factor (GCF, common in the US and Canada), highest common factor (HCF, common in the UK and India) and greatest common divisor (GCD) all mean the largest number that divides every given number exactly.' },
      { q: 'How does Euclid\'s algorithm work?', a: 'Divide the larger number by the smaller and keep the remainder. Then divide the previous divisor by that remainder, and repeat until the remainder is 0. The last non-zero remainder is the GCF.' },
      { q: 'What does a GCF of 1 mean?', a: 'If the GCF is 1 the numbers have no common factor other than 1. They are called co-prime or relatively prime, for example 8 and 15.' },
      { q: 'Where is the GCF used?', a: 'To simplify fractions (divide the top and bottom by their GCF), to factorise algebraic expressions, and to split things into the largest equal groups.' }
    ]
  },
  percentage: {
    descCard: 'descPercentage',
    howTitle: 'How to use the percentage calculator',
    how: [
      'Choose the question: <strong>X% of Y</strong>, <strong>X is what percent of Y</strong>, <strong>percentage change</strong> from X to Y, or <strong>increase / decrease</strong> Y by X%.',
      'Enter the two numbers (decimals are fine).',
      'Press <strong>Calculate</strong> to see the formula and every step of the working.'
    ],
    example: { q: 'What is 15% of 80?', a: '15% = 0.15, and 0.15 × 80 = 12' },
    related: [['/proportion-calculator', 'Proportion Calculator'], ['/lcm-calculator', 'LCM Calculator'], ['/age-calculator', 'Age Calculator']],
    faqs: [
      { q: 'How do I calculate a percentage of a number?', a: 'Divide the percentage by 100 and multiply by the number. For example, 20% of 150 = 0.2 × 150 = 30.' },
      { q: 'How do I work out percentage increase or decrease?', a: 'Subtract the original value from the new value, divide by the original value and multiply by 100. A positive answer is an increase and a negative answer is a decrease.' },
      { q: 'How do I add VAT or sales tax?', a: 'Use "Increase Y by X%". For example, adding 20% UK VAT to £50 gives 50 × 1.2 = £60, and adding 13% Canadian HST to $80 gives 80 × 1.13 = $90.40.' },
      { q: 'How do I find a discount price?', a: 'Use "Decrease Y by X%". For example, 25% off $40 is 40 × 0.75 = $30.' }
    ]
  },
  proportion: {
    descCard: 'descProportion',
    howTitle: 'How to use the proportion calculator and solver',
    how: [
      'Enter the four parts of the proportion <strong>A/B = C/D</strong>.',
      'Put a letter such as <strong>x</strong> in the box you want to find; fill the other three boxes with numbers.',
      'Press <strong>Calculate</strong> to see the cross-multiplication and the value of the unknown, step by step.'
    ],
    example: { q: '4/8 = 6/x', a: 'Cross-multiply: 4·x = 8·6 = 48, so x = 48 ÷ 4 = 12' },
    related: [['/percentage-calculator', 'Percentage Calculator'], ['/blog/ratio-and-proportion', 'Guide: ratio and proportion'], ['/', 'Math Solver']],
    faqs: [
      { q: 'What does this proportion solver do?', a: 'It is a proportion calculator and proportion solver in one: it finds the missing value in A/B = C/D, shows the cross multiplication, and divides to isolate the unknown, step by step.' },
      { q: 'What is a proportion?', a: 'A proportion is an equation saying two ratios are equal, written A/B = C/D. For example 1/2 = 4/8.' },
      { q: 'How does cross multiplication work?', a: 'In A/B = C/D the cross products are equal: A × D = B × C. If one value is unknown, multiply the two known diagonal numbers and divide by the remaining number.' },
      { q: 'Can the unknown be in any position?', a: 'Yes. The letter can be in A, B, C or D. Exactly one box must contain the unknown and the other three must be numbers.' },
      { q: 'Can I use decimals?', a: 'Yes, decimals such as 2.5 are accepted. Division by zero is not allowed, so B and D cannot be 0.' }
    ]
  },
  age: {
    descCard: 'descAge',
    howTitle: 'How to use the age calculator',
    how: [
      'Choose your <strong>date of birth</strong> in the date box.',
      'Press <strong>Calculate</strong>.',
      'You get your exact age in <strong>years, months and days</strong>, plus the total number of days and hours you have lived.'
    ],
    example: { q: 'Born on 29 February 2000, checked on 12 November 2026', a: '26 years, 8 months, 14 days' },
    faqs: [
      { q: 'How is the exact age calculated?', a: 'The calculator counts whole years first, then whole months, then the remaining days, using the real length of each month instead of dividing by 365.' },
      { q: 'Does it handle leap years and people born on 29 February?', a: 'Yes. Leap years are counted correctly, including birthdays on 29 February.' },
      { q: 'What else does it show?', a: 'Besides years, months and days, it shows the total number of days lived and the total number of hours lived.' },
      { q: 'Can I enter a future date?', a: 'No. A date of birth in the future is rejected with a clear message.' }
    ]
  },
  acdc: {
    descCard: 'descAcdc',
    howTitle: 'How to use the AC to DC calculator',
    how: [
      'Enter the AC voltage, for example <strong>230</strong> for UK or Indian mains, or <strong>120</strong> for US or Canadian mains.',
      'Choose whether that value is the <strong>RMS</strong> voltage (what a multimeter shows for mains) or the <strong>peak</strong> voltage.',
      'Choose a <strong>full-wave (bridge)</strong> or <strong>half-wave</strong> rectifier and press <strong>Calculate</strong>.'
    ],
    example: { q: '230 V RMS, full-wave bridge rectifier', a: 'V_peak = 230 × √2 ≈ 325.27 V, V_DC = 2·V_peak/π ≈ 207.07 V' },
    faqs: [
      { q: 'What is the formula for AC to DC conversion?', a: 'For an ideal full-wave rectifier V_DC = 2·V_peak/π ≈ 0.637·V_peak. For a half-wave rectifier V_DC = V_peak/π ≈ 0.318·V_peak. From RMS voltage, first use V_peak = V_RMS × √2.' },
      { q: 'What is the difference between RMS and peak voltage?', a: 'Peak voltage is the highest point of the AC wave. RMS is the equivalent heating value that meters display; for a sine wave V_peak = √2 × V_RMS, so 230 V RMS is about 325 V peak and 120 V RMS is about 170 V peak.' },
      { q: 'What DC voltage do 230 V and 120 V mains give?', a: 'With an ideal full-wave bridge rectifier, 230 V RMS (UK, India) gives about 207 V average DC and 120 V RMS (US, Canada) gives about 108 V. A half-wave rectifier gives about 104 V and 54 V respectively.' },
      { q: 'Are diode voltage drops included?', a: 'No. The results are for ideal diodes without a smoothing capacitor. Real circuits lose roughly 0.7 V per conducting silicon diode (about 1.4 V for a bridge).' }
    ]
  }
};

module.exports = { CALC_CONTENT };
