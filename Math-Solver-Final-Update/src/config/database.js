// Storage layer.
//
// Two back-ends, picked automatically:
//   1. Upstash Redis (recommended for Vercel / any serverless host).
//      Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
//      (Vercel's "Upstash for Redis" integration adds these for you;
//       KV_REST_API_URL / KV_REST_API_TOKEN are accepted too).
//   2. Local JSON file (data/database.json) for running on your own computer
//      or on a normal server with a persistent disk.
//
// On Vercel without Redis configured, the file lives in /tmp, which is wiped
// regularly, so history will not be kept for long. A warning is printed.

const fs = require('fs');
const path = require('path');

const MAX_CALCS_PER_USER = 100;
const REDIS_KEY = 'allmath:db';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
const useRedis = Boolean(redisUrl && redisToken);

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dataDir = isServerless ? path.join('/tmp', 'allmath-data') : path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'database.json');

if (!useRedis && isServerless) {
  console.warn('[db] WARNING: running on a serverless host without Redis configured. ' +
    'History and accounts are stored in /tmp and WILL be lost. ' +
    'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to keep data.');
}

function emptyDb() {
  return { calculations: [], users: [] };
}

function normalize(parsed) {
  if (!parsed || typeof parsed !== 'object') return emptyDb();
  if (!Array.isArray(parsed.calculations)) parsed.calculations = [];
  if (!Array.isArray(parsed.users)) parsed.users = [];
  return parsed;
}

async function redisCommand(args) {
  const res = await fetch(redisUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!res.ok) throw new Error(`Redis request failed (${res.status})`);
  const data = await res.json();
  if (data.error) throw new Error(`Redis error: ${data.error}`);
  return data.result;
}

async function readData() {
  if (useRedis) {
    const raw = await redisCommand(['GET', REDIS_KEY]);
    return normalize(raw ? JSON.parse(raw) : null);
  }
  try {
    return normalize(JSON.parse(fs.readFileSync(dbPath, 'utf-8')));
  } catch (err) {
    return emptyDb();
  }
}

async function writeData(data) {
  if (useRedis) {
    await redisCommand(['SET', REDIS_KEY, JSON.stringify(data)]);
    return;
  }
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const tmp = dbPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, dbPath); // atomic replace, avoids half-written files
}

// Simple in-process lock so two requests don't overwrite each other's changes.
let queue = Promise.resolve();
function withLock(fn) {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

const keyOf = (email) => String(email || '').trim().toLowerCase();

function publicUser(u) {
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.name, picture: u.picture || '', provider: u.provider };
}

module.exports = {
  MAX_CALCS_PER_USER,
  publicUser,

  // Only signed-in users get history saved. Anonymous results are not stored,
  // so nobody can see anybody else's calculations.
  addCalculation: (item, userEmail) => withLock(async () => {
    const userKey = keyOf(userEmail);
    if (!userKey) return null;
    const db = await readData();
    const cleanQuery = String(item.query || item.title || '').trim().toLowerCase();

    // Remove an older copy of the same question for this user
    db.calculations = db.calculations.filter(c =>
      keyOf(c.userEmail) !== userKey || String(c.query || c.title || '').trim().toLowerCase() !== cleanQuery);

    const newEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString(),
      ...item,
      userEmail: userKey
    };
    db.calculations.unshift(newEntry);

    // Keep the newest MAX_CALCS_PER_USER entries for this user, preserving order
    let count = 0;
    db.calculations = db.calculations.filter(c => {
      if (keyOf(c.userEmail) !== userKey) return true;
      count++;
      return count <= MAX_CALCS_PER_USER;
    });

    await writeData(db);
    return newEntry;
  }),

  getCalculations: async (userEmail) => {
    const userKey = keyOf(userEmail);
    if (!userKey) return [];
    const db = await readData();
    return db.calculations.filter(c => keyOf(c.userEmail) === userKey);
  },

  deleteCalculation: (id, userEmail) => withLock(async () => {
    const userKey = keyOf(userEmail);
    if (!userKey) return false;
    const db = await readData();
    const before = db.calculations.length;
    db.calculations = db.calculations.filter(c =>
      !(keyOf(c.userEmail) === userKey && String(c.id) === String(id)));
    await writeData(db);
    return db.calculations.length !== before;
  }),

  clearAll: (userEmail) => withLock(async () => {
    const userKey = keyOf(userEmail);
    if (!userKey) return false;
    const db = await readData();
    db.calculations = db.calculations.filter(c => keyOf(c.userEmail) !== userKey);
    await writeData(db);
    return true;
  }),

  findUser: async (email) => {
    const db = await readData();
    return db.users.find(u => keyOf(u.email) === keyOf(email)) || null;
  },

  // Creates the user if new, otherwise updates last_login and the given fields.
  upsertUser: (userData) => withLock(async () => {
    const db = await readData();
    const email = keyOf(userData.email);
    const now = new Date().toISOString();
    let user = db.users.find(u => keyOf(u.email) === email);

    if (user) {
      user.last_login = now;
      if (userData.name) user.name = userData.name;
      if (userData.picture !== undefined) user.picture = userData.picture;
      if (userData.googleSub) user.googleSub = userData.googleSub;
      if (userData.passwordHash) user.passwordHash = userData.passwordHash;
    } else {
      user = {
        id: 'user_' + Date.now(),
        email,
        name: userData.name || email.split('@')[0],
        picture: userData.picture || '',
        provider: userData.provider || 'email',
        googleSub: userData.googleSub || undefined,
        passwordHash: userData.passwordHash || undefined,
        created_at: now,
        last_login: now
      };
      db.users.push(user);
    }
    await writeData(db);
    return user;
  })
};
