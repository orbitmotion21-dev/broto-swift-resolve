import { Card } from "@/components/ui/card";
import { Send, Eye, CheckCircle, ArrowRight } from "lucide-react";

export const FlowSection = () => {
  const steps = [
    {
      icon: Send,
      title: "Student Submits",
      description: "Complaint raised with details, photos, and urgency level",
    },
    {
      icon: Eye,
      title: "Admin Reviews",
      description: "Complaint is reviewed, categorized, and status is updated",
    },
    {
      icon: CheckCircle,
      title: "Progress Updates",
      description: "Student receives real-time updates until resolution",
    },
  ];

  return (
    <section className="py-24 px-4 bg-secondary/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Simple Complaint Flow
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From submission to resolution in three transparent steps
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex items-center gap-8 w-full">
                <Card className="flex-1 p-8 bg-card shadow-card hover:shadow-card-hover transition-all duration-300 border-border/50">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {step.description}
                    </p>
                  </div>
                </Card>
                
                {index < steps.length - 1 && (
                  <ArrowRight className="hidden md:block w-8 h-8 text-primary flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
