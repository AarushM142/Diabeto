// Diabeto API Client for Web Portals

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

const API_BASE = '/v1';

export const api = {
  async getHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getTrends(patientId: string, days: number = 14): Promise<TrendAnalytics> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/trends?days=${days}`);
    if (!res.ok) throw new Error(`Failed to fetch trends for ${patientId}`);
    return res.json();
  },

  async getRisks(patientId: string): Promise<RiskEvent[]> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/risks`);
    if (!res.ok) throw new Error(`Failed to fetch risks for ${patientId}`);
    return res.json();
  },

  async ackRisk(riskId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/escalations/${riskId}/ack`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to acknowledge risk');
    return res.json();
  },

  async getPendingApprovals(): Promise<Recommendation[]> {
    const res = await fetch(`${API_BASE}/approvals`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, feedback, edited_text: editedText }),
    });
    if (!res.ok) throw new Error('Failed to submit decision');
    return res.json();
  },

  async generateNudge(patientId: string): Promise<Recommendation> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/generate-nudge`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to generate nudge');
    return res.json();
  },

  async getWeeklySummary(patientId: string, days: number = 7): Promise<WeeklySummary> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/weekly-summary?days=${days}`);
    if (!res.ok) throw new Error('Failed to fetch weekly summary');
    return res.json();
  },

  async verifyWeeklySummary(patientId: string, notes?: string): Promise<WeeklySummary> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/weekly-summary/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error('Failed to verify weekly summary');
    return res.json();
  },

  async logHealthEvent(patientId: string, mgdl: number, context: string = 'fasting'): Promise<any> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
};
