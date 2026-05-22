const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/verify-token', authController.verifyToken);
router.post('/logout', authController.logout);
router.post('/auto-login', authController.autoLogin);

module.exports = router;
