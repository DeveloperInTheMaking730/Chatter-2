import React, { useState } from 'react';
import { Shield, Sparkles, Lock, Flame, Database, Moon, Sun, EyeOff, Radio } from 'lucide-react';
import { generate10DigitCode } from '../services/crypto';
import { UserSession, ChatMode, UIMode, GradientMode } from '../types';
import { UI_MODE_CONFIG, GRADIENT_CONFIG } from '../utils/theme';

interface LoginScreenProps {
  onLogin: (session: UserSession) => void;
}

const AVATAR_EMOJIS = ['🦊', '🦉', '⚡', '🌌', '🪐', '🛡️', '💎', '🚀', '🔮', '👾', '🔥', '🌊'];
const AVATAR_COLORS = [
  'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'bg-rose-500/20 text-rose-400 border-rose-500/30',
  'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [friendCode, setFriendCode] = useState(() => generate10DigitCode());
  const [chatMode, setChatMode] = useState<ChatMode>('anonymous');
  const [uiMode, setUiMode] = useState<UIMode>('dark');
  const [gradientMode, setGradientMode] = useState<GradientMode>('purple');
  const [selectedEmoji, setSelectedEmoji] = useState('🦊');
  const [selectedBg, setSelectedBg] = useState(AVATAR_COLORS[1]);
  const [error, setError] = useState('');

  const currentTheme = UI_MODE_CONFIG[uiMode];
  const currentGradient = GRADIENT_CONFIG[gradientMode];

  const handleGenerateRandom = () => {
    const randomAdjectives = ['Ghost', 'Shadow', 'Neo', 'Echo', 'Viper', 'Cipher', 'Flux', 'Nova', 'Apex', 'Zero'];
    const randomNum = Math.floor(1000 + Math.random() * 9000).toString();
    const prefix = randomAdjectives[Math.floor(Math.random() * randomAdjectives.length)];
    const generatedUser = (prefix + randomNum).slice(0, 10);

    setUsername(generatedUser);
    setFriendCode(generate10DigitCode());
    const randEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
    const randBg = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    setSelectedEmoji(randEmoji);
    setSelectedBg(randBg);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().slice(0, 10);
    const cleanCode = friendCode.trim().slice(0, 10);

    if (!cleanUser) {
      setError('Please provide a username (max 10 characters)');
      return;
    }
    if (!cleanCode) {
      setError('Please provide a 10-digit friend code');
      return;
    }

    onLogin({
      username: cleanUser,
      friendCode: cleanCode,
      avatarEmoji: selectedEmoji,
      avatarBg: selectedBg,
      createdAt: Date.now(),
      chatMode,
      uiMode,
      gradientMode,
    });
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-300 ${currentTheme.bgClass} ${currentTheme.textPrimary}`}>
      <div className={`w-full max-w-xl p-6 sm:p-8 rounded-3xl border ${currentTheme.borderClass} ${currentTheme.cardBg} shadow-2xl relative overflow-hidden backdrop-blur-xl`}>
        {/* Subtle decorative glow in header */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Lockup */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 shadow-lg mb-3">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Chatter</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm">
            End-to-end encrypted messaging with Chatter AI. No registration, zero server logs, volatile RAM memory.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar & Random identity trigger */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-700/40 bg-slate-800/20">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${selectedBg} shadow-sm`}>
                {selectedEmoji}
              </div>
              <div>
                <p className="text-xs font-semibold">Avatar Icon</p>
                <div className="flex gap-1 mt-1 overflow-x-auto max-w-[180px] sm:max-w-[260px] pb-1">
                  {AVATAR_EMOJIS.slice(0, 6).map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setSelectedEmoji(em)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-transform hover:scale-110 ${
                        selectedEmoji === em ? 'ring-2 ring-cyan-400 scale-105' : 'opacity-70'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateRandom}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all active:scale-95 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Fill</span>
            </button>
          </div>

          {/* Credentials Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Username (Max 10)</label>
                <span className="text-[10px] text-slate-500 font-mono">{username.length}/10</span>
              </div>
              <input
                type="text"
                maxLength={10}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))}
                placeholder="e.g. Ghost74"
                className={`w-full px-3.5 py-2.5 rounded-xl border ${currentTheme.borderClass} ${currentTheme.inputBg} ${currentTheme.textPrimary} text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all`}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Friend Code (10 digits)</label>
                <button
                  type="button"
                  onClick={() => setFriendCode(generate10DigitCode())}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Generate New
                </button>
              </div>
              <input
                type="text"
                maxLength={10}
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="10-digit number"
                className={`w-full px-3.5 py-2.5 rounded-xl border ${currentTheme.borderClass} ${currentTheme.inputBg} ${currentTheme.textPrimary} text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all`}
                required
              />
            </div>
          </div>

          {/* 3 Privacy & Storage Modes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Privacy & Storage Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Anonymous Mode */}
              <button
                type="button"
                onClick={() => setChatMode('anonymous')}
                className={`p-3 rounded-2xl text-left border transition-all relative ${
                  chatMode === 'anonymous'
                    ? 'border-cyan-500/70 bg-cyan-500/10 shadow-md ring-1 ring-cyan-500'
                    : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-cyan-400 mb-1">
                  <EyeOff className="w-4 h-4" />
                  <span className="text-xs font-bold">Anonymous</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Zero trace. RAM-only memory. Wipes completely on app exit.
                </p>
              </button>

              {/* Temporary Ephemeral Mode */}
              <button
                type="button"
                onClick={() => setChatMode('ephemeral')}
                className={`p-3 rounded-2xl text-left border transition-all relative ${
                  chatMode === 'ephemeral'
                    ? 'border-orange-500/70 bg-orange-500/10 shadow-md ring-1 ring-orange-500'
                    : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-orange-400 mb-1">
                  <Flame className="w-4 h-4" />
                  <span className="text-xs font-bold">Ephemeral</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Self-destruct countdowns. Messages burn after reading.
                </p>
              </button>

              {/* Permanent Backup Mode */}
              <button
                type="button"
                onClick={() => setChatMode('backup')}
                className={`p-3 rounded-2xl text-left border transition-all relative ${
                  chatMode === 'backup'
                    ? 'border-purple-500/70 bg-purple-500/10 shadow-md ring-1 ring-purple-500'
                    : 'border-slate-800/80 bg-slate-900/30 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-purple-400 mb-1">
                  <Database className="w-4 h-4" />
                  <span className="text-xs font-bold">Cloud Backup</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Client-side encrypted vault. Offline sync & password backup.
                </p>
              </button>
            </div>
          </div>

          {/* Aesthetic UI Mode (Dark, Light, Ultra Dark, Neon) */}
          <div className="space-y-3 pt-1 border-t border-slate-800/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Theme Appearance</span>
              <div className="flex gap-1 bg-slate-800/40 p-1 rounded-xl border border-slate-700/50">
                {(['dark', 'light', 'ultra-dark', 'neon'] as UIMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setUiMode(mode)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                      uiMode === mode
                        ? 'bg-cyan-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode === 'ultra-dark' ? 'Ultra Dark' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Gradient Modes */}
            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-1.5">Instagram Bubble Gradient</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['sunset', 'ocean', 'moss', 'purple'] as GradientMode[]).map((grad) => {
                  const g = GRADIENT_CONFIG[grad];
                  return (
                    <button
                      key={grad}
                      type="button"
                      onClick={() => setGradientMode(grad)}
                      className={`p-2 rounded-xl text-left border transition-all ${
                        gradientMode === grad
                          ? `border-white/50 ring-2 ${g.accentRing} ${g.glowShadow}`
                          : 'border-slate-800/70 hover:border-slate-700'
                      }`}
                    >
                      <div className={`h-4 w-full rounded-md bg-gradient-to-r ${g.previewColors} mb-1.5`} />
                      <p className="text-[11px] font-bold text-slate-200 truncate">{g.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Privacy Security Checklist */}
          <div className="p-3 rounded-2xl bg-slate-900/40 border border-slate-800/70 flex items-start gap-2.5 text-[11px] text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-emerald-400 font-semibold">Strict Zero-Server Policy: </span>
              All payloads are encrypted in browser memory via AES-256-GCM before transmission. No message logs, media, or private keys are ever stored on any server.
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            className={`w-full py-3.5 px-4 rounded-2xl text-sm font-bold shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 ${currentGradient.bubbleClass}`}
          >
            <Radio className="w-4 h-4" />
            <span>Launch Encrypted Session</span>
          </button>
        </form>
      </div>
    </div>
  );
};
