import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../types';
import { saveMessage } from '../services/db';
import { Menu, Send, Shield, Trash2, Smartphone } from 'lucide-react';

interface ChatWindowProps {
  currentUser: { id: string; name: string };
  activePeer: { id: string; name: string } | null;
  messages: Message[];
  onSendMessage: (msg: Message) => void;
  onClearHistory: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  currentUser,
  activePeer,
  messages,
  onSendMessage,
  onClearHistory,
}) => {
  const [inputText, setInputText] = useState('');
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message on update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync ephemeral toggle status to browser session state
  useEffect(() => {
    sessionStorage.setItem('ephemeral_mode', isEphemeral ? 'true' : 'false');
  }, [isEphemeral]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: crypto.randomUUID(),
      senderId: currentUser.id,
      text: inputText.trim(),
      timestamp: Date.now(),
      isEphemeral: isEphemeral,
    };

    onSendMessage(newMessage);
    saveMessage(newMessage);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-slate-900 text-slate-100">
      {/* Top Header Banner Component */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700 w-full z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white shrink-0">
            {activePeer ? activePeer.name.charAt(0).toUpperCase() : 'AI'}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm md:text-base truncate">
              {activePeer ? activePeer.name : 'Gemini AI Assistant'}
            </h2>
            <p className="text-xs text-emerald-400 truncate flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
              Active Connection
            </p>
          </div>
        </div>

        {/* Mobile Navbar Hamburger Toggle Toggle Menu */}
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-slate-400 hover:text-slate-200 focus:outline-none transition-colors"
          aria-label="Toggle settings menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Main Screen Layout Workspace Area */}
      <div className="flex flex-col md:flex-row flex-1 w-full overflow-hidden relative">
        
        {/* Dynamic Options Overlay Layer Drawer panel */}
        <div className={`
          absolute md:relative right-0 top-0 h-full w-64 max-w-[80vw] bg-slate-800 border-l border-slate-700 p-4 z-20 
          transform transition-transform duration-200 ease-in-out shadow-2xl md:shadow-none
          ${showMenu ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:block hidden'}
        `}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Chat Options</h3>
          
          <div className="flex flex-col gap-3">
            {/* Ephemeral Mode Setting Button */}
            <button
              onClick={() => setIsEphemeral(!isEphemeral)}
              className={`flex items-center justify-between w-full p-3 rounded-lg border text-left transition-all ${
                isEphemeral 
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Shield className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium truncate">Ephemeral Mode</span>
              </div>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isEphemeral ? 'bg-amber-500' : 'bg-slate-600'}`}>
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${isEphemeral ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
            </button>

            {/* Clear Database View Logs History Action */}
            <button
              onClick={() => { if(confirm('Clear history?')) onClearHistory(); }}
              className="flex items-center gap-2 w-full p-3 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all text-left"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="font-medium truncate">Clear Thread Logs</span>
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-center hidden md:block">
            <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <Smartphone className="w-3 h-3" /> Fully Screen Responsive
            </p>
          </div>
        </div>

        {/* Message Feed Canvas Layer Wrapper */}
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-slate-900">
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0 w-full scrolling-touch">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6 select-none">
                <div className="max-w-sm">
                  <p className="text-slate-500 text-sm md:text-base">No messages here yet. Say hello to kick off the thread conversation!</p>
                  {isEphemeral && (
                    <p className="text-amber-400/70 text-xs mt-2 bg-amber-500/5 border border-amber-500/20 p-2 rounded-lg">
                      ⚠️ Ephemeral Mode Active: Messages sent in this layout mode disappear completely upon closure.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                    }`}>
                      <p className="leading-relaxed">{msg.text}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-40 select-none">
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {msg.isEphemeral && <span>• Disappearing</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* User Text Composition Input Dock Field */}
          <footer className="p-3 bg-slate-800 border-t border-slate-700 w-full">
            <form onSubmit={handleSend} className="flex gap-2 items-center max-w-full">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isEphemeral ? "Send an ephemeral secret text..." : "Type your message string here..."}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors min-w-0"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center focus:outline-none"
                aria-label="Send message Data"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </footer>
        </div>

      </div>
    </div>
  );
};
