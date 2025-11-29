import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/StatusBadge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, MapPin, AlertCircle, Settings, Bell, User, TrendingUp, AlertTriangle, Trash2, Pencil } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import VideoCallPopup from '@/components/VideoCallPopup';
import { ComplaintFilters, FilterState } from '@/components/ComplaintFilters';

const StudentDashboard = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: [],
    category: [],
    urgency: [],
    dateRange: null,
  });

  // Fetch complaints for the current user
  const { data: complaints, isLoading } = useQuery({
    queryKey: ['student-complaints', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch notifications for recent activity
  const { data: notifications } = useQuery({
    queryKey: ['student-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Filter complaints client-side
  const filteredComplaints = useMemo(() => {
    if (!complaints) return [];
    
    return complaints.filter(complaint => {
      // Text search (title + description)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!complaint.title.toLowerCase().includes(searchLower) &&
            !complaint.description.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(complaint.status)) {
        return false;
      }
      
      // Category filter
      if (filters.category.length > 0 && !filters.category.includes(complaint.category)) {
        return false;
      }
      
      // Urgency filter
      if (filters.urgency.length > 0 && !filters.urgency.includes(complaint.urgency)) {
        return false;
      }
      
      // Date range filter
      if (filters.dateRange) {
        const complaintDate = new Date(complaint.created_at);
        if (filters.dateRange.from && complaintDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && complaintDate > filters.dateRange.to) return false;
      }
      
      return true;
    });
  }, [complaints, filters]);

  // Calculate stats based on filtered results
  const totalComplaints = filteredComplaints?.length || 0;
  const pendingCount = filteredComplaints?.filter(c => c.status === 'Pending').length || 0;
  const inProgressCount = filteredComplaints?.filter(c => c.status === 'In Progress').length || 0;
  const resolvedCount = filteredComplaints?.filter(c => c.status === 'Resolved').length || 0;
  const highPriorityCount = filteredComplaints?.filter(c => c.urgency === 'High').length || 0;
  const responseRate = totalComplaints > 0 
    ? Math.round(((resolvedCount + inProgressCount) / totalComplaints) * 100) 
    : 0;

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'status_update':
        return <TrendingUp className="w-4 h-4" />;
      case 'video_call_request':
        return <Bell className="w-4 h-4" />;
      case 'new_complaint':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };


  // Urgency color mapping
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (complaintId: string) => {
      // Fetch media for this complaint
      const { data: media } = await supabase
        .from('complaint_media')
        .select('file_url')
        .eq('complaint_id', complaintId);

      // Delete media files from storage
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

      // Delete the complaint
      const { error } = await supabase
        .from('complaints')
        .delete()
        .eq('id', complaintId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Complaint Deleted',
        description: 'Your complaint has been successfully deleted.',
      });
      queryClient.invalidateQueries({ queryKey: ['student-complaints'] });
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with greeting and actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {profile?.name ? getInitials(profile.name) : <User className="w-6 h-6" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {getGreeting()}, {profile?.name?.split(' ')[0] || 'Student'}! 👋
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                {profile?.batch && <span>Batch: {profile.batch}</span>}
                {profile?.batch && <span>•</span>}
                <span>Member since {format(new Date(profile?.created_at || new Date()), 'MMM yyyy')}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-muted-foreground hover:text-accent hover:bg-accent/15"
              onClick={() => navigate('/student/settings')}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-muted-foreground">Total</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalComplaints}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium text-muted-foreground">Pending</h3>
            </div>
            <p className="text-2xl font-bold text-accent">{pendingCount}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-muted-foreground">In Progress</h3>
            </div>
            <p className="text-2xl font-bold text-primary">{inProgressCount}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-medium text-muted-foreground">High Priority</h3>
            </div>
            <p className="text-2xl font-bold text-destructive">{highPriorityCount}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-muted-foreground">Response Rate</h3>
            </div>
            <p className="text-2xl font-bold text-primary">{responseRate}%</p>
          </Card>
        </div>

        {/* Recent Activity Section */}
        {notifications && notifications.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Recent Activity</h2>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (notification.complaint_id) {
                        navigate(`/student/complaint/${notification.complaint_id}`);
                      }
                    }}
                  >
                    <div className="mt-1 text-primary">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                      <Badge variant="default" className="shrink-0">New</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : complaints && complaints.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">My Complaints</h2>
              <Button onClick={() => navigate('/student/submit')}>Submit New Complaint</Button>
            </div>

            {/* Filter Bar */}
            <ComplaintFilters 
              filters={filters}
              onFilterChange={setFilters}
            />
            
            {filteredComplaints.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No complaints match your filters</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredComplaints.map((complaint) => (
                <Card 
                  key={complaint.id}
                  className="transition-all hover:shadow-lg"
                >
                  <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => navigate(`/student/complaint/${complaint.id}`)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{complaint.title}</h3>
                          <StatusBadge status={complaint.status} />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {complaint.description}
                        </p>
                      </div>
                      {complaint.status === 'Pending' && (
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-muted-foreground hover:text-accent hover:bg-accent/15 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/student/complaint/${complaint.id}/edit`);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/15 rounded-full"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Complaint?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete "{complaint.title}" and all associated files. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMutation.mutate(complaint.id);
                                  }}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent onClick={() => navigate(`/student/complaint/${complaint.id}`)} className="cursor-pointer">
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <AlertCircle className={`w-4 h-4 ${getUrgencyColor(complaint.urgency)}`} />
                        <span className={getUrgencyColor(complaint.urgency)}>{complaint.urgency} Priority</span>
                      </div>
                      {complaint.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{complaint.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(complaint.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="px-2 py-1 bg-secondary rounded text-secondary-foreground">
                        {complaint.category}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Card className="mt-8 p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">No Complaints Yet</h2>
            <p className="text-muted-foreground mb-6">Start by submitting your first complaint</p>
            <Button size="lg" onClick={() => navigate('/student/submit')}>Submit New Complaint</Button>
          </Card>
        )}
      </div>
      
      <VideoCallPopup />
    </div>
  );
};

export default StudentDashboard;
