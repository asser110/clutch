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
