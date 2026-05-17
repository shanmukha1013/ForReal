import express from 'express';
import {
  createOrSendMessage,
  getConversationMessages,
  getConversations,
  markConversationRead,
  getUserNotifications,
  markNotificationRead,
} from '../controllers/chatController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/conversations', requireAuth, getConversations);
router.get('/:conversationId', requireAuth, getConversationMessages);
router.post('/', requireAuth, createOrSendMessage);
router.post('/:conversationId/read', requireAuth, markConversationRead);

// Notification REST (optional but useful for initial sync + persistence)
router.get('/notifications', requireAuth, getUserNotifications);
router.post('/notifications/:id/read', requireAuth, markNotificationRead);

export default router;

