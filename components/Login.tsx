
import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface LoginComponentProps {
  onBack: () => void;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onBack }) => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(prev => !prev);
  };

  const generateInviteLink = () => {
    const token = crypto.randomUUID();
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes from now
    const link = `${window.location.origin}/signup?token=${token}&expires=${expires}`;
    setInviteLink(link);
    setCopied(false);
  };
  
  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
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
        <form className="flex flex-col gap-6" onSubmit={(e: React.FormEvent) => e.preventDefault()}>
          <div>
            <label htmlFor="username" className="block text-left text-sm mb-2">USERNAME</label>
            <input
              id="username"
              type="text"
              className="w-full p-3 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
              placeholder="ENTER USERNAME..."
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-left text-sm mb-2">PASSWORD</label>
            <div className="relative">
              <input
                id="password"
                type={passwordVisible ? 'text' : 'password'}
                className="w-full p-3 pr-12 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
                placeholder="ENTER PASSWORD..."
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
          <button type="submit" className="text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white">
            ENTER
          </button>
        </form>
      </div>

      <div className="absolute bottom-8 right-8">
        <button onClick={generateInviteLink} className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
          ADMIN
        </button>
      </div>

      {inviteLink && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 animate-login-fade-in">
          <div className="bg-gray-900 p-8 border-2 border-gray-600 text-white w-full max-w-md flex flex-col">
            <h2 className="text-2xl mb-2">ADMIN INVITE LINK</h2>
            <p className="text-sm text-gray-400 mb-6">This link expires in 15 minutes.</p>
            <div className="flex gap-2">
              <input type="text" readOnly value={inviteLink} className="w-full p-3 bg-gray-800 border-2 border-gray-600 text-gray-300 focus:outline-none"/>
              <button onClick={copyLink} className="text-sm text-black bg-white px-4 py-2 transition-all duration-150 ease-in-out shadow-[2px_2px_0px_#999] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white">
                {copied ? 'COPIED!' : 'COPY'}
              </button>
            </div>
            <button onClick={() => setInviteLink(null)} className="mt-8 self-center text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginComponent;