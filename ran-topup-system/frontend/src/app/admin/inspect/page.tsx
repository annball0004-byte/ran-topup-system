'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const CLASS_MAP: Record<number, string> = {
  1: 'Brawler', 2: 'Knight', 4: 'Archer', 8: 'Shaman',
  16: 'Extreme Brawler', 32: 'Extreme Knight', 64: 'Gunner', 128: 'Assassin', 256: 'Pritti'
};
const SCHOOL_MAP: Record<number, string> = { 1: 'Luxion', 2: 'Reqros', 3: 'Sidein' };
const CLASS_TH: Record<number, string> = {
  1: 'นักสู้', 2: 'อัศวิน', 4: 'นักธนู', 8: 'นักบวช',
  16: 'นักสู้ขั้นสูง', 32: 'อัศวินขั้นสูง', 64: 'พลปืน', 128: 'นักฆ่า', 256: 'พริตตี้'
};

interface Character {
  ChaNum: number; ChaName: string; ChaLevel: number; ChaClass: number;
  ChaSchool: number; ChaReborn: number; ChaMoney: number; ChaGamePoints: number;
  ChaSkillPoint: number; ChaSpMID: number; ChaSpSID: number;
  ChaInvenLine: number; ChaOnline: number; ChaDeleted: number;
  ChaPower: number; ChaDex: number; ChaSpirit: number; ChaStrong: number;
  ChaStrength: number; ChaIntel: number; ChaStRemain: number;
  ChaHP: number; ChaMP: number; ChaSP: number; ChaCP: number;
  ChaAttackP: number; ChaDefenseP: number; ChaFightA: number; ChaShootA: number;
  ChaPK: number; ChaPKRecord: number; ChaPKScore: number; ChaPKDeath: number;
  ChaExp: number; ChaReExp: number;
  ChaStartMap: number; ChaPosX: number; ChaPosY: number; ChaPosZ: number;
  ChaSaveMap: number; ChaSavePosX: number; ChaSavePosY: number; ChaSavePosZ: number;
  ChaContributionPoint: number; ChaActivityPoint: number;
  ChaWarChips: number; ChaGuildPoint: number; ChaPlayPoint: number;
  ChaViewRange: number; ChaBright: number; ChaScaleRange: number;
  ChaSex: number; ChaHair: number; ChaFace: number; ChaHairStyle: number; ChaHairColor: number;
  ChaCreateDate: string; ChaPlayTime: number;
  ChaEquipmentLockEnable: number; ChaEquipmentLockStatus: number;
  PutOnItemsSize: number; InvenSize: number; SkillsSize: number;
  SkillSlotSize: number; QuestSize: number; CoolTimeSize: number;
  owner: { UserNum: number; UserID: string; UserName: string; UserPoint: number; VotePoint: number; UserLoginState: number } | null;
  guild: { GuNum: number; GuName: string; GuRank: number; GuMoney: number } | null;
  pets: any[];
  vehicles: any[];
  itemLogs: any[];
  equipLock: any;
  personalLock: any;
}

export default function InspectPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const searchCharacter = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      // First search for character by name or ChaNum
      const res = await fetch(`${API_URL}/admin/characters?search=${encodeURIComponent(searchQuery)}&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.characters.length > 0) {
        const chaNum = data.characters[0].ChaNum;
        // Get full inspection data
        const inspectRes = await fetch(`${API_URL}/admin/gmc/inspect/${chaNum}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const inspectData = await inspectRes.json();
        if (inspectData.success) {
          setCharacter(inspectData.character);
          setActiveTab('overview');
        } else {
          showMessage('error', inspectData.error);
        }
      } else {
        showMessage('error', 'ไม่พบตัวละคร');
      }
    } catch (error) {
      showMessage('error', 'เกิดข้อผิดพลาดในการค้นหา');
    }
    setLoading(false);
  };

  const formatClass = (cls: number) => CLASS_MAP[cls] || `Class ${cls}`;
  const formatClassTh = (cls: number) => CLASS_TH[cls] || `คลาส ${cls}`;
  const formatSchool = (sch: number) => SCHOOL_MAP[sch] || `School ${sch}`;
  const formatNumber = (n: number) => n ? n.toLocaleString() : '0';
  const formatBytes = (b: number) => b ? `${(b / 1024).toFixed(1)} KB` : '0 KB';
  const formatPlayTime = (seconds: number) => {
    if (!seconds) return '0 ชม.';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h} ชม. ${m} น.`;
  };

  const tabs = [
    { id: 'overview', icon: '📊', label: 'ภาพรวม' },
    { id: 'stats', icon: '⚔️', label: 'Stats' },
    { id: 'position', icon: '📍', label: 'ตำแหน่ง' },
    { id: 'pets', icon: '🐾', label: 'สัตว์เลี้ยง' },
    { id: 'vehicles', icon: '🚗', label: 'ยานพาหนะ' },
    { id: 'items', icon: '📦', label: 'ไอเทมล่าสุด' },
    { id: 'data', icon: '💾', label: 'Binary Data' },
  ];

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') searchCharacter();
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
                { icon: '🔔', label: 'แจ้งเตือน', href: '/admin/alerts' },
                { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect', active: true },
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
        </aside>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">🔍 ตรวจสอบไอเทมตัวละคร</h1>
                <p className="text-gray-400 font-thai">ตรวจสอบข้อมูลตัวละคร ไอเทม สกิล สัตว์เลี้ยง ยานพาหนะ</p>
              </div>
            </div>
          </header>

          <div className="p-6">
            {message && (
              <div className={`mb-4 p-4 rounded-lg font-thai ${message.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                {message.type === 'success' ? '✅' : '❌'} {message.text}
              </div>
            )}

            {/* Search */}
            <div className="card-ran mb-6">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="ค้นหาชื่อตัวละคร หรือ ChaNum..."
                  className="flex-1 bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-3 text-white font-thai text-lg focus:border-ran-red outline-none"
                />
                <button onClick={searchCharacter} disabled={loading || !searchQuery}
                  className="btn-primary px-8 py-3 text-lg disabled:opacity-50">
                  {loading ? '⏳' : '🔍'} ค้นหา
                </button>
              </div>
            </div>

            {/* Character Info */}
            {character && (
              <>
                {/* Header Card */}
                <div className="card-ran mb-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-ran-red/20 rounded-xl flex items-center justify-center">
                      <span className="text-4xl">🎮</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="font-display text-2xl font-bold text-white">{character.ChaName}</h2>
                        {character.ChaOnline ? (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-sm">🟢 Online</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded text-sm">⚫ Offline</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-gray-400">ChaNum: <span className="text-white">{character.ChaNum}</span></span>
                        <span className="text-gray-400">Level: <span className="text-white">{character.ChaLevel}</span></span>
                        <span className="text-gray-400">Reborn: <span className="text-white">{character.ChaReborn}</span></span>
                        <span className="text-gray-400">Class: <span className="text-white">{formatClassTh(character.ChaClass)} ({formatClass(character.ChaClass)})</span></span>
                        <span className="text-gray-400">School: <span className="text-white">{formatSchool(character.ChaSchool)}</span></span>
                        {character.owner && (
                          <span className="text-gray-400">Owner: <span className="text-ran-red">{character.owner.UserID}</span></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
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

                {/* ============ OVERVIEW TAB ============ */}
                {activeTab === 'overview' && (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Character Info */}
                    <div className="card-ran">
                      <h3 className="font-display text-lg font-bold text-white mb-4">📋 ข้อมูลตัวละคร</h3>
                      <div className="space-y-3">
                        {[
                          ['ชื่อตัวละคร', character.ChaName],
                          ['Level', `${character.ChaLevel} (Reborn: ${character.ChaReborn})`],
                          ['Class', `${formatClassTh(character.ChaClass)} (${formatClass(character.ChaClass)})`],
                          ['School', formatSchool(character.ChaSchool)],
                          ['เพศ', character.ChaSex === 1 ? 'ชาย' : 'หญิง'],
                          ['Hair', `${character.ChaHair} / Style: ${character.ChaHairStyle} / Color: ${character.ChaHairColor}`],
                          ['Face', `${character.ChaFace}`],
                          ['วันที่สร้าง', character.ChaCreateDate ? new Date(character.ChaCreateDate).toLocaleString('th-TH') : '-'],
                          ['เวลาเล่น', formatPlayTime(character.ChaPlayTime)],
                        ].map(([label, value], i) => (
                          <div key={i} className="flex justify-between py-1 border-b border-ran-red/10">
                            <span className="text-gray-400 font-thai">{label}</span>
                            <span className="text-white font-thai">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Points & Currency */}
                    <div className="card-ran">
                      <h3 className="font-display text-lg font-bold text-white mb-4">💰 คะแนนและเงิน</h3>
                      <div className="space-y-3">
                        {[
                          ['Zen (เงินในเกม)', formatNumber(character.ChaMoney), 'text-yellow-400'],
                          ['Game Points', formatNumber(character.ChaGamePoints), 'text-blue-400'],
                          ['Skill Point', formatNumber(character.ChaSkillPoint), 'text-purple-400'],
                          ['Premium Point', formatNumber(character.owner?.UserPoint || 0), 'text-green-400'],
                          ['Vote Point', formatNumber(character.owner?.VotePoint || 0), 'text-cyan-400'],
                          ['War Chips', formatNumber(character.ChaWarChips), 'text-red-400'],
                          ['Guild Point', formatNumber(character.ChaGuildPoint), 'text-orange-400'],
                          ['Contribution', formatNumber(character.ChaContributionPoint), 'text-pink-400'],
                          ['Activity Point', formatNumber(character.ChaActivityPoint), 'text-teal-400'],
                          ['Play Point', formatNumber(character.ChaPlayPoint), 'text-indigo-400'],
                        ].map(([label, value, color], i) => (
                          <div key={i} className="flex justify-between py-1 border-b border-ran-red/10">
                            <span className="text-gray-400 font-thai">{label}</span>
                            <span className={`font-bold ${color}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Combat Stats */}
                    <div className="card-ran">
                      <h3 className="font-display text-lg font-bold text-white mb-4">⚔️ ค่าต่อสู้</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ['Power', character.ChaPower, '🔴'],
                          ['Dex', character.ChaDex, '🟢'],
                          ['Spirit', character.ChaSpirit, '🔵'],
                          ['Strong', character.ChaStrong, '🟡'],
                          ['Strength', character.ChaStrength, '⚪'],
                          ['Intel', character.ChaIntel, '🟣'],
                          ['AttackP', character.ChaAttackP, '⚔️'],
                          ['DefenseP', character.ChaDefenseP, '🛡️'],
                          ['FightA', character.ChaFightA, '👊'],
                          ['ShootA', character.ChaShootA, '🏹'],
                          ['HP', character.ChaHP, '❤️'],
                          ['MP', character.ChaMP, '💙'],
                          ['SP', character.ChaSP, '💚'],
                          ['CP', character.ChaCP, '💛'],
                          ['StRemain', character.ChaStRemain, '📊'],
                        ].map(([label, value, icon], i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-ran-dark rounded">
                            <span>{icon}</span>
                            <span className="text-gray-400 text-sm font-thai">{label}</span>
                            <span className="text-white font-bold ml-auto">{formatNumber(value as number)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PK & Social */}
                    <div className="card-ran">
                      <h3 className="font-display text-lg font-bold text-white mb-4">🏆 PK และ กิลด์</h3>
                      <div className="space-y-3">
                        {[
                          ['PK Kill', character.ChaPK, 'text-red-400'],
                          ['PK Record', character.ChaPKRecord, 'text-orange-400'],
                          ['PK Score', formatNumber(character.ChaPKScore), 'text-yellow-400'],
                          ['PK Death', character.ChaPKDeath, 'text-gray-400'],
                          ['Guild', character.guild ? `${character.guild.GuName} (Lv.${character.guild.GuRank})` : 'ไม่มีกิลด์', 'text-purple-400'],
                          ['Guild Position', ['', 'นายก', 'รองนายก'][character.GuPosition] || `ตำแหน่ง ${character.GuPosition}`, 'text-cyan-400'],
                          ['Guild Money', character.guild ? formatNumber(character.guild.GuMoney) : '-', 'text-green-400'],
                        ].map(([label, value, color], i) => (
                          <div key={i} className="flex justify-between py-1 border-b border-ran-red/10">
                            <span className="text-gray-400 font-thai">{label}</span>
                            <span className={`font-thai ${color}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lock Status */}
                    <div className="card-ran md:col-span-2">
                      <h3 className="font-display text-lg font-bold text-white mb-4">🔒 ระบบล็อค</h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 bg-ran-dark rounded-lg">
                          <div className="text-gray-400 text-sm mb-1 font-thai">Equipment Lock</div>
                          <div className={`font-bold ${character.ChaEquipmentLockEnable ? 'text-red-400' : 'text-green-400'}`}>
                            {character.ChaEquipmentLockEnable ? '🔒 เปิดใช้งาน' : '🔓 ปิดอยู่'}
                          </div>
                        </div>
                        <div className="p-4 bg-ran-dark rounded-lg">
                          <div className="text-gray-400 text-sm mb-1 font-thai">Personal Lock (Puton)</div>
                          <div className={`font-bold ${character.personalLock?.UserLockPuton ? 'text-red-400' : 'text-green-400'}`}>
                            {character.personalLock?.UserLockPuton ? '🔒 ล็อค' : '🔓 ไม่ล็อค'}
                          </div>
                        </div>
                        <div className="p-4 bg-ran-dark rounded-lg">
                          <div className="text-gray-400 text-sm mb-1 font-thai">Personal Lock (Locker)</div>
                          <div className={`font-bold ${character.personalLock?.UserLockLocker ? 'text-red-400' : 'text-green-400'}`}>
                            {character.personalLock?.UserLockLocker ? '🔒 ล็อค' : '🔓 ไม่ล็อค'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============ STATS TAB ============ */}
                {activeTab === 'stats' && (
                  <div className="card-ran">
                    <h3 className="font-display text-lg font-bold text-white mb-4">⚔️ ค่า Status ทั้งหมด</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { label: 'Power', value: character.ChaPower, icon: '💪', color: 'bg-red-500' },
                        { label: 'Dex', value: character.ChaDex, icon: '🏃', color: 'bg-green-500' },
                        { label: 'Spirit', value: character.ChaSpirit, icon: '🔮', color: 'bg-blue-500' },
                        { label: 'Strong', value: character.ChaStrong, icon: '🛡️', color: 'bg-yellow-500' },
                        { label: 'Strength', value: character.ChaStrength, icon: '⚔️', color: 'bg-orange-500' },
                        { label: 'Intel', value: character.ChaIntel, icon: '🧠', color: 'bg-purple-500' },
                        { label: 'StRemain', value: character.ChaStRemain, icon: '📊', color: 'bg-gray-500' },
                        { label: 'AttackP', value: character.ChaAttackP, icon: '🗡️', color: 'bg-red-600' },
                        { label: 'DefenseP', value: character.ChaDefenseP, icon: '🛡️', color: 'bg-blue-600' },
                        { label: 'FightA', value: character.ChaFightA, icon: '👊', color: 'bg-orange-600' },
                        { label: 'ShootA', value: character.ChaShootA, icon: '🏹', color: 'bg-green-600' },
                        { label: 'SkillPoint', value: character.ChaSkillPoint, icon: '🎯', color: 'bg-indigo-500' },
                        { label: 'HP', value: character.ChaHP, icon: '❤️', color: 'bg-red-400' },
                        { label: 'MP', value: character.ChaMP, icon: '💙', color: 'bg-blue-400' },
                        { label: 'SP', value: character.ChaSP, icon: '💚', color: 'bg-green-400' },
                        { label: 'CP', value: character.ChaCP, icon: '💛', color: 'bg-yellow-400' },
                        { label: 'Exp', value: character.ChaExp, icon: '⭐', color: 'bg-yellow-300' },
                        { label: 'ViewRange', value: character.ChaViewRange, icon: '👁️', color: 'bg-cyan-500' },
                        { label: 'Bright', value: character.ChaBright, icon: '☀️', color: 'bg-amber-400' },
                        { label: 'ScaleRange', value: character.ChaScaleRange, icon: '📐', color: 'bg-pink-500' },
                      ].map((stat, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-ran-dark rounded-lg">
                          <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                            <span className="text-lg">{stat.icon}</span>
                          </div>
                          <div className="flex-1">
                            <div className="text-gray-400 text-sm font-thai">{stat.label}</div>
                            <div className="text-white font-bold">{formatNumber(stat.value)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ============ POSITION TAB ============ */}
                {activeTab === 'position' && (
                  <div className="card-ran">
                    <h3 className="font-display text-lg font-bold text-white mb-4">📍 ตำแหน่ง</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-gray-400 mb-3 font-thai">ตำแหน่งปัจจุบัน</h4>
                        <div className="space-y-2">
                          {[
                            ['Map', character.ChaStartMap],
                            ['Gate', character.ChaStartGate],
                            ['X', character.ChaPosX?.toFixed(2)],
                            ['Y', character.ChaPosY?.toFixed(2)],
                            ['Z', character.ChaPosZ?.toFixed(2)],
                          ].map(([label, value], i) => (
                            <div key={i} className="flex justify-between py-1 border-b border-ran-red/10">
                              <span className="text-gray-400 font-thai">{label}</span>
                              <span className="text-white font-mono">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-gray-400 mb-3 font-thai">ตำแหน่ง Save</h4>
                        <div className="space-y-2">
                          {[
                            ['Map', character.ChaSaveMap],
                            ['X', character.ChaSavePosX?.toFixed(2)],
                            ['Y', character.ChaSavePosY?.toFixed(2)],
                            ['Z', character.ChaSavePosZ?.toFixed(2)],
                          ].map(([label, value], i) => (
                            <div key={i} className="flex justify-between py-1 border-b border-ran-red/10">
                              <span className="text-gray-400 font-thai">{label}</span>
                              <span className="text-white font-mono">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============ PETS TAB ============ */}
                {activeTab === 'pets' && (
                  <div className="card-ran">
                    <h3 className="font-display text-lg font-bold text-white mb-4">🐾 สัตว์เลี้ยง</h3>
                    {character.pets.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 font-thai">ไม่มีสัตว์เลี้ยง</div>
                    ) : (
                      <div className="space-y-4">
                        {character.pets.map((pet: any, i: number) => (
                          <div key={i} className="bg-ran-dark rounded-lg p-4">
                            <div className="flex items-center gap-4 mb-3">
                              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🐾</span>
                              </div>
                              <div>
                                <div className="text-white font-bold font-thai">{pet.PetName || `Pet #${pet.PetNum}`}</div>
                                <div className="text-gray-400 text-sm">Level: {pet.PetLevel} | MID: {pet.PetMID} SID: {pet.PetSID}</div>
                              </div>
                            </div>
                            {pet.accessories && pet.accessories.length > 0 && (
                              <div className="mt-2">
                                <div className="text-gray-400 text-sm mb-1">Accessories:</div>
                                <div className="flex gap-2">
                                  {pet.accessories.map((acc: any, j: number) => (
                                    <span key={j} className="px-2 py-1 bg-ran-dark-100 rounded text-xs text-white">
                                      Type {acc.PetInvenType}: MID:{acc.PetInvenMID} SID:{acc.PetInvenSID}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {pet.skills && pet.skills.length > 0 && (
                              <div className="mt-2">
                                <div className="text-gray-400 text-sm mb-1">Skills:</div>
                                <div className="flex gap-2">
                                  {pet.skills.map((skill: any, j: number) => (
                                    <span key={j} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                                      MID:{skill.PetInvenMID} SID:{skill.PetInvenSID} ({skill.PetInvenAvailable ? 'Active' : 'Inactive'})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="mt-2 text-xs text-gray-500">
          PutOnItems: {formatBytes(pet.PutOnItemsSize)} | 
          DualSkill: {pet.PetDualSkill || 0} | 
          Card: MID:{pet.PetCardMID} SID:{pet.PetCardSID}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ============ VEHICLES TAB ============ */}
                {activeTab === 'vehicles' && (
                  <div className="card-ran">
                    <h3 className="font-display text-lg font-bold text-white mb-4">🚗 ยานพาหนะ</h3>
                    {character.vehicles.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 font-thai">ไม่มียานพาหนะ</div>
                    ) : (
                      <div className="space-y-4">
                        {character.vehicles.map((v: any, i: number) => (
                          <div key={i} className="bg-ran-dark rounded-lg p-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">🚗</span>
                              </div>
                              <div>
                                <div className="text-white font-bold font-thai">{v.VehicleName || `Vehicle #${v.VehicleNum}`}</div>
                                <div className="text-gray-400 text-sm">
                                  MID: {v.VehicleMID} SID: {v.VehicleSID} | 
                                  Battery: {v.VehicleBattery} | Booster: {v.VehicleBooster}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  PutOnItems: {formatBytes(v.PutOnItemsSize)} | Color: {formatBytes(v.ColorSize)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ============ ITEMS LOG TAB ============ */}
                {activeTab === 'items' && (
                  <div className="card-ran">
                    <h3 className="font-display text-lg font-bold text-white mb-4">📦 ประวัติไอเทมล่าสุด</h3>
                    {character.itemLogs.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 font-thai">ไม่มีประวัติไอเทม</div>
                    ) : (
                      <div className="bg-ran-dark rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-ran-red/20">
                              <th className="p-3 text-left text-gray-400 font-thai">วันที่</th>
                              <th className="p-3 text-left text-gray-400 font-thai">ไอเทม</th>
                              <th className="p-3 text-left text-gray-400 font-thai">MID/SID</th>
                              <th className="p-3 text-left text-gray-400 font-thai">จำนวน</th>
                              <th className="p-3 text-left text-gray-400 font-thai">ATK/DEF</th>
                              <th className="p-3 text-left text-gray-400 font-thai">Element</th>
                            </tr>
                          </thead>
                          <tbody>
                            {character.itemLogs.map((log: any, i: number) => (
                              <tr key={i} className="border-b border-ran-red/10 hover:bg-ran-dark-50">
                                <td className="p-3 text-gray-300 whitespace-nowrap text-xs">
                                  {new Date(log.Date).toLocaleString('th-TH')}
                                </td>
                                <td className="p-3 text-white font-thai text-xs">{log.ItemName}</td>
                                <td className="p-3 text-gray-400 font-mono text-xs">{log.NIDMain}/{log.NIDSub}</td>
                                <td className="p-3 text-white text-xs">{log.ItemAmount}</td>
                                <td className="p-3 text-xs">
                                  <span className="text-red-400">{log.Damage}</span> / <span className="text-blue-400">{log.Defense}</span>
                                </td>
                                <td className="p-3 text-xs">
                                  <span className="text-orange-400">F:{log.Fire}</span>{' '}
                                  <span className="text-cyan-400">I:{log.Ice}</span>{' '}
                                  <span className="text-green-400">P:{log.Poison}</span>{' '}
                                  <span className="text-yellow-400">E:{log.Electric}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ============ BINARY DATA TAB ============ */}
                {activeTab === 'data' && (
                  <div className="card-ran">
                    <h3 className="font-display text-lg font-bold text-white mb-4">💾 ข้อมูล Binary (Item Storage)</h3>
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                      <p className="text-yellow-400 text-sm font-thai">
                        ⚠️ ไอเทมในเกมเก็บอยู่ในรูปแบบ Binary Blob ไม่สามารถอ่านค่าจากฐานข้อมูลได้โดยตรง
                        ต้องใช้ Game Server ในการถอดรหัส ข้อมูลด้านล่างแสดงขนาดข้อมูลแต่ละส่วน
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {[
                        ['ChaPutOnItems (ไอเทมสวมใส่)', character.PutOnItemsSize],
                        ['ChaInven (ช่องเก็บของ)', character.InvenSize],
                        ['ChaSkills (สกิลที่เรียน)', character.SkillsSize],
                        ['ChaSkillSlot (ช่องสกิล)', character.SkillSlotSize],
                        ['ChaQuest (เควส)', character.QuestSize],
                        ['ChaCoolTime (คูลดาวน์)', character.CoolTimeSize],
                      ].map(([label, size], i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-ran-dark rounded-lg">
                          <div>
                            <div className="text-white font-thai">{label}</div>
                            <div className="text-gray-500 text-xs mt-1">image (binary blob)</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${size > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                              {formatBytes(size as number)}
                            </div>
                            <div className="text-xs text-gray-500">{size ? Number(size).toLocaleString() : '0'} bytes</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-4 bg-ran-dark rounded-lg">
                      <h4 className="text-gray-400 mb-2 font-thai">ข้อมูลที่อ่านได้จาก Database:</h4>
                      <div className="grid md:grid-cols-3 gap-2 text-sm">
                        <div className="text-green-400">✅ ค่า Status ทั้งหมด</div>
                        <div className="text-green-400">✅ เงิน/คะแนนทุกประเภท</div>
                        <div className="text-green-400">✅ ตำแหน่ง Map/XYZ</div>
                        <div className="text-green-400">✅ PK สถิติ</div>
                        <div className="text-green-400">✅ สัตว์เลี้ยง (ชื่อ/Level/Skills)</div>
                        <div className="text-green-400">✅ ยานพาหนะ (ชื่อ/Battery)</div>
                        <div className="text-green-400">✅ ประวัติไอเทม (Logs)</div>
                        <div className="text-green-400">✅ ระบบล็อค</div>
                        <div className="text-yellow-400">⚠️ ไอเทมสวมใส่ (Binary)</div>
                        <div className="text-yellow-400">⚠️ ช่องเก็บของ (Binary)</div>
                        <div className="text-yellow-400">⚠️ สกิลที่เรียน (Binary)</div>
                        <div className="text-yellow-400">⚠️ ภารกิจ (Binary)</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
