export type Language = 'en' | 'hi' | 'mr';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'doctor' | 'coach' | 'system';
  text: string;
  timestamp: string;
  authorName?: string;
  isVoice?: boolean;
  voiceDuration?: string;
  transcript?: string;
  detectedLang?: string;
  severity?: 'normal' | 'warn' | 'critical';
  escalationNotice?: string;
  clientMsgId?: string;
}

export interface ScenarioPreset {
  id: string;
  label: string;
  promptText: string;
  isVoice?: boolean;
  voiceDuration?: string;
  description: string;
  category: 'glucose' | 'adherence' | 'diet' | 'emergency';
}
