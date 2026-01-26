import React, { useState, useEffect } from 'react';

// ============================================
// SARNIES LOYALTY APP — COMPLETE CUSTOMER APP
// No emojis - clean SVG icons only
// ============================================

const MOCK = {
  customer: {
    id: 1,
    name: 'Kacper',
    surname: 'B.',
    email: 'kacper@gmail.com',
    phone: '+66812345678',
    points_balance: 847,
    tier_level: 'Gold',
    user_type: 'customer',
    can_earn_points: true,
    member_since: '2024'
  },
  employee: {
    id: 2,
    name: 'Sarah',
    surname: 'M.',
    points_balance: 0,
    tier_level: null,
    user_type: 'employee',
    can_earn_points: false,
    company: { name: 'Sarnies' },
    member_since: '2023'
  },
  partner: {
    id: 3,
    name: 'James',
    surname: 'L.',
    points_balance: 0,
    credits_balance: 2500,
    tier_level: null,
    user_type: 'partner',
    can_earn_points: false,
    company: { name: 'Acme Corp' },
    member_since: '2024'
  },
  vouchers: [
    { id: 1, title: 'Free Americano', points_required: 30, category: 'drinks' },
    { id: 2, title: 'Croissant', points_required: 25, category: 'food' },
    { id: 3, title: 'Signature Latte', points_required: 45, category: 'drinks' },
    { id: 4, title: 'Breakfast Set', points_required: 80, category: 'food' },
    { id: 5, title: 'Cold Brew 500ml', points_required: 55, category: 'drinks' },
  ],
  myVouchers: [
    { id: 1, title: 'Free Americano', expires: '2 days', code: 'AMR-847' },
    { id: 2, title: 'Croissant', expires: '5 days', code: 'CRS-231' },
  ],
  employeeVouchers: [
    { id: 1, title: 'Daily Drink', expires: 'Today', available: true },
    { id: 2, title: 'Birthday Reward', expires: '15 Jan', available: false },
  ],
  transactions: [
    { id: 1, type: 'earn', delta: 32, outlet: 'Sathorn', time: '2 hours ago', amount: 3200 },
    { id: 2, type: 'redeem', delta: -30, outlet: 'Ekkamai', time: 'Yesterday', voucher: 'Free Americano' },
    { id: 3, type: 'earn', delta: 15, outlet: 'Sathorn', time: '2 days ago', amount: 1500 },
    { id: 4, type: 'earn', delta: 48, outlet: 'Thonglor', time: '3 days ago', amount: 4800 },
  ],
  promo: { title: 'Double Points Weekend', subtitle: 'Sat–Sun all locations' },
  referral: {
    code: 'KACPER2024',
    successful: 3,
    pending: 1,
    earned: 300,
  }
};

const C = {
  bg: '#0A0A0A',
  surface: '#141414',
  white: '#FFFFFF',
  gray: { 400: '#A3A3A3', 500: '#737373' },
  yellow: '#F5B800',
  yellowGlow: 'rgba(245, 184, 0, 0.15)',
  green: '#4ADE80',
};

// SVG Icons
const Icon = {
  target: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  bolt: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>,
  gift: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="8" width="18" height="4" rx="1"/><rect x="5" y="12" width="14" height="9" rx="1"/><path d="M12 8v13"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  coffee: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><path d="M6 1v3M10 1v3M14 1v3"/></svg>,
  right: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M9 18l6-6-6-6"/></svg>,
  up: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M18 15l-6-6-6 6"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  arrowUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 19V5m-7 7l7-7 7 7"/></svg>,
  arrowDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M12 5v14m7-7l-7 7-7-7"/></svg>,
  home: <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.5 8.5 0 0113 0"/></svg>,
  qr: <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3"/><rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/><rect x="18" y="18" width="3" height="3"/></svg>,
};

// Components
const TierBadge = ({ tier, type = 'customer' }) => {
  if (type === 'employee') return <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-600 text-white">Staff</span>;
  if (type === 'partner') return <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-blue-600 text-white">Partner</span>;
  const colors = { Bronze: 'linear-gradient(135deg, #CD7F32, #8B4513)', Silver: 'linear-gradient(135deg, #E8E8E8, #A0A0A0)', Gold: 'linear-gradient(135deg, #F5B800, #D4A017)' };
  return <span className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase" style={{ background: colors[tier] || colors.Bronze, color: '#000', boxShadow: '0 4px 15px rgba(245,184,0,0.3)' }}>{tier}</span>;
};

const AnimatedPoints = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = value / 30;
    const timer = setInterval(() => {
      current += step;
      if (current >= value) { setDisplay(value); clearInterval(timer); }
      else { setDisplay(Math.floor(current)); }
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}</span>;
};

const Card = ({ children, className = '', highlight, onClick }) => (
  <div className={`rounded-2xl p-4 ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`} style={{ background: highlight ? C.yellowGlow : 'rgba(255,255,255,0.03)', border: `1px solid ${highlight ? 'rgba(245,184,0,0.2)' : 'rgba(255,255,255,0.06)'}` }} onClick={onClick}>{children}</div>
);

const Button = ({ children, primary, disabled, onClick, className = '' }) => (
  <button onClick={onClick} disabled={disabled} className={`px-4 py-3 rounded-xl font-semibold transition-all ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : primary ? 'bg-yellow-400 text-black hover:bg-yellow-300 active:scale-95' : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'}`}>{children}</button>
);

const QRCode = ({ size = 180 }) => (
  <div className="bg-white rounded-2xl p-4" style={{ width: size + 32, height: size + 32 }}>
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }}>
      <rect x="10" y="10" width="25" height="25" fill="#000"/><rect x="65" y="10" width="25" height="25" fill="#000"/><rect x="10" y="65" width="25" height="25" fill="#000"/>
      <rect x="15" y="15" width="15" height="15" fill="#fff"/><rect x="70" y="15" width="15" height="15" fill="#fff"/><rect x="15" y="70" width="15" height="15" fill="#fff"/>
      <rect x="19" y="19" width="7" height="7" fill="#000"/><rect x="74" y="19" width="7" height="7" fill="#000"/><rect x="19" y="74" width="7" height="7" fill="#000"/>
      <rect x="40" y="40" width="20" height="20" fill="#000"/><rect x="45" y="45" width="10" height="10" fill="#fff"/>
      <rect x="40" y="10" width="6" height="6" fill="#000"/><rect x="52" y="16" width="6" height="6" fill="#000"/><rect x="10" y="40" width="6" height="6" fill="#000"/>
      <rect x="65" y="40" width="6" height="6" fill="#000"/><rect x="77" y="52" width="6" height="6" fill="#000"/><rect x="40" y="65" width="6" height="6" fill="#000"/>
      <rect x="65" y="77" width="6" height="6" fill="#000"/><rect x="83" y="83" width="6" height="6" fill="#000"/>
    </svg>
  </div>
);

// Screens
const SplashScreen = ({ onComplete }) => {
  useEffect(() => { const t = setTimeout(onComplete, 2000); return () => clearTimeout(t); }, [onComplete]);
  return <div className="fixed inset-0 flex items-center justify-center" style={{ background: C.bg }}><div className="text-center animate-pulse"><div className="text-4xl font-bold text-white tracking-tight">SARNIES</div><div className="text-gray-500 text-sm mt-2 tracking-widest">LOYALTY</div></div></div>;
};

const LoginScreen = ({ onLogin }) => {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex flex-col p-6" style={{ background: C.bg }}>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-white mb-2">SARNIES</div>
        <div className="text-gray-500 mb-12">Sign in to continue</div>
        {step === 'phone' ? (
          <div className="w-full max-w-xs space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">Phone number</label>
              <div className="flex gap-2">
                <div className="px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10">+66</div>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="812345678" className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-yellow-400 outline-none"/>
              </div>
            </div>
            <Button primary className="w-full" onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); setStep('otp'); }, 1000); }} disabled={phone.length < 9 || loading}>{loading ? 'Sending...' : 'Continue'}</Button>
          </div>
        ) : (
          <div className="w-full max-w-xs space-y-4">
            <div className="text-center mb-4"><div className="text-white mb-1">Enter the code</div><div className="text-gray-500 text-sm">Sent to +66 {phone}</div></div>
            <div className="flex justify-center gap-2">
              {[...Array(6)].map((_, i) => <input key={i} type="text" maxLength={1} value={otp[i] || ''} onChange={(e) => { const n = otp.split(''); n[i] = e.target.value; setOtp(n.join('')); if (e.target.value && e.target.nextSibling) e.target.nextSibling.focus(); }} className="w-11 h-14 text-center text-xl rounded-xl bg-white/5 text-white border border-white/10 focus:border-yellow-400 outline-none"/>)}
            </div>
            <Button primary className="w-full" onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); onLogin(); }, 1000); }} disabled={otp.length < 6 || loading}>{loading ? 'Verifying...' : 'Verify'}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const RegistrationScreen = ({ onComplete }) => {
  const [form, setForm] = useState({ name: '', surname: '', email: '', birthday: '', gender: '' });
  const [loading, setLoading] = useState(false);
  const Field = ({ label, name, type = 'text', required }) => (<div><label className="text-gray-400 text-sm mb-1 block">{label} {required && <span className="text-yellow-400">*</span>}</label><input type={type} value={form[name]} onChange={(e) => setForm({ ...form, [name]: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-yellow-400 outline-none"/></div>);
  return (
    <div className="min-h-screen p-6" style={{ background: C.bg }}>
      <div className="text-2xl font-bold text-white mb-1">Create account</div>
      <div className="text-gray-500 mb-8">Join Sarnies Loyalty</div>
      <div className="space-y-4 max-w-md">
        <Field label="Name" name="name" required/><Field label="Surname" name="surname" required/><Field label="Email" name="email" type="email"/><Field label="Birthday" name="birthday" type="date"/>
        <div><label className="text-gray-400 text-sm mb-2 block">Gender</label><div className="flex gap-2">{['Male', 'Female', 'Other'].map((g) => <button key={g} onClick={() => setForm({ ...form, gender: g })} className={`flex-1 py-2 rounded-xl text-sm ${form.gender === g ? 'bg-yellow-400 text-black' : 'bg-white/5 text-gray-400'}`}>{g}</button>)}</div></div>
        <Button primary className="w-full mt-6" onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); onComplete(); }, 1000); }} disabled={!form.name || !form.surname || loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
      </div>
    </div>
  );
};

const HomeCustomer = ({ user, promo }) => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
    <div className="text-center mb-2">
      <div className="text-8xl font-bold tracking-tight" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F5B800 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}><AnimatedPoints value={user.points_balance}/></div>
      <div className="text-gray-500 text-sm tracking-[0.25em] uppercase mt-1">beans</div>
    </div>
    <div className="mb-10"><TierBadge tier={user.tier_level}/></div>
    <Card highlight className="w-full max-w-xs mb-4"><div className="flex items-center gap-3"><div className="text-yellow-400">{Icon.target}</div><div><span className="text-yellow-400 font-semibold">15 more</span><span className="text-gray-400"> → </span><span className="text-white">Free Latte</span></div></div></Card>
    <Card className="w-full max-w-xs"><div className="flex items-center gap-3"><div className="text-orange-400">{Icon.bolt}</div><div><div className="text-white font-medium">{promo.title}</div><div className="text-gray-500 text-sm">{promo.subtitle}</div></div></div></Card>
  </div>
);

const HomeEmployee = ({ user, promo }) => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
    <div className="mb-6"><TierBadge tier={null} type="employee"/></div>
    <Card className="w-full max-w-xs mb-4 text-center py-8" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}><div className="flex justify-center mb-3 text-emerald-400">{Icon.coffee}</div><div className="text-white text-xl font-semibold">Daily Drink</div><div className="text-emerald-400 text-sm mt-1">Available today</div></Card>
    <Card className="w-full max-w-xs mb-4"><div className="text-center text-gray-400"><span className="text-white font-semibold">50% off</span> food & drinks</div></Card>
    <Card className="w-full max-w-xs"><div className="flex items-center gap-3"><div className="text-orange-400">{Icon.bolt}</div><div><div className="text-white font-medium">{promo.title}</div><div className="text-gray-500 text-sm">{promo.subtitle}</div></div></div></Card>
  </div>
);

const HomePartner = ({ user, promo }) => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] px-6">
    <div className="text-center mb-2">
      <div className="text-7xl font-bold tracking-tight" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #60A5FA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>฿<AnimatedPoints value={user.credits_balance}/></div>
      <div className="text-gray-500 text-sm tracking-[0.25em] uppercase mt-1">credits</div>
    </div>
    <div className="mb-6"><TierBadge tier={null} type="partner"/></div>
    <Card className="w-full max-w-xs mb-4"><div className="text-center text-gray-400">Company: <span className="text-white font-medium">{user.company?.name}</span></div></Card>
    <Card className="w-full max-w-xs"><div className="flex items-center gap-3"><div className="text-orange-400">{Icon.bolt}</div><div><div className="text-white font-medium">{promo.title}</div><div className="text-gray-500 text-sm">{promo.subtitle}</div></div></div></Card>
  </div>
);

const QRModal = ({ user, onClose }) => {
  const labels = { customer: 'Show to earn beans', employee: 'Show to redeem benefits', partner: 'Show to use credits' };
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6" style={{ background: '#000' }}>
      <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>{Icon.close}</button>
      <div className="mb-6"><TierBadge tier={user.tier_level} type={user.user_type}/></div>
      <div style={{ filter: 'drop-shadow(0 0 60px rgba(245,184,0,0.2))' }}><QRCode size={200}/></div>
      <div className="text-white text-xl font-semibold mt-6">{user.name}</div>
      <div className="text-gray-500 text-sm mt-2">{labels[user.user_type]}</div>
      <div className="flex items-center gap-2 mt-8 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/><span className="text-gray-400 text-sm">Ready to scan</span></div>
    </div>
  );
};

const MeScreen = ({ user, vouchers, myVouchers, transactions, referral, employeeVouchers }) => {
  const [expanded, setExpanded] = useState(null);
  const [voucherQR, setVoucherQR] = useState(null);

  const Section = ({ id, icon, title, badge, children }) => (
    <div>
      <button onClick={() => setExpanded(expanded === id ? null : id)} className="w-full flex items-center justify-between px-4 py-4 rounded-xl transition-colors" style={{ background: expanded === id ? C.yellowGlow : 'rgba(255,255,255,0.03)' }}>
        <div className="flex items-center gap-3"><div className="text-gray-400">{icon}</div><span className="text-white font-medium">{title}</span></div>
        <div className="flex items-center gap-2">{badge && <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-black text-xs font-bold">{badge}</span>}<span className="text-gray-500">{expanded === id ? Icon.up : Icon.right}</span></div>
      </button>
      {expanded === id && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );

  return (
    <div className="px-5 py-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: 'linear-gradient(135deg, #F5B800, #D4A017)', color: '#000' }}>{user.name.charAt(0)}</div>
        <div><div className="text-white text-lg font-semibold">{user.name} {user.surname}</div><div className="flex items-center gap-2 mt-1"><TierBadge tier={user.tier_level} type={user.user_type}/><span className="text-gray-500 text-sm">Since {user.member_since}</span></div></div>
      </div>

      <div className="space-y-2">
        {user.user_type === 'customer' && (
          <Section id="my" icon={Icon.gift} title="My Vouchers" badge={myVouchers.length || null}>
            {myVouchers.length === 0 ? <div className="text-center py-8 text-gray-500">No vouchers yet</div> : myVouchers.map((v) => <Card key={v.id} className="flex items-center justify-between"><div><div className="text-white">{v.title}</div><div className="text-gray-500 text-sm">Expires in {v.expires}</div></div><Button primary onClick={() => setVoucherQR(v)}>Use</Button></Card>)}
          </Section>
        )}

        {user.user_type === 'employee' && (
          <Section id="benefits" icon={Icon.coffee} title="My Benefits" badge={employeeVouchers.filter(v => v.available).length || null}>
            {employeeVouchers.map((v) => <Card key={v.id} className="flex items-center justify-between"><div><div className="text-white">{v.title}</div><div className="text-gray-500 text-sm">{v.available ? `Expires ${v.expires}` : 'Not available yet'}</div></div>{v.available && <Button primary onClick={() => setVoucherQR(v)}>Use</Button>}</Card>)}
          </Section>
        )}

        {user.user_type === 'customer' && (
          <Section id="browse" icon={Icon.star} title="Browse Rewards">
            {vouchers.map((v) => <Card key={v.id} className="flex items-center justify-between"><div><div className="text-white">{v.title}</div><div className="text-yellow-400 text-sm">{v.points_required} beans</div></div><Button primary={user.points_balance >= v.points_required} disabled={user.points_balance < v.points_required}>{user.points_balance >= v.points_required ? 'Redeem' : 'Locked'}</Button></Card>)}
          </Section>
        )}

        <Section id="activity" icon={Icon.clock} title="Activity">
          {transactions.map((t) => <div key={t.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'earn' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{t.type === 'earn' ? Icon.arrowUp : Icon.arrowDown}</div><div><div className="text-white text-sm">{t.type === 'earn' ? `฿${t.amount?.toLocaleString()} at ${t.outlet}` : t.voucher}</div><div className="text-gray-500 text-xs">{t.time}</div></div></div><div className={`font-semibold text-sm ${t.delta > 0 ? 'text-green-400' : 'text-yellow-400'}`}>{t.delta > 0 ? '+' : ''}{t.delta}</div></div>)}
        </Section>

        {user.user_type === 'customer' && (
          <Section id="referral" icon={Icon.users} title="Referral">
            <Card className="text-center py-4"><div className="text-gray-400 text-sm mb-2">Your code</div><div className="text-2xl font-bold text-white mb-4">{referral.code}</div><div className="flex gap-2 justify-center"><Button>Copy</Button><Button primary>Share</Button></div></Card>
            <div className="grid grid-cols-3 gap-2 mt-2"><Card className="text-center py-3"><div className="text-white font-bold">{referral.successful}</div><div className="text-gray-500 text-xs">Successful</div></Card><Card className="text-center py-3"><div className="text-white font-bold">{referral.pending}</div><div className="text-gray-500 text-xs">Pending</div></Card><Card className="text-center py-3"><div className="text-yellow-400 font-bold">{referral.earned}</div><div className="text-gray-500 text-xs">Earned</div></Card></div>
          </Section>
        )}

        <button className="w-full flex items-center justify-between px-4 py-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}><div className="flex items-center gap-3"><div className="text-gray-400">{Icon.settings}</div><span className="text-white font-medium">Settings</span></div><span className="text-gray-500">{Icon.right}</span></button>
        <button className="w-full text-center py-4 text-gray-500 hover:text-red-400 transition-colors mt-4">Sign Out</button>
      </div>

      {voucherQR && <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6" style={{ background: '#000' }}><button onClick={() => setVoucherQR(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>{Icon.close}</button><div className="text-white text-xl font-semibold mb-6">{voucherQR.title}</div><QRCode size={200}/><div className="text-gray-500 text-sm mt-6">Show to staff to redeem</div><div className="text-gray-600 text-xs mt-2">Expires in {voucherQR.expires}</div></div>}
    </div>
  );
};

const BottomNav = ({ tab, setTab, onQR }) => (
  <nav className="fixed bottom-0 left-0 right-0 z-40" style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.95) 40%)', paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
    <div className="flex items-end justify-around max-w-md mx-auto px-8 h-20">
      <button onClick={() => setTab('home')} className={`flex flex-col items-center gap-1 p-3 ${tab === 'home' ? 'text-yellow-400' : 'text-gray-500'}`}>{Icon.home}<span className="text-[10px] tracking-wider uppercase">Home</span></button>
      <button onClick={onQR} className="relative -top-4 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F5B800, #D4A017)', boxShadow: '0 8px 30px rgba(245,184,0,0.4)' }}>{Icon.qr}</button>
      <button onClick={() => setTab('me')} className={`flex flex-col items-center gap-1 p-3 ${tab === 'me' ? 'text-yellow-400' : 'text-gray-500'}`}>{Icon.user}<span className="text-[10px] tracking-wider uppercase">Me</span></button>
    </div>
  </nav>
);

// Main App
export default function SarniesLoyaltyApp() {
  const [screen, setScreen] = useState('splash');
  const [tab, setTab] = useState('home');
  const [showQR, setShowQR] = useState(false);
  const [userType, setUserType] = useState('customer');
  const user = MOCK[userType];

  return (
    <div className="min-h-screen" style={{ background: C.bg, fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } .animate-fadeIn { animation: fadeIn 0.4s ease-out; }`}</style>
      {screen === 'app' && <div className="fixed top-4 right-4 z-50"><button onClick={() => setUserType(userType === 'customer' ? 'employee' : userType === 'employee' ? 'partner' : 'customer')} className="px-3 py-1 rounded-full bg-white/10 text-white text-xs">Demo: {userType}</button></div>}
      {screen === 'splash' && <SplashScreen onComplete={() => setScreen('login')}/>}
      {screen === 'login' && <LoginScreen onLogin={() => setScreen('register')}/>}
      {screen === 'register' && <RegistrationScreen onComplete={() => setScreen('app')}/>}
      {screen === 'app' && (
        <>
          <div className="fixed top-0 right-0 w-96 h-96 pointer-events-none opacity-15 blur-[100px]" style={{ background: 'radial-gradient(circle, #F5B800, transparent 70%)' }}/>
          <main className="relative z-10 pb-24 animate-fadeIn">
            {tab === 'home' && userType === 'customer' && <HomeCustomer user={user} promo={MOCK.promo}/>}
            {tab === 'home' && userType === 'employee' && <HomeEmployee user={user} promo={MOCK.promo}/>}
            {tab === 'home' && userType === 'partner' && <HomePartner user={user} promo={MOCK.promo}/>}
            {tab === 'me' && <MeScreen user={user} vouchers={MOCK.vouchers} myVouchers={MOCK.myVouchers} transactions={MOCK.transactions} referral={MOCK.referral} employeeVouchers={MOCK.employeeVouchers}/>}
          </main>
          <BottomNav tab={tab} setTab={setTab} onQR={() => setShowQR(true)}/>
          {showQR && <QRModal user={user} onClose={() => setShowQR(false)}/>}
        </>
      )}
    </div>
  );
}
