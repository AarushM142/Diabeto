import React from 'react';
import { motion } from 'framer-motion';
import { PulseFitHero } from './ui/pulse-fit-hero';
import type { UserRole } from '../api/client';
import { 
  Heart, Sparkles, ArrowRight, Activity, Phone, CheckCircle2, Mic
} from 'lucide-react';

interface LandingHeroProps {
  onOpenLogin: (preferredRole?: UserRole) => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onOpenLogin }) => {
  const ladderSteps = [
    {
      id: 'step-patient',
      stepNumber: '01',
      badge: 'SENIOR SANCTUARY',
      badgeColor: 'var(--accent-sage)',
      title: '19px High-Contrast Comfort with Marathi & Hindi Voice AI',
      description: 'Built specifically for Indian elders with diabetes, tremors, or low digital literacy. Speak naturally in Hindi, Marathi, or English—Sarvam AI and Gemini transcribe spoken audio, extract glucose readings, and log fasting and post-meal records automatically. 1-tap SOS alerts dispatch immediate escalations to family and clinic staff.',
      highlights: [
        'Large 19px High-Contrast Senior Typography',
        'Marathi & Hindi Voice-to-Glucose Logging',
        '1-Tap SOS Emergency Dispatch to Family',
        'Spoken Audio Summaries & Reminders',
      ],
      ctaLabel: 'Explore Senior Sanctuary',
      role: 'patient' as UserRole,
      isReversed: false,
      renderVisual: () => (
        <div style={{
          background: 'var(--surface-white)',
          borderRadius: '24px',
          border: '1px solid var(--border-stone)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                <Heart size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-forest)' }}>Ramesh Kulkarni (72)</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Senior Sanctuary Mode</div>
              </div>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--status-ok)', background: 'var(--status-ok-bg)', padding: '3px 8px', borderRadius: '6px' }}>
              LIVE SENSOR
            </span>
          </div>

          {/* Big Glucose Metric */}
          <div style={{ background: 'var(--surface-clay)', padding: '18px', borderRadius: '16px', marginBottom: '16px', textAlign: 'center', border: '1px solid var(--border-stone)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Fasting Blood Sugar</div>
            <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--text-forest)', fontFamily: 'var(--font-serif)', lineHeight: 1.1, margin: '4px 0' }}>
              118 <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>mg/dL</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--status-ok)', fontWeight: 700 }}>
              ● Optimal Control (Target: 80-130)
            </div>
          </div>

          {/* Voice Prompt Simulation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--accent-sage-subtle)', border: '1px solid var(--accent-sage-border)', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-sage)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', flexShrink: 0 }}>
              <Mic size={16} className="animate-pulse" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)' }}>"माझा आजचा शुगर ११८ आहे"</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Sarvam AI: Marathi Speech-to-Text Verified</div>
            </div>
          </div>

          {/* SOS Trigger Pill */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => onOpenLogin('patient')}
              style={{ flex: 1, background: 'var(--status-danger-bg)', border: '1px solid var(--status-danger-border)', color: 'var(--status-danger)', padding: '10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <Phone size={14} />
              1-Tap Family SOS
            </button>
            <button
              type="button"
              onClick={() => onOpenLogin('patient')}
              style={{ flex: 1, background: 'var(--text-forest)', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Log New Reading
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'step-clinician',
      stepNumber: '02',
      badge: 'ENDOCRINOLOGIST & CLINICIAN EHR',
      badgeColor: 'var(--status-ok)',
      title: 'Continuous Glycemic TIR Analytics & Instant Summary Verification',
      description: 'Eliminate guesswork from handwritten diaries. Diabeto continuously computes Time-in-Range (TIR > 70%), Time-Above-Range (TAR), and Time-Below-Range (TBR) while flagging nocturnal hypoglycemia risk. Doctors verify 7-day comprehensive clinical summaries and sign off digitally with one click.',
      highlights: [
        'Time-in-Range (TIR / TAR / TBR) Real-Time Metrics',
        'Automated Hypoglycemia & Glycemic Variability Scoring',
        '1-Click MD Clinical Summary Verification & Prescriptions',
        'HIPAA & ABDM Immutable System Audit Trail',
      ],
      ctaLabel: 'Open Clinician EHR',
      role: 'clinician' as UserRole,
      isReversed: true,
      renderVisual: () => (
        <div style={{
          background: 'var(--surface-white)',
          borderRadius: '24px',
          border: '1px solid var(--border-stone)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}>
          {/* Doctor Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80"
                alt="Dr. Mehta"
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-forest)' }}>Dr. Arvind Mehta</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Clinician of Record • Pune Central</div>
              </div>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-forest)', background: 'var(--surface-clay)', padding: '3px 8px', borderRadius: '6px' }}>
              EHR DESK
            </span>
          </div>

          {/* Glycemic Analytics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--surface-clay)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)' }}>TIR (In-Range)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-ok)', fontFamily: 'var(--font-serif)' }}>82.4%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Target: &gt;70%</div>
            </div>
            <div style={{ background: 'var(--surface-clay)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)' }}>TAR (High)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--terracotta)', fontFamily: 'var(--font-serif)' }}>14.2%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Target: &lt;25%</div>
            </div>
            <div style={{ background: 'var(--surface-clay)', padding: '12px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)' }}>TBR (Low)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--status-ok)', fontFamily: 'var(--font-serif)' }}>3.4%</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Target: &lt;4%</div>
            </div>
          </div>

          {/* Verified Summary Stamp */}
          <div style={{ background: 'var(--accent-sage-subtle)', border: '1px solid var(--accent-sage-border)', padding: '12px 16px', borderRadius: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} color="var(--status-ok)" />
                7-Day Weekly Summary Verified
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-sage-dark)' }}>APPROVED</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              "Stable fasting trends. Continue Metformin 500mg OD. Next follow-up in 14 days."
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenLogin('clinician')}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '0.82rem', fontWeight: 700, borderRadius: '12px' }}
          >
            Review Full Clinical Dashboard
          </button>
        </div>
      ),
    },
    {
      id: 'step-coach',
      stepNumber: '03',
      badge: 'COACH COPILOT & HUMAN-IN-THE-LOOP',
      badgeColor: 'var(--terracotta)',
      title: 'AI-Assisted Lifestyle & Dietary Nudge Approval Queue',
      description: 'Sister Kavita and clinical nutritionists review AI-drafted micro-interventions before they are sent to the senior patient. Empathetic guidance tailored for regional Indian cuisine (dal, jowar bhakri, festive sweets, fasting days) meets strict doctor-supervised safety guardrails.',
      highlights: [
        'Human-in-the-Loop WhatsApp Nudge Approval Desk',
        'Regional Indian Cuisine & Fasting Safeguards',
        'Medication & Hydration Behavioral Micro-Interventions',
        'Doctor-Supervised Guardrails on Every Suggestion',
      ],
      ctaLabel: 'View Coach Copilot',
      role: 'coach' as UserRole,
      isReversed: false,
      renderVisual: () => (
        <div style={{
          background: 'var(--surface-white)',
          borderRadius: '24px',
          border: '1px solid var(--border-stone)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}>
          {/* Coach Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="https://images.unsplash.com/photo-1594824813589-8d77c25091a1?w=100&auto=format&fit=crop&q=80"
                alt="Sister Kavita"
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-forest)' }}>Sister Kavita Deshmukh</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Nutrition Coach & Care Coordinator</div>
              </div>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--terracotta)', background: 'var(--surface-clay)', padding: '3px 8px', borderRadius: '6px' }}>
              NUDGE QUEUE (1)
            </span>
          </div>

          {/* Proposed Nudge Card */}
          <div style={{ background: 'var(--surface-clay)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-stone)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-forest)' }}>WhatsApp Nudge Recommendation</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--status-ok)', background: 'var(--surface-white)', padding: '2px 6px', borderRadius: '6px' }}>94% CONFIDENCE</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-forest)', lineHeight: 1.45, fontStyle: 'italic', background: 'var(--surface-white)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', marginBottom: '8px' }}>
              "रमेशजी, दुपारच्या जेवणानंतर १० मिनिटे चालायला विसरू नका. ज्वारीची भाकरी आणि पालक भाजी उत्तम पर्याय आहे!"
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
              Context: Postprandial glucose spike prevention • Regional Marathi
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onOpenLogin('coach')}
              style={{ flex: 1, background: 'var(--status-ok-bg)', border: '1px solid var(--status-ok-border)', color: 'var(--status-ok)', padding: '10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >
              ✓ Approve & Send
            </button>
            <button
              type="button"
              onClick={() => onOpenLogin('coach')}
              style={{ flex: 1, background: 'var(--surface-clay)', border: '1px solid var(--border-stone)', color: 'var(--text-forest)', padding: '10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Edit Message
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'step-caregiver',
      stepNumber: '04',
      badge: 'FAMILY CAREGIVER SAFETY',
      badgeColor: 'var(--text-forest)',
      title: 'Real-Time Peace of Mind for Sons & Daughters Everywhere',
      description: 'Caregivers like Ananya receive automated daily check-in statuses, meal confirmations, and immediate alerts if their parent’s glucose drops below safety limits. Direct 1-tap WhatsApp and phone access connects caregivers to Dr. Mehta and Sister Kavita instantly.',
      highlights: [
        'Daily Peace-of-Mind Status Badge (Fasting & Meals)',
        'Tier-2 & Tier-3 Emergency Escalation Protocols',
        'Direct 1-Tap Bridge to Doctor & Nutrition Coach',
        'Granular Consent & Raw Glucose Transparency',
      ],
      ctaLabel: 'Open Family Portal',
      role: 'caregiver' as UserRole,
      isReversed: true,
      renderVisual: () => (
        <div style={{
          background: 'var(--surface-white)',
          borderRadius: '24px',
          border: '1px solid var(--border-stone)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}>
          {/* Caregiver Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80"
                alt="Ananya Kulkarni"
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-forest)' }}>Ananya Kulkarni</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Daughter & Primary Caregiver</div>
              </div>
            </div>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--status-ok)', background: 'var(--status-ok-bg)', padding: '3px 8px', borderRadius: '6px' }}>
              ALL SAFE TODAY
            </span>
          </div>

          {/* Peace of Mind Status Box */}
          <div style={{ background: 'var(--accent-sage-subtle)', border: '1px solid var(--accent-sage-border)', padding: '16px', borderRadius: '16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <CheckCircle2 size={16} color="var(--status-ok)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-forest)' }}>Papa is Stable & Active</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Fasting blood sugar: <strong>118 mg/dL</strong> (8:15 AM). Morning Metformin confirmed. Breakfast logged.
            </div>
          </div>

          {/* Quick Doctor / Coach Reachout */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <a
              href="tel:+918149680369"
              style={{ flex: 1, textDecoration: 'none', background: 'var(--surface-clay)', border: '1px solid var(--border-stone)', padding: '10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Phone size={13} color="var(--text-forest)" />
              Call Dr. Mehta
            </a>
            <button
              type="button"
              onClick={() => onOpenLogin('caregiver')}
              style={{ flex: 1, background: 'var(--surface-clay)', border: '1px solid var(--border-stone)', padding: '10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <Sparkles size={13} color="var(--terracotta)" />
              Sister Kavita
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenLogin('caregiver')}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', fontSize: '0.82rem', fontWeight: 700, borderRadius: '12px' }}
          >
            Open Family Caregiver Portal
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: 'var(--bg-alabaster)' }}>
      {/* 1. Main PulseFit Hero Banner */}
      <PulseFitHero
        logo="diabeto."
        navigation={[
          { label: 'Senior Sanctuary', onClick: () => onOpenLogin('patient') },
          { label: 'Clinician EHR', onClick: () => onOpenLogin('clinician') },
          { label: 'Coach Copilot', onClick: () => onOpenLogin('coach') },
          { label: 'Family Safety', onClick: () => onOpenLogin('caregiver') },
          { label: 'Admin Desk', onClick: () => onOpenLogin('admin') },
        ]}
        loginButton={{
          label: 'Log In',
          onClick: () => onOpenLogin(),
        }}
        signupButton={{
          label: 'Sign Up / Portals',
          onClick: () => onOpenLogin(),
        }}
        title="Personalized Senior Diabetes Care. Anywhere. Anytime."
        subtitle="AI-guided glycemic safety, proactive risk escalation, and multilingual WhatsApp companion designed for Indian seniors, endocrinologists, and family caregivers."
        primaryAction={{
          label: 'Launch Care Portal',
          onClick: () => onOpenLogin(),
        }}
        secondaryAction={{
          label: 'Quick Verified Roles',
          onClick: () => onOpenLogin(),
        }}
        disclaimer="*Verified by endocrinologists • ABDM & HIPAA consent compliant • Pune Central Clinic"
        socialProof={{
          avatars: [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
          ],
          text: 'Active across Pune & Maharashtra Clinics • 99.4% Glycemic Safety Accuracy',
        }}
        programs={[
          {
            image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=600&auto=format&fit=crop&q=80',
            category: 'SENIOR SANCTUARY',
            title: '19px High-Contrast Sanctuary with Hindi & Marathi Voice Logging & 1-Tap SOS',
            onClick: () => onOpenLogin('patient'),
          },
          {
            image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
            category: 'DOCTOR / CLINICIAN',
            title: 'Continuous Glycemic TIR/TAR/TBR Analytics, Prescriptions & Weekly Summary Sign-off',
            onClick: () => onOpenLogin('clinician'),
          },
          {
            image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80',
            category: 'HEALTH COACH',
            title: 'WhatsApp Nudge Approvals, Personalized Indian Nutrition & Behavioral Coaching',
            onClick: () => onOpenLogin('coach'),
          },
          {
            image: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=600&auto=format&fit=crop&q=80',
            category: 'FAMILY CAREGIVER',
            title: 'Real-Time Peace-of-Mind Escalations, Meal Status & Consent Transparency',
            onClick: () => onOpenLogin('caregiver'),
          },
          {
            image: 'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=600&auto=format&fit=crop&q=80',
            category: 'INTELLIGENT SIMULATOR',
            title: 'Multilingual Conversational WhatsApp Bot with Sarvam AI & Gemini Intelligence',
            onClick: () => onOpenLogin('clinician'),
          },
        ]}
      />

      {/* 2. Zigzag Ladder Feature Showcase Section */}
      <section style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '90px 32px 100px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', marginBottom: '80px', maxWidth: '780px', margin: '0 auto 80px' }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'var(--accent-sage-subtle)',
            border: '1px solid var(--accent-sage-border)',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-forest)',
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            <Activity size={14} color="var(--status-ok)" />
            <span>Four-Tier Connected Senior Ecosystem</span>
          </div>

          <h2 className="font-serif" style={{ fontSize: 'clamp(2.1rem, 4.5vw, 3.2rem)', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.18 }}>
            Engineered for Indian Elders.<br />Trusted by Endocrinologists.
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.65, marginTop: '16px', marginBottom: 0 }}>
            Diabeto unites the senior patient, their primary family caregiver, their health coach, and their clinician into an uninterrupted glycemic safety loop.
          </p>
        </motion.div>

        {/* Alternating Zigzag Ladder Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '90px' }}>
          {ladderSteps.map((step) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 45 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '50px',
                alignItems: 'center',
              }}
            >
              {/* Text Side (if not reversed: Left; if reversed: Right on desktop) */}
              <div style={{ order: step.isReversed ? 2 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: '#FFFFFF',
                    background: 'var(--text-forest)',
                    padding: '3px 8px',
                    borderRadius: '8px',
                  }}>
                    {step.stepNumber}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: step.badgeColor,
                    background: 'var(--surface-clay)',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-stone)',
                  }}>
                    {step.badge}
                  </span>
                </div>

                <h3 className="font-serif" style={{ fontSize: 'clamp(1.7rem, 3.2vw, 2.3rem)', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.02em', lineHeight: 1.25, margin: '0 0 16px' }}>
                  {step.title}
                </h3>

                <p style={{ fontSize: '0.98rem', color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 24px' }}>
                  {step.description}
                </p>

                {/* Feature Bullet Pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
                  {step.highlights.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: 'var(--text-forest)', fontWeight: 600 }}>
                      <CheckCircle2 size={16} color="var(--status-ok)" className="shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenLogin(step.role)}
                  className="transition-all hover:scale-105 cursor-pointer"
                  style={{
                    background: 'var(--text-forest)',
                    color: '#FFFFFF',
                    padding: '12px 26px',
                    borderRadius: '30px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    boxShadow: 'var(--shadow-md)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{step.ctaLabel}</span>
                  <ArrowRight size={16} color="#FFFFFF" />
                </button>
              </div>

              {/* Visual Preview Side (if not reversed: Right; if reversed: Left on desktop) */}
              <div style={{ order: step.isReversed ? 1 : 2 }}>
                {step.renderVisual()}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 3. Bottom Call To Action Banner */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          style={{
            marginTop: '110px',
            background: 'linear-gradient(135deg, #2D3A31 0%, #1E2820 100%)',
            borderRadius: '28px',
            padding: '50px 40px',
            color: '#FFFFFF',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '300px',
            background: 'radial-gradient(ellipse, rgba(140, 154, 132, 0.3) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 10, maxWidth: '640px', margin: '0 auto' }}>
            <h3 className="font-serif" style={{ fontSize: 'clamp(1.8rem, 3.8vw, 2.6rem)', fontWeight: 700, margin: '0 0 14px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Transform diabetes care for your family today.
            </h3>
            <p style={{ fontSize: '1rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6, margin: '0 0 28px' }}>
              Experience clinical safety, multilingual WhatsApp coaching, and peace of mind built specifically for elders.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => onOpenLogin()}
                className="transition-all hover:scale-105 cursor-pointer"
                style={{
                  background: '#FFFFFF',
                  color: 'var(--text-forest)',
                  padding: '14px 30px',
                  borderRadius: '30px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                }}
              >
                Launch Care Portal
              </button>
              <button
                type="button"
                onClick={() => onOpenLogin()}
                className="transition-all hover:scale-105 cursor-pointer"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  padding: '14px 26px',
                  borderRadius: '30px',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  backdropFilter: 'blur(8px)',
                }}
              >
                Explore 1-Click Role Logins
              </button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
};
