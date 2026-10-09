import React, { useState } from 'react';
import {
  Heart, Stethoscope, Sparkles, Terminal, HeartHandshake,
  Globe, Type, Menu, X, Phone, LogOut, ShieldCheck, UserCog,
  Pill, TrendingUp, Utensils, CalendarCheck, CheckCircle2,
  Activity
} from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import type { User, UserRole } from '../api/client';

export type ActiveTab = 'patient' | 'clinician' | 'coach' | 'caregiver' | 'simulator';

export type PatientSection = 'overview' | 'medications' | 'glucose' | 'meals' | 'careteam' | 'wellness';

export type TextSize = 'normal' | 'large' | 'xl';

interface SidebarNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  textSize: TextSize;
  onCycleTextSize: () => void;
  isBackendHealthy: boolean;
  currentUser: User;
  onLogout: () => void;
  onOpenEditProfile?: () => void;
  activePatientSection?: PatientSection;
  onSelectPatientSection?: (section: PatientSection) => void;
  onOpenMealScanner?: () => void;
  seniorSimpleMode?: boolean;
  onToggleSeniorSimpleMode?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  textSize,
  onCycleTextSize,
  isBackendHealthy,
  currentUser,
  onLogout,
  onOpenEditProfile,
  activePatientSection = 'overview',
  onSelectPatientSection,
  onOpenMealScanner,
  seniorSimpleMode,
  onToggleSeniorSimpleMode,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarPillTaken, setSidebarPillTaken] = useState(false);

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  const handleSectionClick = (sectionId: PatientSection) => {
    if (activeTab !== 'patient') {
      setActiveTab('patient');
    }
    if (onSelectPatientSection) {
      onSelectPatientSection(sectionId);
    }
    setMobileDrawerOpen(false);
  };

  // Define full list of portals
  const allNavItems = [
    {
      id: 'patient' as ActiveTab,
      label: t('tabPatient', language),
      icon: Heart,
      badge: 'Sanctuary',
      allowedRoles: ['patient', 'admin'] as UserRole[],
    },
    {
      id: 'clinician' as ActiveTab,
      label: t('tabClinician', language),
      icon: Stethoscope,
      badge: 'EHR / MD',
      allowedRoles: ['clinician', 'admin'] as UserRole[],
    },
    {
      id: 'coach' as ActiveTab,
      label: t('tabCoach', language),
      icon: Sparkles,
      badge: 'Copilot',
      allowedRoles: ['coach', 'admin'] as UserRole[],
    },
    {
      id: 'caregiver' as ActiveTab,
      label: t('tabCaregiver', language),
      icon: HeartHandshake,
      badge: 'Family',
      allowedRoles: ['caregiver', 'admin'] as UserRole[],
    },
    {
      id: 'simulator' as ActiveTab,
      label: t('tabSimulator', language),
      icon: Terminal,
      badge: 'Simulate',
      allowedRoles: ['clinician', 'coach', 'admin'] as UserRole[],
    },
  ];

  // Strictly filter portals by authenticated user's role
  const visibleNavItems = allNavItems.filter((item) =>
    item.allowedRoles.includes(currentUser.role)
  );

  const getRoleDisplayName = (role: UserRole, lang: Language) => {
    if (lang === 'hi') {
      switch (role) {
        case 'clinician': return { label: 'डायबेटोलॉजिस्ट (MD)', badgeColor: 'var(--status-ok)' };
        case 'coach': return { label: 'केयर एवं पोषण कोच', badgeColor: 'var(--terracotta)' };
        case 'caregiver': return { label: 'पारिवारिक देखभालकर्ता', badgeColor: 'var(--text-forest)' };
        case 'patient': return { label: 'वरिष्ठ मरीज़', badgeColor: 'var(--accent-sage)' };
        case 'admin': return { label: 'क्लिनिक व्यवस्थापक', badgeColor: 'var(--accent-sage-dark)' };
      }
    }
    if (lang === 'mr') {
      switch (role) {
        case 'clinician': return { label: 'मधुमेह तज्ज्ञ (MD)', badgeColor: 'var(--status-ok)' };
        case 'coach': return { label: 'केअर व आहार कोच', badgeColor: 'var(--terracotta)' };
        case 'caregiver': return { label: 'कुटुंब सदस्य', badgeColor: 'var(--text-forest)' };
        case 'patient': return { label: 'ज्येष्ठ नागरिक', badgeColor: 'var(--accent-sage)' };
        case 'admin': return { label: 'क्लिनिक प्रशासक', badgeColor: 'var(--accent-sage-dark)' };
      }
    }
    switch (role) {
      case 'clinician': return { label: 'Diabetologist (MD)', badgeColor: 'var(--status-ok)' };
      case 'coach': return { label: 'Care & Nutrition Coach', badgeColor: 'var(--terracotta)' };
      case 'caregiver': return { label: 'Family Caregiver', badgeColor: 'var(--text-forest)' };
      case 'patient': return { label: 'Senior Patient', badgeColor: 'var(--accent-sage)' };
      case 'admin': return { label: 'Clinic Administrator', badgeColor: 'var(--accent-sage-dark)' };
    }
  };

  const roleMeta = getRoleDisplayName(currentUser.role, language);

  // Patient Sub-navigation Sections (Clean, Serene & Multilingual)
  const patientSections: { id: PatientSection; label: string; icon: React.FC<any>; count?: string }[] = [
    { id: 'overview', label: t('todaySanctuary', language), icon: Heart },
    { id: 'glucose', label: t('myGlucose', language), icon: TrendingUp },
    { id: 'medications', label: t('medSchedule', language), icon: Pill },
    { id: 'meals', label: t('scanFoodPlate', language), icon: Utensils },
    { id: 'careteam', label: t('careTeam', language), icon: CalendarCheck },
  ];

  const renderNavContent = () => {
    return (
      <>
        {/* 1. Main Role Portals (If user is Admin or has multiple portals) */}
        {visibleNavItems.length > 1 && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px 6px' }}>
              {t('portalsTitle', language)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: isActive ? '1px solid var(--accent-sage-border)' : '1px solid transparent',
                      background: isActive ? 'var(--accent-sage-subtle)' : 'transparent',
                      color: isActive ? 'var(--text-forest)' : 'var(--text-muted)',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={17} color={isActive ? 'var(--text-forest)' : 'var(--text-dim)'} />
                      <span>{item.label}</span>
                    </div>
                    <span style={{
                      fontSize: '0.62rem',
                      background: isActive ? 'var(--surface-white)' : 'var(--surface-clay)',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      color: isActive ? 'var(--text-forest)' : 'var(--text-dim)',
                      fontWeight: 600,
                    }}>
                      {item.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Organized Patient Feature Sub-Navigation */}
        {(currentUser.role === 'patient' || activeTab === 'patient') && (
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px 6px' }}>
              {t('sanctuaryTitle', language)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {patientSections.map((sec) => {
                const Icon = sec.icon;
                const isSelected = activeTab === 'patient' && activePatientSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSectionClick(sec.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      border: isSelected ? '1.5px solid var(--accent-sage-dark)' : '1px solid transparent',
                      background: isSelected ? 'var(--accent-sage-subtle)' : 'transparent',
                      color: isSelected ? 'var(--text-forest)' : 'var(--text-forest)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.92rem',
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Icon size={18} color={isSelected ? 'var(--accent-sage-dark)' : 'var(--text-muted)'} strokeWidth={isSelected ? 2.3 : 1.8} />
                      <span>{sec.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Quick Sidebar Widgets - Role Tailored */}
        {currentUser.role === 'caregiver' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px 2px' }}>
              {t('quickGlance', language)} (Elder Track)
            </div>

            {/* Caregiver Elder Sugar & Goal */}
            <div style={{
              background: 'var(--surface-clay)',
              border: '1px solid var(--border-stone)',
              borderRadius: '14px',
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={12} color="var(--accent-sage)" />
                  {t('fastingSugar', language)}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--status-ok)', fontWeight: 700, background: 'var(--surface-white)', padding: '1px 6px', borderRadius: '4px' }}>
                  {t('inRange', language)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="font-serif tabular" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                  128
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  mg/dL ({t('goalLabel', language)}: &le; {currentUser.patient_profile?.target_fasting_glucose || 130})
                </span>
              </div>
            </div>

            {/* Next Dose Pill Tracker */}
            <div style={{
              background: sidebarPillTaken ? 'var(--surface-clay)' : 'var(--terracotta-subtle)',
              border: sidebarPillTaken ? '1px solid var(--border-stone)' : '1.5px solid var(--terracotta-border)',
              borderRadius: '14px',
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.7rem', color: sidebarPillTaken ? 'var(--text-dim)' : 'var(--terracotta-dark)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Pill size={12} />
                  {sidebarPillTaken ? t('allDosesConfirmed', language) : t('nightMedsDue', language)}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>8:00 PM</span>
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginTop: '2px' }}>
                Glimepiride 1mg
              </div>
              {!sidebarPillTaken ? (
                <button
                  type="button"
                  onClick={() => setSidebarPillTaken(true)}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', marginTop: '6px', fontSize: '0.72rem', padding: '4px 8px', justifyContent: 'center' }}
                >
                  <CheckCircle2 size={12} />
                  {t('confirmTaken', language)}
                </button>
              ) : (
                <div style={{ fontSize: '0.68rem', color: 'var(--status-ok)', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} />
                  {t('loggedForToday', language)}
                </div>
              )}
            </div>

            {/* Quick Action Meal Scanner Button */}
            {onOpenMealScanner && (
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onOpenMealScanner();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '14px',
                  border: '1.5px solid var(--accent-sage-border)',
                  background: 'linear-gradient(135deg, var(--accent-sage-subtle) 0%, var(--surface-clay) 100%)',
                  color: 'var(--text-forest)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  width: '100%',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '8px',
                    background: 'var(--accent-sage)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                  }}>
                    <Utensils size={14} />
                  </div>
                  <span>{t('scanFoodPlate', language)}</span>
                </div>
                <Sparkles size={14} color="var(--terracotta)" />
              </button>
            )}

            {/* Emergency SOS Hotline Card */}
            <div style={{
              background: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              borderRadius: '14px',
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--status-danger)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {t('emergencySos', language)}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t('oneTapCall', language)}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <a
                  href={`tel:${currentUser.patient_profile?.caregiver_phone || '+919800000002'}`}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: '1', fontSize: '0.7rem', padding: '4px', justifyContent: 'center', borderColor: 'var(--status-danger-border)', color: 'var(--status-danger)' }}
                >
                  <Phone size={11} />
                  {t('caregiverBtn', language)}
                </a>
                <a
                  href="tel:108"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: '1', fontSize: '0.7rem', padding: '4px', justifyContent: 'center', borderColor: 'var(--status-danger-border)', color: 'var(--status-danger)' }}
                >
                  <Phone size={11} />
                  108 / 112
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Portal Quick Tools (Shown only when in Clinician Portal) */}
        {(currentUser.role === 'clinician' || activeTab === 'clinician') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px 2px' }}>
              Clinical Fast Triage
            </div>

            <div style={{
              background: 'var(--surface-clay)',
              border: '1px solid var(--border-stone)',
              borderRadius: '14px',
              padding: '10px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-forest)', fontWeight: 700 }}>
                  Active Roster Status
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--status-danger)', fontWeight: 700, background: 'var(--status-danger-bg)', padding: '1px 6px', borderRadius: '4px' }}>
                  2 Critical
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', textAlign: 'center' }}>
                <div style={{ background: 'var(--surface-white)', padding: '6px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-forest)' }}>8</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontWeight: 600 }}>Patients</div>
                </div>
                <div style={{ background: 'var(--surface-white)', padding: '6px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--status-ok)' }}>74%</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontWeight: 600 }}>Avg TIR</div>
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--accent-sage-subtle)',
              border: '1px solid var(--accent-sage-border)',
              borderRadius: '14px',
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                💡 Quick Patient Link
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Ask elders to share their 6-letter connection code (e.g. <code>DIA-RAM789</code>) or use the <strong>+ Connect Patient</strong> button.
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {/* 1. Mobile Top Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 0 }}>
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open Navigation"
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              color: 'var(--text-forest)',
            }}
          >
            <Menu size={22} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-forest)' }}>
              diabeto.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {onOpenMealScanner && (
            <button
              onClick={onOpenMealScanner}
              className="btn btn-secondary header-btn"
              style={{ borderColor: 'var(--accent-sage-border)', color: 'var(--accent-sage-dark)' }}
              title="Scan Meal"
            >
              <Utensils size={13} />
              <span>{t('scanAction', language)}</span>
            </button>
          )}

          <a
            href={`tel:${currentUser.patient_profile?.caregiver_phone || '+919800000002'}`}
            className="btn header-btn"
            style={{ borderColor: 'var(--status-danger-border)', color: 'var(--status-danger)', backgroundColor: 'var(--status-danger-bg)' }}
          >
            <Phone size={12} />
            <span>SOS</span>
          </a>

          <button
            onClick={onCycleTextSize}
            className="btn btn-secondary header-btn"
            type="button"
            title="Cycle Text Size: Normal (18px) → Large (22px) → Extra Large (26px)"
          >
            <Type size={12} />
            <span>{textSize === 'normal' ? '18px' : textSize === 'large' ? '22px' : '26px'}</span>
          </button>

          <button
            onClick={onLogout}
            title={t('signOut', language)}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* 2. Desktop Solid In-Flow Sidebar (Smooth continuous scrolling container) */}
      <aside className="desktop-sidebar" style={{ width: '280px', display: 'flex', flexDirection: 'column' }}>
        {/* Logo & Brand Header */}
        <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--border-stone)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '12px',
              background: 'var(--accent-sage)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '1.2rem',
              fontFamily: 'var(--font-serif)',
              boxShadow: 'var(--shadow-sm)',
            }}>
              d.
            </div>
            <div>
              <span className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>
                diabeto.
              </span>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginTop: '2px' }}>
                {t('seniorCareSanctuary', language)}
              </div>
            </div>
          </div>

          {/* Active Clinic Badge */}

        </div>

        {/* Authenticated Role Status Banner */}
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-stone)', background: 'var(--surface-clay)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} color="var(--status-ok)" />
              {roleMeta.label}
            </span>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'var(--surface-white)',
              color: roleMeta.badgeColor,
              border: '1px solid var(--border-stone)',
            }}>
              {currentUser.role.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Navigation Portals Menu & Widgets (Natural flow, not trapped) */}
        <nav style={{ padding: '14px 14px', display: 'flex', flexDirection: 'column' }}>
          {renderNavContent()}
        </nav>

        {/* Footer Utilities & Profile Card */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-stone)', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-alabaster)', marginTop: 'auto', flexShrink: 0 }}>
          {/* Senior High-Contrast 3-Mode Text Toggle (PRD §3) */}
          <button
            type="button"
            onClick={onCycleTextSize}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 10px',
              borderRadius: '10px',
              border: '1px solid var(--border-stone)',
              background: textSize !== 'normal' ? 'var(--accent-sage-subtle)' : 'var(--surface-clay)',
              color: 'var(--text-forest)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
            title="Cycle Text Size: Normal (18px) → Large (22px) → Extra Large (26px)"
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Type size={13} />
              {t('elderTextSize', language)}
            </span>
            <span style={{ fontWeight: 800, color: 'var(--accent-sage-dark)' }}>
              {textSize === 'normal' ? '18px (Norm)' : textSize === 'large' ? '22px (Lg)' : '26px (XL)'}
            </span>
          </button>

          {/* Multilingual Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={12} /> {t('languageLabel', language)}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['en', 'hi', 'mr'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  style={{
                    padding: '2px 7px',
                    borderRadius: '6px',
                    border: language === lang ? '1px solid var(--text-forest)' : '1px solid var(--border-stone)',
                    background: language === lang ? 'var(--text-forest)' : 'var(--surface-clay)',
                    color: language === lang ? '#FFFFFF' : 'var(--text-forest)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Engine Health Status (Only for Pro / Clinician / Admin roles) */}
          {currentUser.role !== 'patient' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', paddingTop: '2px' }}>
              <span>{t('fastApiEngine', language)}</span>
              <span style={{ color: isBackendHealthy ? 'var(--status-ok)' : 'var(--status-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className={`status-dot ${isBackendHealthy ? 'ok' : 'danger'}`} />
                {isBackendHealthy ? `${t('liveStatus', language)} (8000)` : t('offline', language)}
              </span>
            </div>
          )}

          {/* User Profile Card */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '7px 10px',
            borderRadius: '12px',
            background: 'var(--surface-clay)',
            marginTop: '2px',
            border: '1px solid var(--border-stone)',
          }}>
            <div
              onClick={onOpenEditProfile}
              title="Click to edit profile & health targets"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1, cursor: onOpenEditProfile ? 'pointer' : 'default' }}
            >
              <img
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                alt={currentUser.name}
                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-forest)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.email}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              {onOpenEditProfile && (
                <button
                  type="button"
                  onClick={onOpenEditProfile}
                  title="Edit Care Profile"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '5px',
                    borderRadius: '6px',
                    color: 'var(--text-forest)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCog size={15} />
                </button>
              )}

              <button
                type="button"
                onClick={onLogout}
                title="Sign Out / Log Out"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '5px',
                  borderRadius: '6px',
                  color: 'var(--status-danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 3. Mobile Slide-Over Drawer */}
      {mobileDrawerOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(45, 58, 49, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 99999,
          display: 'flex',
        }}>
          <div style={{
            width: '300px',
            background: 'var(--surface-white)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            padding: '18px 16px',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                diabeto.
              </span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={22} color="var(--text-forest)" />
              </button>
            </div>

            {/* Authenticated Account Tag */}
            <div
              onClick={() => {
                if (onOpenEditProfile) {
                  setMobileDrawerOpen(false);
                  onOpenEditProfile();
                }
              }}
              style={{
                padding: '8px 12px',
                background: 'var(--surface-clay)',
                borderRadius: '12px',
                marginBottom: '14px',
                cursor: onOpenEditProfile ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--border-stone)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700 }}>{t('verifiedAccount', language)}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-forest)' }}>{currentUser.name}</div>
                <div style={{ fontSize: '0.7rem', color: roleMeta.badgeColor, fontWeight: 600 }}>{roleMeta.label}</div>
              </div>
              {onOpenEditProfile && (
                <div style={{
                  padding: '5px',
                  borderRadius: '6px',
                  background: 'var(--surface-white)',
                  color: 'var(--text-forest)',
                }}>
                  <UserCog size={15} />
                </div>
              )}
            </div>

            {/* Senior Simple Mode Quick Switch (Mobile Drawer) */}
            {currentUser.role === 'patient' && onToggleSeniorSimpleMode && (
              <button
                type="button"
                onClick={onToggleSeniorSimpleMode}
                className={`btn header-btn ${seniorSimpleMode ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  width: '100%',
                  marginBottom: '10px',
                  justifyContent: 'center',
                  borderColor: seniorSimpleMode ? 'var(--text-forest)' : 'var(--accent-sage)',
                }}
              >
                <Sparkles size={14} color={seniorSimpleMode ? '#FFFFFF' : 'var(--terracotta)'} />
                <span>{t('seniorSimpleMode', language)}: {seniorSimpleMode ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* Mobile Nav Links & Widgets */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
              {renderNavContent()}
            </div>

            {/* Mobile Footer */}
            <div style={{ borderTop: '1px solid var(--border-stone)', paddingTop: '12px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'var(--status-danger-bg)',
                  border: '1px solid var(--status-danger-border)',
                  color: 'var(--status-danger)',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <LogOut size={15} />
                {t('signOut', language)}
              </button>
            </div>
          </div>

          <div style={{ flex: '1' }} onClick={() => setMobileDrawerOpen(false)} />
        </div>
      )}
    </>
  );
};
