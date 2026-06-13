import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, generateToken } from '../middleware/auth.middleware';
import { getUserPool, getGamePool } from '../config/database';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const router = Router();

const AGENTS_FILE = path.join(__dirname, '../../data/agents.json');
const SALES_FILE = path.join(__dirname, '../../data/agent-sales.json');
const TOPUP_REQUESTS_FILE = path.join(__dirname, '../../data/agent-topup-requests.json');
const COMMISSION_FILE = path.join(__dirname, '../../data/agent-commission.json');

function loadJson<T>(file: string, fallback: T): T {
  try { if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  return fallback;
}
function saveJson(file: string, data: any) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function loadAgents(): any[] { return loadJson(AGENTS_FILE, []); }
function saveAgents(a: any[]) { saveJson(AGENTS_FILE, a); }
function loadSales(): any[] { return loadJson(SALES_FILE, []); }
function saveSales(s: any[]) { saveJson(SALES_FILE, s); }
function loadTopupRequests(): any[] { return loadJson(TOPUP_REQUESTS_FILE, []); }
function saveTopupRequests(r: any[]) { saveJson(TOPUP_REQUESTS_FILE, r); }
function loadCommissionLog(): any[] { return loadJson(COMMISSION_FILE, []); }
function saveCommissionLog(c: any[]) { saveJson(COMMISSION_FILE, c); }

// ==================== Admin: Agent Management ====================

router.get('/', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const sales = loadSales();
    const agentsWithStats = agents.map(a => {
      const agentSales = sales.filter(s => s.agentId === a.id && s.status === 'completed');
      return {
        ...a,
        password: undefined,
        totalSales: agentSales.reduce((sum: number, s: any) => sum + s.amount, 0),
        totalCommission: agentSales.reduce((sum: number, s: any) => sum + (s.commission || 0), 0),
        totalOrders: agentSales.length
      };
    });
    const totalRevenue = sales.filter(s => s.status === 'completed').reduce((sum: number, s: any) => sum + s.amount, 0);
    res.json({
      success: true,
      agents: agentsWithStats,
      stats: {
        total: agents.length,
        active: agents.filter(a => a.status === 'active').length,
        totalBalance: agents.reduce((sum: number, a: any) => sum + (a.balance || 0), 0),
        totalRevenue
      }
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { username, password, name, email, phone, commissionRate, creditLimit } = req.body;
    if (!username || !password || !name) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    const agents = loadAgents();
    if (agents.find(a => a.username === username)) return res.status(400).json({ error: 'Username นี้มีในระบบแล้ว' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAgent = {
      id: `AG${Date.now()}`, username, password: hashedPassword, name,
      email: email || '', phone: phone || '',
      commissionRate: commissionRate || 10, creditLimit: creditLimit || 0,
      balance: 0, status: 'active', level: 'bronze',
      totalSalesEver: 0, createdAt: new Date().toISOString(),
      createdBy: req.user?.username || 'admin'
    };
    agents.push(newAgent);
    saveAgents(agents);
    res.json({ success: true, message: 'สร้าง Agent สำเร็จ', agent: { ...newAgent, password: undefined } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.put('/:id', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const idx = agents.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบ Agent' });
    const { name, email, phone, commissionRate, creditLimit, status, password, level } = req.body;
    if (name) agents[idx].name = name;
    if (email !== undefined) agents[idx].email = email;
    if (phone !== undefined) agents[idx].phone = phone;
    if (commissionRate !== undefined) agents[idx].commissionRate = commissionRate;
    if (creditLimit !== undefined) agents[idx].creditLimit = creditLimit;
    if (status) agents[idx].status = status;
    if (level) agents[idx].level = level;
    if (password) agents[idx].password = await bcrypt.hash(password, 10);
    agents[idx].updatedAt = new Date().toISOString();
    saveAgents(agents);
    res.json({ success: true, message: 'อัพเดต Agent สำเร็จ', agent: { ...agents[idx], password: undefined } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const idx = agents.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบ Agent' });
    agents.splice(idx, 1);
    saveAgents(agents);
    res.json({ success: true, message: 'ลบ Agent สำเร็จ' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/:id/credit', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const idx = agents.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบ Agent' });
    const { amount, note } = req.body;
    if (!amount) return res.status(400).json({ error: 'กรุณากรอกจำนวนเงิน' });
    agents[idx].balance = (agents[idx].balance || 0) + Number(amount);
    agents[idx].updatedAt = new Date().toISOString();
    if (!agents[idx].creditHistory) agents[idx].creditHistory = [];
    agents[idx].creditHistory.unshift({
      amount: Number(amount), note: note || (Number(amount) > 0 ? 'Admin เพิ่มเครดิต' : 'Admin หักเครดิต'),
      date: new Date().toISOString(), by: req.user?.username || 'admin'
    });
    saveAgents(agents);
    res.json({ success: true, message: 'อัพเดตเครดิตสำเร็จ', newBalance: agents[idx].balance });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/:id/logs', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const agent = agents.find(a => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'ไม่พบ Agent' });
    res.json({ success: true, logs: agent.creditHistory || [] });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ==================== Agent: Login ====================

router.post('/login', async (req: any, res: Response) => {
  try {
    const { username, password } = req.body;
    const agents = loadAgents();
    const agent = agents.find(a => a.username === username && a.status === 'active');
    if (!agent) return res.status(401).json({ error: 'ไม่พบ Username หรือถูกระงับ' });
    const valid = await bcrypt.compare(password, agent.password);
    if (!valid) return res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    const token = generateToken({ id: agent.id, type: 'agent', username: agent.username });
    res.json({
      success: true, token,
      agent: { id: agent.id, name: agent.name, email: agent.email, balance: agent.balance, commissionRate: agent.commissionRate, level: agent.level }
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ==================== Agent: Dashboard ====================

router.get('/me/dashboard', authenticateToken, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const agent = agents.find(a => a.id === req.user?.id);
    if (!agent) return res.status(404).json({ error: 'ไม่พบ Agent' });
    const sales = loadSales().filter(s => s.agentId === agent.id && s.status === 'completed');
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.createdAt?.startsWith(today));
    const thisMonth = today.substring(0, 7);
    const monthSales = sales.filter(s => s.createdAt?.startsWith(thisMonth));
    res.json({
      success: true,
      dashboard: {
        balance: agent.balance || 0,
        commissionRate: agent.commissionRate,
        level: agent.level || 'bronze',
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum: number, s: any) => sum + s.amount, 0),
        totalCommission: sales.reduce((sum: number, s: any) => sum + (s.commission || 0), 0),
        todaySales: todaySales.length,
        todayRevenue: todaySales.reduce((sum: number, s: any) => sum + s.amount, 0),
        monthSales: monthSales.length,
        monthRevenue: monthSales.reduce((sum: number, s: any) => sum + s.amount, 0),
        recentSales: sales.slice(0, 10)
      }
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ==================== Agent: Top-up (ซื้อเครดิตจาก Admin) ====================

router.post('/me/topup-request', authenticateToken, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const agent = agents.find(a => a.id === req.user?.id);
    if (!agent) return res.status(404).json({ error: 'ไม่พบ Agent' });
    const { amount, paymentMethod, transactionRef } = req.body;
    if (!amount || amount < 100) return res.status(400).json({ error: 'จำนวนเงินขั้นต่ำ 100 บาท' });
    const requests = loadTopupRequests();
    const request = {
      id: `ATR${Date.now()}`, agentId: agent.id, agentName: agent.name,
      amount: Number(amount), paymentMethod: paymentMethod || 'promptpay',
      transactionRef: transactionRef || '', status: 'pending',
      createdAt: new Date().toISOString()
    };
    requests.push(request);
    saveTopupRequests(requests);
    res.json({ success: true, message: 'ส่งคำขอเติมเครดิตแล้ว รอ Admin อนุมัติ', request });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/me/topup-requests', authenticateToken, async (req: any, res: Response) => {
  try {
    const requests = loadTopupRequests().filter(r => r.agentId === req.user?.id);
    res.json({ success: true, requests: requests.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50) });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Admin: ดูคำขอเติมเครดิตทั้งหมด
router.get('/admin/topup-requests', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const requests = loadTopupRequests();
    res.json({ success: true, requests: requests.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Admin: อนุมัติคำขอเติมเครดิต
router.post('/admin/topup-requests/:id/approve', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const requests = loadTopupRequests();
    const idx = requests.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบคำขอ' });
    if (requests[idx].status !== 'pending') return res.status(400).json({ error: 'คำขอนี้ดำเนินการแล้ว' });
    const agents = loadAgents();
    const agentIdx = agents.findIndex(a => a.id === requests[idx].agentId);
    if (agentIdx === -1) return res.status(404).json({ error: 'ไม่พบ Agent' });
    agents[agentIdx].balance = (agents[agentIdx].balance || 0) + requests[idx].amount;
    if (!agents[agentIdx].creditHistory) agents[agentIdx].creditHistory = [];
    agents[agentIdx].creditHistory.unshift({
      amount: requests[idx].amount, note: `เติมเครดิตผ่าน ${requests[idx].paymentMethod} (อนุมัติโดย Admin)`,
      date: new Date().toISOString(), by: 'admin'
    });
    requests[idx].status = 'approved';
    requests[idx].approvedAt = new Date().toISOString();
    requests[idx].approvedBy = req.user?.username || 'admin';
    saveAgents(agents);
    saveTopupRequests(requests);
    res.json({ success: true, message: 'อนุมัติสำเร็จ', newBalance: agents[agentIdx].balance });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// Admin: ปฏิเสธคำขอ
router.post('/admin/topup-requests/:id/reject', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const requests = loadTopupRequests();
    const idx = requests.findIndex(r => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบคำขอ' });
    requests[idx].status = 'rejected';
    requests[idx].rejectedAt = new Date().toISOString();
    saveTopupRequests(requests);
    res.json({ success: true, message: 'ปฏิเสธคำขอแล้ว' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ==================== Agent: Sell to Player ====================

router.post('/me/sell', authenticateToken, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const agentIdx = agents.findIndex(a => a.id === req.user?.id);
    if (agentIdx === -1) return res.status(404).json({ error: 'ไม่พบ Agent' });
    const agent = agents[agentIdx];
    if (agent.status !== 'active') return res.status(400).json({ error: 'Agent ถูกระงับ' });

    const { userId, amount, note } = req.body;
    if (!userId || !amount || amount <= 0) return res.status(400).json({ error: 'กรุณากรอก UserID และจำนวนเงิน' });

    const userPool = getUserPool();
    const userResult = await userPool.request()
      .input('userId', userId)
      .query(`SELECT UserID, UserName, UserPoint FROM UserInfo WHERE UserID = @userId`);
    if (userResult.recordset.length === 0) return res.status(404).json({ error: 'ไม่พบผู้ใช้ในระบบ' });

    const numAmount = Number(amount);
    if ((agent.balance || 0) < numAmount) return res.status(400).json({ error: `เครดิตไม่พอ (เหลือ ฿${agent.balance})` });

    // หักเครดิต Agent
    agents[agentIdx].balance = (agent.balance || 0) - numAmount;
    if (!agents[agentIdx].creditHistory) agents[agentIdx].creditHistory = [];
    agents[agentIdx].creditHistory.unshift({
      amount: -numAmount, note: `ขายเติมเงินให้ ${userId}`,
      date: new Date().toISOString(), by: agent.username
    });

    // เพิ่ม Point ให้ผู้เล่น
    await userPool.request()
      .input('userId', userId)
      .input('amount', numAmount)
      .query(`UPDATE UserInfo SET UserPoint = UserPoint + @amount WHERE UserID = @userId`);

    // คำนวณค่าคอมมิชชั่น
    const commission = Math.round(numAmount * (agent.commissionRate / 100));

    // บันทึกการขาย
    const sales = loadSales();
    const sale = {
      id: `SAL${Date.now()}`, agentId: agent.id, agentName: agent.name,
      userId, userName: userResult.recordset[0].UserName || userId,
      amount: numAmount, commission, commissionRate: agent.commissionRate,
      note: note || '', status: 'completed',
      createdAt: new Date().toISOString()
    };
    sales.push(sale);
    saveSales(sales);

    // บันทึกค่าคอม
    const commLog = loadCommissionLog();
    commLog.push({
      agentId: agent.id, agentName: agent.name, saleId: sale.id,
      saleAmount: numAmount, commission, commissionRate: agent.commissionRate,
      createdAt: new Date().toISOString()
    });
    saveCommissionLog(commLog);

    // อัพเดตยอดขายรวมของ Agent
    agents[agentIdx].totalSalesEver = (agent.totalSalesEver || 0) + numAmount;

    // อัพเดต Level อัตโนมัติ
    const totalSales = agents[agentIdx].totalSalesEver;
    if (totalSales >= 500000) agents[agentIdx].level = 'diamond';
    else if (totalSales >= 200000) agents[agentIdx].level = 'platinum';
    else if (totalSales >= 100000) agents[agentIdx].level = 'gold';
    else if (totalSales >= 50000) agents[agentIdx].level = 'silver';

    saveAgents(agents);

    const updatedUser = await userPool.request()
      .input('userId', userId)
      .query(`SELECT UserPoint FROM UserInfo WHERE UserID = @userId`);

    res.json({
      success: true, message: 'ขายเติมเงินสำเร็จ',
      sale: { ...sale },
      newBalance: agents[agentIdx].balance,
      playerNewPoint: updatedUser.recordset[0]?.UserPoint || 0
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ==================== Agent: Sales History ====================

router.get('/me/sales', authenticateToken, async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const sales = loadSales().filter(s => s.agentId === req.user?.id);
    const sorted = sales.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const offset = (Number(page) - 1) * Number(limit);
    res.json({
      success: true, sales: sorted.slice(offset, offset + Number(limit)),
      total: sorted.length, totalPages: Math.ceil(sorted.length / Number(limit))
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ==================== Agent: Reports ====================

router.get('/me/reports', authenticateToken, async (req: any, res: Response) => {
  try {
    const sales = loadSales().filter(s => s.agentId === req.user?.id && s.status === 'completed');
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);
    const thisYear = today.substring(0, 4);

    const dailySales: Record<string, number> = {};
    const monthlySales: Record<string, number> = {};
    sales.forEach(s => {
      const d = s.createdAt?.split('T')[0] || '';
      dailySales[d] = (dailySales[d] || 0) + s.amount;
      const m = d.substring(0, 7);
      monthlySales[m] = (monthlySales[m] || 0) + s.amount;
    });

    const topCustomers: Record<string, { name: string; count: number; total: number }> = {};
    sales.forEach(s => {
      if (!topCustomers[s.userId]) topCustomers[s.userId] = { name: s.userName || s.userId, count: 0, total: 0 };
      topCustomers[s.userId].count++;
      topCustomers[s.userId].total += s.amount;
    });
    const topCustomersList = Object.entries(topCustomers)
      .map(([id, data]) => ({ userId: id, ...data }))
      .sort((a, b) => b.total - a.total).slice(0, 10);

    res.json({
      success: true,
      reports: {
        totalSales: sales.length,
        totalRevenue: sales.reduce((sum: number, s: any) => sum + s.amount, 0),
        totalCommission: sales.reduce((sum: number, s: any) => sum + (s.commission || 0), 0),
        todayRevenue: sales.filter(s => s.createdAt?.startsWith(today)).reduce((sum: number, s: any) => sum + s.amount, 0),
        monthRevenue: sales.filter(s => s.createdAt?.startsWith(thisMonth)).reduce((sum: number, s: any) => sum + s.amount, 0),
        yearRevenue: sales.filter(s => s.createdAt?.startsWith(thisYear)).reduce((sum: number, s: any) => sum + s.amount, 0),
        dailySales: Object.entries(dailySales).slice(-30).map(([date, amount]) => ({ date, amount })),
        monthlySales: Object.entries(monthlySales).slice(-12).map(([month, amount]) => ({ month, amount })),
        topCustomers: topCustomersList
      }
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ==================== Admin: Commission Settings ====================

router.get('/admin/commission-settings', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const configPath = path.join(__dirname, '../../data/commission-config.json');
    const config = loadJson(configPath, {
      defaultRate: 10,
      levels: {
        bronze: { minSales: 0, rate: 10 },
        silver: { minSales: 50000, rate: 12 },
        gold: { minSales: 100000, rate: 15 },
        platinum: { minSales: 200000, rate: 18 },
        diamond: { minSales: 500000, rate: 20 }
      }
    });
    res.json({ success: true, config });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.put('/admin/commission-settings', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const configPath = path.join(__dirname, '../../data/commission-config.json');
    saveJson(configPath, req.body);
    res.json({ success: true, message: 'บันทึกค่าคอมมิชชั่นสำเร็จ' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

// ==================== Admin: Agent Reports ====================

router.get('/admin/reports', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const sales = loadSales().filter(s => s.status === 'completed');
    const commLog = loadCommissionLog();

    const agentStats = agents.map(a => {
      const agentSales = sales.filter(s => s.agentId === a.id);
      return {
        id: a.id, name: a.name, level: a.level, balance: a.balance,
        commissionRate: a.commissionRate,
        totalSales: agentSales.length,
        totalRevenue: agentSales.reduce((sum: number, s: any) => sum + s.amount, 0),
        totalCommission: agentSales.reduce((sum: number, s: any) => sum + (s.commission || 0), 0)
      };
    }).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);

    const totalPaidCommission = commLog.reduce((sum: number, c: any) => sum + c.commission, 0);

    res.json({
      success: true,
      reports: {
        agentStats,
        totalAgents: agents.length,
        activeAgents: agents.filter(a => a.status === 'active').length,
        totalRevenue: sales.reduce((sum: number, s: any) => sum + s.amount, 0),
        totalPaidCommission,
        totalSales: sales.length
      }
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default router;
