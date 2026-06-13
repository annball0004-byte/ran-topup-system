'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const AMOUNTS = [50, 100, 200, 300, 500, 1000];

export default function TopupPage() {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'qr' | 'confirm' | 'done'>('select');
  const [topupData, setTopupData] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('userId') || '';
    setUserId(stored);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (step !== 'qr' || !topupData?.timeOut) return;
    setCountdown(topupData.timeOut);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setStep('select');
          alert('หมดเวลาชำระเงิน กรุณาทำรายการใหม่');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, topupData]);

  const handleTopup = async () => {
    const finalAmount = amount || Number(customAmount);
    if (!finalAmount || finalAmount < 10) {
      alert('กรุณาเลือกหรือกรอกจำนวนเงิน (ขั้นต่ำ 10 บาท)');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/topup/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: finalAmount, userId: userId || 'guest' })
      });
      const data = await res.json();

      if (data.success) {
        setTopupData(data);
        setStep('qr');
      } else {
        alert(data.error || 'ไม่สามารถสร้างรายการได้');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/topup/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ topupId: topupData.topupId })
      });
      const data = await res.json();

      if (data.success) {
        setStep('done');
      } else {
        alert(data.message || 'ยังไม่พบการชำระเงิน ลองใหม่อีกครั้ง');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาด');
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`${API_URL}/topup/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ topupId: topupData.topupId })
      });
    } catch {}
    setStep('select');
    setTopupData(null);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      <div className="max-w-lg mx-auto p-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-ran-red rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">💳</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">เติมเงิน</h1>
          <p className="text-gray-400 font-thai text-sm">เติมเงินเข้าระบบ RAN Online</p>
        </div>

        {/* Step 1: Select Amount */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="card-ran">
              <h3 className="font-bold text-white mb-3 font-thai">เลือกจำนวนเงิน</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {AMOUNTS.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      amount === a ? 'border-ran-red bg-ran-red/10' : 'border-gray-700 hover:border-gray-500'
                    }`}>
                    <div className="text-2xl font-bold text-white">฿{a}</div>
                  </button>
                ))}
              </div>
              <div>
                <label className="text-gray-400 text-sm font-thai">หรือกรอกจำนวนเอง</label>
                <input type="number" min="10" placeholder="จำนวนเงิน (บาท)"
                  value={customAmount} onChange={e => { setCustomAmount(e.target.value); setAmount(0); }}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-3 text-white text-lg mt-1" />
              </div>
            </div>

            <div className="card-ran">
              <label className="text-gray-400 text-sm font-thai">UserID (สำหรับอ้างอิง)</label>
              <input type="text" placeholder="เช่น username หรือ เบอร์โทร"
                value={userId} onChange={e => setUserId(e.target.value)}
                className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white mt-1" />
            </div>

            <button onClick={handleTopup} disabled={loading || (!amount && !customAmount)}
              className="w-full btn-primary py-4 text-lg font-bold disabled:opacity-50">
              {loading ? '⏳ กำลังสร้างรายการ...' : '💳 สร้าง QR พร้อมเพย์'}
            </button>
          </div>
        )}

        {/* Step 2: QR Payment */}
        {step === 'qr' && topupData && (
          <div className="space-y-4">
            <div className="card-ran text-center">
              <div className="text-gray-400 text-sm font-thai mb-2">จำนวนเงินที่ต้องชำระ</div>
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                ฿{(topupData.amountCheck || topupData.amount).toLocaleString()}
              </div>
              <div className="text-gray-500 text-xs mb-4">รายการ: {topupData.topupId}</div>

              {/* QR Code */}
              {topupData.qrBase64 && (
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-4 rounded-xl">
                    <img src={`data:image/png;base64,${topupData.qrBase64}`} alt="QR Code" className="w-64 h-64" />
                  </div>
                </div>
              )}

              {/* URL Pay (Maemanee) */}
              {topupData.urlPay && (
                <div className="mb-4">
                  <a href={topupData.urlPay} target="_blank" rel="noopener noreferrer"
                    className="inline-block bg-ran-red/20 text-ran-red border border-ran-red/30 px-6 py-2 rounded-lg hover:bg-ran-red/30">
                    🔗 เปิดหน้าชำระเงิน (บิลแม่มณี)
                  </a>
                </div>
              )}

              {/* Countdown */}
              <div className={`text-lg font-mono font-bold ${countdown < 60 ? 'text-red-400' : 'text-gray-300'}`}>
                ⏱️ เวลาคงเหลือ: {formatTime(countdown)}
              </div>
            </div>

            <div className="card-ran bg-yellow-500/5 border-yellow-500/20">
              <h4 className="font-bold text-yellow-400 mb-2 font-thai">📱 วิธีชำระเงิน</h4>
              <ol className="text-gray-300 text-sm font-thai space-y-1">
                <li>1. เปิดแอปธนาคารหรือ TrueMoney Wallet</li>
                <li>2. สแกน QR Code ด้านบน</li>
                <li>3. โอนเงินตามจำนวนที่แสดง</li>
                <li>4. กด "ชำระแล้ว" ด้านล่าง</li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button onClick={handleConfirm} disabled={loading}
                className="flex-1 bg-green-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-600 disabled:opacity-50">
                {loading ? '⏳ กำลังตรวจสอบ...' : '✅ ชำระแล้ว'}
              </button>
              <button onClick={handleCancel}
                className="bg-gray-700 text-gray-300 px-6 py-4 rounded-xl font-bold hover:bg-gray-600">
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 'done' && (
          <div className="card-ran text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-display font-bold text-green-400 mb-2">ชำระเงินสำเร็จ!</h2>
            <p className="text-gray-400 font-thai">จำนวนเงิน ฿{topupData?.amount?.toLocaleString()} ถูกตัดยอดแล้ว</p>
            <p className="text-gray-500 text-sm mt-2">รายการ: {topupData?.topupId}</p>
            <button onClick={() => { setStep('select'); setTopupData(null); setAmount(0); setCustomAmount(''); }}
              className="btn-primary px-8 py-3 mt-6">
              เติมเงินอีกครั้ง
            </button>
          </div>
        )}

        {/* Back button */}
        {step !== 'select' && step !== 'done' && (
          <button onClick={() => setStep('select')} className="w-full text-center text-gray-400 mt-4 hover:text-white font-thai">
            ← เลือกจำนวนเงินใหม่
          </button>
        )}
      </div>
    </main>
  );
}
