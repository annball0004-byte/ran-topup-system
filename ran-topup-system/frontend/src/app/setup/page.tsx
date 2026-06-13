'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ServerConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

interface DatabaseConfig {
  gameDB: string;
  userDB: string;
  logDB: string;
  shopDB: string;
}

interface TableMapping {
  tableName: string;
  columns: Record<string, string>;
  conditions: string;
}

interface ColumnMapping {
  // RanGame1 tables
  chaInfo: TableMapping;
  guildInfo: TableMapping;
  // RanUser tables
  userInfo: TableMapping;
  topUp: TableMapping;
  serverGroup: TableMapping;
  // RanLog tables
  logItemExchange: TableMapping;
  // RanShop tables
  shopPurchase: TableMapping;
}

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  columns?: string[];
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeDbTab, setActiveDbTab] = useState<'game' | 'user' | 'log' | 'shop'>('game');

  // Server Config
  const [server, setServer] = useState<ServerConfig>({
    host: 'localhost',
    port: 1433,
    user: 'sa',
    password: ''
  });

  // Database Config
  const [databases, setDatabases] = useState<DatabaseConfig>({
    gameDB: 'RanGame1',
    userDB: 'RanUser',
    logDB: 'RanLog',
    shopDB: 'RanShop'
  });

  // Column Mapping - แยกตาม database
  const [mapping, setMapping] = useState<ColumnMapping>({
    // RanGame1
    chaInfo: {
      tableName: 'ChaInfo',
      columns: {
        ChaGUID: 'ChaGUID',
        UsrUID: 'UsrUID',
        ChaName: 'ChaName',
        ChaLevel: 'ChaLevel',
        ChaClass: 'ChaClass',
        ChaSchool: 'ChaSchool',
        ChaStatus: 'ChaStatus',
        DelFlag: 'DelFlag'
      },
      conditions: 'DelFlag = 0'
    },
    guildInfo: {
      tableName: 'GuildInfo',
      columns: {
        GuildUID: 'GuildUID',
        GuildName: 'GuildName',
        MasterUID: 'MasterUID',
        GuildLevel: 'GuildLevel',
        GuildMoney: 'GuildMoney'
      },
      conditions: ''
    },
    // RanUser
    userInfo: {
      tableName: 'UserInfo',
      columns: {
        UserID: 'UserID',
        UserName: 'UserName',
        Password: 'Password',
        Point: 'Point',
        VotePoint: 'VotePoint',
        Status: 'Status',
        LastLogin: 'LastLogin'
      },
      conditions: 'Status = 1'
    },
    topUp: {
      tableName: 'TopUp',
      columns: {
        TopUpGUID: 'TopUpGUID',
        UsrUID: 'UsrUID',
        Amount: 'Amount',
        Point: 'Point',
        TopUpDate: 'TopUpDate',
        Status: 'Status'
      },
      conditions: 'Status = 1'
    },
    serverGroup: {
      tableName: 'ServerGroup',
      columns: {
        ServerUID: 'ServerUID',
        ServerName: 'ServerName',
        ServerIP: 'ServerIP',
        ServerPort: 'ServerPort'
      },
      conditions: ''
    },
    // RanLog
    logItemExchange: {
      tableName: 'LogItemExchange',
      columns: {
        LogGUID: 'LogGUID',
        ChaName_src: 'ChaName_src',
        ChaName_dst: 'ChaName_dst',
        ItemName: 'ItemName',
        Amount: 'Amount',
        ExchangeDate: 'ExchangeDate'
      },
      conditions: ''
    },
    // RanShop
    shopPurchase: {
      tableName: 'ShopPurchase',
      columns: {
        PurchaseGUID: 'PurchaseGUID',
        UserID: 'UserID',
        ItemID: 'ItemID',
        ItemName: 'ItemName',
        Price: 'Price',
        PurchaseDate: 'PurchaseDate'
      },
      conditions: ''
    }
  });

  // Test Results
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // Admin Setup
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminStatus, setAdminStatus] = useState<{hasTable: boolean; hasAdmin: boolean; adminCount: number} | null>(null);
  const [adminForm, setAdminForm] = useState({
    username: 'admin',
    password: '',
    fullName: 'System Administrator',
    email: ''
  });
  const [adminMessage, setAdminMessage] = useState('');
  const [adminList, setAdminList] = useState<any[]>([]);

  // Game Presets
  const presets = [
    {
      name: 'RAN Online Official',
      description: 'ครบทั้ง 4 databases',
      server: { host: 'localhost', port: 1433, user: 'sa', password: '' },
      databases: { gameDB: 'RanGame1', userDB: 'RanUser', logDB: 'RanLog', shopDB: 'RanShop' }
    },
    {
      name: 'RAN Online Basic',
      description: 'เฉพาะ RanGame1 + RanUser',
      server: { host: 'localhost', port: 1433, user: 'sa', password: '' },
      databases: { gameDB: 'RanGame1', userDB: 'RanUser', logDB: 'RanLog', shopDB: 'RanShop' }
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setServer(preset.server);
    setDatabases(preset.databases);
  };

  // Check admin status when entering step 4
  useEffect(() => {
    if (step === 4) {
      checkAdminStatus();
    }
  }, [step]);

  // ============ API Calls ============

  const handleTestServer = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/test-server`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server)
      });
      const data = await res.json();
      setTestResults({ ...testResults, server: data });
      if (!data.success) setError(data.message);
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อ Server ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleTestDatabase = async (dbKey: string, dbName: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/test-database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...server, database: dbName })
      });
      const data = await res.json();
      setTestResults({ ...testResults, [dbKey]: data });
    } catch (err) {
      setTestResults({ ...testResults, [dbKey]: { success: false, message: 'Connection failed' } });
    } finally {
      setLoading(false);
    }
  };

  const handleTestTable = async (dbKey: string, dbName: string, tableKey: string) => {
    setLoading(true);
    try {
      const tableMapping = mapping[tableKey as keyof ColumnMapping];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/test-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server,
          database: dbName,
          tableName: tableMapping.tableName,
          columns: Object.values(tableMapping.columns)
        })
      });
      const data = await res.json();
      setTestResults({ ...testResults, [`${dbKey}_${tableKey}`]: data });
    } catch (err) {
      setTestResults({ ...testResults, [`${dbKey}_${tableKey}`]: { success: false, message: 'Test failed' } });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = async (dbKey: string, dbName: string, tableKey: string) => {
    setLoading(true);
    try {
      const tableMapping = mapping[tableKey as keyof ColumnMapping];
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/auto-detect-columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server,
          database: dbName,
          tableName: tableMapping.tableName
        })
      });
      const data = await res.json();
      if (data.success && data.columns) {
        // Auto-fill columns
        const newColumns: Record<string, string> = {};
        data.columns.forEach((col: string) => {
          newColumns[col] = col;
        });
        setMapping({
          ...mapping,
          [tableKey]: {
            ...mapping[tableKey as keyof ColumnMapping],
            columns: newColumns
          }
        });
        setSuccess(`ตรวจพบ ${data.columns.length} columns ใน Table "${tableMapping.tableName}"`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError('Auto-detect failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const config = { server, databases, mapping };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('บันทึกสำเร็จ! กำลังไปหน้า Admin...');
        setTimeout(() => router.push('/admin'), 2000);
      } else {
        setError(data.message || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const updateColumn = (tableKey: string, oldKey: string, newKey: string, value: string) => {
    const table = mapping[tableKey as keyof ColumnMapping];
    const newColumns = { ...table.columns };
    
    if (oldKey !== newKey) {
      delete newColumns[oldKey];
    }
    newColumns[newKey] = value;
    
    setMapping({
      ...mapping,
      [tableKey]: {
        ...table,
        columns: newColumns
      }
    });
  };

  const addColumn = (tableKey: string) => {
    const table = mapping[tableKey as keyof ColumnMapping];
    setMapping({
      ...mapping,
      [tableKey]: {
        ...table,
        columns: {
          ...table.columns,
          'NewColumn': 'NewColumn'
        }
      }
    });
  };

  const removeColumn = (tableKey: string, colKey: string) => {
    const table = mapping[tableKey as keyof ColumnMapping];
    const newColumns = { ...table.columns };
    delete newColumns[colKey];
    setMapping({
      ...mapping,
      [tableKey]: {
        ...table,
        columns: newColumns
      }
    });
  };

  // ============ Admin Setup Functions ============

  const checkAdminStatus = async () => {
    setAdminLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/check-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(server)
      });
      const data = await res.json();
      setAdminStatus(data);
      if (data.hasAdmin) {
        loadAdminList();
      }
    } catch (err) {
      console.error('Check admin error:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCreateAdminsTable = async () => {
    setLoading(true);
    setAdminMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/create-admins-table`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...server, database: databases.userDB })
      });
      const data = await res.json();
      setAdminMessage(data.message);
      if (data.success) {
        checkAdminStatus();
      }
    } catch (err) {
      setAdminMessage('ไม่สามารถสร้างตารางได้');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    setLoading(true);
    setAdminMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/create-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...server,
          database: databases.userDB,
          adminUsername: adminForm.username,
          adminPassword: adminForm.password,
          adminFullName: adminForm.fullName,
          adminEmail: adminForm.email
        })
      });
      const data = await res.json();
      setAdminMessage(data.message);
      if (data.success) {
        loadAdminList();
        setAdminForm({ ...adminForm, password: '' });
      }
    } catch (err) {
      setAdminMessage('ไม่สามารถสร้าง Admin ได้');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (adminId: number) => {
    if (!confirm('ต้องการลบ Admin นี้?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/delete-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...server, database: databases.userDB, adminId })
      });
      const data = await res.json();
      setAdminMessage(data.message);
      if (data.success) {
        loadAdminList();
      }
    } catch (err) {
      setAdminMessage('ไม่สามารถลบ Admin ได้');
    } finally {
      setLoading(false);
    }
  };

  const loadAdminList = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/setup/list-admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...server, database: databases.userDB })
      });
      const data = await res.json();
      if (data.success) {
        setAdminList(data.admins || []);
      }
    } catch (err) {
      console.error('Load admin list error:', err);
    }
  };

  // ============ Render Table Mapping ============

  const renderTableMapping = (
    tableKey: string,
    title: string,
    icon: string,
    dbKey: string,
    dbName: string,
    description: string
  ) => {
    const table = mapping[tableKey as keyof ColumnMapping];
    const testKey = `${dbKey}_${tableKey}`;
    const testResult = testResults[testKey];

    return (
      <div className="p-4 bg-ran-dark rounded-lg mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-white">{icon} {title}</h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAutoDetect(dbKey, dbName, tableKey)}
              disabled={loading}
              className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30"
            >
              🔍 Auto-Detect
            </button>
            <button
              onClick={() => handleTestTable(dbKey, dbName, tableKey)}
              disabled={loading}
              className="px-3 py-1 btn-outline text-xs"
            >
              ทดสอบ
            </button>
          </div>
        </div>

        {/* Table Name */}
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">Table Name</label>
          <input
            type="text"
            value={table.tableName}
            onChange={(e) => setMapping({
              ...mapping,
              [tableKey]: { ...table, tableName: e.target.value }
            })}
            className="input-ran text-sm"
          />
        </div>

        {/* Columns */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs text-gray-400">Columns</label>
            <button
              onClick={() => addColumn(tableKey)}
              className="text-xs text-ran-red hover:underline"
            >
              + เพิ่ม Column
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(table.columns).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => updateColumn(tableKey, key, e.target.value, value)}
                  className="input-ran text-xs flex-1"
                  placeholder="Column Name"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => updateColumn(tableKey, key, key, e.target.value)}
                  className="input-ran text-xs flex-1"
                  placeholder="Alias"
                />
                <button
                  onClick={() => removeColumn(tableKey, key)}
                  className="text-red-400 hover:text-red-300 text-xs px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Conditions */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">WHERE Conditions</label>
          <input
            type="text"
            value={table.conditions}
            onChange={(e) => setMapping({
              ...mapping,
              [tableKey]: { ...table, conditions: e.target.value }
            })}
            className="input-ran text-sm"
            placeholder="เช่น DelFlag = 0, Status = 1"
          />
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mt-3 p-3 rounded text-sm ${testResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {testResult.success ? '✅ ' : '❌ '}{testResult.message}
            {testResult.data && (
              <div className="mt-2 overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      {Object.keys(testResult.data[0] || {}).map((col) => (
                        <th key={col} className="px-2 py-1 text-left">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {testResult.data.map((row: any, i: number) => (
                      <tr key={i} className="border-b border-gray-800">
                        {Object.values(row).map((val: any, j: number) => (
                          <td key={j} className="px-2 py-1">{String(val).substring(0, 30)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-ran-red/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-ran-red/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-ran-red rounded-2xl flex items-center justify-center mx-auto mb-4 glow-effect">
            <span className="font-display font-bold text-2xl text-white">R</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">RAN TOP-UP PRO</h1>
          <p className="text-gray-400 font-thai">Setup Wizard - เชื่อมต่อฐานข้อมูลเกม</p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-2">
            {[
              { num: 1, label: 'เลือกเกม' },
              { num: 2, label: 'Server' },
              { num: 3, label: 'Database' },
              { num: 4, label: 'Admin Setup' },
              { num: 5, label: 'Column Mapping' },
              { num: 6, label: 'ยืนยัน' }
            ].map((s, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  step > s.num ? 'bg-green-500' : step === s.num ? 'bg-ran-red' : 'bg-gray-700'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`ml-2 text-xs ${step === s.num ? 'text-white' : 'text-gray-500'}`}>{s.label}</span>
                {i < 5 && <div className="w-8 h-0.5 bg-gray-700 mx-2"></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
            ✅ {success}
          </div>
        )}

        {/* Step 1: Select Game */}
        {step === 1 && (
          <div className="card-ran">
            <h2 className="font-display text-xl font-bold mb-6">🎮 เลือกเกม</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {presets.map((preset, i) => (
                <div
                  key={i}
                  onClick={() => { applyPreset(preset); setStep(2); }}
                  className="p-6 bg-ran-dark rounded-xl border border-gray-700 hover:border-ran-red cursor-pointer transition-all hover:scale-105"
                >
                  <h3 className="font-bold text-white text-lg mb-2">{preset.name}</h3>
                  <p className="text-sm text-gray-400">{preset.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Server Config */}
        {step === 2 && (
          <div className="card-ran">
            <h2 className="font-display text-xl font-bold mb-6">🖥️ ตั้งค่า Server</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Server Address</label>
                <input type="text" value={server.host} onChange={(e) => setServer({ ...server, host: e.target.value })} className="input-ran" placeholder="192.168.1.100" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Port</label>
                <input type="number" value={server.port} onChange={(e) => setServer({ ...server, port: parseInt(e.target.value) })} className="input-ran" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Username</label>
                <input type="text" value={server.user} onChange={(e) => setServer({ ...server, user: e.target.value })} className="input-ran" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Password</label>
                <input type="password" value={server.password} onChange={(e) => setServer({ ...server, password: e.target.value })} className="input-ran" />
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <button onClick={handleTestServer} disabled={loading} className="btn-outline">
                {loading ? 'กำลังทดสอบ...' : '🔗 ทดสอบการเชื่อมต่อ'}
              </button>
            </div>
            {testResults.server && (
              <div className={`mt-4 p-4 rounded-lg ${testResults.server.success ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-red-500/20 border border-red-500 text-red-400'}`}>
                {testResults.server.success ? '✅ ' : '❌ '}{testResults.server.message}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button onClick={() => setStep(3)} className="btn-ran">ถัดไป →</button>
            </div>
          </div>
        )}

        {/* Step 3: Database Config */}
        {step === 3 && (
          <div className="card-ran">
            <h2 className="font-display text-xl font-bold mb-6">🗄️ ตั้งค่า Database</h2>
            <p className="text-gray-400 mb-6">ระบบต้องใช้ 4 database ของ RAN Online</p>
            <div className="space-y-4">
              {[
                { key: 'gameDB', label: 'RanGame1', desc: 'ตัวละคร, กิลด์, ไอเทม, Skill', icon: '🎮' },
                { key: 'userDB', label: 'RanUser', desc: 'User, TopUp, ยอดเงิน, Server', icon: '👤' },
                { key: 'logDB', label: 'RanLog', desc: 'Log ธุรกรรม, Item Exchange', icon: '📝' },
                { key: 'shopDB', label: 'RanShop', desc: 'ร้านค้า, การซื้อขาย, TopUp History', icon: '🛒' }
              ].map((db) => (
                <div key={db.key} className="flex items-center gap-4 p-4 bg-ran-dark rounded-lg">
                  <span className="text-2xl">{db.icon}</span>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-white">{db.label}</label>
                    <label className="block text-xs text-gray-500">{db.desc}</label>
                  </div>
                  <input
                    type="text"
                    value={databases[db.key as keyof DatabaseConfig]}
                    onChange={(e) => setDatabases({ ...databases, [db.key]: e.target.value })}
                    className="input-ran w-48"
                  />
                  <button
                    onClick={() => handleTestDatabase(db.key, databases[db.key as keyof DatabaseConfig])}
                    disabled={loading}
                    className="btn-outline text-sm py-2"
                  >
                    ทดสอบ
                  </button>
                  {testResults[db.key] && (
                    <span className={testResults[db.key].success ? 'text-green-400' : 'text-red-400'}>
                      {testResults[db.key].success ? '✅' : '❌'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(2)} className="btn-outline">← ย้อนกลับ</button>
              <button onClick={() => setStep(4)} className="btn-ran">ถัดไป →</button>
            </div>
          </div>
        )}

        {/* Step 4: Admin Setup */}
        {step === 4 && (
          <div className="card-ran">
            <h2 className="font-display text-xl font-bold mb-6">👤 สร้าง Admin เข้าระบบหลังบ้าน</h2>
            <p className="text-gray-400 mb-6">สร้างบัญชี Admin สำหรับเข้าหน้าจัดการระบบ (Admin Login)</p>

            {adminLoading && (
              <div className="mb-4 p-4 bg-blue-500/20 border border-blue-500 rounded-lg text-blue-400 text-center">
                ⏳ กำลังตรวจสอบ...
              </div>
            )}

            {adminStatus && (
              <div className={`mb-4 p-4 rounded-lg text-sm ${
                adminStatus.hasTable 
                  ? adminStatus.hasAdmin 
                    ? 'bg-green-500/20 border border-green-500 text-green-400'
                    : 'bg-yellow-500/20 border border-yellow-500 text-yellow-400'
                  : 'bg-orange-500/20 border border-orange-500 text-orange-400'
              }`}>
                {adminStatus.hasTable 
                  ? adminStatus.hasAdmin 
                    ? `✅ มี Admin แล้ว ${adminStatus.adminCount} คน`
                    : '⚠️ มีตาราง Admins แต่ยังไม่มี Admin'
                  : '🆕 ยังไม่มีตาราง Admins - ต้องสร้างใหม่'
                }
              </div>
            )}

            {/* ปุ่มสร้างตาราง Admins */}
            {adminStatus && !adminStatus.hasTable && (
              <div className="mb-6">
                <button
                  onClick={handleCreateAdminsTable}
                  disabled={loading}
                  className="w-full btn-ran py-3"
                >
                  🛠️ สร้างตาราง Admins
                </button>
              </div>
            )}

            {/* ฟอร์มสร้าง Admin ใหม่ */}
            <div className="p-4 bg-ran-dark rounded-lg">
              <h3 className="font-bold text-white mb-4">➕ สร้าง Admin ใหม่</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Username *</label>
                  <input
                    type="text"
                    value={adminForm.username}
                    onChange={(e) => setAdminForm({...adminForm, username: e.target.value})}
                    className="input-ran"
                    placeholder="admin"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Password *</label>
                  <input
                    type="password"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                    className="input-ran"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">ชื่อ-สกุล</label>
                  <input
                    type="text"
                    value={adminForm.fullName}
                    onChange={(e) => setAdminForm({...adminForm, fullName: e.target.value})}
                    className="input-ran"
                    placeholder="System Administrator"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                    className="input-ran"
                    placeholder="admin@example.com"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateAdmin}
                disabled={loading || !adminForm.username || !adminForm.password}
                className="mt-4 w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded-lg font-bold transition-all"
              >
                {loading ? '⏳ กำลังสร้าง...' : '✅ สร้าง Admin'}
              </button>

              {adminMessage && (
                <div className={`mt-3 p-3 rounded text-sm text-center ${
                  adminMessage.includes('สำเร็จ') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {adminMessage}
                </div>
              )}
            </div>

            {/* รายชื่อ Admin ที่มีอยู่ */}
            {adminList.length > 0 && (
              <div className="mt-4 p-4 bg-ran-dark rounded-lg">
                <h3 className="font-bold text-white mb-3">📋 รายชื่อ Admin</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left p-2">ID</th>
                        <th className="text-left p-2">Username</th>
                        <th className="text-left p-2">ชื่อ</th>
                        <th className="text-left p-2">Role</th>
                        <th className="text-left p-2">สถานะ</th>
                        <th className="text-left p-2">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminList.map((admin: any) => (
                        <tr key={admin.AdminID} className="border-b border-gray-800">
                          <td className="p-2 text-gray-300">{admin.AdminID}</td>
                          <td className="p-2 text-white font-bold">{admin.Username}</td>
                          <td className="p-2 text-gray-300">{admin.FullName || '-'}</td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              admin.Role === 'superadmin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {admin.Role}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              admin.Status === 1 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {admin.Status === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-2">
                            {admin.Role !== 'superadmin' && (
                              <button
                                onClick={() => handleDeleteAdmin(admin.AdminID)}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                ลบ
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(3)} className="btn-outline">← ย้อนกลับ</button>
              <button onClick={() => setStep(5)} className="btn-ran">ถัดไป →</button>
            </div>
          </div>
        )}

        {/* Step 5: Column Mapping - แยกตาม Database */}
        {step === 5 && (
          <div className="card-ran">
            <h2 className="font-display text-xl font-bold mb-6">🗺️ Column Mapping</h2>
            <p className="text-gray-400 mb-6">ตั้งค่า Table และ Column สำหรับแต่ละ Database</p>

            {/* Database Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'game', label: 'RanGame1', icon: '🎮', db: databases.gameDB },
                { key: 'user', label: 'RanUser', icon: '👤', db: databases.userDB },
                { key: 'log', label: 'RanLog', icon: '📝', db: databases.logDB },
                { key: 'shop', label: 'RanShop', icon: '🛒', db: databases.shopDB }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveDbTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    activeDbTab === tab.key
                      ? 'bg-ran-red text-white'
                      : 'bg-ran-dark text-gray-400 hover:text-white'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {testResults[tab.key]?.success === true && <span>✅</span>}
                  {testResults[tab.key]?.success === false && <span>❌</span>}
                </button>
              ))}
            </div>

            {/* RanGame1 Tables */}
            {activeDbTab === 'game' && (
              <div>
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
                  📌 Database: <strong>{databases.gameDB}</strong> - ข้อมูลตัวละคร กิลด์ ไอเทม
                </div>
                {renderTableMapping('chaInfo', 'ChaInfo (ตัวละคร)', '🎮', 'game', databases.gameDB, 'ข้อมูลตัวละคร Level, Class, School')}
                {renderTableMapping('guildInfo', 'GuildInfo (กิลด์)', '⚔️', 'game', databases.gameDB, 'ข้อมูลกิลด์ ชื่อกิลด์ หัวหน้า')}
              </div>
            )}

            {/* RanUser Tables */}
            {activeDbTab === 'user' && (
              <div>
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                  📌 Database: <strong>{databases.userDB}</strong> - ข้อมูลผู้ใช้ เติมเงิน เซิร์ฟเวอร์
                </div>
                {renderTableMapping('userInfo', 'UserInfo (ผู้ใช้)', '👤', 'user', databases.userDB, 'ข้อมูลผู้ใช้ ชื่อ รหัสผ่าน ยอดเงิน')}
                {renderTableMapping('topUp', 'TopUp (เติมเงิน)', '💰', 'user', databases.userDB, 'รายการเติมเงิน จำนวน วันที่')}
                {renderTableMapping('serverGroup', 'ServerGroup (เซิร์ฟเวอร์)', '🖥️', 'user', databases.userDB, 'ข้อมูลเซิร์ฟเวอร์ IP Port')}
              </div>
            )}

            {/* RanLog Tables */}
            {activeDbTab === 'log' && (
              <div>
                <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
                  📌 Database: <strong>{databases.logDB}</strong> - บันทึกธุรกรรม
                </div>
                {renderTableMapping('logItemExchange', 'LogItemExchange (แลกเปลี่ยนไอเทม)', '📝', 'log', databases.logDB, 'บันทึกการแลกเปลี่ยนไอเทมระหว่างผู้เล่น')}
              </div>
            )}

            {/* RanShop Tables */}
            {activeDbTab === 'shop' && (
              <div>
                <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 text-sm">
                  📌 Database: <strong>{databases.shopDB}</strong> - ร้านค้า
                </div>
                {renderTableMapping('shopPurchase', 'ShopPurchase (การซื้อ)', '🛒', 'shop', databases.shopDB, 'ประวัติการซื้อสินค้า')}
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(4)} className="btn-outline">← ย้อนกลับ</button>
              <button onClick={() => setStep(6)} className="btn-ran">ถัดไป →</button>
            </div>
          </div>
        )}

        {/* Step 6: Confirm */}
        {step === 6 && (
          <div className="card-ran">
            <h2 className="font-display text-xl font-bold mb-6">✅ ยืนยันการตั้งค่า</h2>
            <div className="space-y-4">
              <div className="p-4 bg-ran-dark rounded-lg">
                <h3 className="font-bold text-white mb-2">🖥️ Server</h3>
                <p className="text-gray-400">{server.host}:{server.port} ({server.user})</p>
              </div>
              <div className="p-4 bg-ran-dark rounded-lg">
                <h3 className="font-bold text-white mb-2">🗄️ Databases</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                  <p>🎮 RanGame1: {databases.gameDB}</p>
                  <p>👤 RanUser: {databases.userDB}</p>
                  <p>📝 RanLog: {databases.logDB}</p>
                  <p>🛒 RanShop: {databases.shopDB}</p>
                </div>
              </div>
              <div className="p-4 bg-ran-dark rounded-lg">
                <h3 className="font-bold text-white mb-2">🗺️ Tables ที่ตั้งค่าแล้ว</h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                  <p>🎮 {mapping.chaInfo.tableName}, {mapping.guildInfo.tableName}</p>
                  <p>👤 {mapping.userInfo.tableName}, {mapping.topUp.tableName}, {mapping.serverGroup.tableName}</p>
                  <p>📝 {mapping.logItemExchange.tableName}</p>
                  <p>🛒 {mapping.shopPurchase.tableName}</p>
                </div>
              </div>
            </div>
            <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400 text-sm">
              ⚠️ หลังบันทึก ระบบจะใช้การตั้งค่าใหม่ทันที
            </div>
            <div className="mt-6 flex justify-between">
              <button onClick={() => setStep(5)} className="btn-outline">← ย้อนกลับ</button>
              <button onClick={handleSaveSetup} disabled={loading} className="btn-ran text-lg px-8">
                {loading ? 'กำลังบันทึก...' : '💾 บันทึกและติดตั้ง'}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <a href="/" className="text-gray-500 hover:text-white text-sm">← กลับหน้าหลัก</a>
        </div>
      </div>
    </main>
  );
}
