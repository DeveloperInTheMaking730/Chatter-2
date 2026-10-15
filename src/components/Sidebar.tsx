import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  Search,
  Copy,
  Check,
  Palette,
  Database,
  Flame,
  EyeOff,
  UserPlus,
  ShieldCheck,
  Sparkles,
  Pin,
  X,
  MessageSquare,
  Lock,
} from 'lucide-react';
import { UserSession, Contact, GroupChat, Message } from '../types';
import { UI_MODE_CONFIG, GRADIENT_CONFIG, formatTimestamp } from '../utils/theme';

interface SidebarProps {
  session: UserSession;
  contacts: Contact[];
  groups: GroupChat[];
  allMessages: Record<string, Message[]>;
  activeChatId: string | null;
  onSelectChat: (id: string, isGroup: boolean) => void;
  onAddContact: (friendCode: string, name?: string) => void;
  onOpenGroupModal: () => void;
  onOpenThemeModal: () => void;
  onOpenBackupModal: () => void;
  onPanicWipe: () => void;
  onTogglePinChat: (id: string, isGroup: boolean) => void;
  onLaunchAI: () => void;
  isOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  session,
  contacts,
  groups,
  allMessages,
  activeChatId,
  onSelectChat,
  onAddContact,
  onOpenGroupModal,
  onOpenThemeModal,
  onOpenBackupModal,
  onPanicWipe,
  onTogglePinChat,
  onLaunchAI,
  isOnline,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'pinned' | 'groups'>('all');
  const [newFriendCode, setNewFriendCode] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmPanic, setConfirmPanic] = useState(false);

  const theme = UI_MODE_CONFIG[session.uiMode];
  const gradient = GRADIENT_CONFIG[session.gradientMode];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateDirectChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFriendCode.trim().replace(/[^0-9]/g, '').slice(0, 10);
    if (!clean) return;
    if (clean === session.friendCode) {
      alert('You cannot start a direct chat with yourself');
      return;
    }
    onAddContact(clean);
    setNewFriendCode('');
    setIsAddingContact(false);
  };

  // Sort pinned items to the top
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.lastMessageTime || 0) - (a.lastMessageTime || 0);
  });

  const sortedGroups = [...groups].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (b.lastMessageTime || 0) - (a.lastMessageTime || 0);
  });

  // Filter contacts
  const filteredContacts = sortedContacts.filter((c) => {
    if (filterMode === 'groups') return false;
    if (filterMode === 'unread' && c.unreadCount === 0) return false;
    if (filterMode === 'pinned' && !c.isPinned) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = c.username.toLowerCase().includes(query) || c.friendCode.includes(query);
    const msgMatch = (allMessages[c.friendCode] || []).some((m) =>
      m.content.toLowerCase().includes(query)
    );
    return nameMatch || msgMatch;
  });

  // Filter groups
  const filteredGroups = sortedGroups.filter((g) => {
    if (filterMode === 'unread' && g.unreadCount === 0) return false;
    if (filterMode === 'pinned' && !g.isPinned) return false;
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const nameMatch = g.name.toLowerCase().includes(query);
    const msgMatch = (allMessages[g.id] || []).some((m) =>
      m.content.toLowerCase().includes(query)
    );
    return nameMatch || msgMatch;
  });

  return (
    <aside
      className={`h-full w-full md:w-80 lg:w-96 flex flex-col border-r ${theme.borderClass} ${theme.sidebarBg} ${theme.textPrimary} select-none shrink-0 transition-colors duration-200`}
    >
      {/* 1. User Header with App Title & Panic Button */}
      <header className={`p-3.5 border-b ${theme.borderClass} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl border ${session.avatarBg} shadow-sm`}
            >
              {session.avatarEmoji}
            </div>
            {/* Online indicator */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                isOnline ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              title={isOnline ? 'Connected' : 'Offline'}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm leading-tight tracking-tight text-white">
                Chatter
              </span>
              {/* Mode badge */}
              {session.chatMode === 'anonymous' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-cyan-500/15 text-cyan-400 font-semibold flex items-center gap-0.5">
                  <EyeOff className="w-2.5 h-2.5" />
                  <span>Anon</span>
                </span>
              )}
              {session.chatMode === 'ephemeral' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-orange-500/15 text-orange-400 font-semibold flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5" />
                  <span>Burn</span>
                </span>
              )}
              {session.chatMode === 'backup' && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-purple-500/15 text-purple-400 font-semibold flex items-center gap-0.5">
                  <Database className="w-2.5 h-2.5" />
                  <span>Vault</span>
                </span>
              )}
            </div>

            {/* Friend Code with quick copy */}
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-400 transition-colors mt-0.5 group"
              title="Click to copy your 10-digit friend code"
            >
              <span>{session.username} · #{session.friendCode}</span>
              {copiedCode ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
              )}
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Appearance Switcher */}
          <button
            onClick={onOpenThemeModal}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Appearance & Gradients"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Backup Vault */}
          <button
            onClick={onOpenBackupModal}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Vault & Backup"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Panic Wipe Button */}
          <button
            onClick={() => {
              if (confirmPanic) {
                onPanicWipe();
              } else {
                setConfirmPanic(true);
                setTimeout(() => setConfirmPanic(false), 3000);
              }
            }}
            className={`px-2 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              confirmPanic
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30'
            }`}
            title="Immediately erase all RAM, storage and active keys"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="text-[11px]">{confirmPanic ? 'CONFIRM?' : 'Panic'}</span>
          </button>
        </div>
      </header>

      {/* 2. Persistent Search Bar (Sticky at Top) */}
      <div className={`p-3 border-b ${theme.borderClass} space-y-2 bg-slate-900/30 sticky top-0 z-10 backdrop-blur-md`}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search contacts, groups or messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-8 py-2 rounded-xl border ${theme.borderClass} ${theme.inputBg} ${theme.textPrimary} text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* WhatsApp-Style Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: 'Unread' },
            { id: 'pinned', label: 'Pinned' },
            { id: 'groups', label: 'Groups' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterMode === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. New Chat & Group Action Bar */}
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-slate-800/40">
        <button
          onClick={() => setIsAddingContact(!isAddingContact)}
          className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
            isAddingContact
              ? 'bg-cyan-500 text-white border-cyan-400'
              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>

        <button
          onClick={onOpenGroupModal}
          className="py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-purple-500/20 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer"
          title="Create Group"
        >
          <Users className="w-3.5 h-3.5" />
          <span>New Group</span>
        </button>
      </div>

      {/* Input popup for new direct contact */}
      {isAddingContact && (
        <form
          onSubmit={handleCreateDirectChat}
          className="mx-3 my-2 p-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 space-y-2 shadow-lg"
        >
          <label className="text-[11px] font-semibold text-slate-200 block">
            Connect via 10-Digit Friend Code:
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              maxLength={10}
              placeholder="e.g. 8492019482"
              value={newFriendCode}
              onChange={(e) => setNewFriendCode(e.target.value.replace(/[^0-9]/g, ''))}
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Start
            </button>
          </div>
        </form>
      )}

      {/* 4. Conversations Scroll List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        {/* Meta AI / Chatter AI Highlighted Card */}
        {filterMode !== 'groups' && (
          <button
            onClick={onLaunchAI}
            className={`w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer relative overflow-hidden group ${
              activeChatId === 'ai_chatter'
                ? 'bg-gradient-to-r from-cyan-950/60 to-purple-950/60 ring-1 ring-cyan-400/60 shadow-md'
                : 'hover:bg-cyan-950/20 border border-cyan-500/20'
            }`}
          >
            {/* Meta AI Style Radiant Orb */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border-2 border-slate-950" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xs text-cyan-200 group-hover:text-white">
                    Chatter AI
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/25 text-cyan-300 font-bold">
                    Better than Meta AI
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Instant answers, translations, message rewriting & ideas
              </p>
            </div>
          </button>
        )}

        {/* Groups (when filtering groups or all) */}
        {filteredGroups.length > 0 && filterMode !== 'pinned' && (
          <div className="pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
              Groups ({filteredGroups.length})
            </span>
            {filteredGroups.map((group) => {
              const isSelected = activeChatId === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => onSelectChat(group.id, true)}
                  className={`w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer relative group ${
                    isSelected
                      ? `${theme.activeItemBg} ring-1 ring-purple-500/40 shadow-sm`
                      : `${theme.hoverBg}`
                  }`}
                >
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl shrink-0">
                    {group.avatarEmoji || '👥'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-bold text-xs truncate text-slate-100">
                          {group.name}
                        </span>
                        {group.isPinned && <Pin className="w-3 h-3 text-cyan-400 shrink-0" />}
                      </div>
                      {group.lastMessageTime && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatTimestamp(group.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <p className="truncate pr-2">
                        {group.lastMessage || `${group.members.length} members · Encrypted`}
                      </p>
                      {group.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-purple-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {group.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pin action on hover */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinChat(group.id, true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity"
                    title={group.isPinned ? 'Unpin Group' : 'Pin Group'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${group.isPinned ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Direct Contacts */}
        {filteredContacts.length > 0 && (
          <div className="pt-1">
            {filterMode === 'all' && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 block mb-1">
                Direct Chats ({filteredContacts.length})
              </span>
            )}
            {filteredContacts.map((contact) => {
              const isSelected = activeChatId === contact.friendCode;
              return (
                <button
                  key={contact.friendCode}
                  onClick={() => onSelectChat(contact.friendCode, false)}
                  className={`w-full p-2.5 rounded-2xl flex items-center gap-3 transition-all text-left cursor-pointer relative group ${
                    isSelected
                      ? `${theme.activeItemBg} ring-1 ring-cyan-500/40 shadow-sm`
                      : `${theme.hoverBg}`
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl border ${
                        contact.avatarBg || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {contact.avatarEmoji || '👤'}
                    </div>
                    {contact.status === 'online' && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-bold text-xs truncate text-slate-100">
                          {contact.username}
                        </span>
                        {contact.isPinned && <Pin className="w-3 h-3 text-cyan-400 shrink-0" />}
                      </div>
                      {contact.lastMessageTime && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatTimestamp(contact.lastMessageTime)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <p className="truncate pr-2">
                        {contact.isTyping ? (
                          <span className="text-cyan-400 font-semibold animate-pulse">typing...</span>
                        ) : (
                          contact.lastMessage || <span className="italic text-slate-500">Ready for encrypted chat</span>
                        )}
                      </p>
                      {contact.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-cyan-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pin action button on hover */}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePinChat(contact.friendCode, false);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity"
                    title={contact.isPinned ? 'Unpin Chat' : 'Pin Chat to Top'}
                  >
                    <Pin className={`w-3.5 h-3.5 ${contact.isPinned ? 'fill-cyan-400 text-cyan-400' : ''}`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Empty Search state */}
        {filteredContacts.length === 0 && filteredGroups.length === 0 && (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <Search className="w-7 h-7 opacity-30 mb-2" />
            <p className="text-xs font-semibold text-slate-300">No matches found</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No contacts, groups or messages matched "{searchQuery}"
            </p>
          </div>
        )}
      </div>

      {/* 5. Persistent Bottom Security Footer */}
      <footer className={`p-3 border-t ${theme.borderClass} bg-slate-950/40 text-[10px] text-slate-500 flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chatter · End-to-End Encrypted</span>
        </div>
        <span className="font-mono text-cyan-400">v1.2</span>
      </footer>
    </aside>
  );
};
