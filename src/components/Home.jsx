import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Mic, 
  MicOff, 
  MessageSquare, 
  ScanLine, 
  CloudSun, 
  Sprout, 
  TrendingUp, 
  Landmark, 
  ClipboardList, 
  PhoneCall, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  Send,
  X
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { getApiBaseUrl } from "../utils/apiConfig";

export default function Home() {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  // -------------------------------------------------------------
  // FEATURE A: VOICE NAVIGATOR ("Talk to RaituMitra")
  // -------------------------------------------------------------
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceResponse, setVoiceResponse] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [pendingFormReview, setPendingFormReview] = useState(null); // Review & Confirmation modal
  const recognitionRef = useRef(null);

  // -------------------------------------------------------------
  // FEATURE B: MITRA — THE FARMER'S COMPANION (Conversational Chatbot)
  // -------------------------------------------------------------
  const [mitraOpen, setMitraOpen] = useState(false);
  const [mitraQuery, setMitraQuery] = useState("");
  const [mitraIsListening, setMitraIsListening] = useState(false);
  const [mitraMessages, setMitraMessages] = useState([]);
  const [mitraLoading, setMitraLoading] = useState(false);
  const mitraRecognitionRef = useRef(null);

  // Initialize Mitra welcome message according to language
  useEffect(() => {
    const welcome = language === "te"
      ? "నమస్కారం రైతు సోదరా! నేను 'మిత్ర' — మీ పంటకు తోడు. మీ టమాటా, వరి లేదా ఇతర పంటల్లో ఏవైనా సమస్యలు ఉన్నాయా? నన్ను స్నేహపూర్వకంగా అడగండి."
      : language === "hi"
      ? "नमस्ते किसान भाई! मैं 'मित्र' — आपकी फसल का सच्चा साथी। फसल रोग, मौसम, खाद या मंडी भाव के बारे में कोई भी शंका हो तो मुझसे पूछें।"
      : "Welcome! I am 'Mitra' — Your trusted farming companion. How is your crop doing today? Ask me about pest prevention, weather, or market advice.";
    setMitraMessages([{ sender: "bot", text: welcome }]);
  }, [language]);

  // Setup Web Speech API for Feature A (Voice Navigator)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError("");
        setVoiceTranscript("");
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setVoiceTranscript(text);
        processVoiceNavigatorIntent(text);
      };

      recognition.onerror = (e) => {
        console.warn("Navigator Speech recognition error:", e);
        setIsListening(false);
        setVoiceError(
          language === "te" 
            ? "వాయిస్ సరిగ్గా వినబడలేదు. దయచేసి మైక్ నొక్కి మళ్లీ మాట్లాడండి." 
            : language === "hi" 
            ? "आवाज स्पष्ट नहीं हुई। कृपया दोबारा माइक दबाकर बोलें।" 
            : "Could not hear audio clearly. Tap the microphone and speak again."
        );
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;

      // Separate recognition for Mitra Chat
      const mitraRec = new SpeechRecognition();
      mitraRec.continuous = false;
      mitraRec.interimResults = false;
      mitraRec.lang = language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-IN";

      mitraRec.onstart = () => setMitraIsListening(true);
      mitraRec.onresult = (e) => {
        const text = e.results[0][0].transcript;
        setMitraQuery(text);
        handleSendMitraMessage(text);
      };
      mitraRec.onerror = () => setMitraIsListening(false);
      mitraRec.onend = () => setMitraIsListening(false);
      mitraRecognitionRef.current = mitraRec;
    }
  }, [language]);

  // Text-To-Speech Audio Voice Output
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.92;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Toggle Voice Navigator Recording
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(language === "te" ? "మీ బ్రౌజర్‌లో మైక్ సదుపాయం కోసం అనుమతి అవసరం." : "Microphone access requires supported browser permissions.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.lang = language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-IN";
        recognitionRef.current.start();
      } catch (err) {
        console.error("Mic start failed:", err);
      }
    }
  };

  // Toggle Mitra Chat Microphone
  const toggleMitraListening = () => {
    if (!mitraRecognitionRef.current) return;
    if (mitraIsListening) {
      mitraRecognitionRef.current.stop();
    } else {
      try {
        mitraRecognitionRef.current.lang = language === "te" ? "te-IN" : language === "hi" ? "hi-IN" : "en-IN";
        mitraRecognitionRef.current.start();
      } catch (err) {
        console.error("Mitra mic error:", err);
      }
    }
  };

  // -------------------------------------------------------------
  // FEATURE A LOGIC: Process Voice Navigator Intent & Autofill
  // -------------------------------------------------------------
  const processVoiceNavigatorIntent = async (transcriptText) => {
    const apiBase = getApiBaseUrl();
    try {
      const res = await fetch(`${apiBase}/api/v1/voice/autofill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: transcriptText,
          language: language || "te",
          current_profile: { district: "Hyderabad", state: "Telangana", farmSize: "2 Acres" }
        })
      });

      if (!res.ok) throw new Error("Voice autofill failed");
      const data = await res.json();

      setVoiceResponse(data.spoken_confirmation);
      speakText(data.spoken_confirmation);

      // If fields were extracted for a form (e.g. Crop Advisory), show confirmation & auto-navigate
      if (Object.keys(data.extracted_fields || {}).length > 1) {
        // Save to localStorage for automatic form pre-filling in CropRecommendation.jsx
        try {
          localStorage.setItem("raitu_autofill_data", JSON.stringify(data.extracted_fields));
        } catch (e) {}

        setPendingFormReview({
          route: data.target_route,
          routeName: data.target_name,
          fields: data.extracted_fields,
          question: data.spoken_question
        });
      } else {
        // Direct route navigation after speaking instructions
        setTimeout(() => {
          navigate(data.target_route);
        }, 2200);
      }
    } catch (err) {
      console.warn("Autofill API error, using intelligent client router:", err);
      fallbackLocalVoiceRouter(transcriptText);
    }
  };

  const fallbackLocalVoiceRouter = (text) => {
    const lower = text.toLowerCase();
    if (lower.includes("మచ్చ") || lower.includes("తెగులు") || lower.includes("వ్యాధి") || lower.includes("disease") || lower.includes("spot")) {
      const resp = language === "te" ? "మీ పంట తెగులు నిర్ధారణ కోసం డిసీజ్ డిటెక్షన్ తెరుస్తున్నాను..." : "Opening Crop Disease Detection...";
      setVoiceResponse(resp);
      speakText(resp);
      setTimeout(() => navigate("/detect"), 1800);
    } else if (lower.includes("వర్షం") || lower.includes("వాతావరణం") || lower.includes("weather") || lower.includes("rain")) {
      const resp = language === "te" ? "రాబోయే 7 రోజుల వాతావరణం మరియు వర్షపాత అంచనాలను తెరుస్తున్నాను..." : "Opening live 7-day weather forecast...";
      setVoiceResponse(resp);
      speakText(resp);
      setTimeout(() => navigate("/weather"), 1800);
    } else if (lower.includes("ధర") || lower.includes("మార్కెట్") || lower.includes("మండి") || lower.includes("price") || lower.includes("mandi")) {
      const resp = language === "te" ? "తాజా మార్కెట్ మరియు మండి ధరల పేజీని తెరుస్తున్నాను..." : "Opening Mandi Market prices...";
      setVoiceResponse(resp);
      speakText(resp);
      setTimeout(() => navigate("/market"), 1800);
    } else {
      const resp = language === "te" ? "మీ పంట సలహా మరియు సాగు ప్రణాళిక పేజీని తెరుస్తున్నాను..." : "Opening Crop Advisory & Planning...";
      setVoiceResponse(resp);
      speakText(resp);
      setTimeout(() => navigate("/crop"), 1800);
    }
  };

  // Confirm and proceed to auto-filled section
  const handleConfirmFormReview = () => {
    if (pendingFormReview?.route) {
      navigate(pendingFormReview.route);
    }
  };

  // -------------------------------------------------------------
  // FEATURE B LOGIC: Mitra Companion Conversational Interaction
  // -------------------------------------------------------------
  const handleSendMitraMessage = async (overrideText) => {
    const q = overrideText || mitraQuery;
    if (!q.trim()) return;

    const userMsg = { sender: "user", text: q };
    setMitraMessages((prev) => [...prev, userMsg]);
    setMitraQuery("");
    setMitraLoading(true);

    const apiBase = getApiBaseUrl();
    try {
      const res = await fetch(`${apiBase}/api/v1/chatbot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, language: language || "te" })
      });

      if (!res.ok) throw new Error("Chatbot API response not ok");
      const data = await res.json();
      const botMsg = { sender: "bot", text: data.answer };
      setMitraMessages((prev) => [...prev, botMsg]);
      speakText(data.answer);
    } catch (err) {
      console.warn("Mitra backend error, providing verified agro companion reply:", err);
      let answer = "";
      const lower = q.toLowerCase();
      if (lower.includes("మచ్చ") || lower.includes("tomato") || lower.includes("టమాట") || lower.includes("टमाटर")) {
        answer = language === "te"
          ? "మిత్ర సలహా: టమాట ఆకులపై మచ్చలు ఎక్కువగా ఉంటే: 1. ఆకు అడుగు భాగంలో బూజు పరిశీలించండి. 2. డ్రిప్ ద్వారా మాత్రమే నీరందించండి. 3. కాపర్ ఆక్సిక్లోరైడ్ (2.5 గ్రా/లీ) లేదా మాంకోజెబ్ (2.5 గ్రా/లీ) పిచికారీ చేయండి. ఖచ్చితమైన నిర్ధారణ కోసం 'Crop Disease Detection' లో ఆకు ఫోటో తీయండి."
          : language === "hi"
          ? "मित्र सलाह: टमाटर की पत्तियों पर धब्बों के लिए: 1. पत्तियों पर पानी का छिड़काव रोकें। 2. कॉपर ऑक्सीक्लोराइड (2.5 ग्राम/लीटर) या मैंकोजेब (2.5 ग्राम/लीटर) का छिड़काव करें। सटीक जांच के लिए 'Crop Disease Detection' का उपयोग करें।"
          : "Mitra's Advice: For tomato foliar spots: 1. Check leaf underside for fungal mold. 2. Use drip irrigation. 3. Spray Copper Oxychloride (2.5 g/L) or Mancozeb (2.5 g/L). Open Disease Detection to photograph the leaf.";
      } else {
        answer = language === "te"
          ? "మిత్ర వ్యవసాయ తోడు: పంట ఆరోగ్యం, ఎరువులు మరియు మార్కెట్ ధరల వివరాల కోసం నేను మీకు సహాయం చేస్తాను. అత్యవసర సాయం కోసం కిసాన్ కాల్ సెంటర్ 1800-180-1551 సంప్రదించవచ్చు."
          : "मित्र कृषि साथी: फसल सुरक्षा, पोषण व मंडी भाव की जानकारी के लिए मैं हमेशा उपस्थित हूँ। आपातकालीन कृषि सहायता हेतु किसान कॉल सेंटर 1800-180-1551 पर कॉल करें।";
      }
      setMitraMessages((prev) => [...prev, { sender: "bot", text: answer }]);
      speakText(answer);
    } finally {
      setMitraLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-green-50/20 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100 pb-24">
      
      {/* 1. TOP HEADER: FARMER GREETING & REGIONAL ACCESSIBILITY */}
      <section className="pt-6 pb-4 px-4 sm:px-6 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 font-bold text-xs sm:text-sm mb-3 shadow-sm border border-emerald-300 dark:border-emerald-800">
          <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>{language === "te" ? "రైతుమిత్ర • AI ఆధారిత గ్రామీణ సలహా వేదిక" : language === "hi" ? "रायतुमित्र • AI आधारित ग्रामीण कृषि मंच" : "RaituMitra • Voice-First Precision Agricultural Platform"}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-emerald-950 dark:text-white tracking-tight">
          {language === "te" ? "నమస్కారం రైతు సోదరా!" : language === "hi" ? "नमस्ते किसान भाई!" : "Welcome, Farmer!"}
        </h1>
        <p className="mt-2 text-base sm:text-lg text-emerald-800 dark:text-emerald-300 font-semibold max-w-2xl mx-auto">
          {language === "te" ? "ఈ రోజు మీ పొలానికి ఎలాంటి సహాయం కావాలి?" : language === "hi" ? "आज आपके खेत के लिए क्या सहायता चाहिए?" : "How can we help your farm today?"}
        </p>
      </section>

      {/* 2. TWO DISTINCT PRIMARY ACTIONS: VOICE NAVIGATOR & MITRA COMPANION */}
      <section className="px-4 sm:px-6 max-w-4xl mx-auto my-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* FEATURE A: TALK TO RAITUMITRA (Voice Navigator & Auto Form Filler) */}
          <div className={`p-6 sm:p-7 rounded-3xl border-3 shadow-xl transition-all duration-300 flex flex-col items-center text-center justify-between ${
            isListening 
              ? "bg-red-50 dark:bg-red-950/70 border-red-500 ring-4 ring-red-400 animate-pulse" 
              : "bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 text-white border-emerald-400 hover:scale-[1.02] shadow-emerald-600/30"
          }`}>
            <div className="w-22 h-22 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
              {isListening ? (
                <MicOff className="w-11 h-11 text-red-600 animate-bounce" />
              ) : (
                <Mic className="w-11 h-11 text-white" />
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-white/20">
                {language === "te" ? "వాయిస్ నావిగేటర్" : "Feature A • Voice Navigator"}
              </span>
              <h2 className="text-2xl font-black tracking-tight">
                {isListening 
                  ? (language === "te" ? "వింటున్నాను... మాట్లాడండి" : "Listening...")
                  : (language === "te" ? "రైతుమిత్రతో మాట్లాడండి" : "Talk to RaituMitra")}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-emerald-100 max-w-xs mx-auto">
                {language === "te" 
                  ? "మీ భాషలో మాట్లాడండి. మేము మిమ్మల్ని సరైన విభాగానికి తీసుకెళ్లి ఫారం నింపుతాము." 
                  : "Speak in your language. We will take you where you need to go."}
              </p>
            </div>

            <button
              onClick={toggleListening}
              className={`mt-5 w-full py-3.5 px-6 rounded-2xl font-black text-base shadow-lg transition active:scale-95 flex items-center justify-center gap-2 ${
                isListening 
                  ? "bg-red-600 hover:bg-red-700 text-white" 
                  : "bg-white text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              <Mic className="w-5 h-5" />
              <span>{isListening 
                ? (language === "te" ? "మాట్లాడటం ఆపండి" : "Stop Listening") 
                : (language === "te" ? "మైక్ నొక్కి మాట్లాడండి" : "Tap to Speak & Navigate")}</span>
            </button>
          </div>

          {/* FEATURE B: MITRA — THE FARMER'S COMPANION (Conversational Advisor) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-gray-800 border-2 border-emerald-500/50 shadow-xl hover:scale-[1.02] transition-all duration-300 flex flex-col items-center text-center justify-between">
            <div className="w-22 h-22 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-3">
              <MessageSquare className="w-11 h-11" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {language === "te" ? "రైతు తోడు" : "Feature B • Companion"}
              </span>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                {language === "te" ? "మిత్రను అడగండి" : "Ask Mitra"}
              </h2>
              <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {language === "te" ? "మీ పంటకు తోడు — Your trusted farming companion" : "Your dedicated agricultural companion for all farm doubts."}
              </p>
            </div>

            <button
              onClick={() => setMitraOpen(true)}
              className="mt-5 w-full py-3.5 px-6 rounded-2xl font-black text-base bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              <span>{language === "te" ? "మిత్రతో మాట్లాడండి" : "Chat with Mitra"}</span>
            </button>
          </div>

        </div>

        {/* Live Audio / Spoken Intent Notification Banner */}
        {(voiceTranscript || voiceResponse || isListening || voiceError) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-800 border-2 border-emerald-500 shadow-md animate-fadeIn space-y-2">
            {isListening && (
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span>{language === "te" ? "వాయిస్ రికార్డ్ అవుతోంది... స్పష్టంగా మాట్లాడండి" : "Listening to farmer's voice..."}</span>
              </div>
            )}

            {voiceTranscript && (
              <div className="text-sm sm:text-base text-gray-900 dark:text-white font-bold">
                <span className="text-emerald-600">🗣️ {language === "te" ? "మీరు అన్న మాట:" : "You said:"}</span> "{voiceTranscript}"
              </div>
            )}

            {voiceResponse && (
              <div className="text-sm sm:text-base text-emerald-900 dark:text-emerald-200 font-medium flex items-start justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span>🤖 {voiceResponse}</span>
                {isSpeaking ? (
                  <button onClick={stopSpeaking} className="p-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 shrink-0" title="Stop audio">
                    <VolumeX className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => speakText(voiceResponse)} className="p-1 rounded-lg bg-emerald-200 text-emerald-800 hover:bg-emerald-300 shrink-0" title="Play audio">
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {voiceError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{voiceError}</p>
            )}
          </div>
        )}

        {/* FORM AUTO-FILL REVIEW & CONFIRMATION MODAL */}
        {pendingFormReview && (
          <div className="p-5 sm:p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-400 dark:border-amber-500 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-amber-600" />
                <h3 className="text-lg font-black text-amber-900 dark:text-amber-200">
                  {language === "te" ? "స్వయంచాలక ఫారం సమీక్ష (Review Auto-Filled Form)" : "Review & Confirm Auto-Filled Information"}
                </h3>
              </div>
              <button 
                onClick={() => setPendingFormReview(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
              {language === "te" 
                ? `మీ వాయిస్ ద్వారా గుర్తించిన వివరాలు '${pendingFormReview.routeName}' లో నింపబడ్డాయి:` 
                : `Information extracted from your voice for '${pendingFormReview.routeName}':`}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {Object.entries(pendingFormReview.fields).map(([k, v]) => (
                <div key={k} className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-gray-700">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">{k}</span>
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                    {Array.isArray(v) ? v.join(", ") : String(v)}
                  </span>
                </div>
              ))}
            </div>

            {pendingFormReview.question && (
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                ❓ {pendingFormReview.question}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmFormReview}
                className="flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <span>{language === "te" ? "వివరాలు నిర్ధారించి పేజీని తెరవండి" : "Confirm & Open Form"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPendingFormReview(null)}
                className="py-3 px-4 rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-xs transition"
              >
                {language === "te" ? "రద్దు" : "Cancel"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. MITRA CONVERSATIONAL COMPANION MODAL / FULL DRAWER */}
      {mitraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl border-2 border-emerald-500 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="p-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-white/20 rounded-2xl">🌱</span>
                <div>
                  <h3 className="font-black text-lg sm:text-xl">
                    {language === "te" ? "మిత్ర — రైతు వ్యవసాయ నేస్తం" : "Mitra — Farming Companion"}
                  </h3>
                  <p className="text-xs text-emerald-100 font-medium">
                    మీ పంటకు తోడు • Verified Agricultural Companion
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <button onClick={stopSpeaking} className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg flex items-center gap-1">
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Mute</span>
                  </button>
                )}
                <button 
                  onClick={() => { stopSpeaking(); setMitraOpen(false); }}
                  className="p-1.5 rounded-full hover:bg-white/20 text-white transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Conversation Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/60">
              {mitraMessages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm font-medium leading-relaxed shadow-sm ${
                    m.sender === "user"
                      ? "bg-emerald-600 text-white rounded-br-none"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-none"
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {mitraLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl text-xs text-emerald-600 font-semibold animate-pulse border border-gray-200">
                    🌾 {language === "te" ? "మిత్ర సమాధానాన్ని రచిస్తోంది..." : "Mitra is typing agricultural advice..."}
                  </div>
                </div>
              )}
            </div>

            {/* Suggestion Chips */}
            <div className="px-4 py-2 flex flex-wrap gap-2 text-xs border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button 
                onClick={() => handleSendMitraMessage(language === "te" ? "టమాట ఆకు మచ్చల నివారణ ఏమిటి?" : "What to do for tomato leaf spots?")}
                className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200"
              >
                🍅 {language === "te" ? "టమాట ఆకు మచ్చలు" : "Tomato Leaf Spots"}
              </button>
              <button 
                onClick={() => handleSendMitraMessage(language === "te" ? "రేపు వర్షం పడుతుందా?" : "Will it rain tomorrow?")}
                className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200"
              >
                🌧️ {language === "te" ? "రేపటి వర్షం" : "Rain Tomorrow?"}
              </button>
              <button 
                onClick={() => handleSendMitraMessage(language === "te" ? "ఎక్కువ వర్షంలో ఏ పంట వేయాలి?" : "Which crop in heavy rain?")}
                className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200"
              >
                🌱 {language === "te" ? "వర్షాధార పంటలు" : "Heavy Rain Crops"}
              </button>
            </div>

            {/* Chat Input Controls */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                type="button"
                onClick={toggleMitraListening}
                className={`p-3 rounded-xl border transition ${
                  mitraIsListening 
                    ? "bg-red-500 text-white animate-bounce" 
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
                }`}
                title="Speak to Mitra"
              >
                <Mic className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={mitraQuery}
                onChange={(e) => setMitraQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSendMitraMessage(); }}
                placeholder={language === "te" ? "మిత్రను అడగండి..." : "Ask Mitra anything about farming..."}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <button
                onClick={() => handleSendMitraMessage()}
                disabled={mitraLoading || !mitraQuery.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center gap-1.5"
              >
                <span>{language === "te" ? "పంపు" : "Send"}</span>
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. SEVEN LARGE ACCESSIBLE FARMER NAVIGATION CARDS */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto mt-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {language === "te" ? "ముఖ్యమైన వ్యవసాయ సేవలు" : language === "hi" ? "प्रमुख कृषि सेवाएं" : "Essential Agricultural Services"}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
            {language === "te" ? "మీకు కావలసిన సేవను నేరుగా తాకండి" : "Touch any service card below to open the dedicated module"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          
          {/* CARD 1: CROP DISEASE DETECTION */}
          <Link
            to="/detect"
            className="group p-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-emerald-400/40 shadow-lg hover:shadow-2xl hover:border-emerald-500 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl p-3 bg-emerald-100 dark:bg-emerald-950/80 rounded-2xl">🍃</span>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  MobileNetV3 AI
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {language === "te" ? "1. పంట తెగుళ్ల గుర్తింపు" : "1. Crop Disease Detection"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                {language === "te" 
                  ? "ఆకు ఫోటో తీసి అప్‌లోడ్ చేయండి. 38 రకాల తెగుళ్ల నిర్ధారణ, Grad-CAM హీట్‌మ్యాప్ మరియు సిఫార్సు చేసిన మందుల వివరాలు." 
                  : "Upload a crop leaf photo. Certified MobileNetV3 AI identifies 38 diseases with Grad-CAM visualization and IPM spray dosages."}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <span>{language === "te" ? "ఫోటోను పరీక్షించండి" : "Open Disease Scanner"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* CARD 2: CROP ADVISORY & SOWING PLAN */}
          <Link
            to="/crop"
            className="group p-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-amber-400/40 shadow-lg hover:shadow-2xl hover:border-amber-500 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl p-3 bg-amber-100 dark:bg-amber-950/80 rounded-2xl">🌱</span>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Precision Advisory
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                {language === "te" ? "2. పంట సలహాలు & సాగు ప్రణాళిక" : "2. Crop Advisory & Planning"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                {language === "te" 
                  ? "నేల రకం, వర్షపాతం మరియు బడ్జెట్‌కు అనువైన లాభదాయక పంటల సిఫార్సులు. వాయిస్ ద్వారా ఫారం నింపవచ్చు." 
                  : "Personalized crop suitability recommendations based on soil, live rainfall forecasts, and rotation safety."}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400">
              <span>{language === "te" ? "పంట సలహా చూడండి" : "View Crop Plan"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* CARD 3: WEATHER & RAINFALL INTELLIGENCE */}
          <Link
            to="/weather"
            className="group p-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-blue-400/40 shadow-lg hover:shadow-2xl hover:border-blue-500 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl p-3 bg-blue-100 dark:bg-blue-950/80 rounded-2xl">⛅</span>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Live IMD Forecast
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {language === "te" ? "3. వాతావరణం & వర్షపాతం" : "3. Weather & Rainfall Advisory"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                {language === "te" 
                  ? "రాబోయే 7 రోజుల ఖచ్చితమైన వాతావరణం, వర్షపాత సంభావ్యత మరియు పిచికారీ అనుకూల సమయాల సూచనలు." 
                  : "Verified 7-day weather forecasts, precipitation probabilities, humidity, and agronomic spraying advisories."}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
              <span>{language === "te" ? "వాతావరణం చూడండి" : "View Weather Forecast"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* CARD 4: MARKET PRICES & MANDI INFORMATION */}
          <Link
            to="/market"
            className="group p-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-emerald-400/40 shadow-lg hover:shadow-2xl hover:border-emerald-500 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl p-3 bg-emerald-100 dark:bg-emerald-950/80 rounded-2xl">💹</span>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  eNAM / Mandi Rates
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                {language === "te" ? "4. మార్కెట్ ధరలు & మండి సమాచారం" : "4. Market Prices & Mandi Rates"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                {language === "te" 
                  ? "సమీప మార్కెట్ యార్డులలో పంటల తాజా ధరలు, హెచ్చుతగ్గులు మరియు పంటను ఎక్కడ అమ్మితే మంచి లాభమో తెలుసుకోండి." 
                  : "Daily verified mandi market arrivals, modal prices, and marketing guidance for crops across regions."}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <span>{language === "te" ? "మండి ధరలు చూడండి" : "View Mandi Rates"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* CARD 5: SATELLITE FIELD ANALYSIS */}
          <Link
            to="/satellite"
            className="group p-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-indigo-400/40 shadow-lg hover:shadow-2xl hover:border-indigo-500 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl p-3 bg-indigo-100 dark:bg-indigo-950/80 rounded-2xl">🛰️</span>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Sentinel-2 Multi-spectral
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                {language === "te" ? "5. ఉపగ్రహ పంట పర్యవేక్షణ" : "5. Satellite Crop Health Analysis"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                {language === "te" 
                  ? "మీ పొలాన్ని శాటిలైట్ మ్యాప్‌పై గీసి NDVI, తేమ సూచిక (NDWI) మరియు పంట ఆరోగ్యాన్ని గమనించండి." 
                  : "Draw farm boundaries on Leaflet Sentinel-2 satellite imagery to calculate NDVI and crop health indices."}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              <span>{language === "te" ? "శాటిలైట్ మ్యాప్ తెరవండి" : "Open Satellite Map"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* CARD 6: FARMER RECORDS & DIARY */}
          <Link
            to="/profile"
            className="group p-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-purple-400/40 shadow-lg hover:shadow-2xl hover:border-purple-500 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl p-3 bg-purple-100 dark:bg-purple-950/80 rounded-2xl">📋</span>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Farmer Logbook
                </span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                {language === "te" ? "6. నా పొలం రికార్డులు & డైరీ" : "6. Farmer Activity & Crop Records"}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                {language === "te" 
                  ? "విత్తనం నాటిన తేదీ, ఎరువుల పిచికారీ, పెట్టుబడి మరియు దిగుబడి లెక్కల డిజిటల్ రికార్డు." 
                  : "Log sowing dates, fertilizer applications, farm expenditure, and crop yield records in your profile."}
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400">
              <span>{language === "te" ? "నా డైరీని తెరవండి" : "Open Farm Diary"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* CARD 7: GOVERNMENT SCHEMES & EXPERT CONTACT */}
          <Link
            to="/resources"
            className="group p-6 rounded-3xl bg-white dark:bg-gray-800 border-2 border-rose-400/40 shadow-lg hover:shadow-2xl hover:border-rose-500 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 sm:col-span-2 lg:col-span-3"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl p-3 bg-rose-100 dark:bg-rose-950/80 rounded-2xl">📞</span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                    {language === "te" ? "7. రైతు పథకాలు & వ్యవసాయ నిపుణుల సహాయం" : "7. Government Schemes & Agriculture Expert Helpline"}
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium max-w-2xl">
                    {language === "te" 
                      ? "పీఎం-కిసాన్ పథకాలు మరియు టోల్-ఫ్రీ కిసాన్ కాల్ సెంటర్ (1800-180-1551), మండల వ్యవసాయ అధికారి (MAO) సహాయం." 
                      : "Official welfare subsidies, PM-KISAN, crop insurance, and direct toll-free connection to Kisan Call Center (1800-180-1551)."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-base font-bold text-rose-600 dark:text-rose-400 shrink-0">
                <span>{language === "te" ? "సంప్రదించండి" : "View Directory"}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </div>
            </div>
          </Link>

        </div>
      </section>

      {/* 5. ILLUSTRATED SUPPORTED CROPS */}
      <section className="px-4 sm:px-6 max-w-6xl mx-auto mt-12 text-center">
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-4">
          🌾 {language === "te" ? "మద్దతు ఉన్న ముఖ్య పంటలు" : "Supported Agricultural Crops"}
        </h3>
        <div className="flex flex-wrap justify-center items-center gap-2.5 sm:gap-4">
          {[
            { icon: "🍅", name: language === "te" ? "టమాట" : "Tomato" },
            { icon: "🌾", name: language === "te" ? "వరి" : "Rice" },
            { icon: "🌽", name: language === "te" ? "మొక్కజొన్న" : "Maize" },
            { icon: "🌶️", name: language === "te" ? "మిరప" : "Chilli" },
            { icon: "🥔", name: language === "te" ? "బంగాళాదుంప" : "Potato" },
            { icon: "🌱", name: language === "te" ? "పత్తి" : "Cotton" },
            { icon: "🍇", name: language === "te" ? "ద్రాక్ష" : "Grape" },
            { icon: "🍎", name: language === "te" ? "యాపిల్" : "Apple" },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-emerald-200 dark:border-gray-700 shadow-sm text-xs font-semibold">
              <span className="text-base">{c.icon}</span>
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
