import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, MapPin, Clock, AlertCircle, FileText, User, Phone as PhoneIcon, Video, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import VoiceInputButton from '@/components/VoiceInputButton';
import VoiceCallButton from '@/components/VoiceCallButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const AdminComplaintDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [status, setStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  // Fetch complaint details with student profile
  const { data: complaint, isLoading: complaintLoading } = useQuery({
    queryKey: ['admin-complaint', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('complaints')
        .select(`
          *,
          profiles:student_id (
            name,
            batch,
            phone,
            id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Set initial values
      if (data) {
        setStatus(data.status);
        setResolutionNotes(data.resolution_notes || '');
      }
      
      return data;
    },
    enabled: !!id,
  });

  // Fetch media attachments
  const { data: media, isLoading: mediaLoading } = useQuery({
    queryKey: ['admin-complaint-media', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('complaint_media')
        .select('*')
        .eq('complaint_id', id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const isLoading = complaintLoading || mediaLoading;

  // Update complaint mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No complaint ID');
      
      const { error } = await supabase
        .from('complaints')
        .update({
          status,
          resolution_notes: resolutionNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Complaint Updated',
        description: 'The complaint has been successfully updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-complaint', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update complaint. Please try again.',
        variant: 'destructive',
      });
      console.error('Update error:', error);
    },
  });

  // Fetch active video call
  const { data: activeVideoCall } = useQuery({
    queryKey: ['video-call', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('video_calls')
        .select('*')
        .eq('complaint_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      // Check if call is expired
      if (data && data.expires_at && new Date(data.expires_at) < new Date()) {
        return null; // Treat expired calls as inactive
      }
      
      return data;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });

  const handleStartVideoCall = async () => {
    if (!id) return;
    
    setIsCreatingRoom(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-video-room', {
        body: { complaintId: id }
      });

      if (error) throw error;

      if (data?.roomUrl) {
        toast({
          title: 'Video Call Started',
          description: 'Opening video call room...',
        });
        
        window.open(data.roomUrl, '_blank', 'width=1200,height=800');
        queryClient.invalidateQueries({ queryKey: ['video-call', id] });
      }
    } catch (error) {
      console.error('Error starting video call:', error);
      toast({
        title: 'Error',
        description: 'Failed to start video call. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinCall = () => {
    if (!activeVideoCall) return;
    // Use stored room URL or fallback to constructed URL
    const roomUrl = activeVideoCall.room_url || `https://fahan.daily.co/${activeVideoCall.room_id}`;
    window.open(roomUrl, '_blank', 'width=1200,height=800');
  };

  // Delete complaint mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No complaint ID');
      
      // First, delete all media from storage
      if (media && media.length > 0) {
        for (const item of media) {
          const url = new URL(item.file_url);
          const pathParts = url.pathname.split('/');
          const bucketIndex = pathParts.indexOf('storage') + 2;
          const bucket = pathParts[bucketIndex];
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          
          if (bucket && filePath) {
            await supabase.storage.from(bucket).remove([filePath]);
          }
        }
      }

      // Delete complaint (media records will cascade delete)
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Complaint Deleted',
        description: 'The complaint has been permanently deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] });
      navigate('/admin/dashboard');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to delete complaint. Please try again.',
        variant: 'destructive',
      });
      console.error('Delete error:', error);
    },
  });


  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High':
        return 'text-destructive';
      case 'Medium':
        return 'text-accent';
      case 'Low':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">Complaint Not Found</h2>
          <Button onClick={() => navigate('/admin/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const images = media?.filter(m => m.file_type.startsWith('image/')) || [];
  const videos = media?.filter(m => m.file_type.startsWith('video/')) || [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/complaint/${id}/edit`)}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Complaint?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the complaint
                    and all associated media files.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl mb-2">{complaint.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 items-center">
                      <StatusBadge status={complaint.status} />
                      <div className={`flex items-center gap-1 text-sm ${getUrgencyColor(complaint.urgency)}`}>
                        <AlertCircle className="w-4 h-4" />
                        <span>{complaint.urgency} Priority</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Info */}
                <div className="grid gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="font-semibold">Category:</span>
                    <span className="px-2 py-1 bg-secondary rounded text-secondary-foreground text-sm">
                      {complaint.category}
                    </span>
                  </div>
                  
                  {complaint.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="font-semibold">Location:</span>
                      <span>{complaint.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">Submitted:</span>
                    <span>{format(new Date(complaint.created_at), 'MMMM dd, yyyy at h:mm a')}</span>
                  </div>
                  
                  {complaint.updated_at !== complaint.created_at && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">Last Updated:</span>
                      <span>{format(new Date(complaint.updated_at), 'MMMM dd, yyyy at h:mm a')}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{complaint.description}</p>
                </div>

                {/* Media Attachments */}
                {(images.length > 0 || videos.length > 0) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Attachments</h3>
                    
                    {images.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Images</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {images.map((img) => (
                            <a 
                              key={img.id}
                              href={img.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                            >
                              <img 
                                src={img.file_url} 
                                alt={img.file_name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {videos.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">Videos</h4>
                        <div className="space-y-4">
                          {videos.map((vid) => (
                            <div key={vid.id} className="rounded-lg overflow-hidden border border-border">
                              <video 
                                controls 
                                className="w-full"
                                src={vid.file_url}
                              >
                                Your browser does not support the video tag.
                              </video>
                              <div className="p-2 bg-secondary text-sm text-muted-foreground">
                                {vid.file_name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right Column */}
          <div className="space-y-6">
            {/* Student Info */}
            {complaint.profiles && (
              <Card>
                <CardHeader>
                  <CardTitle>Student Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{complaint.profiles.name}</p>
                    </div>
                  </div>
                  {complaint.profiles.batch && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Batch</p>
                        <p className="font-medium">{complaint.profiles.batch}</p>
                      </div>
                    </div>
                  )}
                  {complaint.profiles.phone && (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{complaint.profiles.phone}</p>
                      </div>
                    </div>
                  )}
                 </CardContent>
               </Card>
             )}

             {/* Voice Call (VideoSDK) */}
             <Card>
               <CardHeader>
                 <CardTitle>Voice Call</CardTitle>
               </CardHeader>
               <CardContent>
                 <VoiceCallButton
                   complaintId={id!}
                   participantName="Admin"
                   calleeName={complaint.profiles?.name || 'Student'}
                 />
               </CardContent>
             </Card>

             {/* Video Call (Daily.co) */}
             <Card>
               <CardHeader>
                 <CardTitle>Video Call</CardTitle>
               </CardHeader>
               <CardContent className="space-y-3">
                 {activeVideoCall ? (
                   <div className="space-y-3">
                     <div className="p-3 bg-secondary rounded-lg">
                       <p className="text-sm text-muted-foreground mb-1">Active call in progress</p>
                       <p className="text-xs text-muted-foreground">Room: {activeVideoCall.room_id}</p>
                     </div>
                     <Button 
                       onClick={handleJoinCall}
                       className="w-full"
                       variant="default"
                     >
                       <Video className="w-4 h-4 mr-2" />
                       Rejoin Call
                     </Button>
                   </div>
                 ) : (
                   <Button 
                     onClick={handleStartVideoCall}
                     disabled={isCreatingRoom}
                     className="w-full"
                   >
                     {isCreatingRoom ? (
                       <>
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                         Creating Room...
                       </>
                     ) : (
                       <>
                         <Video className="w-4 h-4 mr-2" />
                         Start Video Call
                       </>
                     )}
                   </Button>
                 )}
               </CardContent>
             </Card>

             {/* Update Status */}
            <Card>
              <CardHeader>
                <CardTitle>Update Complaint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Waiting for Student">Waiting for Student</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resolution">Resolution Notes</Label>
                    <VoiceInputButton 
                      onTranscript={(text) => {
                        setResolutionNotes(prev => prev ? `${prev} ${text}` : text);
                      }}
                    />
                  </div>
                  <Textarea
                    id="resolution"
                    placeholder="Add notes about the resolution..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={6}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Complaint'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminComplaintDetails;
