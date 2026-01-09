import React, { useState } from 'react';
import { Sparkles, ArrowRight, Lock, Fingerprint, Mail, Smartphone, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { sendOTP, registerUser, loginUser } from '../services/storageService';

interface WelcomeScreenProps {
  onStart: (user: any) => void;
}

type AuthStep = 'credentials' | 'otp';

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('credentials');
  
  // Form State
  const [identity, setIdentity] = useState(''); // Email or Mobile
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);

  const [error, setError] = useState('');

  const handleCredentialsSubmit = async () => {
      setError('');
      if (!identity || !password) {
          setError("Please fill in all fields");
          return;
      }

      if (!isLogin && !fullName) {
          setError("Name is required for sign up");
          return;
      }

      setLoading(true);

      if (isLogin) {
          // Login Flow: Check credentials first
          setTimeout(() => {
              const user = loginUser(identity, password);
              if (user) {
                  onStart(user);
              } else {
                  setError("Invalid credentials or user does not exist.");
                  setLoading(false);
              }
          }, 800);
      } else {
          // Signup Flow: Trigger OTP
          try {
              const code = await sendOTP(identity);
              setGeneratedOtp(code);
              // OTP is now strictly sent via Email only. No alert.
              setStep('otp');
          } catch (e) {
              console.error(e);
              setError("Failed to send OTP. Check your email configuration.");
          } finally {
              setLoading(false);
          }
      }
  };

  const handleOtpVerify = () => {
      setLoading(true);
      setError('');

      setTimeout(() => {
          if (otp === generatedOtp) {
              // Create Account
              const success = registerUser(identity, password, fullName);
              if (success) {
                  // Auto Login after reg
                  const user = loginUser(identity, password);
                  if (user) onStart(user);
              } else {
                  setError("User already exists. Try logging in.");
                  setIsLogin(true);
                  setStep('credentials');
              }
          } else {
              setError("Invalid OTP. Try again.");
          }
          setLoading(false);
      }, 800);
  };

  const resetForm = (mode: boolean) => {
      setIsLogin(mode);
      setStep('credentials');
      setError('');
      setOtp('');
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center relative z-20 px-4">
      {/* Glass Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[2rem] shadow-2xl flex flex-col items-center animate-fade-in relative overflow-hidden group transition-all duration-500">
        
        {/* Shine Effect */}
        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 group-hover:left-[100%] transition-all duration-1000 ease-in-out pointer-events-none"></div>

        {/* Logo Section */}
        <div className="relative mb-6">
            <div className="absolute inset-0 bg-brand-primary/50 blur-xl rounded-full animate-pulse"></div>
            <div className="w-20 h-20 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.6)] relative z-10">
                <Sparkles size={32} className="text-white" />
            </div>
        </div>

        <div className="text-center space-y-1 mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">SIYA AI</h1>
            <p className="text-slate-400 text-xs font-medium tracking-wide uppercase">Secure Access Portal</p>
        </div>

        {/* Toggle Tabs (Only visible in step 1) */}
        {step === 'credentials' && (
            <div className="flex p-1 bg-black/40 rounded-xl mb-6 w-full relative">
                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg transition-all duration-300 ${isLogin ? 'left-1' : 'left-[calc(50%+4px)]'}`}></div>
                <button 
                    onClick={() => resetForm(true)}
                    className={`flex-1 py-2 text-sm font-medium z-10 transition-colors ${isLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => resetForm(false)}
                    className={`flex-1 py-2 text-sm font-medium z-10 transition-colors ${!isLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                >
                    Sign Up
                </button>
            </div>
        )}

        {/* Step 1: Credentials Form */}
        {step === 'credentials' ? (
            <div className="w-full space-y-4 animate-fade-in">
                
                {/* Name Input (Signup Only) */}
                <div className={`space-y-1 transition-all duration-300 overflow-hidden ${!isLogin ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <label className="text-[10px] text-brand-primary font-bold uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative group/input">
                        <input 
                            type="text" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ex. Rahul Sharma"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white focus:outline-none focus:border-brand-primary/50 focus:bg-black/40 transition-all placeholder:text-slate-600 text-sm font-medium"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    </div>
                </div>

                {/* Identity Input */}
                <div className="space-y-1">
                    <label className="text-[10px] text-brand-primary font-bold uppercase tracking-widest ml-1">
                        {isLogin ? 'Email or Mobile' : 'Email Address'}
                    </label>
                    <div className="relative group/input">
                        <input 
                            type="text" 
                            value={identity}
                            onChange={(e) => setIdentity(e.target.value)}
                            placeholder={isLogin ? "user@email.com / 9876..." : "user@email.com"}
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white focus:outline-none focus:border-brand-primary/50 focus:bg-black/40 transition-all placeholder:text-slate-600 text-sm font-medium"
                        />
                        {/^\d+$/.test(identity) ? (
                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        ) : (
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        )}
                    </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                    <label className="text-[10px] text-brand-primary font-bold uppercase tracking-widest ml-1">Password</label>
                    <div className="relative group/input">
                        <input 
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 pl-10 pr-10 text-white focus:outline-none focus:border-brand-primary/50 focus:bg-black/40 transition-all placeholder:text-slate-600 text-sm font-medium"
                            onKeyDown={(e) => e.key === 'Enter' && handleCredentialsSubmit()}
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <button 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            // Step 2: OTP Form
            <div className="w-full space-y-4 animate-fade-in text-center">
                 <div className="w-16 h-16 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                    <ShieldCheck size={32} className="text-brand-primary" />
                 </div>
                 <h3 className="text-white font-bold text-lg">Verification Required</h3>
                 <p className="text-slate-400 text-xs">We sent a verification code to <br/><span className="text-white font-mono">{identity}</span></p>
                 
                 <div className="pt-4">
                    <input 
                        type="text" 
                        value={otp}
                        maxLength={4}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="0000"
                        className="w-40 bg-black/40 border border-white/20 rounded-xl py-3 text-center text-2xl tracking-[0.5em] text-white font-mono focus:border-brand-secondary focus:outline-none"
                    />
                 </div>
                 <button onClick={() => setStep('credentials')} className="text-xs text-slate-500 hover:text-white underline mt-2">Change details</button>
            </div>
        )}

        {/* Error Message */}
        {error && (
            <div className="text-red-400 text-xs mt-3 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 w-full text-center">
                {error}
            </div>
        )}

        {/* Submit Button */}
        <button 
            onClick={step === 'credentials' ? handleCredentialsSubmit : handleOtpVerify}
            disabled={loading}
            className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold tracking-wide shadow-lg shadow-brand-primary/25 hover:shadow-brand-secondary/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-3 relative overflow-hidden"
        >
            {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
                <>
                    <span>{step === 'credentials' ? (isLogin ? 'Access System' : 'Get OTP') : 'Verify & Enter'}</span>
                    <ArrowRight size={18} />
                </>
            )}
        </button>

        {/* Footer */}
        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-8 uppercase tracking-widest opacity-60">
            <Fingerprint size={12} />
            {isLogin ? 'Secure Session' : 'Encrypted Registration'}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;