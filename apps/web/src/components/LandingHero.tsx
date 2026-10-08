import React from 'react';
import { motion } from 'framer-motion';
import { PulseFitHero } from './ui/pulse-fit-hero';
import type { UserRole } from '../api/client';
import { 
  Heart, Stethoscope, Sparkles, HeartHandshake, ArrowRight, Activity, CheckCircle2
} from 'lucide-react';

interface LandingHeroProps {
  onOpenLogin: (preferredRole?: UserRole) => void;
}

interface LadderStep {
  id: string;
  stepNumber: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  icon: React.ElementType;
  title: string;
  paragraph: string;
  highlights: string[];
  statsChip: {
    label: string;
    value: string;
    sub: string;
    statusColor: string;
  };
  ctaLabel: string;
  role: UserRole;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onOpenLogin }) => {
  const ladderSteps: LadderStep[] = [
    {
      id: 'step-patient',
      stepNumber: '01',
      badge: 'SENIOR SANCTUARY',
      badgeColor: 'var(--accent-sage-dark)',
      badgeBg: 'var(--accent-sage-subtle)',
      icon: Heart,
      title: '19px High-Contrast Sanctuary with Marathi & Hindi Voice AI',
      paragraph: 'Built specifically for seniors with arthritis, low vision, and tremors. Speak naturally in Marathi, Hindi, or English—Sarvam AI and Gemini transcribe readings and log fasting vs. post-meal records automatically.',
      highlights: [
        '19px High-Contrast Senior UI & tactile action buttons',
        'Sarvam AI Marathi & Hindi speech-to-text voice logging',
        '1-Tap SOS instant family emergency alert dispatch',
      ],
      statsChip: {
        label: 'Live Senior Sensor',
        value: '118 mg/dL',
        sub: 'Optimal Control • Fasting Sugar Verified',
        statusColor: 'var(--status-ok)',
      },
      ctaLabel: 'Explore Senior Sanctuary',
      role: 'patient',
    },
    {
      id: 'step-clinician',
      stepNumber: '02',
      badge: 'CLINICIAN & ENDOCRINOLOGIST EHR',
      badgeColor: 'var(--status-ok)',
      badgeBg: 'var(--status-ok-bg)',
      icon: Stethoscope,
      title: 'Continuous Glycemic TIR Analytics & 1-Click Verification',
      paragraph: 'Converts daily readings into clinical Time-in-Range (TIR > 70%), TAR, and TBR metrics with automated nocturnal hypoglycemia alerts and 1-click MD verification.',
      highlights: [
        'Real-time TIR, TAR, and TBR ambulatory analytics',
        'Nocturnal hypoglycemia early warning risk detection',
        '1-Click authenticated 7-day clinical sign-off',
      ],
      statsChip: {
        label: 'Glycemic Time-in-Range',
        value: '82.4% TIR',
        sub: 'Above Target (>70%) • Hypo Risk: Low (3.4%)',
        statusColor: 'var(--status-ok)',
      },
      ctaLabel: 'Open Clinician EHR Desk',
      role: 'clinician',
    },
    {
      id: 'step-coach',
      stepNumber: '03',
      badge: 'COACH COPILOT & BEHAVIORAL PROTOCOLS',
      badgeColor: 'var(--terracotta)',
      badgeBg: 'var(--surface-clay)',
      icon: Sparkles,
      title: 'Human-in-the-Loop Nudges with Regional Indian Nutrition',
      paragraph: 'AI-assisted behavioral nudge queue adapted to regional Indian diets, festival feasts, and fasting rituals—fully verified by care coordinators before delivery.',
      highlights: [
        'Human-in-the-loop WhatsApp nudge approval queue',
        'Cultural Indian diet & festival fasting guardrails',
        'Doctor-supervised adherence & medication tracking',
      ],
      statsChip: {
        label: 'Coach Copilot Queue',
        value: '94% Match',
        sub: 'Regional Diet Prompt • Doctor Supervised',
        statusColor: 'var(--terracotta)',
      },
      ctaLabel: 'View Coach Copilot Desk',
      role: 'coach',
    },
    {
      id: 'step-caregiver',
      stepNumber: '04',
      badge: 'FAMILY CAREGIVER SAFETY & PEACE OF MIND',
      badgeColor: 'var(--text-forest)',
      badgeBg: 'var(--surface-clay)',
      icon: HeartHandshake,
      title: 'Real-Time Peace of Mind for Sons & Daughters',
      paragraph: 'Live peace-of-mind dashboard tracking morning fasting checks and meals. Automated multi-tier escalation dispatches voice, SMS, and WhatsApp alerts if risks arise.',
      highlights: [
        'Daily peace-of-mind fasting & meal status checks',
        'Multi-tier automated hypo/hyper risk escalation',
        'Direct 1-tap connection to clinician and care coach',
      ],
      statsChip: {
        label: 'Family Safety Status',
        value: 'All Safe Today',
        sub: 'Fasting: 118 mg/dL • Breakfast Confirmed • 0 Active Risks',
        statusColor: 'var(--status-ok)',
      },
      ctaLabel: 'Open Family Safety Portal',
      role: 'caregiver',
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

      {/* 2. Staggered Zigzag Ladder Story Showcase */}
      <section style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '70px 24px 90px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 60px' }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '20px',
            background: 'var(--accent-sage-subtle)',
            border: '1px solid var(--accent-sage-border)',
            fontSize: '0.76rem',
            fontWeight: 700,
            color: 'var(--text-forest)',
            marginBottom: '14px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            <Activity size={13} color="var(--status-ok)" />
            <span>The Connected Senior Care Ladder</span>
          </div>

          <h2 className="font-serif" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.18 }}>
            Engineered for Indian Elders.<br />Trusted by Endocrinologists.
          </h2>

          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '14px', marginBottom: 0 }}>
            From senior voice interaction at home to real-time clinician sign-offs, coach diet nudges, and family peace of mind.
          </p>
        </motion.div>

        {/* Vertical Center Track Spine */}
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            className="hidden lg:block"
            style={{
              position: 'absolute',
              top: '30px',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '2px',
              background: 'linear-gradient(180deg, rgba(140, 154, 132, 0.15) 0%, rgba(45, 58, 49, 0.3) 50%, rgba(140, 154, 132, 0.15) 100%)',
              borderRight: '2px dashed rgba(45, 58, 49, 0.25)',
              zIndex: 1,
            }}
          />

          {/* Zigzag Staggered Blocks: Block 1 Left, Block 2 Right, Block 3 Left, Block 4 Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {ladderSteps.map((step, index) => {
              const isLeft = index % 2 === 0;
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    justifyContent: isLeft ? 'flex-start' : 'flex-end',
                    width: '100%',
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  {/* Central Node Indicator (Desktop) */}
                  <div
                    className="hidden lg:flex"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '36px',
                      transform: 'translate(-50%, -50%)',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--surface-white)',
                      border: '3px solid var(--text-forest)',
                      boxShadow: '0 0 12px rgba(45, 58, 49, 0.2)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 3,
                    }}
                  >
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: step.badgeColor }} />
                  </div>

                  {/* Staggered Narrative Card (Occupies Left or Right) */}
                  <motion.div
                    initial={{ opacity: 0, x: isLeft ? -40 : 40, y: 25 }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{
                      width: '100%',
                      maxWidth: '540px',
                      backgroundColor: 'var(--surface-white)',
                      borderRadius: '22px',
                      border: '1px solid var(--border-stone)',
                      padding: '28px 26px',
                      boxShadow: 'var(--shadow-md)',
                      position: 'relative',
                    }}
                  >
                    {/* Step Badge & Role Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: '#FFFFFF',
                          background: 'var(--text-forest)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}>
                          {step.stepNumber}
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: step.badgeColor,
                          background: step.badgeBg,
                          padding: '3px 9px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-stone)',
                        }}>
                          {step.badge}
                        </span>
                      </div>

                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--surface-clay)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-forest)',
                      }}>
                        <Icon size={16} />
                      </div>
                    </div>

                    {/* Headline */}
                    <h3 className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.02em', lineHeight: 1.25, margin: '0 0 12px' }}>
                      {step.title}
                    </h3>

                    {/* Crisp Narrative Paragraph */}
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
                      {step.paragraph}
                    </p>

                    {/* Feature Checkmark Highlights */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 14px', background: 'var(--surface-clay)', borderRadius: '14px', border: '1px solid var(--border-stone)', marginBottom: '16px' }}>
                      {step.highlights.map((item, hIdx) => (
                        <div key={hIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-forest)', fontWeight: 600, lineHeight: 1.3 }}>
                          <CheckCircle2 size={15} color="var(--status-ok)" className="shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Live Status Telemetry Chip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--accent-sage-subtle)', borderRadius: '12px', border: '1px solid var(--accent-sage-border)', marginBottom: '18px' }}>
                      <div>
                        <div style={{ fontSize: '0.64rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{step.statsChip.label}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-forest)', fontWeight: 600 }}>{step.statsChip.sub}</div>
                      </div>
                      <span style={{ fontSize: '0.98rem', fontWeight: 800, color: step.statsChip.statusColor, fontFamily: 'var(--font-serif)' }}>
                        {step.statsChip.value}
                      </span>
                    </div>

                    {/* Direct Portal CTA Button */}
                    <button
                      type="button"
                      onClick={() => onOpenLogin(step.role)}
                      className="transition-all hover:scale-105 cursor-pointer"
                      style={{
                        width: '100%',
                        background: 'var(--text-forest)',
                        color: '#FFFFFF',
                        padding: '11px 20px',
                        borderRadius: '14px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>{step.ctaLabel}</span>
                      <ArrowRight size={15} color="#FFFFFF" />
                    </button>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Bottom Call To Action Banner */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          style={{
            marginTop: '120px',
            background: 'linear-gradient(135deg, #2D3A31 0%, #1E2820 100%)',
            borderRadius: '28px',
            padding: '54px 40px',
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
              Experience clinical safety, multilingual WhatsApp coaching, and peace of mind built specifically for Indian elders.
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
