import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ClinicianPortal } from './components/ClinicianPortal';
import { CoachPortal } from './components/CoachPortal';
import { CaregiverPortal } from './components/CaregiverPortal';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { api } from './api/client';
import type { Language } from './lib/types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clinician' | 'coach' | 'caregiver' | 'simulator'>('simulator');
  const [language, setLanguage] = useState<Language>('en');
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--canvas)' }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        isSimpleMode={isSimpleMode}
        setIsSimpleMode={setIsSimpleMode}
        isBackendHealthy={isBackendHealthy}
      />

      <main style={{ flex: '1' }}>
        {activeTab === 'clinician' && <ClinicianPortal language={language} />}
        {activeTab === 'coach' && <CoachPortal language={language} />}
        {activeTab === 'caregiver' && <CaregiverPortal language={language} />}
        {activeTab === 'simulator' && <WhatsAppSimulator language={language} />}
      </main>

      <footer style={{
        borderTop: '1px solid var(--line)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--ink-2)',
        background: 'var(--surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <span>diabeto. Elderly Diabetes Care Platform • Closed-Loop Clinical Safety</span>
        <span>Clinician of Record: <strong>Dr. Arvind Mehta, MD</strong> • Clinic: <strong>Pune Central (clinic_pune_01)</strong></span>
      </footer>
    </div>
  );
};

export default App;
