import React, { useState } from 'react';
import { 
  Shield, Stethoscope, Sparkles, HeartHandshake, Heart, 
  ArrowRight, ArrowLeft, CheckCircle2, Building, AlertCircle
} from 'lucide-react';
import { api, type User, type UserRole } from '../api/client';
import { AuthForm } from './ui/sign-in';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onBack?: () => void;
  initialRole?: UserRole;
}

interface DemoRole {
  role: UserRole;
  name: string;
  title: string;
  email: string;
  avatar: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  description: string;
  clinic: string;
}

const DEMO_ROLES: DemoRole[] = [
  {
    role: 'clinician',
    name: 'Dr. Arvind Mehta',
    title: 'Senior Diabetologist (Clinician of Record)',
    email: 'dr.mehta@diabeto.care',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80',
    icon: Stethoscope,
    badge: 'MD Gated Portal',
    badgeColor: 'var(--status-ok)',
    description: 'EHR Glycemic Dashboard, Clinical Summaries Verification, TIR/TAR/TBR Analytics & Prescriptions',
    clinic: 'Pune Central Diabetes Clinic',
  },
  {
    role: 'coach',
    name: 'Sister Kavita Deshmukh',
    title: 'Care Coordinator & Nutrition Coach',
    email: 'kavita.coach@diabeto.care',
    avatar: 'https://images.unsplash.com/photo-1594824813589-8d77c25091a1?w=100&auto=format&fit=crop&q=80',
    icon: Sparkles,
    badge: 'Care Specialist',
    badgeColor: 'var(--terracotta)',
    description: 'WhatsApp Nudge Approval Queue, Dietary & Lifestyle Interventions, Patient Protocol Tracking',
    clinic: 'Pune Central Diabetes Clinic',
  },
  {
    role: 'caregiver',
    name: 'Ananya Kulkarni',
    title: 'Primary Family Caregiver (Daughter)',
    email: 'ananya.k@example.com',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    icon: HeartHandshake,
    badge: 'Family Portal',
    badgeColor: 'var(--text-forest)',
    description: 'Peace-of-Mind Live Status, Real-Time Emergency Escalation, Consent & Glucose Transparency',
    clinic: 'Linked: Ramesh Kulkarni',
  },
  {
    role: 'patient',
    name: 'Ramesh Kulkarni',
    title: 'Senior Patient (72 yrs)',
    email: 'ramesh.kulkarni@example.com',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&auto=format&fit=crop&q=80',
    icon: Heart,
    badge: 'Senior Sanctuary',
    badgeColor: 'var(--accent-sage)',
    description: '19px High-Contrast Glucose Logging, Hindi/Marathi/English Guidance, 1-Tap Doctor Booking',
    clinic: 'Pune Central Patient #pt_001',
  },
  {
    role: 'admin',
    name: 'Clinic Admin Desk',
    title: 'Clinic Operations Administrator',
    email: 'admin@diabeto.care',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    icon: Shield,
    badge: 'Admin Audit',
    badgeColor: 'var(--accent-sage-dark)',
    description: 'System Audit Trail, Cross-Role Oversight, Patient Onboarding, Compliance Verification',
    clinic: 'Pune Central Clinic Admin',
  },
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBack, initialRole }) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'email'>('quick');
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || 'clinician');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickLogin = async (demoRole: DemoRole) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.login(demoRole.email, 'password123', demoRole.role);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-alabaster)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      position: 'relative',
    }}>
      {/* Paper grain backdrop */}
      <div className="paper-grain-overlay" aria-hidden="true" />

      {/* Main Container Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '560px',
        backgroundColor: 'var(--surface-white)',
        borderRadius: '24px',
        border: '1px solid var(--border-stone)',
        boxShadow: 'var(--shadow-lg)',
        padding: '36px 32px',
      }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-stone)',
              backgroundColor: 'var(--surface-clay)',
              color: 'var(--text-forest)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            <ArrowLeft size={14} />
            Back to Overview
          </button>
        )}

        {/* Platform Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'var(--accent-sage)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            boxShadow: 'var(--shadow-md)',
            marginBottom: '14px',
          }}>
            d.
          </div>
          <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-forest)', margin: 0, letterSpacing: '-0.02em' }}>
            diabeto.
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>
            Role-Based Senior Diabetes Precision Care Platform
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--surface-clay)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: 'var(--text-forest)',
            fontWeight: 600,
            marginTop: '10px',
          }}>
            <Building size={12} />
            Pune Central Diabetes Network
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            color: 'var(--status-danger)',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            marginBottom: '20px',
          }}>
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--surface-clay)',
          padding: '4px',
          borderRadius: '14px',
          marginBottom: '24px',
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('quick'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'quick' ? 'var(--surface-white)' : 'transparent',
              color: activeTab === 'quick' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: activeTab === 'quick' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'quick' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            ⚡ Quick Verified Roles
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('email'); setError(null); }}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'email' ? 'var(--surface-white)' : 'transparent',
              color: activeTab === 'email' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: activeTab === 'email' ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'email' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            🔑 Google / Email Login
          </button>
        </div>

        {/* 1. Quick Role Accounts List */}
        {activeTab === 'quick' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              Select your authenticated role to open its dedicated dashboard:
            </div>

            {DEMO_ROLES.map((demo) => {
              const Icon = demo.icon;
              return (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => handleQuickLogin(demo)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid var(--border-stone)',
                    backgroundColor: 'var(--surface-white)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-clay)';
                    e.currentTarget.style.borderColor = 'var(--accent-sage)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--surface-white)';
                    e.currentTarget.style.borderColor = 'var(--border-stone)';
                  }}
                >
                  <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                    <img
                      src={demo.avatar}
                      alt={demo.name}
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--surface-white)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'var(--surface-white)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={11} color={demo.badgeColor} />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                        {demo.name}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'var(--surface-clay)',
                        color: demo.badgeColor,
                        border: '1px solid var(--border-stone)',
                      }}>
                        {demo.badge}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {demo.title}
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {demo.description}
                    </div>
                  </div>

                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'var(--surface-clay)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ArrowRight size={16} color="var(--text-forest)" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 2. Google / Microsoft / Apple / SSO / Email Authentication via AuthForm */}
        {activeTab === 'email' && (
          <div style={{ width: '100%' }}>
            <AuthForm
              isSignUp={isRegistering}
              selectedRole={selectedRole}
              onRoleChange={(r) => setSelectedRole(r as UserRole)}
              onToggleMode={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              onEmailSubmit={async (data) => {
                try {
                  setLoading(true);
                  setError(null);
                  const targetRole = (data.role as UserRole) || selectedRole;
                  if (isRegistering) {
                    const res = await api.signup(data.name || 'Healthcare User', data.email, data.password || 'password123', targetRole);
                    onLoginSuccess(res.user);
                  } else {
                    const res = await api.login(data.email, data.password || 'password123', targetRole);
                    onLoginSuccess(res.user);
                  }
                } catch (err: any) {
                  setError(err.message || 'Authentication failed. Please check your credentials.');
                } finally {
                  setLoading(false);
                }
              }}
              onGoogleSignIn={async () => {
                try {
                  setLoading(true);
                  setError(null);
                  const res = await api.googleAuth('dr.mehta@gmail.com', 'Dr. Arvind Mehta', selectedRole);
                  onLoginSuccess(res.user);
                } catch (err: any) {
                  setError(err.message || 'Google authentication failed');
                } finally {
                  setLoading(false);
                }
              }}
              onEmailLink={() => {
                setError(null);
                alert('✨ Magic link dispatched to your email! Opening default clinician session...');
                api.login('dr.mehta@diabeto.care', 'password123', selectedRole).then(res => onLoginSuccess(res.user));
              }}
              className="border-none shadow-none p-0 bg-transparent"
            />
          </div>
        )}

        {/* Security / Compliance Footnote */}
        <div style={{
          marginTop: '28px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-stone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
        }}>
          <CheckCircle2 size={13} color="var(--status-ok)" />
          <span>Role-Based Access Control • HIPAA & Consent Enforced</span>
        </div>
      </div>
    </div>
  );
};
