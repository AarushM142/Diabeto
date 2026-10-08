import React, { useState } from 'react';
import { 
  Terminal, AlertOctagon, Activity, Sparkles, Send, CheckCircle2
} from 'lucide-react';
import { api } from '../api/client';

export const DemoSimulator: React.FC = () => {
  const [patientId, setPatientId] = useState('pt_ramesh_001');
  const [customGlucose, setCustomGlucose] = useState('140');
  const [context, setContext] = useState('fasting');
  const [logs, setLogs] = useState<string[]>([
    '[System Initialized] Live Demo Simulator connected to FastAPI backend on port 8000.',
    '[Ready] Select an automated clinical scenario or inject custom glucose reading below.',
  ]);
  const [submitting, setSubmitting] = useState(false);

  const appendLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const handleInject = async (val: number, ctx: string) => {
    setSubmitting(true);
    appendLog(`Sending Inbound Glucose Reading: ${val} mg/dL (${ctx}) for patient ${patientId}...`);
    try {
      const res = await api.logHealthEvent(patientId, val, ctx);
      appendLog(`✓ Event Ingested! ID: ${res.id}. Risk status: ${res.risk_status || 'normal'}`);
      if (val < 70) {
        appendLog(`🚨 CRITICAL HYPOGLYCEMIA DETECTED (<70 mg/dL)! Escalation ladder triggered (T1 Caregiver -> T2 Doctor).`);
      } else if (val > 250) {
        appendLog(`⚠️ CRITICAL HYPERGLYCEMIA DETECTED (>250 mg/dL)! Urgent care team alert enqueued.`);
      }
    } catch (err) {
      appendLog(`❌ Error injecting event: ${err}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerNudge = async () => {
    setSubmitting(true);
    appendLog(`Triggering GenAI Lifestyle Nudge generation for ${patientId}...`);
    try {
      const res = await api.generateNudge(patientId);
      appendLog(`✓ GenAI Draft Created: "${res.message_text.substring(0, 60)}..." (Status: ${res.status}, Confidence: ${res.confidence_label})`);
      appendLog(`✓ Routed to Coach Approvals Queue for human review.`);
    } catch (err) {
      appendLog(`❌ Error generating nudge: ${err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={20} color="var(--brand)" />
          Interactive Demo & Clinical Simulator
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>
          Test deterministic safety rules, emergency escalation triggers, and GenAI lifestyle nudges live against the running backend.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
        {/* Left: Quick Scenarios & Ingestion (5 cols) */}
        <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Preset Clinical Scenarios */}
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
              One-Click Clinical Scenarios
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => handleInject(54, 'fasting')}
                disabled={submitting}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', borderLeft: '4px solid var(--danger)' }}
              >
                <AlertOctagon size={18} color="var(--danger)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'var(--danger)' }}>Critical Hypoglycemia (54 mg/dL)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)' }}>Triggers Immediate T1 Caregiver Escalation</div>
                </div>
              </button>

              <button
                onClick={() => handleInject(265, 'postprandial')}
                disabled={submitting}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', borderLeft: '4px solid var(--warn)' }}
              >
                <Activity size={18} color="var(--warn)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'var(--warn)' }}>Severe Hyperglycemia (265 mg/dL)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)' }}>Triggers Urgent Hydration & Care Alert</div>
                </div>
              </button>

              <button
                onClick={() => handleInject(135, 'fasting')}
                disabled={submitting}
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', borderLeft: '4px solid var(--ok)' }}
              >
                <CheckCircle2 size={18} color="var(--ok)" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'var(--ok)' }}>Stable Fasting (135 mg/dL)</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)' }}>Logs within normal senior target</div>
                </div>
              </button>

              <button
                onClick={handleTriggerNudge}
                disabled={submitting}
                className="btn btn-brand"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px' }}
              >
                <Sparkles size={18} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>Trigger GenAI Nudge Generation</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Generates lifestyle advice for coach approval</div>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Ingestion Box */}
          <div className="panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
              Custom Telemetry Injection
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: '4px' }}>
                  Select Patient:
                </label>
                <select
                  className="input-field"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                >
                  <option value="pt_ramesh_001">Ramesh Kulkarni (+91 8149680369)</option>
                  <option value="pt_shanti_002">Shanti Devi (+91 9800000002)</option>
                  <option value="pt_ananya_003">Ananya Patil (+91 9800000003)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: '4px' }}>
                    Glucose (mg/dL):
                  </label>
                  <input
                    type="number"
                    className="input-field"
                    value={customGlucose}
                    onChange={(e) => setCustomGlucose(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', display: 'block', marginBottom: '4px' }}>
                    Context:
                  </label>
                  <select
                    className="input-field"
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                  >
                    <option value="fasting">Fasting</option>
                    <option value="postprandial">Postprandial</option>
                    <option value="bedtime">Bedtime</option>
                    <option value="random">Random</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => handleInject(Number(customGlucose), context)}
                disabled={submitting || !customGlucose}
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '6px' }}
              >
                <Send size={14} />
                Inject Reading
              </button>
            </div>
          </div>
        </div>

        {/* Right: Real-Time Telemetry & Console Log (7 cols) */}
        <div className="panel" style={{ gridColumn: 'span 7', padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} color="var(--brand)" />
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                Live Clinical Event Stream
              </h3>
            </div>
            <button
              onClick={() => setLogs(['[Cleared Log Stream]'])}
              className="btn btn-secondary btn-sm"
            >
              Clear Logs
            </button>
          </div>

          <div style={{
            flex: '1',
            minHeight: '440px',
            background: 'var(--surface-2)',
            borderRadius: '8px',
            padding: '16px',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            lineHeight: 1.6,
            color: 'var(--ink)',
            overflowY: 'auto',
            border: '1px solid var(--line)',
          }}>
            {logs.map((l, i) => (
              <div 
                key={i} 
                style={{ 
                  marginBottom: '8px', 
                  color: l.includes('🚨') ? 'var(--danger)' : l.includes('⚠️') ? 'var(--warn)' : l.includes('✓') ? 'var(--ok)' : 'var(--ink-2)' 
                }}
              >
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
