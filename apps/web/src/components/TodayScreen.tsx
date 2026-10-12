import React, { useState, useEffect } from 'react';
import { 
  Pill, CheckCircle2, Clock, 
  Sparkles, Camera, ShieldCheck, 
  Plus, Copy, Check, Share2, Stethoscope, HeartHandshake
} from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import type { User, ConnectionCodeResponse } from '../api/client';
import { api } from '../api/client';

interface TodayScreenProps {
  language: Language;
  currentUser: User;
  onOpenMealScanner?: () => void;
  onNavigateToSection?: (section: string) => void;
  seniorSimpleMode?: boolean;
  onGlucoseLogged?: (mgdl: number) => void;
}

interface ChecklistItem {
  id: string;
  titleKey: 'taskFastingSugar' | 'taskMorningMeds' | 'taskWalk' | 'taskNightMeds';
  time: string;
  completed: boolean;
  type: 'glucose' | 'med' | 'walk' | 'meal';
}

export const TodayScreen: React.FC<TodayScreenProps> = ({
  language,
  currentUser,
  onOpenMealScanner,
  onNavigateToSection,
  seniorSimpleMode = false,
  onGlucoseLogged,
}) => {
  const [doseConfirmed, setDoseConfirmed] = useState(false);
  const [snoozeActive, setSnoozeActive] = useState(false);
  const [latestGlucose, setLatestGlucose] = useState<number>(() => {
    try {
      const cached = localStorage.getItem(`diabeto_latest_glucose_${currentUser.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.mgdl === 'number') return parsed.mgdl;
      }
    } catch {}
    return 128;
  });
  const [readingTime, setReadingTime] = useState<string>(() => {
    try {
      const cached = localStorage.getItem(`diabeto_latest_glucose_${currentUser.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.time) {
          const d = new Date(parsed.time);
          if (!isNaN(d.getTime())) {
            return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          }
        }
      }
    } catch {}
    return '8:15 AM';
  });
  const [showQuickSugarInput, setShowQuickSugarInput] = useState(false);
  const [newSugarValue, setNewSugarValue] = useState('');
  const [isSavingSugar, setIsSavingSugar] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectionCode, setConnectionCode] = useState<string>(
    currentUser.patient_profile?.connection_code || ''
  );
  const [careConnection, setCareConnection] = useState<ConnectionCodeResponse | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCode = async () => {
      try {
        const patientId = currentUser.id;
        if (!patientId) return;
        const res = await api.getPatientConnectionCode(patientId);
        if (res && isMounted) {
          if (res.connection_code) setConnectionCode(res.connection_code);
          setCareConnection(res);
        }
      } catch (e) {
        // leave empty — elder links on next successful fetch
      }
    };

    const fetchLatestReading = async () => {
      try {
        const patientId = currentUser.id;
        if (!patientId) return;
        const res = await api.getTrends(patientId, 14);
        if (res?.readings && res.readings.length > 0 && isMounted) {
          const sorted = [...res.readings].sort(
            (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
          );
          const latest = sorted[0];
          if (latest && latest.mgdl > 0) {
            setLatestGlucose(latest.mgdl);
            try {
              const d = new Date(latest.measured_at);
              if (!isNaN(d.getTime())) {
                setReadingTime(d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
              }
            } catch {}
            localStorage.setItem(
              `diabeto_latest_glucose_${patientId}`,
              JSON.stringify({ mgdl: latest.mgdl, time: latest.measured_at })
            );
          }
        }
      } catch (e) {
        // local cache already rendered
      }
    };

    fetchCode();
    fetchLatestReading();

    return () => {
      isMounted = false;
    };
  }, [currentUser.id]);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'c1',
      titleKey: 'taskFastingSugar',
      time: '8:00 AM',
      completed: true,
      type: 'glucose',
    },
    {
      id: 'c2',
      titleKey: 'taskMorningMeds',
      time: '8:30 AM',
      completed: true,
      type: 'med',
    },
    {
      id: 'c3',
      titleKey: 'taskWalk',
      time: '5:30 PM',
      completed: false,
      type: 'walk',
    },
    {
      id: 'c4',
      titleKey: 'taskNightMeds',
      time: '8:00 PM',
      completed: doseConfirmed,
      type: 'med',
    },
  ]);

  const toggleChecklist = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleMarkDoseTaken = () => {
    setDoseConfirmed(true);
    setSnoozeActive(false);
    setChecklist((prev) =>
      prev.map((item) => (item.id === 'c4' ? { ...item, completed: true } : item))
    );
  };

  const handleSnooze = () => {
    setSnoozeActive(true);
  };

  const handleSaveQuickSugar = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(newSugarValue, 10);
    if (!isNaN(val) && val >= 20 && val <= 600) {
      const nowIso = new Date().toISOString();
      const timeFormatted = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const dateFormatted = new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
      const timeLabel = `${dateFormatted} ${timeFormatted}`;

      setLatestGlucose(val);
      setReadingTime(timeFormatted);
      setNewSugarValue('');
      setShowQuickSugarInput(false);

      // 1. Immediately cache locally for instant persistence across reload
      try {
        localStorage.setItem(
          `diabeto_latest_glucose_${currentUser.id}`,
          JSON.stringify({ mgdl: val, time: nowIso })
        );
        const existingHistory = JSON.parse(localStorage.getItem(`diabeto_glucose_history_${currentUser.id}`) || '[]');
        existingHistory.push({ time: timeLabel, mgdl: val, context: 'fasting' });
        localStorage.setItem(`diabeto_glucose_history_${currentUser.id}`, JSON.stringify(existingHistory));
      } catch {}

      // 2. Mark fasting task in checklist as completed
      setChecklist((prev) =>
        prev.map((item) => (item.id === 'c1' ? { ...item, completed: true } : item))
      );

      // 3. Dispatch global event so PatientPortal chart updates instantly
      window.dispatchEvent(new CustomEvent('diabeto:glucose-updated', {
        detail: { mgdl: val, time: nowIso, context: 'fasting' }
      }));

      // 4. Persist to Postgres backend via API
      try {
        setIsSavingSugar(true);
        await api.logHealthEvent(currentUser.id, val, 'fasting');
        onGlucoseLogged?.(val);
      } catch (err) {
        console.warn('Failed to persist health event to backend:', err);
      } finally {
        setIsSavingSugar(false);
      }
    }
  };

  const whatsappDoctorUrl = `https://wa.me/?text=${encodeURIComponent(
    `Namaste Doctor, here is my Diabeto Care Connection Code: ${connectionCode}. Please enter this in your clinic dashboard to monitor my sugar, medication, and meals.`
  )}`;

  const whatsappCaregiverUrl = `https://wa.me/?text=${encodeURIComponent(
    `Namaste, here is my Diabeto Care Connection Code: ${connectionCode}. Please open your Caregiver portal to monitor my daily health, blood sugar, and receive emergency alerts: http://localhost:5173/?role=caregiver&connect_code=${connectionCode}`
  )}`;

  // Locale-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('todayGreetingMorning', language);
    if (hour < 17) return t('todayGreetingAfternoon', language);
    return t('todayGreetingEvening', language);
  };

  // Locale-aware formatted current date
  const getFormattedDate = () => {
    const locale = language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN';
    try {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date());
    } catch {
      return new Date().toLocaleDateString();
    }
  };

  const patientName = currentUser.name.split(' ')[0] || 'Elder';
  const targetFasting = currentUser.patient_profile?.target_fasting_glucose || 130;

  const isGlucoseNormal = latestGlucose >= 70 && latestGlucose <= targetFasting;
  const isGlucoseHigh = latestGlucose > targetFasting;

  return (
    <div className="portal-container" style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '48px' }}>
      
      {/* 1. Header Greeting & Date */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {getFormattedDate()}
          </span>
          <span style={{ color: 'var(--accent-sage-dark)' }}>•</span>
          <span className="status-pill ok" style={{ fontSize: '0.78rem', padding: '3px 10px', fontWeight: 600 }}>
            ✓ {t('allVitalsSynced', language)}
          </span>
        </div>
        <h1 className="font-serif" style={{ fontSize: seniorSimpleMode ? '2.3rem' : '2rem', color: 'var(--text-forest)', lineHeight: 1.2 }}>
          {getGreeting()}, {patientName} ji 🙏
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: seniorSimpleMode ? '24px' : '20px' }}>

        {/* 1. Next Medicine Action Card (Senior Priority #1: Min 56px-60px big buttons) */}
        <section
          className="botanical-card"
          style={{
            padding: '24px 28px',
            backgroundColor: doseConfirmed ? 'var(--status-ok-bg)' : 'var(--surface-white)',
            borderColor: doseConfirmed ? 'var(--status-ok-border)' : 'var(--border-stone)',
            borderLeft: doseConfirmed ? '6px solid var(--status-ok)' : '6px solid var(--terracotta)',
            transition: 'all 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '16px',
                  backgroundColor: doseConfirmed ? 'var(--status-ok)' : 'var(--terracotta)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <Pill size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', fontWeight: 700 }}>
                  {t('nextMedicationCard', language)}
                </span>
                <h3 className="font-serif" style={{ fontSize: '1.45rem', color: 'var(--text-forest)', marginTop: '2px' }}>
                  Glimepiride 1mg
                </h3>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  {t('nightDoseDesc', language)}
                </div>
              </div>
            </div>

            {doseConfirmed ? (
              <div className="status-pill ok" style={{ fontSize: '0.9rem', padding: '6px 14px', fontWeight: 700 }}>
                <CheckCircle2 size={18} />
                <span>{t('doseTakenConfirm', language)}</span>
              </div>
            ) : snoozeActive ? (
              <div className="status-pill warn" style={{ fontSize: '0.9rem', padding: '6px 14px', fontWeight: 700 }}>
                <Clock size={18} />
                <span>{t('snoozed15m', language)}</span>
              </div>
            ) : null}
          </div>

          {!doseConfirmed ? (
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              {/* Big 58px Taken Button */}
              <button
                type="button"
                onClick={handleMarkDoseTaken}
                className="btn btn-primary"
                style={{
                  flex: '2',
                  minWidth: '220px',
                  minHeight: '58px',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  backgroundColor: 'var(--status-ok)',
                  borderColor: 'var(--status-ok)',
                  boxShadow: '0 4px 14px rgba(91, 130, 102, 0.3)',
                }}
              >
                <CheckCircle2 size={22} />
                <span>{t('markTakenBtn', language)}</span>
              </button>

              {/* Big 58px Snooze Button */}
              <button
                type="button"
                onClick={handleSnooze}
                className="btn btn-clay"
                style={{
                  flex: '1',
                  minWidth: '160px',
                  minHeight: '58px',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                <Clock size={20} />
                <span>{t('snoozeBtn', language)}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-ok)', fontWeight: 600, fontSize: '0.95rem' }}>
              <CheckCircle2 size={20} />
              <span>{t('doseConfirmedMsg', language)}</span>
            </div>
          )}
        </section>

        {/* 2. Latest Glucose Hero Card */}
        <section className="botanical-card" style={{ padding: '24px 28px', borderLeft: '6px solid var(--accent-sage)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', fontWeight: 700 }}>
                {t('latestGlucoseCard', language)}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span className="font-serif tabular" style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-forest)', lineHeight: 1 }}>
                  {latestGlucose}
                </span>
                <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  mg/dL
                </span>
                <span className={`status-pill ${isGlucoseNormal ? 'ok' : isGlucoseHigh ? 'warn' : 'danger'}`} style={{ fontSize: '0.9rem', padding: '6px 14px', fontWeight: 700 }}>
                  {isGlucoseNormal ? t('inTargetRange', language) : isGlucoseHigh ? t('glucoseHigh', language) : t('glucoseLow', language)}
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                <span>{readingTime} • {t('fastingReading', language)}</span>
                <span style={{ margin: '0 8px', color: 'var(--border-stone)' }}>|</span>
                <span style={{ color: 'var(--accent-sage-dark)', fontWeight: 600 }}>{t('targetFastRange', language)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setShowQuickSugarInput(!showQuickSugarInput)}
                className="btn btn-clay btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '52px', padding: '10px 20px', fontSize: '0.95rem', fontWeight: 700 }}
              >
                <Plus size={18} />
                <span>{t('quickLogSugar', language)}</span>
              </button>
              {onNavigateToSection && (
                <button
                  type="button"
                  onClick={() => onNavigateToSection('glucose')}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '52px', padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  <span>{t('viewTrends', language)}</span>
                </button>
              )}
            </div>
          </div>

          {/* Expandable Quick Sugar Input */}
          {showQuickSugarInput && (
            <form onSubmit={handleSaveQuickSugar} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-stone)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                min="20"
                max="600"
                value={newSugarValue}
                onChange={(e) => setNewSugarValue(e.target.value)}
                placeholder="e.g. 135"
                className="input-pill"
                style={{ maxWidth: '180px', fontSize: '1.2rem', padding: '12px 18px' }}
                autoFocus
                disabled={isSavingSugar}
              />
              <button type="submit" disabled={isSavingSugar} className="btn btn-primary" style={{ minHeight: '52px', padding: '12px 24px', fontSize: '1rem' }}>
                {isSavingSugar ? 'Saving...' : t('saveReading', language)}
              </button>
              <button type="button" onClick={() => setShowQuickSugarInput(false)} className="btn btn-clay" style={{ minHeight: '52px', padding: '12px 20px' }}>
                {t('cancelBtn', language)}
              </button>
            </form>
          )}
        </section>

        {/* 4. Quick Action Plate Scanner Card */}
        {onOpenMealScanner && (
          <div
            onClick={onOpenMealScanner}
            className="botanical-card"
            style={{
              padding: '18px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #FAF0EC 0%, var(--surface-white) 100%)',
              border: '1.5px solid var(--terracotta-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                backgroundColor: 'var(--terracotta)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}>
                <Camera size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                  {t('quickScanMeal', language)}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {t('scanMealDesc', language)}
                </div>
              </div>
            </div>
            <Sparkles size={20} color="var(--terracotta)" />
          </div>
        )}

        {/* 5. Today's Health Checklist (PRD §4) */}
        <section className="botanical-card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--text-forest)' }}>
              {t('todayChecklistTitle', language)}
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {checklist.filter((c) => c.completed).length}/{checklist.length} {t('completedLabel', language)}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecklist(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '16px',
                  backgroundColor: item.completed ? 'var(--surface-clay)' : 'var(--surface-white)',
                  border: '1.5px solid',
                  borderColor: item.completed ? 'var(--border-stone)' : 'var(--accent-sage-border)',
                  cursor: 'pointer',
                  minHeight: '56px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: item.completed ? 'var(--status-ok)' : 'var(--accent-sage)',
                      backgroundColor: item.completed ? 'var(--status-ok)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      flexShrink: 0,
                    }}
                  >
                    {item.completed && <CheckCircle2 size={16} />}
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: item.completed ? 'var(--text-muted)' : 'var(--text-forest)',
                        textDecoration: item.completed ? 'line-through' : 'none',
                      }}
                    >
                      {t(item.titleKey, language)}
                    </span>
                  </div>
                </div>

                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Care Team Advice (Doctor Verified + AI Assisted Tag) */}
        <section
          className="botanical-card"
          style={{
            padding: '24px 28px',
            backgroundColor: 'var(--surface-clay)',
            border: '1px solid var(--border-stone)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-dim)', fontWeight: 700 }}>
              {t('careTeamAdviceTitle', language)}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="status-pill ok" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                <ShieldCheck size={12} />
                {t('approvedByDoctor', language)}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'var(--surface-white)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                {t('aiAssistedTag', language)}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-forest)', lineHeight: 1.6, fontStyle: 'italic' }}>
            &ldquo;{t('drNoteQuote', language)}&rdquo;
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-stone)' }}>
            <img
              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80"
              alt="Dr. Arvind Mehta"
              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                {t('drArvindTitle', language)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {t('drNoteSubtitle', language)}
              </div>
            </div>
          </div>
        </section>

        {/* 7. Care Circle & Diabeto Connection Code Section (Doctor + Caretaker) */}
        <section
          className="botanical-card"
          style={{
            padding: '24px 28px',
            backgroundColor: 'var(--accent-sage-subtle)',
            border: '1.5px solid var(--accent-sage-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--text-forest)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <HeartHandshake size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 className="font-serif" style={{ fontSize: '1.2rem', color: 'var(--text-forest)', margin: 0 }}>
                  {t('careCircleConnection', language)}
                </h3>
                <span className="status-pill ok" style={{ fontSize: '0.7rem' }}>
                  Doctor + Caretaker
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {t('careCircleSub', language)}
              </p>
            </div>
          </div>

          <div style={{
            background: 'var(--surface-white)',
            border: '2px dashed var(--accent-sage-dark)',
            borderRadius: '16px',
            padding: '16px 20px',
            marginTop: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Diabeto Code
              </div>
              <div className="font-mono" style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-forest)', letterSpacing: '0.1em' }}>
                {connectionCode || '—'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(connectionCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2500);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.82rem', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={15} color="var(--status-ok)" /> : <Copy size={15} />}
                <span>{copied ? t('codeCopied', language) : t('copyCode', language)}</span>
              </button>

              <a
                href={whatsappDoctorUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px', background: '#128C7E', borderColor: '#128C7E' }}
                title="Send code to your doctor"
              >
                <Stethoscope size={15} />
                <span>{t('shareWhatsAppDoctor', language)}</span>
              </a>

              <a
                href={whatsappCaregiverUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366', borderColor: '#25D366' }}
                title="Send code to your family caregiver"
              >
                <Share2 size={15} />
                <span>{t('shareWhatsAppCaregiver', language)}</span>
              </a>
            </div>
          </div>

          {/* Connected Circle Status Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginTop: '14px' }}>
            <div style={{ background: 'var(--surface-white)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-stone)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Stethoscope size={18} color="var(--accent-sage)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Attending Doctor
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-forest)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {careConnection?.doctor_name || 'Dr. Arvind Mehta, MD'}
                </div>
              </div>
              <span className="status-pill ok" style={{ fontSize: '0.68rem' }}>
                {careConnection?.doctor_connected ? 'Linked' : 'Ready'}
              </span>
            </div>

            <div style={{ background: 'var(--surface-white)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-stone)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HeartHandshake size={18} color="var(--terracotta)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Family Caretaker
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-forest)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {careConnection?.caregiver_name || currentUser.patient_profile?.caregiver_name || 'Family Caretaker'}
                </div>
              </div>
              <span className={`status-pill ${careConnection?.caregiver_connected ? 'ok' : 'pending'}`} style={{ fontSize: '0.68rem' }}>
                {careConnection?.caregiver_connected ? 'Linked' : 'Share Code'}
              </span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
