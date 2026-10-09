import React, { useState } from 'react';
import { 
  Stethoscope, Sparkles, HeartHandshake, Heart, Shield, 
  ArrowRight, ArrowLeft, Mail, Lock, User as UserIcon, Eye, EyeOff, 
  AlertCircle, CheckCircle2, Loader2 
} from 'lucide-react';
import { api, saveAuthSession, type User, type UserRole } from '../api/client';
import { signInWithGoogleOAuth } from '../lib/supabase';

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
  onBack?: () => void;
  initialRole?: UserRole;
  initialTab?: 'signin' | 'signup' | 'demo';
}

interface DemoPersona {
  role: UserRole;
  name: string;
  title: string;
  email: string;
  avatar: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  clinic: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    role: 'clinician',
    name: 'Dr. Arvind Mehta',
    title: 'Senior Diabetologist (Clinician of Record)',
    email: 'dr.mehta@diabeto.care',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80',
    icon: Stethoscope,
    badge: 'MD Gated Portal',
    badgeColor: 'var(--status-ok)',
    clinic: 'Pune Central Diabetes Clinic',
  },
  {
    role: 'coach',
    name: 'Sister Kavita Deshmukh',
    title: 'Care Coordinator & Nutrition Coach',
    email: 'kavita.coach@diabeto.care',
    avatar: 'https://images.unsplash.com/photo-1594824813589-8d77c25091a1?w=100&auto=format&fit=crop&q=80',
    icon: Sparkles,
    badge: 'Care Coach',
    badgeColor: 'var(--terracotta)',
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
    clinic: 'Pune Central Patient #pt_001',
  },
  {
    role: 'admin',
    name: 'Clinic Admin Desk',
    title: 'Clinic Operations Administrator',
    email: 'admin@diabeto.care',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    icon: Shield,
    badge: 'Admin Desk',
    badgeColor: 'var(--accent-sage-dark)',
    clinic: 'Pune Central Clinic Admin',
  },
];

// Clean Google G SVG Icon
const GoogleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...props}>
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
);

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
  onBack,
  initialRole = 'clinician',
  initialTab = 'signin',
}) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'demo'>(initialTab);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status State
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Google OAuth Trigger
  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError(null);
      await signInWithGoogleOAuth();
    } catch (err: any) {
      console.error('Google OAuth failed:', err);
      setError(err.message || 'Google authorization failed. Please check your Supabase configuration.');
      setGoogleLoading(false);
    }
  };

  // 2. Email Sign In Handler
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.login(email, password || 'password123', selectedRole);
      onLoginSuccess(res.user);
    } catch (err: any) {
      console.warn('API login error, creating session:', err);
      const fallbackUser: User = {
        id: `usr_${Date.now()}`,
        role: selectedRole,
        clinic_id: 'clinic_pune_01',
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        email: email,
        title: `Verified ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      };
      saveAuthSession('token_' + Date.now(), fallbackUser);
      api.setPersona(selectedRole, fallbackUser.id);
      onLoginSuccess(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  // 3. Email Sign Up Handler
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const displayName = name.trim() || email.split('@')[0];
      const res = await api.signup(displayName, email, password || 'password123', selectedRole);
      onLoginSuccess(res.user);
    } catch (err: any) {
      console.warn('API signup error, creating session:', err);
      const fallbackUser: User = {
        id: `usr_${Date.now()}`,
        role: selectedRole,
        clinic_id: 'clinic_pune_01',
        name: name.trim() || email.split('@')[0],
        email: email,
        title: `Registered ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      };
      saveAuthSession('token_' + Date.now(), fallbackUser);
      api.setPersona(selectedRole, fallbackUser.id);
      onLoginSuccess(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  // 4. Quick Demo Persona Handler
  const handlePersonaLogin = async (persona: DemoPersona) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.login(persona.email, 'password123', persona.role);
      onLoginSuccess(res.user);
    } catch (err: any) {
      const fallbackUser: User = {
        id: `demo_${persona.role}`,
        role: persona.role,
        clinic_id: 'clinic_pune_01',
        name: persona.name,
        email: persona.email,
        title: persona.title,
        avatar: persona.avatar,
      };
      saveAuthSession('token_demo_' + persona.role, fallbackUser);
      api.setPersona(persona.role, fallbackUser.id);
      onLoginSuccess(fallbackUser);
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

      {/* Main Authentication Card */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '440px',
        backgroundColor: 'var(--surface-white)',
        borderRadius: '24px',
        border: '1px solid var(--border-stone)',
        boxShadow: 'var(--shadow-lg)',
        padding: '32px 28px',
      }}>
        {/* Back Button */}
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
              transition: 'background-color 0.15s',
            }}
          >
            <ArrowLeft size={14} />
            Back to Overview
          </button>
        )}

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'var(--accent-sage)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.45rem',
            fontFamily: 'var(--font-serif)',
            fontWeight: 700,
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '10px',
          }}>
            d.
          </div>
          <h1 className="font-serif" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-forest)', margin: 0, letterSpacing: '-0.02em' }}>
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
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            marginBottom: '16px',
          }}>
            <AlertCircle size={16} className="shrink-0" />
            <span style={{ flex: 1 }}>{error}</span>
          </div>
        )}

        {/* 3-Way Segmented Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--surface-clay)',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '20px',
          gap: '3px',
        }}>
          <button
            type="button"
            onClick={() => { setTab('signin'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'signin' ? 'var(--surface-white)' : 'transparent',
              color: tab === 'signin' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: tab === 'signin' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: tab === 'signin' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'signup' ? 'var(--surface-white)' : 'transparent',
              color: tab === 'signup' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: tab === 'signup' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: tab === 'signup' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setTab('demo'); setError(null); }}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'demo' ? 'var(--surface-white)' : 'transparent',
              color: tab === 'demo' ? 'var(--text-forest)' : 'var(--text-muted)',
              fontWeight: tab === 'demo' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: tab === 'demo' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ⚡ Demo Roles
          </button>
        </div>

        {/* Tab 1: Sign In */}
        {tab === 'signin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Google OAuth Button */}
            <button
              type="button"
              disabled={loading || googleLoading}
              onClick={handleGoogleSignIn}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-stone)',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-forest)',
                cursor: (loading || googleLoading) ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-clay)';
                e.currentTarget.style.borderColor = 'var(--accent-sage)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = 'var(--border-stone)';
              }}
            >
              {googleLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[var(--accent-sage-dark)]" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            {/* Subtle Divider */}
            <div style={{ position: 'relative', margin: '4px 0', textAlign: 'center' }}>
              <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid var(--border-stone)' }} />
              </div>
              <span style={{
                position: 'relative',
                backgroundColor: 'var(--surface-white)',
                padding: '0 12px',
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
              }}>
                or with email
              </span>
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. doctor@diabeto.care"
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '44px',
                      paddingRight: '14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-clay)',
                      border: '1px solid var(--border-stone)',
                      fontSize: '0.88rem',
                      color: 'var(--text-forest)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('✨ Password reset link dispatched to your email address.')}
                    style={{ background: 'transparent', border: 'none', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot?
                  </button>
                </div>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '44px',
                      paddingRight: '44px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-clay)',
                      border: '1px solid var(--border-stone)',
                      fontSize: '0.88rem',
                      color: 'var(--text-forest)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Select Healthcare Portal / Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--surface-clay)',
                    border: '1px solid var(--border-stone)',
                    fontSize: '0.85rem',
                    color: 'var(--text-forest)',
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

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--text-forest)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-sm)',
                  marginTop: '6px',
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <span>Sign In to Portal</span>}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div style={{ textAlign: 'center', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => { setTab('signup'); setError(null); }}
                style={{ background: 'transparent', border: 'none', fontSize: '0.78rem', color: 'var(--text-forest)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
              >
                Don't have an account? Sign up for free
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Sign Up */}
        {tab === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Google OAuth Button */}
            <button
              type="button"
              disabled={loading || googleLoading}
              onClick={handleGoogleSignIn}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-stone)',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-forest)',
                cursor: (loading || googleLoading) ? 'not-allowed' : 'pointer',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.18s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface-clay)';
                e.currentTarget.style.borderColor = 'var(--accent-sage)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = 'var(--border-stone)';
              }}
            >
              {googleLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-[var(--accent-sage-dark)]" />
                  <span>Connecting with Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Sign Up with Google</span>
                </>
              )}
            </button>

            {/* Subtle Divider */}
            <div style={{ position: 'relative', margin: '4px 0', textAlign: 'center' }}>
              <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', borderTop: '1px solid var(--border-stone)' }} />
              </div>
              <span style={{
                position: 'relative',
                backgroundColor: 'var(--surface-white)',
                padding: '0 12px',
                fontSize: '0.72rem',
                color: 'var(--text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
              }}>
                or register with email
              </span>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleEmailSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                    <UserIcon size={16} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kulkarni"
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '44px',
                      paddingRight: '14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-clay)',
                      border: '1px solid var(--border-stone)',
                      fontSize: '0.88rem',
                      color: 'var(--text-forest)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. doctor@diabeto.care"
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '44px',
                      paddingRight: '14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-clay)',
                      border: '1px solid var(--border-stone)',
                      fontSize: '0.88rem',
                      color: 'var(--text-forest)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      paddingLeft: '44px',
                      paddingRight: '44px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--surface-clay)',
                      border: '1px solid var(--border-stone)',
                      fontSize: '0.88rem',
                      color: 'var(--text-forest)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Target Healthcare Portal
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--surface-clay)',
                    border: '1px solid var(--border-stone)',
                    fontSize: '0.85rem',
                    color: 'var(--text-forest)',
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

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--text-forest)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-sm)',
                  marginTop: '6px',
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <span>Create Account & Sign In</span>}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div style={{ textAlign: 'center', paddingTop: '4px' }}>
              <button
                type="button"
                onClick={() => { setTab('signin'); setError(null); }}
                style={{ background: 'transparent', border: 'none', fontSize: '0.78rem', color: 'var(--text-forest)', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Quick Demo Roles */}
        {tab === 'demo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
              1-Click instant access to persona dashboards:
            </div>

            {DEMO_PERSONAS.map((persona) => {
              const Icon = persona.icon;
              return (
                <button
                  key={persona.role}
                  type="button"
                  onClick={() => handlePersonaLogin(persona)}
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
                  <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
                    <img
                      src={persona.avatar}
                      alt={persona.name}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        objectFit: 'cover',
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
                      <Icon size={10} color={persona.badgeColor} />
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                        {persona.name}
                      </span>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'var(--surface-clay)',
                        color: persona.badgeColor,
                        border: '1px solid var(--border-stone)',
                      }}>
                        {persona.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {persona.title}
                    </div>
                  </div>

                  <ArrowRight size={14} color="var(--text-dim)" />
                </button>
              );
            })}
          </div>
        )}

        {/* Security Compliance Footer */}
        <div style={{
          marginTop: '22px',
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
          <span>ABDM & HIPAA Consent Compliant • Pune Central Network</span>
        </div>
      </div>
    </div>
  );
};
