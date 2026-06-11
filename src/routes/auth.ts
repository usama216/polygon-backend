import { Router } from 'express';
import { signToken, verifyToken } from '../lib/token.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(503).json({ error: 'Admin login is not configured' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (email !== adminEmail || password !== adminPassword) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(email);
  res.json({ token, email });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ email: req.adminEmail });
});

router.post('/verify', (req, res) => {
  const authHeader = req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.body?.token;

  if (!token || typeof token !== 'string') {
    return res.status(401).json({ valid: false });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ valid: false });
  }

  res.json({ valid: true, email: user.email });
});

export default router;
