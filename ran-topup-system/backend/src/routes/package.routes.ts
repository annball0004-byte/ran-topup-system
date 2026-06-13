import { Router } from 'express';
import { getGamePool } from '../config/database';

const router = Router();

// ดึงแพ็กเกจทั้งหมด
router.get('/', async (req, res) => {
  try {
    const pool = getGamePool();
    
    const result = await pool.request().query(`
      SELECT 
        PackageID,
        PackageName,
        Price,
        Point,
        BonusPoint,
        DiscountPercent,
        SortOrder,
        Status
      FROM Packages
      WHERE Status = 1
      ORDER BY SortOrder, Price
    `);
    
    res.json({
      success: true,
      packages: result.recordset
    });
    
  } catch (error: any) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลแพ็กเกจได้: ' + error.message });
  }
});

// ดึงแพ็กเกจตาม ID
router.get('/:id', async (req, res) => {
  try {
    const pool = getGamePool();
    
    const result = await pool.request()
      .input('packageId', parseInt(req.params.id))
      .query(`SELECT * FROM Packages WHERE PackageID = @packageId AND Status = 1`);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบแพ็กเกจ' });
    }
    
    res.json({
      success: true,
      package: result.recordset[0]
    });
    
  } catch (error: any) {
    console.error('Get package error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
