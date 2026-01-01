
import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';
import { supabase } from '../lib/supabaseClient';

interface LoginComponentProps {
  onBack: () => void;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onBack }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      // In a real app, you would redirect to the main app interface.
      // Here, we'll just show a success message and go back.
      setTimeout(() => {
        // This would be a redirect in a real app
        alert("Login successful! You would now be taken to the app.");
        onBack();
      }, 1500);
    }
    setLoading(false);
  };
  
  return (
    <div className="bg-black text-white h-screen w-screen overflow-hidden relative flex flex-col items-center justify-center p-4">
      <style>{`
        @keyframes login-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-login-fade-in { animation: login-fade-in 0.4s ease-out forwards; }
      `}</style>
      <div className="w-full max-w-sm text-center animate-login-fade-in">
        <header className="absolute top-8 left-8 text-lg">
          <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
            &lt;&lt; BACK
          </button>
        </header>
        <h1 className="text-5xl mb-12">LOGIN</h1>
        <form className="flex flex-col gap-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="block text-left text-sm mb-2">EMAIL</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
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
                className="w-full p-3 pr-12 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
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
              className="appearance-none h-5 w-5 cursor-pointer bg-gray-900 border-2 border-gray-600 checked:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white"
            />
            <label htmlFor="remember-me" className="text-sm cursor-pointer select-none">REMEMBER ME</label>
          </div>
          {error && <p className="text-red-500 text-xs text-left -mb-2">{error}</p>}
          {success && <p className="text-green-500 text-xs text-left -mb-2">SUCCESS! REDIRECTING...</p>}
          <button 
            type="submit" 
            disabled={loading || success}
            className="text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white disabled:bg-gray-400 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
          >
            {loading ? 'ENTERING...' : 'ENTER'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginComponent;