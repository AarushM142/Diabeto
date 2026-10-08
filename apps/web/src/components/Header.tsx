import React from 'react';
import { HeartPulse, Stethoscope, Sparkles, Terminal, HeartHandshake, User, Hospital } from 'lucide-react';

interface HeaderProps {
  activeTab: 'clinician' | 'coach' | 'caregiver' | 'simulator';
  setActiveTab: (tab: 'clinician' | 'coach' | 'caregiver' | 'simulator') => void;
  isBackendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isBackendHealthy }) => {
  return (
    <header style={{
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(5, 8, 17, 0.9)',
      backdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      {/* Brand & Clinic Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(16, 185, 129, 0.45)',
        }}>
          <HeartPulse size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Diabeto
            </h1>
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
              CLINICAL AI PLATFORM
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
            <Hospital size={12} color="#06b6d4" />
            <span>Pune Central Diabetes Institute • Unit 01</span>
          </div>
        </div>
      </div>

      {/* Navigation Segmented Control */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.9)',
        padding: '5px',
        borderRadius: '14px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        gap: '4px',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
      }}>
        <button
          onClick={() => setActiveTab('clinician')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'clinician' ? 'var(--primary-gradient)' : 'transparent',
            color: activeTab === 'clinician' ? '#ffffff' : '#94a3b8',
            borderRadius: '10px',
            boxShadow: activeTab === 'clinician' ? '0 4px 12px var(--primary-glow)' : 'none',
          }}
        >
          <Stethoscope size={15} />
          Clinician Portal
        </button>

        <button
          onClick={() => setActiveTab('coach')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'coach' ? 'var(--cyan-gradient)' : 'transparent',
            color: activeTab === 'coach' ? '#ffffff' : '#94a3b8',
            borderRadius: '10px',
            boxShadow: activeTab === 'coach' ? '0 4px 12px var(--cyan-glow)' : 'none',
          }}
        >
          <Sparkles size={15} />
          Coach Desk
        </button>

        <button
          onClick={() => setActiveTab('caregiver')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'caregiver' ? 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)' : 'transparent',
            color: activeTab === 'caregiver' ? '#ffffff' : '#94a3b8',
            borderRadius: '10px',
            boxShadow: activeTab === 'caregiver' ? '0 4px 12px rgba(168,85,247,0.3)' : 'none',
          }}
        >
          <HeartHandshake size={15} />
          Caregiver View
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className="btn btn-sm"
          style={{
            background: activeTab === 'simulator' ? 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' : 'transparent',
            color: activeTab === 'simulator' ? '#ffffff' : '#94a3b8',
            borderRadius: '10px',
            boxShadow: activeTab === 'simulator' ? '0 4px 12px var(--indigo-glow)' : 'none',
          }}
        >
          <Terminal size={15} />
          Live Simulator
        </button>
      </nav>

      {/* Right User & Health Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={15} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Dr. Arvind Mehta</div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Attending Diabetologist</div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: isBackendHealthy ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
          border: `1px solid ${isBackendHealthy ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)'}`,
          padding: '6px 12px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          color: isBackendHealthy ? '#34d399' : '#fb7185',
        }}>
          <span className="pulse-dot" style={{ background: isBackendHealthy ? '#10b981' : '#f43f5e' }} />
          {isBackendHealthy ? 'Backend 8000 Online' : 'Connecting...'}
        </div>
      </div>
    </header>
  );
};
