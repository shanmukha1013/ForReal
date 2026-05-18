import express from 'express';
import {
  createPost,
  getFeed,
  getPost,
  deletePost,
  reactToPost,
  getTrendingPosts,
} from '../controllers/postController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Post Routes
 * All routes under /api/posts
 */

// Public routes
router.get('/', getFeed);
router.get('/trending', getTrendingPosts);
router.get('/:id', getPost);

// Protected routes (require authentication)
router.post('/', requireAuth, createPost);
router.delete('/:id', requireAuth, deletePost);
router.patch('/:id/react', requireAuth, reactToPost);

export default router;
