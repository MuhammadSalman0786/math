const express = require('express');
const router = express.Router();
const contact = require('../controllers/contactController');

router.get('/config', contact.getConfig);
router.post('/', contact.submit);
router.get('/messages', contact.list);
router.delete('/messages/:id', contact.remove);

module.exports = router;
