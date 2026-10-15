import React, { useState } from 'react';
import { Database, Download, Upload, Lock, ShieldCheck, Check, AlertCircle, FileText } from 'lucide-react';
import { exportEncryptedVault, importEncryptedVault } from '../services/crypto';
import { Contact, GroupChat, Message } from '../types';

interface BackupModalProps {
  contacts: Contact[];
  groups: GroupChat[];
  messages: Message[];
  onRestoreData: (restored: { contacts?: Contact[]; groups?: GroupChat[]; messages?: Message[] }) => void;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  contacts,
  groups,
  messages,
  onRestoreData,
  onClose,
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase || passphrase.length < 6) {
      setStatusMessage({ text: 'Passphrase must be at least 6 characters', type: 'error' });
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setStatusMessage({ text: 'Passphrases do not match', type: 'error' });
      return;
    }

    try {
      setIsExporting(true);
      const vaultData = {
        exportedAt: Date.now(),
        contacts,
        groups,
        messages,
      };

      const encryptedJson = await exportEncryptedVault(vaultData, passphrase);
      const blob = new Blob([encryptedJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cipherzero-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({ text: 'Encrypted vault backup successfully exported!', type: 'success' });
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err: any) {
      setStatusMessage({ text: 'Export failed: ' + err.message, type: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFileContent) {
      setStatusMessage({ text: 'Please select a backup file to import', type: 'error' });
      return;
    }
    if (!importPassphrase) {
      setStatusMessage({ text: 'Enter the master passphrase used during export', type: 'error' });
      return;
    }

    try {
      setIsImporting(true);
      const data = await importEncryptedVault(importFileContent, importPassphrase);
      onRestoreData({
        contacts: data.contacts,
        groups: data.groups,
        messages: data.messages,
      });

      setStatusMessage({
        text: `Restored ${data.messages?.length || 0} messages and ${data.contacts?.length || 0} contacts!`,
        type: 'success',
      });
      setImportPassphrase('');
      setImportFileContent(null);
      setImportFileName('');
    } catch {
      setStatusMessage({ text: 'Decryption failed: Incorrect passphrase or corrupted backup file', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-7 bg-[#111422] border border-purple-500/30 text-slate-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Encrypted Cloud & Vault Backup</h3>
              <p className="text-xs text-slate-400">Zero-knowledge client-side encrypted backup & restore</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-2xl mb-4 text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/40 border border-red-500/40 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Section 1: Export Vault */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-center gap-2 mb-2 text-purple-400">
              <Download className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Export Encrypted Backup</h4>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Encrypt your entire local chat archive ({messages.length} messages, {contacts.length} contacts) with AES-256-GCM.
            </p>

            <form onSubmit={handleExport} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="password"
                  placeholder="Master Passphrase"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
                <input
                  type="password"
                  placeholder="Confirm Passphrase"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isExporting}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Encrypting & Generating Vault...' : 'Download Encrypted Vault (.json)'}</span>
              </button>
            </form>
          </div>

          {/* Section 2: Import & Restore Vault */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
            <div className="flex items-center gap-2 mb-2 text-cyan-400">
              <Upload className="w-4 h-4" />
              <h4 className="text-sm font-bold text-white">Restore from Backup Vault</h4>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Decrypt and restore chat history from a previously saved CipherZero vault file.
            </p>

            <form onSubmit={handleImport} className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2 cursor-pointer hover:border-slate-700">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">{importFileName || 'Select .json backup file...'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <input
                type="password"
                placeholder="Enter Vault Master Passphrase"
                value={importPassphrase}
                onChange={(e) => setImportPassphrase(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                required
              />

              <button
                type="submit"
                disabled={isImporting || !importFileContent}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? 'Decrypting Vault...' : 'Decrypt & Restore History'}</span>
              </button>
            </form>
          </div>
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
