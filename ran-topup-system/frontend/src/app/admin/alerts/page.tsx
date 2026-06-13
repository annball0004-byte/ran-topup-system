'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Alert {
  type: string; severity: string; icon: string;
  title: string; message: string; detail: string;
  timestamp: string; userId?: string; chaNum?: number; productNum?: number;
}

interface AlertStats {
  newPlayers24h: number; lowStock: number; outOfStock: number;
  highPK: number; gmCommands24h: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'border-red-500 bg-red-500/10',
  warning: 'border-yellow-500 bg-yellow-500/10',
  info: 'border-blue-500 bg-blue-500/10'
};
const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-red-400', warning: 'text-yellow-400', info: 'text-blue-400'
};
const TYPE_LABELS: Record<string, string> = {
  new_player: '👤 ผู้เล่นใหม่',
  low_stock: '📦 สต็อกใกล้หมด',
  high_pk: '⚔️ PK สูง',
  high_money: '💰 เงินมาก',
  gm_activity: '🎛️ GM Activity',
  no_equip_lock: '🔓 ไม่ล็อค'
};

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchAlerts();
    fetchStats();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAlerts(data.alerts);
        setSummary(data.summary);
      }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/alerts/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (error) { console.error(error); }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    return true;
  });

  const getLink = (alert: Alert) => {
    if (alert.userId) return `/admin/inspect?search=${alert.userId}`;
    if (alert.chaNum) return `/admin/characters?search=${alert.chaNum}`;
    if (alert.productNum) return `/admin/shop`;
    return '#';
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      <div className="flex">
        <aside className="sidebar">
          <div className="p-6 border-b border-ran-red/20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-ran-red rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-white">R</span>
              </div>
              <span className="font-display font-bold text-lg text-white">RAN TOP-UP</span>
            </div>
          </div>
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {[
                { icon: '📊', label: 'Dashboard', href: '/admin' },
                { icon: '🔔', label: 'แจ้งเตือน', href: '/admin/alerts', active: true },
                { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect' },
                { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop' },
                { icon: '🤖', label: 'จัดการ Agent', href: '/admin/agents' },
                { icon: '📦', label: 'ประวัติคำสั่งซื้อ', href: '/admin/order-history' },
                { icon: '📋', label: 'GM Logs', href: '/admin/gmlogs' },
                { icon: '🔎', label: 'ค้นหาขั้นสูง', href: '/admin/search' },
                { icon: '⚙️', label: 'ตั้งค่า', href: '/admin/settings' },
              ].map((item, i) => (
                <Link key={i} href={item.href} className={`sidebar-item ${item.active ? 'active' : ''}`}>
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-thai">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
        </aside>

        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">🔔 ระบบแจ้งเตือน</h1>
                <p className="text-gray-400 font-thai">แจ้งเตือนผู้เล่นใหม่, ไอเทมใกล้หมด, ผิดปกติ</p>
              </div>
              <button onClick={() => { fetchAlerts(); fetchStats(); }} className="btn-secondary px-4 py-2 text-sm">🔄 Refresh</button>
            </div>
          </header>

          <div className="p-6">
            {/* Stats Summary */}
            {stats && (
              <div className="grid md:grid-cols-5 gap-4 mb-6">
                <div className="card-ran text-center border-blue-500/30">
                  <div className="text-3xl font-bold text-blue-400">{stats.newPlayers24h}</div>
                  <div className="text-gray-400 text-sm font-thai">👤 ผู้เล่นใหม่ (24ชม.)</div>
                </div>
                <div className="card-ran text-center border-yellow-500/30">
                  <div className="text-3xl font-bold text-yellow-400">{stats.lowStock}</div>
                  <div className="text-gray-400 text-sm font-thai">⚠️ สต็อกใกล้หมด</div>
                </div>
                <div className="card-ran text-center border-red-500/30">
                  <div className="text-3xl font-bold text-red-400">{stats.outOfStock}</div>
                  <div className="text-gray-400 text-sm font-thai">🚫 ไอเทมหมด</div>
                </div>
                <div className="card-ran text-center border-orange-500/30">
                  <div className="text-3xl font-bold text-orange-400">{stats.highPK}</div>
                  <div className="text-gray-400 text-sm font-thai">⚔️ PK สูง</div>
                </div>
                <div className="card-ran text-center border-purple-500/30">
                  <div className="text-3xl font-bold text-purple-400">{stats.gmCommands24h}</div>
                  <div className="text-gray-400 text-sm font-thai">🎛️ GM Commands (24ชม.)</div>
                </div>
              </div>
            )}

            {/* Summary Bar */}
            {summary && (
              <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  <span className="text-gray-400 text-sm font-thai">Critical: {summary.critical}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                  <span className="text-gray-400 text-sm font-thai">Warning: {summary.warning}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span className="text-gray-400 text-sm font-thai">Info: {summary.info}</span>
                </div>
                <span className="text-gray-500 font-thai">| ทั้งหมด: {summary.total}</span>
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white text-sm">
                <option value="all">ทุกประเภท</option>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
                className="bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white text-sm">
                <option value="all">ทุกระดับ</option>
                <option value="critical">🔴 Critical</option>
                <option value="warning">🟡 Warning</option>
                <option value="blue">🔵 Info</option>
              </select>
              <span className="text-gray-400 font-thai self-center text-sm">แสดง {filteredAlerts.length} จาก {alerts.length} รายการ</span>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-gray-400">⏳ กำลังโหลด...</div>
              ) : filteredAlerts.length === 0 ? (
                <div className="card-ran text-center py-12">
                  <div className="text-4xl mb-4">✅</div>
                  <div className="text-gray-400 font-thai text-lg">ไม่มีแจ้งเตือน</div>
                </div>
              ) : (
                filteredAlerts.map((alert, i) => {
                  const link = getLink(alert);
                  return (
                    <Link key={i} href={link}
                      className={`block card-ran border-l-4 ${SEVERITY_COLORS[alert.severity]} hover:border-ran-red transition-all`}>
                      <div className="flex items-start gap-4">
                        <div className="text-2xl mt-1">{alert.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-bold font-thai ${SEVERITY_TEXT[alert.severity]}`}>{alert.title}</span>
                            <span className="px-2 py-0.5 bg-ran-dark rounded text-xs text-gray-400">
                              {TYPE_LABELS[alert.type] || alert.type}
                            </span>
                          </div>
                          <div className="text-gray-300 text-sm font-thai">{alert.message}</div>
                          {alert.detail && <div className="text-gray-500 text-xs mt-1">{alert.detail}</div>}
                        </div>
                        <div className="text-gray-500 text-xs whitespace-nowrap">
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleString('th-TH') : '-'}
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
