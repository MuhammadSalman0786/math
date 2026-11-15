# All Math Solver app: install from the website + Google Play

The website is now an installable app (a **PWA**). The same app is published on Google Play as a
**Trusted Web Activity (TWA)**: a small Android wrapper that opens your site full-screen, without a
browser bar. There is one codebase: every time you deploy the website, the app updates too, and you
don't need to upload a new version to Play.

---

## Part 1: install from the website (already working)

After you deploy:

* **Android (Chrome):** open the site. An **Install App** button appears in the header on wider
  screens, and an **Install the app** card in the mobile menu. Chrome also offers "Add to Home
  screen" / "Install app" in its menu.
* **Windows / Mac (Chrome, Edge):** the **Install App** button in the header, or the install icon
  in the address bar.
* **iPhone (Safari):** Share → **Add to Home Screen**. Apple doesn't let websites show their own
  install button.

What the app does:

* Opens like a normal app with its own icon (the AMS logo), with no address bar.
* Long-press the icon for shortcuts: Math Solver, Quadratic, Percentage, LCM.
* **Works offline:** all pages, guides and your recent history open without internet. A banner
  says when you're offline. Solving needs internet, because the maths engine runs on your server.
* **Updates itself:** every deploy changes the service worker version automatically
  (`src/app/pwa.js`), so installed apps download the new files.

Files: `public/site.webmanifest`, `public/sw.js`, `public/offline.html`, `public/js/pwa.js`,
`public/icons/`, `src/app/pwa.js`.

> Installing needs **HTTPS** on your real domain (Render gives you this). It won't install from a
> plain `http://` address, except `localhost` for testing.

---

## Part 2: publish on Google Play

### What you need

1. A **Google Play Console** developer account (one-time US$25 fee): https://play.google.com/console
2. The website deployed on its final domain with `SITE_URL` set (e.g. `https://allmathsolver.com`).
3. About 30 minutes, plus the waiting time for testing and review (see step 6).

### Step 1: build the Android package with PWABuilder (free, made by Microsoft)

1. Open **https://www.pwabuilder.com** and enter your site address, e.g. `https://allmathsolver.com`.
2. It checks the manifest, service worker and icons. All three should be green.
3. Click **Package For Stores** → **Android** → **Generate Package**. Use these settings:
   * **Package ID:** `com.allmathsolver.app` (you can never change this after publishing)
   * **App name:** `All Math Solver` · **Short name:** `All Math Solver`
   * **Version code:** `1` · **Version name:** `1.0.0`
   * **Host / Start URL:** your domain, and `/?source=app`
   * **Theme colour:** `#7a8dd3` · **Background colour:** `#ffffff`
   * **Display mode:** Standalone · **Notifications:** off
   * **Signing key:** *Create new* (fill in your name and organisation). PWABuilder generates it.
4. Download the zip. It contains:
   * `*.aab`: the file you upload to Google Play
   * `*.apk`: install it directly on your own phone to test
   * `signing.keystore` and `signing-key-info.txt`: **keep both safe forever** (Google Drive plus a
     USB stick). You need them for every future app update.
   * `assetlinks.json`: you only need the fingerprint inside it (step 3).

### Step 2: create the app in Play Console

1. Play Console → **Create app** → name `All Math Solver`, default language English (United
   States), type **App**, **Free**.
2. **Test and release → App integrity:** keep **Play App Signing** on (recommended).
3. Upload the `.aab` to a **testing track** first (see step 6).

### Step 3: connect the app to your website (removes the browser bar)

Android only opens the app full-screen if your website confirms that it owns the app. This server
creates `/.well-known/assetlinks.json` for you from two environment variables on Render:

| Variable | Value |
|---|---|
| `TWA_PACKAGE_NAME` | `com.allmathsolver.app` |
| `TWA_SHA256_FINGERPRINTS` | the SHA-256 fingerprints, comma separated (see below) |

Get **two** fingerprints:

1. **Your upload key:** `signing-key-info.txt` from PWABuilder (the "SHA-256" line).
2. **Google's app signing key:** Play Console → your app → **Test and release → App integrity →
   App signing** → "App signing key certificate" → **SHA-256 certificate fingerprint**.

Example:

```
TWA_SHA256_FINGERPRINTS=AB:CD:...:12,34:56:...:EF
```

Save, redeploy, then open `https://YOUR-DOMAIN/.well-known/assetlinks.json`: it should show your
package name and both fingerprints. Check it with Google's tool:
https://developers.google.com/digital-asset-links/tools/generator

If the app shows an address bar at the top, the fingerprints don't match. Re-check both values.

### Step 4: store listing (images are ready in `public/icons/`)

| Play Store field | File / text |
|---|---|
| App icon (512×512) | `public/icons/play-store-icon-512.png` |
| Feature graphic (1024×500) | `public/icons/play-feature-graphic-1024x500.png` |
| Phone screenshots (2 to 8) | `public/icons/screenshot-phone-1.png`, `screenshot-phone-2.png` (take a few more on your phone, e.g. the quadratic, LCM and percentage pages) |
| Short description (max 80) | `Free step-by-step math solver: algebra, calculus, proofs, LCM, % and more.` |
| Category | Education |
| Privacy policy URL | `https://YOUR-DOMAIN/privacy-policy` |
| Contact email | your support email |

Suggested **full description**:

```
All Math Solver explains every answer step by step, so you learn the method and don't just copy the result.

• Math solver: arithmetic (BODMAS / PEMDAS), fractions, equations, factorising, square roots
• Calculus: derivatives, integrals (including by parts), limits with L'Hôpital's rule
• Quadratic equation calculator with the discriminant, factorising and complex roots
• Mathematical induction solver: full proofs of sum formulas and divisibility
• LCM and GCF / HCF calculators with prime factorisation and Euclid's algorithm
• Percentage calculator: % of a number, % change, increase and decrease
• Proportion solver, age calculator and AC to DC voltage calculator
• Clear guides: the quadratic formula, induction, ratio and proportion
• Recent history, dark mode, and pages that work offline
• 9 languages: English, Italian, German, French, Spanish, Indonesian, Arabic, Dutch, Turkish

For high school, GCSE, A-level, SAT, AP, CBSE and JEE students, college students and teachers in the UK, US, Canada, India and worldwide.
```

### Step 5: Play Console forms

* **Content rating** questionnaire: Education, no violence and so on → rated "Everyone".
* **Target audience:** choose **13+** (or 18+). If you pick ages under 13, Google's Families
  policy applies, which has extra rules for sign-in and ads.
* **Data safety:** the app collects **name and email address** (only if the user creates an
  account or sends a contact message) and **app activity** (calculation history for signed-in
  users). The data is **encrypted in transit** (HTTPS), **not shared** with third parties, and
  users can ask for deletion through the contact page. If you later add analytics or ads, update
  this form.
* **Ads:** "No, my app does not contain ads" (change this if you add ads later).

### Step 6: testing and launch

Google requires testing first for new personal developer accounts:

* If your developer account is a **personal account created after 13 November 2023**, you must
  run a **closed test with at least 12 testers who stay opted in for 14 days in a row** before
  you can apply for production. Ask classmates, friends and family. They join with their Gmail
  address through the testing link.
* **Organisation accounts** (which need a D-U-N-S number) don't have this rule.
* After the test, click **Apply for production**. Google usually decides within a few days, and
  then the app goes live.

### Updating the app later

* **Content, calculators, design:** just deploy the website. The app updates by itself; no Play
  upload is needed.
* **App name, icon, splash colours or package settings:** generate a new package in PWABuilder
  with the **same package ID and the same signing.keystore**, increase the **version code**
  (2, 3, ...), and upload the new `.aab`.
