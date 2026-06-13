'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function AgentLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError('กรุณากรอกข้อมูลให้ครบ'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/agents/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('agentToken', data.token);
        localStorage.setItem('agent', JSON.stringify(data.agent));
        router.push('/agent/dashboard');
      } else {
        setError(data.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch { setError('เกิดข้อผิดพลาดในการเชื่อมต่อ'); }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-ran-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-ran-red rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🤖</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Agent Login</h1>
          <p className="text-gray-400 font-thai">เข้าสู่ระบบตัวแทนขายเติมเงิน</p>
        </div>
        <div className="card-ran">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm font-thai">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1 font-thai">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-3 text-white" autoFocus />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1 font-thai">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-3 text-white" />
            </div>
            <button onClick={handleLogin} disabled={loading}
              className="w-full btn-primary py-3 font-bold disabled:opacity-50">
              {loading ? '⏳ กำลังเข้าสู่ระบบ...' : '🚀 เข้าสู่ระบบ'}
            </button>
          </div>
          <div className="mt-4 text-center">
            <Link href="/admin/login" className="text-gray-500 text-sm hover:text-gray-300 font-thai">← กลับไป Admin Login</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
