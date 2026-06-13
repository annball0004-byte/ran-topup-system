'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface User {
  UserID: string;
  UserName: string;
  Point: number;
  VotePoint: number;
  Status: number;
  LoginState: number;
  LastLogin: string;
  SvrNum: number;
  SGNum: number;
}

interface UserDetail {
  UserID: string;
  UserName: string;
  UserPass: string;
  Point: number;
  VotePoint: number;
  Status: number;
  LoginState: number;
  LastLogin: string;
  SvrNum: number;
  SGNum: number;
  characters: any[];
}

const classMap: Record<number, string> = {
  1: 'Brawler', 2: 'Knight', 4: 'Archer', 8: 'Shaman',
  16: 'Extreme Fighter', 32: 'Extreme Gunner', 64: 'Gunner', 128: 'Assassin'
};
const schoolMap: Record<number, string> = { 1: 'Sen', 2: 'Jin', 4: 'Ryoo' };

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [msg, setMsg] = useState('');

  // Modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailData, setDetailData] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [editForm, setEditForm] = useState({ point: 0, votePoint: 0, status: 1 });
  const [pointsForm, setPointsForm] = useState({ amount: 0, type: 'point', reason: '' });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchUsers();
  }, [page, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter !== '') params.set('status', statusFilter);
      const res = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Fetch users error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setPage(1); fetchUsers(); };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.UserID}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setMsg('อัพเดทสำเร็จ');
        setShowEditModal(false);
        fetchUsers();
        setTimeout(() => setMsg(''), 3000);
      } else {
        setMsg(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      setMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleAddPoints = async () => {
    if (!selectedUser || pointsForm.amount <= 0) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/users/${selectedUser.UserID}/add-points`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(pointsForm)
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message);
        setShowPointsModal(false);
        setPointsForm({ amount: 0, type: 'point', reason: '' });
        fetchUsers();
        setTimeout(() => setMsg(''), 3000);
      } else {
        setMsg(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      setMsg('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.Status === 1 ? 0 : 1;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/users/${user.UserID}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message);
        fetchUsers();
        setTimeout(() => setMsg(''), 3000);
      }
    } catch (error) {
      setMsg('เกิดข้อผิดพลาด');
    }
  };

  const handleViewDetail = async (user: User) => {
    setSelectedUser(user);
    setDetailLoading(true);
    setShowDetailModal(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/users/${user.UserID}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetailData(data.user);
      }
    } catch (error) {
      setMsg('ไม่สามารถดึงข้อมูลได้');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGoToChar = (chaNum: number) => {
    router.push(`/admin/characters?edit=${chaNum}`);
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      <div className="flex">
        {/* Sidebar */}
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
                { icon: '👥', label: 'ผู้ใช้', href: '/admin/users', active: true },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect' },
                { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop' },
                { icon: '⚙️', label: 'ตั้งค่า', href: '/admin/settings' },
              ].map((item, i) => (
                <Link key={i} href={item.href} className={`sidebar-item ${item.active ? 'active' : ''}`}>
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-thai">{item.label}</span>
                </Link>
              ))}
            </div>
          </nav>
          <div className="p-4 border-t border-ran-red/20">
            <Link href="/" className="sidebar-item">
              <span className="text-xl">🚪</span>
              <span className="font-thai">ออกจากระบบ</span>
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">👥 จัดการผู้ใช้</h1>
                <p className="text-gray-400 font-thai">รายชื่อผู้ใช้ทั้งหมดในระบบ ({total.toLocaleString()} คน)</p>
              </div>
            </div>
          </header>

          <div className="p-6">
            {msg && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                msg.includes('สำเร็จ') ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-red-500/20 border border-red-500 text-red-400'
              }`}>{msg}</div>
            )}

            {/* Search & Filter */}
            <div className="card-ran mb-6">
              <div className="flex gap-4 items-center flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="input-ran" placeholder="ค้นหา UserID หรือ UserName..." />
                </div>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-ran w-48">
                  <option value="">ทุกสถานะ</option>
                  <option value="1">Active</option>
                  <option value="0">Banned</option>
                </select>
                <button onClick={handleSearch} className="btn-ran px-6">🔍 ค้นหา</button>
                <button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); fetchUsers(); }} className="btn-outline px-4">↻ รีเซ็ต</button>
              </div>
            </div>

            {/* Users Table */}
            <div className="card-ran">
              {loading ? (
                <div className="p-12 text-center text-gray-400">⏳ กำลังโหลด...</div>
              ) : users.length === 0 ? (
                <div className="p-12 text-center text-gray-500">ไม่พบข้อมูลผู้ใช้</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-3 text-gray-400 text-sm">UserID</th>
                        <th className="text-left py-3 px-3 text-gray-400 text-sm">UserName</th>
                        <th className="text-right py-3 px-3 text-gray-400 text-sm">Point</th>
                        <th className="text-right py-3 px-3 text-gray-400 text-sm">VotePoint</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">สถานะ</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">Login</th>
                        <th className="text-left py-3 px-3 text-gray-400 text-sm">Last Login</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.UserID} className="border-b border-gray-800 hover:bg-ran-dark-50">
                          <td className="py-3 px-3 font-mono text-white text-sm">{user.UserID}</td>
                          <td className="py-3 px-3 text-white text-sm">{user.UserName}</td>
                          <td className="py-3 px-3 text-right text-yellow-400 font-bold text-sm">{(user.Point || 0).toLocaleString()}</td>
                          <td className="py-3 px-3 text-right text-purple-400 font-bold text-sm">{(user.VotePoint || 0).toLocaleString()}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${user.Status === 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {user.Status === 1 ? 'Active' : 'Banned'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${user.LoginState === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              {user.LoginState === 1 ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-400 text-xs">
                            {user.LastLogin ? new Date(user.LastLogin).toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex gap-1 justify-center flex-wrap">
                              <button onClick={() => handleViewDetail(user)}
                                className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30">
                                📋 ดูข้อมูล
                              </button>
                              <button onClick={() => { setSelectedUser(user); setEditForm({ point: user.Point || 0, votePoint: user.VotePoint || 0, status: user.Status }); setShowEditModal(true); }}
                                className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30">
                                ✏️ แก้ไข
                              </button>
                              <button onClick={() => { setSelectedUser(user); setPointsForm({ amount: 0, type: 'point', reason: '' }); setShowPointsModal(true); }}
                                className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30">
                                💰 +เงิน
                              </button>
                              <button onClick={() => handleViewDetail(user)}
                                className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30">
                                🎮 ตัวละคร
                              </button>
                              <button onClick={() => handleToggleStatus(user)}
                                className={`px-2 py-1 rounded text-xs ${user.Status === 1 ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>
                                {user.Status === 1 ? '🔒 ระงับ' : '🔓 เปิดใช้'}
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
                  <span className="text-sm text-gray-400">หน้า {page} / {totalPages} ({total.toLocaleString()} รายการ)</span>
                  <div className="flex gap-2">
                    <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="btn-outline px-3 py-1 text-sm disabled:opacity-30">← ก่อนหน้า</button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                      if (p > totalPages) return null;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-ran-red text-white' : 'bg-ran-dark text-gray-400 hover:text-white'}`}>{p}</button>
                      );
                    })}
                    <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn-outline px-3 py-1 text-sm disabled:opacity-30">ถัดไป →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Edit User Modal ===== */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card-ran w-full max-w-md">
            <h3 className="font-display text-xl font-bold text-white mb-4">✏️ แก้ไขผู้ใช้ {selectedUser.UserID}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Point</label>
                <input type="number" value={editForm.point} onChange={(e) => setEditForm({ ...editForm, point: Number(e.target.value) })} className="input-ran" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">VotePoint</label>
                <input type="number" value={editForm.votePoint} onChange={(e) => setEditForm({ ...editForm, votePoint: Number(e.target.value) })} className="input-ran" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">สถานะ</label>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: Number(e.target.value) })} className="input-ran">
                  <option value={1}>Active</option>
                  <option value={0}>Banned</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowEditModal(false)} className="btn-outline flex-1">ยกเลิก</button>
              <button onClick={handleEditUser} className="btn-ran flex-1">บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Add Points Modal ===== */}
      {showPointsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card-ran w-full max-w-md">
            <h3 className="font-display text-xl font-bold text-white mb-2">💰 เพิ่มเงินให้ {selectedUser.UserID}</h3>
            <p className="text-gray-400 text-sm mb-4">Point: <span className="text-yellow-400 font-bold">{(selectedUser.Point || 0).toLocaleString()}</span> | VotePoint: <span className="text-purple-400 font-bold">{(selectedUser.VotePoint || 0).toLocaleString()}</span></p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">ประเภท</label>
                <select value={pointsForm.type} onChange={(e) => setPointsForm({ ...pointsForm, type: e.target.value })} className="input-ran">
                  <option value="point">Point (เงินเติม)</option>
                  <option value="vote">VotePoint</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">จำนวน</label>
                <input type="number" value={pointsForm.amount} onChange={(e) => setPointsForm({ ...pointsForm, amount: Number(e.target.value) })} className="input-ran" min="1" placeholder="กรอกจำนวนเงิน" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">เหตุผล (ไม่บังคับ)</label>
                <input type="text" value={pointsForm.reason} onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })} className="input-ran" placeholder="เช่น เติมเงินตามคำขอ" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowPointsModal(false)} className="btn-outline flex-1">ยกเลิก</button>
              <button onClick={handleAddPoints} disabled={pointsForm.amount <= 0} className="btn-ran flex-1 disabled:opacity-30">ยืนยันเพิ่มเงิน</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== User Detail Modal ===== */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card-ran w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">📋 ข้อมูลผู้ใช้: {selectedUser.UserID}</h3>
                <p className="text-gray-400 text-sm">รายละเอียดบัญชีผู้ใช้ทั้งหมด</p>
              </div>
              <button onClick={() => { setShowDetailModal(false); setDetailData(null); }} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>

            {detailLoading ? (
              <div className="p-12 text-center text-gray-400">⏳ กำลังโหลด...</div>
            ) : detailData ? (
              <div className="space-y-4">
                {/* Account Info */}
                <div className="bg-ran-dark rounded-lg p-4">
                  <h4 className="text-white font-bold text-sm mb-3">🔑 ข้อมูลบัญชี</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div><span className="text-gray-400 text-xs">UserID</span><p className="text-white font-mono">{detailData.UserID}</p></div>
                    <div><span className="text-gray-400 text-xs">UserName</span><p className="text-white">{detailData.UserName}</p></div>
                    <div><span className="text-gray-400 text-xs">Password</span><p className="text-white font-mono">{'•'.repeat(Math.min(detailData.UserPass?.length || 0, 12))}</p></div>
                  </div>
                </div>

                {/* Status */}
                <div className="bg-ran-dark rounded-lg p-4">
                  <h4 className="text-white font-bold text-sm mb-3">📊 สถานะ</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <span className="text-gray-400 text-xs">Account Status</span>
                      <p><span className={`px-2 py-1 rounded text-xs ${detailData.Status === 1 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {detailData.Status === 1 ? 'Active' : 'Banned'}
                      </span></p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs">Login State</span>
                      <p><span className={`px-2 py-1 rounded text-xs ${detailData.LoginState === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {detailData.LoginState === 1 ? 'Online' : 'Offline'}
                      </span></p>
                    </div>
                    <div><span className="text-gray-400 text-xs">Server</span><p className="text-white">{detailData.SvrNum || '-'}</p></div>
                    <div><span className="text-gray-400 text-xs">Server Group</span><p className="text-white">{detailData.SGNum || '-'}</p></div>
                  </div>
                </div>

                {/* Points */}
                <div className="bg-ran-dark rounded-lg p-4">
                  <h4 className="text-white font-bold text-sm mb-3">💰 แต้มและเงิน</h4>
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-ran-dark-50 rounded-lg">
                      <span className="text-gray-400 text-xs">Point (เงินเติม)</span>
                      <p className="text-2xl font-bold text-yellow-400">{(detailData.Point || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-ran-dark-50 rounded-lg">
                      <span className="text-gray-400 text-xs">VotePoint</span>
                      <p className="text-2xl font-bold text-purple-400">{(detailData.VotePoint || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Login History */}
                <div className="bg-ran-dark rounded-lg p-4">
                  <h4 className="text-white font-bold text-sm mb-3">🕐 ประวัติ</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div><span className="text-gray-400 text-xs">Last Login</span>
                    <p className="text-white">{detailData.LastLogin ? new Date(detailData.LastLogin).toLocaleString('th-TH') : 'ไม่เคยเข้าสู่ระบบ'}</p></div>
                  </div>
                </div>

                {/* Characters */}
                <div className="bg-ran-dark rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-white font-bold text-sm">🎮 ตัวละคร ({detailData.characters?.length || 0} ตัว)</h4>
                  </div>
                  {detailData.characters && detailData.characters.length > 0 ? (
                    <div className="space-y-2">
                      {detailData.characters.map((char: any) => (
                        <div key={char.ChaNum} className="flex justify-between items-center p-3 bg-ran-dark-50 rounded-lg hover:bg-ran-dark cursor-pointer transition-all"
                          onClick={() => { setShowDetailModal(false); handleGoToChar(char.ChaNum); }}>
                          <div>
                            <p className="text-white font-bold">{char.ChaName}</p>
                            <p className="text-gray-400 text-xs">Lv.{char.ChaLevel} | {classMap[char.ChaClass] || char.ChaClass} | {schoolMap[char.ChaSchool] || char.ChaSchool}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded text-xs ${char.ChaOnline === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              {char.ChaOnline === 1 ? 'Online' : 'Offline'}
                            </span>
                            <p className="text-ran-red text-xs mt-1">คลิกเพื่อแก้ไข →</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">ไม่มีตัวละคร</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">ไม่พบข้อมูล</div>
            )}

            <div className="mt-4 flex justify-end">
              <button onClick={() => { setShowDetailModal(false); setDetailData(null); }} className="btn-outline px-6">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
