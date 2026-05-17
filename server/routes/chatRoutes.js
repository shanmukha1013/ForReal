import express from 'express';

const router = express.Router();

// Minimal chat routes stub for local testing
router.get('/', (req, res) => {
  res.json({ message: 'chat route placeholder' });
});

router.post('/', (req, res) => {
  res.json({ message: 'chat post placeholder', body: req.body });
});

export default router;
