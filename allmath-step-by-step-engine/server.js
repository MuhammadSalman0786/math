const express = require('express');
const cors = require('cors');
const path = require('path');
const solverRoutes = require('./src/routes/solverRoutes');
const historyRoutes = require('./src/routes/historyRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/solve', solverRoutes);
app.use('/api/history', historyRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 AllMath App Running at: http://localhost:${PORT}`);
  console.log(`📁 Persistent DB File: data/database.json`);
  console.log(`===============================================`);
});
