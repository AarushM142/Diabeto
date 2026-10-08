import React, { useState } from 'react';
import { 
  Heart, Stethoscope, Sparkles, Terminal, HeartHandshake, 
  Globe, Type, Shield, Menu, X, Phone
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

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* 1. Mobile Top Bar (Visible only on small screens) */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open Navigation"
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
          {/* Quick SOS Emergency Trigger */}
          <a
            href="tel:+918149680369"
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 10px', fontSize: '0.75rem', borderColor: 'var(--status-danger-border)', color: 'var(--status-danger)' }}
          >
            <Phone size={12} />
            SOS
          </a>

          {/* Simple Mode Toggle */}
          <button
            onClick={() => setIsSimpleMode(!isSimpleMode)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            <Type size={12} />
            {isSimpleMode ? '19px' : '16px'}
          </button>
        </div>
      </header>

      {/* 2. Desktop Side Navbar (Permanent on desktop screens >= 992px) */}
      <aside className="desktop-sidebar">
        {/* Logo and Brand Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-stone)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'var(--accent-sage)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '1.2rem',
              fontFamily: 'var(--font-serif)',
            }}>
              d.
            </div>
            <div>
              <span className="font-serif" style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.02em' }}>
                diabeto.
              </span>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                Senior Care Platform
              </div>
            </div>
          </div>

          {/* Active Clinic Badge */}
          <div style={{ background: 'var(--surface-clay)', padding: '6px 10px', borderRadius: '10px', marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="status-dot ok" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-forest)', fontWeight: 600 }}>
              Pune Central Institute
            </span>
          </div>
        </div>

        {/* Persona Switcher Section */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-stone)' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Shield size={12} />
            Active Role / Persona
          </div>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as UserRole)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '12px',
              border: '1px solid var(--border-stone)',
              background: 'var(--surface-clay)',
              fontSize: '0.8rem',
              color: 'var(--text-forest)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <option value="clinician">👨‍⚕️ Dr. Mehta (Clinician)</option>
            <option value="coach">🌿 Sister Kavita (Coach)</option>
            <option value="caregiver">👧 Ananya K. (Caregiver)</option>
            <option value="admin">🏢 Clinic Administrator</option>
          </select>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: '1', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px 6px' }}>
            Navigation Portals
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '16px',
                  border: isActive ? '1px solid var(--accent-sage-border)' : '1px solid transparent',
                  background: isActive ? 'var(--accent-sage-subtle)' : 'transparent',
                  color: isActive ? 'var(--text-forest)' : 'var(--text-muted)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color={isActive ? 'var(--text-forest)' : 'var(--text-dim)'} strokeWidth={isActive ? 2 : 1.5} />
                  <span>{item.label}</span>
                </div>
                <span style={{
                  fontSize: '0.65rem',
                  background: isActive ? 'var(--surface-white)' : 'var(--surface-clay)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  color: isActive ? 'var(--text-forest)' : 'var(--text-dim)',
                  fontWeight: 600,
                }}>
                  {item.badge}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility Controls */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-stone)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Language Picker */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={14} /> Language
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['en', 'hi', 'mr'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  style={{
                    padding: '3px 7px',
                    borderRadius: '8px',
                    border: language === lang ? '1px solid var(--text-forest)' : '1px solid var(--border-stone)',
                    background: language === lang ? 'var(--text-forest)' : 'var(--surface-clay)',
                    color: language === lang ? '#FFFFFF' : 'var(--text-forest)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Simple Mode Button */}
          <button
            onClick={() => setIsSimpleMode(!isSimpleMode)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: '12px',
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
              Senior Big Text Mode
            </span>
            <span>{isSimpleMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* System Health */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', paddingTop: '4px' }}>
            <span>Engine Status</span>
            <span style={{ color: isBackendHealthy ? 'var(--status-ok)' : 'var(--status-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className={`status-dot ${isBackendHealthy ? 'ok' : 'danger'}`} />
              {isBackendHealthy ? 'Live (8000)' : 'Offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* 3. Mobile Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(45, 58, 49, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 99999,
          display: 'flex',
        }}>
          <div style={{
            width: '280px',
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
                onClick={() => setMobileDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={22} color="var(--text-forest)" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: isActive ? 'var(--accent-sage-subtle)' : 'transparent',
                      color: isActive ? 'var(--text-forest)' : 'var(--text-muted)',
                      fontWeight: isActive ? 600 : 500,
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
                    onClick={() => setLanguage(lang)}
                    style={{
                      flex: '1',
                      padding: '6px',
                      borderRadius: '8px',
                      background: language === lang ? 'var(--text-forest)' : 'var(--surface-clay)',
                      color: language === lang ? '#FFFFFF' : 'var(--text-forest)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
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

      {/* 4. Mobile Bottom Navigation Bar (For elderly easy one-thumb tapping on phones) */}
      <div className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
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
