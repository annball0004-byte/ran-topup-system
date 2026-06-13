import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';

const router = Router();

const ORDERS_FILE = path.join(__dirname, '../../data/orders.json');

function loadOrders(): any[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    }
  } catch {}
  return [];
}

function saveOrders(orders: any[]) {
  const dir = path.dirname(ORDERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

// GET /admin/orders - List all orders with filters
router.get('/', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', status, paymentMethod, dateFrom, dateTo } = req.query;
    let orders = loadOrders();

    // Filters
    if (search) {
      const s = search.toLowerCase();
      orders = orders.filter(o =>
        o.orderId.toLowerCase().includes(s) ||
        o.customerName.toLowerCase().includes(s) ||
        o.itemName.toLowerCase().includes(s) ||
        (o.agentName && o.agentName.toLowerCase().includes(s))
      );
    }
    if (status) orders = orders.filter(o => o.paymentStatus === status);
    if (paymentMethod) orders = orders.filter(o => o.paymentMethod === paymentMethod);
    if (dateFrom) orders = orders.filter(o => new Date(o.createdAt) >= new Date(dateFrom));
    if (dateTo) orders = orders.filter(o => new Date(o.createdAt) <= new Date(dateTo + 'T23:59:59'));

    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = orders.length;
    const offset = (Number(page) - 1) * Number(limit);
    const paged = orders.slice(offset, offset + Number(limit));

    // Stats
    const stats = {
      total,
      pending: orders.filter(o => o.paymentStatus === 'pending').length,
      paid: orders.filter(o => o.paymentStatus === 'paid').length,
      failed: orders.filter(o => o.paymentStatus === 'failed').length,
      totalRevenue: orders.filter(o => o.paymentStatus === 'paid').reduce((s, o) => s + (o.amount || 0), 0)
    };

    res.json({
      success: true,
      orders: paged,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      stats
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /admin/orders - Create order
router.post('/', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { customerName, itemName, quantity, amount, paymentMethod, agentId, agentName, note } = req.body;

    const orders = loadOrders();
    const order = {
      orderId: `ORD${Date.now()}`,
      customerName: customerName || 'Guest',
      itemName: itemName || 'Unknown',
      quantity: quantity || 1,
      amount: amount || 0,
      paymentMethod: paymentMethod || 'promptpay',
      paymentStatus: 'pending',
      agentId: agentId || null,
      agentName: agentName || null,
      note: note || '',
      createdBy: req.user?.username || 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.push(order);
    saveOrders(orders);

    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /admin/orders/:id/status - Update order status
router.put('/:id/status', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { paymentStatus } = req.body;
    const orders = loadOrders();
    const idx = orders.findIndex(o => o.orderId === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });

    orders[idx].paymentStatus = paymentStatus;
    orders[idx].updatedAt = new Date().toISOString();
    saveOrders(orders);

    res.json({ success: true, order: orders[idx] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /admin/orders/:id
router.delete('/:id', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const orders = loadOrders();
    const idx = orders.findIndex(o => o.orderId === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });

    orders.splice(idx, 1);
    saveOrders(orders);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
