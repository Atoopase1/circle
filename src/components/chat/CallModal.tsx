// CallModal — Premium active call overlay
'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useCallStore } from '@/store/call-store';

export default function CallModal() {
  const {
    status,
    callType,
    remoteUser,
    isMuted,
    isVideoOff,
    localStream,
    remoteStream,
    startedAt,
    toggleMute,
    toggleVideo,
    endCall,
  } = useCallStore();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState('00:00');
  const [isMinimized, setIsMinimized] = useState(false);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Call timer
  useEffect(() => {
    if (status !== 'connected' || !startedAt) return;

    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const mins = Math.floor(diff / 60).toString().padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      setDuration(`${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startedAt]);

  if (status === 'idle') return null;

  const isVideo = callType === 'video';

  // Minimized PIP view
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-24 right-4 z-[100] w-40 h-28 rounded-2xl overflow-hidden cursor-pointer group border border-white/10 bg-[#0F172A]"
        style={{ 
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        }}
        onClick={() => setIsMinimized(false)}
      >
        {isVideo && remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Avatar src={remoteUser?.avatar_url} name={remoteUser?.display_name || '?'} size="md" />
          </div>
        )}
        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
          <span className="text-white text-xs font-mono bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-sm">
            {status === 'connected' ? duration : 'Calling…'}
          </span>
          <Maximize2 size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); endCall(); }}
          className="absolute top-1.5 right-1.5 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <PhoneOff size={10} className="text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0F172A]">
      {/* Video Background */}
      {isVideo && (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Local PIP */}
          <div className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden z-10 border border-white/10"
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center bg-[#1E293B]">
                <VideoOff size={28} className="text-white/40" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Audio-only layout */}
      {!isVideo && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 relative">
          {/* Decorative rings */}
          {status === 'calling' && (
            <>
              <div className="absolute w-52 h-52 rounded-full border border-[var(--emerald)]/10" style={{ animation: 'ringExpand 2.5s ease-out infinite' }} />
              <div className="absolute w-52 h-52 rounded-full border border-[var(--emerald)]/10" style={{ animation: 'ringExpand 2.5s ease-out infinite', animationDelay: '0.8s' }} />
              <div className="absolute w-52 h-52 rounded-full border border-[var(--emerald)]/10" style={{ animation: 'ringExpand 2.5s ease-out infinite', animationDelay: '1.6s' }} />
            </>
          )}

          {/* Avatar with glow */}
          <div className="relative">
            {status === 'connected' && (
              <div 
                className="absolute -inset-3 rounded-full animate-pulse bg-[var(--emerald)]/10"
              />
            )}
            <Avatar src={remoteUser?.avatar_url} name={remoteUser?.display_name || '?'} size="xxl" />
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              {remoteUser?.display_name}
            </h2>
            <p className="text-white/50 text-sm mt-2 font-light">
              {status === 'calling' && (
                <span className="text-[var(--emerald)] animate-pulse">Calling…</span>
              )}
              {status === 'ringing' && (
                <span className="text-[var(--gold)] animate-pulse">Ringing…</span>
              )}
              {status === 'connected' && (
                <span className="font-mono tracking-widest text-white/70">{duration}</span>
              )}
              {status === 'ended' && 'Call ended'}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-14 pt-10" style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.95) 0%, transparent 100%)' }}>
        <div className="flex items-center justify-center gap-5">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              isMuted
                ? 'bg-white text-[#0F172A]'
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
            style={{ backdropFilter: 'blur(8px)' }}
          >
            {isMuted ? <MicOff size={25} /> : <Mic size={25} />}
          </button>

          {/* Video toggle */}
          {isVideo && (
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                isVideoOff
                  ? 'bg-white text-[#0F172A]'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
              }`}
              style={{ backdropFilter: 'blur(8px)' }}
            >
              {isVideoOff ? <VideoOff size={25} /> : <Video size={25} />}
            </button>
          )}

          {/* Minimize */}
          <button
            onClick={() => setIsMinimized(true)}
            className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all duration-200 border border-white/10"
            style={{ backdropFilter: 'blur(8px)' }}
          >
            <Minimize2 size={25} />
          </button>

          {/* End call */}
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all duration-200 active:scale-95"
            style={{ boxShadow: '0 0 24px rgba(239, 68, 68, 0.4)' }}
          >
            <PhoneOff size={28} />
          </button>
        </div>
      </div>
    </div>
  );
}
