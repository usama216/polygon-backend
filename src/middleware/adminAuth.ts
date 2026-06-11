import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/token.js';

declare global {
  namespace Express {
    interface Request {
      adminEmail?: string;
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const bearer = req.header('authorization');
  if (bearer?.startsWith('Bearer ')) {
    const user = verifyToken(bearer.slice(7));
    if (user) {
      req.adminEmail = user.email;
      return next();
    }
  }

  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = req.header('x-api-key');
  if (adminKey && providedKey === adminKey) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

// Keep alias for any legacy imports
export const requireAdminKey = requireAdmin;
