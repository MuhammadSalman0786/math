const db = require('../config/database');
const {
  createSessionToken, hashPassword, checkPassword, cleanName, isValidEmail
} = require('../config/security');

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();

// Small brute-force guard: max 10 failed password attempts per email per 15 minutes.
const failedAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
function tooManyAttempts(email) {
  const rec = failedAttempts.get(email);
  if (!rec || Date.now() - rec.first > WINDOW_MS) return false;
  return rec.count >= 10;
}
function recordFailure(email) {
  const rec = failedAttempts.get(email);
  if (!rec || Date.now() - rec.first > WINDOW_MS) failedAttempts.set(email, { first: Date.now(), count: 1 });
  else rec.count++;
}

function loginResponse(res, user) {
  res.json({ success: true, user: db.publicUser(user), token: createSessionToken(user.email) });
}

// Asks Google to check the ID token's signature and expiry, then checks it was
// issued for THIS website (aud) and that the email is verified.
async function verifyGoogleIdToken(idToken) {
  const res = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  if (!res.ok) return null;
  const info = await res.json();
  if (info.aud !== GOOGLE_CLIENT_ID) return null;
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(info.iss)) return null;
  if (info.email_verified !== true && info.email_verified !== 'true') return null;
  if (!info.email || Number(info.exp) * 1000 < Date.now()) return null;
  return info;
}

exports.getConfig = (req, res) => {
  res.json({ success: true, googleClientId: GOOGLE_CLIENT_ID || null });
};

exports.googleLogin = async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return res.status(503).json({ success: false, error: 'Google sign-in is not configured on this server.' });
    }
    const { credential } = req.body || {};
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing Google credential.' });
    }

    const info = await verifyGoogleIdToken(credential);
    if (!info) {
      return res.status(401).json({ success: false, error: 'Google sign-in could not be verified.' });
    }

    const email = info.email.trim().toLowerCase();
    const existing = await db.findUser(email);
    if (existing && existing.googleSub && existing.googleSub !== info.sub) {
      return res.status(401).json({ success: false, error: 'This email is linked to a different Google account.' });
    }

    const user = await db.upsertUser({
      email,
      name: cleanName(info.name || info.given_name) || email.split('@')[0],
      picture: /^https:\/\//.test(info.picture || '') ? info.picture : '',
      provider: existing ? existing.provider : 'google',
      googleSub: info.sub
    });
    loginResponse(res, user);
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ success: false, error: 'Google sign-in failed. Please try again.' });
  }
};

exports.register = async (req, res) => {
  try {
    const email = String((req.body || {}).email || '').trim().toLowerCase();
    const password = String((req.body || {}).password || '');
    const name = cleanName((req.body || {}).name);

    if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });

    const existing = await db.findUser(email);
    // Accounts created by the old version have no password and no verified Google link.
    // Nobody ever proved ownership of them, so the first person to set a password claims it.
    const isLegacyAccount = existing && !existing.passwordHash && !existing.googleSub;
    if (existing && !isLegacyAccount) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists. Please sign in instead.' });
    }

    const user = await db.upsertUser({
      email,
      name: name || email.split('@')[0],
      provider: 'email',
      passwordHash: hashPassword(password)
    });
    loginResponse(res, user);
  } catch (err) {
    console.error('Register Error:', err);
    res.status(500).json({ success: false, error: 'Could not create the account. Please try again.' });
  }
};

exports.emailLogin = async (req, res) => {
  try {
    const email = String((req.body || {}).email || '').trim().toLowerCase();
    const password = String((req.body || {}).password || '');
    if (!isValidEmail(email) || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }
    if (tooManyAttempts(email)) {
      return res.status(429).json({ success: false, error: 'Too many failed attempts. Please wait 15 minutes and try again.' });
    }

    const user = await db.findUser(email);
    if (user && !user.passwordHash && user.googleSub) {
      return res.status(400).json({ success: false, error: 'This account uses Google sign-in. Please use the Google button.' });
    }
    if (user && !user.passwordHash && !user.googleSub) {
      return res.status(400).json({ success: false, error: 'This account was created before passwords were added. Please use "Register" with the same email to set a password.' });
    }
    if (!user || !checkPassword(password, user.passwordHash)) {
      recordFailure(email);
      return res.status(401).json({ success: false, error: 'Incorrect email or password.' });
    }

    failedAttempts.delete(email);
    const updated = await db.upsertUser({ email });
    loginResponse(res, updated);
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
};

exports.me = async (req, res) => {
  const user = await db.findUser(req.userEmail);
  if (!user) return res.status(401).json({ success: false, error: 'Session expired. Please sign in again.' });
  res.json({ success: true, user: db.publicUser(user) });
};
