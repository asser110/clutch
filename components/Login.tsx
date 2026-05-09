import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';
import { supabase } from '../lib/supabaseClient';

interface LoginComponentProps {
  onBack: () => void;
  onForgotPassword: () => void;
  onSuccess: () => void;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onBack, onForgotPassword, onSuccess }) => {
  const [view, setView] = useState<'login' | 'otp'>('login');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(prev => !prev);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Step 1: Verify password is correct
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Step 2: Password is correct! Sign out immediately to prevent
    // the app from redirecting to Dashboard before OTP verification
    await supabase.auth.signOut();

    // Step 3: Send the OTP code via email (uses Magic Link template)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      }
    });

    if (otpError) {
      setError("PASSWORD CORRECT, BUT FAILED TO SEND CODE: " + otpError.message);
    } else {
      setView('otp');
      setError(null);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    });

    if (error) {
      setError("INVALID OR EXPIRED CODE");
    } else {
      // Record login audit ONLY after full 2FA success
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from('login_audits').insert([{
        user_id: userData?.user?.id,
        email: email,
        metadata: {
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      }]);

      sessionStorage.setItem('clutch-new-login', 'true');
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }
    setLoading(false);
  };

  // Forgot Password is now handled by the parent routing to the dedicated page

  return (
    <div className="font-press-start bg-white text-black h-screen w-screen overflow-hidden relative flex flex-col items-center justify-center p-4">
      <style>{`
        @keyframes login-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-login-fade-in { animation: login-fade-in 0.4s ease-out forwards; }
      `}</style>
      <div className="w-full max-w-sm text-center animate-login-fade-in">
        <header className="absolute top-8 left-8 text-lg">
          <button onClick={onBack} className="text-gray-600 hover:text-black transition-colors duration-200 focus:outline-none">
            &lt;&lt; BACK
          </button>
        </header>
        <h1 className="text-5xl mb-12">{view === 'login' ? 'LOGIN' : 'SECURE'}</h1>

        {view === 'login' ? (
          <form className="flex flex-col gap-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-left text-sm mb-2">EMAIL</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 bg-gray-100 border-2 border-gray-300 text-black focus:outline-none focus:border-black caret-black placeholder-gray-400"
                placeholder="ENTER EMAIL..."
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-left text-sm mb-2">PASSWORD</label>
              <div className="relative">
                <input
                  id="password"
                  type={passwordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-12 bg-gray-100 border-2 border-gray-300 text-black focus:outline-none focus:border-black caret-black placeholder-gray-400"
                  placeholder="ENTER PASSWORD..."
                  required
                />
                <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
                  {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 self-start -mt-2">
              <input
                id="remember-me"
                type="checkbox"
                className="appearance-none h-5 w-5 cursor-pointer bg-white border-2 border-gray-300 checked:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-black"
              />
              <label htmlFor="remember-me" className="text-sm cursor-pointer select-none">REMEMBER ME</label>
            </div>
            <div className="text-left -mt-2">
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-[10px] text-gray-600 hover:text-black transition-colors focus:outline-none"
              >
                FORGOT PASSWORD?
              </button>
            </div>
            {error && <p className="text-red-500 text-xs text-left -mb-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white disabled:bg-gray-400 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
            >
              {loading ? 'VERIFYING...' : 'ENTER'}
            </button>
          </form>
        ) : (
          <form className="flex flex-col gap-6" onSubmit={handleVerifyOtp}>
            <div className="text-center mb-4">
              <p className="text-[10px] text-gray-400 leading-relaxed">
                CHECK YOUR EMAIL FOR THE SECURITY CODE.
              </p>
            </div>
            <div>
              <label htmlFor="otp" className="block text-left text-sm mb-2">SECURITY CODE</label>
              <input
                id="otp"
                type="text"
                maxLength={8}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                className="w-full p-3 bg-gray-100 border-2 border-gray-300 text-black focus:outline-none focus:border-black caret-black text-center tracking-[0.8rem] text-xl placeholder-gray-400"
                placeholder="00000000"
                required
              />
            </div>
            {error && <p className="text-red-500 text-xs text-left -mb-2">{error}</p>}
            {success && <p className="text-green-500 text-xs text-left -mb-2">IDENTITY VERIFIED!</p>}
            <button
              type="submit"
              disabled={loading || success || otpCode.length < 6}
              className="text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white disabled:bg-gray-400 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
            >
              {loading ? 'VERIFYING...' : 'VERIFY'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginComponent;