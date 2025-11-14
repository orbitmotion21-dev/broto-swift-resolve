import { Card } from "@/components/ui/card";
import { Eye, Zap, BarChart3 } from "lucide-react";

export const WhySection = () => {
  const features = [
    {
      icon: Eye,
      title: "Transparency First",
      description: "Real-time status updates keep everyone informed at every step.",
    },
    {
      icon: Zap,
      title: "Simple Submission",
      description: "Students can submit complaints in seconds with an intuitive interface.",
    },
    {
      icon: BarChart3,
      title: "Admin Power Tools",
      description: "Advanced filters, categories, and analytics for efficient management.",
    },
  ];

  return (
    <section className="py-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Why BrotoRaise?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for transparency, designed for efficiency
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="p-8 bg-gradient-card shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-2 border-border/50"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-card-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
