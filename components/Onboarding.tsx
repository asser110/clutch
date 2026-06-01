import React, { useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface OnboardingProps {
  session: Session;
  onComplete: () => void;
}

const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/identicon/svg?seed=default&backgroundColor=000000';

const Onboarding: React.FC<OnboardingProps> = ({ session, onComplete }) => {
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError('NICKNAME IS REQUIRED');
      return;
    }
    if (nickname.trim().length < 3) {
      setError('NICKNAME MUST BE AT LEAST 3 CHARACTERS');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic validation
      if (file.size > 2 * 1024 * 1024) {
        setError('IMAGE MUST BE LESS THAN 2MB');
        return;
      }
      
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleFinalSubmit = async (useDefault: boolean = false) => {
    setLoading(true);
    setError(null);

    let finalAvatarUrl = DEFAULT_AVATAR;

    try {
      if (!useDefault && avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile);

        if (uploadError) {
          throw new Error('FAILED TO UPLOAD IMAGE: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        finalAvatarUrl = publicUrl;
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: session.user.id,
            nickname: nickname.trim(),
            username: nickname.trim(),
            avatar_url: finalAvatarUrl,
          }
        ]);

      if (insertError) {
        if (insertError.code === '23505') { // Unique violation
          throw new Error('NICKNAME ALREADY TAKEN. PLEASE GO BACK AND CHOOSE ANOTHER.');
        } else {
          throw new Error('INITIALIZATION FAILED: ' + insertError.message);
        }
      }

      onComplete();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const bgColor = 'bg-black';
  const panelStyles = 'bg-[#050505] border-[#1a1a1a] text-white';

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

      <div className={`max-w-md w-full border-2 p-8 relative z-10 min-h-[400px] flex flex-col justify-between ${panelStyles}`}>
        <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
        <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />

        <div>
          <h2 className="text-2xl mb-2 tracking-tighter text-center">INITIALIZE AGENT</h2>
          <p className="text-[10px] text-gray-500 mb-8 text-center leading-relaxed">
            STEP {step} OF 2
          </p>

          {error && <p className="text-red-500 text-[10px] text-center mb-6 border-2 border-red-500 p-2 animate-pulse">{error}</p>}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="flex flex-col gap-6">
              <div>
                <label className="block text-[10px] text-gray-400 mb-2">ENTER CALLSIGN (NICKNAME)</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} // Alphanumeric + underscore
                  maxLength={15}
                  placeholder="AGENT_NAME..."
                  className="w-full p-4 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white caret-white text-sm"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="mt-4 text-[14px] text-black bg-white px-8 py-4 transition-all duration-150 border-2 border-white hover:bg-black hover:text-white"
              >
                PROCEED &gt;&gt;
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-6 items-center">
              <label className="block text-[10px] text-gray-400 mb-2 text-center w-full">UPLOAD AVATAR</label>
              
              <div 
                className="w-32 h-32 border-2 border-dashed border-[#333] hover:border-white cursor-pointer flex items-center justify-center bg-[#111] overflow-hidden group transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <span className="text-[24px] text-gray-500 group-hover:text-white block mb-2">+</span>
                    <span className="text-[8px] text-gray-500 group-hover:text-white">CLICK TO BROWSE</span>
                  </div>
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />

              <div className="flex flex-col gap-3 mt-4 w-full">
                <button
                  onClick={() => handleFinalSubmit(false)}
                  disabled={loading || !avatarFile}
                  className="text-[14px] text-black bg-white px-8 py-4 transition-all duration-150 border-2 border-white hover:bg-black hover:text-white disabled:bg-gray-600 disabled:border-gray-600 disabled:text-gray-400"
                >
                  {loading ? 'UPLOADING...' : 'CONFIRM IDENTITY'}
                </button>

                <button
                  onClick={() => handleFinalSubmit(true)}
                  disabled={loading}
                  className="text-[10px] text-gray-500 hover:text-white transition-colors py-2"
                >
                  SKIP FOR NOW (DEFAULT IMAGE)
                </button>
                
                <button
                  onClick={() => { setStep(1); setError(null); }}
                  disabled={loading}
                  className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors py-2"
                >
                  &lt;&lt; BACK TO NICKNAME
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
