'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Stats {
  totalUsers: number;
  totalCharacters: number;
  totalGuilds: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    
    const adminData = localStorage.getItem('admin');
    if (adminData) {
      try {
        const admin = JSON.parse(adminData);
        setAdminName(admin.fullName || admin.username || 'Admin');
      } catch {}
    }
    
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (error) {
      console.error('Fetch stats error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    router.push('/admin/login');
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
                { icon: '📊', label: 'Dashboard', href: '/admin', active: true },
                { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
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
            <button onClick={handleLogout} className="sidebar-item w-full text-left">
              <span className="text-xl">🚪</span>
              <span className="font-thai">ออกจากระบบ</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400 font-thai">ภาพรวมระบบเติมเงิน RAN Online</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-400">👤 {adminName}</span>
              </div>
            </div>
          </header>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-20 text-gray-400">⏳ กำลังโหลด...</div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <Link href="/admin/users" className="card-ran hover:border-ran-red/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                        <span className="text-3xl">👥</span>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">{(stats?.totalUsers || 0).toLocaleString()}</div>
                        <div className="text-gray-400 font-thai">ผู้ใช้ทั้งหมด</div>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/admin/characters" className="card-ran hover:border-ran-red/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                        <span className="text-3xl">🎮</span>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">{(stats?.totalCharacters || 0).toLocaleString()}</div>
                        <div className="text-gray-400 font-thai">ตัวละครทั้งหมด</div>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/admin/guilds" className="card-ran hover:border-ran-red/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-all">
                        <span className="text-3xl">⚔️</span>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-white">{(stats?.totalGuilds || 0).toLocaleString()}</div>
                        <div className="text-gray-400 font-thai">กิลด์ทั้งหมด</div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Quick Actions */}
                <div className="card-ran mb-8">
                  <h3 className="font-display text-lg font-bold text-white mb-4">⚡ เมนูลัด</h3>
                  <div className="grid md:grid-cols-4 gap-4">
                    <Link href="/admin/users" className="p-4 bg-ran-dark rounded-lg hover:bg-ran-dark-50 transition-all text-center">
                      <span className="text-2xl block mb-2">👥</span>
                      <span className="text-white font-thai">จัดการผู้ใช้</span>
                    </Link>
                    <Link href="/admin/characters" className="p-4 bg-ran-dark rounded-lg hover:bg-ran-dark-50 transition-all text-center">
                      <span className="text-2xl block mb-2">🎮</span>
                      <span className="text-white font-thai">จัดการตัวละคร</span>
                    </Link>
                    <Link href="/admin/guilds" className="p-4 bg-ran-dark rounded-lg hover:bg-ran-dark-50 transition-all text-center">
                      <span className="text-2xl block mb-2">⚔️</span>
                      <span className="text-white font-thai">จัดการกิลด์</span>
                    </Link>
                    <Link href="/admin/settings" className="p-4 bg-ran-dark rounded-lg hover:bg-ran-dark-50 transition-all text-center">
                      <span className="text-2xl block mb-2">⚙️</span>
                      <span className="text-white font-thai">ตั้งค่าระบบ</span>
                    </Link>
                  </div>
                </div>

                {/* System Info */}
                <div className="card-ran">
                  <h3 className="font-display text-lg font-bold text-white mb-4">ℹ️ ข้อมูลระบบ</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-ran-dark rounded-lg">
                      <p className="text-gray-400 text-sm">Backend Server</p>
                      <p className="text-white font-mono">localhost:3001</p>
                    </div>
                    <div className="p-4 bg-ran-dark rounded-lg">
                      <p className="text-gray-400 text-sm">Frontend Server</p>
                      <p className="text-white font-mono">localhost:3000</p>
                    </div>
                    <div className="p-4 bg-ran-dark rounded-lg">
                      <p className="text-gray-400 text-sm">Database</p>
                      <p className="text-green-400 font-mono">Connected ✓</p>
                    </div>
                    <div className="p-4 bg-ran-dark rounded-lg">
                      <p className="text-gray-400 text-sm">Version</p>
                      <p className="text-white font-mono">RAN TOP-UP PRO v1.0</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
