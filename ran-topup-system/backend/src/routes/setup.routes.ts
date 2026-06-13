import { Router, Request, Response } from 'express';
import sql from 'mssql';

const router = Router();

// ทดสอบ Server Connection
router.post('/test-server', async (req: Request, res: Response) => {
  try {
    const { host, port, user, password } = req.body;
    
    const config: sql.config = {
      user,
      password,
      server: host,
      port,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    try {
      const pool = await new sql.ConnectionPool(config).connect();
      const result = await pool.request().query('SELECT @@VERSION as version');
      await pool.close();
      
      res.json({
        success: true,
        message: `เชื่อมต่อ Server สำเร็จ!`,
        version: result.recordset[0].version.substring(0, 100)
      });
    } catch (dbError: any) {
      res.json({
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ: ${dbError.message}`
      });
    }
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

// ทดสอบ Database Connection
router.post('/test-database', async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database } = req.body;
    
    const config: sql.config = {
      user,
      password,
      server: host,
      port,
      database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    try {
      const pool = await new sql.ConnectionPool(config).connect();
      
      const tablesResult = await pool.request().query(`
        SELECT COUNT(*) as tableCount 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
      `);
      
      const tablesList = await pool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
      
      await pool.close();
      
      const tableNames = tablesList.recordset.map((t: any) => t.TABLE_NAME);
      
      res.json({
        success: true,
        message: `เชื่อมต่อ "${database}" สำเร็จ! (${tablesResult.recordset[0].tableCount} tables)`,
        tableCount: tablesResult.recordset[0].tableCount,
        tables: tableNames
      });
    } catch (dbError: any) {
      res.json({
        success: false,
        message: `เชื่อมต่อไม่สำเร็จ: ${dbError.message}`
      });
    }
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

// ทดสอบ Table
router.post('/test-table', async (req: Request, res: Response) => {
  try {
    const { server, database, tableName, columns } = req.body;
    
    const config: sql.config = {
      user: server.user,
      password: server.password,
      server: server.host,
      port: server.port,
      database: database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    const pool = await new sql.ConnectionPool(config).connect();
    
    // ตรวจสอบว่า table มีอยู่หรือไม่
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as tableCount FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = '${tableName}'
    `);
    
    if (tableCheck.recordset[0].tableCount === 0) {
      await pool.close();
      return res.json({
        success: false,
        message: `ไม่พบ Table "${tableName}" ใน Database "${database}"`
      });
    }
    
    // ดึงข้อมูลตัวอย่าง
    const columnList = columns && columns.length > 0 ? columns.join(', ') : '*';
    const result = await pool.request().query(`SELECT TOP 3 ${columnList} FROM ${tableName}`);
    
    // ดึงรายชื่อ columns ทั้งหมด
    const colsResult = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = '${tableName}'
      ORDER BY ORDINAL_POSITION
    `);
    
    await pool.close();
    
    const allColumns = colsResult.recordset.map((c: any) => c.COLUMN_NAME);
    
    res.json({
      success: true,
      message: `พบ Table "${tableName}" (${allColumns.length} columns, ${result.recordset.length} sample rows)`,
      data: result.recordset,
      columns: allColumns
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: `เกิดข้อผิดพลาด: ${error.message}`
    });
  }
});

// Auto-Detect Columns
router.post('/auto-detect-columns', async (req: Request, res: Response) => {
  try {
    const { server, database, tableName } = req.body;
    
    const config: sql.config = {
      user: server.user,
      password: server.password,
      server: server.host,
      port: server.port,
      database: database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    const pool = await new sql.ConnectionPool(config).connect();
    
    const colsResult = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = '${tableName}'
      ORDER BY ORDINAL_POSITION
    `);
    
    await pool.close();
    
    const columns = colsResult.recordset.map((c: any) => c.COLUMN_NAME);
    
    res.json({
      success: true,
      message: `ตรวจพบ ${columns.length} columns ใน Table "${tableName}"`,
      columns
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: `Auto-detect failed: ${error.message}`
    });
  }
});

// Save Setup Config
router.post('/save', async (req: Request, res: Response) => {
  try {
    const { server, databases, mapping } = req.body;
    
    const fs = require('fs');
    const path = require('path');
    
    // Generate .env content
    const envContent = `# Server
PORT=3001
NODE_ENV=development

# Database - Connection
DB_SERVER=${server.host}
DB_PORT=${server.port}
DB_USER=${server.user}
DB_PASSWORD=${server.password}

# Databases
DB_GAME=${databases.gameDB}
DB_USER_DB=${databases.userDB}
DB_LOG=${databases.logDB}
DB_SHOP=${databases.shopDB}

# JWT
JWT_SECRET=ran-topup-secret-key

# Frontend
FRONTEND_URL=http://localhost:3000
`;
    
    // บันทึกไฟล์ .env
    const envPath = path.join(__dirname, '../../.env');
    fs.writeFileSync(envPath, envContent, 'utf8');
    
    // อัพเดท database config
    const { updateConfig } = require('../config/database');
    updateConfig({ server, databases });
    
    // Reconnect databases
    const { reconnectDB } = require('../config/database');
    
    const reconnectResults = {
      game: await reconnectDB('game'),
      user: await reconnectDB('user'),
      log: await reconnectDB('log'),
      shop: await reconnectDB('shop')
    };
    
    const connectedCount = Object.values(reconnectResults).filter(v => v).length;
    
    res.json({
      success: true,
      message: `บันทึกสำเร็จ! เชื่อมต่อ ${connectedCount}/4 databases`,
      reconnectResults,
      config: { server, databases, mapping }
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

// Reconnect single database
router.post('/reconnect', async (req: Request, res: Response) => {
  try {
    const { dbKey } = req.body;
    
    const { reconnectDB } = require('../config/database');
    const success = await reconnectDB(dbKey);
    
    res.json({
      success,
      message: success ? `Reconnected to ${dbKey}` : `Failed to reconnect to ${dbKey}`
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

// Get connection status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { getConnectionStatus, getDbNames } = require('../config/database');
    
    res.json({
      success: true,
      status: getConnectionStatus(),
      databases: getDbNames()
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

// ============ Admin Setup ============

// ตรวจสอบว่ามี Admin แล้วหรือยัง
router.post('/check-admin', async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database } = req.body;
    
    const config: sql.config = {
      user,
      password,
      server: host,
      port,
      database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    const pool = await new sql.ConnectionPool(config).connect();
    
    // ตรวจสอบว่ามีตาราง Admins หรือไม่
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as tableCount 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'Admins'
    `);
    
    let hasAdmin = false;
    let adminCount = 0;
    
    if (tableCheck.recordset[0].tableCount > 0) {
      // ตรวจสอบว่ามี Admin หรือไม่
      const adminCheck = await pool.request().query(`SELECT COUNT(*) as adminCount FROM Admins`);
      adminCount = adminCheck.recordset[0].adminCount;
      hasAdmin = adminCount > 0;
    }
    
    await pool.close();
    
    res.json({
      success: true,
      hasTable: tableCheck.recordset[0].tableCount > 0,
      hasAdmin,
      adminCount
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

// สร้างตาราง Admins
router.post('/create-admins-table', async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database } = req.body;
    
    const config: sql.config = {
      user,
      password,
      server: host,
      port,
      database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    const pool = await new sql.ConnectionPool(config).connect();
    
    // สร้างตาราง Admins
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Admins')
      BEGIN
        CREATE TABLE Admins (
          AdminID INT IDENTITY(1,1) PRIMARY KEY,
          Username NVARCHAR(50) NOT NULL UNIQUE,
          Password NVARCHAR(200) NOT NULL,
          FullName NVARCHAR(100),
          Email NVARCHAR(200),
          Phone NVARCHAR(20),
          Role NVARCHAR(20) DEFAULT 'admin',
          Status INT DEFAULT 1,
          LastLoginDate DATETIME,
          CreatedDate DATETIME DEFAULT GETDATE()
        );
        
        INSERT INTO Admins (Username, Password, FullName, Role, Status)
        VALUES ('admin', 'admin123', 'System Administrator', 'superadmin', 1);
      END
    `);
    
    await pool.close();
    
    res.json({
      success: true,
      message: 'สร้างตาราง Admins สำเร็จ (Admin: admin / admin123)'
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

// สร้าง Admin ใหม่
router.post('/create-admin', async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database, adminUsername, adminPassword, adminFullName, adminEmail } = req.body;
    
    if (!adminUsername || !adminPassword) {
      return res.json({
        success: false,
        message: 'กรุณากรอก Username และ Password สำหรับ Admin'
      });
    }
    
    const config: sql.config = {
      user,
      password,
      server: host,
      port,
      database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    const pool = await new sql.ConnectionPool(config).connect();
    
    // ตรวจสอบว่า Username ซ้ำหรือไม่
    const checkResult = await pool.request()
      .input('username', adminUsername)
      .query(`SELECT COUNT(*) as count FROM Admins WHERE Username = @username`);
    
    if (checkResult.recordset[0].count > 0) {
      await pool.close();
      return res.json({
        success: false,
        message: `Username "${adminUsername}" มีในระบบแล้ว`
      });
    }
    
    // สร้าง Admin ใหม่
    await pool.request()
      .input('username', adminUsername)
      .input('password', adminPassword)
      .input('fullName', adminFullName || adminUsername)
      .input('email', adminEmail || null)
      .query(`
        INSERT INTO Admins (Username, Password, FullName, Email, Role, Status)
        VALUES (@username, @password, @fullName, @email, 'admin', 1)
      `);
    
    await pool.close();
    
    res.json({
      success: true,
      message: `สร้าง Admin "${adminUsername}" สำเร็จ`
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

// ดึงรายชื่อ Admin ทั้งหมด
router.post('/list-admins', async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database } = req.body;
    
    const config: sql.config = {
      user,
      password,
      server: host,
      port,
      database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    const pool = await new sql.ConnectionPool(config).connect();
    
    const result = await pool.request().query(`
      SELECT AdminID, Username, FullName, Email, Role, Status, LastLoginDate, CreatedDate
      FROM Admins
      ORDER BY AdminID
    `);
    
    await pool.close();
    
    res.json({
      success: true,
      admins: result.recordset
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

// ลบ Admin
router.post('/delete-admin', async (req: Request, res: Response) => {
  try {
    const { host, port, user, password, database, adminId } = req.body;
    
    const config: sql.config = {
      user,
      password,
      server: host,
      port,
      database,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      connectionTimeout: 5000,
      requestTimeout: 5000
    };
    
    const pool = await new sql.ConnectionPool(config).connect();
    
    // ไม่ให้ลบ superadmin คนสุดท้าย
    const checkResult = await pool.request()
      .input('adminId', adminId)
      .query(`SELECT Role FROM Admins WHERE AdminID = @adminId`);
    
    if (checkResult.recordset.length > 0 && checkResult.recordset[0].Role === 'superadmin') {
      const superadminCount = await pool.request().query(`SELECT COUNT(*) as count FROM Admins WHERE Role = 'superadmin'`);
      if (superadminCount.recordset[0].count <= 1) {
        await pool.close();
        return res.json({
          success: false,
          message: 'ไม่สามารถลบ SuperAdmin คนสุดท้ายได้'
        });
      }
    }
    
    await pool.request()
      .input('adminId', adminId)
      .query(`DELETE FROM Admins WHERE AdminID = @adminId`);
    
    await pool.close();
    
    res.json({
      success: true,
      message: 'ลบ Admin สำเร็จ'
    });
    
  } catch (error: any) {
    res.json({
      success: false,
      message: error.message
    });
  }
});

export default router;
