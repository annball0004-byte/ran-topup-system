'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface DashboardData {
  balance: number;
  commissionRate: number;
  level: string;
  totalSales: number;
  totalRevenue: number;
  totalCommission: number;
  todaySales: number;
  todayRevenue: number;
  monthSales: number;
  monthRevenue: number;
  recentSales: any[];
}

export default function AgentDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('agentToken');
    if (!token) { router.push('/agent/login'); return; }
    fetchDashboard(token);
  }, [router]);

  const fetchDashboard = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/agents/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json.dashboard);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-ran-dark text-white flex items-center justify-center">กำลังโหลด...</div>;
  if (!data) return <div className="min-h-screen bg-ran-dark text-red-400 flex items-center justify-center">ไม่พบข้อมูล</div>;

  return (
    <div className="min-h-screen bg-ran-dark text-white">
      <nav className="bg-ran-dark-100 border-b border-ran-red/20 p-4 flex gap-4 flex-wrap">
        <Link href="/agent/dashboard" className="text-ran-red font-bold font-thai">แดชบอร์ด</Link>
        <Link href="/agent/topup" className="text-gray-300 hover:text-ran-red font-thai">เติมเครดิต</Link>
        <Link href="/agent/sell" className="text-gray-300 hover:text-ran-red font-thai">ขายเติมเงิน</Link>
        <Link href="/agent/sales" className="text-gray-300 hover:text-ran-red font-thai">ประวัติขาย</Link>
        <Link href="/agent/reports" className="text-gray-300 hover:text-ran-red font-thai">รายงาน</Link>
        <button onClick={() => { localStorage.removeItem('agentToken'); router.push('/agent/login'); }}
          className="ml-auto text-gray-400 hover:text-ran-red font-thai">ออกจากระบบ</button>
      </nav>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Main Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-ran p-6 text-center border-ran-red/30">
            <div className="text-gray-400 text-sm font-thai">เครดิตคงเหลือ</div>
            <div className="text-3xl font-bold text-ran-red mt-2">฿{(data.balance || 0).toLocaleString()}</div>
          </div>
          <div className="card-ran p-6 text-center border-yellow-500/30">
            <div className="text-gray-400 text-sm font-thai">ค่าคอมมิชชั่น</div>
            <div className="text-3xl font-bold text-yellow-400 mt-2">{data.commissionRate || 0}%</div>
          </div>
          <div className="card-ran p-6 text-center border-green-500/30">
            <div className="text-gray-400 text-sm font-thai">ระดับ Agent</div>
            <div className="text-3xl font-bold text-green-400 mt-2 capitalize">{data.level || 'bronze'}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs font-thai">ขายวันนี้</div>
            <div className="text-xl font-bold mt-1">{data.todaySales || 0}</div>
          </div>
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs font-thai">รายได้วันนี้</div>
            <div className="text-xl font-bold mt-1">฿{(data.todayRevenue || 0).toLocaleString()}</div>
          </div>
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs font-thai">รายได้เดือนนี้</div>
            <div className="text-xl font-bold mt-1">฿{(data.monthRevenue || 0).toLocaleString()}</div>
          </div>
          <div className="card-ran p-4 text-center">
            <div className="text-gray-400 text-xs font-thai">ค่าคอมทั้งหมด</div>
            <div className="text-xl font-bold mt-1 text-yellow-400">฿{(data.totalCommission || 0).toLocaleString()}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          <Link href="/agent/topup" className="btn-primary px-4 py-2 font-thai">💰 เติมเครดิต</Link>
          <Link href="/agent/sell" className="btn-primary px-4 py-2 font-thai">💳 ขายเติมเงิน</Link>
          <Link href="/agent/reports" className="btn-secondary px-4 py-2 font-thai">📊 ดูรายงาน</Link>
        </div>

        {/* Recent Sales */}
        <div className="card-ran p-4">
          <h2 className="text-lg font-bold mb-3 font-thai">📋 ขายล่าสุด</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-ran-red/20">
                <th className="text-left p-2 font-thai">วันที่</th>
                <th className="text-left p-2 font-thai">UserID</th>
                <th className="text-right p-2 font-thai">จำนวน</th>
                <th className="text-right p-2 font-thai">คอมมิชชั่น</th>
                <th className="text-left p-2 font-thai">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {(data.recentSales || []).map((sale: any, i: number) => (
                <tr key={i} className="border-b border-ran-dark hover:bg-ran-dark/50">
                  <td className="p-2">{sale.createdAt ? new Date(sale.createdAt).toLocaleDateString('th-TH') : '-'}</td>
                  <td className="p-2">{sale.userId}</td>
                  <td className="p-2 text-right">฿{(sale.amount || 0).toLocaleString()}</td>
                  <td className="p-2 text-right text-yellow-400">฿{(sale.commission || 0).toLocaleString()}</td>
                  <td className="p-2 text-gray-400">{sale.note || '-'}</td>
                </tr>
              ))}
              {(!data.recentSales || data.recentSales.length === 0) && (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500 font-thai">ยังไม่มีรายการขาย</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
