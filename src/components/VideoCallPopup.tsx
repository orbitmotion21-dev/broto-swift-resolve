import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Phone, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import VoiceCallUI from './VoiceCallUI';

interface VideoCallPopupProps {
  onDismiss?: () => void;
}

const VideoCallPopup = ({ onDismiss }: VideoCallPopupProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [isInVoiceCall, setIsInVoiceCall] = useState(false);
  const [voiceCallData, setVoiceCallData] = useState<{ roomId: string; token: string } | null>(null);

  // Fetch active video calls
  const { data: activeCall, refetch } = useQuery({
    queryKey: ['active-video-call', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: complaints } = await supabase
        .from('complaints')
        .select('id')
        .eq('student_id', user.id);

      if (!complaints || complaints.length === 0) return null;

      const complaintIds = complaints.map(c => c.id);

      const { data: videoCalls } = await supabase
        .from('video_calls')
        .select('*, complaints(title)')
        .in('complaint_id', complaintIds)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      // Filter out expired calls
      const validCalls = videoCalls?.filter(call => {
        if (!call.expires_at) return true; // Legacy calls without expiration
        return new Date(call.expires_at) > new Date();
      });

      return validCalls && validCalls.length > 0 ? validCalls[0] : null;
    },
    enabled: !!user?.id && !dismissed,
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Check if this is a VideoSDK call
  const isVideoSDKCall = activeCall?.room_url?.startsWith('videosdk://');

  useEffect(() => {
    if (!user?.id || dismissed) return;

    // Set up real-time subscription for video call notifications
    const channel = supabase
      .channel('video-call-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_calls',
        },
        async (payload) => {
          // Check if this video call is for the current user's complaint
          const { data: complaint } = await supabase
            .from('complaints')
            .select('student_id')
            .eq('id', payload.new.complaint_id)
            .single();

          if (complaint?.student_id === user.id) {
            // Refetch to show the popup
            setDismissed(false);
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, dismissed, refetch]);

  const handleJoinVideoCall = async () => {
    if (!activeCall) return;

    // Use stored room URL or fallback to constructed URL
    const roomUrl = activeCall.room_url || `https://fahan.daily.co/${activeCall.room_id}`;
    
    // Open in new window
    window.open(roomUrl, '_blank', 'width=1200,height=800');
    
    // Navigate to complaint details
    navigate(`/student/complaint/${activeCall.complaint_id}`);
    
    handleDismiss();
  };

  const handleJoinVoiceCall = async () => {
    if (!activeCall) return;

    try {
      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('create-voice-room', {
        body: { complaintId: activeCall.complaint_id },
      });

      if (error) throw error;

      if (data.roomId && data.token) {
        setVoiceCallData({ roomId: data.roomId, token: data.token });
        setIsInVoiceCall(true);
      }
    } catch (err) {
      console.error('Failed to join voice call:', err);
      // Use the existing room ID
      setVoiceCallData({ roomId: activeCall.room_id, token: '' });
      setIsInVoiceCall(true);
    }
  };

  const handleVoiceCallEnd = () => {
    setIsInVoiceCall(false);
    setVoiceCallData(null);
    handleDismiss();
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  // Show voice call UI if in call
  if (isInVoiceCall && voiceCallData) {
    return (
      <VoiceCallUI
        roomId={voiceCallData.roomId}
        token={voiceCallData.token}
        participantName="Student"
        calleeName="Admin"
        onCallEnd={handleVoiceCallEnd}
      />
    );
  }

  if (!activeCall || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <Card className="w-80 shadow-lg border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {isVideoSDKCall ? (
                <Phone className="w-5 h-5 text-green-500 animate-pulse" />
              ) : (
                <Video className="w-5 h-5 text-primary animate-pulse" />
              )}
              <CardTitle className="text-lg">
                {isVideoSDKCall ? 'Voice Call Request' : 'Video Call Request'}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleDismiss}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <CardDescription>
            Admin wants to discuss: {activeCall.complaints?.title || 'Your complaint'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button 
            onClick={isVideoSDKCall ? handleJoinVoiceCall : handleJoinVideoCall}
            className={`flex-1 ${isVideoSDKCall ? 'bg-green-500 hover:bg-green-600' : ''}`}
          >
            {isVideoSDKCall ? (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Join Voice Call
              </>
            ) : (
              <>
                <Video className="w-4 h-4 mr-2" />
                Join Call
              </>
            )}
          </Button>
          <Button 
            variant="outline"
            onClick={handleDismiss}
            className="flex-1"
          >
            Later
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoCallPopup;
