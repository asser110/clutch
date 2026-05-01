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
  HeadphoneIcon,
  PlusIcon
} from './icons';
import { supabase } from '../lib/supabaseClient';
import Onboarding from './Onboarding';

interface DashboardProps {
  session: Session;
  theme: 'blue' | 'black';
}

const Dashboard: React.FC<DashboardProps> = ({ session, theme }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const [showLoginNotification, setShowLoginNotification] = useState(false);
  const [activeChannel, setActiveChannel] = useState('friends');

  const [friendInput, setFriendInput] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(data);
    setLoadingProfile(false);
  };

  const fetchFriends = async () => {
    if (!profile) return;
    
    // Fetch friends where user is either sender or receiver
    const { data } = await supabase
      .from('friends')
      .select('*, sender:user_id(nickname, avatar_url), receiver:friend_id(nickname, avatar_url)')
      .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);
      
    if (data) {
      setFriends(data);
    }
  };

  useEffect(() => {
    fetchProfile();
    
    const isNewLogin = sessionStorage.getItem('clutch-new-login');
    if (isNewLogin) {
      setShowLoginNotification(true);
      sessionStorage.removeItem('clutch-new-login');
      const timer = setTimeout(() => setShowLoginNotification(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [session.user.id]);

  useEffect(() => {
    if (profile) {
      fetchFriends();
    }
  }, [profile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendError(null);
    setFriendSuccess(null);

    if (friendInput === profile.nickname) {
      setFriendError("CANNOT ADD YOURSELF");
      return;
    }

    // Find user by nickname
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', friendInput)
      .single();

    if (!targetUser) {
      setFriendError("USER NOT FOUND");
      return;
    }

    const { error } = await supabase.from('friends').insert([
      { user_id: profile.id, friend_id: targetUser.id, status: 'pending' }
    ]);

    if (error) {
      if (error.code === '23505') {
        setFriendError("REQUEST ALREADY SENT");
      } else {
        setFriendError("FAILED TO SEND REQUEST");
      }
    } else {
      setFriendSuccess("REQUEST SENT");
      setFriendInput('');
      fetchFriends();
    }
  };

  const handleAcceptFriend = async (friendRecordId: string) => {
    await supabase.from('friends').update({ status: 'accepted' }).eq('id', friendRecordId);
    fetchFriends();
  };

  if (loadingProfile) {
    return (
      <div className="bg-black text-white h-screen w-screen flex items-center justify-center font-press-start">
        LOADING_IDENTITY...
      </div>
    );
  }

  if (!profile) {
    return <Onboarding session={session} onComplete={fetchProfile} theme={theme} />;
  }

  const channels = [
    { id: 'friends', name: 'FRIENDS', type: 'text' },
    { id: 'dms', name: 'DIRECT MESSAGES', type: 'text' },
    { id: 'groups', name: 'GROUPS', type: 'text' },
  ];

  const bgColor = theme === 'blue' ? 'bg-[#050520]' : 'bg-black';
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
        .channel-active {
          background: white;
          color: black;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
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
            <div className="w-10 h-10 border-2 border-white flex items-center justify-center bg-gray-900 p-0.5 relative group cursor-pointer">
              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[10px] truncate leading-none mb-1">{profile.nickname}</span>
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

        <main className="flex-grow p-8 overflow-hidden flex flex-col items-center relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden text-[8px] leading-tight select-none">
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i}>LOADING_SYSTEM_RESOURCES... OK... VERIFYING_ENCRYPTION... OK... CLUTCH_CORE_STABLE...</div>
            ))}
          </div>

          {activeChannel === 'friends' && (
            <div className="max-w-4xl w-full h-full flex flex-col relative z-10">
              <div className="border-2 border-[#1a1a1a] p-6 bg-[#050505] relative mb-8">
                <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
                <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
                
                <h3 className="text-lg mb-4">ADD FRIEND</h3>
                <form onSubmit={handleAddFriend} className="flex gap-4">
                  <input 
                    type="text" 
                    value={friendInput}
                    onChange={(e) => setFriendInput(e.target.value)}
                    placeholder="ENTER_NICKNAME..."
                    className="flex-grow p-4 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white text-xs"
                  />
                  <button type="submit" className="px-6 py-4 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors">
                    SEND REQUEST
                  </button>
                </form>
                {friendError && <p className="text-red-500 text-[10px] mt-3">{friendError}</p>}
                {friendSuccess && <p className="text-green-500 text-[10px] mt-3">{friendSuccess}</p>}
              </div>

              <div className="flex-grow overflow-y-auto no-scrollbar border-2 border-[#1a1a1a] bg-[#050505] p-6 relative">
                <h3 className="text-lg mb-6 border-b-2 border-[#1a1a1a] pb-4">NETWORK CONNECTIONS</h3>
                
                {friends.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center py-10">NO CONNECTIONS FOUND.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {friends.map(friend => {
                      const isSender = friend.user_id === profile.id;
                      const otherUser = isSender ? friend.receiver : friend.sender;
                      
                      return (
                        <div key={friend.id} className="flex items-center justify-between border-2 border-[#1a1a1a] p-4 hover:border-[#333] transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 border-2 border-[#333] p-1">
                              <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm mb-1">{otherUser.nickname}</span>
                              <span className={`text-[8px] ${friend.status === 'accepted' ? 'text-green-500' : 'text-yellow-500'}`}>
                                STATUS: {friend.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-[10px]">
                            {friend.status === 'pending' && !isSender && (
                              <button 
                                onClick={() => handleAcceptFriend(friend.id)}
                                className="px-4 py-2 bg-green-900 border-2 border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors"
                              >
                                ACCEPT
                              </button>
                            )}
                            {friend.status === 'pending' && isSender && (
                              <span className="text-gray-500">PENDING...</span>
                            )}
                            {friend.status === 'accepted' && (
                              <span className="text-green-500">CONNECTED</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeChannel === 'dms' && (
            <div className="max-w-4xl w-full h-full flex flex-col relative z-10">
              <div className="flex-grow border-2 border-[#1a1a1a] p-6 bg-[#050505] relative flex items-center justify-center">
                <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
                <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
                <div className="text-center">
                  <h3 className="text-xl mb-4 text-gray-500">DIRECT MESSAGES</h3>
                  <p className="text-[10px] text-gray-600">SELECT A FRIEND FROM YOUR NETWORK TO START TRANSMITTING.</p>
                </div>
              </div>
            </div>
          )}

          {activeChannel === 'groups' && (
            <div className="max-w-4xl w-full h-full flex flex-col relative z-10">
              <div className="border-2 border-[#1a1a1a] p-6 bg-[#050505] relative mb-8">
                <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
                <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
                
                <h3 className="text-lg mb-4">INITIALIZE NEW SQUAD</h3>
                <form className="flex gap-4" onSubmit={(e) => e.preventDefault()}>
                  <input 
                    type="text" 
                    placeholder="ENTER_SQUAD_DESIGNATION..."
                    className="flex-grow p-4 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white text-xs"
                  />
                  <button type="button" className="px-6 py-4 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors">
                    CREATE SQUAD
                  </button>
                </form>
              </div>

              <div className="flex-grow border-2 border-[#1a1a1a] p-6 bg-[#050505] relative flex flex-col">
                <h3 className="text-lg mb-6 border-b-2 border-[#1a1a1a] pb-4">ACTIVE SQUADS</h3>
                <div className="flex-grow flex items-center justify-center">
                  <p className="text-[10px] text-gray-600">NO ACTIVE SQUADS FOUND. INITIALIZE ONE ABOVE.</p>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default Dashboard;