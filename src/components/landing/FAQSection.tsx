import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQSection = () => {
  const faqs = [
    {
      question: "How do I submit a complaint?",
      answer:
        "Simply log in to your student account, click on 'Submit Complaint', fill in the details including category, description, and attach any photos or videos if needed. Your complaint will be instantly submitted to the admin team.",
    },
    {
      question: "How does BrotoRaise notify users?",
      answer:
        "BrotoRaise provides real-time status updates through the platform. Students receive notifications when their complaint status changes from 'Pending' to 'In Progress' and finally to 'Resolved'. You can track your complaint anytime through your dashboard.",
    },
    {
      question: "Can admins filter complaints?",
      answer:
        "Yes! Admins have access to powerful filtering tools. They can filter complaints by status (Pending, In Progress, Resolved), category (Hostel, Internet, Food, etc.), date range, urgency level, and even by specific students.",
    },
    {
      question: "Is my data safe?",
      answer:
        "Absolutely. BrotoRaise uses industry-standard encryption for all data storage and transmission. Your personal information and complaint details are securely stored and only accessible to authorized administrators.",
    },
  ];

  return (
    <section className="py-24 px-4 bg-secondary/30">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about BrotoRaise
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card shadow-card border border-border/50 rounded-2xl px-6 overflow-hidden"
            >
              <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
