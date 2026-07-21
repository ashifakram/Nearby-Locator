import express from 'express';
import { getProfile, gdprDelete, getDevices, revokeDevice, getPermissions } from '../controllers/userController.js';
import { authJwt } from '../middleware/authJwt.js';

const router = express.Router();

router.get('/profile', authJwt, getProfile);
router.delete('/delete', authJwt, gdprDelete);

// Device management
router.get('/me/devices', authJwt, getDevices);
router.delete('/me/devices/:sessionId', authJwt, revokeDevice);

// Permission metadata
router.get('/me/permissions', authJwt, getPermissions);

export default router;
