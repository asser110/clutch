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
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';
import Onboarding from './Onboarding';
import CallOverlay from './CallOverlay';
import VoiceNotePlayer from './VoiceNotePlayer';
import WebCLI from './WebCLI';

interface DashboardProps {
  session: Session;
}

const Dashboard: React.FC<DashboardProps> = ({ session }) => {
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
  const [settingsTab, setSettingsTab] = useState<'my-account' | 'voice-video' | 'notifications' | 'privacy' | 'appearance' | 'terminal'>('my-account');
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
  const [unreadMessages, setUnreadMessages] = useState<{ [key: string]: number }>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringtoneOscRef = useRef<OscillatorNode | null>(null);
  const callStatusListenerRef = useRef<(() => void) | null>(null);

  // Chat State
  const [activeChatFriend, setActiveChatFriend] = useState<any>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [showGroupMemberSelector, setShowGroupMemberSelector] = useState(false);
  const [groupSettings, setGroupSettings] = useState<{ [key: string]: { isMuted: boolean } }>({});
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
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const incomingCallIdRef = useRef<string | null>(null);
  const signalsCleanupRef = useRef<(() => void) | null>(null);
  const activeCallIdRef = useRef<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  // Discord-like Features
  const [typingUsers, setTypingUsers] = useState<{ [key: string]: string[] }>({});
  const [messageReactions, setMessageReactions] = useState<{ [key: string]: { [emoji: string]: string[] } }>({});
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([]);
  const [readReceipts, setReadReceipts] = useState<{ [key: string]: string[] }>({});
  const [userStatuses, setUserStatuses] = useState<{ [key: string]: 'online' | 'away' | 'offline' }>({});
  const [showUserProfile, setShowUserProfile] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [showMemberList, setShowMemberList] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      // Heartbeat interval to keep online status alive
      const setOnline = async () => {
        try {
          await supabase.from('profiles').update({ online_status: true }).eq('id', profile.id);
        } catch (err) {
          console.error('Failed to update online status:', err);
        }
      };
      setOnline();
      const heartbeat = setInterval(setOnline, 30000);
      
      // Set offline when tab is closed (uses cached token for RLS, sync XHR for reliability)
      const handleBeforeUnload = () => {
        const token = accessTokenRef.current;
        if (token && supabaseUrl) {
          try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, false);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('apikey', supabaseAnonKey);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(JSON.stringify({ online_status: false }));
          } catch (e) {
            // Silent fail — best-effort offline status
          }
        }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // Set online again when tab becomes visible
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          setOnline();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      
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
        clearInterval(heartbeat);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibility);
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

  // Keep remote video element updated
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(() => null);
    }
  });

  // Cache access token for beforeunload (sync context — kept fresh via onAuthStateChange)
  const accessTokenRef = useRef<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      accessTokenRef.current = session?.access_token || null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token || null;
    });
    return () => subscription?.unsubscribe();
  }, []);

  // Subscribe to incoming calls via Supabase
  useEffect(() => {
    if (!profile) return;

    const callsSub = supabase
      .channel('incoming-calls')
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'calls',
          filter: 'callee_id=eq.' + profile.id
        },
        async (payload) => {
          const call = payload.new as any;
          if (call.status === 'ringing') {
            if (isCallConnected || isVoiceCallActive || isVideoCallActive) {
              await supabase.from('calls').update({ status: 'declined', ended_at: new Date().toISOString() }).eq('id', call.id);
              return;
            }
            const { data: callerProfile } = await supabase
              .from('profiles')
              .select('id, nickname, avatar_url')
              .eq('id', call.caller_id)
              .single();
            if (callerProfile) {
              setIncomingCall({ ...call, caller: callerProfile });
              incomingCallIdRef.current = call.id;
              setCallType(call.call_type);
              setIsCallRinging(true);
              playRingtone();
              setTimeout(() => {
                setIncomingCall(prev => {
                  if (prev && prev.id === call.id) { declineCall(); }
                  return prev;
                });
              }, 30000);
            }
          }
        }
      )
      .subscribe();

    const statusSub = supabase
      .channel('call-status')
      .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: 'callee_id=eq.' + profile.id
        },
        (payload) => {
          const call = payload.new as any;
          if ((call.status === 'declined' || call.status === 'ended') && incomingCallIdRef.current === call.id) {
            setIsCallRinging(false);
            setIncomingCall(null);
            setCallType(null);
            stopRingtone();
            (async () => await stopLocalStream())();
          }
        }
      )
      .subscribe();

    // Also subscribe to status updates where caller_id matches (so caller knows when callee declines/ends)
    const callerStatusSub = supabase
      .channel('caller-call-status')
      .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: 'caller_id=eq.' + profile.id
        },
        (payload) => {
          const call = payload.new as any;
          if ((call.status === 'declined' || call.status === 'ended') && activeCallIdRef.current === call.id) {
            setIsCallRinging(false);
            setIncomingCall(null);
            stopRingtone();
            (async () => await stopLocalStream())();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(callsSub);
      supabase.removeChannel(statusSub);
      supabase.removeChannel(callerStatusSub);
    };
  }, [profile?.id]);

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

  const handleUnfriend = async (friendUserId: string) => {
    if (!profile) return;
    // Delete the friend record (either direction)
    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${profile.id},friend_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_id.eq.${profile.id})`);
    if (error) console.error('Failed to unfriend:', error);
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
    if (!newMessage.trim()) return;
    
    const msgContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);
    setMessageError(null);

    try {
      if (activeGroup) {
        // Send group message
        const { data, error } = await supabase.from('group_messages').insert([
          { group_id: activeGroup, sender_id: profile.id, content: msgContent }
        ]).select();

        if (error) {
          setMessageError('Failed to send message. Please try again.');
          setNewMessage(msgContent);
          console.error('Group message send error:', error);
        } else if (data && data.length > 0) {
          setMessages(prev => [...prev, data[0]]);
        }
      } else if (activeChatFriend) {
        // Send DM
        const { data, error } = await supabase.from('messages').insert([
          { sender_id: profile.id, receiver_id: activeChatFriend.id, content: msgContent }
        ]).select();

        if (error) {
          setMessageError('Failed to send message. Please try again.');
          setNewMessage(msgContent);
          console.error('Message send error:', error);
        } else if (data && data.length > 0) {
          setMessages(prev => [...prev, data[0]]);
          setRecentMessages(prev => ({
            ...prev,
            [activeChatFriend.id]: data[0]
          }));
        }
      }
    } catch (err: any) {
      setMessageError('Error sending message. Check your connection.');
      setNewMessage(msgContent);
      console.error('Send message exception:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim() || selectedGroupMembers.length === 0) {
      alert('Please enter a group name and select at least one member');
      return;
    }
    
    try {
      const { data: newGroupData, error: groupError } = await supabase
        .from('groups')
        .insert([{ name: groupNameInput.trim(), creator_id: profile.id }])
        .select()
        .single();
      
      if (groupError) throw groupError;
      
      // Add creator as member
      const memberIds = [profile.id, ...selectedGroupMembers];
      const { error: membersError } = await supabase
        .from('group_members')
        .insert(memberIds.map(id => ({ group_id: newGroupData.id, user_id: id })));
      
      if (membersError) throw membersError;
      
      // Add to local state with full details
      const newGroup = {
        ...newGroupData,
        members: memberIds,
        memberDetails: acceptedFriends.filter(f => memberIds.includes(f.id))
      };
      
      setGroups(prev => [...prev, newGroup]);
      setGroupNameInput('');
      setSelectedGroupMembers([]);
      setShowGroupMemberSelector(false);
      setIsCreatingGroup(false);
      setActiveChannel('groups');
      setActiveGroup(newGroup.id);
    } catch (err) {
      console.error('Error creating group:', err);
      alert('Failed to create group');
    }
  };

  const stopLocalStream = async () => {
    // Clean up signal subscription
    if (signalsCleanupRef.current) {
      signalsCleanupRef.current();
      signalsCleanupRef.current = null;
    }
    // Clean up call status listener
    if (callStatusListenerRef.current) {
      callStatusListenerRef.current();
      callStatusListenerRef.current = null;
    }
    // Clean up peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    // Clean up remote stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setIsVoiceCallActive(false);
    setIsVideoCallActive(false);
    setIsCallConnected(false);
    setCallType(null);
    setActiveCallId(null);
    activeCallIdRef.current = null;
    setIncomingCall(null);
    stopRingtone();
    // Update call status in Supabase if there's an active call
    if (activeCallId && profile) {
      try {
        await supabase.from('calls').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', activeCallId);
      } catch (err) {
        console.error('Failed to update call status:', err);
      }
    }
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
      gain.gain.value = 0.3;
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      ringtoneOscRef.current = oscillator;
      // Create a pulsing ringtone effect
      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.setValueAtTime(0.3, now + 0.15);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      gain.gain.setValueAtTime(0, now + 0.4);
      gain.gain.setValueAtTime(0.3, now + 0.5);
      gain.gain.setValueAtTime(0.3, now + 0.65);
      gain.gain.linearRampToValueAtTime(0, now + 0.7);
      gain.gain.setValueAtTime(0, now + 0.9);
      gain.gain.setValueAtTime(0.3, now + 1.0);
      // Loop the pattern by scheduling again
      const interval = setInterval(() => {
        const t = audioCtx.currentTime;
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.15);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        gain.gain.setValueAtTime(0, t + 0.4);
        gain.gain.setValueAtTime(0.3, t + 0.5);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.65);
        gain.gain.linearRampToValueAtTime(0, t + 0.7);
        gain.gain.setValueAtTime(0, t + 0.9);
      }, 1000);
      // Store interval on oscillator for cleanup
      (oscillator as any)._ringInterval = interval;
    } catch (err) {
      console.error('Failed to start ringtone', err);
    }
  };

  const stopRingtone = () => {
    if (ringtoneOscRef.current) {
      try {
        // Clear the pulsing interval
        if ((ringtoneOscRef.current as any)._ringInterval) {
          clearInterval((ringtoneOscRef.current as any)._ringInterval);
        }
        ringtoneOscRef.current.stop();
        ringtoneOscRef.current.disconnect();
      } catch (e) { /* already stopped */ }
      ringtoneOscRef.current = null;
    }
  };

  // ========== Discord-like Feature Functions ==========

  const sendTypingIndicator = async (conversationId: string) => {
    try {
      await supabase.from('typing_indicators').insert([{
        user_id: profile.id,
        conversation_id: activeGroup ? undefined : conversationId,
        group_id: activeGroup || undefined
      }]);
      // Auto-delete after 3 seconds
      setTimeout(() => {
        supabase.from('typing_indicators').delete().eq('user_id', profile.id);
      }, 3000);
    } catch (err) {
      console.error('Error sending typing indicator:', err);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      const existingReaction = messageReactions[messageId]?.[emoji]?.includes(profile.id);
      if (existingReaction) {
        // Remove reaction
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            [emoji]: prev[messageId][emoji].filter(id => id !== profile.id)
          }
        }));
      } else {
        // Add reaction
        setMessageReactions(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            [emoji]: [...(prev[messageId]?.[emoji] || []), profile.id]
          }
        }));
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  const pinMessage = async (messageId: string) => {
    try {
      const newPin = {
        id: `${Date.now()}`,
        message_id: messageId,
        pinned_by: profile.id,
        created_at: new Date().toISOString()
      };
      setPinnedMessages(prev => [...prev, newPin]);
    } catch (err) {
      console.error('Error pinning message:', err);
    }
  };

  const unpinMessage = (messageId: string) => {
    setPinnedMessages(prev => prev.filter(pin => pin.message_id !== messageId));
  };

  const deleteMessage = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const blockUser = async (userId: string) => {
    setBlockedUsers(prev => [...prev, userId]);
  };

  const unblockUser = (userId: string) => {
    setBlockedUsers(prev => prev.filter(id => id !== userId));
  };

  // ========== WebRTC Helper Functions ==========

  const setupPeerConnection = (callId: string, stream: MediaStream): RTCPeerConnection | null => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ]
      });

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          setLocalStream(prev => prev);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          (async () => await stopLocalStream())();
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          (async () => await stopLocalStream())();
        }
      };

      peerConnectionRef.current = pc;
      return pc;
    } catch (err) {
      console.error('Failed to create RTCPeerConnection:', err);
      return null;
    }
  };

  const sendSignal = async (callId: string, type: 'offer' | 'answer' | 'ice-candidate', data: any) => {
    try {
      const signalData = data.toJSON ? data.toJSON() : data;
      const { error } = await supabase.from('call_signals').insert({
        call_id: callId,
        sender_id: profile.id,
        signal_type: type,
        signal_data: signalData
      });
      if (error) console.error('Failed to send signal:', error);
    } catch (err) {
      console.error('Error sending signal:', err);
    }
  };

  const setupSignalsSubscription = (callId: string, pc: RTCPeerConnection, isCaller: boolean, stream: MediaStream, call_type?: string) => {
    const channel = supabase
      .channel('call-signals-' + callId)
      .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: 'call_id=eq.' + callId
        },
        async (payload) => {
          const signal = payload.new as any;
          if (signal.sender_id === profile.id) return;
          try {
            if (signal.signal_type === 'answer' && isCaller) {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
              setIsCallConnected(true);
              setIsCallRinging(false);
              setIsVoiceCallActive(call_type === 'voice');
              setIsVideoCallActive(call_type === 'video');
              stopRingtone();
            } else if (signal.signal_type === 'offer' && !isCaller) {
              await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendSignal(callId, 'answer', pc.localDescription);
              setIsCallConnected(true);
              setIsCallRinging(false);
              stopRingtone();
            } else if (signal.signal_type === 'ice-candidate') {
              const candidate = new RTCIceCandidate(signal.signal_data);
              await pc.addIceCandidate(candidate);
            }
          } catch (err) {
            console.error('Error processing signal:', err, signal);
          }
        }
      )
      .subscribe();

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(callId, 'ice-candidate', event.candidate);
      }
    };

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const acceptCall = async () => {
    if (!incomingCall || !navigator.mediaDevices?.getUserMedia) return;
    
    stopRingtone();
    setIsCallRinging(false);
    setIsCallConnected(true);
    setCallType(incomingCall.call_type);
    setActiveCallId(incomingCall.id);
    activeCallIdRef.current = incomingCall.id;
    
    try {
      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        ...(incomingCall.call_type === 'video' ? { video: true } : {})
      });
      setLocalStream(stream);
      setIncomingCall(null);
      
      // Update call status to connected
      await supabase.from('calls').update({ status: 'connected' }).eq('id', incomingCall.id);
      
      // Setup peer connection (callee side - will receive offer and send answer)
      const pc = setupPeerConnection(incomingCall.id, stream);
      if (!pc) return;
      
      // Subscribe to signals and wait for offer
      signalsCleanupRef.current = setupSignalsSubscription(incomingCall.id, pc, false, stream, incomingCall.call_type);
      
      // Fetch existing offer (in case it was sent before we subscribed)
      const { data: offers } = await supabase
        .from('call_signals')
        .select('*')
        .eq('call_id', incomingCall.id)
        .eq('signal_type', 'offer')
        .order('created_at', { ascending: true });
      
      if (offers && offers.length > 0) {
        const offer = offers[offers.length - 1];
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer.signal_data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(incomingCall.id, 'answer', pc.localDescription);
        } catch (e) {
          console.error('Error processing existing offer:', e);
        }
      }
      
      setIsVoiceCallActive(incomingCall.call_type === 'voice');
      setIsVideoCallActive(incomingCall.call_type === 'video');
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      await stopLocalStream();
    }
  };

  const declineCall = async () => {
    if (incomingCall) {
      // Notify the caller we declined
      await supabase.from('calls').update({ status: 'declined', ended_at: new Date().toISOString() }).eq('id', incomingCall.id);
    }
    setIsCallRinging(false);
    setCallType(null);
    setIncomingCall(null);
    stopRingtone();
    await stopLocalStream();
  };

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessageError('Media devices are not supported by this browser.');
      return;
    }
    if (!activeChatFriend) {
      setMessageError('Select a friend to call first.');
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
      
      // Create call record in Supabase
      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          caller_id: profile.id,
          callee_id: activeChatFriend.id,
          call_type: type,
          status: 'ringing'
        })
        .select()
        .single();
      
      if (callError || !callData) {
        console.error('Failed to create call:', callError);
        setMessageError('Failed to start call. Please try again.');
        await stopLocalStream();
        return;
      }
      
      setActiveCallId(callData.id);
      activeCallIdRef.current = callData.id;
      playRingtone();
      
      // Create RTCPeerConnection (caller side)
      const pc = setupPeerConnection(callData.id, stream);
      if (!pc) {
        await stopLocalStream();
        return;
      }
      
      // Subscribe to signals first, then send the offer
      try {
        signalsCleanupRef.current = setupSignalsSubscription(callData.id, pc, true, stream, type);
        // Give the subscription a moment to activate, then send the offer
        await new Promise(r => setTimeout(r, 300));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal(callData.id, 'offer', pc.localDescription);
        console.log('Call offer sent for call', callData.id);
      } catch (err) {
        console.error('Failed to create offer:', err);
        setMessageError('Failed to establish connection.');
        await stopLocalStream();
      }
    } catch (err: any) {
      setMessageError(`Failed to start ${type} chat. Allow camera / microphone access.`);
      console.error(err);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleVideoMute = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoMuted;
      });
    }
    setIsVideoMuted(!isVideoMuted);
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

    try {
      // Show sending status
      setSendingMessage(true);
      
      // Convert blob URL to blob and upload to Supabase Storage
      const response = await fetch(recordedVoiceUrl);
      const blob = await response.blob();
      const filePath = `${profile.id}/${Date.now()}-voice.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('voice-notes')
        .upload(filePath, blob, { contentType: 'audio/webm' });
      
      if (uploadError) {
        console.error('Failed to upload voice note:', uploadError);
        setMessageError('Failed to upload voice note.');
        setSendingMessage(false);
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('voice-notes')
        .getPublicUrl(filePath);

      const { data, error } = await supabase.from('messages').insert([
        { sender_id: profile.id, receiver_id: activeChatFriend.id, content: `[voice]${publicUrl}[/voice]` }
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
        if (recordedVoiceUrl) URL.revokeObjectURL(recordedVoiceUrl);
        setRecordedVoiceUrl(null);
      }
    } catch (err) {
      console.error('Error sending voice note:', err);
      setMessageError('Failed to send voice note.');
    } finally {
      setSendingMessage(false);
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
    return <Onboarding session={session} onComplete={fetchProfile} />;
  }

  const channels = [
    { id: 'friends', name: 'FRIENDS', type: 'text' },
    { id: 'dms', name: 'DIRECT MESSAGES', type: 'text' },
    { id: 'groups', name: 'GROUPS', type: 'text' },
  ];

  const bgColor = 'bg-black';
  const sidebarColor = 'bg-[#0a0a0a]';

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
  const voiceNoteRegex = /^\[voice\](.+)\[\/voice\]$/;

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
        @keyframes messageIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .msg-enter {
          animation: messageIn 0.2s ease-out both;
        }
        input:focus, button:focus { outline: none; }
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
              <button 
                onClick={() => setActiveChannel('settings')}
                className={`flex items-center px-4 py-3 text-[11px] transition-all duration-150 border-2 border-transparent hover:border-[#333] ${
                  activeChannel === 'settings' ? 'channel-active' : 'text-gray-400'
                }`}
              >
                <CogIcon />
                <span className="ml-3 tracking-widest">SETTINGS</span>
              </button>
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
                    <form onSubmit={handleAddFriend} className="flex gap-4 flex-wrap mb-6 pb-6 border-b border-[#1a1a1a]">
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
                    {friendError && <p className="text-red-500 text-[10px] mt-3 mb-3">{friendError}</p>}
                    {friendSuccess && <p className="text-green-500 text-[10px] mt-3 mb-3">{friendSuccess}</p>}
                    
                    {pendingFriends.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm mb-3 uppercase tracking-widest text-gray-400">PENDING REQUESTS</h4>
                        <p className="text-[10px] text-gray-600 mb-4">Sent and received friend requests</p>
                        <div className="space-y-3">
                          {pendingFriends.map(friend => {
                            const isSender = friend.user_id === profile.id;
                            const otherUser = isSender ? friend.receiver : friend.sender;
                            return (
                              <div key={friend.id} className="flex items-center justify-between border border-[#333] p-3 hover:border-[#555] transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 border border-[#333] p-0.5">
                                    <img src={otherUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] block font-bold">{otherUser.nickname}</span>
                                    <span className="text-[8px] text-yellow-500 uppercase">{isSender ? 'SENT' : 'INCOMING'}</span>
                                  </div>
                                </div>
                                {!isSender && (
                                  <button 
                                    onClick={() => handleAcceptFriend(friend.id)}
                                    className="px-3 py-1.5 text-[9px] bg-green-900 border border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-colors uppercase tracking-wider"
                                  >
                                    ACCEPT
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => { setActiveChannel('dms'); setActiveChatFriend(friend); }}
                                className="px-4 py-2 border-2 border-white text-white hover:bg-white hover:text-black transition-colors text-[10px] relative"
                              >
                                CHAT
                                {unreadMessages[friend.id] > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] px-2 py-0.5 rounded-full font-bold">
                                    {unreadMessages[friend.id]}
                                  </span>
                                )}
                              </button>
                              <div className="relative group/actions">
                                <button className="px-2 py-2 border-2 border-[#333] text-gray-400 hover:border-white hover:text-white transition-colors text-[10px]">
                                  ...
                                </button>
                                <div className="absolute right-0 top-full mt-1 bg-[#111] border-2 border-[#333] p-1 min-w-[120px] hidden group-hover/actions:flex flex-col z-50">
                                  <button
                                    onClick={() => handleUnfriend(friend.id)}
                                    className="px-3 py-2 text-[9px] text-left text-red-400 hover:text-red-300 hover:bg-[#1a1a1a] transition-colors uppercase tracking-wider"
                                  >
                                    REMOVE
                                  </button>
                                </div>
                              </div>
                            </div>
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
                      {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                          <p className="text-[10px] mb-2">SQUAD CHANNEL INITIALIZED</p>
                          <p className="text-xs text-white">#{activeGroupDetails.name}</p>
                          <p className="text-[10px] mt-4 text-gray-500">Begin transmission with squad members.</p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => {
                          const sender = activeGroupDetails.memberDetails?.find((m: any) => m.id === msg.sender_id);
                          const isMine = msg.sender_id === profile.id;
                          const prevMsg = idx > 0 ? messages[idx - 1] : null;
                          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                          const voiceMatch = msg.content?.match(voiceNoteRegex);
                          const isVoiceNote = !!voiceMatch;
                          const voiceUrl = voiceMatch ? voiceMatch[1] : null;
                          const msgDate = new Date(msg.created_at);
                          const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
                          const showDateSeparator = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
                          
                          const formatDateSeparator = (date: Date) => {
                            const now = new Date();
                            const yesterday = new Date(now);
                            yesterday.setDate(yesterday.getDate() - 1);
                            if (date.toDateString() === now.toDateString()) return 'TODAY';
                            if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
                          };
                          
                          return (
                            <div key={idx} className="flex flex-col">
                              {showDateSeparator && (
                                <div className="flex items-center gap-3 my-4">
                                  <div className="flex-grow h-px bg-[#1a1a1a]" />
                                  <span className="text-[8px] text-gray-600 uppercase tracking-[3px] shrink-0">{formatDateSeparator(msgDate)}</span>
                                  <div className="flex-grow h-px bg-[#1a1a1a]" />
                                </div>
                              )}
                              <div className={`flex flex-col items-start group hover:bg-white/[0.02] px-2 py-1 rounded transition-colors ${idx === messages.length - 1 ? 'msg-enter' : ''}`}>
                                {isFirstInGroup && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-5 h-5 border border-[#333] overflow-hidden shrink-0">
                                      <img src={sender?.avatar_url || profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                                      {isMine ? 'YOU' : sender?.nickname || sender?.username || 'Unknown'}
                                    </span>
                                    <span className="text-[7px] text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                )}
                                {!isFirstInGroup && (
                                  <span className="text-[7px] text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5 ml-8">
                                    {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {isVoiceNote ? (
                                  <div className="ml-7">
                                    <VoiceNotePlayer src={voiceUrl!} isMine={isMine} />
                                  </div>
                                ) : (
                                  <div className={`px-3 py-2 max-w-[80%] text-xs leading-relaxed ${isMine ? 'bg-white text-black' : 'border border-[#333] text-white'} group-hover:brightness-110 transition-all ml-7`}>
                                    {msg.content}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </>
                ) : activeChatFriend ? (
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
                          const prevMsg = idx > 0 ? messages[idx - 1] : null;
                          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
                          const voiceMatch = msg.content?.match(voiceNoteRegex);
                          const isVoiceNote = !!voiceMatch;
                          const voiceUrl = voiceMatch ? voiceMatch[1] : null;
                          const msgDate = new Date(msg.created_at);
                          const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
                          const showDateSeparator = !prevDate || msgDate.toDateString() !== prevDate.toDateString();
                          
                          const formatDateSeparator = (date: Date) => {
                            const now = new Date();
                            const yesterday = new Date(now);
                            yesterday.setDate(yesterday.getDate() - 1);
                            if (date.toDateString() === now.toDateString()) return 'TODAY';
                            if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
                          };
                          
                          return (
                            <div key={idx} className="flex flex-col">
                              {showDateSeparator && (
                                <div className="flex items-center gap-3 my-4">
                                  <div className="flex-grow h-px bg-[#1a1a1a]" />
                                  <span className="text-[8px] text-gray-600 uppercase tracking-[3px] shrink-0">{formatDateSeparator(msgDate)}</span>
                                  <div className="flex-grow h-px bg-[#1a1a1a]" />
                                </div>
                              )}
                              <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group hover:bg-white/[0.02] px-2 py-1 rounded transition-colors ${idx === messages.length - 1 ? 'msg-enter' : ''}`}>
                                {/* Avatar + Name row (only for first message in group) */}
                                {isFirstInGroup && (
                                  <div className={`flex items-center gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-5 h-5 border border-[#333] overflow-hidden shrink-0">
                                      <img src={isMine ? profile.avatar_url : activeChatFriend.avatar_url} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                                      {isMine ? 'YOU' : activeChatFriend.nickname}
                                    </span>
                                    <span className="text-[7px] text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                )}
                                {/* Timestamp only on hover for grouped messages */}
                                {!isFirstInGroup && (
                                  <span className="text-[7px] text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">
                                    {msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {/* Voice note player */}
                                {isVoiceNote ? (
                                  <VoiceNotePlayer src={voiceUrl!} isMine={isMine} />
                                ) : (
                                  <div className={`px-3 py-2 max-w-[80%] text-xs leading-relaxed ${pinnedMessages.some(p => p.message_id === msg.id) ? 'border-l-4 border-yellow-500 pl-2' : ''} ${isMine ? 'bg-white text-black' : 'border border-[#333] text-white'} group-hover:brightness-110 transition-all`}>
                                    {pinnedMessages.some(p => p.message_id === msg.id) && (
                                      <span className="text-[7px] text-yellow-500 block mb-1">📌 PINNED</span>
                                    )}
                                    {msg.content}
                                  </div>
                                )}
                                {/* Message Actions */}
                                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => toggleReaction(msg.id, '👍')}
                                    className="px-2 py-0.5 text-[8px] bg-[#222] hover:bg-[#333] transition-colors rounded border border-[#444]"
                                    title="React with 👍"
                                  >
                                    👍
                                  </button>
                                  <button
                                    onClick={() => toggleReaction(msg.id, '❤️')}
                                    className="px-2 py-0.5 text-[8px] bg-[#222] hover:bg-[#333] transition-colors rounded border border-[#444]"
                                    title="React with ❤️"
                                  >
                                    ❤️
                                  </button>
                                  {isMine && (
                                    <>
                                      <button
                                        onClick={() => deleteMessage(msg.id)}
                                        className="px-2 py-0.5 text-[8px] bg-red-900/30 hover:bg-red-900/50 transition-colors rounded border border-red-700/30 text-red-400"
                                        title="Delete message"
                                      >
                                        🗑️
                                      </button>
                                      <button
                                        onClick={() => pinMessage(msg.id)}
                                        className="px-2 py-0.5 text-[8px] bg-yellow-900/30 hover:bg-yellow-900/50 transition-colors rounded border border-yellow-700/30 text-yellow-400"
                                        title="Pin message"
                                      >
                                        📌
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => setShowUserProfile(isMine ? profile : activeChatFriend)}
                                    className="px-2 py-0.5 text-[8px] bg-[#222] hover:bg-[#333] transition-colors rounded border border-[#444]"
                                    title="View profile"
                                  >
                                    👤
                                  </button>
                                </div>
                                {/* Reactions Display */}
                                {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2 max-w-[80%]">
                                    {Object.entries(messageReactions[msg.id]).map(([emoji, users]) => users.length > 0 && (
                                      <button
                                        key={emoji}
                                        onClick={() => toggleReaction(msg.id, emoji)}
                                        className={`px-2 py-0.5 text-[8px] rounded border transition-all ${
                                          users.includes(profile.id)
                                            ? 'bg-white/20 border-white text-white'
                                            : 'bg-[#222] border-[#444] hover:border-[#666] text-gray-300'
                                        }`}
                                      >
                                        {emoji} {users.length > 1 ? users.length : ''}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    {/* Typing Indicators */}
                    {typingUsers[activeGroup || activeChatFriend?.id]?.length > 0 && (
                      <div className="px-6 py-2 text-[9px] text-gray-500 italic">
                        {typingUsers[activeGroup || activeChatFriend?.id].join(', ')} is typing...
                      </div>
                    )}
                    {/* Pinned Messages Preview */}
                    {pinnedMessages.length > 0 && (
                      <div className="px-6 py-3 bg-yellow-900/10 border-y border-yellow-700/30 max-h-24 overflow-y-auto">
                        <div className="text-[8px] text-yellow-600 uppercase tracking-widest mb-2 font-bold">📌 PINNED MESSAGES ({pinnedMessages.length})</div>
                        <div className="space-y-1">
                          {pinnedMessages.slice(-3).map(pin => {
                            const pinnedMsg = messages.find(m => m.id === pin.message_id);
                            return pinnedMsg ? (
                              <div key={pin.id} className="text-[8px] text-yellow-700 truncate p-1 bg-yellow-900/20 rounded">
                                {pinnedMsg.content.substring(0, 50)}...
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="p-3 border-t-2 border-[#1a1a1a]">
                      {messageError && (
                        <div className="text-red-500 text-[9px] p-2 mb-3 border-l-2 border-red-500 bg-red-500/5">
                          {messageError}
                        </div>
                      )}
                      {/* Recording indicator bar */}
                      {isRecording && (
                        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-[9px] text-red-400 uppercase tracking-wider">RECORDING...</span>
                          <div className="flex-grow h-1 bg-[#333] rounded overflow-hidden">
                            <div className="h-full bg-red-500 rounded animate-pulse" style={{ width: '60%' }} />
                          </div>
                          <button
                            type="button"
                            onClick={stopRecording}
                            className="px-3 py-1 text-[9px] bg-red-500 text-black hover:bg-red-400 transition-colors uppercase tracking-wider"
                          >
                            STOP
                          </button>
                        </div>
                      )}
                      {/* Recorded voice note preview */}
                      {recordedVoiceUrl && !isRecording && (
                        <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-green-900/20 border border-green-500/30">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400 shrink-0">
                            <path d="M9 18V5l12-2v13"/>
                            <circle cx="6" cy="18" r="3"/>
                            <circle cx="18" cy="16" r="3"/>
                          </svg>
                          <VoiceNotePlayer src={recordedVoiceUrl} isMine={true} />
                          <button
                            type="button"
                            onClick={sendVoiceNote}
                            className="px-3 py-1.5 text-[9px] bg-green-500 text-black hover:bg-green-400 transition-colors uppercase tracking-wider"
                          >
                            SEND
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (recordedVoiceUrl) URL.revokeObjectURL(recordedVoiceUrl);
                              setRecordedVoiceUrl(null);
                            }}
                            className="px-3 py-1.5 text-[9px] border border-[#444] text-gray-400 hover:text-white hover:border-white transition-colors uppercase tracking-wider"
                          >
                            DISCARD
                          </button>
                        </div>
                      )}
                      {/* Input row */}
                      <div className="flex gap-2 items-end">
                        <div className="flex-grow flex items-center gap-2 bg-[#111] border-2 border-[#333] focus-within:border-white transition-colors p-2">
                          <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`shrink-0 p-1.5 transition-colors ${isRecording ? 'text-red-400' : 'text-gray-500 hover:text-white'}`}
                            title={isRecording ? 'Stop recording' : 'Record voice message'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                              <line x1="12" y1="19" x2="12" y2="23"/>
                              <line x1="8" y1="23" x2="16" y2="23"/>
                            </svg>
                          </button>
                          <input 
                            type="text" 
                            value={newMessage}
                            onChange={(e) => {
                              setNewMessage(e.target.value);
                              if (e.target.value.trim()) {
                                sendTypingIndicator(activeChatFriend?.id || activeGroup);
                              }
                            }}
                            placeholder="ENTER_MESSAGE..."
                            disabled={sendingMessage}
                            className="flex-grow bg-transparent text-white text-xs placeholder-gray-600 focus:outline-none disabled:opacity-50 py-1"
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={sendingMessage || !newMessage.trim()}
                          className="px-4 py-2.5 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                        >
                          {sendingMessage ? 'SENDING...' : 'SEND'}
                        </button>
                      </div>
                      {recordingError && <p className="text-red-500 text-[9px] mt-2">{recordingError}</p>}
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
              {!isCreatingGroup ? (
                <>
                  <div className="border-2 border-[#1a1a1a] p-6 bg-[#050505] relative mb-8">
                    <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
                    <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
                    <button 
                      onClick={() => setIsCreatingGroup(true)}
                      className="px-8 py-3 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors font-bold tracking-[2px]"
                    >
                      + CREATE NEW SQUAD
                    </button>
                  </div>

                  <div className="flex-grow border-2 border-[#1a1a1a] p-6 bg-[#050505] relative flex flex-col overflow-y-auto">
                    <h3 className="text-lg mb-6 border-b-2 border-[#1a1a1a] pb-4">ACTIVE SQUADS</h3>
                    {groups && groups.length > 0 ? (
                      <div className="space-y-4">
                        {groups.map(group => (
                          <div 
                            key={group.id}
                            onClick={() => {
                              setActiveGroup(group.id);
                              setActiveChatFriend(null);
                            }}
                            className={`p-4 border-2 transition-all cursor-pointer ${activeGroup === group.id ? 'border-white bg-[#111]' : 'border-[#333] bg-[#0a0a0a] hover:border-[#555]'}`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <h4 className="text-[11px] font-bold tracking-[1px]"># {group.name}</h4>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGroupSettings(prev => ({
                                    ...prev,
                                    [group.id]: { ...prev[group.id], isMuted: !prev[group.id]?.isMuted }
                                  }));
                                }}
                                className={`text-[8px] px-2 py-1 border border-[#333] rounded ${groupSettings[group.id]?.isMuted ? 'bg-white text-black' : 'bg-transparent text-white'}`}
                              >
                                {groupSettings[group.id]?.isMuted ? '🔇 MUTED' : '🔊 UNMUTED'}
                              </button>
                            </div>
                            <p className="text-[9px] text-gray-500 mb-2">
                              {group.members?.length || 0} MEMBERS
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {group.memberDetails?.slice(0, 5).map(member => (
                                <span key={member.id} className="text-[8px] bg-[#333] px-2 py-1 rounded">
                                  {member.nickname || member.username}
                                </span>
                              ))}
                              {group.memberDetails && group.memberDetails.length > 5 && (
                                <span className="text-[8px] bg-[#333] px-2 py-1 rounded">+{group.memberDetails.length - 5}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-600 flex items-center justify-center h-full">NO ACTIVE SQUADS FOUND. CREATE ONE ABOVE.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-grow flex flex-col">
                  <div className="border-2 border-[#1a1a1a] p-6 bg-[#050505] relative mb-8">
                    <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
                    <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
                    
                    <h3 className="text-lg mb-4">CREATE NEW SQUAD</h3>
                    <form className="flex flex-col gap-4">
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase tracking-[2px] mb-2 block">SQUAD NAME</label>
                        <input 
                          type="text" 
                          value={groupNameInput}
                          onChange={(e) => setGroupNameInput(e.target.value)}
                          placeholder="Enter squad name..."
                          className="w-full p-4 bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase tracking-[2px] mb-3 block">SELECT MEMBERS</label>
                        <button
                          type="button"
                          onClick={() => setShowGroupMemberSelector(!showGroupMemberSelector)}
                          className="w-full p-3 bg-[#111] border-2 border-[#333] text-white text-[10px] hover:border-white transition-colors text-left"
                        >
                          {selectedGroupMembers.length > 0 ? `${selectedGroupMembers.length} MEMBERS SELECTED` : 'CLICK TO SELECT MEMBERS'}
                        </button>
                        
                        {showGroupMemberSelector && (
                          <div className="mt-3 border-2 border-[#333] bg-[#0a0a0a] p-4 max-h-64 overflow-y-auto">
                            {acceptedFriends.length > 0 ? (
                              acceptedFriends.map(friend => (
                                <label key={friend.id} className="flex items-center gap-3 p-2 hover:bg-[#111] cursor-pointer mb-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedGroupMembers.includes(friend.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedGroupMembers(prev => [...prev, friend.id]);
                                      } else {
                                        setSelectedGroupMembers(prev => prev.filter(id => id !== friend.id));
                                      }
                                    }}
                                    className="w-4 h-4 cursor-pointer"
                                  />
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {friend.avatar_url && (
                                      <img src={friend.avatar_url} alt={friend.nickname} className="w-6 h-6 rounded" />
                                    )}
                                    <span className="text-[9px] truncate">{friend.nickname || friend.username}</span>
                                  </div>
                                  {friend.online_status && <span className="text-[8px] text-green-500">●</span>}
                                </label>
                              ))
                            ) : (
                              <p className="text-[9px] text-gray-500">No friends to add. Add friends first!</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          onClick={createGroup}
                          disabled={!groupNameInput.trim() || selectedGroupMembers.length === 0}
                          className="flex-1 px-6 py-3 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                        >
                          CREATE SQUAD
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingGroup(false);
                            setGroupNameInput('');
                            setSelectedGroupMembers([]);
                            setShowGroupMemberSelector(false);
                          }}
                          className="flex-1 px-6 py-3 bg-[#333] text-white text-[10px] hover:bg-[#555] transition-colors font-bold"
                        >
                          CANCEL
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
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
                    { id: 'terminal', label: 'CLI Terminal' },
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
                        <div className="w-full text-left px-4 py-3 border-2 text-[10px] border-[#333] bg-[#050505] text-gray-400">
                          Theme: Dark Mode (Permanent)
                        </div>
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

                  {settingsTab === 'terminal' && (
                    <div className="border-2 border-[#1a1a1a] bg-[#050505] p-2 min-h-[450px] flex flex-col mb-6">
                      <WebCLI session={session} />
                    </div>
                  )}

                  {/* Danger Zone */}
                  {settingsTab !== 'terminal' && (
                    <div className="border-2 border-red-500 p-6 bg-[#111]">
                      <h3 className="text-lg mb-4 text-red-500">DANGER ZONE</h3>
                      <button onClick={handleLogout} className="px-6 py-4 border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-black transition-colors text-xs">
                        TERMINATE SESSION (LOG OUT)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Discord-style Call Overlay */}
        {/* User Profile Modal */}
      {showUserProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUserProfile(null)}>
          <div className="bg-[#050505] border-2 border-white p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-3 -left-3 w-6 h-6 border-t-2 border-l-2 border-white" />
            <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-2 border-r-2 border-white" />
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 border-2 border-white mb-4 overflow-hidden">
                <img src={showUserProfile.avatar_url} alt={showUserProfile.nickname} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-xl font-bold tracking-wider">{showUserProfile.nickname || showUserProfile.username}</h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-[2px] mt-1">@{showUserProfile.username}</p>
              <div className={`mt-3 px-3 py-1 rounded text-[9px] uppercase tracking-widest font-bold ${
                showUserProfile.online_status 
                  ? 'bg-green-900/30 text-green-400 border border-green-500/50' 
                  : 'bg-gray-900/30 text-gray-400 border border-gray-500/50'
              }`}>
                {showUserProfile.online_status ? '● ONLINE' : '● OFFLINE'}
              </div>
            </div>

            <div className="space-y-2 mb-6 border-y border-[#333] py-4">
              <p className="text-[9px] text-gray-500 uppercase tracking-[2px]">PROFILE INFO</p>
              <p className="text-xs">Member since {new Date(showUserProfile.created_at || Date.now()).toLocaleDateString()}</p>
            </div>

            <div className="space-y-2 mb-6">
              {showUserProfile.id !== profile.id && (
                <>
                  <button
                    onClick={() => {
                      setActiveChatFriend(showUserProfile);
                      setActiveChannel('dms');
                      setShowUserProfile(null);
                    }}
                    className="w-full px-4 py-2 bg-white text-black text-[10px] hover:bg-gray-200 transition-colors uppercase tracking-wider mb-2"
                  >
                    MESSAGE
                  </button>
                  {!blockedUsers.includes(showUserProfile.id) ? (
                    <button
                      onClick={() => blockUser(showUserProfile.id)}
                      className="w-full px-4 py-2 bg-red-900/30 text-red-400 text-[10px] hover:bg-red-900/50 transition-colors uppercase tracking-wider border border-red-500/50"
                    >
                      BLOCK USER
                    </button>
                  ) : (
                    <button
                      onClick={() => unblockUser(showUserProfile.id)}
                      className="w-full px-4 py-2 bg-green-900/30 text-green-400 text-[10px] hover:bg-green-900/50 transition-colors uppercase tracking-wider border border-green-500/50"
                    >
                      UNBLOCK USER
                    </button>
                  )}
                </>
              )}
            </div>

            <button
              onClick={() => setShowUserProfile(null)}
              className="w-full px-4 py-2 bg-[#333] text-white text-[10px] hover:bg-[#444] transition-colors uppercase tracking-wider"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Call Overlay */}
          incomingCall={incomingCall}
          localStream={localStream}
          remoteStreamRef={remoteStreamRef}
          remoteVideoRef={remoteVideoRef}
          videoRef={videoRef}
          isCallRinging={isCallRinging}
          isCallConnected={isCallConnected}
          isVoiceCallActive={isVoiceCallActive}
          isVideoCallActive={isVideoCallActive}
          callType={callType}
          isMuted={isMuted}
          isVideoMuted={isVideoMuted}
          activeChatFriend={activeChatFriend}
          profile={profile}
          onAcceptCall={acceptCall}
          onDeclineCall={declineCall}
          onEndCall={stopLocalStream}
          onToggleMute={toggleMute}
          onToggleVideoMute={toggleVideoMute}
        />
      </div>
    </div>
  );
};

export default Dashboard;
