// Library of written proofs. A proof question is recognised from its wording
// (lower-case text with spaces and LaTeX markup removed, see keyText()).
// Text inside $...$ in a label is shown as math.

const R = String.raw;

const PROOFS = [
  // ---------------- Analysis ----------------
  {
    title: 'Every Cauchy sequence in ℝ is convergent',
    match: (k) => /cauchy/.test(k) && /sequence/.test(k) && /converg|complete/.test(k),
    steps: [
      { label: R`Let $(a_n)$ be a Cauchy sequence in $\mathbb{R}$:`, katex: R`\forall \varepsilon > 0 \;\exists N:\; m, n \ge N \Rightarrow |a_m - a_n| < \varepsilon` },
      { label: R`Step 1 (bounded): take $\varepsilon = 1$ to get $N_1$ with $|a_n - a_{N_1}| < 1$ for $n \ge N_1$. Then every term satisfies $|a_n| \le M$, where`, katex: R`M = \max\{|a_1|, \dots, |a_{N_1}|,\; |a_{N_1}| + 1\}` },
      { label: R`Step 2 (convergent subsequence): by the Bolzano–Weierstrass theorem (a consequence of the completeness of $\mathbb{R}$), the bounded sequence $(a_n)$ has a subsequence converging to some $L \in \mathbb{R}$:`, katex: R`a_{n_k} \to L` },
      { label: R`Step 3 (the whole sequence converges to $L$): let $\varepsilon > 0$. Choose $N$ with $|a_m - a_n| < \varepsilon/2$ for $m, n \ge N$, then choose $k$ with $n_k \ge N$ and $|a_{n_k} - L| < \varepsilon/2$. For every $n \ge N$:`, katex: R`|a_n - L| \le |a_n - a_{n_k}| + |a_{n_k} - L| < \tfrac{\varepsilon}{2} + \tfrac{\varepsilon}{2} = \varepsilon` },
      { label: R`Conclusion: $a_n \to L$, so every Cauchy sequence in $\mathbb{R}$ converges. $\blacksquare$`, katex: '' }
    ],
    answer: R`\text{Proved: every Cauchy sequence in } \mathbb{R} \text{ converges}`
  },
  {
    title: 'A continuous function on [a, b] is uniformly continuous (Heine–Cantor)',
    match: (k) => /uniformlycontinuous|uniformcontinuity|heine-?cantor/.test(k) && /continuous/.test(k),
    steps: [
      { label: R`Suppose, for contradiction, that $f$ is continuous on $[a,b]$ but not uniformly continuous. Then there is an $\varepsilon_0 > 0$ such that for every $\delta = \tfrac1n$ we can find points $x_n, y_n \in [a,b]$ with`, katex: R`|x_n - y_n| < \tfrac{1}{n} \quad\text{but}\quad |f(x_n) - f(y_n)| \ge \varepsilon_0` },
      { label: R`Step 1: $(x_n)$ is bounded, so by Bolzano–Weierstrass a subsequence converges, $x_{n_k} \to c$. Since $[a,b]$ is closed, $c \in [a,b]$.`, katex: '' },
      { label: R`Step 2: $|y_{n_k} - x_{n_k}| < \tfrac{1}{n_k} \to 0$, so also $y_{n_k} \to c$.`, katex: '' },
      { label: R`Step 3: $f$ is continuous at $c$, hence $f(x_{n_k}) \to f(c)$ and $f(y_{n_k}) \to f(c)$, so`, katex: R`|f(x_{n_k}) - f(y_{n_k})| \to 0` },
      { label: R`This contradicts $|f(x_{n_k}) - f(y_{n_k})| \ge \varepsilon_0$ for all $k$. Therefore $f$ is uniformly continuous on $[a,b]$. $\blacksquare$`, katex: '' }
    ],
    answer: R`\text{Proved: } f \text{ is uniformly continuous on } [a,b]`
  },
  {
    title: 'Riemann–Lebesgue lemma',
    match: (k) => /riemann-?lebesgue/.test(k) || (/l\^?_?1|l1\(/.test(k) && /cos\(?nx|sin\(?nx/.test(k) && /lim/.test(k)),
    steps: [
      { label: R`Claim: if $f \in L^1(\mathbb{R})$ then`, katex: R`\lim_{n\to\infty} \int_{\mathbb{R}} f(x)\cos(nx)\,dx = 0` },
      { label: R`Step 1 (intervals): for $f = \mathbf{1}_{[a,b]}$,`, katex: R`\left|\int_a^b \cos(nx)\,dx\right| = \left|\frac{\sin(nb) - \sin(na)}{n}\right| \le \frac{2}{n} \to 0` },
      { label: R`Step 2 (step functions): by linearity the limit is 0 for every step function $g = \sum_{j=1}^{m} c_j \mathbf{1}_{[a_j, b_j]}$.`, katex: '' },
      { label: R`Step 3 (density): step functions are dense in $L^1(\mathbb{R})$. Given $\varepsilon > 0$, choose a step function $g$ with $\|f - g\|_1 < \varepsilon/2$.`, katex: '' },
      { label: R`Step 4: since $|\cos(nx)| \le 1$,`, katex: R`\left|\int f\cos(nx)\,dx\right| \le \int |f - g|\,dx + \left|\int g\cos(nx)\,dx\right| < \frac{\varepsilon}{2} + \left|\int g\cos(nx)\,dx\right|` },
      { label: R`By Step 2 the last term is $< \varepsilon/2$ for all large $n$, so $\left|\int f\cos(nx)\,dx\right| < \varepsilon$ eventually. The same argument works for $\sin(nx)$. $\blacksquare$`, katex: '' }
    ],
    answer: R`\lim_{n\to\infty}\int f(x)\cos(nx)\,dx = 0 \;\;(\text{proved})`
  },
  {
    title: 'Picard–Lindelöf via the Banach fixed-point theorem',
    match: (k) => /banach|picard|lindel|contractionmapping/.test(k) && /lipschitz|y'=|y′=|initialvalue|uniquesolution/.test(k),
    steps: [
      { label: R`Setting: $f$ is continuous on $R = \{|x - x_0| \le a,\; |y - y_0| \le b\}$, $|f| \le M$ on $R$, and $f$ is Lipschitz in $y$:`, katex: R`|f(x, y_1) - f(x, y_2)| \le K|y_1 - y_2|` },
      { label: R`Step 1: by the fundamental theorem of calculus, $y$ solves $y' = f(x,y),\; y(x_0) = y_0$ exactly when it solves the integral equation`, katex: R`y(x) = y_0 + \int_{x_0}^{x} f(t, y(t))\,dt` },
      { label: R`Step 2: choose $h = \min\{a,\; b/M,\; 1/(2K)\}$ and let $I = [x_0 - h, x_0 + h]$. The set below, with the sup norm, is a closed subset of the complete space $C(I)$, so it is a complete metric space:`, katex: R`X = \{ y \in C(I) : |y(x) - y_0| \le b \text{ for all } x \in I \}` },
      { label: R`Step 3: define $(Ty)(x) = y_0 + \int_{x_0}^{x} f(t, y(t))\,dt$. $T$ maps $X$ into $X$ because`, katex: R`|(Ty)(x) - y_0| \le M|x - x_0| \le Mh \le b` },
      { label: R`Step 4: $T$ is a contraction, using the Lipschitz condition:`, katex: R`|(Ty_1)(x) - (Ty_2)(x)| \le \left|\int_{x_0}^{x} K|y_1 - y_2|\,dt\right| \le Kh\,\|y_1 - y_2\|_\infty \le \tfrac12 \|y_1 - y_2\|_\infty` },
      { label: R`Step 5: by the Banach fixed-point theorem, $T$ has exactly one fixed point $y = Ty$ in $X$, and the Picard iterates $y_{k+1} = Ty_k$ converge to it uniformly. This fixed point is the unique solution of the initial value problem on $I$ (any solution satisfies $|y - y_0| \le M|x - x_0| \le b$, so it lies in $X$). $\blacksquare$`, katex: '' }
    ],
    answer: R`\text{Proved: a unique local solution exists on } [x_0 - h, x_0 + h]`
  },
  {
    title: 'Bolzano–Weierstrass theorem',
    match: (k) => /bolzano|weierstrass/.test(k) || (/boundedsequence/.test(k) && /convergentsubsequence/.test(k)),
    steps: [
      { label: R`Claim: every bounded sequence $(a_n)$ in $\mathbb{R}$ has a convergent subsequence.`, katex: '' },
      { label: R`Step 1 (monotone subsequence): call $m$ a peak if $a_m \ge a_n$ for all $n > m$. If there are infinitely many peaks $m_1 < m_2 < \dots$, then $a_{m_1} \ge a_{m_2} \ge \dots$ is decreasing. If there are finitely many, start after the last peak at $n_1$; since $n_1$ is not a peak there is $n_2 > n_1$ with $a_{n_2} > a_{n_1}$, and so on, giving an increasing subsequence.`, katex: '' },
      { label: R`Step 2: this monotone subsequence is bounded, so by the monotone convergence theorem (which follows from the least-upper-bound property of $\mathbb{R}$) it converges. $\blacksquare$`, katex: '' }
    ],
    answer: R`\text{Proved: every bounded real sequence has a convergent subsequence}`
  },
  {
    title: 'A convergent sequence is bounded',
    match: (k) => /convergentsequence/.test(k) && /bounded/.test(k) && !/cauchy|subsequence/.test(k),
    steps: [
      { label: R`Let $a_n \to L$. With $\varepsilon = 1$ there is $N$ such that $|a_n - L| < 1$ for $n \ge N$, so $|a_n| < |L| + 1$ for $n \ge N$.`, katex: '' },
      { label: R`Then every term is bounded by`, katex: R`M = \max\{|a_1|, \dots, |a_{N-1}|,\; |L| + 1\} \quad\blacksquare` }
    ],
    answer: R`\text{Proved: } |a_n| \le M \text{ for all } n`
  },
  {
    title: 'ℝ is uncountable (Cantor diagonal argument)',
    match: (k) => /uncountable/.test(k) && (/real|\br\b|\(0,1\)|\[0,1\]|isr|ofr/.test(k)),
    steps: [
      { label: R`Suppose the numbers in $(0,1)$ could be listed as $x_1, x_2, x_3, \dots$, with decimal expansions $x_i = 0.d_{i1}d_{i2}d_{i3}\dots$ (choose the expansion not ending in repeating 9s).`, katex: '' },
      { label: R`Build $y = 0.e_1e_2e_3\dots$ with $e_i = 5$ if $d_{ii} \ne 5$ and $e_i = 4$ if $d_{ii} = 5$.`, katex: '' },
      { label: R`Then $y \in (0,1)$ but $y$ differs from each $x_i$ in the $i$-th digit, so $y$ is not in the list. Contradiction: $(0,1)$, and therefore $\mathbb{R}$, is uncountable. $\blacksquare$`, katex: '' }
    ],
    answer: R`\text{Proved: } \mathbb{R} \text{ is uncountable}`
  },
  {
    title: 'Triangle inequality',
    match: (k) => /triangleinequality/.test(k) || /\|a\+b\|(≤|<=|le)\|a\|\+\|b\|/.test(k),
    steps: [
      { label: R`For real numbers, $-|a| \le a \le |a|$ and $-|b| \le b \le |b|$. Adding:`, katex: R`-(|a| + |b|) \le a + b \le |a| + |b|` },
      { label: R`This is exactly $|a + b| \le |a| + |b|$. $\blacksquare$`, katex: '' }
    ],
    answer: R`|a + b| \le |a| + |b|`
  },

  // ---------------- Algebra ----------------
  {
    title: 'If every element satisfies x² = e, the group is abelian',
    match: (k) => /abelian|commutative/.test(k) && /(x|a|g)\^?2=e|x\^\(?2\)?=e|orderatmost2|everyelement(has)?order(1or)?2/.test(k),
    steps: [
      { label: R`Step 1: for every $x \in G$, $x^2 = e$ means $x \cdot x = e$, so every element is its own inverse:`, katex: R`x^{-1} = x` },
      { label: R`Step 2: take any $a, b \in G$. Then $ab \in G$, so $(ab)^2 = e$ and`, katex: R`ab = (ab)^{-1} = b^{-1}a^{-1} = ba` },
      { label: R`Conclusion: $ab = ba$ for all $a, b \in G$, so $G$ is abelian. $\blacksquare$`, katex: '' }
    ],
    answer: R`\text{Proved: } ab = ba \text{ for all } a, b \in G`
  },
  {
    title: 'Every finite integral domain is a field',
    match: (k) => /finiteintegraldomain|integraldomain.*finite|finite.*integraldomain/.test(k) && /field/.test(k),
    steps: [
      { label: R`Let $D$ be a finite integral domain (commutative, $1 \ne 0$, no zero divisors). We must show every $a \ne 0$ has an inverse.`, katex: '' },
      { label: R`Step 1: fix $a \ne 0$ and define $\varphi_a : D \to D$ by $\varphi_a(x) = ax$.`, katex: '' },
      { label: R`Step 2: $\varphi_a$ is injective, because`, katex: R`ax = ay \Rightarrow a(x - y) = 0 \Rightarrow x - y = 0 \;(\text{no zero divisors, } a \ne 0) \Rightarrow x = y` },
      { label: R`Step 3: an injective map from a finite set to itself is also surjective, so $1$ is in the image: there is $b \in D$ with`, katex: R`ab = 1` },
      { label: R`Conclusion: every non-zero element is invertible, so $D$ is a field. $\blacksquare$`, katex: '' }
    ],
    answer: R`\text{Proved: a finite integral domain is a field}`
  },
  {
    title: 'Sylow p-subgroups are conjugate',
    match: (k) => /sylow/.test(k) && /conjugat/.test(k),
    steps: [
      { label: R`Let $|G| = p^a m$ with $p \nmid m$, and let $P, Q$ be Sylow $p$-subgroups ($|P| = |Q| = p^a$).`, katex: '' },
      { label: R`Step 1: let $Q$ act on the set of left cosets $G/P$ by left multiplication, $q \cdot gP = qgP$. This set has $[G : P] = m$ elements, and $p \nmid m$.`, katex: '' },
      { label: R`Step 2: by the orbit–stabiliser theorem every orbit has size dividing $|Q| = p^a$, so each orbit has size $1$ or a multiple of $p$. Since the orbit sizes add up to $m$ and $p \nmid m$, at least one orbit has size 1: there is a coset $gP$ with`, katex: R`qgP = gP \quad \text{for all } q \in Q` },
      { label: R`Step 3: $qgP = gP$ means $g^{-1}qg \in P$ for every $q \in Q$, so $g^{-1}Qg \subseteq P$. Both have order $p^a$, hence`, katex: R`g^{-1}Qg = P \quad\Longleftrightarrow\quad Q = gPg^{-1}` },
      { label: R`Conclusion: any two Sylow $p$-subgroups are conjugate. $\blacksquare$`, katex: '' }
    ],
    answer: R`\text{Proved: } Q = gPg^{-1} \text{ for some } g \in G`
  },
  {
    title: "Lagrange's theorem",
    match: (k) => (/lagrange'?s?theorem/.test(k) && !/multiplier|interpolation|meanvalue/.test(k)) || (/lagrange/.test(k) && /subgroup/.test(k)) || (/orderofasubgroup/.test(k) && /divides/.test(k)),
    steps: [
      { label: R`Let $H \le G$ with $G$ finite. The left cosets $gH$ partition $G$: two cosets are either equal or disjoint, since $g_1H \cap g_2H \ne \emptyset$ implies $g_1H = g_2H$.`, katex: '' },
      { label: R`Each coset has exactly $|H|$ elements, because $h \mapsto gh$ is a bijection $H \to gH$.`, katex: '' },
      { label: R`If there are $k = [G:H]$ cosets, then`, katex: R`|G| = k\,|H| \;\Rightarrow\; |H| \text{ divides } |G| \quad\blacksquare` }
    ],
    answer: R`|H| \text{ divides } |G|`
  },
  {
    title: 'The kernel of a homomorphism is a normal subgroup',
    match: (k) => /kernel/.test(k) && /normal/.test(k),
    steps: [
      { label: R`Let $\varphi : G \to H$ be a homomorphism and $K = \ker\varphi = \{g : \varphi(g) = e_H\}$.`, katex: '' },
      { label: R`Subgroup: $\varphi(e) = e$, and for $a, b \in K$ we have $\varphi(ab^{-1}) = \varphi(a)\varphi(b)^{-1} = e$, so $ab^{-1} \in K$.`, katex: '' },
      { label: R`Normal: for $k \in K$ and $g \in G$,`, katex: R`\varphi(gkg^{-1}) = \varphi(g)\,e\,\varphi(g)^{-1} = e \;\Rightarrow\; gkg^{-1} \in K \quad\blacksquare` }
    ],
    answer: R`\ker\varphi \trianglelefteq G`
  },
  {
    title: 'ℚ(√2, √3) is Galois over ℚ',
    match: (k) => /galois|degree|extension/.test(k) && /(√|sqrt)\(?2/.test(k) && /(√|sqrt)\(?3/.test(k),
    steps: [
      { label: R`Step 1: $x^2 - 2$ is irreducible over $\mathbb{Q}$ (Eisenstein with $p = 2$), so $[\mathbb{Q}(\sqrt2) : \mathbb{Q}] = 2$.`, katex: '' },
      { label: R`Step 2: $\sqrt3 \notin \mathbb{Q}(\sqrt2)$. If $\sqrt3 = a + b\sqrt2$ with $a, b \in \mathbb{Q}$, then $3 = a^2 + 2b^2 + 2ab\sqrt2$, so $ab = 0$. If $b = 0$, then $\sqrt3 = a$ is rational; if $a = 0$, then $\sqrt{3/2} = b$ is rational. Both are impossible, so $x^2 - 3$ stays irreducible over $\mathbb{Q}(\sqrt2)$:`, katex: R`[\mathbb{Q}(\sqrt2, \sqrt3) : \mathbb{Q}(\sqrt2)] = 2` },
      { label: R`Step 3 (tower law):`, katex: R`[\mathbb{Q}(\sqrt2, \sqrt3) : \mathbb{Q}] = 2 \cdot 2 = 4, \qquad \text{basis } \{1, \sqrt2, \sqrt3, \sqrt6\}` },
      { label: R`Step 4 (Galois): $\mathbb{Q}(\sqrt2, \sqrt3)$ is the splitting field of $(x^2 - 2)(x^2 - 3)$ over $\mathbb{Q}$, since it contains all the roots $\pm\sqrt2, \pm\sqrt3$. A splitting field is normal, and in characteristic 0 every polynomial is separable, so the extension is Galois.`, katex: '' },
      { label: R`Step 5 (Galois group): an automorphism must send $\sqrt2 \mapsto \pm\sqrt2$ and $\sqrt3 \mapsto \pm\sqrt3$. All 4 choices work, since $|\text{Gal}| = $ degree $= 4$:`, katex: R`\{\text{id},\; \sigma: \sqrt2 \mapsto -\sqrt2,\; \tau: \sqrt3 \mapsto -\sqrt3,\; \sigma\tau\}` },
      { label: R`Every non-identity element has order 2, so the group is the Klein four-group:`, katex: R`\text{Gal}(\mathbb{Q}(\sqrt2,\sqrt3)/\mathbb{Q}) \cong \mathbb{Z}_2 \times \mathbb{Z}_2 \quad \text{(intermediate fields } \mathbb{Q}(\sqrt2), \mathbb{Q}(\sqrt3), \mathbb{Q}(\sqrt6))` }
    ],
    answer: R`\text{Galois, degree } 4, \; \text{Gal} \cong \mathbb{Z}_2 \times \mathbb{Z}_2`
  },
  {
    title: 'Diagonalizable ⇔ minimal polynomial has distinct linear factors',
    match: (k) => /diagonali[sz]able/.test(k) && /minimal(polynomial)?/.test(k),
    steps: [
      { label: R`($\Rightarrow$) Suppose $V$ has a basis of eigenvectors of $T$ with distinct eigenvalues $\lambda_1, \dots, \lambda_k$. Let $p(t) = \prod_{i=1}^{k}(t - \lambda_i)$. For a basis vector $v$ with $Tv = \lambda_j v$, the factor $(T - \lambda_j I)$ kills $v$, and the factors commute, so $p(T)v = 0$. Hence $p(T) = 0$ and $m_T \mid p$. Every eigenvalue is a root of $m_T$, so`, katex: R`m_T(t) = (t - \lambda_1)\cdots(t - \lambda_k) \quad \text{(distinct linear factors)}` },
      { label: R`($\Leftarrow$) Suppose $m_T(t) = \prod_{i=1}^{k}(t - \lambda_i)$ with the $\lambda_i$ distinct. Define the Lagrange polynomials`, katex: R`\ell_i(t) = \prod_{j \ne i} \frac{t - \lambda_j}{\lambda_i - \lambda_j}, \qquad \sum_{i=1}^{k} \ell_i(t) = 1` },
      { label: R`(The sum has degree $< k$ and equals 1 at the $k$ points $\lambda_i$, so it is the constant 1.) Hence $I = \sum_i \ell_i(T)$, and every $v \in V$ splits as $v = \sum_i \ell_i(T)v$.`, katex: '' },
      { label: R`Each piece is an eigenvector or zero, since $(t - \lambda_i)\ell_i(t)$ is a constant multiple of $m_T(t)$:`, katex: R`(T - \lambda_i I)\,\ell_i(T)v = c_i\, m_T(T)v = 0 \;\Rightarrow\; \ell_i(T)v \in E_{\lambda_i}` },
      { label: R`So $V = E_{\lambda_1} + \dots + E_{\lambda_k}$. Eigenspaces for distinct eigenvalues are independent, so the sum is direct and the union of bases of the $E_{\lambda_i}$ is a basis of eigenvectors: $T$ is diagonalizable. $\blacksquare$`, katex: '' }
    ],
    answer: R`T \text{ diagonalizable} \iff m_T \text{ splits into distinct linear factors}`
  },

  // ---------------- Topology / metric spaces ----------------
  {
    title: 'Compact subsets of a metric space are closed and bounded',
    match: (k) => /compact/.test(k) && /closed/.test(k) && /bounded/.test(k),
    steps: [
      { label: R`Let $K$ be a compact subset of a metric space $(X, d)$.`, katex: '' },
      { label: R`Closed: let $p \notin K$. For each $q \in K$ let $r_q = \tfrac12 d(p, q) > 0$. The balls $B(q, r_q)$ cover $K$, so finitely many do, say for $q_1, \dots, q_n$. Let $r = \min_i r_{q_i}$. Then $B(p, r)$ meets none of the $B(q_i, r_{q_i})$, so $B(p, r) \subseteq X \setminus K$. The complement is open, hence $K$ is closed.`, katex: '' },
      { label: R`Bounded: fix $x_0 \in X$. The balls $B(x_0, n)$, $n = 1, 2, \dots$ cover $K$; a finite subcover gives $K \subseteq B(x_0, N)$, so $K$ is bounded.`, katex: '' },
      { label: R`The converse fails in general. Take $X = \mathbb{R}$ with the discrete metric $d(x,y) = 1$ for $x \ne y$. Then $X$ is closed (it is the whole space) and bounded (diameter 1). But the open cover by singletons $\{x\} = B(x, \tfrac12)$ has no finite subcover, so $X$ is not compact.`, katex: R`\text{(In } \mathbb{R}^n \text{ the converse does hold: Heine–Borel theorem.)}` }
    ],
    answer: R`\text{Proved; converse fails, e.g. } \mathbb{R} \text{ with the discrete metric}`
  },
  {
    title: 'X is connected ⇔ every continuous map X → {0, 1} is constant',
    match: (k) => /connected/.test(k) && /constant/.test(k) && /0,1|discrete/.test(k),
    steps: [
      { label: R`($\Rightarrow$) Let $X$ be connected and $f : X \to \{0,1\}$ continuous, with $\{0,1\}$ discrete. The sets $\{0\}$ and $\{1\}$ are open, so $U = f^{-1}(0)$ and $V = f^{-1}(1)$ are open, disjoint, and $U \cup V = X$. Since $X$ is connected, one of them is empty, so $f$ is constant.`, katex: '' },
      { label: R`($\Leftarrow$) Suppose $X$ is not connected: $X = U \cup V$ with $U, V$ non-empty, open and disjoint. Define $f = 0$ on $U$ and $f = 1$ on $V$. The preimages of the open sets $\emptyset, \{0\}, \{1\}, \{0,1\}$ are $\emptyset, U, V, X$, all open. So $f$ is continuous but not constant.`, katex: '' },
      { label: R`By contraposition, if every continuous $f : X \to \{0,1\}$ is constant, then $X$ is connected. $\blacksquare$`, katex: '' }
    ],
    answer: R`X \text{ connected} \iff \text{every continuous } f: X \to \{0,1\} \text{ is constant}`
  },

  // ---------------- Number theory ----------------
  {
    title: '√2 is irrational',
    match: (k) => /irrational/.test(k) && /(√|sqrt)\(?2\)?(?!,)/.test(k) && !/galois|(√|sqrt)\(?3/.test(k),
    steps: [
      { label: R`Suppose $\sqrt2 = \frac{p}{q}$ with integers $p, q$, $q \ne 0$, in lowest terms.`, katex: '' },
      { label: R`Then $p^2 = 2q^2$, so $p^2$ is even, hence $p$ is even: $p = 2r$.`, katex: R`4r^2 = 2q^2 \Rightarrow q^2 = 2r^2` },
      { label: R`So $q$ is even too, contradicting lowest terms. Hence $\sqrt2$ is irrational. $\blacksquare$`, katex: '' }
    ],
    answer: R`\sqrt2 \notin \mathbb{Q}`
  },
  {
    title: 'There are infinitely many primes (Euclid)',
    match: (k) => /infinitely(many)?primes|primes.*infinite|infinitenumberofprimes/.test(k),
    steps: [
      { label: R`Suppose there were only finitely many primes $p_1, \dots, p_n$. Consider`, katex: R`N = p_1 p_2 \cdots p_n + 1` },
      { label: R`$N > 1$, so it has a prime factor $p$. But dividing $N$ by any $p_i$ leaves remainder 1, so $p$ is none of the $p_i$. Contradiction: there are infinitely many primes. $\blacksquare$`, katex: '' }
    ],
    answer: R`\text{Proved: there are infinitely many primes}`
  },
  {
    title: '1 + 2 + … + n = n(n+1)/2 (induction)',
    match: (k) => /induction|prove/.test(k) && /1\+2\+3?\+?(\.\.\.|…|cdots|dots|ldots)\+?n=/.test(k),
    steps: [
      { label: R`$P(n): 1 + 2 + \dots + n = \frac{n(n+1)}{2}$.`, katex: '' },
      { label: R`Base case $n = 1$:`, katex: R`1 = \frac{1 \cdot 2}{2}` },
      { label: R`Inductive step: assume $P(k)$. Then`, katex: R`1 + \dots + k + (k+1) = \frac{k(k+1)}{2} + (k+1) = \frac{(k+1)(k+2)}{2}` },
      { label: R`So $P(k+1)$ holds, and by induction $P(n)$ holds for all $n \ge 1$. $\blacksquare$`, katex: '' }
    ],
    answer: R`\sum_{i=1}^{n} i = \frac{n(n+1)}{2}`
  }
];

function solveProofQuestion(keyText) {
  for (const p of PROOFS) {
    if (p.match(keyText)) {
      return {
        answer: p.answer,
        steps: [{ label: `Theorem: ${p.title}`, katex: '' }, ...p.steps],
        proof: true
      };
    }
  }
  return null;
}

module.exports = { solveProofQuestion, PROOFS };
