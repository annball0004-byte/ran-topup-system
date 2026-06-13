'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const CLASS_MAP: Record<number, string> = {
  1: 'Brawler', 2: 'Knight', 4: 'Archer', 8: 'Shaman',
  16: 'Extreme', 32: 'Extreme', 64: 'Gunner', 128: 'Assassin', 256: 'Pritti'
};

interface ServerStatus {
  db: { game: boolean; user: boolean; log: boolean; shop: boolean };
  online: { total: number; byClass: any[]; byMap: any[] };
  totals: { users: number; characters: number; guilds: number };
  serverState: any[];
  recentLogins: any[];
  timestamp: string;
}

export default function ServerPage() {
  const router = useRouter();
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const [statusRes, playersRes] = await Promise.all([
        fetch(`${API_URL}/admin/server/status`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/server/online-players`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const statusData = await statusRes.json();
      const playersData = await playersRes.json();
      if (statusData.success) setStatus(statusData.status);
      if (playersData.success) setPlayers(playersData.players);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const dbAllConnected = status?.db.game && status?.db.user && status?.db.log && status?.db.shop;

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
                { icon: '🖥️', label: 'Server Status', href: '/admin/server', active: true },
                { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect' },
                { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop' },
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
                <h1 className="font-display text-2xl font-bold text-white">🖥️ Server Status Monitor</h1>
                <p className="text-gray-400 font-thai">สถานะเซิร์ฟเวอร์แบบ Real-time</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-4 py-2 rounded-lg font-thai text-sm transition-all ${autoRefresh ? 'bg-green-500 text-white' : 'bg-ran-dark-100 text-gray-400 hover:bg-ran-dark-50'}`}>
                  {autoRefresh ? '🟢 Auto Refresh ON' : '⚪ Auto Refresh OFF'}
                </button>
                <button onClick={fetchStatus} className="btn-secondary text-sm py-2 px-4">🔄 Refresh</button>
              </div>
            </div>
          </header>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-20 text-gray-400">⏳ กำลังโหลด...</div>
            ) : status && (
              <>
                {/* DB Status */}
                <div className="grid md:grid-cols-5 gap-4 mb-6">
                  <div className={`card-ran text-center ${dbAllConnected ? 'border-green-500/30' : 'border-red-500/30'}`}>
                    <div className={`text-3xl mb-2 ${dbAllConnected ? 'text-green-400' : 'text-red-400'}`}>
                      {dbAllConnected ? '✅' : '❌'}
                    </div>
                    <div className="text-white font-bold font-thai">Database</div>
                    <div className="text-xs text-gray-400">{dbAllConnected ? 'Connected' : 'Error'}</div>
                  </div>
                  {[
                    { label: 'Game (RanGame1)', ok: status.db.game },
                    { label: 'User (RanUser)', ok: status.db.user },
                    { label: 'Log (RanLog)', ok: status.db.log },
                    { label: 'Shop (RanShop)', ok: status.db.shop },
                  ].map((db, i) => (
                    <div key={i} className="card-ran text-center">
                      <div className={`text-2xl mb-1 ${db.ok ? 'text-green-400' : 'text-red-400'}`}>
                        {db.ok ? '🟢' : '🔴'}
                      </div>
                      <div className="text-white text-sm font-thai">{db.label}</div>
                    </div>
                  ))}
                </div>

                {/* Online & Totals */}
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <div className="card-ran text-center border-green-500/30">
                    <div className="text-4xl font-bold text-green-400">{status.online.total}</div>
                    <div className="text-gray-400 font-thai">🟢 ออนไลน์ตอนนี้</div>
                  </div>
                  <div className="card-ran text-center">
                    <div className="text-3xl font-bold text-white">{status.totals.users.toLocaleString()}</div>
                    <div className="text-gray-400 font-thai">👤 ผู้ใช้ทั้งหมด</div>
                  </div>
                  <div className="card-ran text-center">
                    <div className="text-3xl font-bold text-blue-400">{status.totals.characters.toLocaleString()}</div>
                    <div className="text-gray-400 font-thai">🎮 ตัวละครทั้งหมด</div>
                  </div>
                  <div className="card-ran text-center">
                    <div className="text-3xl font-bold text-purple-400">{status.totals.guilds}</div>
                    <div className="text-gray-400 font-thai">⚔️ กิลด์ทั้งหมด</div>
                  </div>
                </div>

                {/* Online by Class */}
                {status.online.byClass.length > 0 && (
                  <div className="card-ran mb-6">
                    <h3 className="font-display text-lg font-bold text-white mb-4">📊 ผู้เล่นออนไลน์ตามคลาส</h3>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {status.online.byClass.map((cls: any, i: number) => (
                        <div key={i} className="p-3 bg-ran-dark rounded-lg text-center">
                          <div className="text-xl font-bold text-white">{cls.count}</div>
                          <div className="text-xs text-gray-400 font-thai">{CLASS_MAP[cls.ChaClass] || `Class ${cls.ChaClass}`}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Online Players Table */}
                <div className="card-ran mb-6">
                  <h3 className="font-display text-lg font-bold text-white mb-4">
                    🟢 ผู้เล่นออนไลน์ ({players.length} คน)
                  </h3>
                  {players.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 font-thai">ไม่มีผู้เล่นออนไลน์</div>
                  ) : (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-ran-dark-100">
                          <tr className="border-b border-ran-red/20">
                            <th className="p-3 text-left text-gray-400 font-thai">#</th>
                            <th className="p-3 text-left text-gray-400 font-thai">ชื่อตัวละคร</th>
                            <th className="p-3 text-left text-gray-400 font-thai">Level</th>
                            <th className="p-3 text-left text-gray-400 font-thai">คลาส</th>
                            <th className="p-3 text-left text-gray-400 font-thai"> UserID</th>
                            <th className="p-3 text-left text-gray-400 font-thai">Map</th>
                          </tr>
                        </thead>
                        <tbody>
                          {players.map((p: any, i: number) => (
                            <tr key={p.ChaNum} className="border-b border-ran-red/10 hover:bg-ran-dark-50">
                              <td className="p-3 text-gray-500">{i + 1}</td>
                              <td className="p-3 text-white font-thai">{p.ChaName}</td>
                              <td className="p-3 text-yellow-400 font-bold">{p.ChaLevel}</td>
                              <td className="p-3 text-gray-300 font-thai">{CLASS_MAP[p.ChaClass] || p.ChaClass}</td>
                              <td className="p-3 text-ran-red">{p.UserID}</td>
                              <td className="p-3 text-gray-400 font-mono text-xs">Map {p.ChaStartMap}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recent Logins */}
                {status.recentLogins.length > 0 && (
                  <div className="card-ran">
                    <h3 className="font-display text-lg font-bold text-white mb-4">🔐 ผู้ที่ Login ล่าสุด</h3>
                    <div className="space-y-2">
                      {status.recentLogins.map((login: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-ran-dark rounded-lg">
                          <div>
                            <span className="text-white font-thai">{login.UserID}</span>
                            <span className="text-gray-500 ml-2">({login.UserName})</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">{login.LastLoginDate ? new Date(login.LastLoginDate).toLocaleString('th-TH') : '-'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-center text-gray-500 text-xs mt-4 font-thai">
                  อัพเดทล่าสุด: {new Date(status.timestamp).toLocaleString('th-TH')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
