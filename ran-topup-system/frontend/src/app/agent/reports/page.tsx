'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ReportData {
  totalRevenue: number;
  totalCommission: number;
  monthRevenue: number;
  yearRevenue: number;
  topCustomers: {
    userId: string;
    totalAmount: number;
    totalCommission: number;
    salesCount: number;
  }[];
}

export default function AgentReports() {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('agentToken');
    if (!token) { router.push('/agent/login'); return; }
    fetchReports(token);
  }, [router]);

  const fetchReports = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/agents/me/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('โหลดรายงานล้มเหลว');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen bg-ran-dark text-white flex items-center justify-center">กำลังโหลด...</div>;
  if (error) return <div className="min-h-screen bg-ran-dark text-red-400 flex items-center justify-center">{error}</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-ran-dark text-white">
      <nav className="bg-ran-card border-b border-red-900 p-4 flex gap-4 flex-wrap">
        <Link href="/agent/dashboard" className="text-gray-300 hover:text-red-400">แดชบอร์ด</Link>
        <Link href="/agent/topup" className="text-gray-300 hover:text-red-400">เติมเครดิต</Link>
        <Link href="/agent/sell" className="text-gray-300 hover:text-red-400">ขายเติมเงิน</Link>
        <Link href="/agent/sales" className="text-gray-300 hover:text-red-400">ประวัติขาย</Link>
        <Link href="/agent/reports" className="text-red-400 font-bold">รายงาน</Link>
        <button onClick={() => { localStorage.removeItem('agentToken'); router.push('/agent/login'); }} className="ml-auto text-gray-400 hover:text-red-400">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">รายงาน</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs">รายได้ทั้งหมด</div>
            <div className="text-xl font-bold text-red-400 mt-1">฿{data.totalRevenue.toLocaleString()}</div>
          </div>
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs">คอมมิชชั่นทั้งหมด</div>
            <div className="text-xl font-bold text-yellow-400 mt-1">฿{data.totalCommission.toLocaleString()}</div>
          </div>
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs">รายได้เดือนนี้</div>
            <div className="text-xl font-bold text-green-400 mt-1">฿{data.monthRevenue.toLocaleString()}</div>
          </div>
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs">รายได้ปีนี้</div>
            <div className="text-xl font-bold text-blue-400 mt-1">฿{data.yearRevenue.toLocaleString()}</div>
          </div>
        </div>

        <div className="card-ran p-4">
          <h2 className="text-lg font-bold mb-3">ลูกค้าดีเด่น</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-red-900">
                <th className="text-left p-2"> UserID</th>
                <th className="text-right p-2">จำนวนครั้ง</th>
                <th className="text-right p-2">ยอดซื้อรวม</th>
                <th className="text-right p-2">คอมมิชชั่นรวม</th>
              </tr>
            </thead>
            <tbody>
              {data.topCustomers.map((c) => (
                <tr key={c.userId} className="border-b border-red-900/50 hover:bg-red-900/20">
                  <td className="p-2">{c.userId}</td>
                  <td className="p-2 text-right">{c.salesCount}</td>
                  <td className="p-2 text-right">฿{c.totalAmount.toLocaleString()}</td>
                  <td className="p-2 text-right text-yellow-400">฿{c.totalCommission.toLocaleString()}</td>
                </tr>
              ))}
              {data.topCustomers.length === 0 && (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500">ยังไม่มีข้อมูลลูกค้า</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
