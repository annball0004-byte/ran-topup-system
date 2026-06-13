'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface OnlinePlayer {
  ChaNum: number; ChaName: string; ChaLevel: number; ChaClass: number;
  ChaSchool: number; UserNum: number; UserID: string; UserName: string;
  UserPoint: number; VotePoint: number;
}

interface ShopItem {
  ProductNum: number; ItemMain: number; ItemSub: number; ItemName: string;
  ItemStock: number; ItemPrice: number; ItemSection: number;
  ItemCurrency: number; ItemDiscount: number; ItemMoney: number;
}

interface SearchResult {
  UserNum: number; UserID: string; UserName: string; UserPoint: number;
  VotePoint: number; UserLoginState: number; UserAvailable: number;
  characters: { ChaNum: number; ChaName: string; ChaLevel: number; ChaClass: number; ChaOnline: number }[];
}

interface GMLog {
  RecordID: number; GMUserID: number; GMUserType: number;
  GMCharID: number; GMCharName: string; GMCommand: string; Date: string;
}

const CLASS_MAP: Record<number, string> = {
  1: 'Brawler', 2: 'Knight', 4: 'Archer', 8: 'Shaman',
  16: 'Extreme Fighter', 32: 'Extreme Knight', 64: 'Gunner', 128: 'Assassin'
};
const SCHOOL_MAP: Record<number, string> = { 1: 'Luxion', 2: 'Reqros', 3: 'Sidein' };

export default function GMCPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('points');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Points state
  const [pointAction, setPointAction] = useState<'add' | 'deduct'>('add');
  const [pointAmount, setPointAmount] = useState('');
  const [pointType, setPointType] = useState('UserPoint');
  const [pointTarget, setPointTarget] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Money state
  const [moneyAction, setMoneyAction] = useState<'add' | 'deduct'>('add');
  const [moneyAmount, setMoneyAmount] = useState('');

  // Skill points state
  const [spAction, setSpAction] = useState<'add' | 'deduct'>('add');
  const [spAmount, setSpAmount] = useState('');

  // Item state
  const [items, setItems] = useState<ShopItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [itemAmount, setItemAmount] = useState('1');
  const [itemTargetUsers, setItemTargetUsers] = useState<string[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<SearchResult[]>([]);

  // Announce state
  const [announceMsg, setAnnounceMsg] = useState('');
  const [announceType, setAnnounceType] = useState('1');

  // Chat block state
  const [blockUserId, setBlockUserId] = useState('');
  const [blockMinutes, setBlockMinutes] = useState('60');
  const [blockReason, setBlockReason] = useState('');

  // Kick state
  const [kickChaNum, setKickChaNum] = useState('');

  // Reset state
  const [resetChaNum, setResetChaNum] = useState('');
  const [resetType, setResetType] = useState('stats');

  // Online players
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);

  // Logs
  const [logs, setLogs] = useState<GMLog[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchOnlinePlayers();
  }, []);

  const fetchOnlinePlayers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/gmc/online`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setOnlinePlayers(data.players);
    } catch (error) { console.error(error); }
  };

  const fetchItems = async (search: string = '') => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/gmc/items?search=${encodeURIComponent(search)}&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setItems(data.items);
    } catch (error) { console.error(error); }
  };

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/gmc/logs?limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setLogs(data.logs);
    } catch (error) { console.error(error); }
  };

  const searchPlayers = async (q: string) => {
    if (!q) { setSearchResults([]); return; }
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/gmc/search-player?q=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setSearchResults(data.players);
    } catch (error) { console.error(error); }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const apiPost = async (endpoint: string, body: any) => {
    const token = localStorage.getItem('adminToken');
    const res = await fetch(`${API_URL}/admin/gmc/${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await res.json();
  };

  // ============ ACTIONS ============

  const handlePoints = async () => {
    if (!pointAmount || Number(pointAmount) <= 0) { showMessage('error', 'กรุณาระบุจำนวนเงิน'); return; }
    if (pointTarget === 'specific' && selectedUserIds.length === 0) {
      showMessage('error', 'กรุณาเลือกผู้ใช้อย่างน้อย 1 คน'); return;
    }
    setLoading(true);
    try {
      const result = await apiPost('points', {
        action: pointAction, amount: Number(pointAmount), pointType,
        target: pointTarget, userIds: selectedUserIds
      });
      if (result.success) showMessage('success', result.message);
      else showMessage('error', result.error);
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
    setLoading(false);
  };

  const handleMoney = async () => {
    if (!moneyAmount || Number(moneyAmount) <= 0) { showMessage('error', 'กรุณาระบุจำนวนเงิน'); return; }
    setLoading(true);
    try {
      const result = await apiPost('money', {
        action: moneyAction, amount: Number(moneyAmount),
        target: pointTarget, userIds: selectedUserIds
      });
      if (result.success) showMessage('success', result.message);
      else showMessage('error', result.error);
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
    setLoading(false);
  };

  const handleSkillPoints = async () => {
    if (!spAmount || Number(spAmount) <= 0) { showMessage('error', 'กรุณาระบุจำนวน'); return; }
    setLoading(true);
    try {
      const result = await apiPost('skill-points', {
        action: spAction, amount: Number(spAmount),
        target: pointTarget, userIds: selectedUserIds
      });
      if (result.success) showMessage('success', result.message);
      else showMessage('error', result.error);
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
    setLoading(false);
  };

  const handleSendItem = async () => {
    if (!selectedItem) { showMessage('error', 'กรุณาเลือกไอเทม'); return; }
    if (itemTargetUsers.length === 0) { showMessage('error', 'กรุณาเลือกผู้รับ'); return; }
    setLoading(true);
    try {
      const result = await apiPost('send-item', {
        productNum: selectedItem.ProductNum, userIds: itemTargetUsers, amount: Number(itemAmount)
      });
      if (result.success) showMessage('success', result.message);
      else showMessage('error', result.error);
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
    setLoading(false);
  };

  const handleAnnounce = async () => {
    if (!announceMsg) { showMessage('error', 'กรุณาระบุข้อความ'); return; }
    setLoading(true);
    try {
      const result = await apiPost('announce', { message: announceMsg, type: Number(announceType) });
      if (result.success) showMessage('success', result.message);
      else showMessage('error', result.error);
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
    setLoading(false);
  };

  const handleRestrict = async (userId: string, restricted: boolean) => {
    setLoading(true);
    try {
      const result = await apiPost('restrict', { userId, restricted });
      if (result.success) showMessage('success', result.message);
      else showMessage('error', result.error);
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
    setLoading(false);
  };

  const handleChatBlock = async () => {
    if (!blockUserId) { showMessage('error', 'กรุณาระบุ UserID'); return; }
    setLoading(true);
    try {
      const result = await apiPost('chat-block', {
        userId: blockUserId, minutes: Number(blockMinutes), reason: blockReason
      });
      if (result.success) showMessage('success', result.message);
      else showMessage('error', result.error);
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
    setLoading(false);
  };

  const handleKick = async () => {
    if (!kickChaNum) { showMessage('error', 'กรุณาระบุ ChaNum'); return; }
    setLoading(true);
    try {
      const result = await apiPost('kick', { chaNum: Number(kickChaNum) });
      if (result.success) showMessage('success', result.message);
      else showMessage('error', result.error);
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!resetChaNum) { showMessage('error', 'กรุณาระบุ ChaNum'); return; }
    setLoading(true);
    try {
      const result = await apiPost('reset-character', { chaNum: Number(resetChaNum), resetType });
      if (result.success) showMessage('success', result.message);
      else showMessage('error', result.error);
    } catch (error) { showMessage('error', 'เกิดข้อผิดพลาด'); }
    setLoading(false);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const addPlayerToSelection = (player: SearchResult) => {
    if (!selectedPlayers.find(p => p.UserID === player.UserID)) {
      setSelectedPlayers(prev => [...prev, player]);
      setSelectedUserIds(prev => [...prev, player.UserID]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removePlayerFromSelection = (userId: string) => {
    setSelectedPlayers(prev => prev.filter(p => p.UserID !== userId));
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
  };

  const tabs = [
    { id: 'points', icon: '💰', label: 'Point/VotePoint' },
    { id: 'money', icon: '💵', label: 'เงิน在游戏中' },
    { id: 'skillpoints', icon: '🎯', label: 'Skill Point' },
    { id: 'items', icon: '🎁', label: 'ส่งไอเทม' },
    { id: 'announce', icon: '📢', label: 'ประกาศ' },
    { id: 'players', icon: '👥', label: 'จัดการผู้เล่น' },
    { id: 'logs', icon: '📋', label: 'GM Logs' },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId === 'items' && items.length === 0) fetchItems();
    if (tabId === 'logs') fetchLogs();
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar activePage="gmc" />

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">🎛️ GM Command Center</h1>
                <p className="text-gray-400 font-thai">จัดการไอเทม พ้อย เงิน และคำสั่ง GM</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-green-400 text-sm">🟢 Online: {onlinePlayers.length} คน</span>
                <button onClick={fetchOnlinePlayers} className="btn-secondary text-sm py-1 px-3">🔄 Refresh</button>
              </div>
            </div>
          </header>

          <div className="p-6">
            {/* Message Toast */}
            {message && (
              <div className={`mb-4 p-4 rounded-lg font-thai ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {message.type === 'success' ? '✅' : '❌'} {message.text}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-thai whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-ran-red text-white'
                      : 'bg-ran-dark-100 text-gray-400 hover:bg-ran-dark-50 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Target Selector (shared) */}
            {['points', 'money', 'skillpoints'].includes(activeTab) && (
              <div className="card-ran mb-6">
                <h3 className="font-display text-lg font-bold text-white mb-4">🎯 เลือกกลุ่มเป้าหมาย</h3>
                <div className="grid md:grid-cols-4 gap-4 mb-4">
                  <button
                    onClick={() => setPointTarget('all')}
                    className={`p-3 rounded-lg border text-center font-thai transition-all ${
                      pointTarget === 'all' ? 'bg-ran-red border-ran-red text-white' : 'bg-ran-dark border-ran-red/20 text-gray-400 hover:border-ran-red/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">🌍</div>
                    <div className="font-bold">ทุกคน</div>
                    <div className="text-xs opacity-70">All Players</div>
                  </button>
                  <button
                    onClick={() => setPointTarget('online')}
                    className={`p-3 rounded-lg border text-center font-thai transition-all ${
                      pointTarget === 'online' ? 'bg-ran-red border-ran-red text-white' : 'bg-ran-dark border-ran-red/20 text-gray-400 hover:border-ran-red/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">🟢</div>
                    <div className="font-bold">ออนไลน์ ({onlinePlayers.length})</div>
                    <div className="text-xs opacity-70">Online Only</div>
                  </button>
                  <button
                    onClick={() => setPointTarget('specific')}
                    className={`p-3 rounded-lg border text-center font-thai transition-all ${
                      pointTarget === 'specific' ? 'bg-ran-red border-ran-red text-white' : 'bg-ran-dark border-ran-red/20 text-gray-400 hover:border-ran-red/50'
                    }`}
                  >
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="font-bold">เลือกคน ({selectedUserIds.length})</div>
                    <div className="text-xs opacity-70">Select Players</div>
                  </button>
                </div>

                {pointTarget === 'online' && onlinePlayers.length > 0 && (
                  <div className="bg-ran-dark rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {onlinePlayers.map(p => (
                        <div key={p.ChaNum} className="flex items-center gap-2 p-2 bg-ran-dark-100 rounded text-sm">
                          <span className="text-green-400">●</span>
                          <span className="text-white font-thai">{p.ChaName}</span>
                          <span className="text-gray-500">Lv.{p.ChaLevel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pointTarget === 'specific' && (
                  <div>
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); searchPlayers(e.target.value); }}
                        placeholder="ค้นหา UserID หรือ ชื่อตัวละคร..."
                        className="flex-1 bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white font-thai focus:border-ran-red outline-none"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="bg-ran-dark rounded-lg mb-4 max-h-60 overflow-y-auto">
                        {searchResults.map(p => (
                          <div
                            key={p.UserID}
                            onClick={() => addPlayerToSelection(p)}
                            className="flex items-center justify-between p-3 hover:bg-ran-dark-50 cursor-pointer border-b border-ran-red/10 last:border-0"
                          >
                            <div>
                              <span className="text-white font-thai">{p.UserID}</span>
                              <span className="text-gray-500 ml-2">({p.UserName})</span>
                              {p.characters.map(c => (
                                <span key={c.ChaNum} className={`ml-2 text-xs px-2 py-0.5 rounded ${c.ChaOnline ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                                  {c.ChaName} Lv.{c.ChaLevel}
                                </span>
                              ))}
                            </div>
                            <span className="text-ran-red">+ เพิ่ม</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedPlayers.length > 0 && (
                      <div className="bg-ran-dark rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-2 font-thai">ผู้ที่เลือก ({selectedPlayers.length} คน):</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedPlayers.map(p => (
                            <span key={p.UserID} className="flex items-center gap-1 bg-ran-red/20 text-ran-red px-3 py-1 rounded-full text-sm">
                              <span className="font-thai">{p.UserID}</span>
                              <button onClick={() => removePlayerFromSelection(p.UserID)} className="hover:text-white">✕</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ============ POINTS TAB ============ */}
            {activeTab === 'points' && (
              <div className="card-ran">
                <h3 className="font-display text-lg font-bold text-white mb-4">💰 จัดการ Point / VotePoint</h3>
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 font-thai">ประเภท</label>
                    <select value={pointType} onChange={e => setPointType(e.target.value)}
                      className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white">
                      <option value="UserPoint">Premium Point (UserPoint)</option>
                      <option value="VotePoint">Vote Point</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 font-thai">จำนวน</label>
                    <input type="number" value={pointAmount} onChange={e => setPointAmount(e.target.value)}
                      placeholder="กรอกจำนวน..." min="1"
                      className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div className="flex items-end gap-2">
                    <button onClick={() => setPointAction('add')}
                      className={`flex-1 py-2 rounded-lg font-thai font-bold transition-all ${pointAction === 'add' ? 'bg-green-500 text-white' : 'bg-ran-dark-100 text-gray-400 hover:bg-green-500/20'}`}>
                      ➕ เพิ่ม
                    </button>
                    <button onClick={() => setPointAction('deduct')}
                      className={`flex-1 py-2 rounded-lg font-thai font-bold transition-all ${pointAction === 'deduct' ? 'bg-red-500 text-white' : 'bg-ran-dark-100 text-gray-400 hover:bg-red-500/20'}`}>
                      ➖ หัก
                    </button>
                  </div>
                </div>
                <div className="bg-ran-dark rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-400 font-thai">
                    สรุป: จะ<span className={pointAction === 'add' ? 'text-green-400' : 'text-red-400'}>{pointAction === 'add' ? 'เพิ่ม' : 'หัก'}</span>
                    {' '}<span className="text-white font-bold">{pointAmount || '0'}</span> {pointType === 'UserPoint' ? 'Premium Point' : 'Vote Point'}
                    {' '}ให้ <span className="text-white font-bold">{pointTarget === 'all' ? 'ทุกคน' : pointTarget === 'online' ? `ออนไลน์ ${onlinePlayers.length} คน` : `${selectedUserIds.length} คน`}</span>
                  </div>
                </div>
                <button onClick={handlePoints} disabled={loading}
                  className="btn-primary w-full py-3 text-lg font-bold disabled:opacity-50">
                  {loading ? '⏳ กำลังดำเนินการ...' : '✅ ดำเนินการ'}
                </button>
              </div>
            )}

            {/* ============ MONEY TAB ============ */}
            {activeTab === 'money' && (
              <div className="card-ran">
                <h3 className="font-display text-lg font-bold text-white mb-4">💵 จัดการเงินในเกม (Zen)</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 font-thai">จำนวนเงิน (Zen)</label>
                    <input type="number" value={moneyAmount} onChange={e => setMoneyAmount(e.target.value)}
                      placeholder="กรอกจำนวนเงิน..." min="1"
                      className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div className="flex items-end gap-2">
                    <button onClick={() => setMoneyAction('add')}
                      className={`flex-1 py-2 rounded-lg font-thai font-bold transition-all ${moneyAction === 'add' ? 'bg-green-500 text-white' : 'bg-ran-dark-100 text-gray-400'}`}>
                      ➕ เพิ่มเงิน
                    </button>
                    <button onClick={() => setMoneyAction('deduct')}
                      className={`flex-1 py-2 rounded-lg font-thai font-bold transition-all ${moneyAction === 'deduct' ? 'bg-red-500 text-white' : 'bg-ran-dark-100 text-gray-400'}`}>
                      ➖ หักเงิน
                    </button>
                  </div>
                </div>
                <div className="bg-ran-dark rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-400 font-thai">
                    สรุป: จะ<span className={moneyAction === 'add' ? 'text-green-400' : 'text-red-400'}>{moneyAction === 'add' ? 'เพิ่ม' : 'หัก'}</span>
                    {' '}<span className="text-white font-bold">{Number(moneyAmount || 0).toLocaleString()}</span> Zen
                    {' '}ให้ <span className="text-white font-bold">{pointTarget === 'all' ? 'ทุกตัวละคร' : pointTarget === 'online' ? 'ออนไลน์' : `${selectedUserIds.length} คน`}</span>
                  </div>
                </div>
                <button onClick={handleMoney} disabled={loading}
                  className="btn-primary w-full py-3 text-lg font-bold disabled:opacity-50">
                  {loading ? '⏳ กำลังดำเนินการ...' : '✅ ดำเนินการ'}
                </button>
              </div>
            )}

            {/* ============ SKILL POINTS TAB ============ */}
            {activeTab === 'skillpoints' && (
              <div className="card-ran">
                <h3 className="font-display text-lg font-bold text-white mb-4">🎯 จัดการ Skill Point</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-2 font-thai">จำนวน Skill Point</label>
                    <input type="number" value={spAmount} onChange={e => setSpAmount(e.target.value)}
                      placeholder="กรอกจำนวน..." min="1"
                      className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                  </div>
                  <div className="flex items-end gap-2">
                    <button onClick={() => setSpAction('add')}
                      className={`flex-1 py-2 rounded-lg font-thai font-bold transition-all ${spAction === 'add' ? 'bg-green-500 text-white' : 'bg-ran-dark-100 text-gray-400'}`}>
                      ➕ เพิ่ม
                    </button>
                    <button onClick={() => setSpAction('deduct')}
                      className={`flex-1 py-2 rounded-lg font-thai font-bold transition-all ${spAction === 'deduct' ? 'bg-red-500 text-white' : 'bg-ran-dark-100 text-gray-400'}`}>
                      ➖ หัก
                    </button>
                  </div>
                </div>
                <div className="bg-ran-dark rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-400 font-thai">
                    สรุป: จะ<span className={spAction === 'add' ? 'text-green-400' : 'text-red-400'}>{spAction === 'add' ? 'เพิ่ม' : 'หัก'}</span>
                    {' '}<span className="text-white font-bold">{spAmount || '0'}</span> Skill Point
                    {' '}ให้ <span className="text-white font-bold">{pointTarget === 'all' ? 'ทุกตัวละคร' : pointTarget === 'online' ? 'ออนไลน์' : `${selectedUserIds.length} คน`}</span>
                  </div>
                </div>
                <button onClick={handleSkillPoints} disabled={loading}
                  className="btn-primary w-full py-3 text-lg font-bold disabled:opacity-50">
                  {loading ? '⏳ กำลังดำเนินการ...' : '✅ ดำเนินการ'}
                </button>
              </div>
            )}

            {/* ============ ITEMS TAB ============ */}
            {activeTab === 'items' && (
              <div className="card-ran">
                <h3 className="font-display text-lg font-bold text-white mb-4">🎁 ส่งไอเทมให้ผู้เล่น</h3>
                <div className="mb-4">
                  <input type="text" value={itemSearch}
                    onChange={e => { setItemSearch(e.target.value); fetchItems(e.target.value); }}
                    placeholder="ค้นหาไอเทม..."
                    className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white font-thai" />
                </div>
                {selectedItem && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-green-400 font-bold font-thai">✓ เลือก: {selectedItem.ItemName}</span>
                        <span className="text-gray-400 ml-2">(MID: {selectedItem.ItemMain}, SID: {selectedItem.ItemSub})</span>
                      </div>
                      <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-white">✕</button>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 mt-2">
                      <div className="text-sm"><span className="text-gray-400">ราคา:</span> <span className="text-white">{selectedItem.ItemPrice}</span></div>
                      <div className="text-sm"><span className="text-gray-400">สต็อก:</span> <span className="text-white">{selectedItem.ItemStock}</span></div>
                      <div>
                        <label className="text-gray-400 text-sm">จำนวน:</label>
                        <input type="number" value={itemAmount} onChange={e => setItemAmount(e.target.value)}
                          min="1" className="w-full bg-ran-dark border border-ran-red/20 rounded px-2 py-1 text-white text-sm" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="bg-ran-dark rounded-lg max-h-64 overflow-y-auto mb-4">
                  {items.map(item => (
                    <div key={item.ProductNum}
                      onClick={() => setSelectedItem(item)}
                      className={`flex items-center justify-between p-3 hover:bg-ran-dark-50 cursor-pointer border-b border-ran-red/10 last:border-0 ${
                        selectedItem?.ProductNum === item.ProductNum ? 'bg-ran-red/10' : ''
                      }`}>
                      <div>
                        <span className="text-white font-thai">{item.ItemName}</span>
                        <span className="text-gray-500 text-sm ml-2">MID:{item.ItemMain} SID:{item.ItemSub}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-ran-red font-bold">{item.ItemPrice}</span>
                        <span className="text-gray-500 text-sm ml-1">฿</span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="p-4 text-center text-gray-400">ไม่พบไอเทม</div>}
                </div>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2 font-thai">ผู้รับ (UserID):</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" id="itemTargetInput"
                      placeholder="กรอก UserID แล้วกด Enter..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !itemTargetUsers.includes(val)) {
                            setItemTargetUsers(prev => [...prev, val]);
                          }
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="flex-1 bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white font-thai" />
                  </div>
                  {itemTargetUsers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {itemTargetUsers.map(uid => (
                        <span key={uid} className="flex items-center gap-1 bg-ran-red/20 text-ran-red px-3 py-1 rounded-full text-sm">
                          {uid}
                          <button onClick={() => setItemTargetUsers(prev => prev.filter(u => u !== uid))} className="hover:text-white">✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={handleSendItem} disabled={loading || !selectedItem || itemTargetUsers.length === 0}
                  className="btn-primary w-full py-3 text-lg font-bold disabled:opacity-50">
                  {loading ? '⏳ กำลังส่ง...' : `🎁 ส่งไอเทมให้ ${itemTargetUsers.length} คน`}
                </button>
              </div>
            )}

            {/* ============ ANNOUNCE TAB ============ */}
            {activeTab === 'announce' && (
              <div className="card-ran">
                <h3 className="font-display text-lg font-bold text-white mb-4">📢 ประกาศเซิร์ฟเวอร์</h3>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2 font-thai">ข้อความประกาศ</label>
                  <textarea value={announceMsg} onChange={e => setAnnounceMsg(e.target.value)}
                    placeholder="กรอกข้อความประกาศที่ต้องการแสดงในเกม..."
                    rows={3}
                    className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white font-thai resize-none" />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2 font-thai">ประเภทประกาศ</label>
                  <select value={announceType} onChange={e => setAnnounceType(e.target.value)}
                    className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white">
                    <option value="1">Normal Notice</option>
                    <option value="2">GM Notice</option>
                    <option value="3">Event Notice</option>
                  </select>
                </div>
                <div className="bg-ran-dark rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-400 font-thai">
                    ประกาศจะแสดงในเกมทุกเซิร์ฟเวอร์ ข้อความ: <span className="text-white">&quot;{announceMsg || '...'}&quot;</span>
                  </div>
                </div>
                <button onClick={handleAnnounce} disabled={loading || !announceMsg}
                  className="btn-primary w-full py-3 text-lg font-bold disabled:opacity-50">
                  {loading ? '⏳ กำลังประกาศ...' : '📢 ประกาศเลย'}
                </button>
              </div>
            )}

            {/* ============ PLAYERS TAB ============ */}
            {activeTab === 'players' && (
              <div className="space-y-6">
                {/* Chat Block */}
                <div className="card-ran">
                  <h3 className="font-display text-lg font-bold text-white mb-4">🔇 บล็อคแชท</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 font-thai">UserID</label>
                      <input type="text" value={blockUserId} onChange={e => setBlockUserId(e.target.value)}
                        placeholder="UserID..."
                        className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white font-thai" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 font-thai">ระยะเวลา (นาที)</label>
                      <input type="number" value={blockMinutes} onChange={e => setBlockMinutes(e.target.value)}
                        min="1" className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 font-thai">เหตุผล</label>
                      <input type="text" value={blockReason} onChange={e => setBlockReason(e.target.value)}
                        placeholder="เหตุผล..."
                        className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white font-thai" />
                    </div>
                  </div>
                  <button onClick={handleChatBlock} disabled={loading || !blockUserId}
                    className="btn-primary py-2 px-6 disabled:opacity-50">
                    {loading ? '⏳...' : '🔇 บล็อคแชท'}
                  </button>
                </div>

                {/* Kick Player */}
                <div className="card-ran">
                  <h3 className="font-display text-lg font-bold text-white mb-4">🚫 เตะผู้เล่นออกจากระบบ</h3>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 font-thai">ChaNum (รหัสตัวละคร)</label>
                      <input type="number" value={kickChaNum} onChange={e => setKickChaNum(e.target.value)}
                        placeholder="ChaNum..."
                        className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleKick} disabled={loading || !kickChaNum}
                        className="btn-primary py-2 px-6 disabled:opacity-50">
                        {loading ? '⏳...' : '🚫 เตะออก'}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-thai">※ วิธีหา ChaNum: ไปที่เมนู "ตัวละคร" แล้วค้นหาชื่อตัวละคร</div>
                </div>

                {/* Reset Character */}
                <div className="card-ran">
                  <h3 className="font-display text-lg font-bold text-white mb-4">🔄 รีเซ็ตตัวละคร</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 font-thai">ChaNum</label>
                      <input type="number" value={resetChaNum} onChange={e => setResetChaNum(e.target.value)}
                        placeholder="ChaNum..."
                        className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2 font-thai">ประเภทการรีเซ็ต</label>
                      <select value={resetType} onChange={e => setResetType(e.target.value)}
                        className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white">
                        <option value="stats">รีเซ็ตค่า Status ทั้งหมด</option>
                        <option value="position">รีเซ็ตตำแหน่ง</option>
                        <option value="pk">รีเซ็ต PK</option>
                        <option value="all">รีเซ็ตทุกอย่าง</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button onClick={handleReset} disabled={loading || !resetChaNum}
                        className="btn-primary py-2 px-6 disabled:opacity-50">
                        {loading ? '⏳...' : '🔄 รีเซ็ต'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ============ LOGS TAB ============ */}
            {activeTab === 'logs' && (
              <div className="card-ran">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-lg font-bold text-white">📋 GM Command Logs</h3>
                  <button onClick={fetchLogs} className="btn-secondary text-sm py-1 px-3">🔄 Refresh</button>
                </div>
                <div className="bg-ran-dark rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ran-red/20">
                        <th className="p-3 text-left text-gray-400 font-thai">วันที่</th>
                        <th className="p-3 text-left text-gray-400 font-thai">GM</th>
                        <th className="p-3 text-left text-gray-400 font-thai">คำสั่ง</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.RecordID} className="border-b border-ran-red/10 hover:bg-ran-dark-50">
                          <td className="p-3 text-gray-300 whitespace-nowrap">{new Date(log.Date).toLocaleString('th-TH')}</td>
                          <td className="p-3 text-white font-thai">{log.GMCharName || log.GMUserID}</td>
                          <td className="p-3 text-gray-300 font-mono text-xs break-all">{log.GMCommand}</td>
                        </tr>
                      ))}
                      {logs.length === 0 && (
                        <tr><td colSpan={3} className="p-4 text-center text-gray-400">ไม่มี Log</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
