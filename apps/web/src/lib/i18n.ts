import type { Language } from './types';

export const translations = {
  en: {
    appName: 'diabeto.',
    clinicName: 'Pune Central Diabetes Institute',
    doctorName: 'Dr. Arvind Mehta',
    doctorRole: 'MD Diabetologist',
    online: 'System Live',
    offline: 'Offline',
    
    // Tabs
    tabClinician: 'Clinician',
    tabCoach: 'Coach Desk',
    tabCaregiver: 'Caregiver',
    tabSimulator: 'WhatsApp Simulator',
    
    // Simple Mode
    simpleModeOn: 'Simple Mode ON',
    simpleModeOff: 'Simple Mode',

    // Caregiver
    caregiverTitle: 'Ramesh is doing well today',
    caregiverSub: 'Father • Age 68 • Pune • WhatsApp Connected',
    statusNormal: 'Normal',
    statusWatch: 'Needs Attention',
    statusCritical: 'Critical Alert',
    whatsappButton: 'WhatsApp Papa',
    callButton: 'Call Directly',
    latestSugar: 'Latest Sugar Reading',
    targetRange: 'Fasting • In Target Range (70–180)',
    voiceNoteLogged: 'Logged via Voice Note at 8:15 AM',
    todayMedication: "Today's Medicine",
    medTaken: 'Metformin 500mg taken',
    nextMed: 'Next: Glimepiride 1mg at 8:00 PM',
    streakTitle: 'Reporting Streak',
    streakDays: 'Days',
    noCriticalEpisodes: 'Zero critical episodes this week',
    careTimeline: "Today's Care Timeline",
    careTeamNetwork: 'Care Team Network',
    emergencyProtocol: 'Emergency Safety Protocol',
    emergencyDesc: 'If critical hypo is unacknowledged within 15 mins, Diabeto will call your phone automatically.',
    emergencyContacts: 'Emergency Helpline: 112 / 108',

    // Clinician
    clinicianOverview: '14-Day Blood Glucose Trend',
    timeInRange: 'TIME IN RANGE (70-180)',
    timeBelowRange: 'TIME BELOW RANGE (<70)',
    meanGlucose: 'MEAN GLUCOSE',
    glucoseVariability: 'GLUCOSE VARIABILITY',
    medAdherence: 'MEDICATION ADHERENCE',
    weeklySynthesis: 'Weekly Synthesis',
    verified: 'Verified by MD',
    unverified: 'Unverified Draft',
    doctorNotes: 'Attending Doctor Notes:',
    verifyButton: 'Verify & Sign-Off',

    // Coach
    coachTitle: 'Coach Approvals Desk',
    coachSub: 'Verify AI-drafted lifestyle recommendations before sending to seniors on WhatsApp.',
    pendingNudges: 'Pending Recommendations',
    guardrailsPassed: 'Guardrails Passed',
    reviewDraft: 'Review Draft',
    clinicalRationale: 'CLINICAL RATIONALE:',
    approveAndSend: 'Approve & Send to WhatsApp',
    reject: 'Reject',
    generateNudge: 'Generate New Nudge',
    
    // Simulator
    simulatorTitle: 'Live WhatsApp Senior Simulator',
    simulatorSub: 'Simulate natural WhatsApp voice notes & text messages from elderly seniors and test closed-loop safety responses.',
    quickScenarios: 'Quick Clinical Scenarios',
    customMessage: 'Send WhatsApp Message',
    typePlaceholder: 'Type a WhatsApp message in Hindi, Marathi, or English...',
    send: 'Send',
    sendVoice: 'Send Voice Note',
  },
  hi: {
    appName: 'diabeto.',
    clinicName: 'पुणे सेंट्रल डायबिटीज़ संस्थान',
    doctorName: 'डॉ. अरविंद मेहता',
    doctorRole: 'एमडी डायबेटोलॉजिस्ट',
    online: 'सिस्टम लाइव',
    offline: 'ऑफ़लाइन',

    // Tabs
    tabClinician: 'डॉक्टर पोर्टल',
    tabCoach: 'कोच डेस्क',
    tabCaregiver: 'परिवार दृश्य',
    tabSimulator: 'व्हाट्सएप सिम्युलेटर',

    // Simple Mode
    simpleModeOn: 'सरल मोड सक्रिय',
    simpleModeOff: 'सरल मोड',

    // Caregiver
    caregiverTitle: 'रमेश जी आज स्वस्थ हैं',
    caregiverSub: 'पिताजी • आयु 68 • पुणे • व्हाट्सएप कनेक्टेड',
    statusNormal: 'सामान्य',
    statusWatch: 'ध्यान दें',
    statusCritical: 'आपातकालीन सूचना',
    whatsappButton: 'व्हाट्सएप करें',
    callButton: 'कॉल करें',
    latestSugar: 'ताज़ा शुगर जांच',
    targetRange: 'खाली पेट • सही सीमा में (70–180)',
    voiceNoteLogged: 'सुबह 8:15 बजे वॉइस नोट द्वारा दर्ज',
    todayMedication: 'आज की दवाई',
    medTaken: 'मेटफॉर्मिन 500mg ली गई',
    nextMed: 'अगली: ग्लिमेपिराइड 1mg रात 8:00 बजे',
    streakTitle: 'नियमितता रिकॉर्ड',
    streakDays: 'दिन',
    noCriticalEpisodes: 'इस सप्ताह कोई आपात स्थिति नहीं',
    careTimeline: 'आज की दिनचर्या',
    careTeamNetwork: 'स्वास्थ्य टीम',
    emergencyProtocol: 'आपातकालीन सुरक्षा प्रोटोकॉल',
    emergencyDesc: 'यदि 15 मिनट में लो शुगर का समाधान नहीं होता, तो डायबेटो स्वचालित रूप से कॉल करेगा।',
    emergencyContacts: 'आपातकालीन हेल्पलाइन: 112 / 108',

    // Clinician
    clinicianOverview: '14-दिन ब्लड शुगर का रुझान',
    timeInRange: 'सही सीमा में समय (70-180)',
    timeBelowRange: 'कम शुगर का समय (<70)',
    meanGlucose: 'औसत शुगर',
    glucoseVariability: 'शुगर में उतार-चढ़ाव',
    medAdherence: 'दवा अनुपालन',
    weeklySynthesis: 'साप्ताहिक विश्लेषण रिपोर्ट',
    verified: 'डॉक्टर द्वारा सत्यापित',
    unverified: 'अपुष्ट ड्राफ्ट',
    doctorNotes: 'डॉक्टर की सलाह एवं टिप्पणी:',
    verifyButton: 'सत्यापित एवं हस्ताक्षर करें',

    // Coach
    coachTitle: 'केयर कोच अनुमोदन डेस्क',
    coachSub: 'व्हाट्सएप पर भेजने से पहले AI द्वारा तैयार सुझावों की जांच करें।',
    pendingNudges: 'लंबित सुझाव',
    guardrailsPassed: 'सुरक्षा मानक पास',
    reviewDraft: 'ड्राफ्ट की समीक्षा',
    clinicalRationale: 'चिकित्सीय कारण:',
    approveAndSend: 'स्वीकृत करें और व्हाट्सएप पर भेजें',
    reject: 'अस्वीकार करें',
    generateNudge: 'नया सुझाव तैयार करें',

    // Simulator
    simulatorTitle: 'व्हाट्सएप सीनियर सिम्युलेटर',
    simulatorSub: 'वरिष्ठ नागरिकों द्वारा हिंदी/मराठी में वॉइस नोट व मैसेज भेजें और वास्तविक समय में स्वचालित सुरक्षा उत्तर देखें।',
    quickScenarios: 'त्वरित परिदृश्य',
    customMessage: 'व्हाट्सएप संदेश भेजें',
    typePlaceholder: 'हिंदी, मराठी या अंग्रेजी में संदेश लिखें...',
    send: 'भेजें',
    sendVoice: 'वॉइस नोट भेजें',
  },
  mr: {
    appName: 'diabeto.',
    clinicName: 'पुणे मध्यवर्ती मधुमेह संस्था',
    doctorName: 'डॉ. अरविंद मेहता',
    doctorRole: 'एमडी मधुमेह तज्ज्ञ',
    online: 'प्रणाली सुरू आहे',
    offline: 'बंद आहे',

    // Tabs
    tabClinician: 'डॉक्टर पोर्टल',
    tabCoach: 'कोच डेस्क',
    tabCaregiver: 'कुटुंब कक्ष',
    tabSimulator: 'व्हॉट्सअ‍ॅप सिम्युलेटर',

    // Simple Mode
    simpleModeOn: 'सोपा मोड सुरू',
    simpleModeOff: 'सोपा मोड',

    // Caregiver
    caregiverTitle: 'रमेश जी आज उत्तम आहेत',
    caregiverSub: 'वडील • वय ६८ • पुणे • व्हॉट्सअ‍ॅप जोडलेले',
    statusNormal: 'सामान्य',
    statusWatch: 'लक्ष द्या',
    statusCritical: 'तातडीची सूचना',
    whatsappButton: 'व्हॉट्सअ‍ॅप करा',
    callButton: 'थेट फोन करा',
    latestSugar: 'नवीनतम शुगर तपासणी',
    targetRange: 'उपाशी पोटी • योग्य मर्यादेत (७०–१८०)',
    voiceNoteLogged: 'सकाळी ८:१५ वाजता व्हॉइस नोट द्वारे नोंदवले',
    todayMedication: 'आजचे औषध',
    medTaken: 'मेटफॉर्मिन ५००mg घेतली',
    nextMed: 'पुढील: ग्लिमेपिराइड १mg रात्री ८:०० वाजता',
    streakTitle: 'सातत्य नोंद',
    streakDays: 'दिवस',
    noCriticalEpisodes: 'या आठवड्यात कोणतीही आणीबाणी नाही',
    careTimeline: 'आजची दिनचर्या',
    careTeamNetwork: 'आरोग्य पथक',
    emergencyProtocol: 'आपत्कालीन सुरक्षा नियम',
    emergencyDesc: 'शुगर खूप कमी असल्यास आणि १५ मिनिटांत प्रतिसाद न मिळाल्यास डायबेटो थेट कॉल करेल.',
    emergencyContacts: 'तातडीची मदत: ११२ / १०८',

    // Clinician
    clinicianOverview: '१४ दिवसांचा ब्लड शुगर कल',
    timeInRange: 'योग्य मर्यादेत वेळ (७०-१८०)',
    timeBelowRange: 'कमी शुगर वेळ (<७०)',
    meanGlucose: 'सरासरी शुगर',
    glucoseVariability: 'शुगरमधील चढ-उतार',
    medAdherence: 'औषध नियमितता',
    weeklySynthesis: 'साप्ताहिक सारांश अहवाल',
    verified: 'डॉक्टरांनी प्रमाणित केले',
    unverified: 'अपूर्ण मसुदा',
    doctorNotes: 'डॉक्टरांच्या नोंदी:',
    verifyButton: 'प्रमाणित करा',

    // Coach
    coachTitle: 'केअर कोच मंजुरी कक्ष',
    coachSub: 'ज्येष्ठ नागरिकांना व्हॉट्सअ‍ॅपवर पाठवण्यापूर्वी AI मसुद्यांची पडताळणी करा.',
    pendingNudges: 'प्रलंबित सल्ले',
    guardrailsPassed: 'सुरक्षा नियम उत्तीर्ण',
    reviewDraft: 'मसुदा तपासा',
    clinicalRationale: 'वैद्यकीय कारण:',
    approveAndSend: 'मंजूर करा व व्हॉट्सअ‍ॅपवर पाठवा',
    reject: 'नाकारा',
    generateNudge: 'नवीन सल्ला तयार करा',

    // Simulator
    simulatorTitle: 'व्हॉट्सअ‍ॅप ज्येष्ठ नागरिक सिम्युलेटर',
    simulatorSub: 'मराठी किंवा हिंदीमध्ये व्हॉइस नोट पाठवा आणि त्वरित प्रतिसाद तपासा.',
    quickScenarios: 'झटपट चाचण्या',
    customMessage: 'व्हॉट्सअ‍ॅप संदेश पाठवा',
    typePlaceholder: 'मराठी, हिंदी किंवा इंग्रजीत लिहा...',
    send: 'पाठवा',
    sendVoice: 'व्हॉइस नोट पाठवा',
  },
};

export const t = (key: keyof typeof translations.en, lang: Language = 'en'): string => {
  return translations[lang]?.[key] || translations.en[key] || String(key);
};
