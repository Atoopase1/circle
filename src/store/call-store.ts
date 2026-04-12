// ============================================================
// Call Store — WebRTC-based audio/video calling
// ============================================================
'use client';

import { create } from 'zustand';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Profile, CallType, CallStatus } from '@/types';

// ICE servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

interface CallStoreState {
  // Call state
  callId: string | null;
  callType: CallType;
  status: CallStatus;
  remoteUser: Profile | null;
  isMuted: boolean;
  isVideoOff: boolean;
  startedAt: string | null;
  callDuration: number;

  // WebRTC internals
  peerConnection: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // Incoming call
  incomingCall: {
    callId: string;
    callType: CallType;
    caller: Profile;
    offer: RTCSessionDescriptionInit;
  } | null;

  // Actions
  initiateCall: (remoteUser: Profile, callType: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  setIncomingCall: (call: CallStoreState['incomingCall']) => void;
  _cleanup: () => void;
}

export const useCallStore = create<CallStoreState>((set, get) => ({
  callId: null,
  callType: 'audio',
  status: 'idle',
  remoteUser: null,
  isMuted: false,
  isVideoOff: false,
  startedAt: null,
  callDuration: 0,
  peerConnection: null,
  localStream: null,
  remoteStream: null,
  incomingCall: null,

  initiateCall: async (remoteUser: Profile, callType: CallType) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      const remoteStream = new MediaStream();

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote tracks
      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        set({ remoteStream });
      };

      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Handle ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.channel(`call:${callId}`).send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              candidate: event.candidate.toJSON(),
              from: user.id,
            },
          });
        }
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          set({ status: 'connected', startedAt: new Date().toISOString() });
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          get().endCall();
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      set({
        callId,
        callType,
        status: 'calling',
        remoteUser,
        peerConnection: pc,
        localStream: stream,
        remoteStream,
        isMuted: false,
        isVideoOff: false,
      });

      // Subscribe to the call channel for signaling
      const callChannel = supabase.channel(`call:${callId}`);

      callChannel
        .on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (payload.from !== user.id && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
          }
        })
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from !== user.id) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.error('Error adding ICE candidate:', e);
            }
          }
        })
        .on('broadcast', { event: 'call-rejected' }, () => {
          get().endCall();
        })
        .on('broadcast', { event: 'call-ended' }, () => {
          get().endCall();
        })
        .subscribe();

      // Signal the other user via Supabase Realtime broadcast on a user-specific channel
      const userChannel = supabase.channel(`user:${remoteUser.id}`);
      await userChannel.subscribe();
      
      // Small delay to ensure subscription is ready
      await new Promise((r) => setTimeout(r, 500));

      await userChannel.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: {
          callId,
          callType,
          caller: {
            id: user.id,
            display_name: (await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single()).data,
          },
          offer: offer,
        },
      });

      // Auto-end after 45 seconds if not answered
      setTimeout(() => {
        if (get().status === 'calling') {
          get().endCall();
        }
      }, 45000);

    } catch (err) {
      console.error('Failed to initiate call:', err);
      get()._cleanup();
    }
  },

  acceptCall: async () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: incomingCall.callType === 'video',
      });

      const pc = new RTCPeerConnection(ICE_SERVERS);
      const remoteStream = new MediaStream();

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
        set({ remoteStream });
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await supabase.channel(`call:${incomingCall.callId}`).send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              candidate: event.candidate.toJSON(),
              from: user.id,
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          set({ status: 'connected', startedAt: new Date().toISOString() });
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          get().endCall();
        }
      };

      // Set remote description (the offer from caller)
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Subscribe to call channel for ICE candidates and end events
      const callChannel = supabase.channel(`call:${incomingCall.callId}`);
      callChannel
        .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from !== user.id) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.error('Error adding ICE candidate:', e);
            }
          }
        })
        .on('broadcast', { event: 'call-ended' }, () => {
          get().endCall();
        })
        .subscribe();

      // Send the answer back
      await supabase.channel(`call:${incomingCall.callId}`).send({
        type: 'broadcast',
        event: 'answer',
        payload: {
          answer,
          from: user.id,
        },
      });

      set({
        callId: incomingCall.callId,
        callType: incomingCall.callType,
        status: 'connected',
        remoteUser: incomingCall.caller,
        peerConnection: pc,
        localStream: stream,
        remoteStream,
        incomingCall: null,
        isMuted: false,
        isVideoOff: false,
        startedAt: new Date().toISOString(),
      });

    } catch (err) {
      console.error('Failed to accept call:', err);
      get()._cleanup();
    }
  },

  rejectCall: () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    const supabase = getSupabaseBrowserClient();
    supabase.channel(`call:${incomingCall.callId}`).send({
      type: 'broadcast',
      event: 'call-rejected',
      payload: {},
    });

    set({ incomingCall: null });
  },

  endCall: () => {
    const { callId, peerConnection } = get();
    
    if (callId) {
      const supabase = getSupabaseBrowserClient();
      supabase.channel(`call:${callId}`).send({
        type: 'broadcast',
        event: 'call-ended',
        payload: {},
      });
    }

    get()._cleanup();
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted; // Toggle: if muted → enable, if not muted → disable
      });
      set({ isMuted: !isMuted });
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
      set({ isVideoOff: !isVideoOff });
    }
  },

  setIncomingCall: (call) => set({ incomingCall: call }),

  _cleanup: () => {
    const { localStream, peerConnection } = get();

    // Stop all tracks
    localStream?.getTracks().forEach((track) => track.stop());

    // Close peer connection
    peerConnection?.close();

    set({
      callId: null,
      status: 'idle',
      remoteUser: null,
      peerConnection: null,
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isVideoOff: false,
      startedAt: null,
      callDuration: 0,
      incomingCall: null,
    });
  },
}));
