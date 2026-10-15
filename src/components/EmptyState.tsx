import React from 'react';
import {
  Lock,
  MessageSquarePlus,
  Users,
  Sparkles,
  ShieldCheck,
  Laptop,
  Smartphone,
  Radio,
  ArrowRight,
  Database,
} from 'lucide-react';
import { UserSession } from '../types';
import { UI_MODE_CONFIG, GRADIENT_CONFIG } from '../utils/theme';

interface EmptyStateProps {
  session: UserSession;
  onStartNewChat: () => void;
  onOpenGroupModal: () => void;
  onLaunchAI: () => void;
  onOpenSecurityModal: () => void;
  onOpenBackupModal: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  session,
  onStartNewChat,
  onOpenGroupModal,
  onLaunchAI,
  onOpenSecurityModal,
  onOpenBackupModal,
}) => {
  const theme = UI_MODE_CONFIG[session.uiMode];
  const gradient = GRADIENT_CONFIG[session.gradientMode];

  return (
    <div
      className={`h-full w-full flex-1 flex flex-col items-center justify-between p-6 sm:p-10 ${theme.chatBg} ${theme.textPrimary} select-none overflow-y-auto`}
    >
      {/* Top spacer */}
      <div className="w-full flex justify-end">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-900/30 px-3 py-1.5 rounded-full border border-slate-800/60">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span>Zero Server Logs Relay · Online</span>
        </div>
      </div>

      {/* Center WhatsApp Web style graphic and message */}
      <div className="flex flex-col items-center text-center max-w-lg my-auto py-8">
        {/* WhatsApp style devices illustration */}
        <div className="relative mb-6">
          <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-500/20 via-purple-500/10 to-transparent flex items-center justify-center border border-cyan-500/20 shadow-2xl relative">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-xl">
                <Laptop className="w-9 h-9 text-cyan-400" />
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 shadow-xl -ml-2 mb-4">
                <Smartphone className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
          {/* Decorative small lock badge */}
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-slate-950">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Title & Tagline */}
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
          Chatter Web
        </h1>
        <p className="text-sm text-slate-400 leading-relaxed max-w-md mb-6">
          Send and receive end-to-end encrypted messages without keeping your device online. Your chats, media, voice notes, and calls are encrypted with client-side AES-256-GCM.
        </p>

        {/* Fast Action Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-6">
          <button
            onClick={onStartNewChat}
            className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white group-hover:text-cyan-300">New Direct Chat</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Connect with 10-digit code</p>
          </button>

          <button
            onClick={onOpenGroupModal}
            className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 text-left transition-all group cursor-pointer shadow-sm"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-white group-hover:text-purple-300">New Group Chat</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Multi-peer room</p>
          </button>

          <button
            onClick={onLaunchAI}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-purple-950/30 to-slate-900/60 hover:border-cyan-400/50 border border-cyan-500/30 text-left transition-all group cursor-pointer shadow-sm relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-md">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-bold text-cyan-200 group-hover:text-white flex items-center gap-1">
              <span>Chatter AI</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-300">Pro</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Smarter than Meta AI</p>
          </button>
        </div>

        {/* Feature Highlights Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
          <span className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800">
            Instagram-Style Gradient Bubbles
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800">
            Voice Notes & P2P Calls
          </span>
          <span className="px-3 py-1 rounded-full bg-slate-900/60 border border-slate-800">
            Vanish Mode Countdowns
          </span>
        </div>
      </div>

      {/* Bottom WhatsApp Security Statement */}
      <footer className="w-full flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-800/50 text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5 text-center sm:text-left">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            End-to-end encrypted. No data is stored on servers. All sessions are zero-trace.
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSecurityModal}
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verify Security</span>
          </button>
          <span>·</span>
          <button
            onClick={onOpenBackupModal}
            className="text-purple-400 hover:underline flex items-center gap-1"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Encrypted Vault</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
