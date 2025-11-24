import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const StudentDashboard = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

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

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-2">My Complaints</h3>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground mt-2">Total complaints submitted</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-2">Pending</h3>
            <p className="text-3xl font-bold text-accent">0</p>
            <p className="text-sm text-muted-foreground mt-2">Awaiting review</p>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-2">Resolved</h3>
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-muted-foreground mt-2">Successfully resolved</p>
          </Card>
        </div>

        <Card className="mt-8 p-8 text-center">
          <h2 className="text-2xl font-semibold mb-4">No Complaints Yet</h2>
          <p className="text-muted-foreground mb-6">Start by submitting your first complaint</p>
          <Button size="lg" onClick={() => navigate('/student/submit')}>Submit New Complaint</Button>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
