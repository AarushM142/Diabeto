import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertOctagon, TrendingUp, 
  Pill, FileText, UserCheck, RefreshCw, Award, Lock, ShieldCheck, History,
  Download, X
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid 
} from 'recharts';
import { api, type TrendAnalytics, type WeeklySummary, type UserRole, type AuditLogItem, type User } from '../api/client';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';

interface ClinicianPortalProps {
  language: Language;
  currentRole: UserRole;
  currentUser?: User;
}

export const ClinicianPortal: React.FC<ClinicianPortalProps> = ({ language, currentRole, currentUser }) => {
  const patientProfile = currentUser?.patient_profile;
  const customPatientName = patientProfile?.name || (currentUser?.role === 'patient' ? currentUser.name : null);

  const patientList = [
    ...(customPatientName ? [{
      id: currentUser?.id || 'pt_custom_001',
      name: customPatientName,
      age: patientProfile?.age || currentUser?.age || 68,
      gender: (patientProfile?.gender?.[0] || currentUser?.gender?.[0] || 'M').toUpperCase(),
      language: patientProfile?.language === 'hi' ? 'Hindi' : patientProfile?.language === 'mr' ? 'Marathi' : 'English',
      phone: patientProfile?.phone || currentUser?.phone || '+91 98000 00001',
      diagnosis: `${patientProfile?.diabetes_type || 'Type 2 Diabetes'} (${patientProfile?.years_with_diabetes || 'Active'})`,
      severity: 'stable',
    }] : []),
    { id: 'pt_ramesh_001', name: 'Ramesh Kulkarni', age: 68, gender: 'M', language: 'Marathi / Hindi', phone: '+91 8149680369', diagnosis: 'Type 2 Diabetes (6 yrs)', severity: 'stable' },
    { id: 'pt_shanti_002', name: 'Shanti Devi', age: 72, gender: 'F', language: 'Hindi', phone: '+91 9800000002', diagnosis: 'Type 2 Diabetes (12 yrs, Mild Neuropathy)', severity: 'watch' },
    { id: 'pt_ananya_003', name: 'Ananya Patil', age: 65, gender: 'F', language: 'Marathi', phone: '+91 9800000003', diagnosis: 'Type 2 Diabetes + Hypo Unawareness', severity: 'critical' },
  ];

  const [selectedPatientId, setSelectedPatientId] = useState(patientList[0].id);
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('Patient stable on current regimen. Continue daily fasting logs and morning Metformin.');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showEhrModal, setShowEhrModal] = useState(false);
  const [ehrSummary, setEhrSummary] = useState<any>(null);
  const [loadingEhr, setLoadingEhr] = useState(false);

  const patient = patientList.find(p => p.id === selectedPatientId) || patientList[0];
  const isAuthorizedDoctor = currentRole === 'clinician' || currentRole === 'admin';

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await api.downloadClinicalPdfReport(selectedPatientId, doctorNotes);
    } catch (err) {
      alert('Failed to generate OPD PDF report: ' + err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenEhrSummary = async () => {
    setLoadingEhr(true);
    setShowEhrModal(true);
    try {
      const data = await api.getEhrSummary(selectedPatientId);
      setEhrSummary(data);
    } catch (err) {
      console.error('Failed to load EHR summary:', err);
    } finally {
      setLoadingEhr(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trendData, summaryData] = await Promise.all([
        api.getTrends(selectedPatientId, 14),
        api.getWeeklySummary(selectedPatientId, 7),
      ]);
      setTrends(trendData);
      setSummary(summaryData);
      if (isAuthorizedDoctor) {
        const logs = await api.getAuditLogs().catch(() => []);
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error('Error loading patient data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPatientId, currentRole]);

  const handleVerifySummary = async () => {
    if (!isAuthorizedDoctor) {
      alert(`Forbidden: Active role '${currentRole.toUpperCase()}' cannot sign off on doctor summaries.`);
      return;
    }
    setVerifying(true);
    try {
      const updated = await api.verifyWeeklySummary(selectedPatientId, doctorNotes);
      setSummary(updated);
      const logs = await api.getAuditLogs().catch(() => []);
      setAuditLogs(logs);
    } catch (err) {
      alert('Verification failed: ' + err);
    } finally {
      setVerifying(false);
    }
  };

  const chartData = trends?.readings.map((r, i) => ({
    name: new Date(r.measured_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` (#${i+1})`,
    glucose: r.mgdl,
    context: r.context,
  })) || [];

  return (
    <div className="portal-container">
      {/* Role Authorization Banner */}
      {!isAuthorizedDoctor && (
        <div className="botanical-callout warn" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={18} color="var(--terracotta)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-forest)' }}>
              Viewing in Read-Only Mode as <strong>{currentRole.toUpperCase()}</strong>. Clinical verification and threshold modifications require <strong>CLINICIAN</strong> authorization.
            </span>
          </div>
          <span className="status-pill warn">Read-Only View</span>
        </div>
      )}

      {/* Patient Triage Roster Selector & Clinical Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="font-serif" style={{ fontSize: '1.25rem', color: 'var(--text-forest)', margin: 0 }}>
          Assigned Clinical Roster (Pune Central)
        </h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenEhrSummary}
            className="btn btn-secondary btn-sm"
            title="View Structured EHR / ABDM Clinical Summary"
          >
            <FileText size={14} />
            EHR Summary
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="btn btn-primary btn-sm"
            title="Generate and download 1-Click verified OPD consultation sheet"
          >
            <Download size={14} />
            {downloadingPdf ? 'Generating PDF...' : 'Download OPD PDF'}
          </button>
          {isAuthorizedDoctor && (
            <button
              onClick={() => setShowAuditLogs(!showAuditLogs)}
              className="btn btn-secondary btn-sm"
            >
              <History size={14} />
              {showAuditLogs ? 'Hide Audit Logs' : `Audit Trail (${auditLogs.length})`}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {patientList.map((p) => {
          const isSelected = p.id === selectedPatientId;
          const isCrit = p.severity === 'critical';
          const isWatch = p.severity === 'watch';

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPatientId(p.id)}
              className="botanical-card"
              style={{
                flex: '1',
                minWidth: '290px',
                padding: '22px',
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--text-forest)' : 'var(--border-stone)',
                borderWidth: isSelected ? '2px' : '1px',
                background: isSelected ? 'var(--surface-clay)' : 'var(--surface-white)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: isSelected ? 'var(--text-forest)' : 'var(--surface-clay)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontFamily: 'var(--font-serif)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-forest)',
                    fontSize: '0.95rem'
                  }}>
                    {p.name.charAt(0)}
                  </div>
                  <h3 className="font-serif" style={{ fontSize: '1.05rem', color: 'var(--text-forest)', margin: 0 }}>
                    {p.name}
                  </h3>
                </div>
                
                <span className={`status-pill ${isCrit ? 'danger' : isWatch ? 'warn' : 'ok'}`}>
                  <span className={`status-dot ${isCrit ? 'danger' : isWatch ? 'warn' : 'ok'}`} />
                  {isCrit ? 'Critical' : isWatch ? 'Watch' : 'Stable'}
                </span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Age {p.age} • {p.gender} • {p.language} • {p.phone}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                {p.diagnosis}
              </p>
            </button>
          );
        })}
      </div>

      {/* Audit Log Drawer */}
      {showAuditLogs && (
        <div className="botanical-card" style={{ padding: '24px', marginBottom: '32px', background: 'var(--surface-clay)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <ShieldCheck size={20} color="var(--accent-sage-dark)" />
            <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
              Clinical Governance & Audit Trail
            </h3>
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {auditLogs.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No audit events recorded yet.</p>
            ) : (
              auditLogs.map((l) => (
                <div key={l.id} style={{ background: 'var(--surface-white)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div>
                    <strong style={{ color: 'var(--text-forest)' }}>{l.action}</strong> by <code>{l.actor_id}</code> ({l.actor_role})
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>Target: {l.target_type} ({l.target_id})</span>
                  </div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>{new Date(l.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw className="status-dot ok" style={{ width: '24px', height: '24px', margin: '0 auto 12px' }} />
          <p>Loading clinical telemetry for {patient.name}...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
          {/* ADA Glycemic Stats Cards (12 cols) */}
          <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
            <div className="botanical-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                <span>{t('timeInRange', language)}</span>
                <TrendingUp size={16} color="var(--status-ok)" />
              </div>
              <div className="font-serif tabular" style={{ fontSize: '2.4rem', fontWeight: 600, color: 'var(--status-ok)', margin: '6px 0 2px' }}>
                {trends?.glycemic_metrics.tir_percentage}%
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Target &gt;70% (ADA Standard)</p>
            </div>

            <div className="botanical-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                <span>{t('timeBelowRange', language)}</span>
                <AlertOctagon size={16} color="var(--status-danger)" />
              </div>
              <div className="font-serif tabular" style={{ fontSize: '2.4rem', fontWeight: 600, color: (trends?.glycemic_metrics.tbr_percentage || 0) > 0 ? 'var(--status-danger)' : 'var(--text-forest)', margin: '6px 0 2px' }}>
                {trends?.glycemic_metrics.tbr_percentage}%
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Target &lt;4% (Hypo Risk)</p>
            </div>

            <div className="botanical-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                <span>{t('meanGlucose', language)}</span>
                <Activity size={16} color="var(--text-forest)" />
              </div>
              <div className="font-serif tabular" style={{ fontSize: '2.4rem', fontWeight: 600, color: 'var(--text-forest)', margin: '6px 0 2px' }}>
                {trends?.glycemic_metrics.mean_glucose} <span style={{ fontSize: '0.9rem', fontFamily: 'var(--font-sans)', fontWeight: 400, color: 'var(--text-muted)' }}>mg/dL</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Median: {trends?.glycemic_metrics.median_glucose} | MAD: {trends?.glycemic_metrics.mad_glucose}</p>
            </div>

            <div className="botanical-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                <span>{t('glucoseVariability', language)}</span>
                <Activity size={16} color="var(--accent-sage)" />
              </div>
              <div className="font-serif tabular" style={{ fontSize: '2.4rem', fontWeight: 600, color: 'var(--text-forest)', margin: '6px 0 2px' }}>
                {trends?.glycemic_metrics.coefficient_of_variation_pct}%
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SD: ±{trends?.glycemic_metrics.standard_deviation} mg/dL</p>
            </div>

            <div className="botanical-card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                <span>{t('medAdherence', language)}</span>
                <Pill size={16} color="var(--terracotta)" />
              </div>
              <div className="font-serif tabular" style={{ fontSize: '2.4rem', fontWeight: 600, color: 'var(--terracotta)', margin: '6px 0 2px' }}>
                {trends?.adherence_metrics.compliance_score_pct}%
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{trends?.adherence_metrics.readings_per_day} daily log avg</p>
            </div>
          </div>

          {/* Interactive Trajectory Chart (8 cols) */}
          <div className="botanical-card responsive-card responsive-col-8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: '1.25rem', color: 'var(--text-forest)', margin: 0 }}>
                  {t('clinicianOverview', language)}
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Target band (70 - 180 mg/dL)
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                <span className="status-pill ok">
                  Target: 70–180
                </span>
                <span style={{ padding: '4px 12px', borderRadius: '9999px', background: 'var(--surface-clay)', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {trends?.readings.length} Points
                </span>
              </div>
            </div>

            <div style={{ height: '340px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone)" />
                  <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis domain={[40, 300]} stroke="var(--text-dim)" fontSize={11} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value as number;
                        const isHypo = val < 70;
                        const isHyper = val > 180;
                        return (
                          <div style={{ background: 'var(--surface-white)', border: '1px solid var(--border-stone)', padding: '12px 16px', borderRadius: '16px', boxShadow: 'var(--shadow-md)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                            <div className="font-serif" style={{ fontSize: '1.3rem', fontWeight: 600, color: isHypo ? 'var(--status-danger)' : isHyper ? 'var(--terracotta)' : 'var(--status-ok)' }}>
                              {val} mg/dL
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Context: {payload[0].payload.context}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={180} stroke="var(--terracotta)" strokeDasharray="4 4" label={{ value: 'Hyper (>180)', fill: 'var(--terracotta)', fontSize: 10 }} />
                  <ReferenceLine y={70} stroke="var(--status-danger)" strokeDasharray="4 4" label={{ value: 'Hypo (<70)', fill: 'var(--status-danger)', fontSize: 10 }} />
                  <Area type="monotone" dataKey="glucose" stroke="var(--status-ok)" strokeWidth={2.5} fill="var(--chart-band)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Clinician Weekly Synthesis Review Gate (4 cols) */}
          <div className="botanical-card responsive-card responsive-col-4" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="var(--accent-sage)" strokeWidth={1.5} />
                <h2 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                  {t('weeklySynthesis', language)}
                </h2>
              </div>
              <span className={`status-pill ${summary?.status === 'verified' ? 'ok' : 'warn'}`}>
                <span className={`status-dot ${summary?.status === 'verified' ? 'ok' : 'warn'}`} />
                {summary?.status === 'verified' ? t('verified', language) : t('unverified', language)}
              </span>
            </div>

            <div style={{ flex: '1', background: 'var(--surface-clay)', padding: '16px', borderRadius: '18px', marginBottom: '16px', border: '1px solid var(--border-stone)' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.03em' }}>
                Clinical Highlights
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: 'var(--text-forest)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {summary?.clinical_highlights.map((h, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: 'var(--accent-sage)', fontWeight: 700 }}>•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-stone)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-forest)' }}>RECOMMENDED ACTION:</span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                  {summary?.doctor_action_recommendation}
                </p>
              </div>
            </div>

            {/* Doctor Sign-Off Form with RBAC Check */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                {t('doctorNotes', language)}
              </label>
              <textarea
                className="textarea-botanical"
                rows={2}
                value={doctorNotes}
                disabled={!isAuthorizedDoctor}
                onChange={(e) => setDoctorNotes(e.target.value)}
                style={{ fontSize: '0.85rem', marginBottom: '14px', resize: 'none', opacity: isAuthorizedDoctor ? 1 : 0.7 }}
              />

              {summary?.status === 'verified' ? (
                <div style={{
                  background: 'var(--status-ok-bg)',
                  border: '1px solid var(--status-ok-border)',
                  padding: '14px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--status-ok)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  <Award size={22} color="var(--status-ok)" />
                  <div>
                    <div>Clinically Verified by {summary.verified_by}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Logged at {new Date(summary.verified_at || '').toLocaleTimeString()}</div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleVerifySummary}
                  disabled={verifying || !isAuthorizedDoctor}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  {isAuthorizedDoctor ? <UserCheck size={16} /> : <Lock size={16} />}
                  {isAuthorizedDoctor 
                    ? (verifying ? 'Signing off...' : t('verifyButton', language))
                    : 'Doctor Sign-off Required'
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Structured EHR & ABDM Summary Modal */}
      {showEhrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(18, 30, 23, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="botanical-card" style={{ maxWidth: '620px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={22} color="var(--accent-sage)" />
                <h3 className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--text-forest)', margin: 0 }}>
                  Structured EHR & ABDM Export
                </h3>
              </div>
              <button
                onClick={() => setShowEhrModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingEhr ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
                <p>Generating structured clinical impression...</p>
              </div>
            ) : ehrSummary ? (
              <div>
                <div style={{ background: 'var(--surface-clay)', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--border-stone)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-forest)' }}>{ehrSummary.patient_name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>ID: {ehrSummary.patient_id}</span>
                    </div>
                    <span className="status-pill ok">
                      Status: {ehrSummary.ehr_export_status?.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
                    FHIR Resource: <code>{ehrSummary.resourceType}</code> • Generated: {new Date(ehrSummary.generated_at).toLocaleString()}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                    ADA Glycemic Performance Indicators
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    <div className="botanical-card" style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-white)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ADA Control Grade</span>
                      <div className="font-serif" style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        marginTop: '4px',
                        color: ehrSummary.ada_glycemic_metrics?.ada_control_grade === 'Optimal'
                          ? 'var(--status-ok)'
                          : ehrSummary.ada_glycemic_metrics?.ada_control_grade === 'Moderate'
                          ? 'var(--terracotta)'
                          : 'var(--status-danger)'
                      }}>
                        {ehrSummary.ada_glycemic_metrics?.ada_control_grade}
                      </div>
                    </div>

                    <div className="botanical-card" style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-white)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mean Glucose</span>
                      <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-forest)', marginTop: '4px' }}>
                        {ehrSummary.ada_glycemic_metrics?.mean_glucose_mgdl} <span style={{ fontSize: '0.75rem' }}>mg/dL</span>
                      </div>
                    </div>

                    <div className="botanical-card" style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-white)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Est. HbA1c</span>
                      <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-forest)', marginTop: '4px' }}>
                        {ehrSummary.ada_glycemic_metrics?.estimated_hba1c_percent || 'N/A'}%
                      </div>
                    </div>

                    <div className="botanical-card" style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-white)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Time-In-Range</span>
                      <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-ok)', marginTop: '4px' }}>
                        {ehrSummary.ada_glycemic_metrics?.time_in_range_percent}%
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Target: &ge;70%</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                  >
                    <Download size={16} />
                    {downloadingPdf ? 'Generating PDF...' : 'Download Full Verified PDF'}
                  </button>
                  <button
                    onClick={() => setShowEhrModal(false)}
                    className="btn btn-secondary"
                    style={{ padding: '12px 20px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No summary data available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
