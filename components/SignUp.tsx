
import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface SignUpComponentProps {
  token: string | null;
  expires: string | null;
  onNavigateHome: () => void;
}

const SignUpComponent: React.FC<SignUpComponentProps> = ({ token, expires, onNavigateHome }) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  useEffect(() => {
    if (!token || !expires) {
      setIsValid(false);
      return;
    }

    const expiryTime = parseInt(expires, 10);
    if (isNaN(expiryTime) || Date.now() > expiryTime) {
      setIsExpired(true);
      setIsValid(false);
      return;
    }

    setIsValid(true);
  }, [token, expires]);

  const togglePasswordVisibility = () => setPasswordVisible(prev => !prev);
  const toggleConfirmPasswordVisibility = () => setConfirmPasswordVisible(prev => !prev);

  if (isValid === null) {
    // Still validating
    return <div className="bg-black h-screen w-screen"></div>;
  }
  
  if (!isValid) {
    return (
      <div className="bg-black text-white h-screen w-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl mb-6">{isExpired ? 'INVITE LINK EXPIRED' : 'INVALID INVITE LINK'}</h1>
        <p className="text-gray-400 mb-8">Please request a new link from an admin.</p>
        <button 
          onClick={onNavigateHome}
          className="text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white">
          GO HOME
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-black text-white h-screen w-screen overflow-hidden relative flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-5xl mb-12">CREATE ACCOUNT</h1>
        <form className="flex flex-col gap-6" onSubmit={(e: React.FormEvent) => e.preventDefault()}>
          <div>
            <label htmlFor="username" className="block text-left text-sm mb-2">USERNAME</label>
            <input
              id="username"
              type="text"
              className="w-full p-3 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
              placeholder="CHOOSE YOUR USERNAME..."
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-left text-sm mb-2">PASSWORD</label>
            <div className="relative">
              <input
                id="password"
                type={passwordVisible ? 'text' : 'password'}
                className="w-full p-3 pr-12 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
                placeholder="CREATE A PASSWORD..."
              />
              <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
                {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-left text-sm mb-2">CONFIRM PASSWORD</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={confirmPasswordVisible ? 'text' : 'password'}
                className="w-full p-3 pr-12 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
                placeholder="CONFIRM YOUR PASSWORD..."
              />
              <button type="button" onClick={toggleConfirmPasswordVisibility} className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
                {confirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          <button type="submit" className="text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white mt-4">
            SIGN UP
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUpComponent;