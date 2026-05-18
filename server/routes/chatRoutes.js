import express from 'express';
import {
  getConversations,
  getMessages,
  createOrSendMessage,
  markConversationRead,
  getNotifications,
  markNotificationRead
} from '../controllers/chatController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Chat & Direct Messaging Routes
 */

router.get('/conversations', requireAuth, getConversations);
router.get('/notifications', requireAuth, getNotifications);
router.post('/notifications/:id/read', requireAuth, markNotificationRead);
router.get('/:conversationId', requireAuth, getMessages);
router.post('/', requireAuth, createOrSendMessage);
router.post('/:conversationId/read', requireAuth, markConversationRead);

export default router;
