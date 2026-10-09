import React, { useState, useEffect } from 'react';
import { 
  Pill, CheckCircle2, Clock, 
  Sparkles, Camera, ShieldCheck, 
  Plus, Copy, Check, Share2, Stethoscope
} from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';
import type { User } from '../api/client';
import { api } from '../api/client';

interface TodayScreenProps {
  language: Language;
  currentUser: User;
  onOpenMealScanner?: () => void;
  onNavigateToSection?: (section: string) => void;
  seniorSimpleMode?: boolean;
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
}) => {
  const [doseConfirmed, setDoseConfirmed] = useState(false);
  const [snoozeActive, setSnoozeActive] = useState(false);
  const [latestGlucose, setLatestGlucose] = useState<number>(128);
  const [readingTime] = useState<string>('8:15 AM');
  const [showQuickSugarInput, setShowQuickSugarInput] = useState(false);
  const [newSugarValue, setNewSugarValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [connectionCode, setConnectionCode] = useState<string>(
    currentUser.patient_profile?.connection_code || 'DIA-RAM789'
  );

  useEffect(() => {
    const fetchCode = async () => {
      try {
        const patientId = currentUser.id || 'pt_ramesh_001';
        const res = await api.getPatientConnectionCode(patientId);
        if (res?.connection_code) {
          setConnectionCode(res.connection_code);
        }
      } catch (e) {
        // use default fallback
      }
    };
    fetchCode();
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

  const handleSaveQuickSugar = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(newSugarValue, 10);
    if (!isNaN(val) && val > 30 && val < 500) {
      setLatestGlucose(val);
      setNewSugarValue('');
      setShowQuickSugarInput(false);
    }
  };

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Namaste Doctor, here is my Diabeto Care Connection Code: ${connectionCode}. Please enter this in your clinic dashboard to monitor my sugar, medication, and meals.`
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
            <form onSubmit={handleSaveQuickSugar} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-stone)', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                value={newSugarValue}
                onChange={(e) => setNewSugarValue(e.target.value)}
                placeholder="e.g. 135"
                className="input-pill"
                style={{ maxWidth: '180px', fontSize: '1.2rem', padding: '12px 18px' }}
                autoFocus
              />
              <button type="submit" className="btn btn-primary" style={{ minHeight: '52px', padding: '12px 24px', fontSize: '1rem' }}>
                {t('saveReading', language)}
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

        {/* 7. Doctor Connection Code Card */}
        <section
          className="botanical-card"
          style={{
            padding: '24px 28px',
            backgroundColor: 'var(--accent-sage-subtle)',
            border: '1.5px solid var(--accent-sage-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: 'var(--accent-sage)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Stethoscope size={18} />
            </div>
            <div>
              <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                {t('connectDoctorCode', language)}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Share this unique 6-letter code with your doctor so they can view your sugar, medication, and meal logs.
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
                {connectionCode}
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
                href={whatsappShareUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
                style={{ fontSize: '0.82rem', padding: '9px 16px', display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366', borderColor: '#25D366' }}
              >
                <Share2 size={15} />
                <span>{t('shareWhatsAppDoctor', language)}</span>
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};
