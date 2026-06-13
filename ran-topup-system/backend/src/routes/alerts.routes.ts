import { Router, Request, Response } from 'express';
import { getUserPool, getGamePool, getLogPool, getShopPool } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// ============ GET ALL ALERTS ============

router.get('/', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const gamePool = getGamePool();
    const shopPool = getShopPool();
    const logPool = getLogPool();

    const alerts: any[] = [];

    // 1. New players (registered in last 24 hours)
    try {
      const newPlayers = await userPool.request().query(`
        SELECT TOP 20 UserID, UserName, UserNum, LastLoginDate
        FROM UserInfo
        WHERE LastLoginDate >= DATEADD(HOUR, -24, GETDATE())
        ORDER BY LastLoginDate DESC
      `);
      if (newPlayers.recordset.length > 0) {
        // Get character info for new players
        const userNums = newPlayers.recordset.map((u: any) => u.UserNum);
        const placeholders = userNums.map((_: any, i: number) => `@u${i}`).join(',');
        const chaReq = gamePool.request();
        userNums.forEach((n: number, i: number) => chaReq.input(`u${i}`, n));
        const chaResult = await chaReq.query(`
          SELECT UserNum, COUNT(*) as charCount, MAX(ChaLevel) as maxLevel
          FROM ChaInfo WHERE UserNum IN (${placeholders}) AND ChaDeleted = 0
          GROUP BY UserNum
        `);
        const chaMap: Record<number, any> = {};
        chaResult.recordset.forEach((c: any) => { chaMap[c.UserNum] = c; });

        newPlayers.recordset.forEach((p: any) => {
          const cha = chaMap[p.UserNum];
          alerts.push({
            type: 'new_player',
            severity: 'info',
            icon: '👤',
            title: `ผู้เล่นใหม่: ${p.UserID}`,
            message: `${p.UserName || p.UserID} สมัครเมื่อ ${p.LastLoginDate ? new Date(p.LastLoginDate).toLocaleString('th-TH') : '-'}`,
            detail: `Characters: ${cha?.charCount || 0}, Max Level: ${cha?.maxLevel || 0}`,
            timestamp: p.LastLoginDate,
            userId: p.UserID
          });
        });
      }
    } catch (e) { }

    // 2. Low stock items (stock < 10)
    try {
      const lowStock = await shopPool.request().query(`
        SELECT ProductNum, ItemName, ItemStock, ItemPrice, ItemMain, ItemSub
        FROM ShopItemMap
        WHERE ItemStock < 10 AND ItemStock >= 0
        ORDER BY ItemStock ASC
      `);
      lowStock.recordset.forEach((item: any) => {
        alerts.push({
          type: 'low_stock',
          severity: item.ItemStock === 0 ? 'critical' : 'warning',
          icon: item.ItemStock === 0 ? '🚫' : '⚠️',
          title: item.ItemStock === 0 ? `ไอเทมหมด: ${item.ItemName}` : `สต็อกใกล้หมด: ${item.ItemName}`,
          message: `Stock: ${item.ItemStock} | Price: ${item.ItemPrice} | MID:${item.ItemMain} SID:${item.ItemSub}`,
          detail: `ProductNum: ${item.ProductNum}`,
          timestamp: new Date().toISOString(),
          productNum: item.ProductNum
        });
      });
    } catch (e) { }

    // 3. High PK characters (potential hackers/griefers)
    try {
      const highPK = await gamePool.request().query(`
        SELECT TOP 10 c.ChaNum, c.ChaName, c.ChaLevel, c.ChaClass, c.ChaPK, c.ChaPKRecord, c.ChaPKScore, c.UserNum
        FROM ChaInfo c
        WHERE c.ChaPK > 100 AND c.ChaDeleted = 0
        ORDER BY c.ChaPK DESC
      `);
      if (highPK.recordset.length > 0) {
        const userNums = highPK.recordset.map((c: any) => c.UserNum);
        const placeholders = userNums.map((_: any, i: number) => `@u${i}`).join(',');
        const userReq = userPool.request();
        userNums.forEach((n: number, i: number) => userReq.input(`u${i}`, n));
        const userResult = await userReq.query(`SELECT UserNum, UserID FROM UserInfo WHERE UserNum IN (${placeholders})`);
        const userMap: Record<number, string> = {};
        userResult.recordset.forEach((u: any) => { userMap[u.UserNum] = u.UserID; });

        highPK.recordset.forEach((c: any) => {
          alerts.push({
            type: 'high_pk',
            severity: 'warning',
            icon: '⚔️',
            title: `PK สูง: ${c.ChaName}`,
            message: `PK Kill: ${c.ChaPK} | Record: ${c.ChaPKRecord} | Score: ${c.ChaPKScore} | Lv.${c.ChaLevel}`,
            detail: `Owner: ${userMap[c.UserNum] || '?'}`,
            timestamp: new Date().toISOString(),
            chaNum: c.ChaNum
          });
        });
      }
    } catch (e) { }

    // 4. Characters with very high money (potential exploit)
    try {
      const richChars = await gamePool.request().query(`
        SELECT TOP 10 c.ChaNum, c.ChaName, c.ChaLevel, c.ChaMoney, c.UserNum
        FROM ChaInfo c
        WHERE c.ChaMoney > 10000000 AND c.ChaDeleted = 0
        ORDER BY c.ChaMoney DESC
      `);
      if (richChars.recordset.length > 0) {
        const userNums = richChars.recordset.map((c: any) => c.UserNum);
        const placeholders = userNums.map((_: any, i: number) => `@u${i}`).join(',');
        const userReq = userPool.request();
        userNums.forEach((n: number, i: number) => userReq.input(`u${i}`, n));
        const userResult = await userReq.query(`SELECT UserNum, UserID FROM UserInfo WHERE UserNum IN (${placeholders})`);
        const userMap: Record<number, string> = {};
        userResult.recordset.forEach((u: any) => { userMap[u.UserNum] = u.UserID; });

        richChars.recordset.forEach((c: any) => {
          alerts.push({
            type: 'high_money',
            severity: 'info',
            icon: '💰',
            title: `เงินจำนวนมาก: ${c.ChaName}`,
            message: `Zen: ${Number(c.ChaMoney).toLocaleString()} | Lv.${c.ChaLevel}`,
            detail: `Owner: ${userMap[c.UserNum] || '?'}`,
            timestamp: new Date().toISOString(),
            chaNum: c.ChaNum
          });
        });
      }
    } catch (e) { }

    // 5. GM activity in last 24h
    try {
      const gmActivity = await logPool.request().query(`
        SELECT TOP 10 GMCharName, COUNT(*) as commandCount, MAX(Date) as lastActivity
        FROM GM_Logs
        WHERE Date >= DATEADD(HOUR, -24, GETDATE())
        GROUP BY GMCharName
        ORDER BY commandCount DESC
      `);
      gmActivity.recordset.forEach((gm: any) => {
        alerts.push({
          type: 'gm_activity',
          severity: 'info',
          icon: '🎛️',
          title: `GM Activity: ${gm.GMCharName}`,
          message: `${gm.commandCount} คำสั่ง trong 24 ชม.`,
          detail: `Last: ${gm.lastActivity ? new Date(gm.lastActivity).toLocaleString('th-TH') : '-'}`,
          timestamp: gm.lastActivity
        });
      });
    } catch (e) { }

    // 6. Equipment lock disabled characters
    try {
      const unlocked = await gamePool.request().query(`
        SELECT TOP 10 c.ChaNum, c.ChaName, c.ChaLevel, c.UserNum
        FROM ChaInfo c
        WHERE c.ChaEquipmentLockEnable = 0 AND c.ChaDeleted = 0 AND c.ChaLevel > 100
        ORDER BY c.ChaLevel DESC
      `);
      if (unlocked.recordset.length > 0) {
        const userNums = unlocked.recordset.map((c: any) => c.UserNum);
        const placeholders = userNums.map((_: any, i: number) => `@u${i}`).join(',');
        const userReq = userPool.request();
        userNums.forEach((n: number, i: number) => userReq.input(`u${i}`, n));
        const userResult = await userReq.query(`SELECT UserNum, UserID FROM UserInfo WHERE UserNum IN (${placeholders})`);
        const userMap: Record<number, string> = {};
        userResult.recordset.forEach((u: any) => { userMap[u.UserNum] = u.UserID; });

        unlocked.recordset.forEach((c: any) => {
          alerts.push({
            type: 'no_equip_lock',
            severity: 'info',
            icon: '🔓',
            title: `ไม่ล็อคอุปกรณ์: ${c.ChaName}`,
            message: `Level ${c.ChaLevel} - ไม่ได้เปิด Equipment Lock`,
            detail: `Owner: ${userMap[c.UserNum] || '?'}`,
            timestamp: new Date().toISOString(),
            chaNum: c.ChaNum
          });
        });
      }
    } catch (e) { }

    // Sort by severity then timestamp
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    alerts.sort((a: any, b: any) => {
      const sa = severityOrder[a.severity] ?? 3;
      const sb = severityOrder[b.severity] ?? 3;
      if (sa !== sb) return sa - sb;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    // Summary
    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      byType: {
        new_player: alerts.filter(a => a.type === 'new_player').length,
        low_stock: alerts.filter(a => a.type === 'low_stock').length,
        high_pk: alerts.filter(a => a.type === 'high_pk').length,
        high_money: alerts.filter(a => a.type === 'high_money').length,
        gm_activity: alerts.filter(a => a.type === 'gm_activity').length,
        no_equip_lock: alerts.filter(a => a.type === 'no_equip_lock').length,
      }
    };

    res.json({ success: true, alerts, summary });
  } catch (error: any) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ ALERT STATS ============

router.get('/stats', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const gamePool = getGamePool();
    const shopPool = getShopPool();
    const logPool = getLogPool();

    const [newPlayers, lowStock, outOfStock, highPK, gmActivity] = await Promise.all([
      userPool.request().query(`SELECT COUNT(*) as count FROM UserInfo WHERE LastLoginDate >= DATEADD(HOUR, -24, GETDATE())`),
      shopPool.request().query(`SELECT COUNT(*) as count FROM ShopItemMap WHERE ItemStock < 10 AND ItemStock > 0`),
      shopPool.request().query(`SELECT COUNT(*) as count FROM ShopItemMap WHERE ItemStock = 0`),
      gamePool.request().query(`SELECT COUNT(*) as count FROM ChaInfo WHERE ChaPK > 100 AND ChaDeleted = 0`),
      logPool.request().query(`SELECT COUNT(*) as count FROM GM_Logs WHERE Date >= DATEADD(HOUR, -24, GETDATE())`)
    ]);

    res.json({
      success: true,
      stats: {
        newPlayers24h: newPlayers.recordset[0].count,
        lowStock: lowStock.recordset[0].count,
        outOfStock: outOfStock.recordset[0].count,
        highPK: highPK.recordset[0].count,
        gmCommands24h: gmActivity.recordset[0].count
      }
    });
  } catch (error: any) {
    console.error('Get alert stats error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
