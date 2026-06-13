'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('admin', JSON.stringify(data.user));
        router.push('/admin');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-ran-dark flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-ran-red/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-ran-red/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-ran-red rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">ADMIN PANEL</h1>
          <p className="text-gray-400 font-thai">ระบบจัดการ RAN TOP-UP</p>
        </div>
        
        {/* Login Form */}
        <div className="card-ran">
          <form onSubmit={handleLogin}>
            {error && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">ชื่อผู้ดูแล</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-ran"
                placeholder="กรอกชื่อผู้ดูแล"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-ran"
                placeholder="กรอกรหัสผ่าน"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-ran py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
        
        {/* Features */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[
            { icon: '📊', title: 'Dashboard', desc: 'สถิติและกราฟ' },
            { icon: '📦', title: 'จัดการคำสั่งซื้อ', desc: 'ดูและจัดการ Orders' },
            { icon: '👥', title: 'จัดการผู้ใช้', desc: 'ดูข้อมูลผู้ใช้' },
            { icon: '⚙️', title: 'ตั้งค่าระบบ', desc: 'Config และ Map คอลัมน์' },
          ].map((feature, i) => (
            <div key={i} className="card-ran text-center py-4">
              <span className="text-2xl">{feature.icon}</span>
              <h3 className="text-sm font-bold text-white mt-2">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-500 hover:text-white text-sm">
            ← กลับหน้าหลัก
          </Link>
        </div>
      </div>
    </main>
  );
}
