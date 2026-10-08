import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, CheckCircle2, Phone, MessageSquare, ShieldCheck, 
  Clock, Pill, Calendar, HeartPulse, AlertCircle, Eye, EyeOff, Lock
} from 'lucide-react';
import { api, type UserRole, type TrendAnalytics } from '../api/client';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';

interface CaregiverPortalProps {
  language: Language;
  currentRole?: UserRole;
}

export const CaregiverPortal: React.FC<CaregiverPortalProps> = ({ language, currentRole = 'caregiver' }) => {
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [allowRawGlucose, setAllowRawGlucose] = useState<boolean>(true);
  const [updatingConsent, setUpdatingConsent] = useState<boolean>(false);
  const [consentSuccessToast, setConsentSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const loadTrends = async () => {
      try {
        const data = await api.getTrends('pt_ramesh_001', 7);
        setTrends(data);
      } catch (err) {
        console.error('Failed to load caregiver trends:', err);
      }
    };
    loadTrends();
  }, [allowRawGlucose, currentRole]);

  const handleToggleConsent = async () => {
    setUpdatingConsent(true);
    const newFlag = !allowRawGlucose;
    try {
      await api.updatePatientConsent('pt_ramesh_001', {
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
                  Ramesh is doing <em style={{ fontStyle: 'italic', color: 'var(--text-forest)' }}>well</em> today
                </h2>
                <span className="status-pill ok">
                  <span className="status-dot ok" />
                  {t('statusNormal', language)}
                </span>
              </div>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {t('caregiverSub', language)}
              </p>
            </div>
          </div>

          {/* Pill Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <a
              href="https://wa.me/918149680369"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary"
            >
              <MessageSquare size={16} />
              {t('whatsappButton', language)}
            </a>
            <a
              href="tel:+918149680369"
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
                ? 'Consent active: Patient Ramesh has authorized family members to view exact blood glucose numbers.'
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
    </div>
  );
};
