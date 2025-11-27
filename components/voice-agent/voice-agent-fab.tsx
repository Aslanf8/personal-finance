'use client';

import { useState } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceAgentDialog } from './voice-agent-dialog';

export function VoiceAgentFAB() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          // Positioning - bottom left, fixed
          "fixed bottom-6 left-6 z-50",
          // Size and shape
          "h-14 w-14 rounded-full",
          // Gradient background - distinct from scan button
          "bg-gradient-to-br from-violet-500 to-indigo-600",
          // Shadow and depth
          "shadow-lg shadow-violet-500/25",
          // Hover effects
          "hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105",
          // Active state
          "active:scale-95",
          // Transition
          "transition-all duration-200 ease-out",
          // Flex for icon centering
          "flex items-center justify-center",
          // Touch optimization
          "touch-manipulation",
          // Ring on focus
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
        )}
        aria-label="Open voice assistant"
      >
        <Mic className="h-6 w-6 text-white" strokeWidth={2.5} />
        
        {/* Subtle pulse animation ring */}
        <span 
          className="absolute inset-0 rounded-full bg-violet-400/20 animate-ping" 
          style={{ animationDuration: '3s' }} 
        />
      </button>

      <VoiceAgentDialog 
        open={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}

