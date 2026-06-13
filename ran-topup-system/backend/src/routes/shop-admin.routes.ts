import { Router, Request, Response } from 'express';
import { getShopPool } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Helper: Log GM command
async function logGMCommand(admin: any, command: string) {
  try {
    const { getLogPool } = require('../config/database');
    const logPool = getLogPool();
    await logPool.request()
      .input('userID', admin.adminID || 0)
      .input('userType', 99)
      .input('charID', 0)
      .input('charName', admin.username || 'ADMIN')
      .input('command', command)
      .query(`INSERT INTO GM_Logs (GMUserID, GMUserType, GMCharID, GMCharName, GMCommand, Date) VALUES (@userID, @userType, @charID, @charName, @command, GETDATE())`);
  } catch (e) { }
}

// ============ LIST SHOP ITEMS ============

router.get('/items', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const pool = getShopPool();
    const { page = 1, limit = 20, search = '', section, currency } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions: string[] = [];
    const request = pool.request();

    if (search) {
      conditions.push('(ItemName LIKE @search OR CAST(ItemMain AS VARCHAR) LIKE @search OR CAST(ItemSub AS VARCHAR) LIKE @search)');
      request.input('search', `%${search}%`);
    }
    if (section !== undefined && section !== '') {
      conditions.push('ItemSection = @section');
      request.input('section', Number(section));
    }
    if (currency !== undefined && currency !== '') {
      conditions.push('ItemCurrency = @currency');
      request.input('currency', Number(currency));
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await request.query(`SELECT COUNT(*) as total FROM ShopItemMap ${whereClause}`);
    const total = countResult.recordset[0].total;

    const dataReq = pool.request();
    if (search) dataReq.input('search', `%${search}%`);
    if (section !== undefined && section !== '') dataReq.input('section', Number(section));
    if (currency !== undefined && currency !== '') dataReq.input('currency', Number(currency));
    dataReq.input('offset', offset);
    dataReq.input('limit', Number(limit));

    const result = await dataReq.query(`
      SELECT ProductNum, ItemMain, ItemSub, ItemName, ItemStock, ItemPrice,
             ItemSection, ItemCurrency, ItemDiscount, ItemList, Duration,
             Category, ItemImage, ItemMoney, ItemComment
      FROM ShopItemMap
      ${whereClause}
      ORDER BY ProductNum DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      success: true,
      items: result.recordset,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    console.error('Get shop items error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ GET SINGLE ITEM ============

router.get('/items/:productNum', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const pool = getShopPool();
    const { productNum } = req.params;

    const result = await pool.request()
      .input('productNum', Number(productNum))
      .query(`
        SELECT ProductNum, ItemMain, ItemSub, ItemName, ItemStock, ItemPrice,
               ItemSection, ItemCurrency, ItemDiscount, ItemList, Duration,
               Category, ItemImage, ItemMoney, ItemComment
        FROM ShopItemMap
        WHERE ProductNum = @productNum
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบไอเทม' });
    }

    // Check how many times this item was purchased
    let purchaseCount = 0;
    try {
      const purchaseResult = await pool.request()
        .input('productNum', Number(productNum))
        .query(`SELECT COUNT(*) as count FROM ShopPurchase WHERE ProductNum = @productNum`);
      purchaseCount = purchaseResult.recordset[0].count;
    } catch (e) { }

    res.json({
      success: true,
      item: {
        ...result.recordset[0],
        purchaseCount
      }
    });
  } catch (error: any) {
    console.error('Get shop item error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ CREATE ITEM ============

router.post('/items', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const pool = getShopPool();
    const {
      ItemMain, ItemSub, ItemName, ItemStock = 0, ItemPrice = 0,
      ItemSection = 0, ItemCurrency = 0, ItemDiscount = 0,
      ItemList = 1, Duration = '', Category = '', ItemImage = '',
      ItemMoney = 0, ItemComment = ''
    } = req.body;

    if (!ItemName) {
      return res.status(400).json({ error: 'กรุณาระบุชื่อไอเทม' });
    }
    if (ItemMain === undefined || ItemSub === undefined) {
      return res.status(400).json({ error: 'กรุณาระบุ ItemMain และ ItemSub' });
    }

    // Check duplicate
    const dupResult = await pool.request()
      .input('itemMain', Number(ItemMain))
      .input('itemSub', Number(ItemSub))
      .query(`SELECT ProductNum FROM ShopItemMap WHERE ItemMain = @itemMain AND ItemSub = @itemSub`);

    if (dupResult.recordset.length > 0) {
      return res.status(400).json({ error: `ไอเทมนี้มีอยู่แล้ว (ProductNum: ${dupResult.recordset[0].ProductNum})` });
    }

    const result = await pool.request()
      .input('itemMain', Number(ItemMain))
      .input('itemSub', Number(ItemSub))
      .input('itemName', ItemName)
      .input('itemStock', Number(ItemStock))
      .input('itemPrice', Number(ItemPrice))
      .input('itemSection', Number(ItemSection))
      .input('itemCurrency', Number(ItemCurrency))
      .input('itemDiscount', Number(ItemDiscount))
      .input('itemList', Number(ItemList))
      .input('duration', Duration || '')
      .input('category', Category || '')
      .input('itemImage', ItemImage || '')
      .input('itemMoney', Number(ItemMoney))
      .input('itemComment', ItemComment || '')
      .query(`
        INSERT INTO ShopItemMap (ItemMain, ItemSub, ItemName, ItemStock, ItemPrice, ItemSection, ItemCurrency, ItemDiscount, ItemList, Duration, Category, ItemImage, ItemMoney, ItemComment)
        VALUES (@itemMain, @itemSub, @itemName, @itemStock, @itemPrice, @itemSection, @itemCurrency, @itemDiscount, @itemList, @duration, @category, @itemImage, @itemMoney, @itemComment)
      `);

    // Get the inserted ProductNum
    const idResult = await pool.request().query(`SELECT MAX(ProductNum) as newId FROM ShopItemMap`);
    const newId = idResult.recordset[0].newId;

    await logGMCommand(req.user, `CREATE ITEM [${ItemName}] MID:${ItemMain} SID:${ItemSub} Price:${ItemPrice} → ProductNum:${newId}`);

    res.json({
      success: true,
      message: `สร้างไอเทม "${ItemName}" สำเร็จ (ProductNum: ${newId})`,
      productNum: newId
    });
  } catch (error: any) {
    console.error('Create shop item error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ UPDATE ITEM ============

router.put('/items/:productNum', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const pool = getShopPool();
    const { productNum } = req.params;
    const updates = req.body;

    // Check item exists
    const checkResult = await pool.request()
      .input('productNum', Number(productNum))
      .query(`SELECT ProductNum, ItemName FROM ShopItemMap WHERE ProductNum = @productNum`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบไอเทม' });
    }

    const allowedFields: Record<string, string> = {
      ItemMain: 'int', ItemSub: 'int', ItemName: 'varchar',
      ItemStock: 'int', ItemPrice: 'int', ItemSection: 'int',
      ItemCurrency: 'int', ItemDiscount: 'int', ItemList: 'int',
      Duration: 'varchar', Category: 'varchar', ItemImage: 'varchar',
      ItemMoney: 'int', ItemComment: 'varchar'
    };

    const setClauses: string[] = [];
    const request = pool.request();
    request.input('productNum', Number(productNum));

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key] && value !== undefined) {
        setClauses.push(`${key} = @${key}`);
        request.input(key, value);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัพเดท' });
    }

    await request.query(`UPDATE ShopItemMap SET ${setClauses.join(', ')} WHERE ProductNum = @productNum`);

    const changes = Object.keys(updates).filter(k => allowedFields[k]).join(', ');
    await logGMCommand(req.user, `UPDATE ITEM ProductNum:${productNum} [${checkResult.recordset[0].ItemName}] → ${changes}`);

    res.json({
      success: true,
      message: `อัพเดทไอเทม ProductNum:${productNum} สำเร็จ`
    });
  } catch (error: any) {
    console.error('Update shop item error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ DELETE ITEM ============

router.delete('/items/:productNum', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const pool = getShopPool();
    const { productNum } = req.params;

    const checkResult = await pool.request()
      .input('productNum', Number(productNum))
      .query(`SELECT ProductNum, ItemName, ItemMain, ItemSub FROM ShopItemMap WHERE ProductNum = @productNum`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบไอเทม' });
    }

    const item = checkResult.recordset[0];

    // Check if item has purchases
    let purchaseCount = 0;
    try {
      const purchaseResult = await pool.request()
        .input('productNum', Number(productNum))
        .query(`SELECT COUNT(*) as count FROM ShopPurchase WHERE ProductNum = @productNum`);
      purchaseCount = purchaseResult.recordset[0].count;
    } catch (e) { }

    if (purchaseCount > 0) {
      return res.status(400).json({
        error: `ไม่สามารถลบได้: ไอเทมนี้มีประวัติการซื้อ ${purchaseCount} รายการ`
      });
    }

    await pool.request()
      .input('productNum', Number(productNum))
      .query(`DELETE FROM ShopItemMap WHERE ProductNum = @productNum`);

    await logGMCommand(req.user, `DELETE ITEM [${item.ItemName}] MID:${item.ItemMain} SID:${item.ItemSub} ProductNum:${productNum}`);

    res.json({
      success: true,
      message: `ลบไอเทม "${item.ItemName}" สำเร็จ`
    });
  } catch (error: any) {
    console.error('Delete shop item error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ SHOP STATS ============

router.get('/stats', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const pool = getShopPool();

    const [totalResult, sectionResult, currencyResult, stockResult] = await Promise.all([
      pool.request().query(`SELECT COUNT(*) as total, SUM(ItemStock) as totalStock, AVG(ItemPrice) as avgPrice FROM ShopItemMap`),
      pool.request().query(`SELECT ItemSection, COUNT(*) as count FROM ShopItemMap GROUP BY ItemSection ORDER BY count DESC`),
      pool.request().query(`SELECT ItemCurrency, COUNT(*) as count FROM ShopItemMap GROUP BY ItemCurrency ORDER BY count DESC`),
      pool.request().query(`SELECT SUM(ItemStock) as totalStock FROM ShopItemMap`)
    ]);

    res.json({
      success: true,
      stats: {
        totalItems: totalResult.recordset[0].total,
        totalStock: stockResult.recordset[0].totalStock || 0,
        avgPrice: Math.round(totalResult.recordset[0].avgPrice || 0),
        bySection: sectionResult.recordset,
        byCurrency: currencyResult.recordset
      }
    });
  } catch (error: any) {
    console.error('Get shop stats error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
