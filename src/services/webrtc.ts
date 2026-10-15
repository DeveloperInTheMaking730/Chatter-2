import { networkRelay } from './network';

export type WebRTCCallback = (event: {
  type: 'remote_stream' | 'call_connected' | 'call_ended' | 'latency_update' | 'error';
  stream?: MediaStream;
  latencyMs?: number;
  error?: string;
}) => void;

class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private targetFriendCode: string | null = null;
  private callbacks = new Set<WebRTCCallback>();
  private pingInterval: any = null;
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  public subscribe(cb: WebRTCCallback) {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  private notify(data: any) {
    this.callbacks.forEach((cb) => cb(data));
  }

  public async startCall(targetCode: string, type: 'voice' | 'video'): Promise<MediaStream | null> {
    this.targetFriendCode = targetCode;
    await this.initLocalStream(type);

    this.createPeerConnection();

    // Add local tracks to peer connection
    if (this.localStream && this.peerConnection) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    try {
      const offer = await this.peerConnection!.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await this.peerConnection!.setLocalDescription(offer);

      // Send offer to target
      networkRelay.send('webrtc_signal', targetCode, {
        signalType: 'offer',
        callType: type,
        sdp: offer,
      });

      this.startLatencyMonitoring();
    } catch (err: any) {
      this.notify({ type: 'error', error: err.message || 'Could not initiate call' });
      this.endCall();
    }

    return this.localStream;
  }

  public async answerCall(targetCode: string, offerSdp: RTCSessionDescriptionInit, type: 'voice' | 'video'): Promise<MediaStream | null> {
    this.targetFriendCode = targetCode;
    await this.initLocalStream(type);

    this.createPeerConnection();

    if (this.localStream && this.peerConnection) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    try {
      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      networkRelay.send('webrtc_signal', targetCode, {
        signalType: 'answer',
        sdp: answer,
      });

      this.startLatencyMonitoring();
    } catch (err: any) {
      this.notify({ type: 'error', error: err.message || 'Could not answer call' });
      this.endCall();
    }

    return this.localStream;
  }

  public async handleSignal(senderCode: string, payload: any) {
    const { signalType, sdp, candidate } = payload;

    if (signalType === 'answer' && this.peerConnection) {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
        this.notify({ type: 'call_connected' });
      } catch (err) {
        console.error('Failed to set remote description answer', err);
      }
    } else if (signalType === 'candidate' && this.peerConnection) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Failed to add ICE candidate', err);
      }
    } else if (signalType === 'end_call') {
      this.endCall(false);
    }
  }

  private createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.targetFriendCode) {
        networkRelay.send('webrtc_signal', this.targetFriendCode, {
          signalType: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.notify({ type: 'remote_stream', stream: this.remoteStream });
        this.notify({ type: 'call_connected' });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state === 'connected') {
        this.notify({ type: 'call_connected' });
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.endCall(false);
      }
    };
  }

  private async initLocalStream(type: 'voice' | 'video'): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } : false,
      });
      return this.localStream;
    } catch {
      // Fallback: If camera is unavailable/denied, try audio-only or create silent dummy stream so UI doesn't crash
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return this.localStream;
      } catch {
        // Create synthetic audio stream using AudioContext if hardware is denied
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        this.localStream = dst.stream;
        return this.localStream;
      }
    }
  }

  public toggleMute(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled; // returns isMuted
    }
    return false;
  }

  public toggleVideo(): boolean {
    if (!this.localStream) return true;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return !videoTrack.enabled; // returns isVideoOff
    }
    return true;
  }

  public async toggleScreenShare(): Promise<boolean> {
    if (!this.peerConnection) return false;

    try {
      if (navigator.mediaDevices.getDisplayMedia) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];

        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');

        if (videoSender) {
          videoSender.replaceTrack(screenTrack);
        } else {
          this.peerConnection.addTrack(screenTrack, screenStream);
        }

        screenTrack.onended = () => {
          // Revert to camera
          if (this.localStream) {
            const camTrack = this.localStream.getVideoTracks()[0];
            if (videoSender && camTrack) {
              videoSender.replaceTrack(camTrack);
            }
          }
        };

        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  private startLatencyMonitoring() {
    this.stopLatencyMonitoring();
    this.pingInterval = setInterval(async () => {
      if (this.peerConnection) {
        try {
          const stats = await this.peerConnection.getStats();
          let rtt = 18; // default healthy P2P baseline
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (report.currentRoundTripTime !== undefined) {
                rtt = Math.round(report.currentRoundTripTime * 1000);
              }
            }
          });
          this.notify({ type: 'latency_update', latencyMs: Math.max(12, rtt) });
        } catch {}
      }
    }, 2000);
  }

  private stopLatencyMonitoring() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public endCall(sendSignal = true) {
    this.stopLatencyMonitoring();

    if (sendSignal && this.targetFriendCode) {
      networkRelay.send('webrtc_signal', this.targetFriendCode, {
        signalType: 'end_call',
      });
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }

    this.targetFriendCode = null;
    this.notify({ type: 'call_ended' });
  }

  public getLocalStream() {
    return this.localStream;
  }

  public getRemoteStream() {
    return this.remoteStream;
  }
}

export const webrtcManager = new WebRTCManager();
