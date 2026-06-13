import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin, generateToken } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const router = Router();

const AGENTS_FILE = path.join(__dirname, '../../data/agents.json');

function loadAgents(): any[] {
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveAgents(agents: any[]) {
  const dir = path.dirname(AGENTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}

// ==================== Admin: Agent Management ====================

// GET /admin/agents - List all agents
router.get('/', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();

    const agentsWithStats = agents.map(a => ({
      ...a,
      password: undefined,
      totalSales: 0,
      totalCommission: 0,
      totalOrders: 0
    }));

    res.json({
      success: true,
      agents: agentsWithStats,
      stats: {
        total: agents.length,
        active: agents.filter(a => a.status === 'active').length,
        totalBalance: agents.reduce((sum, a) => sum + (a.balance || 0), 0),
        totalRevenue: 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/agents - Create new agent
router.post('/', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { username, password, name, email, phone, commissionRate, creditLimit } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    const agents = loadAgents();
    if (agents.find(a => a.username === username)) {
      return res.status(400).json({ error: 'Username นี้มีในระบบแล้ว' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAgent = {
      id: `AG${Date.now()}`,
      username,
      password: hashedPassword,
      name,
      email: email || '',
      phone: phone || '',
      commissionRate: commissionRate || 10,
      creditLimit: creditLimit || 0,
      balance: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: req.user?.username || 'admin'
    };

    agents.push(newAgent);
    saveAgents(agents);

    res.json({
      success: true,
      message: 'สร้าง Agent สำเร็จ',
      agent: { ...newAgent, password: undefined }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /admin/agents/:id - Update agent
router.put('/:id', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const idx = agents.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบ Agent' });

    const { name, email, phone, commissionRate, creditLimit, status, password } = req.body;

    if (name) agents[idx].name = name;
    if (email !== undefined) agents[idx].email = email;
    if (phone !== undefined) agents[idx].phone = phone;
    if (commissionRate !== undefined) agents[idx].commissionRate = commissionRate;
    if (creditLimit !== undefined) agents[idx].creditLimit = creditLimit;
    if (status) agents[idx].status = status;
    if (password) agents[idx].password = await bcrypt.hash(password, 10);
    agents[idx].updatedAt = new Date().toISOString();

    saveAgents(agents);

    res.json({
      success: true,
      message: 'อัพเดต Agent สำเร็จ',
      agent: { ...agents[idx], password: undefined }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/agents/:id - Delete agent
router.delete('/:id', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const idx = agents.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบ Agent' });

    agents.splice(idx, 1);
    saveAgents(agents);

    res.json({ success: true, message: 'ลบ Agent สำเร็จ' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/agents/:id/credit - Add/deduct credit
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
      amount: Number(amount),
      note: note || (Number(amount) > 0 ? 'Admin เพิ่มเครดิต' : 'Admin หักเครดิต'),
      date: new Date().toISOString(),
      by: req.user?.username || 'admin'
    });

    saveAgents(agents);

    res.json({
      success: true,
      message: 'อัพเดตเครดิตสำเร็จ',
      newBalance: agents[idx].balance
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /admin/agents/:id/logs - View agent activity logs
router.get('/:id/logs', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const agents = loadAgents();
    const agent = agents.find(a => a.id === req.params.id);
    if (!agent) return res.status(404).json({ error: 'ไม่พบ Agent' });

    const logs = agent.creditHistory || [];
    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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
      success: true,
      token,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        balance: agent.balance,
        commissionRate: agent.commissionRate
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
