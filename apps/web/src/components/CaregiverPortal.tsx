import React from 'react';
import { 
  HeartHandshake, CheckCircle2, Phone, MessageSquare, ShieldCheck, 
  Clock, Pill, Calendar, HeartPulse, AlertCircle
} from 'lucide-react';

export const CaregiverPortal: React.FC = () => {
  return (
    <div style={{ padding: '28px 20px', maxWidth: '840px', margin: '0 auto' }}>
      {/* Top Banner: Is my parent OK? */}
      <div className="panel" style={{ padding: '24px', marginBottom: '20px', borderLeft: '5px solid var(--ok)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '8px',
              background: 'var(--brand-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <HeartHandshake size={24} color="var(--brand)" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)' }}>
                  Ramesh is doing well today
                </h2>
                <span className="status-indicator ok">
                  <span className="status-dot ok" />
                  Normal
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>
                Father • Age 68 • Pune • WhatsApp Connected
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <a
              href="https://wa.me/918149680369"
              target="_blank"
              rel="noreferrer"
              className="btn btn-brand btn-sm"
            >
              <MessageSquare size={14} />
              WhatsApp Papa
            </a>
            <a
              href="tel:+918149680369"
              className="btn btn-secondary btn-sm"
            >
              <Phone size={14} />
              Call Directly
            </a>
          </div>
        </div>
      </div>

      {/* Main Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {/* Today's Health Snapshot */}
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase' }}>
              Latest Sugar Reading
            </span>
            <HeartPulse size={16} color="var(--ok)" />
          </div>

          <div className="tabular" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--ok)', lineHeight: 1 }}>
            140 <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink-2)' }}>mg/dL</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--ok)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} />
            <span>Fasting • In Target Range (70–180)</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: '8px' }}>
            Logged via Voice Note at 8:15 AM
          </p>
        </div>

        {/* Medication Compliance */}
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase' }}>
              Today's Medicine
            </span>
            <Pill size={16} color="var(--brand)" />
          </div>

          <div className="tabular" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
            100% <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink-2)' }}>Taken</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--ink)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} color="var(--ok)" />
            <span>Metformin 500mg taken</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: '8px' }}>
            Next: Glimepiride 1mg at 8:00 PM
          </p>
        </div>

        {/* Weekly Adherence Streak */}
        <div className="panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-2)', textTransform: 'uppercase' }}>
              Reporting Streak
            </span>
            <Calendar size={16} color="var(--brand)" />
          </div>

          <div className="tabular" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--brand)', lineHeight: 1 }}>
            7 <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--ink-2)' }}>Days</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--brand)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} />
            <span>Zero critical episodes this week</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginTop: '8px' }}>
            Escalation level: Normal
          </p>
        </div>
      </div>

      {/* Activity Timeline & Safety Contacts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px' }}>
        {/* Left: Today's Timeline (7 cols) */}
        <div className="panel" style={{ gridColumn: 'span 7', padding: '20px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} color="var(--brand)" />
            Today's Care Timeline
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={14} color="var(--ok)" />
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--ink)' }}>Morning Fasting Sugar Recorded</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>8:15 AM</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', marginTop: '2px' }}>
                  140 mg/dL logged via WhatsApp Voice Note. Status: Normal.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Pill size={14} color="var(--ink)" />
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--ink)' }}>Morning Dose Confirmed</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>8:32 AM</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', marginTop: '2px' }}>
                  Metformin 500mg taken after breakfast.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--warn-bg)', border: '1px solid var(--warn-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={14} color="var(--warn)" />
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--ink)' }}>Evening Pill Reminder Scheduled</strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>8:00 PM</span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--ink-2)', marginTop: '2px' }}>
                  Automated WhatsApp reminder will prompt for Glimepiride 1mg.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Care Network & Escalation Contacts (5 cols) */}
        <div className="panel" style={{ gridColumn: 'span 5', padding: '20px' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="var(--brand)" />
            Care Team Network
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--ink)' }}>Dr. Arvind Mehta</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)' }}>Attending Diabetologist</div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--ink-2)' }}>MD Clinician</span>
              </div>
            </div>

            <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.875rem', color: 'var(--ink)' }}>Sister Kavita R.</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)' }}>Assigned Care Coach</div>
                </div>
                <span className="status-indicator ok">
                  <span className="status-dot ok" />
                  Online
                </span>
              </div>
            </div>

            <div className="callout danger" style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 600, fontSize: '0.8125rem' }}>
                <AlertCircle size={14} />
                <span>Emergency Safety Protocol</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--ink)', marginTop: '4px' }}>
                If critical hypo is unacknowledged within 15 mins, Diabeto will call your phone automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
