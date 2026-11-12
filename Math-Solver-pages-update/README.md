# AllMath AI Solver

Step-by-step math solver with accounts and saved history.

## Running locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

For local testing no settings are required: email/password sign-up works out of the box,
and accounts and history are saved in `data/database.json`.

## Settings (environment variables)

Copy `.env.example` and fill in the values on your host (on Vercel: *Project → Settings → Environment Variables*).

| Variable | Needed for | What to put |
|---|---|---|
| `SESSION_SECRET` | Login sessions (**required in production**) | A long random string (32+ characters). If it is missing, everyone is logged out whenever the server restarts. |
| `GOOGLE_CLIENT_ID` | "Sign in with Google" | Your OAuth Client ID from Google Cloud Console. If empty, the Google button tells people to use email instead. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Saving data on Vercel | From the free **Upstash for Redis** integration on Vercel (it adds these automatically; `KV_REST_API_URL` / `KV_REST_API_TOKEN` also work). |

### Google sign-in setup
1. Google Cloud Console → *APIs & Services → Credentials → Create credentials → OAuth client ID → Web application*.
2. Under **Authorized JavaScript origins** add your site address (e.g. `https://your-site.vercel.app`) and `http://localhost:3000`.
3. Put the Client ID in `GOOGLE_CLIENT_ID`. (The Client ID is public; there is no client secret to configure.)

The server checks every Google sign-in with Google (signature, expiry, that it was issued for your Client ID, and that the email is verified).

### Why Redis on Vercel?
Vercel does not let a website write to its own files, so `data/database.json` cannot be used there.
Without Redis the app still runs, but accounts and history are kept only temporarily.

## SEO: page URLs, sitemap and robots.txt
Every tool and article has its own URL, rendered on the server with its own title, description,
canonical link, Open Graph tags and structured data:

| Page | URL |
|---|---|
| Math solver (home) | `/` |
| Mathematical induction solver | `/mathematical-induction-solver` |
| Quadratic equation calculator | `/quadratic-equation-calculator` |
| LCM calculator | `/lcm-calculator` |
| GCF / HCF / GCD calculator | `/gcf-calculator` |
| Percentage calculator | `/percentage-calculator` |
| Proportion calculator & solver | `/proportion-calculator` |
| Age calculator | `/age-calculator` |
| AC to DC calculator | `/ac-to-dc-calculator` |
| About / Contact | `/about`, `/contact` |
| Blog | `/blog`, `/blog/quadratic-formula`, `/blog/mathematical-induction`, `/blog/ac-to-dc-rectification`, `/blog/ratio-and-proportion` |
| Privacy / Terms | `/privacy-policy`, `/terms-and-conditions` |

- `/robots.txt` and `/sitemap.xml` are generated automatically (new routes and articles are included).
- Old links such as `/#about` are forwarded to the new URLs; `/about/`, `/privacy`, `/math-solver` etc. redirect with 301.
  Common alternative names also redirect: `/hcf-calculator` and `/gcd-calculator` → `/gcf-calculator`, `/percent-calculator`,
  `/quadratic-calculator`, `/induction-solver`, `/proportion-solver`.
- To add a calculator page: add a route in `public/js/site-routes.js`, its heading in `CALC_TEXT` (`src/seo/pages.js`) and
  `CALC_MODES` (`public/js/app.js`), its text and FAQs in `src/seo/content.js`, and a description card in `public/index.html`.
- Unknown URLs return a real **404** (not the home page).
- Each URL's HTML contains **only that page's content** and exactly **one H1** (other pages are fetched by the browser
  only when the visitor navigates), so pages don't look like duplicates of each other.
- Calculator pages each have their own description, how-to, example and FAQs (with `FAQPage` structured data);
  blog posts have full `Article` structured data. FAQ/how-to text lives in `src/seo/content.js`.
- Favicons and a web manifest are in `public/` (`favicon.ico`, `apple-touch-icon.png`, `site.webmanifest`).

### Moving to allmathsolver.com
1. Add the custom domain in Render (Settings → Custom Domains) and point your DNS to it; wait until
   `https://allmathsolver.com` opens your site.
2. In Render → Environment, set `SITE_URL=https://allmathsolver.com` and redeploy.
   - Canonical links, `og:url`, structured data, `robots.txt` and `sitemap.xml` then all use allmathsolver.com.
   - Visits to `math-1-ks0v.onrender.com`, `www.allmathsolver.com` or `http://` are **301-redirected** to
     `https://allmathsolver.com` (same path), so Google moves its index to the new domain.
3. In Google Search Console add `allmathsolver.com` and submit `https://allmathsolver.com/sitemap.xml`.
   The 301 redirects tell Google the onrender pages have moved.

Do **not** set `SITE_URL` before the domain works, or visitors will be redirected to a domain that doesn't load yet.

### Audience: India, UK, US and Canada
- Wording is international (high school, A-level, college); titles say "Math & Maths" so both US and UK searches match.
- Pages declare English for all regions (`hreflang="en"` + `x-default`, `og:locale` en_US with en_GB/en_IN/en_CA).
- AC/DC examples use 230 V (UK, India) and 120 V (US, Canada).
- Server region: `render.yaml` uses **ohio**. Render cannot move an existing service to another region: create a new
  web service in Ohio (or deploy `render.yaml` as a Blueprint), copy the environment variables, move the custom
  domain to it, then delete the old service. Putting Cloudflare (free) in front of the domain also speeds up the
  site for visitors in the UK and India.

### Render free plan: cold starts
On the free plan Render puts the app to sleep after ~15 minutes without visits; the next visit waits ~30–60 s
(and Google may see a 503). This can't be fixed in code. Options:
- **Free:** create a free monitor at UptimeRobot or cron-job.org that requests `https://allmathsolver.com/healthz`
  every 10 minutes. This keeps the app awake (one always-on service fits in Render's free monthly hours).
- **Best:** Render's paid Starter plan never sleeps.
- Pages and their titles/descriptions are listed in `public/js/site-routes.js`; articles in `public/js/blog-data.js`
  (add an entry with a `slug` and it gets its own URL and sitemap entry).

**After deploying:** open Google Search Console → add your domain → *Sitemaps* → submit `https://your-domain/sitemap.xml`.
Then use *URL Inspection* on a few pages (e.g. `/age-calculator`) and click *Request indexing*.

## Security notes
- Passwords are stored as salted scrypt hashes, never as plain text.
- After signing in, the browser receives a signed login token; history is looked up from that token only,
  so nobody can read another person's history by sending their email address.
- Anonymous calculations are not saved.
- The old public `/api/auth/users` endpoint has been removed.

## Solver features
**Basics:** arithmetic with correct order of operations and exact fractions; linear, quadratic (incl. complex roots) and factorable polynomial equations; expanding/factoring; rational expressions with cancellation and domain restrictions; square roots; set membership; proportions; age and AC→DC calculators.

**Calculator pages:** quadratic equations from a, b, c (discriminant, factorising, quadratic formula, sum/product of roots, vertex); LCM and GCF/HCF of up to 10 numbers (prime factorisation + Euclid's algorithm); percentages (X% of Y, X as a % of Y, % change, % increase/decrease).

**Mathematical induction (general prover):** sum formulas with polynomial, rational or power terms (`1 + 3 + … + (2n−1) = n²`, `\sum_{i=1}^{n} i^3 = …`, `1 + 2 + … + 2^{n−1} = 2^n − 1`, telescoping fractions) and divisibility statements (`n³ − n is divisible by 6`, `7^n − 3^n is divisible by 4`, `3^{2n} − 1 is divisible by 8`). False formulas are reported with the first value of n that fails.

**Intermediate → Master's level** (general solvers, so different numbers work too):
- Exponential equations reducible to quadratics (`2^{2x} − 5·2^x + 4 = 0`, `e^{2x} − 3e^x + 2 = 0`)
- Derivatives with product/chain-rule steps (`Find dy/dx if y = x² sin 3x`, `d/dx (…)`)
- Integrals: power rule, substitution-type basics, integration by parts (`∫ x eˣ dx`, `∫ x² cos 2x dx`), `ln`, inverse trig, `eᵃˣ sin bx`; definite and improper integrals
- Limits with L'Hôpital's rule, including `1^∞` forms
- Arithmetic and geometric progressions (n-th term, sum of n terms)
- Circle through three points
- Eigenvalues and eigenvectors of 2×2 and 3×3 matrices
- Series convergence (p-series, integral test, geometric, ratio, comparison, alternating)
- Linear ODEs with constant coefficients (1st/2nd order, undetermined coefficients, resonance, initial conditions at 0)
- Double integrals over regions between two curves
- Green's theorem on circles
- Laurent series of `1/((z−a)(z−b))` in a given annulus
- Real integrals `∫_{−∞}^{∞} R(x) dx` by residues
- Heat equation by separation of variables

**Proofs:** written, step-by-step proofs for standard theorems (Cauchy sequences, uniform continuity, groups with x² = e, finite integral domains, diagonalizability and minimal polynomials, compactness in metric spaces, Galois group of ℚ(√2, √3), Riemann–Lebesgue, Sylow conjugacy, connectedness, Picard–Lindelöf, √2 irrational, infinitely many primes, Lagrange, Bolzano–Weierstrass, and more). These are recognised from the wording of the question; a website cannot invent new proofs, so new theorems must be added to `src/math/proofs.js`.

**Recent history** is kept in the visitor's browser (works signed out and offline from the server) and, when signed in, merged with the server copy so it also appears on other devices.
