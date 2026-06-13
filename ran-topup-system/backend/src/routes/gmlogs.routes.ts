import { Router, Request, Response } from 'express';
import { getLogPool } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// ============ GM LOGS ADVANCED ============

router.get('/logs', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const pool = getLogPool();
    const { page = 1, limit = 50, gmName = '', command = '', dateFrom = '', dateTo = '' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let conditions: string[] = [];
    const request = pool.request();

    if (gmName) {
      conditions.push('GMCharName LIKE @gmName');
      request.input('gmName', `%${gmName}%`);
    }
    if (command) {
      conditions.push('GMCommand LIKE @command');
      request.input('command', `%${command}%`);
    }
    if (dateFrom) {
      conditions.push('Date >= @dateFrom');
      request.input('dateFrom', dateFrom);
    }
    if (dateTo) {
      conditions.push('Date <= @dateTo');
      request.input('dateTo', dateTo + ' 23:59:59');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await request.query(`SELECT COUNT(*) as total FROM GM_Logs ${whereClause}`);
    const total = countResult.recordset[0].total;

    const dataReq = pool.request();
    if (gmName) dataReq.input('gmName', `%${gmName}%`);
    if (command) dataReq.input('command', `%${command}%`);
    if (dateFrom) dataReq.input('dateFrom', dateFrom);
    if (dateTo) dataReq.input('dateTo', dateTo + ' 23:59:59');
    dataReq.input('offset', offset);
    dataReq.input('limit', Number(limit));

    const result = await dataReq.query(`
      SELECT RecordID, GMUserID, GMUserType, GMCharID, GMCharName, GMCommand, Date
      FROM GM_Logs
      ${whereClause}
      ORDER BY Date DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

    // Get unique GM names for filter dropdown
    const gmNamesResult = await pool.request().query(`
      SELECT DISTINCT GMCharName FROM GM_Logs WHERE GMCharName IS NOT NULL AND GMCharName != ''
      ORDER BY GMCharName
    `);

    // Get stats
    const statsResult = await pool.request().query(`
      SELECT 
        COUNT(*) as totalCommands,
        COUNT(DISTINCT GMCharName) as uniqueGMs,
        MIN(Date) as oldestLog,
        MAX(Date) as newestLog
      FROM GM_Logs
    `);

    res.json({
      success: true,
      logs: result.recordset,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      gmNames: gmNamesResult.recordset.map((r: any) => r.GMCharName),
      stats: statsResult.recordset[0]
    });
  } catch (error: any) {
    console.error('Get GM logs error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// ============ EXPORT GM LOGS ============

router.get('/logs/export', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const pool = getLogPool();
    const { gmName = '', command = '', dateFrom = '', dateTo = '' } = req.query;

    let conditions: string[] = [];
    const request = pool.request();

    if (gmName) {
      conditions.push('GMCharName LIKE @gmName');
      request.input('gmName', `%${gmName}%`);
    }
    if (command) {
      conditions.push('GMCommand LIKE @command');
      request.input('command', `%${command}%`);
    }
    if (dateFrom) {
      conditions.push('Date >= @dateFrom');
      request.input('dateFrom', dateFrom);
    }
    if (dateTo) {
      conditions.push('Date <= @dateTo');
      request.input('dateTo', dateTo + ' 23:59:59');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await request.query(`
      SELECT RecordID, GMCharName, GMCommand, Date
      FROM GM_Logs
      ${whereClause}
      ORDER BY Date DESC
      OFFSET 0 ROWS FETCH NEXT 1000 ROWS ONLY
    `);

    // Build CSV
    const headers = ['ID', 'GM Name', 'Command', 'Date'];
    const rows = result.recordset.map((r: any) => [
      r.RecordID,
      `"${(r.GMCharName || '').replace(/"/g, '""')}"`,
      `"${(r.GMCommand || '').replace(/"/g, '""')}"`,
      r.Date ? new Date(r.Date).toISOString() : ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => { csv += row.join(',') + '\n'; });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=gm_logs_export.csv');
    res.send('\uFEFF' + csv); // BOM for Excel Thai support
  } catch (error: any) {
    console.error('Export GM logs error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
