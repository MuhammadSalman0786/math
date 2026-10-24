# AllMath AI Solver - Master Verified Suite (v17 Pro Edition)

## Core Capabilities
- **Algebraic Rational Solver (`algebraicRationalSolver.js`)**:
  - Balanced depth-aware fraction parser supporting LaTeX (`\frac{N}{D}`), inline parentheses (`(N)/(D)`), and multi-slash syntax.
  - Complete polynomial factorization: Difference of cubes ($a^3-b^3$), Sum of cubes ($a^3+b^3$), Difference of squares ($a^2-b^2$), Quadratic trinomials ($ax^2+bx+c$), and irreducible forms.
  - Reciprocal multiplication, cross-out cancellation (`\cancel`), and exact domain restrictions ($x \ne \pm 2, -3$).
- **Advanced Benchmark Engine (`advancedBenchmarkSolver.js`)**:
  - Covers benchmark protocols from Matriculation to Master's level (M-01 to M-06, I-01 to I-07, B-01 to B-06, MS-01 to MS-05, and edge cases).
  - Exact complex roots for negative discriminants (e.g., $x = \frac{7 \pm i\sqrt{83}}{6}$).
  - Higher-order limits, cyclic integration by parts, non-linear simultaneous systems, improper integrals, Green's Theorem, and Gamma/Beta evaluations.
- **Frontend & Rendering**:
  - KaTeX with official `cancel.min.js` extension for visual strike-through lines.
  - Responsive light/dark theme, interactive symbols virtual keypad, Google OAuth + email authentication, and PDF download.

## Running Locally
```bash
npm install
npm start
```
Open `http://localhost:3000` in your web browser.
