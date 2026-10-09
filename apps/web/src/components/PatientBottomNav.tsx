import React from 'react';
import { Home, PlusCircle, MessageCircle, User as UserIcon, Phone } from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';

export type PatientNavTab = 'today' | 'log' | 'ask' | 'me';

interface PatientBottomNavProps {
  activePatientTab: PatientNavTab;
  onSelectTab: (tab: PatientNavTab) => void;
  language: Language;
  caregiverPhone?: string;
  onOpenQuickLog?: () => void;
}

export const PatientBottomNav: React.FC<PatientBottomNavProps> = ({
  activePatientTab,
  onSelectTab,
  language,
  caregiverPhone = '112',
  onOpenQuickLog,
}) => {
  const tabs: { id: PatientNavTab; labelKey: 'tabToday' | 'tabLog' | 'tabAsk' | 'tabMe'; icon: React.FC<any> }[] = [
    { id: 'today', labelKey: 'tabToday', icon: Home },
    { id: 'log', labelKey: 'tabLog', icon: PlusCircle },
    { id: 'ask', labelKey: 'tabAsk', icon: MessageCircle },
    { id: 'me', labelKey: 'tabMe', icon: UserIcon },
  ];

  return (
    <>
      {/* Floating 56px Emergency SOS Button (Always reachable with thumb) */}
      <div
        style={{
          position: 'fixed',
          right: '16px',
          bottom: 'calc(76px + env(safe-area-inset-bottom))',
          zIndex: 1000,
        }}
      >
        <a
          href={`tel:${caregiverPhone}`}
          title={t('sosCallEmergency', language)}
          aria-label={t('sosCallEmergency', language)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            backgroundColor: 'var(--status-danger)',
            color: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(180, 67, 53, 0.45)',
            border: '2px solid #FFFFFF',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          className="active:scale-95"
        >
          <Phone size={26} className="animate-pulse" />
        </a>
      </div>

      {/* Elder-Friendly Mobile Bottom Navigation Bar (Min 56px per tab target) */}
      <nav
        className="mobile-bottom-nav"
        role="navigation"
        aria-label="Patient navigation"
        style={{
          display: 'flex',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.97)',
          backdropFilter: 'blur(16px)',
          borderTop: '1.5px solid var(--border-stone)',
          paddingTop: '6px',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
          paddingLeft: '8px',
          paddingRight: '8px',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 999,
          boxShadow: '0 -4px 24px rgba(45, 58, 49, 0.08)',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activePatientTab === tab.id;
          const label = t(tab.labelKey, language);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'log' && onOpenQuickLog) {
                  onOpenQuickLog();
                } else {
                  onSelectTab(tab.id);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '64px',
                minHeight: '56px',
                padding: '6px 12px',
                borderRadius: '16px',
                border: 'none',
                background: isActive ? 'var(--accent-sage-subtle)' : 'transparent',
                color: isActive ? 'var(--text-forest)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isActive ? 'var(--surface-white)' : 'transparent',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  marginBottom: '2px',
                }}
              >
                <Icon
                  size={20}
                  color={isActive ? 'var(--text-forest)' : 'var(--text-dim)'}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
              </div>
              <span
                style={{
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
