import React, { useEffect, useRef, useState } from 'react';
import { MicOff, Monitor, MonitorOff } from 'lucide-react';
import Visualizer from './Visualizer';
import { getLiveClient, createPcmBlob, decodeAudioData, base64ToUint8Array, openAppFunction, APP_MAPPING, blobToBase64 } from '../services/geminiService';
import { LiveServerMessage, Modality } from '@google/genai';
import { ADAPTIVE_SYSTEM_INSTRUCTION } from '../constants';

interface LiveInterfaceProps {
  isActive: boolean;
  onToggle: () => void;
}

const LiveInterface: React.FC<LiveInterfaceProps> = ({ isActive, onToggle }) => {
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
    if (!isActive) {
      cleanup();
    } else {
      initializeSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const cleanup = () => {
    stopScreenShare();

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

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      const ctx = screenCanvasRef.current.getContext('2d');
      if (ctx) {
         screenIntervalRef.current = window.setInterval(async () => {
             if (!sessionRef.current) return;
             
             const width = videoRef.current.videoWidth;
             const height = videoRef.current.videoHeight;
             if (width === 0 || height === 0) return;

             screenCanvasRef.current.width = width;
             screenCanvasRef.current.height = height;
             ctx.drawImage(videoRef.current, 0, 0, width, height);

             screenCanvasRef.current.toBlob(async (blob) => {
                 if (blob) {
                     const base64Data = await blobToBase64(blob);
                     sessionRef.current?.then(session => {
                         session.sendRealtimeInput({
                             media: { data: base64Data, mimeType: 'image/jpeg' }
                         });
                     });
                 }
             }, 'image/jpeg', 0.6);
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
    if (videoRef.current.srcObject) {
       videoRef.current.srcObject = null;
    }
    setIsScreenSharing(false);
  };

  const initializeSession = async () => {
    try {
      setStatus("INITIALIZING...");
      setError(null);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });

      const analyser = outputContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(outputContextRef.current.destination);
      analyserRef.current = analyser;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const client = getLiveClient();
      const tools = [{ functionDeclarations: [openAppFunction] }];
      
      const sessionPromise = client.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: ADAPTIVE_SYSTEM_INSTRUCTION,
          tools: tools,
        },
        callbacks: {
          onopen: () => {
            setStatus("ONLINE");
            startAudioStream(stream, sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
             if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'openApp') {
                        const appName = fc.args['appName'] as string;
                        const result = executeOpenApp(appName);
                        
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
            setError("Connection failed. Check API Key.");
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
    <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden p-4">
       {/* Ambient Glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-brand-primary/10 rounded-full blur-[60px] md:blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center gap-6 md:gap-10 w-full max-w-sm md:max-w-none">
        <div className="relative">
             <Visualizer 
                analyser={analyserRef.current} 
                isActive={status === "ONLINE"}
                isSpeaking={isSpeaking}
             />
             {status === "ONLINE" && (
                 <div className="absolute top-[-20px] left-1/2 -translate-x-1/2 text-brand-secondary font-bold tracking-[0.2em] text-[10px] md:text-xs animate-pulse whitespace-nowrap">
                     LIVE CONNECTION
                 </div>
             )}
        </div>

        <div className="text-center space-y-2 md:space-y-3">
            <h2 className={`text-2xl md:text-4xl font-sans font-light tracking-wide text-white drop-shadow-lg`}>
                {status === "ONLINE" ? (isSpeaking ? "Siya is speaking..." : "Listening...") : status}
            </h2>
            {error && <p className="text-red-400 font-mono text-xs md:text-sm">{error}</p>}
        </div>

        <div className="flex gap-4 md:gap-6 items-center flex-wrap justify-center">
            <button
              onClick={toggleScreenShare}
              disabled={status !== "ONLINE"}
              className={`
                p-3 md:p-4 rounded-full transition-all transform hover:scale-110
                ${isScreenSharing
                    ? 'bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.5)]' 
                    : 'bg-white/10 text-white hover:bg-white/20'}
              `}
              title="Share Screen"
            >
              {isScreenSharing ? <MonitorOff size={20} className="md:w-6 md:h-6" /> : <Monitor size={20} className="md:w-6 md:h-6" />}
            </button>

            <button
              onClick={onToggle}
              className={`
                px-6 py-3 md:px-8 md:py-4 rounded-full font-bold tracking-widest flex items-center gap-2 md:gap-3 transition-all transform hover:scale-105 shadow-2xl text-sm md:text-base
                bg-red-500/80 hover:bg-red-500 text-white border border-red-400/50
              `}
            >
              <MicOff size={18} className="md:w-5 md:h-5" /> END CALL
            </button>
        </div>
      </div>
    </div>
  );
};

export default LiveInterface;