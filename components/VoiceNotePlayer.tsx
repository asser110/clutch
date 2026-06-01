import React, { useState, useRef, useEffect } from 'react';

interface VoiceNotePlayerProps {
  src: string;
  isMine: boolean;
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ src, isMine }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => {
      setDuration(audio.duration || 0);
      setLoaded(true);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    if (audio.readyState >= 1) {
      onLoaded();
    }

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => null);
    }
    setPlaying(!playing);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const barChars = 16;
  const filled = Math.round((progress / 100) * barChars);
  const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, barChars - filled));

  return (
    <>
      <audio ref={audioRef} src={src} preload="metadata" />
      <div className={`max-w-[300px] ${isMine ? 'bg-white/5' : 'bg-[#111]'} border-2 border-[#2a2a2a] overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border-b-2 border-[#1a1a1a]">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span className="text-[8px] text-gray-500 uppercase tracking-wider">VOICE MESSAGE</span>
          {!loaded && (
            <span className="text-[7px] text-gray-600 ml-auto animate-pulse">LOADING...</span>
          )}
        </div>

        {/* Controls */}
        <div className="px-3 py-2.5 flex items-center gap-3">
          {/* Play/Pause button */}
          <button
            onClick={togglePlay}
            disabled={!loaded}
            className={`w-8 h-8 border-2 flex items-center justify-center shrink-0 transition-colors ${
              !loaded
                ? 'border-[#222] text-gray-700 cursor-not-allowed'
                : playing
                  ? 'border-green-500 text-green-400 hover:bg-green-500 hover:text-black'
                  : 'border-white text-white hover:bg-white hover:text-black'
            }`}
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              /* Pause icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              /* Play icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Progress bar (terminal-style) */}
          <div className="flex-grow flex flex-col gap-1 min-w-0">
            <div className="h-4 border-2 border-[#333] bg-[#0a0a0a] flex items-center px-1 overflow-hidden">
              {loaded ? (
                <div className="flex items-center gap-0.5 w-full">
                  <span className="text-[7px] text-green-400 font-mono tracking-tight whitespace-nowrap shrink-0 mr-1">
                    {formatTime(currentTime)}
                  </span>
                  <span className="text-[7px] text-gray-500 font-mono tracking-tight leading-none overflow-hidden whitespace-nowrap">
                    {bar}
                  </span>
                  <span className="text-[7px] text-gray-500 font-mono tracking-tight whitespace-nowrap shrink-0 ml-1">
                    {formatTime(duration)}
                  </span>
                </div>
              ) : (
                <div className="w-full flex">
                  <div className="h-full bg-green-500/30 animate-pulse" style={{ width: '30%' }} />
                </div>
              )}
            </div>
            {/* Clickable seek bar overlaid */}
            <div
              className="relative -top-[18px] h-4 cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
              onClick={(e) => {
                const audio = audioRef.current;
                if (!audio || !loaded) return;
                const rect = e.currentTarget.parentElement!.querySelector('.h-4.border-2')!.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pct = Math.max(0, Math.min(1, x / rect.width));
                audio.currentTime = pct * duration;
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default VoiceNotePlayer;
