import React, { useEffect, useRef, useState } from 'react';
import { Bot, Mic, MicOff, Monitor, MonitorOff, Activity } from 'lucide-react';
import Visualizer from './Visualizer';
import { getLiveClient, createPcmBlob, decodeAudioData, base64ToUint8Array, getTools, APP_MAPPING, blobToBase64 } from '../services/geminiService';
import { LiveServerMessage } from '@google/genai';
import { SYSTEM_INSTRUCTIONS } from '../constants';
import { JarvisMode } from '../types';

interface LiveInterfaceProps {
  mode: JarvisMode;
  isActive: boolean;
  onToggle: () => void;
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ mode, isActive, onToggle }) => {
  const [status, setStatus] = useState<string>("OFFLINE");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Screen Share Refs
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(document.createElement("video"));
  const screenCanvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const screenIntervalRef = useRef<number | null>(null);

  // Audio Queue
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  
  // Session
  const sessionRef = useRef<Promise<any> | null>(null);

  useEffect(() => {
    // Cleanup on unmount or when toggled off
    if (!isActive) {
      cleanup();
    } else {
      initializeSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const cleanup = () => {
    stopScreenShare(); // Ensure screen share stops

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }
    
    // Stop playing audio
    audioQueueRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    
    setStatus("OFFLINE");
    setIsSpeaking(false);
    analyserRef.current = null;
    sessionRef.current = null;
  };

  const executeOpenApp = (appName: string): string => {
      const url = APP_MAPPING[appName.toLowerCase()];
      if (url) {
          window.open(url, '_blank');
          return `Opened ${appName}`;
      }
      return `Could not find app ${appName}`;
  };

  // --- Screen Sharing Logic ---
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      await videoRef.current.play();

      setIsScreenSharing(true);

      // Handle user stopping via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Start capture loop
      const ctx = screenCanvasRef.current.getContext('2d');
      if (ctx) {
         // 1 FPS Capture
         screenIntervalRef.current = window.setInterval(async () => {
             if (!sessionRef.current) return;
             
             // Draw video frame to canvas
             const width = videoRef.current.videoWidth;
             const height = videoRef.current.videoHeight;
             if (width === 0 || height === 0) return;

             screenCanvasRef.current.width = width;
             screenCanvasRef.current.height = height;
             ctx.drawImage(videoRef.current, 0, 0, width, height);

             // Convert to Blob -> Base64
             screenCanvasRef.current.toBlob(async (blob) => {
                 if (blob) {
                     const base64Data = await blobToBase64(blob);
                     sessionRef.current?.then(session => {
                         session.sendRealtimeInput({
                             media: { data: base64Data, mimeType: 'image/jpeg' }
                         });
                     });
                 }
             }, 'image/jpeg', 0.6); // 0.6 quality to save bandwidth
         }, 1000);
      }

    } catch (e) {
      console.error("Screen share error:", e);
      setIsScreenSharing(false);
    }
  };

  const stopScreenShare = () => {
    if (screenIntervalRef.current) {
        clearInterval(screenIntervalRef.current);
        screenIntervalRef.current = null;
    }
    if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
    }
    videoRef.current.srcObject = null;
    setIsScreenSharing(false);
  };
  // ----------------------------

  const initializeSession = async () => {
    try {
      setStatus("INITIALIZING...");
      setError(null);

      // 1. Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });

      // 2. Setup Analyser for Visuals (Output)
      const analyser = outputContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(outputContextRef.current.destination);
      analyserRef.current = analyser;

      // 3. Get User Media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 4. Connect to Gemini Live
      const client = getLiveClient();
      const tools = getTools(mode);
      
      const sessionPromise = client.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, // Female Voice
          },
          systemInstruction: SYSTEM_INSTRUCTIONS[mode],
          tools: tools.length > 0 ? tools : undefined,
        },
        callbacks: {
          onopen: () => {
            setStatus("ONLINE");
            startAudioStream(stream, sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Tool Calls (Function Calling)
             if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'openApp') {
                        const appName = fc.args['appName'] as string;
                        const result = executeOpenApp(appName);
                        
                        // Send response back
                        sessionPromise.then(session => {
                            session.sendToolResponse({
                                functionResponses: [{
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: result }
                                }]
                            });
                        });
                    }
                }
             }

             // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current) {
              try {
                const audioData = base64ToUint8Array(base64Audio);
                const audioBuffer = await decodeAudioData(
                  audioData,
                  outputContextRef.current,
                  24000,
                  1
                );
                playAudioChunk(audioBuffer);
              } catch (err) {
                console.error("Audio decode error", err);
              }
            }
            
            // Handle Interruption
            if (message.serverContent?.interrupted) {
               audioQueueRef.current.forEach(src => {
                 try { src.stop(); } catch (e) {}
               });
               audioQueueRef.current = [];
               nextStartTimeRef.current = 0;
               setIsSpeaking(false);
            }
          },
          onclose: () => {
            setStatus("DISCONNECTED");
            setIsSpeaking(false);
          },
          onerror: (e) => {
            console.error("Live Client Error:", e);
            setStatus("ERROR");
            setError("Check network.");
            setIsSpeaking(false);
          }
        }
      });
      
      sessionRef.current = sessionPromise;
      await sessionPromise;

    } catch (err) {
      console.error("Initialization Error:", err);
      setStatus("ERROR");
      setError("Init failed.");
      cleanup();
    }
  };

  const startAudioStream = (stream: MediaStream, sessionPromise: Promise<any>) => {
    if (!inputContextRef.current) return;

    const source = inputContextRef.current.createMediaStreamSource(stream);
    const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createPcmBlob(inputData);
      
      sessionPromise.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      }).catch(err => {
         // Silently fail on send error
      });
    };

    source.connect(processor);
    processor.connect(inputContextRef.current.destination);
    
    sourceRef.current = source;
    processorRef.current = processor;
  };

  const playAudioChunk = (buffer: AudioBuffer) => {
    if (!outputContextRef.current || !analyserRef.current) return;

    const ctx = outputContextRef.current;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(analyserRef.current);
    
    const currentTime = ctx.currentTime;
    const startTime = Math.max(currentTime, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;
    
    setIsSpeaking(true);
    audioQueueRef.current.push(source);

    source.onended = () => {
        if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
            setIsSpeaking(false);
        }
        audioQueueRef.current = audioQueueRef.current.filter(s => s !== source);
    };
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-8 relative">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(rgba(0,168,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,168,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
             <Visualizer 
                analyser={analyserRef.current} 
                isActive={status === "ONLINE"}
                isSpeaking={isSpeaking}
             />
        </div>

        <div className="text-center space-y-2">
            <h2 className={`text-2xl font-sans tracking-widest font-bold ${status.includes("ERROR") ? "text-red-500" : "text-jarvis-cyan"}`}>
                {status}
            </h2>
            <p className="text-slate-400 font-mono text-sm uppercase tracking-wider">
               {status === "ONLINE" ? (isScreenSharing ? "WATCHING SCREEN..." : "LISTENING...") : "VOICE MODE"}
            </p>
            {error && <p className="text-red-400 font-mono text-xs max-w-xs mx-auto mt-2">{error}</p>}
        </div>

        <div className="flex gap-4">
            <button
              onClick={toggleScreenShare}
              disabled={status !== "ONLINE"}
              className={`
                px-6 py-3 rounded-full font-bold tracking-wider flex items-center gap-3 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed
                ${isScreenSharing
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-500/30' 
                    : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700'}
              `}
            >
              {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
              {isScreenSharing ? "STOP SCREEN" : "SHARE SCREEN"}
            </button>

            <button
              onClick={onToggle}
              className={`
                px-8 py-3 rounded-full font-bold tracking-wider flex items-center gap-3 transition-all transform hover:scale-105
                ${isActive 
                    ? 'bg-red-500/20 text-red-400 border border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-500/30' 
                    : 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:bg-jarvis-cyan/20'}
              `}
            >
              {isActive ? (
                <>
                  <MicOff size={20} /> DEACTIVATE
                </>
              ) : (
                <>
                  <Mic size={20} /> ACTIVATE
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default LiveInterface;