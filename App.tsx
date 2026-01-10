
import React, { useState, useEffect, useRef } from 'react';
import { Message, CallLog } from './types';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import WelcomeScreen from './components/WelcomeScreen';
import CallScreen from './components/CallScreen';
import { createChatSession } from './services/geminiService';
import { getSessionUser, logoutUser, saveCallLog, updateMessageReaction } from './services/storageService';
import { 
  PROFESSIONAL_INSTRUCTION, 
  PERSONAL_PHASE_FRIEND, 
  PERSONAL_PHASE_DEVELOPING, 
  PERSONAL_PHASE_LOVER 
} from './constants';
import { LogOut, Zap, Mic, Briefcase, Heart, Sparkles } from 'lucide-react';

type Mode = 'professional' | 'personal';

const App: React.FC = () => {
  const [proMessages, setProMessages] = useState<Message[]>([]);
  const [personalMessages, setPersonalMessages] = useState<Message[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [showCallScreen, setShowCallScreen] = useState(false);
  
  const [mode, setMode] = useState<Mode>('personal'); 
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userIdentity, setUserIdentity] = useState(''); 
  const [userName, setUserName] = useState('');

  const currentMessages = mode === 'professional' ? proMessages : personalMessages;

  const proSessionRef = useRef<any>(null);
  const personalSessionRef = useRef<any>(null);
  const currentPersonalInstructionRef = useRef<string>(PERSONAL_PHASE_FRIEND);
  const callStartTimeRef = useRef<number>(0);

  useEffect(() => {
    try {
      const sessionUser = getSessionUser();
      if (sessionUser) {
          setUserIdentity(sessionUser.identity);
          setUserName(sessionUser.fullName);
          setProMessages(sessionUser.history.professional || []);
          setPersonalMessages(sessionUser.history.personal || []);
          setCallLogs(sessionUser.callLogs || []);
          setIsLoggedIn(true);
      }
    } catch (e) {
      console.error("Session Load Error", e);
      logoutUser();
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) startSessions();
  }, [isLoggedIn, personalMessages.length, mode]);

  const startSessions = () => {
    try {
        if (!proSessionRef.current) {
            proSessionRef.current = createChatSession(PROFESSIONAL_INSTRUCTION);
        }
        
        const msgCount = personalMessages.filter(m => !m.isCall).length;
        let newInstruction = PERSONAL_PHASE_FRIEND;
        if (msgCount > 150) newInstruction = PERSONAL_PHASE_LOVER;
        else if (msgCount > 50) newInstruction = PERSONAL_PHASE_DEVELOPING;

        if (newInstruction !== currentPersonalInstructionRef.current || !personalSessionRef.current) {
            currentPersonalInstructionRef.current = newInstruction;
            personalSessionRef.current = createChatSession(newInstruction);
        }
    } catch (e) {
        console.error("Failed to start Gemini sessions:", e);
    }
  };

  const handleSendMessage = async (imageData?: string) => {
    if (!inputValue.trim() && !imageData) return;
    const currentMode = mode;
    
    // Optimistically add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue || "Analyze this image.",
      timestamp: Date.now(),
    };

    if (currentMode === 'professional') setProMessages(prev => [...prev, userMsg]);
    else setPersonalMessages(prev => [...prev, userMsg]);
    
    setInputValue('');
    setIsLoading(true);

    try {
        // Ensure session exists
        let activeSession = currentMode === 'professional' ? proSessionRef.current : personalSessionRef.current;
        
        if (!activeSession) {
            console.warn("Session lost. Attempting recovery...");
            startSessions();
            activeSession = currentMode === 'professional' ? proSessionRef.current : personalSessionRef.current;
            
            if (!activeSession) {
                throw new Error("Unable to initialize Neural Link. Please check API Key configuration.");
            }
        }

        const lastBotMsg = [...currentMessages].reverse().find(m => m.role === 'model' && !m.isCall);
        let contextPrefix = "";
        if (lastBotMsg && lastBotMsg.reaction) {
            contextPrefix = `[User reacted with ${lastBotMsg.reaction}] `;
        }

        // Send message to Gemini
        const response = await activeSession.sendMessage({ message: contextPrefix + userMsg.content });
        let responseText = response.text || "";
        
        // Handle reactions if present in text
        const reactMatch = responseText.match(/\[REACT:\s*([\uD800-\uDBFF][\uDC00-\uDFFF]|\S+)\]/);
        if (reactMatch) {
            const aiEmoji = reactMatch[1];
            responseText = responseText.replace(/\[REACT:.*?\]/, "").trim();
            handleReact(userMsg.id, aiEmoji);
        }

        // Handle empty text (e.g. function calls)
        if (!responseText && response.functionCalls && response.functionCalls.length > 0) {
             responseText = `[System: Executing ${response.functionCalls[0].name}...]`;
        } else if (!responseText) {
             responseText = "[System: Received empty response]";
        }

        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            content: responseText,
            timestamp: Date.now(),
        };

        if (currentMode === 'professional') setProMessages(prev => [...prev, botMsg]);
        else setPersonalMessages(prev => [...prev, botMsg]);

    } catch (error: any) {
      console.error("Gemini Engine Error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `Neural link error: ${error.message || "Connection unstable"}. ⚠️`,
        timestamp: Date.now(),
      };
      if (currentMode === 'professional') setProMessages(prev => [...prev, errorMsg]);
      else setPersonalMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReact = (messageId: string, emoji: string) => {
      const currentMode = mode;
      if (currentMode === 'professional') {
          setProMessages(prev => prev.map(m => m.id === messageId ? { ...m, reaction: emoji } : m));
      } else {
          setPersonalMessages(prev => prev.map(m => m.id === messageId ? { ...m, reaction: emoji } : m));
      }
      updateMessageReaction(userIdentity, currentMode, messageId, emoji);
  };

  const startCall = () => {
    if (mode === 'professional') return;
    setShowCallScreen(true);
    callStartTimeRef.current = Date.now();
  };

  const endCall = () => {
    if (isLiveMode || showCallScreen) {
        const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
        const newLog: CallLog = { id: Date.now().toString(), type: 'outgoing', startTime: callStartTimeRef.current, duration };
        const callMsg: Message = { id: Date.now().toString() + '_call', role: 'system', content: `Neural link ended. Duration: ${duration}s`, timestamp: callStartTimeRef.current, isCall: true, callDuration: duration };
        setPersonalMessages(prev => [...prev, callMsg]);
        saveCallLog(userIdentity, newLog);
        setCallLogs(prev => [newLog, ...prev]);
    }
    setIsLiveMode(false);
    setShowCallScreen(false);
  };

  // Dynamic Background Colors - Updated for Romantic Theme
  const bgGradient = mode === 'professional' 
    ? 'from-[#050f0a] via-[#020503] to-black' 
    : 'from-[#1f0510] via-[#150205] to-black'; // Deep Rose/Black for Personal

  return (
    <div className={`fixed inset-0 w-full bg-gradient-to-b ${bgGradient} transition-colors duration-1000 overflow-hidden font-sans`}>
      {!isLoggedIn ? (
          <WelcomeScreen onStart={(u) => { setUserName(u.fullName); setUserIdentity(u.identity); setProMessages(u.history.professional || []); setPersonalMessages(u.history.personal || []); setCallLogs(u.callLogs || []); setIsLoggedIn(true); }} />
      ) : (
          <>
            {showCallScreen && <CallScreen onHangUp={endCall} onAccept={() => { setIsLiveMode(true); setShowCallScreen(false); }} userName={userName} isCallActive={false} />}
            {isLiveMode ? <LiveInterface isActive={isLiveMode} onToggle={endCall} /> : (
                <>
                    {/* Floating Header */}
                    <header className="absolute top-0 left-0 right-0 h-24 z-40 flex items-center justify-between px-6 md:px-10 pointer-events-none">
                        <div className="pointer-events-auto flex items-center gap-3 glass-panel px-4 py-2 rounded-full shadow-2xl">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${mode === 'professional' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-pink-500/10 text-pink-400'}`}>
                                <Zap size={16} fill="currentColor" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[12px] font-bold text-white tracking-wide">SIYA</span>
                                <span className={`text-[8px] font-medium tracking-wider ${mode === 'professional' ? 'text-emerald-400' : 'text-pink-400'}`}>
                                  {mode === 'professional' ? 'PRO LINK' : 'PERSONAL'}
                                </span>
                            </div>
                        </div>

                        <div className="pointer-events-auto flex bg-black/40 backdrop-blur-md p-1 rounded-full border border-white/5 shadow-2xl">
                            <button onClick={() => setMode('professional')} className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${mode === 'professional' ? 'text-emerald-400 bg-white/10 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                <Briefcase size={12} /> Work
                            </button>
                            <button onClick={() => setMode('personal')} className={`relative z-10 flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${mode === 'personal' ? 'text-pink-400 bg-white/10 shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                <Heart size={12} /> Personal
                            </button>
                        </div>

                        <div className="pointer-events-auto flex items-center gap-3">
                            {mode === 'personal' && (
                                <button onClick={startCall} className="w-10 h-10 rounded-full bg-white/5 text-pink-300 border border-white/5 hover:bg-pink-500/20 hover:text-white transition-all flex items-center justify-center backdrop-blur-md">
                                    <Mic size={18} />
                                </button>
                            )}
                            <button onClick={() => { logoutUser(); setIsLoggedIn(false); }} className="w-10 h-10 rounded-full flex items-center justify-center text-white/30 hover:bg-red-500/10 hover:text-red-400 transition-all backdrop-blur-md">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 min-h-0 relative flex flex-col z-0">
                        <ChatInterface messages={currentMessages} isLoading={isLoading} input={inputValue} setInput={setInputValue} onSend={handleSendMessage} mode={mode} onClearChat={() => {}} onReact={handleReact} />
                    </main>
                </>
            )}
          </>
      )}
    </div>
  );
};

export default App;
