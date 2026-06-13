import { Router, Request, Response } from 'express';
import { getUserPool } from '../config/database';
import { authenticateToken, requireAgent } from '../middleware/auth.middleware';

const router = Router();

// ดึงข้อมูล Agent
router.get('/profile', authenticateToken, requireAgent, async (req: any, res: Response) => {
  try {
    const pool = getUserPool();
    
    const result = await pool.request()
      .input('agentId', req.user?.id)
      .query(`
        SELECT AgentID, AgentName, Email, Phone, Balance, CommissionRate
        FROM Agents
        WHERE AgentID = @agentId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบ Agent' });
    }
    
    res.json({
      success: true,
      agent: result.recordset[0]
    });
    
  } catch (error: any) {
    console.error('Get agent profile error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ดึงประวัติการขาย
router.get('/sales', authenticateToken, requireAgent, async (req: any, res: Response) => {
  try {
    const pool = getUserPool();
    const gameDb = process.env.DB_GAME || 'RanGame1';
    
    const result = await pool.request()
      .input('agentId', req.user?.id)
      .query(`
        SELECT o.*, p.PackageName
        FROM Orders o
        JOIN ${gameDb}.dbo.Packages p ON o.PackageID = p.PackageID
        WHERE o.AgentID = @agentId
        ORDER BY o.CreatedDate DESC
      `);
    
    res.json({
      success: true,
      sales: result.recordset
    });
    
  } catch (error: any) {
    console.error('Get agent sales error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ดึงยอดค่าคอมมิชชั่น
router.get('/commission', authenticateToken, requireAgent, async (req: any, res: Response) => {
  try {
    const pool = getUserPool();
    
    const result = await pool.request()
      .input('agentId', req.user?.id)
      .query(`
        SELECT 
          COUNT(*) as totalOrders,
          ISNULL(SUM(Amount), 0) as totalSales,
          ISNULL(SUM(Commission), 0) as totalCommission
        FROM Orders
        WHERE AgentID = @agentId AND PaymentStatus = 1
      `);
    
    res.json({
      success: true,
      commission: result.recordset[0]
    });
    
  } catch (error: any) {
    console.error('Get agent commission error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
