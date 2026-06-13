'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface DashboardData {
  agent: {
    balance: number;
    commissionRate: number;
    level: string;
  };
  today: {
    sales: number;
    revenue: number;
  };
  month: {
    revenue: number;
  };
  totalCommission: number;
  recentSales: {
    id: number;
    userId: string;
    amount: number;
    commission: number;
    note: string;
    createdAt: string;
  }[];
}

export default function AgentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('agentToken');
    if (!token) {
      router.push('/agent/login');
      return;
    }
    fetchDashboard(token);
  }, [router]);

  const fetchDashboard = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/agents/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load dashboard');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-ran-dark text-white flex items-center justify-center">กำลังโหลด...</div>;
  if (error) return <div className="min-h-screen bg-ran-dark text-red-400 flex items-center justify-center">{error}</div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-ran-dark text-white">
      <nav className="bg-ran-card border-b border-red-900 p-4 flex gap-4 flex-wrap">
        <Link href="/agent/dashboard" className="text-red-400 font-bold">แดชบอร์ด</Link>
        <Link href="/agent/topup" className="text-gray-300 hover:text-red-400">เติมเครดิต</Link>
        <Link href="/agent/sell" className="text-gray-300 hover:text-red-400">ขายเติมเงิน</Link>
        <Link href="/agent/sales" className="text-gray-300 hover:text-red-400">ประวัติขาย</Link>
        <Link href="/agent/reports" className="text-gray-300 hover:text-red-400">รายงาน</Link>
        <button onClick={() => { localStorage.removeItem('agentToken'); router.push('/agent/login'); }} className="ml-auto text-gray-400 hover:text-red-400">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-ran p-6 text-center">
            <div className="text-gray-400 text-sm">余额</div>
            <div className="text-3xl font-bold text-red-400 mt-2">฿{data.agent.balance.toLocaleString()}</div>
          </div>
          <div className="card-ran p-6 text-center">
            <div className="text-gray-400 text-sm">ค่าคอมมิชชั่น</div>
            <div className="text-3xl font-bold text-yellow-400 mt-2">{data.agent.commissionRate}%</div>
          </div>
          <div className="card-ran p-6 text-center">
            <div className="text-gray-400 text-sm">ระดับ</div>
            <div className="text-3xl font-bold text-green-400 mt-2">{data.agent.level}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs">ขายวันนี้</div>
            <div className="text-xl font-bold mt-1">{data.today.sales}</div>
          </div>
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs">รายได้วันนี้</div>
            <div className="text-xl font-bold mt-1">฿{data.today.revenue.toLocaleString()}</div>
          </div>
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs">รายได้เดือนนี้</div>
            <div className="text-xl font-bold mt-1">฿{data.month.revenue.toLocaleString()}</div>
          </div>
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs">ค่าคอมทั้งหมด</div>
            <div className="text-xl font-bold mt-1 text-yellow-400">฿{data.totalCommission.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/agent/topup" className="btn-primary px-4 py-2">เติมเครดิต</Link>
          <Link href="/agent/sell" className="btn-primary px-4 py-2">ขายเติมเงิน</Link>
          <Link href="/agent/reports" className="btn-primary px-4 py-2">ดูรายงาน</Link>
        </div>

        <div className="card-ran p-4">
          <h2 className="text-lg font-bold mb-3">ขายล่าสุด</h2>
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
              {data.recentSales.map((sale) => (
                <tr key={sale.id} className="border-b border-red-900/50 hover:bg-red-900/20">
                  <td className="p-2">{new Date(sale.createdAt).toLocaleDateString('th-TH')}</td>
                  <td className="p-2">{sale.userId}</td>
                  <td className="p-2 text-right">฿{sale.amount.toLocaleString()}</td>
                  <td className="p-2 text-right text-yellow-400">฿{sale.commission.toLocaleString()}</td>
                  <td className="p-2">{sale.note || '-'}</td>
                </tr>
              ))}
              {data.recentSales.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500">ยังไม่มีรายการขาย</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
