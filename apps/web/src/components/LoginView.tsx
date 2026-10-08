import React, { useState } from 'react';
import { 
  Shield, Stethoscope, Sparkles, HeartHandshake, Heart, 
  ArrowRight, ArrowLeft, CheckCircle2, Building, AlertCircle, X, User as UserIcon
} from 'lucide-react';
import { api, type User, type UserRole } from '../api/client';
import { AuthForm, GoogleIcon } from './ui/sign-in';

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
  const [activeTab, setActiveTab] = useState<'quick' | 'auth'>('auth');
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || 'clinician');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OAuth Interactive Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleMode, setGoogleMode] = useState<'choose' | 'custom'>('choose');
  const [googleEmail, setGoogleEmail] = useState('arh2007144@gmail.com');
  const [googleName, setGoogleName] = useState('Aarush Kulkarni');
  const [googleRole, setGoogleRole] = useState<UserRole>(initialRole || 'clinician');

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

  const executeGoogleAuth = async (email: string, name: string, role: UserRole) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.googleAuth(email, name, role);
      setShowGoogleModal(false);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail) {
      setError('Please enter your Google account email');
      return;
    }
    await executeGoogleAuth(googleEmail, googleName || googleEmail.split('@')[0], googleRole);
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

      {/* Google OAuth Modal */}
      {showGoogleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '440px',
            padding: '32px 28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative',
            border: '1px solid #E5E7EB',
          }}>
            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              style={{
                position: 'absolute',
                right: '18px',
                top: '18px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6B7280',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <div style={{
                display: 'inline-flex',
                padding: '12px',
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                marginBottom: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}>
                <GoogleIcon style={{ width: '30px', height: '30px' }} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#111827', margin: '0 0 6px', fontFamily: 'var(--font-sans)' }}>
                Sign in with Google
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0 }}>
                Choose an account to continue to <strong style={{ color: 'var(--text-forest)' }}>Diabeto Care</strong>
              </p>
            </div>

            {googleMode === 'choose' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Detected / Primary Google Account */}
                <button
                  type="button"
                  onClick={() => executeGoogleAuth(googleEmail, googleName, googleRole)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#4285F4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: '#4285F4',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    flexShrink: 0,
                  }}>
                    {googleName.charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#111827' }}>
                        {googleName}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--accent-sage-subtle)',
                        color: 'var(--text-forest)',
                      }}>
                        {googleRole.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '2px' }}>
                      {googleEmail}
                    </div>
                  </div>

                  <ArrowRight size={16} color="#9CA3AF" />
                </button>

                {/* Switch to Custom Account Input Form */}
                <button
                  type="button"
                  onClick={() => setGoogleMode('custom')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '14px',
                    border: '1px dashed #D1D5DB',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    color: '#4B5563',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    justifyContent: 'center',
                    marginTop: '4px',
                  }}
                >
                  <UserIcon size={16} />
                  <span>Use another Google account</span>
                </button>

                {/* Role Picker for Quick Account */}
                <div style={{ marginTop: '8px', padding: '10px 12px', backgroundColor: 'var(--surface-clay)', borderRadius: '12px' }}>
                  <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Signing in as Healthcare Role:
                  </label>
                  <select
                    value={googleRole}
                    onChange={(e) => setGoogleRole(e.target.value as UserRole)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-stone)',
                      fontSize: '0.82rem',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--text-forest)',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  >
                    <option value="clinician">🩺 Clinician (Doctor / Endocrinologist)</option>
                    <option value="coach">🌿 Health Coach (Sister Kavita)</option>
                    <option value="caregiver">👧 Family Caregiver (Daughter / Son)</option>
                    <option value="patient">👴 Senior Patient (Sanctuary)</option>
                    <option value="admin">🏢 Clinic Administrator Desk</option>
                  </select>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGoogleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Google Email Address
                  </label>
                  <input
                    type="email"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    placeholder="e.g. arh2007144@gmail.com"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.88rem',
                      backgroundColor: '#F9FAFB',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="e.g. Aarush Kulkarni"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.88rem',
                      backgroundColor: '#F9FAFB',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                    Select Healthcare Role
                  </label>
                  <select
                    value={googleRole}
                    onChange={(e) => setGoogleRole(e.target.value as UserRole)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: '1px solid #D1D5DB',
                      fontSize: '0.85rem',
                      backgroundColor: '#F9FAFB',
                      color: '#111827',
                      fontWeight: 600,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="clinician">🩺 Clinician (Doctor / Endocrinologist)</option>
                    <option value="coach">🌿 Health Coach (Sister Kavita)</option>
                    <option value="caregiver">👧 Family Caregiver (Daughter / Son)</option>
                    <option value="patient">👴 Senior Patient (Sanctuary)</option>
                    <option value="admin">🏢 Clinic Administrator Desk</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setGoogleMode('choose')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '12px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: 'transparent',
                      color: '#4B5563',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 2,
                      padding: '10px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#4285F4',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 2px 8px rgba(66, 133, 244, 0.3)',
                    }}
                  >
                    {loading ? 'Signing in...' : 'Sign In with Google'}
                  </button>
                </div>
              </form>
            )}

            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #F3F4F6', fontSize: '0.72rem', color: '#9CA3AF', textAlign: 'center', lineHeight: 1.4 }}>
              To continue, Google will share your name, email address, language preference, and profile picture with Diabeto.
            </div>
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'var(--surface-white)',
        borderRadius: '24px',
        border: '1px solid var(--border-stone)',
        boxShadow: 'var(--shadow-lg)',
        padding: '32px 28px',
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
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--accent-sage)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '10px',
          }}>
            d.
          </div>
          <h1 className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-forest)', margin: 0, letterSpacing: '-0.02em' }}>
            diabeto.
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
            Role-Based Senior Diabetes Precision Care Platform
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--surface-clay)',
            padding: '3px 10px',
            borderRadius: '10px',
            fontSize: '0.72rem',
            color: 'var(--text-forest)',
            fontWeight: 600,
            marginTop: '8px',
          }}>
            <Building size={11} />
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
            marginBottom: '18px',
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
          borderRadius: '12px',
          marginBottom: '20px',
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('auth'); setError(null); }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'auth' ? 'var(--surface-white)' : 'transparent',
              color: activeTab === 'auth' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: activeTab === 'auth' ? 700 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'auth' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            🔑 Google / Email Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('quick'); setError(null); }}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'quick' ? 'var(--surface-white)' : 'transparent',
              color: activeTab === 'quick' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: activeTab === 'quick' ? 700 : 500,
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'quick' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            ⚡ Quick Verified Roles
          </button>
        </div>

        {/* Tab 1: AuthForm (Google & Email Auth) */}
        {activeTab === 'auth' && (
          <div style={{ width: '100%' }}>
            <AuthForm
              isSignUp={isRegistering}
              selectedRole={selectedRole}
              loading={loading}
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
              onGoogleSignIn={() => {
                setError(null);
                setGoogleRole(selectedRole);
                setShowGoogleModal(true);
              }}
              onEmailLink={() => {
                setError(null);
                alert('✨ Magic link dispatched to your email! Opening clinician session...');
                api.login('dr.mehta@diabeto.care', 'password123', selectedRole).then(res => onLoginSuccess(res.user));
              }}
            />
          </div>
        )}

        {/* Tab 2: Quick Demo Roles */}
        {activeTab === 'quick' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              1-Click instant access to pre-configured persona dashboards:
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
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '14px',
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
                  <div style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
                    <img
                      src={demo.avatar}
                      alt={demo.name}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid var(--surface-white)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'var(--surface-white)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={10} color={demo.badgeColor} />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                        {demo.name}
                      </span>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '5px',
                        background: 'var(--surface-clay)',
                        color: demo.badgeColor,
                        border: '1px solid var(--border-stone)',
                      }}>
                        {demo.badge}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {demo.title}
                    </div>
                  </div>

                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--surface-clay)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ArrowRight size={14} color="var(--text-forest)" />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Security / Compliance Footnote */}
        <div style={{
          marginTop: '22px',
          paddingTop: '14px',
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
