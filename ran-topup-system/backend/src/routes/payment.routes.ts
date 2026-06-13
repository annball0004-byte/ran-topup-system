import { Router } from 'express';
import QRCode from 'qrcode';
import { getUserPool } from '../config/database';

const router = Router();

// สร้าง QR Code สำหรับ PromptPay
router.post('/promptpay/qr', async (req, res) => {
  try {
    const { orderNo, amount } = req.body;
    
    const promptPayPhone = process.env.PROMPTPAY_PHONE || '0812345678';
    const payload = `00020101021230${promptPayPhone}5303764540${amount.toFixed(2)}6304`;
    
    const qrDataUrl = await QRCode.toDataURL(payload, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({
      success: true,
      qrCode: qrDataUrl,
      amount,
      promptPayPhone
    });
    
  } catch (error: any) {
    console.error('Generate QR error:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้าง QR Code ได้: ' + error.message });
  }
});

// Webhook
router.post('/webhook', async (req, res) => {
  try {
    const { orderId, status, transactionId } = req.body;
    
    const pool = getUserPool();
    
    await pool.request()
      .input('orderId', orderId)
      .input('status', status === 'success' ? 1 : 2)
      .input('transactionId', transactionId)
      .query(`
        UPDATE Orders
        SET PaymentStatus = @status,
            TransactionID = @transactionId,
            PaidDate = CASE WHEN @status = 1 THEN GETDATE() ELSE NULL END
        WHERE OrderID = @orderId
      `);
    
    res.json({
      success: true,
      message: 'Webhook processed'
    });
    
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed: ' + error.message });
  }
});

// ตรวจสอบสถานะ
router.get('/status/:orderNo', async (req, res) => {
  try {
    const pool = getUserPool();
    
    const result = await pool.request()
      .input('orderNo', req.params.orderNo)
      .query(`
        SELECT PaymentStatus, TransactionID, PaidDate
        FROM Orders
        WHERE OrderNo = @orderNo
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }
    
    const order = result.recordset[0];
    
    res.json({
      success: true,
      status: order.PaymentStatus === 1 ? 'paid' : 'pending',
      transactionId: order.TransactionID,
      paidDate: order.PaidDate
    });
    
  } catch (error: any) {
    console.error('Check status error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
});

export default router;
