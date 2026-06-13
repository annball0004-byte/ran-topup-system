'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface SellResult {
  newBalance: number;
  playerNewPoint: number;
  commissionEarned: number;
}

export default function AgentSell() {
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [result, setResult] = useState<SellResult | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('agentToken');
    if (!token) { router.push('/agent/login'); return; }
    fetchBalance(token);
  }, [router]);

  const fetchBalance = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/agents/me/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const d = await res.json(); setBalance(d.dashboard?.balance ?? d.agent?.balance ?? 0); }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const numAmount = parseFloat(amount) || 0;
  const overBalance = numAmount > balance && numAmount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!userId.trim()) { setMessage({ type: 'error', text: 'กรุณากรอก UserID' }); return; }
    if (num <= 0) { setMessage({ type: 'error', text: 'จำนวนเงินต้องมากกว่า 0' }); return; }
    if (num > balance) { setMessage({ type: 'error', text: 'จำนวนเงินเกิน余额' }); return; }

    const token = localStorage.getItem('agentToken');
    if (!token) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/agents/me/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: userId.trim(), amount: num, note: note.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'ขายไม่สำเร็จ');
      setMessage({ type: 'success', text: 'ขายสำเร็จ!' });
      setResult({
        newBalance: json.newBalance ?? json.agent?.newBalance ?? 0,
        playerNewPoint: json.playerNewPoint ?? json.player?.newPoint ?? 0,
        commissionEarned: json.commissionEarned ?? json.commission ?? 0,
      });
      setBalance(json.newBalance ?? json.agent?.newBalance ?? balance);
      setUserId(''); setAmount(''); setNote('');
      fetchBalance(token);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="min-h-screen bg-ran-dark text-white flex items-center justify-center">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-ran-dark text-white">
      <nav className="bg-ran-card border-b border-red-900 p-4 flex gap-4 flex-wrap">
        <Link href="/agent/dashboard" className="text-gray-300 hover:text-red-400">แดชบอร์ด</Link>
        <Link href="/agent/topup" className="text-gray-300 hover:text-red-400">เติมเครดิต</Link>
        <Link href="/agent/sell" className="text-red-400 font-bold">ขายเติมเงิน</Link>
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

        {overBalance && (
          <div className="p-3 rounded bg-yellow-900/50 text-yellow-300">
            จำนวนเงินเกิน余额 กรุณาเติมเครดิตก่อน
          </div>
        )}

        {result && (
          <div className="card-ran p-4 border border-green-700">
            <h3 className="font-bold text-green-400 mb-2">ผลการขาย</h3>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div><div className="text-gray-400">余额ใหม่</div><div className="text-lg font-bold">฿{result.newBalance.toLocaleString()}</div></div>
              <div><div className="text-gray-400">พอยต์ผู้เล่น</div><div className="text-lg font-bold">{result.playerNewPoint.toLocaleString()}</div></div>
              <div><div className="text-gray-400">คอมมิชชั่น</div><div className="text-lg font-bold text-yellow-400">฿{result.commissionEarned.toLocaleString()}</div></div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card-ran p-6 space-y-4">
          <h2 className="text-lg font-bold">ขายเติมเงินให้ผู้เล่น</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">UserID ผู้เล่น</label>
            <input type="text" value={userId} onChange={(e) => setUserId(e.target.value)}
              className="w-full bg-ran-dark border border-red-900 rounded px-3 py-2 text-white focus:border-red-500 focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">จำนวนเงิน</label>
            <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-ran-dark border border-red-900 rounded px-3 py-2 text-white focus:border-red-500 focus:outline-none" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">หมายเหตุ (ไม่บังคับ)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              className="w-full bg-ran-dark border border-red-900 rounded px-3 py-2 text-white focus:border-red-500 focus:outline-none resize-none" />
          </div>
          <button type="submit" disabled={submitting || overBalance} className="btn-primary w-full py-2 disabled:opacity-50">
            {submitting ? 'กำลังดำเนินการ...' : 'ขายเติมเงิน'}
          </button>
        </form>
      </div>
    </div>
  );
}
