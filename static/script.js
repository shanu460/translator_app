/* ==========================
   Translator – STT + TTS (Fixed for Indian Languages + Gender + Punjabi fallback)
   ========================== */

const inputText  = document.getElementById("inputText");
const resultText = document.getElementById("resultText");

const srclang    = document.getElementById("srclang");
const tgtlang    = document.getElementById("tgtlang");
const voiceGender= document.getElementById("voiceGender");

const micBtn       = document.getElementById("micBtn");
const translateBtn = document.getElementById("translateBtn");
const speakBtn     = document.getElementById("speakBtn");
const clearBtn     = document.getElementById("clearBtn");

/* ---- translation call ---- */
async function doTranslate() {
  const text = (inputText.value || "").trim();
  if (!text) { resultText.textContent = ""; return; }

  const payload = {
    text,
    src: (srclang && srclang.value) || "auto",
    tgt: (tgtlang && tgtlang.value) || "en",
  };

  try {
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
      resultText.textContent = data.translated || "";
      window.__translated__ = data.translated || "";
    } else {
      resultText.textContent = data.error || "Error";
    }
  } catch (e) {
    resultText.textContent = "Network error";
  }
}

/* ---- language map for Web Speech ---- */
const langMap = {
  en: "en-US",
  hi: "hi-IN",       // Hindi
  pa: "pa-IN",       // Punjabi (changed for better fallback)
  bn: "bn-IN",       // Bengali
  gu: "gu-IN",       // Gujarati
  mr: "mr-IN",       // Marathi
  ta: "ta-IN",       // Tamil
  te: "te-IN",       // Telugu
  ur: "ur-IN"        // Urdu
};

/* ---- pick best voice ---- */
function pickVoice(wantedLang, genderPref, tgt) {
  const all = window.speechSynthesis.getVoices() || [];
  if (!all.length) return null;

  let voices = all.filter(v => (v.lang || "").toLowerCase().startsWith(wantedLang.toLowerCase()));

  // Special Punjabi fix → fallback to Hindi voice
  if (!voices.length && tgt === "pa") {
    voices = all.filter(v => (v.lang || "").toLowerCase().startsWith("hi"));
  }

  if (!voices.length) {
    voices = all.filter(v => (v.lang || "").toLowerCase().startsWith("en"));
  }

  const g = (genderPref || "female").toLowerCase();
  const prefer = voices.find(v => /female|woman|f/i.test(v.name) && g === "female")
             || voices.find(v => /male|man|m/i.test(v.name) && g === "male");

  return prefer || voices[0] || null;
}

/* ---- Speak Result ---- */
function speak(text, tgt, gender) {
  if (!("speechSynthesis" in window)) {
    alert("Speech Synthesis not supported in this browser.");
    return;
  }
  const utt = new SpeechSynthesisUtterance(text);
  let wanted = (langMap[tgt] || "en-US").toLowerCase();

  const doSpeak = () => {
    const voice = pickVoice(wanted, gender, tgt);
    if (voice) {
      utt.voice = voice;
      utt.lang  = voice.lang;
    } else {
      utt.lang = wanted;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  };

  const voices = window.speechSynthesis.getVoices();
  if (!voices || !voices.length) {
    window.speechSynthesis.onvoiceschanged = () => doSpeak();
    setTimeout(doSpeak, 300);
  } else {
    doSpeak();
  }
}

/* ---- STT (speech to text) ---- */
let recognition = null;
(function setupSTT(){
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!R) {
    if (micBtn) micBtn.disabled = true;
    return;
  }
  recognition = new R();
  recognition.continuous = false;
  recognition.interimResults = false;

  const updLang = () => {
    const code = (srclang && srclang.value) || "auto";
    recognition.lang = (code === "auto") ? "en-IN" : (langMap[code] || "en-US");
  };
  updLang();
  if (srclang) srclang.addEventListener("change", updLang);

  recognition.onresult = (e) => {
    const t = e.results[0][0].transcript;
    inputText.value = (inputText.value ? inputText.value + " " : "") + t;
  };
  recognition.onerror = () => {
    alert("Could not access microphone / speech recognition error.");
  };
})();

/* ---- events ---- */
translateBtn?.addEventListener("click", (e) => { e.preventDefault(); doTranslate(); });

clearBtn?.addEventListener("click", () => {
  inputText.value = "";
  resultText.textContent = "";
  window.__translated__ = "";
});

speakBtn?.addEventListener("click", () => {
  const text = (window.__translated__ || resultText.textContent || "").trim();
  const tgt  = (tgtlang && tgtlang.value) || "en";
  const gen  = (voiceGender && voiceGender.value) || "female";
  if (!text) return;
  speak(text, tgt, gen);
});

micBtn?.addEventListener("click", async () => {
  if (!recognition) return;
  try {
    await navigator.mediaDevices.getUserMedia({audio:true});
    recognition.start();
  } catch {
    alert("Mic permission denied.");
  }
});
