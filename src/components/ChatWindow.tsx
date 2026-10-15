import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Video,
  ShieldCheck,
  Flame,
  Paperclip,
  Mic,
  Send,
  Image as ImageIcon,
  FileText,
  Play,
  Pause,
  Check,
  CheckCheck,
  Heart,
  X,
  Download,
  ChevronLeft,
  Lock,
  MoreVertical,
  Search,
  Star,
  Reply,
  Trash2,
  Sparkles,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Volume2,
  Wand2,
  Languages,
} from 'lucide-react';
import { Message, UserSession, Contact, GroupChat, EphemeralTimer } from '../types';
import { UI_MODE_CONFIG, GRADIENT_CONFIG, formatTimestamp, formatBytes } from '../utils/theme';
import { VoiceRecorder } from './VoiceRecorder';

interface ChatWindowProps {
  session: UserSession;
  activeChat: Contact | GroupChat;
  isGroup: boolean;
  messages: Message[];
  onSendMessage: (content: string, type?: Message['type'], extra?: Partial<Message>) => void;
  onSendVoiceNote: (audioBlob: Blob, duration: number, waveform: number[]) => void;
  onSendFile: (file: File) => void;
  onStartCall: (type: 'voice' | 'video') => void;
  onSetEphemeralTimer: (timer: EphemeralTimer) => void;
  onOpenSecurityModal: () => void;
  onReactToMessage: (messageId: string, emoji: string) => void;
  onToggleStarMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onClearChat: () => void;
  onAskAI?: (prompt: string, action?: string) => Promise<string>;
  onBackToSidebar: () => void;
}

const QUICK_REACTIONS = ['❤️', '🔥', '👍', '😂', '😮', '🔒', '👏', '🎉'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  session,
  activeChat,
  isGroup,
  messages,
  onSendMessage,
  onSendVoiceNote,
  onSendFile,
  onStartCall,
  onSetEphemeralTimer,
  onOpenSecurityModal,
  onReactToMessage,
  onToggleStarMessage,
  onDeleteMessage,
  onClearChat,
  onAskAI,
  onBackToSidebar,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showAIAssistantMenu, setShowAIAssistantMenu] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioPlaybackSpeed, setAudioPlaybackSpeed] = useState<number>(1);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [heartAnimId, setHeartAnimId] = useState<string | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);

  // In-Chat Message Search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Smart suggestions from AI
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const theme = UI_MODE_CONFIG[session.uiMode];
  const gradient = GRADIENT_CONFIG[session.gradientMode];
  const isAiChat = !isGroup && (activeChat as Contact).isAi;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Find matching message IDs for in-chat search
  const matchedMessageIds = searchQuery.trim()
    ? messages
        .filter((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
        .map((m) => m.id)
    : [];

  const handleNextSearchMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % matchedMessageIds.length;
    setCurrentMatchIndex(nextIdx);
    scrollToMessage(matchedMessageIds[nextIdx]);
  };

  const handlePrevSearchMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length;
    setCurrentMatchIndex(prevIdx);
    scrollToMessage(matchedMessageIds[prevIdx]);
  };

  const scrollToMessage = (msgId: string) => {
    const el = messageRefs.current.get(msgId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText.trim(), 'text', {
      replyTo: replyingToMessage
        ? {
            id: replyingToMessage.id,
            senderName: replyingToMessage.senderName,
            content: replyingToMessage.content.slice(0, 100),
          }
        : undefined,
    });

    setInputText('');
    setReplyingToMessage(null);
    setSmartSuggestions([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendFile(file);
      e.target.value = '';
      setShowAttachMenu(false);
    }
  };

  const handleDoubleTap = (msgId: string) => {
    setHeartAnimId(msgId);
    onReactToMessage(msgId, '❤️');
    setTimeout(() => setHeartAnimId(null), 800);
  };

  // Toggle audio playback with WhatsApp speed multiplier (1x -> 1.5x -> 2x)
  const toggleAudio = (msgId: string, audioUrl?: string) => {
    if (!audioUrl) return;

    let audio = audioElementsRef.current.get(msgId);
    if (!audio) {
      audio = new Audio(audioUrl);
      audioElementsRef.current.set(msgId, audio);
      audio.onended = () => setPlayingAudioId(null);
    }

    audio.playbackRate = audioPlaybackSpeed;

    if (playingAudioId === msgId) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      audioElementsRef.current.forEach((a) => a.pause());
      audio.play();
      setPlayingAudioId(msgId);
    }
  };

  const cycleAudioSpeed = (msgId: string) => {
    const speeds = [1, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(audioPlaybackSpeed) + 1) % speeds.length];
    setAudioPlaybackSpeed(nextSpeed);
    const audio = audioElementsRef.current.get(msgId);
    if (audio) {
      audio.playbackRate = nextSpeed;
    }
  };

  // Instagram Vanish Mode toggle (sets 10s timer)
  const toggleVanishMode = () => {
    const isVanishOn = (activeChat.ephemeralTimer || 0) > 0;
    onSetEphemeralTimer(isVanishOn ? 0 : 10);
  };

  // Chatter AI helper actions
  const handleAIAssist = async (action: string) => {
    if (!onAskAI) return;
    setIsAILoading(true);
    setShowAIAssistantMenu(false);

    try {
      if (action === 'suggestions') {
        const lastFew = messages.slice(-4).map((m) => `${m.senderName}: ${m.content}`).join('\n');
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'suggestions', prompt: lastFew || 'Hello there' }),
        });
        const data = await res.json();
        setSmartSuggestions(data.suggestions || ['Sounds great!', 'Will check soon', 'Thanks!']);
      } else if (action === 'summarize') {
        const fullChat = messages.map((m) => `${m.senderName}: ${m.content}`).join('\n');
        onSendMessage('Summarize our chat thread with Chatter AI', 'text');
        const summary = await onAskAI(fullChat, 'summarize');
        onSendMessage(`📋 Chatter AI Summary:\n${summary}`, 'text');
      } else if (action === 'rewrite') {
        if (!inputText.trim()) return;
        const rewritten = await onAskAI(inputText.trim(), 'rewrite');
        setInputText(rewritten.replace(/^"|"$/g, ''));
      }
    } catch (err) {
      console.error('AI assistant error', err);
    } finally {
      setIsAILoading(false);
    }
  };

  const getRemainingEphemeralSeconds = (expiresAt?: number): number => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  };

  const currentTimer = activeChat.ephemeralTimer || 0;
  const isVanishActive = currentTimer > 0;

  // Text highlighter for search
  const renderMessageContent = (content: string) => {
    if (!searchQuery.trim() || !content.toLowerCase().includes(searchQuery.toLowerCase())) {
      return content;
    }
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = content.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 text-black px-0.5 rounded font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <main
      className={`h-full flex-1 flex flex-col ${theme.chatBg} ${theme.textPrimary} relative overflow-hidden transition-colors duration-200`}
    >
      {/* 1. WhatsApp / Instagram Hybrid Header */}
      <header
        className={`h-16 px-4 sm:px-6 flex items-center justify-between border-b ${theme.borderClass} ${theme.sidebarBg} shrink-0 shadow-sm z-20`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToSidebar}
            className="md:hidden w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Contact Avatar / Chatter AI Radiant Orb */}
          <div className="relative shrink-0">
            {isAiChat ? (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
            ) : (
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg border ${
                  activeChat.avatarBg || 'bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                {activeChat.avatarEmoji || (isGroup ? '👥' : '👤')}
              </div>
            )}
            {!isGroup && !isAiChat && (activeChat as Contact).status === 'online' && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
            )}
          </div>

          {/* Name & Status */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-extrabold text-sm truncate text-white">
                {isGroup ? (activeChat as GroupChat).name : (activeChat as Contact).username}
              </h2>

              {isAiChat && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">
                  AI
                </span>
              )}

              {/* Vanish / Ephemeral Mode indicator */}
              {isVanishActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-mono flex items-center gap-0.5">
                  <Flame className="w-2.5 h-2.5" />
                  <span>{currentTimer}s Vanish</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              {isAiChat ? (
                <span className="text-cyan-400 font-medium">Chatter AI · Always Ready</span>
              ) : isGroup ? (
                <span>{(activeChat as GroupChat).members.length} members · Encrypted Group</span>
              ) : (activeChat as Contact).isTyping ? (
                <span className="text-cyan-400 font-semibold animate-pulse">typing...</span>
              ) : (activeChat as Contact).status === 'online' ? (
                <span className="text-emerald-400">Online</span>
              ) : (
                <span className="font-mono text-slate-500">#{(activeChat as Contact).friendCode}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Header Action Icons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Message Search in Chat Toggle */}
          <button
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) setSearchQuery('');
            }}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isSearchOpen
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Search Messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Instagram Vanish Mode Quick Button */}
          <button
            onClick={toggleVanishMode}
            className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
              isVanishActive
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title={isVanishActive ? 'Turn Off Vanish Mode' : 'Turn On Vanish Mode'}
          >
            <Flame className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-semibold">
              {isVanishActive ? `${currentTimer}s` : 'Vanish'}
            </span>
          </button>

          {/* Voice Call (WhatsApp feature) */}
          {!isGroup && !isAiChat && (
            <button
              onClick={() => onStartCall('voice')}
              className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Voice Call"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          {/* Video Call (WhatsApp feature) */}
          {!isGroup && !isAiChat && (
            <button
              onClick={() => onStartCall('video')}
              className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Video Call"
            >
              <Video className="w-4 h-4" />
            </button>
          )}

          {/* Security Verification Shield */}
          <button
            onClick={onOpenSecurityModal}
            className="p-2 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Verify E2EE Fingerprints"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          {/* More Options Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 top-11 w-48 rounded-2xl p-1.5 bg-slate-900 border border-slate-700 shadow-2xl z-30 space-y-1">
                <button
                  onClick={() => {
                    setIsSearchOpen(true);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4 text-cyan-400" />
                  <span>Search in Chat</span>
                </button>

                <button
                  onClick={() => {
                    setShowTimerMenu(true);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                >
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Disappearing Timer</span>
                </button>

                <button
                  onClick={() => {
                    onClearChat();
                    setShowOptionsMenu(false);
                  }}
                  className="w-full px-3 py-2 rounded-xl text-left text-xs font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Clear Messages</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. In-Chat Message Search Bar */}
      {isSearchOpen && (
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/30 flex items-center justify-between gap-3 z-10 backdrop-blur-md animate-in slide-in-from-top-2 duration-150">
          <div className="flex-1 flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <input
              type="text"
              placeholder="Search in this conversation..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentMatchIndex(0);
              }}
              className="w-full bg-transparent text-xs text-white focus:outline-none"
              autoFocus
            />
            {searchQuery && (
              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                {matchedMessageIds.length > 0
                  ? `${currentMatchIndex + 1}/${matchedMessageIds.length}`
                  : 'No matches'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevSearchMatch}
              disabled={matchedMessageIds.length === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              title="Previous Match"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextSearchMatch}
              disabled={matchedMessageIds.length === 0}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40"
              title="Next Match"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 relative">
        {/* Instagram Vanish Mode Banner */}
        {isVanishActive && (
          <div className="flex items-center justify-center my-2">
            <div className="px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold flex items-center gap-2 shadow-sm">
              <Flame className="w-3.5 h-3.5 animate-pulse" />
              <span>Vanish Mode Active · Messages burn in {currentTimer}s</span>
            </div>
          </div>
        )}

        {/* Security watermark banner */}
        <div className="flex flex-col items-center justify-center text-center my-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 shadow-sm">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>Messages and calls are end-to-end encrypted. Zero data on servers.</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center text-slate-500">
            <div className="w-14 h-14 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-center text-2xl mb-3">
              {isAiChat ? '✨' : '💬'}
            </div>
            <p className="text-sm font-bold text-slate-200">
              {isAiChat ? 'Start with Chatter AI' : 'No messages yet'}
            </p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              {isAiChat
                ? 'Ask questions, brainstorm, translate, or generate ideas.'
                : 'Say hello! All messages, files, and voice notes are encrypted with AES-256-GCM.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderCode === session.friendCode;
            const remainingSec = getRemainingEphemeralSeconds(msg.expiresAt);
            const isSearchMatched = matchedMessageIds.includes(msg.id);

            return (
              <div
                key={msg.id}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.id, el);
                  else messageRefs.current.delete(msg.id);
                }}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} group relative ${
                  isSearchMatched ? 'ring-2 ring-yellow-400/80 rounded-3xl' : ''
                }`}
              >
                {/* Group sender name */}
                {isGroup && !isSelf && (
                  <span className="text-[10px] font-semibold text-slate-400 ml-2 mb-0.5">
                    {msg.senderName} ({msg.senderCode.slice(-4)})
                  </span>
                )}

                <div
                  onDoubleClick={() => handleDoubleTap(msg.id)}
                  className={`max-w-[85%] sm:max-w-md relative px-4 py-2.5 shadow-md transition-transform select-text cursor-pointer ${
                    isSelf
                      ? `rounded-3xl rounded-br-sm ${gradient.bubbleClass}`
                      : `rounded-3xl rounded-bl-sm ${theme.cardBg} border ${theme.borderClass} ${theme.textPrimary}`
                  }`}
                >
                  {/* Floating heart burst on double-tap */}
                  {heartAnimId === msg.id && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                      <Heart className="w-12 h-12 fill-red-500 text-red-500 animate-heart-burst drop-shadow-lg" />
                    </div>
                  )}

                  {/* Quoted Reply Preview (WhatsApp & Instagram style) */}
                  {msg.replyTo && (
                    <div
                      onClick={() => scrollToMessage(msg.replyTo!.id)}
                      className="mb-1.5 p-2 rounded-2xl bg-black/20 border-l-3 border-cyan-400 text-xs cursor-pointer hover:bg-black/30 transition-colors"
                    >
                      <p className="font-bold text-[10px] text-cyan-300">
                        {msg.replyTo.senderName}
                      </p>
                      <p className="text-[11px] opacity-80 truncate">{msg.replyTo.content}</p>
                    </div>
                  )}

                  {/* Ephemeral Timer Counter Badge */}
                  {msg.expiresAt && (
                    <div
                      className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full mb-1 ${
                        isSelf
                          ? 'bg-black/30 text-white/90'
                          : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      }`}
                    >
                      <Flame className="w-3 h-3 text-orange-400 animate-pulse" />
                      <span>{remainingSec}s remaining</span>
                    </div>
                  )}

                  {/* Message Body by Type */}
                  {msg.type === 'text' && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {renderMessageContent(msg.content)}
                    </p>
                  )}

                  {msg.type === 'image' && (
                    <div className="space-y-1">
                      <img
                        src={msg.mediaUrl}
                        alt="Encrypted attachment"
                        onClick={() => setLightboxImage(msg.mediaUrl || null)}
                        className="rounded-2xl max-h-64 object-cover w-full cursor-zoom-in hover:opacity-95 transition-opacity"
                        referrerPolicy="no-referrer"
                      />
                      {msg.content && <p className="text-xs mt-1">{msg.content}</p>}
                    </div>
                  )}

                  {msg.type === 'file' && (
                    <div className="flex items-center gap-3 p-2 rounded-2xl bg-black/20 backdrop-blur-sm">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate text-white">{msg.fileName || 'Attachment'}</p>
                        <p className="text-[10px] text-white/70 font-mono">{formatBytes(msg.fileSize)}</p>
                      </div>
                      {msg.mediaUrl && (
                        <a
                          href={msg.mediaUrl}
                          download={msg.fileName || 'chatter-file'}
                          className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white"
                          title="Download Decrypted File"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}

                  {msg.type === 'voice' && (
                    <div className="flex items-center gap-2.5 py-1 min-w-[210px] sm:min-w-[260px]">
                      <button
                        type="button"
                        onClick={() => toggleAudio(msg.id, msg.mediaUrl)}
                        className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white shrink-0 cursor-pointer"
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>

                      {/* Playback speed toggle (WhatsApp feature: 1x, 1.5x, 2x) */}
                      <button
                        type="button"
                        onClick={() => cycleAudioSpeed(msg.id)}
                        className="px-1.5 py-0.5 rounded-full bg-black/25 text-[10px] font-mono font-bold text-white hover:bg-black/40 transition-colors"
                        title="Change Playback Speed"
                      >
                        {audioPlaybackSpeed}x
                      </button>

                      <div className="flex-1 flex items-center gap-0.5 h-6">
                        {(msg.waveform || [30, 60, 40, 80, 50, 90, 70, 40, 60, 30]).map((h, i) => (
                          <div
                            key={i}
                            className={`w-1 rounded-full ${isSelf ? 'bg-white/80' : 'bg-cyan-400'}`}
                            style={{ height: `${Math.max(6, (h / 100) * 22)}px` }}
                          />
                        ))}
                      </div>

                      <span className="text-[10px] font-mono font-medium opacity-80 shrink-0">
                        {msg.duration ? `${msg.duration}s` : '0:05'}
                      </span>
                    </div>
                  )}

                  {/* Metadata: Time, Star, and WhatsApp Delivery Status */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isSelf ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    {msg.isStarred && <Star className="w-3 h-3 text-amber-300 fill-amber-300" />}
                    <span>{formatTimestamp(msg.timestamp)}</span>
                    {isSelf && (
                      <span>
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 opacity-70" />
                        ) : (
                          <Check className="w-3.5 h-3.5 opacity-70" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions badge list */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex gap-1 mt-0.5 px-2">
                    {Object.entries(msg.reactions).map(([emoji, senders]) => (
                      <span
                        key={emoji}
                        onClick={() => onReactToMessage(msg.id, emoji)}
                        className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs shadow-sm flex items-center gap-1 cursor-pointer hover:scale-110 transition-transform"
                      >
                        <span>{emoji}</span>
                        {senders.length > 1 && (
                          <span className="text-[10px] font-mono text-slate-400">{senders.length}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick actions popover on hover (Reply, Star, Delete, Reactions) */}
                {hoveredMessageId === msg.id && (
                  <div
                    className={`absolute -top-7 ${
                      isSelf ? 'right-2' : 'left-2'
                    } flex items-center gap-1 p-1 rounded-full bg-slate-900 border border-slate-700 shadow-xl z-20 animate-in fade-in duration-150`}
                  >
                    {/* Reply button */}
                    <button
                      onClick={() => setReplyingToMessage(msg)}
                      className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>

                    {/* Star button */}
                    <button
                      onClick={() => onToggleStarMessage(msg.id)}
                      className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-amber-400"
                      title={msg.isStarred ? 'Unstar' : 'Star message'}
                    >
                      <Star className={`w-3.5 h-3.5 ${msg.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-[1px] h-3 bg-slate-700 mx-0.5" />

                    {/* Emoji reactions */}
                    {QUICK_REACTIONS.slice(0, 4).map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onReactToMessage(msg.id, emoji)}
                        className="w-5 h-5 rounded-full hover:bg-slate-800 flex items-center justify-center text-xs hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Smart Suggestions from Chatter AI */}
      {smartSuggestions.length > 0 && (
        <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 text-xs text-cyan-400 shrink-0 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chatter AI:</span>
          </div>
          {smartSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSendMessage(suggestion, 'text');
                setSmartSuggestions([]);
              }}
              className="px-3 py-1 rounded-full bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-xs text-cyan-200 whitespace-nowrap transition-colors cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
          <button
            onClick={() => setSmartSuggestions([])}
            className="text-slate-500 hover:text-slate-300 ml-auto"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Reply-To Quote Box (WhatsApp / Instagram style) */}
      {replyingToMessage && (
        <div className="px-4 py-2 bg-slate-900/95 border-t border-cyan-500/30 flex items-center justify-between gap-3">
          <div className="border-l-3 border-cyan-400 pl-2 min-w-0">
            <p className="text-xs font-bold text-cyan-400">
              Replying to {replyingToMessage.senderName}
            </p>
            <p className="text-xs text-slate-300 truncate">{replyingToMessage.content}</p>
          </div>
          <button
            onClick={() => setReplyingToMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6. Bottom Input Toolbar */}
      <footer className={`p-3 sm:p-4 border-t ${theme.borderClass} ${theme.sidebarBg} shrink-0`}>
        {isRecordingVoice ? (
          <VoiceRecorder
            accentClass={gradient.bubbleClass}
            onSendVoiceNote={(blob, duration, waveform) => {
              onSendVoiceNote(blob, duration, waveform);
              setIsRecordingVoice(false);
            }}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            {/* Attachment Menu Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                title="Attach Photo or Document"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-12 left-0 w-44 rounded-2xl p-2 bg-slate-900 border border-slate-700 shadow-2xl z-30 space-y-1">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span>Send Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Send Document</span>
                  </button>
                </div>
              )}

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Chatter AI Assistant Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAIAssistantMenu(!showAIAssistantMenu)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 transition-all cursor-pointer relative"
                title="Chatter AI Assistant Tools"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {showAIAssistantMenu && (
                <div className="absolute bottom-12 left-0 w-52 rounded-2xl p-2 bg-slate-900 border border-cyan-500/40 shadow-2xl z-30 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    Chatter AI Tools
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAIAssist('suggestions')}
                    className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Smart Reply Suggestions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAIAssist('summarize')}
                    className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Summarize Thread</span>
                  </button>
                  {inputText.trim() && (
                    <button
                      type="button"
                      onClick={() => handleAIAssist('rewrite')}
                      className="w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Polish / Rewrite Text</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Text Input with @ai mention trigger */}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isAiChat ? 'Ask Chatter AI anything...' : 'Type a message or @ai...'}
              className={`flex-1 px-4 py-2.5 rounded-2xl border ${theme.borderClass} ${theme.inputBg} ${theme.textPrimary} text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500`}
            />

            {/* Voice Message Recorder Trigger */}
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Record Voice Note"
            >
              <Mic className="w-5 h-5" />
            </button>

            {/* Send Button with Instagram gradient */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer ${gradient.bubbleClass}`}
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </footer>

      {/* Lightbox Modal for Images */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-800/80 text-white flex items-center justify-center text-lg font-bold"
          >
            ✕
          </button>
          <img
            src={lightboxImage}
            alt="Full preview"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </main>
  );
};
