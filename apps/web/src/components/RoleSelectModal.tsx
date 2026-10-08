import React, { useState } from 'react';
import { 
  Stethoscope, Sparkles, HeartHandshake, Heart, Shield, 
  ArrowRight, Check, CheckCircle2
} from 'lucide-react';
import type { UserRole } from '../api/client';

interface RoleSelectModalProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  onSelectRole: (role: UserRole) => void;
  loading?: boolean;
}

interface RoleOption {
  id: UserRole;
  title: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  icon: React.ElementType;
  description: string;
  features: string[];
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'clinician',
    title: 'Clinician / Endocrinologist',
    badge: 'Doctor (MD)',
    badgeColor: 'var(--status-ok)',
    badgeBg: 'var(--status-ok-bg)',
    icon: Stethoscope,
    description: 'EHR Glycemic Dashboard, Clinical Summaries, TIR/TAR/TBR Ambulatory Analytics & Prescriptions.',
    features: ['Real-time TIR > 70% Analytics', '1-Click Weekly Sign-offs', 'Prescription Management'],
  },
  {
    id: 'coach',
    title: 'Health & Nutrition Coach',
    badge: 'Care Coach',
    badgeColor: 'var(--terracotta)',
    badgeBg: 'var(--surface-clay)',
    icon: Sparkles,
    description: 'Human-in-the-loop WhatsApp nudge approvals, cultural Indian dietary guardrails & fasting protocols.',
    features: ['Behavioral Nudge Queue', 'Festival & Fasting Protocols', 'Dietary Guidance'],
  },
  {
    id: 'caregiver',
    title: 'Family Caregiver',
    badge: 'Son / Daughter',
    badgeColor: 'var(--text-forest)',
    badgeBg: 'var(--surface-clay)',
    icon: HeartHandshake,
    description: 'Real-time peace of mind, morning fasting checks, meal confirmations, and multi-tier SOS escalation.',
    features: ['Daily Fasting Status', 'Multi-Tier SOS Escalations', 'Consent Transparency'],
  },
  {
    id: 'patient',
    title: 'Senior Patient (Sanctuary)',
    badge: 'Senior 60+',
    badgeColor: 'var(--accent-sage)',
    badgeBg: 'var(--accent-sage-subtle)',
    icon: Heart,
    description: '19px High-Contrast UI, Sarvam AI Hindi & Marathi speech-to-text voice logging, and 1-tap doctor booking.',
    features: ['19px High-Contrast Mode', 'Hindi/Marathi Voice Logging', '1-Tap Family SOS'],
  },
  {
    id: 'admin',
    title: 'Clinic Administrator',
    badge: 'Ops Desk',
    badgeColor: 'var(--accent-sage-dark)',
    badgeBg: 'var(--surface-clay)',
    icon: Shield,
    description: 'Clinic operations desk, system-wide HIPAA audit trails, patient onboarding & staff permissions.',
    features: ['System Audit Trail', 'Role-Based Access Control', 'Clinic Operations'],
  },
];

export const RoleSelectModal: React.FC<RoleSelectModalProps> = ({
  user,
  onSelectRole,
  loading = false,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('clinician');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSelectRole(selectedRole);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-alabaster)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      position: 'relative',
    }}>
      {/* Paper grain backdrop */}
      <div className="paper-grain-overlay" aria-hidden="true" />

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '680px',
        backgroundColor: 'var(--surface-white)',
        borderRadius: '24px',
        border: '1px solid var(--border-stone)',
        boxShadow: 'var(--shadow-lg)',
        padding: '36px 32px',
      }}>
        {/* User Identity Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
            <img
              src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={user.name}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid var(--surface-white)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-ok)',
              border: '2px solid var(--surface-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Check size={12} color="#FFFFFF" strokeWidth={3} />
            </div>
          </div>

          <h2 className="font-serif" style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-forest)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Welcome, {user.name}!
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 4px' }}>
            Authenticated via Google ({user.email})
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--surface-clay)',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            color: 'var(--text-forest)',
            fontWeight: 600,
            marginTop: '4px',
          }}>
            <span>Please select your role to personalize your care dashboard</span>
          </div>
        </div>

        {/* Role Selection Grid */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {ROLE_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedRole === option.id;

              return (
                <div
                  key={option.id}
                  onClick={() => setSelectedRole(option.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: isSelected ? '2px solid var(--accent-sage-dark)' : '1px solid var(--border-stone)',
                    backgroundColor: isSelected ? 'var(--accent-sage-subtle)' : 'var(--surface-white)',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(45, 58, 49, 0.08)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-clay)';
                      e.currentTarget.style.borderColor = 'var(--accent-sage)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-white)';
                      e.currentTarget.style.borderColor = 'var(--border-stone)';
                    }
                  }}
                >
                  {/* Selection Radio Dot */}
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: isSelected ? '6px solid var(--text-forest)' : '2px solid var(--border-stone)',
                    backgroundColor: '#FFFFFF',
                    marginTop: '2px',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }} />

                  {/* Icon Box */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'var(--surface-white)' : 'var(--surface-clay)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isSelected ? 'var(--text-forest)' : 'var(--text-dim)',
                    flexShrink: 0,
                    border: '1px solid var(--border-stone)',
                  }}>
                    <Icon size={18} />
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                        {option.title}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 7px',
                        borderRadius: '6px',
                        backgroundColor: option.badgeBg,
                        color: option.badgeColor,
                        border: '1px solid var(--border-stone)',
                      }}>
                        {option.badge}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 6px', lineHeight: 1.4 }}>
                      {option.description}
                    </p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {option.features.map((feat, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isSelected ? 'var(--surface-white)' : 'var(--surface-clay)',
                            color: 'var(--text-forest)',
                            border: '1px solid var(--border-stone)',
                          }}
                        >
                          • {feat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enter Dashboard Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              height: '48px',
              marginTop: '16px',
              borderRadius: '14px',
              backgroundColor: 'var(--text-forest)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-md)',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{loading ? 'Initializing Portal...' : `Continue to ${ROLE_OPTIONS.find(r => r.id === selectedRole)?.title.split('/')[0].trim()} Dashboard`}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Security / Compliance Footnote */}
        <div style={{
          marginTop: '20px',
          paddingTop: '14px',
          borderTop: '1px solid var(--border-stone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
        }}>
          <CheckCircle2 size={13} color="var(--status-ok)" />
          <span>ABDM & HIPAA Consent Compliant • Pune Central Diabetes Network</span>
        </div>
      </div>
    </div>
  );
};
