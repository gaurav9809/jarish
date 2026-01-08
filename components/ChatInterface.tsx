import React, { useEffect, useRef } from 'react';
import { Message } from '../types';
import { Send, User, Bot, Globe } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  isLoading, 
  input, 
  setInput, 
  onSend 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Simple formatter to handle basic code blocks and bold text in lieu of a heavy markdown library
  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Code block
        const content = part.replace(/^```\w*\n?|```$/g, '');
        return (
          <div key={index} className="my-2 p-3 bg-slate-900 rounded-md border border-slate-700 overflow-x-auto">
            <pre className="text-xs sm:text-sm font-mono text-jarvis-cyan">{content}</pre>
          </div>
        );
      } else {
        // Text with bold/italic simulation
        const lines = part.split('\n');
        return (
          <div key={index}>
            {lines.map((line, i) => (
              <p key={i} className={`min-h-[1em] ${i < lines.length - 1 ? 'mb-1' : ''}`}>
                 {line.split(/(\*\*.*?\*\*)/g).map((seg, j) => {
                    if (seg.startsWith('**') && seg.endsWith('**')) {
                        return <strong key={j} className="text-white font-bold">{seg.slice(2, -2)}</strong>;
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
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto bg-jarvis-panel/80 backdrop-blur-sm border border-slate-800 rounded-lg overflow-hidden shadow-2xl relative">
       {/* Decor elements */}
       <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-jarvis-cyan opacity-50 rounded-tl-lg pointer-events-none"></div>
       <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-jarvis-cyan opacity-50 rounded-br-lg pointer-events-none"></div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`p-2 rounded-full border ${msg.role === 'user' ? 'bg-slate-700 border-slate-600' : 'bg-jarvis-dark border-jarvis-cyan'}`}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-jarvis-cyan" />}
            </div>
            
            <div className={`max-w-[85%] rounded-lg p-3 sm:p-4 text-sm sm:text-base leading-relaxed
              ${msg.role === 'user' 
                ? 'bg-slate-800 text-slate-100 border border-slate-700' 
                : 'bg-slate-900/50 text-jarvis-blue border border-jarvis-cyan/30 shadow-[0_0_10px_rgba(0,240,255,0.05)]'
              }`}
            >
              <div className="font-sans">
                {renderContent(msg.content)}
              </div>
              
              {/* Grounding Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                   <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Globe size={12}/> Sources:</p>
                   <ul className="list-none space-y-1">
                     {msg.sources.map((src, idx) => (
                       <li key={idx} className="text-xs text-jarvis-cyan truncate hover:underline cursor-pointer" title={src}>
                         <a href={src} target="_blank" rel="noopener noreferrer">[{idx + 1}] {src}</a>
                       </li>
                     ))}
                   </ul>
                </div>
              )}
              
              <div className="text-[10px] mt-2 opacity-50 text-right uppercase tracking-widest font-mono">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-jarvis-cyan animate-pulse p-4">
            <Bot size={20} />
            <span className="font-mono text-sm">PROCESSING...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-900/90 border-t border-slate-800">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter command..."
            className="w-full bg-slate-800/50 text-slate-100 border border-slate-700 rounded-md py-3 pl-4 pr-12 focus:outline-none focus:border-jarvis-cyan focus:ring-1 focus:ring-jarvis-cyan font-mono transition-all"
          />
          <button 
            onClick={onSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2 bg-jarvis-cyan/10 hover:bg-jarvis-cyan/20 text-jarvis-cyan rounded transition-colors disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
