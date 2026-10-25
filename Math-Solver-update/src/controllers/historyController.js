const db = require('../config/database');

exports.getRecents = (req, res) => {
  try {
    const list = db.getCalculations();
    res.json({ success: true, history: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteItem = (req, res) => {
  try {
    const { id } = req.params;
    db.deleteCalculation(id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.clearAll = (req, res) => {
  try {
    db.clearAll();
    res.json({ success: true, message: 'All history cleared' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
