import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ran-topup-secret-key';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    type: 'user' | 'admin' | 'agent';
    username: string;
  };
}

// Middleware ตรวจสอบ JWT Token
export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Middleware ตรวจสอบ Admin
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Middleware ตรวจสอบ Agent
export function requireAgent(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.type !== 'agent') {
    return res.status(403).json({ error: 'Agent access required' });
  }
  next();
}

// สร้าง JWT Token
export function generateToken(user: { id: string; type: string; username: string }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export default { authenticateToken, requireAdmin, requireAgent, generateToken };
