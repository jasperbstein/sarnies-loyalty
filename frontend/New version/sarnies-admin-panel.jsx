import React, { useState } from 'react';

// ============================================
// SARNIES ADMIN PANEL
// No emojis - clean SVG icons only
// ============================================

const C = {
  bg: '#0A0A0A',
  sidebar: '#0F0F0F',
  surface: '#141414',
  white: '#FFFFFF',
  gray: { 300: '#D4D4D4', 400: '#A3A3A3', 500: '#737373' },
  yellow: '#F5B800',
  green: '#4ADE80',
  red: '#F87171',
};

// SVG Icons
const Icon = {
  dashboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  building: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01"/></svg>,
  ticket: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/></svg>,
  creditCard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  megaphone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  trendUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  trendDown: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12"/></svg>,
};

// Mock Data
const MOCK = {
  stats: { total_users: 12847, active_today: 342, transactions_today: 1289, revenue_today: 487650, points_issued: 4876, vouchers_redeemed: 156 },
  users: [
    { id: 1, name: 'Kacper B.', email: 'kacper@gmail.com', phone: '+66812345678', user_type: 'customer', tier: 'Gold', points: 847, status: 'active' },
    { id: 2, name: 'Sarah M.', email: 'sarah@sarnies.com', phone: '+66823456789', user_type: 'employee', tier: null, points: 0, status: 'active' },
    { id: 3, name: 'James L.', email: 'james@acme.com', phone: '+66834567890', user_type: 'partner', tier: null, credits: 2500, status: 'active' },
    { id: 4, name: 'Emily W.', email: 'emily@gmail.com', phone: '+66845678901', user_type: 'customer', tier: 'Silver', points: 234, status: 'active' },
  ],
  companies: [
    { id: 1, name: 'Sarnies', type: 'internal', domains: ['sarnies.com'], employees: 45, discount: 50 },
    { id: 2, name: 'Acme Corp', type: 'partner', domains: ['acme.com'], employees: 12, credits_allocated: 50000 },
    { id: 3, name: 'BigCorp', type: 'corporate', domains: ['bigcorp.com'], employees: 8, discount: 10 },
  ],
  vouchers: [
    { id: 1, title: 'Free Americano', points: 30, category: 'drinks', redemptions: 1234, active: true },
    { id: 2, title: 'Croissant', points: 25, category: 'food', redemptions: 876, active: true },
    { id: 3, title: 'Signature Latte', points: 45, category: 'drinks', redemptions: 654, active: true },
    { id: 4, title: 'Breakfast Set', points: 80, category: 'food', redemptions: 432, active: true },
  ],
  transactions: [
    { id: 1, user: 'Kacper B.', type: 'earn', amount: 3200, points: 32, outlet: 'Sathorn', time: '10:23 AM' },
    { id: 2, user: 'Sarah M.', type: 'use', voucher: 'Daily Drink', outlet: 'Ekkamai', time: '10:15 AM' },
    { id: 3, user: 'James L.', type: 'credit', amount: -250, outlet: 'Thonglor', time: '9:58 AM' },
  ],
  settings: { global_multiplier: 1.0, tier_silver_threshold: 10000, tier_gold_threshold: 30000, tier_silver_bonus: 5, tier_gold_bonus: 10, points_per_100_thb: 1 },
};

// Components
const Button = ({ children, primary, danger, small, onClick, className = '' }) => (
  <button onClick={onClick} className={`px-4 py-2 rounded-lg font-medium transition-all ${small ? 'text-sm px-3 py-1.5' : ''} ${className} ${danger ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : primary ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-white/5 text-white hover:bg-white/10'}`}>{children}</button>
);

const Card = ({ children, className = '' }) => <div className={`rounded-xl p-5 ${className}`} style={{ background: C.surface, border: '1px solid rgba(255,255,255,0.05)' }}>{children}</div>;

const StatCard = ({ label, value, change, icon }) => (
  <Card>
    <div className="flex items-start justify-between">
      <div>
        <div className="text-gray-400 text-sm mb-1">{label}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {change !== undefined && <div className={`text-sm mt-1 flex items-center gap-1 ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>{change > 0 ? Icon.trendUp : Icon.trendDown} {Math.abs(change)}% vs yesterday</div>}
      </div>
      <div className="text-gray-500">{icon}</div>
    </div>
  </Card>
);

const Badge = ({ type, children }) => {
  const styles = { customer: 'bg-yellow-400/10 text-yellow-400', employee: 'bg-emerald-400/10 text-emerald-400', partner: 'bg-blue-400/10 text-blue-400', active: 'bg-green-400/10 text-green-400', inactive: 'bg-gray-400/10 text-gray-400', internal: 'bg-purple-400/10 text-purple-400', corporate: 'bg-orange-400/10 text-orange-400' };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[type] || styles.active}`}>{children}</span>;
};

const Table = ({ columns, data, actions }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead><tr className="border-b border-white/5">{columns.map((col) => <th key={col.key} className="text-left text-gray-400 text-sm font-medium py-3 px-4">{col.label}</th>)}{actions && <th className="text-right text-gray-400 text-sm font-medium py-3 px-4">Actions</th>}</tr></thead>
      <tbody>{data.map((row, i) => <tr key={row.id || i} className="border-b border-white/5 hover:bg-white/[0.02]">{columns.map((col) => <td key={col.key} className="py-3 px-4 text-white">{col.render ? col.render(row[col.key], row) : row[col.key]}</td>)}{actions && <td className="py-3 px-4 text-right">{actions(row)}</td>}</tr>)}</tbody>
    </table>
  </div>
);

const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.8)' }}>
    <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: C.surface }}>
      <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-white">{title}</h2><button onClick={onClose} className="text-gray-400 hover:text-white">{Icon.close}</button></div>
      {children}
    </div>
  </div>
);

const Input = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div className="mb-4">
    <label className="text-gray-400 text-sm mb-1 block">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10 focus:border-yellow-400 outline-none"/>
  </div>
);

// Pages
const DashboardPage = () => (
  <div>
    <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <StatCard label="Total Users" value={MOCK.stats.total_users.toLocaleString()} change={5.2} icon={Icon.users}/>
      <StatCard label="Active Today" value={MOCK.stats.active_today} change={12.3} icon={Icon.users}/>
      <StatCard label="Transactions Today" value={MOCK.stats.transactions_today.toLocaleString()} change={8.7} icon={Icon.creditCard}/>
      <StatCard label="Revenue Today" value={`฿${(MOCK.stats.revenue_today / 1000).toFixed(1)}k`} change={-2.1} icon={Icon.creditCard}/>
      <StatCard label="Points Issued" value={MOCK.stats.points_issued.toLocaleString()} change={15.4} icon={Icon.ticket}/>
      <StatCard label="Vouchers Redeemed" value={MOCK.stats.vouchers_redeemed} change={3.2} icon={Icon.ticket}/>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card><h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2><div className="space-y-3">{MOCK.transactions.map((t) => <div key={t.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"><div><div className="text-white text-sm">{t.user}</div><div className="text-gray-500 text-xs">{t.type === 'earn' && `Earned ${t.points} pts from ฿${t.amount}`}{t.type === 'use' && `Used ${t.voucher}`}{t.type === 'credit' && `Used ฿${Math.abs(t.amount)} credits`}</div></div><div className="text-gray-400 text-xs">{t.time}</div></div>)}</div></Card>
      <Card><h2 className="text-lg font-semibold text-white mb-4">Top Rewards</h2><div className="space-y-3">{MOCK.vouchers.slice(0, 4).map((v) => <div key={v.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"><div><div className="text-white text-sm">{v.title}</div><div className="text-gray-500 text-xs">{v.points} beans</div></div><div className="text-gray-400 text-sm">{v.redemptions.toLocaleString()} redeemed</div></div>)}</div></Card>
    </div>
  </div>
);

const UsersPage = () => {
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState(null);
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'user_type', label: 'Type', render: (v) => <Badge type={v}>{v}</Badge> },
    { key: 'tier', label: 'Tier', render: (v) => v || '—' },
    { key: 'points', label: 'Points/Credits', render: (v, row) => row.credits ? `฿${row.credits}` : v },
    { key: 'status', label: 'Status', render: (v) => <Badge type={v}>{v}</Badge> },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <div className="flex gap-3"><input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10 focus:border-yellow-400 outline-none w-64"/><Button primary>+ Add User</Button></div>
      </div>
      <Card><Table columns={columns} data={MOCK.users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))} actions={(row) => <div className="flex gap-2 justify-end"><Button small onClick={() => setEditUser(row)}>Edit</Button><Button small danger>Delete</Button></div>}/></Card>
      {editUser && <Modal title="Edit User" onClose={() => setEditUser(null)}><Input label="Name" value={editUser.name} onChange={() => {}}/><Input label="Email" value={editUser.email} onChange={() => {}}/><Input label="Phone" value={editUser.phone} onChange={() => {}}/><div className="mb-4"><label className="text-gray-400 text-sm mb-1 block">User Type</label><select className="w-full px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10"><option value="customer">Customer</option><option value="employee">Employee</option><option value="partner">Partner</option></select></div><div className="flex gap-3 mt-6"><Button className="flex-1" onClick={() => setEditUser(null)}>Cancel</Button><Button primary className="flex-1">Save Changes</Button></div></Modal>}
    </div>
  );
};

const CompaniesPage = () => {
  const [showAdd, setShowAdd] = useState(false);
  const columns = [
    { key: 'name', label: 'Company' },
    { key: 'type', label: 'Type', render: (v) => <Badge type={v}>{v}</Badge> },
    { key: 'domains', label: 'Domains', render: (v) => v.join(', ') },
    { key: 'employees', label: 'Employees' },
    { key: 'discount', label: 'Discount/Credits', render: (v, row) => row.credits_allocated ? `฿${row.credits_allocated.toLocaleString()}` : `${v}%` },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold text-white">Companies</h1><Button primary onClick={() => setShowAdd(true)}>+ Add Company</Button></div>
      <Card><Table columns={columns} data={MOCK.companies} actions={(row) => <div className="flex gap-2 justify-end"><Button small>Edit</Button>{row.type === 'partner' && <Button small primary>Grant Credits</Button>}</div>}/></Card>
      {showAdd && <Modal title="Add Company" onClose={() => setShowAdd(false)}><Input label="Company Name" value="" onChange={() => {}} placeholder="Enter company name"/><div className="mb-4"><label className="text-gray-400 text-sm mb-1 block">Type</label><select className="w-full px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10"><option value="internal">Internal (Staff)</option><option value="partner">Partner (Credits)</option><option value="corporate">Corporate (Discount)</option></select></div><Input label="Email Domains" value="" onChange={() => {}} placeholder="company.com"/><div className="flex gap-3 mt-6"><Button className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button><Button primary className="flex-1">Add Company</Button></div></Modal>}
    </div>
  );
};

const VouchersPage = () => {
  const [showAdd, setShowAdd] = useState(false);
  const columns = [
    { key: 'title', label: 'Voucher' },
    { key: 'points', label: 'Points', render: (v) => `${v} beans` },
    { key: 'category', label: 'Category', render: (v) => <Badge type="active">{v}</Badge> },
    { key: 'redemptions', label: 'Redemptions', render: (v) => v.toLocaleString() },
    { key: 'active', label: 'Status', render: (v) => <Badge type={v ? 'active' : 'inactive'}>{v ? 'Active' : 'Inactive'}</Badge> },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-6"><h1 className="text-2xl font-bold text-white">Vouchers</h1><Button primary onClick={() => setShowAdd(true)}>+ Add Voucher</Button></div>
      <Card><Table columns={columns} data={MOCK.vouchers} actions={(row) => <div className="flex gap-2 justify-end"><Button small>Edit</Button><Button small danger>{row.active ? 'Disable' : 'Enable'}</Button></div>}/></Card>
      {showAdd && <Modal title="Add Voucher" onClose={() => setShowAdd(false)}><Input label="Title" value="" onChange={() => {}} placeholder="Free Americano"/><Input label="Points Required" value="" onChange={() => {}} type="number" placeholder="30"/><div className="mb-4"><label className="text-gray-400 text-sm mb-1 block">Category</label><select className="w-full px-4 py-2 rounded-lg bg-white/5 text-white border border-white/10"><option value="drinks">Drinks</option><option value="food">Food</option><option value="special">Special</option></select></div><div className="flex gap-3 mt-6"><Button className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button><Button primary className="flex-1">Add Voucher</Button></div></Modal>}
    </div>
  );
};

const SettingsPage = () => {
  const [settings, setSettings] = useState(MOCK.settings);
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card><h2 className="text-lg font-semibold text-white mb-4">Points Configuration</h2><Input label="Points per 100 THB" value={settings.points_per_100_thb} onChange={(v) => setSettings({ ...settings, points_per_100_thb: v })} type="number"/><Input label="Global Multiplier" value={settings.global_multiplier} onChange={(v) => setSettings({ ...settings, global_multiplier: v })} type="number"/><p className="text-gray-500 text-sm">Set multiplier &gt; 1 for double points campaigns</p></Card>
        <Card><h2 className="text-lg font-semibold text-white mb-4">Tier Thresholds</h2><Input label="Silver Threshold (THB/year)" value={settings.tier_silver_threshold} onChange={(v) => setSettings({ ...settings, tier_silver_threshold: v })} type="number"/><Input label="Gold Threshold (THB/year)" value={settings.tier_gold_threshold} onChange={(v) => setSettings({ ...settings, tier_gold_threshold: v })} type="number"/></Card>
        <Card><h2 className="text-lg font-semibold text-white mb-4">Tier Bonuses</h2><Input label="Silver Bonus (%)" value={settings.tier_silver_bonus} onChange={(v) => setSettings({ ...settings, tier_silver_bonus: v })} type="number"/><Input label="Gold Bonus (%)" value={settings.tier_gold_bonus} onChange={(v) => setSettings({ ...settings, tier_gold_bonus: v })} type="number"/></Card>
        <Card><h2 className="text-lg font-semibold text-white mb-4">Danger Zone</h2><div className="space-y-3"><Button danger className="w-full">Reset All Points</Button><Button danger className="w-full">Clear All Transactions</Button></div><p className="text-red-400 text-sm mt-3">These actions cannot be undone</p></Card>
      </div>
      <div className="mt-6 flex justify-end gap-3">{saved && <span className="text-green-400 py-2">Settings saved</span>}<Button primary onClick={handleSave}>Save Settings</Button></div>
    </div>
  );
};

// Main App
export default function SarniesAdminPanel() {
  const [page, setPage] = useState('dashboard');
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Icon.dashboard },
    { id: 'users', label: 'Users', icon: Icon.users },
    { id: 'companies', label: 'Companies', icon: Icon.building },
    { id: 'vouchers', label: 'Vouchers', icon: Icon.ticket },
    { id: 'transactions', label: 'Transactions', icon: Icon.creditCard },
    { id: 'announcements', label: 'Announcements', icon: Icon.megaphone },
    { id: 'settings', label: 'Settings', icon: Icon.settings },
  ];

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage/>;
      case 'users': return <UsersPage/>;
      case 'companies': return <CompaniesPage/>;
      case 'vouchers': return <VouchersPage/>;
      case 'settings': return <SettingsPage/>;
      default: return <div className="text-center py-20"><div className="text-gray-500 text-4xl mb-4">Coming Soon</div><div className="text-gray-600">{page} page is under construction</div></div>;
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: C.bg, fontFamily: "'SF Pro Display', -apple-system, sans-serif" }}>
      <aside className="w-64 flex-shrink-0 border-r border-white/5" style={{ background: C.sidebar }}>
        <div className="p-6"><div className="text-xl font-bold text-white">SARNIES</div><div className="text-yellow-400 text-sm">Admin Panel</div></div>
        <nav className="px-3">{navItems.map((item) => <button key={item.id} onClick={() => setPage(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors ${page === item.id ? 'bg-yellow-400/10 text-yellow-400' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}><span>{item.icon}</span><span className="font-medium">{item.label}</span></button>)}</nav>
        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-white/5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">A</div><div><div className="text-white text-sm font-medium">Admin User</div><div className="text-gray-500 text-xs">admin@sarnies.com</div></div></div></div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{renderPage()}</main>
    </div>
  );
}
