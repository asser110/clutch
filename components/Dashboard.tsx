import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import WebCLI from './WebCLI';
import { 
  InfoIcon, 
  CloseIcon, 
  HashIcon, 
  UserIcon, 
  PlusIcon, 
  CompassIcon, 
  MicIcon, 
  HeadphoneIcon, 
  CogIcon,
  LogOutIcon
} from './icons';
import { supabase } from '../lib/supabaseClient';

interface DashboardProps {
  session: Session;
  theme: 'blue' | 'black';
}

const Dashboard: React.FC<DashboardProps> = ({ session, theme }) => {
  const [showLoginNotification, setShowLoginNotification] = useState(false);
  const [activeChannel, setActiveChannel] = useState('terminal');

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

  const servers = [
    { id: 'clutch', name: 'Clutch OS', color: 'bg-indigo-500', initial: 'C' },
    { id: 'alpha', name: 'Alpha Core', color: 'bg-emerald-500', initial: 'A' },
    { id: 'nexus', name: 'Nexus Hub', color: 'bg-rose-500', initial: 'N' },
  ];

  const channels = [
    { id: 'terminal', name: 'system-terminal', type: 'text' },
    { id: 'logs', name: 'audit-logs', type: 'text' },
    { id: 'alerts', name: 'security-alerts', type: 'text' },
    { id: 'voice', name: 'Vocal Comms', type: 'voice' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#313338] text-[#dbdee1] font-sans">
      <style>{`
        @font-face {
          font-family: 'DiscordSans';
          src: url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        }
        .font-discord { font-family: 'Inter', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Servers Sidebar */}
      <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 gap-2 no-scrollbar overflow-y-auto shrink-0">
        <div className="group relative flex items-center justify-center w-12 h-12 bg-[#313338] hover:bg-[#5865f2] rounded-[24px] hover:rounded-[16px] transition-all duration-200 cursor-pointer text-[#dbdee1] hover:text-white mb-2">
          <div className="absolute left-0 w-1 h-2 bg-white rounded-r-full group-hover:h-5 transition-all duration-200" />
          <span className="text-xl font-bold">C</span>
        </div>
        
        <div className="w-8 h-[2px] bg-[#35363c] rounded-full mb-2" />

        {servers.slice(1).map((server) => (
          <div key={server.id} className="group relative flex items-center justify-center w-12 h-12 bg-[#313338] hover:bg-[#5865f2] rounded-[24px] hover:rounded-[16px] transition-all duration-200 cursor-pointer mb-2">
            <div className="absolute left-0 w-1 h-0 bg-white rounded-r-full group-hover:h-5 transition-all duration-200" />
            <span className="text-lg font-semibold">{server.initial}</span>
          </div>
        ))}

        <div className="flex items-center justify-center w-12 h-12 bg-[#313338] hover:bg-[#23a559] rounded-[24px] hover:rounded-[16px] transition-all duration-200 cursor-pointer text-[#23a559] hover:text-white mt-auto">
          <PlusIcon />
        </div>
        <div className="flex items-center justify-center w-12 h-12 bg-[#313338] hover:bg-[#23a559] rounded-[24px] hover:rounded-[16px] transition-all duration-200 cursor-pointer text-[#23a559] hover:text-white mt-2">
          <CompassIcon />
        </div>
      </div>

      {/* Channels Sidebar */}
      <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0">
        <div className="h-12 px-4 flex items-center shadow-sm border-b border-[#1e1f22] font-bold text-white hover:bg-[#35373c] cursor-pointer transition-colors truncate">
          CLUTCH OS
        </div>
        
        <div className="flex-grow overflow-y-auto pt-4 px-2 no-scrollbar">
          <div className="mb-4">
            <div className="flex items-center px-2 py-1 text-[#949ba4] hover:text-[#dbdee1] transition-colors cursor-pointer text-xs font-semibold uppercase tracking-wider">
              <span className="mr-1">▼</span> CORE SYSTEMS
            </div>
            <div className="mt-1 flex flex-col gap-[2px]">
              {channels.map((channel) => (
                <div 
                  key={channel.id}
                  onClick={() => setActiveChannel(channel.id)}
                  className={`group flex items-center px-2 py-1 rounded-[4px] cursor-pointer transition-colors ${
                    activeChannel === channel.id ? 'bg-[#3f4147] text-white' : 'text-[#949ba4] hover:bg-[#35373c] hover:text-[#dbdee1]'
                  }`}
                >
                  {channel.type === 'text' ? <HashIcon /> : <span className="mr-1">🔊</span>}
                  <span className="ml-2 font-medium">{channel.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="h-[52px] bg-[#232428] px-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 hover:bg-[#3f4147] p-1 pr-2 rounded-[4px] cursor-pointer group">
            <div className="relative w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-tr from-[#5865f2] to-[#eb459e] flex items-center justify-center text-white text-[10px]">USER</div>
               <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#23a559] border-[3px] border-[#232428] rounded-full" />
            </div>
            <div className="flex flex-col truncate w-24">
              <span className="text-sm font-semibold text-white leading-tight truncate">{session.user.email?.split('@')[0]}</span>
              <span className="text-[12px] text-[#949ba4] leading-tight truncate">Online</span>
            </div>
          </div>
          <div className="flex items-center text-[#b5bac1]">
            <button className="p-1 hover:bg-[#3f4147] rounded-[4px] transition-colors"><MicIcon /></button>
            <button className="p-1 hover:bg-[#3f4147] rounded-[4px] transition-colors"><HeadphoneIcon /></button>
            <button className="p-1 hover:bg-[#3f4147] rounded-[4px] transition-colors"><CogIcon /></button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col bg-[#313338] relative">
        <header className="h-12 px-4 flex items-center shadow-sm border-b border-[#1e1f22] shrink-0">
          <div className="flex items-center gap-2 text-[#949ba4]">
            <HashIcon />
            <span className="font-bold text-white">{channels.find(c => c.id === activeChannel)?.name}</span>
          </div>
          <div className="ml-auto flex items-center gap-4 text-[#b5bac1]">
             <button onClick={handleLogout} className="hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
                <LogOutIcon />
                <span>Sign Out</span>
             </button>
          </div>
        </header>

        <main className="flex-grow overflow-hidden flex flex-col">
          {activeChannel === 'terminal' ? (
            <div className="flex-grow bg-black m-4 rounded-lg overflow-hidden border border-[#1e1f22] shadow-2xl relative">
              <WebCLI session={session} />
              
              {showLoginNotification && (
                <div className="absolute top-4 left-4 right-4 bg-[#1e1f22] border border-[#2b2d31] p-3 rounded-md flex items-center justify-between z-20 animate-slide-down shadow-xl">
                  <div className="flex items-center">
                    <InfoIcon />
                    <p className="text-xs ml-3 text-[#dbdee1]">
                      <strong className="text-white">Security:</strong> New login detected. Notification sent to <strong className="text-white">{session.user.email}</strong>.
                    </p>
                  </div>
                  <button onClick={() => setShowLoginNotification(false)} className="text-[#949ba4] hover:text-white transition-colors">
                    <CloseIcon />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center flex-col gap-4">
               <div className="w-16 h-16 bg-[#313338] border border-[#444] rounded-full flex items-center justify-center opacity-50">
                  <HashIcon />
               </div>
               <p className="text-[#949ba4] font-medium uppercase tracking-widest text-sm">Access Denied: Permission Level Required</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;