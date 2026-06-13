'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Agent {
  id: string; username: string; name: string; email: string; phone: string;
  commissionRate: number; creditLimit: number; balance: number; status: string;
  createdAt: string; createdBy: string; creditHistory?: any[];
}

interface AgentStats {
  total: number; active: number; totalBalance: number; totalRevenue: number;
}

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<any[]>([]);

  const [form, setForm] = useState({
    username: '', password: '', name: '', email: '', phone: '',
    commissionRate: 10, creditLimit: 0
  });

  const [editForm, setEditForm] = useState({
    name: '', email: '', phone: '', commissionRate: 10, creditLimit: 0, status: 'active'
  });

  const [creditForm, setCreditForm] = useState({ amount: '', note: '' });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAgents(data.agents);
        setStats(data.stats);
      }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleCreate = async () => {
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/agents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        setForm({ username: '', password: '', name: '', email: '', phone: '', commissionRate: 10, creditLimit: 0 });
        fetchAgents();
      } else {
        setError(data.error);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleEdit = async () => {
    setError('');
    if (!selectedAgent) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/agents/${selectedAgent.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        setSelectedAgent(null);
        fetchAgents();
      } else {
        setError(data.error);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันลบ Agent นี้?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/agents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) fetchAgents();
    } catch (error) { console.error(error); }
  };

  const handleCredit = async () => {
    setError('');
    if (!selectedAgent) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/agents/${selectedAgent.id}/credit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(creditForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowCreditModal(false);
        setSelectedAgent(null);
        setCreditForm({ amount: '', note: '' });
        fetchAgents();
      } else {
        setError(data.error);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const fetchLogs = async (id: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/agents/${id}/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs);
        setShowLogsModal(true);
      }
    } catch (error) { console.error(error); }
  };

  const filteredAgents = agents.filter(a => {
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) &&
        !a.username.toLowerCase().includes(search.toLowerCase()) &&
        !a.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

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
                { icon: '🔔', label: 'แจ้งเตือน', href: '/admin/alerts' },
                { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect' },
                { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop' },
                { icon: '🤖', label: 'จัดการ Agent', href: '/admin/agents', active: true },
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
                <h1 className="font-display text-2xl font-bold text-white">🤖 จัดการ Agent / Reseller</h1>
                <p className="text-gray-400 font-thai">สร้าง แก้ไข ลบ Agent จัดการเครดิตและค่าคอมมิชชั่น</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => fetchAgents()} className="btn-secondary px-4 py-2 text-sm">🔄</button>
                <button onClick={() => { setShowCreateModal(true); setError(''); }} className="btn-primary px-4 py-2 text-sm">+ สร้าง Agent ใหม่</button>
              </div>
            </div>
          </header>

          <div className="p-6">
            {stats && (
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="card-ran text-center border-blue-500/30">
                  <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
                  <div className="text-gray-400 text-sm font-thai">Agent ทั้งหมด</div>
                </div>
                <div className="card-ran text-center border-green-500/30">
                  <div className="text-3xl font-bold text-green-400">{stats.active}</div>
                  <div className="text-gray-400 text-sm font-thai">Active</div>
                </div>
                <div className="card-ran text-center border-yellow-500/30">
                  <div className="text-3xl font-bold text-yellow-400">฿{stats.totalBalance.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm font-thai">เครดิตรวม</div>
                </div>
                <div className="card-ran text-center border-purple-500/30">
                  <div className="text-3xl font-bold text-purple-400">฿{stats.totalRevenue.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm font-thai">รายได้รวม</div>
                </div>
              </div>
            )}

            <div className="flex gap-4 mb-6">
              <input type="text" placeholder="ค้นหา Agent..." value={search} onChange={e => setSearch(e.target.value)}
                className="bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white text-sm flex-1" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white text-sm">
                <option value="all">ทุกสถานะ</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="card-ran overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ran-red/20">
                    <th className="text-left px-4 py-3 text-gray-400 font-thai text-sm">Agent</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-thai text-sm">ชื่อ / Email</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-thai text-sm">โทรศัพท์</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-thai text-sm">ค่าคอม (%)</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-thai text-sm">เครดิตคงเหลือ</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-thai text-sm">สถานะ</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-thai text-sm">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">⏳ กำลังโหลด...</td></tr>
                  ) : filteredAgents.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400 font-thai">ไม่พบ Agent</td></tr>
                  ) : (
                    filteredAgents.map(agent => (
                      <tr key={agent.id} className="border-b border-ran-dark hover:bg-ran-dark/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-white">{agent.username}</div>
                          <div className="text-xs text-gray-500">{agent.id}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-300">{agent.name}</div>
                          <div className="text-xs text-gray-500">{agent.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{agent.phone || '-'}</td>
                        <td className="px-4 py-3 text-center text-blue-400 font-bold">{agent.commissionRate}%</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${agent.balance > 0 ? 'text-green-400' : agent.balance < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            ฿{(agent.balance || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            agent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                            agent.status === 'suspended' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {agent.status === 'active' ? '✅ Active' : agent.status === 'suspended' ? '🚫 Suspended' : agent.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => {
                              setSelectedAgent(agent);
                              setEditForm({
                                name: agent.name, email: agent.email, phone: agent.phone,
                                commissionRate: agent.commissionRate, creditLimit: agent.creditLimit,
                                status: agent.status
                              });
                              setShowEditModal(true); setError('');
                            }} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30">✏️</button>
                            <button onClick={() => {
                              setSelectedAgent(agent);
                              setCreditForm({ amount: '', note: '' });
                              setShowCreditModal(true); setError('');
                            }} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30">💰</button>
                            <button onClick={() => fetchLogs(agent.id)} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30">📋</button>
                            <button onClick={() => handleDelete(agent.id)} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ran-dark-100 border border-ran-red/20 rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-display font-bold text-white mb-4">➕ สร้าง Agent ใหม่</h2>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">Username *</label>
                <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">ชื่อ *</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">โทรศัพท์</label>
                <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">ค่าคอมมิชชั่น (%)</label>
                <input type="number" min="0" max="50" value={form.commissionRate} onChange={e => setForm({...form, commissionRate: Number(e.target.value)})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div className="col-span-2">
                <label className="block text-gray-400 text-sm mb-1 font-thai">เครดิตวงเงินสูงสุด (฿)</label>
                <input type="number" min="0" value={form.creditLimit} onChange={e => setForm({...form, creditLimit: Number(e.target.value)})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreate} className="btn-primary flex-1 py-2">💾 สร้าง Agent</button>
              <button onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1 py-2">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ran-dark-100 border border-ran-red/20 rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-display font-bold text-white mb-4">✏️ แก้ไข Agent: {selectedAgent.username}</h2>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">{error}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">ชื่อ</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">โทรศัพท์</label>
                <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">ค่าคอม (%)</label>
                <input type="number" min="0" max="50" value={editForm.commissionRate} onChange={e => setEditForm({...editForm, commissionRate: Number(e.target.value)})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">เครดิตวงเงินสูงสุด (฿)</label>
                <input type="number" min="0" value={editForm.creditLimit} onChange={e => setEditForm({...editForm, creditLimit: Number(e.target.value)})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">สถานะ</label>
                <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white">
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleEdit} className="btn-primary flex-1 py-2">💾 บันทึก</button>
              <button onClick={() => setShowEditModal(false)} className="btn-secondary flex-1 py-2">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Modal */}
      {showCreditModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ran-dark-100 border border-ran-red/20 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-display font-bold text-white mb-2">💰 จัดการเครดิต</h2>
            <p className="text-gray-400 text-sm font-thai mb-4">
              Agent: <span className="text-white font-bold">{selectedAgent.username}</span> | ปัจจุบัน: <span className="text-yellow-400 font-bold">฿{(selectedAgent.balance || 0).toLocaleString()}</span>
            </p>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">จำนวนเงิน (฿) (+ เพิ่ม / - หัก)</label>
                <input type="number" value={creditForm.amount} onChange={e => setCreditForm({...creditForm, amount: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" placeholder="例: 5000 หรือ -1000" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1 font-thai">หมายเหตุ</label>
                <input type="text" value={creditForm.note} onChange={e => setCreditForm({...creditForm, note: e.target.value})}
                  className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" placeholder="例: เพิ่มเครดิต" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCredit} className="btn-primary flex-1 py-2">💾 บันทึกเครดิต</button>
              <button onClick={() => setShowCreditModal(false)} className="btn-secondary flex-1 py-2">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ran-dark-100 border border-ran-red/20 rounded-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-display font-bold text-white mb-4">📋 ประวัติเครดิต</h2>
            {logs.length === 0 ? (
              <p className="text-gray-400 text-center py-4 font-thai">ไม่มีประวัติ</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className={`flex justify-between items-center p-3 rounded-lg border ${
                    log.amount > 0 ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
                  }`}>
                    <div>
                      <div className={`font-bold ${log.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {log.amount > 0 ? '+' : ''}฿{Math.abs(log.amount).toLocaleString()}
                      </div>
                      <div className="text-gray-400 text-xs font-thai">{log.note}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-xs">{new Date(log.date).toLocaleString('th-TH')}</div>
                      <div className="text-gray-600 text-xs">by {log.by}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowLogsModal(false)} className="btn-secondary w-full py-2 mt-4">ปิด</button>
          </div>
        </div>
      )}
    </main>
  );
}
