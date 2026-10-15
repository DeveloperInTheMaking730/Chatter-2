import React, { useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  ShieldCheck,
  Activity,
  PhoneIncoming,
  Volume2,
} from 'lucide-react';
import { CallState } from '../types';
import { webrtcManager } from '../services/webrtc';

interface CallOverlayProps {
  callState: CallState;
  onAcceptIncoming: () => void;
  onDeclineIncoming: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
}

export const CallOverlay: React.FC<CallOverlayProps> = ({
  callState,
  onAcceptIncoming,
  onDeclineIncoming,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
}) => {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach media streams when available
  useEffect(() => {
    const localStream = webrtcManager.getLocalStream();
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }

    const remoteStream = webrtcManager.getRemoteStream();
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }

    const unsub = webrtcManager.subscribe((ev) => {
      if (ev.type === 'remote_stream' && remoteVideoRef.current && ev.stream) {
        remoteVideoRef.current.srcObject = ev.stream;
      }
    });

    return () => {
      unsub();
    };
  }, [callState.status, callState.isVideoOff]);

  const formatCallTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If incoming call ringing
  if (callState.isIncoming && callState.status === 'ringing') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-sm rounded-3xl p-6 bg-slate-900 border border-cyan-500/30 text-center shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 mx-auto rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mb-4 animate-bounce">
            {callState.type === 'video' ? (
              <Video className="w-10 h-10 text-cyan-400" />
            ) : (
              <Volume2 className="w-10 h-10 text-cyan-400" />
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-1">Incoming {callState.type === 'video' ? 'Video' : 'Voice'} Call</h3>
          <p className="text-sm font-semibold text-cyan-400 mb-1">{callState.targetName}</p>
          <p className="text-xs text-slate-400 font-mono mb-6">Code: {callState.targetCode}</p>

          <div className="flex items-center justify-center gap-6">
            <button
              onClick={onDeclineIncoming}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={onAcceptIncoming}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-pulse cursor-pointer"
              title="Accept"
            >
              <PhoneIncoming className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active / connected call interface
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white select-none">
      {/* Top status bar with E2EE badge and latency */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-100">{callState.targetName}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                {callState.targetCode}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{callState.status === 'ringing' ? 'Calling...' : formatCallTime(callState.duration)}</span>
              <span>·</span>
              <span className="text-cyan-400 capitalize">{callState.type} Call</span>
            </div>
          </div>
        </div>

        {/* Real-time P2P Telemetry */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-emerald-400 font-mono">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>P2P E2EE</span>
            <span className="text-slate-400">·</span>
            <span>{callState.latencyMs}ms</span>
          </div>
        </div>
      </div>

      {/* Main Video / Audio stage */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {callState.type === 'video' ? (
          <>
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Remote placeholder if video stream is not yet streaming */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 pointer-events-none -z-10">
              <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-300 mb-3 border border-slate-700">
                {callState.targetName.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-sm text-slate-400 font-mono">{callState.status === 'ringing' ? 'Connecting secure stream...' : 'Encrypted video feed'}</p>
            </div>

            {/* Local Video Picture-in-Picture */}
            <div className="absolute bottom-6 right-6 w-36 sm:w-52 aspect-video rounded-2xl overflow-hidden border-2 border-cyan-500/60 shadow-2xl bg-slate-900 z-10">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${callState.isVideoOff ? 'hidden' : ''}`}
              />
              {callState.isVideoOff && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs">
                  <VideoOff className="w-6 h-6 mb-1 text-slate-500" />
                  <span>Camera off</span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Voice Call Stage */
          <div className="flex flex-col items-center text-center p-6">
            <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-4xl font-extrabold shadow-2xl mb-6 ring-4 ring-cyan-500/20">
              {callState.targetName.slice(0, 2).toUpperCase()}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{callState.targetName}</h2>
            <p className="text-sm font-mono text-cyan-400 mb-4">{callState.targetCode}</p>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-sm font-mono">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{callState.status === 'ringing' ? 'Establishing P2P link...' : formatCallTime(callState.duration)}</span>
            </div>

            {/* Simulated audio frequency wave bars */}
            <div className="flex items-center gap-1.5 mt-8 h-12">
              <div className="w-1.5 bg-cyan-400 rounded-full audio-bar-1" />
              <div className="w-1.5 bg-cyan-400 rounded-full audio-bar-2" />
              <div className="w-1.5 bg-cyan-400 rounded-full audio-bar-3" />
              <div className="w-1.5 bg-cyan-400 rounded-full audio-bar-4" />
              <div className="w-1.5 bg-cyan-400 rounded-full audio-bar-5" />
              <div className="w-1.5 bg-cyan-400 rounded-full audio-bar-2" />
              <div className="w-1.5 bg-cyan-400 rounded-full audio-bar-1" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Call Controls */}
      <div className="h-24 px-6 flex items-center justify-center gap-4 sm:gap-6 bg-slate-900/80 backdrop-blur-md border-t border-slate-800/80 shrink-0">
        {/* Mute Mic */}
        <button
          onClick={onToggleMute}
          className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            callState.isMuted
              ? 'bg-red-500/20 border border-red-500 text-red-400'
              : 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700'
          }`}
          title={callState.isMuted ? 'Unmute' : 'Mute'}
        >
          {callState.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Video Toggle */}
        {callState.type === 'video' && (
          <button
            onClick={onToggleVideo}
            className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              callState.isVideoOff
                ? 'bg-red-500/20 border border-red-500 text-red-400'
                : 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700'
            }`}
            title={callState.isVideoOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {callState.isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        {/* Screen Share */}
        {callState.type === 'video' && (
          <button
            onClick={onToggleScreenShare}
            className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              callState.isScreenSharing
                ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-400'
                : 'bg-slate-800 border border-slate-700 text-white hover:bg-slate-700'
            }`}
            title="Screen Share"
          >
            <MonitorUp className="w-6 h-6" />
          </button>
        )}

        {/* End Call */}
        <button
          onClick={onEndCall}
          className="w-14 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer ml-2"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
