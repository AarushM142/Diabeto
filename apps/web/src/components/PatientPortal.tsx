import React, { useState, useEffect } from 'react';
import { 
  Pill, Calendar, AlertTriangle, CheckCircle2, 
  Droplets, Footprints, Video, CalendarCheck, 
  TrendingUp, Award, Bell, Shield, X, User, MessageCircle, AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, ReferenceLine 
} from 'recharts';
import { api, type TrendAnalytics } from '../api/client';
import type { Language } from '../lib/types';

interface PatientPortalProps {
  language: Language;
}

interface MedicationEntry {
  id: string;
  name: string;
  dose: string;
  timeSlot: 'morning' | 'afternoon' | 'night';
  scheduledTime: string;
  instructions: string;
  status: 'taken' | 'scheduled' | 'due' | 'missed';
  takenAt?: string;
  warning?: {
    type: 'exercise' | 'gi' | 'hypo';
    title: string;
    description: string;
    precaution: string;
  };
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ language }) => {
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [hydrationCount, setHydrationCount] = useState<number>(5);
  const [streakCount, setStreakCount] = useState<number>(7);
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [selectedVisitType, setSelectedVisitType] = useState<'clinic' | 'video' | 'whatsapp'>('clinic');
  const [selectedDate, setSelectedDate] = useState<string>('Tomorrow, 10:30 AM');
  const [bookingNotes, setBookingNotes] = useState<string>('Routine 3-month sugar checkup and prescription refill');
  const [bookingToast, setBookingToast] = useState<string | null>(null);
  const [pillToast, setPillToast] = useState<string | null>(null);

  // Medication Schedule with Drug-Exercise & Side Effect Warning Rules
  const [medications, setMedications] = useState<MedicationEntry[]>([
    {
      id: 'med_1',
      name: 'Metformin Hydrochloride',
      dose: '500 mg',
      timeSlot: 'morning',
      scheduledTime: '8:00 AM',
      instructions: 'Take with breakfast',
      status: 'taken',
      takenAt: '8:15 AM',
      warning: {
        type: 'gi',
        title: 'Gastric Comfort Alert',
        description: 'Metformin can occasionally cause mild stomach fullness or acidity if taken on an empty stomach.',
        precaution: 'Always take during or immediately following your morning breakfast (e.g. with Poha or Upma).'
      }
    },
    {
      id: 'med_2',
      name: 'Teneligliptin',
      dose: '20 mg',
      timeSlot: 'afternoon',
      scheduledTime: '1:30 PM',
      instructions: 'Take after lunch',
      status: 'taken',
      takenAt: '1:45 PM',
      warning: {
        type: 'gi',
        title: 'Steady Glycemic Control',
        description: 'DPP-4 inhibitor that gently regulates post-meal sugar peaks with very low hypoglycemia risk.',
        precaution: 'Maintain steady meal timings; drink adequate water throughout the afternoon.'
      }
    },
    {
      id: 'med_3',
      name: 'Glimepiride',
      dose: '1 mg',
      timeSlot: 'night',
      scheduledTime: '8:00 PM',
      instructions: 'Take 15 minutes before dinner',
      status: 'due',
      warning: {
        type: 'exercise',
        title: '⚠️ Sulfonylurea & Evening Exercise Warning',
        description: 'Glimepiride directly stimulates insulin release and significantly lowers blood sugar levels.',
        precaution: 'If taking an evening stroll or doing yoga after dinner, do NOT walk vigorously or briskly without carrying 2 Marie biscuits or a small piece of jaggery in your pocket.'
      }
    }
  ]);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const data = await api.getTrends('pt_ramesh_001', 14);
        setTrends(data);
      } catch (err) {
        console.error('Failed to load trends for patient:', err);
      }
    };
    fetchTrends();
  }, []);

  const handleMarkTaken = (medId: string) => {
    setMedications(prev => prev.map(m => {
      if (m.id === medId) {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return { ...m, status: 'taken', takenAt: now };
      }
      return m;
    }));
    setPillToast('Night medication (Glimepiride 1mg) confirmed! Adherence streak updated ✅');
    setStreakCount(c => c + 1);
    setTimeout(() => setPillToast(null), 4000);
  };

  const handleAddWater = () => {
    if (hydrationCount < 8) {
      setHydrationCount(prev => prev + 1);
    }
  };

  const handleBookAppointment = async () => {
    try {
      await api.bookAppointment({
        patient_id: 'pt_ramesh_001',
        doctor_id: 'doc_mehta_101',
        type: selectedVisitType,
        date: selectedDate,
        time_slot: 'Morning OPD',
        notes: bookingNotes,
      });
      setShowBookingModal(false);
      setBookingToast(`Consultation with Dr. Arvind Mehta confirmed for ${selectedDate}! Confirmation sent to your WhatsApp.`);
      setTimeout(() => setBookingToast(null), 5000);
    } catch (err) {
      alert('Booking error: ' + err);
    }
  };

  // 7-day visual calendar days
  const calendarDays = [
    { label: 'Mon', date: 'Oct 3', status: 'all_taken', count: '3/3' },
    { label: 'Tue', date: 'Oct 4', status: 'all_taken', count: '3/3' },
    { label: 'Wed', date: 'Oct 5', status: 'all_taken', count: '3/3' },
    { label: 'Thu', date: 'Oct 6', status: 'all_taken', count: '3/3' },
    { label: 'Fri', date: 'Oct 7', status: 'all_taken', count: '3/3' },
    { label: 'Sat', date: 'Oct 8', status: 'all_taken', count: '3/3' },
    { label: 'Sun', date: 'Today', status: 'partial', count: '2/3', current: true },
  ];

  // Glucose Chart Data fallback
  const chartData = trends?.readings && trends.readings.length > 0 
    ? trends.readings.map((r, i) => ({
        time: new Date(r.measured_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${r.context}`,
        mgdl: r.mgdl > 0 ? r.mgdl : 130 + (i % 4) * 10,
        context: r.context,
      }))
    : [
        { time: 'Mon Fasting', mgdl: 122 },
        { time: 'Mon Post-Lunch', mgdl: 154 },
        { time: 'Tue Fasting', mgdl: 118 },
        { time: 'Tue Post-Lunch', mgdl: 148 },
        { time: 'Wed Fasting', mgdl: 125 },
        { time: 'Wed Post-Lunch', mgdl: 160 },
        { time: 'Thu Fasting', mgdl: 130 },
        { time: 'Thu Post-Lunch', mgdl: 142 },
        { time: 'Fri Fasting', mgdl: 115 },
        { time: 'Fri Post-Lunch', mgdl: 150 },
        { time: 'Sat Fasting', mgdl: 128 },
        { time: 'Sat Post-Lunch', mgdl: 155 },
        { time: 'Today Fasting', mgdl: 140 },
      ];

  const getGreeting = () => {
    if (language === 'hi') return 'नमस्ते रमेश जी 🙏';
    if (language === 'mr') return 'नमस्कार रमेशजी 🙏';
    return 'Namaste Ramesh ji 🙏';
  };

  const getDailyQuote = () => {
    if (language === 'hi') return '“प्रतिदिन भोजन के बाद 15 मिनट की धीमी सैर आपकी शुगर को स्थिर रखती है।”';
    if (language === 'mr') return '“जेवणानंतर १५ मिनिटांची शांत फेरफटका तुमची शुगर संतुलित ठेवण्यास मदत करते.”';
    return '“A gentle 15-minute walk after dinner helps keep your morning fasting sugar in steady, optimal harmony.”';
  };

  return (
    <div className="portal-container">
      {/* Toast Alerts */}
      {pillToast && (
        <div className="botanical-callout ok" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="var(--status-ok)" />
          <span style={{ fontWeight: 600, color: 'var(--status-ok)' }}>{pillToast}</span>
        </div>
      )}

      {bookingToast && (
        <div className="botanical-callout ok" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarCheck size={18} color="var(--status-ok)" />
          <span style={{ fontWeight: 600, color: 'var(--status-ok)' }}>{bookingToast}</span>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="botanical-card responsive-hero-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, var(--surface-white) 0%, var(--surface-clay) 100%)', borderLeft: '6px solid var(--accent-sage)', position: 'relative' }}>
        <div className="responsive-hero-content">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <span className="status-pill ok">
                <span className="status-dot ok" />
                Care Protocol Active
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Pune Central Diabetes Clinic • Dr. Arvind Mehta
              </span>
            </div>
            <h1 className="font-serif" style={{ fontSize: 'clamp(1.45rem, 4vw, 2.1rem)', color: 'var(--text-forest)', margin: 0, fontWeight: 600, lineHeight: 1.2 }}>
              {getGreeting()}
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '640px', fontStyle: 'italic', lineHeight: 1.4 }}>
              {getDailyQuote()}
            </p>
          </div>

          <div className="responsive-hero-actions">
            <div style={{
              background: 'var(--surface-white)',
              padding: '10px 18px',
              borderRadius: '20px',
              border: '1px solid var(--border-stone)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: 'var(--shadow-sm)',
              width: '100%',
              maxWidth: '260px',
            }}>
              <Award size={26} color="var(--terracotta)" />
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Steady Care Streak
                </div>
                <div className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--text-forest)', fontWeight: 700 }}>
                  {streakCount} Days 🌿
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowBookingModal(true)}
              className="btn btn-primary"
              style={{ padding: '12px 22px', fontSize: '0.9rem' }}
            >
              <CalendarCheck size={16} />
              Book Doctor Visit
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="responsive-grid-12">
        
        {/* Left Column (8 cols): Medication Calendar, Warnings, & Graphical CGM Analysis */}
        <div className="responsive-col-8">
          
          {/* 1. Visual Medication Calendar & Daily Schedule */}
          <div className="botanical-card responsive-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: 'clamp(1.15rem, 3vw, 1.35rem)', color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Calendar size={20} color="var(--accent-sage)" strokeWidth={1.5} />
                  Visual Medication & Routine Calendar
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Track daily prescribed doses and log adherence with one gentle tap.
                </p>
              </div>

              <span className="status-pill ok" style={{ fontSize: '0.75rem' }}>
                <CheckCircle2 size={13} color="var(--status-ok)" />
                2 of 3 Doses Taken Today
              </span>
            </div>

            {/* 7-Day Week Scroller */}
            <div className="calendar-week-row">
              {calendarDays.map((d, i) => (
                <div
                  key={i}
                  className="calendar-day-cell"
                  style={{
                    background: d.current ? 'var(--accent-sage-subtle)' : 'var(--surface-clay)',
                    border: d.current ? '2px solid var(--accent-sage)' : '1px solid var(--border-stone)',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>{d.label}</div>
                  <div className="font-serif" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-forest)', margin: '2px 0' }}>
                    {d.date.split(' ')[1] || d.date}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: d.current ? 'var(--status-warn)' : 'var(--status-ok)', fontWeight: 600 }}>
                    {d.count}
                  </div>
                </div>
              ))}
            </div>

            {/* Today's Dose Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {medications.map((med) => {
                const isTaken = med.status === 'taken';

                return (
                  <div
                    key={med.id}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '18px',
                      background: isTaken ? 'var(--surface-white)' : 'var(--terracotta-subtle)',
                      border: isTaken ? '1px solid var(--border-stone)' : '1.5px solid var(--terracotta-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px', flex: '1' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: isTaken ? 'var(--status-ok-bg)' : 'var(--terracotta-subtle)',
                        border: isTaken ? '1px solid var(--status-ok-border)' : '1px solid var(--terracotta-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Pill size={20} color={isTaken ? 'var(--status-ok)' : 'var(--terracotta)'} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text-forest)' }}>
                            {med.name}
                          </strong>
                          <span style={{ fontSize: '0.75rem', background: 'var(--surface-clay)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-muted)' }}>
                            {med.dose}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Scheduled: <strong>{med.scheduledTime}</strong> • {med.instructions}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'auto' }}>
                      {isTaken ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-ok)', fontSize: '0.85rem', fontWeight: 600 }}>
                          <CheckCircle2 size={16} />
                          <span>Taken at {med.takenAt}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarkTaken(med.id)}
                          className="btn btn-primary"
                          style={{ padding: '8px 18px', fontSize: '0.84rem' }}
                        >
                          <CheckCircle2 size={14} />
                          Mark Taken
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Clinical Drug-Exercise & Side Effect Warning Callout */}
          <div className="botanical-card responsive-card" style={{ borderLeft: '6px solid var(--terracotta)', background: 'var(--surface-white)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <AlertTriangle size={22} color="var(--terracotta)" />
              <h3 className="font-serif" style={{ fontSize: 'clamp(1.05rem, 2.5vw, 1.18rem)', color: 'var(--text-forest)', margin: 0 }}>
                Clinical Drug Interactions & Exercise Safety Protocol
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div style={{ background: 'var(--terracotta-subtle)', padding: '14px 18px', borderRadius: '16px', border: '1px solid var(--terracotta-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--terracotta-dark)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <AlertCircle size={16} />
                  <span>Glimepiride (Sulfonylurea) & Physical Exertion Rule:</span>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-forest)', marginTop: '4px', lineHeight: 1.5 }}>
                  Because you are taking <strong>Glimepiride 1mg</strong> tonight, your pancreas releases extra insulin. If you plan an evening walk, brisk strolling, or gardening, <strong>do not exercise on an empty stomach</strong>. Always keep 2 glucose biscuits or a small banana in your pocket to prevent sudden shakiness or hypoglycemia.
                </p>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '14px 18px', borderRadius: '16px', border: '1px solid var(--border-stone)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-forest)', fontWeight: 700, fontSize: '0.88rem' }}>
                  <Shield size={16} color="var(--accent-sage)" />
                  <span>Metformin Digestibility Rule:</span>
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
                  Always take Metformin with or immediately after food. Taking it on an empty stomach may cause nausea or acid reflux.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Graphical Analysis & CGM Trends */}
          <div className="botanical-card responsive-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: 'clamp(1.15rem, 3vw, 1.35rem)', color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <TrendingUp size={20} color="var(--accent-sage)" strokeWidth={1.5} />
                  Continuous Blood Sugar Curve & Target Corridor
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Shaded green corridor represents your safe target range (70 to 180 mg/dL).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="status-pill ok">
                  <span className="status-dot ok" />
                  88% Time in Range
                </div>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="responsive-grid-3" style={{ marginBottom: '20px' }}>
              <div style={{ background: 'var(--surface-clay)', padding: '14px 18px', borderRadius: '16px', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average Sugar</div>
                <div className="font-serif tabular" style={{ fontSize: '1.5rem', color: 'var(--text-forest)', fontWeight: 700, marginTop: '2px' }}>
                  128 <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>mg/dL</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '14px 18px', borderRadius: '16px', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated HbA1c</div>
                <div className="font-serif tabular" style={{ fontSize: '1.5rem', color: 'var(--status-ok)', fontWeight: 700, marginTop: '2px' }}>
                  6.7% <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>(Good)</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '14px 18px', borderRadius: '16px', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Critical Hypo Events</div>
                <div className="font-serif tabular" style={{ fontSize: '1.5rem', color: 'var(--text-forest)', fontWeight: 700, marginTop: '2px' }}>
                  0 <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>this week</span>
                </div>
              </div>
            </div>

            {/* Recharts Area Curve */}
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="patientGlucoseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-sage)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent-sage)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                  <YAxis domain={[50, 220]} stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface-white)',
                      border: '1px solid var(--border-stone)',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  />
                  <ReferenceLine y={180} stroke="var(--terracotta)" strokeDasharray="3 3" label={{ value: 'Target Upper (180)', fill: 'var(--terracotta)', fontSize: 10 }} />
                  <ReferenceLine y={70} stroke="var(--status-danger)" strokeDasharray="3 3" label={{ value: 'Target Lower (70)', fill: 'var(--status-danger)', fontSize: 10 }} />
                  <Area
                    type="monotone"
                    dataKey="mgdl"
                    name="Blood Sugar (mg/dL)"
                    stroke="var(--accent-sage-dark)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#patientGlucoseGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Smart Reminders, Doctor Touchpoint & Streaks */}
        <div className="responsive-col-4">
          
          {/* Smart Daily Reminders Card */}
          <div className="botanical-card responsive-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.18rem', color: 'var(--text-forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={18} color="var(--terracotta)" />
                Smart Daily Reminders
              </h3>
              <span className="status-pill ok" style={{ fontSize: '0.72rem' }}>
                Active
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Reminder 1: Night Pill */}
              <div style={{ background: 'var(--terracotta-subtle)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--terracotta-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Pill size={18} color="var(--terracotta)" style={{ marginTop: '2px' }} />
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-forest)' }}>Night Dose (Glimepiride)</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Due at 8:00 PM before dinner</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reminder 2: Hydration Goal */}
              <div style={{ background: 'var(--surface-clay)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-stone)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Droplets size={18} color="#4A90E2" />
                    <div>
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-forest)' }}>Daily Hydration</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: 8 Glasses (2L)</div>
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-forest)' }}>{hydrationCount}/8</strong>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' }}>
                  <div style={{ flex: '1', background: 'var(--border-stone)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(hydrationCount / 8) * 100}%`, background: '#4A90E2', height: '100%', transition: 'width 0.3s ease' }} />
                  </div>
                  <button
                    onClick={handleAddWater}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                  >
                    + Glass
                  </button>
                </div>
              </div>

              {/* Reminder 3: Post-Meal Stroll */}
              <div style={{ background: 'var(--surface-clay)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-stone)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Footprints size={18} color="var(--accent-sage-dark)" />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-forest)' }}>15-Min Evening Stroll</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Scheduled for 8:45 PM after dinner</div>
                  </div>
                </div>
              </div>

              {/* Reminder 4: Foot Health Check */}
              <div style={{ background: 'var(--surface-clay)', padding: '14px 16px', borderRadius: '16px', border: '1px solid var(--border-stone)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield size={18} color="var(--accent-sage)" />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-forest)' }}>Daily Foot Check</strong>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Check feet for dry skin or red spots</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Doctor Touchpoint & 1-Click Consultation */}
          <div className="botanical-card" style={{ padding: '24px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.18rem', color: 'var(--text-forest)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--accent-sage)" />
              Attending Physician Touchpoint
            </h3>

            <div style={{ background: 'var(--surface-clay)', padding: '16px', borderRadius: '18px', border: '1px solid var(--border-stone)', marginBottom: '16px' }}>
              <strong style={{ fontSize: '0.95rem', color: 'var(--text-forest)' }}>Dr. Arvind Mehta, MD</strong>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>Senior Diabetologist • Pune Central Clinic</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--status-ok)', fontWeight: 600, marginTop: '6px' }}>
                Next Clinic Review: Oct 15, 2026
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => setShowBookingModal(true)}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <CalendarCheck size={16} />
                Book Clinic Consultation
              </button>

              <a
                href="https://wa.me/918149680369"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <MessageCircle size={16} />
                Message Clinic Desk
              </a>
            </div>
          </div>

          {/* Streaks & Encouragement Badges */}
          <div className="botanical-card" style={{ padding: '24px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.18rem', color: 'var(--text-forest)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="var(--terracotta)" />
              Senior Milestones & Badges
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ background: 'var(--accent-sage-subtle)', padding: '12px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--accent-sage-border)' }}>
                <div style={{ fontSize: '1.4rem' }}>🎖️</div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-forest)', display: 'block', marginTop: '4px' }}>Pill Master</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>7-day perfect dose</span>
              </div>

              <div style={{ background: 'var(--terracotta-subtle)', padding: '12px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--terracotta-border)' }}>
                <div style={{ fontSize: '1.4rem' }}>💧</div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-forest)', display: 'block', marginTop: '4px' }}>Hydration Star</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Daily water logged</span>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '12px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '1.4rem' }}>👟</div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-forest)', display: 'block', marginTop: '4px' }}>Gentle Steps</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Post-dinner walk</span>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '12px', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '1.4rem' }}>🌿</div>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-forest)', display: 'block', marginTop: '4px' }}>Calm Harmony</strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>0 hypo episodes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Booking Modal */}
      {showBookingModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(45, 58, 49, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '16px',
        }}>
          <div className="botanical-card" style={{ width: '100%', maxWidth: '520px', padding: '32px', position: 'relative' }}>
            <button
              onClick={() => setShowBookingModal(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} color="var(--text-forest)" />
            </button>

            <h2 className="font-serif" style={{ fontSize: '1.45rem', color: 'var(--text-forest)', marginBottom: '6px' }}>
              Schedule Doctor Consultation
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Book an appointment with Dr. Arvind Mehta, MD at Pune Central Clinic.
            </p>

            {/* Visit Type Select */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-forest)', display: 'block', marginBottom: '8px' }}>
                Consultation Format:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedVisitType('clinic')}
                  className={selectedVisitType === 'clinic' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '0.8rem', padding: '8px 10px', justifyContent: 'center' }}
                >
                  🏥 Clinic OPD
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVisitType('video')}
                  className={selectedVisitType === 'video' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '0.8rem', padding: '8px 10px', justifyContent: 'center' }}
                >
                  <Video size={14} /> Video Call
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVisitType('whatsapp')}
                  className={selectedVisitType === 'whatsapp' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '0.8rem', padding: '8px 10px', justifyContent: 'center' }}
                >
                  💬 WhatsApp
                </button>
              </div>
            </div>

            {/* Preferred Slot */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-forest)', display: 'block', marginBottom: '8px' }}>
                Select Available Slot:
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-stone)', background: 'var(--surface-clay)', fontSize: '0.9rem', color: 'var(--text-forest)' }}
              >
                <option value="Tomorrow, 10:30 AM">Tomorrow, 10:30 AM (Morning OPD)</option>
                <option value="Tomorrow, 4:00 PM">Tomorrow, 4:00 PM (Evening OPD)</option>
                <option value="Thursday, 11:00 AM">Thursday, 11:00 AM (Morning OPD)</option>
                <option value="Saturday, 5:30 PM">Saturday, 5:30 PM (Weekend OPD)</option>
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-forest)', display: 'block', marginBottom: '8px' }}>
                Reason / Symptoms for Dr. Mehta:
              </label>
              <textarea
                rows={3}
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                className="textarea-botanical"
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBookAppointment}
                className="btn btn-primary"
              >
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
