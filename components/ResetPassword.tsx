import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';
import { supabase } from '../lib/supabaseClient';

interface ResetPasswordProps {
    onBack: () => void;
    theme?: 'blue' | 'black';
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBack, theme = 'blue' }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
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
            setSuccess(true);
            setTimeout(() => {
                onBack();
            }, 3000);
        }
        setLoading(false);
    };

    return (
        <div className={`font-press-start ${theme === 'blue' ? 'bg-[#0a0a40]' : 'bg-black'} text-white h-screen w-screen overflow-hidden relative flex flex-col items-center justify-center p-4 transition-colors duration-500`}>
            <style>{`
        @keyframes reset-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-reset-fade-in { animation: reset-fade-in 0.4s ease-out forwards; }
      `}</style>

            <div className="w-full max-w-sm text-center animate-reset-fade-in">
                <header className="absolute top-8 left-8 text-lg">
                    <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
                        &lt;&lt; BACK
                    </button>
                </header>

                <h1 className="text-4xl mb-12">NEW PASSWORD</h1>

                {success ? (
                    <div className="flex flex-col gap-6 items-center">
                        <div className="text-green-500 text-lg mb-4">PASSWORD UPDATED!</div>
                        <p className="text-gray-400 text-xs">REDIRECTION TO LOGIN...</p>
                    </div>
                ) : (
                    <form className="flex flex-col gap-6" onSubmit={handleReset}>
                        <div>
                            <label className="block text-left text-sm mb-2">NEW PASSWORD</label>
                            <div className="relative">
                                <input
                                    type={passwordVisible ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 pr-12 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white"
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
                                    className="w-full p-3 pr-12 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white"
                                    placeholder="CONFIRM NEW PASSWORD..."
                                    required
                                />
                                <button type="button" onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)} className="absolute inset-y-0 right-0 px-4 text-gray-400 hover:text-white">
                                    {confirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-xs text-left">{error}</p>}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 text-[20px] text-black bg-white px-8 py-3 shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:bg-gray-400"
                        >
                            {loading ? 'UPDATING...' : 'UPDATE'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
