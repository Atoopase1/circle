// ============================================================
// CallModal — Active call overlay UI
// ============================================================
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

  // Minimized view — small floating pip
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-24 right-4 z-[100] w-40 h-28 bg-[#1a1a2e] rounded-2xl shadow-2xl border border-[#333] cursor-pointer overflow-hidden group"
        onClick={() => setIsMinimized(false)}
      >
        {isVideo && remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Avatar src={remoteUser?.avatar_url} name={remoteUser?.display_name || '?'} size="md" />
          </div>
        )}
        <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between">
          <span className="text-white text-[10px] font-mono bg-black/50 px-1.5 py-0.5 rounded">
            {status === 'connected' ? duration : 'Calling…'}
          </span>
          <Maximize2 size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); endCall(); }}
          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <PhoneOff size={10} className="text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0a1a] flex flex-col">
      {/* Video Background */}
      {isVideo && (
        <>
          {/* Remote video — full screen background */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Local video — small picture-in-picture */}
          <div className="absolute top-6 right-6 w-32 h-44 rounded-2xl overflow-hidden shadow-xl border-2 border-white/20 z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
            />
            {isVideoOff && (
              <div className="w-full h-full bg-[#2a2a4a] flex items-center justify-center">
                <VideoOff size={24} className="text-white/50" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Audio-only layout */}
      {!isVideo && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-[#1a1a3e] to-[#0a0a1a]">
          {/* Decorative ripples */}
          {status === 'calling' && (
            <>
              <div className="absolute w-48 h-48 rounded-full border border-white/5 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute w-36 h-36 rounded-full border border-white/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
            </>
          )}
          <div className="relative">
            {status === 'connected' && (
              <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 animate-pulse" />
            )}
            <Avatar src={remoteUser?.avatar_url} name={remoteUser?.display_name || '?'} size="xl" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white">{remoteUser?.display_name}</h2>
            <p className="text-white/60 text-sm mt-1">
              {status === 'calling' && 'Calling…'}
              {status === 'ringing' && 'Ringing…'}
              {status === 'connected' && duration}
              {status === 'ended' && 'Call ended'}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-12 pt-8 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-6">
          {/* Mute */}
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-white text-[#1a1a2e]'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Video toggle (only for video calls) */}
          {isVideo && (
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoOff
                  ? 'bg-white text-[#1a1a2e]'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>
          )}

          {/* Minimize */}
          <button
            onClick={() => setIsMinimized(true)}
            className="w-14 h-14 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25 transition-all"
          >
            <Minimize2 size={22} />
          </button>

          {/* End call */}
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
          >
            <PhoneOff size={26} />
          </button>
        </div>
      </div>
    </div>
  );
}
