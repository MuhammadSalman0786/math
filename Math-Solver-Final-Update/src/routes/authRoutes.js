const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireUser } = require('../config/security');

router.get('/config', authController.getConfig);
router.post('/google', authController.googleLogin);
router.post('/register', authController.register);
router.post('/login', authController.emailLogin);
router.get('/me', requireUser, authController.me);
// Note: the old public GET /users route (which listed every user's email) has been removed.

module.exports = router;
