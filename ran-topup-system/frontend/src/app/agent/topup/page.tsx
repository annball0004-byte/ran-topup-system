'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface TopUpRequest {
  id: number;
  amount: number;
  paymentMethod: string;
  transactionRef: string;
  status: string;
  createdAt: string;
}

export default function AgentTopUp() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('promptpay');
  const [transactionRef, setTransactionRef] = useState('');
  const [requests, setRequests] = useState<TopUpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const token = localStorage.getItem('agentToken');
    if (!token) { router.push('/agent/login'); return; }
    fetchData(token);
  }, [router]);

  const fetchData = async (token: string) => {
    try {
      const [dashRes, reqRes] = await Promise.all([
        fetch(`${API_URL}/agents/me/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/agents/me/topup-requests`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (dashRes.ok) { const d = await dashRes.json(); setBalance(d.dashboard?.balance ?? d.agent?.balance ?? 0); }
      if (reqRes.ok) { const r = await reqRes.json(); setRequests(r.requests || r); }
    } catch { setMessage({ type: 'error', text: 'โหลดข้อมูลล้มเหลว' }); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (num < 100) { setMessage({ type: 'error', text: 'จำนวนเงินขั้นต่ำ 100 บาท' }); return; }

    const token = localStorage.getItem('agentToken');
    if (!token) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${API_URL}/agents/me/topup-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: num, paymentMethod, transactionRef }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'ส่งคำขอไม่สำเร็จ');
      setMessage({ type: 'success', text: 'ส่งคำขอเติมเครดิตสำเร็จ รอการอนุมัติ' });
      setAmount(''); setTransactionRef('');
      fetchData(token);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally { setSubmitting(false); }
  };

  const statusColor = (s: string) => {
    if (s === 'approved') return 'text-green-400';
    if (s === 'rejected') return 'text-red-400';
    return 'text-yellow-400';
  };
  const statusLabel = (s: string) => s === 'approved' ? 'อนุมัติแล้ว' : s === 'rejected' ? 'ถูกปฏิเสธ' : 'รออนุมัติ';

  if (loading) return <div className="min-h-screen bg-ran-dark text-white flex items-center justify-center">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-ran-dark text-white">
      <nav className="bg-ran-card border-b border-red-900 p-4 flex gap-4 flex-wrap">
        <Link href="/agent/dashboard" className="text-gray-300 hover:text-red-400">แดชบอร์ด</Link>
        <Link href="/agent/topup" className="text-red-400 font-bold">เติมเครดิต</Link>
        <Link href="/agent/sell" className="text-gray-300 hover:text-red-400">ขายเติมเงิน</Link>
        <Link href="/agent/sales" className="text-gray-300 hover:text-red-400">ประวัติขาย</Link>
        <Link href="/agent/reports" className="text-gray-300 hover:text-red-400">รายงาน</Link>
        <button onClick={() => { localStorage.removeItem('agentToken'); router.push('/agent/login'); }} className="ml-auto text-gray-400 hover:text-red-400">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="card-ran p-6 text-center">
          <div className="text-gray-400 text-sm">余额ปัจจุบัน</div>
          <div className="text-4xl font-bold text-red-400 mt-2">฿{balance.toLocaleString()}</div>
        </div>

        {message.text && (
          <div className={`p-3 rounded ${message.type === 'error' ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card-ran p-6 space-y-4">
          <h2 className="text-lg font-bold">ส่งคำขอเติมเครดิต</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">จำนวนเงิน (ขั้นต่ำ 100)</label>
            <input type="number" min="100" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-ran-dark border border-red-900 rounded px-3 py-2 text-white focus:border-red-500 focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">วิธีชำระเงิน</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-ran-dark border border-red-900 rounded px-3 py-2 text-white focus:border-red-500 focus:outline-none">
              <option value="promptpay">PromptPay</option>
              <option value="bank">โอนธนาคาร</option>
              <option value="cash">เงินสด</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">เลขที่อ้างอิงธุรกรรม</label>
            <input type="text" value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full bg-ran-dark border border-red-900 rounded px-3 py-2 text-white focus:border-red-500 focus:outline-none" placeholder="กรอกเลข reference" />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full py-2 disabled:opacity-50">
            {submitting ? 'กำลังส่ง...' : 'ส่งคำขอ'}
          </button>
        </form>

        <div className="card-ran p-4">
          <h2 className="text-lg font-bold mb-3">ประวัติคำขอเติมเครดิต</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-red-900">
                <th className="text-left p-2">วันที่</th>
                <th className="text-right p-2">จำนวน</th>
                <th className="text-left p-2">วิธีชำระ</th>
                <th className="text-left p-2">Reference</th>
                <th className="text-left p-2">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-red-900/50 hover:bg-red-900/20">
                  <td className="p-2">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="p-2 text-right">฿{r.amount.toLocaleString()}</td>
                  <td className="p-2">{r.paymentMethod}</td>
                  <td className="p-2">{r.transactionRef || '-'}</td>
                  <td className={`p-2 font-bold ${statusColor(r.status)}`}>{statusLabel(r.status)}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">ยังไม่มีคำขอ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
