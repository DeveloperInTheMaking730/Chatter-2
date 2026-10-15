import React, { useState } from 'react';
import { Users, Plus, X, Shield, Hash } from 'lucide-react';
import { GroupChat } from '../types';

interface GroupModalProps {
  myFriendCode: string;
  myUsername: string;
  onCreateGroup: (group: GroupChat) => void;
  onClose: () => void;
}

const GROUP_EMOJIS = ['👥', '🔒', '⚔️', '⚡', '🚀', '🌐', '🛡️', '🛸', '🎯', '🔥'];

export const GroupModal: React.FC<GroupModalProps> = ({
  myFriendCode,
  myUsername,
  onCreateGroup,
  onClose,
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👥');
  const [memberCodeInput, setMemberCodeInput] = useState('');
  const [memberCodes, setMemberCodes] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleAddMember = () => {
    const clean = memberCodeInput.trim().replace(/[^0-9]/g, '');
    if (!clean) return;
    if (clean === myFriendCode) {
      setError('You are already included as admin');
      return;
    }
    if (memberCodes.includes(clean)) {
      setError('Member already in group');
      return;
    }
    if (clean.length < 5) {
      setError('Friend code must be valid (at least 5-10 digits)');
      return;
    }

    setMemberCodes([...memberCodes, clean]);
    setMemberCodeInput('');
    setError('');
  };

  const handleRemoveMember = (code: string) => {
    setMemberCodes(memberCodes.filter((c) => c !== code));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError('Please provide a group name');
      return;
    }

    const newGroup: GroupChat = {
      id: 'grp_' + Date.now().toString(),
      name: groupName.trim(),
      avatarEmoji: selectedEmoji,
      avatarBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
      creatorCode: myFriendCode,
      members: [
        { friendCode: myFriendCode, username: myUsername, role: 'admin' },
        ...memberCodes.map((code) => ({
          friendCode: code,
          username: `User_${code.slice(-4)}`,
          role: 'member' as const,
        })),
      ],
      createdAt: Date.now(),
      unreadCount: 0,
      ephemeralTimer: 0,
    };

    onCreateGroup(newGroup);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl p-6 bg-[#111422] border border-cyan-500/30 text-slate-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Create Encrypted Group</h3>
              <p className="text-xs text-slate-400">Multi-peer end-to-end encrypted room</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          {/* Group Icon & Name */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                {selectedEmoji}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Group Name</label>
              <input
                type="text"
                placeholder="e.g. Core Operatives"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={25}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          {/* Emoji selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Group Icon</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {GROUP_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-base border transition-transform ${
                    selectedEmoji === emoji
                      ? 'border-cyan-400 bg-cyan-500/20 scale-105'
                      : 'border-slate-800 bg-slate-900/40 hover:scale-105'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Member code addition */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Add Members (10-Digit Friend Code)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter 10-digit friend code..."
                value={memberCodeInput}
                onChange={(e) => setMemberCodeInput(e.target.value)}
                maxLength={10}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Members list */}
          <div>
            <span className="text-xs font-medium text-slate-400 mb-2 block">
              Participants ({memberCodes.length + 1})
            </span>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {/* Self */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px]">
                    You
                  </div>
                  <span className="font-semibold text-slate-200">{myUsername}</span>
                  <span className="text-[10px] text-slate-500 font-mono">({myFriendCode})</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
                  Admin
                </span>
              </div>

              {/* Added members */}
              {memberCodes.map((code) => (
                <div key={code} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/40 border border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono text-cyan-300">{code}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(code)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Group security note */}
          <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-400/90 flex items-start gap-2">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>Group messages are encrypted with a derived group key distributed peer-to-peer.</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Create Encrypted Group
          </button>
        </form>
      </div>
    </div>
  );
};
