const express = require('express');
const controller = require('../controllers/tonerController');
const { requireMaster } = require('../middlewares/auth');

const router = express.Router();
router.use(requireMaster);
router.get('/', controller.getOverview);
router.get('/report', controller.getReportData);
router.post('/inventory', controller.createInventory);
router.put('/inventory/:id', controller.updateInventory);
router.delete('/inventory/:id', controller.deleteInventory);
router.post('/usage', controller.recordUsage);
router.put('/settings', controller.updateSettings);

module.exports = router;