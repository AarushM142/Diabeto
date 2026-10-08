import React from 'react';
import { Stethoscope, Sparkles, Terminal, HeartHandshake, User, Globe, Type } from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';

interface HeaderProps {
  activeTab: 'clinician' | 'coach' | 'caregiver' | 'simulator';
  setActiveTab: (tab: 'clinician' | 'coach' | 'caregiver' | 'simulator') => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (simple: boolean) => void;
  isBackendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  isSimpleMode,
  setIsSimpleMode,
  isBackendHealthy,
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-stone)',
      background: 'rgba(249, 248, 244, 0.92)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '16px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
    }}>
      {/* Botanical Wordmark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span className="font-serif" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.02em' }}>
              diabeto
            </span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-sage)', lineHeight: 0 }}>
              .
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
            {t('clinicName', language)}
          </div>
        </div>
      </div>

      {/* Pill Navigation Controls */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface-clay)',
        padding: '5px',
        borderRadius: '9999px',
        border: '1px solid var(--border-stone)',
        gap: '4px',
      }}>
        <button
          onClick={() => setActiveTab('caregiver')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'caregiver' ? 'var(--text-forest)' : 'transparent',
            color: activeTab === 'caregiver' ? '#FFFFFF' : 'var(--text-forest)',
            boxShadow: activeTab === 'caregiver' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <HeartHandshake size={15} />
          {t('tabCaregiver', language)}
        </button>

        <button
          onClick={() => setActiveTab('clinician')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'clinician' ? 'var(--text-forest)' : 'transparent',
            color: activeTab === 'clinician' ? '#FFFFFF' : 'var(--text-forest)',
            boxShadow: activeTab === 'clinician' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Stethoscope size={15} />
          {t('tabClinician', language)}
        </button>

        <button
          onClick={() => setActiveTab('coach')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'coach' ? 'var(--text-forest)' : 'transparent',
            color: activeTab === 'coach' ? '#FFFFFF' : 'var(--text-forest)',
            boxShadow: activeTab === 'coach' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Sparkles size={15} />
          {t('tabCoach', language)}
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'simulator' ? 'var(--text-forest)' : 'transparent',
            color: activeTab === 'simulator' ? '#FFFFFF' : 'var(--text-forest)',
            boxShadow: activeTab === 'simulator' ? 'var(--shadow-sm)' : 'none',
          }}
        >
          <Terminal size={15} />
          {t('tabSimulator', language)}
        </button>
      </nav>

      {/* Global Accessibility Controls & Live Health */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Pill Language Selector */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--surface-clay)',
          borderRadius: '9999px',
          border: '1px solid var(--border-stone)',
          padding: '3px 6px',
        }}>
          <Globe size={13} color="var(--accent-sage)" style={{ marginRight: '4px' }} />
          {(['en', 'hi', 'mr'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              style={{
                background: language === l ? 'var(--accent-sage)' : 'transparent',
                color: language === l ? '#FFFFFF' : 'var(--text-forest)',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Simple Mode Toggle */}
        <button
          onClick={() => setIsSimpleMode(!isSimpleMode)}
          className="btn btn-sm"
          style={{
            background: isSimpleMode ? 'var(--terracotta-subtle)' : 'var(--surface-clay)',
            color: isSimpleMode ? 'var(--terracotta)' : 'var(--text-forest)',
            borderColor: isSimpleMode ? 'var(--terracotta-border)' : 'var(--border-stone)',
            borderWidth: '1.5px',
          }}
          title="Toggle Large Print Accessibility (Simple Mode)"
        >
          <Type size={14} />
          {isSimpleMode ? t('simpleModeOn', language) : t('simpleModeOff', language)}
        </button>

        {/* Doctor Credential Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          border: '1px solid var(--border-stone)',
          background: 'var(--surface-white)',
        }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--accent-sage-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={13} color="var(--accent-sage)" />
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)' }}>{t('doctorName', language)}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t('doctorRole', language)}</div>
          </div>
        </div>

        {/* Health Status Pill */}
        <div className={`status-pill ${isBackendHealthy ? 'ok' : 'danger'}`}>
          <span className={`status-dot ${isBackendHealthy ? 'ok' : 'danger'}`} />
          {isBackendHealthy ? t('online', language) : t('offline', language)}
        </div>
      </div>
    </header>
  );
};
