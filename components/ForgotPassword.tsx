import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';
import { supabase } from '../lib/supabaseClient';

interface ForgotPasswordProps {
  onBack: () => void;
  initialView?: 'email' | 'password';
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBack, initialView = 'email' }) => {
  const [view, setView] = useState<'email' | 'otp' | 'password'>(initialView);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      setError(error.message);
    } else {
      setView('otp');
      setSuccessMsg("If an account exists, a secure verification code has been sent. Please check your email.");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'recovery',
    });

    if (error) {
      setError("INVALID OR EXPIRED CODE - " + error.message);
    } else {
      setView('password');
      setSuccessMsg("CODE VERIFIED! ENTER NEW PASSWORD.");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("PASSWORDS DO NOT MATCH");
      return;
    }
    if (password.length < 8) {
      setError("PASSWORD MUST BE AT LEAST 8 CHARACTERS");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccessMsg("PASSWORD UPDATED SUCCESSFULLY! Redirecting...");
      setTimeout(() => {
        onBack();
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <div className="font-press-start bg-black text-white min-h-screen w-screen relative flex flex-col items-center justify-center p-4 overflow-y-auto">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
      <div className="w-full max-w-sm text-center animate-fade-in">
        <header className="absolute top-8 left-8 text-lg">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
            &lt;&lt; BACK
          </button>
        </header>

        <h1 className="text-4xl mb-4 leading-tight">
          {view === 'email' && 'RECOVER'}
          {view === 'otp' && 'VERIFY'}
          {view === 'password' && 'SECURE'}
        </h1>
        <p className="text-gray-400 text-[10px] mb-8 uppercase tracking-widest">
          {view === 'email' && 'ENTER EMAIL TO RECEIVE CODE'}
          {view === 'otp' && 'ENTER THE SECURITY CODE'}
          {view === 'password' && 'CREATE YOUR NEW PASSWORD'}
        </p>

        {successMsg && (
          <div className="text-green-400 border border-green-500/30 bg-green-500/10 p-3 mb-6 flex flex-col gap-2 relative">
             <span className="text-[10px] leading-relaxed uppercase">{successMsg}</span>
          </div>
        )}

        {view === 'email' && (
          <form className="flex flex-col gap-6" onSubmit={handleSendEmail}>
            <div>
              <label htmlFor="email" className="block text-left text-sm mb-2">EMAIL</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
                placeholder="ENTER EMAIL..."
                required
              />
            </div>

            {error && <p className="text-red-500 text-[10px] text-left leading-relaxed uppercase">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 text-[20px] text-black bg-white px-8 py-3 shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:bg-gray-400 disabled:translate-x-1 disabled:translate-y-1 disabled:shadow-none font-bold uppercase tracking-widest"
            >
              {loading ? 'SENDING...' : 'SEND CODE'}
            </button>
          </form>
        )}

        {view === 'otp' && (
          <form className="flex flex-col gap-6" onSubmit={handleVerifyOtp}>
            <div>
              <label htmlFor="otp" className="block text-left text-sm mb-2">SECURITY CODE</label>
              <input
                id="otp"
                type="text"
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full p-3 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white caret-white text-center text-2xl tracking-[1em] placeholder:tracking-normal placeholder:text-sm placeholder:text-gray-500"
                placeholder="------"
                required
              />
            </div>
            
            {error && <p className="text-red-500 text-[10px] text-left leading-relaxed uppercase">{error}</p>}

            <button
              type="submit"
              disabled={loading || otpCode.length < 6}
              className="mt-4 text-[20px] text-black bg-white px-8 py-3 shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:bg-gray-400 disabled:translate-x-1 disabled:translate-y-1 disabled:shadow-none font-bold uppercase tracking-widest"
            >
              {loading ? 'VERIFYING...' : 'VERIFY CODE'}
            </button>
          </form>
        )}

        {view === 'password' && (
          <form className="flex flex-col gap-6" onSubmit={handleUpdatePassword}>
            <div>
                <label className="block text-left text-sm mb-2">NEW PASSWORD</label>
                <div className="relative">
                    <input
                        type={passwordVisible ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 pr-12 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white"
                        placeholder="ENTER NEW PASSWORD..."
                        required
                    />
                    <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-white">
                        {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-left text-sm mb-2">CONFIRM PASSWORD</label>
                <div className="relative">
                    <input
                        type={confirmPasswordVisible ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full p-3 pr-12 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white"
                        placeholder="CONFIRM NEW PASSWORD..."
                        required
                    />
                    <button type="button" onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)} className="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-white">
                        {confirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                </div>
            </div>

            {error && <p className="text-red-500 text-[10px] text-left leading-relaxed uppercase">{error}</p>}

            <button
                type="submit"
                disabled={loading}
                className="mt-4 text-[20px] text-black bg-white px-8 py-3 shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:bg-gray-400 disabled:translate-x-1 disabled:translate-y-1 disabled:shadow-none font-bold uppercase tracking-widest"
            >
                {loading ? 'UPDATING...' : 'UPDATE'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
