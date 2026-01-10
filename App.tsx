
import React, { useState, useEffect, useRef } from 'react';
import { Message, CallLog } from './types';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import WelcomeScreen from './components/WelcomeScreen';
import CallScreen from './components/CallScreen';
import { createLocalChatSession } from './services/localAiService';
import { getSessionUser, logoutUser, saveChatHistory, saveCallLog, updateMessageReaction } from './services/storageService';
import { 
  PROFESSIONAL_INSTRUCTION, 
  PERSONAL_PHASE_FRIEND, 
  PERSONAL_PHASE_DEVELOPING, 
  PERSONAL_PHASE_LOVER 
} from './constants';
import { LogOut, Zap, Mic, Briefcase, Heart } from 'lucide-react';

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
    const sessionUser = getSessionUser();
    if (sessionUser) {
        setUserIdentity(sessionUser.identity);
        setUserName(sessionUser.fullName);
        setProMessages(sessionUser.history.professional || []);
        setPersonalMessages(sessionUser.history.personal || []);
        setCallLogs(sessionUser.callLogs || []);
        setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) startSessions();
  }, [isLoggedIn, personalMessages.length, mode]);

  const startSessions = () => {
    if (!proSessionRef.current) proSessionRef.current = createLocalChatSession(PROFESSIONAL_INSTRUCTION);
    
    const msgCount = personalMessages.filter(m => !m.isCall).length;
    let newInstruction = PERSONAL_PHASE_FRIEND;
    if (msgCount > 150) newInstruction = PERSONAL_PHASE_LOVER;
    else if (msgCount > 50) newInstruction = PERSONAL_PHASE_DEVELOPING;

    if (newInstruction !== currentPersonalInstructionRef.current || !personalSessionRef.current) {
        currentPersonalInstructionRef.current = newInstruction;
        personalSessionRef.current = createLocalChatSession(newInstruction);
    }
  };

  const handleSendMessage = async (imageData?: string) => {
    if (!inputValue.trim() && !imageData) return;
    const currentMode = mode;
    const activeSession = currentMode === 'professional' ? proSessionRef.current : personalSessionRef.current;
    if (!activeSession) return;

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
      const lastBotMsg = [...currentMessages].reverse().find(m => m.role === 'model' && !m.isCall);
      let contextPrefix = "";
      if (lastBotMsg && lastBotMsg.reaction) {
          contextPrefix = `[User reacted with ${lastBotMsg.reaction}] `;
      }

      const result = await activeSession.sendMessage({ message: contextPrefix + userMsg.content });
      let responseText = result.text || "";
      
      const reactMatch = responseText.match(/\[REACT:\s*([\uD800-\uDBFF][\uDC00-\uDFFF]|\S+)\]/);
      if (reactMatch) {
          const aiEmoji = reactMatch[1];
          responseText = responseText.replace(/\[REACT:.*?\]/, "").trim();
          handleReact(userMsg.id, aiEmoji);
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
      console.error("Neural Error:", error);
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

  return (
    <div className="flex flex-col h-screen w-full bg-[#030303] overflow-hidden relative font-sans">
      {!isLoggedIn ? (
          <WelcomeScreen onStart={(u) => { setUserName(u.fullName); setUserIdentity(u.identity); setProMessages(u.history.professional || []); setPersonalMessages(u.history.personal || []); setCallLogs(u.callLogs || []); setIsLoggedIn(true); }} />
      ) : (
          <>
            {showCallScreen && <CallScreen onHangUp={endCall} onAccept={() => { setIsLiveMode(true); setShowCallScreen(false); }} userName={userName} isCallActive={false} />}
            {isLiveMode ? <LiveInterface isActive={isLiveMode} onToggle={endCall} /> : (
                <>
                    <header className={`flex-none h-20 border-b flex items-center justify-between px-4 md:px-8 z-40 backdrop-blur-3xl transition-all duration-700 ${mode === 'professional' ? 'bg-black/80 border-white/5' : 'bg-indigo-950/30 border-white/10'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${mode === 'professional' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-600/20 text-indigo-400'}`}>
                                <Zap size={20} fill="currentColor" />
                            </div>
                            <div className="hidden sm:flex flex-col">
                                <span className="text-[14px] font-black tracking-tight text-white uppercase leading-none">SIYA NEURAL</span>
                                <span className={`text-[8px] font-bold uppercase tracking-[0.2em] mt-1 ${mode === 'professional' ? 'text-emerald-500/60' : 'text-indigo-400/60'}`}>HF Cloud v1.0</span>
                            </div>
                        </div>

                        <div className="flex bg-white/[0.04] p-1 rounded-2xl border border-white/5">
                            <button onClick={() => setMode('professional')} className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'professional' ? 'bg-white/10 text-emerald-400 shadow-xl' : 'text-zinc-500'}`}>
                                <Briefcase size={12} /> Work
                            </button>
                            <button onClick={() => setMode('personal')} className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'personal' ? 'bg-white/10 text-indigo-400 shadow-xl' : 'text-zinc-500'}`}>
                                <Heart size={12} /> Personal
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            {mode === 'personal' && (
                                <button onClick={startCall} className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                                    <Mic size={20} className="animate-pulse" />
                                </button>
                            )}
                            <button onClick={() => { logoutUser(); setIsLoggedIn(false); }} className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 transition-all">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </header>
                    <main className="flex-1 min-h-0 relative flex flex-col">
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
