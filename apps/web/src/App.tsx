import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ClinicianPortal } from './components/ClinicianPortal';
import { CoachPortal } from './components/CoachPortal';
import { DemoSimulator } from './components/DemoSimulator';
import { api } from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'clinician' | 'coach' | 'simulator'>('clinician');
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isBackendHealthy={isBackendHealthy}
      />

      <main style={{ flex: '1' }}>
        {activeTab === 'clinician' && <ClinicianPortal />}
        {activeTab === 'coach' && <CoachPortal />}
        {activeTab === 'simulator' && <DemoSimulator />}
      </main>

      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#64748b',
        background: 'rgba(7, 10, 19, 0.9)',
      }}>
        Diabeto Elderly Diabetes Care Platform • Closed-Loop Clinical Safety & Multilingual WhatsApp Companion
      </footer>
    </div>
  );
};

export default App;
