import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { supabase } from '../lib/supabase.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

const BUCKET = 'portfolio-images';
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed'));
    }
  },
});

router.post('/image', requireAdmin, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image must be 5 MB or smaller' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${randomUUID()}${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return res.status(500).json({
        error: 'Failed to upload image. Make sure the portfolio-images bucket exists in Supabase.',
      });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    res.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('POST /api/upload/image error:', err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
