const db = require('../config/database');

// The user is identified only by the signed session token (req.userEmail),
// never by an email address sent from the browser.
exports.getRecents = async (req, res) => {
  try {
    const list = req.userEmail ? await db.getCalculations(req.userEmail) : [];
    res.json({ success: true, signedIn: Boolean(req.userEmail), history: list });
  } catch (err) {
    console.error('History Error:', err);
    res.status(500).json({ success: false, error: 'Could not load history.' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    await db.deleteCalculation(req.params.id, req.userEmail);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    console.error('History Delete Error:', err);
    res.status(500).json({ success: false, error: 'Could not delete this item.' });
  }
};

exports.clearAll = async (req, res) => {
  try {
    await db.clearAll(req.userEmail);
    res.json({ success: true, message: 'All history cleared' });
  } catch (err) {
    console.error('History Clear Error:', err);
    res.status(500).json({ success: false, error: 'Could not clear history.' });
  }
};
