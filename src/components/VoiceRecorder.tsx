import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoiceNote: (audioBlob: Blob, duration: number, waveform: number[]) => void;
  onCancel: () => void;
  accentClass: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
  accentClass,
}) => {
  const [isRecording, setIsRecording] = useState(true);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [waveform, setWaveform] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<any>(null);

  useEffect(() => {
    startRecording();

    return () => {
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Web Audio setup for live visualizer
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const collectedWaveform: number[] = [];

      const sampleWaveform = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const normalized = Math.min(100, Math.max(15, Math.round((avg / 255) * 100)));
          collectedWaveform.push(normalized);
          if (collectedWaveform.length > 30) collectedWaveform.shift();
          setWaveform([...collectedWaveform]);
          animFrameRef.current = requestAnimationFrame(sampleWaveform);
        }
      };

      sampleWaveform();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(100);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsRecording(false);
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSendVoiceNote(audioBlob, duration, waveform.length > 0 ? waveform : [40, 60, 80, 50, 70, 30, 90, 60]);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current && audioUrl) {
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.onended = () => setIsPlaying(false);
    }

    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 w-full p-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl backdrop-blur-md">
      {/* Cancel button */}
      <button
        type="button"
        onClick={() => {
          cleanup();
          onCancel();
        }}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        title="Discard"
      >
        <Trash2 className="w-5 h-5" />
      </button>

      {/* Recording status / Live Waveform */}
      <div className="flex-1 flex items-center gap-3 px-2">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shrink-0" />
          ) : (
            <button
              type="button"
              onClick={togglePlayback}
              className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white hover:bg-slate-700"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          )}
          <span className="text-xs font-mono font-bold text-slate-200">
            {formatTimer(duration)}
          </span>
        </div>

        {/* Dynamic visualizer bars */}
        <div className="flex-1 flex items-center gap-1 h-8 overflow-hidden px-1">
          {waveform.length > 0 ? (
            waveform.map((val, idx) => (
              <div
                key={idx}
                className="w-1 rounded-full bg-cyan-400 transition-all duration-75"
                style={{ height: `${Math.max(6, val * 0.28)}px` }}
              />
            ))
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-1 bg-cyan-400 rounded-full audio-bar-1" />
              <div className="w-1 bg-cyan-400 rounded-full audio-bar-2" />
              <div className="w-1 bg-cyan-400 rounded-full audio-bar-3" />
              <div className="w-1 bg-cyan-400 rounded-full audio-bar-4" />
              <div className="w-1 bg-cyan-400 rounded-full audio-bar-5" />
            </div>
          )}
        </div>
      </div>

      {/* Stop / Send control */}
      {isRecording ? (
        <button
          type="button"
          onClick={stopRecording}
          className="w-10 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-transform active:scale-95 shadow-md"
          title="Stop Recording"
        >
          <Square className="w-4 h-4 fill-white" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleSend}
          className={`px-4 py-2 rounded-xl text-white font-medium text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95 ${accentClass}`}
          title="Send Encrypted Voice Note"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      )}
    </div>
  );
};
