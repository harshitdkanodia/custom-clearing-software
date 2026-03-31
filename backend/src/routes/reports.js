const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getShipmentReport, exportCsv } = require('../controllers/reportController');

router.use(verifyToken);
router.get('/shipment-status', getShipmentReport);
router.get('/export/csv', exportCsv);

module.exports = router;
