import { Router, Request, Response } from 'express';
import { getUserPool, getGamePool } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// ============ Dashboard ============

router.get('/stats', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const gamePool = getGamePool();
    
    const [usersResult, charsResult, guildsResult] = await Promise.all([
      userPool.request().query(`SELECT COUNT(*) as count FROM UserInfo`),
      gamePool.request().query(`SELECT COUNT(*) as count FROM ChaInfo WHERE ChaDeleted = 0`),
      gamePool.request().query(`SELECT COUNT(*) as count FROM GuildInfo`)
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers: usersResult.recordset[0].count,
        totalCharacters: charsResult.recordset[0].count,
        totalGuilds: guildsResult.recordset[0].count
      }
    });
    
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ Users Management ============

router.get('/users', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const { page = 1, limit = 20, search = '', status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = '';
    
    if (search && status !== undefined && status !== '') {
      whereClause = `WHERE (UserID LIKE @search OR UserName LIKE @search) AND UserAvailable = @status`;
    } else if (search) {
      whereClause = `WHERE UserID LIKE @search OR UserName LIKE @search`;
    } else if (status !== undefined && status !== '') {
      whereClause = `WHERE UserAvailable = @status`;
    }
    
    const countReq = userPool.request();
    if (search) countReq.input('search', `%${search}%`);
    if (status !== undefined && status !== '') countReq.input('status', Number(status));
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM UserInfo ${whereClause}`);
    const total = countResult.recordset[0].total;
    
    const dataReq = userPool.request();
    if (search) dataReq.input('search', `%${search}%`);
    if (status !== undefined && status !== '') dataReq.input('status', Number(status));
    dataReq.input('offset', offset);
    dataReq.input('limit', Number(limit));
    
    const result = await dataReq.query(`
      SELECT 
        UserID,
        UserName,
        UserPoint as Point,
        VotePoint,
        UserAvailable as Status,
        UserLoginState as LoginState,
        LastLoginDate as LastLogin,
        SvrNum
      FROM UserInfo
      ${whereClause}
      ORDER BY UserID
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    
    res.json({
      success: true,
      users: result.recordset,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
    
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

router.get('/users/:userId', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const gamePool = getGamePool();
    const { userId } = req.params;
    
    const result = await userPool.request()
      .input('userId', userId)
      .query(`
        SELECT 
          UserID,
          UserName,
          UserPass,
          UserPoint as Point,
          VotePoint,
          UserAvailable as Status,
          UserLoginState as LoginState,
          LastLoginDate as LastLogin,
          SvrNum,
          SGNum,
          UserNum
        FROM UserInfo 
        WHERE UserID = @userId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    
    const user = result.recordset[0];
    
    const charsResult = await gamePool.request()
      .input('userNum', user.UserNum)
      .query(`
        SELECT 
          ChaNum,
          ChaName,
          ChaLevel,
          ChaClass,
          ChaSchool,
          ChaOnline
        FROM ChaInfo
        WHERE UserNum = @userNum AND ChaDeleted = 0
        ORDER BY ChaLevel DESC
      `);
    
    res.json({
      success: true,
      user: {
        ...user,
        characters: charsResult.recordset
      }
    });
    
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

router.put('/users/:userId', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const { userId } = req.params;
    const { point, votePoint, status } = req.body;
    
    const checkResult = await userPool.request()
      .input('userId', userId)
      .query(`SELECT UserID FROM UserInfo WHERE UserID = @userId`);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    
    let updateFields: string[] = [];
    const request = userPool.request();
    request.input('userId', userId);
    
    if (point !== undefined) {
      updateFields.push('UserPoint = @point');
      request.input('point', Number(point));
    }
    if (votePoint !== undefined) {
      updateFields.push('VotePoint = @votePoint');
      request.input('votePoint', Number(votePoint));
    }
    if (status !== undefined) {
      updateFields.push('UserAvailable = @status');
      request.input('status', Number(status));
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัพเดท' });
    }
    
    await request.query(`UPDATE UserInfo SET ${updateFields.join(', ')} WHERE UserID = @userId`);
    
    res.json({ success: true, message: 'อัพเดทข้อมูลผู้ใช้สำเร็จ' });
    
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

router.post('/users/:userId/add-points', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const { userId } = req.params;
    const { amount, type = 'point' } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'กรุณาระบุจำนวนเงินที่ถูกต้อง' });
    }
    
    const checkResult = await userPool.request()
      .input('userId', userId)
      .query(`SELECT UserID FROM UserInfo WHERE UserID = @userId`);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    
    const column = type === 'vote' ? 'VotePoint' : 'UserPoint';
    
    await userPool.request()
      .input('userId', userId)
      .input('amount', Number(amount))
      .query(`UPDATE UserInfo SET ${column} = ${column} + @amount WHERE UserID = @userId`);
    
    const updatedResult = await userPool.request()
      .input('userId', userId)
      .query(`SELECT UserPoint, VotePoint FROM UserInfo WHERE UserID = @userId`);
    
    res.json({
      success: true,
      message: `เพิ่ม${type === 'vote' ? 'VotePoint' : 'Point'} ${amount} สำเร็จ`,
      balance: updatedResult.recordset[0]
    });
    
  } catch (error: any) {
    console.error('Add points error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

router.put('/users/:userId/status', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const { userId } = req.params;
    const { status } = req.body;
    
    const checkResult = await userPool.request()
      .input('userId', userId)
      .query(`SELECT UserID FROM UserInfo WHERE UserID = @userId`);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }
    
    await userPool.request()
      .input('userId', userId)
      .input('status', Number(status))
      .query(`UPDATE UserInfo SET UserAvailable = @status WHERE UserID = @userId`);
    
    res.json({
      success: true,
      message: status === 1 ? 'เปิดใช้งานผู้ใช้สำเร็จ' : 'ระงับการใช้งานผู้ใช้สำเร็จ'
    });
    
  } catch (error: any) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

router.get('/users/:userId/characters', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();
    const { userId } = req.params;
    
    // Get UserNum first
    const userResult = await userPool.request()
      .input('userId', userId)
      .query(`SELECT UserNum FROM UserInfo WHERE UserID = @userId`);
    
    if (userResult.recordset.length === 0) {
      return res.json({ success: true, characters: [] });
    }
    
    const userNum = userResult.recordset[0].UserNum;
    
    const result = await gamePool.request()
      .input('userNum', userNum)
      .query(`
        SELECT 
          ChaNum,
          ChaName,
          ChaLevel,
          ChaClass,
          ChaSchool,
          ChaOnline
        FROM ChaInfo
        WHERE UserNum = @userNum AND ChaDeleted = 0
        ORDER BY ChaLevel DESC
      `);
    
    res.json({ success: true, characters: result.recordset });
    
  } catch (error: any) {
    console.error('Get user characters error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ Characters ============

router.get('/characters', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = 'WHERE c.ChaDeleted = 0';
    const countReq = gamePool.request();
    if (search) {
      countReq.input('search', `%${search}%`);
      whereClause += ` AND c.ChaName LIKE @search`;
    }
    
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM ChaInfo c ${whereClause}`);
    const total = countResult.recordset[0].total;
    
    const dataReq = gamePool.request();
    if (search) dataReq.input('search', `%${search}%`);
    dataReq.input('offset', offset);
    dataReq.input('limit', Number(limit));
    
    const result = await dataReq.query(`
      SELECT 
        c.ChaNum,
        c.ChaName,
        c.ChaLevel,
        c.ChaClass,
        c.ChaSchool,
        c.UserNum
      FROM ChaInfo c
      ${whereClause}
      ORDER BY c.ChaLevel DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    
    // Get user names from RanUser
    const chars = result.recordset;
    if (chars.length > 0) {
      const userNums = [...new Set(chars.map((c: any) => c.UserNum).filter(Boolean))];
      if (userNums.length > 0) {
        const placeholders = userNums.map((_, i) => `@u${i}`).join(',');
        const userReq = userPool.request();
        userNums.forEach((n, i) => userReq.input(`u${i}`, n));
        const userResult = await userReq.query(`
          SELECT UserNum, UserID, UserName FROM UserInfo 
          WHERE UserNum IN (${placeholders})
        `);
        const userMap: Record<number, any> = {};
        userResult.recordset.forEach((u: any) => { userMap[u.UserNum] = u; });
        chars.forEach((c: any) => {
          const user = userMap[c.UserNum];
          c.UserName = user ? (user.UserName || user.UserID) : '';
        });
      }
    }
    
    res.json({
      success: true,
      characters: chars,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
    
  } catch (error: any) {
    console.error('Get characters error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ Character Detail & Update ============

// ดึงข้อมูลตัวละครครบถ้วน
router.get('/characters/:chaNum', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();
    const { chaNum } = req.params;
    
    const result = await gamePool.request()
      .input('chaNum', Number(chaNum))
      .query(`
        SELECT 
          ChaNum, SGNum, UserNum, GuNum, GuPosition,
          ChaName, ChaGuName, ChaTribe, ChaClass, ChaSchool,
          ChaHair, ChaFace, ChaLiving, ChaLevel, ChaReborn,
          ChaMoney, ChaPower, ChaDex, ChaSpirit, ChaStrong,
          ChaStrength, ChaIntel, ChaStRemain, ChaExp, ChaReExp,
          ChaViewRange, ChaHP, ChaMP, ChaSP, ChaCP,
          ChaStartMap, ChaStartGate, ChaPosX, ChaPosY, ChaPosZ,
          ChaSaveMap, ChaSavePosX, ChaSavePosY, ChaSavePosZ,
          ChaReturnMap, ChaReturnPosX, ChaReturnPosY, ChaReturnPosZ,
          ChaBright, ChaAttackP, ChaDefenseP, ChaFightA, ChaShootA,
          ChaPK, ChaSkillPoint, ChaInvenLine, ChaDeleted, ChaOnline,
          ChaCreateDate, ChaDeletedDate, ChaSex, ChaHairStyle, ChaHairColor,
          ChaPKRecord, ChaScaleRange, ChaContributionPoint3, ChaContributionPoint,
          ChaBadgeID, ChaActivityPoint, ChaBadge, ChaPKScore, ChaPKDeath,
          ChaWarChips, ChaGamePoints, ChaPlayTime, ChaPlayPoint, ChaColorName,
          ChaGuildPoint, ChaFeedStyle, ChaBattlePassLevel
        FROM ChaInfo 
        WHERE ChaNum = @chaNum
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบตัวละคร' });
    }
    
    const cha = result.recordset[0];
    
    // Get owner info
    let ownerInfo = null;
    if (cha.UserNum) {
      const ownerResult = await userPool.request()
        .input('userNum', cha.UserNum)
        .query(`SELECT UserNum, UserID, UserName FROM UserInfo WHERE UserNum = @userNum`);
      if (ownerResult.recordset.length > 0) {
        ownerInfo = ownerResult.recordset[0];
      }
    }
    
    // Get guild name
    let guildName = '';
    if (cha.GuNum && cha.GuNum > 0) {
      const guildResult = await gamePool.request()
        .input('guNum', cha.GuNum)
        .query(`SELECT GuName FROM GuildInfo WHERE GuNum = @guNum`);
      if (guildResult.recordset.length > 0) {
        guildName = guildResult.recordset[0].GuName;
      }
    }
    
    res.json({
      success: true,
      character: {
        ...cha,
        owner: ownerInfo,
        guildName
      }
    });
    
  } catch (error: any) {
    console.error('Get character detail error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// อัพเดทข้อมูลตัวละคร
router.put('/characters/:chaNum', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const { chaNum } = req.params;
    const updates = req.body;
    
    // Verify character exists
    const checkResult = await gamePool.request()
      .input('chaNum', Number(chaNum))
      .query(`SELECT ChaNum, ChaName FROM ChaInfo WHERE ChaNum = @chaNum`);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบตัวละคร' });
    }
    
    // Whitelist of editable fields
    const allowedFields: Record<string, string> = {
      // Basic
      ChaName: 'varchar', ChaSex: 'int', ChaHair: 'int', ChaFace: 'int',
      ChaHairStyle: 'int', ChaHairColor: 'int', ChaLiving: 'int',
      // Level & Class
      ChaLevel: 'int', ChaClass: 'int', ChaSchool: 'int', ChaTribe: 'int',
      ChaReborn: 'int', ChaExp: 'money', ChaReExp: 'float',
      // Stats
      ChaPower: 'bigint', ChaDex: 'bigint', ChaSpirit: 'bigint', ChaStrong: 'bigint',
      ChaStrength: 'bigint', ChaIntel: 'bigint', ChaStRemain: 'bigint',
      ChaSkillPoint: 'int',
      // HP/MP/SP
      ChaHP: 'bigint', ChaMP: 'bigint', ChaSP: 'bigint', ChaCP: 'bigint',
      // Money
      ChaMoney: 'money', ChaGamePoints: 'int',
      // Combat
      ChaAttackP: 'int', ChaDefenseP: 'int', ChaFightA: 'int', ChaShootA: 'int',
      ChaPK: 'int', ChaPKRecord: 'int', ChaPKScore: 'bigint', ChaPKDeath: 'bigint',
      // Position
      ChaStartMap: 'int', ChaStartGate: 'int',
      ChaPosX: 'float', ChaPosY: 'float', ChaPosZ: 'float',
      ChaSaveMap: 'int',
      ChaSavePosX: 'float', ChaSavePosY: 'float', ChaSavePosZ: 'float',
      ChaReturnMap: 'int',
      ChaReturnPosX: 'float', ChaReturnPosY: 'float', ChaReturnPosZ: 'float',
      // Other
      ChaBright: 'int', ChaViewRange: 'int', ChaScaleRange: 'float',
      ChaInvenLine: 'int', ChaDeleted: 'int', ChaOnline: 'int',
      ChaContributionPoint: 'bigint', ChaActivityPoint: 'bigint',
      ChaBadgeID: 'bigint', ChaWarChips: 'bigint',
      ChaGuildPoint: 'bigint', ChaFeedStyle: 'int', ChaBattlePassLevel: 'bigint',
      ChaColorName: 'int'
    };
    
    const setClauses: string[] = [];
    const request = gamePool.request();
    request.input('chaNum', Number(chaNum));
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key] && value !== undefined) {
        setClauses.push(`${key} = @${key}`);
        request.input(key, value);
      }
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัพเดท' });
    }
    
    await request.query(`
      UPDATE ChaInfo 
      SET ${setClauses.join(', ')}
      WHERE ChaNum = @chaNum
    `);
    
    res.json({
      success: true,
      message: `อัพเดทตัวละคร "${checkResult.recordset[0].ChaName}" สำเร็จ`
    });
    
  } catch (error: any) {
    console.error('Update character error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ Guilds ============

router.get('/guilds', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let whereClause = '';
    const countReq = gamePool.request();
    if (search) {
      countReq.input('search', `%${search}%`);
      whereClause = `WHERE g.GuName LIKE @search`;
    }
    
    const countResult = await countReq.query(`SELECT COUNT(*) as total FROM GuildInfo g ${whereClause}`);
    const total = countResult.recordset[0].total;
    
    const dataReq = gamePool.request();
    if (search) dataReq.input('search', `%${search}%`);
    dataReq.input('offset', offset);
    dataReq.input('limit', Number(limit));
    
    const result = await dataReq.query(`
      SELECT 
        g.GuNum,
        g.GuName,
        g.GuRank,
        g.GuMoney,
        g.ChaNum
      FROM GuildInfo g
      ${whereClause}
      ORDER BY g.GuRank DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
    
    // Get master names from RanUser (via ChaInfo -> UserInfo)
    const guilds = result.recordset;
    if (guilds.length > 0) {
      const chaNums = [...new Set(guilds.map((g: any) => g.ChaNum).filter(Boolean))];
      if (chaNums.length > 0) {
        const placeholders = chaNums.map((_, i) => `@c${i}`).join(',');
        const chaReq = gamePool.request();
        chaNums.forEach((n, i) => chaReq.input(`c${i}`, n));
        const chaResult = await chaReq.query(`
          SELECT ChaNum, UserNum FROM ChaInfo 
          WHERE ChaNum IN (${placeholders})
        `);
        const chaMap: Record<number, number> = {};
        chaResult.recordset.forEach((c: any) => { chaMap[c.ChaNum] = c.UserNum; });
        
        const userNums = [...new Set(chaResult.recordset.map((c: any) => c.UserNum).filter(Boolean))];
        if (userNums.length > 0) {
          const uPlaceholders = userNums.map((_, i) => `@u${i}`).join(',');
          const userReq = userPool.request();
          userNums.forEach((n, i) => userReq.input(`u${i}`, n));
          const userResult = await userReq.query(`
            SELECT UserNum, UserID, UserName FROM UserInfo 
            WHERE UserNum IN (${uPlaceholders})
          `);
          const userMap: Record<number, any> = {};
          userResult.recordset.forEach((u: any) => { userMap[u.UserNum] = u; });
          
          guilds.forEach((g: any) => {
            const userNum = chaMap[g.ChaNum];
            const user = userMap[userNum];
            g.MasterName = user ? (user.UserName || user.UserID) : '';
          });
        }
      }
    }
    
    res.json({
      success: true,
      guilds,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit))
    });
    
  } catch (error: any) {
    console.error('Get guilds error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ Guild Detail & Update ============

// ดึงข้อมูลกิลด์ครบถ้วน
router.get('/guilds/:guNum', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();
    const { guNum } = req.params;
    
    const result = await gamePool.request()
      .input('guNum', Number(guNum))
      .query(`
        SELECT 
          GuNum, ChaNum, GuDeputy, GuName, GuNotice,
          GuRank, GuMoney, GuIncomeMoney, GuMarkVer, GuExpire,
          GuMakeTime, GuExpireTime, GuAuthorityTime,
          GuAllianceBattleLose, GuAllianceBattleDraw, GuAllianceBattleWin,
          GuBattleLastTime, GuBattleLose, GuBattleDraw, GuBattleWin
        FROM GuildInfo 
        WHERE GuNum = @guNum
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบกิลด์' });
    }
    
    const guild = result.recordset[0];
    
    // Get master info (from ChaInfo -> UserInfo)
    let masterInfo = null;
    if (guild.ChaNum) {
      const chaResult = await gamePool.request()
        .input('chaNum', guild.ChaNum)
        .query(`SELECT ChaNum, ChaName, ChaLevel, ChaClass, UserNum FROM ChaInfo WHERE ChaNum = @chaNum`);
      if (chaResult.recordset.length > 0) {
        const cha = chaResult.recordset[0];
        const userResult = await userPool.request()
          .input('userNum', cha.UserNum)
          .query(`SELECT UserID, UserName FROM UserInfo WHERE UserNum = @userNum`);
        masterInfo = {
          ...cha,
          UserID: userResult.recordset[0]?.UserID || '',
          UserName: userResult.recordset[0]?.UserName || ''
        };
      }
    }
    
    // Get deputy info
    let deputyInfo = null;
    if (guild.GuDeputy && guild.GuDeputy > 0) {
      const depChaResult = await gamePool.request()
        .input('chaNum', guild.GuDeputy)
        .query(`SELECT ChaNum, ChaName, ChaLevel, ChaClass, UserNum FROM ChaInfo WHERE ChaNum = @chaNum`);
      if (depChaResult.recordset.length > 0) {
        const cha = depChaResult.recordset[0];
        const userResult = await userPool.request()
          .input('userNum', cha.UserNum)
          .query(`SELECT UserID, UserName FROM UserInfo WHERE UserNum = @userNum`);
        deputyInfo = {
          ...cha,
          UserID: userResult.recordset[0]?.UserID || '',
          UserName: userResult.recordset[0]?.UserName || ''
        };
      }
    }
    
    // Get guild members
    const membersResult = await gamePool.request()
      .input('guNum', Number(guNum))
      .query(`
        SELECT 
          c.ChaNum, c.ChaName, c.ChaLevel, c.ChaClass, c.ChaSchool,
          c.GuPosition, c.ChaOnline, c.UserNum
        FROM ChaInfo c
        WHERE c.GuNum = @guNum AND c.ChaDeleted = 0
        ORDER BY c.GuPosition ASC, c.ChaLevel DESC
      `);
    
    const members = membersResult.recordset;
    
    // Get user names for members
    if (members.length > 0) {
      const userNums = [...new Set(members.map((m: any) => m.UserNum).filter(Boolean))];
      if (userNums.length > 0) {
        const placeholders = userNums.map((_, i) => `@u${i}`).join(',');
        const userReq = userPool.request();
        userNums.forEach((n, i) => userReq.input(`u${i}`, n));
        const userResult = await userReq.query(`
          SELECT UserNum, UserID, UserName FROM UserInfo 
          WHERE UserNum IN (${placeholders})
        `);
        const userMap: Record<number, any> = {};
        userResult.recordset.forEach((u: any) => { userMap[u.UserNum] = u; });
        members.forEach((m: any) => {
          const user = userMap[m.UserNum];
          m.UserID = user?.UserID || '';
          m.UserName = user?.UserName || '';
        });
      }
    }
    
    res.json({
      success: true,
      guild: {
        ...guild,
        master: masterInfo,
        deputy: deputyInfo,
        members,
        memberCount: members.length
      }
    });
    
  } catch (error: any) {
    console.error('Get guild detail error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// อัพเดทข้อมูลกิลด์
router.put('/guilds/:guNum', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const { guNum } = req.params;
    const updates = req.body;
    
    const checkResult = await gamePool.request()
      .input('guNum', Number(guNum))
      .query(`SELECT GuNum, GuName FROM GuildInfo WHERE GuNum = @guNum`);
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบกิลด์' });
    }
    
    const allowedFields: Record<string, string> = {
      GuName: 'varchar', GuNotice: 'varchar', GuRank: 'int',
      GuMoney: 'money', GuIncomeMoney: 'money',
      GuMarkVer: 'int', GuExpire: 'int',
      GuAllianceBattleLose: 'int', GuAllianceBattleDraw: 'int', GuAllianceBattleWin: 'int',
      GuBattleLose: 'int', GuBattleDraw: 'int', GuBattleWin: 'int'
    };
    
    const setClauses: string[] = [];
    const request = gamePool.request();
    request.input('guNum', Number(guNum));
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key] && value !== undefined) {
        setClauses.push(`${key} = @${key}`);
        request.input(key, value);
      }
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่ต้องอัพเดท' });
    }
    
    await request.query(`UPDATE GuildInfo SET ${setClauses.join(', ')} WHERE GuNum = @guNum`);
    
    res.json({
      success: true,
      message: `อัพเดทกิลด์ "${checkResult.recordset[0].GuName}" สำเร็จ`
    });
    
  } catch (error: any) {
    console.error('Update guild error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ Orders & Logs ============

router.get('/orders', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const result = await userPool.request().query(`SELECT TOP 50 * FROM Orders ORDER BY CreatedDate DESC`);
    res.json({ success: true, orders: result.recordset });
  } catch (error: any) {
    res.json({ success: true, orders: [] });
  }
});

router.get('/logs', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const logPool = getUserPool();
    const result = await logPool.request().query(`SELECT TOP 100 * FROM ActivityLogs ORDER BY CreatedDate DESC`);
    res.json({ success: true, logs: result.recordset });
  } catch (error: any) {
    res.json({ success: true, logs: [] });
  }
});

export default router;
