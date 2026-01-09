import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { Send, Heart, Globe, Sparkles, Paperclip, Smile, Briefcase } from 'lucide-react';

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

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto"); // Instant scroll on load
  }, [messages.length]);

  useEffect(() => {
    if (isLoading) scrollToBottom();
  }, [isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const isPersonal = mode === 'personal';
  
  // --- STYLING ---
  
  // Personal Mode: "Instagram/Snapchat" vibe (Darker, sleeker)
  // Professional Mode: "Glassmorphism" vibe
  const containerClass = isPersonal 
    ? "flex flex-col h-full w-full max-w-4xl mx-auto relative bg-transparent" 
    : "flex flex-col h-full w-full max-w-4xl mx-auto glass-panel rounded-2xl overflow-hidden shadow-2xl relative transition-all duration-500";

  const userBubbleClass = isPersonal
    ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-[20px] px-4 py-2 text-sm md:text-[15px] shadow-md border border-white/5" 
    : "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white rounded-2xl rounded-br-none px-4 py-2.5 shadow-lg backdrop-blur-sm";

  const botBubbleClass = isPersonal
    ? "bg-[#1f1f1f] text-gray-100 rounded-[20px] px-4 py-2 text-sm md:text-[15px] border border-white/5 shadow-sm"
    : "bg-white/10 border border-white/5 text-slate-100 rounded-2xl rounded-bl-none px-4 py-2.5 backdrop-blur-sm";

  const inputContainerClass = isPersonal
    ? "relative flex items-center gap-2 bg-[#1a1a1a] rounded-full p-1.5 pl-4 border border-white/10 focus-within:border-pink-500/50 transition-colors shadow-lg"
    : "relative flex items-end gap-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-2 transition-all duration-300 hover:border-white/20 focus-within:border-cyan-400/50";

  return (
    <div className={containerClass}>
       
      {/* Chat History */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar overscroll-contain ${isPersonal ? 'p-3 space-y-3' : 'p-4 space-y-5'}`}>
        
        {/* Welcome Spacer */}
        <div className="h-2"></div>

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-end gap-2 animate-fade-in ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
             {/* Avatar (Bot Only) */}
             {msg.role === 'model' && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border overflow-hidden
                ${isPersonal 
                    ? 'bg-pink-900/20 border-pink-500/30' 
                    : 'bg-cyan-900/20 border-cyan-500/30'}`}>
                    {isPersonal ? (
                        <img src="https://img.freepik.com/premium-photo/cute-anime-girl-with-big-eyes-glasses_670382-120067.jpg" className="w-full h-full object-cover" alt="Siya" />
                    ) : (
                        <Briefcase size={12} className="text-cyan-300" />
                    )}
                </div>
            )}
            
            <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {/* Bubble */}
                <div className={msg.role === 'user' ? userBubbleClass : botBubbleClass}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {msg.sources.map((src, idx) => {
                            let domain = src;
                            try { domain = new URL(src).hostname.replace('www.', ''); } catch(e){}
                            return (
                                <a 
                                    key={idx} 
                                    href={src} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`flex items-center gap-1.5 px-2 py-1 bg-black/20 hover:bg-black/40 border rounded-lg transition-all text-[10px] ${isPersonal ? 'border-pink-500/20 text-pink-200' : 'border-cyan-500/20 text-cyan-200'}`}
                                >
                                    <Globe size={10} />
                                    <span className="truncate max-w-[80px]">{domain}</span>
                                </a>
                            )
                        })}
                    </div>
                )}
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 pl-2">
             <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isPersonal ? 'bg-pink-900/20' : 'bg-cyan-900/20'}`}>
                <Sparkles size={12} className={`animate-spin ${isPersonal ? 'text-pink-400' : 'text-cyan-400'}`}/>
            </div>
            <div className={`text-xs animate-pulse ${isPersonal ? 'text-pink-400/50' : 'text-cyan-400/50'}`}>typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* Input Area */}
      <div className={`p-2 md:p-4 shrink-0 z-10 ${isPersonal ? 'bg-transparent' : 'bg-gradient-to-t from-black/50 to-transparent'}`}>
        <div className="max-w-3xl mx-auto">
            <div className={inputContainerClass}>
            
            {/* Action Button (Left) */}
            <button className={`p-2 rounded-full transition-colors shrink-0 ${isPersonal ? 'text-pink-500 hover:bg-pink-500/10' : 'text-slate-400 hover:text-white'}`}>
                {isPersonal ? <Heart size={20} className="fill-current" /> : <Paperclip size={20} />}
            </button>

            <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={isPersonal ? "Message your girlfriend..." : "Type a command..."}
                className="w-full bg-transparent text-white border-none focus:ring-0 focus:outline-none py-2.5 px-1 resize-none max-h-[100px] min-h-[24px] custom-scrollbar placeholder:text-slate-500 text-sm md:text-base font-medium"
            />
            
            {/* Send Button */}
            <button 
                onClick={onSend}
                disabled={isLoading || !input.trim()}
                className={`p-2 rounded-full transition-all shrink-0 active:scale-95 flex items-center justify-center
                ${input.trim() 
                    ? (isPersonal ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30' : 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30') 
                    : 'text-slate-600 bg-white/5'}`}
            >
                <Send size={18} className={input.trim() ? "ml-0.5" : ""} />
            </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;