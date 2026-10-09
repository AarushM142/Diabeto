import React, { useState } from 'react';
import { 
  X, Check, Save, User as UserIcon,
  CheckCircle2, Loader2
} from 'lucide-react';
import { api, type User } from '../api/client';

interface EditProfileModalProps {
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedUser: User) => void;
}

const PRESET_MEDICATIONS = [
  'Metformin 500mg (Post-Meals)',
  'Glimepiride 1mg (Morning)',
  'Januvia (Sitagliptin) 50mg',
  'Insulin Glargine (Bedtime)',
  'Telmisartan 40mg (BP)',
  'Atorvastatin 10mg',
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  if (!isOpen) return null;

  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Common State
  const [fullName, setFullName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '+91 98000 00001');

  // Patient Profile State
  const [patientAge, setPatientAge] = useState<number>(currentUser.patient_profile?.age || currentUser.age || 68);
  const [patientGender, setPatientGender] = useState<string>(currentUser.patient_profile?.gender || currentUser.gender || 'Male');
  const [diabetesType, setDiabetesType] = useState<string>(currentUser.patient_profile?.diabetes_type || 'Type 2 Diabetes');
  const [yearsWithDiabetes] = useState<string>(currentUser.patient_profile?.years_with_diabetes || '6 Years');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'hi' | 'mr'>(currentUser.patient_profile?.language || currentUser.language || 'en');
  const [selectedMeds, setSelectedMeds] = useState<string[]>(currentUser.patient_profile?.medications || [
    'Metformin 500mg (Post-Meals)',
    'Glimepiride 1mg (Morning)',
  ]);
  const [customMed, setCustomMed] = useState('');
  const [caregiverName, setCaregiverName] = useState(currentUser.patient_profile?.caregiver_name || 'Ananya (Daughter)');
  const [caregiverPhone, setCaregiverPhone] = useState(currentUser.patient_profile?.caregiver_phone || '+91 98000 00002');
  const [targetFasting] = useState<number>(currentUser.patient_profile?.target_fasting_glucose || 130);
  const [targetPostmeal] = useState<number>(currentUser.patient_profile?.target_postmeal_glucose || 180);

  // Caregiver Profile State
  const [caregiverRelation, setCaregiverRelation] = useState(currentUser.caregiver_profile?.relation || 'Daughter');
  const [linkedSeniorName, setLinkedSeniorName] = useState(currentUser.caregiver_profile?.patient_name || 'Father (Ramesh)');
  const [linkedSeniorAge, setLinkedSeniorAge] = useState<number>(currentUser.caregiver_profile?.patient_age || 72);
  const [emergencyPhone, setEmergencyPhone] = useState(currentUser.caregiver_profile?.emergency_phone || '+91 98000 00002');

  // Clinician Profile State
  const [doctorTitle, setDoctorTitle] = useState(currentUser.clinician_profile?.doctor_name || currentUser.name || 'Dr. Arvind Mehta, MD');
  const [clinicName, setClinicName] = useState(currentUser.clinician_profile?.clinic_name || currentUser.clinic_id || 'Pune Central Diabetes Clinic');
  const [specialty] = useState(currentUser.clinician_profile?.specialty || 'Consultant Endocrinologist & Diabetologist');

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const updates: Partial<User> = {
      name: fullName.trim() || currentUser.name,
      phone: phone.trim(),
      language: preferredLanguage,
      age: patientAge,
      gender: patientGender,
    };

    if (currentUser.role === 'patient') {
      updates.patient_profile = {
        name: fullName.trim() || currentUser.name,
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
    } else if (currentUser.role === 'caregiver') {
      updates.caregiver_profile = {
        caregiver_name: fullName.trim() || currentUser.name,
        relation: caregiverRelation,
        patient_name: linkedSeniorName.trim() || 'Ramesh Kulkarni',
        patient_age: Number(linkedSeniorAge) || 72,
        emergency_phone: emergencyPhone.trim(),
      };
    } else if (currentUser.role === 'clinician') {
      updates.clinician_profile = {
        doctor_name: doctorTitle.trim() || currentUser.name,
        clinic_name: clinicName.trim() || 'Pune Central Diabetes Clinic',
        specialty: specialty.trim(),
      };
    }

    try {
      const updatedUser = await api.updateUserProfile(updates);
      onProfileUpdated(updatedUser);
      setSuccessToast(true);
      setTimeout(() => {
        setSuccessToast(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      backgroundColor: 'rgba(45, 58, 49, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: 'var(--surface-white)',
        borderRadius: '24px',
        border: '1px solid var(--border-stone)',
        boxShadow: 'var(--shadow-lg)',
        width: '100%',
        maxWidth: '640px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-stone)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--surface-clay)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent-sage-subtle)',
              border: '1px solid var(--border-stone)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-forest)',
            }}>
              <UserIcon size={18} />
            </div>
            <div>
              <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-forest)', margin: 0 }}>
                Manage Personalized Care Profile
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Role: <strong style={{ textTransform: 'uppercase' }}>{currentUser.role}</strong> • Email: {currentUser.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              color: 'var(--text-dim)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {successToast && (
            <div className="botanical-callout ok" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px' }}>
              <CheckCircle2 size={16} color="var(--status-ok)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Profile preferences successfully updated!</span>
            </div>
          )}

          {/* Name & Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                Your Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="input-field"
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-field"
                style={{ width: '100%', height: '40px', padding: '0 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
              />
            </div>
          </div>

          {/* Patient Role Specifics */}
          {currentUser.role === 'patient' && (
            <>
              {/* Age, Gender, Diabetes Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '12px' }}>
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
                    style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Gender
                  </label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', height: '40px', padding: '0 8px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Diabetes Diagnosis
                  </label>
                  <select
                    value={diabetesType}
                    onChange={(e) => setDiabetesType(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', height: '40px', padding: '0 8px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                  >
                    <option value="Type 2 Diabetes">Type 2 Diabetes (Senior)</option>
                    <option value="Type 1 Diabetes">Type 1 Diabetes</option>
                    <option value="Pre-diabetes">Pre-diabetes</option>
                    <option value="Gestational Diabetes">Gestational Diabetes</option>
                  </select>
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                  Care & Sarvam Voice Language
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { code: 'en', label: 'English' },
                    { code: 'hi', label: 'हिन्दी (Hindi)' },
                    { code: 'mr', label: 'मराठी (Marathi)' },
                  ].map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setPreferredLanguage(lang.code as any)}
                      style={{
                        padding: '6px',
                        borderRadius: '8px',
                        border: preferredLanguage === lang.code ? '2px solid var(--text-forest)' : '1px solid var(--border-stone)',
                        backgroundColor: preferredLanguage === lang.code ? 'var(--surface-clay)' : 'var(--surface-white)',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--text-forest)',
                        cursor: 'pointer',
                      }}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Medications */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                  Prescribed Daily Medications
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
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '16px',
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
                    placeholder="Add custom medicine"
                    className="input-field"
                    style={{ flex: 1, height: '34px', padding: '0 10px', borderRadius: '6px', border: '1px solid var(--border-stone)', fontSize: '0.8rem' }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMed}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', height: '34px', padding: '0 10px' }}
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
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '6px' }}>
                  Family Caregiver Emergency Contact
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    value={caregiverName}
                    onChange={(e) => setCaregiverName(e.target.value)}
                    placeholder="Caregiver Name (Relation)"
                    className="input-field"
                    style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--border-stone)', fontSize: '0.82rem' }}
                  />
                  <input
                    type="text"
                    value={caregiverPhone}
                    onChange={(e) => setCaregiverPhone(e.target.value)}
                    placeholder="Caregiver WhatsApp Phone"
                    className="input-field"
                    style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--border-stone)', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Caregiver Role Specifics */}
          {currentUser.role === 'caregiver' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Your Relation to Senior
                  </label>
                  <select
                    value={caregiverRelation}
                    onChange={(e) => setCaregiverRelation(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                  >
                    <option value="Daughter">Daughter</option>
                    <option value="Son">Son</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Guardian">Primary Caregiver / Guardian</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Emergency WhatsApp Alert Phone
                  </label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    required
                    className="input-field"
                    style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Elderly Patient's Name
                  </label>
                  <input
                    type="text"
                    value={linkedSeniorName}
                    onChange={(e) => setLinkedSeniorName(e.target.value)}
                    required
                    className="input-field"
                    style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                    Patient Age
                  </label>
                  <input
                    type="number"
                    value={linkedSeniorAge}
                    onChange={(e) => setLinkedSeniorAge(Number(e.target.value))}
                    required
                    className="input-field"
                    style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Clinician Role Specifics */}
          {currentUser.role === 'clinician' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                  Doctor Title
                </label>
                <input
                  type="text"
                  value={doctorTitle}
                  onChange={(e) => setDoctorTitle(e.target.value)}
                  required
                  className="input-field"
                  style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '4px' }}>
                  Clinic Name
                </label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  required
                  className="input-field"
                  style={{ width: '100%', height: '40px', padding: '0 10px', borderRadius: '10px', border: '1px solid var(--border-stone)', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '12px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-stone)',
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', fontSize: '0.85rem' }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
