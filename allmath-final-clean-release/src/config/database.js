const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ calculations: [], users: [] }, null, 2), 'utf-8');
}

function readData() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.calculations) parsed.calculations = [];
    if (!parsed.users) parsed.users = [];
    return parsed;
  } catch (err) {
    return { calculations: [], users: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  addCalculation: (item) => {
    const db = readData();
    const newEntry = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      ...item
    };
    db.calculations.unshift(newEntry);
    if (db.calculations.length > 50) {
      db.calculations = db.calculations.slice(0, 50);
    }
    writeData(db);
    return newEntry;
  },
  getCalculations: () => {
    const db = readData();
    return db.calculations;
  },
  deleteCalculation: (id) => {
    const db = readData();
    db.calculations = db.calculations.filter(c => String(c.id) !== String(id));
    writeData(db);
    return true;
  },
  clearAll: () => {
    const db = readData();
    db.calculations = [];
    writeData(db);
    return true;
  },
  saveOrUpdateUser: (userData) => {
    const db = readData();
    const existingIndex = db.users.findIndex(u => u.email.toLowerCase() === userData.email.toLowerCase());
    const now = new Date().toISOString();
    
    if (existingIndex > -1) {
      db.users[existingIndex].last_login = now;
      if (userData.name) db.users[existingIndex].name = userData.name;
      if (userData.picture) db.users[existingIndex].picture = userData.picture;
      writeData(db);
      return db.users[existingIndex];
    } else {
      const newUser = {
        id: 'user_' + Date.now(),
        email: userData.email.toLowerCase(),
        name: userData.name || userData.email.split('@')[0],
        picture: userData.picture || '',
        provider: userData.provider || 'google',
        created_at: now,
        last_login: now
      };
      db.users.push(newUser);
      writeData(db);
      return newUser;
    }
  },
  getUsers: () => {
    const db = readData();
    return db.users;
  }
};
