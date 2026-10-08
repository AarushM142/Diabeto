import React, { useState } from 'react';
import { 
  Heart, Stethoscope, Sparkles, Terminal, HeartHandshake, 
  Globe, Type, Shield, Menu, X, Phone, ChevronRight
} from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import type { UserRole } from '../api/client';

export type ActiveTab = 'patient' | 'clinician' | 'coach' | 'caregiver' | 'simulator';

interface SidebarNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (simple: boolean) => void;
  isBackendHealthy: boolean;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
}

const ROLE_PROFILES: Record<UserRole, { name: string; title: string; avatar: string }> = {
  clinician: {
    name: 'Dr. Arvind Mehta',
    title: 'Senior Diabetologist • Pune Central',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80',
  },
  coach: {
    name: 'Sister Kavita Deshmukh',
    title: 'Care Coordinator & Nutrition Coach',
    avatar: 'https://images.unsplash.com/photo-1594824813589-8d77c25091a1?w=100&auto=format&fit=crop&q=80',
  },
  caregiver: {
    name: 'Ananya Kulkarni',
    title: 'Primary Family Caregiver (Daughter)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
  },
  admin: {
    name: 'Clinic Admin Desk',
    title: 'Pune Central Diabetes Clinic',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
  },
};

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  isSimpleMode,
  setIsSimpleMode,
  isBackendHealthy,
  currentRole,
  setCurrentRole,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const currentProfile = ROLE_PROFILES[currentRole] || ROLE_PROFILES.clinician;

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  const navItems = [
    {
      id: 'patient' as ActiveTab,
      label: t('tabPatient', language),
      icon: Heart,
      badge: 'Senior View',
      color: 'var(--accent-sage)',
    },
    {
      id: 'clinician' as ActiveTab,
      label: t('tabClinician', language),
      icon: Stethoscope,
      badge: 'MD Only',
      color: 'var(--status-ok)',
    },
    {
      id: 'coach' as ActiveTab,
      label: t('tabCoach', language),
      icon: Sparkles,
      badge: 'Coach',
      color: 'var(--terracotta)',
    },
    {
      id: 'caregiver' as ActiveTab,
      label: t('tabCaregiver', language),
      icon: HeartHandshake,
      badge: 'Family',
      color: 'var(--text-forest)',
    },
    {
      id: 'simulator' as ActiveTab,
      label: t('tabSimulator', language),
      icon: Terminal,
      badge: 'Interactive',
      color: 'var(--text-muted)',
    },
  ];

  return (
    <>
      {/* 1. Mobile Top Header (Visible strictly on <= 991px) */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open Navigation"
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              color: 'var(--text-forest)',
            }}
          >
            <Menu size={24} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-forest)' }}>
              diabeto.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <a
            href="tel:+918149680369"
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'var(--status-danger-border)', color: 'var(--status-danger)', backgroundColor: 'var(--status-danger-bg)' }}
          >
            <Phone size={12} />
            SOS
          </a>

          <button
            onClick={() => setIsSimpleMode(!isSimpleMode)}
            className="btn btn-secondary btn-sm"
            type="button"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            <Type size={12} />
            {isSimpleMode ? '19px' : '16px'}
          </button>
        </div>
      </header>

      {/* 2. Desktop Solid In-Flow Sidebar (Visible on >= 992px) */}
      <aside className="desktop-sidebar">
        {/* Logo & Brand Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-stone)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--accent-sage)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '1.25rem',
              fontFamily: 'var(--font-serif)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              d.
            </div>
            <div>
              <span className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>
                diabeto.
              </span>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '2px' }}>
                Senior Care Platform
              </div>
            </div>
          </div>

          {/* Active Clinic Badge */}
          <div style={{ background: 'var(--surface-clay)', padding: '6px 10px', borderRadius: '10px', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="status-dot ok" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-forest)', fontWeight: 600 }}>
              Pune Central Diabetes Clinic
            </span>
          </div>
        </div>

        {/* Active Persona / Role Switcher */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-stone)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Shield size={12} />
            Active Role / Persona
          </div>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as UserRole)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '10px',
              border: '1px solid var(--border-stone)',
              background: 'var(--surface-clay)',
              fontSize: '0.8rem',
              color: 'var(--text-forest)',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="clinician">👨‍⚕️ Dr. Mehta (Clinician)</option>
            <option value="coach">🌿 Sister Kavita (Coach)</option>
            <option value="caregiver">👧 Ananya K. (Caregiver)</option>
            <option value="admin">🏢 Clinic Administrator</option>
          </select>
        </div>

        {/* Navigation Portals Menu */}
        <nav style={{ flex: '1', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px 6px' }}>
            Navigation Portals
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  border: isActive ? '1px solid var(--accent-sage-border)' : '1px solid transparent',
                  background: isActive ? 'var(--accent-sage-subtle)' : 'transparent',
                  color: isActive ? 'var(--text-forest)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color={isActive ? 'var(--text-forest)' : 'var(--text-dim)'} strokeWidth={isActive ? 2.2 : 1.6} />
                  <span>{item.label}</span>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  background: isActive ? 'var(--surface-white)' : 'var(--surface-clay)',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  color: isActive ? 'var(--text-forest)' : 'var(--text-dim)',
                  fontWeight: 600,
                  border: isActive ? '1px solid var(--accent-sage-border)' : 'none',
                }}>
                  {item.badge}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer Utilities & Profile Card */}
        <div style={{ padding: '16px 16px', borderTop: '1px solid var(--border-stone)', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-alabaster)' }}>
          {/* Senior High-Contrast Text Toggle */}
          <button
            type="button"
            onClick={() => setIsSimpleMode(!isSimpleMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-stone)',
              background: isSimpleMode ? 'var(--accent-sage-subtle)' : 'var(--surface-clay)',
              color: 'var(--text-forest)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Type size={14} />
              Senior Big Text
            </span>
            <span style={{ fontWeight: 700, color: 'var(--accent-sage-dark)' }}>{isSimpleMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Multilingual Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={13} /> Language
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['en', 'hi', 'mr'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: language === lang ? '1px solid var(--text-forest)' : '1px solid var(--border-stone)',
                    background: language === lang ? 'var(--text-forest)' : 'var(--surface-clay)',
                    color: language === lang ? '#FFFFFF' : 'var(--text-forest)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Engine Health Status */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', paddingTop: '2px' }}>
            <span>FastAPI Engine</span>
            <span style={{ color: isBackendHealthy ? 'var(--status-ok)' : 'var(--status-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span className={`status-dot ${isBackendHealthy ? 'ok' : 'danger'}`} />
              {isBackendHealthy ? 'Live (8000)' : 'Offline'}
            </span>
          </div>

          {/* User Profile Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 10px',
            borderRadius: '12px',
            background: 'var(--surface-clay)',
            marginTop: '4px',
            border: '1px solid var(--border-stone)',
          }}>
            <img 
              src={currentProfile.avatar} 
              alt={currentProfile.name}
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentProfile.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentProfile.title}
              </div>
            </div>
            <ChevronRight size={14} color="var(--text-dim)" />
          </div>
        </div>
      </aside>

      {/* 3. Mobile Slide-Over Drawer (Visible when burger tapped on <= 991px) */}
      {mobileDrawerOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(45, 58, 49, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
        }}>
          <div style={{
            width: '290px',
            background: 'var(--surface-white)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            padding: '20px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                diabeto.
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={22} color="var(--text-forest)" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', overflowY: 'auto' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: isActive ? 'var(--accent-sage-subtle)' : 'transparent',
                      color: isActive ? 'var(--text-forest)' : 'var(--text-muted)',
                      fontWeight: isActive ? 700 : 500,
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon size={20} color={isActive ? 'var(--text-forest)' : 'var(--text-dim)'} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Persona & Language */}
            <div style={{ borderTop: '1px solid var(--border-stone)', paddingTop: '16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                Active Persona:
              </div>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as UserRole)}
                style={{ width: '100%', padding: '8px', borderRadius: '10px', background: 'var(--surface-clay)', marginBottom: '12px' }}
              >
                <option value="clinician">Dr. Mehta (Clinician)</option>
                <option value="coach">Sister Kavita (Coach)</option>
                <option value="caregiver">Ananya K. (Caregiver)</option>
                <option value="admin">Administrator</option>
              </select>

              <div style={{ display: 'flex', gap: '6px' }}>
                {(['en', 'hi', 'mr'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    style={{
                      flex: '1',
                      padding: '6px',
                      borderRadius: '8px',
                      background: language === lang ? 'var(--text-forest)' : 'var(--surface-clay)',
                      color: language === lang ? '#FFFFFF' : 'var(--text-forest)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: 'none',
                    }}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: '1' }} onClick={() => setMobileDrawerOpen(false)} />
        </div>
      )}

      {/* 4. Mobile Bottom Navigation Bar (Preserved for 1-thumb senior accessibility on phone viewports) */}
      <div className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: 'transparent',
                border: 'none',
                color: isActive ? 'var(--text-forest)' : 'var(--text-dim)',
                padding: '6px 4px',
                cursor: 'pointer',
                flex: '1',
              }}
            >
              <div style={{
                width: '36px',
                height: '28px',
                borderRadius: '14px',
                background: isActive ? 'var(--accent-sage-subtle)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.5} color={isActive ? 'var(--text-forest)' : 'var(--text-dim)'} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500 }}>
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};
