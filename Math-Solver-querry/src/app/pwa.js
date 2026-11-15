// Installable app support: service worker with an automatic build version, and the
// Digital Asset Links file that lets the Google Play app (Trusted Web Activity) open
// the site full-screen without a browser bar.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUBLIC = path.join(__dirname, '..', '..', 'public');
// Files whose changes should make installed apps download a fresh copy
const VERSIONED = ['index.html', 'css/style.css', 'js/app.js', 'js/lang.js', 'js/site-routes.js', 'js/blog-data.js', 'sw.js', 'offline.html', 'site.webmanifest'];

let cached = null;
function buildServiceWorker() {
  if (cached && process.env.NODE_ENV === 'production') return cached;
  const hash = crypto.createHash('sha256');
  for (const f of VERSIONED) { try { hash.update(fs.readFileSync(path.join(PUBLIC, f))); } catch (e) { /* missing file */ } }
  // page text also comes from these server files
  for (const f of ['../src/seo/content.js', '../src/seo/pages.js']) { try { hash.update(fs.readFileSync(path.join(PUBLIC, f))); } catch (e) { } }
  const version = hash.digest('hex').slice(0, 12);
  const body = fs.readFileSync(path.join(PUBLIC, 'sw.js'), 'utf8').replace("const BUILD = '__BUILD__';", `const BUILD = '${version}';`);
  cached = { version, body };
  return cached;
}

exports.serviceWorker = (req, res) => {
  const { body } = buildServiceWorker();
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache'); // browsers must always check for a new version
  res.setHeader('Service-Worker-Allowed', '/');
  res.end(body);
};

exports.version = () => buildServiceWorker().version;

// /.well-known/assetlinks.json
//   TWA_PACKAGE_NAME          e.g. com.allmathsolver.app
//   TWA_SHA256_FINGERPRINTS   one or more SHA-256 certificate fingerprints, comma separated
//                             (Play Console > App integrity > App signing key certificate)
exports.assetLinks = (req, res) => {
  const pkg = (process.env.TWA_PACKAGE_NAME || '').trim();
  const prints = (process.env.TWA_SHA256_FINGERPRINTS || '').split(',').map(s => s.trim().toUpperCase()).filter(s => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  if (!pkg || !prints.length) return res.end('[]');
  res.end(JSON.stringify([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: prints }
  }], null, 2));
};
