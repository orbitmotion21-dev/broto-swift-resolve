import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, MapPin, Clock, AlertCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';

const ComplaintDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch complaint details
  const { data: complaint, isLoading: complaintLoading } = useQuery({
    queryKey: ['complaint', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch media attachments
  const { data: media, isLoading: mediaLoading } = useQuery({
    queryKey: ['complaint-media', id],
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'secondary';
      case 'In Progress':
        return 'default';
      case 'Resolved':
        return 'outline';
      case 'Rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

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
          <Button onClick={() => navigate('/student/dashboard')}>Back to Dashboard</Button>
        </Card>
      </div>
    );
  }

  const images = media?.filter(m => m.file_type.startsWith('image/')) || [];
  const videos = media?.filter(m => m.file_type.startsWith('video/')) || [];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => navigate('/student/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl mb-2">{complaint.title}</CardTitle>
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant={getStatusVariant(complaint.status)}>
                    {complaint.status}
                  </Badge>
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

            {/* Resolution Notes */}
            {complaint.resolution_notes && (
              <div className="bg-secondary/50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Resolution Notes</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{complaint.resolution_notes}</p>
              </div>
            )}

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
    </div>
  );
};

export default ComplaintDetails;
