import React, { useState, useEffect } from 'react';
import { SidebarNav, type ActiveTab } from './components/SidebarNav';
import { PatientPortal } from './components/PatientPortal';
import { ClinicianPortal } from './components/ClinicianPortal';
import { CoachPortal } from './components/CoachPortal';
import { CaregiverPortal } from './components/CaregiverPortal';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { api, type UserRole } from './api/client';
import type { Language } from './lib/types';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { Phone, Type } from 'lucide-react';
import { t } from './lib/i18n';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('patient');
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

  const getPortalTitle = () => {
    switch (activeTab) {
      case 'patient':
        return t('tabPatient', language);
      case 'clinician':
        return t('tabClinician', language);
      case 'coach':
        return t('tabCoach', language);
      case 'caregiver':
        return t('tabCaregiver', language);
      case 'simulator':
        return t('tabSimulator', language);
      default:
        return 'Sanctuary';
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[var(--bg-alabaster)] relative">
        {/* Mandatory Tactile Paper Grain Overlay */}
        <div className="paper-grain-overlay" aria-hidden="true" />

        {/* shadcn Collapsible Sidebar Navigation */}
        <SidebarNav
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

        {/* Main Content Layout with SidebarInset */}
        <SidebarInset className="flex flex-col flex-1 min-w-0 bg-[var(--bg-alabaster)]">
          {/* Top Control Bar with Sidebar Trigger & Quick Actions */}
          <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            display: 'flex',
            height: '56px',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-stone)',
            backgroundColor: 'rgba(249, 248, 244, 0.94)',
            backdropFilter: 'blur(10px)',
            padding: '0 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <SidebarTrigger className="text-[var(--text-forest)] hover:bg-[var(--surface-clay)] hover:text-[var(--text-forest)] rounded-lg h-9 w-9 border border-[var(--border-stone)]" />
              <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--border-stone)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)' }}>
                  Portal:
                </span>
                <span className="font-serif" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                  {getPortalTitle()}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Quick Emergency SOS */}
              <a
                href="tel:+918149680369"
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  borderColor: 'var(--status-danger-border)',
                  color: 'var(--status-danger)',
                  backgroundColor: 'var(--status-danger-bg)',
                  fontWeight: 600,
                  borderRadius: '20px',
                }}
              >
                <Phone size={13} className="shrink-0 animate-bounce" />
                <span>SOS Emergency</span>
              </a>

              {/* Big Text Mode Pill */}
              <button
                onClick={() => setIsSimpleMode(!isSimpleMode)}
                className="btn btn-secondary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  borderRadius: '20px',
                  fontWeight: 600,
                }}
                title="Toggle High-Contrast 19px Senior Mode"
              >
                <Type size={13} />
                <span>Senior Text</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-sage-dark)' }}>{isSimpleMode ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </header>

          {/* Main Dynamic Portal Area */}
          <div className="flex-1 pb-24 md:pb-10">
            <main className="relative z-1">
              {activeTab === 'patient' && <PatientPortal language={language} />}
              {activeTab === 'clinician' && <ClinicianPortal language={language} currentRole={currentRole} />}
              {activeTab === 'coach' && <CoachPortal language={language} currentRole={currentRole} />}
              {activeTab === 'caregiver' && <CaregiverPortal language={language} currentRole={currentRole} />}
              {activeTab === 'simulator' && <WhatsAppSimulator language={language} />}
            </main>
          </div>

          {/* Platform Footer */}
          <footer className="border-t border-[var(--border-stone)] bg-[var(--surface-clay)] px-4 md:px-8 py-4 text-xs text-[var(--text-muted)] flex flex-wrap justify-between items-center gap-3 relative z-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-bold text-[var(--text-forest)]">diabeto.</span>
              <span>• Botanical Senior Diabetes Care & Decision Support Platform</span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                Active: <strong className="text-[var(--text-forest)]">{currentRole.toUpperCase()}</strong> • Clinic: <strong>Pune Central (clinic_pune_01)</strong>
              </span>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default App;
