import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, Video } from 'lucide-react';
import ZegoVideoCall from '@/components/ZegoVideoCall';

const VideoCallPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [callData, setCallData] = useState<{
    roomId: string;
    appId: number;
    appSign: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roomId = searchParams.get('roomId');
  const appId = searchParams.get('appId');
  const appSign = searchParams.get('appSign');
  const complaintId = searchParams.get('complaintId');

  useEffect(() => {
    // If we have URL params, use them directly (for joining existing calls)
    if (roomId && appId && appSign) {
      setCallData({
        roomId,
        appId: parseInt(appId),
        appSign,
      });
      setIsLoading(false);
      return;
    }

    // Otherwise, we need to fetch from the database
    const fetchCallData = async () => {
      if (!complaintId) {
        setError('Missing call information');
        setIsLoading(false);
        return;
      }

      try {
        const { data: videoCall, error: fetchError } = await supabase
          .from('video_calls')
          .select('room_id')
          .eq('complaint_id', complaintId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError || !videoCall) {
          setError('No active call found');
          setIsLoading(false);
          return;
        }

        // Fetch Zego credentials from edge function
        const { data, error: invokeError } = await supabase.functions.invoke('create-video-room', {
          body: { complaintId }
        });

        if (invokeError || !data) {
          setError('Failed to get call credentials');
          setIsLoading(false);
          return;
        }

        setCallData({
          roomId: videoCall.room_id,
          appId: data.appId,
          appSign: data.appSign,
        });
      } catch (err) {
        console.error('Error fetching call data:', err);
        setError('Failed to load call');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCallData();
  }, [roomId, appId, appSign, complaintId]);

  const handleLeave = () => {
    if (complaintId) {
      navigate(`/student/complaint/${complaintId}`);
    } else {
      navigate('/student/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting to video call...</p>
        </div>
      </div>
    );
  }

  if (error || !callData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to Join Call</h2>
            <p className="text-muted-foreground mb-4">{error || 'Call information not found'}</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ZegoVideoCall
        roomId={callData.roomId}
        appId={callData.appId}
        appSign={callData.appSign}
        userName={profile?.name || user?.email || 'Guest'}
        onLeave={handleLeave}
      />
    </div>
  );
};

export default VideoCallPage;
