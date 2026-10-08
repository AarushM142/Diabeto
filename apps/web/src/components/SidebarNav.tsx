import React from 'react';
import { 
  Heart, Stethoscope, Sparkles, Terminal, HeartHandshake, 
  Globe, Type, Shield, ChevronRight
} from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import type { UserRole } from '../api/client';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

export type ActiveTab = 'patient' | 'clinician' | 'coach' | 'caregiver' | 'simulator';

interface SidebarNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isSimpleMode: boolean;
  setIsSimpleMode: (simple: boolean) => void;
  isBackendHealthy: boolean;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
}

const ROLE_PROFILES: Record<UserRole, { name: string; title: string; avatar: string }> = {
  clinician: {
    name: 'Dr. Arvind Mehta',
    title: 'Senior Diabetologist • Pune Central',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80',
  },
  coach: {
    name: 'Sister Kavita Deshmukh',
    title: 'Care Coordinator & Nutrition Coach',
    avatar: 'https://images.unsplash.com/photo-1594824813589-8d77c25091a1?w=100&auto=format&fit=crop&q=80',
  },
  caregiver: {
    name: 'Ananya Kulkarni',
    title: 'Primary Family Caregiver (Daughter)',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
  },
  admin: {
    name: 'Clinic Admin Desk',
    title: 'Pune Central Diabetes Clinic',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
  },
};

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  isSimpleMode,
  setIsSimpleMode,
  isBackendHealthy,
  currentRole,
  setCurrentRole,
}) => {
  const { isMobile, setOpenMobile } = useSidebar();
  const currentProfile = ROLE_PROFILES[currentRole] || ROLE_PROFILES.clinician;

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const navItems = [
    {
      id: 'patient' as ActiveTab,
      label: t('tabPatient', language),
      icon: Heart,
      badge: 'Senior',
      color: 'var(--accent-sage)',
    },
    {
      id: 'clinician' as ActiveTab,
      label: t('tabClinician', language),
      icon: Stethoscope,
      badge: 'MD Only',
      color: 'var(--status-ok)',
    },
    {
      id: 'coach' as ActiveTab,
      label: t('tabCoach', language),
      icon: Sparkles,
      badge: 'Coach',
      color: 'var(--terracotta)',
    },
    {
      id: 'caregiver' as ActiveTab,
      label: t('tabCaregiver', language),
      icon: HeartHandshake,
      badge: 'Family',
      color: 'var(--text-forest)',
    },
    {
      id: 'simulator' as ActiveTab,
      label: t('tabSimulator', language),
      icon: Terminal,
      badge: 'Interactive',
      color: 'var(--text-muted)',
    },
  ];

  return (
    <>
      {/* 1. Desktop & Tablet shadcn Collapsible Sidebar */}
      <Sidebar collapsible="icon" className="border-r border-[var(--border-stone)] bg-[var(--bg-alabaster)]">
        {/* Brand Header */}
        <SidebarHeader className="p-3 border-b border-[var(--border-stone)]">
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-sage)] text-white font-serif text-lg font-bold shadow-sm">
              d.
            </div>
            <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="font-serif text-lg font-bold tracking-tight text-[var(--text-forest)]">
                diabeto.
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Senior Care Platform
              </span>
            </div>
          </div>

          {/* Active Clinic Badge */}
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-[var(--surface-clay)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-forest)] group-data-[collapsible=icon]:hidden">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--status-ok)] animate-pulse" />
            <span className="truncate">Pune Central Clinic</span>
          </div>
        </SidebarHeader>

        {/* Persona Switcher Section */}
        <div className="p-3 border-b border-[var(--border-stone)] group-data-[collapsible=icon]:hidden">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
            <Shield size={12} />
            <span>Active Role</span>
          </div>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as UserRole)}
            className="w-full rounded-lg border border-[var(--border-stone)] bg-[var(--surface-clay)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-forest)] outline-none focus:border-[var(--accent-sage)] cursor-pointer"
          >
            <option value="clinician">👨‍⚕️ Dr. Mehta (Clinician)</option>
            <option value="coach">🌿 Sister Kavita (Coach)</option>
            <option value="caregiver">👧 Ananya K. (Caregiver)</option>
            <option value="admin">🏢 Clinic Admin</option>
          </select>
        </div>

        {/* Navigation Portals Menu */}
        <SidebarContent className="p-2">
          <SidebarGroup>
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] px-2">
              Navigation Portals
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        type="button"
                        isActive={isActive}
                        onClick={() => handleTabClick(item.id)}
                        tooltip={item.label}
                        className={`h-11 rounded-xl px-3 transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-[var(--accent-sage-subtle)] text-[var(--text-forest)] font-semibold shadow-xs border border-[var(--accent-sage-border)]' 
                            : 'text-[var(--text-muted)] hover:bg-[var(--surface-clay)] hover:text-[var(--text-forest)]'
                        }`}
                      >
                        <Icon 
                          size={18} 
                          className="shrink-0"
                          color={isActive ? 'var(--text-forest)' : 'var(--text-dim)'} 
                        />
                        <span className="truncate flex-1 text-sm">{item.label}</span>
                        <SidebarMenuBadge className="text-[10px] bg-[var(--surface-clay)] text-[var(--text-dim)] font-medium px-1.5 py-0.5 rounded-md">
                          {item.badge}
                        </SidebarMenuBadge>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer Utilities & Profile */}
        <SidebarFooter className="p-3 border-t border-[var(--border-stone)] flex flex-col gap-2.5">
          {/* Senior Text Mode Toggle */}
          <button
            onClick={() => setIsSimpleMode(!isSimpleMode)}
            className="flex items-center justify-between w-full rounded-lg border border-[var(--border-stone)] bg-[var(--surface-clay)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-forest)] hover:bg-[var(--surface-clay-dark)] transition-colors group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center"
            title="Toggle Senior High-Contrast Large Text"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Type size={14} className="shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Senior Text (19px)</span>
            </span>
            <span className="text-[10px] font-bold uppercase text-[var(--accent-sage-dark)] group-data-[collapsible=icon]:hidden">
              {isSimpleMode ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] group-data-[collapsible=icon]:hidden">
            <span className="flex items-center gap-1.5">
              <Globe size={13} />
              <span>Language</span>
            </span>
            <div className="flex gap-1">
              {(['en', 'hi', 'mr'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold transition-all ${
                    language === lang 
                      ? 'bg-[var(--text-forest)] text-white' 
                      : 'bg-[var(--surface-clay)] text-[var(--text-forest)] hover:bg-[var(--surface-clay-dark)]'
                  }`}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Engine Health Status */}
          <div className="flex items-center justify-between text-[11px] text-[var(--text-dim)] group-data-[collapsible=icon]:hidden">
            <span>FastAPI Engine</span>
            <span className="flex items-center gap-1.5 font-semibold text-[var(--text-forest)]">
              <span className={`h-2 w-2 rounded-full ${isBackendHealthy ? 'bg-[var(--status-ok)]' : 'bg-[var(--status-danger)]'}`} />
              {isBackendHealthy ? 'Live (8000)' : 'Offline'}
            </span>
          </div>

          <SidebarSeparator className="my-1 bg-[var(--border-stone)]" />

          {/* User Profile Footer Card */}
          <div className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-clay)] p-2 group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:justify-center">
            <img 
              src={currentProfile.avatar} 
              alt={currentProfile.name}
              className="h-8 w-8 rounded-full object-cover border border-[var(--border-stone)] shrink-0"
            />
            <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="text-xs font-bold text-[var(--text-forest)] truncate">
                {currentProfile.name}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] truncate">
                {currentProfile.title}
              </span>
            </div>
            <ChevronRight size={14} className="text-[var(--text-dim)] shrink-0 group-data-[collapsible=icon]:hidden" />
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* 2. Mobile Bottom Navigation Bar (Preserved for 1-thumb senior accessibility on phone viewports) */}
      <div className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabClick(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: 'transparent',
                border: 'none',
                color: isActive ? 'var(--text-forest)' : 'var(--text-dim)',
                padding: '6px 4px',
                cursor: 'pointer',
                flex: '1',
              }}
            >
              <div style={{
                width: '36px',
                height: '28px',
                borderRadius: '14px',
                background: isActive ? 'var(--accent-sage-subtle)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.5} color={isActive ? 'var(--text-forest)' : 'var(--text-dim)'} />
              </div>
              <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500 }}>
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};
