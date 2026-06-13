'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MENU_ITEMS = [
  { icon: '📊', label: 'Dashboard', href: '/admin', key: 'dashboard' },
  { icon: '🔔', label: 'แจ้งเตือน', href: '/admin/alerts', key: 'alerts' },
  { icon: '🖥️', label: 'Server Status', href: '/admin/server', key: 'server' },
  { section: 'จัดการข้อมูล' },
  { icon: '👥', label: 'จัดการผู้ใช้', href: '/admin/users', key: 'users' },
  { icon: '🎮', label: 'ตัวละคร', href: '/admin/characters', key: 'characters' },
  { icon: '⚔️', label: 'กิลด์', href: '/admin/guilds', key: 'guilds' },
  { section: 'เครื่องมือ GM' },
  { icon: '🎛️', label: 'GM Command', href: '/admin/gmc', key: 'gmc' },
  { icon: '🔍', label: 'ตรวจสอบไอเทม', href: '/admin/inspect', key: 'inspect' },
  { icon: '📋', label: 'GM Logs', href: '/admin/gmlogs', key: 'gmlogs' },
  { section: 'ร้านค้า & ธุรกรรม' },
  { icon: '🛍️', label: 'จัดการร้านค้า', href: '/admin/shop', key: 'shop' },
  { icon: '📦', label: 'ประวัติคำสั่งซื้อ', href: '/admin/order-history', key: 'order-history' },
  { icon: '🤖', label: 'จัดการ Agent', href: '/admin/agents', key: 'agents' },
  { section: 'ระบบ' },
  { icon: '🔎', label: 'ค้นหาขั้นสูง', href: '/admin/search', key: 'search' },
  { icon: '⚙️', label: 'ตั้งค่าทั่วไป', href: '/admin/settings', key: 'settings' },
  { icon: '💳', label: 'ตั้งค่าเติมเงิน', href: '/admin/settings/payment', key: 'settings-payment' },
  { icon: '💰', label: 'ค่าคอมมิชชั่น', href: '/admin/settings/commission', key: 'settings-commission' },
  { icon: '🤖', label: 'Agent Login', href: '/agent/login', key: 'agent-login' },
];

interface AdminSidebarProps {
  activePage: string;
}

export default function AdminSidebar({ activePage }: AdminSidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    router.push('/admin/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="p-5 border-b border-ran-red/20">
        <Link href="/admin" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-ran-red rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="font-display font-bold text-white text-lg">R</span>
          </div>
          <div>
            <span className="font-display font-bold text-lg text-white block leading-tight">RAN TOP-UP</span>
            <span className="text-[10px] text-gray-500 font-thai">Admin Panel v1.0</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {MENU_ITEMS.map((item, i) => {
            if ('section' in item && item.section) {
              return (
                <div key={`section-${i}`} className="pt-4 pb-1 px-3">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider font-thai">{item.section}</span>
                </div>
              );
            }
            if ('href' in item) {
              const isActive = activePage === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-thai text-sm">{item.label}</span>
                </Link>
              );
            }
            return null;
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-ran-red/20">
        <button onClick={handleLogout} className="sidebar-item w-full text-left text-red-400 hover:text-red-300">
          <span className="text-lg">🚪</span>
          <span className="font-thai text-sm">ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
