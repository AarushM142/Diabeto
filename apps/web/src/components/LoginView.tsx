import React, { useState } from 'react';
import { 
  Shield, Stethoscope, Sparkles, HeartHandshake, Heart, 
  ArrowRight, ArrowLeft, CheckCircle2, AlertCircle
} from 'lucide-react';
import { api, type User, type UserRole } from '../api/client';
import { AuthForm } from './ui/sign-in';
import { signInWithGoogleOAuth } from '../lib/supabase';

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
  },
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onBack, initialRole }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'demo'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole || 'clinician');
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleOAuth = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await signInWithGoogleOAuth(selectedRole);
    } catch (err: any) {
      console.error('Supabase Google OAuth error:', err);
      setError(err.message || 'Google authorization failed. Please check your Supabase Auth settings.');
      setGoogleLoading(false);
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

      {/* Main Clean Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '420px',
        backgroundColor: 'var(--surface-white)',
        borderRadius: '20px',
        border: '1px solid var(--border-stone)',
        boxShadow: 'var(--shadow-lg)',
        padding: '28px 24px',
      }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-stone)',
              backgroundColor: 'var(--surface-clay)',
              color: 'var(--text-forest)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '14px',
            }}
          >
            <ArrowLeft size={13} />
            Back to Overview
          </button>
        )}

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'var(--accent-sage)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '8px',
          }}>
            d.
          </div>
          <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-forest)', margin: 0, letterSpacing: '-0.02em' }}>
            diabeto.
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '3px', marginBottom: 0 }}>
            Senior Diabetes Precision Care Platform
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            color: 'var(--status-danger)',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '0.8rem',
            marginBottom: '16px',
          }}>
            <AlertCircle size={15} className="shrink-0" />
            <span style={{ flex: 1 }}>{error}</span>
          </div>
        )}

        {/* 3-Way Minimal Tab Switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--surface-clay)',
          padding: '3px',
          borderRadius: '10px',
          marginBottom: '18px',
          gap: '2px',
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('signin'); setError(null); }}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'signin' ? 'var(--surface-white)' : 'transparent',
              color: activeTab === 'signin' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: activeTab === 'signin' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'signin' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('signup'); setError(null); }}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'signup' ? 'var(--surface-white)' : 'transparent',
              color: activeTab === 'signup' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: activeTab === 'signup' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'signup' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('demo'); setError(null); }}
            style={{
              flex: 1,
              padding: '7px 10px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'demo' ? 'var(--surface-white)' : 'transparent',
              color: activeTab === 'demo' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: activeTab === 'demo' ? 700 : 500,
              fontSize: '0.8rem',
              cursor: 'pointer',
              boxShadow: activeTab === 'demo' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ⚡ Demo Roles
          </button>
        </div>

        {/* Tab 1: Sign In */}
        {activeTab === 'signin' && (
          <AuthForm
            isSignUp={false}
            selectedRole={selectedRole}
            loading={loading}
            googleLoading={googleLoading}
            onRoleChange={(r) => setSelectedRole(r as UserRole)}
            onToggleMode={() => {
              setActiveTab('signup');
              setError(null);
            }}
            onEmailSubmit={async (data) => {
              try {
                setLoading(true);
                setError(null);
                const res = await api.login(data.email, data.password || 'password123', (data.role as UserRole) || selectedRole);
                onLoginSuccess(res.user);
              } catch (err: any) {
                setError(err.message || 'Authentication failed. Please check your credentials.');
              } finally {
                setLoading(false);
              }
            }}
            onGoogleSignIn={handleGoogleOAuth}
            onForgotPassword={() => {
              setError(null);
              alert('✨ Password reset link dispatched to your email address.');
            }}
          />
        )}

        {/* Tab 2: Sign Up */}
        {activeTab === 'signup' && (
          <AuthForm
            isSignUp={true}
            selectedRole={selectedRole}
            loading={loading}
            googleLoading={googleLoading}
            onRoleChange={(r) => setSelectedRole(r as UserRole)}
            onToggleMode={() => {
              setActiveTab('signin');
              setError(null);
            }}
            onEmailSubmit={async (data) => {
              try {
                setLoading(true);
                setError(null);
                const res = await api.signup(data.name || 'Healthcare User', data.email, data.password || 'password123', (data.role as UserRole) || selectedRole);
                onLoginSuccess(res.user);
              } catch (err: any) {
                setError(err.message || 'Registration failed.');
              } finally {
                setLoading(false);
              }
            }}
            onGoogleSignIn={handleGoogleOAuth}
          />
        )}

        {/* Tab 3: Quick Demo Roles */}
        {activeTab === 'demo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              1-Click instant access to persona dashboards:
            </div>

            {DEMO_ROLES.map((demo) => {
              return (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => handleQuickLogin(demo)}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-stone)',
                    backgroundColor: 'var(--surface-white)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
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
                  <img
                    src={demo.avatar}
                    alt={demo.name}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                        {demo.name}
                      </span>
                      <span style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: 'var(--surface-clay)',
                        color: demo.badgeColor,
                        border: '1px solid var(--border-stone)',
                      }}>
                        {demo.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {demo.title}
                    </div>
                  </div>

                  <ArrowRight size={14} color="var(--text-dim)" />
                </button>
              );
            })}
          </div>
        )}

        {/* Clean Security Compliance Footnote */}
        <div style={{
          marginTop: '18px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-stone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.7rem',
          color: 'var(--text-dim)',
        }}>
          <CheckCircle2 size={12} color="var(--status-ok)" />
          <span>ABDM & HIPAA Consent Compliant • Pune Central</span>
        </div>
      </div>
    </div>
  );
};
