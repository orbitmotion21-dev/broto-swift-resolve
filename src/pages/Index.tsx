import { Hero } from "@/components/landing/Hero";
import { WhySection } from "@/components/landing/WhySection";
import { FlowSection } from "@/components/landing/FlowSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <WhySection />
      <FlowSection />
      <FeaturesSection />
      <FAQSection />
      <Footer />
    </div>
  );
};

export default Index;
