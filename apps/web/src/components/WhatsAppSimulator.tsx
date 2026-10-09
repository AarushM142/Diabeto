import React, { useState } from 'react';
import { 
  Phone, MoreVertical, Send, Mic, Play, 
  AlertCircle, Sparkles, Check, CheckCheck, RefreshCw
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
    id: 'fasting_normal',
    label: '🩸 Fasting Normal (135 mg/dL)',
    promptText: 'Mera fasting blood sugar 135 hai',
    description: 'Senior reports normal morning glucose',
    category: 'glucose',
  },
  {
    id: 'hypo_critical',
    label: '🚨 Critical Hypo (54 mg/dL)',
    promptText: 'Mujhe bahut chakkar aa raha hai, sugar 54 hai',
    description: 'Severe hypoglycemia triggers caregiver alert & 112 emergency advice',
    category: 'emergency',
  },
  {
    id: 'voice_note_hi',
    label: '🎙️ Hindi Voice Note ("Sugar 180 hai")',
    promptText: 'Mera blood sugar 180 hai aur thoda sar dard hai',
    isVoice: true,
    voiceDuration: '0:07',
    description: 'Simulates Sarvam AI speech-to-text audio ingestion',
    category: 'glucose',
  },
  {
    id: 'voice_note_mr',
    label: '🎙️ Marathi Voice Note ("औषध घेतले")',
    promptText: 'मी सकाळची मेटफॉर्मिन गोळी घेतली आहे',
    isVoice: true,
    voiceDuration: '0:05',
    description: 'Simulates Marathi voice note confirming medication dose',
    category: 'adherence',
  },
  {
    id: 'diet_query',
    label: '🥗 Diet Question ("Kya main mango kha sakta hoon?")',
    promptText: 'Kya main aaj lunch me aam kha sakta hoon?',
    description: 'Tests AI lifestyle guardrails & glycemic load guidance',
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
        ? `नमस्ते ${patientFirstName} जी! आशा है आपकी सुबह अच्छी रही। कृपया अपनी खाली पेट की शुगर (Fasting Sugar) जांच का परिणाम भेजें।`
        : language === 'mr'
        ? `नमस्कार ${patientFirstName} जी! आशा आहे आपली सकाळ छान झाली. कृपया आपली उपाशी पोटी शुगर तपासून पाठवा.`
        : `Namaste ${patientFirstName} ji! Hope you slept well. Please share your morning fasting glucose reading.`,
      timestamp: '8:00 AM',
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [escalationAlert, setEscalationAlert] = useState<string | null>(null);

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
            botReplyText = jsonResp.response || jsonResp.message || textResp;
          } catch {
            botReplyText = textResp;
          }
        }
      } else {
        // Fallback simulation logic
        botReplyText = generateFallbackResponse(textToSend, language);
      }

      // Check for escalation triggers
      if (textToSend.includes('54') || textToSend.toLowerCase().includes('chakkar') || textToSend.toLowerCase().includes('low')) {
        setEscalationAlert('🚨 TIER 1 ESCALATION TRIGGERED: Caregiver (+91 9800000002) notified via SMS/WhatsApp & Attending Doctor Dr. Mehta alerted.');
      } else {
        setEscalationAlert(null);
      }

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

    } catch (err) {
      console.error('Simulator error:', err);
      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: 'bot',
        text: generateFallbackResponse(textToSend, language),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateFallbackResponse = (text: string, lang: Language): string => {
    if (text.includes('54')) {
      return lang === 'hi'
        ? '🚨 आपातकालीन सूचना: आपकी शुगर 54 mg/dL (बहुत कम) है। तुरंत 3 चम्मच चीनी या फलों का जूस लें। चक्कर आने पर 112 या 108 पर कॉल करें। आपके परिवार को सूचित कर दिया गया है।'
        : lang === 'mr'
        ? '🚨 तातडीची सूचना: आपली शुगर ५४ mg/dL (अतिशय कमी) आहे. त्वरित ३ चमचे साखर किंवा फळांचा रस घ्या. ११२ किंवा १०८ वर फोन करा.'
        : '🚨 EMERGENCY: Your glucose is 54 mg/dL (Critically Low). Consume 3 spoons of sugar or fruit juice immediately. We have alerted your family.';
    }
    if (text.includes('135') || text.includes('140') || text.includes('180')) {
      return lang === 'hi'
        ? '✅ नमस्ते रमेश जी! आपकी ब्लड शुगर दर्ज कर ली गई है। बहुत अच्छा! अपनी सुबह की मेटफॉर्मिन गोली नाश्ते के बाद लेना न भूलें।'
        : lang === 'mr'
        ? '✅ नमस्कार रमेश जी! आपली ब्लड शुगर यशस्वीपणे नोंदवली आहे. नाश्त्यानंतर मेटफॉर्मिन औषध घेण्यास विसरू नका.'
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
      ? '✅ संदेश प्राप्त हुआ। आपकी स्वास्थ्य रिपोर्ट डॉक्टर और कोच के साथ साझा कर दी गई है।'
      : '✅ Message received. Your health note has been shared with your care team.';
  };

  return (
    <div className="portal-container">
      {/* Title & Description */}
      <div style={{ marginBottom: '28px' }}>
        <h2 className="font-serif" style={{ fontSize: 'clamp(1.25rem, 3.5vw, 1.65rem)', color: 'var(--text-forest)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <Sparkles size={24} color="var(--accent-sage)" strokeWidth={1.5} />
          {t('simulatorTitle', language)}
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          {t('simulatorSub', language)}
        </p>
      </div>

      {/* Escalation Live Banner */}
      {escalationAlert && (
        <div className="botanical-callout danger" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={22} color="var(--status-danger)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--status-danger)' }}>
            {escalationAlert}
          </span>
        </div>
      )}

      <div className="responsive-grid-12">
        {/* Left: Interactive Control Deck (7 cols) */}
        <div className="responsive-col-7" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Preset Clinical Scenarios */}
          <div className="botanical-card responsive-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', margin: 0 }}>
                {t('quickScenarios', language)}
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Target: <strong>{patientName}</strong>
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {PRESET_SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => sendMessage(sc.promptText, sc.isVoice, sc.voiceDuration)}
                  disabled={isProcessing}
                  className="botanical-card"
                  style={{
                    padding: '16px 18px',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '4px',
                    cursor: 'pointer',
                    borderLeft: sc.category === 'emergency' ? '5px solid var(--status-danger)' : sc.category === 'adherence' ? '5px solid var(--terracotta)' : '5px solid var(--accent-sage)',
                    background: 'var(--surface-clay)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-forest)' }}>
                    {sc.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    {sc.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Message Dispatch Deck */}
          <div className="botanical-card responsive-card">
            <h3 className="font-serif" style={{ fontSize: '1.15rem', color: 'var(--text-forest)', marginBottom: '14px', margin: 0 }}>
              {t('customMessage', language)}
            </h3>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input-pill"
                placeholder={t('typePlaceholder', language)}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputVal)}
                disabled={isProcessing}
                style={{ flex: '1', minWidth: '180px' }}
              />

              <button
                onClick={() => sendMessage(inputVal)}
                disabled={isProcessing || !inputVal.trim()}
                className="btn btn-primary"
              >
                <Send size={15} />
                {t('send', language)}
              </button>

              <button
                onClick={() => sendMessage('Mera blood sugar 152 hai', true, '0:06')}
                disabled={isProcessing}
                className="btn btn-secondary"
                title="Send Simulated Audio Note"
              >
                <Mic size={16} color="var(--accent-sage-dark)" />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-stone)', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Inbound Webhook: <code>POST /v1/webhooks/whatsapp</code>
              </span>
              <button
                onClick={() => setMessages([])}
                className="btn btn-secondary btn-sm"
              >
                <RefreshCw size={13} />
                Reset Chat
              </button>
            </div>
          </div>
        </div>

        {/* Right: Authentic WhatsApp Smartphone Viewport (5 cols) */}
        <div className="responsive-col-5">
          <div className="phone-mockup">
            {/* WhatsApp Header */}
            <div className="phone-header">
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-forest)', fontWeight: 700, fontSize: '0.95rem' }}>
                D
              </div>
              <div style={{ flex: '1' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>Diabeto Care</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>Official Health Account • Pune</div>
              </div>
              <Phone size={16} color="#FFFFFF" />
              <MoreVertical size={16} color="#FFFFFF" />
            </div>

            {/* Chat Messages Stream */}
            <div className="phone-chat-body">
              <div className="bubble-system">
                🔒 Messages are end-to-end encrypted with Diabeto Clinical SafeGuard.
              </div>

              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div key={m.id} className={isUser ? 'bubble-inbound' : 'bubble-outbound'}>
                    {m.isVoice ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--text-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                            <Play size={12} fill="#FFFFFF" />
                          </div>
                          <div style={{ height: '4px', background: 'var(--accent-sage)', flex: '1', borderRadius: '2px' }} />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.voiceDuration || '0:06'}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                          🎙️ Transcribed: "{m.transcript}"
                        </div>
                      </div>
                    ) : (
                      <div>{m.text}</div>
                    )}

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '4px',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      marginTop: '4px',
                    }}>
                      <span>{m.timestamp}</span>
                      {isUser && <CheckCheck size={14} color="#53bdeb" />}
                      {!isUser && <Check size={14} color="var(--text-muted)" />}
                    </div>
                  </div>
                );
              })}

              {isProcessing && (
                <div className="bubble-outbound" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
                  Diabeto is thinking...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
