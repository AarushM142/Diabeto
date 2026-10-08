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
  paragraphs: string[];
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
      paragraphs: [
        'Traditional healthcare apps are built for tech-savvy millennials, leaving Indian elders overwhelmed by tiny fonts, complex navigation menus, and constant English tech jargon. Diabeto Senior Sanctuary reimagines digital diabetes care from the ground up with a 19px high-contrast tactile design created specifically for seniors with arthritis, low vision, and tremors.',
        'Seniors simply speak naturally in Marathi, Hindi, or English—whether via WhatsApp voice note or our one-touch microphone. Sarvam AI and Gemini transcribe the speech, parse the glucose reading (e.g. "माझा आजचा शुगर ११८ आहे"), and automatically classify fasting versus post-meal readings without requiring typing. An instant 1-tap SOS button dispatches urgent location-pinned alerts directly to family members and emergency responders.',
      ],
      highlights: [
        '19px High-Contrast Senior Typography with tactile buttons',
        'Sarvam AI Marathi & Hindi speech-to-text voice logging',
        'Automatic fasting vs. postprandial contextual categorization',
        '1-Tap SOS emergency family broadcast with GPS coordination',
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
      title: 'Continuous Glycemic TIR Analytics & 1-Click Verification Sign-Off',
      paragraphs: [
        'Endocrinologists frequently struggle with incomplete or inaccurate handwritten paper diaries. Diabeto transforms fragmented glucose measurements into clinical-grade glycemic analytics, automatically calculating Time-in-Range (TIR > 70%), Time-Above-Range (TAR), and Time-Below-Range (TBR) alongside glycemic variability (CV%) and Mean Absolute Deviation (MAD).',
        'Our clinical decision support engine proactively flags nocturnal hypoglycemia risks and multi-day glycemic instability before they turn critical. At the end of each week, clinicians receive an AI-prepared 7-day clinical summary with longitudinal highlights, allowing Dr. Mehta to review, modify dosage recommendations, and apply an authenticated digital verification signature in under 30 seconds.',
      ],
      highlights: [
        'Real-time Time-in-Range (TIR / TAR / TBR) ambulatory analytics',
        'Nocturnal hypoglycemia early warning risk detection',
        'Automated 7-day comprehensive summary preparation',
        'One-click clinician digital signature with immutable audit logs',
      ],
      statsChip: {
        label: 'Glycemic Time-in-Range',
        value: '82.4% TIR',
        sub: 'Above Clinical Target (>70%) • Hypo Risk: Low (3.4%)',
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
      title: 'Human-in-the-Loop Nudge Queue with Regional Indian Nutrition',
      paragraphs: [
        'Generic lifestyle advice fails when it ignores Indian cultural realities—family celebrations, festival sweets (modak, gulab jamun), fasting days (Ekadashi, Navratri), and carbohydrate-rich staples like jowar bhakri, dal, and rice. Diabeto Coach Copilot equips care coordinators like Sister Kavita with an AI-assisted behavioral intervention engine.',
        'Before any nudges or diet corrections reach the patient’s WhatsApp, they pass through a human-in-the-loop review queue. Coaches review recommendations with 90%+ confidence ratings, customize them to match family meal patterns, and verify that all nutritional guidance adheres to the prescribing doctor’s clinical constraints.',
      ],
      highlights: [
        'Human-in-the-loop WhatsApp nudge approval workspace',
        'Cultural Indian cuisine & festival fasting guardrails',
        'Personalized post-meal micro-intervention timing (10-min walks)',
        'Doctor-supervised adherence and medication tracking',
      ],
      statsChip: {
        label: 'Coach Copilot Queue',
        value: '94% Match',
        sub: 'Marathi Regional Diet Prompt • Doctor Supervised',
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
      title: 'Real-Time Peace of Mind for Sons & Daughters Everywhere',
      paragraphs: [
        'For adult children living away from aging parents, the chronic anxiety of a sudden hypoglycemic event or missed medication is constant. The Diabeto Family Portal provides daughter Ananya with a continuous peace-of-mind status dashboard showing whether morning fasting sugar was taken, breakfast was logged, and medications were confirmed.',
        'If a critical glucose threshold is crossed, Diabeto triggers a multi-tier escalation: Tier 1 alerts the senior via voice reminder; Tier 2 notifies the caregiver with WhatsApp and SMS telemetry; Tier 3 escalates to the clinic and emergency contacts. Granular consent controls guarantee full transparency while respecting parental independence.',
      ],
      highlights: [
        'Live Peace-of-Mind Status Badge (Fasting sugar & meals confirmed)',
        'Multi-Tier automated escalation protocols for hypo/hyper risks',
        'Direct 1-tap bridge to Dr. Mehta and Sister Kavita',
        'Granular privacy and health data consent management',
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
        padding: '100px 32px 120px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', marginBottom: '90px', maxWidth: '820px', margin: '0 auto 90px' }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'var(--accent-sage-subtle)',
            border: '1px solid var(--accent-sage-border)',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'var(--text-forest)',
            marginBottom: '18px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            <Activity size={14} color="var(--status-ok)" />
            <span>The Connected Senior Care Ladder</span>
          </div>

          <h2 className="font-serif" style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.16 }}>
            Engineered for Indian Elders.<br />Trusted by Endocrinologists.
          </h2>

          <p style={{ fontSize: '1.08rem', color: 'var(--text-muted)', lineHeight: 1.65, marginTop: '18px', marginBottom: 0 }}>
            Follow the journey: from senior-friendly voice interaction at home to real-time doctor sign-offs, coach diet nudges, and family peace of mind.
          </p>
        </motion.div>

        {/* Vertical Center Track Spine */}
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            className="hidden lg:block"
            style={{
              position: 'absolute',
              top: '40px',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '2px',
              background: 'linear-gradient(180deg, rgba(140, 154, 132, 0.15) 0%, rgba(45, 58, 49, 0.3) 50%, rgba(140, 154, 132, 0.15) 100%)',
              borderRight: '2px dashed rgba(45, 58, 49, 0.25)',
              zIndex: 1,
            }}
          />

          {/* Zigzag Staggered Blocks: Block 1 Left, Block 2 Right, Block 3 Left, Block 4 Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
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
                      top: '44px',
                      transform: 'translate(-50%, -50%)',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--surface-white)',
                      border: '3px solid var(--text-forest)',
                      boxShadow: '0 0 14px rgba(45, 58, 49, 0.25)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 3,
                    }}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step.badgeColor }} />
                  </div>

                  {/* Staggered Narrative Card (Occupies Left or Right) */}
                  <motion.div
                    initial={{ opacity: 0, x: isLeft ? -50 : 50, y: 35 }}
                    whileInView={{ opacity: 1, x: 0, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      width: '100%',
                      maxWidth: '560px',
                      backgroundColor: 'var(--surface-white)',
                      borderRadius: '26px',
                      border: '1px solid var(--border-stone)',
                      padding: '38px 34px',
                      boxShadow: 'var(--shadow-lg)',
                      position: 'relative',
                    }}
                  >
                    {/* Step Badge & Role Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: '#FFFFFF',
                          background: 'var(--text-forest)',
                          padding: '4px 9px',
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
                          background: step.badgeBg,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-stone)',
                        }}>
                          {step.badge}
                        </span>
                      </div>

                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'var(--surface-clay)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-forest)',
                      }}>
                        <Icon size={18} />
                      </div>
                    </div>

                    {/* Headline */}
                    <h3 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-forest)', letterSpacing: '-0.02em', lineHeight: 1.25, margin: '0 0 18px' }}>
                      {step.title}
                    </h3>

                    {/* Rich Narrative Paragraphs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                      {step.paragraphs.map((p, pIdx) => (
                        <p key={pIdx} style={{ fontSize: '0.94rem', color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                          {p}
                        </p>
                      ))}
                    </div>

                    {/* Feature Checkmark Highlights */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'var(--surface-clay)', borderRadius: '16px', border: '1px solid var(--border-stone)', marginBottom: '22px' }}>
                      {step.highlights.map((item, hIdx) => (
                        <div key={hIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.84rem', color: 'var(--text-forest)', fontWeight: 600, lineHeight: 1.4 }}>
                          <CheckCircle2 size={16} color="var(--status-ok)" className="shrink-0" style={{ marginTop: '2px' }} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>

                    {/* Live Status Telemetry Chip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--accent-sage-subtle)', borderRadius: '14px', border: '1px solid var(--accent-sage-border)', marginBottom: '24px' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{step.statsChip.label}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-forest)', fontWeight: 600 }}>{step.statsChip.sub}</div>
                      </div>
                      <span style={{ fontSize: '1.05rem', fontWeight: 800, color: step.statsChip.statusColor, fontFamily: 'var(--font-serif)' }}>
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
                        padding: '13px 24px',
                        borderRadius: '16px',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        boxShadow: 'var(--shadow-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      <span>{step.ctaLabel}</span>
                      <ArrowRight size={16} color="#FFFFFF" />
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
