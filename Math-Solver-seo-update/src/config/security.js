// Login sessions, password hashing and small input-cleaning helpers.
// Uses only Node's built-in crypto module (no extra packages needed).

const crypto = require('crypto');

const fs = require('fs');
const path = require('path');

// Picks a signing key that stays the same across restarts and across server copies:
// 1. SESSION_SECRET (best), 2. derived from the Redis token (shared by all copies),
// 3. a random key saved in data/.session-secret (normal servers / your computer),
// 4. a random in-memory key (last resort; users get logged out on restart).
function resolveSecret() {
  const env = process.env.SESSION_SECRET;
  if (env && env.length >= 16) return env;

  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (redisToken) {
    console.warn('[auth] SESSION_SECRET not set; deriving the session key from the Redis token. Setting SESSION_SECRET is still recommended.');
    return crypto.createHash('sha256').update('allmath-session-v1:' + redisToken).digest('hex');
  }

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!isServerless) {
    try {
      const file = path.join(__dirname, '../../data/.session-secret');
      if (fs.existsSync(file)) {
        const saved = fs.readFileSync(file, 'utf8').trim();
        if (saved.length >= 32) return saved;
      }
      const fresh = crypto.randomBytes(32).toString('hex');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, fresh, { mode: 0o600 });
      return fresh;
    } catch (e) { /* fall through */ }
  }

  console.warn('[auth] WARNING: SESSION_SECRET is not set. Using a temporary key, so sign-ins will not last. ' +
    'Set SESSION_SECRET to a long random string in your hosting settings.');
  return crypto.randomBytes(32).toString('hex');
}

const SECRET = resolveSecret();

const SESSION_DAYS = 30;

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function sign(data) {
  return b64url(crypto.createHmac('sha256', SECRET).update(data).digest());
}

function createSessionToken(email) {
  const payload = b64url(JSON.stringify({
    email: String(email).toLowerCase(),
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  }));
  return `${payload}.${sign(payload)}`;
}

// Returns the email inside a valid, unexpired token, otherwise null.
function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    if (!data.email || !data.exp || data.exp < Date.now()) return null;
    return data.email;
  } catch (e) {
    return null;
  }
}

// Express middleware: sets req.userEmail when a valid "Authorization: Bearer <token>" is sent.
function attachUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  req.userEmail = verifySessionToken(token);
  next();
}

function requireUser(req, res, next) {
  if (!req.userEmail) {
    return res.status(401).json({ success: false, error: 'Please sign in first.' });
  }
  next();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function checkPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt:')) return false;
  const [, salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64);
  const known = Buffer.from(hash, 'hex');
  return known.length === test.length && crypto.timingSafeEqual(known, test);
}

// Keep names as plain text: strip angle brackets/control chars and limit length.
function cleanName(name) {
  return String(name || '')
    .replace(/[<>"'`\u0000-\u001f]/g, '')
    .trim()
    .slice(0, 60);
}

function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}

module.exports = {
  createSessionToken,
  verifySessionToken,
  attachUser,
  requireUser,
  hashPassword,
  checkPassword,
  cleanName,
  isValidEmail
};
