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

        {/* Global Accessibility Controls & Live Health */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
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

          {/* Simple Mode Toggle */}
          <button
            onClick={() => setIsSimpleMode(!isSimpleMode)}
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
            {isSimpleMode ? 'Simple: ON' : 'Simple'}
          </button>

          {/* Combined Doctor & Live Health Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 10px',
            borderRadius: '9999px',
            border: '1px solid var(--border-stone)',
            background: 'var(--surface-white)',
          }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--accent-sage-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={11} color="var(--accent-sage)" />
            </div>
            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-forest)' }}>
              Dr. Mehta
            </div>
            <span style={{ width: '1px', height: '12px', background: 'var(--border-stone)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 600, color: isBackendHealthy ? 'var(--status-ok)' : 'var(--status-danger)' }}>
              <span className={`status-dot ${isBackendHealthy ? 'ok' : 'danger'}`} />
              {isBackendHealthy ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
