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
router.delete('/usage/:id', controller.deleteUsage);
router.put('/settings', controller.updateSettings);
router.get('/whatsapp-contacts', controller.getWhatsappContacts);
router.post('/whatsapp-contacts', controller.createWhatsappContact);
router.put('/whatsapp-contacts/:id', controller.updateWhatsappContact);
router.delete('/whatsapp-contacts/:id', controller.deleteWhatsappContact);
router.post('/whatsapp-send', controller.sendWhatsappMessage);

module.exports = router;