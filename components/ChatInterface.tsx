
import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../types';
import { Send, Paperclip, PhoneOutgoing, Zap, SmilePlus } from 'lucide-react';

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

const EMOJIS = ['❤️', '😂', '🔥', '😡', '😏', '💋'];

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  isLoading, 
  input, 
  setInput, 
  onSend,
  mode,
  onReact
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPickerId, setShowPickerId] = useState<string | null>(null);
  const isPersonal = mode === 'personal';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;
    onSend(selectedImage || undefined);
    setSelectedImage(null);
  };

  const togglePicker = (id: string) => {
    setShowPickerId(showPickerId === id ? null : id);
  };

  const accentColor = isPersonal ? 'text-pink-400' : 'text-emerald-400';
  const bubbleUser = isPersonal 
    ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_10px_30px_-10px_rgba(225,29,72,0.5)]' 
    : 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]';
  
  const bubbleAi = 'bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-lg';

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      
      {/* Background Layers */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-[-10%] left-[-5%] w-[120%] h-[120%] opacity-20 animate-gradient-slow 
             ${isPersonal ? 'bg-pink-600/30' : 'bg-emerald-900/30'} blur-[100px]`}></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/7/76/Noise_64x64.png")'}}></div>
      </div>

      {/* Floating Center Identity */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-0 opacity-20 pointer-events-none flex flex-col items-center gap-4">
         <div className={`w-24 h-24 rounded-full flex items-center justify-center border border-white/5 backdrop-blur-sm animate-float`}>
            <Zap size={32} className={`${accentColor}`} fill="currentColor" />
         </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-28 pb-32 z-10 hide-scrollbar scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-5">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            
            if (msg.isCall) {
                return (
                  <div key={msg.id} className="flex justify-center my-6 animate-message-pop">
                    <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-md">
                        <PhoneOutgoing size={11} className="text-white/40" />
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">Call Ended • {msg.callDuration}s</span>
                    </div>
                  </div>
                );
            }

            return (
              <div key={msg.id} className={`group flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-message-pop`}>
                <div className={`relative max-w-[88%] md:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  
                  {/* Reaction Picker for Model Messages */}
                  {!isUser && isPersonal && (
                    <div className="absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => togglePicker(msg.id)}
                        className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/30 hover:text-pink-400 transition-all"
                      >
                        <SmilePlus size={16} />
                      </button>
                    </div>
                  )}

                  {showPickerId === msg.id && (
                    <div className="absolute -top-12 left-0 z-50 flex gap-2 p-2 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl animate-message-pop shadow-2xl">
                      {EMOJIS.map(emoji => (
                        <button 
                          key={emoji} 
                          onClick={() => { onReact(msg.id, emoji); setShowPickerId(null); }}
                          className="hover:scale-125 transition-transform text-lg"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`
                    px-5 py-3.5 text-[15px] leading-relaxed relative overflow-hidden transition-all duration-200
                    ${isUser 
                        ? `${bubbleUser} text-white rounded-[22px] rounded-br-sm` 
                        : `${bubbleAi} text-zinc-100 rounded-[22px] rounded-bl-sm`}
                  `}>
                      <div className="relative z-10 whitespace-pre-wrap font-light tracking-wide">
                        {msg.content}
                      </div>
                  </div>

                  {msg.reaction && (
                    <div className={`mt-[-12px] z-20 bg-[#0a0a0a] border border-white/10 rounded-full w-6 h-6 flex items-center justify-center text-[12px] shadow-xl ${isUser ? 'mr-1' : 'ml-1'} animate-message-pop`}>
                        {msg.reaction}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start animate-message-pop">
               <div className="px-5 py-3.5 rounded-[22px] rounded-bl-sm bg-white/[0.02] border border-white/5 backdrop-blur-md flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${accentColor} bg-current`}></div>
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${accentColor} bg-current [animation-delay:0.2s]`}></div>
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${accentColor} bg-current [animation-delay:0.4s]`}></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Input Bar */}
      <div className="absolute bottom-6 left-0 right-0 px-4 z-50">
        <div className="max-w-2xl mx-auto">
          {selectedImage && (
              <div className="mb-3 mx-2 p-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl inline-flex relative animate-message-pop">
                  <img src={selectedImage} alt="Preview" className="h-16 w-auto rounded-lg" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5">
                      <Zap size={10} />
                  </button>
              </div>
          )}

          <div className="flex items-center p-1 rounded-[30px] bg-black/50 backdrop-blur-2xl border border-white/10 shadow-2xl">
            <button onClick={() => fileInputRef.current?.click()} className="text-white/30 hover:text-white p-3 rounded-full">
                <Paperclip size={20} />
            </button>
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
              placeholder={isPersonal ? "Say something..." : "Command line..."}
              className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-[15px] text-white resize-none py-3 px-1 placeholder-white/20 max-h-32 hide-scrollbar"
              rows={1}
            />
            
            <button 
                onClick={handleSend} 
                disabled={!input.trim() && !selectedImage}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all 
                  ${(input.trim() || selectedImage) ? (isPersonal ? 'bg-pink-600' : 'bg-emerald-600') : 'bg-white/5 opacity-50'}
                `}
            >
                <Send size={18} className="text-white ml-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
