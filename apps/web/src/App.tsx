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
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border-stone)] bg-[var(--bg-alabaster)]/90 px-4 md:px-6 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-[var(--text-forest)] hover:bg-[var(--surface-clay)] hover:text-[var(--text-forest)] rounded-lg h-8 w-8" />
              <div className="h-4 w-[1px] bg-[var(--border-stone)] hidden sm:block" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-dim)] hidden sm:inline">
                  Portal:
                </span>
                <span className="font-serif text-sm md:text-base font-bold text-[var(--text-forest)]">
                  {getPortalTitle()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Quick Emergency SOS */}
              <a
                href="tel:+918149680369"
                className="flex items-center gap-1.5 rounded-full border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-1 text-xs font-bold text-[var(--status-danger)] hover:bg-[var(--status-danger)] hover:text-white transition-all shadow-xs"
              >
                <Phone size={13} className="shrink-0 animate-bounce" />
                <span>SOS Trigger</span>
              </a>

              {/* Big Text Mode Pill */}
              <button
                onClick={() => setIsSimpleMode(!isSimpleMode)}
                className="flex items-center gap-1.5 rounded-full border border-[var(--border-stone)] bg-[var(--surface-clay)] px-3 py-1 text-xs font-semibold text-[var(--text-forest)] hover:bg-[var(--surface-clay-dark)] transition-all"
                title="Toggle High-Contrast 19px Senior Mode"
              >
                <Type size={13} />
                <span className="hidden sm:inline">Senior Mode</span>
                <span className="font-bold text-[var(--accent-sage-dark)]">{isSimpleMode ? 'ON' : 'OFF'}</span>
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
