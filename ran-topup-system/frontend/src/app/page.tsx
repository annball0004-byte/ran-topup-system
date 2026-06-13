import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-ran-dark">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-ran-red/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-ran-red/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 py-20">
          {/* Header */}
          <header className="flex justify-between items-center mb-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-ran-red rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-white">R</span>
              </div>
              <span className="font-display font-bold text-xl text-white">RAN TOP-UP</span>
            </div>
            <div className="flex gap-4">
              <Link href="/setup" className="btn-ran">
                ⚙️ ติดตั้งระบบ
              </Link>
              <Link href="/login" className="btn-outline">
                เข้าสู่ระบบ
              </Link>
              <Link href="/admin/login" className="btn-outline">
                Admin
              </Link>
            </div>
          </header>
          
          {/* Hero Content */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="font-display text-5xl md:text-7xl font-bold mb-6">
              <span className="text-white">RAN</span>{' '}
              <span className="gradient-text">TOP-UP</span>{' '}
              <span className="text-white">PRO</span>
            </h1>
            <p className="text-xl text-gray-400 mb-10 font-thai">
              ระบบเติมเงินเกมออนไลน์ระดับ Premium<br/>
              ปลอดภัย รวดเร็ว รองรับทุกช่องทางชำระเงิน
            </p>
            
            <div className="flex justify-center gap-6">
              <Link href="/topup" className="btn-ran text-lg px-10 py-4">
                เติมเงินเลย
              </Link>
              <Link href="#features" className="btn-outline text-lg px-10 py-4">
                ดูรายละเอียด
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <section id="features" className="py-20 bg-ran-dark-100">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-12">
            ทำไมต้อง <span className="text-ran-red">RAN TOP-UP PRO</span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-ran text-center">
              <div className="w-16 h-16 bg-ran-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-ran-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold mb-2">รวดเร็วทันใจ</h3>
              <p className="text-gray-400">เติมเงินสำเร็จภายใน 5 วินาที</p>
            </div>
            
            <div className="card-ran text-center">
              <div className="w-16 h-16 bg-ran-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-ran-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold mb-2">ปลอดภัย 100%</h3>
              <p className="text-gray-400">ระบบเข้ารหัสข้อมูลระดับ Enterprise</p>
            </div>
            
            <div className="card-ran text-center">
              <div className="w-16 h-16 bg-ran-red/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-ran-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-bold mb-2">ชำระเงินง่าย</h3>
              <p className="text-gray-400">รองรับ PromptPay, TrueMoney, บัตรเครดิต</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Packages Preview */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-center mb-12">
            แพ็กเกจเติมเงิน
          </h2>
          
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { amount: 35, point: 350, discount: 0 },
              { amount: 99, point: 990, discount: 0 },
              { amount: 199, point: 1990, bonus: 100, discount: 5 },
              { amount: 349, point: 3490, bonus: 200, discount: 5 },
              { amount: 699, point: 6990, bonus: 500, discount: 7 },
              { amount: 999, point: 9990, bonus: 1000, discount: 10 },
            ].map((pkg, i) => (
              <div key={i} className="package-card text-center">
                {pkg.discount > 0 && (
                  <span className="discount-badge">-{pkg.discount}%</span>
                )}
                <div className="point text-lg mb-2">{pkg.point.toLocaleString()}</div>
                <div className="price">฿{pkg.amount}</div>
                {pkg.bonus && (
                  <div className="text-green-400 text-sm mt-2">+{pkg.bonus} โบนัส</div>
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <Link href="/topup" className="btn-ran">
              ดูแพ็กเกจทั้งหมด
            </Link>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-10 border-t border-gray-800">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500">
            © 2024 RAN TOP-UP PRO. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  )
}
