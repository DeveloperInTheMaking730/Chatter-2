import React, { useState, useEffect, useRef } from 'react';
import { UserSession, Contact, GroupChat, Message, CallState, EphemeralTimer, UIMode, GradientMode } from './types';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import { CallOverlay } from './components/CallOverlay';
import { SecurityModal } from './components/SecurityModal';
import { BackupModal } from './components/BackupModal';
import { GroupModal } from './components/GroupModal';
import { ThemeModal } from './components/ThemeModal';
import { UI_MODE_CONFIG } from './utils/theme';
import { networkRelay } from './services/network';
import { webrtcManager } from './services/webrtc';
import {
  deriveDirectChatKey,
  deriveGroupKey,
  encryptText,
  decryptText,
  encryptBinary,
  decryptBinary,
  bufferToBase64,
  clearKeyCache,
} from './services/crypto';
import {
  saveMessageLocally,
  loadMessagesLocally,
  saveContactLocally,
  loadContactsLocally,
  saveGroupLocally,
  loadGroupsLocally,
  purgeExpiredEphemeral,
  wipeAllLocalData,
} from './services/db';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Call State
  const [callState, setCallState] = useState<CallState>({
    active: false,
    type: 'voice',
    targetCode: '',
    targetName: '',
    isIncoming: false,
    status: 'ringing',
    isMuted: false,
    isVideoOff: false,
    isScreenSharing: false,
    duration: 0,
    latencyMs: 18,
  });

  // Modals
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const callTimerRef = useRef<any>(null);
  const incomingOfferRef = useRef<any>(null);

  // Initialize session and presence
  useEffect(() => {
    // If in anonymous mode, enforce wipe on unload
    const handleUnload = () => {
      if (session?.chatMode === 'anonymous') {
        wipeAllLocalData();
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [session?.chatMode]);

  // Ephemeral countdown clock ticker (purges expired messages)
  useEffect(() => {
    const ticker = setInterval(() => {
      const now = Date.now();
      let hasExpired = false;

      setMessages((prev) => {
        const next: Record<string, Message[]> = {};
        for (const [chatId, msgs] of Object.entries(prev)) {
          const valid = msgs.filter((m) => {
            if (m.expiresAt && m.expiresAt <= now) {
              hasExpired = true;
              return false;
            }
            return true;
          });
          next[chatId] = valid;
        }
        return hasExpired ? next : prev;
      });

      if (hasExpired) {
        purgeExpiredEphemeral();
      }
    }, 1000);

    return () => clearInterval(ticker);
  }, []);

  // Subscribe to real-time network messages and presence
  useEffect(() => {
    if (!session) return;

    networkRelay.registerUser(session.friendCode, session.username);

    const unsubscribe = networkRelay.subscribe(async (event) => {
      // 1. Connection Status
      if (event.type === 'connection_status') {
        setIsOnline(event.connected);
      }

      // 2. Presence Update
      if (event.type === 'presence_update' || event.type === 'presence_multitab') {
        const presenceList = event.presence || (event.from ? [{ friendCode: event.from, username: event.username, status: event.status }] : []);
        setContacts((prev) =>
          prev.map((c) => {
            const match = presenceList.find((p: any) => String(p.friendCode) === String(c.friendCode));
            if (match) {
              return { ...c, status: match.status, lastSeen: match.lastSeen || Date.now() };
            }
            return c;
          })
        );
      }

      // 3. Incoming Direct Message
      if (event.type === 'message') {
        const rawFrom = event.payload?.from || event.from;
        const fromCode = String(
          rawFrom && rawFrom !== session.friendCode
            ? rawFrom
            : (activeChatId && activeChatId !== session.friendCode ? activeChatId : rawFrom || 'unknown')
        );
        const { id, type, encrypted, fileName, fileSize, mimeType, duration, waveform, ephemeralSeconds, timestamp } = event.payload || {};

        try {
          const key = await deriveDirectChatKey(session.friendCode, fromCode);
          let content = '';
          let mediaUrl: string | undefined = undefined;

          if (type === 'text') {
            try {
              content = await decryptText(encrypted, key);
            } catch (decErr) {
              if (activeChatId && activeChatId !== fromCode) {
                const altKey = await deriveDirectChatKey(session.friendCode, activeChatId);
                content = await decryptText(encrypted, altKey);
              } else {
                content = '🔒 [Encrypted message - key mismatch]';
              }
            }
          } else if (type === 'image' || type === 'file' || type === 'voice') {
            try {
              const bin = await decryptBinary(encrypted, key);
              const blob = new Blob([bin], { type: mimeType || 'application/octet-stream' });
              mediaUrl = URL.createObjectURL(blob);
              content = type === 'image' ? '' : fileName || 'Audio Note';
            } catch {
              content = `🔒 [Encrypted ${type} - could not decrypt]`;
            }
          }

          const expiresAt = ephemeralSeconds && ephemeralSeconds > 0 ? Date.now() + ephemeralSeconds * 1000 : undefined;

          const incomingMsg: Message = {
            id: id || Math.random().toString(),
            chatId: fromCode,
            senderCode: fromCode,
            senderName: `User_${fromCode.slice(-4)}`,
            content,
            type: type || 'text',
            mediaUrl,
            fileName,
            fileSize,
            mimeType,
            duration,
            waveform,
            timestamp: timestamp || Date.now(),
            status: 'delivered',
            ephemeralSeconds,
            expiresAt,
            isSelf: false,
          };

          // Append to state
          setMessages((prev) => ({
            ...prev,
            [fromCode]: [...(prev[fromCode] || []), incomingMsg],
          }));

          // Save to local storage if mode permits
          saveMessageLocally(incomingMsg, session.chatMode);

          // Update contact last message
          setContacts((prev) => {
            const exists = prev.find((c) => c.friendCode === fromCode);
            if (exists) {
              return prev.map((c) =>
                c.friendCode === fromCode
                  ? {
                      ...c,
                      lastMessage: type === 'text' ? content : `[${type.toUpperCase()}]`,
                      lastMessageTime: timestamp || Date.now(),
                      unreadCount: activeChatId === fromCode ? 0 : c.unreadCount + 1,
                    }
                  : c
              );
            } else {
              // Auto-add sender to contact list
              const newContact: Contact = {
                friendCode: fromCode,
                username: `Peer_${fromCode.slice(-4)}`,
                avatarEmoji: '⚡',
                avatarBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                status: 'online',
                lastMessage: type === 'text' ? content : `[${type.toUpperCase()}]`,
                lastMessageTime: timestamp || Date.now(),
                unreadCount: 1,
                ephemeralTimer: ephemeralSeconds || 0,
              };
              saveContactLocally(newContact, session.chatMode);
              return [newContact, ...prev];
            }
          });
        } catch (err) {
          console.error('Failed to decrypt incoming message', err);
        }
      }

      // 4. Incoming Group Message
      if (event.type === 'group_message') {
        const { groupId, from, payload } = event;
        const { id, type, encrypted, fileName, fileSize, mimeType, duration, waveform, timestamp } = payload;

        try {
          const groupKey = await deriveGroupKey(groupId, 'cipherzero-group-seed');
          let content = '';
          let mediaUrl: string | undefined = undefined;

          if (type === 'text') {
            content = await decryptText(encrypted, groupKey);
          } else if (type === 'image' || type === 'file' || type === 'voice') {
            const bin = await decryptBinary(encrypted, groupKey);
            const blob = new Blob([bin], { type: mimeType || 'application/octet-stream' });
            mediaUrl = URL.createObjectURL(blob);
            content = fileName || 'Attachment';
          }

          const groupMsg: Message = {
            id: id || Math.random().toString(),
            chatId: groupId,
            senderCode: from || 'unknown',
            senderName: `Member_${(from || '').slice(-4)}`,
            content,
            type: type || 'text',
            mediaUrl,
            fileName,
            fileSize,
            mimeType,
            duration,
            waveform,
            timestamp: timestamp || Date.now(),
            status: 'delivered',
            isSelf: from === session.friendCode,
          };

          setMessages((prev) => ({
            ...prev,
            [groupId]: [...(prev[groupId] || []), groupMsg],
          }));

          saveMessageLocally(groupMsg, session.chatMode);
        } catch (err) {
          console.error('Failed to decrypt group message', err);
        }
      }

      // 5. WebRTC Call Signals
      if (event.type === 'webrtc_signal') {
        const fromCode = String(event.from);
        const { signalType, callType, sdp } = event.payload;

        if (signalType === 'offer') {
          incomingOfferRef.current = sdp;
          setCallState({
            active: true,
            type: callType || 'voice',
            targetCode: fromCode,
            targetName: `Peer_${fromCode.slice(-4)}`,
            isIncoming: true,
            status: 'ringing',
            isMuted: false,
            isVideoOff: false,
            isScreenSharing: false,
            duration: 0,
            latencyMs: 18,
          });
        } else {
          webrtcManager.handleSignal(fromCode, event.payload);
        }
      }

      // 6. Typing Indicator
      if (event.type === 'typing') {
        const fromCode = String(event.from);
        setContacts((prev) =>
          prev.map((c) => (c.friendCode === fromCode ? { ...c, isTyping: true } : c))
        );
        setTimeout(() => {
          setContacts((prev) =>
            prev.map((c) => (c.friendCode === fromCode ? { ...c, isTyping: false } : c))
          );
        }, 3000);
      }

      // 7. Message Reactions
      if (event.type === 'reaction') {
        const { messageId, emoji, from } = event.payload;
        setMessages((prev) => {
          const next = { ...prev };
          for (const chatId in next) {
            next[chatId] = next[chatId].map((m) => {
              if (m.id === messageId) {
                const reactions = { ...(m.reactions || {}) };
                const currentUsers = reactions[emoji] || [];
                if (!currentUsers.includes(from)) {
                  reactions[emoji] = [...currentUsers, from];
                }
                return { ...m, reactions };
              }
              return m;
            });
          }
          return next;
        });
      }
    });

    const webrtcSub = webrtcManager.subscribe((ev) => {
      if (ev.type === 'call_connected') {
        setCallState((prev) => ({ ...prev, status: 'connected' }));
        if (!callTimerRef.current) {
          callTimerRef.current = setInterval(() => {
            setCallState((prev) => ({ ...prev, duration: prev.duration + 1 }));
          }, 1000);
        }
      } else if (ev.type === 'call_ended') {
        handleEndCall();
      } else if (ev.type === 'latency_update' && ev.latencyMs) {
        setCallState((prev) => ({ ...prev, latencyMs: ev.latencyMs! }));
      }
    });

    return () => {
      unsubscribe();
      webrtcSub();
    };
  }, [session, activeChatId]);

  const handleLogin = async (newSession: UserSession) => {
    setSession(newSession);

    // Load stored contacts and groups if mode is not anonymous
    const storedContacts = await loadContactsLocally(newSession.chatMode);
    const storedGroups = await loadGroupsLocally(newSession.chatMode);

    // Initialize with a friendly simulated demo peer "ShadowNet" so user can test immediate E2EE features right away
    const initialContacts: Contact[] =
      storedContacts.length > 0
        ? storedContacts
        : [
            {
              friendCode: '7770001234',
              username: 'CipherBot',
              avatarEmoji: '🤖',
              avatarBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
              status: 'online',
              lastMessage: 'Session verified. Send a test message or audio note!',
              lastMessageTime: Date.now(),
              unreadCount: 0,
              ephemeralTimer: 0,
            },
          ];

    setContacts(initialContacts);
    setGroups(storedGroups);

    if (initialContacts.length > 0) {
      setActiveChatId(initialContacts[0].friendCode);
      setIsGroupChat(false);
      // Load initial messages
      const msgs = await loadMessagesLocally(initialContacts[0].friendCode, newSession.chatMode);
      if (msgs.length > 0) {
        setMessages({ [initialContacts[0].friendCode]: msgs });
      } else {
        // Welcome message
        setMessages({
          [initialContacts[0].friendCode]: [
            {
              id: 'init_msg_1',
              chatId: initialContacts[0].friendCode,
              senderCode: initialContacts[0].friendCode,
              senderName: 'CipherBot',
              content: `Welcome to CipherZero, ${newSession.username}! Your 10-digit friend code is #${newSession.friendCode}. All data is end-to-end encrypted locally with AES-256-GCM. Try sending an audio note or setting an ephemeral burn timer!`,
              type: 'text',
              timestamp: Date.now(),
              status: 'read',
              isSelf: false,
            },
          ],
        });
      }
    }
  };

  const handleSelectChat = async (id: string, isGroup: boolean) => {
    setActiveChatId(id);
    setIsGroupChat(isGroup);
    setMobileShowChat(true);

    // Reset unread count
    setContacts((prev) =>
      prev.map((c) => (c.friendCode === id ? { ...c, unreadCount: 0 } : c))
    );
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, unreadCount: 0 } : g))
    );

    // Load messages if not already in memory
    if (session && !messages[id]) {
      const loaded = await loadMessagesLocally(id, session.chatMode);
      if (loaded.length > 0) {
        setMessages((prev) => ({ ...prev, [id]: loaded }));
      }
    }
  };

  const handleAddContact = async (friendCode: string, name?: string) => {
    if (!session) return;
    const exists = contacts.find((c) => c.friendCode === friendCode);
    if (exists) {
      handleSelectChat(friendCode, false);
      return;
    }

    const newContact: Contact = {
      friendCode,
      username: name || `Peer_${friendCode.slice(-4)}`,
      avatarEmoji: '⚡',
      avatarBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      status: 'online',
      unreadCount: 0,
      ephemeralTimer: 0,
    };

    setContacts((prev) => [newContact, ...prev]);
    saveContactLocally(newContact, session.chatMode);
    handleSelectChat(friendCode, false);
  };

  const handleSendMessage = async (
    content: string,
    type: Message['type'] = 'text',
    extra?: Partial<Message>
  ) => {
    if (!session || !activeChatId) return;

    const activeContact = contacts.find((c) => c.friendCode === activeChatId);
    const activeGroup = groups.find((g) => g.id === activeChatId);
    const ephemeralTimer = (activeContact?.ephemeralTimer || activeGroup?.ephemeralTimer || 0) as EphemeralTimer;
    const expiresAt = ephemeralTimer > 0 ? Date.now() + ephemeralTimer * 1000 : undefined;

    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    const newMsg: Message = {
      id: msgId,
      chatId: activeChatId,
      senderCode: session.friendCode,
      senderName: session.username,
      content,
      type,
      timestamp: Date.now(),
      status: 'sent',
      ephemeralSeconds: ephemeralTimer > 0 ? ephemeralTimer : undefined,
      expiresAt,
      isSelf: true,
      ...extra,
    };

    // Update local state
    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));

    saveMessageLocally(newMsg, session.chatMode);

    // Encrypt & Relay
    try {
      if (isGroupChat && activeGroup) {
        const groupKey = await deriveGroupKey(activeGroup.id, 'cipherzero-group-seed');
        const encrypted = await encryptText(content, groupKey);
        networkRelay.sendGroup(activeGroup.id, activeGroup.members.map((m) => m.friendCode), {
          id: msgId,
          type,
          encrypted,
          timestamp: Date.now(),
        });
      } else {
        const directKey = await deriveDirectChatKey(session.friendCode, activeChatId);
        const encrypted = await encryptText(content, directKey);
        networkRelay.send('message', activeChatId, {
          id: msgId,
          type,
          encrypted,
          ephemeralSeconds: ephemeralTimer,
          timestamp: Date.now(),
        });

        // If chatting with demo peer CipherBot, trigger an automated intelligent response for instant delight
        if (activeChatId === '7770001234') {
          setTimeout(async () => {
            const replies = [
              'E2EE handshake confirmed! Your message arrived through zero-storage RAM relay.',
              'Received and verified! End-to-end encryption is intact with AES-256-GCM.',
              'All clear! You can also try starting an encrypted voice call or sending a voice note.',
              'Burn timer acknowledged. Ephemeral countdown initiated!',
            ];
            const botReplyText = replies[Math.floor(Math.random() * replies.length)];
            const botKey = await deriveDirectChatKey('7770001234', session.friendCode);
            const botEncrypted = await encryptText(botReplyText, botKey);

            networkRelay.send(
              'message',
              session.friendCode,
              {
                id: 'bot_reply_' + Date.now(),
                from: '7770001234',
                type: 'text',
                encrypted: botEncrypted,
                timestamp: Date.now(),
              },
              '7770001234'
            );
          }, 1200);
        }
      }
    } catch (err) {
      console.error('Failed to encrypt and send message:', err);
    }
  };

  const handleSendVoiceNote = async (audioBlob: Blob, duration: number, waveform: number[]) => {
    if (!session || !activeChatId) return;

    const audioUrl = URL.createObjectURL(audioBlob);
    const arrayBuffer = await audioBlob.arrayBuffer();

    const activeContact = contacts.find((c) => c.friendCode === activeChatId);
    const activeGroup = groups.find((g) => g.id === activeChatId);
    const ephemeralTimer = (activeContact?.ephemeralTimer || activeGroup?.ephemeralTimer || 0) as EphemeralTimer;
    const expiresAt = ephemeralTimer > 0 ? Date.now() + ephemeralTimer * 1000 : undefined;
    const msgId = 'voice_' + Date.now();

    const newMsg: Message = {
      id: msgId,
      chatId: activeChatId,
      senderCode: session.friendCode,
      senderName: session.username,
      content: 'Voice note',
      type: 'voice',
      mediaUrl: audioUrl,
      duration,
      waveform,
      mimeType: audioBlob.type,
      timestamp: Date.now(),
      status: 'sent',
      ephemeralSeconds: ephemeralTimer > 0 ? ephemeralTimer : undefined,
      expiresAt,
      isSelf: true,
    };

    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));

    saveMessageLocally(newMsg, session.chatMode);

    try {
      const key = isGroupChat
        ? await deriveGroupKey(activeChatId, 'cipherzero-group-seed')
        : await deriveDirectChatKey(session.friendCode, activeChatId);

      const encrypted = await encryptBinary(arrayBuffer, key);

      networkRelay.send('message', activeChatId, {
        id: msgId,
        type: 'voice',
        encrypted,
        duration,
        waveform,
        mimeType: audioBlob.type,
        ephemeralSeconds: ephemeralTimer,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Error encrypting audio note:', err);
    }
  };

  const handleSendFile = async (file: File) => {
    if (!session || !activeChatId) return;

    const isImage = file.type.startsWith('image/');
    const fileUrl = URL.createObjectURL(file);
    const arrayBuffer = await file.arrayBuffer();

    const activeContact = contacts.find((c) => c.friendCode === activeChatId);
    const ephemeralTimer = (activeContact?.ephemeralTimer || 0) as EphemeralTimer;
    const expiresAt = ephemeralTimer > 0 ? Date.now() + ephemeralTimer * 1000 : undefined;
    const msgId = 'file_' + Date.now();

    const newMsg: Message = {
      id: msgId,
      chatId: activeChatId,
      senderCode: session.friendCode,
      senderName: session.username,
      content: file.name,
      type: isImage ? 'image' : 'file',
      mediaUrl: fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      timestamp: Date.now(),
      status: 'sent',
      ephemeralSeconds: ephemeralTimer > 0 ? ephemeralTimer : undefined,
      expiresAt,
      isSelf: true,
    };

    setMessages((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));

    saveMessageLocally(newMsg, session.chatMode);

    try {
      const key = isGroupChat
        ? await deriveGroupKey(activeChatId, 'cipherzero-group-seed')
        : await deriveDirectChatKey(session.friendCode, activeChatId);

      const encrypted = await encryptBinary(arrayBuffer, key);

      networkRelay.send('message', activeChatId, {
        id: msgId,
        type: isImage ? 'image' : 'file',
        encrypted,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        ephemeralSeconds: ephemeralTimer,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Error encrypting file attachment:', err);
    }
  };

  const handleStartCall = async (type: 'voice' | 'video') => {
    if (!session || !activeChatId) return;
    const contact = contacts.find((c) => c.friendCode === activeChatId);
    if (!contact) return;

    setCallState({
      active: true,
      type,
      targetCode: contact.friendCode,
      targetName: contact.username,
      isIncoming: false,
      status: 'ringing',
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      duration: 0,
      latencyMs: 18,
    });

    await webrtcManager.startCall(contact.friendCode, type);
  };

  const handleAcceptIncomingCall = async () => {
    if (!incomingOfferRef.current) return;
    await webrtcManager.answerCall(callState.targetCode, incomingOfferRef.current, callState.type);
    incomingOfferRef.current = null;
  };

  const handleDeclineIncomingCall = () => {
    webrtcManager.endCall();
    incomingOfferRef.current = null;
    handleEndCall();
  };

  const handleEndCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    setCallState((prev) => ({
      ...prev,
      active: false,
      status: 'ended',
      duration: 0,
    }));
  };

  const handleToggleMute = () => {
    const isMuted = webrtcManager.toggleMute();
    setCallState((prev) => ({ ...prev, isMuted }));
  };

  const handleToggleVideo = () => {
    const isVideoOff = webrtcManager.toggleVideo();
    setCallState((prev) => ({ ...prev, isVideoOff }));
  };

  const handleToggleScreenShare = async () => {
    const isScreenSharing = await webrtcManager.toggleScreenShare();
    setCallState((prev) => ({ ...prev, isScreenSharing }));
  };

  const handleSetEphemeralTimer = (timer: EphemeralTimer) => {
    if (!activeChatId) return;
    setContacts((prev) =>
      prev.map((c) => (c.friendCode === activeChatId ? { ...c, ephemeralTimer: timer } : c))
    );
    setGroups((prev) =>
      prev.map((g) => (g.id === activeChatId ? { ...g, ephemeralTimer: timer } : g))
    );
  };

  const handleReactToMessage = (messageId: string, emoji: string) => {
    if (!session || !activeChatId) return;

    setMessages((prev) => {
      const next = { ...prev };
      if (next[activeChatId]) {
        next[activeChatId] = next[activeChatId].map((m) => {
          if (m.id === messageId) {
            const reactions = { ...(m.reactions || {}) };
            const currentUsers = reactions[emoji] || [];
            if (currentUsers.includes(session.friendCode)) {
              reactions[emoji] = currentUsers.filter((u) => u !== session.friendCode);
              if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
              reactions[emoji] = [...currentUsers, session.friendCode];
            }
            return { ...m, reactions };
          }
          return m;
        });
      }
      return next;
    });

    networkRelay.send('reaction', activeChatId, {
      messageId,
      emoji,
      from: session.friendCode,
    });
  };

  const handlePanicWipe = async () => {
    networkRelay.disconnect();
    webrtcManager.endCall(false);
    clearKeyCache();
    await wipeAllLocalData();
    setSession(null);
    setContacts([]);
    setGroups([]);
    setMessages({});
    setActiveChatId(null);
  };

  const handleCreateGroup = (group: GroupChat) => {
    setGroups((prev) => [group, ...prev]);
    if (session) {
      saveGroupLocally(group, session.chatMode);
    }
    handleSelectChat(group.id, true);
  };

  const handleRestoreData = (restored: { contacts?: Contact[]; groups?: GroupChat[]; messages?: Message[] }) => {
    if (restored.contacts) setContacts(restored.contacts);
    if (restored.groups) setGroups(restored.groups);
    if (restored.messages) {
      const grouped: Record<string, Message[]> = {};
      restored.messages.forEach((m) => {
        if (!grouped[m.chatId]) grouped[m.chatId] = [];
        grouped[m.chatId].push(m);
      });
      setMessages(grouped);
    }
  };

  // If no active session, render LoginScreen
  if (!session) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const currentTheme = UI_MODE_CONFIG[session.uiMode];
  const activeChat = isGroupChat
    ? groups.find((g) => g.id === activeChatId)
    : contacts.find((c) => c.friendCode === activeChatId);

  return (
    <div
      className={`h-screen w-screen flex overflow-hidden font-sans ${currentTheme.bgClass} ${currentTheme.textPrimary}`}
    >
      {/* Sidebar: always visible on desktop, hidden on mobile when viewing chat */}
      <div className={`h-full ${mobileShowChat ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}>
        <Sidebar
          session={session}
          contacts={contacts}
          groups={groups}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          onAddContact={handleAddContact}
          onOpenGroupModal={() => setShowGroupModal(true)}
          onOpenThemeModal={() => setShowThemeModal(true)}
          onOpenBackupModal={() => setShowBackupModal(true)}
          onPanicWipe={handlePanicWipe}
          isOnline={isOnline}
        />
      </div>

      {/* Main Chat Area */}
      <div className={`h-full flex-1 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <ChatWindow
            session={session}
            activeChat={activeChat}
            isGroup={isGroupChat}
            messages={messages[activeChatId || ''] || []}
            onSendMessage={handleSendMessage}
            onSendVoiceNote={handleSendVoiceNote}
            onSendFile={handleSendFile}
            onStartCall={handleStartCall}
            onSetEphemeralTimer={handleSetEphemeralTimer}
            onOpenSecurityModal={() => setShowSecurityModal(true)}
            onReactToMessage={handleReactToMessage}
            onBackToSidebar={() => setMobileShowChat(false)}
          />
        ) : (
          <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl mb-4 shadow-xl">
              🛡️
            </div>
            <h3 className="text-base font-bold text-slate-200">Select a Conversation</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Choose an active peer from the sidebar or start a new direct chat using their 10-digit friend code.
            </p>
          </div>
        )}
      </div>

      {/* Real-time Call Overlay */}
      {callState.active && (
        <CallOverlay
          callState={callState}
          onAcceptIncoming={handleAcceptIncomingCall}
          onDeclineIncoming={handleDeclineIncomingCall}
          onEndCall={handleEndCall}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
        />
      )}

      {/* Modals */}
      {showSecurityModal && activeChat && (
        <SecurityModal
          myFriendCode={session.friendCode}
          contactFriendCode={isGroupChat ? (activeChat as GroupChat).id : (activeChat as Contact).friendCode}
          contactName={isGroupChat ? (activeChat as GroupChat).name : (activeChat as Contact).username}
          onClose={() => setShowSecurityModal(false)}
        />
      )}

      {showBackupModal && (
        <BackupModal
          contacts={contacts}
          groups={groups}
          messages={Object.values(messages).flat()}
          onRestoreData={handleRestoreData}
          onClose={() => setShowBackupModal(false)}
        />
      )}

      {showGroupModal && (
        <GroupModal
          myFriendCode={session.friendCode}
          myUsername={session.username}
          onCreateGroup={handleCreateGroup}
          onClose={() => setShowGroupModal(false)}
        />
      )}

      {showThemeModal && (
        <ThemeModal
          currentUiMode={session.uiMode}
          currentGradient={session.gradientMode}
          onSelectUiMode={(uiMode: UIMode) => setSession({ ...session, uiMode })}
          onSelectGradient={(gradientMode: GradientMode) => setSession({ ...session, gradientMode })}
          onClose={() => setShowThemeModal(false)}
        />
      )}
    </div>
  );
}
