import { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VoiceCallButtonProps {
  complaintId: string;
  participantName: string;
  calleeName?: string;
  variant?: 'default' | 'floating';
}

const VoiceCallButton = ({
  complaintId,
  variant = 'default',
}: VoiceCallButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const startCall = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-video-room', {
        body: { complaintId },
      });

      if (error) throw error;

      if (data?.roomUrl) {
        // Open Daily.co room in new window
        window.open(data.roomUrl, '_blank', 'width=1200,height=800');
        toast({
          title: 'Call Started',
          description: 'Video call room opened in a new window.',
        });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Failed to start call:', err);
      toast({
        title: 'Call Failed',
        description: err.message || 'Failed to start call',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'floating') {
    return (
      <button
        onClick={startCall}
        disabled={isLoading}
        className="fixed right-5 bottom-20 w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center transition-all disabled:opacity-50 z-40"
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <Phone className="w-7 h-7" />
        )}
      </button>
    );
  }

  return (
    <Button onClick={startCall} disabled={isLoading} className="gap-2">
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Phone className="w-4 h-4" />
      )}
      Start Call
    </Button>
  );
};

export default VoiceCallButton;
