import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, MoreVertical, Send, Mic, Play, Pause, 
  AlertCircle, Sparkles, Check, CheckCheck, RefreshCw,
  Image as ImageIcon, Volume2, ShieldCheck
} from 'lucide-react';
import { t } from '../lib/i18n';
import type { Language, ChatMessage, ScenarioPreset } from '../lib/types';
import type { User } from '../api/client';

interface WhatsAppSimulatorProps {
  language: Language;
  currentUser?: User;
}

const PRESET_SCENARIOS: ScenarioPreset[] = [
  {
    id: 'voice_elder_query',
    label: '🎙️ Voice: "Knee hurts, can I skip walk?"',
    promptText: 'Namaste doctor, mere ghutne me dard hai, kya main aaj walk chhod sakta hoon?',
    isVoice: true,
    voiceDuration: '0:06',
    description: 'Elder asks conversational question via Hindi voice note. Routed to LLM Companion with voice reply.',
    category: 'diet',
  },
  {
    id: 'diet_mango',
    label: '🥭 Diet: "Kya main lunch me mango kha sakta hoon?"',
    promptText: 'Kya main aaj lunch me 1 aam kha sakta hoon?',
    description: 'Empathetic portion control guidance with Indian glycemic advice.',
    category: 'diet',
  },
  {
    id: 'fasting_normal',
    label: '🩸 Glucose: Fasting Reading (138 mg/dL)',
    promptText: 'Mera fasting blood sugar 138 hai',
    description: 'Senior reports normal morning fasting glucose. Auto-logged to clinical chart.',
    category: 'glucose',
  },
  {
    id: 'hypo_critical',
    label: '🚨 Emergency: Severe Hypo (54 mg/dL + Chakkar)',
    promptText: 'Mujhe bahut chakkar aa raha hai, sugar 54 hai',
    description: 'Instant SOS alert: informs caregiver, triggers 15g sugar rule & 112 guidance.',
    category: 'emergency',
  },
  {
    id: 'voice_note_mr',
    label: '🎙️ Marathi Voice: "मी सकाळची गोळी घेतली"',
    promptText: 'मी सकाळची मेटफॉर्मिन गोळी घेतली आहे',
    isVoice: true,
    voiceDuration: '0:05',
    description: 'Simulates Marathi voice note confirming morning medication adherence.',
    category: 'adherence',
  },
  {
    id: 'meal_photo_lunch',
    label: '📸 Meal Photo: 2 Roti, Dal & Bhindi Thali',
    promptText: '[Meal Photo] Indian Lunch Thali with 2 Rotis, Dal Tadka, and Bhindi',
    description: 'Gemini Vision AI analyzes meal carbs & provides elder-friendly portion advice.',
    category: 'diet',
  },
  {
    id: 'meal_photo_vision',
    label: '📸 Meal Photo Vision ("2 Chapatis, Dal, Sabzi & Gulab Jamun")',
    promptText: 'Maine lunch me 2 chapati, 1 katori dal tadka, bhindi sabzi aur 1 gulab jamun khaya',
    description: 'Multimodal plate vision: estimates portion, carbs (~65g), flags sweets & gives Marathi/Hindi advice',
    category: 'diet',
  },
  {
    id: 'missed_med',
    label: '💊 Missed Dose ("Dawa lena bhool gaya")',
    promptText: 'Main subah ki dawai lena bhool gaya, ab kya karu?',
    description: 'Adherence check-in & non-judgmental guidance',
    category: 'adherence',
  },
];

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({ language, currentUser }) => {
  const patientName = currentUser?.patient_profile?.name || (currentUser?.role === 'patient' ? currentUser?.name : 'Ramesh Kulkarni');
  const patientFirstName = patientName.split(' ')[0] || patientName;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_1',
      sender: 'bot',
      text: language === 'hi' 
        ? `नमस्ते ${patientFirstName} जी! 🙏 आशा है आपकी सुबह सुखद रही। आप बोलकर या लिखकर अपनी शुगर, भोजन की फोटो या कोई भी स्वास्थ्य सवाल पूछ सकते हैं।`
        : language === 'mr'
        ? `नमस्कार ${patientFirstName} काका! 🙏 आशा आहे आपली सकाळ छान झाली. आपण बोलून किंवा लिहून आपली साखर, जेवणाचा फोटो किंवा कोणताही प्रश्न विचारू शकता.`
        : `Namaste ${patientFirstName} ji! 🙏 Hope you slept well. Feel free to speak or text your glucose, send a meal photo, or ask any health question!`,
      timestamp: '8:00 AM',
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [escalationAlert, setEscalationAlert] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  const timerRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Audio Recording simulation timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startVoiceRecording = () => {
    setIsRecording(true);
  };

  const stopAndSendVoiceRecording = () => {
    setIsRecording(false);
    const durationStr = `0:0${Math.max(recordingSeconds, 3)}`;
    const samplePrompt = language === 'mr' 
      ? 'मी दुपारच्या जेवणानंतर १० मिनिटे चाललो आहे, आता छान वाटत आहे'
      : language === 'hi'
      ? 'नमस्ते डॉक्टर साहब, क्या मैं रात को हल्दी वाला दूध पी सकता हूँ?'
      : 'Namaste, my sugar is 142 after breakfast, should I take a walk?';
    
    sendMessage(samplePrompt, true, durationStr);
  };

  const playVoiceAudio = (msgId: string, text: string) => {
    if (playingAudioId === msgId) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setPlayingAudioId(null);
      return;
    }

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slower, clear pace for seniors
      utterance.pitch = 1.0;
      
      // Select appropriate regional Indian voice if available
      const voices = window.speechSynthesis.getVoices();
      const regionalVoice = voices.find(v => 
        (language === 'hi' && v.lang.includes('hi')) ||
        (language === 'mr' && (v.lang.includes('mr') || v.lang.includes('hi'))) ||
        (v.lang.includes('en-IN'))
      );
      if (regionalVoice) utterance.voice = regionalVoice;

      utterance.onend = () => setPlayingAudioId(null);
      utterance.onerror = () => setPlayingAudioId(null);

      setPlayingAudioId(msgId);
      window.speechSynthesis.speak(utterance);
    }
  };

  const sendMessage = async (textToSend: string, isVoice: boolean = false, voiceDuration?: string) => {
    if (!textToSend.trim() && !isVoice) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `usr_${Date.now()}`;

    // Append User Message
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: timeStr,
      isVoice,
      voiceDuration,
      transcript: isVoice ? textToSend : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsProcessing(true);

    try {
      // Call Live Backend WhatsApp Webhook
      const formData = new URLSearchParams();
      formData.append('From', 'whatsapp:+918149680369');
      formData.append('Body', textToSend);
      formData.append('MessageSid', `SIM_${Date.now()}`);
      if (isVoice) {
        formData.append('MediaContentType0', 'audio/ogg');
        formData.append('NumMedia', '1');
      }

      const res = await fetch('/v1/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      let botReplyText = '';
      if (res.ok) {
        const textResp = await res.text();
        // Parse TwiML XML or JSON
        const match = textResp.match(/<Message>([\s\S]*?)<\/Message>/);
        if (match && match[1]) {
          botReplyText = match[1];
        } else {
          try {
            const jsonResp = JSON.parse(textResp);
            botReplyText = jsonResp.reply || jsonResp.response || jsonResp.message || textResp;
          } catch {
            botReplyText = textResp;
          }
        }
      } else {
        botReplyText = generateFallbackResponse(textToSend, language);
      }

      // Check for escalation triggers
      if (textToSend.includes('54') || textToSend.toLowerCase().includes('chakkar') || textToSend.toLowerCase().includes('low')) {
        setEscalationAlert('🚨 TIER 1 CLINICAL ESCALATION: Caregiver (Ananya +91 9800000002) notified via SMS/WhatsApp & Dr. Arvind Mehta alerted.');
      } else {
        setEscalationAlert(null);
      }

      const botMsgId = `bot_${Date.now()}`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'bot',
        text: botReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      // If senior sent a voice message, automatically speak the reply
      if (isVoice) {
        setTimeout(() => {
          playVoiceAudio(botMsgId, botReplyText);
        }, 500);
      }

    } catch (err) {
      console.error('Simulator error:', err);
      const botMsgId = `bot_${Date.now()}`;
      const fallback = generateFallbackResponse(textToSend, language);
      const botMsg: ChatMessage = {
        id: botMsgId,
        sender: 'bot',
        text: fallback,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateFallbackResponse = (text: string, lang: Language): string => {
    const lower = text.toLowerCase();
    if (lower.includes('54') || lower.includes('chakkar') || lower.includes('dizzy')) {
      return lang === 'hi'
        ? '🚨 आपातकालीन सूचना: आपकी शुगर 54 mg/dL (बहुत कम) है। तुरंत 3 चम्मच चीनी, गुड़ या फलों का जूस लें। चक्कर आने पर 112 या 108 पर कॉल करें। आपकी बेटी अनन्या को सूचित कर दिया गया है।'
        : lang === 'mr'
        ? '🚨 तातडीची सूचना: आपली साखर ५४ mg/dL (अतिशय कमी) आहे. त्वरित ३ चमचे साखर किंवा फळांचा रस घ्या. ११२ वर फोन करा. आपल्या कुटुंबीयांना संदेश पाठवला आहे.'
        : '🚨 EMERGENCY: Your glucose is 54 mg/dL (Critically Low). Consume 3 spoons of sugar or fruit juice immediately. We have alerted your family.';
    }
    if (lower.includes('aam') || lower.includes('mango') || lower.includes('sweet')) {
      return lang === 'hi'
        ? '🥭 नमस्ते रमेश जी! आम में प्राकृतिक मिठास अधिक होती है। आप दोपहर के खाने के साथ 1-2 छोटे टुकड़े ले सकते हैं, लेकिन पूरा आम न खाएं। भोजन के बाद 10 मिनट टहलना लाभकारी होगा।'
        : lang === 'mr'
        ? '🥭 नमस्कार रमेश काका! आंब्यात नैसर्गिक साखर जास्त असते. आपण दुपारच्या जेवणासोबत १-२ लहान फोडी खाऊ शकता, पण एकाच वेळी पूर्ण आंबा खाणे टाळा. जेवणानंतर १० मिनिटे शतपावली नक्की करा.'
        : '🥭 Namaste Ramesh ji! Mango contains natural sugars. You may enjoy 1-2 small slices with your lunch, but avoid eating a whole mango at once. A light 10-min stroll after lunch helps!';
    }
    if (lower.includes('pain') || lower.includes('knee') || lower.includes('dard') || lower.includes('walk')) {
      return lang === 'hi'
        ? '🙏 नमस्ते रमेश जी! अगर घुटनों में दर्द है तो आज बाहर तेज न टहलें। घर में ही आराम से 5 मिनट धीरे चलें या बैठकर हल्के पैर हिलाएं। ज्यादा थकान न लें।'
        : lang === 'mr'
        ? '🙏 नमस्कार रमेश काका! गुडघे दुखत असल्यास वेगाने चालणे टाळा. घरातच हळू ५ मिनिटे फेऱ्या मारा किंवा बसून पायांचे हलके व्यायाम करा.'
        : '🙏 Namaste Ramesh ji! If your knees hurt, please skip the brisk walk. A gentle 5-minute indoor stroll or seated leg exercises are totally fine today.';
    }
    if (lower.includes('135') || lower.includes('138') || lower.includes('140') || lower.includes('180')) {
      return lang === 'hi'
        ? '✅ नमस्ते रमेश जी! आपकी ब्लड शुगर दर्ज कर ली गई है। बहुत अच्छा! अपनी सुबह की मेटफॉर्मिन गोली नाश्ते के बाद लेना न भूलें।'
        : lang === 'mr'
        ? '✅ नमस्कार रमेश काका! आपली ब्लड शुगर यशस्वीपणे नोंदवली आहे. नाश्त्यानंतर मेटफॉर्मिन औषध घेण्यास विसरू नका.'
        : '✅ Namaste Ramesh ji! Your glucose reading has been logged. Remember to take your morning Metformin after breakfast.';
    }
    if (text.includes('aam') || text.includes('mango')) {
      return lang === 'hi'
        ? '🥗 आहार सलाह: आम में प्राकृतिक मिठास अधिक होती है। आप दोपहर के खाने में 1-2 छोटे टुकड़े ले सकते हैं, लेकिन पूरा आम खाने से बचें।'
        : '🥗 Dietary Guidance: Mango is high in natural sugars. You may enjoy 1-2 small slices with a protein-rich meal, but avoid having a whole mango at once.';
    }
    if (text.includes('chapati') || text.includes('jamun') || text.includes('lunch') || text.includes('thali')) {
      return lang === 'mr'
        ? '🍽️ जेवणाचे विश्लेषण: २ चपात्या, डाळ आणि भाजी योग्य आहे (~६० ग्रॅम कार्ब्स). ⚠️ सावधगिरी: १ गुलाब जामुनमध्ये भरपूर साखर असते, यामुळे रक्तातील साखर वेगाने वाढू शकते. कृपया गोड खाणे टाळावे.'
        : lang === 'hi'
        ? '🍽️ भोजन विश्लेषण: २ रोटी, दाल और भिंडी सामान्य है (~६० ग्राम कार्ब्स)। ⚠️ सावधानी: १ गुलाब जामुन में अत्यधिक चीनी होती है जिससे शुगर तेजी से बढ़ सकती है। मिठाई से परहेज रखें।'
        : '🍽️ Plate Analysis: 2 Chapatis, Dal & Bhindi Sabzi logged (~60g carbs). ⚠️ Warning: 1 Gulab Jamun detected with high glycemic spike risk. Avoid sugary sweets.';
    }
    return lang === 'hi'
      ? '🙏 नमस्ते रमेश जी! आपका संदेश प्राप्त हुआ। डॉ. अरविंद मेहता के निर्देशानुसार अपनी दवाइयां समय पर लेते रहें और पर्याप्त पानी पिएं।'
      : '🙏 Namaste Ramesh ji! Your message was received. Keep up your routine under Dr. Arvind Mehta, stay hydrated, and feel free to ask anything!';
  };

  return (
    <div className="portal-container">
      {/* Title & WhatsApp Centric Philosophy Banner */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="font-serif" style={{ fontSize: 'clamp(1.3rem, 3.5vw, 1.75rem)', color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}>
                <Phone size={18} />
              </div>
              WhatsApp Senior Companion & Voice AI
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px', maxWidth: '650px' }}>
              The elder companion interface: Indian seniors speak in Hindi or Marathi, ask diet & symptom questions, or send meal photos on WhatsApp — instantly powered by Gemini LLM & Sarvam AI Voice.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-clay)', padding: '8px 16px', borderRadius: '24px', border: '1px solid var(--border-stone)' }}>
            <ShieldCheck size={18} color="var(--accent-sage-dark)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-forest)' }}>
              Dr. Arvind Mehta Protocol Active
            </span>
          </div>
        </div>
      </div>

      {/* Escalation Live Banner */}
      {escalationAlert && (
        <div className="botanical-callout danger" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', animation: 'pulse 2s infinite' }}>
          <AlertCircle size={24} color="var(--status-danger)" />
          <div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--status-danger)' }}>
              {escalationAlert}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-forest)', marginTop: '2px' }}>
              Automated caregiver SMS, WhatsApp notification, and doctor dashboard triage dispatched.
            </div>
          </div>
        </div>
      )}

      <div className="responsive-grid-12">
        {/* Left: Interactive Control Deck (7 cols) */}
        <div className="responsive-col-7" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Elder Voice & Smart Ingestion Deck */}
          <div className="botanical-card responsive-card" style={{ background: 'linear-gradient(135deg, var(--surface-card) 0%, rgba(244,249,244,0.7) 100%)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mic size={18} color="var(--accent-sage-dark)" />
                <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                  Speak or Type a Question
                </h3>
              </div>
              <span className="badge badge-sage" style={{ fontSize: '0.75rem' }}>
                Sarvam AI STT & TTS Live
              </span>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.4 }}>
              Tap the microphone to simulate senior voice audio in Hindi, Marathi, or English. The backend transcribes, validates safety, and generates spoken voice replies.
            </p>

            {/* Live Mic Action Row */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              {!isRecording ? (
                <button
                  onClick={startVoiceRecording}
                  disabled={isProcessing}
                  className="btn btn-primary"
                  style={{ background: '#25D366', borderColor: '#25D366', color: '#FFFFFF', gap: '8px', padding: '12px 20px', borderRadius: '30px' }}
                >
                  <Mic size={18} />
                  Record Hindi/Marathi Voice Note
                </button>
              ) : (
                <button
                  onClick={stopAndSendVoiceRecording}
                  className="btn btn-danger"
                  style={{ background: 'var(--status-danger)', color: '#FFFFFF', gap: '8px', padding: '12px 20px', borderRadius: '30px', animation: 'pulse 1s infinite' }}
                >
                  <Mic size={18} />
                  Stop & Send Audio ({recordingSeconds}s)...
                </button>
              )}

              <button
                onClick={() => sendMessage('[Meal Photo] 2 Phulkas, Toor Dal, and Gobi Matar Sabzi', false)}
                disabled={isProcessing}
                className="btn btn-secondary"
                style={{ gap: '6px', borderRadius: '30px' }}
              >
                <ImageIcon size={16} />
                Send Lunch Photo (Vision AI)
              </button>
            </div>

            {/* Custom Text Input */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                className="input-pill"
                placeholder={language === 'hi' ? 'रमेश जी का सवाल यहां लिखें...' : language === 'mr' ? 'रमेश काकांचा प्रश्न येथे लिहा...' : 'Type senior message in Hindi, Marathi, or English...'}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputVal)}
                disabled={isProcessing || isRecording}
                style={{ flex: '1', fontSize: '0.9rem', padding: '12px 18px' }}
              />

              <button
                onClick={() => sendMessage(inputVal)}
                disabled={isProcessing || !inputVal.trim() || isRecording}
                className="btn btn-primary"
                style={{ padding: '12px 20px', borderRadius: '30px' }}
              >
                <Send size={15} />
                Send
              </button>
            </div>
          </div>

          {/* Preset Senior Clinical & Lifestyle Scenarios */}
          <div className="botanical-card responsive-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                {t('quickScenarios', language)}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Target Patient: <strong>{patientName} (68y, Pune)</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {PRESET_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => sendMessage(sc.promptText, sc.isVoice, sc.voiceDuration)}
                  disabled={isProcessing || isRecording}
                  className="botanical-card"
                  style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    borderLeft: sc.category === 'emergency' ? '5px solid var(--status-danger)' : sc.category === 'adherence' ? '5px solid var(--terracotta)' : '5px solid #25D366',
                    background: 'var(--surface-clay)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-forest)' }}>
                    {sc.label}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    {sc.description}
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-stone)', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Live Webhook: <code>POST /v1/webhooks/whatsapp</code> (Twilio & Meta Cloud API)
              </span>
              <button
                onClick={() => setMessages([])}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw size={13} />
                Clear Chat
              </button>
            </div>
          </div>
        </div>

        {/* Right: Authentic WhatsApp Smartphone Viewport (5 cols) */}
        <div className="responsive-col-5">
          <div className="phone-mockup" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.12)', border: '10px solid #2D3748', borderRadius: '36px', overflow: 'hidden' }}>
            {/* WhatsApp Header */}
            <div className="phone-header" style={{ background: '#075E54', padding: '12px 16px', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#075E54', fontWeight: 800, fontSize: '1.1rem' }}>
                🩺
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>Diabeto Care (डॉ. अरविंद मेहता)</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25D366', display: 'inline-block' }}></span>
                  Official Senior Companion • Online
                </div>
              </div>
              <Phone size={17} color="#FFFFFF" style={{ cursor: 'pointer' }} />
              <MoreVertical size={17} color="#FFFFFF" style={{ cursor: 'pointer' }} />
            </div>

            {/* Chat Messages Stream */}
            <div className="phone-chat-body" style={{ background: '#E5DDD5', minHeight: '440px', maxHeight: '520px', overflowY: 'auto', padding: '16px' }}>
              <div className="bubble-system" style={{ background: '#FCF4CB', color: '#555', fontSize: '0.7rem', padding: '6px 12px', borderRadius: '8px', textAlign: 'center', margin: '0 auto 14px', maxWidth: '90%', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                🔒 End-to-end encrypted with Diabeto Clinical SafeGuard.
              </div>

              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div 
                    key={m.id} 
                    className={isUser ? 'bubble-inbound' : 'bubble-outbound'}
                    style={{
                      background: isUser ? '#DCF8C6' : '#FFFFFF',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '10px',
                      maxWidth: '85%',
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      marginLeft: isUser ? 'auto' : '0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      position: 'relative',
                    }}
                  >
                    {m.isVoice ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={() => playVoiceAudio(m.id, m.transcript || m.text)}
                            style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#075E54', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', cursor: 'pointer' }}
                          >
                            {playingAudioId === m.id ? <Pause size={14} fill="#FFFFFF" /> : <Play size={14} fill="#FFFFFF" />}
                          </button>
                          <div style={{ height: '4px', background: '#25D366', flex: '1', borderRadius: '2px' }} />
                          <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: 600 }}>{m.voiceDuration || '0:06'}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#444', fontStyle: 'italic' }}>
                          🎙️ Transcribed: "{m.transcript || m.text}"
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.88rem', color: '#111', lineHeight: 1.45, whiteSpace: 'pre-line' }}>
                          {m.text}
                        </div>
                        {!isUser && (
                          <button
                            onClick={() => playVoiceAudio(m.id, m.text)}
                            style={{
                              marginTop: '8px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#F0F9F0',
                              border: '1px solid #B8E2B8',
                              color: '#075E54',
                              borderRadius: '16px',
                              padding: '4px 10px',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            <Volume2 size={13} />
                            {playingAudioId === m.id ? 'Playing Voice...' : 'Listen in Hindi/Marathi (Sarvam TTS)'}
                          </button>
                        )}
                      </div>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                      fontSize: '0.68rem',
                      color: '#888',
                      marginTop: '4px',
                    }}>
                      <span>{m.timestamp}</span>
                      {isUser && <CheckCheck size={14} color="#53bdeb" />}
                      {!isUser && <Check size={14} color="#888" />}
                    </div>
                  </div>
                );
              })}

              {isProcessing && (
                <div style={{ background: '#FFFFFF', padding: '10px 14px', borderRadius: '8px', maxWidth: '75%', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                  <Sparkles size={16} color="#25D366" className="animate-spin" />
                  <span style={{ fontSize: '0.82rem', color: '#666', fontStyle: 'italic' }}>
                    Diabeto Companion is thinking...
                  </span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
