import { Router, Request, Response } from 'express';
import { getUserPool, getGamePool, getLogPool, getShopPool } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// Helper: Log GM command
async function logGMCommand(admin: any, command: string) {
  try {
    const logPool = getLogPool();
    await logPool.request()
      .input('userID', admin.adminID || 0)
      .input('userType', 99)
      .input('charID', 0)
      .input('charName', admin.username || 'ADMIN')
      .input('command', command)
      .query(`INSERT INTO GM_Logs (GMUserID, GMUserType, GMCharID, GMCharName, GMCommand, Date) VALUES (@userID, @userType, @charID, @charName, @command, GETDATE())`);
  } catch (e) {
    console.error('Log GM command error:', e);
  }
}

// ============ ONLINE PLAYERS ============

router.get('/online', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();

    const result = await gamePool.request().query(`
      SELECT c.ChaNum, c.ChaName, c.ChaLevel, c.ChaClass, c.ChaSchool, c.UserNum, c.ChaOnline
      FROM ChaInfo c
      WHERE c.ChaOnline = 1 AND c.ChaDeleted = 0
      ORDER BY c.ChaLevel DESC
    `);

    const chars = result.recordset;
    if (chars.length > 0) {
      const userNums = [...new Set(chars.map((c: any) => c.UserNum).filter(Boolean))];
      if (userNums.length > 0) {
        const placeholders = userNums.map((_, i) => `@u${i}`).join(',');
        const userReq = userPool.request();
        userNums.forEach((n, i) => userReq.input(`u${i}`, n));
        const userResult = await userReq.query(`
          SELECT UserNum, UserID, UserName, UserPoint, VotePoint FROM UserInfo WHERE UserNum IN (${placeholders})
        `);
        const userMap: Record<number, any> = {};
        userResult.recordset.forEach((u: any) => { userMap[u.UserNum] = u; });
        chars.forEach((c: any) => {
          const user = userMap[c.UserNum];
          c.UserID = user?.UserID || '';
          c.UserName = user?.UserName || '';
          c.UserPoint = user?.UserPoint || 0;
          c.VotePoint = user?.VotePoint || 0;
        });
      }
    }

    res.json({ success: true, players: chars, total: chars.length });
  } catch (error: any) {
    console.error('Get online players error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ POINTS MANAGEMENT ============

router.post('/points', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const gamePool = getGamePool();
    const { action, amount, pointType = 'UserPoint', target, userIds = [] } = req.body;

    if (!action || !amount || amount <= 0) {
      return res.status(400).json({ error: 'กรุณาระบุ action (add/deduct) และ amount ที่ถูกต้อง' });
    }
    if (!['add', 'deduct'].includes(action)) {
      return res.status(400).json({ error: 'action ต้องเป็น add หรือ deduct เท่านั้น' });
    }
    if (!['UserPoint', 'VotePoint'].includes(pointType)) {
      return res.status(400).json({ error: 'pointType ต้องเป็น UserPoint หรือ VotePoint' });
    }
    if (!target || !['all', 'online', 'specific'].includes(target)) {
      return res.status(400).json({ error: 'target ต้องเป็น all, online, หรือ specific' });
    }
    if (target === 'specific' && (!userIds || userIds.length === 0)) {
      return res.status(400).json({ error: 'กรุณาระบุ userIds อย่างน้อย 1 คน' });
    }

    const sign = action === 'add' ? '+' : '-';
    let whereClause = '';
    const request = userPool.request();

    if (target === 'all') {
      whereClause = '1=1';
    } else if (target === 'online') {
      // Get online UserNums from ChaInfo
      const onlineResult = await gamePool.request().query(
        `SELECT DISTINCT UserNum FROM ChaInfo WHERE ChaOnline = 1 AND ChaDeleted = 0`
      );
      const onlineUserNums = onlineResult.recordset.map((r: any) => r.UserNum);
      if (onlineUserNums.length === 0) {
        return res.json({ success: true, message: 'ไม่มีผู้เล่นออนไลน์', affected: 0 });
      }
      const placeholders = onlineUserNums.map((_: any, i: number) => `@on${i}`).join(',');
      onlineUserNums.forEach((n: number, i: number) => request.input(`on${i}`, n));
      whereClause = `UserNum IN (${placeholders})`;
    } else if (target === 'specific') {
      const uniqueIds = [...new Set(userIds)];
      const placeholders = uniqueIds.map((_: any, i: number) => `@sp${i}`).join(',');
      uniqueIds.forEach((id: any, i: number) => request.input(`sp${i}`, id));
      whereClause = `UserID IN (${placeholders})`;
    }

    request.input('amount', Number(amount));
    await request.query(`UPDATE UserInfo SET ${pointType} = ${pointType} ${sign} @amount WHERE ${whereClause}`);

    // Count affected
    let affected = 0;
    if (target === 'specific') {
      const uniqueIds = [...new Set(userIds)];
      const countReq = userPool.request();
      const placeholders = uniqueIds.map((_: any, i: number) => `@c${i}`).join(',');
      uniqueIds.forEach((id: any, i: number) => countReq.input(`c${i}`, id));
      const countResult = await countReq.query(`SELECT COUNT(*) as cnt FROM UserInfo WHERE UserID IN (${placeholders})`);
      affected = countResult.recordset[0].cnt;
    } else if (target === 'online') {
      const onlineCount = await gamePool.request().query(
        `SELECT COUNT(DISTINCT UserNum) as cnt FROM ChaInfo WHERE ChaOnline = 1 AND ChaDeleted = 0`
      );
      affected = onlineCount.recordset[0].cnt;
    } else {
      const allCount = await userPool.request().query(`SELECT COUNT(*) as cnt FROM UserInfo`);
      affected = allCount.recordset[0].cnt;
    }

    const command = `POINT ${action.toUpperCase()} ${pointType} ${amount} | Target: ${target} | Affected: ${affected}`;
    await logGMCommand(req.user, command);

    res.json({
      success: true,
      message: `${action === 'add' ? 'เพิ่ม' : 'หัก'}${pointType === 'UserPoint' ? ' Premium Point' : ' Vote Point'} ${amount} ${sign} สำหรับ ${target === 'all' ? 'ทุกคน' : target === 'online' ? 'ผู้เล่นออนไลน์' : `${userIds.length} คน`} (${affected} คน) สำเร็จ`,
      affected
    });
  } catch (error: any) {
    console.error('Points action error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ MONEY MANAGEMENT ============

router.post('/money', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();
    const { action, amount, target, userIds = [] } = req.body;

    if (!action || !amount || amount <= 0) {
      return res.status(400).json({ error: 'กรุณาระบุ action (add/deduct) และ amount ที่ถูกต้อง' });
    }
    if (!['add', 'deduct'].includes(action)) {
      return res.status(400).json({ error: 'action ต้องเป็น add หรือ deduct เท่านั้น' });
    }
    if (!target || !['all', 'online', 'specific'].includes(target)) {
      return res.status(400).json({ error: 'target ต้องเป็น all, online, หรือ specific' });
    }
    if (target === 'specific' && (!userIds || userIds.length === 0)) {
      return res.status(400).json({ error: 'กรุณาระบุ userIds อย่างน้อย 1 คน' });
    }

    const sign = action === 'add' ? '+' : '-';
    let chaNums: number[] = [];

    if (target === 'all') {
      const result = await gamePool.request().query(`SELECT ChaNum FROM ChaInfo WHERE ChaDeleted = 0`);
      chaNums = result.recordset.map((r: any) => r.ChaNum);
    } else if (target === 'online') {
      const result = await gamePool.request().query(`SELECT ChaNum FROM ChaInfo WHERE ChaOnline = 1 AND ChaDeleted = 0`);
      chaNums = result.recordset.map((r: any) => r.ChaNum);
    } else if (target === 'specific') {
      // Get ChaNums from UserIDs
      const uniqueIds = [...new Set(userIds)];
      const userReq = userPool.request();
      const placeholders = uniqueIds.map((_: any, i: number) => `@u${i}`).join(',');
      uniqueIds.forEach((id: any, i: number) => userReq.input(`u${i}`, id));
      const userResult = await userReq.query(`SELECT UserNum FROM UserInfo WHERE UserID IN (${placeholders})`);
      const userNums = userResult.recordset.map((r: any) => r.UserNum);

      if (userNums.length > 0) {
        const chaReq = gamePool.request();
        const cPlaceholders = userNums.map((_: any, i: number) => `@cu${i}`).join(',');
        userNums.forEach((n: number, i: number) => chaReq.input(`cu${i}`, n));
        const chaResult = await chaReq.query(`SELECT ChaNum FROM ChaInfo WHERE UserNum IN (${cPlaceholders}) AND ChaDeleted = 0`);
        chaNums = chaResult.recordset.map((r: any) => r.ChaNum);
      }
    }

    if (chaNums.length === 0) {
      return res.json({ success: true, message: 'ไม่พบตัวละครที่ตรงเงื่อนไข', affected: 0 });
    }

    const batchReq = gamePool.request();
    const placeholders = chaNums.map((_: any, i: number) => `@ch${i}`).join(',');
    chaNums.forEach((n: number, i: number) => batchReq.input(`ch${i}`, n));
    batchReq.input('amount', Number(amount));
    await batchReq.query(`UPDATE ChaInfo SET ChaMoney = ChaMoney ${sign} @amount WHERE ChaNum IN (${placeholders})`);

    const command = `MONEY ${action.toUpperCase()} ${amount} | Target: ${target} | Affected: ${chaNums.length} chars`;
    await logGMCommand(req.user, command);

    res.json({
      success: true,
      message: `${action === 'add' ? 'เพิ่ม' : 'หัก'}เงิน ${Number(amount).toLocaleString()} ${sign} สำหรับ ${target === 'all' ? 'ทุกตัวละคร' : target === 'online' ? 'ตัวละครออนไลน์' : `${userIds.length} คน`} (${chaNums.length} ตัวละคร) สำเร็จ`,
      affected: chaNums.length
    });
  } catch (error: any) {
    console.error('Money action error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ SKILL POINTS ============

router.post('/skill-points', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();
    const { action, amount, target, userIds = [] } = req.body;

    if (!action || !amount || amount <= 0) {
      return res.status(400).json({ error: 'กรุณาระบุ action (add/deduct) และ amount ที่ถูกต้อง' });
    }
    if (!['add', 'deduct'].includes(action)) {
      return res.status(400).json({ error: 'action ต้องเป็น add หรือ deduct เท่านั้น' });
    }
    if (!target || !['all', 'online', 'specific'].includes(target)) {
      return res.status(400).json({ error: 'target ต้องเป็น all, online, หรือ specific' });
    }
    if (target === 'specific' && (!userIds || userIds.length === 0)) {
      return res.status(400).json({ error: 'กรุณาระบุ userIds อย่างน้อย 1 คน' });
    }

    const sign = action === 'add' ? '+' : '-';
    let chaNums: number[] = [];

    if (target === 'all') {
      const result = await gamePool.request().query(`SELECT ChaNum FROM ChaInfo WHERE ChaDeleted = 0`);
      chaNums = result.recordset.map((r: any) => r.ChaNum);
    } else if (target === 'online') {
      const result = await gamePool.request().query(`SELECT ChaNum FROM ChaInfo WHERE ChaOnline = 1 AND ChaDeleted = 0`);
      chaNums = result.recordset.map((r: any) => r.ChaNum);
    } else if (target === 'specific') {
      const uniqueIds = [...new Set(userIds)];
      const userReq = userPool.request();
      const placeholders = uniqueIds.map((_: any, i: number) => `@u${i}`).join(',');
      uniqueIds.forEach((id: any, i: number) => userReq.input(`u${i}`, id));
      const userResult = await userReq.query(`SELECT UserNum FROM UserInfo WHERE UserID IN (${placeholders})`);
      const userNums = userResult.recordset.map((r: any) => r.UserNum);
      if (userNums.length > 0) {
        const chaReq = gamePool.request();
        const cPlaceholders = userNums.map((_: any, i: number) => `@cu${i}`).join(',');
        userNums.forEach((n: number, i: number) => chaReq.input(`cu${i}`, n));
        const chaResult = await chaReq.query(`SELECT ChaNum FROM ChaInfo WHERE UserNum IN (${cPlaceholders}) AND ChaDeleted = 0`);
        chaNums = chaResult.recordset.map((r: any) => r.ChaNum);
      }
    }

    if (chaNums.length === 0) {
      return res.json({ success: true, message: 'ไม่พบตัวละครที่ตรงเงื่อนไข', affected: 0 });
    }

    const batchReq = gamePool.request();
    const placeholders = chaNums.map((_: any, i: number) => `@ch${i}`).join(',');
    chaNums.forEach((n: number, i: number) => batchReq.input(`ch${i}`, n));
    batchReq.input('amount', Number(amount));
    await batchReq.query(`UPDATE ChaInfo SET ChaSkillPoint = ChaSkillPoint ${sign} @amount WHERE ChaNum IN (${placeholders})`);

    const command = `SKILLPOINT ${action.toUpperCase()} ${amount} | Target: ${target} | Affected: ${chaNums.length}`;
    await logGMCommand(req.user, command);

    res.json({
      success: true,
      message: `${action === 'add' ? 'เพิ่ม' : 'หัก'}Skill Point ${Number(amount).toLocaleString()} ${sign} สำหรับ ${chaNums.length} ตัวละคร สำเร็จ`,
      affected: chaNums.length
    });
  } catch (error: any) {
    console.error('Skill points action error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ SEND ITEM ============

router.get('/items', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const shopPool = getShopPool();
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = '';
    const countReq = shopPool.request();
    const dataReq = shopPool.request();

    if (search) {
      whereClause = 'WHERE ItemName LIKE @search';
      countReq.input('search', `%${search}%`);
      dataReq.input('search', `%${search}%`);
    }

    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM ShopItemMap ${whereClause}`);
    const total = countResult.recordset[0].total;

    dataReq.input('offset', offset);
    dataReq.input('limit', Number(limit));
    const result = await dataReq.query(`
      SELECT ProductNum, ItemMain, ItemSub, ItemName, ItemStock, ItemPrice, ItemSection, ItemCurrency, ItemDiscount, ItemMoney
      FROM ShopItemMap
      ${whereClause}
      ORDER BY ItemName
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
    console.error('Get items error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

router.post('/send-item', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const shopPool = getShopPool();
    const userPool = getUserPool();
    const gamePool = getGamePool();
    const { productNum, userIds, amount = 1 } = req.body;

    if (!productNum || !userIds || userIds.length === 0) {
      return res.status(400).json({ error: 'กรุณาระบุ productNum และ userIds' });
    }

    // Get item info from ShopItemMap
    const itemResult = await shopPool.request()
      .input('productNum', Number(productNum))
      .query(`SELECT * FROM ShopItemMap WHERE ProductNum = @productNum`);

    if (itemResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบไอเทมในร้านค้า' });
    }

    const item = itemResult.recordset[0];
    const uniqueIds = [...new Set(userIds)];
    let successCount = 0;
    let failCount = 0;

    for (const userId of uniqueIds) {
      try {
        // Get UserNum
        const userResult = await userPool.request()
          .input('userId', userId)
          .query(`SELECT UserNum FROM UserInfo WHERE UserID = @userId`);

        if (userResult.recordset.length === 0) {
          failCount++;
          continue;
        }

        const userNum = userResult.recordset[0].UserNum;

        // Get SGNum
        const sgResult = await userPool.request()
          .input('userNum', userNum)
          .query(`SELECT SGNum FROM UserInfo WHERE UserNum = @userNum`);
        const sgNum = sgResult.recordset[0]?.SGNum || 1;

        // Insert into ShopPurchase (GM gift)
        await shopPool.request()
          .input('userUID', userId)
          .input('productNum', Number(productNum))
          .input('itemMain', item.ItemMain)
          .input('itemSub', item.ItemSub)
          .input('amount', Number(amount))
          .query(`
            INSERT INTO ShopPurchase (UserUID, ProductNum, ItemMain, ItemSub, ItemAmount, PurFlag, PurDate)
            VALUES (@userUID, @productNum, @itemMain, @itemSub, @amount, 0, GETDATE())
          `);

        successCount++;
      } catch (e) {
        console.error(`Send item to ${userId} error:`, e);
        failCount++;
      }
    }

    const command = `SEND ITEM [${item.ItemName}] (MID:${item.ItemMain}, SID:${item.ItemSub}) x${amount} | To: ${uniqueIds.length} users | Success: ${successCount} | Fail: ${failCount}`;
    await logGMCommand(req.user, command);

    res.json({
      success: true,
      message: `ส่งไอเทม "${item.ItemName}" x${amount} ให้ ${successCount} คน สำเร็จ (${failCount} คนล้มเหลว)`,
      item: { name: item.ItemName, mid: item.ItemMain, sid: item.ItemSub },
      successCount,
      failCount
    });
  } catch (error: any) {
    console.error('Send item error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ SERVER ANNOUNCEMENT ============

router.post('/announce', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const { message, type = 1, duration = 60 } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'กรุณาระบุข้อความประกาศ' });
    }

    // Insert into GameNotice
    await gamePool.request()
      .input('message', message)
      .input('type', Number(type))
      .query(`
        INSERT INTO GameNotice (Message, Type, DaySunday, DayMonday, DayTuesday, DayWednesday, DayThursday, DayFriday, DaySaturday, Hour, Minute)
        VALUES (@message, @type, 1, 1, 1, 1, 1, 1, 1, DATEPART(HOUR, GETDATE()), DATEPART(MINUTE, GETDATE()))
      `);

    const command = `ANNOUNCE: "${message}" | Type: ${type}`;
    await logGMCommand(req.user, command);

    res.json({ success: true, message: 'ประกาศสำเร็จ: ' + message });
  } catch (error: any) {
    console.error('Announce error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ USER RESTRICTION ============

router.post('/restrict', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const { userId, restricted } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'กรุณาระบุ userId' });
    }

    const checkResult = await userPool.request()
      .input('userId', userId)
      .query(`SELECT UserID FROM UserInfo WHERE UserID = @userId`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    await userPool.request()
      .input('userId', userId)
      .input('restricted', restricted ? 1 : 0)
      .query(`UPDATE UserInfo SET UserFlagRestricted = @restricted WHERE UserID = @userId`);

    const command = `RESTRICT ${userId} -> ${restricted ? 'BLOCKED' : 'UNBLOCKED'}`;
    await logGMCommand(req.user, command);

    res.json({
      success: true,
      message: `${restricted ? 'ระงับ' : 'ปลดระงับ'}ผู้ใช้ ${userId} สำเร็จ`
    });
  } catch (error: any) {
    console.error('Restrict error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ CHAT BLOCK ============

router.post('/chat-block', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const logPool = getLogPool();
    const { userId, minutes = 60, reason = '' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'กรุณาระบุ userId' });
    }

    const checkResult = await userPool.request()
      .input('userId', userId)
      .query(`SELECT UserNum, UserID FROM UserInfo WHERE UserID = @userId`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    const user = checkResult.recordset[0];
    const blockDate = new Date(Date.now() + minutes * 60000);

    await userPool.request()
      .input('userId', userId)
      .input('blockDate', blockDate)
      .query(`UPDATE UserInfo SET ChatBlockDate = @blockDate WHERE UserID = @userId`);

    // Log to LogChatBlock
    try {
      await logPool.request()
        .input('userNum', user.UserNum)
        .input('userId', userId)
        .input('blockDate', blockDate)
        .input('reason', reason || 'GM Block')
        .input('gmUserNum', 0)
        .input('gmUserId', req.user?.username || 'ADMIN')
        .query(`
          INSERT INTO LogChatBlock (UserNum, UserID, ChatBlockDate, ChatBlockReason, GMUserNum, GMUserID)
          VALUES (@userNum, @userId, @blockDate, @reason, @gmUserNum, @gmUserId)
        `);
    } catch (e) { /* log table might not exist */ }

    const command = `CHAT BLOCK ${userId} | ${minutes} mins | Reason: ${reason}`;
    await logGMCommand(req.user, command);

    res.json({
      success: true,
      message: `บล็อคแชท ${userId} เป็นเวลา ${minutes} นาที สำเร็จ`
    });
  } catch (error: any) {
    console.error('Chat block error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ KICK PLAYER (Force Offline) ============

router.post('/kick', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();
    const { chaNum } = req.body;

    if (!chaNum) {
      return res.status(400).json({ error: 'กรุณาระบุ chaNum' });
    }

    const checkResult = await gamePool.request()
      .input('chaNum', Number(chaNum))
      .query(`SELECT ChaNum, ChaName FROM ChaInfo WHERE ChaNum = @chaNum`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบตัวละคร' });
    }

    // Force offline
    await gamePool.request()
      .input('chaNum', Number(chaNum))
      .query(`UPDATE ChaInfo SET ChaOnline = 0 WHERE ChaNum = @chaNum`);

    const cha = checkResult.recordset[0];
    const command = `KICK ChaNum:${chaNum} (${cha.ChaName})`;
    await logGMCommand(req.user, command);

    res.json({
      success: true,
      message: `เตะตัวละคร "${cha.ChaName}" ออกจากระบบสำเร็จ`
    });
  } catch (error: any) {
    console.error('Kick error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ RESET CHARACTER ============

router.post('/reset-character', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const { chaNum, resetType } = req.body;

    if (!chaNum || !resetType) {
      return res.status(400).json({ error: 'กรุณาระบุ chaNum และ resetType' });
    }

    const checkResult = await gamePool.request()
      .input('chaNum', Number(chaNum))
      .query(`SELECT ChaNum, ChaName FROM ChaInfo WHERE ChaNum = @chaNum`);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบตัวละคร' });
    }

    let setClause = '';
    switch (resetType) {
      case 'stats':
        setClause = 'ChaPower=0, ChaDex=0, ChaSpirit=0, ChaStrong=0, ChaStrength=0, ChaIntel=0, ChaStRemain=0';
        break;
      case 'position':
        setClause = 'ChaStartMap=0, ChaStartGate=0, ChaPosX=0, ChaPosY=0, ChaPosZ=0';
        break;
      case 'pk':
        setClause = 'ChaPK=0, ChaPKRecord=0, ChaPKScore=0, ChaPKDeath=0';
        break;
      case 'all':
        setClause = 'ChaPower=0, ChaDex=0, ChaSpirit=0, ChaStrong=0, ChaStrength=0, ChaIntel=0, ChaStRemain=0, ChaSkillPoint=0, ChaPK=0, ChaPKRecord=0, ChaPKScore=0, ChaPKDeath=0';
        break;
      default:
        return res.status(400).json({ error: 'resetType ต้องเป็น stats, position, pk, หรือ all' });
    }

    await gamePool.request()
      .input('chaNum', Number(chaNum))
      .query(`UPDATE ChaInfo SET ${setClause} WHERE ChaNum = @chaNum`);

    const command = `RESET CHARACTER ${chaNum} (${checkResult.recordset[0].ChaName}) | Type: ${resetType}`;
    await logGMCommand(req.user, command);

    res.json({
      success: true,
      message: `รีเซ็ตตัวละคร "${checkResult.recordset[0].ChaName}" (${resetType}) สำเร็จ`
    });
  } catch (error: any) {
    console.error('Reset character error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ GM LOGS ============

router.get('/logs', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const logPool = getLogPool();
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const countResult = await logPool.request().query(`SELECT COUNT(*) as total FROM GM_Logs`);
    const total = countResult.recordset[0].total;

    const result = await logPool.request()
      .input('offset', offset)
      .input('limit', Number(limit))
      .query(`
        SELECT RecordID, GMUserID, GMUserType, GMCharID, GMCharName, GMCommand, Date
        FROM GM_Logs
        ORDER BY Date DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    res.json({
      success: true,
      logs: result.recordset,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    console.error('Get GM logs error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ SEARCH PLAYER ============

router.get('/search-player', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const gamePool = getGamePool();
    const { q = '' } = req.query;

    if (!q) {
      return res.json({ success: true, players: [] });
    }

    // Search by UserID or UserName
    const userResult = await userPool.request()
      .input('q', `%${q}%`)
      .query(`
        SELECT UserNum, UserID, UserName, UserPoint, VotePoint, UserLoginState, UserAvailable
        FROM UserInfo
        WHERE UserID LIKE @q OR UserName LIKE @q
        ORDER BY UserID
        OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
      `);

    const users = userResult.recordset;

    // Get characters for each user
    if (users.length > 0) {
      const userNums = users.map((u: any) => u.UserNum);
      const placeholders = userNums.map((_: any, i: number) => `@u${i}`).join(',');
      const chaReq = gamePool.request();
      userNums.forEach((n: number, i: number) => chaReq.input(`u${i}`, n));
      const chaResult = await chaReq.query(`
        SELECT ChaNum, ChaName, ChaLevel, ChaClass, ChaOnline, UserNum
        FROM ChaInfo
        WHERE UserNum IN (${placeholders}) AND ChaDeleted = 0
        ORDER BY ChaLevel DESC
      `);

      const chaMap: Record<number, any[]> = {};
      chaResult.recordset.forEach((c: any) => {
        if (!chaMap[c.UserNum]) chaMap[c.UserNum] = [];
        chaMap[c.UserNum].push(c);
      });

      users.forEach((u: any) => {
        u.characters = chaMap[u.UserNum] || [];
      });
    }

    res.json({ success: true, players: users });
  } catch (error: any) {
    console.error('Search player error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ BULK OPERATIONS ============

router.post('/bulk-points', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const { action, amount, pointType = 'UserPoint', userIds } = req.body;

    if (!action || !amount || !userIds || userIds.length === 0) {
      return res.status(400).json({ error: 'กรุณาระบุข้อมูลให้ครบ' });
    }

    const sign = action === 'add' ? '+' : '-';
    const uniqueIds = [...new Set(userIds)];
    const request = userPool.request();
    const placeholders = uniqueIds.map((_: any, i: number) => `@u${i}`).join(',');
    uniqueIds.forEach((id: any, i: number) => request.input(`u${i}`, id));
    request.input('amount', Number(amount));

    await request.query(`UPDATE UserInfo SET ${pointType} = ${pointType} ${sign} @amount WHERE UserID IN (${placeholders})`);

    const command = `BULK POINT ${action.toUpperCase()} ${pointType} ${amount} | Users: ${uniqueIds.join(',')}`;
    await logGMCommand(req.user, command);

    res.json({
      success: true,
      message: `${action === 'add' ? 'เพิ่ม' : 'หัก'}${pointType} ${amount} ${sign} ให้ ${uniqueIds.length} คน สำเร็จ`
    });
  } catch (error: any) {
    console.error('Bulk points error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
