import sql from 'mssql';

// Database connections for each database
let gamePool: sql.ConnectionPool | null = null;
let userPool: sql.ConnectionPool | null = null;
let logPool: sql.ConnectionPool | null = null;
let shopPool: sql.ConnectionPool | null = null;

// Connection status for each database
let connectionStatus = {
  game: false,
  user: false,
  log: false,
  shop: false
};

// Base config
let dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  connectionTimeout: 10000,
  requestTimeout: 10000
};

let dbNames = {
  game: process.env.DB_GAME || 'RanGame1',
  user: process.env.DB_USER_DB || 'RanUser',
  log: process.env.DB_LOG || 'RanLog',
  shop: process.env.DB_SHOP || 'RanShop'
};

// เชื่อมต่อ database ตัวใดตัวหนึ่ง
async function connectSingleDB(dbName: string, displayName: string): Promise<sql.ConnectionPool | null> {
  try {
    console.log(`Connecting to ${displayName} (${dbName})...`);
    const pool = await new sql.ConnectionPool({
      ...dbConfig,
      database: dbName
    }).connect();
    console.log(`✅ Connected to ${displayName}`);
    return pool;
  } catch (error: any) {
    console.error(`❌ Failed to connect to ${displayName}: ${error.message}`);
    return null;
  }
}

// เชื่อมต่อ database ทั้งหมด
export async function connectDB(): Promise<boolean> {
  console.log('\n=== Database Connection ===');
  console.log(`Server: ${dbConfig.server}:${dbConfig.port}`);
  console.log(`User: ${dbConfig.user}`);
  console.log('');
  
  // เชื่อมต่อทีละ database
  gamePool = await connectSingleDB(dbNames.game, 'RanGame1 (Game)');
  connectionStatus.game = gamePool !== null;
  
  userPool = await connectSingleDB(dbNames.user, 'RanUser (User)');
  connectionStatus.user = userPool !== null;
  
  logPool = await connectSingleDB(dbNames.log, 'RanLog (Log)');
  connectionStatus.log = logPool !== null;
  
  shopPool = await connectSingleDB(dbNames.shop, 'RanShop (Shop)');
  connectionStatus.shop = shopPool !== null;
  
  // สรุปผล
  const connectedCount = Object.values(connectionStatus).filter(v => v).length;
  console.log(`\n=== Connection Summary ===`);
  console.log(`Connected: ${connectedCount}/4 databases`);
  
  if (connectedCount === 0) {
    console.log('⚠️ No databases connected - Please run Setup Wizard');
    return false;
  }
  
  return true;
}

// ฟังก์ชันดึง pool
export function getGamePool(): sql.ConnectionPool {
  if (!gamePool) throw new Error('RanGame1 database not connected. Please run Setup Wizard first.');
  return gamePool;
}

export function getUserPool(): sql.ConnectionPool {
  if (!userPool) throw new Error('RanUser database not connected. Please run Setup Wizard first.');
  return userPool;
}

export function getLogPool(): sql.ConnectionPool {
  if (!logPool) throw new Error('RanLog database not connected. Please run Setup Wizard first.');
  return logPool;
}

export function getShopPool(): sql.ConnectionPool {
  if (!shopPool) throw new Error('RanShop database not connected. Please run Setup Wizard first.');
  return shopPool;
}

// ตรวจสอบสถานะ
export function isDbConnected(): boolean {
  return Object.values(connectionStatus).some(v => v);
}

export function getConnectionStatus() {
  return { ...connectionStatus };
}

export function isUserDbConnected(): boolean {
  return connectionStatus.user;
}

export function isGameDbConnected(): boolean {
  return connectionStatus.game;
}

export function getDbNames() {
  return { ...dbNames };
}

// อัพเดท config
export function updateConfig(config: { server?: any; databases?: any }) {
  if (config.server) {
    dbConfig.server = config.server.host || config.server.server;
    dbConfig.port = config.server.port;
    dbConfig.user = config.server.user;
    dbConfig.password = config.server.password;
  }
  if (config.databases) {
    dbNames.game = config.databases.gameDB || config.databases.game;
    dbNames.user = config.databases.userDB || config.databases.user;
    dbNames.log = config.databases.logDB || config.databases.log;
    dbNames.shop = config.databases.shopDB || config.databases.shop;
  }
}

// Reconnect database
export async function reconnectDB(dbKey: 'game' | 'user' | 'log' | 'shop'): Promise<boolean> {
  const dbName = dbNames[dbKey];
  const displayNames = { game: 'RanGame1', user: 'RanUser', log: 'RanLog', shop: 'RanShop' };
  
  // ปิด pool เก่า
  const oldPools = { game: gamePool, user: userPool, log: logPool, shop: shopPool };
  if (oldPools[dbKey]) {
    try { await oldPools[dbKey]!.close(); } catch {}
  }
  
  // เชื่อมต่อใหม่
  const newPool = await connectSingleDB(dbName, displayNames[dbKey]);
  
  switch (dbKey) {
    case 'game': gamePool = newPool; break;
    case 'user': userPool = newPool; break;
    case 'log': logPool = newPool; break;
    case 'shop': shopPool = newPool; break;
  }
  
  connectionStatus[dbKey] = newPool !== null;
  return newPool !== null;
}

export default {
  connectDB,
  getGamePool,
  getUserPool,
  getLogPool,
  getShopPool,
  isDbConnected,
  isUserDbConnected,
  isGameDbConnected,
  getConnectionStatus,
  getDbNames,
  updateConfig,
  reconnectDB
};
