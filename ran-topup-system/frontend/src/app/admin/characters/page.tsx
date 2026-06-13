'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Character {
  ChaNum: number;
  ChaName: string;
  ChaLevel: number;
  ChaClass: number;
  ChaSchool: number;
  UserNum: number;
  UserName: string;
  ChaOnline: number;
  ChaDeleted: number;
}

interface CharDetail {
  ChaNum: number;
  ChaName: string;
  ChaLevel: number;
  ChaClass: number;
  ChaSchool: number;
  ChaTribe: number;
  ChaReborn: number;
  ChaExp: number;
  ChaReExp: number;
  ChaMoney: number;
  ChaGamePoints: number;
  ChaPower: number;
  ChaDex: number;
  ChaSpirit: number;
  ChaStrong: number;
  ChaStrength: number;
  ChaIntel: number;
  ChaStRemain: number;
  ChaSkillPoint: number;
  ChaHP: number;
  ChaMP: number;
  ChaSP: number;
  ChaCP: number;
  ChaAttackP: number;
  ChaDefenseP: number;
  ChaFightA: number;
  ChaShootA: number;
  ChaPK: number;
  ChaPKRecord: number;
  ChaPKScore: number;
  ChaPKDeath: number;
  ChaSex: number;
  ChaHair: number;
  ChaFace: number;
  ChaHairStyle: number;
  ChaHairColor: number;
  ChaLiving: number;
  ChaBright: number;
  ChaViewRange: number;
  ChaScaleRange: number;
  ChaInvenLine: number;
  ChaDeleted: number;
  ChaOnline: number;
  ChaStartMap: number;
  ChaPosX: number;
  ChaPosY: number;
  ChaPosZ: number;
  ChaSaveMap: number;
  ChaContributionPoint: number;
  ChaActivityPoint: number;
  ChaBadgeID: number;
  ChaWarChips: number;
  ChaGuildPoint: number;
  ChaFeedStyle: number;
  ChaBattlePassLevel: number;
  ChaColorName: number;
  owner: { UserNum: number; UserID: string; UserName: string } | null;
  guildName: string;
}

const classMap: Record<number, string> = {
  1: 'Brawler', 2: 'Knight', 4: 'Archer', 8: 'Shaman',
  16: 'Extreme Fighter', 32: 'Extreme Gunner', 64: 'Gunner', 128: 'Assassin'
};
const schoolMap: Record<number, string> = { 1: 'Sen', 2: 'Jin', 4: 'Ryoo' };
const classColor: Record<number, string> = {
  1: 'text-red-400', 2: 'text-blue-400', 4: 'text-green-400', 8: 'text-purple-400',
  16: 'text-orange-400', 32: 'text-cyan-400', 64: 'text-yellow-400', 128: 'text-pink-400'
};

export default function AdminCharactersPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editChar, setEditChar] = useState<CharDetail | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [editTab, setEditTab] = useState<'basic' | 'stats' | 'combat' | 'position' | 'other'>('basic');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchCharacters();

    // Auto-open edit modal if ?edit=chaNum is present
    const editId = searchParams.get('edit');
    if (editId) {
      handleOpenEditById(Number(editId));
    }
  }, [page]);

  const fetchCharacters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/admin/characters?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCharacters(data.characters);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Fetch characters error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => { setPage(1); fetchCharacters(); };

  const handleOpenEditById = async (chaNum: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/characters/${chaNum}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEditChar(data.character);
        setEditForm({
          ChaName: data.character.ChaName,
          ChaLevel: data.character.ChaLevel,
          ChaClass: data.character.ChaClass,
          ChaSchool: data.character.ChaSchool,
          ChaReborn: data.character.ChaReborn,
          ChaExp: data.character.ChaExp,
          ChaReExp: data.character.ChaReExp,
          ChaMoney: data.character.ChaMoney,
          ChaGamePoints: data.character.ChaGamePoints,
          ChaPower: data.character.ChaPower,
          ChaDex: data.character.ChaDex,
          ChaSpirit: data.character.ChaSpirit,
          ChaStrong: data.character.ChaStrong,
          ChaStrength: data.character.ChaStrength,
          ChaIntel: data.character.ChaIntel,
          ChaStRemain: data.character.ChaStRemain,
          ChaSkillPoint: data.character.ChaSkillPoint,
          ChaHP: data.character.ChaHP,
          ChaMP: data.character.ChaMP,
          ChaSP: data.character.ChaSP,
          ChaCP: data.character.ChaCP,
          ChaAttackP: data.character.ChaAttackP,
          ChaDefenseP: data.character.ChaDefenseP,
          ChaFightA: data.character.ChaFightA,
          ChaShootA: data.character.ChaShootA,
          ChaPK: data.character.ChaPK,
          ChaPKRecord: data.character.ChaPKRecord,
          ChaPKScore: data.character.ChaPKScore,
          ChaPKDeath: data.character.ChaPKDeath,
          ChaSex: data.character.ChaSex,
          ChaHair: data.character.ChaHair,
          ChaFace: data.character.ChaFace,
          ChaHairStyle: data.character.ChaHairStyle,
          ChaHairColor: data.character.ChaHairColor,
          ChaBright: data.character.ChaBright,
          ChaViewRange: data.character.ChaViewRange,
          ChaInvenLine: data.character.ChaInvenLine,
          ChaDeleted: data.character.ChaDeleted,
          ChaOnline: data.character.ChaOnline,
          ChaStartMap: data.character.ChaStartMap,
          ChaPosX: data.character.ChaPosX,
          ChaPosY: data.character.ChaPosY,
          ChaPosZ: data.character.ChaPosZ,
          ChaSaveMap: data.character.ChaSaveMap,
          ChaContributionPoint: data.character.ChaContributionPoint,
          ChaActivityPoint: data.character.ChaActivityPoint,
          ChaWarChips: data.character.ChaWarChips,
          ChaGuildPoint: data.character.ChaGuildPoint,
          ChaBattlePassLevel: data.character.ChaBattlePassLevel,
          ChaColorName: data.character.ChaColorName,
        });
        setEditTab('basic');
        setShowEdit(true);
      }
    } catch (error) {
      console.error('Failed to load character');
    }
  };

  const handleOpenEdit = async (cha: Character) => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/characters/${cha.ChaNum}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEditChar(data.character);
        setEditForm({
          ChaName: data.character.ChaName,
          ChaLevel: data.character.ChaLevel,
          ChaClass: data.character.ChaClass,
          ChaSchool: data.character.ChaSchool,
          ChaReborn: data.character.ChaReborn,
          ChaExp: data.character.ChaExp,
          ChaReExp: data.character.ChaReExp,
          ChaMoney: data.character.ChaMoney,
          ChaGamePoints: data.character.ChaGamePoints,
          ChaPower: data.character.ChaPower,
          ChaDex: data.character.ChaDex,
          ChaSpirit: data.character.ChaSpirit,
          ChaStrong: data.character.ChaStrong,
          ChaStrength: data.character.ChaStrength,
          ChaIntel: data.character.ChaIntel,
          ChaStRemain: data.character.ChaStRemain,
          ChaSkillPoint: data.character.ChaSkillPoint,
          ChaHP: data.character.ChaHP,
          ChaMP: data.character.ChaMP,
          ChaSP: data.character.ChaSP,
          ChaCP: data.character.ChaCP,
          ChaAttackP: data.character.ChaAttackP,
          ChaDefenseP: data.character.ChaDefenseP,
          ChaFightA: data.character.ChaFightA,
          ChaShootA: data.character.ChaShootA,
          ChaPK: data.character.ChaPK,
          ChaPKRecord: data.character.ChaPKRecord,
          ChaPKScore: data.character.ChaPKScore,
          ChaPKDeath: data.character.ChaPKDeath,
          ChaSex: data.character.ChaSex,
          ChaHair: data.character.ChaHair,
          ChaFace: data.character.ChaFace,
          ChaHairStyle: data.character.ChaHairStyle,
          ChaHairColor: data.character.ChaHairColor,
          ChaBright: data.character.ChaBright,
          ChaViewRange: data.character.ChaViewRange,
          ChaInvenLine: data.character.ChaInvenLine,
          ChaDeleted: data.character.ChaDeleted,
          ChaOnline: data.character.ChaOnline,
          ChaStartMap: data.character.ChaStartMap,
          ChaPosX: data.character.ChaPosX,
          ChaPosY: data.character.ChaPosY,
          ChaPosZ: data.character.ChaPosZ,
          ChaSaveMap: data.character.ChaSaveMap,
          ChaContributionPoint: data.character.ChaContributionPoint,
          ChaActivityPoint: data.character.ChaActivityPoint,
          ChaWarChips: data.character.ChaWarChips,
          ChaGuildPoint: data.character.ChaGuildPoint,
          ChaBattlePassLevel: data.character.ChaBattlePassLevel,
          ChaColorName: data.character.ChaColorName,
        });
        setEditTab('basic');
        setShowEdit(true);
      }
    } catch (error) {
      setMsg('ไม่สามารถดึงข้อมูลตัวละครได้');
    }
  };

  const handleSave = async () => {
    if (!editChar) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/characters/${editChar.ChaNum}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (data.success) {
        setMsg(data.message);
        setShowEdit(false);
        fetchCharacters();
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

  const renderInput = (label: string, key: string, type: string = 'number', disabled = false) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={editForm[key] ?? ''}
        onChange={(e) => updateField(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        disabled={disabled}
        className={`input-ran text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
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
                { icon: '👥', label: 'ผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters', active: true },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect' },
                { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop' },
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
          <div className="p-4 border-t border-ran-red/20">
            <Link href="/" className="sidebar-item">
              <span className="text-xl">🚪</span>
              <span className="font-thai">ออกจากระบบ</span>
            </Link>
          </div>
        </aside>

        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-white">🎮 จัดการตัวละคร</h1>
              <p className="text-gray-400 font-thai">ตัวละครทั้งหมดในระบบ ({total.toLocaleString()} ตัว)</p>
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
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="input-ran"
                    placeholder="ค้นหาชื่อตัวละคร..."
                  />
                </div>
                <button onClick={handleSearch} className="btn-ran px-6">🔍 ค้นหา</button>
              </div>
            </div>

            {/* Table */}
            <div className="card-ran">
              {loading ? (
                <div className="p-12 text-center text-gray-400">⏳ กำลังโหลด...</div>
              ) : characters.length === 0 ? (
                <div className="p-12 text-center text-gray-500">ไม่พบข้อมูลตัวละคร</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-3 text-gray-400 text-sm">ID</th>
                        <th className="text-left py-3 px-3 text-gray-400 text-sm">ชื่อตัวละคร</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">Level</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">Class</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">School</th>
                        <th className="text-left py-3 px-3 text-gray-400 text-sm">เจ้าของ</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">Status</th>
                        <th className="text-center py-3 px-3 text-gray-400 text-sm">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {characters.map((char) => (
                        <tr key={char.ChaNum} className="border-b border-gray-800 hover:bg-ran-dark-50">
                          <td className="py-3 px-3 font-mono text-gray-400 text-sm">{char.ChaNum}</td>
                          <td className="py-3 px-3 text-white font-bold">{char.ChaName}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">Lv.{char.ChaLevel}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`font-bold text-xs ${classColor[char.ChaClass] || 'text-gray-400'}`}>{classMap[char.ChaClass] || char.ChaClass}</span>
                          </td>
                          <td className="py-3 px-3 text-center text-gray-300 text-xs">{schoolMap[char.ChaSchool] || char.ChaSchool}</td>
                          <td className="py-3 px-3 text-gray-400 text-xs">{char.UserName || char.UserNum}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              char.ChaDeleted === 0
                                ? char.ChaOnline === 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {char.ChaDeleted === 1 ? 'Deleted' : char.ChaOnline === 1 ? 'Online' : 'Offline'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleOpenEdit(char)}
                              className="px-3 py-1 bg-ran-red/20 text-ran-red rounded text-xs hover:bg-ran-red/30 font-bold"
                            >
                              ✏️ แก้ไข
                            </button>
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
                        <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 rounded text-sm ${p === page ? 'bg-ran-red text-white' : 'bg-ran-dark text-gray-400 hover:text-white'}`}>{p}</button>
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

      {/* ===== Edit Character Modal ===== */}
      {showEdit && editChar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card-ran w-full max-w-4xl my-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-display text-xl font-bold text-white">✏️ แก้ไขตัวละคร: {editChar.ChaName}</h3>
                <p className="text-gray-400 text-sm mt-1">
                  ID: {editChar.ChaNum} | เจ้าของ: {editChar.owner?.UserID || editChar.owner?.UserName || '-'} | 
                  กิลด์: {editChar.guildName || 'ไม่มี'}
                </p>
              </div>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-white text-2xl">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
              {[
                { key: 'basic', label: '👤 ข้อมูลพื้นฐาน' },
                { key: 'stats', label: '💪 ค่าสถานะ' },
                { key: 'combat', label: '⚔️ ต่อสู้' },
                { key: 'position', label: '📍 ตำแหน่ง' },
                { key: 'other', label: '📦 อื่นๆ' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setEditTab(tab.key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    editTab === tab.key ? 'bg-ran-red text-white' : 'bg-ran-dark text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-ran-dark rounded-lg p-4 max-h-[50vh] overflow-y-auto">
              {/* Basic Tab */}
              {editTab === 'basic' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {renderInput('ชื่อตัวละคร', 'ChaName', 'text')}
                  {renderInput('Level', 'ChaLevel')}
                  {renderInput('Reborn', 'ChaReborn')}
                  {renderInput('Class (1=Brawler,2=Knight,4=Archer,8=Shaman)', 'ChaClass')}
                  {renderInput('School (1=Sen,2=Jin,4=Ryoo)', 'ChaSchool')}
                  {renderInput('Tribe', 'ChaTribe')}
                  {renderInput('เพศ (0=M,1=F)', 'ChaSex')}
                  {renderInput('Hair', 'ChaHair')}
                  {renderInput('Face', 'ChaFace')}
                  {renderInput('HairStyle', 'ChaHairStyle')}
                  {renderInput('HairColor', 'ChaHairColor')}
                  {renderInput('Living', 'ChaLiving')}
                  {renderInput('Experience', 'ChaExp')}
                  {renderInput('ReExp', 'ChaReExp')}
                </div>
              )}

              {/* Stats Tab */}
              {editTab === 'stats' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-full mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">📊 ค่าสถานะหลัก</h4>
                  </div>
                  {renderInput('Str (Power)', 'ChaPower')}
                  {renderInput('Dex', 'ChaDex')}
                  {renderInput('Spi (Spirit)', 'ChaSpirit')}
                  {renderInput('Luk (Strong)', 'ChaStrong')}
                  <div className="col-span-full mt-4 mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">🎯 ค่าที่分配แล้ว</h4>
                  </div>
                  {renderInput('Str Points (Strength)', 'ChaStrength')}
                  {renderInput('Int Points (Intel)', 'ChaIntel')}
                  {renderInput('Stat Points คงเหลือ', 'ChaStRemain')}
                  {renderInput('Skill Points', 'ChaSkillPoint')}
                  <div className="col-span-full mt-4 mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">❤️ HP / MP / SP</h4>
                  </div>
                  {renderInput('HP', 'ChaHP')}
                  {renderInput('MP', 'ChaMP')}
                  {renderInput('SP', 'ChaSP')}
                  {renderInput('CP', 'ChaCP')}
                </div>
              )}

              {/* Combat Tab */}
              {editTab === 'combat' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-full mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">⚔️ ค่าต่อสู้</h4>
                  </div>
                  {renderInput('Attack (AttackP)', 'ChaAttackP')}
                  {renderInput('Defense (DefenseP)', 'ChaDefenseP')}
                  {renderInput('Melee (FightA)', 'ChaFightA')}
                  {renderInput('Ranged (ShootA)', 'ChaShootA')}
                  <div className="col-span-full mt-4 mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">💀 PK</h4>
                  </div>
                  {renderInput('PK Count', 'ChaPK')}
                  {renderInput('PK Record', 'ChaPKRecord')}
                  {renderInput('PK Score', 'ChaPKScore')}
                  {renderInput('PK Death', 'ChaPKDeath')}
                </div>
              )}

              {/* Position Tab */}
              {editTab === 'position' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-full mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">🗺️ แผนที่เริ่มต้น / ปัจจุบัน</h4>
                  </div>
                  {renderInput('Start Map', 'ChaStartMap')}
                  {renderInput('Save Map', 'ChaSaveMap')}
                  <div className="col-span-full mt-4 mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">📍 ตำแหน่งปัจจุบัน</h4>
                  </div>
                  {renderInput('X', 'ChaPosX')}
                  {renderInput('Y', 'ChaPosY')}
                  {renderInput('Z', 'ChaPosZ')}
                </div>
              )}

              {/* Other Tab */}
              {editTab === 'other' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="col-span-full mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">💰 เงินและแต้ม</h4>
                  </div>
                  {renderInput('Money (In-Game)', 'ChaMoney')}
                  {renderInput('Game Points', 'ChaGamePoints')}
                  {renderInput('Guild Point', 'ChaGuildPoint')}
                  {renderInput('Contribution Point', 'ChaContributionPoint')}
                  {renderInput('Activity Point', 'ChaActivityPoint')}
                  {renderInput('War Chips', 'ChaWarChips')}
                  {renderInput('Battle Pass Level', 'ChaBattlePassLevel')}
                  <div className="col-span-full mt-4 mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">⚙️ อื่นๆ</h4>
                  </div>
                  {renderInput('Bright', 'ChaBright')}
                  {renderInput('View Range', 'ChaViewRange')}
                  {renderInput('Inventory Lines', 'ChaInvenLine')}
                  {renderInput('Color Name', 'ChaColorName')}
                  <div className="col-span-full mt-4 mb-2">
                    <h4 className="text-white font-bold text-sm mb-3">🔒 สถานะ</h4>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">สถานะ (0=Active, 1=Deleted)</label>
                    <select
                      value={editForm.ChaDeleted ?? 0}
                      onChange={(e) => updateField('ChaDeleted', Number(e.target.value))}
                      className="input-ran text-sm"
                    >
                      <option value={0}>Active</option>
                      <option value={1}>Deleted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Online Status</label>
                    <select
                      value={editForm.ChaOnline ?? 0}
                      onChange={(e) => updateField('ChaOnline', Number(e.target.value))}
                      className="input-ran text-sm"
                    >
                      <option value={0}>Offline</option>
                      <option value={1}>Online</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center mt-4">
              <p className="text-gray-500 text-xs">แก้ไขได้เฉพาะ field ที่กำหนดเท่านั้น</p>
              <div className="flex gap-2">
                <button onClick={() => setShowEdit(false)} className="btn-outline px-6">ยกเลิก</button>
                <button onClick={handleSave} disabled={saving} className="btn-ran px-6">
                  {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
