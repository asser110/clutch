import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { 
  InfoIcon, 
  CloseIcon, 
  HashIcon, 
  UserIcon, 
  CogIcon,
  LogOutIcon,
  MicIcon,
  HeadphoneIcon
} from './icons';
import { supabase } from '../lib/supabaseClient';

interface DashboardProps {
  session: Session;
  theme: 'blue' | 'black';
}

const Dashboard: React.FC<DashboardProps> = ({ session, theme }) => {
  const [showLoginNotification, setShowLoginNotification] = useState(false);
  const [activeChannel, setActiveChannel] = useState('overview');

  useEffect(() => {
    const isNewLogin = sessionStorage.getItem('clutch-new-login');
    if (isNewLogin) {
      setShowLoginNotification(true);
      sessionStorage.removeItem('clutch-new-login');
      const timer = setTimeout(() => setShowLoginNotification(false), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const channels = [
    { id: 'overview', name: 'OVERVIEW', type: 'text' },
    { id: 'security', name: 'SECURITY-LOGS', type: 'text' },
    { id: 'database', name: 'DATABASE-HUB', type: 'text' },
    { id: 'settings', name: 'SYSTEM-CONFIG', type: 'text' },
  ];

  const bgColor = theme === 'blue' ? 'bg-[#050520]' : 'bg-black';
  const accentColor = theme === 'blue' ? 'border-blue-500 text-blue-400' : 'border-white text-white';
  const sidebarColor = theme === 'blue' ? 'bg-[#0a0a30]' : 'bg-[#0a0a0a]';

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${bgColor} text-white font-press-start`}>
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
        .retro-border {
          border: 2px solid #333;
        }
        .retro-border:hover {
          border-color: #fff;
        }
        .channel-active {
          background: white;
          color: black;
        }
      `}</style>

      <div className="scanline" />

      {/* Sidebar (Discord Layout but Clutch Style) */}
      <div className={`w-72 ${sidebarColor} border-r-2 border-[#1a1a1a] flex flex-col shrink-0 z-10`}>
        <div className="h-20 px-6 flex items-center border-b-2 border-[#1a1a1a]">
          <h1 className="text-xl tracking-tighter">CLUTCH <span className="text-[10px] block opacity-50">SYSTEM v7.5.2</span></h1>
        </div>
        
        <div className="flex-grow overflow-y-auto pt-8 px-4 no-scrollbar">
          <div className="mb-8">
            <p className="text-[10px] text-gray-600 mb-4 px-2 uppercase tracking-[3px]">Navigation</p>
            <div className="flex flex-col gap-2">
              {channels.map((channel) => (
                <button 
                  key={channel.id}
                  onClick={() => setActiveChannel(channel.id)}
                  className={`flex items-center px-4 py-3 text-[11px] transition-all duration-150 border-2 border-transparent hover:border-[#333] ${
                    activeChannel === channel.id ? 'channel-active' : 'text-gray-400'
                  }`}
                >
                  <HashIcon />
                  <span className="ml-3 tracking-widest">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* User Section (Clutch Style) */}
        <div className="bg-[#050505] p-4 border-t-2 border-[#1a1a1a]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 border-2 border-white flex items-center justify-center bg-gray-900">
              <span className="text-[10px]">{session.user.email?.[0].toUpperCase()}</span>
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] truncate leading-none mb-1">{session.user.email?.split('@')[0].toUpperCase()}</span>
              <span className="text-[8px] text-green-500 flex items-center gap-1 uppercase">
                <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> ONLINE
              </span>
            </div>
          </div>
          <div className="flex justify-between items-center text-gray-500">
             <div className="flex gap-2">
                <button className="hover:text-white"><MicIcon /></button>
                <button className="hover:text-white"><HeadphoneIcon /></button>
                <button className="hover:text-white"><CogIcon /></button>
             </div>
             <button onClick={handleLogout} className="hover:text-red-500 transition-colors">
                <LogOutIcon />
             </button>
          </div>
        </div>
      </div>

      {/* Main View */}
      <div className="flex-grow flex flex-col relative z-10">
        <header className="h-20 px-8 flex items-center justify-between border-b-2 border-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <HashIcon />
            <span className="text-sm tracking-[4px] uppercase">{activeChannel}</span>
          </div>
          {showLoginNotification && (
            <div className="bg-white text-black text-[9px] px-4 py-2 border-2 border-white animate-pulse flex items-center gap-3">
              <InfoIcon />
              <span>SECURITY ALERT: NEW LOGIN DETECTED</span>
              <button onClick={() => setShowLoginNotification(false)}><CloseIcon /></button>
            </div>
          )}
        </header>

        <main className="flex-grow p-8 overflow-hidden flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden text-[8px] leading-tight select-none">
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i}>LOADING_SYSTEM_RESOURCES... OK... VERIFYING_ENCRYPTION... OK... CLUTCH_CORE_STABLE...</div>
            ))}
          </div>

          <div className="max-w-3xl w-full border-2 border-[#1a1a1a] p-12 bg-[#050505] relative group">
            <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
            <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
            
            <h2 className="text-3xl mb-8 tracking-tighter">ACCESS GRANTED</h2>
            <p className="text-sm text-gray-500 mb-12 leading-relaxed">
              WELCOME TO THE CLUTCH INTERFACE. ALL SYSTEMS ARE FUNCTIONAL. 
              ENCRYPTION LEVEL 8 (IRON FORTRESS) IS ACTIVE.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-[#1a1a1a] p-4 hover:border-white transition-colors cursor-pointer group">
                <span className="text-[10px] text-gray-600 block mb-2 uppercase">Status</span>
                <span className="text-xs">SYSTEM_STABLE</span>
              </div>
              <div className="border-2 border-[#1a1a1a] p-4 hover:border-white transition-colors cursor-pointer">
                <span className="text-[10px] text-gray-600 block mb-2 uppercase">Uptime</span>
                <span className="text-xs">99.99%</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;