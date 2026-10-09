import React, { useState } from 'react';
import { 
  Stethoscope, Sparkles, HeartHandshake, Heart, Shield, 
  ArrowRight, ArrowLeft, Check, CheckCircle2, Loader2,
  ChevronRight
} from 'lucide-react';
import type { 
  UserRole, PatientProfile, CaregiverProfile, 
  ClinicianProfile, CoachProfile 
} from '../api/client';

export interface OnboardingProfileData {
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  language?: 'en' | 'hi' | 'mr';
  patient_profile?: PatientProfile;
  caregiver_profile?: CaregiverProfile;
  clinician_profile?: ClinicianProfile;
  coach_profile?: CoachProfile;
}

interface RoleSelectModalProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  onSelectRole: (role: UserRole, profileData?: OnboardingProfileData) => void;
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
  ctaLabel: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    id: 'patient',
    title: 'Senior Patient (Sanctuary)',
    badge: 'Senior 60+',
    badgeColor: 'var(--accent-sage)',
    badgeBg: 'var(--accent-sage-subtle)',
    icon: Heart,
    description: '19px High-Contrast UI, Sarvam AI Hindi & Marathi voice logging, personalized fasting targets, and 1-tap SOS booking.',
    features: ['19px High-Contrast Mode', 'Hindi/Marathi Voice Logging', '1-Tap Family SOS'],
    ctaLabel: 'Set Up Patient Profile',
  },
  {
    id: 'caregiver',
    title: 'Family Caregiver',
    badge: 'Son / Daughter',
    badgeColor: 'var(--text-forest)',
    badgeBg: 'var(--surface-clay)',
    icon: HeartHandshake,
    description: 'Real-time peace of mind, morning fasting checks, meal confirmations, and multi-tier SOS escalation for your loved one.',
    features: ['Daily Fasting Status', 'Multi-Tier SOS Escalations', 'Consent Transparency'],
    ctaLabel: 'Set Up Caregiver Portal',
  },
  {
    id: 'clinician',
    title: 'Clinician / Endocrinologist',
    badge: 'Doctor (MD)',
    badgeColor: 'var(--status-ok)',
    badgeBg: 'var(--status-ok-bg)',
    icon: Stethoscope,
    description: 'EHR Glycemic Dashboard, Clinical Summaries, TIR/TAR/TBR Ambulatory Analytics, OPD Consult Reports & Prescriptions.',
    features: ['Real-time TIR > 70% Analytics', '1-Click Weekly Sign-offs', 'Prescription Management'],
    ctaLabel: 'Set Up Clinician Workspace',
  },
  {
    id: 'coach',
    title: 'Health & Nutrition Coach',
    badge: 'Care Coach',
    badgeColor: 'var(--terracotta)',
    badgeBg: 'var(--surface-clay)',
    icon: Sparkles,
    description: 'Human-in-the-loop WhatsApp nudge approvals, cultural Indian dietary guardrails & festival fasting protocols.',
    features: ['Behavioral Nudge Queue', 'Festival & Fasting Protocols', 'Dietary Guidance'],
    ctaLabel: 'Set Up Coach Workspace',
  },
  {
    id: 'admin',
    title: 'Clinic Administrator',
    badge: 'Ops Desk',
    badgeColor: 'var(--accent-sage-dark)',
    badgeBg: 'var(--surface-clay)',
    icon: Shield,
    description: 'Clinic operations desk, system-wide HIPAA & ABDM audit trails, patient onboarding & staff permissions.',
    features: ['System Audit Trail', 'Role-Based Access Control', 'Clinic Operations'],
    ctaLabel: 'Set Up Admin Desk',
  },
];

const PRESET_MEDICATIONS = [
  'Metformin 500mg (Post-Meals)',
  'Glimepiride 1mg (Morning)',
  'Januvia (Sitagliptin) 50mg',
  'Insulin Glargine (Bedtime)',
  'Telmisartan 40mg (BP)',
  'Atorvastatin 10mg',
];

export const RoleSelectModal: React.FC<RoleSelectModalProps> = ({
  user,
  onSelectRole,
  loading: externalLoading = false,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Common Profile State
  const [fullName, setFullName] = useState(user.name || '');
  const [phone] = useState('+91 98000 00001');

  // Patient Profile State
  const [patientAge, setPatientAge] = useState<number>(68);
  const [patientGender, setPatientGender] = useState<string>('Male');
  const [diabetesType, setDiabetesType] = useState<string>('Type 2 Diabetes');
  const [yearsWithDiabetes] = useState<string>('6 Years');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [selectedMeds, setSelectedMeds] = useState<string[]>([
    'Metformin 500mg (Post-Meals)',
    'Glimepiride 1mg (Morning)',
  ]);
  const [customMed, setCustomMed] = useState('');
  const [caregiverName, setCaregiverName] = useState('Ananya (Daughter)');
  const [caregiverPhone, setCaregiverPhone] = useState('+91 98000 00002');
  const [targetFasting] = useState<number>(130);
  const [targetPostmeal] = useState<number>(180);

  // Caregiver Profile State
  const [caregiverRelation, setCaregiverRelation] = useState('Daughter');
  const [linkedSeniorName, setLinkedSeniorName] = useState('Father (Ramesh)');
  const [linkedSeniorAge, setLinkedSeniorAge] = useState<number>(72);
  const [emergencyPhone, setEmergencyPhone] = useState('+91 98000 00002');

  // Clinician Profile State
  const [doctorTitle, setDoctorTitle] = useState('Dr. ' + (user.name || 'Arvind Mehta') + ', MD');
  const [clinicName, setClinicName] = useState('Pune Central Diabetes Clinic');
  const [specialty, setSpecialty] = useState('Consultant Endocrinologist & Diabetologist');

  // Coach Profile State
  const [coachSpecialty, setCoachSpecialty] = useState('Nutritionist & Behavioral Adherence Coach');

  const toggleMedication = (med: string) => {
    setSelectedMeds(prev => 
      prev.includes(med) ? prev.filter(m => m !== med) : [...prev, med]
    );
  };

  const handleAddCustomMed = () => {
    if (customMed.trim() && !selectedMeds.includes(customMed.trim())) {
      setSelectedMeds(prev => [...prev, customMed.trim()]);
      setCustomMed('');
    }
  };

  const handleProceedToProfile = (role: UserRole) => {
    setSelectedRole(role);
    setStep(2);
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const profileData: OnboardingProfileData = {
      name: fullName.trim() || user.name || 'Verified User',
      phone: phone.trim(),
      language: preferredLanguage,
    };

    if (selectedRole === 'patient') {
      profileData.age = patientAge;
      profileData.gender = patientGender;
      profileData.patient_profile = {
        name: fullName.trim() || user.name,
        age: Number(patientAge) || 68,
        gender: patientGender,
        diabetes_type: diabetesType,
        years_with_diabetes: yearsWithDiabetes,
        language: preferredLanguage,
        phone: phone.trim(),
        caregiver_name: caregiverName.trim(),
        caregiver_phone: caregiverPhone.trim(),
        target_fasting_glucose: Number(targetFasting) || 130,
        target_postmeal_glucose: Number(targetPostmeal) || 180,
        medications: selectedMeds,
      };
    } else if (selectedRole === 'caregiver') {
      profileData.caregiver_profile = {
        caregiver_name: fullName.trim() || user.name,
        relation: caregiverRelation,
        patient_name: linkedSeniorName.trim() || 'Ramesh Kulkarni',
        patient_age: Number(linkedSeniorAge) || 72,
        emergency_phone: emergencyPhone.trim(),
      };
    } else if (selectedRole === 'clinician') {
      profileData.clinician_profile = {
        doctor_name: doctorTitle.trim() || `Dr. ${user.name}`,
        clinic_name: clinicName.trim() || 'Pune Central Diabetes Clinic',
        specialty: specialty.trim(),
      };
    } else if (selectedRole === 'coach') {
      profileData.coach_profile = {
        coach_name: fullName.trim() || user.name,
        specialty: coachSpecialty.trim(),
      };
    }

    onSelectRole(selectedRole, profileData);
  };

  const isSubmittingNow = externalLoading || isSubmitting;

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
        maxWidth: step === 1 ? '720px' : '680px',
        backgroundColor: 'var(--surface-white)',
        borderRadius: '24px',
        border: '1px solid var(--border-stone)',
        boxShadow: 'var(--shadow-lg)',
        padding: '36px 32px',
        transition: 'all 0.3s ease',
      }}>
        {/* User Identity Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
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
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
            Signed in via Google ({user.email})
          </p>

          {/* Progress Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: step === 1 ? 'var(--text-forest)' : 'var(--accent-sage-subtle)',
              color: step === 1 ? '#FFFFFF' : 'var(--text-forest)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              <span>1. Choose Role</span>
            </div>
            <ChevronRight size={14} color="var(--text-dim)" />
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: step === 2 ? 'var(--text-forest)' : 'var(--surface-clay)',
              color: step === 2 ? '#FFFFFF' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}>
              <span>2. Personalize Profile</span>
            </div>
          </div>
        </div>

        {/* STEP 1: Choose Role */}
        {step === 1 && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
            }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                Select how you will be using Diabeto:
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Step 1 of 2
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ROLE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedRole === option.id;

                return (
                  <div
                    key={option.id}
                    onClick={() => handleProceedToProfile(option.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
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
                    {/* Icon Box */}
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? 'var(--surface-white)' : 'var(--surface-clay)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isSelected ? 'var(--text-forest)' : 'var(--text-dim)',
                      flexShrink: 0,
                      border: '1px solid var(--border-stone)',
                    }}>
                      <Icon size={22} />
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-forest)' }}>
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

                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 4px', lineHeight: 1.4 }}>
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

                    {/* Select Action Button */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      backgroundColor: isSelected ? 'var(--text-forest)' : 'var(--surface-clay)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-forest)',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      flexShrink: 0,
                      gap: '6px',
                    }}>
                      <span>Customize</span>
                      <ArrowRight size={14} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Profile Customization Wizard */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-stone)',
            }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-forest)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                <ArrowLeft size={16} />
                <span>Change Role</span>
              </button>

              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--text-forest)',
                backgroundColor: 'var(--surface-clay)',
                padding: '4px 10px',
                borderRadius: '12px',
                textTransform: 'uppercase',
              }}>
                Role: {selectedRole}
              </span>
            </div>

            {/* PATIENT PROFILE FORM */}
            {selectedRole === 'patient' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--accent-sage-subtle)',
                  border: '1px solid var(--accent-sage-border)',
                  fontSize: '0.82rem',
                  color: 'var(--text-forest)',
                  lineHeight: 1.4,
                }}>
                  🌿 <strong>Senior Care Profile Setup:</strong> Set up your name, age, and health preferences so your voice logs, WhatsApp reminders, and clinician records reflect you accurately.
                </div>

                {/* Name & Age Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Your Full Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="e.g. Ramesh Kulkarni"
                        className="input-field"
                        style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.9rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Age (Years)
                    </label>
                    <input
                      type="number"
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      required
                      min={18}
                      max={120}
                      className="input-field"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>

                {/* Gender & Diabetes Diagnosis */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Gender
                    </label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Diabetes Type
                    </label>
                    <select
                      value={diabetesType}
                      onChange={(e) => setDiabetesType(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                    >
                      <option value="Type 2 Diabetes">Type 2 Diabetes (Adult/Senior)</option>
                      <option value="Type 1 Diabetes">Type 1 Diabetes (Insulin Dependent)</option>
                      <option value="Pre-diabetes">Pre-diabetes / Impaired Fasting</option>
                      <option value="Gestational Diabetes">Gestational Diabetes</option>
                    </select>
                  </div>
                </div>

                {/* Preferred Voice / WhatsApp Language */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Preferred Language (Sarvam AI Voice & WhatsApp Messages)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { code: 'en', label: 'English', sub: 'Standard Care' },
                      { code: 'hi', label: 'हिन्दी (Hindi)', sub: 'सरल संवाद' },
                      { code: 'mr', label: 'मराठी (Marathi)', sub: 'पुणेरी संवाद' },
                    ].map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setPreferredLanguage(lang.code as any)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: preferredLanguage === lang.code ? '2px solid var(--text-forest)' : '1px solid var(--border-stone)',
                          backgroundColor: preferredLanguage === lang.code ? 'var(--surface-clay)' : 'var(--surface-white)',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-forest)' }}>{lang.label}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{lang.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Prescription Medications */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Daily Prescription Medications
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {PRESET_MEDICATIONS.map((med) => {
                      const isChecked = selectedMeds.includes(med);
                      return (
                        <button
                          key={med}
                          type="button"
                          onClick={() => toggleMedication(med)}
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: isChecked ? '1px solid var(--accent-sage-dark)' : '1px solid var(--border-stone)',
                            backgroundColor: isChecked ? 'var(--accent-sage-subtle)' : 'var(--surface-clay)',
                            color: isChecked ? 'var(--text-forest)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isChecked && <Check size={12} color="var(--status-ok)" />}
                          <span>{med}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={customMed}
                      onChange={(e) => setCustomMed(e.target.value)}
                      placeholder="Add another medication (e.g. Voglibose 0.2mg)"
                      className="input-field"
                      style={{ flex: 1, height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border-stone)', fontSize: '0.8rem' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomMed();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomMed}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', height: '36px', padding: '0 12px' }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Family Caregiver Details */}
                <div style={{
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-clay)',
                  border: '1px solid var(--border-stone)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                    <HeartHandshake size={16} color="var(--text-forest)" />
                    <span>Family Caregiver SOS Contact</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        Caregiver Name & Relation
                      </label>
                      <input
                        type="text"
                        value={caregiverName}
                        onChange={(e) => setCaregiverName(e.target.value)}
                        placeholder="e.g. Ananya (Daughter)"
                        className="input-field"
                        style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border-stone)', fontSize: '0.82rem' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        Emergency WhatsApp Phone
                      </label>
                      <input
                        type="text"
                        value={caregiverPhone}
                        onChange={(e) => setCaregiverPhone(e.target.value)}
                        placeholder="+91 98000 00002"
                        className="input-field"
                        style={{ width: '100%', height: '36px', padding: '0 10px', borderRadius: '8px', border: '1px solid var(--border-stone)', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CAREGIVER PROFILE FORM */}
            {selectedRole === 'caregiver' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-clay)',
                  border: '1px solid var(--border-stone)',
                  fontSize: '0.82rem',
                  color: 'var(--text-forest)',
                }}>
                  🤝 <strong>Family Caregiver Setup:</strong> Specify your relation and the senior family member you are caring for to receive live peace-of-mind fasting updates and emergency escalation alerts.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="e.g. Ananya Kulkarni"
                      className="input-field"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Your Relation to Senior
                    </label>
                    <select
                      value={caregiverRelation}
                      onChange={(e) => setCaregiverRelation(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                    >
                      <option value="Daughter">Daughter</option>
                      <option value="Son">Son</option>
                      <option value="Spouse">Spouse (Husband/Wife)</option>
                      <option value="Daughter-in-law">Daughter-in-law</option>
                      <option value="Son-in-law">Son-in-law</option>
                      <option value="Grandchild">Grandchild</option>
                      <option value="Guardian">Primary Caregiver / Guardian</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Senior Family Member's Name
                    </label>
                    <input
                      type="text"
                      value={linkedSeniorName}
                      onChange={(e) => setLinkedSeniorName(e.target.value)}
                      required
                      placeholder="e.g. Ramesh Kulkarni (Father)"
                      className="input-field"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Senior's Age
                    </label>
                    <input
                      type="number"
                      value={linkedSeniorAge}
                      onChange={(e) => setLinkedSeniorAge(Number(e.target.value))}
                      required
                      min={50}
                      max={120}
                      className="input-field"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Your WhatsApp Phone for Critical Alerts & SOS
                  </label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    required
                    placeholder="+91 98000 00002"
                    className="input-field"
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            )}

            {/* CLINICIAN PROFILE FORM */}
            {selectedRole === 'clinician' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--status-ok-bg)',
                  border: '1px solid var(--border-stone)',
                  fontSize: '0.82rem',
                  color: 'var(--status-ok)',
                }}>
                  🩺 <strong>Clinician EHR Workspace:</strong> Access the Ambulatory Glucose Profile (AGP), Time in Range (TIR &gt; 70%), weekly sign-offs, and clinical decision support.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Doctor Full Name & Title
                  </label>
                  <input
                    type="text"
                    value={doctorTitle}
                    onChange={(e) => setDoctorTitle(e.target.value)}
                    required
                    placeholder="e.g. Dr. Arvind Mehta, MD"
                    className="input-field"
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Clinic / Hospital
                    </label>
                    <input
                      type="text"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      required
                      placeholder="e.g. Pune Central Diabetes Clinic"
                      className="input-field"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                      Specialty
                    </label>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      required
                      placeholder="e.g. Endocrinologist"
                      className="input-field"
                      style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* COACH PROFILE FORM */}
            {selectedRole === 'coach' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-clay)',
                  border: '1px solid var(--border-stone)',
                  fontSize: '0.82rem',
                  color: 'var(--terracotta)',
                }}>
                  ✨ <strong>Care Coordinator & Coach Desk:</strong> Manage human-in-the-loop WhatsApp nudge approvals, fasting protocols, and Indian meal nutrition guardrails.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Coach Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Sister Kavita Deshmukh"
                    className="input-field"
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Care Specialization
                  </label>
                  <input
                    type="text"
                    value={coachSpecialty}
                    onChange={(e) => setCoachSpecialty(e.target.value)}
                    required
                    placeholder="e.g. Nutritionist & Behavioral Adherence Coach"
                    className="input-field"
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            )}

            {/* ADMIN PROFILE FORM */}
            {selectedRole === 'admin' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--surface-clay)',
                  border: '1px solid var(--border-stone)',
                  fontSize: '0.82rem',
                  color: 'var(--text-forest)',
                }}>
                  🛡️ <strong>Clinic Operations Desk:</strong> HIPAA audit logs, role-based access governance, and clinic operational infrastructure.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Administrator Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="e.g. Clinic Ops Admin"
                    className="input-field"
                    style={{ width: '100%', height: '42px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                  />
                </div>
              </div>
            )}

            {/* Submit & Enter Button */}
            <button
              type="submit"
              disabled={isSubmittingNow}
              style={{
                width: '100%',
                height: '48px',
                marginTop: '20px',
                borderRadius: '14px',
                backgroundColor: 'var(--text-forest)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.95rem',
                border: 'none',
                cursor: isSubmittingNow ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-md)',
                transition: 'all 0.2s ease',
              }}
            >
              {isSubmittingNow ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Launching {ROLE_OPTIONS.find(r => r.id === selectedRole)?.title.split('/')[0].trim()}...</span>
                </>
              ) : (
                <>
                  <span>Launch Personalized {ROLE_OPTIONS.find(r => r.id === selectedRole)?.title.split('/')[0].trim()}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

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
