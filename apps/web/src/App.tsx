import React, { useState, useEffect } from 'react';
import { SidebarNav, type ActiveTab, type PatientSection, type TextSize } from './components/SidebarNav';
import { PatientPortal } from './components/PatientPortal';
import { TodayScreen } from './components/TodayScreen';
import { PatientBottomNav, type PatientNavTab } from './components/PatientBottomNav';
import { ClinicianPortal } from './components/ClinicianPortal';
import { CoachPortal } from './components/CoachPortal';
import { CaregiverPortal } from './components/CaregiverPortal';
import { WhatsAppSimulator } from './components/WhatsAppSimulator';
import { AuthView } from './components/AuthView';
import { LandingHero } from './components/LandingHero';
import { RoleSelectModal, type OnboardingProfileData } from './components/RoleSelectModal';
import { EditProfileModal } from './components/EditProfileModal';
import { MealScannerModal } from './components/MealScannerModal';
import { PageLoader } from './components/ui/page-loader';
import { api, saveAuthSession, getSavedProfileForEmail, type User, type UserRole } from './api/client';
import { supabase } from './lib/supabase';
import type { Language } from './lib/types';
import { Phone, Type, LogOut, UserCog, Sparkles } from 'lucide-react';
import { t } from './lib/i18n';

interface LoadingState {
  message: string;
  subMessage?: string;
  targetAction: () => void;
}

interface PendingGoogleUser {
  email: string;
  name: string;
  avatar?: string;
}

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getCurrentUser());
  const [unauthView, setUnauthView] = useState<'hero' | 'auth'>('hero');
  const [preferredRole, setPreferredRole] = useState<UserRole | undefined>(undefined);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<PendingGoogleUser | null>(null);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMealScannerModal, setShowMealScannerModal] = useState(false);
  const [activePatientSection, setActivePatientSection] = useState<PatientSection>('overview');
  const [activePatientTab, setActivePatientTab] = useState<PatientNavTab>('today');
  const [activeTab, setActiveTab] = useState<ActiveTab>('patient');
  const [language, setLanguage] = useState<Language>('en');
  const [textSize, setTextSize] = useState<TextSize>('normal');
  const [seniorSimpleMode, setSeniorSimpleMode] = useState(false);
  const [isBackendHealthy, setIsBackendHealthy] = useState(false);

  // Transition Animation State
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
        setActivePatientTab('today');
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

  // Handle Supabase Google OAuth Redirects
  useEffect(() => {
    const isOAuthRedirect = 
      window.location.hash.includes('access_token') || 
      window.location.hash.includes('error') || 
      window.location.search.includes('code=');

    const processSession = async (session: any) => {
      // If user is ALREADY authenticated in current session, skip
      const existingUser = api.getCurrentUser();
      if (existingUser) {
        setPendingGoogleUser(null);
        setCurrentUser(existingUser);
        applyRoleDefaultTab(existingUser.role);
        return;
      }

      if (session?.user) {
        const email = session.user.email || 'user@gmail.com';
        const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || email.split('@')[0];
        const avatar = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
        
        // Clean URL after OAuth callback
        if (window.location.hash || window.location.search) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check if this user has a previously saved profile (from a prior session)
        const savedProfile = getSavedProfileForEmail(email);
        if (savedProfile) {
          // Returning user: restore their session directly, skip onboarding
          const restoredUser: User = {
            ...savedProfile,
            // Refresh avatar from Google in case it changed
            avatar: avatar || savedProfile.avatar,
          };
          saveAuthSession(savedProfile.id ? `token_${savedProfile.id}` : `token_${Date.now()}`, restoredUser);
          setPendingGoogleUser(null);
          setCurrentUser(restoredUser);
          applyRoleDefaultTab(restoredUser.role);
          // Also attempt backend sync to refresh the token
          try {
            await api.googleAuth(email, restoredUser.name, restoredUser.role);
          } catch {
            // Silent fail – local session already restored
          }
          return;
        }

        // New user: show role onboarding modal
        setPendingGoogleUser({ email, name, avatar });
      }
    };

    // Only check existing session on mount if returning from an actual OAuth redirect
    if (isOAuthRedirect) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          processSession(session);
        }
      });
    }

    // Listen for explicit OAuth sign-in event
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        processSession(session);
      } else if (event === 'SIGNED_OUT') {
        setPendingGoogleUser(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Periodic Backend Health Check
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const healthy = await api.getHealth();
        if (isMounted) {
          setIsBackendHealthy(healthy);
        }
      } catch {
        if (isMounted) {
          setIsBackendHealthy(false);
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update HTML class for 3-Mode Elder Text Scaling (PRD §3)
  useEffect(() => {
    document.documentElement.classList.remove('text-normal', 'text-large', 'text-xl', 'simple-mode');
    document.documentElement.classList.add(`text-${textSize}`);
  }, [textSize]);

  // Sync HTML lang attribute for Devanagari typography
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleCycleTextSize = () => {
    setTextSize((prev) => (prev === 'normal' ? 'large' : prev === 'large' ? 'xl' : 'normal'));
  };

  const triggerTransition = (message: string, subMessage: string, targetAction: () => void) => {
    setLoadingState({
      message,
      subMessage,
      targetAction,
    });
  };

  const handleLoaderComplete = React.useCallback(() => {
    if (loadingState) {
      loadingState.targetAction();
      setLoadingState(null);
    }
  }, [loadingState]);

  const handleOpenLogin = (role?: UserRole) => {
    triggerTransition(
      'Opening Verified Care Gateway...',
      'Securing HIPAA & ABDM Clinical Gateway',
      () => {
        setPreferredRole(role);
        setUnauthView('auth');
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

  const handleRoleSelected = async (role: UserRole, profileData?: OnboardingProfileData) => {
    if (!pendingGoogleUser) return;
    const { email, name, avatar } = pendingGoogleUser;
    
    let userToSet: User;
    try {
      const res = await api.googleAuth(email, profileData?.name || name, role, profileData);
      // Merge local profileData on top of backend response so all onboarding fields are preserved
      userToSet = {
        ...res.user,
        avatar: avatar || res.user.avatar,
        age: profileData?.age ?? res.user.age,
        gender: profileData?.gender ?? res.user.gender,
        phone: profileData?.phone ?? res.user.phone,
        language: profileData?.language ?? res.user.language,
        patient_profile: profileData?.patient_profile ?? res.user.patient_profile,
        caregiver_profile: profileData?.caregiver_profile ?? res.user.caregiver_profile,
        clinician_profile: profileData?.clinician_profile ?? res.user.clinician_profile,
        coach_profile: profileData?.coach_profile ?? res.user.coach_profile,
      };
      // Explicitly persist the fully-merged profile to the email-keyed cache
      saveAuthSession(res.access_token || `token_${Date.now()}`, userToSet);
    } catch (e) {
      console.warn('Backend googleAuth call failed, creating local authenticated session:', e);
      userToSet = {
        id: `goog_${Date.now()}`,
        role: role,
        clinic_id: 'clinic_pune_01',
        name: profileData?.name || name,
        email: email,
        title: `Verified ${role.charAt(0).toUpperCase() + role.slice(1)}`,
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        phone: profileData?.phone,
        age: profileData?.age,
        gender: profileData?.gender,
        language: profileData?.language,
        patient_profile: profileData?.patient_profile,
        caregiver_profile: profileData?.caregiver_profile,
        clinician_profile: profileData?.clinician_profile,
        coach_profile: profileData?.coach_profile,
      };
      saveAuthSession('token_' + Date.now(), userToSet);
    }

    // Set state immediately so app directly enters dashboard
    setPendingGoogleUser(null);
    setCurrentUser(userToSet);
    applyRoleDefaultTab(userToSet.role);
    api.setPersona(userToSet.role, userToSet.id);

    triggerTransition(
      `Personalizing ${role.toUpperCase()} Sanctuary...`,
      `Setting up verified dashboard for ${userToSet.name}`,
      () => {
        applyRoleDefaultTab(userToSet.role);
      }
    );
  };

  const handleLogout = async () => {
    // 1. Clear session in local storage immediately
    api.logout();
    
    // 2. Clear Supabase auth tokens so it does not auto re-trigger session
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') || key.includes('supabase.auth.token')) {
          localStorage.removeItem(key);
        }
      });
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    }

    triggerTransition(
      'Signing out of Diabeto...',
      'Clearing session credentials securely',
      () => {
        setPendingGoogleUser(null);
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
      {/* 1.0-Second Transition Loader */}
      {loadingState && (
        <PageLoader
          message={loadingState.message}
          durationMs={900}
          onComplete={handleLoaderComplete}
        />
      )}

      {/* Main App Content Flow */}
      {!currentUser ? (
        pendingGoogleUser ? (
          <RoleSelectModal
            user={pendingGoogleUser}
            onSelectRole={handleRoleSelected}
          />
        ) : unauthView === 'auth' ? (
          <AuthView
            onLoginSuccess={handleLoginSuccess}
            onBack={handleBackToHero}
            initialRole={preferredRole}
          />
        ) : (
          <LandingHero onOpenLogin={handleOpenLogin} />
        )
      ) : (
        <div className="app-container">
          {/* Paper Grain Overlay */}
          <div className="paper-grain-overlay" aria-hidden="true" />

          {/* Solid Botanical Sidebar Navigation */}
          <SidebarNav
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              if (tab === 'patient') {
                setActivePatientTab('today');
              }
            }}
            language={language}
            setLanguage={setLanguage}
            textSize={textSize}
            onCycleTextSize={handleCycleTextSize}
            isBackendHealthy={isBackendHealthy}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenEditProfile={() => setShowProfileModal(true)}
            activePatientSection={activePatientSection}
            onSelectPatientSection={(section) => {
              setActivePatientSection(section);
              if (section === 'overview') {
                setActivePatientTab('today');
              } else {
                setActivePatientTab('log');
              }
            }}
            onOpenMealScanner={() => setShowMealScannerModal(true)}
            seniorSimpleMode={seniorSimpleMode}
            onToggleSeniorSimpleMode={() => {
              const next = !seniorSimpleMode;
              setSeniorSimpleMode(next);
              if (next) {
                setTextSize('large');
              }
            }}
          />

          {/* Main Content Area */}
          <div className="main-content-area">
            {/* Top Control Bar with Breadcrumb and Quick Triggers (Desktop / Laptop Only) */}
            <header className="desktop-top-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-dim)',
                  background: 'var(--surface-clay)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-stone)',
                }}>
                  {t('portalPrefix', language)}:
                </span>
                <span className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-forest)', whiteSpace: 'nowrap' }}>
                  {getPortalTitle()}
                </span>
              </div>

              <div className="desktop-top-actions">
                {/* Senior Simple Mode Toggle (PRD §3) */}
                {currentUser.role === 'patient' && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = !seniorSimpleMode;
                      setSeniorSimpleMode(next);
                      if (next) {
                        setTextSize('large');
                      }
                    }}
                    className={`btn header-btn ${seniorSimpleMode ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      borderColor: seniorSimpleMode ? 'var(--text-forest)' : 'var(--accent-sage)',
                    }}
                    title="Toggle Senior Ultra-Simple Mode"
                  >
                    <Sparkles size={13} color={seniorSimpleMode ? '#FFFFFF' : 'var(--terracotta)'} />
                    <span>{t('seniorSimpleMode', language)}: {seniorSimpleMode ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                {/* Manage Care Profile Button */}
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="btn btn-secondary header-btn"
                  type="button"
                  title="Manage Personalized Care Profile & Health Targets"
                >
                  <UserCog size={14} />
                  <span>{t('careProfile', language)}</span>
                </button>

                {/* Quick Emergency SOS */}
                <a
                  href={`tel:${currentUser.patient_profile?.caregiver_phone || '112'}`}
                  className="btn header-btn"
                  style={{
                    borderColor: 'var(--status-danger-border)',
                    color: 'var(--status-danger)',
                    backgroundColor: 'var(--status-danger-bg)',
                    fontWeight: 700,
                  }}
                >
                  <Phone size={13} className="shrink-0 animate-bounce" />
                  <span>{t('emergencySos', language)}</span>
                </a>

                {/* 3-Mode Elder Text Sizing Pill (PRD §3) */}
                <button
                  onClick={handleCycleTextSize}
                  className="btn btn-secondary header-btn"
                  type="button"
                  title="Cycle Text Size: Normal (18px) → Large (22px) → Extra Large (26px)"
                >
                  <Type size={13} />
                  <span>{t('seniorTextBtn', language)}</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-sage-dark)' }}>
                    {textSize === 'normal' ? '18px' : textSize === 'large' ? '22px' : '26px'}
                  </span>
                </button>

                {/* Sign Out Button in Header */}
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary header-btn"
                  type="button"
                  style={{
                    color: 'var(--text-muted)',
                  }}
                  title={t('signOut', language)}
                >
                  <LogOut size={13} />
                  <span>{t('signOut', language)}</span>
                </button>
              </div>
            </header>

            {/* Dynamic Portal Screen Content */}
            <div style={{ flex: 1, paddingBottom: currentUser.role === 'patient' ? '92px' : '32px' }}>
              <main style={{ position: 'relative', zIndex: 1 }}>
                {activeTab === 'patient' && (
                  activePatientTab === 'today' ? (
                    <TodayScreen
                      language={language}
                      currentUser={currentUser}
                      onOpenMealScanner={() => setShowMealScannerModal(true)}
                      onNavigateToSection={(section) => {
                        setActivePatientSection(section as PatientSection);
                        setActivePatientTab('log');
                      }}
                      seniorSimpleMode={seniorSimpleMode}
                    />
                  ) : (
                    <PatientPortal
                      language={language}
                      currentUser={currentUser}
                      onOpenEditProfile={() => setShowProfileModal(true)}
                      activeSection={activePatientSection}
                      onOpenMealScanner={() => setShowMealScannerModal(true)}
                    />
                  )
                )}
                {activeTab === 'clinician' && (
                  <ClinicianPortal
                    language={language}
                    currentRole={currentUser.role}
                    currentUser={currentUser}
                  />
                )}
                {activeTab === 'coach' && (
                  <CoachPortal
                    language={language}
                    currentRole={currentUser.role}
                    currentUser={currentUser}
                  />
                )}
                {activeTab === 'caregiver' && (
                  <CaregiverPortal
                    language={language}
                    currentRole={currentUser.role}
                    currentUser={currentUser}
                    onOpenEditProfile={() => setShowProfileModal(true)}
                  />
                )}
                {activeTab === 'simulator' && (
                  <WhatsAppSimulator
                    language={language}
                    currentUser={currentUser}
                  />
                )}
              </main>
            </div>

            {/* Patient Mobile Bottom Navigation (PRD §3) */}
            {currentUser.role === 'patient' && (
              <PatientBottomNav
                activePatientTab={activePatientTab}
                onSelectTab={(tab) => {
                  setActivePatientTab(tab);
                  if (tab === 'today') {
                    setActiveTab('patient');
                  } else if (tab === 'log') {
                    setActiveTab('patient');
                    setActivePatientSection('glucose');
                  } else if (tab === 'ask') {
                    setActiveTab('patient');
                    setActivePatientSection('careteam');
                  } else if (tab === 'me') {
                    setActiveTab('patient');
                    setActivePatientSection('overview');
                  }
                }}
                language={language}
                caregiverPhone={currentUser.patient_profile?.caregiver_phone || '112'}
                onOpenQuickLog={() => setShowMealScannerModal(true)}
              />
            )}

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

          {/* Edit Profile Modal */}
          {showProfileModal && (
            <EditProfileModal
              currentUser={currentUser}
              isOpen={showProfileModal}
              onClose={() => setShowProfileModal(false)}
              onProfileUpdated={(updated) => setCurrentUser(updated)}
            />
          )}

          {/* Meal Scanner Modal */}
          {showMealScannerModal && (
            <MealScannerModal
              isOpen={showMealScannerModal}
              onClose={() => setShowMealScannerModal(false)}
              language={language}
              patientId={currentUser.id}
            />
          )}
        </div>
      )}
    </>
  );
};

export default App;
