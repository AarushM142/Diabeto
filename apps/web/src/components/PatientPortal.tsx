import React, { useState, useEffect } from 'react';
import { 
  Pill, Calendar, AlertTriangle, CheckCircle2, 
  Droplets, Footprints, Video, CalendarCheck, 
  TrendingUp, Award, Bell, Shield, X, User as UserIcon, MessageCircle, AlertCircle,
  Utensils, Camera, Copy, Check, Phone, Plus,
  HeartHandshake, Link, Stethoscope
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, ReferenceLine 
} from 'recharts';
import { api, type TrendAnalytics, type User, type ConnectionCodeResponse } from '../api/client';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import { CareGroupChat } from './CareGroupChat';
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
  const [showChartQuickLog, setShowChartQuickLog] = useState<boolean>(false);
  const [chartQuickLogValue, setChartQuickLogValue] = useState<string>('');
  const [chartQuickLogContext, setChartQuickLogContext] = useState<string>('fasting');
  const [isSavingChartSugar, setIsSavingChartSugar] = useState<boolean>(false);
  const [localLoggedReadings, setLocalLoggedReadings] = useState<Array<{ time: string; mgdl: number; context: string }>>(() => {
    try {
      const cached = localStorage.getItem(`diabeto_glucose_history_${currentUser?.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [connectionCode, setConnectionCode] = useState<string>(
    currentUser?.patient_profile?.connection_code || ''
  );
  const [careConnection, setCareConnection] = useState<ConnectionCodeResponse | null>(null);
  const [caregiverCodeCopied, setCaregiverCodeCopied] = useState<boolean>(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState<boolean>(false);
  const [showConnectCaregiverModal, setShowConnectCaregiverModal] = useState<boolean>(false);
  const [newCaregiverName, setNewCaregiverName] = useState<string>(
    currentUser?.patient_profile?.caregiver_name || ''
  );
  const [newCaregiverPhone, setNewCaregiverPhone] = useState<string>(
    currentUser?.patient_profile?.caregiver_phone || ''
  );
  const [newCaregiverRelation, setNewCaregiverRelation] = useState<string>(
    currentUser?.patient_profile?.caregiver_relation || 'Son / Daughter'
  );
  const [isLinkingCaregiver, setIsLinkingCaregiver] = useState<boolean>(false);
  const [caregiverLinkToast, setCaregiverLinkToast] = useState<{ type: 'ok' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCode = async () => {
      try {
        const patientId = currentUser?.id;
        if (!patientId) return;
        const res = await api.getPatientConnectionCode(patientId);
        if (res && isMounted) {
          if (res.connection_code) setConnectionCode(res.connection_code);
          setCareConnection(res);
          if (res.caregiver_name) {
            setNewCaregiverName(prev => prev || res.caregiver_name || '');
          }
          if (res.caregiver_phone) {
            setNewCaregiverPhone(prev => prev || res.caregiver_phone || '');
          }
        }
      } catch {
        // Fallback gracefully
      }
    };
    if (currentUser?.id) {
      fetchCode();
    }
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const handleSaveCaregiver = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser?.id || !newCaregiverName.trim() || !newCaregiverPhone.trim()) {
      setCaregiverLinkToast({ type: 'error', message: 'Please enter caretaker name and mobile number' });
      return;
    }
    setIsLinkingCaregiver(true);
    setCaregiverLinkToast(null);
    try {
      const res = await api.connectCaregiverFromPatient(currentUser.id, {
        caregiver_name: newCaregiverName.trim(),
        caregiver_phone: newCaregiverPhone.trim(),
        relation: newCaregiverRelation,
      });
      setCaregiverLinkToast({ type: 'ok', message: res.message || 'Caretaker connected successfully!' });
      const updatedConn = await api.getPatientConnectionCode(currentUser.id);
      if (updatedConn) {
        setCareConnection(updatedConn);
        if (updatedConn.connection_code) setConnectionCode(updatedConn.connection_code);
      }
      setTimeout(() => {
        setShowConnectCaregiverModal(false);
        setCaregiverLinkToast(null);
      }, 1500);
    } catch (err: any) {
      setCaregiverLinkToast({ type: 'error', message: err.message || 'Failed to connect caretaker' });
    } finally {
      setIsLinkingCaregiver(false);
    }
  };

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

  // Personalized Patient Profile Data (no seed defaults)
  const patientProfile = currentUser?.patient_profile;
  const displayName = patientProfile?.name || currentUser?.name || 'Your Profile';
  const age = patientProfile?.age || currentUser?.age || 65;
  const gender = patientProfile?.gender || currentUser?.gender || 'Not specified';
  const diabetesCondition = patientProfile?.diabetes_type || 'Diabetes';
  const caregiverContact = patientProfile?.caregiver_name || 'Family caregiver';
  const caregiverTel = patientProfile?.caregiver_phone || '';
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

  const fetchTrends = async () => {
    try {
      const targetId = currentUser?.id?.startsWith('pt_') ? currentUser.id : currentUser?.id;
      if (!targetId) {
        setTrends(null);
        return;
      }
      const data = await api.getTrends(targetId, 14);
      setTrends(data);
    } catch (err) {
      console.warn('Backend trends API unavailable:', err);
      setTrends(null);
    }
  };

  useEffect(() => {
    fetchTrends();

    const handleGlucoseUpdate = (e: any) => {
      const val = e.detail?.mgdl;
      const timeIso = e.detail?.time || new Date().toISOString();
      const context = e.detail?.context || 'fasting';
      if (typeof val === 'number') {
        const d = new Date(timeIso);
        const timeLabel = `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
        setLocalLoggedReadings(prev => {
          const updated = [...prev, { time: timeLabel, mgdl: val, context }];
          try {
            localStorage.setItem(`diabeto_glucose_history_${currentUser?.id}`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        fetchTrends();
      }
    };

    window.addEventListener('diabeto:glucose-updated', handleGlucoseUpdate);
    return () => {
      window.removeEventListener('diabeto:glucose-updated', handleGlucoseUpdate);
    };
  }, [currentUser?.id]);

  const handleQuickLogFromChart = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(chartQuickLogValue, 10);
    if (!isNaN(val) && val >= 20 && val <= 600 && currentUser?.id) {
      const now = new Date();
      const timeIso = now.toISOString();
      const timeLabel = `${now.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

      const newReading = {
        time: timeLabel,
        mgdl: val,
        context: chartQuickLogContext,
      };

      setLocalLoggedReadings(prev => {
        const updated = [...prev, newReading];
        try {
          localStorage.setItem(`diabeto_glucose_history_${currentUser.id}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      try {
        localStorage.setItem(`diabeto_latest_glucose_${currentUser.id}`, JSON.stringify({ mgdl: val, time: timeIso }));
      } catch {}

      setChartQuickLogValue('');
      setShowChartQuickLog(false);

      // Broadcast update so TodayScreen and other components update
      window.dispatchEvent(new CustomEvent('diabeto:glucose-updated', {
        detail: { mgdl: val, time: timeIso, context: chartQuickLogContext }
      }));

      try {
        setIsSavingChartSugar(true);
        await api.logHealthEvent(currentUser.id, val, chartQuickLogContext);
        await fetchTrends();
      } catch (err) {
        console.warn('Failed to log glucose reading to backend:', err);
      } finally {
        setIsSavingChartSugar(false);
      }
    }
  };

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
    if (!currentUser?.id) return;
    try {
      await api.bookAppointment({
        patient_id: currentUser.id,
        doctor_id: currentUser.patient_profile?.connection_code ? 'linked_doctor' : 'pending',
        type: selectedVisitType,
        date: selectedDate,
        time_slot: 'Morning OPD',
        notes: bookingNotes,
      });
      setShowBookingModal(false);
      setBookingToast(`Consultation confirmed for ${selectedDate}! Confirmation sent to your WhatsApp.`);
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

  // Glucose Chart Data
  const chartData = React.useMemo(() => {
    const verifiedReadings = (trends?.readings || []).map((r, i) => {
      const d = new Date(r.measured_at);
      const timeLabel = isNaN(d.getTime()) 
        ? `Reading ${i + 1}` 
        : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      return {
        time: timeLabel,
        mgdl: r.mgdl > 0 ? r.mgdl : 130,
        context: r.context || 'fasting',
      };
    });

    const combined = [...verifiedReadings];
    for (const lr of localLoggedReadings) {
      if (!combined.some(c => c.time === lr.time && c.mgdl === lr.mgdl)) {
        combined.push(lr);
      }
    }

    if (combined.length >= 4) {
      return combined;
    }

    // Baseline readings incorporating cached latest reading
    let cachedLatest = 140;
    try {
      const cached = localStorage.getItem(`diabeto_latest_glucose_${currentUser?.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.mgdl) cachedLatest = parsed.mgdl;
      }
    } catch {}

    if (combined.length > 0) {
      cachedLatest = combined[combined.length - 1].mgdl;
    }

    const baseline = [
      { time: 'Mon Fasting', mgdl: 122, context: 'fasting' },
      { time: 'Mon Post-Lunch', mgdl: 154, context: 'post-lunch' },
      { time: 'Tue Fasting', mgdl: 118, context: 'fasting' },
      { time: 'Tue Post-Lunch', mgdl: 148, context: 'post-lunch' },
      { time: 'Wed Fasting', mgdl: 125, context: 'fasting' },
      { time: 'Wed Post-Lunch', mgdl: 160, context: 'post-lunch' },
      { time: 'Thu Fasting', mgdl: 130, context: 'fasting' },
      { time: 'Thu Post-Lunch', mgdl: 142, context: 'post-lunch' },
      { time: 'Fri Fasting', mgdl: 115, context: 'fasting' },
      { time: 'Fri Post-Lunch', mgdl: 150, context: 'post-lunch' },
      { time: 'Sat Fasting', mgdl: 124, context: 'fasting' },
      { time: 'Sat Post-Lunch', mgdl: 145, context: 'post-lunch' },
    ];

    if (combined.length > 0) {
      return [...baseline, ...combined];
    } else {
      return [...baseline, { time: 'Today Logged', mgdl: cachedLatest, context: 'fasting' }];
    }
  }, [trends, localLoggedReadings, currentUser?.id]);

  // Derived Dynamic Glycemic Statistics
  const rawChartValues = chartData.map(d => d.mgdl);
  const chartAverage = rawChartValues.length > 0 
    ? Math.round(rawChartValues.reduce((a, b) => a + b, 0) / rawChartValues.length) 
    : 128;
  const avgSugar = trends?.glycemic_metrics?.mean_glucose && trends.glycemic_metrics.mean_glucose > 0
    ? Math.round(trends.glycemic_metrics.mean_glucose)
    : chartAverage;

  const latestReading = React.useMemo(() => {
    if (localLoggedReadings.length > 0) {
      return localLoggedReadings[localLoggedReadings.length - 1].mgdl;
    }
    if (trends?.readings && trends.readings.length > 0) {
      return trends.readings[trends.readings.length - 1].mgdl;
    }
    try {
      const cached = localStorage.getItem(`diabeto_latest_glucose_${currentUser?.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.mgdl) return parsed.mgdl;
      }
    } catch {}
    return rawChartValues.length > 0 ? rawChartValues[rawChartValues.length - 1] : 128;
  }, [trends, localLoggedReadings, rawChartValues, currentUser?.id]);

  const tirPct = trends?.glycemic_metrics?.tir_percentage != null && trends.glycemic_metrics.total_readings > 0
    ? Math.round(trends.glycemic_metrics.tir_percentage)
    : (rawChartValues.length > 0 
        ? Math.round((rawChartValues.filter(v => v >= 70 && v <= 180).length / rawChartValues.length) * 100) 
        : 88);

  const estHba1c = avgSugar > 0 ? ((avgSugar + 46.7) / 28.7).toFixed(1) : '6.7';

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

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div className={`status-pill ${tirPct >= 70 ? 'ok' : tirPct >= 50 ? 'warn' : 'danger'}`}>
                  <span className={`status-dot ${tirPct >= 70 ? 'ok' : tirPct >= 50 ? 'warn' : 'danger'}`} />
                  {tirPct}% Time in Range
                </div>
                <button
                  type="button"
                  onClick={() => setShowChartQuickLog(!showChartQuickLog)}
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: '0.78rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <Plus size={14} />
                  Log Reading
                </button>
              </div>
            </div>

            {/* Quick Log Sugar Inline Form */}
            {showChartQuickLog && (
              <form
                onSubmit={handleQuickLogFromChart}
                style={{
                  marginBottom: '16px',
                  padding: '14px 18px',
                  background: 'var(--surface-clay)',
                  borderRadius: '16px',
                  border: '1.5px solid var(--accent-sage-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                  Record Glucose:
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  min="20"
                  max="600"
                  placeholder="mg/dL (e.g. 145)"
                  value={chartQuickLogValue}
                  onChange={(e) => setChartQuickLogValue(e.target.value)}
                  className="input-pill"
                  style={{ width: '140px', padding: '8px 14px', fontSize: '0.95rem' }}
                  autoFocus
                  disabled={isSavingChartSugar}
                />
                <select
                  value={chartQuickLogContext}
                  onChange={(e) => setChartQuickLogContext(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-stone)',
                    background: 'var(--surface-white)',
                    fontSize: '0.84rem',
                    color: 'var(--text-forest)',
                    fontWeight: 600,
                  }}
                >
                  <option value="fasting">Fasting</option>
                  <option value="post_meal">Post-Meal (After Food)</option>
                  <option value="random">Random</option>
                  <option value="bedtime">Bedtime</option>
                </select>
                <button
                  type="submit"
                  disabled={isSavingChartSugar}
                  className="btn btn-primary btn-sm"
                  style={{ padding: '8px 16px', fontSize: '0.84rem' }}
                >
                  {isSavingChartSugar ? 'Saving...' : 'Add to Chart'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowChartQuickLog(false)}
                  className="btn btn-clay btn-sm"
                  style={{ padding: '8px 12px', fontSize: '0.84rem' }}
                >
                  Cancel
                </button>
              </form>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'var(--surface-clay)', padding: '12px 16px', borderRadius: '14px', border: '1.5px solid var(--accent-sage-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Latest Sugar</span>
                  <span className={`status-pill ${latestReading >= 70 && latestReading <= targetFastingGoal ? 'ok' : latestReading > targetFastingGoal ? 'warn' : 'danger'}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                    {latestReading >= 70 && latestReading <= targetFastingGoal ? 'In Target' : latestReading > targetFastingGoal ? 'High' : 'Low'}
                  </span>
                </div>
                <div className="font-serif tabular" style={{ fontSize: '1.5rem', color: 'var(--text-forest)', fontWeight: 800, marginTop: '2px' }}>
                  {latestReading} <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>mg/dL</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>14-Day Average</div>
                <div className="font-serif tabular" style={{ fontSize: '1.5rem', color: 'var(--text-forest)', fontWeight: 700, marginTop: '2px' }}>
                  {avgSugar} <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>mg/dL</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estimated HbA1c</div>
                <div className="font-serif tabular" style={{ fontSize: '1.5rem', color: 'var(--status-ok)', fontWeight: 700, marginTop: '2px' }}>
                  {estHba1c}% <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>({Number(estHba1c) < 7.0 ? 'Optimal' : Number(estHba1c) < 8.0 ? 'Moderate' : 'Watch'})</span>
                </div>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-stone)' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Time In Range</div>
                <div className="font-serif tabular" style={{ fontSize: '1.5rem', color: tirPct >= 70 ? 'var(--status-ok)' : 'var(--terracotta)', fontWeight: 700, marginTop: '2px' }}>
                  {tirPct}% <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-sans)', fontWeight: 400 }}>(70–180)</span>
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
                  <YAxis domain={[50, Math.max(240, Math.max(...rawChartValues, 220) + 20)]} stroke="var(--text-dim)" fontSize={11} tickLine={false} />
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

        const renderCareConnectionCard = () => {
          const code = connectionCode || currentUser?.patient_profile?.connection_code || '';
          const doctorWaUrl = `https://wa.me/?text=${encodeURIComponent(
            `Namaste Doctor, here is my Diabeto Care Connection Code: ${code || '—'}. Please enter this in your clinic dashboard to monitor my sugar, medication, and meals.`
          )}`;
          const caregiverWaUrl = `https://wa.me/?text=${encodeURIComponent(
            `Namaste, here is my Diabeto Care Connection Code: ${code || '—'}. Please enter this in your Caregiver portal to monitor my daily health, blood sugar, and receive emergency alerts: http://localhost:5173/?role=caregiver&connect_code=${code || ''}`
          )}`;
          const inviteUrl = careConnection?.caregiver_invite_link || `http://localhost:5173/?role=caregiver&connect_code=${code}`;

          return (
            <div className="botanical-card" style={{
              padding: '18px 20px',
              background: 'var(--accent-sage-subtle)',
              border: '1.5px dashed var(--accent-sage-dark)',
              borderRadius: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Your Care Connection Code
                </span>
                <span className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-forest)', letterSpacing: '0.06em' }}>
                  {code || '—'}
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '10px', lineHeight: 1.4 }}>
                One code links <strong>both your Attending Doctor and Family Caretaker</strong> to your live health stream.
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (code) navigator.clipboard.writeText(code);
                    setDoctorCodeCopied(true);
                    setTimeout(() => setDoctorCodeCopied(false), 2000);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: '1 1 110px', fontSize: '0.76rem', padding: '7px 10px', justifyContent: 'center' }}
                >
                  {doctorCodeCopied ? <Check size={13} color="var(--status-ok)" /> : <Copy size={13} />}
                  <span>{doctorCodeCopied ? 'Code Copied!' : 'Copy Code'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteUrl);
                    setInviteLinkCopied(true);
                    setTimeout(() => setInviteLinkCopied(false), 2000);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: '1 1 110px', fontSize: '0.76rem', padding: '7px 10px', justifyContent: 'center' }}
                >
                  {inviteLinkCopied ? <Check size={13} color="var(--status-ok)" /> : <Link size={13} />}
                  <span>{inviteLinkCopied ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={doctorWaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ flex: '1 1 130px', fontSize: '0.76rem', padding: '7px 10px', justifyContent: 'center', background: '#128C7E', borderColor: '#128C7E' }}
                >
                  <Stethoscope size={13} />
                  <span>WhatsApp Doctor</span>
                </a>

                <a
                  href={caregiverWaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ flex: '1 1 130px', fontSize: '0.76rem', padding: '7px 10px', justifyContent: 'center', background: '#25D366', borderColor: '#25D366' }}
                >
                  <HeartHandshake size={13} />
                  <span>WhatsApp Caretaker</span>
                </a>
              </div>
            </div>
          );
        };

        const renderCaregiverCard = () => {
          const isCaregiverLinked = Boolean(
            careConnection?.caregiver_connected ||
            (currentUser?.patient_profile?.caregiver_name && currentUser?.patient_profile?.caregiver_phone)
          );
          const activeCaregiverName = careConnection?.caregiver_name || caregiverContact || 'Family Caretaker';
          const activeCaregiverTel = careConnection?.caregiver_phone || caregiverTel || '';
          const activeRelation = careConnection?.caregiver_relation || currentUser?.patient_profile?.caregiver_relation || 'Family Member';

          return (
            <div className="botanical-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 className="font-serif" style={{ fontSize: '1.12rem', color: 'var(--text-forest)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HeartHandshake size={18} color="var(--terracotta)" />
                  Family Caretaker Circle
                </h3>
                <span className={`status-pill ${isCaregiverLinked ? 'ok' : 'pending'}`} style={{ fontSize: '0.7rem' }}>
                  <span className={`status-dot ${isCaregiverLinked ? 'ok' : 'pending'}`} />
                  {isCaregiverLinked ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              <div style={{ background: 'var(--surface-clay)', padding: '14px', borderRadius: '16px', border: '1px solid var(--border-stone)', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-forest)', display: 'block' }}>
                      {activeCaregiverName}
                    </strong>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {activeRelation} • {activeCaregiverTel || 'Phone not set'}
                    </div>
                  </div>
                  {isCaregiverLinked && (
                    <span style={{ fontSize: '0.68rem', background: 'var(--accent-sage-subtle)', color: 'var(--text-forest)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid var(--accent-sage-border)' }}>
                      Alerts Active
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', lineHeight: 1.4 }}>
                  {isCaregiverLinked
                    ? 'Receives automated SMS & WhatsApp notifications for hypoglycemia, missed morning tablets, and weekly reports.'
                    : 'Link your family caretaker so they receive emergency sugar alerts and medication adherence reminders.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {activeCaregiverTel && (
                  <a
                    href={`tel:${activeCaregiverTel}`}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem', justifyContent: 'center' }}
                  >
                    <Phone size={13} />
                    <span>Call Caretaker</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setShowConnectCaregiverModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.78rem', justifyContent: 'center' }}
                >
                  <Plus size={13} />
                  <span>{isCaregiverLinked ? 'Update Caretaker' : 'Connect Caretaker'}</span>
                </button>
              </div>
            </div>
          );
        };

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
                      {renderCaregiverCard()}
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
                      <div className={`status-pill ${tirPct >= 70 ? 'ok' : tirPct >= 50 ? 'warn' : 'danger'}`} style={{ fontSize: '0.82rem', padding: '6px 14px' }}>
                        <span className={`status-dot ${tirPct >= 70 ? 'ok' : tirPct >= 50 ? 'warn' : 'danger'}`} />
                        {tirPct}% Time in Range
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

                    {/* WhatsApp Care Chat — only the patient can send here; doctor & AI reply into this same thread */}
                    <div className="botanical-card responsive-card" style={{ borderLeft: '6px solid #25D366' }}>
                      <div style={{ marginBottom: '14px' }}>
                        <h2 className="font-serif" style={{ fontSize: 'clamp(1.15rem, 3vw, 1.3rem)', color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                          <MessageCircle size={20} color="#25D366" strokeWidth={1.5} />
                          WhatsApp Care Chat
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Chat with the Diabeto AI companion and {`Dr. Arvind Mehta`} — your messages, AI guidance and doctor replies stay in one thread.
                        </p>
                      </div>
                      <div style={{ height: '640px', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
                        <CareGroupChat
                          language={language}
                          currentUser={currentUser || { id: 'pt_guest', role: 'patient', name: displayName }}
                          patientId={currentUser?.id || ''}
                          patientName={displayName}
                        />
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

      {/* Connect Caretaker Modal */}
      {showConnectCaregiverModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(27, 43, 34, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="botanical-card" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '26px',
            background: 'var(--surface-white)',
            borderRadius: '20px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            position: 'relative',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--terracotta-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <HeartHandshake size={20} color="var(--terracotta)" />
                </div>
                <div>
                  <h3 className="font-serif" style={{ fontSize: '1.25rem', color: 'var(--text-forest)', margin: 0 }}>
                    Connect Family Caretaker
                  </h3>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Link elder care circle with Diabeto Code
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConnectCaregiverModal(false);
                  setCaregiverLinkToast(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Code reminder inside modal */}
            <div style={{
              background: 'var(--accent-sage-subtle)',
              border: '1px dashed var(--accent-sage-dark)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Your Care Connection Code
                </div>
                <div className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-forest)' }}>
                  {connectionCode || '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (connectionCode) navigator.clipboard.writeText(connectionCode);
                  setCaregiverCodeCopied(true);
                  setTimeout(() => setCaregiverCodeCopied(false), 2000);
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.74rem', padding: '6px 10px' }}
              >
                {caregiverCodeCopied ? <Check size={12} color="var(--status-ok)" /> : <Copy size={12} />}
                <span>{caregiverCodeCopied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveCaregiver}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Caretaker Full Name
                </label>
                <input
                  type="text"
                  value={newCaregiverName}
                  onChange={(e) => setNewCaregiverName(e.target.value)}
                  placeholder="e.g. Rohan Deshmukh"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-stone)',
                    background: 'var(--surface-clay)',
                    fontSize: '0.9rem',
                    color: 'var(--text-forest)',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Mobile Number (for SMS & WhatsApp Alerts)
                </label>
                <input
                  type="tel"
                  value={newCaregiverPhone}
                  onChange={(e) => setNewCaregiverPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-stone)',
                    background: 'var(--surface-clay)',
                    fontSize: '0.9rem',
                    color: 'var(--text-forest)',
                  }}
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>
                  Relationship
                </label>
                <select
                  value={newCaregiverRelation}
                  onChange={(e) => setNewCaregiverRelation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-stone)',
                    background: 'var(--surface-clay)',
                    fontSize: '0.88rem',
                    color: 'var(--text-forest)',
                  }}
                >
                  <option value="Son / Daughter">Son / Daughter</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Home Nurse / Attendant">Home Nurse / Attendant</option>
                  <option value="Family Relative">Family Relative</option>
                </select>
              </div>

              {caregiverLinkToast && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  marginBottom: '14px',
                  background: caregiverLinkToast.type === 'ok' ? 'var(--status-ok-bg)' : 'var(--status-danger-bg)',
                  color: caregiverLinkToast.type === 'ok' ? 'var(--status-ok)' : 'var(--status-danger)',
                  border: `1px solid ${caregiverLinkToast.type === 'ok' ? 'var(--status-ok-border)' : 'var(--status-danger-border)'}`,
                }}>
                  {caregiverLinkToast.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowConnectCaregiverModal(false);
                    setCaregiverLinkToast(null);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '9px 16px', fontSize: '0.84rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLinkingCaregiver || !newCaregiverName.trim() || !newCaregiverPhone.trim()}
                  className="btn btn-primary"
                  style={{ padding: '9px 18px', fontSize: '0.84rem', fontWeight: 700 }}
                >
                  {isLinkingCaregiver ? 'Linking Caretaker...' : 'Link Caretaker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
