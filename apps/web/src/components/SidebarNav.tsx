import React, { useState } from 'react';
import { 
  Heart, Stethoscope, Sparkles, Terminal, HeartHandshake, 
  Globe, Type, Menu, X, Phone, LogOut, ShieldCheck
} from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import type { User, UserRole } from '../api/client';

export type ActiveTab = 'patient' | 'clinician' | 'coach' | 'caregiver' | 'simulator';

interface SidebarNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (simple: boolean) => void;
  isBackendHealthy: boolean;
  currentUser: User;
  onLogout: () => void;
}

const ROLE_DISPLAY_NAMES: Record<UserRole, { label: string; badgeColor: string }> = {
  clinician: { label: 'Diabetologist (MD)', badgeColor: 'var(--status-ok)' },
  coach: { label: 'Care & Nutrition Coach', badgeColor: 'var(--terracotta)' },
  caregiver: { label: 'Family Caregiver', badgeColor: 'var(--text-forest)' },
  patient: { label: 'Senior Patient', badgeColor: 'var(--accent-sage)' },
  admin: { label: 'Clinic Administrator', badgeColor: 'var(--accent-sage-dark)' },
};

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  isSimpleMode,
  setIsSimpleMode,
  isBackendHealthy,
  currentUser,
  onLogout,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  // Define full list of portals
  const allNavItems = [
    {
      id: 'patient' as ActiveTab,
      label: t('tabPatient', language),
      icon: Heart,
      badge: 'Sanctuary',
      allowedRoles: ['patient', 'admin'] as UserRole[],
    },
    {
      id: 'clinician' as ActiveTab,
      label: t('tabClinician', language),
      icon: Stethoscope,
      badge: 'EHR / MD',
      allowedRoles: ['clinician', 'admin'] as UserRole[],
    },
    {
      id: 'coach' as ActiveTab,
      label: t('tabCoach', language),
      icon: Sparkles,
      badge: 'Copilot',
      allowedRoles: ['coach', 'admin'] as UserRole[],
    },
    {
      id: 'caregiver' as ActiveTab,
      label: t('tabCaregiver', language),
      icon: HeartHandshake,
      badge: 'Family',
      allowedRoles: ['caregiver', 'admin'] as UserRole[],
    },
    {
      id: 'simulator' as ActiveTab,
      label: t('tabSimulator', language),
      icon: Terminal,
      badge: 'Simulate',
      allowedRoles: ['clinician', 'coach', 'admin'] as UserRole[],
    },
  ];

  // Strictly filter portals by authenticated user's role
  const visibleNavItems = allNavItems.filter((item) =>
    item.allowedRoles.includes(currentUser.role)
  );

  const roleMeta = ROLE_DISPLAY_NAMES[currentUser.role] || {
    label: currentUser.role,
    badgeColor: 'var(--text-forest)',
  };

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

          <button
            onClick={onLogout}
            title="Sign Out"
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px',
              color: 'var(--text-dim)',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
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

        {/* Authenticated Role Status Banner (No Dropdown Switcher) */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-stone)', background: 'var(--surface-clay)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={13} color="var(--status-ok)" />
              Verified Role
            </span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'var(--surface-white)',
              color: roleMeta.badgeColor,
              border: '1px solid var(--border-stone)',
            }}>
              {currentUser.role.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-forest)' }}>
            {roleMeta.label}
          </div>
        </div>

        {/* Navigation Portals Menu */}
        <nav style={{ flex: '1', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px 6px' }}>
            Authorized Portals
          </div>

          {visibleNavItems.map((item) => {
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

        {/* Footer Utilities & Profile Card with Logout */}
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

          {/* User Profile Card with Sign Out Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '8px 10px',
            borderRadius: '12px',
            background: 'var(--surface-clay)',
            marginTop: '4px',
            border: '1px solid var(--border-stone)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <img 
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} 
                alt={currentUser.name}
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.email}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Sign Out / Log Out"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '6px',
                borderRadius: '8px',
                color: 'var(--status-danger)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--status-danger-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <LogOut size={16} />
            </button>
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

            {/* Authenticated Role Tag */}
            <div style={{ padding: '8px 12px', background: 'var(--surface-clay)', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700 }}>VERIFIED ACCOUNT</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-forest)' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.72rem', color: roleMeta.badgeColor, fontWeight: 600 }}>{roleMeta.label}</div>
            </div>

            {/* Mobile Nav Links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', overflowY: 'auto' }}>
              {visibleNavItems.map((item) => {
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

            {/* Mobile Footer & Logout */}
            <div style={{ borderTop: '1px solid var(--border-stone)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

              <button
                type="button"
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'var(--status-danger-bg)',
                  border: '1px solid var(--status-danger-border)',
                  color: 'var(--status-danger)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>

          <div style={{ flex: '1' }} onClick={() => setMobileDrawerOpen(false)} />
        </div>
      )}

      {/* 4. Mobile Bottom Navigation Bar (Preserved for 1-thumb senior accessibility on phone viewports) */}
      <div className="mobile-bottom-nav">
        {visibleNavItems.map((item) => {
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
