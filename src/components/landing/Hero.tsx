import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const Hero = () => {
  return <section className="min-h-screen bg-gradient-hero flex items-center justify-center px-4 py-20">
      <div className="max-w-6xl mx-auto text-center">
        {/* Main Heading */}
        <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-4 animate-fade-in">Brotodesk</h1>
        
        {/* Subheading */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-16 animate-fade-in-delay-1">
          Student complaint management system for Brototype
        </p>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
          {/* Student Card */}
          <Card className="p-8 bg-card shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 animate-fade-in-delay-2 border-border/50">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-card-foreground">For Students</h3>
              <p className="text-muted-foreground">
                Submit and track complaints with transparent status updates
              </p>
            </div>
          </Card>

          {/* Admin Card */}
          <Card className="p-8 bg-card shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 animate-fade-in-delay-3 border-border/50">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold text-card-foreground">For Admins</h3>
              <p className="text-muted-foreground">
                Manage complaints efficiently with powerful filters and tracking
              </p>
            </div>
          </Card>
        </div>

        {/* CTA Button */}
        <Link to="/auth">
          <Button size="lg" className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-fade-in-delay-4 group">
            Get Started
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </section>;
};