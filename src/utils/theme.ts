import { UIMode, GradientMode } from '../types';

export const UI_MODE_CONFIG: Record<
  UIMode,
  {
    name: string;
    description: string;
    bgClass: string;
    sidebarBg: string;
    chatBg: string;
    cardBg: string;
    borderClass: string;
    textPrimary: string;
    textSecondary: string;
    inputBg: string;
    activeItemBg: string;
    hoverBg: string;
  }
> = {
  dark: {
    name: 'Dark',
    description: 'Minimalistic sleek dark slate',
    bgClass: 'bg-[#0f1117]',
    sidebarBg: 'bg-[#141721]',
    chatBg: 'bg-[#0b0d13]',
    cardBg: 'bg-[#1a1e2b]',
    borderClass: 'border-slate-800/80',
    textPrimary: 'text-slate-100',
    textSecondary: 'text-slate-400',
    inputBg: 'bg-[#1b202e]',
    activeItemBg: 'bg-[#1e2333]',
    hoverBg: 'hover:bg-[#1a1f30]',
  },
  light: {
    name: 'Light',
    description: 'Bright clean daylight canvas',
    bgClass: 'bg-[#f4f6f8]',
    sidebarBg: 'bg-[#ffffff]',
    chatBg: 'bg-[#eef2f6]',
    cardBg: 'bg-[#ffffff]',
    borderClass: 'border-slate-200',
    textPrimary: 'text-slate-900',
    textSecondary: 'text-slate-500',
    inputBg: 'bg-[#f1f5f9]',
    activeItemBg: 'bg-slate-100',
    hoverBg: 'hover:bg-slate-50',
  },
  'ultra-dark': {
    name: 'Ultra Dark',
    description: 'True pitch black, pure white text & charcoal borders',
    bgClass: 'bg-[#000000]',
    sidebarBg: 'bg-[#000000]',
    chatBg: 'bg-[#000000]',
    cardBg: 'bg-[#0a0a0a]',
    borderClass: 'border-[#1c1c1c]',
    textPrimary: 'text-white',
    textSecondary: 'text-neutral-400',
    inputBg: 'bg-[#0f0f0f]',
    activeItemBg: 'bg-[#141414]',
    hoverBg: 'hover:bg-[#111111]',
  },
  neon: {
    name: 'Neon Glow',
    description: 'Futuristic glowing cyber borders, cyan & magenta accents',
    bgClass: 'bg-[#060814]',
    sidebarBg: 'bg-[#090d1f]',
    chatBg: 'bg-[#050711]',
    cardBg: 'bg-[#0f142e]',
    borderClass: 'border-cyan-500/30 neon-border',
    textPrimary: 'text-cyan-100',
    textSecondary: 'text-cyan-400/70',
    inputBg: 'bg-[#111738]',
    activeItemBg: 'bg-cyan-950/40',
    hoverBg: 'hover:bg-cyan-950/30',
  },
};

export const GRADIENT_CONFIG: Record<
  GradientMode,
  {
    name: string;
    subtitle: string;
    bubbleClass: string;
    textGradient: string;
    previewColors: string;
    accentRing: string;
    glowShadow: string;
  }
> = {
  sunset: {
    name: 'Vibrant Sunset',
    subtitle: 'Red & Orange fire',
    bubbleClass: 'bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 text-white',
    textGradient: 'from-red-500 to-orange-400',
    previewColors: 'from-red-500 to-orange-500',
    accentRing: 'ring-orange-500',
    glowShadow: 'shadow-[0_0_20px_rgba(249,115,22,0.35)]',
  },
  ocean: {
    name: 'Deep Ocean',
    subtitle: 'Blue to Cyan tide',
    bubbleClass: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white',
    textGradient: 'from-blue-500 to-cyan-400',
    previewColors: 'from-blue-600 to-cyan-400',
    accentRing: 'ring-cyan-500',
    glowShadow: 'shadow-[0_0_20px_rgba(6,182,212,0.35)]',
  },
  moss: {
    name: 'Forest Moss',
    subtitle: 'Green to Yellow biome',
    bubbleClass: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-lime-500 text-white',
    textGradient: 'from-emerald-500 to-lime-400',
    previewColors: 'from-emerald-600 to-lime-500',
    accentRing: 'ring-lime-500',
    glowShadow: 'shadow-[0_0_20px_rgba(132,204,22,0.35)]',
  },
  purple: {
    name: 'Neon Purple',
    subtitle: 'Instagram Purple to Pink neon',
    bubbleClass: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500 text-white',
    textGradient: 'from-purple-500 via-pink-500 to-rose-400',
    previewColors: 'from-purple-600 to-pink-500',
    accentRing: 'ring-pink-500',
    glowShadow: 'shadow-[0_0_20px_rgba(236,72,153,0.35)]',
  },
};

export function formatTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
