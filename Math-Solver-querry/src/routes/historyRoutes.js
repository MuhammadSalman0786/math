const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { requireUser } = require('../config/security');

router.get('/', historyController.getRecents);          // returns [] when not signed in
router.delete('/:id', requireUser, historyController.deleteItem);
router.delete('/', requireUser, historyController.clearAll);

module.exports = router;
