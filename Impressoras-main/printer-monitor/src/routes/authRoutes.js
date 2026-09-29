const express = require('express');
const controller = require('../controllers/authController');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();
router.post('/login', controller.login);
router.get('/me', controller.me);
router.post('/logout', requireAuth, controller.logout);
router.post('/password', requireAuth, controller.changePassword);

module.exports = router;