import { Router } from 'express';
import { sendContactEmail } from '../lib/mail.js';

const router = Router();

const PROJECT_TYPES = [
  '3D Modeling & Sculpting',
  'CGI Rendering',
  '3D Print Optimization',
  'Animation & VFX',
] as const;

interface ContactBody {
  name?: string;
  email?: string;
  projectType?: string;
  message?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/', async (req, res) => {
  try {
    const body = req.body as ContactBody;

    const name = body.name?.trim();
    const email = body.email?.trim();
    const projectType = body.projectType?.trim();
    const message = body.message?.trim();

    if (!name || !email || !projectType || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (name.length > 120 || message.length > 5000) {
      return res.status(400).json({ error: 'Message is too long' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (!PROJECT_TYPES.includes(projectType as (typeof PROJECT_TYPES)[number])) {
      return res.status(400).json({ error: 'Invalid project type' });
    }

    await sendContactEmail({ name, email, projectType, message });

    res.json({ success: true, message: 'Your message has been sent successfully' });
  } catch (err) {
    console.error('POST /api/contact error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

export default router;
