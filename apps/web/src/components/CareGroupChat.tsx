import React, { useEffect, useRef, useState } from 'react';
import {
  Phone, MoreVertical, Send, Mic, Play, Pause, AlertCircle,
  Sparkles, CheckCheck, Check, RefreshCw, Volume2, ShieldCheck,
  Eye, Stethoscope, HeartHandshake, ShieldAlert, Info, Lock, X, Square,
} from 'lucide-react';
import type { Language, ChatMessage } from '../lib/types';
import { useWhatsAppThread, nowTime } from '../lib/whatsappStore';
import { api, type User, type ClinicianPatientSummary } from '../api/client';

interface CareGroupChatProps {
  language: Language;
  currentUser?: (Partial<User> & { id?: string; role?: string; name?: string; linked_patient_id?: string }) | null;
  patientId?: string;
  patientName?: string;
}

// ─── Fallback AI reply logic ──────────────────────────────────────────────────
const fallbackReply = (text: string, lang: Language, activityConsentGranted: boolean): string => {
  const lower = text.toLowerCase();

  if (lower.includes('54') || lower.includes('chakkar') || lower.includes('dizzy') || lower.includes('faint')) {
    return lang === 'hi'
      ? '🚨 आपातकालीन सूचना: आपकी शुगर बहुत कम है। तुरंत 3 चम्मच चीनी या गुड़ लें। यदि चक्कर आए तो 112 या 108 पर कॉल करें। आपकी देखभालकर्ता को सूचित कर दिया गया है।'
      : lang === 'mr'
        ? '🚨 तातडीची सूचना: आपली साखर खूप कमी आहे. त्वरित ३ चमचे साखर किंवा फळांचा रस घ्या. ११२ वर फोन करा. कुटुंबीयांना सूचना पाठवली आहे.'
        : '🚨 EMERGENCY: Glucose is critically low. Take 3 spoons of sugar or fruit juice NOW. Call 112 if dizzy. Your caregiver has been alerted.';
  }

  if (
    lower.includes('walk') || lower.includes('exercise') || lower.includes('yoga') ||
    lower.includes('चलना') || lower.includes('व्यायाम') || lower.includes('चाल')
  ) {
    if (!activityConsentGranted) {
      return lang === 'hi'
        ? '⚕️ व्यायाम या गतिविधि सलाह देने के लिए डॉक्टर की अनुमति आवश्यक है। आपके डॉक्टर ने अभी सहमति नहीं दी है।'
        : lang === 'mr'
          ? '⚕️ शारीरिक हालचालींबाबत सल्ला देण्यासाठी डॉक्टरांची परवानगी आवश्यक आहे. तुमच्या डॉक्टरांनी अद्याप संमती दिलेली नाही.'
          : "⚕️ Activity advice requires your doctor's consent. Your doctor has not yet granted permission for lifestyle recommendations.";
    }
    return lang === 'hi'
      ? '🚶 खाने के बाद 10-15 मिनट हल्की चहलकदमी आपकी शुगर को बेहतर बना सकती है। लेकिन यदि शुगर 70 से कम हो तो बिल्कुल न चलें।'
      : lang === 'mr'
        ? '🚶 जेवणानंतर १०-१५ मिनिटे हळू चालणे आपली साखर नियंत्रित ठेवण्यास मदत करते.'
        : '🚶 A gentle 10–15 min stroll after meals can help regulate your glucose. Do not walk if your reading is below 70 mg/dL.';
  }

  if (lower.includes('aam') || lower.includes('mango') || lower.includes('sweet')) {
    return lang === 'hi'
      ? '🥭 आम में प्राकृतिक मिठास होती है। दोपहर के खाने के साथ 1-2 छोटे टुकड़े लें।'
      : '🥭 Mango has natural sugars. You may have 1-2 small slices with lunch — avoid a whole mango at once.';
  }

  const numMatch = lower.match(/\b(\d{2,3})\b/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    if (val > 0 && val < 70) {
      return `🚨 Glucose ${val} mg/dL — very low. Take something sweet immediately and recheck in 5 minutes.`;
    }
    if (val >= 70 && val <= 140) {
      return `✅ Glucose ${val} mg/dL is in the normal range. Keep up your medication routine.`;
    }
    if (val > 140 && val <= 250) {
      return `⚠️ Glucose ${val} mg/dL is slightly elevated. Stay hydrated and avoid heavy meals. Your doctor has been informed.`;
    }
    if (val > 250) {
      return `🚨 Glucose ${val} mg/dL is dangerously high! Please contact your doctor immediately.`;
    }
  }

  return lang === 'hi'
    ? '🙏 नमस्ते जी! आपका संदेश मिला। अपनी दवाइयां समय पर लें और कोई भी सवाल पूछें।'
    : lang === 'mr'
      ? '🙏 नमस्कार! आपला संदेश मिळाला. औषध वेळेवर घ्या.'
      : '🙏 Namaste! Message received. Keep up your medication routine and feel free to ask anything!';
};

const detectEscalation = (text: string): boolean => {
  const lower = text.toLowerCase();
  const numMatch = lower.match(/\b(\d+)\b/);
  const numVal = numMatch ? parseInt(numMatch[1], 10) : 999;
  return lower.includes('chakkar') || lower.includes('dizzy') || lower.includes('faint') || numVal < 65;
};

// ─── Participant config ────────────────────────────────────────────────────────
const PARTICIPANTS = [
  { key: 'patient', label: 'Patient', emoji: '🧓', color: '#DCF8C6', textColor: '#1a5c2a' },
  { key: 'caretaker', label: 'Caretaker', emoji: '❤️', color: '#E8F4FD', textColor: '#1a3a5c' },
  { key: 'doctor', label: 'Doctor', emoji: '🩺', color: '#FDF0E8', textColor: '#8A4B2F' },
  { key: 'bot', label: 'Diabeto AI', emoji: '🤖', color: '#FFFFFF', textColor: '#075E54' },
] as const;

type ParticipantKey = (typeof PARTICIPANTS)[number]['key'];

const getParticipant = (key: string) =>
  PARTICIPANTS.find((p) => p.key === key) ?? PARTICIPANTS[3];

// ─── Component ────────────────────────────────────────────────────────────────
export const CareGroupChat: React.FC<CareGroupChatProps> = ({
  language,
  currentUser,
  patientId: propPatientId,
  patientName: propPatientName,
}) => {
  const activeUser: User = {
    id: currentUser?.id || 'guest_user',
    role: (currentUser?.role as any) || 'patient',
    clinic_id: currentUser?.clinic_id || 'clinic_pune_central',
    name: currentUser?.name || 'Care Member',
    email: currentUser?.email || '',
    title: currentUser?.title || '',
  };

  const [availablePatients, setAvailablePatients] = useState<ClinicianPatientSummary[]>([]);
  const [dynamicPatientId, setDynamicPatientId] = useState<string>(propPatientId || '');
  const [dynamicPatientName, setDynamicPatientName] = useState<string>(propPatientName || '');

  useEffect(() => {
    if (currentUser?.id && (activeUser.role === 'caregiver' || activeUser.role === 'clinician')) {
      const fetchList = activeUser.role === 'caregiver'
        ? api.getCaregiverPatients(currentUser.id)
        : api.getClinicianPatients(currentUser.id);

      fetchList.then((list: ClinicianPatientSummary[]) => {
        if (list && list.length > 0) {
          setAvailablePatients(list);
          if (!propPatientId && !dynamicPatientId) {
            setDynamicPatientId(list[0].id);
            setDynamicPatientName(list[0].name);
          } else if (propPatientId) {
            const found = list.find((p) => p.id === propPatientId);
            if (found) {
              setDynamicPatientName(found.name);
            }
          }
        }
      }).catch(() => {});
    }
  }, [propPatientId, activeUser.role, currentUser?.id]);

  useEffect(() => {
    if (propPatientId) {
      setDynamicPatientId(propPatientId);
      if (propPatientName) {
        setDynamicPatientName(propPatientName);
      }
    }
  }, [propPatientId, propPatientName]);

  const resolvedPatientId =
    dynamicPatientId ||
    propPatientId ||
    (activeUser.role === 'patient' ? activeUser.id : '') ||
    (currentUser as (User & { linked_patient_id?: string }) | undefined)?.linked_patient_id?.trim() ||
    '';
  const resolvedPatientName =
    dynamicPatientName || propPatientName || activeUser.name || 'Your Elder';
  const patientFirstName = resolvedPatientName.split(' ')[0] || 'Friend';

  const { messages, appendMessage, clearMessages } = useWhatsAppThread(
    resolvedPatientId,
    patientFirstName,
    language,
  );

  const defaultComposer = (): ParticipantKey => {
    if (activeUser.role === 'patient') return 'patient';
    if (activeUser.role === 'clinician') return 'doctor';
    if (activeUser.role === 'caregiver') return 'caretaker';
    return 'patient';
  };

  const [activeComposer, setActiveComposer] = useState<ParticipantKey>(defaultComposer);
  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [escalationAlert, setEscalationAlert] = useState<string | null>(null);
  const [activityConsentGranted, setActivityConsentGranted] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(true);
  const [voiceStatusNotice, setVoiceStatusNotice] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const speechTranscriptRef = useRef<string>('');
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isSendingRef = useRef<boolean>(false);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Timer effect for recording seconds
  useEffect(() => {
    let interval: number | null = null;
    if (isRecording) {
      setRecordingSeconds(0);
      interval = window.setInterval(() => setRecordingSeconds((p) => p + 1), 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [isRecording]);

  // Component unmount-only cleanup
  useEffect(() => {
    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.abort();
        } catch { }
      }
      if (activeAudioRef.current) {
        try {
          activeAudioRef.current.pause();
        } catch { }
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const startVoiceRecording = () => {
    setVoiceStatusNotice(null);
    speechTranscriptRef.current = '';
    setInputVal('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceStatusNotice(
        language === 'hi'
          ? 'आपके ब्राउज़र में आवाज़ पहचान उपलब्ध नहीं है। कृपया Chrome ब्राउज़र में खोलें।'
          : language === 'mr'
            ? 'आपल्या ब्राउझरमध्ये व्हॉईस रेकॉर्डिंग उपलब्ध नाही. कृपया Chrome मध्ये उघडा.'
            : 'Live speech recognition is not supported in this browser. Please use Chrome.'
      );
      return;
    }

    try {
      // Abort any existing instance first
      if (speechRecognitionRef.current) {
        try { speechRecognitionRef.current.abort(); } catch { }
      }

      const recognition = new SpeechRecognition();
      const langMap: Record<Language, string> = {
        hi: 'hi-IN',
        mr: 'mr-IN',
        en: 'en-IN',
      };
      recognition.lang = langMap[language] || 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript + ' ';
        }
        const cleaned = fullTranscript.trim();
        speechTranscriptRef.current = cleaned;
        setInputVal(cleaned);
      };

      recognition.onerror = (event: any) => {
        const err: string = event.error;
        console.warn('[Speech Recognition Error]', err);

        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setVoiceStatusNotice(
            language === 'hi'
              ? 'माइक की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।'
              : 'Microphone permission denied. Please allow microphone access in your browser.'
          );
          isRecordingRef.current = false;
          setIsRecording(false);
        } else if (err === 'audio-capture') {
          setVoiceStatusNotice(
            language === 'hi'
              ? 'माइक नहीं मिला। कृपया माइक्रोफ़ोन कनेक्ट करके फिर कोशिश करें।'
              : 'No microphone found. Please connect a mic and try again.'
          );
          isRecordingRef.current = false;
          setIsRecording(false);
        } else if (err === 'network') {
          setVoiceStatusNotice('Speech recognition requires an internet connection.');
          isRecordingRef.current = false;
          setIsRecording(false);
        } else if (err === 'no-speech') {
          // non-fatal
        } else if (err === 'aborted') {
          // aborted intentionally or by user
        } else {
          setVoiceStatusNotice(`Speech recognition notice: ${err}`);
          isRecordingRef.current = false;
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        // Only restart if still actively recording and not stopped by user
        if (isRecordingRef.current && speechRecognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch { }
        }
      };

      speechRecognitionRef.current = recognition;
      isRecordingRef.current = true;
      recognition.start();
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err: any) {
      console.warn('[Speech Recognition Start Error]', err);
      isRecordingRef.current = false;
      setIsRecording(false);
      setVoiceStatusNotice(
        language === 'hi'
          ? 'आवाज़ पहचान शुरू नहीं हो सकी। कृपया पुनः प्रयास करें।'
          : `Could not start speech recognition: ${err?.message || err}. Please try again.`
      );
    }
  };

  const stopVoiceRecordingAndSend = () => {
    // 1. Guard against duplicate execution
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);

    // 2. Detach recognition listeners so buffered audio flushed by stop() does not fire zombie onresult
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop();
      } catch { }
      speechRecognitionRef.current = null;
    }

    const capturedText = (speechTranscriptRef.current || inputVal).trim();
    // Clear captured speech and input synchronously
    speechTranscriptRef.current = '';
    setInputVal('');

    if (capturedText) {
      const dur = `0:${recordingSeconds < 10 ? '0' : ''}${Math.max(recordingSeconds, 1)}`;
      sendMessage(capturedText, true, dur);
    } else {
      setVoiceStatusNotice(
        language === 'hi'
          ? 'आवाज़ सुनाई नहीं दी। कृपया माइक के पास साफ़ बोलें या लिखकर भेजें।'
          : language === 'mr'
            ? 'आवाज ऐकू आला नाही. कृपया माइक जवळ स्पष्ट बोला किंवा टाईप करा.'
            : 'No speech was recognized. Please speak clearly into your microphone or type your message.'
      );
    }
  };

  const cancelVoiceRecording = () => {
    isRecordingRef.current = false;
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.abort();
      } catch { }
      speechRecognitionRef.current = null;
    }
    setIsRecording(false);
    speechTranscriptRef.current = '';
    setInputVal('');
    setRecordingSeconds(0);
  };

  const cleanTextForSpeech = (rawText: string): string => {
    return rawText
      // Remove all emojis and symbol descriptions
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}✅🚨⚠️🙏🚶🥭🤖🧓❤️🩺🔒💬]/gu, '')
      // Remove markdown bold, headers, links
      .replace(/[*_#`~[\]()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const fallbackBrowserTTS = (msgId: string, text: string) => {
    if (!window.speechSynthesis) {
      setPlayingAudioId(null);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find(
      (v) =>
        (language === 'hi' && (v.lang.startsWith('hi') || v.lang.includes('hi-IN'))) ||
        (language === 'mr' && (v.lang.startsWith('mr') || v.lang.startsWith('hi'))) ||
        v.lang.includes('en-IN') ||
        v.lang.startsWith('en')
    );
    if (targetVoice) utterance.voice = targetVoice;
    utterance.onend = () => setPlayingAudioId(null);
    utterance.onerror = () => setPlayingAudioId(null);
    setPlayingAudioId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const playVoiceAudio = async (msgId: string, rawText: string) => {
    if (playingAudioId === msgId) {
      window.speechSynthesis?.cancel();
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    const cleaned = cleanTextForSpeech(rawText);
    if (!cleaned) return;

    setPlayingAudioId(msgId);

    // 1. Try Backend Sarvam AI TTS (Bulbul v3) for authentic Indian audio
    try {
      const res = await fetch('/v1/webhooks/whatsapp/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleaned,
          language: language,
          pace: 0.92,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.voice_reply && data.audio_base64) {
          const audioUrl = `data:${data.audio_format || 'audio/wav'};base64,${data.audio_base64}`;
          const audio = new Audio(audioUrl);
          activeAudioRef.current = audio;
          audio.onended = () => {
            activeAudioRef.current = null;
            setPlayingAudioId(null);
          };
          audio.onerror = () => {
            activeAudioRef.current = null;
            fallbackBrowserTTS(msgId, cleaned);
          };
          await audio.play();
          return;
        }
      }
    } catch (err) {
      console.warn('[Sarvam TTS synthesis fallback]', err);
    }

    // 2. Fallback to clean browser TTS without emojis
    fallbackBrowserTTS(msgId, cleaned);
  };

  const getAuthorName = (composer: ParticipantKey): string => {
    if (composer === 'patient') return resolvedPatientName;
    if (composer === 'caretaker')
      return activeUser.role === 'caregiver' ? activeUser.name : 'Family Caretaker';
    if (composer === 'doctor')
      return activeUser.role === 'clinician' ? activeUser.name : 'Doctor';
    return 'Diabeto AI';
  };

  const sendMessage = async (textToSend: string, isVoice = false, voiceDuration?: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isSendingRef.current || isProcessing || !resolvedPatientId) return;

    isSendingRef.current = true;
    setIsProcessing(true);

    const senderKey: ChatMessage['sender'] =
      activeComposer === 'caretaker' ? 'user' :
      activeComposer === 'patient' ? 'user' :
      activeComposer as ChatMessage['sender'];

    const userMsgId = `msg_${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      clientMsgId: userMsgId,
      sender: senderKey,
      authorName: getAuthorName(activeComposer),
      text: trimmed,
      timestamp: nowTime(),
      isVoice,
      voiceDuration,
      transcript: isVoice ? trimmed : undefined,
    };
    appendMessage(userMsg, activeUser.id);
    setInputVal('');

    // Only patient messages trigger an AI response
    if (activeComposer !== 'patient') {
      isSendingRef.current = false;
      setIsProcessing(false);
      return;
    }

    if (detectEscalation(trimmed)) {
      setEscalationAlert('🚨 Hypo alert detected — caregiver & doctor notified via SMS/WhatsApp (15g sugar rule active).');
    } else {
      setEscalationAlert(null);
    }

    try {
      const formData = new URLSearchParams();
      formData.append('PatientId', resolvedPatientId);
      formData.append('PatientName', resolvedPatientName);
      formData.append('From', resolvedPatientId || 'whatsapp:+919800000001');
      formData.append('Body', trimmed);
      formData.append('Language', language || 'en');
      formData.append('MessageSid', `CAREGROUP_${Date.now()}`);
      if (isVoice) {
        formData.append('MediaContentType0', 'audio/ogg');
        formData.append('NumMedia', '1');
      }

      const res = await fetch('/v1/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      let botText = '';
      if (res.ok) {
        const raw = await res.text();
        const match = raw.match(/<Message>([\s\S]*?)<\/Message>/);
        if (match?.[1]) {
          botText = match[1];
        } else {
          try {
            const json = JSON.parse(raw);
            botText = json.reply || json.response || json.message || raw;
          } catch {
            botText = raw;
          }
        }
      } else {
        botText = fallbackReply(trimmed, language, activityConsentGranted);
      }

      const botMsgId = `bot_${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        clientMsgId: botMsgId,
        sender: 'bot',
        authorName: 'Diabeto AI',
        text: botText,
        timestamp: nowTime(),
      };
      appendMessage(botMsg, activeUser.id);
      if (isVoice) setTimeout(() => playVoiceAudio(botMsg.id, botText), 500);
    } catch {
      const fallbackId = `bot_${Date.now()}`;
      appendMessage({
        id: fallbackId,
        clientMsgId: fallbackId,
        sender: 'bot',
        authorName: 'Diabeto AI',
        text: fallbackReply(trimmed, language, activityConsentGranted),
        timestamp: nowTime(),
      }, activeUser.id);
    } finally {
      isSendingRef.current = false;
      setIsProcessing(false);
    }
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────
  const renderAvatar = (sender: string, authorName?: string) => {
    const p = getParticipant(sender);
    const isCaretaker = sender === 'user' && authorName !== resolvedPatientName;
    const emoji = sender === 'bot' ? '🤖' : sender === 'doctor' ? '🩺' : isCaretaker ? '❤️' : '🧓';
    return (
      <div style={{
        width: '34px', height: '34px', borderRadius: '50%',
        background: !isCaretaker && sender === 'user' ? '#DCF8C6' : isCaretaker ? '#E8F4FD' : p.color,
        border: `2px solid ${p.textColor}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1rem', flexShrink: 0,
      }}>
        {emoji}
      </div>
    );
  };

  const renderSenderLabel = (m: ChatMessage) => {
    const isCaretaker = m.sender === 'user' && m.authorName !== resolvedPatientName;
    const color =
      m.sender === 'bot' ? '#075E54' :
      m.sender === 'doctor' ? '#8A4B2F' :
      isCaretaker ? '#1a3a5c' :
      '#1a5c2a';
    return (
      <span style={{ fontSize: '0.72rem', fontWeight: 700, color, display: 'block', marginBottom: '3px' }}>
        {m.authorName || (m.sender === 'bot' ? 'Diabeto AI' : 'Unknown')}
      </span>
    );
  };

  const isOwnMessage = (m: ChatMessage): boolean => {
    if (activeUser.role === 'patient' && m.sender === 'user' && m.authorName === resolvedPatientName) return true;
    if (activeUser.role === 'clinician' && m.sender === 'doctor') return true;
    if (activeUser.role === 'caregiver' && m.sender === 'user' && m.authorName !== resolvedPatientName) return true;
    return false;
  };

  const getBubbleBg = (m: ChatMessage): string => {
    if (isOwnMessage(m)) return '#DCF8C6';
    if (m.sender === 'bot') return '#FFFFFF';
    if (m.sender === 'doctor') return '#FDF0E8';
    if (m.sender === 'user') {
      return m.authorName === resolvedPatientName ? '#DCF8C6' : '#E8F4FD';
    }
    return '#FFFFFF';
  };

  const canCompose = activeUser.role !== 'admin' && Boolean(resolvedPatientId);

  if (!resolvedPatientId) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flex: 1, height: '100%', minHeight: '380px', gap: '12px',
        background: 'var(--surface-white)', borderRadius: '16px', padding: '32px', textAlign: 'center',
        border: '1px solid var(--border-stone)',
      }}>
        <div style={{ fontSize: '2rem' }}>🔗</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>No elder linked yet</div>
        <div style={{ fontSize: '0.85rem', color: '#666', maxWidth: '420px' }}>
          {activeUser.role === 'caregiver'
            ? 'Ask your elder for their Diabeto Care Connection Code and link them from the Caregiver portal to start chatting.'
            : 'Link a patient via their Care Connection Code to open the shared care thread.'}
        </div>
      </div>
    );
  }

  const composerOptions: { key: ParticipantKey; label: string; icon: React.FC<any>; locked: boolean }[] = [
    {
      key: 'patient',
      label: patientFirstName,
      icon: () => <span>🧓</span>,
      locked: activeUser.role !== 'patient' && activeUser.role !== 'admin',
    },
    {
      key: 'caretaker',
      label: 'Caretaker',
      icon: HeartHandshake,
      locked: activeUser.role !== 'caregiver' && activeUser.role !== 'admin',
    },
    {
      key: 'doctor',
      label: 'Doctor',
      icon: Stethoscope,
      locked: activeUser.role !== 'clinician' && activeUser.role !== 'admin',
    },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      flex: 1,
      height: '100%',
      minHeight: '480px',
      background: 'var(--surface-white)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      border: '1px solid var(--border-stone)',
    }}>
      {/* ── Group chat header ── */}
      <div style={{
        background: '#075E54',
        padding: '14px 20px',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          width: '46px', height: '46px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', flexShrink: 0,
        }}>
          💬
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>Diabeto Care Group</div>
            {availablePatients.length > 0 && (activeUser.role === 'clinician' || activeUser.role === 'caregiver') && (
              <select
                value={resolvedPatientId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  const found = availablePatients.find((p) => p.id === selectedId);
                  if (found) {
                    setDynamicPatientId(found.id);
                    setDynamicPatientName(found.name);
                  }
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {availablePatients.map((p) => (
                  <option key={p.id} value={p.id} style={{ color: '#000' }}>
                    🧓 {p.name} ({p.connection_code})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '2px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#25D366', display: 'inline-block', flexShrink: 0 }} />
            <span>🧓 {resolvedPatientName}</span>
            <span>• 🤖 Diabeto AI</span>
            <span>• ❤️ Caretaker</span>
            <span>• 🩺 Doctor</span>
          </div>
        </div>
        <Phone size={18} color="#FFFFFF" style={{ flexShrink: 0 }} />
        <MoreVertical size={18} color="#FFFFFF" style={{ flexShrink: 0 }} />
      </div>

      {/* ── Participant pills ── */}
      <div style={{
        background: '#f0f2f5',
        borderBottom: '1px solid #e0e0e0',
        padding: '8px 16px',
        display: 'flex', gap: '8px', flexWrap: 'wrap',
        flexShrink: 0,
      }}>
        {PARTICIPANTS.map((p) => (
          <span key={p.key} style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            background: p.color, border: `1px solid ${p.textColor}33`,
            borderRadius: '20px', padding: '3px 10px',
            fontSize: '0.72rem', fontWeight: 600, color: p.textColor,
          }}>
            {p.emoji} {p.label}
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#25D366', display: 'inline-block' }} />
          </span>
        ))}
      </div>

      {/* ── Doctor consent banner ── */}
      {showConsentBanner && (
        <div style={{
          background: activityConsentGranted ? '#E6F4EA' : '#FFF8E6',
          borderBottom: `1px solid ${activityConsentGranted ? '#B8E2B8' : '#FFD88A'}`,
          padding: '9px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          flexShrink: 0,
        }}>
          <ShieldAlert size={16} color={activityConsentGranted ? '#2E7D32' : '#E65100'} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.77rem', color: '#444' }}>
            {activityConsentGranted
              ? <span><strong style={{ color: '#2E7D32' }}>✅ Doctor consent active:</strong> AI may now give activity &amp; lifestyle advice.</span>
              : <span><strong style={{ color: '#E65100' }}>⚕️ Clinical Safety:</strong> AI will <strong>NOT</strong> give activity advice until a doctor grants consent.</span>
            }
          </div>
          {(activeUser.role === 'clinician' || activeUser.role === 'admin') && (
            <button
              type="button"
              onClick={() => setActivityConsentGranted((v) => !v)}
              style={{
                background: activityConsentGranted ? '#D32F2F' : '#2E7D32',
                color: '#FFFFFF', border: 'none', borderRadius: '8px',
                padding: '5px 12px', fontSize: '0.74rem', fontWeight: 700,
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              {activityConsentGranted ? '🔒 Revoke' : '✅ Grant Consent'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowConsentBanner(false)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Escalation alert ── */}
      {escalationAlert && (
        <div style={{
          background: '#FFEBEE', borderBottom: '1px solid #FFCDD2',
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '0.78rem', fontWeight: 600, color: '#C62828', flexShrink: 0,
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          {escalationAlert}
        </div>
      )}

      {/* ── E2E notice ── */}
      <div style={{
        background: '#FCF4CB', padding: '4px 16px',
        fontSize: '0.68rem', color: '#666', textAlign: 'center',
        borderBottom: '1px solid #e8dca0', flexShrink: 0,
      }}>
        🔒 End-to-end encrypted • All parties can read this conversation in real-time
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        background: '#E5DDD5',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '2px',
      }}>
        <div style={{ textAlign: 'center', margin: '8px 0 14px' }}>
          <span style={{
            background: 'rgba(255,255,255,0.85)', borderRadius: '8px',
            padding: '4px 12px', fontSize: '0.72rem', color: '#555',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}>
            Today
          </span>
        </div>

        {messages.map((m) => {
          const own = isOwnMessage(m);
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                flexDirection: own ? 'row-reverse' : 'row',
                gap: '8px',
                alignItems: 'flex-end',
                marginBottom: '8px',
              }}
            >
              {!own && renderAvatar(m.sender, m.authorName)}

              <div style={{
                background: getBubbleBg(m),
                borderRadius: own ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
                padding: '8px 12px',
                maxWidth: '72%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                borderLeft: m.sender === 'doctor' ? '3px solid #C27B66' : 'none',
              }}>
                {!own && renderSenderLabel(m)}

                {m.isVoice ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => playVoiceAudio(m.id, m.transcript || m.text)}
                        style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: '#075E54', border: 'none', color: '#FFFFFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {playingAudioId === m.id ? <Pause size={13} fill="#FFF" /> : <Play size={13} fill="#FFF" />}
                      </button>
                      <div style={{ height: '3px', background: '#25D366', flex: 1, borderRadius: '2px' }} />
                      <span style={{ fontSize: '0.7rem', color: '#666', fontWeight: 600 }}>
                        {m.voiceDuration || '0:06'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#555', fontStyle: 'italic' }}>
                      🎙️ "{m.transcript || m.text}"
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.9rem', color: '#111', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {m.text}
                    </div>
                    {m.sender === 'bot' && (
                      <button
                        type="button"
                        onClick={() => playVoiceAudio(m.id, m.text)}
                        style={{
                          marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: '#F0F9F0', border: '1px solid #B8E2B8',
                          color: '#075E54', borderRadius: '14px', padding: '3px 10px',
                          fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        <Volume2 size={12} />
                        {playingAudioId === m.id ? 'Playing...' : 'Listen (Sarvam TTS)'}
                      </button>
                    )}
                  </div>
                )}

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  gap: '3px', fontSize: '0.67rem', color: '#888', marginTop: '4px',
                }}>
                  <span>{m.timestamp}</span>
                  {own ? <CheckCheck size={13} color="#53bdeb" /> : <Check size={13} color="#aaa" />}
                </div>
              </div>

              {own && renderAvatar(m.sender, m.authorName)}
            </div>
          );
        })}

        {isProcessing && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '8px' }}>
            {renderAvatar('bot')}
            <div style={{
              background: '#FFFFFF', borderRadius: '2px 12px 12px 12px',
              padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <Sparkles size={15} color="#25D366" />
              <span style={{ fontSize: '0.84rem', color: '#666', fontStyle: 'italic' }}>Diabeto AI is typing...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* ── Composer ── */}
      {canCompose ? (
        <div style={{
          background: '#F0F0F0', borderTop: '1px solid #DDD',
          padding: '8px 12px', flexShrink: 0,
        }}>
          {/* Role selector */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
            {composerOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeComposer === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={opt.locked}
                  onClick={() => { if (!opt.locked) setActiveComposer(opt.key); }}
                  title={opt.locked ? `Only ${opt.label} can send from this position` : `Send as ${opt.label}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    padding: '5px 12px', borderRadius: '16px',
                    border: isActive ? '1.5px solid #075E54' : '1px solid #CCC',
                    background: isActive ? '#075E54' : opt.locked ? '#F5F5F5' : '#FFF',
                    color: isActive ? '#FFF' : opt.locked ? '#BBB' : '#444',
                    fontSize: '0.75rem', fontWeight: 600,
                    cursor: opt.locked ? 'not-allowed' : 'pointer',
                    flexShrink: 0, transition: 'all 0.15s',
                  }}
                >
                  {opt.locked && <Lock size={10} />}
                  <Icon size={13} />
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Notice for voice / permission errors */}
          {voiceStatusNotice && (
            <div style={{
              background: '#FFF3E0', border: '1px solid #FFE0B2',
              borderRadius: '8px', padding: '6px 12px', marginBottom: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: '0.75rem', color: '#E65100', gap: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} />
                <span>{voiceStatusNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceStatusNotice(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E65100', padding: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeComposer === 'patient' && (
              !isRecording ? (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  disabled={isProcessing}
                  title="Speak message (Voice Recognition)"
                  style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: '#FFF', border: '1.5px solid #DDD',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  <Mic size={18} color="#075E54" />
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={stopVoiceRecordingAndSend}
                    disabled={isProcessing}
                    title="Stop and send spoken message"
                    style={{
                      height: '42px', borderRadius: '21px',
                      background: '#D32F2F', color: '#FFF',
                      border: 'none', padding: '0 14px',
                      fontSize: '0.78rem', fontWeight: 700,
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      opacity: isProcessing ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', gap: '6px',
                      boxShadow: '0 0 10px rgba(211, 47, 47, 0.4)',
                    }}
                  >
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: '#FFF', display: 'inline-block',
                      animation: 'pulse 1s infinite alternate',
                    }} />
                    <Square size={13} fill="#FFF" />
                    <span>0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds} Send</span>
                  </button>
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    disabled={isProcessing}
                    title="Cancel voice recording"
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: '#F0F0F0', border: '1px solid #CCC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: isProcessing ? 'not-allowed' : 'pointer',
                      opacity: isProcessing ? 0.6 : 1,
                      color: '#666',
                    }}
                  >
                    <X size={15} />
                  </button>
                </div>
              )
            )}

            <input
              type="text"
              placeholder={
                isRecording
                  ? (language === 'hi' ? '🎙️ बोलिए, आवाज़ पहचानी जा रही है...' : language === 'mr' ? '🎙️ बोला, आवाज ऐकत आहोत...' : '🎙️ Listening... speak clearly now')
                  : activeComposer === 'patient'
                    ? (language === 'hi' ? 'अपना सवाल या शुगर रीडिंग लिखें...' : language === 'mr' ? 'आपला प्रश्न किंवा साखर लिहा...' : 'Type glucose reading or ask anything...')
                    : activeComposer === 'doctor'
                      ? `Reply as ${getAuthorName('doctor')}...`
                      : `Message as ${getAuthorName('caretaker')}...`
              }
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  if (isRecording) {
                    stopVoiceRecordingAndSend();
                  } else {
                    sendMessage(inputVal);
                  }
                }
              }}
              disabled={isProcessing}
              style={{
                flex: 1, border: isRecording ? '1.5px solid #D32F2F' : 'none', borderRadius: '24px',
                padding: '11px 16px', fontSize: '0.9rem', outline: 'none',
                minWidth: 0, background: isRecording ? '#FFF8F8' : '#FFF',
                boxShadow: isRecording ? '0 0 8px rgba(211,47,47,0.15)' : 'inset 0 1px 3px rgba(0,0,0,0.08)',
              }}
            />

            {!isRecording && (
              <button
                type="button"
                onClick={() => sendMessage(inputVal)}
                disabled={isProcessing || !inputVal.trim()}
                title="Send"
                style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: '#075E54', border: 'none', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  opacity: (!inputVal.trim() || isProcessing) ? 0.45 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <Send size={17} />
              </button>
            )}

            <button
              type="button"
              onClick={clearMessages}
              title="Clear chat history"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              <RefreshCw size={14} color="#888" />
            </button>
          </div>

          {/* Contextual footer hint */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '5px', fontSize: '0.67rem', color: '#888',
          }}>
            {activeComposer === 'patient' && !activityConsentGranted && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#E65100' }}>
                <Info size={11} />
                AI won't give activity advice until a doctor grants consent
              </span>
            )}
            {activeComposer === 'doctor' && (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={11} color="#2E7D32" />
                  Doctor reply — visible to all parties
                </span>
                <button
                  type="button"
                  onClick={() => setActivityConsentGranted((v) => !v)}
                  style={{
                    fontSize: '0.68rem', fontWeight: 700,
                    color: activityConsentGranted ? '#D32F2F' : '#2E7D32',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  {activityConsentGranted ? '🔒 Revoke AI activity consent' : '✅ Grant AI activity consent'}
                </button>
              </>
            )}
            {activeComposer === 'caretaker' && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Eye size={11} />
                Family message — visible to all parties
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          background: '#F5F5F5', borderTop: '1px solid #DDD',
          padding: '14px 16px', textAlign: 'center', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          fontSize: '0.8rem', color: '#666',
        }}>
          <Eye size={14} />
          <span>Admin view-only mode. All parties read this thread in real-time.</span>
        </div>
      )}
    </div>
  );
};
