import React, { useState, useEffect, useRef } from 'react';
import { MicIcon, HeadphoneIcon, CloseIcon, UserIcon } from './icons';

interface CallOverlayProps {
  incomingCall: any;
  localStream: MediaStream | null;
  remoteStreamRef: React.MutableRefObject<MediaStream | null>;
  remoteVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  isCallRinging: boolean;
  isCallConnected: boolean;
  isVoiceCallActive: boolean;
  isVideoCallActive: boolean;
  callType: 'voice' | 'video' | null;
  isMuted: boolean;
  isVideoMuted: boolean;
  activeChatFriend: any;
  profile: any;
  onAcceptCall: () => void;
  onDeclineCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideoMute: () => void;
}

const CallOverlay: React.FC<CallOverlayProps> = ({
  incomingCall,
  localStream,
  remoteStreamRef,
  remoteVideoRef,
  videoRef,
  isCallRinging,
  isCallConnected,
  isVoiceCallActive,
  isVideoCallActive,
  callType,
  isMuted,
  isVideoMuted,
  activeChatFriend,
  profile,
  onAcceptCall,
  onDeclineCall,
  onEndCall,
  onToggleMute,
  onToggleVideoMute,
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const durationIntervalRef = useRef<number | null>(null);

  const isActiveCall = isCallConnected || isVoiceCallActive || isVideoCallActive;
  const isRingingOutgoing = localStream && isCallRinging && !incomingCall;
  const isRingingIncoming = incomingCall && incomingCall.caller && !localStream;

  // Start call duration timer
  useEffect(() => {
    if (isActiveCall) {
      setCallDuration(0);
      durationIntervalRef.current = window.setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    };
  }, [isActiveCall]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Always keep remote video element updated
  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  });

  // Keep local video element updated
  useEffect(() => {
    if (videoRef.current && localStream && isVideoCallActive) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoCallActive]);

  if (!isRingingIncoming && !isRingingOutgoing && !isActiveCall) return null;

  // Determine who we're talking to
  const displayUser = incomingCall?.caller || activeChatFriend;
  const displayName = displayUser?.nickname || 'Unknown';
  const displayAvatar = displayUser?.avatar_url || 'https://api.dicebear.com/7.x/identicon/svg?seed=default&backgroundColor=000000';

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black select-none">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#0a0a0a] to-black opacity-80" />
      
      {/* Scanlines */}
      <style>{`
        @keyframes call-scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .call-scanline {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.03);
          position: absolute;
          top: 0;
          left: 0;
          animation: call-scanline 8s linear infinite;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
      <div className="call-scanline" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-grow px-4">
        {/* Incoming Call */}
        {isRingingIncoming && (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-yellow-400 p-1 bg-[#111] shadow-[0_0_40px_rgba(250,204,21,0.15)]">
              <img src={displayAvatar} alt="caller" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="text-center">
              <p className="text-[10px] text-yellow-400 uppercase tracking-[4px] mb-3">INCOMING CALL</p>
              <h2 className="text-3xl md:text-4xl text-white font-bold mb-2">{displayName}</h2>
              <p className="text-xs text-gray-400 uppercase tracking-[3px]">
                {incomingCall.call_type === 'video' ? 'VIDEO CALL' : 'VOICE CALL'}
              </p>
            </div>
            <div className="flex items-center gap-6 mt-8">
              <button
                onClick={onDeclineCall}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500 border-2 border-red-500 flex items-center justify-center hover:bg-red-600 hover:scale-105 transition-all active:scale-95 shadow-lg"
              >
                <CloseIcon />
              </button>
              <button
                onClick={onAcceptCall}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-500 border-2 border-green-500 flex items-center justify-center hover:bg-green-400 hover:scale-105 transition-all active:scale-95 shadow-lg"
              >
                <HeadphoneIcon />
              </button>
            </div>
            <div className="flex gap-4 text-[10px] text-gray-500 mt-2">
              <span className="uppercase tracking-[2px]">Decline</span>
              <span className="uppercase tracking-[2px]">Accept</span>
            </div>
          </div>
        )}

        {/* Outgoing Call (Ringing) */}
        {isRingingOutgoing && !isActiveCall && (
          <div className="flex flex-col items-center gap-6">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#333] p-1 bg-[#111]">
              <img src={displayAvatar} alt="callee" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="text-center">
              <p className="text-[10px] text-blue-400 uppercase tracking-[4px] mb-3 animate-pulse">CONNECTING...</p>
              <h2 className="text-3xl md:text-4xl text-white font-bold mb-2">{displayName}</h2>
              <p className="text-xs text-gray-400 uppercase tracking-[3px]">
                {callType === 'video' ? 'VIDEO CALL' : 'VOICE CALL'} &middot; RINGING
              </p>
            </div>
            <div className="flex items-center gap-6 mt-8">
              <button
                onClick={onEndCall}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500 border-2 border-red-500 flex items-center justify-center hover:bg-red-600 hover:scale-105 transition-all active:scale-95 shadow-lg"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="text-[10px] text-gray-500 uppercase tracking-[2px] mt-2">Cancel</div>
          </div>
        )}

        {/* Active Video Call */}
        {isActiveCall && isVideoCallActive && (
          <div className="flex flex-col w-full h-full items-center justify-center relative">
            {/* Remote video - large background */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <video
                ref={remoteVideoRef}
                className="w-full h-full object-contain"
                autoPlay
                muted={false}
                playsInline
              />
              {/* Fallback if no remote video */}
              {(!remoteStreamRef.current) && (
                <div className="flex flex-col items-center gap-4 opacity-50">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-[#333] p-1">
                    <img src={displayAvatar} alt="remote" className="w-full h-full rounded-full object-cover" />
                  </div>
                  <h2 className="text-xl text-white font-bold">{displayName}</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-[3px]">WAITING FOR VIDEO...</p>
                </div>
              )}
            </div>

            {/* Local video PIP */}
            <div className="absolute bottom-28 right-4 md:right-8 w-40 h-24 md:w-56 md:h-32 rounded-lg overflow-hidden border-2 border-[#444] shadow-xl bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              {isVideoMuted && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                  <UserIcon />
                </div>
              )}
            </div>

            {/* User name overlay */}
            <div className="absolute top-6 left-6">
              <div className="flex items-center gap-3 bg-black bg-opacity-60 backdrop-blur-sm px-4 py-2 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs text-white">{displayName}</span>
              </div>
            </div>

            {/* Call duration */}
            <div className="absolute top-6 right-6">
              <div className="bg-black bg-opacity-60 backdrop-blur-sm px-4 py-2 rounded-lg">
                <span className="text-[10px] text-gray-300">{formatDuration(callDuration)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Voice Call */}
        {isActiveCall && !isVideoCallActive && (
          <div className="flex flex-col items-center gap-6">
            {/* Animated voice visualization bars */}
            <div className="flex items-end gap-1.5 h-8 mb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="w-1.5 bg-green-400 rounded-full animate-pulse"
                  style={{
                    height: `${40 + Math.random() * 60}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${0.5 + Math.random() * 0.5}s`
                  }}
                />
              ))}
            </div>
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-green-500 p-1 bg-[#111] shadow-[0_0_40px_rgba(34,197,94,0.2)]">
              <img src={displayAvatar} alt="user" className="w-full h-full rounded-full object-cover" />
            </div>
            <div className="text-center">
              <h2 className="text-3xl md:text-4xl text-white font-bold mb-2">{displayName}</h2>
              <p className="text-xs text-green-400 uppercase tracking-[3px]">CONNECTED &middot; {formatDuration(callDuration)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar - Discord Style */}
      {isActiveCall && (
        <div className="relative z-10 flex items-center justify-center gap-3 md:gap-4 pb-6 pt-2 px-4">
          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
              isMuted
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] hover:text-white'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <MicIcon />
          </button>

          {/* Mute/Deafen indicator text */}
          <div className="text-[8px] text-gray-500 uppercase tracking-[2px] text-center">
            {isMuted ? 'Muted' : 'Mic'}
          </div>

          {/* Video mute button (only during video calls) */}
          {isVideoCallActive && (
            <>
              <button
                onClick={onToggleVideoMute}
                className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                  isVideoMuted
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a] hover:text-white'
                }`}
                title={isVideoMuted ? 'Enable Video' : 'Disable Video'}
              >
                <UserIcon />
              </button>
              <div className="text-[8px] text-gray-500 uppercase tracking-[2px] text-center">
                {isVideoMuted ? 'Cam Off' : 'Cam'}
              </div>
            </>
          )}

          {/* End Call Button */}
          <button
            onClick={onEndCall}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-red-500 border-2 border-red-500 flex items-center justify-center hover:bg-red-600 hover:scale-105 transition-all active:scale-95 shadow-lg"
            title="End Call"
          >
            <HeadphoneIcon />
          </button>
          <div className="text-[8px] text-gray-500 uppercase tracking-[2px] text-center">
            End
          </div>
        </div>
      )}
    </div>
  );
};

export default CallOverlay;
