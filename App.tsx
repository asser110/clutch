
import React, { useState, useCallback, useEffect } from 'react';
import TypingAnimation from './components/TypingAnimation';
import LoginComponent from './components/Login';
import SignUpComponent from './components/SignUp';

const App: React.FC = () => {
  const { pathname, search } = window.location;

  // Simple router
  if (pathname.startsWith('/signup')) {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    const expires = params.get('expires');
    
    const handleNavigateHome = () => {
      window.history.pushState({}, '', '/');
      // A full reload might be easier to reset state in this simple app
      window.location.pathname = '/';
    };

    return <SignUpComponent token={token} expires={expires} onNavigateHome={handleNavigateHome} />;
  }

  // --- Landing/Login Page Logic ---
  const [currentPage, setCurrentPage] = useState('landing');
  const [brandingAnimationComplete, setBrandingAnimationComplete] = useState(false);
  const [welcomeAnimationComplete, setWelcomeAnimationComplete] = useState(false);
  const [showButton, setShowButton] = useState(false);

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
      }, 300); // Short delay to allow for smooth transitions
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  if (currentPage === 'login') {
    return <LoginComponent onBack={() => setCurrentPage('landing')} />;
  }

  return (
    <div className="bg-black text-white min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden">
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
      </div>
    </div>
  );
};

export default App;