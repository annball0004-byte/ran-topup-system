import { Router, Request, Response } from 'express';
import { getGamePool, getUserPool } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// ดึง Game Config ทั้งหมด
router.get('/games', async (req: Request, res: Response) => {
  try {
    const pool = getGamePool();
    
    const result = await pool.request().query(`
      SELECT * FROM GameConfig WHERE Status = 1
    `);
    
    res.json({
      success: true,
      games: result.recordset
    });
    
  } catch (error: any) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ดึง Game Config ตาม ID
router.get('/games/:id', async (req: Request, res: Response) => {
  try {
    const pool = getGamePool();
    
    const result = await pool.request()
      .input('configId', parseInt(req.params.id))
      .query(`SELECT * FROM GameConfig WHERE ConfigID = @configId`);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ Game Config' });
    }
    
    res.json({
      success: true,
      game: result.recordset[0]
    });
    
  } catch (error: any) {
    console.error('Get game config error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ดึง Column Mapping
router.get('/games/:id/mapping', async (req: Request, res: Response) => {
  try {
    const pool = getGamePool();
    
    const result = await pool.request()
      .input('configId', parseInt(req.params.id))
      .query(`SELECT * FROM ColumnMapping WHERE ConfigID = @configId`);
    
    res.json({
      success: true,
      mapping: result.recordset
    });
    
  } catch (error: any) {
    console.error('Get column mapping error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// อัพเดท Game Config
router.put('/games/:id', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const pool = getGamePool();
    const { gameName, currency, pointName, exchangeRate } = req.body;
    
    await pool.request()
      .input('configId', parseInt(req.params.id))
      .input('gameName', gameName)
      .input('currency', currency)
      .input('pointName', pointName)
      .input('exchangeRate', exchangeRate)
      .query(`
        UPDATE GameConfig
        SET GameName = @gameName,
            Currency = @currency,
            PointName = @pointName,
            ExchangeRate = @exchangeRate,
            UpdatedDate = GETDATE()
        WHERE ConfigID = @configId
      `);
    
    res.json({
      success: true,
      message: 'อัพเดท Game Config สำเร็จ'
    });
    
  } catch (error: any) {
    console.error('Update game config error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ดึง Payment Gateways
router.get('/payment-gateways', async (req: Request, res: Response) => {
  try {
    const pool = getUserPool();
    
    const result = await pool.request().query(`
      SELECT GatewayID, GatewayName, GatewayType, Status
      FROM PaymentGateways
      WHERE Status = 1
    `);
    
    res.json({
      success: true,
      gateways: result.recordset
    });
    
  } catch (error: any) {
    console.error('Get payment gateways error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
