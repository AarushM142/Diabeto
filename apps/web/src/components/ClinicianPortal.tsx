import React, { useState, useEffect } from 'react';
import { 
  Activity, CheckCircle2, AlertOctagon, TrendingUp, 
  Pill, FileText, UserCheck, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid 
} from 'recharts';
import { api } from '../api/client';
import type { TrendAnalytics, WeeklySummary } from '../api/client';

const DEMO_PATIENTS = [
  { id: 'pt_ramesh_001', name: 'Ramesh Kulkarni', age: 68, gender: 'M', language: 'Marathi / Hindi', phone: '+91 8149680369', diagnosis: 'Type 2 Diabetes (6 yrs)' },
  { id: 'pt_shanti_002', name: 'Shanti Devi', age: 72, gender: 'F', language: 'Hindi', phone: '+91 9800000002', diagnosis: 'Type 2 Diabetes (12 yrs, Mild Neuropathy)' },
  { id: 'pt_ananya_003', name: 'Ananya Patil', age: 65, gender: 'F', language: 'Marathi', phone: '+91 9800000003', diagnosis: 'Type 2 Diabetes + Hypo Unawareness' },
];

export const ClinicianPortal: React.FC = () => {
  const [selectedPatientId, setSelectedPatientId] = useState('pt_ramesh_001');
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('Patient stable on current regimen. Continue daily fasting logs.');


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
      {/* Top Patient Selector Bar */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {DEMO_PATIENTS.map((p) => {
          const isSelected = p.id === selectedPatientId;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPatientId(p.id)}
              className="glass-card"
              style={{
                flex: '1',
                minWidth: '280px',
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                borderColor: isSelected ? '#10b981' : 'rgba(255,255,255,0.08)',
                background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.6)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: isSelected ? '#34d399' : '#ffffff' }}>
                  {p.name}
                </h3>
                <span className={`badge ${p.id === 'pt_ananya_003' ? 'badge-danger' : 'badge-success'}`}>
                  {p.id === 'pt_ananya_003' ? 'High Risk' : 'Active'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Age {p.age} • {p.gender} • {p.language}
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
          {/* ADA Glycemic Stats Cards (4 cols) */}
          <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>TIME IN RANGE (70-180)</span>
                <TrendingUp size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399', margin: '8px 0 4px' }}>
                {trends?.glycemic_metrics.tir_percentage}%
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Target &gt;70% (ADA standard)</p>
            </div>

            <div className="glass-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>TIME BELOW (&lt;70 mg/dL)</span>
                <AlertOctagon size={16} color="#f43f5e" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: trends?.glycemic_metrics.tbr_percentage ? '#fb7185' : '#ffffff', margin: '8px 0 4px' }}>
                {trends?.glycemic_metrics.tbr_percentage}%
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Target &lt;4% (Hypoglycemia risk)</p>
            </div>

            <div className="glass-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>MEAN GLUCOSE</span>
                <Activity size={16} color="#06b6d4" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8', margin: '8px 0 4px' }}>
                {trends?.glycemic_metrics.mean_glucose} <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>mg/dL</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Median: {trends?.glycemic_metrics.median_glucose} | MAD: {trends?.glycemic_metrics.mad_glucose}</p>
            </div>

            <div className="glass-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>GLUCOSE VARIABILITY (CV%)</span>
                <Activity size={16} color="#f59e0b" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', margin: '8px 0 4px' }}>
                {trends?.glycemic_metrics.coefficient_of_variation_pct}%
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>SD: ±{trends?.glycemic_metrics.standard_deviation} mg/dL</p>
            </div>

            <div className="glass-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>
                <span>MEDICATION ADHERENCE</span>
                <Pill size={16} color="#a855f7" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#c084fc', margin: '8px 0 4px' }}>
                {trends?.adherence_metrics.compliance_score_pct}%
              </div>
              <p style={{ fontSize: '0.75rem', color: '#64748b' }}>{trends?.adherence_metrics.readings_per_day} daily log avg</p>
            </div>
          </div>

          {/* Interactive Trajectory Chart (8 cols) */}
          <div className="glass-card" style={{ gridColumn: 'span 8', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>
                  14-Day Blood Glucose Trajectory & Target Zone
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Continuous telemetry with green target zone (70 - 180 mg/dL)
                </p>
              </div>
              <span className="badge badge-info">
                {trends?.readings.length} Ingested Logs
              </span>
            </div>

            <div style={{ height: '320px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGlucose" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis domain={[40, 300]} stroke="#64748b" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                  />
                  {/* Reference lines for ADA boundaries */}
                  <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Hyper (>180)', fill: '#f59e0b', fontSize: 10 }} />
                  <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Hypo (<70)', fill: '#f43f5e', fontSize: 10 }} />
                  <Area type="monotone" dataKey="glucose" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGlucose)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Clinician Weekly Synthesis Review Gate (4 cols) */}
          <div className="glass-card" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="#06b6d4" />
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                  Weekly Synthesis
                </h2>
              </div>
              <span className={`badge ${summary?.status === 'verified' ? 'badge-success' : 'badge-warning'}`}>
                {summary?.status === 'verified' ? 'Verified by Doctor' : 'Unverified Draft'}
              </span>
            </div>

            <div style={{ flex: '1', background: 'rgba(7, 10, 19, 0.6)', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Clinical Highlights
              </h4>
              <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary?.clinical_highlights.map((h, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <span style={{ color: '#10b981' }}>•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>RECOMMENDED ACTION:</span>
                <p style={{ fontSize: '0.85rem', color: '#f8fafc', marginTop: '2px' }}>
                  {summary?.doctor_action_recommendation}
                </p>
              </div>
            </div>

            {/* Verification Box */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '6px', display: 'block' }}>
                Doctor Sign-Off Notes:
              </label>
              <textarea
                className="input-field"
                rows={2}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                style={{ fontSize: '0.8rem', marginBottom: '12px', resize: 'none' }}
              />

              {summary?.status === 'verified' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34d399', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle2 size={18} />
                  <span>Verified by {summary.verified_by}</span>
                </div>
              ) : (
                <button
                  onClick={handleVerifySummary}
                  disabled={verifying}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  <UserCheck size={16} />
                  {verifying ? 'Signing off...' : 'Verify & Approve Synthesis'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
