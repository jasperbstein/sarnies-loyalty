import React, { useState, useEffect } from 'react';

// ============================================
// SARNIES STAFF POS APP
// No emojis - clean SVG icons only
// ============================================

const C = {
  bg: '#0A0A0A',
  surface: '#141414',
  white: '#FFFFFF',
  gray: { 400: '#A3A3A3', 500: '#737373' },
  yellow: '#F5B800',
  green: '#4ADE80',
  red: '#F87171',
  blue: '#60A5FA',
};

const MOCK_USERS = {
  customer: { id: 1, name: 'Kacper B.', user_type: 'customer', tier_level: 'Gold', points_balance: 847, can_earn_points: true },
  employee: { id: 2, name: 'Sarah M.', user_type: 'employee', tier_level: null, points_balance: 0, can_earn_points: false, company: { name: 'Sarnies' } },
  partner: { id: 3, name: 'James L.', user_type: 'partner', tier_level: null, credits_balance: 2500, can_earn_points: false, company: { name: 'Acme Corp' } },
};

// SVG Icons
const Icon = {
  scan: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M5 21H3a2 2 0 01-2-2v-2"/><line x1="7" y1="12" x2="17" y2="12"/></svg>,
  ticket: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8"><path d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-8 h-8"><path d="M20 6L9 17l-5-5"/></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M19 12H5m7-7l-7 7 7 7"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12"/></svg>,
};

// Components
const Button = ({ children, primary, danger, disabled, onClick, className = '', size = 'md' }) => {
  const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-4 py-3', lg: 'px-6 py-4 text-lg' };
  return <button onClick={onClick} disabled={disabled} className={`rounded-xl font-semibold transition-all ${sizes[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : danger ? 'bg-red-500 text-white hover:bg-red-400' : primary ? 'bg-yellow-400 text-black hover:bg-yellow-300 active:scale-95' : 'bg-white/10 text-white hover:bg-white/20'}`}>{children}</button>;
};

const Card = ({ children, className = '' }) => <div className={`rounded-2xl p-5 ${className}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{children}</div>;

const Badge = ({ type }) => {
  const styles = { customer: { bg: 'linear-gradient(135deg, #F5B800, #D4A017)', color: '#000' }, employee: { bg: '#10B981', color: '#fff' }, partner: { bg: '#3B82F6', color: '#fff' } };
  const labels = { customer: 'Customer', employee: 'Staff', partner: 'Partner' };
  const s = styles[type] || styles.customer;
  return <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ background: s.bg, color: s.color }}>{labels[type]}</span>;
};

const TierBadge = ({ tier }) => {
  if (!tier) return null;
  const colors = { Bronze: 'linear-gradient(135deg, #CD7F32, #8B4513)', Silver: 'linear-gradient(135deg, #E8E8E8, #A0A0A0)', Gold: 'linear-gradient(135deg, #F5B800, #D4A017)' };
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: colors[tier], color: '#000' }}>{tier}</span>;
};

const NumPad = ({ value, onChange, max = 999999 }) => {
  const handlePress = (digit) => { const n = value + digit; if (parseInt(n) <= max) onChange(n); };
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1,2,3,4,5,6,7,8,9].map((n) => <button key={n} onClick={() => handlePress(String(n))} className="h-14 rounded-xl bg-white/5 text-white text-xl font-semibold hover:bg-white/10 active:scale-95 transition-all">{n}</button>)}
      <button onClick={() => onChange('')} className="h-14 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30">C</button>
      <button onClick={() => handlePress('0')} className="h-14 rounded-xl bg-white/5 text-white text-xl font-semibold hover:bg-white/10">0</button>
      <button onClick={() => onChange(value.slice(0, -1))} className="h-14 rounded-xl bg-white/5 text-white text-xl font-semibold hover:bg-white/10">←</button>
    </div>
  );
};

const QRScanner = ({ onScan, onClose }) => {
  const [scanning, setScanning] = useState(true);
  const simulateScan = (type) => { setScanning(false); setTimeout(() => onScan(MOCK_USERS[type]), 500); };
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: C.bg }}>
      <div className="flex items-center justify-between p-4">
        <button onClick={onClose} className="text-gray-400 hover:text-white flex items-center gap-2">{Icon.close} Cancel</button>
        <span className="text-white font-medium">Scan Customer QR</span>
        <div className="w-16"/>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {scanning ? (
          <>
            <div className="w-64 h-64 rounded-2xl border-2 border-yellow-400 relative mb-6"><div className="absolute inset-4 border border-dashed border-yellow-400/50 rounded-xl"/></div>
            <div className="text-gray-400 text-center mb-8">Position QR code within frame</div>
            <div className="text-gray-500 text-sm mb-3">Demo: Tap to simulate scan</div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => simulateScan('customer')}>Customer</Button>
              <Button size="sm" onClick={() => simulateScan('employee')}>Employee</Button>
              <Button size="sm" onClick={() => simulateScan('partner')}>Partner</Button>
            </div>
          </>
        ) : (
          <div className="text-center"><div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-4 mx-auto">{Icon.check}</div><div className="text-white text-lg">Scanned!</div></div>
        )}
      </div>
    </div>
  );
};

// Screens
const StaffLogin = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    setLoading(true); setError('');
    setTimeout(() => { if (email && password) { onLogin({ name: 'Staff User', outlet: 'Sathorn' }); } else { setError('Please enter email and password'); } setLoading(false); }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: C.bg }}>
      <div className="text-3xl font-bold text-white mb-2">SARNIES</div>
      <div className="text-gray-500 mb-8">Staff Portal</div>
      <div className="w-full max-w-xs space-y-4">
        <div><label className="text-gray-400 text-sm mb-1 block">Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@sarnies.com" className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-yellow-400 outline-none"/></div>
        <div><label className="text-gray-400 text-sm mb-1 block">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-yellow-400 outline-none"/></div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <Button primary className="w-full" onClick={handleLogin} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</Button>
      </div>
    </div>
  );
};

const POSDashboard = ({ staff, onAction }) => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-8">
      <div><div className="text-gray-400 text-sm">Welcome back</div><div className="text-white text-xl font-semibold">{staff.name}</div></div>
      <div className="text-right"><div className="text-gray-400 text-sm">Outlet</div><div className="text-white">{staff.outlet}</div></div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <button onClick={() => onAction('scan')} className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95" style={{ background: 'linear-gradient(135deg, #F5B800, #D4A017)' }}>
        <div className="text-black">{Icon.scan}</div><div className="font-semibold text-black">Scan QR</div>
      </button>
      <button onClick={() => onAction('voucher')} className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-3 bg-white/5 border border-white/10 transition-all hover:bg-white/10 active:scale-95">
        <div className="text-white">{Icon.ticket}</div><div className="font-semibold text-white">Scan Voucher</div>
      </button>
    </div>
    <div className="mt-8">
      <div className="text-gray-400 text-sm mb-3">Recent Activity</div>
      <Card>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Kacper B. earned 32 pts</span><span className="text-gray-500">2 min ago</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Sarah M. used voucher</span><span className="text-gray-500">15 min ago</span></div>
          <div className="flex justify-between"><span className="text-gray-400">James L. used 250 credits</span><span className="text-gray-500">1 hour ago</span></div>
        </div>
      </Card>
    </div>
  </div>
);

const CustomerInfo = ({ user, onAction, onBack }) => (
  <div className="p-6">
    <button onClick={onBack} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">{Icon.back} Back</button>
    <Card className="text-center py-8 mb-6">
      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl font-bold mb-4" style={{ background: 'linear-gradient(135deg, #F5B800, #D4A017)', color: '#000' }}>{user.name.charAt(0)}</div>
      <div className="text-white text-xl font-semibold mb-2">{user.name}</div>
      <div className="flex items-center justify-center gap-2 mb-4"><Badge type={user.user_type}/>{user.tier_level && <TierBadge tier={user.tier_level}/>}</div>
      {user.user_type === 'customer' && <div className="text-3xl font-bold text-white">{user.points_balance} <span className="text-gray-400 text-lg font-normal">beans</span></div>}
      {user.user_type === 'partner' && <div className="text-3xl font-bold text-white">฿{user.credits_balance?.toLocaleString()} <span className="text-gray-400 text-lg font-normal">credits</span></div>}
      {user.user_type === 'employee' && <div className="text-gray-400">Staff at {user.company?.name}</div>}
    </Card>
    <div className="space-y-3">
      {user.can_earn_points && <Button primary className="w-full" size="lg" onClick={() => onAction('award')}>Award Points</Button>}
      {user.user_type === 'partner' && <Button className="w-full" size="lg" onClick={() => onAction('credits')} style={{ background: '#3B82F6', color: '#fff' }}>Use Credits</Button>}
      <Button className="w-full" size="lg" onClick={() => onAction('voucher')}>Scan Voucher</Button>
    </div>
  </div>
);

const AwardPoints = ({ user, onComplete, onBack }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const points = Math.floor(parseInt(amount || 0) / 100);

  const handleAward = () => { setLoading(true); setTimeout(() => { setResult({ points_earned: points, new_balance: user.points_balance + points, tier_upgraded: points > 50 }); setLoading(false); }, 1000); };

  if (result) {
    return (
      <div className="p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mx-auto mb-6">{Icon.check}</div>
        <div className="text-white text-2xl font-bold mb-2">+{result.points_earned} beans</div>
        <div className="text-gray-400 mb-2">awarded to {user.name}</div>
        <div className="text-gray-500 text-sm mb-8">New balance: {result.new_balance} beans</div>
        {result.tier_upgraded && <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-4 mb-6"><div className="text-yellow-400 font-semibold">Tier Upgraded!</div></div>}
        <Button primary className="w-full" onClick={onComplete}>Done</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">{Icon.back} Back</button>
      <div className="text-center mb-6"><div className="text-gray-400 mb-1">Awarding to</div><div className="text-white font-semibold">{user.name}</div></div>
      <Card className="text-center py-6 mb-6"><div className="text-gray-400 text-sm mb-2">Purchase Amount (THB)</div><div className="text-4xl font-bold text-white mb-2">฿{parseInt(amount || 0).toLocaleString()}</div><div className="text-yellow-400">= {points} beans</div></Card>
      <NumPad value={amount} onChange={setAmount}/>
      <div className="mt-6"><Button primary className="w-full" size="lg" disabled={!amount || loading} onClick={handleAward}>{loading ? 'Awarding...' : `Award ${points} Beans`}</Button></div>
    </div>
  );
};

const UseCredits = ({ user, onComplete, onBack }) => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleUse = () => {
    if (parseInt(amount) > user.credits_balance) { setError('Insufficient credits'); return; }
    setLoading(true); setTimeout(() => { setResult({ credits_used: parseInt(amount), new_balance: user.credits_balance - parseInt(amount) }); setLoading(false); }, 1000);
  };

  if (result) {
    return (
      <div className="p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-6">{Icon.check}</div>
        <div className="text-white text-2xl font-bold mb-2">฿{result.credits_used.toLocaleString()}</div>
        <div className="text-gray-400 mb-2">deducted from {user.name}</div>
        <div className="text-gray-500 text-sm mb-8">Remaining: ฿{result.new_balance.toLocaleString()}</div>
        <Button primary className="w-full" onClick={onComplete}>Done</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">{Icon.back} Back</button>
      <div className="text-center mb-6"><div className="text-gray-400 mb-1">Using credits from</div><div className="text-white font-semibold">{user.name}</div><div className="text-blue-400 text-sm">{user.company?.name}</div></div>
      <Card className="text-center py-6 mb-2"><div className="text-gray-400 text-sm mb-2">Amount (THB)</div><div className="text-4xl font-bold text-white">฿{parseInt(amount || 0).toLocaleString()}</div></Card>
      <div className="text-center mb-6"><span className="text-gray-500">Available: </span><span className="text-white">฿{user.credits_balance?.toLocaleString()}</span></div>
      {error && <div className="text-red-400 text-center mb-4">{error}</div>}
      <NumPad value={amount} onChange={(v) => { setAmount(v); setError(''); }} max={user.credits_balance}/>
      <div className="mt-6"><Button primary className="w-full" size="lg" disabled={!amount || loading} onClick={handleUse}>{loading ? 'Processing...' : `Use ฿${parseInt(amount || 0).toLocaleString()}`}</Button></div>
    </div>
  );
};

const ScanVoucher = ({ onComplete, onBack }) => {
  const [scanning, setScanning] = useState(true);
  const [voucher, setVoucher] = useState(null);
  const [used, setUsed] = useState(false);

  const simulateScan = () => { setScanning(false); setVoucher({ title: 'Free Americano', user: 'Kacper B.', valid: true, expires: '2 days' }); };

  if (used) {
    return (
      <div className="p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mx-auto mb-6">{Icon.check}</div>
        <div className="text-white text-xl font-bold mb-2">Voucher Redeemed</div>
        <div className="text-gray-400 mb-8">{voucher.title} for {voucher.user}</div>
        <Button primary className="w-full" onClick={onComplete}>Done</Button>
      </div>
    );
  }

  if (voucher) {
    return (
      <div className="p-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">{Icon.back} Back</button>
        <Card className="text-center py-8 mb-6">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${voucher.valid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{voucher.valid ? Icon.check : Icon.close}</div>
          <div className="text-white text-xl font-semibold mb-2">{voucher.title}</div>
          <div className="text-gray-400 mb-2">For: {voucher.user}</div>
          {voucher.valid ? <div className="text-green-400 text-sm">Valid - Expires in {voucher.expires}</div> : <div className="text-red-400 text-sm">Invalid or expired</div>}
        </Card>
        {voucher.valid && <Button primary className="w-full" size="lg" onClick={() => setUsed(true)}>Redeem Voucher</Button>}
      </div>
    );
  }

  return (
    <div className="p-6">
      <button onClick={onBack} className="text-gray-400 hover:text-white mb-6 flex items-center gap-2">{Icon.back} Back</button>
      <div className="text-center py-12">
        <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-gray-600 mx-auto flex items-center justify-center mb-6"><div className="text-gray-500">{Icon.scan}</div></div>
        <div className="text-gray-400 mb-6">Scan voucher QR code</div>
        <Button onClick={simulateScan}>Demo: Simulate Scan</Button>
      </div>
    </div>
  );
};

// Main App
export default function SarniesStaffPOS() {
  const [screen, setScreen] = useState('login');
  const [staff, setStaff] = useState(null);
  const [scannedUser, setScannedUser] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleLogin = (staffData) => { setStaff(staffData); setScreen('dashboard'); };
  const handleScan = (user) => { setScannedUser(user); setShowScanner(false); setScreen('customer'); };
  const handleAction = (action) => {
    if (action === 'scan') setShowScanner(true);
    else if (action === 'voucher' && !scannedUser) setScreen('voucher');
    else if (action === 'award') setScreen('award');
    else if (action === 'credits') setScreen('credits');
    else if (action === 'voucher') setScreen('voucher');
  };
  const handleComplete = () => { setScannedUser(null); setScreen('dashboard'); };
  const handleBack = () => { if (screen === 'customer') { setScannedUser(null); setScreen('dashboard'); } else { setScreen(scannedUser ? 'customer' : 'dashboard'); } };

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'SF Pro Display', -apple-system, sans-serif", color: C.white }}>
      {screen !== 'login' && (
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="text-lg font-bold text-white">SARNIES <span className="text-yellow-400">POS</span></div>
          <button onClick={() => { setStaff(null); setScreen('login'); }} className="text-gray-500 text-sm">Logout</button>
        </div>
      )}
      {screen === 'login' && <StaffLogin onLogin={handleLogin}/>}
      {screen === 'dashboard' && <POSDashboard staff={staff} onAction={handleAction}/>}
      {screen === 'customer' && <CustomerInfo user={scannedUser} onAction={handleAction} onBack={handleBack}/>}
      {screen === 'award' && <AwardPoints user={scannedUser} onComplete={handleComplete} onBack={handleBack}/>}
      {screen === 'credits' && <UseCredits user={scannedUser} onComplete={handleComplete} onBack={handleBack}/>}
      {screen === 'voucher' && <ScanVoucher onComplete={handleComplete} onBack={handleBack}/>}
      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)}/>}
    </div>
  );
}
