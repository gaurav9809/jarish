
import React, { useState, useEffect } from 'react';
import { Phone, X, Mic, MicOff, Volume2, Activity, Shield, Wifi, Zap, Cpu } from 'lucide-react';

interface CallScreenProps {
  onHangUp: () => void;
  onAccept: () => void;
  userName: string;
  isCallActive: boolean;
}

const CallScreen: React.FC<CallScreenProps> = ({ onHangUp, onAccept, userName, isCallActive }) => {
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isCallActive) {
      interval = setInterval(() => setTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#030305] flex flex-col items-center justify-between py-16 px-6 overflow-hidden font-sans">
      
      {/* Premium Neural Background Animation */}
      <div className="absolute inset-0 pointer-events-none">
          {/* Animated Grid */}
          <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 0)', backgroundSize: '40px 40px'}}></div>
          
          {/* Drifting Nebula Clouds */}
          <div className="absolute top-1/4 -left-1/4 w-[80%] h-[80%] bg-indigo-600/10 blur-[140px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-1/4 -right-1/4 w-[80%] h-[80%] bg-purple-600/10 blur-[140px] rounded-full animate-pulse delay-700"></div>
      </div>
      
      {/* Tech HUD Corner Brackets */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute top-10 left-10 w-24 h-24 border-l-2 border-t-2 border-indigo-500/20"></div>
        <div className="absolute top-10 right-10 w-24 h-24 border-r-2 border-t-2 border-indigo-500/20"></div>
        <div className="absolute bottom-10 left-10 w-24 h-24 border-l-2 border-b-2 border-indigo-500/20"></div>
        <div className="absolute bottom-10 right-10 w-24 h-24 border-r-2 border-b-2 border-indigo-500/20"></div>
        
        {/* Scanning Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent animate-[scan_4s_linear_infinite]"></div>
      </div>

      {/* Top Status HUD */}
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="flex items-center gap-6 mb-12 text-[10px] tracking-[0.4em] font-black text-white/20 uppercase">
          <div className="flex items-center gap-2"><Shield size={12} className="text-indigo-400" /> Neural Security: v4.2</div>
          <div className="flex items-center gap-2"><Wifi size={12} className="text-indigo-400" /> Encrypted Link</div>
        </div>
        
        {/* Main Neural Core Unit */}
        <div className="relative">
          {/* Rotating Rings */}
          <div className="absolute inset-0 -m-12 border border-dashed border-indigo-500/10 rounded-full animate-[spin_20s_linear_infinite]"></div>
          <div className="absolute inset-0 -m-8 border border-white/5 rounded-full animate-[spin_12s_linear_infinite_reverse]"></div>
          <div className="absolute inset-0 -m-4 border-2 border-indigo-500/5 rounded-full animate-[spin_8s_linear_infinite]"></div>
          
          {/* Dynamic Core Energy */}
          <div className={`absolute inset-0 rounded-full blur-[80px] transition-all duration-1000 ${isCallActive ? 'bg-indigo-500/40 scale-150' : 'bg-indigo-500/20 scale-100 animate-pulse'}`}></div>
          
          <div className={`
            w-56 h-56 rounded-full border border-white/10 p-4 relative z-10 
            bg-black/60 backdrop-blur-3xl overflow-hidden shadow-[0_0_80px_rgba(99,102,241,0.15)]
            flex items-center justify-center transition-transform duration-700
            ${isCallActive ? 'scale-110' : 'scale-100'}
          `}>
             {/* Central AI Core Animation */}
             <div className="relative flex items-center justify-center">
                {/* Internal Pulsing Circle */}
                <div className={`absolute w-32 h-32 rounded-full border border-indigo-500/40 ${isCallActive ? 'animate-ping' : 'animate-pulse'}`}></div>
                <div className="absolute w-40 h-40 rounded-full border border-white/5 animate-pulse delay-500"></div>
                
                {/* The Core Heart */}
                <div className="relative z-20 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.6)]">
                    <Cpu size={40} className={`text-white transition-all duration-1000 ${isCallActive ? 'scale-125 rotate-90' : 'animate-float'}`} />
                </div>
                
                {/* Floating Particles Around Core */}
                <div className="absolute inset-0 animate-[spin_10s_linear_infinite]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-400 rounded-full blur-[2px]"></div>
                </div>
             </div>
          </div>
          
          {/* Live Data Visualizer Bars */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-end gap-1.5 h-12">
            {[...Array(8)].map((_, i) => (
                <div 
                    key={i} 
                    className={`w-1 bg-indigo-500/40 rounded-full transition-all duration-300 ${isCallActive ? 'animate-bounce' : 'h-2 opacity-20'}`}
                    style={{ 
                        height: isCallActive ? `${Math.random() * 100}%` : '8px',
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.4 + Math.random() * 0.4}s`
                    }}
                ></div>
            ))}
          </div>
        </div>

        <div className="mt-20 text-center relative z-20">
          <h2 className="text-4xl font-black text-white tracking-[-0.05em] mb-4 flex items-center justify-center gap-3">
            <Zap size={24} className="text-indigo-400 fill-current" /> SIYA CORE
          </h2>
          <div className="flex flex-col items-center">
             <div className="px-6 py-2 bg-white/[0.03] rounded-full border border-white/5 backdrop-blur-xl">
               <p className={`text-indigo-400/80 text-[11px] font-mono font-bold tracking-[0.3em] uppercase ${isCallActive ? '' : 'animate-pulse'}`}>
                  {isCallActive ? `CONNECTION TIME: ${formatTime(timer)}` : 'Initiating Neural Link...'}
               </p>
            </div>
            {!isCallActive && <p className="mt-4 text-white/20 text-[9px] font-bold uppercase tracking-[0.5em] animate-pulse">Syncing Synapses</p>}
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="relative z-20 w-full max-w-sm flex flex-col gap-12">
        {!isCallActive ? (
          <div className="flex justify-around items-center">
            <button 
                onClick={onHangUp}
                className="w-20 h-20 bg-zinc-900 border border-white/10 rounded-full flex items-center justify-center shadow-2xl hover:bg-red-500/20 hover:border-red-500/40 group transition-all duration-500"
            >
                <X size={32} className="text-white/20 group-hover:text-white transition-colors" />
            </button>
            <button 
                onClick={onAccept}
                className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(79,70,229,0.5)] hover:scale-110 active:scale-95 transition-all group"
            >
                <Phone size={36} className="text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-12">
            <div className="flex gap-8 p-1.5 bg-white/[0.02] border border-white/5 rounded-[28px] backdrop-blur-3xl shadow-2xl">
                <button className="w-16 h-16 rounded-2xl flex items-center justify-center text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                    <MicOff size={22} />
                </button>
                <button className="w-16 h-16 rounded-2xl flex items-center justify-center text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                    <Volume2 size={22} />
                </button>
                <button className="w-16 h-16 rounded-2xl flex items-center justify-center text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                    <Activity size={22} />
                </button>
            </div>
            <button 
                onClick={onHangUp}
                className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(220,38,38,0.4)] hover:scale-110 active:scale-95 transition-all group"
            >
                <Phone size={40} className="text-white rotate-[135deg] group-hover:rotate-[155deg] transition-transform" />
            </button>
          </div>
        )}
        
        <div className="text-center">
          <p className="text-[9px] font-black tracking-[0.6em] text-white/10 uppercase">Jarvis Protocol Enhanced • AI-S09</p>
        </div>
      </div>
      
      {/* Dynamic Scan Style CSS Animation */}
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  );
};

export default CallScreen;
