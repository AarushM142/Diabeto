import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertOctagon, TrendingUp, 
  Pill, FileText, UserCheck, RefreshCw, Award
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid 
} from 'recharts';
import { api } from '../api/client';
import type { TrendAnalytics, WeeklySummary } from '../api/client';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';

interface ClinicianPortalProps {
  language: Language;
}

const DEMO_PATIENTS = [
  { id: 'pt_ramesh_001', name: 'Ramesh Kulkarni', age: 68, gender: 'M', language: 'Marathi / Hindi', phone: '+91 8149680369', diagnosis: 'Type 2 Diabetes (6 yrs)', severity: 'stable' },
  { id: 'pt_shanti_002', name: 'Shanti Devi', age: 72, gender: 'F', language: 'Hindi', phone: '+91 9800000002', diagnosis: 'Type 2 Diabetes (12 yrs, Mild Neuropathy)', severity: 'watch' },
  { id: 'pt_ananya_003', name: 'Ananya Patil', age: 65, gender: 'F', language: 'Marathi', phone: '+91 9800000003', diagnosis: 'Type 2 Diabetes + Hypo Unawareness', severity: 'critical' },
];

export const ClinicianPortal: React.FC<ClinicianPortalProps> = ({ language }) => {
  const [selectedPatientId, setSelectedPatientId] = useState('pt_ramesh_001');
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('Patient stable on current regimen. Continue daily fasting logs and morning Metformin.');

  const patient = DEMO_PATIENTS.find(p => p.id === selectedPatientId) || DEMO_PATIENTS[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trendData, summaryData] = await Promise.all([
        api.getTrends(selectedPatientId, 14),
        api.getWeeklySummary(selectedPatientId, 7),
      ]);
      setTrends(trendData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Error loading patient data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedPatientId]);

  const handleVerifySummary = async () => {
    setVerifying(true);
    try {
      const updated = await api.verifyWeeklySummary(selectedPatientId, doctorNotes);
      setSummary(updated);
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
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Patient Triage Roster Selector */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {DEMO_PATIENTS.map((p) => {
          const isSelected = p.id === selectedPatientId;
          const isCrit = p.severity === 'critical';
          const isWatch = p.severity === 'watch';

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPatientId(p.id)}
              className="panel"
              style={{
                flex: '1',
                minWidth: '280px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: isSelected ? 'var(--brand)' : 'var(--line)',
                borderWidth: isSelected ? '2px' : '1px',
                background: isSelected ? 'var(--brand-subtle)' : 'var(--surface)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: isSelected ? 'var(--brand)' : 'var(--surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: isSelected ? '#ffffff' : 'var(--ink)',
                    fontSize: '0.8125rem'
                  }}>
                    {p.name.charAt(0)}
                  </div>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                    {p.name}
                  </h3>
                </div>
                
                <span className={`status-indicator ${isCrit ? 'danger' : isWatch ? 'warn' : 'ok'}`}>
                  <span className={`status-dot ${isCrit ? 'danger' : isWatch ? 'warn' : 'ok'}`} />
                  {isCrit ? 'Critical' : isWatch ? 'Watch' : 'Stable'}
                </span>
              </div>

              <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>
                Age {p.age} • {p.gender} • {p.language} • {p.phone}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: '4px' }}>
                {p.diagnosis}
              </p>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--ink-2)' }}>
          <RefreshCw className="status-dot ok" style={{ width: '20px', height: '20px', margin: '0 auto 12px' }} />
          <p>Loading clinical telemetry for {patient.name}...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
          {/* ADA Glycemic Stats Cards (12 cols) */}
          <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>{t('timeInRange', language)}</span>
                <TrendingUp size={16} color="var(--ok)" />
              </div>
              <div className="tabular" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ok)', margin: '4px 0 2px' }}>
                {trends?.glycemic_metrics.tir_percentage}%
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>Target &gt;70% (ADA Standard)</p>
            </div>

            <div className="panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>{t('timeBelowRange', language)}</span>
                <AlertOctagon size={16} color="var(--danger)" />
              </div>
              <div className="tabular" style={{ fontSize: '2rem', fontWeight: 700, color: (trends?.glycemic_metrics.tbr_percentage || 0) > 0 ? 'var(--danger)' : 'var(--ink)', margin: '4px 0 2px' }}>
                {trends?.glycemic_metrics.tbr_percentage}%
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>Target &lt;4% (Hypo Risk)</p>
            </div>

            <div className="panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>{t('meanGlucose', language)}</span>
                <Activity size={16} color="var(--ink)" />
              </div>
              <div className="tabular" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ink)', margin: '4px 0 2px' }}>
                {trends?.glycemic_metrics.mean_glucose} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--ink-2)' }}>mg/dL</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>Median: {trends?.glycemic_metrics.median_glucose} | MAD: {trends?.glycemic_metrics.mad_glucose}</p>
            </div>

            <div className="panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>{t('glucoseVariability', language)}</span>
                <Activity size={16} color="var(--ink)" />
              </div>
              <div className="tabular" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--ink)', margin: '4px 0 2px' }}>
                {trends?.glycemic_metrics.coefficient_of_variation_pct}%
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>SD: ±{trends?.glycemic_metrics.standard_deviation} mg/dL</p>
            </div>

            <div className="panel" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--ink-2)', fontSize: '0.75rem', fontWeight: 600 }}>
                <span>{t('medAdherence', language)}</span>
                <Pill size={16} color="var(--brand)" />
              </div>
              <div className="tabular" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--brand)', margin: '4px 0 2px' }}>
                {trends?.adherence_metrics.compliance_score_pct}%
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>{trends?.adherence_metrics.readings_per_day} daily log avg</p>
            </div>
          </div>

          {/* Interactive Trajectory Chart (8 cols) */}
          <div className="panel" style={{ gridColumn: 'span 8', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
                  {t('clinicianOverview', language)}
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>
                  Target band (70 - 180 mg/dL)
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--brand-subtle)', color: 'var(--brand)', fontWeight: 600 }}>
                  Target: 70–180
                </span>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'var(--surface-2)', color: 'var(--ink-2)', fontWeight: 500 }}>
                  {trends?.readings.length} Points
                </span>
              </div>
            </div>

            <div style={{ height: '340px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="name" stroke="var(--ink-2)" fontSize={11} />
                  <YAxis domain={[40, 300]} stroke="var(--ink-2)" fontSize={11} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value as number;
                        const isHypo = val < 70;
                        const isHyper = val > 180;
                        return (
                          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: isHypo ? 'var(--danger)' : isHyper ? 'var(--warn)' : 'var(--ok)' }}>
                              {val} mg/dL
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)', marginTop: '2px' }}>
                              Context: {payload[0].payload.context}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={180} stroke="var(--warn)" strokeDasharray="4 4" label={{ value: 'Hyper (>180)', fill: 'var(--warn)', fontSize: 10 }} />
                  <ReferenceLine y={70} stroke="var(--danger)" strokeDasharray="4 4" label={{ value: 'Hypo (<70)', fill: 'var(--danger)', fontSize: 10 }} />
                  <Area type="monotone" dataKey="glucose" stroke="var(--brand)" strokeWidth={2} fill="var(--chart-band)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Clinician Weekly Synthesis Review Gate (4 cols) */}
          <div className="panel" style={{ gridColumn: 'span 4', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--brand)" />
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                  {t('weeklySynthesis', language)}
                </h2>
              </div>
              <span className={`status-indicator ${summary?.status === 'verified' ? 'ok' : 'warn'}`}>
                <span className={`status-dot ${summary?.status === 'verified' ? 'ok' : 'warn'}`} />
                {summary?.status === 'verified' ? t('verified', language) : t('unverified', language)}
              </span>
            </div>

            <div style={{ flex: '1', background: 'var(--surface-2)', padding: '14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid var(--line)' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Clinical Highlights
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.8125rem', color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary?.clinical_highlights.map((h, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ color: 'var(--brand)', fontWeight: 700 }}>•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)' }}>RECOMMENDED ACTION:</span>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink)', marginTop: '2px' }}>
                  {summary?.doctor_action_recommendation}
                </p>
              </div>
            </div>

            {/* Doctor Sign-Off Form */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '6px', display: 'block' }}>
                {t('doctorNotes', language)}
              </label>
              <textarea
                className="input-field"
                rows={2}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                style={{ fontSize: '0.8125rem', marginBottom: '12px', resize: 'none' }}
              />

              {summary?.status === 'verified' ? (
                <div style={{
                  background: 'var(--ok-bg)',
                  border: '1px solid var(--ok-border)',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: 'var(--ok)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}>
                  <Award size={20} color="var(--ok)" />
                  <div>
                    <div>Clinically Verified by {summary.verified_by}</div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--ink-2)' }}>Logged at {new Date(summary.verified_at || '').toLocaleTimeString()}</div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleVerifySummary}
                  disabled={verifying}
                  className="btn btn-brand"
                  style={{ width: '100%', padding: '10px' }}
                >
                  <UserCheck size={16} />
                  {verifying ? 'Signing off...' : t('verifyButton', language)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
