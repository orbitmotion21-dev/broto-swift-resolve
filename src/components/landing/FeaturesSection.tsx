import { Card } from "@/components/ui/card";
import { 
  CheckCircle, 
  Layers, 
  Clock, 
  LayoutDashboard, 
  PieChart, 
  Lock 
} from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    {
      icon: CheckCircle,
      title: "Easy Submission Form",
      description: "Intuitive interface for quick complaint submission",
    },
    {
      icon: Layers,
      title: "Category-wise Sorting",
      description: "Organize complaints by hostel, internet, food, and more",
    },
    {
      icon: Clock,
      title: "Real-time Timeline Status",
      description: "Track progress with live status updates",
    },
    {
      icon: LayoutDashboard,
      title: "Admin Dashboard",
      description: "Comprehensive overview of all complaints and metrics",
    },
    {
      icon: PieChart,
      title: "Analytics for Management",
      description: "Data-driven insights for better decision making",
    },
    {
      icon: Lock,
      title: "Secure Data Storage",
      description: "Your information is encrypted and protected",
    },
  ];

  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Powerful Features
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need for effective complaint management
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-6 bg-gradient-card shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border-border/50"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-card-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
