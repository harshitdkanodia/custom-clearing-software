const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getUsers, createUser, updateUser, toggleUserStatus, deleteUser } = require('../controllers/userController');

router.use(verifyToken, requireRole('ADMIN'));
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.patch('/:id/status', toggleUserStatus);
router.delete('/:id', deleteUser);

module.exports = router;
