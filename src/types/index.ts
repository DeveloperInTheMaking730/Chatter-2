export type ChatMode = 'anonymous' | 'ephemeral' | 'backup';
export type UIMode = 'dark' | 'light' | 'ultra-dark' | 'neon';
export type GradientMode = 'sunset' | 'ocean' | 'moss' | 'purple';
export type EphemeralTimer = 0 | 5 | 10 | 30 | 60 | 300 | 3600;

export interface UserSession {
  username: string; // 10 digit/char max
  friendCode: string; // 10 digit unique code
  avatarEmoji: string;
  avatarBg: string;
  createdAt: number;
  chatMode: ChatMode;
  uiMode: UIMode;
  gradientMode: GradientMode;
}

export interface EncryptedPayload {
  iv: string;
  cipherText: string;
  salt?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // friendCodes
}

export interface Message {
  id: string;
  chatId: string; // friendCode or groupId
  senderCode: string;
  senderName: string;
  content: string; // Plaintext in RAM
  type: 'text' | 'image' | 'file' | 'voice' | 'system';
  mediaUrl?: string; // base64 / blob URL in RAM
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number; // for audio
  waveform?: number[];
  timestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  ephemeralSeconds?: number;
  expiresAt?: number;
  reactions?: Record<string, string[]>; // emoji -> array of friendCodes
  isSelf?: boolean;
  isStarred?: boolean;
  replyTo?: { id: string; senderName: string; content: string };
  deletedForEveryone?: boolean;
}

export interface Contact {
  friendCode: string;
  username: string;
  avatarEmoji?: string;
  avatarBg?: string;
  status: 'online' | 'offline';
  lastSeen?: number;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  ephemeralTimer: EphemeralTimer;
  isTyping?: boolean;
  isGroup?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  isAi?: boolean;
}

export interface GroupChat {
  id: string;
  name: string;
  avatarEmoji: string;
  avatarBg: string;
  creatorCode: string;
  members: { friendCode: string; username: string; role: 'admin' | 'member' }[];
  createdAt: number;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  ephemeralTimer: EphemeralTimer;
  isPinned?: boolean;
  isMuted?: boolean;
}

export interface CallState {
  active: boolean;
  type: 'voice' | 'video';
  targetCode: string;
  targetName: string;
  isIncoming: boolean;
  status: 'ringing' | 'connected' | 'ended';
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  duration: number;
  latencyMs: number;
}
