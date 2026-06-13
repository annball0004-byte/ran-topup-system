import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';

const router = Router();

const CONFIG_FILE = path.join(__dirname, '../../data/payment-config.json');
const TOPUP_FILE = path.join(__dirname, '../../data/topup-orders.json');

function loadConfig(): any {
  try {
    if (fs.existsSync(CONFIG_FILE)) return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch {}
  return { enabled: false, provider: 'maemanee' };
}

function loadTopups(): any[] {
  try {
    if (fs.existsSync(TOPUP_FILE)) return JSON.parse(fs.readFileSync(TOPUP_FILE, 'utf8'));
  } catch {}
  return [];
}

function saveTopups(topups: any[]) {
  const dir = path.dirname(TOPUP_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(TOPUP_FILE, JSON.stringify(topups, null, 2));
}

// POST /topup/create - สร้างรายการเติมเงิน (สร้าง QR)
router.post('/create', authenticateToken, async (req: any, res: Response) => {
  try {
    const config = loadConfig();
    if (!config.enabled) {
      return res.status(400).json({ error: 'ระบบเติมเงินปิดอยู่ กรุณาติดต่อ admin' });
    }

    const { amount, userId } = req.body;
    if (!amount || amount < 10) {
      return res.status(400).json({ error: 'จำนวนเงินต้องมากกว่า 10 บาท' });
    }

    const topupId = `TOP${Date.now()}`;
    const ref1 = userId || req.user?.id || 'guest';

    // เรียก API ตาม provider ที่ตั้งค่า
    if (config.provider === 'maemanee') {
      const { username, password, conId } = config.maemanee;
      if (!username || !password || !conId) {
        return res.status(400).json({ error: 'กรุณาตั้งค่า API แม่มณีให้ครบถ้วน' });
      }

      // Step 1: Create Pay
      const createUrl = `https://tmwallet.thaighost.net/api_mn.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&con_id=${encodeURIComponent(conId)}&amount=${Math.floor(amount)}&ref1=${encodeURIComponent(ref1)}&method=create_pay`;
      const createRes = await fetch(createUrl);
      const createData: any = await createRes.json();

      if (createData.status !== 1) {
        return res.status(400).json({ error: createData.msg || 'ไม่สามารถสร้างรายการได้' });
      }

      // Step 2: Get Detail + QR
      const detailUrl = `https://tmwallet.thaighost.net/api_mn.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&con_id=${encodeURIComponent(conId)}&id_pay=${createData.id_pay}&qr=1&method=detail_pay`;
      const detailRes = await fetch(detailUrl);
      const detailData: any = await detailRes.json();

      if (detailData.status !== 1) {
        return res.status(400).json({ error: detailData.msg || 'ไม่สามารถดึงรายละเอียดได้' });
      }

      // บันทึกรายการ
      const topups = loadTopups();
      const topup = {
        id: topupId,
        idPay: createData.id_pay,
        provider: 'maemanee',
        userId: ref1,
        amount: Number(amount),
        status: 'pending',
        urlPay: detailData.urlpay,
        qrBase64: detailData.qr_base64_image || null,
        timeOut: detailData.time_out,
        createdAt: new Date().toISOString()
      };
      topups.push(topup);
      saveTopups(topups);

      res.json({
        success: true,
        topupId,
        idPay: createData.id_pay,
        amount: Number(amount),
        urlPay: detailData.urlpay,
        qrBase64: detailData.qr_base64_image || null,
        timeOut: detailData.time_out,
        provider: 'maemanee'
      });

    } else {
      // API ธรรมดา
      const { username, password, conId, promptpayId, promptpayType } = config.normal;
      if (!username || !password || !conId || !promptpayId) {
        return res.status(400).json({ error: 'กรุณาตั้งค่า API ธรรมดาให้ครบถ้วน' });
      }

      // Step 1: Create Pay
      const createUrl = `https://tmwallet.thaighost.net/apipp.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&con_id=${encodeURIComponent(conId)}&amount=${Math.floor(amount)}&ref1=${encodeURIComponent(ref1)}&method=create_pay`;
      const createRes = await fetch(createUrl);
      const createData: any = await createRes.json();

      if (createData.status !== 1) {
        return res.status(400).json({ error: createData.msg || 'ไม่สามารถสร้างรายการได้' });
      }

      // Step 2: Get QR
      const detailUrl = `https://tmwallet.thaighost.net/apipp.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&con_id=${encodeURIComponent(conId)}&id_pay=${createData.id_pay}&promptpay_id=${encodeURIComponent(promptpayId)}&type=${promptpayType}&method=detail_pay`;
      const detailRes = await fetch(detailUrl);
      const detailData: any = await detailRes.json();

      if (detailData.status !== 1) {
        return res.status(400).json({ error: detailData.msg || 'ไม่สามารถสร้าง QR ได้' });
      }

      // บันทึกรายการ
      const topups = loadTopups();
      const topup = {
        id: topupId,
        idPay: createData.id_pay,
        provider: 'normal',
        userId: ref1,
        amount: Number(amount),
        amountCheck: detailData.amount_check ? detailData.amount_check / 100 : Number(amount),
        status: 'pending',
        qrBase64: detailData.qr_image_base64 || null,
        timeOut: detailData.time_out,
        createdAt: new Date().toISOString()
      };
      topups.push(topup);
      saveTopups(topups);

      res.json({
        success: true,
        topupId,
        idPay: createData.id_pay,
        amount: Number(amount),
        amountCheck: detailData.amount_check ? detailData.amount_check / 100 : Number(amount),
        qrBase64: detailData.qr_image_base64 || null,
        timeOut: detailData.time_out,
        provider: 'normal'
      });
    }

  } catch (error: any) {
    console.error('Topup create error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

// POST /topup/confirm - ยืนยันการชำระเงิน
router.post('/confirm', authenticateToken, async (req: any, res: Response) => {
  try {
    const { topupId } = req.body;
    const config = loadConfig();
    const topups = loadTopups();
    const topup = topups.find(t => t.id === topupId);

    if (!topup) return res.status(404).json({ error: 'ไม่พบรายการ' });
    if (topup.status !== 'pending') return res.status(400).json({ error: 'รายการนี้ไม่อยู่ในสถานะรอชำระ' });

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';

    if (config.provider === 'maemanee') {
      const { username, password, conId } = config.maemanee;
      const url = `https://tmwallet.thaighost.net/api_mn.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&con_id=${encodeURIComponent(conId)}&id_pay=${topup.idPay}&ip=${encodeURIComponent(clientIp)}&method=confirm`;
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.status === 1) {
        const idx = topups.findIndex(t => t.id === topupId);
        topups[idx].status = 'paid';
        topups[idx].paidAt = new Date().toISOString();
        saveTopups(topups);
        res.json({ success: true, message: 'ชำระเงินสำเร็จ!', amount: data.amount });
      } else {
        res.json({ success: false, message: data.msg || 'ยังไม่ได้ชำระเงิน หรือหมดเวลา' });
      }

    } else {
      const { username, password, conId, accode, accountNo } = config.normal;
      if (!accode || !accountNo) {
        return res.status(400).json({ error: 'กรุณาตั้งค่า accode และ เลขบัญชี' });
      }
      const url = `https://tmwallet.thaighost.net/apipp.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&con_id=${encodeURIComponent(conId)}&id_pay=${topup.idPay}&accode=${encodeURIComponent(accode)}&account_no=${encodeURIComponent(accountNo)}&ip=${encodeURIComponent(clientIp)}&method=confirm`;
      const response = await fetch(url);
      const data: any = await response.json();

      if (data.status === 1) {
        const idx = topups.findIndex(t => t.id === topupId);
        topups[idx].status = 'paid';
        topups[idx].paidAt = new Date().toISOString();
        topups[idx].paidAmount = data.amount;
        saveTopups(topups);
        res.json({ success: true, message: 'ชำระเงินสำเร็จ!', amount: data.amount, datePay: data.date_pay });
      } else {
        res.json({ success: false, message: data.msg || 'ยังไม่ได้ชำระเงิน หรือหมดเวลา' });
      }
    }

  } catch (error: any) {
    console.error('Topup confirm error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /topup/cancel - ยกเลิกรายการ
router.post('/cancel', authenticateToken, async (req: any, res: Response) => {
  try {
    const { topupId } = req.body;
    const config = loadConfig();
    const topups = loadTopups();
    const topup = topups.find(t => t.id === topupId);

    if (!topup) return res.status(404).json({ error: 'ไม่พบรายการ' });

    const endpoint = config.provider === 'maemanee'
      ? 'https://tmwallet.thaighost.net/api_mn.php'
      : 'https://tmwallet.thaighost.net/apipp.php';

    const creds = config.provider === 'maemanee' ? config.maemanee : config.normal;
    const url = `${endpoint}?username=${encodeURIComponent(creds.username)}&password=${encodeURIComponent(creds.password)}&con_id=${encodeURIComponent(creds.conId)}&id_pay=${topup.idPay}&method=cancel`;
    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status === 1) {
      const idx = topups.findIndex(t => t.id === topupId);
      topups[idx].status = 'cancelled';
      saveTopups(topups);
      res.json({ success: true, message: 'ยกเลิกรายการสำเร็จ' });
    } else {
      res.json({ success: false, message: data.msg || 'ไม่สามารถยกเลิกได้' });
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /topup/status/:id - ตรวจสอบสถานะ
router.get('/status/:id', authenticateToken, async (req: any, res: Response) => {
  try {
    const topups = loadTopups();
    const topup = topups.find(t => t.id === req.params.id);
    if (!topup) return res.status(404).json({ error: 'ไม่พบรายการ' });
    res.json({ success: true, topup });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /topup/list - ดูรายการเติมเงินทั้งหมด (Admin)
router.get('/list', authenticateToken, async (req: any, res: Response) => {
  try {
    const topups = loadTopups();
    const sorted = topups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, topups: sorted.slice(0, 100) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
