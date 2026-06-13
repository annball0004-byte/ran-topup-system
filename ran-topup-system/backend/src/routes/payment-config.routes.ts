import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';

const router = Router();

const CONFIG_FILE = path.join(__dirname, '../../data/payment-config.json');

interface PaymentConfig {
  enabled: boolean;
  provider: 'maemanee' | 'normal';
  maemanee: {
    username: string;
    password: string;
    conId: string;
  };
  normal: {
    username: string;
    password: string;
    conId: string;
    accode: string;
    promptpayId: string;
    promptpayType: '01' | '02' | '03';
    accountNo: string;
  };
}

function loadConfig(): PaymentConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch {}
  return {
    enabled: false,
    provider: 'maemanee',
    maemanee: { username: '', password: '', conId: '' },
    normal: { username: '', password: '', conId: '', accode: '', promptpayId: '', promptpayType: '01', accountNo: '' }
  };
}

function saveConfig(config: PaymentConfig) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// GET - ดึงการตั้งค่า
router.get('/config', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const config = loadConfig();
    res.json({ success: true, config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - บันทึกการตั้งค่า
router.put('/config', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const config: PaymentConfig = req.body;
    saveConfig(config);
    res.json({ success: true, message: 'บันทึกการตั้งค่าสำเร็จ' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST - ทดสอบ API แม่มณี
router.post('/test/maemanee', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { username, password, conId } = req.body;
    const url = `https://tmwallet.thaighost.net/api_mn.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&con_id=${encodeURIComponent(conId)}&amount=1&ref1=test&method=create_pay`;

    const response = await fetch(url);
    const data: any = await response.json();

    res.json({
      success: data.status === 1,
      message: data.status === 1 ? 'เชื่อมต่อ API แม่มณีสำเร็จ!' : `Error: ${data.msg || 'ไม่ทราบสาเหตุ'}`,
      data
    });
  } catch (error: any) {
    res.json({ success: false, message: `เชื่อมต่อไม่สำเร็จ: ${error.message}` });
  }
});

// POST - ทดสอบ API ธรรมดา
router.post('/test/normal', authenticateToken, requireAdmin, async (req: any, res: Response) => {
  try {
    const { username, password, conId } = req.body;
    const url = `https://tmwallet.thaighost.net/apipp.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&con_id=${encodeURIComponent(conId)}&amount=1&ref1=test&method=create_pay`;

    const response = await fetch(url);
    const data: any = await response.json();

    res.json({
      success: data.status === 1,
      message: data.status === 1 ? 'เชื่อมต่อ API ธรรมดาสำเร็จ!' : `Error: ${data.msg || 'ไม่ทราบสาเหตุ'}`,
      data
    });
  } catch (error: any) {
    res.json({ success: false, message: `เชื่อมต่อไม่สำเร็จ: ${error.message}` });
  }
});

export default router;
