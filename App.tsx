import React, { useState, useCallback, useEffect } from 'react';
import TypingAnimation from './components/TypingAnimation';
import LoginComponent from './components/Login';
import SignUpComponent from './components/SignUp';
import Dashboard from './components/Dashboard';
import { supabase } from './lib/supabaseClient';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="bg-black h-screen w-screen"></div>; // Or a proper loading spinner
  }

  if (!session) {
    return <Landing />;
  }

  return <Dashboard session={session} />;
};

// Extracted the original App component logic into a Landing component
const Landing: React.FC = () => {
  const { pathname, search } = window.location;

  // Simple router for signup page
  if (pathname.startsWith('/signup')) {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    const expires = params.get('expires');

    const handleNavigateHome = () => {
      window.history.pushState({}, '', '/');
      window.location.pathname = '/';
    };

    return <SignUpComponent
      token={token}
      expires={expires}
      onNavigateHome={handleNavigateHome}
      onSignUpSuccess={() => {
        window.location.pathname = '/';
      }}
    />;
  }

  // --- Landing/Login Page Logic ---
  const [currentPage, setCurrentPage] = useState('landing');
  const [brandingAnimationComplete, setBrandingAnimationComplete] = useState(false);
  const [welcomeAnimationComplete, setWelcomeAnimationComplete] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleBrandingComplete = useCallback(() => {
    setTimeout(() => {
      setBrandingAnimationComplete(true);
    }, 300);
  }, []);

  const handleWelcomeComplete = useCallback(() => {
    setWelcomeAnimationComplete(true);
  }, []);

  useEffect(() => {
    if (welcomeAnimationComplete) {
      const timer = setTimeout(() => {
        setShowButton(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [welcomeAnimationComplete]);

  // Reset animation states when returning to landing page
  useEffect(() => {
    if (currentPage === 'landing') {
      const timer = setTimeout(() => {
        setBrandingAnimationComplete(false);
        setWelcomeAnimationComplete(false);
        setShowButton(false);
      }, 300); // Short delay for smooth transitions
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  const [flashing, setFlashing] = useState(false);

  const generateInviteLink = async () => {
    // Salted unique token
    const token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

    const expires = Date.now() + 15 * 60 * 1000; // 15 minutes from now

    // Save to Supabase
    const { error } = await supabase
      .from('invites')
      .insert([{ token, expires_at: expires, is_active: true }]);

    if (error) {
      console.error('Error saving invite:', error);
      alert(`DATABASE ERROR: ${error.message}\n\nMake sure you ran the SQL script in Supabase SQL Editor!`);
      return;
    }

    const link = `${window.location.origin}/signup?token=${token}&expires=${expires}`;
    setInviteLink(link);
    setCopied(false);

    // Trigger visual flash
    setFlashing(true);
    setTimeout(() => setFlashing(false), 500);
  };

  const killLink = async () => {
    if (!inviteLink) return;

    const url = new URL(inviteLink);
    const token = url.searchParams.get('token');

    if (token) {
      const { error } = await supabase
        .from('invites')
        .update({ is_active: false })
        .eq('token', token);

      if (error) {
        console.error('Error killing link:', error);
      }
    }

    setInviteLink(null);
  };




  const [theme, setTheme] = useState<'blue' | 'black'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('clutch-theme') as 'blue' | 'black') || 'blue';
    }
    return 'blue';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'blue' ? 'black' : 'blue';
    setTheme(newTheme);
    localStorage.setItem('clutch-theme', newTheme);
  };

  const [dbStatus, setDbStatus] = useState<'testing' | 'online' | 'offline'>('testing');
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const checkDb = async () => {
      const { testConnection } = await import('./lib/supabaseClient');
      const result = await testConnection();
      if (result.success) {
        setDbStatus('online');
      } else {
        setDbStatus('offline');
        setDbError(result.error || 'Unknown Error');
      }
    };
    checkDb();
  }, []);

  const copyLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
  };

  const handleCloseModal = () => {
    setShowAdminModal(false);
    setInviteLink(null);
  };

  if (currentPage === 'login') {
    return <LoginComponent onBack={() => setCurrentPage('landing')} />;
  }

  return (
    <div className={`font-press-start ${theme === 'blue' ? 'bg-[#0a0a40]' : 'bg-black'} text-white min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden relative transition-colors duration-500`}>

      <div className="absolute top-6 left-6 md:top-8 md:left-8">
        {!brandingAnimationComplete ? (
          <TypingAnimation
            text="Clutch"
            speed={200}
            className="text-xl md:text-2xl"
            onComplete={handleBrandingComplete}
          />
        ) : (
          <div className="text-xl md:text-2xl">Clutch</div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center flex-grow text-center">

        <div className="h-24">
          {brandingAnimationComplete && (
            <TypingAnimation
              text="Welcome to Clutch"
              speed={150}
              className="text-2xl sm:text-3xl md:text-5xl"
              onComplete={handleWelcomeComplete}
            />
          )}
        </div>

        <div className="mt-12 h-16">
          {welcomeAnimationComplete && (
            <button
              onClick={() => setCurrentPage('login')}
              className={`
                inline-block text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out 
                shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none 
                active:translate-x-1 active:translate-y-1 active:shadow-none 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white
                ${showButton
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
                }
              `}
            >
              LOGIN
            </button>
          )}
        </div>

        {/* Global Connection Status Dot */}
        <div className="absolute bottom-6 left-6 flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${dbStatus === 'testing' ? 'bg-yellow-500 animate-pulse' :
              dbStatus === 'online' ? 'bg-green-500' : 'bg-red-500 shadow-[0_0_8px_#f00]'
              }`}
            title={dbStatus === 'offline' ? `Offline: ${dbError}` : 'Supabase Status'}
          />
          <span className="text-[10px] text-gray-500">v7.0</span>
        </div>
      </div>


      <div className="absolute bottom-8 right-8 flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="text-xs text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none border border-gray-700 px-2 py-1 rounded"
          title="Toggle Theme"
        >
          {theme === 'blue' ? 'CLASSIC' : 'MODERN'}
        </button>
        <button onClick={() => setShowAdminModal(true)} className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
          ADMIN
        </button>
      </div>

      {showAdminModal && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <style>{`.animate-login-fade-in { animation: login-fade-in 0.4s ease-out forwards; } @keyframes login-fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
          <div className="bg-gray-900 p-8 border-2 border-gray-600 text-white w-full max-w-md flex flex-col animate-login-fade-in">
            <h2 className="text-2xl mb-2">ADMIN INVITE LINK v7.0</h2>
            <p className="text-sm text-gray-400 mb-6">This link expires in 15 minutes.</p>

            <div className="flex flex-col gap-4">
              {!inviteLink ? (
                <button
                  onClick={generateInviteLink}
                  className="w-full text-[20px] text-black bg-white px-8 py-3 transition-all duration-150 ease-in-out shadow-[4px_4px_0px_#999] hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:translate-x-1 active:translate-y-1 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white"
                >
                  GENERATE LINK
                </button>
              ) : (
                <>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className={`w-full p-3 bg-gray-800 border-2 border-gray-600 text-gray-300 focus:outline-none transition-all duration-300 ${flashing ? 'border-white bg-gray-700' : ''}`}
                    />
                    <button
                      onClick={killLink}
                      className="text-gray-500 hover:text-white transition-colors p-2 text-xl font-bold focus:outline-none"
                      title="Kill Link"
                    >
                      X
                    </button>

                    <button onClick={copyLink} className="flex-shrink-0 text-sm text-black bg-white px-4 py-2 transition-all duration-150 ease-in-out shadow-[2px_2px_0px_#999] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white">
                      {copied ? 'COPIED!' : 'COPY'}
                    </button>
                  </div>
                  <button
                    onClick={generateInviteLink}
                    className="w-full text-sm text-black bg-white/80 px-4 py-2 transition-all duration-150 ease-in-out shadow-[2px_2px_0px_#999] hover:bg-white hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus:outline-none"
                  >
                    GENERATE NEW LINK
                  </button>
                </>
              )}
            </div>

            <button onClick={handleCloseModal} className="mt-8 self-center text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none">
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


export default App;