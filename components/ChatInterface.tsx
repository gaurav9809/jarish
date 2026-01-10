
import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../types';
import { Send, Paperclip, PhoneOutgoing, Zap, Image as ImageIcon } from 'lucide-react';

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
  const isPersonal = mode === 'personal';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;
    onSend(selectedImage || undefined);
    setSelectedImage(null);
  };

  // Determine colors based on mode (Updated for Love Theme)
  const accentColor = isPersonal ? 'text-pink-400' : 'text-emerald-400';
  
  // Pink/Rose gradient for Personal Mode
  const bubbleUser = isPersonal 
    ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_10px_30px_-10px_rgba(225,29,72,0.5)]' 
    : 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)]';
  
  const bubbleAi = 'bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-lg';

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden">
      
      {/* Animated Background Layers */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Main Gradient Blob - Pink/Rose for Personal */}
          <div className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 animate-gradient-slow 
             ${isPersonal ? 'bg-pink-600' : 'bg-emerald-900'}`}></div>
          
          {/* Secondary Blob - Purple/Teal */}
          <div className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-10 animate-gradient-slow [animation-delay:2s] 
             ${isPersonal ? 'bg-purple-600' : 'bg-teal-900'}`}></div>
          
          {/* Noise/Grain Overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/7/76/Noise_64x64.png")'}}></div>
      </div>

      {/* Floating Center Identity */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-0 opacity-40 pointer-events-none flex flex-col items-center gap-4 transition-all duration-700">
         <div className={`relative w-32 h-32 rounded-full flex items-center justify-center border border-white/5 backdrop-blur-sm ${isLoading ? 'scale-110' : 'animate-float'}`}>
            <div className={`absolute inset-0 rounded-full blur-[40px] opacity-40 ${isPersonal ? 'bg-pink-500' : 'bg-emerald-500'}`}></div>
            <div className={`w-24 h-24 rounded-full bg-black/40 flex items-center justify-center border border-white/10 shadow-2xl relative overflow-hidden`}>
                <Zap size={32} className={`${accentColor} ${isLoading ? 'animate-pulse' : ''}`} fill="currentColor" />
                {/* Scanning line effect inside logo */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-white/20 blur-sm animate-[scan_2s_linear_infinite] ${isLoading ? 'opacity-100' : 'opacity-0'}`}></div>
            </div>
         </div>
         <span className="text-[10px] uppercase tracking-[0.5em] text-white/20 font-bold">
            {isLoading ? 'Processing Neural Link...' : 'System Online'}
         </span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0 pt-32 pb-36 z-10 hide-scrollbar scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-6 md:px-8">
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            
            if (msg.isCall) {
                return (
                  <div key={msg.id} className="flex justify-center my-8 animate-message-pop">
                    <div className="flex items-center gap-3 px-5 py-2 rounded-full bg-white/[0.02] border border-white/5 backdrop-blur-md">
                        <PhoneOutgoing size={12} className="text-white/40" />
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Call Ended • {msg.callDuration}s</span>
                    </div>
                  </div>
                );
            }

            return (
              <div key={msg.id} className={`group flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-message-pop`}>
                <div className={`relative max-w-[85%] md:max-w-[70%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  
                  {/* Sender Name */}
                  <span className={`text-[9px] text-white/20 mb-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider font-bold`}>
                      {isUser ? 'You' : 'Siya'}
                  </span>

                  {/* Bubble */}
                  <div className={`
                    px-6 py-4 text-[15px] leading-relaxed relative overflow-hidden transition-all duration-300 hover:scale-[1.01]
                    ${isUser 
                        ? `${bubbleUser} text-white rounded-[26px] rounded-br-sm` 
                        : `${bubbleAi} text-zinc-100 rounded-[26px] rounded-bl-sm`}
                  `}>
                      {/* Shine effect for user bubbles */}
                      {isUser && <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>}
                      
                      <div className="relative z-10 whitespace-pre-wrap font-light tracking-wide">
                        {msg.content}
                      </div>
                  </div>

                  {/* Reaction Tag */}
                  {msg.reaction && (
                    <div className={`mt-[-14px] z-20 bg-[#0a0a0a] border border-white/10 rounded-full w-7 h-7 flex items-center justify-center text-[14px] shadow-xl ${isUser ? 'mr-1' : 'ml-1'} animate-message-pop`}>
                        {msg.reaction}
                    </div>
                  )}
                  
                  {/* Timestamp */}
                  <span className="text-[9px] text-white/10 mt-1 mx-2 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start animate-message-pop">
               <div className="px-5 py-4 rounded-[26px] rounded-bl-sm bg-white/[0.02] border border-white/5 backdrop-blur-md flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${accentColor} bg-current`}></div>
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${accentColor} bg-current [animation-delay:0.2s]`}></div>
                  <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${accentColor} bg-current [animation-delay:0.4s]`}></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Unified Input Capsule */}
      <div className="absolute bottom-6 left-0 right-0 px-4 md:px-0 z-50">
        <div className="max-w-2xl mx-auto">
          {/* Image Preview - Floating above input */}
          {selectedImage && (
              <div className="mb-3 mx-4 p-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl inline-flex relative animate-message-pop">
                  <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors">
                      <Zap size={10} />
                  </button>
              </div>
          )}

          {/* The Unified "One Boot" Container */}
          <div className={`
            flex items-center p-1.5 rounded-[32px] 
            bg-black/40 backdrop-blur-2xl border border-white/10 
            shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] 
            transition-all duration-300 focus-within:border-white/20 focus-within:shadow-[0_0_20px_rgba(255,255,255,0.05)]
            focus-within:bg-black/60
          `}>
            
            {/* Integrated File Button */}
            <div className="flex-none">
                <button onClick={() => fileInputRef.current?.click()} className={`text-white/40 hover:text-white transition-colors p-3 rounded-full hover:bg-white/5`}>
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
            </div>

            {/* Seamless Text Input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              placeholder={isPersonal ? "Type a message..." : "Enter command / query..."}
              className={`flex-1 bg-transparent border-none focus:ring-0 outline-none text-[15px] text-white resize-none py-3 px-2 placeholder-white/30 max-h-32 hide-scrollbar ${!isPersonal && 'font-mono'}`}
              rows={1}
            />
            
            {/* Integrated Send Button */}
            <button 
                onClick={handleSend} 
                disabled={!input.trim() && !selectedImage}
                className={`
                    w-11 h-11 rounded-full flex-none flex items-center justify-center transition-all duration-300 transform
                    ${(input.trim() || selectedImage) 
                        ? (isPersonal ? 'bg-pink-600 hover:bg-pink-500 scale-100 rotate-0' : 'bg-emerald-600 hover:bg-emerald-500 scale-100 rotate-0') 
                        : 'bg-white/5 text-white/10 scale-90 rotate-45 cursor-not-allowed'}
                `}
            >
                <Send size={18} className={(input.trim() || selectedImage) ? 'text-white ml-0.5' : ''} />
            </button>
          </div>
          
          <div className="text-center mt-3">
             <span className="text-[9px] text-white/10 uppercase tracking-[0.2em] font-medium">Encrypted Neural Uplink</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
