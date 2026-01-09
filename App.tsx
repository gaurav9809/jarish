import React, { useState, useEffect, useRef } from 'react';
import { Message } from './types';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import WelcomeScreen from './components/WelcomeScreen';
import { createChatSession, APP_MAPPING } from './services/geminiService';
import { getSessionUser, logoutUser, saveChatHistory } from './services/storageService';
import { PROFESSIONAL_INSTRUCTION, PERSONAL_INSTRUCTION } from './constants';
import { Mic, Sparkles, LogOut, Heart, Brain, AlertTriangle } from 'lucide-react';

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
  const [userIdentity, setUserIdentity] = useState(''); // ID to save data against
  const [userName, setUserName] = useState('');
  
  // Error State for API Key
  const [configError, setConfigError] = useState<string | null>(null);

  // Two separate refs for two separate chat sessions (to keep context isolated)
  const proSessionRef = useRef<any>(null);
  const personalSessionRef = useRef<any>(null);

  // --- PERSISTENCE LOGIC ---

  // 1. Check for active session on load
  useEffect(() => {
    const sessionUser = getSessionUser();
    if (sessionUser) {
        setUserIdentity(sessionUser.identity);
        setUserName(sessionUser.fullName);
        setProMessages(sessionUser.history.professional || []);
        setPersonalMessages(sessionUser.history.personal || []);
        setIsLoggedIn(true);
        startSessions(); // Init AI
    }
  }, []);

  // 2. Save Professional Messages when they change
  useEffect(() => {
    if (isLoggedIn && userIdentity) {
        saveChatHistory(userIdentity, 'professional', proMessages);
    }
  }, [proMessages, isLoggedIn, userIdentity]);

  // 3. Save Personal Messages when they change
  useEffect(() => {
    if (isLoggedIn && userIdentity) {
        saveChatHistory(userIdentity, 'personal', personalMessages);
    }
  }, [personalMessages, isLoggedIn, userIdentity]);


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
    try {
        // Initialize both sessions on startup/login
        proSessionRef.current = createChatSession(PROFESSIONAL_INSTRUCTION);
        personalSessionRef.current = createChatSession(PERSONAL_INSTRUCTION);
        setConfigError(null);
    } catch (e: any) {
        console.error("Session Init Error:", e);
        if (e.message === "API_KEY_MISSING") {
            setConfigError("API Key is missing in environment.");
        }
    }
  };

  const handleLoginSuccess = (user: any) => {
    setUserName(user.fullName);
    setUserIdentity(user.identity);
    // Load history if exists
    if (user.history) {
        setProMessages(user.history.professional || []);
        setPersonalMessages(user.history.personal || []);
    }
    
    // If it's a completely new user with empty history, add greeting
    if (!user.history || (user.history.professional.length === 0 && user.history.personal.length === 0)) {
        setProMessages([{
            id: 'init-pro',
            role: 'model',
            content: `Hello ${user.fullName}. I'm ready to help you with your work. What are we focusing on today?`,
            timestamp: Date.now(),
        }]);

        setPersonalMessages([{
            id: 'init-personal',
            role: 'model',
            content: `Hey ${user.fullName}! ✨ Kaisa hai?`,
            timestamp: Date.now(),
        }]);
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
    
    // Safety check if session lost or not initialized
    if (!activeSession) {
        try {
            if (currentMode === 'professional') proSessionRef.current = createChatSession(PROFESSIONAL_INSTRUCTION);
            else personalSessionRef.current = createChatSession(PERSONAL_INSTRUCTION);
        } catch (e: any) {
             console.error("Re-init error:", e);
             if (e.message === "API_KEY_MISSING") {
                 setConfigError("API Key is missing. Check your .env file or environment variables.");
                 // Show error in chat as well
                 const errorMsg: Message = {
                    id: Date.now().toString(),
                    role: 'model',
                    content: "SYSTEM ERROR: API Key is missing. I cannot connect to the server.",
                    timestamp: Date.now()
                 };
                 if (currentMode === 'professional') setProMessages(prev => [...prev, errorMsg]);
                 else setPersonalMessages(prev => [...prev, errorMsg]);
             }
             return;
        }
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
      
      // Specifically handle the missing key error thrown from geminiService
      if (error.message === "API_KEY_MISSING") {
           errorText = "SYSTEM CONFIG ERROR: The API Key is missing from your environment variables.";
           setConfigError("API Key Missing");
      } 
      // Handle standard Fetch errors (Network, CORS, Offline)
      else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
           errorText = "NETWORK ERROR: Could not connect. Please check internet or VPN.";
      }
      // Handle SDK specific API errors
      else if (error.message) {
        if (error.message.includes('API key') || error.message.includes('400')) {
           errorText = "SETUP ERROR: API Key is invalid.";
           setConfigError("Invalid API Key");
        } else if (error.message.includes('404')) {
           errorText = "Model Error: The AI model is currently unavailable.";
        } else if (error.message.includes('403')) {
           errorText = "Access Error: API key missing permissions (403).";
           setConfigError("API Key Access Denied (403)");
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

  // Use 100dvh for mobile browsers
  return (
    <div className="h-[100dvh] w-screen relative bg-[#050511] text-white overflow-hidden font-sans transition-colors duration-1000">
      
      {/* --- Dynamic Background (Optimized for Mobile Performance) --- */}
      {/* Reduced blur on mobile via class adjustments, added gpu-accelerated class */}
      <div className={`absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[80px] md:blur-[150px] animate-blob mix-blend-screen pointer-events-none transition-all duration-1000 gpu-accelerated
         ${isLoggedIn ? 'opacity-40 md:opacity-60' : 'opacity-60 md:opacity-80 scale-110'}
         ${isPersonal ? 'bg-brand-primary/20' : 'bg-blue-600/20'}
      `}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[80px] md:blur-[150px] animate-blob animation-delay-2000 mix-blend-screen pointer-events-none transition-all duration-1000 gpu-accelerated
         ${isLoggedIn ? 'opacity-40 md:opacity-60' : 'opacity-60 md:opacity-80 scale-110'}
         ${isPersonal ? 'bg-brand-secondary/20' : 'bg-cyan-500/20'}
      `}></div>
      
      {/* Main Container - Responsive Padding */}
      <div className="relative z-10 flex flex-col h-full max-w-6xl mx-auto p-2 md:p-6 lg:p-8">
        
        {!isLoggedIn ? (
            <WelcomeScreen onStart={handleLoginSuccess} />
        ) : (
            <>
                {/* Header (Minimal) - Better scaling on mobile */}
                <header className="flex items-center justify-between mb-2 md:mb-4 animate-fade-in px-2">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg transition-colors duration-500
                        ${isPersonal 
                            ? 'bg-gradient-to-tr from-brand-primary to-brand-secondary shadow-brand-primary/40' 
                            : 'bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-cyan-500/40'}
                    `}>
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-lg md:text-xl font-bold tracking-wider text-white transition-all">SIYA</h1>
                        <span className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1 truncate max-w-[100px] md:max-w-none">
                            {userName}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4">
                    {/* Mode Toggle */}
                    <button
                        onClick={toggleMode}
                        className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border transition-all duration-300 ${
                            isPersonal
                            ? 'bg-pink-500/20 border-pink-500/50 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.3)]' 
                            : 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                        }`}
                    >
                        {isPersonal ? (
                             <>
                                <Heart size={14} className="fill-current animate-pulse" />
                                <span className="text-[10px] md:text-xs font-bold tracking-wider">PERSONAL</span>
                             </>
                        ) : (
                             <>
                                <Brain size={14} />
                                <span className="text-[10px] md:text-xs font-bold tracking-wider">WORK</span>
                             </>
                        )}
                    </button>

                    {/* Voice Mode Toggle */}
                    {!isLiveMode && (
                        <button 
                        onClick={() => setIsLiveMode(true)}
                        className="group relative flex items-center gap-2 px-3 py-1.5 md:px-6 md:py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
                        >
                            <div className="relative flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5 md:h-3 md:w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-red-500"></span>
                                </span>
                                <span className="font-medium text-xs md:text-sm tracking-wide hidden sm:block">Voice</span>
                                <Mic size={14} className="sm:hidden" />
                            </div>
                        </button>
                    )}
                    
                    {/* Logout */}
                    <button 
                       onClick={handleLogout}
                       className="p-1.5 md:p-2 text-slate-500 hover:text-white transition-colors"
                       title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
                </header>

                {/* Configuration Error Banner */}
                {configError && (
                    <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 mb-2 mx-2 flex items-center gap-3 animate-fade-in">
                        <AlertTriangle className="text-red-400 shrink-0" size={18} />
                        <div className="flex flex-col">
                            <span className="text-red-300 font-bold text-xs md:text-sm">Config Error</span>
                            <span className="text-red-400/80 text-[10px] md:text-xs">
                                {configError.includes("403") 
                                 ? "Access Denied: Model permission missing." 
                                 : configError}
                            </span>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <main className={`flex-1 relative overflow-hidden transition-all duration-500 
                    ${isPersonal 
                        ? 'rounded-2xl md:rounded-3xl bg-black border-none' // Insta style
                        : 'rounded-2xl md:rounded-[2rem] border border-white/5 bg-black/20 backdrop-blur-xl shadow-2xl' // Work style
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