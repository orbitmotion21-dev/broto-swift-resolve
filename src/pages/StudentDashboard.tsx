import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Clock, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const StudentDashboard = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

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

  // Calculate stats
  const totalComplaints = complaints?.length || 0;
  const pendingCount = complaints?.filter(c => c.status === 'Pending').length || 0;
  const resolvedCount = complaints?.filter(c => c.status === 'Resolved').length || 0;

  // Status badge variant mapping
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Student Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.name}!</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-2">My Complaints</h3>
            <p className="text-3xl font-bold text-primary">{totalComplaints}</p>
            <p className="text-sm text-muted-foreground mt-2">Total complaints submitted</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-2">Pending</h3>
            <p className="text-3xl font-bold text-accent">{pendingCount}</p>
            <p className="text-sm text-muted-foreground mt-2">Awaiting review</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-2">Resolved</h3>
            <p className="text-3xl font-bold text-primary">{resolvedCount}</p>
            <p className="text-sm text-muted-foreground mt-2">Successfully resolved</p>
          </Card>
        </div>

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
            
            <div className="grid gap-4">
              {complaints.map((complaint) => (
                <Card 
                  key={complaint.id}
                  className="cursor-pointer transition-all hover:shadow-lg"
                  onClick={() => navigate(`/student/complaint/${complaint.id}`)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{complaint.title}</h3>
                          <Badge variant={getStatusVariant(complaint.status)}>
                            {complaint.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {complaint.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
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
          </div>
        ) : (
          <Card className="mt-8 p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">No Complaints Yet</h2>
            <p className="text-muted-foreground mb-6">Start by submitting your first complaint</p>
            <Button size="lg" onClick={() => navigate('/student/submit')}>Submit New Complaint</Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
