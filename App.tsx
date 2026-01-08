import React, { useState, useEffect } from 'react';
import { JarvisMode, Message } from './types';
import { SYSTEM_INSTRUCTIONS, INITIAL_GREETING } from './constants';
import ChatInterface from './components/ChatInterface';
import LiveInterface from './components/LiveInterface';
import { createChatSession, APP_MAPPING } from './services/geminiService';
import { 
  Terminal, 
  BookOpen, 
  Search, 
  Cpu, 
  Menu,
  Zap,
  Activity
} from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<JarvisMode>(JarvisMode.GENERAL);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  // Ref to hold chat session instance
  const chatSessionRef = React.useRef<any>(null);

  // Initialize Greeting
  useEffect(() => {
    setMessages([
      {
        id: 'init',
        role: 'model',
        content: INITIAL_GREETING,
        timestamp: Date.now(),
      }
    ]);
  }, []);

  // Reset Chat on Mode Change (Optional, but keeps context clean for specialized tasks)
  useEffect(() => {
    chatSessionRef.current = null; // Clear session to re-init with new prompt
  }, [mode]);

  const executeOpenApp = (appName: string): string => {
      const url = APP_MAPPING[appName.toLowerCase()];
      if (url) {
          window.open(url, '_blank');
          return `Successfully opened ${appName}`;
      }
      return `Could not find application: ${appName}`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession(mode);
      }

      // Initial Send
      let result = await chatSessionRef.current.sendMessage({ message: userMsg.content });
      
      // Handle Function Calls Loop
      while (result.functionCalls && result.functionCalls.length > 0) {
          const functionResponses: any[] = [];
          
          for (const call of result.functionCalls) {
              if (call.name === 'openApp') {
                  const appName = call.args['appName'];
                  const status = executeOpenApp(appName);
                  
                  // Add a system-like message to UI to show action
                  setMessages(prev => [...prev, {
                      id: Date.now().toString(),
                      role: 'system',
                      content: `[SYSTEM]: Executing openApp(${appName})...`,
                      timestamp: Date.now()
                  }]);

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
              result = await chatSessionRef.current.sendMessage(functionResponses);
          } else {
              break;
          }
      }

      const responseText = result.text || "";
      
      // Check for grounding metadata (web sources)
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

      setMessages(prev => [...prev, botMsg]);

    } catch (error) {
      console.error("Error sending message:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "I apologize, sir. I encountered an error processing that request. " + (error instanceof Error ? error.message : ""),
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const navItems = [
    { id: JarvisMode.GENERAL, icon: Cpu, label: 'CORE' },
    { id: JarvisMode.STUDY, icon: BookOpen, label: 'STUDY' },
    { id: JarvisMode.CODE, icon: Terminal, label: 'DEV' },
    { id: JarvisMode.SEARCH, icon: Search, label: 'NET' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-jarvis-dark text-slate-200 overflow-hidden font-sans selection:bg-jarvis-cyan/30 selection:text-white">
      
      {/* Sidebar Navigation */}
      <nav className="w-full md:w-24 md:h-full bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex md:flex-col items-center justify-between p-4 z-20 shadow-xl">
        <div className="flex items-center gap-2 mb-0 md:mb-8 text-jarvis-cyan">
          <Activity className="animate-pulse-slow" size={32} />
          <span className="md:hidden font-bold tracking-widest text-xl">JARVIS</span>
        </div>

        <div className="flex md:flex-col gap-6 overflow-x-auto md:overflow-visible w-full md:w-auto justify-center md:justify-start px-4 md:px-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setMode(item.id);
                setIsLiveMode(false); // Reset to text on mode switch for safety
              }}
              className={`
                group relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-300
                ${mode === item.id 
                  ? 'text-jarvis-cyan bg-jarvis-cyan/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}
              `}
            >
              <item.icon size={24} className={`transition-transform duration-300 ${mode === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              <span className="text-[10px] font-mono tracking-wider font-bold">{item.label}</span>
              
              {/* Active Indicator Line */}
              {mode === item.id && (
                <div className="absolute -left-[17px] top-1/2 -translate-y-1/2 w-1 h-8 bg-jarvis-cyan rounded-r-full hidden md:block shadow-[0_0_10px_#06b6d4]"></div>
              )}
              {mode === item.id && (
                 <div className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-8 h-1 bg-jarvis-cyan rounded-t-full md:hidden shadow-[0_0_10px_#06b6d4]"></div>
              )}
            </button>
          ))}
        </div>

        <div className="hidden md:flex flex-col gap-4 mt-auto">
             <div className="text-[10px] font-mono text-slate-600 text-center">
                SYS.V.2.0
             </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
        {/* Header (Top Bar) */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-10">
           <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold tracking-[0.2em] text-white hidden md:block">
                 J.A.R.V.I.S.
              </h1>
              <div className="h-6 w-[1px] bg-slate-700 hidden md:block"></div>
              <div className="text-xs font-mono text-jarvis-blue flex items-center gap-2">
                 <span className="inline-block w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
                 SYSTEM: {mode} MODE
              </div>
           </div>

           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`
                   flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold border transition-all
                   ${isLiveMode 
                      ? 'border-red-500 text-red-400 bg-red-500/10 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                      : 'border-slate-700 text-slate-400 hover:border-jarvis-cyan hover:text-jarvis-cyan'}
                `}
              >
                 <Zap size={14} className={isLiveMode ? "fill-red-400" : ""} />
                 {isLiveMode ? "VOICE ACTIVE" : "VOICE OFF"}
              </button>
           </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-jarvis-dark to-[#0f172a]">
           {/* Decorative Grid */}
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none"></div>

           <div className="absolute inset-0 z-0 p-4 sm:p-6 flex flex-col">
              {isLiveMode ? (
                <LiveInterface 
                  mode={mode} 
                  isActive={isLiveMode} 
                  onToggle={() => setIsLiveMode(false)}
                />
              ) : (
                <ChatInterface 
                  messages={messages}
                  isLoading={isLoading}
                  input={inputValue}
                  setInput={setInputValue}
                  onSend={handleSendMessage}
                />
              )}
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;