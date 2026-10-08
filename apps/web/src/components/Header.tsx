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
      borderBottom: '1px solid var(--line)',
      background: 'var(--surface)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
    }}>
      {/* Brand & Clinic Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
              diabeto
            </span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand)', lineHeight: 0 }}>
              .
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)' }}>
            {t('clinicName', language)}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface-2)',
        padding: '3px',
        borderRadius: '8px',
        border: '1px solid var(--line)',
        gap: '2px',
      }}>
        <button
          onClick={() => setActiveTab('clinician')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'clinician' ? 'var(--brand)' : 'transparent',
            color: activeTab === 'clinician' ? '#ffffff' : 'var(--ink-2)',
            fontWeight: activeTab === 'clinician' ? 600 : 500,
            borderRadius: '6px',
          }}
        >
          <Stethoscope size={15} />
          {t('tabClinician', language)}
        </button>

        <button
          onClick={() => setActiveTab('coach')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'coach' ? 'var(--brand)' : 'transparent',
            color: activeTab === 'coach' ? '#ffffff' : 'var(--ink-2)',
            fontWeight: activeTab === 'coach' ? 600 : 500,
            borderRadius: '6px',
          }}
        >
          <Sparkles size={15} />
          {t('tabCoach', language)}
        </button>

        <button
          onClick={() => setActiveTab('caregiver')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'caregiver' ? 'var(--brand)' : 'transparent',
            color: activeTab === 'caregiver' ? '#ffffff' : 'var(--ink-2)',
            fontWeight: activeTab === 'caregiver' ? 600 : 500,
            borderRadius: '6px',
          }}
        >
          <HeartHandshake size={15} />
          {t('tabCaregiver', language)}
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'simulator' ? 'var(--brand)' : 'transparent',
            color: activeTab === 'simulator' ? '#ffffff' : 'var(--ink-2)',
            fontWeight: activeTab === 'simulator' ? 600 : 500,
            borderRadius: '6px',
          }}
        >
          <Terminal size={15} />
          {t('tabSimulator', language)}
        </button>
      </nav>

      {/* Global Accessibility Controls & Live Health */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Language Selector */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--line)', padding: '2px' }}>
          <Globe size={13} color="var(--ink-2)" style={{ margin: '0 4px' }} />
          {(['en', 'hi', 'mr'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              style={{
                background: language === l ? 'var(--brand)' : 'transparent',
                color: language === l ? '#ffffff' : 'var(--ink-2)',
                border: 'none',
                padding: '3px 7px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
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
            background: isSimpleMode ? 'var(--brand-subtle)' : 'var(--surface-2)',
            color: isSimpleMode ? 'var(--brand)' : 'var(--ink-2)',
            borderColor: isSimpleMode ? 'var(--brand)' : 'var(--line)',
            borderWidth: '1px',
            fontSize: '0.75rem',
          }}
          title="Toggle Large Print Accessibility (Simple Mode)"
        >
          <Type size={14} />
          {isSimpleMode ? t('simpleModeOn', language) : t('simpleModeOff', language)}
        </button>

        {/* Doctor Credential Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--surface)' }}>
          <User size={13} color="var(--ink-2)" />
          <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)' }}>{t('doctorName', language)}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--ink-2)' }}>{t('doctorRole', language)}</div>
          </div>
        </div>

        {/* Health Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 8px',
          borderRadius: '6px',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          fontSize: '0.72rem',
          fontWeight: 600,
          color: isBackendHealthy ? 'var(--ok)' : 'var(--danger)',
        }}>
          <span className={`status-dot ${isBackendHealthy ? 'ok' : 'danger'}`} />
          {isBackendHealthy ? t('online', language) : t('offline', language)}
        </div>
      </div>
    </header>
  );
};
