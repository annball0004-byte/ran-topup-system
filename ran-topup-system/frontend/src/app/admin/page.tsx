'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import AdminSidebar from '@/components/AdminSidebar';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const CLASS_COLORS = [
  '#C41E3A', '#FF6B35', '#FFD700', '#00FF87', '#00BFFF', '#9B59B6', '#FF69B4', '#FFFFFF'
];

interface Stats {
  totalUsers: number;
  totalCharacters: number;
  totalGuilds: number;
  onlinePlayers: number;
  schoolDistribution: any[];
}

interface Charts {
  classDistribution: any[];
  levelDistribution: any[];
  onlineStatus: any[];
  recentLogins: any[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<Charts | null>(null);
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
    
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const [statsRes, chartsRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/charts`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const statsData = await statsRes.json();
      const chartsData = await chartsRes.json();
      if (statsData.success) setStats(statsData.stats);
      if (chartsData.success) setCharts(chartsData.charts);
    } catch (error) {
      console.error('Fetch data error');
    } finally {
      setLoading(false);
    }
  };

  const classChartData = charts ? {
    labels: charts.classDistribution.map(c => c.name),
    datasets: [{
      data: charts.classDistribution.map(c => c.count),
      backgroundColor: CLASS_COLORS.slice(0, charts.classDistribution.length),
      borderWidth: 0
    }]
  } : null;

  const levelChartData = charts ? {
    labels: charts.levelDistribution.map(c => c.name),
    datasets: [{
      label: 'จำนวนตัวละคร',
      data: charts.levelDistribution.map(c => c.count),
      backgroundColor: '#C41E3A80',
      borderColor: '#C41E3A',
      borderWidth: 1
    }]
  } : null;

  const onlineChartData = charts ? {
    labels: charts.onlineStatus.map(c => c.name),
    datasets: [{
      data: charts.onlineStatus.map(c => c.count),
      backgroundColor: charts.onlineStatus.map(c => c.name === 'Online' ? '#00FF8780' : '#FF6B3580'),
      borderWidth: 0
    }]
  } : null;

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#9CA3AF', font: { size: 11 }, padding: 12, usePointStyle: true }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: { ticks: { color: '#9CA3AF' }, grid: { color: '#1a1a2e' } },
      y: { ticks: { color: '#9CA3AF' }, grid: { color: '#1a1a2e' }, beginAtZero: true }
    }
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      <div className="flex">
        <AdminSidebar activePage="dashboard" />

        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-400 font-thai">ภาพรวมระบบเติมเงิน RAN Online</p>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={fetchData} className="btn-secondary px-3 py-1 text-sm">🔄</button>
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
                <div className="grid md:grid-cols-4 gap-4 mb-6">
                  <Link href="/admin/users" className="card-ran hover:border-ran-red/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-all">
                        <span className="text-2xl">👥</span>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{(stats?.totalUsers || 0).toLocaleString()}</div>
                        <div className="text-gray-400 text-sm font-thai">ผู้ใช้ทั้งหมด</div>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/admin/characters" className="card-ran hover:border-ran-red/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                        <span className="text-2xl">🎮</span>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{(stats?.totalCharacters || 0).toLocaleString()}</div>
                        <div className="text-gray-400 text-sm font-thai">ตัวละครทั้งหมด</div>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/admin/guilds" className="card-ran hover:border-ran-red/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:bg-purple-500/30 transition-all">
                        <span className="text-2xl">⚔️</span>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{(stats?.totalGuilds || 0).toLocaleString()}</div>
                        <div className="text-gray-400 text-sm font-thai">กิลด์ทั้งหมด</div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/admin/server" className="card-ran hover:border-ran-red/50 transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center group-hover:bg-green-500/30 transition-all">
                        <span className="text-2xl">🟢</span>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-400">{(stats?.onlinePlayers || 0).toLocaleString()}</div>
                        <div className="text-gray-400 text-sm font-thai">Online ตอนนี้</div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Charts Row */}
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  {/* Class Distribution Pie */}
                  <div className="card-ran">
                    <h3 className="font-display text-sm font-bold text-white mb-3">⚔️ สายอาชีพ</h3>
                    <div className="h-64">
                      {classChartData && <Pie data={classChartData} options={pieOptions} />}
                    </div>
                  </div>

                  {/* Level Distribution Bar */}
                  <div className="card-ran">
                    <h3 className="font-display text-sm font-bold text-white mb-3">📊 ระดับเลเวล</h3>
                    <div className="h-64">
                      {levelChartData && <Bar data={levelChartData} options={barOptions} />}
                    </div>
                  </div>

                  {/* Online Status Pie */}
                  <div className="card-ran">
                    <h3 className="font-display text-sm font-bold text-white mb-3">🟢 สถานะ Online/Offline</h3>
                    <div className="h-64">
                      {onlineChartData && <Pie data={onlineChartData} options={pieOptions} />}
                    </div>
                  </div>
                </div>

                {/* Recent Logins */}
                {charts && charts.recentLogins.length > 0 && (
                  <div className="card-ran mb-6">
                    <h3 className="font-display text-sm font-bold text-white mb-3">🕐 Login ล่าสุด</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {charts.recentLogins.map((login: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-ran-dark rounded-lg text-xs">
                          <span className="text-gray-500">{i + 1}.</span>
                          <span className="text-white font-bold truncate">{login.name}</span>
                          <span className="text-gray-500 ml-auto whitespace-nowrap">
                            {login.date ? new Date(login.date).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="card-ran">
                  <h3 className="font-display text-sm font-bold text-white mb-3">⚡ เมนูลัด</h3>
                  <div className="grid md:grid-cols-6 gap-3">
                    {[
                      { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users' },
                      { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters' },
                      { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds' },
                      { icon: '🎛️', label: 'GM Command', href: '/admin/gmc' },
                      { icon: '🛍️', label: 'ร้านค้า', href: '/admin/shop' },
                      { icon: '🔔', label: 'แจ้งเตือน', href: '/admin/alerts' },
                    ].map((item, i) => (
                      <Link key={i} href={item.href} className="p-3 bg-ran-dark rounded-lg hover:bg-ran-dark-50 transition-all text-center">
                        <span className="text-xl block mb-1">{item.icon}</span>
                        <span className="text-white text-xs font-thai">{item.label}</span>
                      </Link>
                    ))}
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
