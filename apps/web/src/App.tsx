import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ClinicianPortal } from './components/ClinicianPortal';
import { CoachPortal } from './components/CoachPortal';
import { CaregiverPortal } from './components/CaregiverPortal';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { api, type UserRole } from './api/client';
import type { Language } from './lib/types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clinician' | 'coach' | 'caregiver' | 'simulator'>('caregiver');
  const [language, setLanguage] = useState<Language>('en');
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('clinician');

  useEffect(() => {
    api.setPersona(currentRole);
  }, [currentRole]);

  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await api.getHealth();
      setIsBackendHealthy(healthy);
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update HTML class for Simple Mode
  useEffect(() => {
    if (isSimpleMode) {
      document.documentElement.classList.add('simple-mode');
    } else {
      document.documentElement.classList.remove('simple-mode');
    }
  }, [isSimpleMode]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-alabaster)', position: 'relative' }}>
      {/* Mandatory Tactile Paper Grain Overlay */}
      <div className="paper-grain-overlay" aria-hidden="true" />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        isSimpleMode={isSimpleMode}
        setIsSimpleMode={setIsSimpleMode}
        isBackendHealthy={isBackendHealthy}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
      />

      <main style={{ flex: '1', position: 'relative', zIndex: 1 }}>
        {activeTab === 'clinician' && <ClinicianPortal language={language} currentRole={currentRole} />}
        {activeTab === 'coach' && <CoachPortal language={language} currentRole={currentRole} />}
        {activeTab === 'caregiver' && <CaregiverPortal language={language} currentRole={currentRole} />}
        {activeTab === 'simulator' && <WhatsAppSimulator language={language} />}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-stone)',
        padding: '20px 32px',
        textAlign: 'center',
        fontSize: '0.8125rem',
        color: 'var(--text-muted)',
        background: 'var(--surface-clay)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="font-serif" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-forest)' }}>diabeto.</span>
          <span>• Botanical Diabetes Care Platform & Multi-Tiered Authorization</span>
        </div>
        <span>
          Authenticated as: <strong style={{ color: 'var(--text-forest)' }}>{currentRole.toUpperCase()}</strong> • Clinic: <strong>Pune Central (clinic_pune_01)</strong>
        </span>
      </footer>
    </div>
  );
};

export default App;
