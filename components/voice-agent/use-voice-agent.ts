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

interface FinancialOverview {
  userName: string | null;
  netWorth: number;
  cashBalance: number;
  investmentValue: number;
  investmentGainPercent: number;
  holdingsCount: number;
  thisMonth: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number;
    topCategory: { name: string; amount: number } | null;
  };
  goal: { name: string; progress: number; remaining: number } | null;
  currency: string;
}

interface UseVoiceAgentReturn {
  status: VoiceAgentStatus;
  error: string | null;
  isConnected: boolean;
  isMuted: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
}

function buildContextMessage(overview: FinancialOverview): string {
  const name = overview.userName ? `User's name: ${overview.userName}. ` : '';
  const goal = overview.goal 
    ? `Goal: "${overview.goal.name}" - ${overview.goal.progress}% complete. ` 
    : '';
  const topSpend = overview.thisMonth.topCategory 
    ? `Top spend: ${overview.thisMonth.topCategory.name} ($${overview.thisMonth.topCategory.amount}). ` 
    : '';

  return `[CONTEXT - use this data when user asks, don't mention it upfront] ${name}Net worth: ~$${overview.netWorth.toLocaleString()} (Cash: $${overview.cashBalance.toLocaleString()}, Investments: $${overview.investmentValue.toLocaleString()}). Investments ${overview.investmentGainPercent >= 0 ? 'up' : 'down'} ${Math.abs(overview.investmentGainPercent)}% across ${overview.holdingsCount} holdings. This month: $${overview.thisMonth.income.toLocaleString()} income, $${overview.thisMonth.expenses.toLocaleString()} expenses (${overview.thisMonth.savingsRate}% savings rate). ${topSpend}${goal}

Just say hi${overview.userName ? ` ${overview.userName}` : ''} and ask what they need help with. Don't mention any numbers or facts yet.`;
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
        stream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.error('Microphone permission denied:', permError);
        setError('Microphone access is required. Please allow microphone permission and try again.');
        setStatus('error');
        return;
      }

      // Step 2: Get token AND overview in parallel for speed
      setStatus('connecting');

      const [tokenResponse, overviewResponse] = await Promise.all([
        fetch('/api/realtime-session', { method: 'POST' }),
        fetch('/api/voice-agent/overview'),
      ]);

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to get session token');
      }

      const { token } = await tokenResponse.json();
      if (!token) {
        throw new Error('Invalid session token received');
      }

      // Get overview (don't fail if this errors, just proceed without it)
      let overview: FinancialOverview | null = null;
      if (overviewResponse.ok) {
        overview = await overviewResponse.json();
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
              speed: 1.15,
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

      // Step 5: Send context and prompt response
      if (overview) {
        session.sendMessage(buildContextMessage(overview));
      } else {
        session.sendMessage('Say hi and ask how you can help with their finances. Keep it brief.');
      }

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
