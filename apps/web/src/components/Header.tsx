import React from 'react';
import { HeartPulse, Stethoscope, Sparkles, Terminal } from 'lucide-react';

interface HeaderProps {

  activeTab: 'clinician' | 'coach' | 'simulator';
  setActiveTab: (tab: 'clinician' | 'coach' | 'simulator') => void;
  isBackendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isBackendHealthy }) => {
  return (
    <header style={{
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(7, 10, 19, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
        }}>
          <HeartPulse size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Diabeto
            </h1>
            <span style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}>
              CARE PLATFORM
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Elderly Diabetes Care & WhatsApp Clinical Companion
          </p>
        </div>
      </div>

      {/* Nav Tabs */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.8)',
        padding: '4px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        gap: '4px',
      }}>
        <button
          onClick={() => setActiveTab('clinician')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'clinician' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
            color: activeTab === 'clinician' ? '#ffffff' : '#94a3b8',
            borderRadius: '8px',
          }}
        >
          <Stethoscope size={16} />
          Clinician Portal
        </button>

        <button
          onClick={() => setActiveTab('coach')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'coach' ? 'linear-gradient(135deg, #06b6d4 0%, #0284c7 100%)' : 'transparent',
            color: activeTab === 'coach' ? '#ffffff' : '#94a3b8',
            borderRadius: '8px',
          }}
        >
          <Sparkles size={16} />
          Coach Approvals
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'simulator' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'transparent',
            color: activeTab === 'simulator' ? '#ffffff' : '#94a3b8',
            borderRadius: '8px',
          }}
        >
          <Terminal size={16} />
          Live Simulator
        </button>
      </nav>

      {/* Backend Health Pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: isBackendHealthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
        border: `1px solid ${isBackendHealthy ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
        padding: '6px 12px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: isBackendHealthy ? '#34d399' : '#fb7185',
      }}>
        <span className="pulse-dot" style={{ background: isBackendHealthy ? '#10b981' : '#f43f5e' }} />
        {isBackendHealthy ? 'Live Backend Connected' : 'Connecting Backend...'}
      </div>
    </header>
  );
};
