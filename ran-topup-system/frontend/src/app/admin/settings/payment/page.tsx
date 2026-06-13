'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface PaymentConfig {
  enabled: boolean;
  provider: 'maemanee' | 'normal';
  maemanee: { username: string; password: string; conId: string };
  normal: { username: string; password: string; conId: string; accode: string; promptpayId: string; promptpayType: '01' | '02' | '03'; accountNo: string };
}

const defaultConfig: PaymentConfig = {
  enabled: false,
  provider: 'maemanee',
  maemanee: { username: '', password: '', conId: '' },
  normal: { username: '', password: '', conId: '', accode: '', promptpayId: '', promptpayType: '01', accountNo: '' }
};

export default function PaymentSettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<PaymentConfig>(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) { router.push('/admin/login'); return; }
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/payment-config/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setConfig(data.config);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/payment-config/config`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) alert('บันทึกสำเร็จ!');
    } catch (error) { alert('เกิดข้อผิดพลาด'); }
    setSaving(false);
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('adminToken');
      const endpoint = config.provider === 'maemanee'
        ? '/payment-config/test/maemanee'
        : '/payment-config/test/normal';
      const creds = config.provider === 'maemanee' ? config.maemanee : config.normal;

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.message });
    } catch (error) {
      setTestResult({ success: false, message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
    }
    setTestLoading(false);
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      <div className="flex">
        <AdminSidebar activePage="settings" />
        <div className="flex-1 ml-64">
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">💳 ตั้งค่าระบบเติมเงิน (PromptPay)</h1>
                <p className="text-gray-400 font-thai">ตั้งค่า API พร้อมเพย์ แม่มณี หรือ ธรรมดา — ระบบจะใช้ตามที่เลือกอัตโนมัติ</p>
              </div>
              <div className="flex gap-3">
                <button onClick={handleTest} disabled={testLoading}
                  className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg text-sm hover:bg-blue-500/30 disabled:opacity-50">
                  {testLoading ? '⏳ กำลังทดสอบ...' : '🧪 ทดสอบ API'}
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50">
                  {saving ? '⏳ กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
                </button>
              </div>
            </div>
          </header>

          <div className="p-6 max-w-4xl">
            {loading ? (
              <div className="text-center py-20 text-gray-400">⏳ กำลังโหลด...</div>
            ) : (
              <div className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="card-ran">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">เปิด/ปิด ระบบเติมเงิน</h3>
                      <p className="text-gray-400 text-sm font-thai">ปิด = ผู้ใช้ไม่สามารถเติมเงินได้</p>
                    </div>
                    <button onClick={() => setConfig({...config, enabled: !config.enabled})}
                      className={`w-16 h-8 rounded-full transition-all relative ${config.enabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                      <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${config.enabled ? 'left-9' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className={`mt-3 p-3 rounded-lg text-sm font-thai ${config.enabled ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {config.enabled ? '✅ ระบบเติมเงินเปิดใช้งาน' : '❌ ระบบเติมเงินปิดอยู่'}
                  </div>
                </div>

                {/* Provider Selection */}
                <div className="card-ran">
                  <h3 className="font-display text-lg font-bold text-white mb-4">เลือก API ผู้ให้บริการ</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setConfig({...config, provider: 'maemanee'})}
                      className={`p-6 rounded-xl border-2 text-left transition-all ${
                        config.provider === 'maemanee'
                          ? 'border-ran-red bg-ran-red/10'
                          : 'border-gray-700 hover:border-gray-500'
                      }`}>
                      <div className="text-2xl mb-2">🏦</div>
                      <div className="font-display font-bold text-white text-lg">พร้อมเพย์ แม่มณี</div>
                      <div className="text-gray-400 text-sm font-thai mt-1">รับเงินผ่านบิลแม่มณี / พร้อมเพย์</div>
                      <div className="text-gray-500 text-xs mt-2">api_mn.php</div>
                    </button>
                    <button onClick={() => setConfig({...config, provider: 'normal'})}
                      className={`p-6 rounded-xl border-2 text-left transition-all ${
                        config.provider === 'normal'
                          ? 'border-ran-red bg-ran-red/10'
                          : 'border-gray-700 hover:border-gray-500'
                      }`}>
                      <div className="text-2xl mb-2">📱</div>
                      <div className="font-display font-bold text-white text-lg">พร้อมเพย์ ธรรมดา</div>
                      <div className="text-gray-400 text-sm font-thai mt-1">QR พร้อมเพย์เบอร์โทร / เลขบัตร / E-wallet</div>
                      <div className="text-gray-500 text-xs mt-2">apipp.php</div>
                    </button>
                  </div>
                </div>

                {/* Test Result */}
                {testResult && (
                  <div className={`card-ran border-l-4 ${testResult.success ? 'border-green-500 bg-green-500/5' : 'border-red-500 bg-red-500/5'}`}>
                    <div className={`font-bold ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                      {testResult.success ? '✅ สำเร็จ' : '❌ ล้มเหลว'}
                    </div>
                    <div className="text-gray-300 text-sm mt-1">{testResult.message}</div>
                  </div>
                )}

                {/* Maemanee Config */}
                {config.provider === 'maemanee' && (
                  <div className="card-ran">
                    <h3 className="font-display text-lg font-bold text-white mb-4">🏦 ตั้งค่า API แม่มณี</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1 font-thai">Username (tmweasy_user)</label>
                        <input type="text" value={config.maemanee.username}
                          onChange={e => setConfig({...config, maemanee: {...config.maemanee, username: e.target.value}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1 font-thai">Password</label>
                        <input type="password" value={config.maemanee.password}
                          onChange={e => setConfig({...config, maemanee: {...config.maemanee, password: e.target.value}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-gray-400 text-sm mb-1 font-thai">Con ID (จากหน้า Setting แม่มณี)</label>
                        <input type="text" value={config.maemanee.conId}
                          onChange={e => setConfig({...config, maemanee: {...config.maemanee, conId: e.target.value}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-ran-dark rounded-lg">
                      <p className="text-gray-500 text-xs font-thai">
                        📌 ขั้นตอน: Create Pay → ลูกค้าโอน → Confirm → ระบบตัดยอดอัตโนมัติ
                      </p>
                    </div>
                  </div>
                )}

                {/* Normal Config */}
                {config.provider === 'normal' && (
                  <div className="card-ran">
                    <h3 className="font-display text-lg font-bold text-white mb-4">📱 ตั้งค่า API ธรรมดา</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1 font-thai">Username (tmweasy_user)</label>
                        <input type="text" value={config.normal.username}
                          onChange={e => setConfig({...config, normal: {...config.normal, username: e.target.value}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1 font-thai">Password</label>
                        <input type="password" value={config.normal.password}
                          onChange={e => setConfig({...config, normal: {...config.normal, password: e.target.value}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1 font-thai">Con ID (จากหน้า Setting พร้อมเพย์ QR)</label>
                        <input type="text" value={config.normal.conId}
                          onChange={e => setConfig({...config, normal: {...config.normal, conId: e.target.value}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1 font-thai">Accode (โค้ดเข้ารหัส ID/Password ธนาคาร)</label>
                        <input type="text" value={config.normal.accode}
                          onChange={e => setConfig({...config, normal: {...config.normal, accode: e.target.value}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1 font-thai">PromptPay ID (เบอร์โทร / เลขบัตร / E-wallet)</label>
                        <input type="text" value={config.normal.promptpayId}
                          onChange={e => setConfig({...config, normal: {...config.normal, promptpayId: e.target.value}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1 font-thai">ประเภท PromptPay</label>
                        <select value={config.normal.promptpayType}
                          onChange={e => setConfig({...config, normal: {...config.normal, promptpayType: e.target.value as any}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white">
                          <option value="01">เบอร์โทร</option>
                          <option value="02">เลขบัตร ปชช</option>
                          <option value="03">E-wallet</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-gray-400 text-sm mb-1 font-thai">เลขบัญชีธนาคาร (10 หลัก)</label>
                        <input type="text" maxLength={10} value={config.normal.accountNo}
                          onChange={e => setConfig({...config, normal: {...config.normal, accountNo: e.target.value}})}
                          className="w-full bg-ran-dark border border-ran-red/20 rounded-lg px-4 py-2 text-white" placeholder="เช่น 1234567890" />
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-ran-dark rounded-lg">
                      <p className="text-gray-500 text-xs font-thai">
                        📌 ขั้นตอน: Create Pay → สร้าง QR → ลูกค้าสแกน → Confirm → ตัดยอดอัตโนมัติ
                      </p>
                    </div>
                  </div>
                )}

                {/* Topup History */}
                <TopupHistory />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function TopupHistory() {
  const [topups, setTopups] = useState<any[]>([]);

  useEffect(() => {
    fetchTopups();
  }, []);

  const fetchTopups = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${API_URL}/topup/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setTopups(data.topups);
    } catch (error) { console.error(error); }
  };

  if (topups.length === 0) return null;

  return (
    <div className="card-ran">
      <h3 className="font-display text-lg font-bold text-white mb-4">📋 รายการเติมเงินล่าสุด</h3>
      <div className="space-y-2">
        {topups.slice(0, 10).map(topup => (
          <div key={topup.id} className={`flex items-center justify-between p-3 rounded-lg border ${
            topup.status === 'paid' ? 'border-green-500/20 bg-green-500/5' :
            topup.status === 'cancelled' ? 'border-red-500/20 bg-red-500/5' :
            'border-yellow-500/20 bg-yellow-500/5'
          }`}>
            <div>
              <span className="text-white font-mono text-xs">{topup.id}</span>
              <span className="text-gray-400 text-xs ml-2">by {topup.userId}</span>
            </div>
            <div className="text-yellow-400 font-bold">฿{topup.amount.toLocaleString()}</div>
            <div className={`text-xs font-bold ${
              topup.status === 'paid' ? 'text-green-400' :
              topup.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {topup.status === 'paid' ? '✅ ชำระแล้ว' : topup.status === 'cancelled' ? '❌ ยกเลิก' : '⏳ รอชำระ'}
            </div>
            <div className="text-gray-500 text-xs">{new Date(topup.createdAt).toLocaleString('th-TH')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
