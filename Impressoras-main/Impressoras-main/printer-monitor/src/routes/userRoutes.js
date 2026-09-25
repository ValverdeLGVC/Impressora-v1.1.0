const express = require('express');
const controller = require('../controllers/userController');
const { requireMaster } = require('../middlewares/auth');

const router = express.Router();
router.use(requireMaster);
router.get('/', controller.list);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;