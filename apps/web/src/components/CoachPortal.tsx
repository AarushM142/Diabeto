import React, { useState, useEffect } from 'react';
import { 
  Sparkles, CheckCircle2, XCircle, Send, ShieldCheck, RefreshCw, Phone, MoreVertical
} from 'lucide-react';
import { api } from '../api/client';
import type { Recommendation } from '../api/client';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';

interface CoachPortalProps {
  language: Language;
}

const formatActionType = (raw: string): string => {
  const map: Record<string, string> = {
    critical_low_intervention: 'Critical Hypo Alert',
    high_spike_review: 'Glucose Spike Review',
    hydration_reminder: 'Hydration & Water Reminder',
    medication_checkin: 'Medication Check-In',
    lifestyle_nudge: 'Lifestyle Nudge',
  };
  return map[raw] || raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export const CoachPortal: React.FC<CoachPortalProps> = ({ language }) => {
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
      
      setToastMessage(`Recommendation ${decision} successfully! ${result.dispatched_to_whatsapp ? 'Dispatched to Senior WhatsApp ✅' : ''}`);
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
      setToastMessage('Generated fresh lifestyle nudge for Ramesh Kulkarni.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      alert('Nudge generation error: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="font-serif" style={{ fontSize: '1.65rem', color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Sparkles size={22} color="var(--accent-sage)" strokeWidth={1.5} />
            {t('coachTitle', language)}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t('coachSub', language)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={handleGenerateTestNudge}
            className="btn btn-primary"
            style={{ padding: '8px 18px' }}
          >
            <Sparkles size={14} />
            {t('generateNudge', language)}
          </button>
          <button
            onClick={fetchApprovals}
            className="btn btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            <RefreshCw size={14} />
            Refresh ({approvals.length})
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="botanical-callout ok" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="var(--status-ok)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--status-ok)' }}>{toastMessage}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw className="status-dot ok" style={{ width: '24px', height: '24px', margin: '0 auto 12px' }} />
          <p>Loading pending recommendations...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="botanical-card" style={{ padding: '60px', textAlign: 'center' }}>
          <CheckCircle2 size={44} color="var(--accent-sage)" style={{ margin: '0 auto 16px' }} strokeWidth={1.5} />
          <h3 className="font-serif" style={{ fontSize: '1.35rem', color: 'var(--text-forest)', marginBottom: '8px' }}>
            Queue is All Clear
          </h3>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto 24px' }}>
            All lifestyle recommendations have been carefully reviewed and dispatched.
          </p>
          <button onClick={handleGenerateTestNudge} className="btn btn-primary">
            <Sparkles size={15} />
            {t('generateNudge', language)} for Ramesh
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px', alignItems: 'stretch' }}>
          {/* Left: Queue List (4 cols) */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px 4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('pendingNudges', language)} ({approvals.length})
              </span>
            </div>

            {approvals.map((rec) => {
              const isSelected = rec.id === selectedRec?.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => handleSelect(rec)}
                  className="botanical-card"
                  style={{
                    padding: '18px 20px',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--text-forest)' : 'var(--border-stone)',
                    borderWidth: isSelected ? '2px' : '1px',
                    background: isSelected ? 'var(--surface-clay)' : 'var(--surface-white)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong className="font-serif" style={{ fontSize: '0.975rem', color: 'var(--text-forest)' }}>
                      {rec.patient_id === 'pt_ramesh_001' ? 'Ramesh Kulkarni' : rec.patient_id}
                    </strong>
                    <span className="status-pill ok" style={{ fontSize: '0.7rem', padding: '2px 8px', textTransform: 'capitalize' }}>
                      {rec.confidence_label || 'High'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-forest)', lineHeight: 1.45, marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    "{rec.message_text}"
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-stone)', paddingTop: '8px' }}>
                    <span style={{ fontWeight: 500, color: 'var(--accent-sage-dark)' }}>{formatActionType(rec.action_type)}</span>
                    <span style={{ color: 'var(--text-dim)' }}>{new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center: Selected Nudge Detail & Editor (4 cols) */}
          <div className="botanical-card" style={{ gridColumn: 'span 4', padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                {t('reviewDraft', language)}
              </h3>
              <div className="status-pill ok">
                <ShieldCheck size={14} color="var(--status-ok)" />
                <span>{t('guardrailsPassed', language)}</span>
              </div>
            </div>

            {selectedRec && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: '1', gap: '14px' }}>
                {/* Clinical Evidence Box */}
                <div style={{ background: 'var(--surface-clay)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-stone)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-sage-dark)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {t('clinicalRationale', language)}
                  </span>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-forest)', marginTop: '4px', lineHeight: 1.5 }}>
                    {selectedRec.reason_text}
                  </p>
                </div>

                {/* Message Textarea */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: '140px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Message Content (Editable):
                  </label>
                  <textarea
                    className="textarea-botanical"
                    rows={6}
                    value={isEditing ? editedText : selectedRec.message_text}
                    onChange={(e) => {
                      setIsEditing(true);
                      setEditedText(e.target.value);
                    }}
                    style={{ flex: '1', fontSize: '0.875rem', resize: 'none', lineHeight: 1.55 }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-stone)', marginTop: 'auto' }}>
                  <button
                    onClick={() => handleDecision(selectedRec.id, 'rejected')}
                    disabled={actionInProgress}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: '1', color: 'var(--status-danger)', borderColor: 'var(--status-danger-border)', whiteSpace: 'nowrap' }}
                  >
                    <XCircle size={14} />
                    {t('reject', language)}
                  </button>

                  <button
                    onClick={() => handleDecision(selectedRec.id, isEditing ? 'edited' : 'approved')}
                    disabled={actionInProgress}
                    className="btn btn-primary"
                    style={{ flex: '2', whiteSpace: 'nowrap', padding: '10px 16px' }}
                  >
                    <Send size={14} />
                    {isEditing ? 'Save & Send' : 'Approve & Send'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Live WhatsApp Smartphone Mockup (4 cols) */}
          <div style={{ gridColumn: 'span 4' }}>
            <div className="phone-mockup" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {/* WhatsApp Header */}
              <div className="phone-header" style={{ padding: '12px 16px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-forest)', fontWeight: 700, fontSize: '0.9rem' }}>
                  D
                </div>
                <div style={{ flex: '1' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Diabeto Care</div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>WhatsApp Business • Pune</div>
                </div>
                <Phone size={15} color="#FFFFFF" />
                <MoreVertical size={15} color="#FFFFFF" />
              </div>

              {/* Chat Body */}
              <div className="phone-chat-body" style={{ flex: '1', minHeight: '380px' }}>
                <div className="bubble-outbound">
                  Namaste Ramesh ji! Please send your fasting blood glucose reading.
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>8:00 AM</div>
                </div>

                <div className="bubble-inbound">
                  Mera fasting sugar 140 hai
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>8:15 AM ✓✓</div>
                </div>

                {/* Live Nudge Preview Bubble */}
                {selectedRec && (
                  <div className="bubble-outbound" style={{ borderLeft: '4px solid var(--accent-sage)', background: '#EAF3E7' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-forest)', marginBottom: '3px' }}>
                      Coach Recommendation
                    </div>
                    {isEditing ? editedText : selectedRec.message_text}
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '6px' }}>
                      Verified by Care Coach • Just now
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
