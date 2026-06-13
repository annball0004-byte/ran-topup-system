'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Guild {
  GuNum: number;
  GuName: string;
  GuRank: number;
  GuMoney: number;
  ChaNum: number;
  MasterName: string;
}

interface GuildDetail {
  GuNum: number;
  GuName: string;
  GuNotice: string;
  GuRank: number;
  GuMoney: number;
  GuIncomeMoney: number;
  GuMarkVer: number;
  GuExpire: number;
  GuMakeTime: string;
  GuExpireTime: string;
  GuAuthorityTime: string;
  GuAllianceBattleLose: number;
  GuAllianceBattleDraw: number;
  GuAllianceBattleWin: number;
  GuBattleLastTime: string;
  GuBattleLose: number;
  GuBattleDraw: number;
  GuBattleWin: number;
  master: { ChaNum: number; ChaName: string; ChaLevel: number; ChaClass: number; UserID: string; UserName: string } | null;
  deputy: { ChaNum: number; ChaName: string; ChaLevel: number; ChaClass: number; UserID: string; UserName: string } | null;
  members: any[];
  memberCount: number;
}

const classMap: Record<number, string> = {
  1: 'Brawler', 2: 'Knight', 4: 'Archer', 8: 'Shaman',
  16: 'Extreme Fighter', 32: 'Extreme Gunner', 64: 'Gunner', 128: 'Assassin'
};
const schoolMap: Record<number, string> = { 1: 'Sen', 2: 'Jin', 4: 'Ryoo' };
const posMap: Record<number, string> = { 0: 'สมาชิก', 1: 'หัวหน้า', 2: 'รองหัวหน้า', 3: 'สมาชิก' };

export default function AdminGuildsPage() {
  const router = useRouter();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState('');

  // Modals
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState<GuildDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'battle'>('info');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchGuilds();
  }, [page]);

  const fetchGuilds = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/admin/guilds?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setGuilds(data.guilds);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Fetch guilds error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setPage(1); fetchGuilds(); };

  const handleViewDetail = async (guild: Guild) => {
    setDetailLoading(true);
    setShowDetail(true);
    setActiveTab('info');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/guilds/${guild.GuNum}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetailData(data.guild);
      }
    } catch (error) {
      setMsg('ไม่สามารถดึงข้อมูลได้');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (!detailData) return;
    setEditForm({
      GuName: detailData.GuName,
      GuNotice: detailData.GuNotice,
      GuRank: detailData.GuRank,
      GuMoney: detailData.GuMoney,
      GuIncomeMoney: detailData.GuIncomeMoney,
      GuMarkVer: detailData.GuMarkVer,
      GuExpire: detailData.GuExpire,
      GuAllianceBattleWin: detailData.GuAllianceBattleWin,
      GuAllianceBattleDraw: detailData.GuAllianceBattleDraw,
      GuAllianceBattleLose: detailData.GuAllianceBattleLose,
      GuBattleWin: detailData.GuBattleWin,
      GuBattleDraw: detailData.GuBattleDraw,
      GuBattleLose: detailData.GuBattleLose,
    });
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!detailData) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/guilds/${detailData.GuNum}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message);
        setShowEdit(false);
        handleViewDetail({ GuNum: detailData.GuNum } as Guild);
        fetchGuilds();
        setTimeout(() => setMsg(''), 3000);
      } else {
        setMsg(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      setMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: any) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
  };

  const renderInput = (label: string, key: string, type: string = 'number') => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input type={type} value={editForm[key] ?? ''}
        onChange={(e) => updateField(key, type === 'number' || type === 'money' ? Number(e.target.value) : e.target.value)}
        className="input-ran text-sm" />
    </div>
  );

  return (
    <main className="min-h-screen bg-ran-dark">
      <div className="flex">
        <AdminSidebar activePage="guilds" />

        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">⚔️ จัดการกิลด์</h1>
              <p className="text-gray-400 font-thai">กิลด์ทั้งหมดในระบบ ({total.toLocaleString()} กิลด์)</p>
            </div>
          </header>

          <div className="p-6">
            {msg && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                msg.includes('สำเร็จ') ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-red-500/20 border border-red-500 text-red-400'
              }`}>{msg}</div>
            )}

            {/* Search */}
            <div className="card-ran mb-6">
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="input-ran" placeholder="ค้นหาชื่อกิลด์..." />
                </div>
                <button onClick={handleSearch} className="btn-ran px-6">🔍 ค้นหา</button>
              </div>
            </div>

            {/* Table */}
            <div className="card-ran">
              {loading ? (
                <div className="p-12 text-center text-gray-400">⏳ กำลังโหลด...</div>
              ) : guilds.length === 0 ? (
                <div className="p-12 text-center text-gray-500">ไม่พบข้อมูลกิลด์</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-3 text-gray-400 text-sm">ID</th>
                        <th className="text-left py-3 px-3 text-gray-400 text-sm">ชื่อกิลด์</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">Level</th>
                        <th className="text-right py-3 px-3 text-gray-400 text-sm">Money</th>
                        <th className="text-left py-3 px-3 text-gray-400 text-sm">หัวหน้า</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guilds.map((guild) => (
                        <tr key={guild.GuNum} className="border-b border-gray-800 hover:bg-ran-dark-50">
                          <td className="py-3 px-3 font-mono text-gray-400 text-sm">{guild.GuNum}</td>
                          <td className="py-3 px-3 text-white font-bold">{guild.GuName}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">Lv.{guild.GuRank}</span>
                          </td>
                          <td className="py-3 px-3 text-right text-yellow-400 font-bold text-sm">{(guild.GuMoney || 0).toLocaleString()}</td>
                          <td className="py-3 px-3 text-gray-300 text-sm">{guild.MasterName || '-'}</td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => handleViewDetail(guild)}
                                className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30">
                                📋 ดูข้อมูล
                              </button>
                              <button onClick={() => { handleViewDetail(guild); setTimeout(() => handleOpenEdit(), 300); }}
                                className="px-3 py-1 bg-ran-red/20 text-ran-red rounded text-xs hover:bg-ran-red/30">
                                ✏️ แก้ไข
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t border-gray-700">
                  <span className="text-sm text-gray-400">หน้า {page} / {totalPages}</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="btn-outline px-3 py-1 text-sm disabled:opacity-30">←</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                      if (p > totalPages) return null;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-ran-red text-white' : 'bg-ran-dark text-gray-400 hover:text-white'}`}>{p}</button>
                      );
                    })}
                    <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn-outline px-3 py-1 text-sm disabled:opacity-30">→</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Guild Detail Modal ===== */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card-ran w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">⚔️ กิลด์: {detailData?.GuName || '...'}</h3>
                <p className="text-gray-400 text-sm">ID: {detailData?.GuNum} | สมาชิก: {detailData?.memberCount || 0} คน</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleOpenEdit} className="btn-ran px-4 py-2 text-sm">✏️ แก้ไข</button>
                <button onClick={() => { setShowDetail(false); setDetailData(null); }} className="text-gray-400 hover:text-white text-2xl">✕</button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'info', label: '📋 ข้อมูลทั่วไป' },
                { key: 'members', label: '👥 สมาชิก' },
                { key: 'battle', label: '⚔️ สถิติการต่อสู้' },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeTab === tab.key ? 'bg-ran-red text-white' : 'bg-ran-dark text-gray-400 hover:text-white'
                  }`}>{tab.label}</button>
              ))}
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-gray-400">⏳ กำลังโหลด...</div>
            ) : detailData ? (
              <div className="bg-ran-dark rounded-lg p-4">
                {/* Info Tab */}
                {activeTab === 'info' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">ชื่อกิลด์</span>
                        <p className="text-white font-bold text-lg">{detailData.GuName}</p>
                      </div>
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">Level</span>
                        <p className="text-yellow-400 font-bold text-lg">Lv.{detailData.GuRank}</p>
                      </div>
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">สมาชิก</span>
                        <p className="text-blue-400 font-bold text-lg">{detailData.memberCount} คน</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">💰 เงินกิลด์</span>
                        <p className="text-yellow-400 font-bold">{(detailData.GuMoney || 0).toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">📈 รายได้เข้ากิลด์</span>
                        <p className="text-green-400 font-bold">{(detailData.GuIncomeMoney || 0).toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Notice */}
                    <div className="p-3 bg-ran-dark-50 rounded-lg">
                      <span className="text-gray-400 text-xs">📢 ประกาศกิลด์</span>
                      <p className="text-white mt-1">{detailData.GuNotice || 'ไม่มีประกาศ'}</p>
                    </div>

                    {/* Master & Deputy */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">👑 หัวหน้ากิลด์</span>
                        {detailData.master ? (
                          <div>
                            <p className="text-white font-bold">{detailData.master.ChaName}</p>
                            <p className="text-gray-400 text-xs">Lv.{detailData.master.ChaLevel} | {classMap[detailData.master.ChaClass] || detailData.master.ChaClass} | {detailData.master.UserID}</p>
                          </div>
                        ) : <p className="text-gray-500">-</p>}
                      </div>
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">🥈 รองหัวหน้า</span>
                        {detailData.deputy ? (
                          <div>
                            <p className="text-white font-bold">{detailData.deputy.ChaName}</p>
                            <p className="text-gray-400 text-xs">Lv.{detailData.deputy.ChaLevel} | {classMap[detailData.deputy.ChaClass] || detailData.deputy.ChaClass} | {detailData.deputy.UserID}</p>
                          </div>
                        ) : <p className="text-gray-500">ไม่มีรองหัวหน้า</p>}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">วันที่สร้าง</span>
                        <p className="text-white text-sm">{detailData.GuMakeTime ? new Date(detailData.GuMakeTime).toLocaleDateString('th-TH') : '-'}</p>
                      </div>
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">หมดอายุ</span>
                        <p className="text-white text-sm">{detailData.GuExpireTime ? new Date(detailData.GuExpireTime).toLocaleDateString('th-TH') : '-'}</p>
                      </div>
                      <div className="p-3 bg-ran-dark-50 rounded-lg">
                        <span className="text-gray-400 text-xs">Mark Version</span>
                        <p className="text-white text-sm">{detailData.GuMarkVer}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Members Tab */}
                {activeTab === 'members' && (
                  <div>
                    {detailData.members && detailData.members.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-2 px-3 text-gray-400 text-xs">ชื่อตัวละคร</th>
                              <th className="text-center py-2 px-3 text-gray-400 text-xs">Level</th>
                              <th className="text-center py-2 px-3 text-gray-400 text-xs">Class</th>
                              <th className="text-center py-2 px-3 text-gray-400 text-xs">ตำแหน่ง</th>
                              <th className="text-center py-2 px-3 text-gray-400 text-xs">สถานะ</th>
                              <th className="text-left py-2 px-3 text-gray-400 text-xs"> UserID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailData.members.map((m: any) => (
                              <tr key={m.ChaNum} className="border-b border-gray-800 hover:bg-ran-dark-50">
                                <td className="py-2 px-3 text-white font-bold text-sm">{m.ChaName}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">Lv.{m.ChaLevel}</span>
                                </td>
                                <td className="py-2 px-3 text-center text-xs">{classMap[m.ChaClass] || m.ChaClass}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    m.GuPosition === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                    m.GuPosition === 2 ? 'bg-purple-500/20 text-purple-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {posMap[m.GuPosition] || `Pos ${m.GuPosition}`}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    m.ChaOnline === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {m.ChaOnline === 1 ? 'Online' : 'Offline'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-gray-400 text-xs">{m.UserID}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">ไม่มีสมาชิก</p>
                    )}
                  </div>
                )}

                {/* Battle Tab */}
                {activeTab === 'battle' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white font-bold text-sm mb-3">⚔️ Guild Battle</h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="p-3 bg-green-500/10 rounded-lg text-center">
                          <span className="text-gray-400 text-xs">ชนะ</span>
                          <p className="text-green-400 font-bold text-2xl">{detailData.GuBattleWin || 0}</p>
                        </div>
                        <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
                          <span className="text-gray-400 text-xs">เสมอ</span>
                          <p className="text-yellow-400 font-bold text-2xl">{detailData.GuBattleDraw || 0}</p>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-lg text-center">
                          <span className="text-gray-400 text-xs">แพ้</span>
                          <p className="text-red-400 font-bold text-2xl">{detailData.GuBattleLose || 0}</p>
                        </div>
                        <div className="p-3 bg-ran-dark-50 rounded-lg text-center">
                          <span className="text-gray-400 text-xs">ครั้งสุดท้าย</span>
                          <p className="text-white text-sm">{detailData.GuBattleLastTime ? new Date(detailData.GuBattleLastTime).toLocaleDateString('th-TH') : '-'}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-white font-bold text-sm mb-3">🤝 Alliance Battle</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-green-500/10 rounded-lg text-center">
                          <span className="text-gray-400 text-xs">ชนะ</span>
                          <p className="text-green-400 font-bold text-2xl">{detailData.GuAllianceBattleWin || 0}</p>
                        </div>
                        <div className="p-3 bg-yellow-500/10 rounded-lg text-center">
                          <span className="text-gray-400 text-xs">เสมอ</span>
                          <p className="text-yellow-400 font-bold text-2xl">{detailData.GuAllianceBattleDraw || 0}</p>
                        </div>
                        <div className="p-3 bg-red-500/10 rounded-lg text-center">
                          <span className="text-gray-400 text-xs">แพ้</span>
                          <p className="text-red-400 font-bold text-2xl">{detailData.GuAllianceBattleLose || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Win Rate */}
                    <div className="p-3 bg-ran-dark-50 rounded-lg">
                      <span className="text-gray-400 text-xs">📊 อัตราชนะรวม</span>
                      <div className="mt-2">
                        {(() => {
                          const total = (detailData.GuBattleWin || 0) + (detailData.GuBattleDraw || 0) + (detailData.GuBattleLose || 0);
                          const winRate = total > 0 ? ((detailData.GuBattleWin || 0) / total * 100).toFixed(1) : '0.0';
                          return (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-white">ชนะ {winRate}%</span>
                                <span className="text-gray-400">{total} ครั้ง</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${winRate}%` }}></div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">ไม่พบข้อมูล</div>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={() => { setShowDetail(false); setDetailData(null); }} className="btn-outline px-6">ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Guild Modal ===== */}
      {showEdit && detailData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card-ran w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-display text-xl font-bold text-white">✏️ แก้ไขกิลด์: {detailData.GuName}</h3>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>

            <div className="space-y-4">
              <div className="bg-ran-dark rounded-lg p-4">
                <h4 className="text-white font-bold text-sm mb-3">📋 ข้อมูลทั่วไป</h4>
                <div className="grid grid-cols-2 gap-4">
                  {renderInput('ชื่อกิลด์', 'GuName', 'text')}
                  {renderInput('Level', 'GuRank')}
                  {renderInput('💰 เงินกิลด์', 'GuMoney', 'money')}
                  {renderInput('📈 รายได้เข้า', 'GuIncomeMoney', 'money')}
                  {renderInput('Mark Version', 'GuMarkVer')}
                  {renderInput('หมดอายุ (0=ไม่หมดอายุ)', 'GuExpire')}
                </div>
                <div className="mt-4">
                  <label className="block text-xs text-gray-400 mb-1">📢 ประกาศกิลด์</label>
                  <textarea value={editForm.GuNotice || ''} onChange={(e) => updateField('GuNotice', e.target.value)}
                    className="input-ran text-sm w-full" rows={3} placeholder="ประกาศกิลด์..." />
                </div>
              </div>

              <div className="bg-ran-dark rounded-lg p-4">
                <h4 className="text-white font-bold text-sm mb-3">⚔️ สถิติ Guild Battle</h4>
                <div className="grid grid-cols-3 gap-4">
                  {renderInput('🏆 ชนะ', 'GuBattleWin')}
                  {renderInput('🤝 เสมอ', 'GuBattleDraw')}
                  {renderInput('💔 แพ้', 'GuBattleLose')}
                </div>
              </div>

              <div className="bg-ran-dark rounded-lg p-4">
                <h4 className="text-white font-bold text-sm mb-3">🤝 สถิติ Alliance Battle</h4>
                <div className="grid grid-cols-3 gap-4">
                  {renderInput('🏆 ชนะ', 'GuAllianceBattleWin')}
                  {renderInput('🤝 เสมอ', 'GuAllianceBattleDraw')}
                  {renderInput('💔 แพ้', 'GuAllianceBattleLose')}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowEdit(false)} className="btn-outline flex-1">ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} className="btn-ran flex-1">
                {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
