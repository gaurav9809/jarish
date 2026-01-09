import React, { useEffect, useRef, useState } from 'react';
import { MicOff, PhoneOff, Video, Mic, Monitor } from 'lucide-react';
import Visualizer from './Visualizer';
import { getLiveClient, createPcmBlob, decodeAudioData, base64ToUint8Array, openAppFunction, APP_MAPPING, blobToBase64 } from '../services/geminiService';
import { LiveServerMessage, Modality } from '@google/genai';
import { ADAPTIVE_SYSTEM_INSTRUCTION } from '../constants';

interface LiveInterfaceProps {
  isActive: boolean;
  onToggle: () => void;
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ isActive, onToggle }) => {
  const [status, setStatus] = useState<string>("CONNECTING...");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Audio Queue
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const sessionRef = useRef<Promise<any> | null>(null);

  // Self View Video Ref
  const selfVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isActive) {
      initializeSession();
    }
    return () => cleanup();
  }, [isActive]);

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) inputContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    
    audioQueueRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    setStatus("ENDED");
  };

  const executeOpenApp = (appName: string): string => {
      const url = APP_MAPPING[appName.toLowerCase()];
      if (url) {
          window.open(url, '_blank');
          return `Opened ${appName}`;
      }
      return `Could not find app ${appName}`;
  };

  const initializeSession = async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });

      const analyser = outputContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(outputContextRef.current.destination);
      analyserRef.current = analyser;

      // Get User Media (Camera + Mic) for "Video Call" feel
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;

      // Show self view
      if (selfVideoRef.current) {
          selfVideoRef.current.srcObject = stream;
      }

      const client = getLiveClient();
      const tools = [{ functionDeclarations: [openAppFunction] }];
      
      const sessionPromise = client.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Kore is soft/feminine
          },
          systemInstruction: ADAPTIVE_SYSTEM_INSTRUCTION,
          tools: tools,
        },
        callbacks: {
          onopen: () => {
            setStatus("CONNECTED");
            startAudioStream(stream, sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Tools
             if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'openApp') {
                        const appName = fc.args['appName'] as string;
                        const result = executeOpenApp(appName);
                        sessionPromise.then(session => {
                            session.sendToolResponse({
                                functionResponses: [{
                                    id: fc.id, name: fc.name, response: { result: result }
                                }]
                            });
                        });
                    }
                }
             }

            // Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current) {
                const audioData = base64ToUint8Array(base64Audio);
                const audioBuffer = await decodeAudioData(audioData, outputContextRef.current, 24000, 1);
                playAudioChunk(audioBuffer);
            }
          },
          onclose: () => setStatus("DISCONNECTED"),
          onerror: (e) => setStatus("ERROR")
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error(err);
      setStatus("ERROR");
    }
  };

  const startAudioStream = (stream: MediaStream, sessionPromise: Promise<any>) => {
    if (!inputContextRef.current) return;
    const source = inputContextRef.current.createMediaStreamSource(stream);
    const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (isMuted) return; // Mute Logic
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createPcmBlob(inputData);
      sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob })).catch(()=>{});
    };

    source.connect(processor);
    processor.connect(inputContextRef.current.destination);
    processorRef.current = processor;
  };

  const playAudioChunk = (buffer: AudioBuffer) => {
    if (!outputContextRef.current || !analyserRef.current) return;
    const ctx = outputContextRef.current;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserRef.current);
    
    const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
    
    setIsSpeaking(true);
    source.onended = () => {
        if (ctx.currentTime >= nextStartTimeRef.current - 0.1) setIsSpeaking(false);
    };
  };

  return (
    <div className="absolute inset-0 bg-black z-50 flex flex-col">
       
       {/* 1. Main Video Area (The AI Girl) */}
       <div className="flex-1 relative overflow-hidden">
            <Visualizer 
                analyser={analyserRef.current} 
                isActive={status === "CONNECTED"}
                isSpeaking={isSpeaking}
            />
            
            {/* Top Bar Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start z-10">
                <div className="flex flex-col">
                    <h2 className="text-white text-xl font-bold tracking-wide drop-shadow-md">Siya ❤️</h2>
                    <span className="text-white/70 text-xs tracking-wider uppercase animate-pulse">{status}</span>
                </div>
            </div>

            {/* Self View (Draggable-ish look) */}
            <div className="absolute top-4 right-4 w-28 h-36 md:w-32 md:h-48 bg-black/50 rounded-xl overflow-hidden border border-white/20 shadow-2xl z-20">
                <video 
                    ref={selfVideoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                />
            </div>
       </div>

       {/* 2. Bottom Control Bar (Glassmorphism) */}
       <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-4 flex items-center justify-evenly shadow-2xl animate-fade-in z-30">
            
            {/* Mute Button */}
            <button 
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-full transition-all active:scale-95 ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            {/* End Call Button */}
            <button 
                onClick={onToggle}
                className="p-5 bg-red-500 rounded-full text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:bg-red-600 transition-all active:scale-95 transform hover:scale-110"
            >
                <PhoneOff size={32} fill="currentColor" />
            </button>

            {/* Camera Toggle (Fake/Placeholder for visual) */}
            <button className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95">
                <Video size={24} />
            </button>
       </div>
    </div>
  );
};

export default LiveInterface;