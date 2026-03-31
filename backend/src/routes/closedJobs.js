const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getClosedJobs, getClosedJobDetail, downloadAllDocs } = require('../controllers/closedJobsController');

router.use(verifyToken);
router.get('/', getClosedJobs);
router.get('/:id', getClosedJobDetail);
router.get('/:id/download-all', downloadAllDocs);

module.exports = router;
