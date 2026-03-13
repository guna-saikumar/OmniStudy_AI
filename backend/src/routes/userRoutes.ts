import express from 'express';
import {
    authUser,
    registerUser,
    updateUserProfile,
    googleAuthUser,
    googleAuthUserCustom,
    forgotPassword,
    resetPassword
} from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', registerUser);
router.post('/login', authUser);
router.post('/google', googleAuthUser);
router.post('/google-custom', googleAuthUserCustom);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.put('/profile', protect, updateUserProfile);

export default router;
