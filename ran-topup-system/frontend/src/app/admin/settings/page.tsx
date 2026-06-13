'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminSidebar from '@/components/AdminSidebar';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

interface ColumnMapping {
  userTable: string;
  userId: string;
  userName: string;
  userPoint: string;
  userStatus: string;
  charTable: string;
  charId: string;
  charUserId: string;
  charName: string;
  charLevel: string;
  charClass: string;
  topupTable: string;
  topupUserId: string;
  topupAmount: string;
  topupPoint: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'database' | 'mapping' | 'games'>('database');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  // Database Config
  const [dbConfig, setDbConfig] = useState<DatabaseConfig>({
    host: 'localhost',
    port: 1433,
    database: 'RanGame1',
    user: 'sa',
    password: ''
  });

  // Column Mapping
  const [mapping, setMapping] = useState<ColumnMapping>({
    userTable: 'UserInfo',
    userId: 'UserID',
    userName: 'UserName',
    userPoint: 'Point',
    userStatus: 'Status',
    charTable: 'ChaInfo',
    charId: 'ChaGUID',
    charUserId: 'UsrUID',
    charName: 'ChaName',
    charLevel: 'ChaLevel',
    charClass: 'ChaClass',
    topupTable: 'TopUp',
    topupUserId: 'UsrUID',
    topupAmount: 'Amount',
    topupPoint: 'Point'
  });

  // Game presets
  const presets = [
    {
      name: 'RAN Online (MSSQL)',
      db: { host: 'localhost', port: 1433, database: 'RanGame1', user: 'sa', password: '' },
      mapping: {
        userTable: 'UserInfo', userId: 'UserID', userName: 'UserName', userPoint: 'Point', userStatus: 'Status',
        charTable: 'ChaInfo', charId: 'ChaGUID', charUserId: 'UsrUID', charName: 'ChaName', charLevel: 'ChaLevel', charClass: 'ChaClass',
        topupTable: 'TopUp', topupUserId: 'UsrUID', topupAmount: 'Amount', topupPoint: 'Point'
      }
    },
    {
      name: 'Custom Game (MySQL)',
      db: { host: 'localhost', port: 3306, database: 'game_db', user: 'root', password: '' },
      mapping: {
        userTable: 'users', userId: 'id', userName: 'username', userPoint: 'cash', userStatus: 'status',
        charTable: 'characters', charId: 'id', charUserId: 'user_id', charName: 'name', charLevel: 'level', charClass: 'class_id',
        topupTable: 'transactions', topupUserId: 'user_id', topupAmount: 'amount', topupPoint: 'point'
      }
    }
  ];

  const handleTestConnection = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/settings/test-db`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dbConfig)
      });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, message: 'ไม่สามารถเชื่อมต่อ Server ได้' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/admin/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ database: dbConfig, columnMapping: mapping })
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setDbConfig(preset.db);
    setMapping(preset.mapping);
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      <div className="flex">
        <AdminSidebar activePage="settings" />

        {/* Main Content */}
        <div className="flex-1 ml-64">
          {/* Header */}
          <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-display text-2xl font-bold text-white">⚙️ ตั้งค่าระบบ</h1>
                <p className="text-gray-400 font-thai">เชื่อมต่อฐานข้อมูลเกมและตั้งค่า Column Mapping</p>
              </div>
              <button onClick={handleSaveSettings} disabled={loading} className="btn-ran">
                {loading ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
              </button>
            </div>
          </header>

          <div className="p-6">
            {saved && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
                ✅ บันทึกการตั้งค่าสำเร็จ! กรุณา restart backend server เพื่อให้การตั้งค่ามีผล
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setActiveTab('database')}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  activeTab === 'database' ? 'bg-ran-red text-white' : 'bg-ran-dark-100 text-gray-400 hover:text-white'
                }`}
              >
                🗄️ เชื่อมต่อฐานข้อมูล
              </button>
              <button
                onClick={() => setActiveTab('mapping')}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  activeTab === 'mapping' ? 'bg-ran-red text-white' : 'bg-ran-dark-100 text-gray-400 hover:text-white'
                }`}
              >
                🗺️ Column Mapping
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`px-6 py-3 rounded-lg font-bold transition-all ${
                  activeTab === 'games' ? 'bg-ran-red text-white' : 'bg-ran-dark-100 text-gray-400 hover:text-white'
                }`}
              >
                🎮 Preset เกม
              </button>
            </div>

            {/* Database Tab */}
            {activeTab === 'database' && (
              <div className="card-ran">
                <h2 className="font-display text-xl font-bold mb-6">ตั้งค่าการเชื่อมต่อฐานข้อมูล</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Database Server (Host/IP)</label>
                    <input
                      type="text"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      className="input-ran"
                      placeholder="localhost หรือ 192.168.1.100"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Port</label>
                    <input
                      type="number"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: parseInt(e.target.value) })}
                      className="input-ran"
                      placeholder="1433 (MSSQL) / 3306 (MySQL)"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Database Name</label>
                    <input
                      type="text"
                      value={dbConfig.database}
                      onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                      className="input-ran"
                      placeholder="RanGame1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Username</label>
                    <input
                      type="text"
                      value={dbConfig.user}
                      onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                      className="input-ran"
                      placeholder="sa"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm text-gray-400 mb-2">Password</label>
                    <input
                      type="password"
                      value={dbConfig.password}
                      onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                      className="input-ran"
                      placeholder="รหัสผ่าน database"
                    />
                  </div>
                </div>
                
                <div className="mt-6 flex gap-4">
                  <button
                    onClick={handleTestConnection}
                    disabled={loading}
                    className="btn-outline"
                  >
                    {loading ? 'กำลังทดสอบ...' : '🔗 ทดสอบการเชื่อมต่อ'}
                  </button>
                </div>
                
                {testResult && (
                  <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-red-500/20 border border-red-500 text-red-400'}`}>
                    {testResult.success ? '✅ ' : '❌ '}{testResult.message}
                  </div>
                )}
              </div>
            )}

            {/* Column Mapping Tab */}
            {activeTab === 'mapping' && (
              <div className="space-y-6">
                {/* User Table */}
                <div className="card-ran">
                  <h2 className="font-display text-xl font-bold mb-6">👤 User Table (ข้อมูลผู้ใช้)</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Table Name</label>
                      <input type="text" value={mapping.userTable} onChange={(e) => setMapping({ ...mapping, userTable: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">User ID Column</label>
                      <input type="text" value={mapping.userId} onChange={(e) => setMapping({ ...mapping, userId: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">User Name Column</label>
                      <input type="text" value={mapping.userName} onChange={(e) => setMapping({ ...mapping, userName: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Point Balance Column</label>
                      <input type="text" value={mapping.userPoint} onChange={(e) => setMapping({ ...mapping, userPoint: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Status Column</label>
                      <input type="text" value={mapping.userStatus} onChange={(e) => setMapping({ ...mapping, userStatus: e.target.value })} className="input-ran" />
                    </div>
                  </div>
                </div>

                {/* Character Table */}
                <div className="card-ran">
                  <h2 className="font-display text-xl font-bold mb-6">🎮 Character Table (ตัวละคร)</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Table Name</label>
                      <input type="text" value={mapping.charTable} onChange={(e) => setMapping({ ...mapping, charTable: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Character ID Column</label>
                      <input type="text" value={mapping.charId} onChange={(e) => setMapping({ ...mapping, charId: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">User ID FK Column</label>
                      <input type="text" value={mapping.charUserId} onChange={(e) => setMapping({ ...mapping, charUserId: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Character Name Column</label>
                      <input type="text" value={mapping.charName} onChange={(e) => setMapping({ ...mapping, charName: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Level Column</label>
                      <input type="text" value={mapping.charLevel} onChange={(e) => setMapping({ ...mapping, charLevel: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Class Column</label>
                      <input type="text" value={mapping.charClass} onChange={(e) => setMapping({ ...mapping, charClass: e.target.value })} className="input-ran" />
                    </div>
                  </div>
                </div>

                {/* TopUp Table */}
                <div className="card-ran">
                  <h2 className="font-display text-xl font-bold mb-6">💰 TopUp Table (รายการเติมเงิน)</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Table Name</label>
                      <input type="text" value={mapping.topupTable} onChange={(e) => setMapping({ ...mapping, topupTable: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">User ID FK Column</label>
                      <input type="text" value={mapping.topupUserId} onChange={(e) => setMapping({ ...mapping, topupUserId: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Amount Column</label>
                      <input type="text" value={mapping.topupAmount} onChange={(e) => setMapping({ ...mapping, topupAmount: e.target.value })} className="input-ran" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Point Column</label>
                      <input type="text" value={mapping.topupPoint} onChange={(e) => setMapping({ ...mapping, topupPoint: e.target.value })} className="input-ran" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preset Tab */}
            {activeTab === 'games' && (
              <div className="card-ran">
                <h2 className="font-display text-xl font-bold mb-6">🎮 Preset สำเร็จรูป</h2>
                <p className="text-gray-400 mb-6">เลือก preset เพื่อตั้งค่าอัตโนมัติตามเกมที่ต้องการ</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {presets.map((preset, i) => (
                    <div key={i} className="p-6 bg-ran-dark rounded-xl border border-gray-700 hover:border-ran-red cursor-pointer transition-all" onClick={() => applyPreset(preset)}>
                      <h3 className="font-bold text-white text-lg mb-2">{preset.name}</h3>
                      <p className="text-gray-400 text-sm">
                        DB: {preset.db.host}:{preset.db.port}/{preset.db.database}
                      </p>
                      <p className="text-gray-400 text-sm">
                        User Table: {preset.mapping.userTable}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Char Table: {preset.mapping.charTable}
                      </p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-ran-dark rounded-xl border border-gray-700">
                  <h3 className="font-bold text-white mb-2">📖 วิธีใช้งาน</h3>
                  <ol className="text-gray-400 text-sm space-y-2">
                    <li>1. ไปที่แท็บ "เชื่อมต่อฐานข้อมูล" กรอกข้อมูล server ของเกม</li>
                    <li>2. กด "ทดสอบการเชื่อมต่อ" เพื่อตรวจสอบว่าเชื่อมต่อได้</li>
                    <li>3. ไปที่แท็บ "Column Mapping" ตั้งค่าชื่อ Table และ Column ให้ตรงกับเกม</li>
                    <li>4. กด "บันทึกการตั้งค่า" แล้ว restart backend server</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
