import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';
import { supabase } from '../lib/supabaseClient';

interface SignUpComponentProps {
  token: string | null;
  expires: string | null;
  onNavigateHome: () => void;
  onSignUpSuccess: () => void;
}

const SignUpComponent: React.FC<SignUpComponentProps> = ({ token, expires, onNavigateHome, onSignUpSuccess }) => {
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!email) {
      newErrors.email = 'EMAIL IS REQUIRED';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'EMAIL ADDRESS IS INVALID';
    }
    if (!username.trim()) {
      newErrors.username = 'USERNAME IS REQUIRED';
    }
    if (password.length < 8) {
      newErrors.password = 'PASSWORD MUST BE AT LEAST 8 CHARACTERS';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'PASSWORDS DO NOT MATCH';
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors({});
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        }
      }
    });

    if (error) {
      setErrors({ form: error.message });
    } else if (data.user) {
      // With email confirmation disabled, a successful sign up means the user is created.
      setIsSignedUp(true);
    }
    setLoading(false);
  };

  const togglePasswordVisibility = () => setPasswordVisible(prev => !prev);
  const toggleConfirmPasswordVisibility = () => setConfirmPasswordVisible(prev => !prev);

  if (isValid === null) {
    return <div className="bg-black h-screen w-screen"></div>; // Loading state
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

  if (isSignedUp) {
    return (
      <div className="bg-black text-white h-screen w-screen flex flex-col items-center justify-center text-center p-4">
        <h1 className="text-4xl mb-6">ACCOUNT CREATED!</h1>
        <p className="text-gray-400 mb-8 max-w-sm">Your account has been successfully created. You can now log in.</p>
        <button 
          onClick={onSignUpSuccess}
          className="text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white">
          PROCEED TO LOGIN
        </button>
      </div>
    );
  }
  
  return (
    <div className="bg-black text-white h-screen w-screen overflow-hidden relative flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-5xl mb-12">CREATE ACCOUNT</h1>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="email" className="block text-left text-sm mb-2">EMAIL</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
              placeholder="ENTER YOUR EMAIL..."
              required
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 text-left">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="username" className="block text-left text-sm mb-2">USERNAME</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder-gray-500"
              placeholder="CHOOSE YOUR USERNAME..."
              required
            />
            {errors.username && <p className="text-red-500 text-xs mt-1 text-left">{errors.username}</p>}
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
                placeholder="CREATE A PASSWORD..."
                required
              />
              <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
                {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1 text-left">{errors.password}</p>}
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-left text-sm mb-2">CONFIRM PASSWORD</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={confirmPasswordVisible ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 pr-12 bg-gray-900 border-2 border-gray-600 text-white focus:outline-none focus:border-white caret-white placeholder--gray-500"
                placeholder="CONFIRM YOUR PASSWORD..."
                required
              />
              <button type="button" onClick={toggleConfirmPasswordVisibility} className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
                {confirmPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 text-left">{errors.confirmPassword}</p>}
          </div>
          {errors.form && <p className="text-red-500 text-xs text-left">{errors.form}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white mt-4 disabled:bg-gray-400 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
          >
            {loading ? 'CREATING...' : 'SIGN UP'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUpComponent;