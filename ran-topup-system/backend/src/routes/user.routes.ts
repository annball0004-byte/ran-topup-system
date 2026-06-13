import { Router, Request, Response } from 'express';
import { getGamePool } from '../config/database';

const router = Router();

// ดึงข้อมูลผู้ใช้
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const pool = getGamePool();
    const userId = req.query.userId as string;
    
    const result = await pool.request()
      .input('userId', userId)
      .query(`
        SELECT 
          UserID,
          UserName,
          UserPoint as Point,
          VotePoint,
          UserAvailable as Status,
          LastLoginDate as LastLogin
        FROM UserInfo 
        WHERE UserID = @userId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    
    res.json({
      success: true,
      user: result.recordset[0]
    });
    
  } catch (error: any) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ค้นหาผู้ใช้
router.get('/search', async (req: Request, res: Response) => {
  try {
    const pool = getGamePool();
    const searchTerm = req.query.q as string;
    
    const result = await pool.request()
      .input('search', `%${searchTerm}%`)
      .query(`
        SELECT TOP 50 
          UserID, 
          UserName, 
          UserPoint as Point, 
          VotePoint, 
          UserAvailable as Status
        FROM UserInfo
        WHERE UserID LIKE @search OR UserName LIKE @search
        ORDER BY UserID
      `);
    
    res.json({
      success: true,
      users: result.recordset
    });
    
  } catch (error: any) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ดึงตัวละครของผู้ใช้
router.get('/characters/:userId', async (req: Request, res: Response) => {
  try {
    const pool = getGamePool();
    
    const result = await pool.request()
      .input('userId', req.params.userId)
      .query(`
        SELECT 
          ChaGUID,
          ChaName,
          ChaLevel,
          ChaClass,
          ChaSchool
        FROM ChaInfo
        WHERE UsrUID = @userId AND DelFlag = 0
        ORDER BY ChaLevel DESC
      `);
    
    res.json({
      success: true,
      characters: result.recordset
    });
    
  } catch (error: any) {
    console.error('Get user characters error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
