'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Package {
  PackageID: number;
  PackageName: string;
  Price: number;
  Point: number;
  BonusPoint: number;
  DiscountPercent: number;
}

export default function TopUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/packages`);
      const data = await res.json();
      if (data.success) {
        setPackages(data.packages);
      } else {
        console.error('Failed to fetch packages:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    }
  };

  const handleSelectPackage = (pkg: Package) => {
    setSelectedPackage(pkg);
    setStep(2);
  };

  const handleSelectPayment = (method: string) => {
    setPaymentMethod(method);
    setStep(3);
  };

  const handleConfirm = async () => {
    if (!selectedPackage || !userId || !paymentMethod) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          packageId: selectedPackage.PackageID,
          userId,
          gameCode: 'ran-online',
          paymentMethod
        })
      });
      
      const data = await res.json();
      if (data.success) {
        setOrderResult(data.order);
        setStep(4);
      }
    } catch (error) {
      console.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-ran-dark">
      {/* Header */}
      <header className="bg-ran-dark-100 border-b border-ran-red/20 px-6 py-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-ran-red rounded-lg flex items-center justify-center">
              <span className="font-display font-bold text-white">R</span>
            </div>
            <span className="font-display font-bold text-xl text-white">RAN TOP-UP</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Welcome, Player</span>
            <Link href="/login" className="text-ran-red hover:underline">ออกจากระบบ</Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Step Indicator */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-4">
            {['เลือกแพ็กเกจ', 'เลือกช่องทางชำระเงิน', 'ยืนยันคำสั่งซื้อ', 'ชำระเงิน'].map((label, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step > i + 1 ? 'bg-green-500' : step === i + 1 ? 'bg-ran-red' : 'bg-gray-700'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`ml-2 text-sm ${step === i + 1 ? 'text-white' : 'text-gray-500'}`}>
                  {label}
                </span>
                {i < 3 && <div className="w-12 h-0.5 bg-gray-700 mx-4"></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 1: Select Package */}
            {step === 1 && (
              <div>
                <h2 className="font-display text-2xl font-bold mb-6">เลือกแพ็กเกจเติมเงิน</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {packages.map((pkg) => (
                    <div
                      key={pkg.PackageID}
                      onClick={() => handleSelectPackage(pkg)}
                      className="package-card text-center cursor-pointer"
                    >
                      {pkg.DiscountPercent > 0 && (
                        <span className="discount-badge">-{pkg.DiscountPercent}%</span>
                      )}
                      <div className="point text-lg mb-2">{pkg.Point.toLocaleString()} Point</div>
                      <div className="price">฿{pkg.Price}</div>
                      {pkg.BonusPoint > 0 && (
                        <div className="text-green-400 text-sm mt-2">+{pkg.BonusPoint} โบนัส</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select Payment */}
            {step === 2 && (
              <div>
                <h2 className="font-display text-2xl font-bold mb-6">เลือกช่องทางชำระเงิน</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { id: 'promptpay', name: 'PromptPay', icon: '💳', desc: 'ไม่มีค่าธรรมเนียม' },
                    { id: 'truemoney', name: 'TrueMoney Wallet', icon: '📱', desc: 'ค่าธรรมเนียม 1.5%' },
                    { id: 'bank', name: 'โอนธนาคาร', icon: '🏦', desc: 'ค่าธรรมเนียม 10 บาท' },
                    { id: 'credit', name: 'บัตรเครดิต/เดบิต', icon: '💳', desc: 'ค่าธรรมเนียม 2.5%' },
                  ].map((method) => (
                    <div
                      key={method.id}
                      onClick={() => handleSelectPayment(method.id)}
                      className={`card-ran cursor-pointer transition-all ${
                        paymentMethod === method.id ? 'border-ran-red ring-2 ring-ran-red/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{method.icon}</span>
                        <div>
                          <div className="font-bold text-white">{method.name}</div>
                          <div className="text-sm text-gray-400">{method.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && (
              <div>
                <h2 className="font-display text-2xl font-bold mb-6">ยืนยันคำสั่งซื้อ</h2>
                <div className="card-ran">
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">ไอดีเกม</label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="input-ran"
                      placeholder="กรอกไอดีเกม"
                    />
                  </div>
                  
                  <div className="border-t border-gray-700 pt-4 mt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">แพ็กเกจ</span>
                      <span className="text-white">{selectedPackage?.PackageName}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">Point</span>
                      <span className="text-ran-red font-bold">{selectedPackage?.Point.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-400">โบนัส</span>
                      <span className="text-green-400">+{selectedPackage?.BonusPoint.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t border-gray-700 pt-4 mt-4">
                      <span className="text-white">ยอดชำระ</span>
                      <span className="text-ran-red">฿{selectedPackage?.Price}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleConfirm}
                    disabled={loading || !userId}
                    className="w-full btn-ran mt-6 py-4 text-lg disabled:opacity-50"
                  >
                    {loading ? 'กำลังดำเนินการ...' : 'ยืนยันคำสั่งซื้อ'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Payment */}
            {step === 4 && orderResult && (
              <div>
                <h2 className="font-display text-2xl font-bold mb-6">ชำระเงิน</h2>
                <div className="card-ran text-center">
                  {paymentMethod === 'promptpay' && (
                    <div>
                      <div className="bg-white p-4 rounded-xl inline-block mb-4">
                        <img src={orderResult.qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                      </div>
                      <p className="text-gray-400 mb-2">สแกน QR Code ด้วยแอปธนาคาร</p>
                      <p className="text-2xl font-bold text-ran-red">฿{orderResult.amount}</p>
                    </div>
                  )}
                  
                  <div className="mt-6 p-4 bg-ran-dark rounded-xl">
                    <p className="text-sm text-gray-400">รหัสคำสั่งซื้อ</p>
                    <p className="font-mono text-white">{orderResult.orderNo}</p>
                  </div>
                  
                  <p className="text-yellow-400 text-sm mt-4">
                    ⏱ คำสั่งซื้อจะหมดอายุภายใน 1 ชั่วโมง
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info Card */}
            <div className="card-ran">
              <h3 className="font-display text-lg font-bold mb-4">ข้อมูลผู้ใช้</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">ไอดีเกม</span>
                  <span className="text-white">{userId || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Point</span>
                  <span className="text-ran-red font-bold">0</span>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            {selectedPackage && (
              <div className="card-ran">
                <h3 className="font-display text-lg font-bold mb-4">สรุปคำสั่งซื้อ</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">แพ็กเกจ</span>
                    <span className="text-white">{selectedPackage.Point.toLocaleString()} Point</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">โบนัส</span>
                    <span className="text-green-400">+{selectedPackage.BonusPoint}</span>
                  </div>
                  <div className="border-t border-gray-700 pt-3 flex justify-between text-lg">
                    <span className="text-white font-bold">ยอดชำระ</span>
                    <span className="text-ran-red font-bold">฿{selectedPackage.Price}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Promo Banner */}
            <div className="card-ran bg-gradient-to-r from-ran-red/20 to-transparent">
              <h3 className="font-display text-lg font-bold mb-2">🎉 โปรโมชั่นพิเศษ</h3>
              <p className="text-sm text-gray-400">เติมเงินวันนี้ รับโบนัสเพิ่ม 10%</p>
              <p className="text-xs text-gray-500 mt-2">*เฉพาะแพ็กเกจ 699 บาทขึ้นไป</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
