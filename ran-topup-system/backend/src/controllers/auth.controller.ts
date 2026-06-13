import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getUserPool } from '../config/database';
import { generateToken } from '../middleware/auth.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

// Login สำหรับผู้ใช้
export async function login(req: Request, res: Response) {
  try {
    const { username, password, gameCode } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }
    
    const pool = getUserPool();
    
    const result = await pool.request()
      .input('username', username)
      .query(`
        SELECT UserID, UserPass, UserAvailable, UserPoint, VotePoint
        FROM UserInfo 
        WHERE UserID = @username
      `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'ไม่พบชื่อผู้ใช้ในระบบ' });
    }
    
    const user = result.recordset[0];
    
    if (user.UserAvailable !== 1) {
      return res.status(401).json({ error: 'บัญชีถูกระงับการใช้งาน' });
    }
    
    // ตรวจสอบรหัสผ่าน (plain text ตาม RAN Online)
    if (user.UserPass !== password) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }
    
    const token = generateToken({
      id: user.UserID,
      type: 'user',
      username: user.UserID
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.UserID,
        username: user.UserID
      }
    });
    
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message });
  }
}

// Login สำหรับ Admin
export async function adminLogin(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ดูแลและรหัสผ่าน' });
    }
    
    // ตรวจสอบจากตาราง Admins
    const pool = getUserPool();
    
    const result = await pool.request()
      .input('username', username)
      .query(`
        SELECT AdminID, Username, Password, FullName, Role, Status
        FROM Admins 
        WHERE Username = @username
      `);
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'ไม่พบชื่อผู้ดูแลในระบบ' });
    }
    
    const admin = result.recordset[0];
    
    if (admin.Status !== 1) {
      return res.status(401).json({ error: 'บัญชีถูกระงับการใช้งาน' });
    }
    
    // ตรวจสอบรหัสผ่าน (plain text)
    if (admin.Password !== password) {
      return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }
    
    // อัพเดท LastLoginDate
    await pool.request()
      .input('adminId', admin.AdminID)
      .query(`UPDATE Admins SET LastLoginDate = GETDATE() WHERE AdminID = @adminId`);
    
    const token = generateToken({
      id: admin.AdminID,
      type: 'admin',
      username: admin.Username
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: admin.AdminID,
        username: admin.Username,
        fullName: admin.FullName,
        role: admin.Role
      }
    });
    
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + error.message });
  }
}

// Register สำหรับผู้ใช้ใหม่
export async function register(req: Request, res: Response) {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }
    
    const pool = getUserPool();
    
    // ตรวจสอบว่ามีผู้ใช้นี้แล้วหรือไม่
    const existingUser = await pool.request()
      .input('username', username)
      .query(`SELECT UserID FROM UserInfo WHERE UserID = @username`);
    
    if (existingUser.recordset.length > 0) {
      return res.status(409).json({ error: 'ชื่อผู้ใช้นี้มีในระบบแล้ว' });
    }
    
    // สร้างผู้ใช้ใหม่ (ในระบบจริงต้อง INSERT ตาม schema ของ RanUser)
    // ตัวอย่างนี้สมมติว่ามีตาราง Users ในระบบเติมเงิน
    await pool.request()
      .input('username', username)
      .input('password', password)
      .input('email', email || null)
      .query(`
        INSERT INTO UserInfo (UserID, Password, Status, Point)
        VALUES (@username, @password, 1, 0)
      `);
    
    res.json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จ'
    });
    
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสมัครสมาชิก: ' + error.message });
  }
}

// ตรวจสอบ Token
export async function verifyToken(req: AuthRequest, res: Response) {
  res.json({
    success: true,
    user: req.user
  });
}

// Logout
export async function logout(req: Request, res: Response) {
  res.json({
    success: true,
    message: 'ออกจากระบบสำเร็จ'
  });
}

export default { login, adminLogin, register, verifyToken, logout };
