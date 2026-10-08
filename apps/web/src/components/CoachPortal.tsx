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
      
      setToastMessage(`Nudge ${decision} successfully! ${result.dispatched_to_whatsapp ? 'Dispatched to WhatsApp ✅' : ''}`);
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
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--brand)" />
            {t('coachTitle', language)}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)' }}>
            {t('coachSub', language)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleGenerateTestNudge}
            className="btn btn-brand btn-sm"
          >
            <Sparkles size={14} />
            {t('generateNudge', language)}
          </button>
          <button
            onClick={fetchApprovals}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} />
            Refresh ({approvals.length})
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="callout ok" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="var(--ok)" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--ok)' }}>{toastMessage}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--ink-2)' }}>
          <RefreshCw className="status-dot ok" style={{ width: '20px', height: '20px', margin: '0 auto 12px' }} />
          <p>Loading pending recommendations...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="panel" style={{ padding: '60px', textAlign: 'center' }}>
          <CheckCircle2 size={40} color="var(--ok)" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
            Queue is All Clear
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)', maxWidth: '440px', margin: '0 auto 18px' }}>
            All recommendations have been reviewed and delivered.
          </p>
          <button onClick={handleGenerateTestNudge} className="btn btn-brand">
            <Sparkles size={15} />
            {t('generateNudge', language)} for Ramesh
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
          {/* Left: Queue List (4 cols) */}
          <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase' }}>
              {t('pendingNudges', language)} ({approvals.length})
            </h3>

            {approvals.map((rec) => {
              const isSelected = rec.id === selectedRec?.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => handleSelect(rec)}
                  className="panel"
                  style={{
                    padding: '14px',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--brand)' : 'var(--line)',
                    borderWidth: isSelected ? '2px' : '1px',
                    background: isSelected ? 'var(--brand-subtle)' : 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '0.875rem', color: 'var(--ink)' }}>
                      {rec.patient_id === 'pt_ramesh_001' ? 'Ramesh Kulkarni' : rec.patient_id}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--brand)', fontWeight: 600 }}>
                      {rec.confidence_label}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', lineHeight: 1.4, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{rec.message_text}"
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ink-3)' }}>
                    <span>{rec.action_type}</span>
                    <span>{new Date(rec.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center: Selected Nudge Detail & Editor (4 cols) */}
          <div className="panel" style={{ gridColumn: 'span 4', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)' }}>
                {t('reviewDraft', language)}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--ok)', fontSize: '0.75rem', fontWeight: 600 }}>
                <ShieldCheck size={14} />
                <span>{t('guardrailsPassed', language)}</span>
              </div>
            </div>

            {selectedRec && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: '1', gap: '14px' }}>
                {/* Clinical Evidence Box */}
                <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)' }}>
                    {t('clinicalRationale', language)}
                  </span>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--ink)', marginTop: '2px' }}>
                    {selectedRec.reason_text}
                  </p>
                </div>

                {/* Message Textarea */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '4px' }}>
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
                    style={{ flex: '1', fontSize: '0.875rem', resize: 'none', lineHeight: 1.5 }}
                  />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                  <button
                    onClick={() => handleDecision(selectedRec.id, 'rejected')}
                    disabled={actionInProgress}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: '1', color: 'var(--danger)', borderColor: 'var(--danger-border)' }}
                  >
                    <XCircle size={14} />
                    {t('reject', language)}
                  </button>

                  <button
                    onClick={() => handleDecision(selectedRec.id, isEditing ? 'edited' : 'approved')}
                    disabled={actionInProgress}
                    className="btn btn-brand"
                    style={{ flex: '2' }}
                  >
                    <Send size={15} />
                    {isEditing ? 'Save & Send' : t('approveAndSend', language)}
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
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#075e54', fontWeight: 700, fontSize: '0.875rem' }}>
                  D
                </div>
                <div style={{ flex: '1' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Diabeto Care</div>
                  <div style={{ fontSize: '0.6875rem', opacity: 0.9 }}>WhatsApp Business</div>
                </div>
                <Phone size={15} color="#ffffff" />
                <MoreVertical size={15} color="#ffffff" />
              </div>

              {/* Chat Body */}
              <div className="phone-chat-body">
                <div className="bubble-outbound">
                  Namaste Ramesh ji! Please send your fasting blood glucose reading.
                  <div style={{ fontSize: '0.6875rem', color: 'var(--ink-2)', textAlign: 'right', marginTop: '2px' }}>8:00 AM</div>
                </div>

                <div className="bubble-inbound">
                  Mera fasting sugar 140 hai
                  <div style={{ fontSize: '0.6875rem', color: 'var(--ink-2)', textAlign: 'right', marginTop: '2px' }}>8:15 AM ✓✓</div>
                </div>

                {/* Live Nudge Preview Bubble */}
                {selectedRec && (
                  <div className="bubble-outbound" style={{ borderLeft: '3px solid var(--brand)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand)', marginBottom: '2px' }}>
                      Coach Recommendation
                    </div>
                    {isEditing ? editedText : selectedRec.message_text}
                    <div style={{ fontSize: '0.6875rem', color: 'var(--ink-2)', textAlign: 'right', marginTop: '4px' }}>
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
