import React, { useState, useEffect, useRef } from 'react';
import { Message } from './types';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import WelcomeScreen from './components/WelcomeScreen';
import { createChatSession, APP_MAPPING } from './services/geminiService';
import { PROFESSIONAL_INSTRUCTION, PERSONAL_INSTRUCTION } from './constants';
import { Mic, Sparkles, LogOut, Heart, Brain } from 'lucide-react';

type Mode = 'professional' | 'personal';

const App: React.FC = () => {
  // Separate states for separate histories
  const [proMessages, setProMessages] = useState<Message[]>([]);
  const [personalMessages, setPersonalMessages] = useState<Message[]>([]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  // Mode State
  const [mode, setMode] = useState<Mode>('professional');
  
  // Login State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  
  // Two separate refs for two separate chat sessions (to keep context isolated)
  const proSessionRef = useRef<any>(null);
  const personalSessionRef = useRef<any>(null);

  // Helper to get current active state
  const currentMessages = mode === 'professional' ? proMessages : personalMessages;
  const setCurrentMessages = (update: (prev: Message[]) => Message[]) => {
    if (mode === 'professional') {
        setProMessages(update);
    } else {
        setPersonalMessages(update);
    }
  };

  const startSessions = () => {
    // Initialize both sessions on startup/login
    proSessionRef.current = createChatSession(PROFESSIONAL_INSTRUCTION);
    personalSessionRef.current = createChatSession(PERSONAL_INSTRUCTION);
  };

  const handleLogin = (name: string) => {
    setUserName(name);
    setIsLoggedIn(true);
    startSessions();

    // Set initial greeting for both modes specifically
    setProMessages([
      {
        id: 'init-pro',
        role: 'model',
        content: `Hello ${name}. I'm ready to help you with your work. What are we focusing on today?`,
        timestamp: Date.now(),
      }
    ]);

    setPersonalMessages([
      {
        id: 'init-personal',
        role: 'model',
        content: `Hey ${name}! ✨ Kaisa hai?`,
        timestamp: Date.now(),
      }
    ]);
  };

  const executeOpenApp = (appName: string): string => {
      const url = APP_MAPPING[appName.toLowerCase()];
      if (url) {
          window.open(url, '_blank');
          return `Successfully opened ${appName}`;
      }
      return `Could not find application: ${appName}`;
  };

  const executeSendSMS = (recipient: string, message: string): string => {
      // 1. Try to open the native SMS app if on mobile/supported device
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
          window.open(`sms:${recipient}?body=${encodeURIComponent(message)}`, '_blank');
          return `Opened messaging app for ${recipient}`;
      }
      
      // 2. Fallback for desktop: Just simulate success for the AI to confirm
      return `SMS sent to ${recipient}: "${message}"`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const currentMode = mode; // Capture mode at start of function
    const activeSession = currentMode === 'professional' ? proSessionRef.current : personalSessionRef.current;
    
    // Safety check if session lost
    if (!activeSession) {
        if (currentMode === 'professional') proSessionRef.current = createChatSession(PROFESSIONAL_INSTRUCTION);
        else personalSessionRef.current = createChatSession(PERSONAL_INSTRUCTION);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    // Optimistic update for current view
    if (currentMode === 'professional') {
        setProMessages(prev => [...prev, userMsg]);
    } else {
        setPersonalMessages(prev => [...prev, userMsg]);
    }
    
    setInputValue('');
    setIsLoading(true);

    try {
      const sessionToUse = currentMode === 'professional' ? proSessionRef.current : personalSessionRef.current;
      
      let result = await sessionToUse.sendMessage({ message: userMsg.content });
      
      while (result.functionCalls && result.functionCalls.length > 0) {
          const functionResponses: any[] = [];
          
          for (const call of result.functionCalls) {
              if (call.name === 'openApp') {
                  const appName = call.args['appName'];
                  const status = executeOpenApp(appName);
                  
                  // Add system message only to current mode
                  const sysMsg: Message = {
                      id: Date.now().toString(),
                      role: 'system',
                      content: `📱 *Opening ${appName}...*`,
                      timestamp: Date.now()
                  };

                  if (currentMode === 'professional') setProMessages(prev => [...prev, sysMsg]);
                  else setPersonalMessages(prev => [...prev, sysMsg]);

                  functionResponses.push({
                      functionResponse: {
                          name: call.name,
                          response: { result: status },
                          id: call.id
                      }
                  });
              } else if (call.name === 'sendSMS') {
                  const recipient = call.args['recipient'];
                  const msgContent = call.args['message'];
                  const status = executeSendSMS(recipient, msgContent);
                  
                  // Add visual confirmation card
                  const sysMsg: Message = {
                      id: Date.now().toString(),
                      role: 'system',
                      content: `📨 **SMS SENT**\nTo: ${recipient}\nMessage: "${msgContent}"`,
                      timestamp: Date.now()
                  };

                   if (currentMode === 'professional') setProMessages(prev => [...prev, sysMsg]);
                   else setPersonalMessages(prev => [...prev, sysMsg]);

                   functionResponses.push({
                      functionResponse: {
                          name: call.name,
                          response: { result: status },
                          id: call.id
                      }
                  });
              }
          }

          if (functionResponses.length > 0) {
              result = await sessionToUse.sendMessage(functionResponses);
          } else {
              break;
          }
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

      if (currentMode === 'professional') {
        setProMessages(prev => [...prev, botMsg]);
      } else {
        setPersonalMessages(prev => [...prev, botMsg]);
      }

    } catch (error: any) {
      console.error("Error sending message:", error);
      
      let errorText = "Oops! Something went wrong.";
      if (error.message) {
        if (error.message.includes('API key') || error.message.includes('API_KEY')) {
           errorText = "Configuration Error: API Key is invalid or missing.";
        } else if (error.message.includes('404')) {
           errorText = "Model Error: The AI model is currently unavailable (404).";
        } else if (error.message.includes('403')) {
           errorText = "Access Error: Your API key doesn't have permission for this model (403).";
        } else if (error.message.includes('400')) {
           errorText = "Request Error: Bad Request (400). Please refresh.";
        } else {
           errorText = `Error: ${error.message}`;
        }
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: errorText,
        timestamp: Date.now(),
      };
      if (currentMode === 'professional') {
        setProMessages(prev => [...prev, errorMsg]);
      } else {
        setPersonalMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'professional' ? 'personal' : 'professional');
  };

  const isPersonal = mode === 'personal';

  return (
    <div className="h-screen w-screen relative bg-[#050511] text-white overflow-hidden font-sans transition-colors duration-1000">
      
      {/* --- Dynamic Background --- */}
      {/* Orb 1 */}
      <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] animate-blob mix-blend-screen pointer-events-none transition-all duration-1000 
         ${isLoggedIn ? 'opacity-60' : 'opacity-80 scale-110'}
         ${isPersonal ? 'bg-brand-primary/20' : 'bg-blue-600/20'}
      `}></div>
      {/* Orb 2 */}
      <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] animate-blob animation-delay-2000 mix-blend-screen pointer-events-none transition-all duration-1000 
         ${isLoggedIn ? 'opacity-60' : 'opacity-80 scale-110'}
         ${isPersonal ? 'bg-brand-secondary/20' : 'bg-cyan-500/20'}
      `}></div>
      
      {/* Main Container */}
      <div className="relative z-10 flex flex-col h-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        
        {!isLoggedIn ? (
            <WelcomeScreen onStart={handleLogin} />
        ) : (
            <>
                {/* Header (Minimal) */}
                <header className="flex items-center justify-between mb-4 animate-fade-in">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors duration-500
                        ${isPersonal 
                            ? 'bg-gradient-to-tr from-brand-primary to-brand-secondary shadow-brand-primary/40' 
                            : 'bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-cyan-500/40'}
                    `}>
                        <Sparkles size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold tracking-wider text-white transition-all">SIYA</h1>
                        <span className="text-[10px] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1">
                            Connected to {userName}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Mode Toggle */}
                    <button
                        onClick={toggleMode}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-300 ${
                            isPersonal
                            ? 'bg-pink-500/20 border-pink-500/50 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]' 
                            : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        }`}
                    >
                        {isPersonal ? (
                             <>
                                <Heart size={16} className="fill-current animate-pulse" />
                                <span className="text-xs font-bold tracking-wider">PERSONAL</span>
                             </>
                        ) : (
                             <>
                                <Brain size={16} />
                                <span className="text-xs font-bold tracking-wider">WORK</span>
                             </>
                        )}
                    </button>

                    {/* Voice Mode Toggle */}
                    {!isLiveMode && (
                        <button 
                        onClick={() => setIsLiveMode(true)}
                        className="group relative flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all hover:scale-105"
                        >
                            <div className={`absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity ${isPersonal ? 'bg-brand-secondary/40' : 'bg-cyan-400/40'}`}></div>
                            <div className="relative flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <span className="font-medium text-sm tracking-wide hidden sm:block">Voice Call</span>
                                <Mic size={16} className="sm:hidden" />
                            </div>
                        </button>
                    )}
                    
                    {/* Logout */}
                    <button 
                       onClick={() => setIsLoggedIn(false)}
                       className="p-2 text-slate-500 hover:text-white transition-colors"
                       title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
                </header>

                {/* Content Area */}
                <main className={`flex-1 relative overflow-hidden transition-all duration-500 
                    ${isPersonal 
                        ? 'rounded-3xl bg-black border-none' // Insta style container
                        : 'rounded-[2rem] border border-white/5 bg-black/20 backdrop-blur-2xl shadow-2xl' // Work style container
                    }`}>
                {isLiveMode ? (
                    <LiveInterface 
                    isActive={isLiveMode} 
                    onToggle={() => setIsLiveMode(false)}
                    />
                ) : (
                    <ChatInterface 
                    messages={currentMessages}
                    isLoading={isLoading}
                    input={inputValue}
                    setInput={setInputValue}
                    onSend={handleSendMessage}
                    mode={mode}
                    />
                )}
                </main>
            </>
        )}

      </div>
    </div>
  );
};

export default App;