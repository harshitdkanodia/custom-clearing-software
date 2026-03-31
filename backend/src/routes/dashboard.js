const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getDashboardCounts, markAlertRead, getAlerts, markAllAlertsRead } = require('../controllers/dashboardController');

router.use(verifyToken);
router.get('/counts', getDashboardCounts);
router.get('/alerts', getAlerts);
router.post('/alerts/:id/read', markAlertRead);
router.post('/alerts/mark-all-read', markAllAlertsRead);

module.exports = router;
