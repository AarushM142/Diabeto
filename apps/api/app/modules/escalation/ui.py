import html
from typing import Dict, Any

def render_ivr_simulator_html(
    patient_name: str,
    glucose_mgdl: float,
    language: str,
    twiml_xml: str,
    template: Dict[str, Any],
) -> str:
    """
    Renders a modern, interactive Emergency IVR Voice Simulator UI for testing and previewing
    automated emergency calls, browser text-to-speech playback, DTMF keypad input, and TwiML XML.
    """
    lang_key = language.lower()
    voice_name = template.get("voice", "Polly.Aditi")
    voice_lang = template.get("language", "en-IN")
    spoken_text = template["ivr_message"].format(
        patient_name=patient_name,
        glucose_mgdl=int(glucose_mgdl),
    )
    gather_prompt = template.get("ivr_gather_prompt", "Press 1 on your phone keypad to confirm.")
    ack_text = template.get("ivr_acknowledged_message", "Thank you. Your acknowledgment is recorded.")
    sms_text = template["sms_message"].format(
        patient_name=patient_name,
        glucose_mgdl=int(glucose_mgdl),
        risk_event_id="preview_event_id",
    )

    escaped_twiml = html.escape(twiml_xml)
    safe_spoken_text = spoken_text.replace("'", "\\'").replace("\n", " ")
    safe_gather_prompt = gather_prompt.replace("'", "\\'").replace("\n", " ")
    safe_ack_text = ack_text.replace("'", "\\'").replace("\n", " ")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diabeto IVR Voice Call Simulator | Emergency Response</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg: #090d16;
            --surface: #111827;
            --surface-elevated: #1f2937;
            --surface-hover: #374151;
            --line: #2d3748;
            --line-subtle: #1e293b;
            --primary: #3b82f6;
            --danger: #ef4444;
            --danger-glow: rgba(239, 68, 68, 0.25);
            --ok: #10b981;
            --ok-glow: rgba(16, 185, 129, 0.25);
            --warn: #f59e0b;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --radius-phone: 40px;
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--bg);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
        }}

        /* Header */
        header {{
            background: rgba(17, 24, 39, 0.8);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--line);
            padding: 1rem 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 50;
        }}

        .brand {{
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            color: inherit;
        }}

        .brand-logo {{
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
        }}

        .brand-title {{
            font-weight: 800;
            font-size: 1.25rem;
            letter-spacing: -0.02em;
        }}

        .brand-title span {{
            color: #ef4444;
        }}

        .badge-live {{
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #34d399;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}

        .badge-pulse {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
            animation: pulse-ring 2s infinite;
        }}

        @keyframes pulse-ring {{
            0% {{ transform: scale(0.95); opacity: 0.8; }}
            50% {{ transform: scale(1.3); opacity: 0.4; }}
            100% {{ transform: scale(0.95); opacity: 0.8; }}
        }}

        /* Container & Layout */
        .main-container {{
            flex: 1;
            max-width: 1360px;
            margin: 0 auto;
            width: 100%;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }}

        /* Configuration Bar */
        .config-card {{
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 16px;
            padding: 1.25rem 1.75rem;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }}

        .config-inputs {{
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 1.5rem;
        }}

        .input-group {{
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }}

        .input-label {{
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }}

        .input-field {{
            background: var(--bg);
            border: 1px solid var(--line);
            color: var(--text-main);
            padding: 0.5rem 0.85rem;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            outline: none;
            transition: all 0.2s;
        }}

        .input-field:focus {{
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }}

        .lang-pills {{
            display: flex;
            background: var(--bg);
            padding: 4px;
            border-radius: 10px;
            border: 1px solid var(--line);
            gap: 4px;
        }}

        .lang-btn {{
            background: transparent;
            border: none;
            color: var(--text-muted);
            padding: 0.4rem 0.9rem;
            border-radius: 6px;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }}

        .lang-btn:hover {{
            color: var(--text-main);
        }}

        .lang-btn.active {{
            background: var(--primary);
            color: white;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }}

        .apply-btn {{
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            border: none;
            color: white;
            padding: 0.6rem 1.4rem;
            border-radius: 8px;
            font-weight: 700;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }}

        .apply-btn:hover {{
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
        }}

        /* Content Grid */
        .content-grid {{
            display: grid;
            grid-template-columns: 420px 1fr;
            gap: 2.5rem;
            align-items: start;
        }}

        @media (max-width: 1024px) {{
            .content-grid {{
                grid-template-columns: 1fr;
            }}
        }}

        /* Phone Mockup */
        .phone-wrapper {{
            display: flex;
            justify-content: center;
        }}

        .phone-frame {{
            width: 380px;
            height: 720px;
            background: #000;
            border-radius: var(--radius-phone);
            border: 10px solid #27272a;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px #3f3f46;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }}

        .phone-notch {{
            width: 120px;
            height: 22px;
            background: #27272a;
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            border-bottom-left-radius: 14px;
            border-bottom-right-radius: 14px;
            z-index: 10;
        }}

        .phone-screen {{
            flex: 1;
            background: radial-gradient(circle at 50% 20%, #1e1b4b 0%, #030712 100%);
            padding: 2.5rem 1.5rem 1.5rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            color: white;
            text-align: center;
        }}

        .call-meta {{
            margin-top: 1.5rem;
        }}

        .emergency-pill {{
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.4);
            color: #fca5a5;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            margin-bottom: 0.75rem;
            animation: pulse-ring 1.8s infinite;
        }}

        .caller-name {{
            font-size: 1.4rem;
            font-weight: 800;
            letter-spacing: -0.02em;
        }}

        .caller-number {{
            font-size: 0.85rem;
            color: #94a3b8;
            margin-top: 0.2rem;
        }}

        .call-timer {{
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            color: #34d399;
            margin-top: 0.4rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
        }}

        /* Audio Waveform */
        .audio-wave {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
            height: 48px;
            margin: 1.25rem 0;
        }}

        .wave-bar {{
            width: 4px;
            height: 12px;
            background: #ef4444;
            border-radius: 9999px;
            transition: height 0.2s ease;
        }}

        .audio-wave.active .wave-bar:nth-child(1) {{ animation: wave-anim 0.8s ease-in-out infinite 0.1s; }}
        .audio-wave.active .wave-bar:nth-child(2) {{ animation: wave-anim 0.8s ease-in-out infinite 0.2s; }}
        .audio-wave.active .wave-bar:nth-child(3) {{ animation: wave-anim 0.8s ease-in-out infinite 0.3s; }}
        .audio-wave.active .wave-bar:nth-child(4) {{ animation: wave-anim 0.8s ease-in-out infinite 0.15s; }}
        .audio-wave.active .wave-bar:nth-child(5) {{ animation: wave-anim 0.8s ease-in-out infinite 0.25s; }}
        .audio-wave.active .wave-bar:nth-child(6) {{ animation: wave-anim 0.8s ease-in-out infinite 0.35s; }}
        .audio-wave.active .wave-bar:nth-child(7) {{ animation: wave-anim 0.8s ease-in-out infinite 0.2s; }}

        @keyframes wave-anim {{
            0%, 100% {{ height: 10px; background: #ef4444; }}
            50% {{ height: 42px; background: #f87171; }}
        }}

        /* Voice Player Button */
        .voice-play-btn {{
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            border: none;
            color: white;
            padding: 0.85rem 1.5rem;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 0.95rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            cursor: pointer;
            box-shadow: 0 10px 25px -5px rgba(239, 68, 68, 0.5);
            transition: all 0.2s;
            margin-bottom: 0.75rem;
        }}

        .voice-play-btn:hover {{
            transform: scale(1.02);
            box-shadow: 0 12px 30px -5px rgba(239, 68, 68, 0.7);
        }}

        .voice-play-btn:active {{
            transform: scale(0.98);
        }}

        /* Keypad */
        .keypad-grid {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-top: 1rem;
        }}

        .key-btn {{
            height: 56px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s;
            color: white;
            user-select: none;
        }}

        .key-btn:hover {{
            background: rgba(255, 255, 255, 0.18);
            transform: scale(1.05);
        }}

        .key-btn:active {{
            transform: scale(0.95);
        }}

        .key-digit {{
            font-size: 1.25rem;
            font-weight: 700;
            line-height: 1;
        }}

        .key-sub {{
            font-size: 0.55rem;
            letter-spacing: 0.1em;
            color: #94a3b8;
            margin-top: 2px;
        }}

        .key-btn.highlight {{
            background: rgba(16, 185, 129, 0.25);
            border-color: #10b981;
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
            animation: pulse-ring 1.5s infinite;
        }}

        .key-btn.highlight .key-digit {{
            color: #34d399;
        }}

        /* Right Panel Cards */
        .right-panel {{
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }}

        .panel-card {{
            background: var(--surface);
            border: 1px solid var(--line);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        }}

        .card-header {{
            padding: 1rem 1.5rem;
            background: var(--surface-elevated);
            border-bottom: 1px solid var(--line);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}

        .card-title {{
            font-size: 0.95rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .card-body {{
            padding: 1.5rem;
        }}

        .spoken-quote {{
            background: rgba(239, 68, 68, 0.08);
            border-left: 4px solid var(--danger);
            padding: 1.25rem;
            border-radius: 0 10px 10px 0;
            font-size: 1rem;
            line-height: 1.6;
            color: #f1f5f9;
            margin-bottom: 1rem;
        }}

        .instructions-list {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }}

        .inst-box {{
            background: var(--bg);
            border: 1px solid var(--line);
            border-radius: 10px;
            padding: 1rem;
        }}

        .inst-title {{
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.4rem;
        }}

        .inst-desc {{
            font-size: 0.9rem;
            font-weight: 600;
            color: #f8fafc;
        }}

        /* SMS Card */
        .sms-bubble {{
            background: #1e293b;
            border-radius: 16px;
            border-bottom-left-radius: 4px;
            padding: 1rem 1.25rem;
            font-size: 0.95rem;
            line-height: 1.5;
            color: #e2e8f0;
            border: 1px solid #334155;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            position: relative;
        }}

        .sms-bubble a {{
            color: #60a5fa;
            word-break: break-all;
        }}

        /* XML Accordion */
        pre.xml-code {{
            background: #020617;
            padding: 1.25rem;
            border-radius: 10px;
            overflow-x: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            line-height: 1.5;
            color: #cbd5e1;
            border: 1px solid #1e293b;
        }}

        .code-actions {{
            display: flex;
            gap: 0.75rem;
        }}

        .mini-btn {{
            background: var(--surface);
            border: 1px solid var(--line);
            color: var(--text-muted);
            padding: 0.35rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
        }}

        .mini-btn:hover {{
            color: white;
            border-color: var(--primary);
        }}

        /* Status Toast */
        #ack-toast {{
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: #064e3b;
            border: 1px solid #059669;
            color: #a7f3d0;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            font-weight: 600;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            display: none;
            z-index: 100;
            align-items: center;
            gap: 0.75rem;
            animation: slide-up 0.3s ease;
        }}

        @keyframes slide-up {{
            from {{ transform: translateY(20px); opacity: 0; }}
            to {{ transform: translateY(0); opacity: 1; }}
        }}
    </style>
</head>
<body>

    <header>
        <a href="#" class="brand">
            <div class="brand-logo">🚨</div>
            <div class="brand-title">Diabeto <span>Emergency Voice IVR</span></div>
        </a>
        <div class="badge-live">
            <div class="badge-pulse"></div>
            Twilio IVR Simulation Active
        </div>
    </header>

    <div class="main-container">

        <!-- Controls Toolbar -->
        <div class="config-card">
            <div class="config-inputs">
                <div class="input-group">
                    <label class="input-label" for="ptName">Patient Name</label>
                    <input type="text" id="ptName" class="input-field" value="{patient_name}">
                </div>
                <div class="input-group">
                    <label class="input-label" for="glucoseVal">Glucose (mg/dL)</label>
                    <input type="number" id="glucoseVal" class="input-field" value="{int(glucose_mgdl)}" style="width: 100px;">
                </div>
                <div class="input-group">
                    <label class="input-label">Spoken Language</label>
                    <div class="lang-pills">
                        <a href="?patient_name={patient_name}&glucose_mgdl={glucose_mgdl}&language=en" class="lang-btn {'active' if lang_key == 'en' else ''}">English (en-IN)</a>
                        <a href="?patient_name={patient_name}&glucose_mgdl={glucose_mgdl}&language=hi" class="lang-btn {'active' if lang_key == 'hi' else ''}">हिन्दी (hi-IN)</a>
                        <a href="?patient_name={patient_name}&glucose_mgdl={glucose_mgdl}&language=mr" class="lang-btn {'active' if lang_key == 'mr' else ''}">मराठी (mr-IN)</a>
                    </div>
                </div>
            </div>
            <button class="apply-btn" onclick="updateParams()">⚡ Apply & Regenerate</button>
        </div>

        <div class="content-grid">

            <!-- Smartphone Mockup -->
            <div class="phone-wrapper">
                <div class="phone-frame">
                    <div class="phone-notch"></div>
                    <div class="phone-screen">
                        
                        <div class="call-meta">
                            <div class="emergency-pill">🚨 Critical Hypoglycemia</div>
                            <div class="caller-name">Diabeto Emergency</div>
                            <div class="caller-number">+1 (415) 523-8886 · Geriatric Care</div>
                            <div class="call-timer">
                                <span>●</span> Connected · <span id="timer">00:14</span>
                            </div>
                        </div>

                        <!-- Audio Waveform Visualization -->
                        <div>
                            <div class="audio-wave" id="audioWave">
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                            </div>

                            <button class="voice-play-btn" id="playBtn" onclick="toggleSpeech()">
                                <span id="playIcon">🔊</span> <span id="playText">Simulate Spoken Call</span>
                            </button>
                            <p style="font-size: 0.75rem; color: #94a3b8;">Voice: Amazon Polly ({voice_name} · {voice_lang})</p>
                        </div>

                        <!-- Interactive Phone Keypad -->
                        <div>
                            <p style="font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">
                                Caregiver Response Keypad
                            </p>
                            <div class="keypad-grid">
                                <div class="key-btn highlight" onclick="pressDigit('1')" title="Press 1 to Acknowledge Emergency">
                                    <span class="key-digit">1</span>
                                    <span class="key-sub" style="color: #34d399; font-weight: 700;">ACK</span>
                                </div>
                                <div class="key-btn" onclick="pressDigit('2')">
                                    <span class="key-digit">2</span>
                                    <span class="key-sub">ABC</span>
                                </div>
                                <div class="key-btn" onclick="pressDigit('3')">
                                    <span class="key-digit">3</span>
                                    <span class="key-sub">DEF</span>
                                </div>
                                <div class="key-btn" onclick="pressDigit('4')">
                                    <span class="key-digit">4</span>
                                    <span class="key-sub">GHI</span>
                                </div>
                                <div class="key-btn" onclick="pressDigit('5')">
                                    <span class="key-digit">5</span>
                                    <span class="key-sub">JKL</span>
                                </div>
                                <div class="key-btn" onclick="pressDigit('6')">
                                    <span class="key-digit">6</span>
                                    <span class="key-sub">MNO</span>
                                </div>
                                <div class="key-btn" onclick="pressDigit('7')">
                                    <span class="key-digit">7</span>
                                    <span class="key-sub">PQRS</span>
                                </div>
                                <div class="key-btn" onclick="pressDigit('8')">
                                    <span class="key-digit">8</span>
                                    <span class="key-sub">TUV</span>
                                </div>
                                <div class="key-btn" onclick="pressDigit('9')">
                                    <span class="key-digit">9</span>
                                    <span class="key-sub">WXYZ</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <!-- Right Panel Details -->
            <div class="right-panel">

                <!-- Spoken Transcript Card -->
                <div class="panel-card">
                    <div class="card-header">
                        <div class="card-title">
                            <span>🎙️</span> Spoken IVR Voice Script ({voice_lang})
                        </div>
                        <span style="font-size: 0.8rem; color: #34d399; font-weight: 700;">Auto-looped 2x</span>
                    </div>
                    <div class="card-body">
                        <div class="spoken-quote" id="spokenQuote">
                            "{spoken_text}"
                        </div>
                        <p style="font-size: 0.85rem; color: #94a3b8;">
                            <b>Interactive DTMF Prompt:</b> "{gather_prompt}"
                        </p>

                        <div class="instructions-list">
                            <div class="inst-box">
                                <div class="inst-title">Rescue Action 1</div>
                                <div class="inst-desc">🥄 Give 3 tsp sugar, honey, or glucose immediately.</div>
                            </div>
                            <div class="inst-box">
                                <div class="inst-title">Rescue Action 2</div>
                                <div class="inst-desc">🚑 If unconscious, do not give fluids. Call 108 or 112.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- High Priority SMS Alert -->
                <div class="panel-card">
                    <div class="card-header">
                        <div class="card-title">
                            <span>📱</span> High-Priority Caregiver SMS Dispatched Simultaneously
                        </div>
                        <span style="font-size: 0.8rem; color: #94a3b8;">Twilio Programmable SMS</span>
                    </div>
                    <div class="card-body">
                        <div class="sms-bubble">
                            {sms_text}
                        </div>
                    </div>
                </div>

                <!-- Raw Twilio TwiML XML -->
                <div class="panel-card">
                    <div class="card-header">
                        <div class="card-title">
                            <span>📄</span> Compliant Twilio Voice XML (TwiML)
                        </div>
                        <div class="code-actions">
                            <button class="mini-btn" onclick="copyXml()">📋 Copy XML</button>
                            <a href="?patient_name={patient_name}&glucose_mgdl={glucose_mgdl}&language={language}&format=xml" target="_blank" class="mini-btn">🔗 Open Raw XML</a>
                        </div>
                    </div>
                    <div class="card-body">
                        <pre class="xml-code" id="xmlBlock"><code>{escaped_twiml}</code></pre>
                    </div>
                </div>

            </div>

        </div>

    </div>

    <!-- Acknowledgment Toast -->
    <div id="ack-toast">
        <span style="font-size: 1.5rem;">✅</span>
        <div>
            <div style="font-size: 0.95rem; font-weight: 700;">Emergency Acknowledged (DTMF 1 Pressed)</div>
            <div style="font-size: 0.8rem; opacity: 0.9;" id="toastMessage">Recorded in patient medical chart.</div>
        </div>
    </div>

    <script>
        const spokenScript = '{safe_spoken_text}';
        const gatherPrompt = '{safe_gather_prompt}';
        const ackMessage = '{safe_ack_text}';
        const voiceLang = '{voice_lang}';
        let isSpeaking = false;

        function updateParams() {{
            const name = encodeURIComponent(document.getElementById('ptName').value.trim());
            const glucose = encodeURIComponent(document.getElementById('glucoseVal').value.trim());
            window.location.href = `?patient_name=${{name}}&glucose_mgdl=${{glucose}}&language={lang_key}`;
        }}

        function toggleSpeech() {{
            if (!('speechSynthesis' in window)) {{
                alert('Your browser does not support Web Speech Synthesis. Please use Chrome, Edge, or Safari.');
                return;
            }}

            if (isSpeaking) {{
                window.speechSynthesis.cancel();
                stopWave();
                return;
            }}

            window.speechSynthesis.cancel();
            const fullScript = `${{spokenScript}} ... ${{gatherPrompt}}`;
            const utterance = new SpeechSynthesisUtterance(fullScript);
            utterance.lang = voiceLang;
            utterance.rate = 0.95;

            // Try selecting Indian English or Hindi voice if present
            const voices = window.speechSynthesis.getVoices();
            const preferred = voices.find(v => v.lang.includes(voiceLang) || v.name.toLowerCase().includes('india') || v.name.toLowerCase().includes('aditi'));
            if (preferred) {{
                utterance.voice = preferred;
            }}

            utterance.onstart = () => {{
                isSpeaking = true;
                startWave();
                document.getElementById('playText').innerText = 'Stop Simulation';
                document.getElementById('playIcon').innerText = '⏹️';
            }};

            utterance.onend = () => {{
                stopWave();
            }};

            utterance.onerror = () => {{
                stopWave();
            }};

            window.speechSynthesis.speak(utterance);
        }}

        function startWave() {{
            document.getElementById('audioWave').classList.add('active');
        }}

        function stopWave() {{
            isSpeaking = false;
            document.getElementById('audioWave').classList.remove('active');
            document.getElementById('playText').innerText = 'Simulate Spoken Call';
            document.getElementById('playIcon').innerText = '🔊';
        }}

        // Keypad DTMF audio beep & interactive API call
        function playDtmfBeep() {{
            try {{
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(697, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
            }} catch(e) {{}}
        }}

        async function pressDigit(digit) {{
            playDtmfBeep();
            if (digit === '1') {{
                // Trigger live callback on backend
                try {{
                    const res = await fetch('/v1/escalations/twiml/callback?risk_event_id=preview_event_id&lang={lang_key}', {{
                        method: 'POST',
                        headers: {{ 'Content-Type': 'application/x-www-form-urlencoded' }},
                        body: new URLSearchParams({{ Digits: '1', From: '+919822222222' }})
                    }});
                    const toast = document.getElementById('ack-toast');
                    document.getElementById('toastMessage').innerText = ackMessage;
                    toast.style.display = 'flex';
                    setTimeout(() => {{ toast.style.display = 'none'; }}, 5000);
                    
                    // Also speak the acknowledgment message
                    if ('speechSynthesis' in window) {{
                        window.speechSynthesis.cancel();
                        const ackUtter = new SpeechSynthesisUtterance(ackMessage);
                        ackUtter.lang = voiceLang;
                        window.speechSynthesis.speak(ackUtter);
                    }}
                }} catch(err) {{
                    console.error('Callback error:', err);
                }}
            }}
        }}

        function copyXml() {{
            const code = document.getElementById('xmlBlock').innerText;
            navigator.clipboard.writeText(code).then(() => {{
                alert('TwiML XML copied to clipboard!');
            }});
        }}

        // Call Timer Simulation
        let seconds = 14;
        setInterval(() => {{
            seconds++;
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            document.getElementById('timer').innerText = 
                `${{mins.toString().padStart(2, '0')}}:${{secs.toString().padStart(2, '0')}}`;
        }}, 1000);
    </script>
</body>
</html>"""
