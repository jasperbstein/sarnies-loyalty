'use client';

/**
 * SARNIES DESIGN SYSTEM v1.2
 * Master Specification Showcase
 *
 * Principles:
 * 1. Editorial over UI
 * 2. Spacing over decoration
 * 3. Black & white first
 * 4. Real content over visual tricks
 * 5. Confidence through restraint
 */

import { useState } from 'react';
import {
  Check, X, AlertCircle, Info, ChevronRight, Search,
  Home, User, Ticket, History, Coffee, Gift, Star
} from 'lucide-react';

export default function DesignSystemPage() {
  const [activeSection, setActiveSection] = useState('principles');

  const sections = [
    { id: 'principles', label: 'Principles' },
    { id: 'typography', label: 'Typography' },
    { id: 'colors', label: 'Colors' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'cards', label: 'Cards' },
    { id: 'forms', label: 'Forms' },
    { id: 'badges', label: 'Badges' },
    { id: 'navigation', label: 'Navigation' },
    { id: 'forbidden', label: 'Forbidden' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black">
        <div className="max-w-6xl mx-auto px-8 h-[72px] flex items-center justify-between">
          <span className="text-[11px] font-medium text-white uppercase tracking-[0.2em]">
            SARNIES
          </span>
          <span className="text-[11px] font-medium text-white/60 uppercase tracking-[0.15em]">
            Design System v1.2
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-16">
        {/* Hero */}
        <div className="mb-24">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.3em] mb-4">
            SARNIES
          </p>
          <h1 className="text-[40px] font-medium text-black leading-tight mb-6">
            Design System
          </h1>
          <p className="text-[15px] text-gray-500 leading-relaxed max-w-xl mb-8">
            Master specification for all Sarnies digital products. Marketing website, loyalty app, and internal tools.
          </p>

          {/* Section Navigation */}
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className={`px-4 py-2 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${
                  activeSection === section.id
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>

        {/* ============================================ */}
        {/* 0. CORE PRINCIPLES */}
        {/* ============================================ */}
        <section id="principles" className="mb-24">
          <SectionHeader
            number="0"
            title="Core Principles"
            subtitle="MANDATORY"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { num: '01', title: 'Editorial over UI', desc: 'Design like a magazine, not a dashboard.' },
              { num: '02', title: 'Spacing over decoration', desc: 'Let content breathe. Avoid visual clutter.' },
              { num: '03', title: 'Black & white first', desc: 'Color is contextual, not primary.' },
              { num: '04', title: 'Real content over tricks', desc: 'No gradients, glass, or blur effects.' },
              { num: '05', title: 'Confidence through restraint', desc: 'If a component draws attention - it is wrong.' },
            ].map((principle) => (
              <div
                key={principle.num}
                className="p-6 border border-gray-200"
              >
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em]">
                  {principle.num}
                </span>
                <h3 className="text-[15px] font-medium text-black mt-2 mb-2">
                  {principle.title}
                </h3>
                <p className="text-[13px] text-gray-500 leading-relaxed">
                  {principle.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* 1. TYPOGRAPHY */}
        {/* ============================================ */}
        <section id="typography" className="mb-24">
          <SectionHeader
            number="1"
            title="Typography System"
            subtitle="Inter (Circular Std alternative). Medium for titles, Book for body."
          />

          {/* Rules */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <RuleCard title="Weights">
              <ul className="space-y-1 text-[13px] text-gray-600">
                <li><strong>Book</strong> - body, descriptions</li>
                <li><strong>Medium</strong> - headings, labels, nav</li>
                <li className="text-red-500">❌ No Bold body text</li>
              </ul>
            </RuleCard>
            <RuleCard title="Case Rules">
              <ul className="space-y-1 text-[13px] text-gray-600">
                <li>Headings / nav: <strong>ALL CAPS</strong></li>
                <li>Body text: sentence case</li>
                <li className="text-red-500">❌ No mixed casing in headers</li>
              </ul>
            </RuleCard>
            <RuleCard title="Tracking">
              <ul className="space-y-1 text-[13px] text-gray-600">
                <li>Headings: <strong>+200 to +300</strong></li>
                <li>Body: <strong>-10</strong></li>
                <li>Navigation: <strong>+200</strong></li>
              </ul>
            </RuleCard>
          </div>

          {/* Type Scale */}
          <div className="border border-gray-200 p-8">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-8">
              TYPE SCALE (DESKTOP)
            </p>
            <div className="space-y-8">
              {[
                { name: 'H1', size: '40-44px', usage: 'Hero only', example: 'SARNIES SINGAPORE', style: 'text-[42px] font-medium uppercase tracking-[0.2em]' },
                { name: 'H2', size: '28-32px', usage: 'Page titles', example: 'YOUR BENEFITS', style: 'text-[30px] font-medium uppercase tracking-[0.2em]' },
                { name: 'H3', size: '20-22px', usage: 'Section titles', example: 'HOW IT WORKS', style: 'text-[21px] font-medium uppercase tracking-[0.15em]' },
                { name: 'Title', size: '1.1x body', usage: 'Card titles, labels', example: 'TITLE LABEL', style: 'text-[17px] font-medium uppercase tracking-[0.2em]' },
                { name: 'Body', size: '15-16px', usage: 'Default', example: 'View all your employee vouchers and redeem benefits at any Sarnies location.', style: 'text-[15px] font-normal tracking-[-0.01em] leading-relaxed' },
                { name: 'Small', size: '13px', usage: 'Meta / captions', example: '3 redemptions remaining today', style: 'text-[13px] font-normal tracking-[-0.01em]' },
              ].map((type) => (
                <div key={type.name} className="flex items-baseline gap-8 pb-8 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="w-20 flex-shrink-0">
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.1em]">{type.name}</span>
                    <p className="text-[11px] text-gray-300 mt-1">{type.size}</p>
                  </div>
                  <div className="flex-1">
                    <p className={`text-black ${type.style}`}>{type.example}</p>
                  </div>
                  <div className="w-32 flex-shrink-0 text-right">
                    <span className="text-[11px] text-gray-400">{type.usage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* 2. COLOR SYSTEM */}
        {/* ============================================ */}
        <section id="colors" className="mb-24">
          <SectionHeader
            number="2"
            title="Color System"
            subtitle="Black & white first. Accent colors are contextual only."
          />

          {/* Core Neutrals */}
          <div className="mb-12">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-6">
              CORE NEUTRALS (GLOBAL)
            </p>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
              {[
                { name: 'black', hex: '#000000', text: 'white' },
                { name: 'gray-900', hex: '#0E0E0E', text: 'white' },
                { name: 'gray-700', hex: '#2A2A2A', text: 'white' },
                { name: 'gray-500', hex: '#6F6F6F', text: 'white' },
                { name: 'gray-300', hex: '#CFCFCF', text: 'black' },
                { name: 'gray-100', hex: '#F5F5F5', text: 'black' },
                { name: 'white', hex: '#FFFFFF', text: 'black', border: true },
              ].map((color) => (
                <div key={color.name}>
                  <div
                    className="h-20 mb-2"
                    style={{
                      backgroundColor: color.hex,
                      border: color.border ? '1px solid #E5E5E5' : 'none'
                    }}
                  />
                  <p className="text-[10px] font-medium text-black uppercase tracking-wide">{color.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{color.hex}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Accent Colors */}
          <div className="p-6 bg-gray-50 border border-gray-200">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
              ACCENT COLORS (CONTEXTUAL ONLY)
            </p>
            <p className="text-[13px] text-gray-600 mb-4">
              Accents are per page / per product. Never use for primary text.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] text-gray-500 px-3 py-1.5 bg-white border border-gray-200">Progress bars</span>
              <span className="text-[11px] text-gray-500 px-3 py-1.5 bg-white border border-gray-200">Pills / badges</span>
              <span className="text-[11px] text-gray-500 px-3 py-1.5 bg-white border border-gray-200">Background sections</span>
              <span className="text-[11px] text-gray-500 px-3 py-1.5 bg-white border border-gray-200">Highlights</span>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* 3. SPACING SYSTEM */}
        {/* ============================================ */}
        <section id="spacing" className="mb-24">
          <SectionHeader
            number="3"
            title="Spacing System"
            subtitle="8px grid. When unsure - use more space, not less."
          />

          <div className="grid md:grid-cols-2 gap-8">
            {/* Spacing Scale */}
            <div className="border border-gray-200 p-6">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-6">
                SPACING SCALE
              </p>
              <div className="space-y-3">
                {[
                  { name: 'micro', value: '4px' },
                  { name: 'xs', value: '8px' },
                  { name: 'sm', value: '16px' },
                  { name: 'md', value: '24px' },
                  { name: 'lg', value: '32px' },
                  { name: 'xl', value: '48px' },
                  { name: '2xl', value: '64px' },
                  { name: 'hero', value: '96px' },
                ].map((space) => (
                  <div key={space.name} className="flex items-center gap-4">
                    <span className="w-12 text-[10px] font-medium text-gray-400 uppercase">{space.name}</span>
                    <div className="h-4 bg-black" style={{ width: space.value }} />
                    <span className="text-[11px] text-gray-400">{space.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Layout Rules */}
            <div className="space-y-4">
              <RuleCard title="Page Padding">
                <ul className="space-y-1 text-[13px] text-gray-600">
                  <li>Desktop: <strong>48px min</strong></li>
                  <li>Tablet: 32px</li>
                  <li>Mobile: 20-24px</li>
                </ul>
              </RuleCard>
              <RuleCard title="Content Width">
                <ul className="space-y-1 text-[13px] text-gray-600">
                  <li>Max width: <strong>1200-1280px</strong></li>
                  <li>Text-heavy: 720-840px</li>
                </ul>
              </RuleCard>
              <RuleCard title="Vertical Rhythm">
                <ul className="space-y-1 text-[13px] text-gray-600">
                  <li>Section separation: <strong>64-96px</strong></li>
                  <li>Component spacing: 24-48px</li>
                </ul>
              </RuleCard>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* 9. BUTTONS */}
        {/* ============================================ */}
        <section id="buttons" className="mb-24">
          <SectionHeader
            number="9"
            title="Buttons"
            subtitle="No gradients. No pills. No shadows. No icons in primary CTAs."
          />

          <div className="border border-gray-200 p-8">
            <div className="space-y-10">
              {/* Primary */}
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
                  PRIMARY
                </p>
                <div className="flex flex-wrap gap-4">
                  <button className="btn-primary">
                    REDEEM NOW
                  </button>
                  <button className="btn-primary opacity-50 cursor-not-allowed">
                    DISABLED
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-3">
                  Black background · White text · Tracking +200 · Padding 14px 20px · Radius 0-4px
                </p>
              </div>

              {/* Secondary */}
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
                  SECONDARY
                </p>
                <div className="flex flex-wrap gap-4">
                  <button className="btn-secondary">
                    CANCEL
                  </button>
                  <button className="btn-secondary">
                    VIEW DETAILS
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-3">
                  White background · 1px black border · Hover: opacity only
                </p>
              </div>

              {/* Ghost */}
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
                  GHOST / LINK
                </p>
                <div className="flex flex-wrap gap-4">
                  <button className="btn-ghost">
                    Menu ↗
                  </button>
                  <button className="btn-ghost">
                    Reservation ↗
                  </button>
                  <button className="btn-ghost">
                    Map Location ↗
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-3">
                  Text only · No underline by default · Hover: underline · Use ↗ character only
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* 8. CARDS & CONTAINERS */}
        {/* ============================================ */}
        <section id="cards" className="mb-24">
          <SectionHeader
            number="8"
            title="Cards & Containers"
            subtitle="Cards must blend into layout. No shadows. No floating."
          />

          <div className="grid md:grid-cols-2 gap-8">
            {/* Standard Card */}
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
                STANDARD CARD
              </p>
              <div className="card p-6">
                <h3 className="text-[14px] font-medium text-black uppercase tracking-[0.1em] mb-2">
                  BROWSE ALL BENEFITS
                </h3>
                <p className="text-[13px] text-gray-500">
                  View all your employee vouchers and redeem at any location.
                </p>
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                Background: #FFFFFF · Border: 1px #E5E5E5 · Radius: 0-4px · Padding: 24-32px
              </p>
            </div>

            {/* Dark Card */}
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
                DARK CARD
              </p>
              <div className="card-dark p-6">
                <p className="text-[11px] text-white/40 uppercase tracking-[0.1em] mb-1">Welcome back</p>
                <h3 className="text-[18px] font-medium text-white uppercase tracking-[0.15em] mb-2">
                  SUNDAY
                </h3>
                <p className="text-[11px] text-white/40">
                  Employee #000022
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* 10. FORMS & INPUTS */}
        {/* ============================================ */}
        <section id="forms" className="mb-24">
          <SectionHeader
            number="10"
            title="Forms & Inputs"
            subtitle="Underline-only inputs. Focus: black underline. Errors: text-only."
          />

          <div className="border border-gray-200 p-8 max-w-lg">
            <div className="space-y-8">
              {/* Underline Input */}
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="input-underline"
                />
              </div>

              {/* Standard Input */}
              <div>
                <label className="label">Phone number</label>
                <input
                  type="tel"
                  placeholder="+66 XXX XXX XXXX"
                  className="input"
                />
              </div>

              {/* Search */}
              <div>
                <label className="label">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search vouchers..."
                    className="input pl-10"
                  />
                </div>
              </div>

              {/* Error State */}
              <div>
                <label className="label">With error</label>
                <input
                  type="text"
                  className="input-underline border-b-red-500"
                  defaultValue="Invalid input"
                />
                <p className="error-text">This field is required</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* BADGES */}
        {/* ============================================ */}
        <section id="badges" className="mb-24">
          <SectionHeader
            number="13"
            title="Badges & Status"
            subtitle="Small, contextual color only. Minimal."
          />

          <div className="border border-gray-200 p-8">
            <div className="space-y-8">
              {/* Status Badges */}
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
                  STATUS BADGES
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="badge badge-success">
                    <Check className="w-3 h-3 mr-1" /> Active
                  </span>
                  <span className="badge badge-warning">
                    <AlertCircle className="w-3 h-3 mr-1" /> Pending
                  </span>
                  <span className="badge badge-error">
                    <X className="w-3 h-3 mr-1" /> Expired
                  </span>
                  <span className="badge badge-default">
                    <Info className="w-3 h-3 mr-1" /> Info
                  </span>
                </div>
              </div>

              {/* Feature Badges */}
              <div>
                <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
                  FEATURE BADGES
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1 bg-black text-white text-[10px] font-medium uppercase tracking-wide">
                    Featured
                  </span>
                  <span className="px-3 py-1 bg-accent text-white text-[10px] font-medium uppercase tracking-wide">
                    New
                  </span>
                  <span className="badge badge-default">
                    Employee
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* NAVIGATION */}
        {/* ============================================ */}
        <section id="navigation" className="mb-24">
          <SectionHeader
            number="5"
            title="Navigation"
            subtitle="Height: 72px desktop / 64px mobile. Logo left, nav right."
          />

          <div className="space-y-8">
            {/* Header Example */}
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
                HEADER BAR
              </p>
              <div className="bg-black h-[72px] flex items-center justify-between px-8">
                <span className="text-[11px] font-medium text-white uppercase tracking-[0.2em]">
                  SARNIES
                </span>
                <div className="flex gap-8">
                  {['Menu', 'Locations', 'About'].map((item) => (
                    <span key={item} className="text-[11px] font-medium text-white uppercase tracking-[0.2em] opacity-85 hover:opacity-100 cursor-pointer">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                ALL CAPS · Tracking +200 · Hover: opacity 85% · No underlines · No icons · No pills
              </p>
            </div>

            {/* Bottom Nav Example */}
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.15em] mb-4">
                BOTTOM TAB BAR
              </p>
              <div className="bg-white border border-gray-200 h-[68px] flex items-center justify-around px-4">
                {[
                  { icon: Home, label: 'HOME', active: true },
                  { icon: Ticket, label: 'VOUCHERS', active: false },
                  { icon: History, label: 'HISTORY', active: false },
                  { icon: User, label: 'PROFILE', active: false },
                ].map((item) => (
                  <button key={item.label} className="flex flex-col items-center gap-1">
                    <div className="relative">
                      <item.icon
                        className={`w-[22px] h-[22px] ${
                          item.active ? 'text-black stroke-[2]' : 'text-gray-400 stroke-[1.5]'
                        }`}
                      />
                      {item.active && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                      )}
                    </div>
                    <span className={`text-[10px] font-medium tracking-wide ${
                      item.active ? 'text-black' : 'text-gray-400'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-3">
                Height: 68px + safe area · Active: accent dot indicator · No separators
              </p>
            </div>
          </div>
        </section>

        {/* ============================================ */}
        {/* EXPLICITLY FORBIDDEN */}
        {/* ============================================ */}
        <section id="forbidden" className="mb-24">
          <SectionHeader
            number="15"
            title="Explicitly Forbidden"
            subtitle="GLOBAL RULES"
          />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'Centered page titles',
              'Decorative icons',
              'Shadows as default',
              'Gradients',
              'Glass/blur effects',
              'Pill-shaped buttons',
              'Tight edge alignment',
              'Over-designed components',
              'Bold body text',
              'Mixed casing in headers',
              'Icons in primary CTAs',
              'Rounded image corners',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-100"
              >
                <X className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-[13px] text-red-700">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ============================================ */}
        {/* DESIGN TOKENS EXPORT */}
        {/* ============================================ */}
        <section className="mb-24">
          <SectionHeader
            number="-"
            title="Design Tokens"
            subtitle="CSS Custom Properties"
          />

          <div className="bg-black p-8 overflow-x-auto">
            <pre className="text-[12px] text-white/90 font-mono whitespace-pre-wrap">
{`:root {
  /* Colors */
  --color-black: #000000;
  --color-white: #FFFFFF;
  --color-gray-900: #0E0E0E;
  --color-gray-700: #2A2A2A;
  --color-gray-500: #6F6F6F;
  --color-gray-300: #CFCFCF;
  --color-gray-100: #F5F5F5;

  /* Accent (contextual) */
  --color-accent: #D4A853;
  --color-accent-muted: rgba(212, 168, 83, 0.15);

  /* Typography */
  --font-primary: 'Circular Std', -apple-system, sans-serif;
  --tracking-tight: -0.01em;
  --tracking-wide: 0.1em;
  --tracking-wider: 0.2em;
  --tracking-widest: 0.3em;

  /* Spacing (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;

  /* Layout */
  --container-max: 1280px;
  --container-content: 840px;
  --header-height: 72px;
  --bottom-nav-height: 68px;

  /* Borders */
  --radius-none: 0;
  --radius-sm: 2px;
  --radius-default: 4px;
  --border-color: #E5E5E5;
}`}
            </pre>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-16 border-t border-gray-100">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.2em]">
            SARNIES DESIGN SYSTEM · V1.2 · DECEMBER 2025
          </p>
          <p className="text-[13px] text-gray-400 mt-2">
            Anything not defined here should not exist unless explicitly approved.
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ============================================ */
/* HELPER COMPONENTS */
/* ============================================ */

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="mb-8 pb-4 border-b border-gray-200">
      <div className="flex items-baseline gap-4">
        <span className="text-[11px] font-medium text-gray-300">{number}</span>
        <h2 className="text-[21px] font-medium text-black uppercase tracking-[0.15em]">
          {title}
        </h2>
      </div>
      <p className="text-[13px] text-gray-500 mt-2">{subtitle}</p>
    </div>
  );
}

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 bg-gray-50 border border-gray-200">
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-[0.1em] mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}
