const express = require('express');
const router = express.Router();
const solverController = require('../controllers/solverController');

router.post('/', solverController.solve);

module.exports = router;
