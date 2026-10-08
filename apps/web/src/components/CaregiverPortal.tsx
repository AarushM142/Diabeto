import React from 'react';
import { 
  HeartHandshake, CheckCircle2, Phone, MessageSquare, ShieldCheck, 
  Clock, Pill, Calendar, HeartPulse, AlertCircle
} from 'lucide-react';


export const CaregiverPortal: React.FC = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div className="glass-panel glass-panel-glow-emerald" style={{ padding: '24px', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)',
            }}>
              <HeartHandshake size={32} color="#ffffff" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                  Caregiver Peace-of-Mind Portal
                </h2>
                <span className="badge badge-success">
                  All Clear
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                Connected to <strong>Ramesh Kulkarni</strong> (Father • Age 68 • Pune)
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href="https://wa.me/918149680369"
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 16px' }}
            >
              <MessageSquare size={16} />
              WhatsApp Papa
            </a>
            <a
              href="tel:+918149680369"
              className="btn btn-secondary btn-sm"
              style={{ padding: '8px 16px' }}
            >
              <Phone size={16} />
              Call Directly
            </a>
          </div>
        </div>
      </div>

      {/* Main Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Today's Health Snapshot (4 cols) */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Latest Sugar Reading
            </span>
            <HeartPulse size={18} color="#10b981" />
          </div>

          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#34d399', lineHeight: 1 }}>
            140 <span style={{ fontSize: '1rem', color: '#94a3b8' }}>mg/dL</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6ee7b7', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} />
            <span>Fasting • In Target Range (70–180)</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '12px' }}>
            Logged via Hindi WhatsApp Voice Note at 8:15 AM
          </p>
        </div>

        {/* Medication Compliance (4 cols) */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Today's Medication
            </span>
            <Pill size={18} color="#06b6d4" />
          </div>

          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#38bdf8', lineHeight: 1 }}>
            100% <span style={{ fontSize: '1rem', color: '#94a3b8' }}>Taken</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#7dd3fc', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} />
            <span>Metformin 500mg confirmed on time</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '12px' }}>
            Next scheduled: Glimepiride 1mg at 8:00 PM
          </p>
        </div>

        {/* Weekly Adherence Streak (4 cols) */}
        <div className="glass-panel" style={{ gridColumn: 'span 4', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
              Reporting Streak
            </span>
            <Calendar size={18} color="#a855f7" />
          </div>

          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#c084fc', lineHeight: 1 }}>
            7 <span style={{ fontSize: '1rem', color: '#94a3b8' }}>Days</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#d8b4fe', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} />
            <span>Zero critical episodes this week</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '12px' }}>
            Care team escalation level: Tier 0 (Normal)
          </p>
        </div>
      </div>

      {/* Activity Timeline & Safety Contacts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px' }}>
        {/* Left: Today's Timeline (7 cols) */}
        <div className="glass-panel" style={{ gridColumn: 'span 7', padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#06b6d4" />
            Today's Care Timeline
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle2 size={16} color="#34d399" />
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>Morning Fasting Glucose Recorded</strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>8:15 AM</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px' }}>
                  140 mg/dL logged via WhatsApp Voice Note. Status: Normal.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid #06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Pill size={16} color="#38bdf8" />
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>Morning Dose Confirmed</strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>8:32 AM</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px' }}>
                  Metformin 500mg taken after breakfast.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={16} color="#fbbf24" />
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>Evening Pill Reminder Scheduled</strong>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>8:00 PM</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '2px' }}>
                  Automated WhatsApp reminder will prompt for Glimepiride 1mg.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Care Network & Escalation Contacts (5 cols) */}
        <div className="glass-panel" style={{ gridColumn: 'span 5', padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#10b981" />
            Care Team Network
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(7, 10, 19, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>Dr. Arvind Mehta</strong>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Attending Diabetologist</div>
                </div>
                <span className="badge badge-info">Verified MD</span>
              </div>
            </div>

            <div style={{ background: 'rgba(7, 10, 19, 0.6)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: '#ffffff' }}>Sister Kavita R.</strong>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Assigned Care Coach</div>
                </div>
                <span className="badge badge-success">Online</span>
              </div>
            </div>

            <div style={{ background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', padding: '12px', borderRadius: '10px', marginTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fb7185', fontWeight: 700, fontSize: '0.8rem' }}>
                <AlertCircle size={16} />
                <span>Emergency Escalation Protocol</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#e2e8f0', marginTop: '4px' }}>
                If Papa does not reply to critical hypo alerts within 15 minutes, Diabeto calls your registered mobile number automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
