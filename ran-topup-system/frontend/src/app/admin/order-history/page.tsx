'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Order {
  orderId: string; customerName: string; itemName: string;
  quantity: number; amount: number; paymentMethod: string;
  paymentStatus: string; agentName?: string; note?: string;
  createdAt: string; updatedAt: string;
}

interface OrderStats {
  total: number; pending: number; paid: number; failed: number; totalRevenue: number;
}

const PAYMENT_METHODS: Record<string, string> = {
  promptpay: 'PromptPay', truemoney: 'TrueMoney', bank: 'โอนผ่านธนาคาร',
  credit: 'บัตรเครดิต', agent: 'Agent/Reseller'
};
const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ รอชำระ', paid: '✅ ชำระแล้ว', failed: '❌ ล้มเหลว'
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  paid: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400'
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchOrders();
  }, [page, filterStatus, filterPayment]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({
        page: page.toString(), limit: '20',
        ...(search && { search }),
        ...(filterStatus && { status: filterStatus }),
        ...(filterPayment && { paymentMethod: filterPayment }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      });
      const res = await fetch(`${API_URL}/admin/order-history?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setStats(data.stats);
        setTotalPages(data.totalPages);
      }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleSearch = () => { setPage(1); fetchOrders(); };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_URL}/admin/order-history/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: status })
      });
      fetchOrders();
    } catch (error) { console.error(error); }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('ยืนยันลบคำสั่งซื้อนี้?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      await fetch(`${API_URL}/admin/order-history/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchOrders();
    } catch (error) { console.error(error); }
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
                { icon: '🔔', label: 'แจ้งเตือน', href: '/admin/alerts' },
                { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect' },
                { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop' },
                { icon: '🤖', label: 'จัดการ Agent', href: '/admin/agents' },
                { icon: '📦', label: 'ประวัติคำสั่งซื้อ', href: '/admin/order-history', active: true },
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
                <h1 className="font-display text-2xl font-bold text-white">📦 ประวัติคำสั่งซื้อ</h1>
                <p className="text-gray-400 font-thai">รายการสั่งซื้อทั้งหมด, กรอง, อัพเดตสถานะ</p>
              </div>
              <button onClick={() => fetchOrders()} className="btn-secondary px-4 py-2 text-sm">🔄 Refresh</button>
            </div>
          </header>

          <div className="p-6">
            {stats && (
              <div className="grid md:grid-cols-5 gap-4 mb-6">
                <div className="card-ran text-center border-blue-500/30">
                  <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
                  <div className="text-gray-400 text-sm font-thai">คำสั่งซื้อทั้งหมด</div>
                </div>
                <div className="card-ran text-center border-yellow-500/30">
                  <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
                  <div className="text-gray-400 text-sm font-thai">⏳ รอชำระ</div>
                </div>
                <div className="card-ran text-center border-green-500/30">
                  <div className="text-3xl font-bold text-green-400">{stats.paid}</div>
                  <div className="text-gray-400 text-sm font-thai">✅ ชำระแล้ว</div>
                </div>
                <div className="card-ran text-center border-red-500/30">
                  <div className="text-3xl font-bold text-red-400">{stats.failed}</div>
                  <div className="text-gray-400 text-sm font-thai">❌ ล้มเหลว</div>
                </div>
                <div className="card-ran text-center border-purple-500/30">
                  <div className="text-3xl font-bold text-purple-400">฿{stats.totalRevenue.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm font-thai">รายได้รวม</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <input type="text" placeholder="ค้นหา Order ID, ชื่อ, ไอเทม..." value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white text-sm flex-1 min-w-[200px]" />
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                className="bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white text-sm">
                <option value="">ทุกสถานะ</option>
                <option value="pending">⏳ รอชำระ</option>
                <option value="paid">✅ ชำระแล้ว</option>
                <option value="failed">❌ ล้มเหลว</option>
              </select>
              <select value={filterPayment} onChange={e => { setFilterPayment(e.target.value); setPage(1); }}
                className="bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white text-sm">
                <option value="">ทุกวิธีชำระ</option>
                {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white text-sm" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white text-sm" />
              <button onClick={handleSearch} className="btn-primary px-4 py-2 text-sm">🔍 ค้นหา</button>
            </div>

            {/* Table */}
            <div className="card-ran overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ran-red/20">
                    <th className="text-left px-4 py-3 text-gray-400 font-thai text-sm">Order ID</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-thai text-sm">ลูกค้า</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-thai text-sm">ไอเทม</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-thai text-sm">จำนวน</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-thai text-sm">จำนวนเงิน</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-thai text-sm">วิธีชำระ</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-thai text-sm">สถานะ</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-thai text-sm">วันที่</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-thai text-sm">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400">⏳ กำลังโหลด...</td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-gray-400 font-thai">ไม่พบคำสั่งซื้อ</td></tr>
                  ) : (
                    orders.map(order => (
                      <tr key={order.orderId} className="border-b border-ran-dark hover:bg-ran-dark/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-300">{order.orderId}</td>
                        <td className="px-4 py-3 text-white font-thai">{order.customerName}</td>
                        <td className="px-4 py-3 text-gray-300 font-thai">{order.itemName}</td>
                        <td className="px-4 py-3 text-center text-gray-400">{order.quantity}</td>
                        <td className="px-4 py-3 text-right font-bold text-yellow-400">฿{order.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2 py-1 bg-ran-dark rounded text-xs text-gray-400">
                            {PAYMENT_METHODS[order.paymentMethod] || order.paymentMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_COLORS[order.paymentStatus] || ''}`}>
                            {STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => { setSelectedOrder(order); setShowDetailModal(true); }}
                              className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">👁️</button>
                            {order.paymentStatus === 'pending' && (
                              <>
                                <button onClick={() => updateStatus(order.orderId, 'paid')}
                                  className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">✅</button>
                                <button onClick={() => updateStatus(order.orderId, 'failed')}
                                  className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">❌</button>
                              </>
                            )}
                            <button onClick={() => deleteOrder(order.orderId)}
                              className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="btn-secondary px-3 py-1 text-sm disabled:opacity-30">← ก่อนหน้า</button>
                <span className="px-4 py-1 text-gray-400 text-sm font-thai">หน้า {page} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="btn-secondary px-3 py-1 text-sm disabled:opacity-30">ถัดไป →</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-ran-dark-100 border border-ran-red/20 rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-display font-bold text-white mb-4">📦 รายละเอียดคำสั่งซื้อ</h2>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-ran-dark rounded-lg">
                <span className="text-gray-400 font-thai">Order ID</span>
                <span className="text-white font-mono">{selectedOrder.orderId}</span>
              </div>
              <div className="flex justify-between p-3 bg-ran-dark rounded-lg">
                <span className="text-gray-400 font-thai">ลูกค้า</span>
                <span className="text-white">{selectedOrder.customerName}</span>
              </div>
              <div className="flex justify-between p-3 bg-ran-dark rounded-lg">
                <span className="text-gray-400 font-thai">ไอเทม</span>
                <span className="text-white">{selectedOrder.itemName}</span>
              </div>
              <div className="flex justify-between p-3 bg-ran-dark rounded-lg">
                <span className="text-gray-400 font-thai">จำนวน</span>
                <span className="text-white">{selectedOrder.quantity}</span>
              </div>
              <div className="flex justify-between p-3 bg-ran-dark rounded-lg">
                <span className="text-gray-400 font-thai">จำนวนเงิน</span>
                <span className="text-yellow-400 font-bold">฿{selectedOrder.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-ran-dark rounded-lg">
                <span className="text-gray-400 font-thai">วิธีชำระเงิน</span>
                <span className="text-white">{PAYMENT_METHODS[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between p-3 bg-ran-dark rounded-lg">
                <span className="text-gray-400 font-thai">สถานะ</span>
                <span className={`font-bold ${STATUS_COLORS[selectedOrder.paymentStatus] || ''}`}>
                  {STATUS_LABELS[selectedOrder.paymentStatus] || selectedOrder.paymentStatus}
                </span>
              </div>
              {selectedOrder.agentName && (
                <div className="flex justify-between p-3 bg-ran-dark rounded-lg">
                  <span className="text-gray-400 font-thai">Agent</span>
                  <span className="text-purple-400">{selectedOrder.agentName}</span>
                </div>
              )}
              {selectedOrder.note && (
                <div className="p-3 bg-ran-dark rounded-lg">
                  <span className="text-gray-400 font-thai text-sm">หมายเหตุ: {selectedOrder.note}</span>
                </div>
              )}
              <div className="flex justify-between p-3 bg-ran-dark rounded-lg">
                <span className="text-gray-400 font-thai">สร้างเมื่อ</span>
                <span className="text-gray-300 text-sm">{new Date(selectedOrder.createdAt).toLocaleString('th-TH')}</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {selectedOrder.paymentStatus === 'pending' && (
                <>
                  <button onClick={() => { updateStatus(selectedOrder.orderId, 'paid'); setShowDetailModal(false); }}
                    className="flex-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg py-2 font-bold hover:bg-green-500/30">✅ ยืนยันชำระ</button>
                  <button onClick={() => { updateStatus(selectedOrder.orderId, 'failed'); setShowDetailModal(false); }}
                    className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg py-2 font-bold hover:bg-red-500/30">❌ ล้มเหลว</button>
                </>
              )}
              <button onClick={() => setShowDetailModal(false)} className="btn-secondary flex-1 py-2">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
