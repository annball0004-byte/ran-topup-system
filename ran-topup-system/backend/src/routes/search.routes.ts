import { Router, Request, Response } from 'express';
import { getUserPool, getGamePool } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// ============ ADVANCED PLAYER SEARCH ============

router.get('/', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const userPool = getUserPool();
    const gamePool = getGamePool();
    const { q = '', type = 'all' } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, results: { users: [], characters: [], guilds: [] } });
    }

    const searchTerm = `%${q}%`;
    let users: any[] = [];
    let characters: any[] = [];
    let guilds: any[] = [];

    // Search Users (by UserID, UserName)
    if (type === 'all' || type === 'users') {
      try {
        const userResult = await userPool.request()
          .input('q', searchTerm)
          .query(`
            SELECT TOP 20 UserNum, UserID, UserName, UserPoint, VotePoint, 
                   UserLoginState, UserAvailable, LastLoginDate, SvrNum, SGNum
            FROM UserInfo
            WHERE UserID LIKE @q OR UserName LIKE @q
            ORDER BY UserID
          `);
        users = userResult.recordset;

        // Get character count for each user
        if (users.length > 0) {
          const userNums = users.map((u: any) => u.UserNum);
          const placeholders = userNums.map((_: any, i: number) => `@u${i}`).join(',');
          const chaReq = gamePool.request();
          userNums.forEach((n: number, i: number) => chaReq.input(`u${i}`, n));
          const chaResult = await chaReq.query(`
            SELECT UserNum, COUNT(*) as charCount,
                   MAX(ChaLevel) as maxLevel,
                   SUM(CASE WHEN ChaOnline = 1 THEN 1 ELSE 0 END) as onlineCount
            FROM ChaInfo
            WHERE UserNum IN (${placeholders}) AND ChaDeleted = 0
            GROUP BY UserNum
          `);
          const chaMap: Record<number, any> = {};
          chaResult.recordset.forEach((c: any) => { chaMap[c.UserNum] = c; });
          users.forEach((u: any) => {
            const cha = chaMap[u.UserNum];
            u.charCount = cha?.charCount || 0;
            u.maxLevel = cha?.maxLevel || 0;
            u.onlineCount = cha?.onlineCount || 0;
          });
        }
      } catch (e) { users = []; }
    }

    // Search Characters (by ChaName)
    if (type === 'all' || type === 'characters') {
      try {
        const chaResult = await gamePool.request()
          .input('q', searchTerm)
          .query(`
            SELECT TOP 20 c.ChaNum, c.ChaName, c.ChaLevel, c.ChaClass, c.ChaSchool,
                   c.ChaOnline, c.ChaMoney, c.ChaPK, c.UserNum, c.GuNum,
                   c.ChaStartMap, c.ChaPosX, c.ChaPosY, c.ChaPosZ
            FROM ChaInfo c
            WHERE c.ChaName LIKE @q AND c.ChaDeleted = 0
            ORDER BY c.ChaLevel DESC
          `);
        characters = chaResult.recordset;

        // Get user info for each character
        if (characters.length > 0) {
          const userNums = [...new Set(characters.map((c: any) => c.UserNum).filter(Boolean))];
          if (userNums.length > 0) {
            const placeholders = userNums.map((_: any, i: number) => `@u${i}`).join(',');
            const userReq = userPool.request();
            userNums.forEach((n: number, i: number) => userReq.input(`u${i}`, n));
            const userResult = await userReq.query(`
              SELECT UserNum, UserID, UserName FROM UserInfo WHERE UserNum IN (${placeholders})
            `);
            const userMap: Record<number, any> = {};
            userResult.recordset.forEach((u: any) => { userMap[u.UserNum] = u; });
            characters.forEach((c: any) => {
              const user = userMap[c.UserNum];
              c.UserID = user?.UserID || '';
              c.UserName = user?.UserName || '';
            });
          }

          // Get guild names
          const guNums = [...new Set(characters.map((c: any) => c.GuNum).filter(n => n > 0))];
          if (guNums.length > 0) {
            const placeholders = guNums.map((_: any, i: number) => `@g${i}`).join(',');
            const guReq = gamePool.request();
            guNums.forEach((n: number, i: number) => guReq.input(`g${i}`, n));
            const guResult = await guReq.query(`SELECT GuNum, GuName FROM GuildInfo WHERE GuNum IN (${placeholders})`);
            const guMap: Record<number, string> = {};
            guResult.recordset.forEach((g: any) => { guMap[g.GuNum] = g.GuName; });
            characters.forEach((c: any) => { c.GuildName = guMap[c.GuNum] || ''; });
          }
        }
      } catch (e) { characters = []; }
    }

    // Search Guilds (by GuName)
    if (type === 'all' || type === 'guilds') {
      try {
        const guResult = await gamePool.request()
          .input('q', searchTerm)
          .query(`
            SELECT TOP 10 g.GuNum, g.GuName, g.GuRank, g.GuMoney, g.ChaNum,
                   (SELECT COUNT(*) FROM ChaInfo WHERE GuNum = g.GuNum AND ChaDeleted = 0) as MemberCount
            FROM GuildInfo g
            WHERE g.GuName LIKE @q
            ORDER BY g.GuRank DESC
          `);
        guilds = guResult.recordset;

        // Get master names
        if (guilds.length > 0) {
          const chaNums = guilds.map((g: any) => g.ChaNum).filter(Boolean);
          if (chaNums.length > 0) {
            const placeholders = chaNums.map((_: any, i: number) => `@c${i}`).join(',');
            const chaReq = gamePool.request();
            chaNums.forEach((n: number, i: number) => chaReq.input(`c${i}`, n));
            const chaResult = await chaReq.query(`SELECT ChaNum, ChaName, UserNum FROM ChaInfo WHERE ChaNum IN (${placeholders})`);
            const chaMap: Record<number, any> = {};
            chaResult.recordset.forEach((c: any) => { chaMap[c.ChaNum] = c; });

            const masterUserNums = chaResult.recordset.map((c: any) => c.UserNum).filter(Boolean);
            if (masterUserNums.length > 0) {
              const uPlaceholders = masterUserNums.map((_: any, i: number) => `@mu${i}`).join(',');
              const userReq = userPool.request();
              masterUserNums.forEach((n: number, i: number) => userReq.input(`mu${i}`, n));
              const userResult = await userReq.query(`SELECT UserNum, UserID FROM UserInfo WHERE UserNum IN (${uPlaceholders})`);
              const userMap: Record<number, string> = {};
              userResult.recordset.forEach((u: any) => { userMap[u.UserNum] = u.UserID; });

              guilds.forEach((g: any) => {
                const cha = chaMap[g.ChaNum];
                g.MasterName = cha?.ChaName || '';
                g.MasterUserID = userMap[cha?.UserNum] || '';
              });
            }
          }
        }
      } catch (e) { guilds = []; }
    }

    res.json({
      success: true,
      results: { users, characters, guilds },
      total: users.length + characters.length + guilds.length
    });
  } catch (error: any) {
    console.error('Advanced search error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
