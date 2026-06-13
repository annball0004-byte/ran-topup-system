'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, gameCode: 'ran-online' })
      });
      
      const data = await res.json();
      
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/topup');
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
          <div className="w-16 h-16 bg-ran-red rounded-2xl flex items-center justify-center mx-auto mb-4 glow-effect">
            <span className="font-display font-bold text-2xl text-white">R</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">RAN TOP-UP</h1>
          <p className="text-gray-400 font-thai">เข้าสู่ระบบเติมเงิน</p>
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
              <label className="block text-sm text-gray-400 mb-2">ชื่อผู้ใช้</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-ran"
                placeholder="กรอกชื่อผู้ใช้"
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
          
          <div className="mt-6 text-center">
            <Link href="/register" className="text-ran-red hover:underline">
              สมัครสมาชิก
            </Link>
          </div>
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
