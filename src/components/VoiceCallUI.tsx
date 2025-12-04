import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceCallUIProps {
  roomId: string;
  token: string;
  participantName: string;
  onCallEnd: () => void;
  calleeName?: string;
  calleeAvatar?: string;
}

const VoiceCallUI = ({
  roomId,
  token,
  participantName,
  onCallEnd,
  calleeName = 'Admin',
  calleeAvatar,
}: VoiceCallUIProps) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const meetingRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  useEffect(() => {
    // Load VideoSDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.videosdk.live/js-sdk/0.3.33/videosdk.js';
    script.async = true;
    script.onload = initializeMeeting;
    script.onerror = () => setError('Failed to load VideoSDK');
    document.body.appendChild(script);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (meetingRef.current) {
        try {
          meetingRef.current.leave();
        } catch (e) {
          console.error('Error leaving meeting:', e);
        }
      }
      document.body.removeChild(script);
    };
  }, []);

  const initializeMeeting = async () => {
    try {
      const VideoSDK = (window as any).VideoSDK;
      if (!VideoSDK) {
        setError('VideoSDK not available');
        return;
      }

      VideoSDK.config(token);

      const meeting = VideoSDK.initMeeting({
        meetingId: roomId,
        name: participantName,
        micEnabled: true,
        webcamEnabled: false, // Audio only
      });

      meetingRef.current = meeting;

      meeting.on('meeting-joined', () => {
        console.log('Meeting joined');
        setCallStatus('connected');
        // Start timer
        timerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      });

      meeting.on('meeting-left', () => {
        console.log('Meeting left');
        setCallStatus('ended');
        if (timerRef.current) clearInterval(timerRef.current);
        onCallEnd();
      });

      meeting.on('participant-joined', (participant: any) => {
        console.log('Participant joined:', participant.displayName);
      });

      meeting.on('participant-left', (participant: any) => {
        console.log('Participant left:', participant.displayName);
      });

      meeting.on('error', (error: any) => {
        console.error('Meeting error:', error);
        setError(error.message || 'Call error occurred');
      });

      meeting.join();
    } catch (err) {
      console.error('Failed to initialize meeting:', err);
      setError('Failed to connect to call');
    }
  };

  const toggleMute = () => {
    if (meetingRef.current) {
      meetingRef.current.toggleMic();
      setIsMuted(!isMuted);
    }
  };

  const endCall = () => {
    if (meetingRef.current) {
      meetingRef.current.leave();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setCallStatus('ended');
    onCallEnd();
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#071420] to-[#0b141a] flex flex-col items-center justify-center text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={onCallEnd} variant="destructive">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#071420] to-[#0b141a] flex flex-col items-center pt-20 text-white">
      {/* Close button */}
      <button
        onClick={endCall}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Avatar */}
      <div className="relative mb-6">
        {calleeAvatar ? (
          <img
            src={calleeAvatar}
            alt={calleeName}
            className="w-36 h-36 rounded-full border-4 border-white/10 object-cover"
          />
        ) : (
          <div className="w-36 h-36 rounded-full border-4 border-white/10 bg-primary/20 flex items-center justify-center">
            <Phone className="w-16 h-16 text-primary" />
          </div>
        )}
        {callStatus === 'connecting' && (
          <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-30" />
        )}
      </div>

      {/* Call info */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-semibold mb-2">{calleeName}</h3>
        <p className="text-white/80">
          {callStatus === 'connecting' && 'Connecting...'}
          {callStatus === 'connected' && 'Connected'}
          {callStatus === 'ended' && 'Call Ended'}
        </p>
      </div>

      {/* Timer */}
      <div className="text-xl font-mono mb-12 opacity-90">
        {formatTime(callDuration)}
      </div>

      {/* Controls */}
      <div className="flex gap-6">
        <button
          onClick={toggleMute}
          className={`p-5 rounded-full transition-all ${
            isMuted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          {isMuted ? (
            <MicOff className="w-7 h-7" />
          ) : (
            <Mic className="w-7 h-7" />
          )}
        </button>

        <button
          onClick={endCall}
          className="p-5 rounded-full bg-red-500 hover:bg-red-600 transition-all"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default VoiceCallUI;
