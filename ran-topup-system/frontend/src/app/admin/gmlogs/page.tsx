'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface GMLog {
  RecordID: number; GMUserID: number; GMUserType: number;
  GMCharID: number; GMCharName: string; GMCommand: string; Date: string;
}

export default function GMLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<GMLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [gmNames, setGmNames] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [filterGM, setFilterGM] = useState('');
  const [filterCommand, setFilterCommand] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (filterGM) params.set('gmName', filterGM);
      if (filterCommand) params.set('command', filterCommand);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);

      const res = await fetch(`${API_URL}/admin/gmlogs/logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        setGmNames(data.gmNames);
        setStats(data.stats);
      }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleExport = () => {
    const token = localStorage.getItem('adminToken');
    const params = new URLSearchParams();
    if (filterGM) params.set('gmName', filterGM);
    if (filterCommand) params.set('command', filterCommand);
    if (filterDateFrom) params.set('dateFrom', filterDateFrom);
    if (filterDateTo) params.set('dateTo', filterDateTo);

    window.open(`${API_URL}/admin/gmlogs/logs/export?${params}&token=${token}`, '_blank');
  };

  const applyFilter = () => { setPage(1); fetchLogs(); };

  const clearFilter = () => {
    setFilterGM(''); setFilterCommand(''); setFilterDateFrom(''); setFilterDateTo('');
    setPage(1);
    setTimeout(fetchLogs, 100);
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
                { icon: '🖥️', label: 'Server Status', href: '/admin/server' },
                { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect' },
                { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop' },
                { icon: '📋', label: 'GM Logs', href: '/admin/gmlogs', active: true },
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
                <h1 className="font-display text-2xl font-bold text-white">📋 GM Command Logs</h1>
                <p className="text-gray-400 font-thai">ประวัติคำสั่ง GM ขั้นสูง - Filter & Export</p>
              </div>
              <button onClick={handleExport} className="btn-primary px-4 py-2">📥 Export CSV</button>
            </div>
          </header>

          <div className="p-6">
            {/* Stats */}
            {stats && (
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="card-ran text-center">
                  <div className="text-2xl font-bold text-white">{stats.totalCommands?.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm font-thai">คำสั่งทั้งหมด</div>
                </div>
                <div className="card-ran text-center">
                  <div className="text-2xl font-bold text-blue-400">{stats.uniqueGMs}</div>
                  <div className="text-gray-400 text-sm font-thai">GM ทั้งหมด</div>
                </div>
                <div className="card-ran text-center">
                  <div className="text-sm text-gray-300">{stats.oldestLog ? new Date(stats.oldestLog).toLocaleDateString('th-TH') : '-'}</div>
                  <div className="text-gray-400 text-sm font-thai">Log เก่าสุด</div>
                </div>
                <div className="card-ran text-center">
                  <div className="text-sm text-gray-300">{stats.newestLog ? new Date(stats.newestLog).toLocaleDateString('th-TH') : '-'}</div>
                  <div className="text-gray-400 text-sm font-thai">Log ใหม่สุด</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="card-ran mb-6">
              <h3 className="font-bold text-white mb-3 font-thai">🔍 ค้นหา / กรอง</h3>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-gray-400 text-xs mb-1 font-thai">GM Name</label>
                  <select value={filterGM} onChange={e => setFilterGM(e.target.value)}
                    className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="">ทุก GM</option>
                    {gmNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1 font-thai">คำสั่ง</label>
                  <input type="text" value={filterCommand} onChange={e => setFilterCommand(e.target.value)}
                    placeholder="เช่น POINT, MONEY..."
                    className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1 font-thai">จากวันที่</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1 font-thai">ถึงวันที่</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={applyFilter} className="btn-primary px-6 py-2 text-sm">🔍 ค้นหา</button>
                <button onClick={clearFilter} className="btn-secondary px-6 py-2 text-sm">ล้างตัวกรอง</button>
                <span className="text-gray-400 font-thai self-center ml-4">พบ {total} รายการ</span>
              </div>
            </div>

            {/* Logs Table */}
            <div className="card-ran">
              {loading ? (
                <div className="text-center py-12 text-gray-400">⏳ กำลังโหลด...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-thai">ไม่พบ Log</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ran-red/20">
                          <th className="p-3 text-left text-gray-400 font-thai">ID</th>
                          <th className="p-3 text-left text-gray-400 font-thai">วันที่</th>
                          <th className="p-3 text-left text-gray-400 font-thai">GM</th>
                          <th className="p-3 text-left text-gray-400 font-thai">คำสั่ง</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map(log => (
                          <tr key={log.RecordID} className="border-b border-ran-red/10 hover:bg-ran-dark-50">
                            <td className="p-3 text-gray-500 font-mono text-xs">{log.RecordID}</td>
                            <td className="p-3 text-gray-300 whitespace-nowrap text-xs">
                              {new Date(log.Date).toLocaleString('th-TH')}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-thai">
                                {log.GMCharName || `GM#${log.GMUserID}`}
                              </span>
                            </td>
                            <td className="p-3 text-white font-mono text-xs break-all">{log.GMCommand}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 p-4">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-3 py-1 bg-ran-dark rounded text-white disabled:opacity-30 text-sm">ก่อนหน้า</button>
                      <span className="text-gray-400 text-sm">หน้า {page} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="px-3 py-1 bg-ran-dark rounded text-white disabled:opacity-30 text-sm">ถัดไป</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
