import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, XCircle, Edit3, Send, ShieldCheck, RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import type { Recommendation } from '../api/client';

export const CoachPortal: React.FC = () => {
  const [approvals, setApprovals] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [coachFeedback] = useState('Encouraging tone for senior.');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingApprovals();
      setApprovals(data);
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleDecision = async (recId: string, decision: 'approved' | 'rejected' | 'edited') => {
    setActionInProgress(true);
    try {
      const result = await api.submitApprovalDecision(
        recId,
        decision,
        coachFeedback,
        decision === 'edited' ? editedText : undefined
      );
      
      setToastMessage(`Nudge ${decision} successfully! ${result.dispatched_to_whatsapp ? 'Dispatched to Senior WhatsApp ✅' : ''}`);
      setTimeout(() => setToastMessage(null), 5000);
      setEditingId(null);
      await fetchApprovals();
    } catch (err) {
      alert('Action failed: ' + err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleGenerateTestNudge = async () => {
    setLoading(true);
    try {
      await api.generateNudge('pt_ramesh_001');
      await fetchApprovals();
      setToastMessage('Generated fresh lifestyle nudge for Ramesh Kulkarni! ✨');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert('Nudge generation error: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={24} color="#06b6d4" />
            Coach Approvals Desk
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Review, edit, and approve AI lifestyle nudges before WhatsApp delivery to seniors.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleGenerateTestNudge}
            className="btn btn-secondary btn-sm"
          >
            <Sparkles size={14} color="#38bdf8" />
            Generate New Nudge
          </button>
          <button
            onClick={fetchApprovals}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} />
            Refresh Queue ({approvals.length})
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          padding: '12px 20px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
          <RefreshCw className="pulse-dot" style={{ width: '24px', height: '24px', margin: '0 auto 12px' }} />
          <p>Fetching pending lifestyle recommendations...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
            Queue is All Clear!
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto 20px' }}>
            There are no pending lifestyle nudges awaiting review. Click below to trigger a live GenAI draft.
          </p>
          <button onClick={handleGenerateTestNudge} className="btn btn-primary">
            <Sparkles size={16} />
            Generate GenAI Nudge for Ramesh
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {approvals.map((rec) => {
            const isEditing = editingId === rec.id;
            return (
              <div key={rec.id} className="glass-card" style={{ padding: '24px', borderLeft: '4px solid #06b6d4' }}>
                {/* Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-info">
                      {rec.patient_id === 'pt_ramesh_001' ? 'Ramesh Kulkarni' : rec.patient_id}
                    </span>
                    <span className="badge badge-success">
                      Confidence: {rec.confidence_label}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Generated {new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 600 }}>
                    <ShieldCheck size={16} />
                    <span>Number-Fidelity Guardrails Verified</span>
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px', marginBottom: '20px' }}>
                  {/* Left: Message Draft */}
                  <div style={{ gridColumn: 'span 7' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                      Proposed WhatsApp Message to Senior:
                    </label>

                    {isEditing ? (
                      <textarea
                        className="input-field"
                        rows={4}
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        style={{ fontSize: '0.9rem', marginBottom: '8px' }}
                      />
                    ) : (
                      <div style={{
                        background: 'rgba(7, 10, 19, 0.8)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#f8fafc',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                        fontStyle: 'italic',
                      }}>
                        "{rec.message_text}"
                      </div>
                    )}
                  </div>

                  {/* Right: Clinical Rationale & Findings */}
                  <div style={{ gridColumn: 'span 5', background: 'rgba(15, 23, 42, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                      Clinical Reason & Evidence:
                    </label>
                    <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '12px' }}>
                      {rec.reason_text}
                    </p>

                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      <span>Action Type: </span>
                      <strong style={{ color: '#e2e8f0' }}>{rec.action_type}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => setEditingId(null)}
                        className="btn btn-secondary btn-sm"
                        disabled={actionInProgress}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDecision(rec.id, 'edited')}
                        className="btn btn-primary btn-sm"
                        disabled={actionInProgress}
                      >
                        <Send size={14} />
                        Save & Dispatch Edited
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDecision(rec.id, 'rejected')}
                        className="btn btn-danger btn-sm"
                        disabled={actionInProgress}
                      >
                        <XCircle size={14} />
                        Reject
                      </button>

                      <button
                        onClick={() => {
                          setEditingId(rec.id);
                          setEditedText(rec.message_text);
                        }}
                        className="btn btn-secondary btn-sm"
                        disabled={actionInProgress}
                      >
                        <Edit3 size={14} />
                        Edit Copy
                      </button>

                      <button
                        onClick={() => handleDecision(rec.id, 'approved')}
                        className="btn btn-primary"
                        disabled={actionInProgress}
                      >
                        <Send size={16} />
                        Approve & Send to WhatsApp
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
