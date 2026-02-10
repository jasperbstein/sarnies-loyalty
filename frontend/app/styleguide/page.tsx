'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/customer/ui/SectionCard';
import { X, QrCode, Gift, Activity, TrendingUp, Star, ChevronRight, Search, Home, User } from 'lucide-react';

export default function StyleguidePage() {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sarnies Loyalty UI Styleguide</h1>
          <p className="text-lg text-gray-600">Complete component library and design system</p>
        </div>

        {/* Color Palette */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Color Palette</h2>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Primary Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-24 bg-black rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#000000</p>
                <p className="text-sm text-gray-600">Primary Black</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-white border-2 border-gray-200 rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#FFFFFF</p>
                <p className="text-sm text-gray-600">Primary White</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-[#F5F5F5] rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#F5F5F5</p>
                <p className="text-sm text-gray-600">Background Gray</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-[#FFA500] rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#FFA500</p>
                <p className="text-sm text-gray-600">Accent Orange</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Text Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-24 bg-[#1B1B1B] rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#1B1B1B</p>
                <p className="text-sm text-gray-600">Primary Text</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-[#6F6F6F] rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#6F6F6F</p>
                <p className="text-sm text-gray-600">Secondary Text</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-[#9CA3AF] rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#9CA3AF</p>
                <p className="text-sm text-gray-600">Tertiary Text</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-gray-400 rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#9CA3AF</p>
                <p className="text-sm text-gray-600">Disabled Text</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Status Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="h-24 bg-green-500 rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#10B981</p>
                <p className="text-sm text-gray-600">Success</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-red-500 rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#EF4444</p>
                <p className="text-sm text-gray-600">Error/Danger</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-yellow-500 rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#F59E0B</p>
                <p className="text-sm text-gray-600">Warning</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-blue-500 rounded-lg shadow-md"></div>
                <p className="font-mono text-sm">#3B82F6</p>
                <p className="text-sm text-gray-600">Info</p>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Typography</h2>
          <div className="bg-white p-8 rounded-xl shadow-sm space-y-6">
            <div>
              <h1 className="text-[32px] font-bold text-[#1B1B1B]">Heading 1 - 32px Bold</h1>
              <code className="text-sm text-gray-500">text-[32px] font-bold</code>
            </div>
            <div>
              <h2 className="text-[24px] font-semibold text-[#1B1B1B]">Heading 2 - 24px Semibold</h2>
              <code className="text-sm text-gray-500">text-[24px] font-semibold</code>
            </div>
            <div>
              <h3 className="text-[20px] font-semibold text-[#1B1B1B]">Heading 3 - 20px Semibold</h3>
              <code className="text-sm text-gray-500">text-[20px] font-semibold</code>
            </div>
            <div>
              <h4 className="text-[16px] font-semibold text-[#1B1B1B]">Heading 4 - 16px Semibold</h4>
              <code className="text-sm text-gray-500">text-[16px] font-semibold</code>
            </div>
            <div>
              <p className="text-[14px] text-[#1B1B1B]">Body Text - 14px Regular</p>
              <code className="text-sm text-gray-500">text-[14px]</code>
            </div>
            <div>
              <p className="text-[13px] text-[#6F6F6F]">Secondary Text - 13px Regular</p>
              <code className="text-sm text-gray-500">text-[13px] text-[#6F6F6F]</code>
            </div>
            <div>
              <p className="text-[11px] text-[#9CA3AF]">Caption - 11px Regular</p>
              <code className="text-sm text-gray-500">text-[11px] text-[#9CA3AF]</code>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Buttons</h2>
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Primary Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="primary" disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Secondary Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="secondary" disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Danger Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="danger">Danger Button</Button>
                  <Button variant="danger" disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Ghost Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="ghost" disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Success Buttons</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="success">Success Button</Button>
                  <Button variant="success" disabled>Disabled</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Sizes</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="primary" size="sm">Small</Button>
                  <Button variant="primary" size="md">Medium</Button>
                  <Button variant="primary" size="lg">Large</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Loading State</h3>
                <div className="flex flex-wrap gap-4">
                  <Button variant="primary" loading>Loading...</Button>
                  <Button variant="secondary" loading>Loading...</Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Full Width</h3>
                <Button variant="primary" fullWidth>Full Width Button</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Cards</h2>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Section Card</h3>
            <SectionCard>
              <h3 className="text-[16px] font-semibold text-[#1B1B1B] mb-2">Card Title</h3>
              <p className="text-[14px] text-[#6F6F6F]">
                This is a section card with white background, rounded corners, and subtle shadow.
              </p>
            </SectionCard>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Reward Card</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-sm">
              <div className="h-32 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                <Gift className="w-12 h-12 text-white" />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[16px] font-semibold text-[#1B1B1B]">Free Coffee</h3>
                  <span className="text-[14px] font-bold text-[#FFA500]">50 pts</span>
                </div>
                <p className="text-[13px] text-[#6F6F6F] mb-3">
                  Redeem for any regular size coffee
                </p>
                <Button variant="primary" fullWidth>Redeem</Button>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Stat Card</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-orange-600" />
                  </div>
                  <span className="text-[13px] text-[#6F6F6F]">Total Points</span>
                </div>
                <p className="text-[28px] font-bold text-[#1B1B1B]">250</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-[13px] text-[#6F6F6F]">Total Spent</span>
                </div>
                <p className="text-[28px] font-bold text-[#1B1B1B]">฿1,250</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-[13px] text-[#6F6F6F]">Visits</span>
                </div>
                <p className="text-[28px] font-bold text-[#1B1B1B]">42</p>
              </div>
            </div>
          </div>
        </section>

        {/* Forms */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Form Elements</h2>
          <div className="bg-white p-8 rounded-xl shadow-sm space-y-6">
            <div>
              <label className="block text-[14px] font-medium text-[#1B1B1B] mb-2">
                Text Input
              </label>
              <input
                type="text"
                placeholder="Enter text..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1B1B1B] mb-2">
                Search Input
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#1B1B1B] mb-2">
                Select Dropdown
              </label>
              <select className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent">
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-5 h-5 rounded border-gray-300" />
                <span className="text-[14px] text-[#1B1B1B]">Checkbox Label</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input type="radio" className="w-5 h-5 border-gray-300" />
                <span className="text-[14px] text-[#1B1B1B]">Radio Label</span>
              </label>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Navigation</h2>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Bottom Navigation</h3>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <nav className="flex justify-around">
                {[
                  { icon: Home, label: 'Home', active: true },
                  { icon: Gift, label: 'Rewards', active: false },
                  { icon: Activity, label: 'Activity', active: false },
                  { icon: User, label: 'Profile', active: false }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                      item.active ? 'text-black' : 'text-gray-400'
                    }`}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">List Item Navigation</h3>
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              {['Account Settings', 'Notification Preferences', 'Help & Support'].map((item, idx) => (
                <button
                  key={idx}
                  className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-[14px] text-[#1B1B1B]">{item}</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Modals */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Modals & Overlays</h2>
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <Button variant="primary" onClick={() => setShowModal(true)}>
              Open Modal
            </Button>
          </div>

          {showModal && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Modal Title</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
                <p className="text-[14px] text-[#6F6F6F] mb-6">
                  This is a modal dialog with backdrop blur and smooth animations.
                </p>
                <div className="flex gap-3">
                  <Button variant="secondary" fullWidth onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" fullWidth onClick={() => setShowModal(false)}>
                    Confirm
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Badges & Tags */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Badges & Tags</h2>
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 bg-green-100 text-green-700 text-[12px] font-medium rounded-full">
                  Active
                </span>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 text-[12px] font-medium rounded-full">
                  Featured
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[12px] font-medium rounded-full">
                  New
                </span>
                <span className="px-3 py-1 bg-red-100 text-red-700 text-[12px] font-medium rounded-full">
                  Expired
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[12px] font-medium rounded-full">
                  Inactive
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <span className="px-3 py-1 bg-black text-white text-[12px] font-medium rounded-md">
                  Category
                </span>
                <span className="px-3 py-1 border border-gray-300 text-gray-700 text-[12px] font-medium rounded-md">
                  Tag
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Icons */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Icons (Lucide React)</h2>
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
              {[
                { Icon: Home, label: 'Home' },
                { Icon: Gift, label: 'Gift' },
                { Icon: Activity, label: 'Activity' },
                { Icon: User, label: 'User' },
                { Icon: QrCode, label: 'QR Code' },
                { Icon: Star, label: 'Star' },
                { Icon: TrendingUp, label: 'Trending' },
                { Icon: Search, label: 'Search' },
              ].map(({ Icon, label }, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-6 h-6 text-gray-700" />
                  </div>
                  <span className="text-[11px] text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Spacing */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Spacing Scale</h2>
          <div className="bg-white p-8 rounded-xl shadow-sm space-y-4">
            {[
              { size: '0.25rem', px: '1', name: '1 (4px)' },
              { size: '0.5rem', px: '2', name: '2 (8px)' },
              { size: '0.75rem', px: '3', name: '3 (12px)' },
              { size: '1rem', px: '4', name: '4 (16px)' },
              { size: '1.25rem', px: '5', name: '5 (20px)' },
              { size: '1.5rem', px: '6', name: '6 (24px)' },
              { size: '2rem', px: '8', name: '8 (32px)' },
            ].map((space, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="w-32 text-[13px] text-gray-600">{space.name}</div>
                <div className="h-8 bg-orange-500 rounded" style={{ width: space.size }}></div>
              </div>
            ))}
          </div>
        </section>

        {/* Border Radius */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Border Radius</h2>
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { radius: 'rounded-none', label: 'None (0px)' },
                { radius: 'rounded-md', label: 'Small (6px)' },
                { radius: 'rounded-lg', label: 'Medium (8px)' },
                { radius: 'rounded-xl', label: 'Large (12px)' },
                { radius: 'rounded-2xl', label: 'XL (16px)' },
                { radius: 'rounded-full', label: 'Full (9999px)' },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className={`h-20 bg-gray-200 mb-2 ${item.radius}`}></div>
                  <p className="text-[13px] text-gray-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Shadows */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Shadows</h2>
          <div className="bg-white p-8 rounded-xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { shadow: 'shadow-sm', label: 'Small' },
                { shadow: 'shadow-md', label: 'Medium' },
                { shadow: 'shadow-lg', label: 'Large' },
                { shadow: 'shadow-xl', label: 'Extra Large' },
                { shadow: 'shadow-2xl', label: '2X Large' },
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className={`h-24 bg-white rounded-xl mb-2 ${item.shadow}`}></div>
                  <p className="text-[13px] text-gray-600">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
