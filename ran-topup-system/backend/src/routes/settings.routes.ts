import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import sql from 'mssql';

const router = Router();

// Store settings in memory (in production, save to database or config file)
let currentSettings: {
  database: any;
  columnMapping: any;
} = {
  database: {
    host: 'localhost',
    port: 1433,
    database: 'RanGame1',
    user: 'sa',
    password: ''
  },
  columnMapping: {
    userTable: 'UserInfo',
    userId: 'UserID',
    userName: 'UserName',
    userPoint: 'Point',
    userStatus: 'Status',
    charTable: 'ChaInfo',
    charId: 'ChaGUID',
    charUserId: 'UsrUID',
    charName: 'ChaName',
    charLevel: 'ChaLevel',
    charClass: 'ChaClass',
    topupTable: 'TopUp',
    topupUserId: 'UsrUID',
    topupAmount: 'Amount',
    topupPoint: 'Point'
  }
};

// ดึงการตั้งค่าปัจจุบัน
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      success: true,
      settings: currentSettings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// บันทึกการตั้งค่า
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { database, columnMapping } = req.body;
    
    if (database) {
      currentSettings.database = database;
    }
    if (columnMapping) {
      currentSettings.columnMapping = columnMapping;
    }
    
    // In production, save to file or database
    // const fs = require('fs');
    // fs.writeFileSync('./config/game-settings.json', JSON.stringify(currentSettings, null, 2));
    
    res.json({
      success: true,
      message: 'Settings saved successfully',
      settings: currentSettings
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ทดสอบการเชื่อมต่อ Database
router.post('/test-db', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { host, port, database, user, password } = req.body;
    
    const config: sql.config = {
      user: user,
      password: password,
      server: host,
      port: port,
      database: database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    try {
      const pool = await new sql.ConnectionPool(config).connect();
      
      // Test query
      const result = await pool.request().query('SELECT @@VERSION as version');
      await pool.close();
      
      res.json({
        success: true,
        message: `เชื่อมต่อสำเร็จ! SQL Server: ${result.recordset[0].version.substring(0, 50)}...`
      });
    } catch (dbError: any) {
      res.json({
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ: ${dbError.message}`
      });
    }
    
  } catch (error: any) {
    res.json({
      success: false,
      message: `เกิดข้อผิดพลาด: ${error.message}`
    });
  }
});

// ทดสอบ Column Mapping (ดึงข้อมูลตัวอย่าง)
router.post('/test-mapping', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { database, columnMapping } = req.body;
    
    const config: sql.config = {
      user: database.user,
      password: database.password,
      server: database.host,
      port: database.port,
      database: database.database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    const pool = await new sql.ConnectionPool(config).connect();
    
    // Test user table
    const userResult = await pool.request().query(`
      SELECT TOP 3 ${columnMapping.userId}, ${columnMapping.userName}, ${columnMapping.userPoint}
      FROM ${columnMapping.userTable}
    `);
    
    // Test character table
    const charResult = await pool.request().query(`
      SELECT TOP 3 ${columnMapping.charId}, ${columnMapping.charUserId}, ${columnMapping.charName}, ${columnMapping.charLevel}
      FROM ${columnMapping.charTable}
    `);
    
    await pool.close();
    
    res.json({
      success: true,
      message: 'ดึงข้อมูลตัวอย่างสำเร็จ',
      sampleData: {
        users: userResult.recordset,
        characters: charResult.recordset
      }
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: `เกิดข้อผิดพลาด: ${error.message}`
    });
  }
});

export default router;
