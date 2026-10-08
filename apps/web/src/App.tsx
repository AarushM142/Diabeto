import React, { useState, useEffect } from 'react';
import { SidebarNav, type ActiveTab } from './components/SidebarNav';
import { PatientPortal } from './components/PatientPortal';
import { ClinicianPortal } from './components/ClinicianPortal';
import { CoachPortal } from './components/CoachPortal';
import { CaregiverPortal } from './components/CaregiverPortal';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { LoginView } from './components/LoginView';
import { LandingHero } from './components/LandingHero';
import { PageLoader } from './components/ui/page-loader';
import { api, type User, type UserRole } from './api/client';
import type { Language } from './lib/types';
import { Phone, Type, LogOut } from 'lucide-react';
import { t } from './lib/i18n';

interface LoadingState {
  message: string;
  subMessage?: string;
  targetAction: () => void;
}

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getCurrentUser());
  const [unauthView, setUnauthView] = useState<'hero' | 'login'>('hero');
  const [preferredRole, setPreferredRole] = useState<UserRole | undefined>(undefined);
  
  const [activeTab, setActiveTab] = useState<ActiveTab>('patient');
  const [language, setLanguage] = useState<Language>('en');
  const [isSimpleMode, setIsSimpleMode] = useState<boolean>(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);

  // 1.5-second Loading Animation State
  const [loadingState, setLoadingState] = useState<LoadingState | null>(null);

  // Set default tab based on user's role upon login
  const applyRoleDefaultTab = (role: UserRole) => {
    switch (role) {
      case 'clinician':
        setActiveTab('clinician');
        break;
      case 'coach':
        setActiveTab('coach');
        break;
      case 'caregiver':
        setActiveTab('caregiver');
        break;
      case 'patient':
        setActiveTab('patient');
        break;
      case 'admin':
        setActiveTab('clinician');
        break;
    }
  };

  useEffect(() => {
    if (currentUser) {
      api.setPersona(currentUser.role, currentUser.id);
      applyRoleDefaultTab(currentUser.role);
    }
  }, [currentUser?.role, currentUser?.id]);

  // Periodic Backend Health Check
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

  // 1.5-second transition helper
  const triggerTransition = (message: string, subMessage: string, targetAction: () => void) => {
    setLoadingState({
      message,
      subMessage,
      targetAction,
    });
  };

  const handleLoaderComplete = () => {
    if (loadingState) {
      loadingState.targetAction();
      setLoadingState(null);
    }
  };

  const handleOpenLogin = (role?: UserRole) => {
    triggerTransition(
      'Loading Verified Authentication Desk...',
      'Securing HIPAA & ABDM Clinical Gateway',
      () => {
        setPreferredRole(role);
        setUnauthView('login');
      }
    );
  };

  const handleBackToHero = () => {
    triggerTransition(
      'Returning to Platform Overview...',
      'Pune Central Diabetes Network',
      () => {
        setUnauthView('hero');
      }
    );
  };

  const handleLoginSuccess = (user: User) => {
    triggerTransition(
      `Authenticating ${user.name}...`,
      `Role: ${user.role.toUpperCase()} • Initializing Clinical Decision Support`,
      () => {
        setCurrentUser(user);
        applyRoleDefaultTab(user.role);
      }
    );
  };

  const handleLogout = () => {
    triggerTransition(
      'Signing out of Diabeto...',
      'Clearing session credentials securely',
      () => {
        api.logout();
        setCurrentUser(null);
        setUnauthView('hero');
      }
    );
  };

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
    <>
      {/* 1.5-Second Cool Loading Animation Overlay */}
      {loadingState && (
        <PageLoader
          message={loadingState.message}
          subMessage={loadingState.subMessage}
          durationMs={1500}
          onComplete={handleLoaderComplete}
        />
      )}

      {/* Main App Content */}
      {!currentUser ? (
        unauthView === 'login' ? (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            onBack={handleBackToHero}
            initialRole={preferredRole}
          />
        ) : (
          <LandingHero onOpenLogin={handleOpenLogin} />
        )
      ) : (
        <div className="app-container">
          {/* Mandatory Tactile Paper Grain Overlay */}
          <div className="paper-grain-overlay" aria-hidden="true" />

          {/* Solid In-Flow Botanical Sidebar Navigation */}
          <SidebarNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            language={language}
            setLanguage={setLanguage}
            isSimpleMode={isSimpleMode}
            setIsSimpleMode={setIsSimpleMode}
            isBackendHealthy={isBackendHealthy}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          {/* Main Content Area */}
          <div className="main-content-area">
            {/* Top Control Bar with Breadcrumb and Quick Triggers */}
            <header style={{
              position: 'sticky',
              top: 0,
              zIndex: 40,
              display: 'flex',
              height: '60px',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-stone)',
              backgroundColor: 'rgba(249, 248, 244, 0.94)',
              backdropFilter: 'blur(10px)',
              padding: '0 32px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
                  Portal:
                </span>
                <span className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                  {getPortalTitle()}
                </span>
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
                    padding: '6px 16px',
                    fontSize: '0.8rem',
                    borderColor: 'var(--status-danger-border)',
                    color: 'var(--status-danger)',
                    backgroundColor: 'var(--status-danger-bg)',
                    fontWeight: 700,
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
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 16px',
                    fontSize: '0.8rem',
                    borderRadius: '20px',
                    fontWeight: 700,
                  }}
                  title="Toggle High-Contrast 19px Senior Mode"
                >
                  <Type size={13} />
                  <span>Senior Text</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-sage-dark)' }}>{isSimpleMode ? 'ON' : 'OFF'}</span>
                </button>

                {/* Sign Out Button in Header */}
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    borderRadius: '20px',
                    color: 'var(--text-muted)',
                  }}
                  title="Sign Out"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            </header>

            {/* Dynamic Portal Screen Content */}
            <div style={{ flex: 1, paddingBottom: '32px' }}>
              <main style={{ position: 'relative', zIndex: 1 }}>
                {activeTab === 'patient' && <PatientPortal language={language} />}
                {activeTab === 'clinician' && <ClinicianPortal language={language} currentRole={currentUser.role} />}
                {activeTab === 'coach' && <CoachPortal language={language} currentRole={currentUser.role} />}
                {activeTab === 'caregiver' && <CaregiverPortal language={language} currentRole={currentUser.role} />}
                {activeTab === 'simulator' && <WhatsAppSimulator language={language} />}
              </main>
            </div>

            {/* Platform Footer */}
            <footer style={{
              borderTop: '1px solid var(--border-stone)',
              backgroundColor: 'var(--surface-clay)',
              padding: '16px 32px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              position: 'relative',
              zIndex: 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="font-serif" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-forest)' }}>diabeto.</span>
                <span>• Botanical Senior Diabetes Care & Decision Support Platform</span>
              </div>
              <div>
                <span>
                  Logged in as: <strong style={{ color: 'var(--text-forest)' }}>{currentUser.name} ({currentUser.role.toUpperCase()})</strong> • Clinic: <strong>{currentUser.clinic_id}</strong>
                </span>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
