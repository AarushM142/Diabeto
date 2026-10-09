export type UserRole = 'clinician' | 'coach' | 'caregiver' | 'patient' | 'admin';

export interface PatientProfile {
  name: string;
  age: number;
  gender: string;
  diabetes_type: string;
  years_with_diabetes?: string;
  language: 'en' | 'hi' | 'mr';
  phone?: string;
  connection_code?: string;
  caregiver_name?: string;
  caregiver_phone?: string;
  caregiver_relation?: string;
  target_fasting_glucose?: number;
  target_postmeal_glucose?: number;
  medications?: string[];
  emergency_notes?: string;
}

export interface CaregiverProfile {
  caregiver_name: string;
  relation: string;
  patient_name: string;
  patient_age: number;
  patient_diabetes_type?: string;
  emergency_phone: string;
}

export interface ClinicianProfile {
  doctor_name: string;
  clinic_name: string;
  specialty: string;
  license_number?: string;
}

export interface CoachProfile {
  coach_name: string;
  specialty: string;
  clinic_name?: string;
}

export interface User {
  id: string;
  role: UserRole;
  clinic_id: string;
  name: string;
  email: string;
  title: string;
  avatar?: string;
  linked_patient_id?: string;
  age?: number;
  gender?: string;
  phone?: string;
  language?: 'en' | 'hi' | 'mr';
  patient_profile?: PatientProfile;
  caregiver_profile?: CaregiverProfile;
  clinician_profile?: ClinicianProfile;
  coach_profile?: CoachProfile;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

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

export interface ClinicianPatientSummary {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  language: string;
  diagnosis: string;
  connection_code: string;
  severity: 'critical' | 'watch' | 'stable';
  latest_glucose?: number | null;
  latest_glucose_time?: string | null;
  tir_percentage?: number | null;
  adherence_score_pct?: number | null;
  active_alerts_count: number;
  clinician_of_record_id?: string | null;
}

export interface ConnectionCodeResponse {
  patient_id: string;
  patient_name: string;
  connection_code: string;
  doctor_id: string;
  doctor_name?: string | null;
  invite_link: string;
}

export interface DetectedFoodItem {
  food: string;
  estimated_portion: string;
  estimated_carbs_g: number;
  carbs_range_g?: string;
  confidence: number;
  is_high_sugar: boolean;
  glycemic_impact: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
}

export interface MealAnalysisResult {
  meal_id: string;
  patient_id: string;
  meal_type: string;
  timestamp: string;
  foods: DetectedFoodItem[];
  estimated_total_carbs_g: number;
  carbohydrate_impact: 'LOW' | 'MEDIUM' | 'HIGH';
  high_sugar_items: string[];
  confidence: number;
  elderly_explanation: string;
  sugar_warning?: string;
  notes: string;
  safety_disclaimer: string;
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

export const AUTH_STORAGE_KEY = 'diabeto_auth_token';
export const USER_STORAGE_KEY = 'diabeto_user';

export const getCurrentUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const saveProfileForEmail = (email: string, user: User) => {
  if (!email) return;
  try {
    localStorage.setItem(`diabeto_profile_${email.toLowerCase().trim()}`, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to persist user profile by email:', e);
  }
};

export const getSavedProfileForEmail = (email: string): User | null => {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(`diabeto_profile_${email.toLowerCase().trim()}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveAuthSession = (token: string, user: User) => {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    if (user.email) {
      saveProfileForEmail(user.email, user);
    }
  } catch (e) {
    console.error('Failed to persist auth session:', e);
  }
};

export const clearAuthSession = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear auth session:', e);
  }
};

let activeRole: UserRole = 'clinician';
let activeUserId: string = 'doc_mehta_101';

export const setGlobalPersona = (role: UserRole, userId?: string) => {
  activeRole = role;
  if (userId) activeUserId = userId;
};

export const getGlobalPersona = (): UserRole => {
  const user = getCurrentUser();
  return user?.role || activeRole;
};

const getHeaders = (extraHeaders: Record<string, string> = {}) => {
  const user = getCurrentUser();
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Role': user?.role || activeRole,
    'X-User-ID': user?.id || activeUserId,
    ...extraHeaders,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export const api = {
  getCurrentUser(): User | null {
    return getCurrentUser();
  },

  getToken(): string | null {
    return getAuthToken();
  },

  async login(email: string, password?: string, role?: UserRole): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Authentication failed');
    }
    const data: AuthResponse = await res.json();
    saveAuthSession(data.access_token, data.user);
    setGlobalPersona(data.user.role, data.user.id);
    return data;
  },

  async googleAuth(
    email?: string, 
    name?: string, 
    role?: UserRole, 
    profile?: Partial<PatientProfile | CaregiverProfile | ClinicianProfile | CoachProfile>
  ): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role, profile }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Google sign-in failed');
    }
    const data: AuthResponse = await res.json();
    saveAuthSession(data.access_token, data.user);
    setGlobalPersona(data.user.role, data.user.id);
    return data;
  },

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    const currentUser = getCurrentUser();
    const updatedUser: User = {
      ...(currentUser || {} as User),
      ...updates,
      patient_profile: updates.patient_profile || currentUser?.patient_profile,
      caregiver_profile: updates.caregiver_profile || currentUser?.caregiver_profile,
      clinician_profile: updates.clinician_profile || currentUser?.clinician_profile,
      coach_profile: updates.coach_profile || currentUser?.coach_profile,
    };
    const token = getAuthToken() || `token_${Date.now()}`;
    saveAuthSession(token, updatedUser);
    
    // Attempt backend sync - use returned token if available
    try {
      const syncRes = await fetch(`${API_BASE}/auth/profile`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(3000),
      });
      if (syncRes.ok) {
        const syncData = await syncRes.json().catch(() => null);
        if (syncData?.access_token) {
          // Re-save with the new token that embeds updated profile data
          saveAuthSession(syncData.access_token, updatedUser);
        }
      }
    } catch (e) {
      console.warn('Backend profile sync failed, local profile updated:', e);
    }

    return updatedUser;
  },

  async signup(name: string, email: string, password: string, role: UserRole = 'clinician'): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    const data: AuthResponse = await res.json();
    saveAuthSession(data.access_token, data.user);
    setGlobalPersona(data.user.role, data.user.id);
    return data;
  },

  logout() {
    clearAuthSession();
  },

  setPersona(role: UserRole, userId?: string) {
    setGlobalPersona(role, userId);
  },

  getPersona(): UserRole {
    return getGlobalPersona();
  },

  async getPersonas(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/personas`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' }).catch(() => null);
      return Boolean(res && res.ok);
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

  getClinicalPdfUrl(patientId: string, notes?: string): string {
    const query = notes ? `?notes=${encodeURIComponent(notes)}` : '';
    return `${API_BASE}/patients/${patientId}/report/pdf${query}`;
  },

  async downloadClinicalPdfReport(patientId: string, notes?: string): Promise<void> {
    const url = this.getClinicalPdfUrl(patientId, notes);
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to generate clinical PDF report');
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `diabeto_clinical_report_${patientId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  },

  async getEhrSummary(patientId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/report/summary`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch EHR summary');
    return res.json();
  },

  async getMealPatterns(patientId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/meals/${patientId}/patterns`, {
      headers: getHeaders(),
    });
    if (!res.ok) return { patterns: [] };
    return res.json();
  },

  async analyzeMeal(payload: {
    image_base64?: string;
    image_file?: File;
    notes?: string;
    patient_id?: string;
    meal_type?: string;
  }): Promise<MealAnalysisResult> {
    if (payload.image_file) {
      const formData = new FormData();
      formData.append('file', payload.image_file);
      formData.append('patient_id', payload.patient_id || 'pt_ramesh_001');
      if (payload.meal_type) formData.append('meal_type', payload.meal_type);
      if (payload.notes) formData.append('context_hint', payload.notes);

      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/meals/analyze`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to analyze meal photograph');
      return res.json();
    } else {
      const res = await fetch(`${API_BASE}/meals/analyze`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          image_base64: payload.image_base64,
          notes: payload.notes,
          patient_id: payload.patient_id || 'pt_ramesh_001',
          meal_type: payload.meal_type,
        }),
      });
      if (!res.ok) throw new Error('Failed to analyze meal');
      return res.json();
    }
  },

  async getMealHistory(patientId: string = 'pt_ramesh_001'): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/meals/history/${patientId}`, {
        headers: getHeaders(),
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async getClinicianPatients(doctorId: string = 'doc_mehta_101'): Promise<ClinicianPatientSummary[]> {
    const res = await fetch(`${API_BASE}/clinicians/${doctorId}/patients`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load clinician patients roster');
    return res.json();
  },

  async connectPatient(doctorId: string, connectionCode: string): Promise<{ success: boolean; message: string; patient: any }> {
    const res = await fetch(`${API_BASE}/clinicians/connect-patient`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ doctor_id: doctorId, connection_code: connectionCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to connect patient' }));
      throw new Error(err.detail || 'Failed to connect patient');
    }
    return res.json();
  },

  async getPatientConnectionCode(patientId: string = 'pt_ramesh_001'): Promise<ConnectionCodeResponse> {
    const res = await fetch(`${API_BASE}/patients/${patientId}/connection-code`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch patient connection code');
    return res.json();
  },
};


