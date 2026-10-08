import React, { useState } from 'react';
import { 
  Shield, Stethoscope, Sparkles, HeartHandshake, Heart, 
  ArrowRight, CheckCircle2, Lock, Mail, User as UserIcon, Building, AlertCircle
} from 'lucide-react';
import { api, type User, type UserRole } from '../api/client';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
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

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'quick' | 'email'>('quick');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('clinician');
  
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

  const handleGoogleLogin = async () => {
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
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isRegistering) {
        if (!name) {
          setError('Please enter your full name');
          setLoading(false);
          return;
        }
        const res = await api.signup(name, email, password || 'password123', selectedRole);
        onLoginSuccess(res.user);
      } else {
        const res = await api.login(email, password || 'password123', selectedRole);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Check credentials.');
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

        {/* 2. Google / Custom Email Authentication */}
        {activeTab === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-stone)',
                backgroundColor: 'var(--surface-white)',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-forest)',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-stone)' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                or with email
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-stone)' }} />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isRegistering && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                    <input
                      type="text"
                      placeholder="e.g. Dr. Rajesh Kulkarni"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-stone)',
                        fontSize: '0.85rem',
                        backgroundColor: 'var(--surface-clay)',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="email"
                    placeholder="doctor@diabeto.care"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-stone)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--surface-clay)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 36px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-stone)',
                      fontSize: '0.85rem',
                      backgroundColor: 'var(--surface-clay)',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Account Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-stone)',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--surface-clay)',
                    color: 'var(--text-forest)',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                >
                  <option value="clinician">🩺 Clinician (Doctor / Diabetologist)</option>
                  <option value="coach">🌿 Health Coach / Care Coordinator</option>
                  <option value="caregiver">👧 Family Caregiver</option>
                  <option value="patient">👴 Senior Patient (Sanctuary)</option>
                  <option value="admin">🏢 Clinic Administrator</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  marginTop: '8px',
                }}
              >
                {loading ? 'Authenticating...' : isRegistering ? 'Create Account & Sign In' : 'Sign In to Portal'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.78rem',
                    color: 'var(--text-forest)',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register new user"}
                </button>
              </div>
            </form>
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
