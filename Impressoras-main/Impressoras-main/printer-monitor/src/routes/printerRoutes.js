const express = require('express');
const router = express.Router();
const printerController = require('../controllers/printerController');
const { requireAuth, requireMaster } = require('../middlewares/auth');

router.get('/', requireAuth, printerController.getAllPrinters);
router.post('/', requireMaster, printerController.createPrinter);
router.put('/:id', requireMaster, printerController.updatePrinter);
router.delete('/:id', requireMaster, printerController.deletePrinter);
router.post('/test', requireMaster, printerController.testSnmp);

module.exports = router;