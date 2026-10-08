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

const DEMO_PATIENTS = [
  { id: 'pt_ramesh_001', name: 'Ramesh Kulkarni', age: 68, gender: 'M', language: 'Marathi / Hindi', phone: '+91 8149680369', diagnosis: 'Type 2 Diabetes (6 yrs)', severity: 'stable' },
  { id: 'pt_shanti_002', name: 'Shanti Devi', age: 72, gender: 'F', language: 'Hindi', phone: '+91 9800000002', diagnosis: 'Type 2 Diabetes (12 yrs, Mild Neuropathy)', severity: 'watch' },
  { id: 'pt_ananya_003', name: 'Ananya Patil', age: 65, gender: 'F', language: 'Marathi', phone: '+91 9800000003', diagnosis: 'Type 2 Diabetes + Hypo Unawareness', severity: 'critical' },
];

export const ClinicianPortal: React.FC = () => {
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
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Patient Triage Roster Selector */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {DEMO_PATIENTS.map((p) => {
          const isSelected = p.id === selectedPatientId;
          const isCrit = p.severity === 'critical';
          const isWatch = p.severity === 'watch';

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPatientId(p.id)}
              className={`glass-panel ${isSelected ? 'glass-panel-glow-emerald' : ''}`}
              style={{
                flex: '1',
                minWidth: '280px',
                padding: '18px',
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: isSelected ? '#10b981' : 'rgba(255,255,255,0.08)',
                background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? '#10b981' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '0.85rem' }}>
                    {p.name.charAt(0)}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: isSelected ? '#34d399' : '#ffffff' }}>
                    {p.name}
                  </h3>
                </div>
                
                <span className={`badge ${isCrit ? 'badge-danger' : isWatch ? 'badge-warning' : 'badge-success'}`}>
                  {isCrit ? 'Critical Hypo' : isWatch ? 'Watch Spike' : 'Stable'}
                </span>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Age {p.age} • {p.gender} • {p.language} • {p.phone}
              </p>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                {p.diagnosis}
              </p>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw className="pulse-dot" style={{ width: '24px', height: '24px', margin: '0 auto 12px' }} />
          <p>Loading clinical telemetry for {patient.name}...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
          {/* ADA Glycemic Stats Cards (12 cols) */}
          <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                <span>TIME IN RANGE (70-180)</span>
                <TrendingUp size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#34d399', margin: '6px 0 2px' }}>
                {trends?.glycemic_metrics.tir_percentage}%
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Target &gt;70% (ADA Guidelines)</p>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                <span>TIME BELOW RANGE (&lt;70)</span>
                <AlertOctagon size={16} color="#f43f5e" />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: (trends?.glycemic_metrics.tbr_percentage || 0) > 0 ? '#fb7185' : '#ffffff', margin: '6px 0 2px' }}>
                {trends?.glycemic_metrics.tbr_percentage}%
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Target &lt;4% (Hypo Prevention)</p>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                <span>MEAN GLUCOSE</span>
                <Activity size={16} color="#06b6d4" />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', margin: '6px 0 2px' }}>
                {trends?.glycemic_metrics.mean_glucose} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>mg/dL</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Median: {trends?.glycemic_metrics.median_glucose} | MAD: {trends?.glycemic_metrics.mad_glucose}</p>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                <span>GLUCOSE VARIABILITY</span>
                <Activity size={16} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#fbbf24', margin: '6px 0 2px' }}>
                {trends?.glycemic_metrics.coefficient_of_variation_pct}%
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>SD: ±{trends?.glycemic_metrics.standard_deviation} mg/dL</p>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                <span>MEDICATION ADHERENCE</span>
                <Pill size={16} color="#c084fc" />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#c084fc', margin: '6px 0 2px' }}>
                {trends?.adherence_metrics.compliance_score_pct}%
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{trends?.adherence_metrics.readings_per_day} daily log avg</p>
            </div>
          </div>

          {/* Interactive Trajectory Chart (8 cols) */}
          <div className="glass-panel" style={{ gridColumn: 'span 8', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                  14-Day Continuous Glucose Telemetry
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Green safe zone (70 - 180 mg/dL) with threshold alerts
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-success">Target: 70–180</span>
                <span className="badge badge-info">{trends?.readings.length} Telemetry Points</span>
              </div>
            </div>

            <div style={{ height: '340px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGlucoseGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis domain={[40, 300]} stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value as number;
                        const isHypo = val < 70;
                        const isHyper = val > 180;
                        return (
                          <div style={{ background: '#0b1329', border: '1px solid #1e293b', padding: '10px 14px', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>{label}</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isHypo ? '#f43f5e' : isHyper ? '#f59e0b' : '#34d399' }}>
                              {val} mg/dL
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '2px' }}>
                              Context: {payload[0].payload.context}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Hyper (>180)', fill: '#f59e0b', fontSize: 10 }} />
                  <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Hypo (<70)', fill: '#f43f5e', fontSize: 10 }} />
                  <Area type="monotone" dataKey="glucose" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGlucoseGlow)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Clinician Weekly Synthesis Review Gate (4 cols) */}
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#06b6d4" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Weekly Clinical Synthesis
                </h2>
              </div>
              <span className={`badge ${summary?.status === 'verified' ? 'badge-success' : 'badge-warning'}`}>
                {summary?.status === 'verified' ? 'Verified by MD' : 'Unverified Draft'}
              </span>
            </div>

            <div style={{ flex: '1', background: 'rgba(7, 10, 19, 0.6)', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Automated Highlights
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary?.clinical_highlights.map((h, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>RECOMMENDED ACTION:</span>
                <p style={{ fontSize: '0.85rem', color: '#f8fafc', marginTop: '3px', fontWeight: 500 }}>
                  {summary?.doctor_action_recommendation}
                </p>
              </div>
            </div>

            {/* Doctor Sign-Off Form */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '6px', display: 'block' }}>
                Attending Doctor Notes:
              </label>
              <textarea
                className="input-field"
                rows={2}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                style={{ fontSize: '0.85rem', marginBottom: '12px', resize: 'none' }}
              />

              {summary?.status === 'verified' ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '12px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#34d399',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  <Award size={22} color="#34d399" />
                  <div>
                    <div>Clinically Verified by {summary.verified_by}</div>
                    <div style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>Logged in Audit Trail at {new Date(summary.verified_at || '').toLocaleTimeString()}</div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleVerifySummary}
                  disabled={verifying}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  <UserCheck size={18} />
                  {verifying ? 'Signing off...' : 'Verify & Approve Clinical Synthesis'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
