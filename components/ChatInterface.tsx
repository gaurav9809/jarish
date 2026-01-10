
import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../types';
import { Send, Paperclip, PhoneOutgoing, Heart, Sparkles, Terminal, Zap } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  input: string;
  setInput: (val: string) => void;
  onSend: (image?: string) => void;
  mode: 'professional' | 'personal';
  onClearChat: () => void;
  onReact: (messageId: string, emoji: string) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mood, setMood] = useState<'idle' | 'happy' | 'thinking'>('idle');
  const isPersonal = mode === 'personal';

  useEffect(() => {
    if (isLoading) setMood('thinking');
    else if (messages.length > 0 && messages[messages.length - 1].role === 'model') {
      setMood('happy');
      setTimeout(() => setMood('idle'), 3000);
    } else setMood('idle');
  }, [isLoading, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;
    onSend(selectedImage || undefined);
    setSelectedImage(null);
  };

  return (
    <div className={`flex flex-col h-full w-full relative overflow-hidden transition-all duration-700 ${isPersonal ? 'personal-mesh-bg' : 'bg-[#0a0a0a]'}`}>
      
      {/* Mode Background Accents */}
      {!isPersonal && (
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage: 'radial-gradient(#ffffff 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
      )}

      {/* Modern SIYA Neural Head (Replaces Girl Avatar) */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
          <div className="relative">
              {/* Core Aura */}
              <div className={`absolute inset-0 blur-[60px] rounded-full transition-all duration-1000 ${
                  mood === 'thinking' ? (isPersonal ? 'bg-indigo-500/40' : 'bg-emerald-500/20') : 
                  mood === 'happy' ? (isPersonal ? 'bg-pink-500/40' : 'bg-emerald-400/20') : 
                  'bg-white/5'
              } scale-150`}></div>
              
              <div className={`
                w-20 h-20 rounded-[28px] border-2 p-0.5 bg-black/80 backdrop-blur-3xl shadow-2xl transition-all duration-700
                ${mood === 'thinking' ? 'scale-110 border-indigo-500/50' : 'animate-float border-white/10'}
                ${mood === 'happy' ? 'scale-105 border-pink-500/50 -translate-y-2' : ''}
                ${!isPersonal ? 'rounded-2xl border-emerald-500/20' : ''}
              `}>
                  <div className={`w-full h-full flex items-center justify-center relative overflow-hidden ${isPersonal ? 'rounded-[26px]' : 'rounded-xl'} bg-gradient-to-br from-zinc-900 to-black`}>
                      <Zap size={32} className={`transition-all duration-700 ${
                          mood === 'thinking' ? 'text-indigo-400 animate-pulse' : 
                          mood === 'happy' ? 'text-pink-400 scale-125' : 
                          (isPersonal ? 'text-indigo-500/50' : 'text-emerald-500/50')
                      }`} fill="currentColor" />
                      
                      {/* Reactive Ring inside icon */}
                      <div className={`absolute inset-0 border-2 rounded-full transition-all duration-700 ${mood === 'thinking' ? 'border-indigo-500/30 scale-75 animate-ping' : 'border-transparent scale-100'}`}></div>
                  </div>
              </div>
          </div>

          <div className="mt-4 animate-fade-up">
              <div className="bg-black/80 backdrop-blur-2xl px-4 py-1 rounded-full border border-white/5 shadow-2xl flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-indigo-400 animate-ping' : isPersonal ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                  <span className={`text-[9px] font-black tracking-[0.25em] uppercase ${isPersonal ? 'text-indigo-400/80' : 'text-emerald-500/80'}`}>
                      {isLoading ? 'Processing' : isPersonal ? 'Siya Core' : 'Neural Active'}
                  </span>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar px-6 pt-52 pb-44">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => {
            if (msg.isCall) return (
              <div key={msg.id} className="flex justify-center my-6 animate-fade-up">
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl px-5 py-2 flex items-center gap-3 backdrop-blur-md">
                  <PhoneOutgoing size={12} className="text-indigo-400" />
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{msg.content}</span>
                </div>
              </div>
            );

            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-up`}>
                <div className={`relative max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`
                    px-5 py-3.5 text-[14px] leading-relaxed shadow-xl transition-all
                    ${isUser ? (isPersonal ? 'personal-bubble-user text-white rounded-[24px] rounded-br-none' : 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-50 rounded-2xl rounded-br-none') : 
                               (isPersonal ? 'personal-bubble-ai text-zinc-100 rounded-[24px] rounded-bl-none border border-white/10' : 'bg-zinc-900/80 border border-white/5 text-zinc-300 font-mono rounded-2xl rounded-bl-none')}
                  `}>
                      {msg.content}
                  </div>
                  {msg.reaction && (
                    <div className={`mt-[-12px] z-10 bg-[#111] border border-white/10 rounded-full px-2.5 py-0.5 text-[12px] shadow-2xl ${isUser ? 'mr-1' : 'ml-1'}`}>
                        {msg.reaction}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-start gap-3 animate-fade-up">
              <div className={`px-5 py-4 rounded-[24px] flex gap-1.5 border border-white/5 backdrop-blur-xl ${isPersonal ? 'personal-bubble-ai' : 'bg-zinc-900'}`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${isPersonal ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s] ${isPersonal ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
                <div className={`w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s] ${isPersonal ? 'bg-indigo-400' : 'bg-emerald-400'}`}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="absolute bottom-10 left-0 w-full px-4 md:px-12 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <div className={`
            flex items-center gap-2 p-2 rounded-[30px] border shadow-2xl backdrop-blur-3xl transition-all duration-500
            ${isPersonal ? 'bg-white/[0.04] border-white/10' : 'bg-black/60 border-emerald-500/20 focus-within:border-emerald-500/40'}
          `}>
            <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center text-white/30 hover:text-white transition-all bg-white/5 rounded-full flex-shrink-0"><Paperclip size={18} /></button>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setSelectedImage(reader.result as string);
                    reader.readAsDataURL(file);
                }
            }} />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={isPersonal ? "Kuch kaho..." : "Query..."}
              className={`flex-1 bg-transparent border-none focus:ring-0 text-[14px] text-white resize-none py-2.5 placeholder-white/20 max-h-32 hide-scrollbar ${!isPersonal ? 'font-mono' : ''}`}
              rows={1}
            />
            <button onClick={handleSend} disabled={!input.trim() && !selectedImage} className={`
                w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0
                ${(input.trim() || selectedImage) ? 
                    (isPersonal ? 'bg-indigo-600 text-white shadow-lg' : 'bg-emerald-600 text-white shadow-lg') : 
                    'bg-white/5 text-white/10'}
            `}>
                <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
