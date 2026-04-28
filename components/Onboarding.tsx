import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface OnboardingProps {
  session: Session;
  onComplete: () => void;
  theme: 'blue' | 'black';
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Clutch1&backgroundColor=000000',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Clutch2&backgroundColor=000000',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Clutch3&backgroundColor=000000',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Clutch4&backgroundColor=000000',
];

const Onboarding: React.FC<OnboardingProps> = ({ session, onComplete, theme }) => {
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('NICKNAME IS REQUIRED');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('profiles')
      .insert([
        {
          id: session.user.id,
          nickname: nickname.trim(),
          avatar_url: selectedAvatar,
        }
      ]);

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        setError('NICKNAME ALREADY TAKEN');
      } else {
        setError('INITIALIZATION FAILED: ' + insertError.message);
      }
      setLoading(false);
    } else {
      onComplete();
    }
  };

  const bgColor = theme === 'blue' ? 'bg-[#050520]' : 'bg-black';

  return (
    <div className={`font-press-start ${bgColor} text-white h-screen w-screen overflow-hidden flex flex-col items-center justify-center p-4 relative`}>
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .scanline {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.05);
          position: absolute;
          top: 0;
          left: 0;
          animation: scanline 8s linear infinite;
          pointer-events: none;
          z-index: 50;
        }
      `}</style>
      
      <div className="scanline" />

      <div className="max-w-md w-full border-2 border-[#1a1a1a] p-8 bg-[#050505] relative z-10">
        <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
        <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />

        <h2 className="text-2xl mb-2 tracking-tighter text-center">INITIALIZE AGENT</h2>
        <p className="text-[10px] text-gray-500 mb-8 text-center leading-relaxed">
          SYSTEM REQUIRES IDENTITY VERIFICATION BEFORE ACCESSING CLUTCH NETWORK.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          
          <div>
            <label className="block text-[10px] text-gray-400 mb-4 text-center">SELECT AVATAR</label>
            <div className="flex justify-between items-center gap-2">
              {PRESET_AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`w-16 h-16 border-2 transition-all duration-200 p-1 ${
                    selectedAvatar === avatar ? 'border-white bg-[#1a1a1a] scale-110' : 'border-[#333] hover:border-gray-500'
                  }`}
                >
                  <img src={avatar} alt="avatar option" className="w-full h-full" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 mb-2">CALLSIGN (NICKNAME)</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} // Alphanumeric + underscore
              maxLength={15}
              placeholder="ENTER_NAME..."
              className="w-full p-4 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white caret-white text-sm"
              required
            />
          </div>

          {error && <p className="text-red-500 text-[10px] text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 text-[14px] text-black bg-white px-8 py-4 transition-all duration-150 border-2 border-white hover:bg-black hover:text-white disabled:bg-gray-600 disabled:border-gray-600 disabled:text-gray-400"
          >
            {loading ? 'PROCESSING...' : 'CONFIRM IDENTITY'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
