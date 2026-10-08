import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, XCircle, Send, ShieldCheck, RefreshCw, Phone, MoreVertical
} from 'lucide-react';

import { api } from '../api/client';
import type { Recommendation } from '../api/client';

export const CoachPortal: React.FC = () => {
  const [approvals, setApprovals] = useState<Recommendation[]>([]);
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [coachFeedback] = useState('Encouraging tone for senior.');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingApprovals();
      setApprovals(data);
      if (data.length > 0 && !selectedRecId) {
        setSelectedRecId(data[0].id);
        setEditedText(data[0].message_text);
      }
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const selectedRec = approvals.find((r) => r.id === selectedRecId) || approvals[0];

  const handleSelect = (rec: Recommendation) => {
    setSelectedRecId(rec.id);
    setEditedText(rec.message_text);
    setIsEditing(false);
  };

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
      setIsEditing(false);
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
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={24} color="#06b6d4" />
            Coach Approvals Desk
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Review, edit, and verify AI-generated lifestyle nudges before real-time WhatsApp delivery.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleGenerateTestNudge}
            className="btn btn-cyan btn-sm"
          >
            <Sparkles size={14} />
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
          <p>Loading pending coach recommendations...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
            Approval Queue is Empty!
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', maxWidth: '480px', margin: '0 auto 20px' }}>
            All lifestyle recommendations have been verified and dispatched. Click below to generate a new AI recommendation.
          </p>
          <button onClick={handleGenerateTestNudge} className="btn btn-primary">
            <Sparkles size={16} />
            Generate GenAI Nudge for Ramesh
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
          {/* Left: Queue List (4 cols) */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
              Pending Nudges ({approvals.length})
            </h3>

            {approvals.map((rec) => {
              const isSelected = rec.id === selectedRec?.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => handleSelect(rec)}
                  className="glass-panel"
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    borderColor: isSelected ? '#06b6d4' : 'rgba(255,255,255,0.08)',
                    background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '0.9rem', color: isSelected ? '#38bdf8' : '#ffffff' }}>
                      {rec.patient_id === 'pt_ramesh_001' ? 'Ramesh Kulkarni' : rec.patient_id}
                    </strong>
                    <span className="badge badge-info">
                      {rec.confidence_label}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4, marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{rec.message_text}"
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                    <span>Action: {rec.action_type}</span>
                    <span>{new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center: Selected Nudge Detail & Editor (4 cols) */}
          <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff' }}>
                Review & Edit Copy
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399', fontSize: '0.75rem', fontWeight: 600 }}>
                <ShieldCheck size={16} />
                <span>Guardrails OK</span>
              </div>
            </div>

            {selectedRec && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: '1', gap: '16px' }}>
                {/* Clinical Evidence Box */}
                <div style={{ background: 'rgba(7, 10, 19, 0.6)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                    Clinical Rationale:
                  </span>
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '4px' }}>
                    {selectedRec.reason_text}
                  </p>
                </div>

                {/* Message Textarea */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Message Content (Editable):
                  </label>
                  <textarea
                    className="input-field"
                    rows={5}
                    value={isEditing ? editedText : selectedRec.message_text}
                    onChange={(e) => {
                      setIsEditing(true);
                      setEditedText(e.target.value);
                    }}
                    style={{ flex: '1', fontSize: '0.9rem', resize: 'none', lineHeight: 1.5 }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <button
                    onClick={() => handleDecision(selectedRec.id, 'rejected')}
                    disabled={actionInProgress}
                    className="btn btn-danger btn-sm"
                    style={{ flex: '1' }}
                  >
                    <XCircle size={14} />
                    Reject
                  </button>

                  <button
                    onClick={() => handleDecision(selectedRec.id, isEditing ? 'edited' : 'approved')}
                    disabled={actionInProgress}
                    className="btn btn-primary"
                    style={{ flex: '2' }}
                  >
                    <Send size={16} />
                    {isEditing ? 'Save & Send to WhatsApp' : 'Approve & Dispatch'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Live WhatsApp Smartphone Mockup (4 cols) */}
          <div style={{ gridColumn: 'span 4' }}>
            <div className="phone-mockup">
              {/* WhatsApp Header */}
              <div className="phone-header">
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                  D
                </div>
                <div style={{ flex: '1' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff' }}>Diabeto Care</div>
                  <div style={{ fontSize: '0.7rem', color: '#8696a0' }}>Verified Business Account</div>
                </div>
                <Phone size={16} color="#8696a0" />
                <MoreVertical size={16} color="#8696a0" />
              </div>

              {/* Chat Body */}
              <div className="phone-chat-body">
                <div className="bubble-outbound">
                  Namaste Ramesh ji! Please send your fasting blood glucose reading.
                  <div style={{ fontSize: '0.65rem', color: '#8696a0', textAlign: 'right', marginTop: '4px' }}>8:00 AM</div>
                </div>

                <div className="bubble-inbound">
                  Mera fasting sugar 140 hai
                  <div style={{ fontSize: '0.65rem', color: '#8696a0', textAlign: 'right', marginTop: '4px' }}>8:15 AM ✓✓</div>
                </div>

                {/* Live Nudge Preview Bubble */}
                {selectedRec && (
                  <div className="bubble-outbound" style={{ background: '#18383b', border: '1px solid rgba(6, 182, 212, 0.4)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>
                      🌟 COACH LIFESTYLE TIP
                    </div>
                    {isEditing ? editedText : selectedRec.message_text}
                    <div style={{ fontSize: '0.65rem', color: '#8696a0', textAlign: 'right', marginTop: '6px' }}>
                      — Verified by Care Coach • Just now
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
