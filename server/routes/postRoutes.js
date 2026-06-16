import express from 'express';
import {
  createPost,
  getFeed,
  getPost,
  deletePost,
  reactToPost,
  getTrendingPosts,
  getComments,
  addComment,
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
router.get('/:id/comments', getComments);
router.get('/:id', getPost);

// Protected routes (require authentication)
router.post('/', requireAuth, createPost);
router.post('/:id/comments', requireAuth, addComment);
router.delete('/:id', requireAuth, deletePost);
router.patch('/:id/react', requireAuth, reactToPost);

export default router;
