import React, { useState } from 'react';
import { Heart, User, Lock, ArrowRight, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { registerUser, loginUser, loginAsGuest } from '../services/storageService';

interface WelcomeScreenProps {
  onStart: (user: any) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
      setError('');
      if (!identity || !password) {
          setError("Sab fill karo pehle! 😒");
          return;
      }
      
      setLoading(true);
      setTimeout(() => {
          if (isLogin) {
              const user = loginUser(identity, password);
              if (user) onStart(user);
              else {
                  setError("Galat password hai babu... 😡");
                  setLoading(false);
              }
          } else {
              if (!fullName) {
                   setError("Naam toh batao apna? ✨");
                   setLoading(false);
                   return;
              }
              const success = registerUser(identity, password, fullName);
              if (success) {
                   const user = loginUser(identity, password);
                   if (user) onStart(user);
              } else {
                  setError("Ye ID pehle se hai!");
                  setLoading(false);
              }
          }
      }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col pink-gradient-bg p-6 overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[80vw] h-[80vw] bg-white/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[70vw] h-[70vw] bg-rose-400/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>

      <div className="flex-1 flex flex-col justify-center items-center max-w-md mx-auto w-full relative z-10">
        
        {/* Logo */}
        <div className="text-center mb-10">
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-pink-900/10 border border-white/40">
                <Zap size={32} className="text-siya-pink fill-current" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tighter mb-1">SIYA AI</h1>
            <p className="text-white/60 text-xs font-bold uppercase tracking-[0.3em]">Neural Interface v4.0</p>
        </div>

        {/* Auth Box */}
        <div className="w-full glass-effect rounded-[32px] p-8 shadow-2xl overflow-hidden relative">
            <div className="space-y-4">
                {!isLogin && (
                     <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-all text-sm font-medium"
                        />
                    </div>
                )}

                <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Email or UserID"
                        value={identity}
                        onChange={(e) => setIdentity(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-all text-sm font-medium"
                    />
                </div>

                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={18} />
                    <input 
                        type="password" 
                        placeholder="Secret Key"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            {error && (
                <div className="mt-4 text-center text-white text-xs font-bold bg-rose-500/30 py-2.5 rounded-xl border border-rose-500/20 animate-in fade-in zoom-in-95">
                    {error}
                </div>
            )}

            <button 
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-8 bg-white text-siya-pink font-bold rounded-2xl py-4.5 hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {loading ? 'Initializing...' : (isLogin ? 'Enter System' : 'Create Uplink')}
                {!loading && <ArrowRight size={20} />}
            </button>
            
            <div className="mt-6 text-center">
                <button 
                    onClick={() => { setIsLogin(!isLogin); setError(''); }} 
                    className="text-white/40 text-xs font-semibold hover:text-white transition-colors"
                >
                    {isLogin ? "Don't have an account? Sign up" : 'Already have access? Login'}
                </button>
            </div>
        </div>

        {/* Guest */}
        <button 
            onClick={() => { setLoading(true); setTimeout(() => onStart(loginAsGuest()), 500); }} 
            className="mt-10 text-white/30 text-[10px] font-black uppercase tracking-[0.4em] hover:text-white transition-colors flex items-center gap-2"
        >
            <Sparkles size={12} /> Guest Mode
        </button>
      </div>

      <div className="absolute bottom-6 left-0 w-full text-center">
          <div className="flex items-center justify-center gap-2 text-white/20 text-[9px] font-bold tracking-widest uppercase">
              <ShieldCheck size={12} /> Biometric & Neural Encryption Verified
          </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;