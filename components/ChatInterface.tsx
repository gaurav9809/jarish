import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { Send, User, Heart, Globe, ExternalLink, Sparkles, Paperclip, Smile, Briefcase } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  mode: 'professional' | 'personal';
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  isLoading, 
  input, 
  setInput, 
  onSend,
  mode
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; // Reduced max height for mobile
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
      // Reset height immediately after send
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const isPersonal = mode === 'personal';
  
  // --- THEME CONFIGURATION ---
  
  const containerClass = isPersonal 
    ? "flex flex-col h-full w-full max-w-4xl mx-auto bg-black relative" 
    : "flex flex-col h-full w-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl relative transition-colors duration-500";

  const userBubbleClass = isPersonal
    ? "bg-gradient-to-l from-[#a855f7] to-[#ec4899] text-white rounded-[22px] px-4 py-2.5 md:px-5 md:py-3 text-sm md:text-[15px] shadow-sm border border-white/5" // Insta Gradient
    : "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white rounded-2xl rounded-br-none px-4 py-2.5 md:px-5 md:py-3 shadow-[0_4px_15px_rgba(6,182,212,0.3)] backdrop-blur-sm";

  const botBubbleClass = isPersonal
    ? "bg-[#262626] text-white rounded-[22px] px-4 py-2.5 md:px-5 md:py-3 text-sm md:text-[15px] border border-white/5" // Insta Dark Grey
    : "bg-white/10 border border-white/5 text-slate-100 rounded-2xl rounded-bl-none px-4 py-2.5 md:px-5 md:py-3 backdrop-blur-sm";

  const inputContainerClass = isPersonal
    ? "relative flex items-end gap-2 md:gap-3 bg-[#262626] rounded-[26px] p-1.5 pl-3 md:pl-4 border border-transparent focus-within:border-white/20 transition-all" // Insta Pill
    : "relative flex items-end gap-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-2 transition-all duration-300 hover:border-white/20 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.15)]";

  const sendBtnClass = isPersonal
    ? "text-[#a855f7] hover:text-white transition-colors p-2" // Text Button style
    : "bg-gradient-to-tr from-blue-500 to-cyan-500 hover:shadow-cyan-400/40 p-2.5 rounded-full text-white shadow-lg active:scale-95 transition-all flex items-center justify-center w-10 h-10";

  const renderContent = (text: string) => {
    // Basic markdown parsing for code blocks and bold text
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const content = part.replace(/^```\w*\n?|```$/g, '');
        return (
          <div key={index} className="my-2 p-2 md:p-3 bg-black/40 rounded-lg overflow-x-auto border border-white/10">
            <pre className={`text-[10px] md:text-sm font-mono whitespace-pre-wrap break-words ${isPersonal ? 'text-pink-300' : 'text-cyan-300'}`}>{content}</pre>
          </div>
        );
      } else {
        const lines = part.split('\n');
        return (
          <div key={index}>
            {lines.map((line, i) => (
              <p key={i} className={`min-h-[1em] ${i < lines.length - 1 ? 'mb-1' : ''} break-words`}>
                 {line.split(/(\*\*.*?\*\*)/g).map((seg, j) => {
                    if (seg.startsWith('**') && seg.endsWith('**')) {
                        return <strong key={j} className={isPersonal ? "font-bold" : "text-cyan-400 font-bold"}>{seg.slice(2, -2)}</strong>;
                    }
                    return seg;
                 })}
              </p>
            ))}
          </div>
        );
      }
    });
  };

  return (
    <div className={containerClass}>
       
      {/* Chat History - Enable momentum scrolling on iOS */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-y-auto space-y-4 custom-scrollbar scroll-smooth overscroll-contain ${isPersonal ? 'p-3 md:p-4' : 'p-3 md:p-4 space-y-4 md:space-y-6'}`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-end gap-2 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar - Hide on very small screens for user messages to save space */}
            {msg.role !== 'user' && (
                <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-300
                ${isPersonal 
                    ? 'bg-gradient-to-tr from-brand-primary to-brand-secondary border-transparent' 
                    : 'bg-gradient-to-tr from-blue-500 to-cyan-400 border-white/20 shadow-lg'}`}>
                {isPersonal ? <Heart size={12} className="fill-white text-white" /> : <Briefcase size={12} className="text-white" />}
                </div>
            )}
            
            <div className={`flex flex-col max-w-[85%] md:max-w-[75%] gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Bubble */}
                <div className={msg.role === 'user' ? userBubbleClass : botBubbleClass}>
                    <div className="font-sans text-sm md:text-base leading-relaxed">
                        {renderContent(msg.content)}
                    </div>
                </div>

                {/* Web Sources (Rich Cards) */}
                {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-full w-full">
                        {msg.sources.map((src, idx) => {
                            let domain = src;
                            try { domain = new URL(src).hostname.replace('www.', ''); } catch(e){}
                            
                            return (
                                <a 
                                    key={idx} 
                                    href={src} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`shrink-0 flex items-center gap-2 px-2 py-1.5 md:px-3 md:py-2 bg-black/40 hover:bg-black/60 border rounded-xl transition-all group ${isPersonal ? 'border-white/10' : 'border-cyan-500/30'}`}
                                >
                                    <div className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center ${isPersonal ? 'bg-white/10 text-white' : 'bg-cyan-500/20 text-cyan-400'}`}>
                                        <Globe size={10} />
                                    </div>
                                    <span className="text-[10px] md:text-xs text-slate-300 truncate max-w-[80px] md:max-w-[100px]">{domain}</span>
                                </a>
                            )
                        })}
                    </div>
                )}
                
                {/* Timestamp */}
                {!isPersonal && (
                    <div className={`text-[9px] md:text-[10px] opacity-50 px-1 font-medium ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 p-2 animate-pulse">
             <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center ${isPersonal ? 'bg-gradient-to-tr from-brand-primary to-brand-secondary' : 'bg-gradient-to-tr from-blue-500 to-cyan-400'}`}>
                <Sparkles size={12} className="text-white animate-spin-slow"/>
            </div>
            <div className="flex gap-1 ml-1">
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isPersonal ? 'bg-white/50' : 'bg-blue-400'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce delay-100 ${isPersonal ? 'bg-white/50' : 'bg-cyan-400'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce delay-200 ${isPersonal ? 'bg-white/50' : 'bg-blue-400'}`}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Adjusted for mobile touch targets */}
      <div className={`p-2 md:p-4 ${isPersonal ? 'bg-black border-t border-white/5' : 'bg-gradient-to-t from-black/80 to-transparent'}`}>
        <div className="max-w-3xl mx-auto">
            <div className={inputContainerClass}>
            
            {/* Left Icon (Emoji for Insta, Attach for Work) */}
            {isPersonal ? (
                 <button className="p-1.5 md:p-2 text-white bg-blue-500 rounded-full w-8 h-8 md:w-9 md:h-9 flex items-center justify-center hover:opacity-90 transition-opacity mb-1 shrink-0">
                    <Sparkles size={16} className="fill-current" />
                </button>
            ) : (
                <button className="p-2 md:p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors mb-0.5 shrink-0">
                    <Paperclip size={18} />
                </button>
            )}

            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={isPersonal ? "Message..." : "Type command..."}
                className="w-full bg-transparent text-white border-none focus:ring-0 focus:outline-none py-2 md:py-3 px-0 resize-none max-h-[120px] min-h-[24px] custom-scrollbar placeholder:text-slate-500 font-medium text-sm md:text-base"
                style={{ overflowY: 'auto' }}
            />
            
            {/* Right Side Actions */}
            <div className={`flex items-center gap-1 ${isPersonal ? 'mb-1' : 'mb-0.5'} shrink-0`}>
                
                {/* Image Icon for Insta */}
                {isPersonal && !input.trim() && (
                    <button className="p-2 text-slate-400 hover:text-white transition-colors">
                        <Smile size={22} />
                    </button>
                )}

                <button 
                    onClick={onSend}
                    disabled={isLoading || !input.trim()}
                    className={sendBtnClass}
                >
                    {isPersonal ? (
                         input.trim() ? <span className="text-sm font-semibold">Send</span> : null
                    ) : (
                        isLoading ? <Sparkles size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />
                    )}
                </button>
            </div>
            </div>
            
            {!isPersonal && (
                <div className="text-center mt-2 md:mt-3">
                    <p className="text-[9px] md:text-[10px] text-slate-500 tracking-wider font-light">
                        AI content can be inaccurate.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;