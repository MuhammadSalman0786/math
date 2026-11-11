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

## Security notes
- Passwords are stored as salted scrypt hashes, never as plain text.
- After signing in, the browser receives a signed login token; history is looked up from that token only,
  so nobody can read another person's history by sending their email address.
- Anonymous calculations are not saved.
- The old public `/api/auth/users` endpoint has been removed.

## Solver features
**Basics:** arithmetic with correct order of operations and exact fractions; linear, quadratic (incl. complex roots) and factorable polynomial equations; expanding/factoring; rational expressions with cancellation and domain restrictions; square roots; set membership; proportions; age and AC→DC calculators.

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
