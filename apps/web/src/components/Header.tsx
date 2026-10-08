import React from 'react';
import { Stethoscope, Sparkles, Terminal, HeartHandshake, User } from 'lucide-react';

interface HeaderProps {
  activeTab: 'clinician' | 'coach' | 'caregiver' | 'simulator';
  setActiveTab: (tab: 'clinician' | 'coach' | 'caregiver' | 'simulator') => void;
  isBackendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isBackendHealthy }) => {
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
            Pune Central Diabetes Institute
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
          Clinician
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
          Coach Desk
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
          Caregiver
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
          Simulator
        </button>
      </nav>

      {/* Right Clinician & Health Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--surface)' }}>
          <User size={14} color="var(--ink-2)" />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink)' }}>Dr. Arvind Mehta</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--ink-2)' }}>MD Diabetologist</div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isBackendHealthy ? 'var(--ok)' : 'var(--danger)',
        }}>
          <span className={`status-dot ${isBackendHealthy ? 'ok' : 'danger'}`} />
          {isBackendHealthy ? 'System Live' : 'Offline'}
        </div>
      </div>
    </header>
  );
};
