const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

router.get('/', historyController.getRecents);
router.delete('/:id', historyController.deleteItem);
router.delete('/', historyController.clearAll);

module.exports = router;
