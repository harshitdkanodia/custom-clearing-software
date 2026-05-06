const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
    createShipment, getShipments, getShipment,
    updateShipment, updateIgmStatus, updateContainerStatus, getShipmentActivity,
    getTransports, createOrUpdateTransport, deleteTransport,
    deleteShipment
} = require('../controllers/shipmentController');
const { getBoeStatus, updateBoeStatus, uploadBoeDocument } = require('../controllers/boeController');
const { updateTransport, uploadTransportDocument, deleteTransportDocument, addOtherTransportDocument } = require('../controllers/transportController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, `boe-${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

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
router.post('/:id/boe/upload/:docType', requireRole('ADMIN', 'OPERATION_STAFF'), upload.single('file'), uploadBoeDocument);
router.get('/:id/transport', getTransports);
router.post('/:id/transport', requireRole('ADMIN', 'OPERATION_STAFF'), createOrUpdateTransport);
router.put('/:id/transport/:transportId', requireRole('ADMIN', 'OPERATION_STAFF'), updateTransport);
router.delete('/:id/transport/:transportId', requireRole('ADMIN', 'OPERATION_STAFF'), deleteTransport);
router.post('/:id/transport/:transportId/upload/:docType', requireRole('ADMIN', 'OPERATION_STAFF'), upload.single('file'), uploadTransportDocument);
router.delete('/transport-docs/:docId', requireRole('ADMIN', 'OPERATION_STAFF'), deleteTransportDocument);
router.post('/transport/:id/add-other', requireRole('ADMIN', 'OPERATION_STAFF'), addOtherTransportDocument);

router.delete('/:id', requireRole('ADMIN', 'OPERATION_STAFF'), deleteShipment);

module.exports = router;
