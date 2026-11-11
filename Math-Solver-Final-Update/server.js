const express = require('express');
const path = require('path');
const solverRoutes = require('./src/routes/solverRoutes');
const historyRoutes = require('./src/routes/historyRoutes');
const authRoutes = require('./src/routes/authRoutes');
const { attachUser } = require('./src/config/security');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Reads the login token (if any) for every API request
app.use('/api', attachUser);
app.use('/api/solve', solverRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/auth', authRoutes);

app.use('/api', (req, res) => res.status(404).json({ success: false, error: 'Not found' }));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bad JSON bodies etc.
app.use((err, req, res, next) => {
  console.error('Request Error:', err.message);
  res.status(err.status || 500).json({ success: false, error: 'Invalid request.' });
});

// On Vercel the app is exported and Vercel runs it; locally we start a server.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 AllMath App Running at: http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

module.exports = app;
