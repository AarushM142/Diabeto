// Diabeto API Client for Web Portals with Multi-Tiered Authorization

export type UserRole = 'clinician' | 'coach' | 'caregiver' | 'admin';

export interface PersonaInfo {
  id: string;
  role: UserRole;
  clinic_id: string;
  name: string;
  title: string;
  linked_patient_id?: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  clinician_of_record_id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  language: string;
  consent_flags: Record<string, any>;
  thresholds_reviewed_at?: string;
  created_at: string;
}

export interface GlycemicMetrics {
  total_readings: number;
  mean_glucose: number;
  median_glucose: number;
  mad_glucose: number;
  min_glucose: number;
  max_glucose: number;
  standard_deviation: number;
  coefficient_of_variation_pct: number;
  tir_percentage: number;
  tar_percentage: number;
  tbr_percentage: number;
  clinical_status: string;
}

export interface AdherenceMetrics {
  active_medication_count: number;
  total_confirmed_doses: number;
  compliance_score_pct: number;
  readings_per_day: number;
  status: string;
}

export interface ReadingItem {
  measured_at: string;
  mgdl: number;
  context: string;
}

export interface TrendAnalytics {
  patient_id: string;
  days: number;
  glycemic_metrics: GlycemicMetrics;
  context_breakdowns: Record<string, any>;
  adherence_metrics: AdherenceMetrics;
  readings: ReadingItem[];
}

export interface Recommendation {
  id: string;
  patient_id: string;
  finding: Record<string, any>;
  action_type: string;
  message_text: string;
  reason_text: string;
  confidence_label: string;
  message_class: string;
  status: string;
  created_at: string;
}

export interface RiskEvent {
  id: string;
  patient_id: string;
  type: string;
  severity: string;
  evidence_ids: string[];
  status: string;
  created_at: string;
}

export interface WeeklySummary {
  patient_id: string;
  patient_name: string;
  age: number;
  period_days: number;
  generated_at: string;
  status: string;
  verified_by?: string | null;
  verified_at?: string | null;
  clinician_notes?: string | null;
  glycemic_metrics: GlycemicMetrics;
  context_breakdowns: Record<string, any>;
  adherence_metrics: AdherenceMetrics;
  risk_events_count: number;
  clinical_highlights: string[];
  doctor_action_recommendation: string;
}

export interface AuditLogItem {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  created_at: string;
}

const API_BASE = '/v1';

let activeRole: UserRole = 'clinician';
let activeUserId: string = 'doc_mehta_101';

export const setGlobalPersona = (role: UserRole, userId?: string) => {
  activeRole = role;
  if (userId) activeUserId = userId;
};

export const getGlobalPersona = (): UserRole => activeRole;

const getHeaders = (extraHeaders: Record<string, string> = {}) => {
  return {
    'Content-Type': 'application/json',
    'X-User-Role': activeRole,
    'X-User-ID': activeUserId,
    ...extraHeaders,
  };
};

export const api = {
  setPersona(role: UserRole, userId?: string) {
    setGlobalPersona(role, userId);
  },

  getPersona(): UserRole {
    return getGlobalPersona();
  },

  async getHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getTrends(patientId: string, days: number = 14): Promise<TrendAnalytics> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/trends?days=${days}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch trends for ${patientId}`);
    return res.json();
  },

  async getRisks(patientId: string): Promise<RiskEvent[]> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/risks`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to fetch risks for ${patientId}`);
    return res.json();
  },

  async ackRisk(riskId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/escalations/${riskId}/ack`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to acknowledge risk');
    return res.json();
  },

  async getPendingApprovals(): Promise<Recommendation[]> {
    const res = await fetch(`${API_BASE}/approvals`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch approvals queue');
    return res.json();
  },

  async submitApprovalDecision(
    recommendationId: string,
    decision: 'approved' | 'rejected' | 'edited',
    feedback?: string,
    editedText?: string
  ): Promise<any> {
    const res = await fetch(`${API_BASE}/approvals/${recommendationId}/decision`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ decision, feedback, edited_text: editedText }),
    });
    if (!res.ok) throw new Error('Failed to submit decision (Authorization Check Failed)');
    return res.json();
  },

  async generateNudge(patientId: string): Promise<Recommendation> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/generate-nudge`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to generate nudge');
    return res.json();
  },

  async getWeeklySummary(patientId: string, days: number = 7): Promise<WeeklySummary> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/weekly-summary?days=${days}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch weekly summary');
    return res.json();
  },

  async verifyWeeklySummary(patientId: string, notes?: string): Promise<WeeklySummary> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/weekly-summary/verify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error('Failed to verify weekly summary (Clinician Signature Required)');
    return res.json();
  },

  async logHealthEvent(patientId: string, mgdl: number, context: string = 'fasting'): Promise<any> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/events`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        type: 'glucose',
        value: { mgdl, context },
        measured_at: new Date().toISOString(),
        reported_by: 'patient',
      }),
    });
    if (!res.ok) throw new Error('Failed to log event');
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLogItem[]> {
    const res = await fetch(`${API_BASE}/audit/logs`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async updatePatientConsent(patientId: string, flags: { view_raw_glucose?: boolean; emergency_escalation?: boolean }): Promise<any> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/consent`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(flags),
    });
    if (!res.ok) throw new Error('Failed to update consent flags');
    return res.json();
  },

  async bookAppointment(booking: {
    patient_id: string;
    doctor_id: string;
    type: 'clinic' | 'video' | 'whatsapp';
    date: string;
    time_slot: string;
    notes?: string;
  }): Promise<{ id: string; status: string; message: string }> {
    // In demo environment, store in localStorage and log audit
    const bookingRecord = {
      id: `apt_${Date.now()}`,
      ...booking,
      status: 'confirmed',
      created_at: new Date().toISOString(),
    };
    const current = JSON.parse(localStorage.getItem('diabeto_appointments') || '[]');
    localStorage.setItem('diabeto_appointments', JSON.stringify([bookingRecord, ...current]));
    return {
      id: bookingRecord.id,
      status: 'confirmed',
      message: `Appointment confirmed with Dr. Arvind Mehta for ${booking.date} at ${booking.time_slot}`,
    };
  },

  getAppointments(): any[] {
    return JSON.parse(localStorage.getItem('diabeto_appointments') || '[]');
  },
};

