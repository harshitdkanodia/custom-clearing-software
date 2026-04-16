const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
    createShipment, getShipments, getShipment,
    updateShipment, updateIgmStatus, updateContainerStatus, getShipmentActivity,
    getTransports, createOrUpdateTransport,
    deleteShipment
} = require('../controllers/shipmentController');
const { getBoeStatus, updateBoeStatus } = require('../controllers/boeController');

router.use(verifyToken);

router.get('/', getShipments);
router.get('/:id', getShipment);
router.get('/:id/activity', getShipmentActivity);
router.post('/', requireRole('ADMIN', 'OPERATION_STAFF'), createShipment);
router.put('/:id', requireRole('ADMIN', 'OPERATION_STAFF'), updateShipment);
router.patch('/:id/igm-status', requireRole('ADMIN', 'OPERATION_STAFF'), updateIgmStatus);
router.patch('/:id/containers/:containerId/status', requireRole('ADMIN', 'OPERATION_STAFF'), updateContainerStatus);
router.get('/:id/boe', getBoeStatus);
router.patch('/:id/boe', requireRole('ADMIN', 'OPERATION_STAFF'), updateBoeStatus);
router.get('/:id/transport', getTransports);
router.post('/:id/transport', requireRole('ADMIN', 'OPERATION_STAFF'), createOrUpdateTransport);
router.delete('/:id', requireRole('ADMIN', 'OPERATION_STAFF'), deleteShipment);

module.exports = router;
