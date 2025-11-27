"use client";

import { useEffect, useCallback, useState } from "react";
import { X, Mic, MicOff, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceAgent, type VoiceAgentStatus } from "./use-voice-agent";

interface VoiceAgentDialogProps {
  open: boolean;
  onClose: () => void;
}

const statusConfig: Record<
  VoiceAgentStatus,
  { label: string; color: string; bgColor: string; pulse: boolean }
> = {
  idle: {
    label: "Ready",
    color: "text-zinc-400",
    bgColor: "bg-zinc-800",
    pulse: false,
  },
  requesting_permission: {
    label: "Requesting mic...",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    pulse: true,
  },
  connecting: {
    label: "Connecting...",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    pulse: true,
  },
  connected: {
    label: "Connected",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    pulse: false,
  },
  listening: {
    label: "Listening",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    pulse: true,
  },
  speaking: {
    label: "Speaking",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    pulse: true,
  },
  error: {
    label: "Error",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    pulse: false,
  },
};

export function VoiceAgentDialog({ open, onClose }: VoiceAgentDialogProps) {
  const {
    status,
    error,
    isConnected,
    isMuted,
    connect,
    disconnect,
    toggleMute,
  } = useVoiceAgent();

  // Start expanded, minimize once connected
  const [isMinimized, setIsMinimized] = useState(false);

  // Auto-connect when dialog opens
  useEffect(() => {
    if (open && status === "idle") {
      setIsMinimized(false);
      connect();
    }
  }, [open, status, connect]);

  // Auto-minimize once listening (connected and ready)
  useEffect(() => {
    if (status === "listening" && !isMinimized) {
      // Small delay so user sees the "connected" state
      const timer = setTimeout(() => setIsMinimized(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [status, isMinimized]);

  // Disconnect when dialog closes
  const handleClose = useCallback(() => {
    disconnect();
    setIsMinimized(false);
    onClose();
  }, [disconnect, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        if (isMinimized) {
          setIsMinimized(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose, isMinimized]);

  if (!open) return null;

  const config = statusConfig[status];

  // Minimized floating widget - doesn't block screen
  if (isMinimized && isConnected) {
    return (
      <div className="fixed bottom-6 left-6 z-[100]">
        <div className="bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
          {/* Compact header */}
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Status indicator */}
            <div className="relative">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  status === "listening" && "bg-emerald-500/30",
                  status === "speaking" && "bg-blue-500/30"
                )}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5 text-red-400" />
                ) : (
                  <Mic
                    className={cn(
                      "w-5 h-5",
                      status === "listening" && "text-emerald-400",
                      status === "speaking" && "text-blue-400"
                    )}
                  />
                )}
              </div>
              {/* Pulse ring for active states */}
              {(status === "listening" || status === "speaking") &&
                !isMuted && (
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full animate-ping",
                      status === "listening" && "bg-emerald-500/30",
                      status === "speaking" && "bg-blue-500/30"
                    )}
                    style={{ animationDuration: "2s" }}
                  />
                )}
            </div>

            {/* Status text */}
            <div className="flex flex-col">
              <span className={cn("text-sm font-medium", config.color)}>
                {config.label}
              </span>
              <span className="text-xs text-zinc-500">
                {status === "speaking"
                  ? "AI responding..."
                  : "Say something..."}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={toggleMute}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isMuted
                    ? "bg-red-500/20 text-red-400"
                    : "hover:bg-zinc-800 text-zinc-400"
                )}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsMinimized(false)}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
                aria-label="Expand"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                aria-label="End session"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full dialog for connecting/error states or when expanded
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop - only show when not connected or showing error */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity",
          isConnected ? "bg-black/40" : "bg-black/80",
          "backdrop-blur-sm"
        )}
        onClick={isConnected ? () => setIsMinimized(true) : undefined}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white">
              Finance Assistant
            </h2>
            <div className="flex items-center gap-2">
              {isConnected && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
                  aria-label="Minimize"
                >
                  <Minimize2 className="w-5 h-5 text-zinc-400" />
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-12 flex flex-col items-center">
            {/* Waveform visualization */}
            <div className="relative mb-8">
              {/* Outer rings */}
              <div
                className={cn(
                  "absolute inset-0 rounded-full",
                  status === "listening" && "animate-ping bg-emerald-500/20",
                  status === "speaking" && "animate-ping bg-blue-500/20",
                  (status === "connecting" ||
                    status === "requesting_permission") &&
                    "animate-ping bg-amber-500/20"
                )}
                style={{ animationDuration: "2s" }}
              />

              <div
                className={cn(
                  "absolute -inset-4 rounded-full",
                  status === "listening" && "animate-pulse bg-emerald-500/10",
                  status === "speaking" && "animate-pulse bg-blue-500/10"
                )}
              />

              {/* Main circle */}
              <div
                className={cn(
                  "relative w-32 h-32 rounded-full flex items-center justify-center",
                  "transition-all duration-300",
                  status === "idle" && "bg-zinc-800",
                  (status === "connecting" ||
                    status === "requesting_permission") &&
                    "bg-gradient-to-br from-amber-500/30 to-orange-600/30",
                  status === "connected" &&
                    "bg-gradient-to-br from-emerald-500/30 to-teal-600/30",
                  status === "listening" &&
                    "bg-gradient-to-br from-emerald-500/40 to-teal-600/40",
                  status === "speaking" &&
                    "bg-gradient-to-br from-blue-500/40 to-indigo-600/40",
                  status === "error" &&
                    "bg-gradient-to-br from-red-500/30 to-rose-600/30"
                )}
              >
                {status === "connecting" ||
                status === "requesting_permission" ? (
                  <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
                ) : isMuted ? (
                  <MicOff className="w-12 h-12 text-red-400" />
                ) : (
                  <Mic
                    className={cn(
                      "w-12 h-12 transition-colors",
                      status === "listening" && "text-emerald-400",
                      status === "speaking" && "text-blue-400",
                      status === "error" && "text-red-400",
                      (status === "idle" || status === "connected") &&
                        "text-zinc-400"
                    )}
                  />
                )}
              </div>
            </div>

            {/* Status */}
            <div
              className={cn(
                "text-lg font-medium mb-2 transition-colors",
                config.color,
                config.pulse && "animate-pulse"
              )}
            >
              {config.label}
            </div>

            {/* Error message */}
            {error && (
              <div className="text-red-400 text-sm text-center mb-4 max-w-xs">
                {error}
              </div>
            )}

            {/* Hint text */}
            <p className="text-zinc-500 text-sm text-center max-w-xs">
              {status === "requesting_permission"
                ? "Please allow microphone access to continue"
                : status === "listening"
                ? "Ask me about your finances, spending, investments, or goals"
                : status === "speaking"
                ? "I'm responding..."
                : status === "error"
                ? "Something went wrong. Please try again."
                : "Connecting to your financial assistant..."}
            </p>

            {/* Minimize hint when connected */}
            {isConnected && (
              <p className="text-zinc-600 text-xs text-center mt-4">
                Click minimize or tap outside to browse while talking
              </p>
            )}
          </div>

          {/* Footer controls */}
          <div className="px-6 py-4 border-t border-zinc-800 flex justify-center gap-4">
            {isConnected && (
              <>
                <button
                  onClick={toggleMute}
                  className={cn(
                    "px-6 py-3 rounded-full font-medium transition-all",
                    isMuted
                      ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  )}
                >
                  {isMuted ? "Unmute" : "Mute"}
                </button>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="px-6 py-3 rounded-full bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-all"
                >
                  Minimize
                </button>
              </>
            )}

            {status === "error" && (
              <button
                onClick={connect}
                className="px-6 py-3 rounded-full bg-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/30 transition-all"
              >
                Try Again
              </button>
            )}

            <button
              onClick={handleClose}
              className="px-6 py-3 rounded-full bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-all"
            >
              End Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
