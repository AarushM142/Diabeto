import React from 'react';
import { Stethoscope, Sparkles, Terminal, HeartHandshake, Globe, Type, Shield } from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import type { UserRole } from '../api/client';
import type { TextSize } from './SidebarNav';

interface HeaderProps {
  activeTab: 'clinician' | 'coach' | 'caregiver' | 'simulator';
  setActiveTab: (tab: 'clinician' | 'coach' | 'caregiver' | 'simulator') => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isSimpleMode?: boolean;
  setIsSimpleMode?: (simple: boolean) => void;
  textSize?: TextSize;
  onCycleTextSize?: () => void;
  isBackendHealthy: boolean;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  isSimpleMode,
  setIsSimpleMode,
  textSize,
  onCycleTextSize,
  isBackendHealthy,
  currentRole,
  setCurrentRole,
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-stone)',
      background: 'rgba(249, 248, 244, 0.96)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px',
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        {/* Botanical Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.02em' }}>
                diabeto
              </span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-sage)', lineHeight: 0 }}>
                .
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.01em', marginTop: '-2px' }}>
              {t('clinicName', language)}
            </div>
          </div>
        </div>

        {/* Pill Navigation Controls */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--surface-clay)',
          padding: '4px',
          borderRadius: '9999px',
          border: '1px solid var(--border-stone)',
          gap: '3px',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setActiveTab('caregiver')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'caregiver' ? 'var(--text-forest)' : 'transparent',
              color: activeTab === 'caregiver' ? '#FFFFFF' : 'var(--text-forest)',
              boxShadow: activeTab === 'caregiver' ? 'var(--shadow-sm)' : 'none',
              padding: '6px 14px',
            }}
          >
            <HeartHandshake size={14} />
            {t('tabCaregiver', language)}
          </button>

          <button
            onClick={() => setActiveTab('clinician')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'clinician' ? 'var(--text-forest)' : 'transparent',
              color: activeTab === 'clinician' ? '#FFFFFF' : 'var(--text-forest)',
              boxShadow: activeTab === 'clinician' ? 'var(--shadow-sm)' : 'none',
              padding: '6px 14px',
            }}
          >
            <Stethoscope size={14} />
            {t('tabClinician', language)}
          </button>

          <button
            onClick={() => setActiveTab('coach')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'coach' ? 'var(--text-forest)' : 'transparent',
              color: activeTab === 'coach' ? '#FFFFFF' : 'var(--text-forest)',
              boxShadow: activeTab === 'coach' ? 'var(--shadow-sm)' : 'none',
              padding: '6px 14px',
            }}
          >
            <Sparkles size={14} />
            {t('tabCoach', language)}
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className="btn btn-sm"
            style={{
              background: activeTab === 'simulator' ? 'var(--text-forest)' : 'transparent',
              color: activeTab === 'simulator' ? '#FFFFFF' : 'var(--text-forest)',
              boxShadow: activeTab === 'simulator' ? 'var(--shadow-sm)' : 'none',
              padding: '6px 14px',
            }}
          >
            <Terminal size={14} />
            {t('tabSimulator', language)}
          </button>
        </nav>

        {/* Global Accessibility Controls, Active Persona & Live Health */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Active Persona Switcher Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: '9999px',
            border: '1.5px solid var(--accent-sage)',
            background: 'var(--surface-white)',
          }}>
            <Shield size={13} color="var(--accent-sage-dark)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Role:</span>
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as UserRole)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-forest)',
                fontWeight: 700,
                fontSize: '0.75rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="clinician">Dr. Mehta (Clinician)</option>
              <option value="coach">Sister Kavita (Coach)</option>
              <option value="caregiver">Ananya K. (Caregiver)</option>
              <option value="admin">Admin (Clinic Ops)</option>
            </select>
          </div>

          {/* Pill Language Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--surface-clay)',
            borderRadius: '9999px',
            border: '1px solid var(--border-stone)',
            padding: '2px 4px',
          }}>
            <Globe size={12} color="var(--accent-sage)" style={{ margin: '0 3px' }} />
            {(['en', 'hi', 'mr'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                style={{
                  background: language === l ? 'var(--accent-sage)' : 'transparent',
                  color: language === l ? '#FFFFFF' : 'var(--text-forest)',
                  border: 'none',
                  padding: '3px 7px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Simple / Text Mode Toggle */}
          <button
            onClick={() => {
              if (onCycleTextSize) {
                onCycleTextSize();
              } else if (setIsSimpleMode) {
                setIsSimpleMode(!isSimpleMode);
              }
            }}
            className="btn btn-sm"
            style={{
              background: isSimpleMode ? 'var(--terracotta-subtle)' : 'var(--surface-clay)',
              color: isSimpleMode ? 'var(--terracotta)' : 'var(--text-forest)',
              borderColor: isSimpleMode ? 'var(--terracotta-border)' : 'var(--border-stone)',
              borderWidth: '1.5px',
              padding: '5px 10px',
              fontSize: '0.72rem',
            }}
            title="Toggle Simple Mode (Large Typography & High Contrast)"
          >
            <Type size={13} />
            {textSize ? (textSize === 'normal' ? '18px' : textSize === 'large' ? '22px' : '26px') : isSimpleMode ? 'Senior: ON' : 'Senior'}
          </button>

          {/* Health Status Pill */}
          <div className={`status-pill ${isBackendHealthy ? 'ok' : 'danger'}`} style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
            <span className={`status-dot ${isBackendHealthy ? 'ok' : 'danger'}`} />
            {isBackendHealthy ? 'Live:8000' : 'Offline'}
          </div>
        </div>
      </div>
    </header>
  );
};
