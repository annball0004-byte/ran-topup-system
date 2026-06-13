import { Router, Request, Response } from 'express';
import { getUserPool, getGamePool, getLogPool, getShopPool, getConnectionStatus } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// ============ SERVER STATUS ============

router.get('/status', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();
    const logPool = getLogPool();
    const shopPool = getShopPool();

    const dbStatus = getConnectionStatus();

    // Online characters
    const onlineResult = await gamePool.request().query(`
      SELECT COUNT(*) as total FROM ChaInfo WHERE ChaOnline = 1 AND ChaDeleted = 0
    `);
    const onlineCount = onlineResult.recordset[0].total;

    // Online by class
    const classResult = await gamePool.request().query(`
      SELECT ChaClass, COUNT(*) as count 
      FROM ChaInfo 
      WHERE ChaOnline = 1 AND ChaDeleted = 0 
      GROUP BY ChaClass 
      ORDER BY count DESC
    `);

    // Online by map
    const mapResult = await gamePool.request().query(`
      SELECT ChaStartMap, COUNT(*) as count 
      FROM ChaInfo 
      WHERE ChaOnline = 1 AND ChaDeleted = 0 
      GROUP BY ChaStartMap 
      ORDER BY count DESC
    `);

    // Total counts
    const [usersResult, charsResult, guildsResult] = await Promise.all([
      userPool.request().query(`SELECT COUNT(*) as count FROM UserInfo`),
      gamePool.request().query(`SELECT COUNT(*) as count FROM ChaInfo WHERE ChaDeleted = 0`),
      gamePool.request().query(`SELECT COUNT(*) as count FROM GuildInfo`)
    ]);

    // Server state log (if available)
    let serverState: any[] = [];
    try {
      const stateResult = await logPool.request().query(`
        SELECT TOP 20 UserNum as CurrentUsers, UserMaxNum as MaxUsers, SvrNum, SGNum, Date
        FROM LogServerState
        ORDER BY Date DESC
      `);
      serverState = stateResult.recordset;
    } catch (e) { }

    // Recent logins (last 10)
    let recentLogins: any[] = [];
    try {
      const loginResult = await userPool.request().query(`
        SELECT TOP 10 UserID, UserName, LastLoginDate, SvrNum, UserLoginState
        FROM UserInfo
        WHERE UserLoginState = 1
        ORDER BY LastLoginDate DESC
      `);
      recentLogins = loginResult.recordset;
    } catch (e) { }

    res.json({
      success: true,
      status: {
        db: {
          game: dbStatus.game,
          user: dbStatus.user,
          log: dbStatus.log,
          shop: dbStatus.shop
        },
        online: {
          total: onlineCount,
          byClass: classResult.recordset,
          byMap: mapResult.recordset
        },
        totals: {
          users: usersResult.recordset[0].count,
          characters: charsResult.recordset[0].count,
          guilds: guildsResult.recordset[0].count
        },
        serverState,
        recentLogins,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Get server status error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ ONLINE PLAYERS DETAIL ============

router.get('/online-players', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const gamePool = getGamePool();
    const userPool = getUserPool();

    const result = await gamePool.request().query(`
      SELECT c.ChaNum, c.ChaName, c.ChaLevel, c.ChaClass, c.ChaSchool,
             c.ChaStartMap, c.ChaPosX, c.ChaPosY, c.ChaPosZ,
             c.UserNum, c.ChaOnline
      FROM ChaInfo c
      WHERE c.ChaOnline = 1 AND c.ChaDeleted = 0
      ORDER BY c.ChaLevel DESC
    `);

    const chars = result.recordset;

    // Get user info
    if (chars.length > 0) {
      const userNums = [...new Set(chars.map((c: any) => c.UserNum).filter(Boolean))];
      if (userNums.length > 0) {
        const placeholders = userNums.map((_: any, i: number) => `@u${i}`).join(',');
        const userReq = userPool.request();
        userNums.forEach((n: number, i: number) => userReq.input(`u${i}`, n));
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

export default router;
