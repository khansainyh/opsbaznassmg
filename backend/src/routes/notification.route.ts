import { Router } from 'express';
import { getMyNotifications, markAsRead, markAllAsRead } from '../controllers/notification.controller';

const router = Router();

// Pass userId as a parameter for getting notifications and marking all as read
router.get('/user/:userId', getMyNotifications);
router.put('/user/:userId/read-all', markAllAsRead);

// Update single notification by its own ID
router.put('/:id/read', markAsRead);

export default router;
