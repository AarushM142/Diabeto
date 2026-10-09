import React, { useState, useEffect } from 'react';
import { 
  Pill, Calendar, AlertTriangle, CheckCircle2, 
  Droplets, Footprints, Video, CalendarCheck, 
  TrendingUp, Award, Bell, Shield, X, User as UserIcon, MessageCircle, AlertCircle,
  Utensils, Camera, Copy, Check, Share2, Phone
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, ReferenceLine 
} from 'recharts';
import { api, type TrendAnalytics, type User } from '../api/client';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import type { PatientSection } from './SidebarNav';

interface PatientPortalProps {
  language: Language;
  currentUser?: User;
  onOpenEditProfile?: () => void;
  activeSection?: PatientSection;
  onOpenMealScanner?: () => void;
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

interface LoggedMealCard {
  id: string;
  mealType: string;
  time: string;
  title: string;
  carbs: number;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  sugarAlert?: string;
  image?: string;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ 
  language, 
  currentUser, 
  onOpenEditProfile,
  activeSection = 'overview',
  onOpenMealScanner,
}) => {
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [hydrationCount, setHydrationCount] = useState<number>(5);
  const [streakCount, setStreakCount] = useState<number>(7);
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [selectedVisitType, setSelectedVisitType] = useState<'clinic' | 'video' | 'whatsapp'>('clinic');
  const [selectedDate, setSelectedDate] = useState<string>('Tomorrow, 10:30 AM');
  const [bookingNotes, setBookingNotes] = useState<string>('Routine 3-month sugar checkup and prescription refill');
  const [bookingToast, setBookingToast] = useState<string | null>(null);
  const [pillToast, setPillToast] = useState<string | null>(null);
  const [doctorCodeCopied, setDoctorCodeCopied] = useState<boolean>(false);
  const [currentFilter, setCurrentFilter] = useState<PatientSection>(activeSection);

  // Sync external section changes from sidebar
  useEffect(() => {
    if (activeSection) {
      setCurrentFilter(activeSection);
    }
  }, [activeSection]);

  // Recent Logged Meals state
  const [loggedMeals] = useState<LoggedMealCard[]>([
    {
      id: 'm1',
      mealType: 'Lunch',
      time: 'Today, 1:30 PM',
      title: '2 Chapatis, Dal Tadka, Bhindi Sabzi',
      carbs: 58,
      impact: 'MEDIUM',
      image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&auto=format&fit=crop&q=80',
    },
    {
      id: 'm2',
      mealType: 'Breakfast',
      time: 'Today, 8:30 AM',
      title: '1 Plain Dosa with Sambar & Coconut Chutney',
      carbs: 42,
      impact: 'LOW',
      image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=300&auto=format&fit=crop&q=80',
    },
  ]);

  // Personalized Patient Profile Data
  const patientProfile = currentUser?.patient_profile;
  const displayName = patientProfile?.name || currentUser?.name || 'Ramesh Kulkarni';
  const age = patientProfile?.age || currentUser?.age || 68;
  const gender = patientProfile?.gender || currentUser?.gender || 'Male';
  const diabetesCondition = patientProfile?.diabetes_type || 'Type 2 Diabetes';
  const caregiverContact = patientProfile?.caregiver_name || 'Ananya (Daughter)';
  const caregiverTel = patientProfile?.caregiver_phone || '+91 98000 00002';
  const targetFastingGoal = patientProfile?.target_fasting_glucose || 130;

  // Medication Schedule with Drug-Exercise & Side Effect Warning Rules
  const [medications, setMedications] = useState<MedicationEntry[]>(() => {
    const customList = patientProfile?.medications;
    if (customList && customList.length > 0) {
      return customList.map((medStr: string, idx: number) => {
        const parts = medStr.split('(');
        const namePart = parts[0].trim();
        const instructions = parts[1] ? parts[1].replace(')', '').trim() : 'Take as prescribed';
        const isNight = namePart.toLowerCase().includes('glimepiride') || namePart.toLowerCase().includes('bedtime') || idx === customList.length - 1;
        const isMorning = idx === 0;

        return {
          id: `med_${idx + 1}`,
          name: namePart,
          dose: namePart.match(/\d+\s*(mg|mcg|units)/i)?.[0] || 'Standard Dose',
          timeSlot: isNight ? 'night' : isMorning ? 'morning' : 'afternoon',
          scheduledTime: isNight ? '8:00 PM' : isMorning ? '8:00 AM' : '1:30 PM',
          instructions: instructions,
          status: idx === 0 ? 'taken' : idx === 1 ? 'taken' : 'due',
          takenAt: idx === 0 ? '8:15 AM' : idx === 1 ? '1:45 PM' : undefined,
          warning: namePart.toLowerCase().includes('glimepiride') ? {
            type: 'exercise',
            title: '⚠️ Sulfonylurea & Evening Exercise Warning',
            description: 'Glimepiride directly stimulates insulin release and significantly lowers blood sugar levels.',
            precaution: 'If taking an evening stroll, do NOT walk vigorously without carrying 2 Marie biscuits or a piece of jaggery in your pocket.',
          } : undefined,
        };
      });
    }

    return [
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
          description: 'Metformin can occasionally cause mild stomach fullness if taken on an empty stomach.',
          precaution: 'Always take during or immediately following your morning breakfast.'
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
          precaution: 'If taking an evening stroll or doing yoga, do NOT exercise vigorously on an empty stomach. Always keep 2 glucose biscuits handy.'
        }
      }
    ];
  });

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const targetId = currentUser?.id?.startsWith('pt_') ? currentUser.id : 'pt_ramesh_001';
        const data = await api.getTrends(targetId, 14);
        setTrends(data);
      } catch (err) {
        console.warn('Backend trends API unavailable, using offline fallback baseline:', err);
        setTrends({
          patient_id: currentUser?.id || 'pt_ramesh_001',
          days: 14,
          glycemic_metrics: {
            total_readings: 28,
            mean_glucose: 132.4,
            median_glucose: 128.0,
            mad_glucose: 14.2,
            min_glucose: 88.0,
            max_glucose: 194.0,
            standard_deviation: 22.1,
            coefficient_of_variation_pct: 16.7,
            tir_percentage: 78.6,
            tar_percentage: 17.8,
            tbr_percentage: 3.6,
            clinical_status: 'optimal_control',
          },
          context_breakdowns: {
            fasting: { count: 14, mean_mgdl: 118.2, min_mgdl: 96, max_mgdl: 138 },
            postprandial: { count: 10, mean_mgdl: 148.5, min_mgdl: 122, max_mgdl: 194 },
            bedtime: { count: 4, mean_mgdl: 124.0, min_mgdl: 110, max_mgdl: 142 },
            random: { count: 0, mean_mgdl: null, min_mgdl: null, max_mgdl: null },
          },
          adherence_metrics: {
            active_medication_count: 3,
            total_confirmed_doses: 42,
            compliance_score_pct: 95.2,
            readings_per_day: 2.0,
            status: 'adherent',
          },
          readings: [
            { measured_at: new Date(Date.now() - 86400000 * 2).toISOString(), mgdl: 124, context: 'fasting' },
            { measured_at: new Date(Date.now() - 86400000 * 1).toISOString(), mgdl: 132, context: 'fasting' },
            { measured_at: new Date().toISOString(), mgdl: 128, context: 'fasting' },
          ],
        });
      }
    };
    fetchTrends();
  }, [currentUser?.id]);

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
    const firstName = displayName.split(' ')[0] || displayName;
    if (language === 'hi') return `नमस्ते ${firstName} जी 🙏`;
    if (language === 'mr') return `नमस्कार ${firstName}जी 🙏`;
    return `Namaste ${firstName} ji 🙏`;
  };

  const getDailyQuote = () => {
    if (language === 'hi') return '“प्रतिदिन भोजन के बाद 15 मिनट की धीमी सैर आपकी शुगर को स्थिर रखती है।”';
    if (language === 'mr') return '“जेवणानंतर १५ मिनिटांची शांत फेरफटका तुमची शुगर संतुलित ठेवण्यास मदत करते.”';
    return '“A gentle 15-minute walk after dinner helps keep your morning fasting sugar in steady, optimal harmony.”';
  };

  const showAll = currentFilter === 'overview';

  return (
    <div className="portal-container">
      {/* Toast Alerts */}
      {pillToast && (
        <div className="botanical-callout ok" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle2 size={18} color="var(--status-ok)" />
          <span style={{ fontWeight: 600, color: 'var(--status-ok)' }}>{pillToast}</span>
        </div>
      )}

      {bookingToast && (
        <div className="botanical-callout ok" style={{ marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarCheck size={18} color="var(--status-ok)" />
          <span style={{ fontWeight: 600, color: 'var(--status-ok)' }}>{bookingToast}</span>
        </div>
      )}

      {/* Modular Card Renderers */}
      {(() => {
        const renderHeroBanner = () => (
          <div className="botanical-card responsive-hero-card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, var(--surface-white) 0%, var(--surface-clay) 100%)', borderLeft: '6px solid var(--accent-sage)', position: 'relative' }}>
            <div className="responsive-hero-content">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span className="status-pill ok">
                    <span className="status-dot ok" />
                    Care Protocol Active
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    backgroundColor: 'var(--surface-clay)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    color: 'var(--text-forest)',
                    fontWeight: 600,
                    border: '1px solid var(--border-stone)',
                  }}>
                    Age: {age} yrs • {gender}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    backgroundColor: 'var(--accent-sage-subtle)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    color: 'var(--accent-sage-dark)',
                    fontWeight: 600,
                    border: '1px solid var(--accent-sage-border)',
                  }}>
                    {diabetesCondition}
                  </span>
                  {onOpenEditProfile && (
                    <button
                      type="button"
                      onClick={onOpenEditProfile}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-sage-dark)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        padding: '2px 4px',
                      }}
                    >
                      Edit Care Profile
                    </button>
                  )}
                </div>
                <h1 className="font-serif" style={{ fontSize: 'clamp(1.4rem, 4vw, 2.0rem)', color: 'var(--text-forest)', margin: 0, fontWeight: 600, lineHeight: 1.2 }}>
                  {getGreeting()}
                </h1>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '640px', fontStyle: 'italic', lineHeight: 1.4 }}>
                  {getDailyQuote()}
                </p>
                
                {/* Quick Profile Summary Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '8px',
                  flexWrap: 'wrap',
                  fontSize: '0.76rem',
                  color: 'var(--text-dim)',
                }}>
                  <span>🎯 Fasting Target: <strong>&le; {targetFastingGoal} mg/dL</strong></span>
                  <span>•</span>
                  <span>👨‍👩‍👧 Caregiver: <strong>{caregiverContact} ({caregiverTel})</strong></span>
                </div>
              </div>

              <div className="responsive-hero-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  background: 'var(--surface-white)',
                  padding: '8px 16px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-stone)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <Award size={24} color="var(--terracotta)" />
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Care Streak
                    </div>
                    <div className="font-serif" style={{ fontSize: '1.2rem', color: 'var(--text-forest)', fontWeight: 700 }}>
                      {streakCount} Days 🌿
                    </div>
                  </div>
                </div>

                {onOpenMealScanner && (
                  <button
                    type="button"
                    onClick={onOpenMealScanner}
                    className="btn btn-secondary"
                    style={{ padding: '10px 16px', fontSize: '0.86rem', borderColor: 'var(--accent-sage-border)', color: 'var(--accent-sage-dark)' }}
                  >
                    <Camera size={15} />
                    Scan Meal Photo
                  </button>
                )}

                <button
                  onClick={() => setShowBookingModal(true)}
                  className="btn btn-primary"
                  style={{ padding: '10px 18px', fontSize: '0.86rem' }}
                >
                  <CalendarCheck size={15} />
                  Book Doctor Visit
                </button>
              </div>
            </div>
          </div>
        );

        const renderMealScannerCard = () => (
          <div className="botanical-card responsive-card" style={{ borderLeft: '6px solid var(--accent-sage)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: 'clamp(1.15rem, 3vw, 1.3rem)', color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Utensils size={20} color="var(--accent-sage)" strokeWidth={1.5} />
                  Indian Meal Intelligence & Food Scanner
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Multimodal Google Gemini Vision estimates Indian dishes, carbs & glycemic curves.
                </p>
              </div>

              {onOpenMealScanner && (
                <button
                  type="button"
                  onClick={onOpenMealScanner}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.82rem', padding: '7px 14px' }}
                >
                  <Camera size={14} />
                  Scan Food Plate
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {loggedMeals.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: 'var(--surface-clay)',
                    border: '1px solid var(--border-stone)',
                    borderRadius: '16px',
                    padding: '12px 14px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  {m.image && (
                    <img
                      src={m.image}
                      alt={m.title}
                      style={{ width: '56px', height: '56px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                        {m.mealType} • {m.time.split(', ')[1]}
                      </span>
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '6px',
                        background: 'var(--surface-white)',
                        color: m.impact === 'HIGH' ? 'var(--terracotta-dark)' : 'var(--status-ok)',
                        border: '1px solid var(--border-stone)',
                      }}>
                        ~{m.carbs}g Carbs
                      </span>
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-forest)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-sage-dark)', fontWeight: 600, marginTop: '2px' }}>
                      {m.impact} Glycemic Impact
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

        const renderMedicationCard = () => (
          <div className="botanical-card responsive-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: 'clamp(1.15rem, 3vw, 1.3rem)', color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Calendar size={19} color="var(--accent-sage)" strokeWidth={1.5} />
                  Visual Medication & Routine Schedule
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Track daily prescribed doses and confirm adherence with 1-tap.
                </p>
              </div>

              <span className="status-pill ok" style={{ fontSize: '0.75rem' }}>
                <CheckCircle2 size={13} color="var(--status-ok)" />
                2 of 3 Doses Taken Today
              </span>
            </div>

            <div className="calendar-week-row" style={{ marginBottom: '14px' }}>
              {calendarDays.map((d, i) => (
                <div
                  key={i}
                  className="calendar-day-cell"
                  style={{
                    background: d.current ? 'var(--accent-sage-subtle)' : 'var(--surface-clay)',
                    border: d.current ? '2px solid var(--accent-sage)' : '1px solid var(--border-stone)',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>{d.label}</div>
                  <div className="font-serif" style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-forest)', margin: '1px 0' }}>
                    {d.date.split(' ')[1] || d.date}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: d.current ? 'var(--status-warn)' : 'var(--status-ok)', fontWeight: 600 }}>
                    {d.count}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {medications.map((med) => {
                const isTaken = med.status === 'taken';

                return (
                  <div
                    key={med.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: isTaken ? 'var(--surface-white)' : 'var(--terracotta-subtle)',
                      border: isTaken ? '1px solid var(--border-stone)' : '1.5px solid var(--terracotta-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', flex: '1' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: isTaken ? 'var(--status-ok-bg)' : 'var(--terracotta-subtle)',
                        border: isTaken ? '1px solid var(--status-ok-border)' : '1px solid var(--terracotta-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Pill size={18} color={isTaken ? 'var(--status-ok)' : 'var(--terracotta)'} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--text-forest)' }}>
                            {med.name}
                          </strong>
                          <span style={{ fontSize: '0.72rem', background: 'var(--surface-clay)', padding: '1px 7px', borderRadius: '8px', color: 'var(--text-muted)' }}>
                            {med.dose}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Scheduled: <strong>{med.scheduledTime}</strong> • {med.instructions}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isTaken ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--status-ok)', fontSize: '0.82rem', fontWeight: 600 }}>
                          <CheckCircle2 size={15} />
                          <span>Taken at {med.takenAt}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleMarkTaken(med.id)}
                          className="btn btn-primary btn-sm"
                          style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                        >
                          <CheckCircle2 size={13} />
                          Mark Taken
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

        const renderDrugPrecautionsCard = () => (
          <div className="botanical-card responsive-card" style={{ borderLeft: '6px solid var(--terracotta)', background: 'var(--surface-white)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <AlertTriangle size={20} color="var(--terracotta)" />
              <h3 className="font-serif" style={{ fontSize: '1.1rem', color: 'var(--text-forest)', margin: 0 }}>
                Clinical Drug Precautions & Exercise Safety
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'var(--terracotta-subtle)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--terracotta-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--terracotta-dark)', fontWeight: 700, fontSize: '0.84rem' }}>
                  <AlertCircle size={15} />
                  <span>Glimepiride & Evening Physical Exertion Precaution:</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-forest)', marginTop: '4px', lineHeight: 1.45, margin: 0 }}>
                  Because you take <strong>Glimepiride 1mg</strong> tonight, your pancreas releases insulin. If taking an evening walk, <strong>do not exercise on an empty stomach</strong>. Always carry 2 glucose biscuits in your pocket.
                </p>
              </div>
            </div>
          </div>
        );

        const renderGlucoseChartCard = () => (
          <div className="botanical-card responsive-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h2 className="font-serif" style={{ fontSize: 'clamp(1.15rem, 3vw, 1.3rem)', color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <TrendingUp size={19} color="var(--accent-sage)" strokeWidth={1.5} />
                  Continuous Blood Sugar & CGM Corridor
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Safe corridor target range: 70 to 180 mg/dL.
                </p>
              </div>

              <div className="status-pill ok">
                <span className="status-dot ok" />
                88% Time in Range
              </div>
            </div>

            <div className="responsive-grid-3" style={{ marginBottom: '16px' }}>
              <div style={{ background: 'var(--surface-clay)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average Sugar</div>
                <div className="font-serif tabular" style={{ fontSize: '1.4rem', color: 'var(--text-forest)', fontWeight: 700, marginTop: '2px' }}>
                  128 <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>mg/dL</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated HbA1c</div>
                <div className="font-serif tabular" style={{ fontSize: '1.4rem', color: 'var(--status-ok)', fontWeight: 700, marginTop: '2px' }}>
                  6.7% <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>(Good)</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hypo Episodes</div>
                <div className="font-serif tabular" style={{ fontSize: '1.4rem', color: 'var(--text-forest)', fontWeight: 700, marginTop: '2px' }}>
                  0 <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>this week</span>
                </div>
              </div>
            </div>

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
                      fontSize: '0.82rem',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  />
                  <ReferenceLine y={180} stroke="var(--terracotta)" strokeDasharray="3 3" label={{ value: 'Target Max (180)', fill: 'var(--terracotta)', fontSize: 10 }} />
                  <ReferenceLine y={70} stroke="var(--status-danger)" strokeDasharray="3 3" label={{ value: 'Target Min (70)', fill: 'var(--status-danger)', fontSize: 10 }} />
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
        );

        const renderRemindersCard = () => (
          <div className="botanical-card responsive-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.12rem', color: 'var(--text-forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bell size={17} color="var(--terracotta)" />
                Smart Daily Reminders
              </h3>
              <span className="status-pill ok" style={{ fontSize: '0.7rem' }}>
                Active
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: 'var(--surface-clay)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--border-stone)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Droplets size={16} color="#4A90E2" />
                    <div>
                      <strong style={{ fontSize: '0.84rem', color: 'var(--text-forest)' }}>Daily Water</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Target: 8 Glasses</div>
                    </div>
                  </div>
                  <strong style={{ fontSize: '0.9rem', color: 'var(--text-forest)' }}>{hydrationCount}/8</strong>
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ flex: '1', background: 'var(--border-stone)', height: '7px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${(hydrationCount / 8) * 100}%`, background: '#4A90E2', height: '100%', transition: 'width 0.3s ease' }} />
                  </div>
                  <button
                    onClick={handleAddWater}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.72rem', padding: '2px 7px' }}
                  >
                    + Glass
                  </button>
                </div>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--border-stone)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Footprints size={16} color="var(--accent-sage-dark)" />
                  <div>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-forest)' }}>15-Min Evening Stroll</strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Scheduled for 8:45 PM after dinner</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--border-stone)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} color="var(--accent-sage)" />
                  <div>
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-forest)' }}>Daily Foot Check</strong>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Check feet for dry spots</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

        const renderDoctorCard = () => (
          <div className="botanical-card" style={{ padding: '20px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.12rem', color: 'var(--text-forest)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserIcon size={17} color="var(--accent-sage)" />
              Attending Physician Touchpoint
            </h3>

            <div style={{ background: 'var(--surface-clay)', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-stone)', marginBottom: '14px' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-forest)' }}>Dr. Arvind Mehta, MD</strong>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>Senior Diabetologist • Pune Central Clinic</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--status-ok)', fontWeight: 600, marginTop: '4px' }}>
                Next Clinic Review: Oct 15, 2026
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => setShowBookingModal(true)}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.84rem', padding: '9px 14px' }}
              >
                <CalendarCheck size={15} />
                Book Clinic Consultation
              </button>

              <a
                href="https://wa.me/918149680369"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.84rem', padding: '9px 14px' }}
              >
                <MessageCircle size={15} />
                Message Clinic Desk
              </a>
            </div>
          </div>
        );

        const renderCareConnectionCard = () => (
          <div className="botanical-card" style={{
            padding: '18px',
            background: 'var(--accent-sage-subtle)',
            border: '1.5px dashed var(--accent-sage-dark)',
            borderRadius: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                Your Care Connection Code
              </span>
              <span className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-forest)', letterSpacing: '0.05em' }}>
                {currentUser?.patient_profile?.connection_code || 'DIA-RAM789'}
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '10px' }}>
              Share this code with your doctor to link your charts & telemetry.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentUser?.patient_profile?.connection_code || 'DIA-RAM789');
                  setDoctorCodeCopied(true);
                  setTimeout(() => setDoctorCodeCopied(false), 2000);
                }}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1, fontSize: '0.76rem', padding: '7px 10px', justifyContent: 'center' }}
              >
                {doctorCodeCopied ? <Check size={13} color="var(--status-ok)" /> : <Copy size={13} />}
                <span>{doctorCodeCopied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Namaste Doctor, here is my Diabeto Care Connection Code: ${currentUser?.patient_profile?.connection_code || 'DIA-RAM789'}.`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary btn-sm"
                style={{ flex: 1, fontSize: '0.76rem', padding: '7px 10px', justifyContent: 'center', background: '#25D366', borderColor: '#25D366' }}
              >
                <Share2 size={13} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        );

        const renderCaregiverCard = () => (
          <div className="botanical-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Primary Caregiver
                </span>
                <strong style={{ fontSize: '0.98rem', color: 'var(--text-forest)', display: 'block', marginTop: '2px' }}>
                  {caregiverContact}
                </strong>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Phone: {caregiverTel}
                </div>
              </div>
              <a
                href={`tel:${caregiverTel}`}
                className="btn btn-secondary btn-sm"
                style={{ padding: '7px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Phone size={13} />
                <span>Call</span>
              </a>
            </div>
          </div>
        );

        const renderMilestonesCard = () => (
          <div className="botanical-card" style={{ padding: '20px' }}>
            <h3 className="font-serif" style={{ fontSize: '1.12rem', color: 'var(--text-forest)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={17} color="var(--terracotta)" />
              Senior Milestones & Badges
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <div style={{ background: 'var(--accent-sage-subtle)', padding: '10px', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--accent-sage-border)' }}>
                <div style={{ fontSize: '1.3rem' }}>🎖️</div>
                <strong style={{ fontSize: '0.76rem', color: 'var(--text-forest)', display: 'block', marginTop: '2px' }}>Pill Master</strong>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>7-day streak</span>
              </div>

              <div style={{ background: 'var(--terracotta-subtle)', padding: '10px', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--terracotta-border)' }}>
                <div style={{ fontSize: '1.3rem' }}>💧</div>
                <strong style={{ fontSize: '0.76rem', color: 'var(--text-forest)', display: 'block', marginTop: '2px' }}>Hydration Star</strong>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Water logged</span>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '10px', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '1.3rem' }}>👟</div>
                <strong style={{ fontSize: '0.76rem', color: 'var(--text-forest)', display: 'block', marginTop: '2px' }}>Gentle Steps</strong>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>Evening walk</span>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '10px', borderRadius: '14px', textAlign: 'center', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '1.3rem' }}>🌿</div>
                <strong style={{ fontSize: '0.76rem', color: 'var(--text-forest)', display: 'block', marginTop: '2px' }}>Calm Harmony</strong>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>0 hypo episodes</span>
              </div>
            </div>
          </div>
        );

        return (
          <>
            {/* 1. Sanctuary Overview (When activeSection is 'overview') */}
            {showAll && (
              <>
                {renderHeroBanner()}

                <div className="responsive-grid-12">
                  <div className="responsive-col-8" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {renderMealScannerCard()}
                    {renderMedicationCard()}
                    {renderDrugPrecautionsCard()}
                    {renderGlucoseChartCard()}
                  </div>
                  <div className="responsive-col-4" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {renderRemindersCard()}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {renderDoctorCard()}
                      {renderCareConnectionCard()}
                    </div>
                    {renderMilestonesCard()}
                  </div>
                </div>
              </>
            )}

            {/* 2. Dedicated Section Pages (Direct, Clean & Clutter-Free) */}
            {!showAll && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* A. Meals Section */}
                {currentFilter === 'meals' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                          Diet & Nutrition
                        </div>
                        <h1 className="font-serif" style={{ fontSize: '1.8rem', color: 'var(--text-forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Utensils size={24} color="var(--accent-sage)" />
                          {t('scanFoodPlate', language)}
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Multimodal Google Gemini Vision estimates Indian dishes, carbs, portion sizes & glycemic curves.
                        </p>
                      </div>
                      {onOpenMealScanner && (
                        <button
                          type="button"
                          onClick={onOpenMealScanner}
                          className="btn btn-primary"
                          style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                        >
                          <Camera size={16} />
                          Scan Food Plate
                        </button>
                      )}
                    </div>
                    {renderMealScannerCard()}
                  </>
                )}

                {/* B. Medications Section */}
                {currentFilter === 'medications' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                          Adherence Protocol
                        </div>
                        <h1 className="font-serif" style={{ fontSize: '1.8rem', color: 'var(--text-forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Pill size={24} color="var(--accent-sage)" />
                          {t('medSchedule', language)}
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Track daily prescribed doses, verify timing, and review clinical exercise precautions.
                        </p>
                      </div>
                      <span className="status-pill ok" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                        <CheckCircle2 size={15} color="var(--status-ok)" />
                        2 of 3 Doses Taken Today
                      </span>
                    </div>
                    {renderMedicationCard()}
                    {renderDrugPrecautionsCard()}
                  </>
                )}

                {/* C. Glucose Section */}
                {currentFilter === 'glucose' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                          Glycemic Telemetry
                        </div>
                        <h1 className="font-serif" style={{ fontSize: '1.8rem', color: 'var(--text-forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <TrendingUp size={24} color="var(--accent-sage)" />
                          {t('myGlucose', language)}
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Continuous glucose monitoring corridor (70–180 mg/dL), average sugar, and estimated A1c analytics.
                        </p>
                      </div>
                      <div className="status-pill ok" style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                        <span className="status-dot ok" />
                        88% Time in Range
                      </div>
                    </div>
                    {renderGlucoseChartCard()}
                  </>
                )}

                {/* D. Care Team Section */}
                {currentFilter === 'careteam' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                          Clinical Network
                        </div>
                        <h1 className="font-serif" style={{ fontSize: '1.8rem', color: 'var(--text-forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <CalendarCheck size={24} color="var(--accent-sage)" />
                          {t('careTeam', language)}
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Attending diabetologist touchpoint, care connection code for chart linking, and family caregiver circle.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowBookingModal(true)}
                        className="btn btn-primary"
                        style={{ padding: '10px 18px', fontSize: '0.88rem' }}
                      >
                        <CalendarCheck size={16} />
                        Book Clinic Consultation
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                      {renderDoctorCard()}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {renderCareConnectionCard()}
                        {renderCaregiverCard()}
                      </div>
                    </div>
                  </>
                )}

                {/* E. Wellness Section */}
                {currentFilter === 'wellness' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                          Healthy Routines
                        </div>
                        <h1 className="font-serif" style={{ fontSize: '1.8rem', color: 'var(--text-forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Award size={24} color="var(--terracotta)" />
                          Hydration, Habits & Senior Milestones
                        </h1>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Daily water intake tracking, gentle post-meal activity, and care streak milestones.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                      {renderRemindersCard()}
                      {renderMilestonesCard()}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        );
      })()}

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
          <div className="botanical-card" style={{ width: '100%', maxWidth: '500px', padding: '28px', position: 'relative' }}>
            <button
              onClick={() => setShowBookingModal(false)}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} color="var(--text-forest)" />
            </button>

            <h2 className="font-serif" style={{ fontSize: '1.4rem', color: 'var(--text-forest)', marginBottom: '4px' }}>
              Schedule Doctor Consultation
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Book an appointment with Dr. Arvind Mehta, MD at Pune Central Clinic.
            </p>

            {/* Visit Type Select */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', display: 'block', marginBottom: '6px' }}>
                Consultation Format:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedVisitType('clinic')}
                  className={selectedVisitType === 'clinic' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '0.78rem', padding: '7px 8px', justifyContent: 'center' }}
                >
                  🏥 Clinic OPD
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVisitType('video')}
                  className={selectedVisitType === 'video' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '0.78rem', padding: '7px 8px', justifyContent: 'center' }}
                >
                  <Video size={13} /> Video Call
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedVisitType('whatsapp')}
                  className={selectedVisitType === 'whatsapp' ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ fontSize: '0.78rem', padding: '7px 8px', justifyContent: 'center' }}
                >
                  <MessageCircle size={13} /> WhatsApp
                </button>
              </div>
            </div>

            {/* Date & Time */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', display: 'block', marginBottom: '6px' }}>
                Preferred Slot:
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', background: 'var(--surface-white)', color: 'var(--text-forest)', fontSize: '0.85rem' }}
              >
                <option value="Tomorrow, 10:30 AM">Tomorrow, 10:30 AM (Morning OPD)</option>
                <option value="Tomorrow, 4:30 PM">Tomorrow, 4:30 PM (Evening OPD)</option>
                <option value="Friday, 11:00 AM">Friday, 11:00 AM (Morning OPD)</option>
                <option value="Saturday, 10:00 AM">Saturday, 10:00 AM (Senior Priority)</option>
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-forest)', display: 'block', marginBottom: '6px' }}>
                Checkup Reason / Symptoms:
              </label>
              <input
                type="text"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                placeholder="e.g. Sugar checkup, foot tingling, medicine refill"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', background: 'var(--surface-white)', color: 'var(--text-forest)', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.84rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBookAppointment}
                className="btn btn-primary"
                style={{ fontSize: '0.84rem', padding: '8px 20px' }}
              >
                <CheckCircle2 size={15} />
                Confirm Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
