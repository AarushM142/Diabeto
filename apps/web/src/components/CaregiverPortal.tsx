import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, CheckCircle2, Phone, MessageSquare, ShieldCheck, 
  Clock, Pill, Calendar, HeartPulse, AlertCircle, Eye, EyeOff, Lock
} from 'lucide-react';
import { api, type UserRole, type TrendAnalytics, type User } from '../api/client';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import { CareGroupChat } from './CareGroupChat';

interface CaregiverPortalProps {
  language: Language;
  currentRole?: UserRole;
  currentUser?: User;
  onOpenEditProfile?: () => void;
}

export const CaregiverPortal: React.FC<CaregiverPortalProps> = ({ 
  language, 
  currentRole = 'caregiver',
  currentUser,
  onOpenEditProfile,
}) => {
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [allowRawGlucose, setAllowRawGlucose] = useState<boolean>(true);
  const [updatingConsent, setUpdatingConsent] = useState<boolean>(false);
  const [consentSuccessToast, setConsentSuccessToast] = useState<string | null>(null);
  const [connectCode, setConnectCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [linkedElders, setLinkedElders] = useState<{ id: string; name: string; connection_code: string }[]>([]);
  const [selectedElderId, setSelectedElderId] = useState<string>('');

  // Dynamic Caregiver Profile Data
  const caregiverProfile = currentUser?.caregiver_profile;
  const activeElder = linkedElders.find((e) => e.id === selectedElderId) || linkedElders[0];
  const linkedPatientId =
    selectedElderId ||
    (currentUser as (User & { linked_patient_id?: string }) | undefined)?.linked_patient_id?.trim() ||
    activeElder?.id ||
    '';
  const patientName = activeElder?.name || caregiverProfile?.patient_name || 'Your Elder';
  const patientFirstName = patientName.split(' ')[0] || patientName;
  const caregiverName = caregiverProfile?.caregiver_name || currentUser?.name || 'Family Caregiver';
  const relation = caregiverProfile?.relation || 'Primary Caregiver';
  const emergencyPhone = caregiverProfile?.emergency_phone || '+91 8149680369';

  useEffect(() => {
    const loadLinked = async () => {
      if (!currentUser?.id) return;
      try {
        const elders = await api.getCaregiverPatients(currentUser.id);
        const mapped = elders.map((e) => ({ id: e.id, name: e.name, connection_code: e.connection_code }));
        setLinkedElders(mapped);
        if (mapped.length > 0 && !selectedElderId) {
          setSelectedElderId(mapped[0].id);
        }
      } catch (err) {
        console.error('Failed to load linked elders:', err);
      }
    };
    loadLinked();
  }, [currentUser?.id]);

  useEffect(() => {
    const loadTrends = async () => {
      if (!linkedPatientId) {
        setTrends(null);
        return;
      }
      try {
        const data = await api.getTrends(linkedPatientId, 7);
        setTrends(data);
      } catch (err) {
        console.error('Failed to load caregiver trends:', err);
      }
    };
    loadTrends();
  }, [allowRawGlucose, currentRole, linkedPatientId]);

  const handleConnectElder = async () => {
    if (!currentUser?.id || !connectCode.trim()) return;
    setConnecting(true);
    setConnectMsg(null);
    try {
      const res = await api.connectCaregiver(currentUser.id, connectCode.trim());
      setConnectMsg(`✅ ${res.message}`);
      setConnectCode('');
      if (res.patient?.id) {
        const newEntry = {
          id: res.patient.id,
          name: res.patient.name,
          connection_code: res.patient.connection_code,
        };
        setLinkedElders((prev) => {
          const exists = prev.some((e) => e.id === newEntry.id);
          return exists ? prev : [newEntry, ...prev];
        });
        setSelectedElderId(res.patient.id);
      }
      const elders = await api.getCaregiverPatients(currentUser.id);
      if (elders && elders.length > 0) {
        const mapped = elders.map((e) => ({ id: e.id, name: e.name, connection_code: e.connection_code }));
        setLinkedElders(mapped);
      }
    } catch (err: any) {
      setConnectMsg(`❌ ${err.message || 'Failed to link elder'}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleConsent = async () => {
    if (!linkedPatientId) return;
    setUpdatingConsent(true);
    const newFlag = !allowRawGlucose;
    try {
      await api.updatePatientConsent(linkedPatientId, {
        view_raw_glucose: newFlag,
        emergency_escalation: true,
      });
      setAllowRawGlucose(newFlag);
      setConsentSuccessToast(newFlag ? 'Consent granted: Raw numerical values visible' : 'Privacy consent enabled: Qualitative summaries only');
      setTimeout(() => setConsentSuccessToast(null), 4000);
    } catch (err) {
      console.error('Consent update error:', err);
    } finally {
      setUpdatingConsent(false);
    }
  };
  return (
    <div className="portal-container" style={{ maxWidth: '960px' }}>
      {/* Top Banner: Is my parent OK? */}
      <div className="botanical-card responsive-hero-card" style={{ marginBottom: '24px', borderLeft: '6px solid var(--accent-sage)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--accent-sage-subtle)',
              border: '1px solid var(--accent-sage-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <HeartHandshake size={32} color="var(--text-forest)" strokeWidth={1.5} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <h2 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-forest)', margin: 0 }}>
                  {patientFirstName} is doing <em style={{ fontStyle: 'italic', color: 'var(--text-forest)' }}>well</em> today
                </h2>
                <span className="status-pill ok">
                  <span className="status-dot ok" />
                  {t('statusNormal', language)}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'var(--surface-clay)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  color: 'var(--text-forest)',
                  fontWeight: 600,
                  border: '1px solid var(--border-stone)',
                }}>
                  Caregiver: {caregiverName} ({relation})
                </span>
                {onOpenEditProfile && (
                  <button
                    type="button"
                    onClick={onOpenEditProfile}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-sage-dark)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    Edit Link
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {t('caregiverSub', language)}
              </p>
            </div>
          </div>

          {/* Pill Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href={`https://wa.me/${emergencyPhone.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              <MessageSquare size={16} />
              {t('whatsappButton', language)}
            </a>
            <a
              href={`tel:${emergencyPhone}`}
              className="btn btn-secondary"
            >
              <Phone size={16} />
              {t('callButton', language)}
            </a>
          </div>
        </div>
      </div>

      {/* Toast Alert for Consent */}
      {consentSuccessToast && (
        <div className="botanical-callout ok" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="var(--status-ok)" />
          <span>{consentSuccessToast}</span>
        </div>
      )}

      {/* Caretaker → Elder Connection Code Card (same system as doctor linking) */}
      <div className="botanical-card" style={{ padding: '20px 24px', marginBottom: '24px', borderLeft: '6px solid var(--terracotta)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <HeartHandshake size={20} color="var(--terracotta)" />
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-forest)' }}>
            Link Your Elder with a Care Connection Code
          </div>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          Ask your elder to share their code from their Today Screen (e.g. DIA-ABC1234), enter it below, and you will be linked to their care thread, readings, and alerts.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={connectCode}
            onChange={(e) => setConnectCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleConnectElder()}
            placeholder="DIA-XXXXXX"
            style={{
              flex: '1 1 200px', border: '1.5px dashed var(--border-stone)', borderRadius: '10px',
              padding: '10px 14px', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          />
          <button
            type="button"
            onClick={handleConnectElder}
            disabled={connecting || !connectCode.trim()}
            className="btn btn-primary"
            style={{ opacity: connecting || !connectCode.trim() ? 0.5 : 1 }}
          >
            {connecting ? 'Linking…' : '🔗 Link Elder'}
          </button>
        </div>
        {connectMsg && (
          <div style={{ fontSize: '0.82rem', marginTop: '10px', fontWeight: 600 }}>{connectMsg}</div>
        )}
        {linkedElders.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Linked Elders ({linkedElders.length}):
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {linkedElders.map((e) => {
                const isSelected = (activeElder?.id === e.id);
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSelectedElderId(e.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid var(--terracotta)' : '1px solid var(--border-stone)',
                      background: isSelected ? 'var(--terracotta-subtle)' : 'var(--surface-white)',
                      color: isSelected ? 'var(--terracotta)' : 'var(--text-forest)',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{e.name}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.8, fontFamily: 'monospace' }}>({e.connection_code})</span>
                    {isSelected && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DPDP Consent & Access Governance Card */}
      <div className="botanical-card" style={{ padding: '16px 24px', marginBottom: '24px', background: 'var(--surface-clay)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={20} color="var(--accent-sage-dark)" />
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-forest)' }}>
              DPDP Privacy & Patient Relationship Scope
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {allowRawGlucose 
                ? `Consent active: Patient ${patientName} has authorized family members to view exact blood glucose numbers.`
                : 'Privacy-first mode: Qualitative status displayed to prevent caregiver anxiety as per senior preference.'}
            </div>
          </div>
        </div>

        <button
          onClick={handleToggleConsent}
          disabled={updatingConsent}
          className="btn btn-secondary btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 14px' }}
        >
          {allowRawGlucose ? <EyeOff size={14} /> : <Eye size={14} />}
          {allowRawGlucose ? 'Mask to Qualitative (DPDP)' : 'Request Raw Number Access'}
        </button>
      </div>

      {/* Main Status Grid (Botanical 3-Col Layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Latest Sugar Reading */}
        <div className="botanical-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('latestSugar', language)}
            </span>
            <HeartPulse size={20} color="var(--accent-sage)" strokeWidth={1.5} />
          </div>

          {allowRawGlucose ? (
            <div className="font-serif tabular" style={{ fontSize: '2.8rem', fontWeight: 600, color: 'var(--text-forest)', lineHeight: 1 }}>
              {trends?.glycemic_metrics?.mean_glucose ? Math.round(trends.glycemic_metrics.mean_glucose) : 140}{' '}
              <span style={{ fontSize: '1rem', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--text-muted)' }}>mg/dL</span>
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              <div className="font-serif" style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--status-ok)', lineHeight: 1.2 }}>
                {trends?.glycemic_metrics?.clinical_status === 'Optimal' ? 'Normal Fasting' : 'Gentle Steady'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                <Lock size={12} /> Numerical value masked per patient consent
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.85rem', color: 'var(--status-ok)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <CheckCircle2 size={15} />
            <span>{t('targetRange', language)}</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '12px' }}>
            {t('voiceNoteLogged', language)}
          </p>
        </div>

        {/* Medication Compliance */}
        <div className="botanical-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('todayMedication', language)}
            </span>
            <Pill size={20} color="var(--terracotta)" strokeWidth={1.5} />
          </div>

          <div className="font-serif tabular" style={{ fontSize: '2.8rem', fontWeight: 600, color: 'var(--text-forest)', lineHeight: 1 }}>
            {trends?.adherence_metrics?.compliance_score_pct ?? 100}%{' '}
            <span style={{ fontSize: '1rem', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--text-muted)' }}>Taken</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-forest)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <CheckCircle2 size={15} color="var(--status-ok)" />
            <span>{t('medTaken', language)}</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '12px' }}>
            {t('nextMed', language)}
          </p>
        </div>

        {/* Weekly Adherence Streak */}
        <div className="botanical-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {t('streakTitle', language)}
            </span>
            <Calendar size={20} color="var(--accent-sage)" strokeWidth={1.5} />
          </div>

          <div className="font-serif tabular" style={{ fontSize: '2.8rem', fontWeight: 600, color: 'var(--text-forest)', lineHeight: 1 }}>
            {trends?.days ?? 7} <span style={{ fontSize: '1rem', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--text-muted)' }}>{t('streakDays', language)}</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-forest)', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
            <ShieldCheck size={15} color="var(--accent-sage)" />
            <span>{t('noCriticalEpisodes', language)}</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '12px' }}>
            Status: Gentle Steady Care
          </p>
        </div>
      </div>

      {/* Activity Timeline & Safety Contacts */}
      <div className="responsive-grid-12">
        {/* Left: Today's Timeline (7 cols) */}
        <div className="botanical-card responsive-card responsive-col-7">
          <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--accent-sage)" strokeWidth={1.5} />
            {t('careTimeline', language)}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-sage-subtle)', border: '1px solid var(--accent-sage-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={16} color="var(--status-ok)" />
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.925rem', color: 'var(--text-forest)', fontWeight: 600 }}>Morning Fasting Sugar Recorded</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>8:15 AM</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  140 mg/dL logged via WhatsApp Voice Note. Status: Normal.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-clay)', border: '1px solid var(--border-stone)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Pill size={16} color="var(--text-forest)" />
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.925rem', color: 'var(--text-forest)', fontWeight: 600 }}>Morning Dose Confirmed</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>8:32 AM</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Metformin 500mg taken after breakfast.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--terracotta-subtle)', border: '1px solid var(--terracotta-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={16} color="var(--terracotta)" />
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.925rem', color: 'var(--text-forest)', fontWeight: 600 }}>Evening Pill Reminder Scheduled</strong>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>8:00 PM</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Automated WhatsApp reminder will prompt for Glimepiride 1mg.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Care Network & Escalation Contacts (5 cols) */}
        <div className="botanical-card responsive-card responsive-col-5">
          <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--accent-sage)" strokeWidth={1.5} />
            {t('careTeamNetwork', language)}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--surface-clay)', padding: '16px', borderRadius: '18px', border: '1px solid var(--border-stone)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-forest)' }}>Dr. Arvind Mehta</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Attending Diabetologist</div>
                </div>
                <span className="status-pill ok" style={{ background: 'var(--surface-white)' }}>MD Clinician</span>
              </div>
            </div>

            <div style={{ background: 'var(--surface-clay)', padding: '16px', borderRadius: '18px', border: '1px solid var(--border-stone)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-forest)' }}>Sister Kavita R.</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Assigned Care Coach</div>
                </div>
                <span className="status-pill ok">
                  <span className="status-dot ok" />
                  Online
                </span>
              </div>
            </div>

            <div className="botanical-callout danger" style={{ marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-danger)', fontWeight: 600, fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                <span>{t('emergencyProtocol', language)}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-forest)', marginTop: '6px' }}>
                {t('emergencyDesc', language)}
              </p>
              <div style={{ marginTop: '10px', fontWeight: 600, color: 'var(--status-danger)', fontSize: '0.78rem' }}>
                {t('emergencyContacts', language)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Family WhatsApp Window — read-only: only the patient can send messages */}
      <div className="botanical-card responsive-card" style={{ marginTop: '24px', borderLeft: '6px solid #25D366' }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={18} color="#25D366" />
            {patientFirstName}'s WhatsApp Care Chat
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Follow {patientFirstName}'s conversation with the AI companion and the doctor. This window is view-only — only the patient can send messages.
          </p>
        </div>
        <div style={{ height: '640px', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          <CareGroupChat
            language={language}
            currentUser={currentUser || { id: 'caretaker_guest', role: 'caregiver', name: caregiverName }}
            patientId={linkedPatientId}
            patientName={patientName}
          />
        </div>
      </div>
    </div>
  );
};
