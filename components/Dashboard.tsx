import React, { useState, useEffect, useRef } from 'react';
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

  // Chat State
  const [activeChatFriend, setActiveChatFriend] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    setProfile(data);
    setLoadingProfile(false);
  };

  const fetchFriends = async () => {
    if (!profile) return;
    
    const { data } = await supabase
      .from('friends')
      .select('*, sender:user_id(nickname, avatar_url), receiver:friend_id(nickname, avatar_url)')
      .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);
      
    if (data) {
      setFriends(data);
    }
  };

  const fetchMessages = async (friendId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data);
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

  useEffect(() => {
    if (activeChatFriend && activeChannel === 'dms') {
      fetchMessages(activeChatFriend.id);
      
      // Subscribe to real-time messages
      const subscription = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          setMessages(prev => [...prev, payload.new]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [activeChatFriend, activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatFriend) return;

    const msgContent = newMessage.trim();
    setNewMessage('');

    await supabase.from('messages').insert([
      { sender_id: profile.id, receiver_id: activeChatFriend.id, content: msgContent }
    ]);
  };

  const initiateCall = (type: 'voice' | 'video') => {
    // Placeholder for WebRTC call logic
    alert(`Initializing ${type.toUpperCase()} CONNECTION protocols. WebRTC module required.`);
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
    { id: 'settings', name: 'SETTINGS', type: 'text' },
  ];

  const bgColor = theme === 'blue' ? 'bg-[#050520]' : 'bg-black';
  const sidebarColor = theme === 'blue' ? 'bg-[#0a0a30]' : 'bg-[#0a0a0a]';

  const acceptedFriends = friends.filter(f => f.status === 'accepted').map(f => {
    const isSender = f.user_id === profile.id;
    const friendProfile = isSender ? f.receiver : f.sender;
    return { ...friendProfile, id: isSender ? f.friend_id : f.user_id }; // Return the actual friend's ID
  });

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

      {/* Sidebar */}
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
                  onClick={() => {
                    setActiveChannel(channel.id);
                    if (channel.id !== 'dms') setActiveChatFriend(null);
                  }}
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

        {/* User Section */}
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
                <button onClick={() => setActiveChannel('settings')} className="hover:text-white"><CogIcon /></button>
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
            <span className="text-sm tracking-[4px] uppercase">
              {activeChannel === 'dms' && activeChatFriend ? `COMM: ${activeChatFriend.nickname}` : activeChannel}
            </span>
          </div>
          
          {activeChannel === 'dms' && activeChatFriend && (
            <div className="flex items-center gap-4 text-gray-400">
              <button onClick={() => initiateCall('voice')} className="hover:text-white transition-colors flex items-center gap-2 text-[10px]">
                <HeadphoneIcon /> VOICE LINK
              </button>
              <button onClick={() => initiateCall('video')} className="hover:text-white transition-colors flex items-center gap-2 text-[10px]">
                <UserIcon /> VIDEO LINK
              </button>
            </div>
          )}

          {showLoginNotification && (
            <div className="bg-white text-black text-[9px] px-4 py-2 border-2 border-white animate-pulse flex items-center gap-3 absolute top-4 right-8">
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
                              <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
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
                              <button 
                                onClick={() => { setActiveChannel('dms'); setActiveChatFriend({...otherUser, id: isSender ? friend.friend_id : friend.user_id}); }}
                                className="px-4 py-2 border-2 border-white text-white hover:bg-white hover:text-black transition-colors"
                              >
                                TRANSMIT
                              </button>
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
            <div className="w-full h-full flex gap-6 relative z-10">
              {/* Friends List Sidebar */}
              <div className="w-64 border-2 border-[#1a1a1a] bg-[#050505] p-4 flex flex-col">
                <h3 className="text-[10px] text-gray-500 mb-4 tracking-widest">ACTIVE LINKS</h3>
                <div className="flex-grow overflow-y-auto no-scrollbar flex flex-col gap-2">
                  {acceptedFriends.length === 0 ? (
                    <p className="text-[8px] text-gray-600">NO ACTIVE CONNECTIONS.</p>
                  ) : (
                    acceptedFriends.map(friend => (
                      <button 
                        key={friend.nickname}
                        onClick={() => setActiveChatFriend(friend)}
                        className={`flex items-center gap-3 p-2 border-2 transition-colors w-full text-left ${activeChatFriend?.nickname === friend.nickname ? 'border-white bg-[#1a1a1a]' : 'border-transparent hover:border-[#333]'}`}
                      >
                        <div className="w-8 h-8 border border-[#333]">
                          <img src={friend.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-xs truncate">{friend.nickname}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-grow border-2 border-[#1a1a1a] bg-[#050505] relative flex flex-col">
                <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
                <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
                
                {activeChatFriend ? (
                  <>
                    <div className="flex-grow overflow-y-auto p-6 no-scrollbar flex flex-col gap-4">
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                          <p className="text-[10px] mb-2">COMMUNICATION LINK ESTABLISHED</p>
                          <p className="text-xs text-white">BEGIN TRANSMISSION WITH {activeChatFriend.nickname}</p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const isMine = msg.sender_id === profile.id;
                          return (
                            <div key={idx} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                              <span className="text-[8px] text-gray-600 mb-1">
                                {isMine ? 'YOU' : activeChatFriend.nickname} [{new Date(msg.created_at).toLocaleTimeString()}]
                              </span>
                              <div className={`p-3 max-w-[80%] text-xs leading-relaxed ${isMine ? 'bg-white text-black' : 'border-2 border-[#333] text-white'}`}>
                                {msg.content}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t-2 border-[#1a1a1a] flex gap-4">
                      <input 
                        type="text" 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="ENTER_MESSAGE..."
                        className="flex-grow p-4 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white text-xs"
                      />
                      <button type="submit" className="px-6 py-4 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors">
                        SEND
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600">
                    <HashIcon />
                    <p className="text-[10px] mt-4 tracking-widest">SELECT A CONNECTION TO COMMUNICATE</p>
                  </div>
                )}
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

          {activeChannel === 'settings' && (
            <div className="max-w-4xl w-full h-full flex flex-col relative z-10">
              <div className="border-2 border-[#1a1a1a] p-8 bg-[#050505] relative flex flex-col gap-8">
                <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
                <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
                
                <h2 className="text-2xl tracking-tighter border-b-2 border-[#1a1a1a] pb-4">SYSTEM CONFIGURATION</h2>
                
                <div className="flex gap-8 items-start">
                  <div className="w-32 h-32 border-4 border-white p-1 bg-[#111]">
                    <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <span className="text-[10px] text-gray-500 block mb-1">CALLSIGN</span>
                      <span className="text-xl">{profile.nickname}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block mb-1">NETWORK ID</span>
                      <span className="text-xs text-gray-400">{profile.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block mb-1">SECURITY CLEARANCE</span>
                      <span className="text-xs text-green-500">LEVEL 8 (IRON FORTRESS)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 border-t-2 border-[#1a1a1a] pt-8">
                  <h3 className="text-lg mb-4 text-red-500">DANGER ZONE</h3>
                  <button onClick={handleLogout} className="px-6 py-4 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-colors text-xs">
                    TERMINATE SESSION (LOG OUT)
                  </button>
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