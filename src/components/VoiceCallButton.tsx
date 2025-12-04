import { useState } from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import VoiceCallUI from './VoiceCallUI';

interface VoiceCallButtonProps {
  complaintId: string;
  participantName: string;
  calleeName?: string;
  variant?: 'default' | 'floating';
}

const VoiceCallButton = ({
  complaintId,
  participantName,
  calleeName = 'Admin',
  variant = 'default',
}: VoiceCallButtonProps) => {
  const [isInCall, setIsInCall] = useState(false);
  const [callData, setCallData] = useState<{ roomId: string; token: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const startCall = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-voice-room', {
        body: { complaintId },
      });

      if (error) throw error;

      if (data.roomId && data.token) {
        setCallData({ roomId: data.roomId, token: data.token });
        setIsInCall(true);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Failed to start call:', err);
      toast({
        title: 'Call Failed',
        description: err.message || 'Failed to start voice call',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const endCall = () => {
    setIsInCall(false);
    setCallData(null);
  };

  if (isInCall && callData) {
    return (
      <VoiceCallUI
        roomId={callData.roomId}
        token={callData.token}
        participantName={participantName}
        calleeName={calleeName}
        onCallEnd={endCall}
      />
    );
  }

  if (variant === 'floating') {
    return (
      <button
        onClick={startCall}
        disabled={isLoading}
        className="fixed right-5 bottom-20 w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center transition-all disabled:opacity-50 z-40"
      >
        {isLoading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Phone className="w-7 h-7" />
        )}
      </button>
    );
  }

  return (
    <Button onClick={startCall} disabled={isLoading} className="gap-2">
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <Phone className="w-4 h-4" />
      )}
      Start Voice Call
    </Button>
  );
};

export default VoiceCallButton;
