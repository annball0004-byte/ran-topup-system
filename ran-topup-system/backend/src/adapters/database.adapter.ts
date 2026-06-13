import sql from 'mssql';
import { getPool } from '../config/database';
import { GameConfig, ColumnMapping } from '../config/game.config';

// Database Adapter - เชื่อมต่อกับฐานข้อมูลเกมต่างๆ
export class DatabaseAdapter {
  private config: GameConfig;
  
  constructor(config: GameConfig) {
    this.config = config;
  }
  
  // ============ USER OPERATIONS ============
  
  // ดึงข้อมูลผู้ใช้
  async getUser(userId: string): Promise<any | null> {
    const pool = getPool();
    const mapping = this.config.columnMapping.user;
    
    let query = `SELECT * FROM ${mapping.table}`;
    const conditions: string[] = [];
    
    conditions.push(`${mapping.id} = @userId`);
    if (mapping.conditions) {
      conditions.push(mapping.conditions);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const result = await pool.request()
      .input('userId', userId)
      .query(query);
    
    return result.recordset[0] || null;
  }
  
  // ค้นหาผู้ใช้
  async searchUser(searchTerm: string): Promise<any[]> {
    const pool = getPool();
    const mapping = this.config.columnMapping.user;
    
    const query = `
      SELECT TOP 10 * 
      FROM ${mapping.table}
      WHERE ${mapping.username} LIKE @search
      ${mapping.conditions ? `AND ${mapping.conditions}` : ''}
    `;
    
    const result = await pool.request()
      .input('search', `%${searchTerm}%`)
      .query(query);
    
    return result.recordset;
  }
  
  // ดึงยอดเงินผู้ใช้
  async getUserBalance(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    if (!user) return 0;
    
    const mapping = this.config.columnMapping.user;
    return user[mapping.pointBalance || 'Point'] || 0;
  }
  
  // ============ CHARACTER OPERATIONS ============
  
  // ดึงตัวละครของผู้ใช้
  async getCharacters(userId: string): Promise<any[]> {
    const pool = getPool();
    const mapping = this.config.columnMapping.character;
    
    let query = `SELECT * FROM ${mapping.table}`;
    const conditions: string[] = [];
    
    conditions.push(`${mapping.userId} = @userId`);
    if (mapping.conditions) {
      conditions.push(mapping.conditions);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const result = await pool.request()
      .input('userId', userId)
      .query(query);
    
    // Map class names
    return result.recordset.map(char => ({
      ...char,
      ClassName: mapping.classNameMap ? mapping.classNameMap[char[mapping.class]] : char[mapping.class],
      SchoolName: mapping.schoolMap ? mapping.schoolMap[char[mapping.school]] : char[mapping.school]
    }));
  }
  
  // ============ TOPUP OPERATIONS ============
  
  // เพิ่มเงินให้ผู้ใช้
  async addPoint(userId: string, amount: number, orderId: string): Promise<boolean> {
    const pool = getPool();
    const mapping = this.config.columnMapping.user;
    
    try {
      // ใช้ transaction เพื่อความปลอดภัย
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      
      const request = new sql.Request(transaction);
      
      // อัพเดทยอดเงิน
      const updateQuery = `
        UPDATE ${mapping.table}
        SET ${mapping.pointBalance} = ${mapping.pointBalance} + @amount
        WHERE ${mapping.id} = @userId
      `;
      
      await request
        .input('userId', userId)
        .input('amount', amount)
        .query(updateQuery);
      
      // บันทึกประวัติ
      const topupMapping = this.config.columnMapping.topup;
      if (topupMapping.table) {
        const insertQuery = `
          INSERT INTO ${topupMapping.table} 
          (${topupMapping.userId}, ${topupMapping.amount}, ${topupMapping.point}, ${topupMapping.date || 'CreatedDate'})
          VALUES (@userId, @orderId, @amount, @point, GETDATE())
        `;
        
        await request
          .input('orderId', orderId)
          .input('point', amount)
          .query(insertQuery);
      }
      
      await transaction.commit();
      return true;
    } catch (error) {
      console.error('Add point error:', error);
      return false;
    }
  }
  
  // ตรวจสอบ transaction
  async checkTopUpStatus(orderId: string): Promise<{ success: boolean; message: string }> {
    const pool = getPool();
    const topupMapping = this.config.columnMapping.topup;
    
    if (!topupMapping.id) {
      return { success: true, message: 'No transaction ID configured' };
    }
    
    const query = `
      SELECT * FROM ${topupMapping.table}
      WHERE ${topupMapping.id} = @orderId
    `;
    
    const result = await pool.request()
      .input('orderId', orderId)
      .query(query);
    
    if (result.recordset.length > 0) {
      return { success: true, message: 'Transaction found' };
    }
    
    return { success: false, message: 'Transaction not found' };
  }
  
  // ============ STATISTICS ============
  
  // ดึงสถิติ
  async getStatistics(): Promise<any> {
    const pool = getPool();
    const userMapping = this.config.columnMapping.user;
    const charMapping = this.config.columnMapping.character;
    
    const [userCount, charCount] = await Promise.all([
      pool.request().query(`SELECT COUNT(*) as count FROM ${userMapping.table}`),
      pool.request().query(`SELECT COUNT(*) as count FROM ${charMapping.table}`)
    ]);
    
    return {
      totalUsers: userCount.recordset[0].count,
      totalCharacters: charCount.recordset[0].count
    };
  }
}

export default DatabaseAdapter;
