const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ calculations: [] }, null, 2), 'utf-8');
}

function readData() {
  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return { calculations: [] };
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
    writeData({ calculations: [] });
    return true;
  }
};
