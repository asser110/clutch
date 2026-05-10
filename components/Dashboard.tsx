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
  const [friendTab, setFriendTab] = useState<'friends' | 'add'>('friends');
  const [friendFilter, setFriendFilter] = useState<'all' | 'online' | 'offline'>('all');

  const [nicknameInput, setNicknameInput] = useState('');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'my-account' | 'voice-video' | 'notifications' | 'privacy' | 'appearance'>('my-account');
  const [audioSettings, setAudioSettings] = useState({ microphone: true, headphones: true, systemSounds: true, inputVolume: 100, outputVolume: 100, ringtone: true });
  const [messagingSettings, setMessagingSettings] = useState({ notifications: true, readReceipts: true, autoScroll: true, compactMode: false });
  const [privacySettings, setPrivacySettings] = useState({ showOnlineStatus: true, allowDMs: true, showActivity: false });
  const [appearanceSettings, setAppearanceSettings] = useState({ theme: 'dark', fontSize: 'medium' });
  const [notificationSettings, setNotificationSettings] = useState({ desktopNotifications: true, soundNotifications: true, mentionOnly: false });
  const [voiceSettings, setVoiceSettings] = useState({ inputDevice: 'default', outputDevice: 'default', echoCancellation: true, noiseSuppression: true });
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [isCallRinging, setIsCallRinging] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneOscRef = useRef<OscillatorNode | null>(null);

  // Chat State
  const [activeChatFriend, setActiveChatFriend] = useState<any>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recentMessages, setRecentMessages] = useState<any>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const activeGroupDetails = groups.find(group => group.id === activeGroup) || null;

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
      .select('*, sender:user_id(nickname, avatar_url, online_status), receiver:friend_id(nickname, avatar_url, online_status)')
      .or(`user_id.eq.${profile.id},friend_id.eq.${profile.id}`);
      
    if (data) {
      setFriends(data);
      // Fetch recent messages for each friend
      const messagesData: any = {};
      for (const friend of data) {
        if (friend.status === 'accepted') {
          const isSender = friend.user_id === profile.id;
          const friendId = isSender ? friend.friend_id : friend.user_id;
          
          const { data: msgs } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${profile.id})`)
            .order('created_at', { ascending: false })
            .limit(1);
            
          if (msgs && msgs.length > 0) {
            messagesData[friendId] = msgs[0];
          }
        }
      }
      setRecentMessages(messagesData);
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
      // Set online status to true
      supabase.from('profiles').update({ online_status: true }).eq('id', profile.id);
      
      // Subscribe to profile changes for online status updates
      const profileSubscription = supabase
        .channel('profiles')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles'
          },
          (payload) => {
            // Update friends list when a friend's online status changes
            setFriends(prev => prev.map(friend => {
              const isSender = friend.user_id === profile.id;
              const friendId = isSender ? friend.friend_id : friend.user_id;
              if (friendId === payload.new.id) {
                const updatedFriend = { ...friend };
                if (isSender) {
                  updatedFriend.receiver = { ...updatedFriend.receiver, ...payload.new };
                } else {
                  updatedFriend.sender = { ...updatedFriend.sender, ...payload.new };
                }
                return updatedFriend;
              }
              return friend;
            }));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(profileSubscription);
      };
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      setNicknameInput(profile.nickname || '');
    }
  }, [profile]);

  useEffect(() => {
    if (activeChatFriend && activeChannel === 'dms') {
      fetchMessages(activeChatFriend.id);
      setMessageError(null);
      
      // Subscribe to real-time messages with proper filtering
      const subscription = supabase
        .channel(`messages:${profile.id}:${activeChatFriend.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `or(and(sender_id.eq.${profile.id},receiver_id.eq.${activeChatFriend.id}),and(sender_id.eq.${activeChatFriend.id},receiver_id.eq.${profile.id}))`
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new]);
            // Update recent messages
            setRecentMessages(prev => ({
              ...prev,
              [payload.new.sender_id === profile.id ? payload.new.receiver_id : payload.new.sender_id]: payload.new
            }));
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [activeChatFriend, activeChannel, profile?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (videoRef.current && localStream && isVideoCallActive) {
      videoRef.current.srcObject = localStream;
      videoRef.current.play().catch(() => null);
    }
  }, [localStream, isVideoCallActive]);

  const handleLogout = async () => {
    // Set online status to false before logging out
    if (profile) {
      await supabase.from('profiles').update({ online_status: false }).eq('id', profile.id);
    }
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

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSettingsSaving(true);
    setSettingsMessage(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ nickname: nicknameInput.trim() })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) {
        setSettingsMessage('Failed to update settings.');
      } else {
        setProfile(data);
        setSettingsMessage('Settings updated successfully.');
      }
    } catch (err) {
      setSettingsMessage('Unexpected error while updating settings.');
      console.error(err);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatFriend) return;

    const msgContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);
    setMessageError(null);

    try {
      const { data, error } = await supabase.from('messages').insert([
        { sender_id: profile.id, receiver_id: activeChatFriend.id, content: msgContent }
      ]).select();

      if (error) {
        setMessageError('Failed to send message. Please try again.');
        setNewMessage(msgContent); // Restore message if sending fails
        console.error('Message send error:', error);
      } else if (data && data.length > 0) {
        setMessages(prev => [...prev, data[0]]);
        setRecentMessages(prev => ({
          ...prev,
          [activeChatFriend.id]: data[0]
        }));
      }
    } catch (err: any) {
      setMessageError('Error sending message. Check your connection.');
      setNewMessage(msgContent); // Restore message if sending fails
      console.error('Send message exception:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const createGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;
    const newGroup = {
      id: `${Date.now()}`,
      name: groupNameInput.trim(),
      members: [profile.id],
      createdAt: new Date().toISOString()
    };
    setGroups(prev => [...prev, newGroup]);
    setGroupNameInput('');
    setIsCreatingGroup(false);
    setActiveChannel('dms');
    setActiveGroup(newGroup.id);
    setActiveChatFriend(null);
  };

  const stopLocalStream = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setIsVoiceCallActive(false);
    setIsVideoCallActive(false);
    setIsCallConnected(false);
    setCallType(null);
    stopRingtone();
  };

  const playRingtone = () => {
    if (!audioSettings.ringtone || !window.AudioContext) return;
    try {
      const audioCtx = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = audioCtx;
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 440;
      gain.gain.value = 0.2;
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      ringtoneOscRef.current = oscillator;
    } catch (err) {
      console.error('Failed to start ringtone', err);
    }
  };

  const stopRingtone = () => {
    if (ringtoneOscRef.current) {
      ringtoneOscRef.current.stop();
      ringtoneOscRef.current.disconnect();
      ringtoneOscRef.current = null;
    }
  };

  const acceptCall = () => {
    setIsCallRinging(false);
    setIsCallConnected(true);
    setIsVoiceCallActive(callType === 'voice');
    setIsVideoCallActive(callType === 'video');
    stopRingtone();
  };

  const declineCall = () => {
    setIsCallRinging(false);
    setCallType(null);
    stopRingtone();
    stopLocalStream();
  };

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessageError('Media devices are not supported by this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        ...(type === 'video' ? { video: true } : {})
      });
      setLocalStream(stream);
      setIsMuted(false);
      setIsVideoMuted(false);
      setMessageError(null);
      setCallType(type);
      setIsCallRinging(true);
      setIsCallConnected(false);
      playRingtone();
    } catch (err: any) {
      setMessageError(`Failed to start ${type} chat. Allow camera / microphone access.`);
      console.error(err);
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Microphone access is not available in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVoiceUrl(url);
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingError(null);
    } catch (err: any) {
      setRecordingError('Unable to access microphone. Please check permissions.');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      setIsRecording(false);
    }
  };

  const sendVoiceNote = async () => {
    if (!recordedVoiceUrl || !activeChatFriend) {
      setMessageError('Record a voice note first before sending.');
      return;
    }

    const { data, error } = await supabase.from('messages').insert([
      { sender_id: profile.id, receiver_id: activeChatFriend.id, content: '[VOICE NOTE SENT]' }
    ]).select();

    if (error) {
      setMessageError('Failed to send voice note.');
      console.error(error);
    } else if (data && data.length > 0) {
      setMessages(prev => [...prev, data[0]]);
      setRecentMessages(prev => ({
        ...prev,
        [activeChatFriend.id]: data[0]
      }));
      setRecordedVoiceUrl(null);
    }
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

  const acceptedFriends = friends.filter(f => f.status === 'accepted').map(f => {
    const isSender = f.user_id === profile.id;
    const friendProfile = isSender ? f.receiver : f.sender;
    return { ...friendProfile, id: isSender ? f.friend_id : f.user_id }; // Return the actual friend's ID
  });

  const filteredAcceptedFriends = acceptedFriends.filter(friend => {
    if (friendFilter === 'all') return true;
    return friendFilter === 'online' ? friend.online_status : !friend.online_status;
  });

  const pendingFriends = friends.filter(f => f.status === 'pending');

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
              {activeChannel === 'dms'
                ? activeGroupDetails
                  ? `GROUP: ${activeGroupDetails.name}`
                  : activeChatFriend
                    ? `COMM: ${activeChatFriend.nickname}`
                    : 'DIRECT MESSAGES'
                : activeChannel}
            </span>
          </div>
          
          {activeChannel === 'dms' && (
            <div className="flex items-center gap-4 text-gray-400">
              <button onClick={() => initiateCall('voice')} className="hover:text-white transition-colors flex items-center gap-2 text-[10px]">
                <HeadphoneIcon /> VOICE LINK
              </button>
              <button onClick={() => initiateCall('video')} className="hover:text-white transition-colors flex items-center gap-2 text-[10px]">
                <UserIcon /> VIDEO LINK
              </button>
              {localStream && (
                <button onClick={stopLocalStream} className="hover:text-white transition-colors text-[10px] border border-[#333] px-3 py-2">
                  END CALL
                </button>
              )}
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
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setFriendTab('friends')}
                    className={`px-4 py-3 text-[10px] tracking-widest border-2 transition-colors ${friendTab === 'friends' ? 'bg-white text-black border-white' : 'border-transparent text-gray-400 hover:border-[#333]'}`}
                  >
                    FRIENDS
                  </button>
                  <button
                    onClick={() => setFriendTab('add')}
                    className={`px-4 py-3 text-[10px] tracking-widest border-2 transition-colors ${friendTab === 'add' ? 'bg-white text-black border-white' : 'border-transparent text-gray-400 hover:border-[#333]'}`}
                  >
                    ADD FRIEND
                  </button>
                </div>

                {friendTab === 'add' ? (
                  <>
                    <h3 className="text-lg mb-4">SEND FRIEND REQUEST</h3>
                    <form onSubmit={handleAddFriend} className="flex gap-4 flex-wrap">
                      <input 
                        type="text" 
                        value={friendInput}
                        onChange={(e) => setFriendInput(e.target.value)}
                        placeholder="ENTER_NICKNAME..."
                        className="flex-grow min-w-[240px] p-4 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white text-xs"
                      />
                      <button type="submit" className="px-6 py-4 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors">
                        SEND REQUEST
                      </button>
                    </form>
                    {friendError && <p className="text-red-500 text-[10px] mt-3">{friendError}</p>}
                    {friendSuccess && <p className="text-green-500 text-[10px] mt-3">{friendSuccess}</p>}
                  </>
                ) : (
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] items-center mb-6">
                    <div>
                      <h3 className="text-lg">ACTIVE CONNECTIONS</h3>
                      <p className="text-[10px] text-gray-500">Filter by online status or review pending requests.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['all', 'online', 'offline'] as const).map(option => (
                        <button
                          key={option}
                          onClick={() => setFriendFilter(option)}
                          className={`px-4 py-2 text-[10px] tracking-widest border-2 transition-colors ${friendFilter === option ? 'bg-white text-black border-white' : 'border-transparent text-gray-400 hover:border-[#333]'}`}
                        >
                          {option.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-grow overflow-y-auto no-scrollbar border-2 border-[#1a1a1a] bg-[#050505] p-6 relative">
                <h3 className="text-lg mb-6 border-b-2 border-[#1a1a1a] pb-4">NETWORK CONNECTIONS</h3>
                
                {filteredAcceptedFriends.length === 0 && pendingFriends.length === 0 ? (
                  <div className="text-[10px] text-gray-500 text-center py-10">NO CONNECTIONS FOUND.</div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {filteredAcceptedFriends.length > 0 ? (
                      <div className="space-y-4">
                        {filteredAcceptedFriends.map(friend => (
                          <div key={friend.id} className="flex items-center justify-between border-2 border-[#1a1a1a] p-4 hover:border-[#333] transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 border-2 border-[#333] p-1">
                                <img src={friend.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm mb-1">{friend.nickname}</span>
                                <span className={`text-[8px] ${friend.online_status ? 'text-green-500' : 'text-gray-500'}`}>
                                  {friend.online_status ? 'ONLINE' : 'OFFLINE'}
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => { setActiveChannel('dms'); setActiveChatFriend(friend); }}
                              className="px-4 py-2 border-2 border-white text-white hover:bg-white hover:text-black transition-colors text-[10px]"
                            >
                              TRANSMIT
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-gray-500">NO CONNECTIONS MATCH THIS FILTER.</div>
                    )}

                    {pendingFriends.length > 0 && (
                      <div className="mt-6 border-t border-[#1a1a1a] pt-6">
                        <h4 className="text-sm mb-3">PENDING REQUESTS</h4>
                        <div className="space-y-4">
                          {pendingFriends.map(friend => {
                            const isSender = friend.user_id === profile.id;
                            const otherUser = isSender ? friend.receiver : friend.sender;
                            return (
                              <div key={friend.id} className="flex items-center justify-between border-2 border-[#1a1a1a] p-4 hover:border-[#333] transition-colors">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 border-2 border-[#333] p-1">
                                    <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <span className="text-sm mb-1 block">{otherUser.nickname}</span>
                                    <span className="text-[8px] text-yellow-500">PENDING</span>
                                  </div>
                                </div>
                                {!isSender ? (
                                  <button 
                                    onClick={() => handleAcceptFriend(friend.id)}
                                    className="px-4 py-2 bg-green-900 border-2 border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors text-[10px]"
                                  >
                                    ACCEPT
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-gray-500">REQUEST SENT</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeChannel === 'dms' && (
            <div className="w-full h-full flex gap-6 relative z-10">
              {/* Friends + Groups Sidebar */}
              <div className="w-80 border-2 border-[#1a1a1a] bg-[#050505] p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[10px] text-gray-500 tracking-widest">DIRECT MESSAGES</h3>
                    <p className="text-[8px] text-gray-600">Groups and friends appear here.</p>
                  </div>
                  <button
                    onClick={() => setIsCreatingGroup(prev => !prev)}
                    className="flex items-center gap-2 text-[10px] border-2 border-transparent hover:border-[#333] px-3 py-2"
                  >
                    <PlusIcon /> GROUP
                  </button>
                </div>
                {isCreatingGroup && (
                  <form onSubmit={createGroup} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      placeholder="NEW GROUP NAME"
                      className="flex-grow p-3 bg-[#111] border-2 border-[#333] text-white text-xs focus:outline-none focus:border-white"
                    />
                    <button type="submit" className="px-3 py-3 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors">
                      CREATE
                    </button>
                  </form>
                )}

                <div className="flex-grow overflow-y-auto no-scrollbar flex flex-col gap-2">
                  {groups.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[8px] uppercase text-gray-500 tracking-[3px]">Groups</div>
                      {groups.map(group => (
                        <button
                          key={group.id}
                          onClick={() => {
                            setActiveGroup(group.id);
                            setActiveChatFriend(null);
                          }}
                          className={`flex items-center justify-between gap-3 p-3 border-2 transition-colors w-full text-left ${activeGroup === group.id ? 'border-white bg-[#1a1a1a]' : 'border-transparent hover:border-[#333]'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#111] border border-[#333] flex items-center justify-center text-[10px] uppercase">
                              G
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs truncate">{group.name}</span>
                              <span className="text-[8px] text-gray-500 uppercase">GROUP</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-[8px] uppercase text-gray-500 tracking-[3px]">Contacts</div>
                    {acceptedFriends.length === 0 ? (
                      <p className="text-[8px] text-gray-600">NO ACTIVE CONNECTIONS.</p>
                    ) : (
                      acceptedFriends.map(friend => (
                        <button
                          key={friend.nickname}
                          onClick={() => {
                            setActiveChatFriend(friend);
                            setActiveGroup(null);
                          }}
                          className={`flex items-center justify-between gap-3 p-3 border-2 transition-colors w-full text-left ${activeChatFriend?.nickname === friend.nickname ? 'border-white bg-[#1a1a1a]' : 'border-transparent hover:border-[#333]'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-9 h-9 border border-[#333]">
                                <img src={friend.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 border border-[#050505] rounded-full ${friend.online_status ? 'bg-green-500' : 'bg-gray-500'}`} />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs truncate">{friend.nickname}</span>
                              <span className="text-[8px] text-gray-500 uppercase">DM</span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-grow border-2 border-[#1a1a1a] bg-[#050505] relative flex flex-col">
                <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
                <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
                
                {activeGroupDetails ? (
                  <>
                    <div className="flex-grow overflow-y-auto p-6 no-scrollbar flex flex-col gap-4">
                      <div className="h-full flex flex-col items-center justify-center text-gray-600">
                        <p className="text-[10px] mb-2">GROUP CHANNEL READY</p>
                        <p className="text-xs text-white">{activeGroupDetails.name} is assembled.</p>
                        <p className="text-[10px] mt-4 text-gray-500">Use the group list to switch between squads in the DMs tab.</p>
                      </div>
                    </div>
                  </>
                ) : activeChatFriend ? (
                  <>
                    <div className="flex-grow overflow-y-auto p-6 no-scrollbar flex flex-col gap-4">
                      {localStream && isCallRinging && (
                        <div className="w-full border-2 border-[#333] p-4 bg-[#080808] relative">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                              <div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">CALLING {activeChatFriend.nickname}</span>
                                <p className="text-xs text-white mt-1">{callType === 'video' ? 'VIDEO CALL' : 'VOICE CALL'} · RINGING</p>
                              </div>
                            </div>
                            <button onClick={stopLocalStream} className="text-red-500 hover:text-red-400 transition-colors">
                              <CloseIcon />
                            </button>
                          </div>

                          <div className="flex items-center justify-center gap-4 pb-4">
                            <button
                              type="button"
                              onClick={stopLocalStream}
                              className="px-5 py-3 rounded-full bg-red-500 border-2 border-red-500 text-white hover:bg-red-600 transition-colors text-[10px] uppercase tracking-[2px]"
                            >
                              Cancel Call
                            </button>
                            <button
                              type="button"
                              onClick={acceptCall}
                              className="px-5 py-3 rounded-full bg-white border-2 border-white text-black hover:bg-gray-200 transition-colors text-[10px] uppercase tracking-[2px]"
                            >
                              Connect
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-[10px] text-gray-400">
                            <div className="p-3 border border-[#333] rounded">Microphone: {voiceSettings.echoCancellation ? 'On' : 'Off'}</div>
                            <div className="p-3 border border-[#333] rounded">Noise Suppression: {voiceSettings.noiseSuppression ? 'On' : 'Off'}</div>
                          </div>
                        </div>
                      )}

                      {localStream && (isCallConnected || isVoiceCallActive || isVideoCallActive) && (
                        <div className="w-full border-2 border-[#333] p-4 bg-[#080808] relative">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-[10px] text-gray-400 uppercase tracking-widest">
                                {(isVideoCallActive || callType === 'video') ? 'VIDEO CALL' : 'VOICE CALL'} WITH {activeChatFriend.nickname}
                              </span>
                            </div>
                            <button onClick={stopLocalStream} className="text-red-500 hover:text-red-400 transition-colors">
                              <CloseIcon />
                            </button>
                          </div>

                          {isVideoCallActive && (
                            <div className="relative mb-4">
                              <video ref={videoRef} className="w-full h-48 bg-black rounded border border-[#333]" autoPlay muted playsInline />
                              <div className="absolute bottom-2 right-2 w-20 h-20 border-2 border-white rounded">
                                <video className="w-full h-full object-cover rounded" autoPlay muted playsInline />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-center gap-4">
                            <button
                              onClick={() => setIsMuted(!isMuted)}
                              className={`p-3 rounded-full border-2 transition-colors ${isMuted ? 'bg-red-500 border-red-500 text-white' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white'}`}
                            >
                              <MicIcon />
                            </button>
                            {isVideoCallActive && (
                              <button
                                onClick={() => setIsVideoMuted(!isVideoMuted)}
                                className={`p-3 rounded-full border-2 transition-colors ${isVideoMuted ? 'bg-red-500 border-red-500 text-white' : 'bg-[#1a1a1a] border-[#333] text-gray-400 hover:text-white'}`}
                              >
                                <UserIcon />
                              </button>
                            )}
                            <button
                              onClick={stopLocalStream}
                              className="p-3 rounded-full bg-red-500 border-2 border-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                              <CloseIcon />
                            </button>
                          </div>
                        </div>
                      )}

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
                    <form onSubmit={handleSendMessage} className="p-4 border-t-2 border-[#1a1a1a] flex flex-col gap-4">
                      {messageError && (
                        <div className="text-red-500 text-[9px] p-2 border-l-2 border-red-500">
                          {messageError}
                        </div>
                      )}
                      <div className="flex gap-4">
                        <input 
                          type="text" 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="ENTER_MESSAGE..."
                          disabled={sendingMessage}
                          className="flex-grow p-4 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white text-xs disabled:opacity-50"
                        />
                        <button 
                          type="submit" 
                          disabled={sendingMessage || !newMessage.trim()}
                          className="px-6 py-4 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingMessage ? 'SENDING...' : 'SEND'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`px-4 py-3 text-[10px] border-2 transition-colors ${isRecording ? 'bg-red-500 text-black border-red-500' : 'bg-white text-black hover:bg-gray-200'}`}
                        >
                          {isRecording ? 'STOP RECORDING' : 'RECORD VOICE'}
                        </button>
                        <button
                          type="button"
                          onClick={sendVoiceNote}
                          disabled={!recordedVoiceUrl}
                          className="px-4 py-3 text-[10px] border-2 bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          SEND VOICE NOTE
                        </button>
                        {recordedVoiceUrl && (
                          <audio controls src={recordedVoiceUrl} className="w-full" />
                        )}
                      </div>
                      {recordingError && <p className="text-red-500 text-[9px]">{recordingError}</p>}
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
            <div className="w-full h-full flex relative z-10">
              {/* Settings Sidebar */}
              <div className="w-64 border-r-2 border-[#1a1a1a] bg-[#0a0a0a] p-4">
                <h3 className="text-[10px] text-gray-500 mb-6 tracking-widest">SETTINGS</h3>
                <div className="space-y-2">
                  {[
                    { id: 'my-account', label: 'My Account' },
                    { id: 'voice-video', label: 'Voice & Video' },
                    { id: 'notifications', label: 'Notifications' },
                    { id: 'privacy', label: 'Privacy & Safety' },
                    { id: 'appearance', label: 'Appearance' },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSettingsTab(item.id as typeof settingsTab)}
                      className={`w-full text-left px-3 py-3 text-[10px] uppercase tracking-[2px] transition-colors rounded ${settingsTab === item.id ? 'bg-white text-black border border-white' : 'border border-transparent text-gray-400 hover:border-[#333] hover:text-white'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings Content */}
              <div className="flex-grow p-8 overflow-y-auto">
                <div className="max-w-4xl">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h2 className="text-2xl tracking-tighter">SYSTEM CONFIGURATION</h2>
                      <p className="text-[10px] text-gray-500 mt-2">Adjust account, voice, notifications, privacy, and appearance preferences.</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[3px] text-gray-500">{settingsTab.replace('-', ' ').toUpperCase()}</span>
                  </div>

                  {settingsTab === 'my-account' && (
                    <>
                      <div className="border-2 border-[#1a1a1a] p-6 bg-[#111] mb-6">
                        <h3 className="text-lg mb-4">MY ACCOUNT</h3>
                        <form onSubmit={handleUpdateSettings} className="flex flex-col gap-4">
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="w-16 h-16 border-2 border-white p-1">
                              <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-[220px]">
                              <label className="text-[10px] text-gray-400 uppercase tracking-[3px] mb-2 block">CALLSIGN</label>
                              <input
                                type="text"
                                value={nicknameInput}
                                onChange={(e) => setNicknameInput(e.target.value)}
                                className="w-full p-3 bg-[#050505] border-2 border-[#333] text-white focus:outline-none focus:border-white text-xs"
                              />
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={settingsSaving || !nicknameInput.trim()}
                            className="w-full px-6 py-3 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {settingsSaving ? 'UPDATING...' : 'SAVE CALLSIGN'}
                          </button>
                          {settingsMessage && (
                            <p className="text-[10px] text-green-500">{settingsMessage}</p>
                          )}
                        </form>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="border-2 border-[#1a1a1a] p-6 bg-[#111]">
                          <h3 className="text-lg mb-4">ACCOUNT DETAILS</h3>
                          <p className="text-[10px] text-gray-500 mb-2">User ID</p>
                          <p className="text-xs break-all text-white">{profile.id}</p>
                        </div>
                        <div className="border-2 border-[#1a1a1a] p-6 bg-[#111]">
                          <h3 className="text-lg mb-4">PRESENCE</h3>
                          <p className="text-[10px] text-gray-500 mb-2">Online Status</p>
                          <span className={`px-2 py-1 text-[10px] uppercase tracking-[2px] ${profile.online_status ? 'bg-green-500 text-black' : 'bg-gray-500 text-white'}`}>{profile.online_status ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {settingsTab === 'voice-video' && (
                    <div className="border-2 border-[#1a1a1a] p-6 bg-[#111] mb-6">
                      <h3 className="text-lg mb-4">VOICE & VIDEO</h3>
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-[3px] block mb-2">INPUT DEVICE</label>
                            <select className="w-full p-3 bg-[#050505] border-2 border-[#333] text-white text-xs">
                              <option>Default Microphone</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-[3px] block mb-2">OUTPUT DEVICE</label>
                            <select className="w-full p-3 bg-[#050505] border-2 border-[#333] text-white text-xs">
                              <option>Default Speaker</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-[3px] block mb-2">INPUT VOLUME</label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={audioSettings.inputVolume}
                              onChange={(e) => setAudioSettings(prev => ({ ...prev, inputVolume: parseInt(e.target.value) }))}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-[3px] block mb-2">OUTPUT VOLUME</label>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={audioSettings.outputVolume}
                              onChange={(e) => setAudioSettings(prev => ({ ...prev, outputVolume: parseInt(e.target.value) }))}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          {[
                            { key: 'echoCancellation', label: 'Echo Cancellation', state: voiceSettings.echoCancellation },
                            { key: 'noiseSuppression', label: 'Noise Suppression', state: voiceSettings.noiseSuppression },
                            { key: 'ringtone', label: 'Call Ringtone', state: audioSettings.ringtone }
                          ].map(({ key, label, state }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                if (key === 'ringtone') {
                                  setAudioSettings(prev => ({ ...prev, ringtone: !prev.ringtone }));
                                } else {
                                  setVoiceSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
                                }
                              }}
                              className={`w-full text-left px-4 py-3 border-2 transition-colors text-[10px] ${state ? 'bg-white text-black border-white' : 'border-transparent text-gray-400 hover:border-[#333]'}`}
                            >
                              {label}: {state ? 'ON' : 'OFF'}
                            </button>
                          ))}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={playRingtone}
                            className="px-5 py-3 bg-white text-black text-[10px] uppercase tracking-[2px] hover:bg-gray-200 transition-colors"
                          >
                            Preview Ringtone
                          </button>
                          <button
                            type="button"
                            onClick={() => setAudioSettings(prev => ({ ...prev, ringtone: !prev.ringtone }))}
                            className="px-5 py-3 border-2 border-[#333] text-gray-400 hover:text-white hover:border-white text-[10px] uppercase tracking-[2px] transition-colors"
                          >
                            {audioSettings.ringtone ? 'Disable' : 'Enable'} Ringtone
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {settingsTab === 'notifications' && (
                    <div className="border-2 border-[#1a1a1a] p-6 bg-[#111] mb-6">
                      <h3 className="text-lg mb-4">NOTIFICATIONS</h3>
                      <div className="space-y-3">
                        {[
                          { key: 'desktopNotifications', label: 'Desktop Notifications' },
                          { key: 'soundNotifications', label: 'Sound Notifications' },
                          { key: 'mentionOnly', label: 'Mentions Only' }
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof notificationSettings] }))}
                            className={`w-full text-left px-4 py-3 border-2 transition-colors text-[10px] ${notificationSettings[key as keyof typeof notificationSettings] ? 'bg-white text-black border-white' : 'border-transparent text-gray-400 hover:border-[#333]'}`}
                          >
                            {label}: {notificationSettings[key as keyof typeof notificationSettings] ? 'ENABLED' : 'DISABLED'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsTab === 'privacy' && (
                    <div className="border-2 border-[#1a1a1a] p-6 bg-[#111] mb-6">
                      <h3 className="text-lg mb-4">PRIVACY & SAFETY</h3>
                      <div className="space-y-3">
                        {[
                          { key: 'showOnlineStatus', label: 'Show Online Status' },
                          { key: 'allowDMs', label: 'Allow Direct Messages' },
                          { key: 'showActivity', label: 'Show Activity Status' }
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setPrivacySettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof privacySettings] }))}
                            className={`w-full text-left px-4 py-3 border-2 transition-colors text-[10px] ${privacySettings[key as keyof typeof privacySettings] ? 'bg-white text-black border-white' : 'border-transparent text-gray-400 hover:border-[#333]'}`}
                          >
                            {label}: {privacySettings[key as keyof typeof privacySettings] ? 'ENABLED' : 'DISABLED'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsTab === 'appearance' && (
                    <div className="border-2 border-[#1a1a1a] p-6 bg-[#111] mb-6">
                      <h3 className="text-lg mb-4">APPEARANCE</h3>
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={() => setAppearanceSettings(prev => ({ ...prev, theme: prev.theme === 'dark' ? 'light' : 'dark' }))}
                          className="w-full text-left px-4 py-3 border-2 text-[10px] border-[#333] bg-[#050505] hover:border-white hover:text-white transition-colors"
                        >
                          Theme: {appearanceSettings.theme === 'dark' ? 'Dark' : 'Light'}
                        </button>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-[3px] block mb-2">FONT SIZE</label>
                          <select
                            value={appearanceSettings.fontSize}
                            onChange={(e) => setAppearanceSettings(prev => ({ ...prev, fontSize: e.target.value }))}
                            className="w-full p-3 bg-[#050505] border-2 border-[#333] text-white text-xs"
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Danger Zone */}
                  <div className="border-2 border-red-500 p-6 bg-[#111]">
                    <h3 className="text-lg mb-4 text-red-500">DANGER ZONE</h3>
                    <button onClick={handleLogout} className="px-6 py-4 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-colors text-xs">
                      TERMINATE SESSION (LOG OUT)
                    </button>
                  </div>
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