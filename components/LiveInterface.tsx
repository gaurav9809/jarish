
import React, { useEffect, useRef, useState } from 'react';
import { MicOff, PhoneOff, Mic, ShieldAlert } from 'lucide-react';
import Visualizer from './Visualizer';
import { ADAPTIVE_SYSTEM_INSTRUCTION } from '../constants';
import { getApiKey } from '../services/localAiService';

interface LiveInterfaceProps {
  isActive: boolean;
  onToggle: () => void;
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ isActive, onToggle }) => {
  const [status, setStatus] = useState<string>("INITIALIZING UPLINK...");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (isActive) {
      startVoiceLink();
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (synthesisRef.current) synthesisRef.current.cancel();
    };
  }, [isActive]);

  const startVoiceLink = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Browser voice recognition not supported.");
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'hi-IN'; 

    recognitionRef.current.onresult = async (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      if (text.trim() && !isMuted) {
        processVoiceInput(text);
      }
    };

    recognitionRef.current.start();
    synthesisRef.current = window.speechSynthesis;
    setStatus("NEURAL LINK ACTIVE (R1)");
  };

  const processVoiceInput = async (userInput: string) => {
    setStatus("R1 THINKING...");
    try {
      const apiKey = getApiKey();
      if (!apiKey) {
          throw new Error("DeepSeek API Key missing");
      }

      const response = await fetch(`https://api.deepseek.com/chat/completions`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "deepseek-reasoner",
          messages: [
              { role: 'system', content: ADAPTIVE_SYSTEM_INSTRUCTION + " Reply in extremely short Hinglish sentences." },
              { role: 'user', content: userInput }
          ]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || `API Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        // R1 might return reasoning content, we only want the final speech content
        const content = data.choices[0].message.content;
        speakText(content);
      }
    } catch (err: any) {
      console.error(err);
      setStatus("UPLINK ERROR");
      if (err.message.includes("Key missing")) {
        speakText("API key missing sir.");
      }
    }
  };

  const speakText = (text: string) => {
    if (!synthesisRef.current) return;
    if (!text) return;
    
    const cleanText = text.replace(/\[REACT:.*?\]/g, "").replace(/\<.*?\>/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.1;
    utterance.pitch = 1.1;
    utterance.onstart = () => { setIsSpeaking(true); setStatus("SIYA SPEAKING"); };
    utterance.onend = () => { setIsSpeaking(false); setStatus("AWAITING INPUT"); };
    synthesisRef.current.speak(utterance);
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col font-mono">
       {error && (
         <div className="absolute inset-0 z-[60] bg-black/95 flex items-center justify-center p-8 text-center">
            <div className="max-w-xs flex flex-col items-center">
                <ShieldAlert size={48} className="text-red-500 mb-6" />
                <h2 className="text-white text-xl font-bold mb-4 uppercase">System Error</h2>
                <p className="text-white/40 text-xs mb-8">{error}</p>
                <button onClick={onToggle} className="w-full py-4 bg-white text-black font-black uppercase text-[10px] rounded-full">Terminate</button>
            </div>
         </div>
       )}

       <div className="absolute top-0 left-0 w-full p-8 z-20 flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-2">
                <div className="border border-indigo-500/30 bg-black/60 px-5 py-2 text-indigo-400 text-[10px] font-black tracking-[0.3em] backdrop-blur-3xl">
                    STATUS: {status}
                </div>
            </div>
       </div>

       <div className="flex-1 relative overflow-hidden">
            <Visualizer analyser={null} isActive={isActive} isSpeaking={isSpeaking} />
       </div>

       <div className="h-40 bg-black border-t border-white/5 flex items-center justify-center gap-12 relative z-30 px-8">
            <button onClick={() => setIsMuted(!isMuted)} className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${isMuted ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-white/5 border-white/10 text-white/40'}`}>
                {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
            <button onClick={onToggle} className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transition-all">
                <PhoneOff size={32} className="text-white" />
            </button>
       </div>
    </div>
  );
};

export default LiveInterface;
