
import React, { useEffect, useRef, useState } from 'react';
import { MicOff, PhoneOff, Mic, ShieldAlert, RefreshCw } from 'lucide-react';
import Visualizer from './Visualizer';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ADAPTIVE_SYSTEM_INSTRUCTION } from '../constants';
import { createPcmBlob, decodeAudioData, arrayBufferToBase64 } from '../services/geminiService';

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

interface LiveInterfaceProps {
  isActive: boolean;
  onToggle: () => void;
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ isActive, onToggle }) => {
  const [status, setStatus] = useState<string>("INITIALIZING UPLINK...");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isActive) {
      setupNeuralLink();
    }
    return () => {
      terminateNeuralLink();
    };
  }, [isActive]);

  const setupNeuralLink = async () => {
    try {
      setError(null);
      setStatus("SCANNING AUDIO DEVICES...");
      
      // Verify MediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
         throw new Error("Neural Interface (Microphone) not supported on this browser.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. Get Microphone Stream with fallbacks
      let stream: MediaStream;
      try {
        // Try high quality first
        stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                autoGainControl: true,
                noiseSuppression: true
            }
        });
      } catch (err: any) {
        console.warn("High-quality audio failed, trying basic...", err);
        try {
            // Fallback to basic
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (finalErr: any) {
             console.error("Audio access failed:", finalErr);
             
             // Analyze error type
             if (finalErr.name === 'NotAllowedError' || finalErr.name === 'PermissionDeniedError') {
                 throw new Error("Access Denied: Please allow microphone permissions in your browser settings.");
             } else if (finalErr.name === 'NotFoundError' || finalErr.name === 'DevicesNotFoundError') {
                 throw new Error("Hardware Missing: No microphone detected. Please check your connections.");
             } else if (finalErr.name === 'NotReadableError' || finalErr.name === 'TrackStartError') {
                 throw new Error("Hardware Busy: Microphone is being used by another application.");
             } else {
                 throw new Error(`Audio Error: ${finalErr.message || "Unknown microphone issue"}`);
             }
        }
      }
      
      streamRef.current = stream;
      setStatus("ESTABLISHING NEURAL LINK...");

      // 2. Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      // Resume contexts if suspended (browser autoplay policy)
      if (inputAudioContextRef.current.state === 'suspended') await inputAudioContextRef.current.resume();
      if (outputAudioContextRef.current.state === 'suspended') await outputAudioContextRef.current.resume();

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus("NEURAL LINK ACTIVE");
            if (!inputAudioContextRef.current) return;

            const source = inputAudioContextRef.current.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              if (isMuted) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              // Use sessionPromise to prevent closure staleness
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              setIsSpeaking(true);
              setStatus("SIYA RESPONDING");
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContextRef.current.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) {
                   setIsSpeaking(false);
                   setStatus("AWAITING INPUT");
                }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live Neural Error:", e);
            setError("Connection to Neural Core lost.");
          },
          onclose: () => {
            setStatus("LINK TERMINATED");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: ADAPTIVE_SYSTEM_INSTRUCTION + " Be very brief. Use Hinglish."
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initialize neural uplink.");
      // Clean up if we partially succeeded
      terminateNeuralLink(); 
    }
  };

  const terminateNeuralLink = () => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch(e) {}
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    inputAudioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
  };

  const handleRetry = () => {
      terminateNeuralLink();
      setupNeuralLink();
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col font-mono">
       {error && (
         <div className="absolute inset-0 z-[60] bg-black/95 flex items-center justify-center p-8 text-center">
            <div className="max-w-md flex flex-col items-center p-6 border border-red-500/20 rounded-2xl bg-red-900/10 backdrop-blur-md">
                <ShieldAlert size={48} className="text-red-500 mb-6" />
                <h2 className="text-white text-xl font-bold mb-2 uppercase">System Malfunction</h2>
                <p className="text-white/60 text-xs mb-8 leading-relaxed">{error}</p>
                <div className="flex gap-4 w-full">
                    <button onClick={onToggle} className="flex-1 py-3 bg-white/10 text-white font-bold uppercase text-[10px] rounded-full hover:bg-white/20 transition-colors">Abort</button>
                    <button onClick={handleRetry} className="flex-1 py-3 bg-white text-black font-bold uppercase text-[10px] rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                        <RefreshCw size={14} /> Retry Uplink
                    </button>
                </div>
            </div>
         </div>
       )}

       <div className="absolute top-0 left-0 w-full p-8 z-20 flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-2">
                <div className="border border-indigo-500/30 bg-black/60 px-5 py-2 text-indigo-400 text-[10px] font-black tracking-[0.3em] backdrop-blur-3xl rounded-r-full">
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
            <button onClick={onToggle} className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105 active:scale-95">
                <PhoneOff size={32} className="text-white" />
            </button>
       </div>
    </div>
  );
};

export default LiveInterface;
