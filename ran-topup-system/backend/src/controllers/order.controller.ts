import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { getUserPool, getGamePool } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

// สร้าง Order ใหม่
export async function createOrder(req: AuthRequest, res: Response) {
  try {
    const { packageId, userId, gameCode, paymentMethod } = req.body;
    
    if (!packageId || !userId || !paymentMethod) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบ' });
    }
    
    const userPool = getUserPool();
    const gamePool = getGamePool();
    
    // ดึงข้อมูลแพ็กเกจ
    const packageResult = await gamePool.request()
      .input('packageId', packageId)
      .query(`SELECT * FROM Packages WHERE PackageID = @packageId AND Status = 1`);
    
    if (packageResult.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบแพ็กเกจ' });
    }
    
    const packageData = packageResult.recordset[0];
    
    // สร้าง Order Number
    const orderNo = `RAN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // สร้าง QR Code สำหรับ PromptPay
    let qrCodeUrl = null;
    if (paymentMethod === 'promptpay') {
      const promptPayPhone = process.env.PROMPTPAY_PHONE || '0812345678';
      qrCodeUrl = `https://promptpay.io/${promptPayPhone}/${packageData.Price}`;
    }
    
    // บันทึก Order
    const result = await userPool.request()
      .input('orderNo', orderNo)
      .input('userId', userId)
      .input('packageId', packageId)
      .input('amount', packageData.Price)
      .input('point', packageData.Point)
      .input('bonusPoint', packageData.BonusPoint || 0)
      .input('paymentMethod', paymentMethod)
      .input('qrCodeUrl', qrCodeUrl)
      .query(`
        INSERT INTO Orders 
        (OrderNo, UserID, PackageID, Amount, Point, BonusPoint, PaymentMethod, PaymentStatus, QRCodeURL, CreatedDate, ExpireDate)
        VALUES 
        (@orderNo, @userId, @packageId, @amount, @point, @bonusPoint, @paymentMethod, 0, @qrCodeUrl, GETDATE(), DATEADD(HOUR, 1, GETDATE()));
        SELECT SCOPE_IDENTITY() as OrderID;
      `);
    
    const orderId = result.recordset[0].OrderID;
    
    res.json({
      success: true,
      order: {
        orderId,
        orderNo,
        amount: packageData.Price,
        point: packageData.Point,
        bonusPoint: packageData.BonusPoint || 0,
        paymentMethod,
        qrCodeUrl,
        expireDate: new Date(Date.now() + 60 * 60 * 1000)
      }
    });
    
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'ไม่สามารถสร้างคำสั่งซื้อได้: ' + error.message });
  }
}

// ตรวจสอบสถานะ Order
export async function getOrderStatus(req: AuthRequest, res: Response) {
  try {
    const { orderNo } = req.params;
    
    const userPool = getUserPool();
    const gamePool = getGamePool();
    
    const result = await userPool.request()
      .input('orderNo', orderNo)
      .query(`
        SELECT o.*, p.PackageName, p.Point, p.BonusPoint
        FROM Orders o
        JOIN ${process.env.DB_GAME || 'RanGame1'}.dbo.Packages p ON o.PackageID = p.PackageID
        WHERE o.OrderNo = @orderNo
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'ไม่พบคำสั่งซื้อ' });
    }
    
    const order = result.recordset[0];
    
    res.json({
      success: true,
      order: {
        orderId: order.OrderID,
        orderNo: order.OrderNo,
        amount: order.Amount,
        point: order.Point,
        bonusPoint: order.BonusPoint,
        paymentStatus: order.PaymentStatus,
        statusText: getStatusText(order.PaymentStatus),
        createdDate: order.CreatedDate,
        paidDate: order.PaidDate
      }
    });
    
  } catch (error: any) {
    console.error('Get order status error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
}

// ยืนยันการชำระเงิน
export async function confirmPayment(req: Request, res: Response) {
  try {
    const { orderNo, transactionId, status } = req.body;
    
    const userPool = getUserPool();
    
    await userPool.request()
      .input('orderNo', orderNo)
      .input('transactionId', transactionId)
      .input('status', status === 'success' ? 1 : 2)
      .query(`
        UPDATE Orders
        SET PaymentStatus = @status,
            TransactionID = @transactionId,
            PaidDate = CASE WHEN @status = 1 THEN GETDATE() ELSE NULL END
        WHERE OrderNo = @orderNo AND PaymentStatus = 0
      `);
    
    res.json({
      success: true,
      message: status === 'success' ? 'ชำระเงินสำเร็จ' : 'การชำระเงินล้มเหลว'
    });
    
  } catch (error: any) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
}

// ดึงประวัติ Order
export async function getUserOrders(req: AuthRequest, res: Response) {
  try {
    const userPool = getUserPool();
    const userId = req.user?.id;
    
    const result = await userPool.request()
      .input('userId', userId)
      .query(`
        SELECT TOP 50 o.*, p.PackageName, p.Point, p.BonusPoint
        FROM Orders o
        JOIN ${process.env.DB_GAME || 'RanGame1'}.dbo.Packages p ON o.PackageID = p.PackageID
        WHERE o.UserID = @userId
        ORDER BY o.CreatedDate DESC
      `);
    
    res.json({
      success: true,
      orders: result.recordset
    });
    
  } catch (error: any) {
    console.error('Get user orders error:', error);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด: ' + error.message });
  }
}

function getStatusText(status: number): string {
  const statuses: Record<number, string> = {
    0: 'รอชำระเงิน',
    1: 'ชำระเงินแล้ว',
    2: 'ล้มเหลว',
    3: 'คืนเงิน'
  };
  return statuses[status] || 'ไม่ทราบสถานะ';
}

export default { createOrder, getOrderStatus, confirmPayment, getUserOrders };
