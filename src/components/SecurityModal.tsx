import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2, Copy, Check, ServerOff, KeyRound, QrCode } from 'lucide-react';
import { calculateSafetyNumber } from '../services/crypto';

interface SecurityModalProps {
  myFriendCode: string;
  contactFriendCode: string;
  contactName: string;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  myFriendCode,
  contactFriendCode,
  contactName,
  onClose,
}) => {
  const [safetyNumbers, setSafetyNumbers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    calculateSafetyNumber(myFriendCode, contactFriendCode).then(setSafetyNumbers);
  }, [myFriendCode, contactFriendCode]);

  const handleCopyNumbers = () => {
    if (safetyNumbers.length > 0) {
      navigator.clipboard.writeText(safetyNumbers.join(' '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-3xl p-6 sm:p-7 bg-[#111422] border border-cyan-500/30 text-slate-100 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Encryption & Security Verify</h3>
              <p className="text-xs text-slate-400">Verifying session with {contactName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Zero server storage guarantee banner */}
        <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs mb-5 flex items-start gap-2.5">
          <ServerOff className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-300">Guaranteed Zero-Storage Architecture</p>
            <p className="text-[11px] text-emerald-400/80 mt-0.5">
              Messages are encrypted locally on your device with AES-256-GCM. The relay server operates in memory only: zero databases, zero message logging, zero key storage.
            </p>
          </div>
        </div>

        {/* Safety Number Display */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Safety Number (Fingerprint)</span>
            </span>
            <button
              onClick={handleCopyNumbers}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 font-mono text-center text-xs tracking-wider text-cyan-300">
            {safetyNumbers.map((num, idx) => (
              <div key={idx} className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                {num}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">
            Compare this 60-digit number with {contactName} to confirm end-to-end cryptographic integrity.
          </p>
        </div>

        {/* Cryptographic Specifications */}
        <div className="space-y-1.5 text-xs rounded-2xl p-3 bg-slate-900/40 border border-slate-800 text-slate-300">
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Cipher Protocol</span>
            <span className="font-mono text-cyan-400">AES-256-GCM (Authenticated)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Key Derivation</span>
            <span className="font-mono text-cyan-400">PBKDF2 SHA-256 (100k rounds)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-800/60">
            <span className="text-slate-400">Initialization Vector</span>
            <span className="font-mono text-cyan-400">96-bit CSPRNG per message</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Server Data Retention</span>
            <span className="font-mono text-emerald-400 font-semibold">0 Bytes (Zero Persistence)</span>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Verified & Close
          </button>
        </div>
      </div>
    </div>
  );
};
