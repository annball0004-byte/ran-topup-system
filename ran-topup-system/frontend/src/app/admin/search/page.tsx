'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const CLASS_MAP: Record<number, string> = {
  1: 'Brawler', 2: 'Knight', 4: 'Archer', 8: 'Shaman',
  16: 'Extreme', 32: 'Extreme', 64: 'Gunner', 128: 'Assassin', 256: 'Pritti'
};

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState<{ users: any[]; characters: any[]; guilds: any[] }>({ users: [], characters: [], guilds: [] });
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
  }, []);

  const search = async () => {
    if (!query || query.length < 2) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/search?q=${encodeURIComponent(query)}&type=${searchType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        setTotal(data.total);
      }
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
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
                { icon: '🖥️', label: 'Server Status', href: '/admin/server' },
                { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect' },
                { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop' },
                { icon: '🤖', label: 'จัดการ Agent', href: '/admin/agents' },
                { icon: '📋', label: 'GM Logs', href: '/admin/gmlogs' },
                { icon: '🔎', label: 'ค้นหาขั้นสูง', href: '/admin/search', active: true },
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
            <div>
              <h1 className="font-display text-2xl font-bold text-white">🔎 ค้นหาขั้นสูง</h1>
              <p className="text-gray-400 font-thai">ค้นหาผู้เล่น ตัวละคร กิลด์ ในที่เดียว</p>
            </div>
          </header>

          <div className="p-6">
            {/* Search Bar */}
            <div className="card-ran mb-6">
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleSearch}
                  placeholder="พิมพ์ชื่อผู้ใช้, ชื่อตัวละคร, หรือชื่อกิลด์..."
                  className="flex-1 bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-3 text-white font-thai text-lg focus:border-ran-red outline-none"
                />
                <button onClick={search} disabled={loading || query.length < 2}
                  className="btn-primary px-8 py-3 text-lg disabled:opacity-50">
                  {loading ? '⏳' : '🔍'} ค้นหา
                </button>
              </div>
              <div className="flex gap-4">
                {[
                  { value: 'all', label: 'ทั้งหมด', icon: '🌍' },
                  { value: 'users', label: 'ผู้ใช้', icon: '👤' },
                  { value: 'characters', label: 'ตัวละคร', icon: '🎮' },
                  { value: 'guilds', label: 'กิลด์', icon: '⚔️' },
                ].map(t => (
                  <button key={t.value} onClick={() => { setSearchType(t.value); }}
                    className={`px-4 py-2 rounded-lg font-thai text-sm transition-all ${
                      searchType === t.value ? 'bg-ran-red text-white' : 'bg-ran-dark text-gray-400 hover:bg-ran-dark-50'
                    }`}>
                    {t.icon} {t.label}
                  </button>
                ))}
                {total > 0 && <span className="text-gray-400 font-thai self-center">พบ {total} ผลลัพธ์</span>}
              </div>
            </div>

            {/* Users Results */}
            {results.users.length > 0 && (
              <div className="card-ran mb-6">
                <h3 className="font-display text-lg font-bold text-white mb-4">👤 ผู้ใช้ ({results.users.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ran-red/20">
                        <th className="p-3 text-left text-gray-400 font-thai">UserID</th>
                        <th className="p-3 text-left text-gray-400 font-thai">UserName</th>
                        <th className="p-3 text-left text-gray-400 font-thai">Point</th>
                        <th className="p-3 text-left text-gray-400 font-thai">VotePoint</th>
                        <th className="p-3 text-left text-gray-400 font-thai">ตัวละคร</th>
                        <th className="p-3 text-left text-gray-400 font-thai">Level สูงสุด</th>
                        <th className="p-3 text-left text-gray-400 font-thai">สถานะ</th>
                        <th className="p-3 text-left text-gray-400 font-thai">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.users.map(user => (
                        <tr key={user.UserNum} className="border-b border-ran-red/10 hover:bg-ran-dark-50">
                          <td className="p-3 text-white font-mono">{user.UserID}</td>
                          <td className="p-3 text-gray-300 font-thai">{user.UserName}</td>
                          <td className="p-3 text-yellow-400 font-bold">{user.UserPoint?.toLocaleString()}</td>
                          <td className="p-3 text-cyan-400">{user.VotePoint?.toLocaleString()}</td>
                          <td className="p-3 text-white">{user.charCount}</td>
                          <td className="p-3 text-green-400">Lv.{user.maxLevel}</td>
                          <td className="p-3">
                            {user.onlineCount > 0 ? (
                              <span className="text-green-400">🟢 {user.onlineCount} online</span>
                            ) : (
                              <span className="text-gray-500">⚫ offline</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Link href={`/admin/inspect?search=${user.UserID}`} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30">
                              ตรวจสอบ
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Characters Results */}
            {results.characters.length > 0 && (
              <div className="card-ran mb-6">
                <h3 className="font-display text-lg font-bold text-white mb-4">🎮 ตัวละคร ({results.characters.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ran-red/20">
                        <th className="p-3 text-left text-gray-400 font-thai">ชื่อตัวละคร</th>
                        <th className="p-3 text-left text-gray-400 font-thai">Level</th>
                        <th className="p-3 text-left text-gray-400 font-thai">คลาส</th>
                        <th className="p-3 text-left text-gray-400 font-thai">UserID</th>
                        <th className="p-3 text-left text-gray-400 font-thai">เงิน</th>
                        <th className="p-3 text-left text-gray-400 font-thai">PK</th>
                        <th className="p-3 text-left text-gray-400 font-thai">กิลด์</th>
                        <th className="p-3 text-left text-gray-400 font-thai">สถานะ</th>
                        <th className="p-3 text-left text-gray-400 font-thai">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.characters.map(cha => (
                        <tr key={cha.ChaNum} className="border-b border-ran-red/10 hover:bg-ran-dark-50">
                          <td className="p-3 text-white font-thai">{cha.ChaName}</td>
                          <td className="p-3 text-yellow-400 font-bold">{cha.ChaLevel}</td>
                          <td className="p-3 text-gray-300 font-thai text-xs">{CLASS_MAP[cha.ChaClass] || cha.ChaClass}</td>
                          <td className="p-3 text-ran-red">{cha.UserID}</td>
                          <td className="p-3 text-green-400">{cha.ChaMoney?.toLocaleString()}</td>
                          <td className="p-3 text-red-400">{cha.ChaPK}</td>
                          <td className="p-3 text-purple-400 font-thai">{cha.GuildName || '-'}</td>
                          <td className="p-3">
                            {cha.ChaOnline ? (
                              <span className="text-green-400">🟢 Online</span>
                            ) : (
                              <span className="text-gray-500">⚫ Offline</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Link href={`/admin/characters?search=${cha.ChaName}`} className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs hover:bg-yellow-500/30">
                              แก้ไข
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Guilds Results */}
            {results.guilds.length > 0 && (
              <div className="card-ran mb-6">
                <h3 className="font-display text-lg font-bold text-white mb-4">⚔️ กิลด์ ({results.guilds.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ran-red/20">
                        <th className="p-3 text-left text-gray-400 font-thai">ชื่อกิลด์</th>
                        <th className="p-3 text-left text-gray-400 font-thai">Level</th>
                        <th className="p-3 text-left text-gray-400 font-thai">สมาชิก</th>
                        <th className="p-3 text-left text-gray-400 font-thai">เงินกิลด์</th>
                        <th className="p-3 text-left text-gray-400 font-thai">นายก</th>
                        <th className="p-3 text-left text-gray-400 font-thai">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.guilds.map(gu => (
                        <tr key={gu.GuNum} className="border-b border-ran-red/10 hover:bg-ran-dark-50">
                          <td className="p-3 text-white font-thai">{gu.GuName}</td>
                          <td className="p-3 text-yellow-400 font-bold">Lv.{gu.GuRank}</td>
                          <td className="p-3 text-white">{gu.MemberCount}</td>
                          <td className="p-3 text-green-400">{gu.GuMoney?.toLocaleString()}</td>
                          <td className="p-3 text-ran-red">{gu.MasterName} ({gu.MasterUserID})</td>
                          <td className="p-3">
                            <Link href={`/admin/guilds?search=${gu.GuName}`} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30">
                              ดูรายละเอียด
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No results */}
            {!loading && query.length >= 2 && total === 0 && (
              <div className="card-ran text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <div className="text-gray-400 font-thai text-lg">ไม่พบผลลัพธ์สำหรับ &quot;{query}&quot;</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
