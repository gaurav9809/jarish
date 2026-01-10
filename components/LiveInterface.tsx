
import React, { useEffect, useRef, useState } from 'react';
import { MicOff, PhoneOff, Mic, ShieldAlert, RefreshCw, Radio, BrainCircuit } from 'lucide-react';
import Visualizer from './Visualizer';
import { ADAPTIVE_SYSTEM_INSTRUCTION } from '../constants';
import { createChatSession } from '../services/geminiService';

interface LiveInterfaceProps {
  isActive: boolean;
  onToggle: () => void;
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ isActive, onToggle }) => {
  const [status, setStatus] = useState<string>("INITIALIZING UPLINK...");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    if (isActive) {
      setupDeepSeekLink();
    }
    return () => {
      terminateLink();
    };
  }, [isActive]);

  const setupDeepSeekLink = async () => {
    try {
      setError(null);
      setStatus("BOOTING DEEPSEEK CORE...");

      // 1. Audio Visualizer Setup
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
        microphoneSourceRef.current = source;
      } catch (err) {
        console.warn("Mic access for visualizer failed.");
      }

      // 2. Chat Session (DeepSeek R1)
      chatSessionRef.current = createChatSession(ADAPTIVE_SYSTEM_INSTRUCTION + " You are speaking via voice. Keep response SHORT. Use <think> tags for reasoning.");

      // 3. Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) throw new Error("Browser Speech API not supported.");

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (!isSpeaking && !isThinking) {
            setStatus("LISTENING...");
            setIsListening(true);
        }
      };

      recognition.onend = () => {
        if (isActive && !isSpeaking && !isThinking && !error) {
           try { recognition.start(); } catch(e) {}
        } else {
            setIsListening(false);
        }
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (!transcript.trim()) return;

        console.log("User Input:", transcript);
        recognition.stop();
        setStatus("REASONING...");
        setIsListening(false);
        setIsThinking(true);

        await processDeepSeekInput(transcript);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initialize Uplink.");
    }
  };

  const processDeepSeekInput = async (text: string) => {
    if (!chatSessionRef.current) return;

    try {
        const response = await chatSessionRef.current.sendMessage({ message: text });
        const fullText = response.text;
        
        // DeepSeek R1 returns <think>...</think>. We should NOT speak that part.
        // But we can log it or show it. For voice, we strip it.
        const cleanSpeechText = fullText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        
        setIsThinking(false);
        speakResponse(cleanSpeechText || "Thinking complete.");

    } catch (e: any) {
        setError("OpenRouter Uplink Failed.");
        setIsThinking(false);
        speakResponse("Connection to DeepSeek severed.");
    }
  };

  const speakResponse = (text: string) => {
    setStatus("SIYA SPEAKING");
    setIsSpeaking(true);
    synthesisRef.current.cancel();

    // Clean formatting for speech
    const speechText = text.replace(/[*_#`]/g, '');

    const utterance = new SpeechSynthesisUtterance(speechText);
    const voices = synthesisRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Female'));
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.1;
    utterance.pitch = 1.1;

    utterance.onend = () => {
        setIsSpeaking(false);
        setStatus("LISTENING...");
        if (recognitionRef.current && isActive && !isMuted) {
            try { recognitionRef.current.start(); } catch(e) {}
        }
    };

    synthesisRef.current.speak(utterance);
  };

  const terminateLink = () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
    }
    synthesisRef.current.cancel();
    if (audioContextRef.current) audioContextRef.current.close();
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col font-mono">
       {error && (
         <div className="absolute inset-0 z-[60] bg-black/95 flex items-center justify-center p-8 text-center">
            <div className="max-w-md p-6 border border-red-500/20 rounded-2xl bg-red-900/10 backdrop-blur-md">
                <ShieldAlert size={48} className="text-red-500 mb-6 mx-auto" />
                <h2 className="text-white text-xl font-bold mb-2">UPLINK ERROR</h2>
                <p className="text-white/60 text-xs mb-6">{error}</p>
                <button onClick={onToggle} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full">ABORT</button>
            </div>
         </div>
       )}

       {/* Status Header */}
       <div className="absolute top-0 left-0 w-full p-8 z-20 flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-2">
                <div className="border border-indigo-500/30 bg-black/60 px-5 py-2 text-indigo-400 text-[10px] font-black tracking-[0.3em] backdrop-blur-3xl rounded-r-full flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-indigo-400 animate-pulse' : (isListening ? 'bg-green-500' : (isThinking ? 'bg-purple-500 animate-ping' : 'bg-zinc-600'))}`}></div>
                    STATUS: {status}
                </div>
                <div className="flex items-center gap-2 px-5 opacity-50">
                     <BrainCircuit size={12} className="text-white" />
                     <span className="text-[9px] text-white tracking-widest">DEEPSEEK R1 • REASONING CORE</span>
                </div>
            </div>
       </div>

       {/* Central Visualizer */}
       <div className="flex-1 relative overflow-hidden">
            <Visualizer analyser={analyserRef.current} isActive={isActive} isSpeaking={isSpeaking || isListening || isThinking} />
       </div>

       {/* Controls */}
       <div className="h-40 bg-black border-t border-white/5 flex items-center justify-center gap-12 relative z-30 px-8">
            <button onClick={() => setIsMuted(!isMuted)} className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${isMuted ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-white/40'}`}>
                {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
            <button onClick={onToggle} className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95">
                <PhoneOff size={32} className="text-white" />
            </button>
       </div>
    </div>
  );
};

export default LiveInterface;
