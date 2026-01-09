import React, { useState, useEffect, useRef } from 'react';
import { Message } from './types';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import WelcomeScreen from './components/WelcomeScreen';
import { createChatSession, APP_MAPPING } from './services/geminiService';
import { getSessionUser, logoutUser, saveChatHistory } from './services/storageService';
import { PROFESSIONAL_INSTRUCTION, PERSONAL_INSTRUCTION } from './constants';
import { Mic, Sparkles, LogOut, Heart, Brain, AlertTriangle, Video } from 'lucide-react';

type Mode = 'professional' | 'personal';

const App: React.FC = () => {
  const [proMessages, setProMessages] = useState<Message[]>([]);
  const [personalMessages, setPersonalMessages] = useState<Message[]>([]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  const [mode, setMode] = useState<Mode>('professional');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userIdentity, setUserIdentity] = useState(''); 
  const [userName, setUserName] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);

  const proSessionRef = useRef<any>(null);
  const personalSessionRef = useRef<any>(null);

  useEffect(() => {
    // Check for existing session on mount
    const sessionUser = getSessionUser();
    if (sessionUser) {
        setUserIdentity(sessionUser.identity);
        setUserName(sessionUser.fullName);
        setProMessages(sessionUser.history.professional || []);
        setPersonalMessages(sessionUser.history.personal || []);
        setIsLoggedIn(true);
        startSessions(); 
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && userIdentity) saveChatHistory(userIdentity, 'professional', proMessages);
  }, [proMessages, isLoggedIn, userIdentity]);

  useEffect(() => {
    if (isLoggedIn && userIdentity) saveChatHistory(userIdentity, 'personal', personalMessages);
  }, [personalMessages, isLoggedIn, userIdentity]);


  const currentMessages = mode === 'professional' ? proMessages : personalMessages;

  const startSessions = () => {
    try {
        proSessionRef.current = createChatSession(PROFESSIONAL_INSTRUCTION);
        personalSessionRef.current = createChatSession(PERSONAL_INSTRUCTION);
        setConfigError(null);
    } catch (e: any) {
        if (e.message === "API_KEY_MISSING") setConfigError("API Key is missing.");
    }
  };

  const handleLoginSuccess = (user: any) => {
    setUserName(user.fullName);
    setUserIdentity(user.identity);
    if (user.history) {
        setProMessages(user.history.professional || []);
        setPersonalMessages(user.history.personal || []);
    }
    
    // Auto-message logic for new users or empty chats
    if (!user.history || user.history.professional.length === 0) {
        setProMessages([{ id: 'init-pro', role: 'model', content: `Hello ${user.fullName}. Ready to work?`, timestamp: Date.now() }]);
    }
    if (!user.history || user.history.personal.length === 0) {
        // Possessive first message
        setPersonalMessages([{ id: 'init-personal', role: 'model', content: `Itni der kaha the tum? 😡`, timestamp: Date.now() }]);
    }
    
    setIsLoggedIn(true);
    startSessions();
  };

  const handleLogout = () => {
      logoutUser();
      setIsLoggedIn(false);
      setProMessages([]);
      setPersonalMessages([]);
      setUserIdentity('');
      setUserName('');
  };

  const executeOpenApp = (appName: string): string => {
      const url = APP_MAPPING[appName.toLowerCase()];
      if (url) {
          window.open(url, '_blank');
          return `Opened ${appName}`;
      }
      return `App not found: ${appName}`;
  };

  const executeSendSMS = (recipient: string, message: string): string => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
          window.open(`sms:${recipient}?body=${encodeURIComponent(message)}`, '_blank');
          return `Messaging app opened`;
      }
      return `SMS sent to ${recipient}`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const currentMode = mode;
    const activeSession = currentMode === 'professional' ? proSessionRef.current : personalSessionRef.current;
    
    if (!activeSession) {
        try {
            if (currentMode === 'professional') proSessionRef.current = createChatSession(PROFESSIONAL_INSTRUCTION);
            else personalSessionRef.current = createChatSession(PERSONAL_INSTRUCTION);
        } catch (e: any) { return; }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    if (currentMode === 'professional') setProMessages(prev => [...prev, userMsg]);
    else setPersonalMessages(prev => [...prev, userMsg]);
    
    setInputValue('');
    setIsLoading(true);

    try {
      const sessionToUse = currentMode === 'professional' ? proSessionRef.current : personalSessionRef.current;
      let result = await sessionToUse.sendMessage({ message: userMsg.content });
      
      while (result.functionCalls && result.functionCalls.length > 0) {
          const functionResponses: any[] = [];
          for (const call of result.functionCalls) {
              if (call.name === 'openApp') {
                  const status = executeOpenApp(call.args['appName']);
                  const sysMsg: Message = { id: Date.now().toString(), role: 'system', content: `📱 Opening ${call.args['appName']}`, timestamp: Date.now() };
                  if (currentMode === 'professional') setProMessages(prev => [...prev, sysMsg]);
                  else setPersonalMessages(prev => [...prev, sysMsg]);

                  functionResponses.push({ functionResponse: { name: call.name, response: { result: status }, id: call.id } });
              } else if (call.name === 'sendSMS') {
                  const status = executeSendSMS(call.args['recipient'], call.args['message']);
                  const sysMsg: Message = { id: Date.now().toString(), role: 'system', content: `📨 SMS Sent`, timestamp: Date.now() };
                  if (currentMode === 'professional') setProMessages(prev => [...prev, sysMsg]);
                  else setPersonalMessages(prev => [...prev, sysMsg]);

                  functionResponses.push({ functionResponse: { name: call.name, response: { result: status }, id: call.id } });
              }
          }
          if (functionResponses.length > 0) result = await sessionToUse.sendMessage(functionResponses);
          else break;
      }

      const responseText = result.text || "";
      let sources: string[] = [];
      const candidates = result.candidates;
      if (candidates && candidates[0]?.groundingMetadata?.groundingChunks) {
         candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) sources.push(chunk.web.uri);
         });
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now(),
        sources: sources.length > 0 ? Array.from(new Set(sources)) : undefined
      };

      if (currentMode === 'professional') setProMessages(prev => [...prev, botMsg]);
      else setPersonalMessages(prev => [...prev, botMsg]);

    } catch (error: any) {
      // Error handling
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => setMode(prev => prev === 'professional' ? 'personal' : 'professional');
  const isPersonal = mode === 'personal';

  return (
    // Use dvh (Dynamic Viewport Height) for mobile browser address bar compatibility
    <div className="h-[100dvh] w-full relative bg-[#050511] text-white font-sans flex flex-col overflow-hidden">
      
      {/* Dynamic Background */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isPersonal ? 'bg-[#120a11]' : 'bg-[#050511]'}`}>
          <div className={`absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full blur-[100px] mix-blend-screen opacity-20 ${isPersonal ? 'bg-pink-700' : 'bg-blue-900'}`}></div>
          <div className={`absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full blur-[100px] mix-blend-screen opacity-20 ${isPersonal ? 'bg-purple-700' : 'bg-cyan-900'}`}></div>
      </div>
      
      {/* Main Content Area */}
      {/* We remove md:p-6 from the container and instead center it responsibly on desktop */}
      <div className="relative z-10 flex flex-col w-full h-full max-w-5xl mx-auto transition-all duration-500 md:h-[95dvh] md:my-auto md:rounded-2xl md:overflow-hidden md:border md:border-white/5 md:shadow-2xl">
        
        {!isLoggedIn ? (
            <WelcomeScreen onStart={handleLoginSuccess} />
        ) : (
            <>
                {isLiveMode ? (
                    <LiveInterface isActive={isLiveMode} onToggle={() => setIsLiveMode(false)} />
                ) : (
                    <>
                        {/* Header: Flex-none ensures it never shrinks or disappears */}
                        <header className="flex-none flex items-center justify-between p-4 pb-2 z-20 backdrop-blur-sm bg-black/10">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors duration-500 ${isPersonal ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-gradient-to-br from-blue-600 to-cyan-500'}`}>
                                    <Sparkles size={20} className="text-white fill-white/20" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h1 className="text-lg font-bold tracking-tight leading-none">SIYA</h1>
                                    <span className="text-[10px] text-white/50 tracking-wider uppercase truncate max-w-[100px]">{userName}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={toggleMode} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${isPersonal ? 'bg-pink-500/20 text-pink-300 ring-1 ring-pink-500/50' : 'bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30'}`}>
                                    {isPersonal ? <><Heart size={12} className="fill-current animate-pulse" /> GF</> : <><Brain size={12} /> WORK</>}
                                </button>
                                
                                {/* Video Call Button - Highlighted in Personal Mode */}
                                <button 
                                    onClick={() => setIsLiveMode(true)} 
                                    className={`p-2 rounded-full transition-all active:scale-95 ${isPersonal ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 animate-pulse' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                     {isPersonal ? <Video size={18} fill="currentColor" /> : <Mic size={18} />}
                                </button>
                                
                                <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-white bg-transparent hover:bg-white/5 rounded-full transition-colors">
                                    <LogOut size={18} />
                                </button>
                            </div>
                        </header>

                        {/* Error Banner */}
                        {configError && (
                            <div className="flex-none mx-4 mb-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-xs text-red-200 flex items-center gap-2">
                                <AlertTriangle size={14} /> {configError}
                            </div>
                        )}

                        {/* Main Chat Area - flex-1 min-h-0 ensures scrolling works inside flex container */}
                        <main className="flex-1 min-h-0 relative flex flex-col">
                            <ChatInterface 
                                messages={currentMessages}
                                isLoading={isLoading}
                                input={inputValue}
                                setInput={setInputValue}
                                onSend={handleSendMessage}
                                mode={mode}
                            />
                        </main>
                    </>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default App;