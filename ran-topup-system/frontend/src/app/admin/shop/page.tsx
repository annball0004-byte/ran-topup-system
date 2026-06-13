'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ShopItem {
  ProductNum: number; ItemMain: number; ItemSub: number; ItemName: string;
  ItemStock: number; ItemPrice: number; ItemSection: number;
  ItemCurrency: number; ItemDiscount: number; ItemList: number;
  Duration: string; Category: string; ItemImage: string;
  ItemMoney: number; ItemComment: string; purchaseCount?: number;
}

interface ShopStats {
  totalItems: number; totalStock: number; avgPrice: number;
  bySection: { ItemSection: number; count: number }[];
  byCurrency: { ItemCurrency: number; count: number }[];
}

const CURRENCY_MAP: Record<number, string> = { 0: 'Premium Points', 1: 'Free', 2: 'Gift Only' };
const CURRENCY_TH: Record<number, string> = { 0: 'พรีเมียมพ้อย', 1: 'ฟรี', 2: 'ของขวัญ' };
const SECTION_MAP: Record<number, string> = { 0: 'Top-up', 1: 'Costume', 2: 'Pet', 3: 'Card/Package', 4: 'Event', 5: 'Etc' };

export default function ShopManagePage() {
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  // Form state
  const [form, setForm] = useState({
    ItemMain: '', ItemSub: '', ItemName: '', ItemStock: '0', ItemPrice: '0',
    ItemSection: '0', ItemCurrency: '0', ItemDiscount: '0', ItemList: '1',
    Duration: '', Category: '', ItemImage: '', ItemMoney: '0', ItemComment: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchItems();
    fetchStats();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const apiGet = async (url: string) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    return await res.json();
  };

  const apiPost = async (url: string, body: any, method = 'POST') => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (filterSection) params.set('section', filterSection);
      if (filterCurrency) params.set('currency', filterCurrency);
      const data = await apiGet(`${API_URL}/admin/shop/items?${params}`);
      if (data.success) {
        setItems(data.items);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const data = await apiGet(`${API_URL}/admin/shop/stats`);
      if (data.success) setStats(data.stats);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchItems(); }, [page, search, filterSection, filterCurrency]);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setPage(1); fetchItems(); }
  };

  const openCreate = () => {
    setForm({
      ItemMain: '', ItemSub: '', ItemName: '', ItemStock: '0', ItemPrice: '0',
      ItemSection: '0', ItemCurrency: '0', ItemDiscount: '0', ItemList: '1',
      Duration: '', Category: '', ItemImage: '', ItemMoney: '0', ItemComment: ''
    });
    setShowCreate(true);
  };

  const openEdit = (item: ShopItem) => {
    setForm({
      ItemMain: String(item.ItemMain), ItemSub: String(item.ItemSub), ItemName: item.ItemName,
      ItemStock: String(item.ItemStock), ItemPrice: String(item.ItemPrice),
      ItemSection: String(item.ItemSection), ItemCurrency: String(item.ItemCurrency),
      ItemDiscount: String(item.ItemDiscount), ItemList: String(item.ItemList || 1),
      Duration: item.Duration || '', Category: item.Category || '',
      ItemImage: item.ItemImage || '', ItemMoney: String(item.ItemMoney || 0),
      ItemComment: item.ItemComment || ''
    });
    setSelectedItem(item);
    setShowEdit(true);
  };

  const openDetail = async (item: ShopItem) => {
    try {
      const data = await apiGet(`${API_URL}/admin/shop/items/${item.ProductNum}`);
      if (data.success) {
        setSelectedItem(data.item);
        setShowDetail(true);
      }
    } catch (error) { console.error(error); }
  };

  const handleCreate = async () => {
    if (!form.ItemName) { showMessage('error', 'กรุณาระบุชื่อไอเทม'); return; }
    if (!form.ItemMain || !form.ItemSub) { showMessage('error', 'กรุณาระบุ ItemMain และ ItemSub'); return; }
    try {
      const body = {
        ItemMain: Number(form.ItemMain), ItemSub: Number(form.ItemSub),
        ItemName: form.ItemName, ItemStock: Number(form.ItemStock),
        ItemPrice: Number(form.ItemPrice), ItemSection: Number(form.ItemSection),
        ItemCurrency: Number(form.ItemCurrency), ItemDiscount: Number(form.ItemDiscount),
        ItemList: Number(form.ItemList), Duration: form.Duration,
        Category: form.Category, ItemImage: form.ItemImage,
        ItemMoney: Number(form.ItemMoney), ItemComment: form.ItemComment
      };
      const data = await apiPost(`${API_URL}/admin/shop/items`, body);
      if (data.success) {
        showMessage('success', data.message);
        setShowCreate(false);
        fetchItems();
        fetchStats();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      const body: any = {};
      if (form.ItemMain) body.ItemMain = Number(form.ItemMain);
      if (form.ItemSub) body.ItemSub = Number(form.ItemSub);
      if (form.ItemName) body.ItemName = form.ItemName;
      body.ItemStock = Number(form.ItemStock);
      body.ItemPrice = Number(form.ItemPrice);
      body.ItemSection = Number(form.ItemSection);
      body.ItemCurrency = Number(form.ItemCurrency);
      body.ItemDiscount = Number(form.ItemDiscount);
      body.ItemList = Number(form.ItemList);
      body.Duration = form.Duration;
      body.Category = form.Category;
      body.ItemImage = form.ItemImage;
      body.ItemMoney = Number(form.ItemMoney);
      body.ItemComment = form.ItemComment;

      const data = await apiPost(`${API_URL}/admin/shop/items/${selectedItem.ProductNum}`, body, 'PUT');
      if (data.success) {
        showMessage('success', data.message);
        setShowEdit(false);
        fetchItems();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
  };

  const handleDelete = async (item: ShopItem) => {
    if (!confirm(`ต้องการลบไอเทม "${item.ItemName}" จริงหรือไม่?`)) return;
    try {
      const data = await apiPost(`${API_URL}/admin/shop/items/${item.ProductNum}`, {}, 'DELETE');
      if (data.success) {
        showMessage('success', data.message);
        fetchItems();
        fetchStats();
      } else {
        showMessage('error', data.error);
      }
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
  };

  const FormFields = () => (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">ItemMain *</label>
        <input type="number" value={form.ItemMain} onChange={e => setForm({...form, ItemMain: e.target.value})}
          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">ItemSub *</label>
        <input type="number" value={form.ItemSub} onChange={e => setForm({...form, ItemSub: e.target.value})}
          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-gray-400 text-sm mb-1 font-thai">ชื่อไอเทม *</label>
        <input type="text" value={form.ItemName} onChange={e => setForm({...form, ItemName: e.target.value})}
          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white font-thai" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">ราคา (Premium Point)</label>
        <input type="number" value={form.ItemPrice} onChange={e => setForm({...form, ItemPrice: e.target.value})}
          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">สต็อก</label>
        <input type="number" value={form.ItemStock} onChange={e => setForm({...form, ItemStock: e.target.value})}
          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">สกุลเงิน</label>
        <select value={form.ItemCurrency} onChange={e => setForm({...form, ItemCurrency: e.target.value})}
          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white">
          <option value="0">Premium Points</option>
          <option value="1">Free</option>
          <option value="2">Gift Only</option>
        </select>
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">Section/หมวด</label>
        <select value={form.ItemSection} onChange={e => setForm({...form, ItemSection: e.target.value})}
          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white">
          {Object.entries(SECTION_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">Discount (%)</label>
        <input type="number" value={form.ItemDiscount} onChange={e => setForm({...form, ItemDiscount: e.target.value})}
          min="0" max="100" className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">เงินในเกม (Zen)</label>
        <input type="number" value={form.ItemMoney} onChange={e => setForm({...form, ItemMoney: e.target.value})}
          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">Duration</label>
        <input type="text" value={form.Duration} onChange={e => setForm({...form, Duration: e.target.value})}
          placeholder="e.g. 7 days, permanent" className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white font-thai" />
      </div>
      <div>
        <label className="block text-gray-400 text-sm mb-1 font-thai">Category</label>
        <input type="text" value={form.Category} onChange={e => setForm({...form, Category: e.target.value})}
          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white font-thai" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-gray-400 text-sm mb-1 font-thai">รูปไอเทม (URL)</label>
        <input type="text" value={form.ItemImage} onChange={e => setForm({...form, ItemImage: e.target.value})}
          placeholder="https://..." className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white font-mono text-sm" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-gray-400 text-sm mb-1 font-thai">หมายเหตุ</label>
        <textarea value={form.ItemComment} onChange={e => setForm({...form, ItemComment: e.target.value})}
          rows={2} className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-3 py-2 text-white font-thai resize-none" />
      </div>
    </div>
  );

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
                { icon: '🔔', label: 'แจ้งเตือน', href: '/admin/alerts' },
                { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect' },
                { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop', active: true },
                { icon: '🤖', label: 'จัดการ Agent', href: '/admin/agents' },
                { icon: '📦', label: 'ประวัติคำสั่งซื้อ', href: '/admin/order-history' },
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

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">🛍️ จัดการร้านค้าไอเทม</h1>
                <p className="text-gray-400 font-thai">เพิ่ม ลบ แก้ไขไอเทมในร้านค้า (ShopItemMap)</p>
              </div>
              <button onClick={openCreate} className="btn-primary px-6 py-2">➕ เพิ่มไอเทมใหม่</button>
            </div>
          </header>

          <div className="p-6">
            {message && (
              <div className={`mb-4 p-4 rounded-lg font-thai ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {message.type === 'success' ? '✅' : '❌'} {message.text}
              </div>
            )}

            {/* Stats */}
            {stats && (
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="card-ran text-center">
                  <div className="text-3xl font-bold text-white">{stats.totalItems}</div>
                  <div className="text-gray-400 text-sm font-thai">ไอเทมทั้งหมด</div>
                </div>
                <div className="card-ran text-center">
                  <div className="text-3xl font-bold text-green-400">{stats.totalStock.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm font-thai">สต็อกรวม</div>
                </div>
                <div className="card-ran text-center">
                  <div className="text-3xl font-bold text-yellow-400">{stats.avgPrice.toLocaleString()}</div>
                  <div className="text-gray-400 text-sm font-thai">ราคาเฉลี่ย</div>
                </div>
                <div className="card-ran text-center">
                  <div className="text-3xl font-bold text-purple-400">{stats.byCurrency.length}</div>
                  <div className="text-gray-400 text-sm font-thai">ประเภทสกุลเงิน</div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="card-ran mb-6">
              <div className="flex flex-wrap gap-4">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearch}
                  placeholder="ค้นหาชื่อ MID, SID, ชื่อไอเทม..." className="flex-1 min-w-[200px] bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white font-thai" />
                <select value={filterSection} onChange={e => { setFilterSection(e.target.value); setPage(1); }}
                  className="bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white">
                  <option value="">ทุก Section</option>
                  {Object.entries(SECTION_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select value={filterCurrency} onChange={e => { setFilterCurrency(e.target.value); setPage(1); }}
                  className="bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white">
                  <option value="">ทุกสกุลเงิน</option>
                  {Object.entries(CURRENCY_TH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <span className="text-gray-400 font-thai self-center">พบ {total} รายการ</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="card-ran">
              {loading ? (
                <div className="text-center py-12 text-gray-400">⏳ กำลังโหลด...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-thai">ไม่พบไอเทม</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-ran-red/20">
                          <th className="p-3 text-left text-gray-400 font-thai">ID</th>
                          <th className="p-3 text-left text-gray-400 font-thai">ชื่อไอเทม</th>
                          <th className="p-3 text-left text-gray-400 font-thai">MID/SID</th>
                          <th className="p-3 text-left text-gray-400 font-thai">ราคา</th>
                          <th className="p-3 text-left text-gray-400 font-thai">สต็อก</th>
                          <th className="p-3 text-left text-gray-400 font-thai">Section</th>
                          <th className="p-3 text-left text-gray-400 font-thai">สกุลเงิน</th>
                          <th className="p-3 text-left text-gray-400 font-thai">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.ProductNum} className="border-b border-ran-red/10 hover:bg-ran-dark-50">
                            <td className="p-3 text-white font-mono">{item.ProductNum}</td>
                            <td className="p-3">
                              <div className="text-white font-thai">{item.ItemName}</div>
                              {item.ItemComment && <div className="text-gray-500 text-xs">{item.ItemComment}</div>}
                            </td>
                            <td className="p-3 text-gray-300 font-mono text-xs">{item.ItemMain}/{item.ItemSub}</td>
                            <td className="p-3">
                              <span className="text-yellow-400 font-bold">{item.ItemPrice}</span>
                              {item.ItemDiscount > 0 && <span className="text-red-400 text-xs ml-1">(-{item.ItemDiscount}%)</span>}
                            </td>
                            <td className="p-3">
                              <span className={`font-bold ${item.ItemStock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {item.ItemStock.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 bg-ran-dark rounded text-xs text-gray-300">
                                {SECTION_MAP[item.ItemSection] || `S${item.ItemSection}`}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                item.ItemCurrency === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                item.ItemCurrency === 1 ? 'bg-green-500/20 text-green-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {CURRENCY_TH[item.ItemCurrency] || 'Unknown'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <button onClick={() => openDetail(item)} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30">ดู</button>
                                <button onClick={() => openEdit(item)} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30">แก้ไข</button>
                                <button onClick={() => handleDelete(item)} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30">ลบ</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 p-4">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="px-3 py-1 bg-ran-dark rounded text-white disabled:opacity-30">ก่อนหน้า</button>
                      <span className="text-gray-400">หน้า {page} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="px-3 py-1 bg-ran-dark rounded text-white disabled:opacity-30">ถัดไป</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ CREATE MODAL ============ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-ran-dark-100 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-ran-red/20 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">➕ เพิ่มไอเทมใหม่</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            <div className="p-6">
              <FormFields />
              <div className="flex gap-4 mt-6">
                <button onClick={handleCreate} className="btn-primary flex-1 py-3">✅ สร้างไอเทม</button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 py-3">ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ EDIT MODAL ============ */}
      {showEdit && selectedItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-ran-dark-100 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-ran-red/20 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">✏️ แก้ไขไอเทม #{selectedItem.ProductNum}</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            <div className="p-6">
              <FormFields />
              <div className="flex gap-4 mt-6">
                <button onClick={handleUpdate} className="btn-primary flex-1 py-3">✅ บันทึก</button>
                <button onClick={() => setShowEdit(false)} className="btn-secondary flex-1 py-3">ยกเลิก</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {showDetail && selectedItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-ran-dark-100 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-ran-red/20 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">📦 รายละเอียดไอเทม</h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {[
                  ['ProductNum', selectedItem.ProductNum],
                  ['ชื่อไอเทม', selectedItem.ItemName],
                  ['ItemMain', selectedItem.ItemMain],
                  ['ItemSub', selectedItem.ItemSub],
                  ['ราคา', `${selectedItem.ItemPrice} PP`],
                  ['สต็อก', selectedItem.ItemStock.toLocaleString()],
                  ['Section', SECTION_MAP[selectedItem.ItemSection] || selectedItem.ItemSection],
                  ['สกุลเงิน', CURRENCY_TH[selectedItem.ItemCurrency] || selectedItem.ItemCurrency],
                  ['Discount', `${selectedItem.ItemDiscount}%`],
                  ['ItemList', selectedItem.ItemList],
                  ['Duration', selectedItem.Duration || '-'],
                  ['Category', selectedItem.Category || '-'],
                  ['ItemImage', selectedItem.ItemImage || '-'],
                  ['ItemMoney', selectedItem.ItemMoney || 0],
                  ['Comment', selectedItem.ItemComment || '-'],
                  ['จำนวนที่ซื้อ', selectedItem.purchaseCount ?? '-'],
                ].map(([label, value], i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-ran-red/10">
                    <span className="text-gray-400 font-thai">{String(label)}</span>
                    <span className="text-white font-thai text-right max-w-[60%] break-all">{String(value)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => { setShowDetail(false); openEdit(selectedItem); }}
                  className="btn-primary flex-1 py-2">✏️ แก้ไข</button>
                <button onClick={() => setShowDetail(false)} className="btn-secondary flex-1 py-2">ปิด</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
