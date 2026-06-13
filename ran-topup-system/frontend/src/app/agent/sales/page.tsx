'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Sale {
  id: number;
  userId: string;
  amount: number;
  commission: number;
  note: string;
  createdAt: string;
}

export default function AgentSales() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('agentToken');
    if (!token) { router.push('/agent/login'); return; }
    fetchSales(token, page);
  }, [router, page]);

  const fetchSales = async (token: string, p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/agents/me/sales?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('โหลดข้อมูลล้มเหลว');
      const json = await res.json();
      setSales(json.sales || json.data || json);
      setTotalPages(json.totalPages || json.totalPages || 1);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-ran-dark text-white">
      <nav className="bg-ran-card border-b border-red-900 p-4 flex gap-4 flex-wrap">
        <Link href="/agent/dashboard" className="text-gray-300 hover:text-red-400">แดชบอร์ด</Link>
        <Link href="/agent/topup" className="text-gray-300 hover:text-red-400">เติมเครดิต</Link>
        <Link href="/agent/sell" className="text-gray-300 hover:text-red-400">ขายเติมเงิน</Link>
        <Link href="/agent/sales" className="text-red-400 font-bold">ประวัติขาย</Link>
        <Link href="/agent/reports" className="text-gray-300 hover:text-red-400">รายงาน</Link>
        <button onClick={() => { localStorage.removeItem('agentToken'); router.push('/agent/login'); }} className="ml-auto text-gray-400 hover:text-red-400">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">ประวัติการขาย</h1>

        {error && <div className="p-3 rounded bg-red-900/50 text-red-300">{error}</div>}

        <div className="card-ran p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-red-900">
                <th className="text-left p-2">วันที่</th>
                <th className="text-left p-2"> UserID</th>
                <th className="text-right p-2">จำนวน</th>
                <th className="text-right p-2">คอมมิชชั่น</th>
                <th className="text-left p-2">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">กำลังโหลด...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">ยังไม่มีรายการขาย</td></tr>
              ) : sales.map((s) => (
                <tr key={s.id} className="border-b border-red-900/50 hover:bg-red-900/20">
                  <td className="p-2">{new Date(s.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="p-2">{s.userId}</td>
                  <td className="p-2 text-right">฿{s.amount.toLocaleString()}</td>
                  <td className="p-2 text-right text-yellow-400">฿{s.commission.toLocaleString()}</td>
                  <td className="p-2">{s.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-primary px-3 py-1 disabled:opacity-50">ก่อนหน้า</button>
            <span className="px-3 py-1 text-gray-400">หน้า {page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-primary px-3 py-1 disabled:opacity-50">ถัดไป</button>
          </div>
        )}
      </div>
    </div>
  );
}
