'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { RealtimeSession } from '@openai/agents-realtime';
import { createVoiceAgent } from '@/lib/voice-agent';

export type VoiceAgentStatus = 
  | 'idle' 
  | 'requesting_permission'
  | 'connecting' 
  | 'connected' 
  | 'listening' 
  | 'speaking' 
  | 'error';

interface UseVoiceAgentReturn {
  status: VoiceAgentStatus;
  error: string | null;
  isConnected: boolean;
  isMuted: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
}

export function useVoiceAgent(): UseVoiceAgentReturn {
  const [status, setStatus] = useState<VoiceAgentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const sessionRef = useRef<RealtimeSession | null>(null);

  const connect = useCallback(async () => {
    try {
      setError(null);
      
      // Step 1: Request microphone permission first
      setStatus('requesting_permission');
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.error('Microphone permission denied:', permError);
        setError('Microphone access is required. Please allow microphone permission and try again.');
        setStatus('error');
        return;
      }

      // Step 2: Get ephemeral token from server
      setStatus('connecting');

      const tokenResponse = await fetch('/api/realtime-session', {
        method: 'POST',
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to get session token');
      }

      const { token } = await tokenResponse.json();

      if (!token) {
        throw new Error('Invalid session token received');
      }

      // Step 3: Create agent and session
      const agent = createVoiceAgent();
      const session = new RealtimeSession(agent, {
        transport: 'webrtc',
        model: 'gpt-realtime',
        config: {
          audio: {
            output: {
              voice: 'ash',
              speed: 1.15, // Slightly faster speech
            },
          },
        },
      });

      // Set up event listeners
      session.on('audio_start', () => {
        setStatus('speaking');
      });

      session.on('audio_stopped', () => {
        setStatus('listening');
      });

      session.on('error', (err) => {
        console.error('Voice agent error:', err);
        const errorMessage = err.error instanceof Error 
          ? err.error.message 
          : typeof err.error === 'string' 
            ? err.error 
            : 'An error occurred';
        setError(errorMessage);
        setStatus('error');
      });

      session.on('history_updated', () => {
        // Session is active and receiving data
        if (status === 'connecting' || status === 'connected') {
          setStatus('listening');
        }
      });

      // Step 4: Connect with ephemeral token
      await session.connect({
        apiKey: token,
      });

      sessionRef.current = session;
      setStatus('listening');

      // Step 5: Greet the user - agent initiates the conversation
      session.sendMessage('You just connected to a voice call with the user. Greet them briefly like you just joined a call - something like "Hey! Can you hear me?" or "Hi there, I\'m here!" Keep it short and natural, then ask how you can help with their finances today.');

    } catch (err) {
      console.error('Voice agent connection error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setStatus('error');
    }
  }, [status]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setStatus('idle');
    setError(null);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (sessionRef.current) {
      const newMuted = !isMuted;
      sessionRef.current.mute(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.close();
      }
    };
  }, []);

  return {
    status,
    error,
    isConnected: status === 'connected' || status === 'listening' || status === 'speaking',
    isMuted,
    connect,
    disconnect,
    toggleMute,
  };
}
