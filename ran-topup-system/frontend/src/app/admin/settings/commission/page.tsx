'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const LEVELS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
const LEVEL_LABELS: Record<string, string> = {
  bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold',
  platinum: '💎 Platinum', diamond: '👑 Diamond'
};

export default function CommissionSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentReports, setAgentReports] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchConfig();
    fetchReports();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/agents/admin/commission-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setConfig(data.config);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/agents/admin/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAgentReports(data.reports);
    } catch (error) { console.error(error); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/agents/admin/commission-settings`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) alert('บันทึกสำเร็จ!');
    } catch { alert('เกิดข้อผิดพลาด'); }
    setSaving(false);
  };

  const updateLevel = (level: string, field: string, value: number) => {
    setConfig({
      ...config,
      levels: { ...config.levels, [level]: { ...config.levels[level], [field]: value } }
    });
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      <div className="flex">
        <AdminSidebar activePage="settings-commission" />
        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">💰 ตั้งค่า Commission & Agent Reports</h1>
                <p className="text-gray-400 font-thai">ตั้งค่าค่าคอมมิชชั่นตามระดับ Agent, ดูรายงาน Agent ทั้งหมด</p>
              </div>
              <button onClick={handleSave} disabled={saving || !config}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                {saving ? '⏳' : '💾 บันทึก'}
              </button>
            </div>
          </header>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-20 text-gray-400">⏳</div>
            ) : config && (
              <>
                {/* Commission Levels */}
                <div className="card-ran mb-6">
                  <h3 className="font-display text-lg font-bold text-white mb-4">📊 ค่าคอมมิชชั่นตามระดับ Agent</h3>
                  <div className="space-y-3">
                    {LEVELS.map(level => (
                      <div key={level} className="flex items-center gap-4 p-3 bg-ran-dark rounded-lg">
                        <div className="w-32 font-bold text-white">{LEVEL_LABELS[level]}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">ยอดขายขั้นต่ำ:</span>
                          <input type="number" value={config.levels[level]?.minSales || 0}
                            onChange={e => updateLevel(level, 'minSales', Number(e.target.value))}
                            className="w-32 bg-ran-dark-100 border border-ran-red/20 rounded px-3 py-1 text-white text-sm" />
                          <span className="text-gray-500 text-sm">฿</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">ค่าคอม:</span>
                          <input type="number" min="0" max="50" value={config.levels[level]?.rate || 0}
                            onChange={e => updateLevel(level, 'rate', Number(e.target.value))}
                            className="w-16 bg-ran-dark-100 border border-ran-red/20 rounded px-3 py-1 text-white text-sm" />
                          <span className="text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent Reports */}
                {agentReports && (
                  <>
                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                      <div className="card-ran text-center border-blue-500/30">
                        <div className="text-3xl font-bold text-blue-400">{agentReports.totalAgents}</div>
                        <div className="text-gray-400 text-sm font-thai">Agent ทั้งหมด</div>
                      </div>
                      <div className="card-ran text-center border-green-500/30">
                        <div className="text-3xl font-bold text-green-400">{agentReports.activeAgents}</div>
                        <div className="text-gray-400 text-sm font-thai">Active</div>
                      </div>
                      <div className="card-ran text-center border-yellow-500/30">
                        <div className="text-3xl font-bold text-yellow-400">฿{(agentReports.totalRevenue || 0).toLocaleString()}</div>
                        <div className="text-gray-400 text-sm font-thai">รายได้รวม</div>
                      </div>
                      <div className="card-ran text-center border-purple-500/30">
                        <div className="text-3xl font-bold text-purple-400">฿{(agentReports.totalPaidCommission || 0).toLocaleString()}</div>
                        <div className="text-gray-400 text-sm font-thai">ค่าคอมจ่ายแล้ว</div>
                      </div>
                    </div>

                    <div className="card-ran">
                      <h3 className="font-display text-lg font-bold text-white mb-4">🏆 อันดับ Agent</h3>
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-ran-red/20">
                            <th className="text-left px-4 py-2 text-gray-400 text-sm font-thai">#</th>
                            <th className="text-left px-4 py-2 text-gray-400 text-sm font-thai">Agent</th>
                            <th className="text-center px-4 py-2 text-gray-400 text-sm font-thai">ระดับ</th>
                            <th className="text-right px-4 py-2 text-gray-400 text-sm font-thai">เครดิต</th>
                            <th className="text-center px-4 py-2 text-gray-400 text-sm font-thai">จำนวนขาย</th>
                            <th className="text-right px-4 py-2 text-gray-400 text-sm font-thai">ยอดขาย</th>
                            <th className="text-right px-4 py-2 text-gray-400 text-sm font-thai">ค่าคอม</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentReports.agentStats?.map((a: any, i: number) => (
                            <tr key={a.id} className="border-b border-ran-dark hover:bg-ran-dark/50">
                              <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                              <td className="px-4 py-2 text-white font-bold">{a.name}</td>
                              <td className="px-4 py-2 text-center">{LEVEL_LABELS[a.level] || a.level}</td>
                              <td className="px-4 py-2 text-right text-yellow-400">฿{(a.balance || 0).toLocaleString()}</td>
                              <td className="px-4 py-2 text-center text-gray-300">{a.totalSales}</td>
                              <td className="px-4 py-2 text-right text-green-400">฿{(a.totalRevenue || 0).toLocaleString()}</td>
                              <td className="px-4 py-2 text-right text-purple-400">฿{(a.totalCommission || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
