import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import WebCLI from './WebCLI';
import { InfoIcon, CloseIcon } from './icons';

interface DashboardProps {
  session: Session;
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
  const [showLoginNotification, setShowLoginNotification] = useState(false);

  useEffect(() => {
    const isNewLogin = sessionStorage.getItem('clutch-new-login');
    if (isNewLogin) {
      setShowLoginNotification(true);
      sessionStorage.removeItem('clutch-new-login');

      // The notification will auto-dismiss after 8 seconds.
      const timer = setTimeout(() => {
        setShowLoginNotification(false);
      }, 8000);

      // Clean up the timer if the component unmounts or the notification is closed manually.
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="bg-black text-white min-h-screen w-full flex flex-col relative">
      {/* 
        NOTE: The actual email sending for this notification would be handled 
        by a backend service, such as a Supabase Edge Function, triggered on login.
        This frontend component simulates that experience for the user.
      */}
      {showLoginNotification && (
        <>
          <style>{`
            @keyframes slide-down {
              from { transform: translateY(-100%); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            .animate-slide-down { animation: slide-down 0.5s ease-out forwards; }
          `}</style>
          <div className="absolute top-4 left-4 right-4 bg-gray-900 border-2 border-gray-600 p-4 flex items-center justify-between z-10 animate-slide-down shadow-lg">
            <div className="flex items-center">
              <InfoIcon />
              <p className="text-sm ml-3">
                <strong className="text-white">Security Notice:</strong> A new login was detected. We've sent a notification to{' '}
                <strong className="text-white">{session.user.email}</strong>.
              </p>
            </div>
            <button 
              onClick={() => setShowLoginNotification(false)} 
              className="text-gray-400 hover:text-white transition-colors duration-200"
              aria-label="Dismiss notification"
            >
              <CloseIcon />
            </button>
          </div>
        </>
      )}
      <WebCLI session={session} />
    </div>
  );
};

export default Dashboard;