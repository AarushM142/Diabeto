import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertOctagon, TrendingUp, 
  Pill, FileText, UserCheck, RefreshCw, Award, Lock, ShieldCheck, History,
  Search, Link as LinkIcon, Download, Utensils, CheckCircle2,
  X, ArrowLeft, ChevronRight, ChevronLeft, Users, Phone,
  ArrowUpRight
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid 
} from 'recharts';
import { 
  api, 
  type TrendAnalytics, 
  type WeeklySummary, 
  type UserRole, 
  type AuditLogItem, 
  type User,
  type ClinicianPatientSummary 
} from '../api/client';
import { t } from '../lib/i18n';
import type { Language } from '../lib/types';

interface ClinicianPortalProps {
  language: Language;
  currentRole: UserRole;
  currentUser?: User;
}

type ViewMode = 'roster' | 'chart';
type TriageTab = 'all' | 'critical' | 'watch' | 'stable';
type DossierTab = 'telemetry' | 'meals' | 'meds' | 'synthesis';

export const ClinicianPortal: React.FC<ClinicianPortalProps> = ({ language, currentRole, currentUser }) => {
  const [patients, setPatients] = useState<ClinicianPatientSummary[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('pt_ramesh_001');
  const [viewMode, setViewMode] = useState<ViewMode>('roster');
  
  const [trends, setTrends] = useState<TrendAnalytics | null>(null);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [mealLogs, setMealLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  
  // UI Controls
  const [triageFilter, setTriageFilter] = useState<TriageTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'severity' | 'tir' | 'adherence' | 'name'>('severity');
  const [activeDossierTab, setActiveDossierTab] = useState<DossierTab>('telemetry');
  
  // Connect Patient Modal State
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectionCodeInput, setConnectionCodeInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectToast, setConnectToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Loading & Sign-off state
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('Patient stable on current regimen. Continue daily fasting logs and morning Metformin.');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showEhrModal, setShowEhrModal] = useState(false);
  const [ehrSummary, setEhrSummary] = useState<any>(null);
  const [loadingEhr, setLoadingEhr] = useState(false);

  const isAuthorizedDoctor = currentRole === 'clinician' || currentRole === 'admin';
  const doctorId = currentUser?.id || 'doc_mehta_101';

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await api.downloadClinicalPdfReport(selectedPatientId, doctorNotes);
    } catch (err) {
      alert('Failed to generate OPD PDF report: ' + err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenEhrSummary = async () => {
    setLoadingEhr(true);
    setShowEhrModal(true);
    try {
      const data = await api.getEhrSummary(selectedPatientId);
      setEhrSummary(data);
    } catch (err) {
      console.error('Failed to load EHR summary:', err);
    } finally {
      setLoadingEhr(false);
    }
  };

  // 1. Fetch Clinician Roster
  const fetchRoster = async () => {
    setLoadingRoster(true);
    try {
      const data = await api.getClinicianPatients(doctorId);
      setPatients(data);
      if (data.length > 0 && !data.some(p => p.id === selectedPatientId)) {
        setSelectedPatientId(data[0].id);
      }
    } catch (err) {
      console.warn('Using fallback clinician patient roster:', err);
      setPatients([
        { id: 'pt_ramesh_001', name: 'Ramesh Kulkarni', age: 68, gender: 'male', phone: '+91 8149680369', language: 'mr', diagnosis: 'Type 2 Diabetes (6 yrs)', connection_code: 'DIA-RAM789', severity: 'critical', latest_glucose: 128, tir_percentage: 78.6, adherence_score_pct: 95.2, active_alerts_count: 1 },
        { id: 'pt_shanti_002', name: 'Shanti Devi', age: 72, gender: 'female', phone: '+91 98000 00002', language: 'hi', diagnosis: 'Type 2 Diabetes (12 yrs, Mild Neuropathy)', connection_code: 'DIA-SHA402', severity: 'watch', latest_glucose: 194, tir_percentage: 58.0, adherence_score_pct: 82.0, active_alerts_count: 0 },
        { id: 'pt_ananya_003', name: 'Ananya Patil', age: 65, gender: 'female', phone: '+91 98000 00003', language: 'mr', diagnosis: 'Type 2 Diabetes + Hypo Unawareness', connection_code: 'DIA-ANA303', severity: 'critical', latest_glucose: 62, tir_percentage: 45.2, adherence_score_pct: 71.4, active_alerts_count: 2 },
      ]);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, [doctorId, currentRole]);

  // 2. Fetch Selected Patient Dossier (Telemetry, Summary, Meal Logs)
  const fetchPatientDossier = async (patientId: string) => {
    setLoadingDossier(true);
    try {
      const [trendData, summaryData, mealsData] = await Promise.all([
        api.getTrends(patientId, 14).catch(() => null),
        api.getWeeklySummary(patientId, 7).catch(() => null),
        api.getMealHistory(patientId).catch(() => []),
      ]);

      setTrends(trendData);
      setSummary(summaryData);
      setMealLogs(mealsData.length > 0 ? mealsData : [
        {
          meal_id: 'meal_demo_1',
          meal_type: 'Lunch',
          timestamp: new Date().toISOString(),
          estimated_total_carbs_g: 58,
          carbohydrate_impact: 'MEDIUM',
          high_sugar_items: [],
          foods: [
            { food: 'Whole Wheat Chapati', estimated_portion: '2 pcs', estimated_carbs_g: 32, glycemic_impact: 'MEDIUM', is_high_sugar: false },
            { food: 'Toor Dal Tadka', estimated_portion: '1 bowl (150g)', estimated_carbs_g: 18, glycemic_impact: 'LOW', is_high_sugar: false },
            { food: 'Bhindi Masala Sabzi', estimated_portion: '1 cup', estimated_carbs_g: 8, glycemic_impact: 'LOW', is_high_sugar: false },
          ],
          elderly_explanation: 'Balanced meal with high fiber. Low glycemic excursion anticipated.',
        },
        {
          meal_id: 'meal_demo_2',
          meal_type: 'Breakfast',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          estimated_total_carbs_g: 42,
          carbohydrate_impact: 'LOW',
          high_sugar_items: [],
          foods: [
            { food: 'Plain Dosa', estimated_portion: '1 medium', estimated_carbs_g: 28, glycemic_impact: 'LOW', is_high_sugar: false },
            { food: 'Vegetable Sambar', estimated_portion: '1 bowl', estimated_carbs_g: 10, glycemic_impact: 'LOW', is_high_sugar: false },
            { food: 'Coconut Chutney', estimated_portion: '2 tbsp', estimated_carbs_g: 4, glycemic_impact: 'LOW', is_high_sugar: false },
          ],
          elderly_explanation: 'Good morning meal with moderate carbs.',
        },
      ]);

      if (isAuthorizedDoctor) {
        const logs = await api.getAuditLogs().catch(() => []);
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error('Error loading patient dossier:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDossier(selectedPatientId);
    }
  }, [selectedPatientId]);

  // 3. Connect Patient Handler
  const handleConnectPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionCodeInput.trim()) return;

    setConnecting(true);
    setConnectToast(null);
    try {
      const res = await api.connectPatient(doctorId, connectionCodeInput.trim());
      setConnectToast({ type: 'success', message: res.message || t('connectSuccess', language) });
      setConnectionCodeInput('');
      await fetchRoster();
      if (res.patient?.id) {
        setSelectedPatientId(res.patient.id);
        setViewMode('chart');
      }
      setTimeout(() => {
        setShowConnectModal(false);
        setConnectToast(null);
      }, 1500);
    } catch (err: any) {
      setConnectToast({ type: 'error', message: err.message || 'Connection failed. Please verify code.' });
    } finally {
      setConnecting(false);
    }
  };

  // 4. Verify Weekly Summary Handler
  const handleVerifySummary = async () => {
    if (!isAuthorizedDoctor) {
      alert(`Forbidden: Active role '${currentRole.toUpperCase()}' cannot sign off on doctor summaries.`);
      return;
    }
    setVerifying(true);
    try {
      const updated = await api.verifyWeeklySummary(selectedPatientId, doctorNotes);
      setSummary(updated);
      const logs = await api.getAuditLogs().catch(() => []);
      setAuditLogs(logs);
    } catch (err) {
      alert('Verification failed: ' + err);
    } finally {
      setVerifying(false);
    }
  };

  // 5. Filter & Sort Patients
  const filteredPatients = patients.filter((p) => {
    const matchesTab = 
      triageFilter === 'all' ? true :
      triageFilter === 'critical' ? p.severity === 'critical' :
      triageFilter === 'watch' ? p.severity === 'watch' :
      p.severity === 'stable';

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      p.name.toLowerCase().includes(q) || 
      p.phone.toLowerCase().includes(q) || 
      p.connection_code.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    if (sortBy === 'severity') {
      const rank = { critical: 0, watch: 1, stable: 2 };
      return rank[a.severity] - rank[b.severity];
    }
    if (sortBy === 'tir') {
      return (a.tir_percentage ?? 100) - (b.tir_percentage ?? 100);
    }
    if (sortBy === 'adherence') {
      return (b.adherence_score_pct ?? 0) - (a.adherence_score_pct ?? 0);
    }
    return a.name.localeCompare(b.name);
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId) || patients[0];
  const currentPatientIndex = sortedPatients.findIndex(p => p.id === selectedPatientId);

  const handleOpenPatientChart = (patientId: string) => {
    setSelectedPatientId(patientId);
    setViewMode('chart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToRoster = () => {
    setViewMode('roster');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPatient = () => {
    if (currentPatientIndex > 0) {
      const prev = sortedPatients[currentPatientIndex - 1];
      setSelectedPatientId(prev.id);
    }
  };

  const handleNextPatient = () => {
    if (currentPatientIndex < sortedPatients.length - 1) {
      const next = sortedPatients[currentPatientIndex + 1];
      setSelectedPatientId(next.id);
    }
  };

  const chartData = (trends?.readings || []).map((r, i) => ({
    name: new Date(r.measured_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` (#${i+1})`,
    glucose: r.mgdl,
    context: r.context,
  }));

  // Triage stats
  const totalPatientsCount = patients.length;
  const urgentCount = patients.filter(p => p.severity === 'critical').length;
  const watchCount = patients.filter(p => p.severity === 'watch').length;
  const stableCount = patients.filter(p => p.severity === 'stable').length;
  const avgTir = totalPatientsCount > 0 
    ? Math.round(patients.reduce((acc, p) => acc + (p.tir_percentage ?? 75), 0) / totalPatientsCount) 
    : 74;

  return (
    <div className="portal-container" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Role Authorization Read-Only Callout (if viewer is not clinician) */}
      {!isAuthorizedDoctor && (
        <div className="botanical-callout warn" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={18} color="var(--terracotta)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-forest)' }}>
              Viewing in Read-Only Mode as <strong>{currentRole.toUpperCase()}</strong>. Clinical verification and threshold modifications require <strong>CLINICIAN</strong> authorization.
            </span>
          </div>
          <span className="status-pill warn">Read-Only View</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: PATIENTS DIRECTORY / TRIAGE ROSTER (Minimalist & Uncluttered) */}
      {/* ========================================================================= */}
      {viewMode === 'roster' && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          {/* Top Header & Triage Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '22px',
            flexWrap: 'wrap',
            gap: '16px',
            paddingBottom: '16px',
            borderBottom: '1.5px solid var(--border-stone)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                  <Users size={20} />
                </div>
                <h1 className="font-serif" style={{ fontSize: '1.65rem', color: 'var(--text-forest)', margin: 0, fontWeight: 700 }}>
                  {t('patientsDirectory', language)}
                </h1>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: 'var(--accent-sage-subtle)',
                  color: 'var(--text-forest)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  border: '1px solid var(--accent-sage-border)',
                }}>
                  Dr. Arvind Mehta, MD • Pune Central Clinic
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Select a patient from your clinical triage directory to view their complete telemetry, food intake logs, and weekly consultation sheets.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Connect Patient Button */}
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="btn btn-primary header-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LinkIcon size={14} />
                <span>{t('connectPatientBtn', language)}</span>
              </button>

              {/* Audit Trail Drawer Toggle */}
              {isAuthorizedDoctor && (
                <button
                  type="button"
                  onClick={() => setShowAuditLogs(!showAuditLogs)}
                  className="btn btn-secondary header-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <History size={14} />
                  <span>{showAuditLogs ? 'Hide Audit Trail' : `Audit Logs (${auditLogs.length})`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Roster Triage Metrics Band */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
          }}>
            <div className="botanical-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-forest)' }}>
                <Users size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Active Roster</div>
                <div className="font-serif tabular" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-forest)', lineHeight: 1.1 }}>
                  {totalPatientsCount} Patients
                </div>
              </div>
            </div>

            <div className="botanical-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--status-ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--status-ok)' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Clinic Avg TIR</div>
                <div className="font-serif tabular" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--status-ok)', lineHeight: 1.1 }}>
                  {avgTir}% In Range
                </div>
              </div>
            </div>

            <div className="botanical-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: urgentCount > 0 ? 'var(--status-danger-bg)' : 'var(--status-ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: urgentCount > 0 ? 'var(--status-danger)' : 'var(--status-ok)' }}>
                <AlertOctagon size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Needs Attention</div>
                <div className="font-serif tabular" style={{ fontSize: '1.4rem', fontWeight: 700, color: urgentCount > 0 ? 'var(--status-danger)' : 'var(--status-ok)', lineHeight: 1.1 }}>
                  {urgentCount} Critical
                </div>
              </div>
            </div>

            <div className="botanical-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--surface-clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-sage-dark)' }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Stable & Watch</div>
                <div className="font-serif tabular" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-forest)', lineHeight: 1.1 }}>
                  {stableCount} Stable {watchCount > 0 ? `(${watchCount} Watch)` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Log Drawer */}
          {showAuditLogs && (
            <div className="botanical-card" style={{ padding: '20px', marginBottom: '24px', background: 'var(--surface-clay)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={18} color="var(--accent-sage-dark)" />
                <h3 className="font-serif" style={{ fontSize: '1.1rem', color: 'var(--text-forest)', margin: 0 }}>
                  Clinical Governance & Audit Trail
                </h3>
              </div>
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditLogs.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No audit events recorded yet.</p>
                ) : (
                  auditLogs.map((l) => (
                    <div key={l.id} style={{ background: 'var(--surface-white)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-stone)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <div>
                        <strong style={{ color: 'var(--text-forest)' }}>{l.action}</strong> by <code>{l.actor_id}</code> ({l.actor_role})
                        <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>Target: {l.target_type} ({l.target_id})</span>
                      </div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>{new Date(l.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Triage Search, Filter, and Sort Controls */}
          <div style={{
            background: 'var(--surface-white)',
            border: '1px solid var(--border-stone)',
            borderRadius: '18px',
            padding: '16px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {/* Triage Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px', background: 'var(--surface-clay)', padding: '4px', borderRadius: '14px', border: '1px solid var(--border-stone)', flexWrap: 'wrap' }}>
                {(['all', 'critical', 'watch', 'stable'] as TriageTab[]).map((tab) => {
                  const isActive = triageFilter === tab;
                  const count = patients.filter(p => tab === 'all' ? true : p.severity === tab).length;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTriageFilter(tab)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isActive ? 'var(--surface-white)' : 'transparent',
                        color: isActive ? 'var(--text-forest)' : 'var(--text-muted)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>
                        {tab === 'all' ? t('triageAll', language) :
                         tab === 'critical' ? `🚨 ${t('triageUrgent', language)}` :
                         tab === 'watch' ? `⚠️ ${t('triageWatch', language)}` :
                         `✓ ${t('triageStable', language)}`}
                      </span>
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: '8px',
                        background: isActive ? 'var(--accent-sage-subtle)' : 'var(--border-stone)',
                        color: isActive ? 'var(--text-forest)' : 'var(--text-dim)',
                        fontWeight: 700,
                      }}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Input & Sort Selector */}
              <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '360px', minWidth: '220px' }}>
                  <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('searchPatientPlaceholder', language)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      fontSize: '0.82rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-stone)',
                      background: 'var(--surface-clay)',
                      color: 'var(--text-forest)',
                      outline: 'none',
                    }}
                  />
                </div>

                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    borderRadius: '12px',
                    border: '1px solid var(--border-stone)',
                    background: 'var(--surface-clay)',
                    color: 'var(--text-forest)',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  <option value="severity">Sort: Urgent First</option>
                  <option value="tir">Sort: Lowest TIR %</option>
                  <option value="adherence">Sort: Adherence %</option>
                  <option value="name">Sort: Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Patient Directory Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px',
              marginTop: '18px',
            }}>
              {loadingRoster ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                  <RefreshCw className="status-dot ok" style={{ width: '24px', height: '24px', margin: '0 auto 12px' }} />
                  <p>Loading clinic directory...</p>
                </div>
              ) : sortedPatients.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                  No patients match the selected filter. Try switching tabs or clearing the search query.
                </div>
              ) : (
                sortedPatients.map((p) => {
                  const isCrit = p.severity === 'critical';
                  const isWatch = p.severity === 'watch';

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleOpenPatientChart(p.id)}
                      className="botanical-card"
                      style={{
                        padding: '18px',
                        cursor: 'pointer',
                        background: 'var(--surface-white)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '14px',
                        border: isCrit ? '1.5px solid var(--status-danger-border)' : '1px solid var(--border-stone)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'var(--text-forest)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = isCrit ? 'var(--status-danger-border)' : 'var(--border-stone)';
                      }}
                    >
                      {/* Patient Card Top Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: isCrit ? 'var(--status-danger)' : 'var(--accent-sage)',
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontFamily: 'var(--font-serif)',
                            fontSize: '1.1rem',
                            flexShrink: 0,
                            boxShadow: 'var(--shadow-sm)',
                          }}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-serif" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-forest)', margin: 0 }}>
                              {p.name}
                            </h3>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              Age {p.age} • {p.gender.toUpperCase()} • <code>{p.connection_code}</code>
                            </div>
                          </div>
                        </div>

                        <span className={`status-pill ${isCrit ? 'danger' : isWatch ? 'warn' : 'ok'}`} style={{ fontSize: '0.7rem', padding: '3px 9px' }}>
                          <span className={`status-dot ${isCrit ? 'danger' : isWatch ? 'warn' : 'ok'}`} />
                          {isCrit ? 'Urgent' : isWatch ? 'Watch' : 'Stable'}
                        </span>
                      </div>

                      {/* Diagnosis & Care Details */}
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--surface-clay)', padding: '6px 10px', borderRadius: '8px' }}>
                        {p.diagnosis}
                      </div>

                      {/* Clinical Vitals Row */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--surface-clay)',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                      }}>
                        <div>
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase' }}>Glucose</span>
                          <strong style={{ color: isCrit ? 'var(--status-danger)' : 'var(--text-forest)' }}>
                            {p.latest_glucose ? `${p.latest_glucose} mg/dL` : '128 mg/dL'}
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase' }}>TIR (70-180)</span>
                          <strong style={{ color: (p.tir_percentage ?? 78) >= 70 ? 'var(--status-ok)' : 'var(--terracotta)' }}>
                            {p.tir_percentage ?? 78}%
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem', display: 'block', textTransform: 'uppercase' }}>Adherence</span>
                          <strong style={{ color: (p.adherence_score_pct ?? 92) >= 80 ? 'var(--status-ok)' : 'var(--terracotta)' }}>
                            {p.adherence_score_pct ?? 92}%
                          </strong>
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid var(--border-stone)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Phone: {p.phone}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-sage-dark)' }}>
                          <span>{t('viewPatientChart', language)}</span>
                          <ArrowUpRight size={14} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DEDICATED PATIENT CHART / DOSSIER (Minimalist, Focused, Zero-Clutter) */}
      {/* ========================================================================= */}
      {viewMode === 'chart' && selectedPatient && (
        <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
          {/* Breadcrumb & Patient Navigation Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            {/* Breadcrumb Link */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleBackToRoster}
                className="btn btn-secondary header-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Return to Patients Directory Roster"
              >
                <ArrowLeft size={14} />
                <span>{t('breadcrumbPatients', language)}</span>
              </button>

              <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>/</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                  {selectedPatient.name}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontFamily: 'monospace',
                  background: 'var(--surface-clay)',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-stone)',
                  color: 'var(--text-dim)',
                }}>
                  {selectedPatient.connection_code}
                </span>
              </div>
            </div>

            {/* Quick Switcher (Previous / Next Patient in Directory) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handlePrevPatient}
                disabled={currentPatientIndex <= 0}
                className="btn btn-secondary header-btn"
                style={{ padding: '6px 10px' }}
                title="Previous Patient"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  borderRadius: '20px',
                  border: '1px solid var(--border-stone)',
                  background: 'var(--surface-white)',
                  color: 'var(--text-forest)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {sortedPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.connection_code})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleNextPatient}
                disabled={currentPatientIndex >= sortedPatients.length - 1}
                className="btn btn-secondary header-btn"
                style={{ padding: '6px 10px' }}
                title="Next Patient"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Patient Hero Dossier Card */}
          <div className="botanical-card" style={{
            background: 'var(--surface-white)',
            borderRadius: '24px',
            overflow: 'hidden',
            marginBottom: '20px',
            boxShadow: 'var(--shadow-md)',
          }}>
            {/* Top Patient Details Banner */}
            <div style={{
              background: 'linear-gradient(135deg, var(--surface-clay) 0%, var(--accent-sage-subtle) 100%)',
              padding: '24px 28px',
              borderBottom: '1px solid var(--border-stone)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '16px',
                  background: 'var(--text-forest)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 700,
                  boxShadow: 'var(--shadow-sm)',
                  flexShrink: 0,
                }}>
                  {selectedPatient.name.charAt(0)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-forest)', margin: 0 }}>
                      {selectedPatient.name}
                    </h2>
                    <span className={`status-pill ${selectedPatient.severity === 'critical' ? 'danger' : selectedPatient.severity === 'watch' ? 'warn' : 'ok'}`}>
                      <span className={`status-dot ${selectedPatient.severity === 'critical' ? 'danger' : selectedPatient.severity === 'watch' ? 'warn' : 'ok'}`} />
                      {selectedPatient.severity.toUpperCase()}
                    </span>
                    {selectedPatient.active_alerts_count > 0 && (
                      <span className="status-pill warn">
                        {selectedPatient.active_alerts_count} Active Alerts
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    {selectedPatient.diagnosis} • Age: {selectedPatient.age} yrs • {selectedPatient.gender.toUpperCase()} • Language: {selectedPatient.language.toUpperCase()} • Care Code: <strong style={{ color: 'var(--text-forest)' }}>{selectedPatient.connection_code}</strong>
                  </p>
                </div>
              </div>

              {/* Action Buttons (EHR Summary, 1-Click PDF & Patient Phone) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleOpenEhrSummary}
                  className="btn btn-secondary header-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="View Structured EHR / ABDM Clinical Summary"
                >
                  <FileText size={13} />
                  <span>EHR Summary</span>
                </button>

                <a
                  href={`tel:${selectedPatient.phone}`}
                  className="btn btn-secondary header-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Phone size={13} />
                  <span>Call Patient ({selectedPatient.phone})</span>
                </a>

                <a
                  href={`http://localhost:8000/v1/patients/${selectedPatient.id}/report/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary header-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  title="Download formatted Clinical OPD consultation sheet with hospital letterhead"
                >
                  <Download size={14} />
                  <span>{t('downloadOpdPdf', language)}</span>
                </a>
              </div>
            </div>

            {/* Dossier Navigation Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 24px',
              borderBottom: '1px solid var(--border-stone)',
              background: 'var(--surface-white)',
              overflowX: 'auto',
            }}>
              {[
                { id: 'telemetry', label: `📊 ${t('glycemicTelemetry', language)}`, icon: Activity },
                { id: 'meals', label: `🍲 ${t('patientMealLogs', language)} (${mealLogs.length})`, icon: Utensils },
                { id: 'meds', label: `💊 ${t('patientMedications', language)}`, icon: Pill },
                { id: 'synthesis', label: `🩺 ${t('verifiedConsultation', language)}`, icon: FileText },
              ].map((tab) => {
                const isActive = activeDossierTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveDossierTab(tab.id as DossierTab)}
                    className="header-btn"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isActive ? 'var(--text-forest)' : 'var(--surface-clay)',
                      color: isActive ? '#FFFFFF' : 'var(--text-forest)',
                      fontWeight: isActive ? 700 : 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Dossier Content Panels */}
            <div style={{ padding: '24px' }}>
              {loadingDossier ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <RefreshCw className="status-dot ok" style={{ width: '24px', height: '24px', margin: '0 auto 12px' }} />
                  <p>Loading clinical telemetry and logs for {selectedPatient.name}...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: Glycemic Telemetry & ADA Target Band */}
                  {activeDossierTab === 'telemetry' && (
                    <div>
                      {/* ADA Stats Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                        <div className="botanical-card" style={{ padding: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600 }}>
                            <span>{t('timeInRange', language)}</span>
                            <TrendingUp size={15} color="var(--status-ok)" />
                          </div>
                          <div className="font-serif tabular" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--status-ok)', margin: '4px 0' }}>
                            {trends?.glycemic_metrics.tir_percentage ?? 78.6}%
                          </div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Target &gt;70% (ADA Standard)</p>
                        </div>

                        <div className="botanical-card" style={{ padding: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600 }}>
                            <span>{t('timeBelowRange', language)}</span>
                            <AlertOctagon size={15} color="var(--status-danger)" />
                          </div>
                          <div className="font-serif tabular" style={{ fontSize: '2.2rem', fontWeight: 700, color: (trends?.glycemic_metrics.tbr_percentage || 0) > 0 ? 'var(--status-danger)' : 'var(--text-forest)', margin: '4px 0' }}>
                            {trends?.glycemic_metrics.tbr_percentage ?? 3.6}%
                          </div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Target &lt;4% (Hypo Risk)</p>
                        </div>

                        <div className="botanical-card" style={{ padding: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600 }}>
                            <span>{t('meanGlucose', language)}</span>
                            <Activity size={15} color="var(--text-forest)" />
                          </div>
                          <div className="font-serif tabular" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-forest)', margin: '4px 0' }}>
                            {trends?.glycemic_metrics.mean_glucose ?? 132.4} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>mg/dL</span>
                          </div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Median: {trends?.glycemic_metrics.median_glucose ?? 128} mg/dL</p>
                        </div>

                        <div className="botanical-card" style={{ padding: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600 }}>
                            <span>{t('glucoseVariability', language)}</span>
                            <Activity size={15} color="var(--accent-sage)" />
                          </div>
                          <div className="font-serif tabular" style={{ fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-forest)', margin: '4px 0' }}>
                            {trends?.glycemic_metrics.coefficient_of_variation_pct ?? 16.7}%
                          </div>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>SD: ±{trends?.glycemic_metrics.standard_deviation ?? 22.1} mg/dL</p>
                        </div>
                      </div>

                      {/* Interactive Area Chart */}
                      <div className="botanical-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                          <div>
                            <h4 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                              14-Day Continuous Glycemic Curve
                            </h4>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                              Clinical Target Band: 70 to 180 mg/dL
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', flexWrap: 'wrap' }}>
                            <span className="status-pill ok">Target Band: 70-180 mg/dL</span>
                            <span className="status-pill warn">Hyper Alert: &gt;180 mg/dL</span>
                            <span className="status-pill danger">Hypo Alert: &lt;70 mg/dL</span>
                          </div>
                        </div>

                        <div style={{ height: '320px', width: '100%' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-stone)" />
                              <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={11} />
                              <YAxis domain={[40, 300]} stroke="var(--text-dim)" fontSize={11} />
                              <Tooltip 
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    const val = payload[0].value as number;
                                    const isHypo = val < 70;
                                    const isHyper = val > 180;
                                    return (
                                      <div style={{ background: 'var(--surface-white)', border: '1px solid var(--border-stone)', padding: '10px 14px', borderRadius: '14px', boxShadow: 'var(--shadow-md)' }}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
                                        <div className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700, color: isHypo ? 'var(--status-danger)' : isHyper ? 'var(--terracotta)' : 'var(--status-ok)' }}>
                                          {val} mg/dL
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                          Context: {payload[0].payload.context}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <ReferenceLine y={180} stroke="var(--terracotta)" strokeDasharray="4 4" label={{ value: 'Hyper (>180)', fill: 'var(--terracotta)', fontSize: 10 }} />
                              <ReferenceLine y={70} stroke="var(--status-danger)" strokeDasharray="4 4" label={{ value: 'Hypo (<70)', fill: 'var(--status-danger)', fontSize: 10 }} />
                              <Area type="monotone" dataKey="glucose" stroke="var(--status-ok)" strokeWidth={2.5} fill="var(--chart-band)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Patient Real Meal & Food Intake Logs */}
                  {activeDossierTab === 'meals' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h4 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                            Patient Food Logs & Carbohydrate Intake
                          </h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            Verified photographic food logs submitted by {selectedPatient.name} via WhatsApp and mobile scanner.
                          </p>
                        </div>
                      </div>

                      {mealLogs.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--surface-clay)', borderRadius: '16px' }}>
                          <Utensils size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                          <p>{t('noMealLogsYet', language)}</p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {mealLogs.map((meal: any, idx: number) => {
                            const isHigh = meal.carbohydrate_impact === 'HIGH';
                            const isMed = meal.carbohydrate_impact === 'MEDIUM';

                            return (
                              <div
                                key={meal.meal_id || idx}
                                style={{
                                  background: 'var(--surface-clay)',
                                  border: '1px solid var(--border-stone)',
                                  borderRadius: '16px',
                                  padding: '18px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      background: 'var(--text-forest)',
                                      color: '#FFFFFF',
                                      padding: '3px 10px',
                                      borderRadius: '8px',
                                    }}>
                                      {meal.meal_type || 'Meal'}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                      {new Date(meal.timestamp || Date.now()).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      background: isHigh ? 'var(--status-danger-bg)' : isMed ? 'var(--terracotta-subtle)' : 'var(--status-ok-bg)',
                                      color: isHigh ? 'var(--status-danger)' : isMed ? 'var(--terracotta)' : 'var(--status-ok)',
                                      border: `1px solid ${isHigh ? 'var(--status-danger-border)' : isMed ? 'var(--terracotta-border)' : 'var(--status-ok-border)'}`,
                                    }}>
                                      {meal.carbohydrate_impact || 'MEDIUM'} IMPACT
                                    </span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                                      ~{meal.estimated_total_carbs_g || 45}g Carbs
                                    </span>
                                  </div>
                                </div>

                                {/* Food items breakdown */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                                  {(meal.foods || []).map((f: any, fIdx: number) => (
                                    <div
                                      key={fIdx}
                                      style={{
                                        background: 'var(--surface-white)',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border-stone)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.82rem',
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-forest)' }}>{f.food}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Portion: {f.estimated_portion || 'Standard'}</div>
                                      </div>
                                      <span style={{ fontWeight: 700, color: 'var(--accent-sage-dark)' }}>{f.estimated_carbs_g}g</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Clinical dietary explanation */}
                                {meal.elderly_explanation && (
                                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '6px 0 0', fontStyle: 'italic' }}>
                                    💡 {meal.elderly_explanation}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: Medication Regimen & Adherence */}
                  {activeDossierTab === 'meds' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                          Active Prescriptions & Adherence History
                        </h4>
                        <span className="status-pill ok">
                          14-Day Compliance: <strong>{trends?.adherence_metrics.compliance_score_pct ?? 95.2}%</strong>
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                          {
                            name: 'Metformin Hydrochloride',
                            dose: '500 mg',
                            time: '8:00 AM (Morning)',
                            instructions: 'Take immediately with or after breakfast',
                            warning: 'Gastric comfort: Never take on empty stomach',
                            status: 'adherent',
                          },
                          {
                            name: 'Teneligliptin',
                            dose: '20 mg',
                            time: '1:30 PM (Afternoon)',
                            instructions: 'Take after lunch',
                            warning: 'DPP-4 inhibitor: safe for renal function',
                            status: 'adherent',
                          },
                          {
                            name: 'Glimepiride',
                            dose: '1 mg',
                            time: '8:00 PM (Night)',
                            instructions: 'Take 15 mins before dinner',
                            warning: 'Sulfonylurea: carry glucose biscuits if walking in evening',
                            status: 'adherent',
                          },
                        ].map((med, mIdx) => (
                          <div
                            key={mIdx}
                            style={{
                              background: 'var(--surface-clay)',
                              border: '1px solid var(--border-stone)',
                              borderRadius: '16px',
                              padding: '16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'var(--accent-sage)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}>
                                <Pill size={20} />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-forest)' }}>
                                  {med.name} <span style={{ fontWeight: 500, color: 'var(--terracotta)' }}>{med.dose}</span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                  {med.time} • {med.instructions}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                  ⚠️ {med.warning}
                                </div>
                              </div>
                            </div>

                            <span className="status-pill ok" style={{ fontSize: '0.72rem' }}>
                              <CheckCircle2 size={12} /> Active Prescription
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: Weekly Clinical Synthesis & Doctor Sign-Off Gate */}
                  {activeDossierTab === 'synthesis' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                          Weekly Clinical Synthesis & Sign-Off Gate
                        </h4>
                        <span className={`status-pill ${summary?.status === 'verified' ? 'ok' : 'warn'}`}>
                          <span className={`status-dot ${summary?.status === 'verified' ? 'ok' : 'warn'}`} />
                          {summary?.status === 'verified' ? t('verified', language) : t('unverified', language)}
                        </span>
                      </div>

                      <div style={{ background: 'var(--surface-clay)', padding: '18px', borderRadius: '16px', border: '1px solid var(--border-stone)', marginBottom: '18px' }}>
                        <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                          Clinical Highlights
                        </h5>
                        <ul style={{ listStyle: 'none', fontSize: '0.85rem', color: 'var(--text-forest)', display: 'flex', flexDirection: 'column', gap: '8px', padding: 0 }}>
                          {(summary?.clinical_highlights || [
                            'Patient maintained stable fasting glucose average of 128 mg/dL over the last 14 days.',
                            'Medication adherence compliance is optimal at 95.2% with zero missed morning doses.',
                            '1 evening hypoglycemia dip noted on Tuesday (62 mg/dL) resolved with oral glucose.',
                          ]).map((h, idx) => (
                            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <span style={{ color: 'var(--accent-sage)', fontWeight: 700 }}>•</span>
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>

                        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-stone)' }}>
                          <strong style={{ fontSize: '0.78rem', color: 'var(--text-forest)' }}>RECOMMENDED ACTION:</strong>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {summary?.doctor_action_recommendation || 'Continue current regimen. Remind patient to avoid heavy exertion before evening dinner.'}
                          </p>
                        </div>
                      </div>

                      {/* Doctor Consultation Notes & Sign-Off */}
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                          {t('doctorNotes', language)}
                        </label>
                        <textarea
                          className="textarea-botanical"
                          rows={3}
                          value={doctorNotes}
                          disabled={!isAuthorizedDoctor}
                          onChange={(e) => setDoctorNotes(e.target.value)}
                          style={{ fontSize: '0.85rem', marginBottom: '14px', width: '100%', opacity: isAuthorizedDoctor ? 1 : 0.7 }}
                        />

                        {summary?.status === 'verified' ? (
                          <div style={{
                            background: 'var(--status-ok-bg)',
                            border: '1px solid var(--status-ok-border)',
                            padding: '14px',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            color: 'var(--status-ok)',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                          }}>
                            <Award size={22} color="var(--status-ok)" />
                            <div>
                              <div>Clinically Verified by {summary.verified_by || 'Dr. Arvind Mehta'}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Logged at {new Date(summary.verified_at || Date.now()).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleVerifySummary}
                            disabled={verifying || !isAuthorizedDoctor}
                            className="btn btn-primary"
                            style={{ padding: '12px 24px', borderRadius: '14px', fontWeight: 700 }}
                          >
                            {isAuthorizedDoctor ? <UserCheck size={16} /> : <Lock size={16} />}
                            {isAuthorizedDoctor 
                              ? (verifying ? 'Signing off...' : t('verifyButton', language))
                              : 'Doctor Sign-off Required'
                            }
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Structured EHR & ABDM Summary Modal */}
      {showEhrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(18, 30, 23, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="botanical-card" style={{ maxWidth: '620px', width: '100%', padding: '28px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={22} color="var(--accent-sage)" />
                <h3 className="font-serif" style={{ fontSize: '1.3rem', color: 'var(--text-forest)', margin: 0 }}>
                  Structured EHR & ABDM Export
                </h3>
              </div>
              <button
                onClick={() => setShowEhrModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingEhr ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
                <p>Generating structured clinical impression...</p>
              </div>
            ) : ehrSummary ? (
              <div>
                <div style={{ background: 'var(--surface-clay)', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--border-stone)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-forest)' }}>{ehrSummary.patient_name}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>ID: {ehrSummary.patient_id}</span>
                    </div>
                    <span className="status-pill ok">
                      Status: {ehrSummary.ehr_export_status?.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>
                    FHIR Resource: <code>{ehrSummary.resourceType}</code> • Generated: {new Date(ehrSummary.generated_at).toLocaleString()}
                  </p>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                    ADA Glycemic Performance Indicators
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    <div className="botanical-card" style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-white)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ADA Control Grade</span>
                      <div className="font-serif" style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        marginTop: '4px',
                        color: ehrSummary.ada_glycemic_metrics?.ada_control_grade === 'Optimal'
                          ? 'var(--status-ok)'
                          : ehrSummary.ada_glycemic_metrics?.ada_control_grade === 'Moderate'
                          ? 'var(--terracotta)'
                          : 'var(--status-danger)'
                      }}>
                        {ehrSummary.ada_glycemic_metrics?.ada_control_grade}
                      </div>
                    </div>

                    <div className="botanical-card" style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-white)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mean Glucose</span>
                      <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-forest)', marginTop: '4px' }}>
                        {ehrSummary.ada_glycemic_metrics?.mean_glucose_mgdl} <span style={{ fontSize: '0.75rem' }}>mg/dL</span>
                      </div>
                    </div>

                    <div className="botanical-card" style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-white)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Est. HbA1c</span>
                      <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-forest)', marginTop: '4px' }}>
                        {ehrSummary.ada_glycemic_metrics?.estimated_hba1c_percent || 'N/A'}%
                      </div>
                    </div>

                    <div className="botanical-card" style={{ padding: '14px', textAlign: 'center', background: 'var(--surface-white)' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Time-In-Range</span>
                      <div className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--status-ok)', marginTop: '4px' }}>
                        {ehrSummary.ada_glycemic_metrics?.time_in_range_percent}%
                      </div>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Target: &ge;70%</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                  >
                    <Download size={16} />
                    {downloadingPdf ? 'Generating PDF...' : 'Download Full Verified PDF'}
                  </button>
                  <button
                    onClick={() => setShowEhrModal(false)}
                    className="btn btn-secondary"
                    style={{ padding: '12px 20px' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No summary data available.</p>
            )}
          </div>
        </div>
      )}

      {/* Connect Patient Modal */}
      {showConnectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(45, 58, 49, 0.65)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--surface-white)',
            borderRadius: '24px',
            maxWidth: '480px',
            width: '100%',
            padding: '28px',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-stone)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--accent-sage)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <LinkIcon size={18} />
                </div>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-forest)', margin: 0 }}>
                  {t('connectPatientTitle', language)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConnectModal(false);
                  setConnectToast(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Enter the 6-character Diabeto Care Code provided by the patient (e.g., from their WhatsApp or Today screen) to link them to your clinical roster.
            </p>

            <form onSubmit={handleConnectPatient}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Patient Connection Code
                </label>
                <input
                  type="text"
                  value={connectionCodeInput}
                  onChange={(e) => setConnectionCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. DIA-RAM789"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '1.1rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    borderRadius: '12px',
                    border: '2px solid var(--accent-sage)',
                    background: 'var(--surface-clay)',
                    color: 'var(--text-forest)',
                    outline: 'none',
                    textAlign: 'center',
                  }}
                  autoFocus
                />
              </div>

              {/* Demo quick fillers */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', alignSelf: 'center' }}>Demo shortcuts:</span>
                {[
                  { label: 'Ramesh', code: 'DIA-RAM789' },
                  { label: 'Shanti', code: 'DIA-SHA402' },
                  { label: 'Ananya', code: 'DIA-ANA303' },
                ].map((demo) => (
                  <button
                    key={demo.code}
                    type="button"
                    onClick={() => setConnectionCodeInput(demo.code)}
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-stone)',
                      background: 'var(--surface-white)',
                      color: 'var(--text-forest)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {demo.label} ({demo.code})
                  </button>
                ))}
              </div>

              {/* Toast message */}
              {connectToast && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  marginBottom: '16px',
                  background: connectToast.type === 'success' ? 'var(--status-ok-bg)' : 'var(--status-danger-bg)',
                  color: connectToast.type === 'success' ? 'var(--status-ok)' : 'var(--status-danger)',
                  border: `1px solid ${connectToast.type === 'success' ? 'var(--status-ok-border)' : 'var(--status-danger-border)'}`,
                }}>
                  {connectToast.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '10px 18px' }}
                >
                  {t('cancelBtn', language)}
                </button>
                <button
                  type="submit"
                  disabled={connecting || !connectionCodeInput.trim()}
                  className="btn btn-primary"
                  style={{ padding: '10px 20px', fontWeight: 700 }}
                >
                  {connecting ? 'Linking Patient...' : t('verifyAndAdd', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
